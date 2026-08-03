import { Prisma, type PrismaClient } from "@commercehunter/db";
import type { FastifyBaseLogger } from "fastify";
import { SeoAnalyzerService, SiteUnreachableError } from "../services/seo-analyzer.service.js";
import { PageSpeedService } from "../services/pagespeed.service.js";
import { scoreAnalysis } from "../services/scoring.service.js";
import { QuotaService } from "../services/quota.service.js";

const MAX_CONCURRENT = 5;

// Cache d'analyse partagé : une analyse COMPLETED plus récente que ce TTL
// n'est ni relancée ni décomptée du quota. Rend les retries de jobs
// idempotents et évite de re-facturer une entreprise déjà analysée
// (y compris par une autre organisation). La re-analyse explicite force
// le passage en remettant les statuts à PENDING au préalable.
const ANALYSIS_TTL_DAYS = 30;

export async function processAnalyses(
  scanId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  onlyBusinessIds?: string[],
): Promise<void> {
  // Lot fourni par la queue, ou toutes les entreprises du scan (legacy)
  let allBusinessIds: string[];
  if (onlyBusinessIds && onlyBusinessIds.length > 0) {
    allBusinessIds = onlyBusinessIds;
  } else {
    const scanBusinesses = await prisma.scanBusiness.findMany({
      where: { scanId },
      select: { businessId: true },
    });
    allBusinessIds = scanBusinesses.map((sb) => sb.businessId);
  }
  if (allBusinessIds.length === 0) {
    log.info({ scanId }, "No businesses to analyze");
    return;
  }

  // Écarter les analyses récentes déjà complètes (cache partagé, cf. TTL)
  const freshCutoff = new Date(Date.now() - ANALYSIS_TTL_DAYS * 24 * 60 * 60 * 1000);
  const freshAnalyses = await prisma.analysis.findMany({
    where: {
      businessId: { in: allBusinessIds },
      status: "COMPLETED",
      analyzedAt: { gte: freshCutoff },
    },
    select: { businessId: true },
  });
  const freshIds = new Set(freshAnalyses.map((a) => a.businessId));
  const businessIds = allBusinessIds.filter((id) => !freshIds.has(id));

  if (businessIds.length === 0) {
    log.info(
      { scanId, cached: freshIds.size },
      "All analyses fresh — nothing to process",
    );
    return;
  }

  // Get the scan's org for quota tracking
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { organizationId: true },
  });
  if (!scan) return;

  // Split into: businesses with website vs without — seules les entreprises
  // AVEC site déclenchent une vraie analyse (fetch, PageSpeed…) et comptent
  // dans le quota. Les sans-site sont classées instantanément (NO_WEBSITE,
  // priorité HIGH) sans rien consommer.
  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    select: {
      id: true,
      website: true,
      city: true,
      phone: true,
      legalFormCode: true,
      employeesRangeCode: true,
    },
  });

  const allWithWebsite = businesses.filter((b) => b.website);
  const withoutWebsite = businesses.filter((b) => !b.website);

  // Réservation atomique en amont : deux scans concurrents ne peuvent pas
  // consommer le même solde. Les échecs sont rendus au quota en fin de run.
  const quotaService = new QuotaService(prisma);
  let withWebsite = allWithWebsite;
  if (allWithWebsite.length > 0) {
    const granted = await quotaService.reserveAnalyses(
      scan.organizationId,
      allWithWebsite.length,
    );
    if (granted === 0) {
      log.warn(
        { scanId, organizationId: scan.organizationId },
        "Analysis quota exhausted, skipping website analyses",
      );
    }
    withWebsite = allWithWebsite.slice(0, granted);
  }

  const cappedBusinessIds = [
    ...withWebsite.map((b) => b.id),
    ...withoutWebsite.map((b) => b.id),
  ];

  log.info(
    {
      scanId,
      total: businessIds.length,
      withWebsite: withWebsite.length,
      withoutWebsite: withoutWebsite.length,
    },
    "Starting analysis processing",
  );

  // Create PENDING Analysis records for businesses that don't already have one
  for (const businessId of cappedBusinessIds) {
    await prisma.analysis.upsert({
      where: { businessId },
      create: { businessId, status: "PENDING" },
      update: {},
    });
  }

  // ─── Handle businesses WITHOUT website ────────────────
  for (const biz of withoutWebsite) {
    try {
      const analysis = await prisma.analysis.update({
        where: { businessId: biz.id },
        data: {
          status: "NO_WEBSITE",
          seoScore: 0,
          analyzedAt: new Date(),
        },
      });

      // Get full business for scoring
      const fullBusiness = await prisma.business.findUnique({
        where: { id: biz.id },
      });
      if (fullBusiness) {
        const fullAnalysis = await prisma.analysis.findUnique({
          where: { id: analysis.id },
        });
        if (fullAnalysis) {
          const scores = scoreAnalysis(fullAnalysis, fullBusiness);
          await prisma.analysis.update({
            where: { id: analysis.id },
            data: {
              digitalScore: scores.digitalScore,
              priority: scores.priority,
            },
          });
        }
      }
    } catch (err) {
      log.error({ err, businessId: biz.id }, "Failed to score NO_WEBSITE business");
    }
  }

  // ─── Handle businesses WITH website ───────────────────
  const seoAnalyzer = new SeoAnalyzerService(log);
  const pageSpeedService = new PageSpeedService(log);

  // Process in chunks of MAX_CONCURRENT
  for (let i = 0; i < withWebsite.length; i += MAX_CONCURRENT) {
    const chunk = withWebsite.slice(i, i + MAX_CONCURRENT);
    await Promise.allSettled(
      chunk.map((biz) =>
        analyzeSingleBusiness(biz.id, biz.website!, biz.city, prisma, seoAnalyzer, pageSpeedService, log),
      ),
    );
  }

  // ─── Rendre au quota les analyses en échec ────────────
  // Seules les entreprises avec site ont réservé du quota. Les sites morts
  // (SITE_DOWN) ne sont pas facturés non plus, comme les sans-site.
  const failedCount = await prisma.analysis.count({
    where: {
      businessId: { in: withWebsite.map((b) => b.id) },
      status: { in: ["FAILED", "SITE_DOWN"] },
    },
  });
  if (failedCount > 0) {
    await quotaService.releaseAnalyses(scan.organizationId, failedCount);
  }

  log.info(
    {
      scanId,
      total: allBusinessIds.length,
      cached: freshIds.size,
      processed: cappedBusinessIds.length,
      failed: failedCount,
      withWebsite: withWebsite.length,
      withoutWebsite: withoutWebsite.length,
    },
    "Analysis processing complete",
  );
}

