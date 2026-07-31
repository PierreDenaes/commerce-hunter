export type EntityType = "COMMERCE" | "PME";

export interface BusinessListItem {
  id: string;
  name: string;
  siret: string;
  siren: string;
  entityType: EntityType;
  apeCode: string;
  legalForm: string | null;
  employeesRange: string | null;
  address: string | null;
  city: string;
  postalCode: string;
  phone: string | null;
  website: string | null;
  seoScore: number | null;
  digitalScore: number | null;
  priority: Priority | null;
}

export interface BusinessDetail extends BusinessListItem {
  legalFormCode: string | null;
  employeesRangeCode: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  isHeadquarters: boolean;
  analysis: AnalysisDetail | null;
}

export interface AnalysisDetail {
  status: AnalysisStatus;
  analyzedUrl: string | null;
  technical: {
    isHttps: boolean | null;
    httpStatusCode: number | null;
    responseTimeMs: number | null;
    hasRobotsTxt: boolean | null;
    hasSitemapXml: boolean | null;
  };
  seoOnPage: {
    title: string | null;
    titleLength: number | null;
    metaDescription: string | null;
    metaDescriptionLength: number | null;
    h1: string | null;
    hasCanonical: boolean | null;
    hasFavicon: boolean | null;
  };
  mobile: {
    hasViewport: boolean | null;
    mobileScore: number | null;
  };
  localSeo: {
    cityInTitle: boolean | null;
    cityInH1: boolean | null;
    cityInDescription: boolean | null;
    hasSchemaLocalBusiness: boolean | null;
    hasGoogleMapsEmbed: boolean | null;
  };
  scores: {
    seoScore: number | null;
    digitalScore: number | null;
    priority: Priority | null;
  };
  analyzedAt: string | null;
}

export type AnalysisStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "NO_WEBSITE";

export type Priority = "HIGH" | "MEDIUM" | "LOW";
