import { describe, it, expect } from "vitest";
import { ExportCsvQuerySchema, BusinessQuerySchema } from "@commercehunter/shared";

// Régression fuite cross-tenant : sans scanId, le where Prisma devenait
// `scanBusinesses: { some: {} }` et exportait toutes les organisations.
describe("ExportCsvQuerySchema", () => {
  it("rejette une query sans scanId", () => {
    const result = ExportCsvQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejette un scanId non-UUID", () => {
    const result = ExportCsvQuerySchema.safeParse({ scanId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepte une query avec scanId UUID", () => {
    const result = ExportCsvQuerySchema.safeParse({
      scanId: "5f1e7ab2-51f4-4b0e-9db0-1c1a2b3c4d5e",
      city: "Marseille",
    });
    expect(result.success).toBe(true);
  });

  it("BusinessQuerySchema garde scanId optionnel (la route businesses scope par org)", () => {
    expect(BusinessQuerySchema.safeParse({}).success).toBe(true);
  });
});