export async function analyzeSingleBusiness(
  businessId: string,
  websiteUrl: string,
  city: string,
  prisma: PrismaClient,
  seoAnalyzer: SeoAnalyzerService,
  pageSpeedService: PageSpeedService,
  log: FastifyBaseLogger,
): Promise<void> {
  // Mark as RUNNING
  await prisma.analysis.update({
    where: { businessId },
    data: { status: "RUNNING" },
  });

  try {
    const result = await seoAnalyzer.analyze(websiteUrl, city);

    // Save raw results + structured fields
    const analysis = await prisma.analysis.update({
      where: { businessId },
      data: {
        status: "COMPLETED",
        analyzedUrl: result.analyzedUrl,
        isHttps: result.isHttps,
        httpStatusCode: result.httpStatusCode,
        responseTimeMs: result.responseTimeMs,
        hasRobotsTxt: result.hasRobotsTxt,
        hasSitemapXml: result.hasSitemapXml,
        title: result.title,
        titleLength: result.titleLength,
        metaDescription: result.metaDescription,
        metaDescriptionLength: result.metaDescriptionLength,
        h1: result.h1,
        hasCanonical: result.hasCanonical,
        hasFavicon: result.hasFavicon,
        hasViewport: result.hasViewport,
        cityInTitle: result.cityInTitle,
        cityInH1: result.cityInH1,
        cityInDescription: result.cityInDescription,
        hasSchemaLocalBusiness: result.hasSchemaLocalBusiness,
        hasGoogleMapsEmbed: result.hasGoogleMapsEmbed,
        totalImages: result.totalImages,
        imagesWithAlt: result.imagesWithAlt,
        hasHsts: result.hasHsts,
        hasCsp: result.hasCsp,
        hasXFrameOptions: result.hasXFrameOptions,
        hasXContentTypeOptions: result.hasXContentTypeOptions,
        h1Count: result.h1Count,
        h2Count: result.h2Count,
        h3Count: result.h3Count,
        hasProperHeadingHierarchy: result.hasProperHeadingHierarchy,
        internalLinkCount: result.internalLinkCount,
        externalLinkCount: result.externalLinkCount,
        hasOgTags: result.hasOgTags,
        hasTwitterCard: result.hasTwitterCard,
        structuredDataTypes: result.structuredDataTypes,
        contactEmails: result.contactEmails,
        wordCount: result.wordCount,
        textRatio: result.textRatio,
        hasOgImage: result.hasOgImage,
        jsonLdInvalidCount: result.jsonLdInvalidCount,
        detectedPlatform: result.detectedPlatform,
        isFreeHosting: result.isFreeHosting,
        brokenLinksCount: result.brokenLinksCount,
        checkedLinksCount: result.checkedLinksCount,
        rawAnalysisJson: JSON.parse(JSON.stringify(result)),
        analyzedAt: new Date(),
      },
    });

    // Crawl additional pages for more emails (best-effort)
    try {
      const extraEmails = await seoAnalyzer.crawlForEmails(result.analyzedUrl);
      if (extraEmails.length > 0) {
        const allEmails = [...new Set([...result.contactEmails, ...extraEmails])].slice(0, 10);
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: { contactEmails: allEmails },
        });
      }
    } catch (err) {
      log.warn({ err, businessId }, "Email crawl failed (non-fatal)");
    }

    // PageSpeed (best-effort — don't fail the whole analysis)
    try {
      const psResult = await pageSpeedService.analyze(websiteUrl);
      if (psResult) {
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            performanceScore: psResult.performanceScore,
            lcpMs: psResult.lcpMs,
            clsScore: psResult.clsScore,
            ttfbMs: psResult.ttfbMs,
            fcpMs: psResult.fcpMs,
          },
        });
      }
    } catch (psErr) {
      log.warn({ psErr, businessId }, "PageSpeed analysis failed (non-fatal)");
    }

    // Re-fetch to include PageSpeed data for scoring
    const updatedAnalysis = await prisma.analysis.findUnique({
      where: { id: analysis.id },
    });

    // Score the analysis
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (business && updatedAnalysis) {
      const scores = scoreAnalysis(updatedAnalysis, business);
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          seoScore: scores.seoScore,
          digitalScore: scores.digitalScore,
          priority: scores.priority,
        },
      });
    }

    log.info(
      { businessId, url: websiteUrl },
      "Business analysis completed",
    );
  } catch (err) {
    if (err instanceof SiteUnreachableError) {
      await markSiteDown(businessId, websiteUrl, prisma, log);
      return;
    }

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    log.error({ err, businessId, url: websiteUrl }, "Business analysis failed");

    await prisma.analysis.update({
      where: { businessId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });
  }
}

