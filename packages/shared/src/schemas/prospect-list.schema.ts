import { z } from "zod";

export const CreateProspectListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullish(),
});

export const UpdateProspectListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullish(),
});

export const AddBusinessesToListSchema = z.object({
  businessIds: z.array(z.string().uuid()).min(1).max(500),
});

export const ListProspectListsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const ListProspectListBusinessesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z
    .enum(["digital_score", "seo_score", "name", "city", "added_at"])
    .default("added_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
