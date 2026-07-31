import type { EntityType } from "./business.js";

export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface CreateScanInput {
  name: string;
  postalCode: string;
  radiusKm?: number | null;
  entityType: EntityType | "BOTH";
  minEmployees?: number | null;
  apeCategories?: string[];
}

export interface Scan {
  id: string;
  name: string;
  postalCode: string;
  radiusKm: number | null;
  entityType: EntityType | "BOTH";
  minEmployees: number | null;
  apeCategories: string[];
  status: ScanStatus;
  totalBusinesses: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ScanDetail extends Scan {
  stats: {
    commerceCount: number;
    pmeCount: number;
    withWebsite: number;
    withoutWebsite: number;
    averageDigitalScore: number;
    highPriorityCount: number;
  };
}
