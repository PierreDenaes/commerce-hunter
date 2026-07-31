/**
 * Digital Score weights (FR-010)
 * Total = 100%
 */
export const SCORING_WEIGHTS = {
  seo: 0.4,
  presence: 0.25,
  mobile: 0.15,
  dataCompleteness: 0.1,
  businessSize: 0.1,
} as const;

/**
 * Priority thresholds (FR-011)
 */
export const PRIORITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
} as const;

/**
 * SEO Score point allocation (FR-009)
 * Total = 100 points
 */
export const SEO_SCORE_POINTS = {
  // Technical (40 pts)
  isHttps: 10,
  statusOk: 10,
  fastResponse: 10,
  hasRobotsTxt: 5,
  hasSitemapXml: 5,
  // On-page (35 pts)
  hasTitle: 10,
  hasMetaDescription: 10,
  hasH1: 5,
  hasCanonical: 5,
  hasFavicon: 5,
  // Mobile (15 pts)
  hasViewport: 10,
  goodPageWeight: 5,
  // Local SEO (15 pts)
  cityInTitle: 3,
  cityInH1: 2,
  cityInDescription: 2,
  hasSchemaLocalBusiness: 5,
  hasGoogleMapsEmbed: 3,
} as const;
