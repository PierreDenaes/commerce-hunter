import { z } from "zod";

export const BusinessQuerySchema = z.object({
  scanId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.enum(["COMMERCE", "PME"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  hasWebsite: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  city: z.string().optional(),
  apeCode: z.string().optional(),
  apeCategories: z.preprocess(
    (v) => (typeof v === "string" && v ? v.split(",") : undefined),
    z.array(z.string()).optional(),
  ),
  employeesRangeCodes: z.preprocess(
    (v) => (typeof v === "string" && v ? v.split(",") : undefined),
    z.array(z.string()).optional(),
  ),
  postalCode: z.string().optional(),
  isHeadquarters: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  analysisStatus: z
    .enum(["COMPLETED", "PENDING", "RUNNING", "FAILED", "NO_WEBSITE"])
    .optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["digital_score", "seo_score", "name", "city"])
    .default("digital_score"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type BusinessQueryInput = z.infer<typeof BusinessQuerySchema>;

// Export CSV : scanId obligatoire — sans lui, le where Prisma `some: { scanId: undefined }`
// devient `some: {}` et exporterait les entreprises de toutes les organisations.
export const ExportCsvQuerySchema = BusinessQuerySchema.extend({
  scanId: z.string().uuid(),
  // Clés de colonnes séparées par des virgules (validées côté route)
  columns: z.string().max(500).optional(),
});

export type ExportCsvQueryInput = z.infer<typeof ExportCsvQuerySchema>;

// ─── Common param schemas ─────────────────────────────────

export const UuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const BusinessIdParamSchema = z.object({
  businessId: z.string().uuid(),
});

export const TokenParamSchema = z.object({
  token: z.string().uuid(),
});

export const DashboardQuerySchema = z.object({
  scanId: z.string().uuid().optional(),
});
