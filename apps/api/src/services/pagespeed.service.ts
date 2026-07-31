import type { FastifyBaseLogger } from "fastify";

export interface PageSpeedResult {
  performanceScore: number; // 0-100
  lcpMs: number;
  clsScore: number; // CLS * 1000 (stored as int)
  ttfbMs: number;
  fcpMs: number;
}

const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
// Un audit Lighthouse de site lent prend couramment 40 à 90 s côté Google —
// 30 s faisait échouer la majorité des analyses de vrais sites en timeout.
const TIMEOUT_MS = 90_000;
const MAX_RETRIES = 1;

export class PageSpeedService {
  private log: FastifyBaseLogger;
  private apiKey: string | null;

  constructor(log: FastifyBaseLogger) {
    this.log = log;
    this.apiKey = process.env.PAGESPEED_API_KEY ?? null;
  }

  async analyze(url: string): Promise<PageSpeedResult | null> {
    if (!this.apiKey) {
      this.log.debug("No PAGESPEED_API_KEY configured, skipping PageSpeed analysis");
      return null;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const params = new URLSearchParams({
          url,
          key: this.apiKey,
          strategy: "mobile",
          category: "performance",
        });

        const response = await fetch(`${PAGESPEED_API}?${params.toString()}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok) {
          this.log.warn(
            { url, status: response.status, attempt },
            "PageSpeed API error",
          );
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const data = (await response.json()) as Record<string, unknown>;
        const lighthouse = data?.lighthouseResult as Record<string, unknown> | undefined;
        const categories = lighthouse?.categories as Record<string, unknown> | undefined;
        const perf = categories?.performance as Record<string, unknown> | undefined;
        const perfScore = perf?.score as number | undefined;
        const audits = lighthouse?.audits as Record<string, Record<string, unknown>> | undefined;

        if (perfScore == null) {
          this.log.warn({ url }, "PageSpeed returned no performance score");
          return null;
        }

        const getNumeric = (key: string) =>
          Number(audits?.[key]?.numericValue ?? 0);

        const lcpMs = Math.round(getNumeric("largest-contentful-paint"));
        const clsRaw = getNumeric("cumulative-layout-shift");
        const clsScore = Math.round(clsRaw * 1000);
        const ttfbMs = Math.round(getNumeric("server-response-time"));
        const fcpMs = Math.round(getNumeric("first-contentful-paint"));

        const result: PageSpeedResult = {
          performanceScore: Math.round(perfScore * 100),
          lcpMs,
          clsScore,
          ttfbMs,
          fcpMs,
        };

        this.log.info(
          { url, performanceScore: result.performanceScore },
          "PageSpeed analysis complete",
        );

        return result;
      } catch (err) {
        this.log.warn(
          { err, url, attempt },
          "PageSpeed fetch failed",
        );
        if (attempt < MAX_RETRIES) continue;
        return null;
      }
    }

    return null;
  }
}
