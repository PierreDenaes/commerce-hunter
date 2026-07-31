export interface TechnicalChecks {
  isHttps: boolean | null;
  httpStatusCode: number | null;
  responseTimeMs: number | null;
  hasRobotsTxt: boolean | null;
  hasSitemapXml: boolean | null;
}

export interface SeoOnPageChecks {
  title: string | null;
  titleLength: number | null;
  metaDescription: string | null;
  metaDescriptionLength: number | null;
  h1: string | null;
  hasCanonical: boolean | null;
  hasFavicon: boolean | null;
}

export interface MobileChecks {
  hasViewport: boolean | null;
  mobileScore: number | null;
}

export interface LocalSeoChecks {
  cityInTitle: boolean | null;
  cityInH1: boolean | null;
  cityInDescription: boolean | null;
  hasSchemaLocalBusiness: boolean | null;
  hasGoogleMapsEmbed: boolean | null;
}

export interface Scores {
  seoScore: number | null;
  digitalScore: number | null;
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
}
