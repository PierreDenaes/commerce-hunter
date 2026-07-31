import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@commercehunter/db";
import { QuotaService } from "../quota.service.js";

interface MockOrg {
  monthlyAnalysesUsed: number;
  billingPeriodStart: Date;
  plan: { monthlyAnalysisLimit: number };
}

// Mock Prisma minimal simulant le comportement CAS de updateMany :
// l'update ne s'applique que si la condition monthlyAnalysesUsed correspond.
function mockPrisma(org: MockOrg) {
  const state = { org };
  const prisma = {
    organization: {
      findUnique: vi.fn(async () => ({ ...state.org, plan: { ...state.org.plan } })),
      updateMany: vi.fn(
        async (args: {
          where: {
            monthlyAnalysesUsed?: number | { gte: number };
            billingPeriodStart?: { lte: Date };
          };
          data: { monthlyAnalysesUsed?: { increment?: number; decrement?: number } | number };
        }) => {
          const { where, data } = args;
          // ensureCurrentPeriod
          if (where.billingPeriodStart) {
            if (state.org.billingPeriodStart <= where.billingPeriodStart.lte) {
              state.org.monthlyAnalysesUsed = 0;
              state.org.billingPeriodStart = new Date();
              return { count: 1 };
            }
            return { count: 0 };
          }
          // CAS increment
          if (typeof where.monthlyAnalysesUsed === "number") {
            if (state.org.monthlyAnalysesUsed !== where.monthlyAnalysesUsed) {
              return { count: 0 };
            }
            const inc = (data.monthlyAnalysesUsed as { increment: number }).increment;
            state.org.monthlyAnalysesUsed += inc;
            return { count: 1 };
          }
          // release (decrement, floor via gte)
          if (
            typeof where.monthlyAnalysesUsed === "object" &&
            where.monthlyAnalysesUsed !== null &&
            "gte" in where.monthlyAnalysesUsed
          ) {
            const dec = (data.monthlyAnalysesUsed as { decrement: number }).decrement;
            if (state.org.monthlyAnalysesUsed >= where.monthlyAnalysesUsed.gte) {
              state.org.monthlyAnalysesUsed -= dec;
              return { count: 1 };
            }
            return { count: 0 };
          }
          return { count: 0 };
        },
      ),
    },
  };
  return { prisma: prisma as unknown as PrismaClient, state };
}

function freshOrg(used: number, limit: number): MockOrg {
  return {
    monthlyAnalysesUsed: used,
    billingPeriodStart: new Date(),
    plan: { monthlyAnalysisLimit: limit },
  };
}

describe("QuotaService.reserveAnalyses", () => {
  it("accorde tout quand le solde suffit", async () => {
    const { prisma, state } = mockPrisma(freshOrg(100, 500));
    const quota = new QuotaService(prisma);
    expect(await quota.reserveAnalyses("org-1", 50)).toBe(50);
    expect(state.org.monthlyAnalysesUsed).toBe(150);
  });

  it("plafonne au solde restant", async () => {
    const { prisma, state } = mockPrisma(freshOrg(480, 500));
    const quota = new QuotaService(prisma);
    expect(await quota.reserveAnalyses("org-1", 50)).toBe(20);
    expect(state.org.monthlyAnalysesUsed).toBe(500);
  });

  it("retourne 0 quand le quota est épuisé", async () => {
    const { prisma, state } = mockPrisma(freshOrg(500, 500));
    const quota = new QuotaService(prisma);
    expect(await quota.reserveAnalyses("org-1", 10)).toBe(0);
    expect(state.org.monthlyAnalysesUsed).toBe(500);
  });

  it("accorde tout sans plafond quand le plan est illimité (0)", async () => {
    const { prisma, state } = mockPrisma(freshOrg(9999, 0));
    const quota = new QuotaService(prisma);
    expect(await quota.reserveAnalyses("org-1", 1000)).toBe(1000);
    expect(state.org.monthlyAnalysesUsed).toBe(10999);
  });

  it("deux réservations concurrentes ne dépassent jamais la limite (CAS)", async () => {
    const { prisma, state } = mockPrisma(freshOrg(0, 100));
    const quota = new QuotaService(prisma);
    const [a, b] = await Promise.all([
      quota.reserveAnalyses("org-1", 80),
      quota.reserveAnalyses("org-1", 80),
    ]);
    // L'un obtient 80, l'autre est plafonné à 20 (ou l'inverse selon l'ordre)
    expect(a + b).toBe(100);
    expect(state.org.monthlyAnalysesUsed).toBe(100);
  });

  it("réinitialise le compteur quand la période a plus d'un mois", async () => {
    const stale = freshOrg(450, 500);
    stale.billingPeriodStart = new Date("2020-01-01");
    const { prisma, state } = mockPrisma(stale);
    const quota = new QuotaService(prisma);
    expect(await quota.reserveAnalyses("org-1", 100)).toBe(100);
    expect(state.org.monthlyAnalysesUsed).toBe(100);
  });
});

describe("QuotaService.releaseAnalyses", () => {
  it("décrémente le compteur", async () => {
    const { prisma, state } = mockPrisma(freshOrg(50, 500));
    const quota = new QuotaService(prisma);
    await quota.releaseAnalyses("org-1", 10);
    expect(state.org.monthlyAnalysesUsed).toBe(40);
  });

  it("ne descend jamais sous zéro", async () => {
    const { prisma, state } = mockPrisma(freshOrg(5, 500));
    const quota = new QuotaService(prisma);
    await quota.releaseAnalyses("org-1", 10);
    expect(state.org.monthlyAnalysesUsed).toBe(5);
  });
});
