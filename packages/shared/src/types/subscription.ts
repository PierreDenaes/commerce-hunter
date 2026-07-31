export type PlanName = "Starter" | "Pro" | "Agency";

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  priceCents: number;
  cityLimit: number;
  monthlyAnalysisLimit: number;
  hasPdfExport: boolean;
  hasWhiteLabel: boolean;
  hasApiAccess: boolean;
}

export interface PlanFeatures {
  maxCities: number | null;
  maxAnalysesPerMonth: number | null;
  pdfExport: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
}
