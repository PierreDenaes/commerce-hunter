import type { PrismaClient } from "@commercehunter/db";

type QuotaResult =
  | { allowed: true }
  | { allowed: false; error: string; plan: string };

export class QuotaService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Reset mensuel paresseux : si la période de facturation a plus d'un mois,
   * remet le compteur à zéro. Atomique (condition dans le WHERE) — appelé
   * avant toute lecture/réservation de quota. Couvre les orgs hors Stripe
   * (le webhook invoice.paid fait la même chose pour les abonnés).
   */
  async ensureCurrentPeriod(organizationId: string): Promise<void> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    await this.prisma.organization.updateMany({
      where: { id: organizationId, billingPeriodStart: { lte: oneMonthAgo } },
      data: { monthlyAnalysesUsed: 0, billingPeriodStart: new Date() },
    });
  }

  /**
   * Réserve atomiquement jusqu'à `count` analyses et retourne le nombre accordé
   * (0 si quota épuisé, `count` si plan illimité). CAS optimiste : l'incrément
   * n'est appliqué que si le compteur n'a pas bougé depuis la lecture — deux
   * réservations concurrentes ne peuvent pas dépasser la limite.
   */
  async reserveAnalyses(organizationId: string, count: number): Promise<number> {
    if (count <= 0) return 0;
    await this.ensureCurrentPeriod(organizationId);

    for (let attempt = 0; attempt < 5; attempt++) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: { plan: { select: { monthlyAnalysisLimit: true } } },
      });
      if (!org) return 0;

      const limit = org.plan.monthlyAnalysisLimit;
      // 0 = illimité : on comptabilise l'usage (stats) sans plafonner
      const granted =
        limit === 0
          ? count
          : Math.min(count, Math.max(limit - org.monthlyAnalysesUsed, 0));
      if (granted === 0) return 0;

      const res = await this.prisma.organization.updateMany({
        where: { id: organizationId, monthlyAnalysesUsed: org.monthlyAnalysesUsed },
        data: { monthlyAnalysesUsed: { increment: granted } },
      });
      if (res.count === 1) return granted;
    }
    // Contention persistante : refuser plutôt que risquer un dépassement
    return 0;
  }

  /**
   * Rend des analyses réservées mais non consommées (échecs). Ne descend
   * jamais sous zéro (condition gte dans le WHERE).
   */
  async releaseAnalyses(organizationId: string, count: number): Promise<void> {
    if (count <= 0) return;
    await this.prisma.organization.updateMany({
      where: { id: organizationId, monthlyAnalysesUsed: { gte: count } },
      data: { monthlyAnalysesUsed: { decrement: count } },
    });
  }

  /**
   * Check if the organization can scan a new postal code.
   * Returns allowed:false if cityLimit > 0 and the new code is not already scanned.
   */
  async checkCityLimit(
    organizationId: string,
    newPostalCode: string,
  ): Promise<QuotaResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { plan: { select: { name: true, cityLimit: true } } },
    });

    if (!org) return { allowed: false, error: "Organization not found", plan: "unknown" };

    // 0 = unlimited
    if (org.plan.cityLimit === 0) return { allowed: true };

    const distinctCities = await this.prisma.scan.findMany({
      where: { organizationId },
      select: { postalCode: true },
      distinct: ["postalCode"],
    });

    const existingCodes = new Set(distinctCities.map((s) => s.postalCode));

    // If the postal code is already scanned, no new city consumed
    if (existingCodes.has(newPostalCode)) return { allowed: true };

    if (existingCodes.size >= org.plan.cityLimit) {
      return {
        allowed: false,
        error: `Limite de villes atteinte. Votre plan ${org.plan.name} autorise ${org.plan.cityLimit} ville(s). Passez au plan Pro pour un accès illimité.`,
        plan: org.plan.name,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if the organization has enough analysis quota for `count` new analyses.
   * Returns allowed:false if monthlyAnalysisLimit > 0 and usage would exceed limit.
   */
  async checkAnalysisQuota(
    organizationId: string,
    count: number,
  ): Promise<QuotaResult> {
    await this.ensureCurrentPeriod(organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        plan: { select: { name: true, monthlyAnalysisLimit: true } },
      },
    });

    if (!org) return { allowed: false, error: "Organization not found", plan: "unknown" };

    // 0 = unlimited
    if (org.plan.monthlyAnalysisLimit === 0) return { allowed: true };

    const remaining = org.plan.monthlyAnalysisLimit - org.monthlyAnalysesUsed;

    if (remaining < count) {
      return {
        allowed: false,
        error: `Quota d'analyses mensuel dépassé. ${org.monthlyAnalysesUsed}/${org.plan.monthlyAnalysisLimit} utilisées. Passez à un plan supérieur pour plus d'analyses.`,
        plan: org.plan.name,
      };
    }

    return { allowed: true };
  }

  /**
   * Returns how many analyses the org can still run this month.
   * Returns -1 if unlimited (limit === 0).
   */
  async getRemainingAnalyses(organizationId: string): Promise<number> {
    await this.ensureCurrentPeriod(organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { plan: { select: { monthlyAnalysisLimit: true } } },
    });
    if (!org) return 0;
    if (org.plan.monthlyAnalysisLimit === 0) return -1;
    return Math.max(0, org.plan.monthlyAnalysisLimit - org.monthlyAnalysesUsed);
  }

  /**
   * Check if the organization's plan includes a specific feature.
   */
  async checkFeatureAccess(
    organizationId: string,
    feature: "hasPdfExport" | "hasWhiteLabel" | "hasApiAccess",
  ): Promise<QuotaResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        plan: {
          select: {
            name: true,
            hasPdfExport: true,
            hasWhiteLabel: true,
            hasApiAccess: true,
          },
        },
      },
    });

    if (!org) return { allowed: false, error: "Organization not found", plan: "unknown" };

    const featureLabels: Record<string, string> = {
      hasPdfExport: "Export PDF",
      hasWhiteLabel: "White Label",
      hasApiAccess: "Accès API",
    };

    if (!org.plan[feature]) {
      return {
        allowed: false,
        error: `${featureLabels[feature]} n'est pas disponible sur votre plan ${org.plan.name}. Passez au plan Pro ou Agency.`,
        plan: org.plan.name,
      };
    }

    return { allowed: true };
  }

  /**
   * Get current usage stats for the organization (for frontend display).
   */
  async getUsageStats(organizationId: string) {
    await this.ensureCurrentPeriod(organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        plan: true,
      },
    });

    if (!org) return null;

    return {
      monthlyAnalysesUsed: org.monthlyAnalysesUsed,
      monthlyAnalysisLimit: org.plan.monthlyAnalysisLimit,
      billingPeriodStart: org.billingPeriodStart.toISOString(),
      usagePercent:
        org.plan.monthlyAnalysisLimit > 0
          ? Math.round(
              (org.monthlyAnalysesUsed / org.plan.monthlyAnalysisLimit) * 100,
            )
          : 0,
    };
  }
}
