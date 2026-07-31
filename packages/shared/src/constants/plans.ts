import type { PlanName } from "../types/subscription.js";

export const PLAN_DEFINITIONS: Record<
  PlanName,
  {
    priceCents: number;
    cityLimit: number;
    monthlyAnalysisLimit: number;
    hasPdfExport: boolean;
    hasWhiteLabel: boolean;
    hasApiAccess: boolean;
  }
> = {
  Starter: {
    priceCents: 4900,
    cityLimit: 3,
    monthlyAnalysisLimit: 500,
    hasPdfExport: false,
    hasWhiteLabel: false,
    hasApiAccess: false,
  },
  Pro: {
    priceCents: 11900,
    cityLimit: 0,
    monthlyAnalysisLimit: 2000,
    hasPdfExport: true,
    hasWhiteLabel: false,
    hasApiAccess: false,
  },
  Agency: {
    priceCents: 29900,
    cityLimit: 0,
    monthlyAnalysisLimit: 0,
    hasPdfExport: true,
    hasWhiteLabel: true,
    hasApiAccess: true,
  },
};
