import * as cheerio from "cheerio";
import type { FastifyBaseLogger } from "fastify";
// fetch et Agent DOIVENT venir du même package undici : passer un Agent du
// package npm au fetch global de Node (undici interne, autre version) casse
// la décompression et les headers selon la version de Node.
import { Agent, fetch as undiciFetch, type Response as UndiciResponse } from "undici";
import { withRetry } from "../utils/retry.js";

// ─── Classification des échecs réseau ─────────────────────

/**
 * Site durablement injoignable (domaine sans DNS, connexion refusée…) —
 * à distinguer d'une erreur transitoire (timeout, reset) : c'est un signal
 * de prospection, pas une panne d'analyse.
 */
export class SiteUnreachableError extends Error {
  constructor(url: string, cause: unknown) {
    super(`Site injoignable: ${url}`, { cause });
    this.name = "SiteUnreachableError";
  }
}

// Codes Node signalant une inaccessibilité durable. ECONNRESET, EAI_AGAIN
// (DNS temporaire) et les timeouts restent transitoires : pas de SITE_DOWN à tort.
const UNREACHABLE_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

export function classifyFetchError(
  err: unknown,
): "unreachable" | "transient" {
  const codes = new Set<string>();
  const visit = (e: unknown, depth: number): void => {
    if (!e || typeof e !== "object" || depth > 5) return;
    const code = (e as NodeJS.ErrnoException).code;
    if (typeof code === "string") codes.add(code);
    if (e instanceof AggregateError) {
      for (const inner of e.errors) visit(inner, depth + 1);
    }
    visit((e as Error).cause, depth + 1);
  };
  visit(err, 0);
  for (const code of codes) {
    if (UNREACHABLE_CODES.has(code)) return "unreachable";
  }
  return "transient";
}

// ─── Types ────────────────────────────────────────────────

export interface SeoAnalysisResult {
  analyzedUrl: string;
  // Technical
  isHttps: boolean;
  httpStatusCode: number;
  responseTimeMs: number;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  // On-page
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1: string | null;
  hasCanonical: boolean;
  hasFavicon: boolean;
  // Mobile
  hasViewport: boolean;
  pageWeightBytes: number;
  isPageWeightOk: boolean;
  // Local SEO
  cityInTitle: boolean;
  cityInH1: boolean;
  cityInDescription: boolean;
  hasSchemaLocalBusiness: boolean;
  hasGoogleMapsEmbed: boolean;
  // Images
  totalImages: number;
  imagesWithAlt: number;
  // Security headers
  hasHsts: boolean;
  hasCsp: boolean;
  hasXFrameOptions: boolean;
  hasXContentTypeOptions: boolean;
  // Headings
  h1Count: number;
  h2Count: number;
  h3Count: number;
  hasProperHeadingHierarchy: boolean;
  // Links
  internalLinkCount: number;
  externalLinkCount: number;
  // Social / OG
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  structuredDataTypes: string[];
  // Contact
  contactEmails: string[];
  // Content quality
  wordCount: number;
  textRatio: number;
  hasOgImage: boolean;
  jsonLdInvalidCount: number;
  detectedPlatform: string | null;
  isFreeHosting: boolean;
  brokenLinksCount: number;
  checkedLinksCount: number;
}

// ─── Constants ────────────────────────────────────────────

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
const MAX_PAGE_WEIGHT = 2 * 1024 * 1024; // 2MB

// ─── SSRF Protection ──────────────────────────────────────

const PRIVATE_IP = new RegExp(
  "^(127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\." +
  "|169\\.254\\.|0\\.0\\.0\\.0" +
  "|::1$|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe80:" +
  "|::ffff:(127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)" +
  ")"
);

/**
 * Throws if the URL targets a private/reserved IP range or uses a non-HTTP protocol (SSRF protection).
 *
 * Known limitation: DNS rebinding attacks (where a hostname initially resolves to a public IP
 * but rebinds to a private IP at fetch time) are not prevented by hostname validation alone.
 * Mitigation: URLs originate from the INSEE/SIRENE public registry, reducing attacker control.
 * A proper fix would require DNS-level validation via undici's connect callback.
 */
function assertSafeUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`SSRF blocked: disallowed protocol "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname;
  if (PRIVATE_IP.test(hostname) || hostname === "localhost" || hostname === "0.0.0.0") {
    throw new Error(`SSRF blocked: private or reserved address "${hostname}"`);
  }
}

/**
 * Fetch with SSRF-safe redirect following — validates each redirect URL before following.
 */
// Agent undici partagé : un `new Agent()` par requête fuit des pools de sockets
// (jamais close()). `rejectUnauthorized: false` est délibéré — on audite aussi
// les sites aux certificats cassés — et reste scopé à ce dispatcher, pas au process.
const insecureTlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

async function safeFetch(
  url: string,
  options: RequestInit & { dispatcher?: unknown },
  maxRedirects = MAX_REDIRECTS,
): Promise<UndiciResponse> {
  assertSafeUrl(url);
  const res = await undiciFetch(url, {
    ...options,
    redirect: "manual",
  } as Parameters<typeof undiciFetch>[1]);
  if (res.status >= 300 && res.status < 400 && maxRedirects > 0) {
    const location = res.headers.get("location");
    if (!location) return res;
    const nextUrl = new URL(location, url).toString();
    return safeFetch(nextUrl, options, maxRedirects - 1);
  }
  return res;
}

// ─── Service ──────────────────────────────────────────────

export class SeoAnalyzerService {
  private log: FastifyBaseLogger;

  constructor(log: FastifyBaseLogger) {
    this.log = log;
  }

  async analyze(url: string, city: string): Promise<SeoAnalysisResult> {
    // ─── Fetch page ─────────────────────────────────────
    const startTime = Date.now();
    let response: UndiciResponse;
    try {
      response = await withRetry(
        () =>
          safeFetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; CommerceHunter/1.0; +https://commercehunter.fr)",
              Accept: "text/html,application/xhtml+xml",
            },
            // @ts-expect-error -- undici Agent type mismatch across versions
            dispatcher: insecureTlsAgent,
          }, MAX_REDIRECTS),
        this.log,
        `SEO fetch ${url}`,
        { maxRetries: 2, baseDelayMs: 1000 },
      );
    } catch (err) {
      if (classifyFetchError(err) === "unreachable") {
        throw new SiteUnreachableError(url, err);
      }
      throw err;
    }
    const responseTimeMs = Date.now() - startTime;

    const html = await response.text();
    const finalUrl = response.url;
    const parsedUrl = new URL(finalUrl);

    this.log.info(
      { url, finalUrl, status: response.status, responseTimeMs },
      "SEO fetch complete",
    );

    // ─── Parse HTML ─────────────────────────────────────
    const $ = cheerio.load(html);

    // ─── Technical checks ───────────────────────────────
    const isHttps = parsedUrl.protocol === "https:";
    const httpStatusCode = response.status;

    const hasRobotsTxt = await this.checkResourceExists(
      `${parsedUrl.origin}/robots.txt`,
    );
    const hasSitemapXml = await this.checkResourceExists(
      `${parsedUrl.origin}/sitemap.xml`,
    );

    // ─── On-page checks ────────────────────────────────
    const titleEl = $("title").first();
    const title = titleEl.text().trim() || null;
    const titleLength = title?.length ?? 0;

    const metaDescEl = $('meta[name="description"]').first();
    const metaDescription = metaDescEl.attr("content")?.trim() || null;
    const metaDescriptionLength = metaDescription?.length ?? 0;

    const h1El = $("h1").first();
    const h1 = h1El.text().trim() || null;

    const hasCanonical = $('link[rel="canonical"]').length > 0;

    const hasFavicon =
      $('link[rel="icon"]').length > 0 ||
      $('link[rel="shortcut icon"]').length > 0 ||
      (await this.checkResourceExists(`${parsedUrl.origin}/favicon.ico`));

    // ─── Mobile checks ──────────────────────────────────
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const pageWeightBytes = Buffer.byteLength(html, "utf8");
    const isPageWeightOk = pageWeightBytes < MAX_PAGE_WEIGHT;

    // ─── Local SEO checks ───────────────────────────────
    const cityLower = city.toLowerCase();
    const cityInTitle = title ? title.toLowerCase().includes(cityLower) : false;
    const cityInH1 = h1 ? h1.toLowerCase().includes(cityLower) : false;
    const cityInDescription = metaDescription
      ? metaDescription.toLowerCase().includes(cityLower)
      : false;

    const hasSchemaLocalBusiness = this.detectLocalBusinessSchema($);
    const hasGoogleMapsEmbed = this.detectGoogleMapsEmbed($);

    // ─── Images ───────────────────────────────────────────
    const totalImages = $("img").length;
    const imagesWithAlt = $("img[alt]").filter((_, el) => {
      const alt = $(el).attr("alt")?.trim();
      return !!alt && alt.length > 0;
    }).length;

    // ─── Security headers ─────────────────────────────────
    const hasHsts = response.headers.has("strict-transport-security");
    const hasCsp = response.headers.has("content-security-policy");
    const hasXFrameOptions = response.headers.has("x-frame-options");
    const hasXContentTypeOptions = response.headers.has("x-content-type-options");

    // ─── Headings ─────────────────────────────────────────
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;
    const hasProperHeadingHierarchy =
      h1Count === 1 && (h2Count > 0 || h3Count === 0);

    // ─── Links ────────────────────────────────────────────
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    const internalLinkUrls = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const linkUrl = new URL(href, finalUrl);
        if (linkUrl.hostname === parsedUrl.hostname) {
          internalLinkCount++;
          linkUrl.hash = "";
          if (linkUrl.protocol === "http:" || linkUrl.protocol === "https:") {
            internalLinkUrls.add(linkUrl.toString());
          }
        } else {
          externalLinkCount++;
        }
      } catch {
        // relative links → internal
        internalLinkCount++;
      }
    });

    // ─── Liens cassés (échantillon de liens internes) ─────
    const { brokenLinksCount, checkedLinksCount } = await this.checkBrokenLinks(
      [...internalLinkUrls].filter((u) => u !== finalUrl),
    );

    // ─── Social / OG ──────────────────────────────────────
    const hasOgTags = $('meta[property="og:title"]').length > 0;
    const hasTwitterCard = $('meta[name="twitter:card"]').length > 0;
    const hasOgImage = Boolean(
      $('meta[property="og:image"]').attr("content")?.trim(),
    );

    // ─── Structured data types ────────────────────────────
    const structuredDataTypes = this.detectStructuredDataTypes($);
    const jsonLdInvalidCount = this.countInvalidJsonLd($);

    // ─── Contenu texte visible / dépendance JS ────────────
    const bodyClone = $("body").clone();
    bodyClone.find("script, style, noscript, svg, template, iframe").remove();
    const visibleText = bodyClone.text().replace(/\s+/g, " ").trim();
    const wordCount = visibleText ? visibleText.split(" ").length : 0;
    // Part du texte visible dans le HTML total : très faible = contenu
    // probablement rendu en JavaScript, mal indexable
    const textRatio =
      pageWeightBytes > 0
        ? Math.round((Buffer.byteLength(visibleText, "utf8") / pageWeightBytes) * 1000) / 1000
        : 0;

    // ─── Plateforme / hébergement gratuit ─────────────────
    const detectedPlatform = this.detectPlatform($, html);
    const isFreeHosting = this.detectFreeHosting(parsedUrl.hostname);

    // ─── Contact emails ─────────────────────────────────
    const contactEmails = this.extractEmails($, html);

    return {
      analyzedUrl: finalUrl,
      isHttps,
      httpStatusCode,
      responseTimeMs,
      hasRobotsTxt,
      hasSitemapXml,
      title,
      titleLength,
      metaDescription,
      metaDescriptionLength,
      h1,
      hasCanonical,
      hasFavicon,
      hasViewport,
      pageWeightBytes,
      isPageWeightOk,
      cityInTitle,
      cityInH1,
      cityInDescription,
      hasSchemaLocalBusiness,
      hasGoogleMapsEmbed,
      totalImages,
      imagesWithAlt,
      hasHsts,
      hasCsp,
      hasXFrameOptions,
      hasXContentTypeOptions,
      h1Count,
      h2Count,
      h3Count,
      hasProperHeadingHierarchy,
      internalLinkCount,
      externalLinkCount,
      hasOgTags,
      hasTwitterCard,
      structuredDataTypes,
      contactEmails,
      wordCount,
      textRatio,
      hasOgImage,
      jsonLdInvalidCount,
      detectedPlatform,
      isFreeHosting,
      brokenLinksCount,
      checkedLinksCount,
    };
  }

  /**
   * Teste un échantillon de liens internes (max 10, concurrence 3).
   * HEAD d'abord, GET si la méthode est refusée. Un statut >= 400 ou une
   * erreur réseau compte comme lien cassé.
   */
  private async checkBrokenLinks(
    urls: string[],
  ): Promise<{ brokenLinksCount: number; checkedLinksCount: number }> {
    const sample = urls.slice(0, 10);
    let broken = 0;
    const CONCURRENCY = 3;

    const checkOne = async (url: string): Promise<boolean> => {
      const attempt = async (method: "HEAD" | "GET"): Promise<number> => {
        const res = await safeFetch(url, {
          method,
          signal: AbortSignal.timeout(5_000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; CommerceHunter/1.0; +https://commercehunter.fr)",
          },
          // @ts-expect-error -- undici Agent type mismatch across versions
          dispatcher: insecureTlsAgent,
        });
        return res.status;
      };
      try {
        let status = await attempt("HEAD");
        if (status === 405 || status === 501) {
          status = await attempt("GET");
        }
        return status >= 400;
      } catch {
        return true;
      }
    };

    for (let i = 0; i < sample.length; i += CONCURRENCY) {
      const chunk = sample.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map(checkOne));
      broken += results.filter(Boolean).length;
    }

    return { brokenLinksCount: broken, checkedLinksCount: sample.length };
  }

  /** Compte les blocs JSON-LD syntaxiquement invalides (ignorés par Google). */
  private countInvalidJsonLd($: cheerio.CheerioAPI): number {
    let invalid = 0;
    $('script[type="application/ld+json"]').each((_, el) => {
      const text = $(el).html();
      if (!text?.trim()) return;
      try {
        JSON.parse(text);
      } catch {
        invalid++;
      }
    });
    return invalid;
  }

  /** Détecte le CMS / la plateforme du site (meta generator + heuristiques). */
  private detectPlatform($: cheerio.CheerioAPI, html: string): string | null {
    const generator = $('meta[name="generator"]').attr("content")?.trim();
    if (generator) return generator.slice(0, 100);

    const lower = html.toLowerCase();
    if (lower.includes("wp-content/") || lower.includes("wp-includes/")) return "WordPress";
    if (lower.includes("cdn.shopify.com")) return "Shopify";
    if (lower.includes("static.wixstatic.com") || lower.includes("wix.com")) return "Wix";
    if (lower.includes("squarespace.com")) return "Squarespace";
    if (lower.includes("/prestashop")) return "PrestaShop";
    if (lower.includes("jimdo")) return "Jimdo";
    if (lower.includes("webflow.com")) return "Webflow";
    return null;
  }

  /**
   * Détecte un hébergement sur sous-domaine gratuit ou page de plateforme :
   * le commerce ne possède pas son adresse web — argument de prospection fort.
   */
  private detectFreeHosting(hostname: string): boolean {
    const FREE_HOSTING_PATTERNS = [
      /\.wixsite\.com$/,
      /\.jimdofree\.com$/,
      /\.jimdosite\.com$/,
      /\.wordpress\.com$/,
      /\.blogspot\./,
      /\.webnode\./,
      /\.e-monsite\.com$/,
      /\.sitew\.com$/,
      /\.weebly\.com$/,
      /\.godaddysites\.com$/,
      /\.business\.site$/,
      /^(www\.)?facebook\.com$/,
      /^(www\.)?instagram\.com$/,
      /^(www\.)?pagesjaunes\.fr$/,
    ];
    return FREE_HOSTING_PATTERNS.some((p) => p.test(hostname));
  }

  private async checkResourceExists(url: string): Promise<boolean> {
    try {
      const res = await safeFetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
        // @ts-expect-error -- undici Agent type mismatch across versions
        dispatcher: insecureTlsAgent,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private detectLocalBusinessSchema($: cheerio.CheerioAPI): boolean {
    const scripts = $('script[type="application/ld+json"]');
    let found = false;
    scripts.each((_, el) => {
      try {
        const text = $(el).html();
        if (!text) return;
        const json = JSON.parse(text);
        // Can be a single object or an array (@graph)
        const items = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
        for (const item of items) {
          const type = item["@type"];
          if (
            type === "LocalBusiness" ||
            (Array.isArray(type) && type.includes("LocalBusiness"))
          ) {
            found = true;
          }
        }
      } catch {
        // invalid JSON-LD, skip
      }
    });
    return found;
  }

  private detectStructuredDataTypes($: cheerio.CheerioAPI): string[] {
    const types = new Set<string>();
    const scripts = $('script[type="application/ld+json"]');
    scripts.each((_, el) => {
      try {
        const text = $(el).html();
        if (!text) return;
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
        for (const item of items) {
          const type = item["@type"];
          if (typeof type === "string") types.add(type);
          if (Array.isArray(type)) type.forEach((t: string) => types.add(t));
        }
      } catch {
        // invalid JSON-LD, skip
      }
    });
    return Array.from(types);
  }

  private detectGoogleMapsEmbed($: cheerio.CheerioAPI): boolean {
    const iframes = $("iframe");
    let found = false;
    iframes.each((_, el) => {
      const src = $(el).attr("src") ?? "";
      if (
        src.includes("maps.google.com") ||
        src.includes("google.com/maps") ||
        src.includes("maps.googleapis.com")
      ) {
        found = true;
      }
    });
    return found;
  }

  private extractEmails($: cheerio.CheerioAPI, html: string): string[] {
    const emails = new Set<string>();
    this.extractEmailsFromHtml($, html, emails);

    // Cap at 10 emails, filter out common no-reply/generic
    return Array.from(emails)
      .filter((e) => !e.includes("noreply") && !e.includes("no-reply") && !e.includes("example.com"))
      .slice(0, 10);
  }

  /**
   * Crawl additional pages (contact, legal, about) to find more emails.
   * Called after the main analysis with the base URL origin.
   */
  async crawlForEmails(baseUrl: string): Promise<string[]> {
    const CONTACT_PATHS = [
      "/contact",
      "/contact-us",
      "/nous-contacter",
      "/contactez-nous",
      "/mentions-legales",
      "/legal",
      "/impressum",
      "/about",
      "/a-propos",
    ];

    const emails = new Set<string>();
    const parsedBase = new URL(baseUrl);
    const origin = parsedBase.origin;

    for (const path of CONTACT_PATHS) {
      try {
        const res = await safeFetch(`${origin}${path}`, {
          signal: AbortSignal.timeout(5_000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; CommerceHunter/1.0; +https://commercehunter.fr)",
            Accept: "text/html,application/xhtml+xml",
          },
          // @ts-expect-error -- undici Agent type mismatch across versions
          dispatcher: insecureTlsAgent,
        });

        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);
        this.extractEmailsFromHtml($, html, emails);
      } catch {
        // Page doesn't exist or timeout — skip
      }
    }

    return Array.from(emails)
      .filter((e) => !e.includes("noreply") && !e.includes("no-reply") && !e.includes("example.com"))
      .slice(0, 10);
  }

  private extractEmailsFromHtml($: cheerio.CheerioAPI, html: string, emails: Set<string>): void {
    // 1. mailto: links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
      if (email && this.isValidEmail(email)) {
        emails.add(email);
      }
    });

    // 2. Regex in visible text (skip scripts/styles)
    const textContent = $("body").clone().find("script, style, noscript").remove().end().text();
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const textMatches = textContent.match(emailRegex) ?? [];
    for (const match of textMatches) {
      const email = match.toLowerCase();
      if (this.isValidEmail(email)) {
        emails.add(email);
      }
    }

    // 3. Also check href attributes that might contain obfuscated emails
    const hrefMatches = html.match(/mailto:[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
    for (const match of hrefMatches) {
      const email = match.replace("mailto:", "").split("?")[0].trim().toLowerCase();
      if (this.isValidEmail(email)) {
        emails.add(email);
      }
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email) && !email.endsWith(".png") && !email.endsWith(".jpg") && !email.endsWith(".gif");
  }
}