// Site durablement injoignable : c'est un RÉSULTAT (prospect chaud), pas une
// erreur. On purge les valeurs d'une éventuelle analyse antérieure pour que
// tableau et fiche racontent la même histoire, et on score comme sans-site.
async function markSiteDown(
  businessId: string,
  websiteUrl: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<void> {
  log.warn({ businessId, url: websiteUrl }, "Site unreachable — marking SITE_DOWN");

  const wiped = await prisma.analysis.update({
    where: { businessId },
    data: {
      status: "SITE_DOWN",
      errorMessage: "Site injoignable (domaine mort ou serveur arrêté)",
      analyzedUrl: websiteUrl,
      isHttps: null,
      httpStatusCode: null,
      responseTimeMs: null,
      hasRobotsTxt: null,
      hasSitemapXml: null,
      title: null,
      titleLength: null,
      metaDescription: null,
      metaDescriptionLength: null,
      h1: null,
      hasCanonical: null,
      hasFavicon: null,
      hasViewport: null,
      mobileScore: null,
      cityInTitle: null,
      cityInH1: null,
      cityInDescription: null,
      hasSchemaLocalBusiness: null,
      hasGoogleMapsEmbed: null,
      performanceScore: null,
      lcpMs: null,
      clsScore: null,
      ttfbMs: null,
      fcpMs: null,
      totalImages: null,
      imagesWithAlt: null,
      hasHsts: null,
      hasCsp: null,
      hasXFrameOptions: null,
      hasXContentTypeOptions: null,
      h1Count: null,
      h2Count: null,
      h3Count: null,
      hasProperHeadingHierarchy: null,
      internalLinkCount: null,
      externalLinkCount: null,
      hasOgTags: null,
      hasTwitterCard: null,
      structuredDataTypes: [],
      contactEmails: [],
      wordCount: null,
      textRatio: null,
      hasOgImage: null,
      jsonLdInvalidCount: null,
      detectedPlatform: null,
      isFreeHosting: null,
      brokenLinksCount: null,
      checkedLinksCount: null,
      rawAnalysisJson: Prisma.DbNull,
      aiRecommendations: Prisma.DbNull,
      aiRecommendationsAt: null,
      seoScore: 0,
      analyzedAt: new Date(),
    },
  });

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business) {
    const scores = scoreAnalysis(wiped, business);
    await prisma.analysis.update({
      where: { id: wiped.id },
      data: { digitalScore: scores.digitalScore, priority: scores.priority },
    });
  }
}
