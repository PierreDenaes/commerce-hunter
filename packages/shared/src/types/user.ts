export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: SubscriptionPlanInfo;
  usage: {
    monthlyAnalysesUsed: number;
    monthlyAnalysisLimit: number;
    billingPeriodStart: string;
  };
  members: OrganizationMember[];
}

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SubscriptionPlanInfo {
  name: string;
  priceCents: number;
  cityLimit: number;
  monthlyAnalysisLimit: number;
  hasPdfExport: boolean;
  hasWhiteLabel: boolean;
  hasApiAccess: boolean;
}
