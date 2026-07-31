"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { showApiError } from "@/lib/toast";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { GradientProgressBar } from "@/components/ui/gradient-progress-bar";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { BILLING_ENABLED } from "@/lib/billing";

interface PlanInfo {
  id: string;
  name: string;
  priceCents: number;
  cityLimit: number;
  monthlyAnalysisLimit: number;
  hasPdfExport: boolean;
  hasWhiteLabel: boolean;
  hasApiAccess: boolean;
}

interface OrgResponse {
  id: string;
  name: string;
  plan: PlanInfo;
  usage: {
    monthlyAnalysesUsed: number;
    monthlyAnalysisLimit: number;
    billingPeriodStart: string;
  };
  members: { id: string; name: string; email: string; role: string }[];
}

interface AvailablePlan {
  id: string;
  name: string;
  priceCents: number;
  cityLimit: number;
  monthlyAnalysisLimit: number;
  hasPdfExport: boolean;
  hasWhiteLabel: boolean;
  hasApiAccess: boolean;
}

function planFeatures(p: AvailablePlan): string[] {
  const features = [
    p.cityLimit === 0 ? "Villes illimitées" : `${p.cityLimit} villes`,
    p.monthlyAnalysisLimit === 0
      ? "Analyses illimitées"
      : `${p.monthlyAnalysisLimit.toLocaleString("fr-FR")} analyses/mois`,
  ];
  if (p.hasPdfExport) features.push("Export PDF");
  if (p.hasWhiteLabel) features.push("White Label");
  if (p.hasApiAccess) features.push("Accès API");
  return features;
}

export default function BillingPage() {
  if (!BILLING_ENABLED) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading mb-6 text-2xl font-bold">Abonnement</h1>
        <GlassCard>
          <p className="text-sm text-muted-foreground">
            La facturation est désactivée sur cette instance : toutes les
            fonctionnalités sont incluses sans limite.
          </p>
        </GlassCard>
      </div>
    );
  }
  return (
    <Suspense fallback={<SkeletonLoader variant="card" />}>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const searchParams = useSearchParams();
  const [org, setOrg] = useState<OrgResponse | null>(null);
  const [plans, setPlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const fetchOrg = useCallback(() => {
    Promise.all([
      api.get<OrgResponse>("/api/v1/organization"),
      api.get<{ plans: AvailablePlan[] }>("/api/v1/billing/plans"),
    ])
      .then(([orgRes, plansRes]) => {
        setOrg(orgRes);
        setPlans(plansRes.plans);
      })
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleUpgrade = async (planId: string) => {
    setUpgradeLoading(planId);
    try {
      const res = await api.post<{ checkoutUrl: string }>(
        "/api/v1/billing/checkout",
        { planId },
      );
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      showApiError(err);
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await api.get<{ portalUrl: string }>("/api/v1/billing/portal");
      if (res.portalUrl) {
        window.location.href = res.portalUrl;
      }
    } catch (err) {
      showApiError(err);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="font-heading mb-6 text-2xl font-bold">Abonnement</h1>
        <div className="space-y-4">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Impossible de charger les informations.</p>
      </div>
    );
  }

  const usagePercent =
    org.usage.monthlyAnalysisLimit > 0
      ? Math.round(
          (org.usage.monthlyAnalysesUsed / org.usage.monthlyAnalysisLimit) * 100,
        )
      : 0;

  const isUnlimited = org.usage.monthlyAnalysisLimit === 0;

  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">Abonnement</h1>

      {/* Success/cancel banners */}
      {success && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Votre abonnement a été mis à jour avec succès.
        </div>
      )}
      {canceled && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          La procédure de paiement a été annulée.
        </div>
      )}

      <div className="space-y-6">
        {/* Current plan */}
        <GlassCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Plan actuel :{" "}
                <span className="text-primary">{org.plan.name}</span>
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {org.plan.priceCents === 0
                  ? "Gratuit"
                  : `${(org.plan.priceCents / 100).toFixed(2)} €/mois`}
              </p>
            </div>
            <GradientButton
              variant="accent"
              size="sm"
              loading={portalLoading}
              onClick={handleManageBilling}
            >
              Gérer la facturation
            </GradientButton>
          </div>
        </GlassCard>

        {/* Usage stats */}
        <GlassCard>
          <h2 className="font-heading mb-4 font-semibold">Utilisation mensuelle</h2>

          <div className="space-y-4">
            {/* Analyses */}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analyses</span>
                <span className="font-medium">
                  {org.usage.monthlyAnalysesUsed}
                  {isUnlimited ? " (illimité)" : ` / ${org.usage.monthlyAnalysisLimit}`}
                </span>
              </div>
              {!isUnlimited && (
                <GradientProgressBar value={usagePercent} />
              )}
              {usagePercent > 90 && !isUnlimited && (
                <p className="mt-1 text-xs text-warning">
                  Attention : vous avez utilisé plus de 90% de votre quota mensuel.
                </p>
              )}
            </div>

            {/* Period */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Début de la période</span>
              <span className="font-medium">
                {new Date(org.usage.billingPeriodStart).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Feature access */}
        <GlassCard>
          <h2 className="font-heading mb-4 font-semibold">Fonctionnalités</h2>
          <div className="space-y-2 text-sm">
            <FeatureRow
              label="Villes"
              value={org.plan.cityLimit === 0 ? "Illimité" : `${org.plan.cityLimit}`}
            />
            <FeatureRow
              label="Analyses / mois"
              value={
                org.plan.monthlyAnalysisLimit === 0
                  ? "Illimité"
                  : `${org.plan.monthlyAnalysisLimit}`
              }
            />
            <FeatureRow
              label="Export PDF"
              value={org.plan.hasPdfExport}
            />
            <FeatureRow
              label="White Label"
              value={org.plan.hasWhiteLabel}
            />
            <FeatureRow
              label="Accès API"
              value={org.plan.hasApiAccess}
            />
          </div>
        </GlassCard>

        {/* Upgrade options — plans supérieurs au plan courant (source : API/DB) */}
        {plans.some((p) => p.priceCents > org.plan.priceCents) && (
          <GlassCard>
            <h2 className="font-heading mb-4 font-semibold">
              Passer à un plan supérieur
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {plans
                .filter((p) => p.priceCents > org.plan.priceCents)
                .map((p) => (
                  <PlanCard
                    key={p.id}
                    name={p.name}
                    price={`${p.priceCents / 100} €/mois`}
                    features={planFeatures(p)}
                    loading={upgradeLoading === p.id}
                    onUpgrade={() => handleUpgrade(p.id)}
                  />
                ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Les plans sont gérés via Stripe. Vous serez redirigé vers un
              formulaire de paiement sécurisé.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function FeatureRow({
  label,
  value,
}: {
  label: string;
  value: string | boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {typeof value === "boolean" ? (
        value ? (
          <span className="text-success">Oui</span>
        ) : (
          <span className="text-muted-foreground">Non</span>
        )
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  loading,
  onUpgrade,
}: {
  name: string;
  price: string;
  features: string[];
  loading: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div className="glass rounded-lg border border-border p-4">
      <h3 className="font-heading text-lg font-bold text-primary">{name}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{price}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-success">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <GradientButton
        variant="primary"
        size="sm"
        loading={loading}
        onClick={onUpgrade}
        className="mt-4 w-full"
      >
        Passer au {name}
      </GradientButton>
    </div>
  );
}
