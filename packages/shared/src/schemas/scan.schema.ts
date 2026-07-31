import { z } from "zod";

export const CreateScanSchema = z.object({
  name: z.string().min(1).max(200),
  postalCode: z.string().regex(/^\d{5}$/, "Must be a 5-digit French postal code"),
  radiusKm: z.number().int().min(1).max(50).nullish(),
  entityType: z.enum(["COMMERCE", "PME", "BOTH"]),
  minEmployees: z.number().int().min(1).nullish(),
  apeCategories: z.array(z.string().regex(/^\d{2}[\d.A-Z]*$/)).optional().default([]),
});

export const ListScansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]).optional(),
});

export type CreateScanValidated = z.infer<typeof CreateScanSchema>;
export type ListScansQuery = z.infer<typeof ListScansQuerySchema>;
