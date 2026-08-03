import {
  SEO_SCORE_POINTS,
  SEO_SCORE_PENALTIES,
  SCORING_WEIGHTS,
  PRIORITY_THRESHOLDS,
} from "@commercehunter/shared";
import type { Analysis, Business } from "@commercehunter/db";

// ─── Types ────────────────────────────────────────────────

export interface ScoringResult {
  seoScore: number;
  digitalScore: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

// ─── Employee bracket → potential score (0-100) ──────────

const EMPLOYEE_SIZE_SCORE: Record<string, number> = {
  "00": 10,
  "01": 20,
  "02": 30,
  "03": 40,
  "11": 50,
  "12": 60,
  "21": 70,
  "22": 80,
  "31": 85,
  "32": 90,
  "33": 95,
  "41": 100,
  "42": 100,
  "51": 100,
  "52": 100,
  NN: 30,
};

// ─── SEO Score Calculator ─────────────────────────────────

export function calculateSeoScore(analysis: Analysis): number {
  let score = 0;

  // Technical (40 pts)
  if (analysis.isHttps) score += SEO_SCORE_POINTS.isHttps;
  if (analysis.httpStatusCode === 200) score += SEO_SCORE_POINTS.statusOk;
  if (
    analysis.responseTimeMs !== null &&
    analysis.responseTimeMs < 3000
  )
    score += SEO_SCORE_POINTS.fastResponse;
  if (analysis.hasRobotsTxt) score += SEO_SCORE_POINTS.hasRobotsTxt;
  if (analysis.hasSitemapXml) score += SEO_SCORE_POINTS.hasSitemapXml;

  // On-page (35 pts)
  if (analysis.title) score += SEO_SCORE_POINTS.hasTitle;
  if (analysis.metaDescription) score += SEO_SCORE_POINTS.hasMetaDescription;
  if (analysis.h1) score += SEO_SCORE_POINTS.hasH1;
  if (analysis.hasCanonical) score += SEO_SCORE_POINTS.hasCanonical;
  if (analysis.hasFavicon) score += SEO_SCORE_POINTS.hasFavicon;

  // Mobile (15 pts)
  if (analysis.hasViewport) score += SEO_SCORE_POINTS.hasViewport;
  // pageWeight: stored in rawAnalysisJson, fallback to true if no data
  const raw = analysis.rawAnalysisJson as Record<string, unknown> | null;
  const isPageWeightOk = raw?.isPageWeightOk;
  if (isPageWeightOk === true || isPageWeightOk === undefined) {
    score += SEO_SCORE_POINTS.goodPageWeight;
  }

  // Local SEO (15 pts)
  if (analysis.cityInTitle) score += SEO_SCORE_POINTS.cityInTitle;
  if (analysis.cityInH1) score += SEO_SCORE_POINTS.cityInH1;
  if (analysis.cityInDescription) score += SEO_SCORE_POINTS.cityInDescription;
  if (analysis.hasSchemaLocalBusiness)
    score += SEO_SCORE_POINTS.hasSchemaLocalBusiness;
  if (analysis.hasGoogleMapsEmbed)
    score += SEO_SCORE_POINTS.hasGoogleMapsEmbed;

  // Malus qualité (champs null = analyse antérieure, pas de pénalité)
  if (
    analysis.title &&
    analysis.titleLength != null &&
    (analysis.titleLength < 30 || analysis.titleLength > 60)
  ) {
    score -= SEO_SCORE_PENALTIES.titleLengthSuboptimal;
  }
  if (
    analysis.metaDescription &&
    analysis.metaDescriptionLength != null &&
    (analysis.metaDescriptionLength < 50 || analysis.metaDescriptionLength > 160)
  ) {
    score -= SEO_SCORE_PENALTIES.descriptionLengthSuboptimal;
  }
  if (analysis.wordCount != null && analysis.wordCount < 100) {
    score -= SEO_SCORE_PENALTIES.thinContent;
  }
  if (analysis.jsonLdInvalidCount != null && analysis.jsonLdInvalidCount > 0) {
    score -= SEO_SCORE_PENALTIES.invalidJsonLd;
  }
  if (analysis.brokenLinksCount != null && analysis.brokenLinksCount > 0) {
    score -= Math.min(
      SEO_SCORE_PENALTIES.maxBrokenLinksPenalty,
      analysis.brokenLinksCount * SEO_SCORE_PENALTIES.perBrokenLink,
    );
  }

  return Math.min(100, Math.max(0, score));
}

// ─── Digital Score Calculator ─────────────────────────────

export function calculateDigitalScore(
  analysis: Analysis,
  business: Business,
): number {
  const seoScore = analysis.seoScore ?? 0;

  // Site injoignable (domaine mort…) : la présence en ligne ne vaut rien,
  // quelles que soient les valeurs restées d'une analyse antérieure.
  const siteDown = analysis.status === "SITE_DOWN";

  // SEO component (40%)
  const seoComponent = (siteDown ? 0 : seoScore) * SCORING_WEIGHTS.seo;

  // Presence component (25%): has website = 100, no website = 0.
  // Un « site » sur sous-domaine gratuit / page de plateforme (Wix gratuit,
  // Facebook…) compte comme une présence dégradée.
  const hasWebsite =
    !siteDown && business.website !== null && business.website !== "";
  let presenceScore = hasWebsite ? 100 : 0;
  if (hasWebsite && analysis.isFreeHosting === true) {
    presenceScore -= SEO_SCORE_PENALTIES.freeHostingPresencePenalty;
  }
  const presenceComponent = presenceScore * SCORING_WEIGHTS.presence;

  // Mobile component (15%): use performanceScore if available, fallback to mobileScore/viewport
  let mobileScoreValue = 0;
  if (siteDown) {
    mobileScoreValue = 0;
  } else if (analysis.performanceScore !== null && analysis.performanceScore !== undefined) {
    mobileScoreValue = analysis.performanceScore;
  } else if (analysis.mobileScore !== null) {
    mobileScoreValue = analysis.mobileScore;
  } else if (analysis.hasViewport) {
    mobileScoreValue = 50; // basic viewport = 50/100
  }
  const mobileComponent = mobileScoreValue * SCORING_WEIGHTS.mobile;

  // Data completeness component (10%): phone, email (N/A), legalFormCode, employeesRangeCode
  let dataPoints = 0;
  let maxDataPoints = 4;
  if (business.phone) dataPoints++;
  if (business.website) dataPoints++;
  if (business.legalFormCode) dataPoints++;
  if (business.employeesRangeCode) dataPoints++;
  const dataCompletenessScore = (dataPoints / maxDataPoints) * 100;
  const dataComponent = dataCompletenessScore * SCORING_WEIGHTS.dataCompleteness;

  // Business size potential (10%): based on employee range code
  const sizeScore =
    EMPLOYEE_SIZE_SCORE[business.employeesRangeCode ?? ""] ?? 30;
  const sizeComponent = sizeScore * SCORING_WEIGHTS.businessSize;

  const total = Math.round(
    seoComponent + presenceComponent + mobileComponent + dataComponent + sizeComponent,
  );
  return Math.min(100, Math.max(0, total));
}

// ─── Priority Assignment ──────────────────────────────────

export function assignPriority(
  digitalScore: number,
): "HIGH" | "MEDIUM" | "LOW" {
  // Priorité = opportunité : score faible → prospect chaud
  if (digitalScore < PRIORITY_THRESHOLDS.HIGH_BELOW) return "HIGH";
  if (digitalScore < PRIORITY_THRESHOLDS.MEDIUM_BELOW) return "MEDIUM";
  return "LOW";
}

// ─── Orchestrator ─────────────────────────────────────────

export function scoreAnalysis(
  analysis: Analysis,
  business: Business,
): ScoringResult {
  const siteDown = analysis.status === "SITE_DOWN";
  const seoScore = siteDown ? 0 : calculateSeoScore(analysis);
  // Temporarily set seoScore on the analysis for digitalScore calculation
  const analysisWithSeo = { ...analysis, seoScore };
  const digitalScore = calculateDigitalScore(analysisWithSeo, business);

  // Business without website = maximum opportunity → force HIGH priority.
  // Un site mort est une opportunité équivalente (ils ont déjà eu un site).
  const hasWebsite = business.website !== null && business.website !== "";
  const priority =
    hasWebsite && !siteDown ? assignPriority(digitalScore) : "HIGH";

  return { seoScore, digitalScore, priority };
}
