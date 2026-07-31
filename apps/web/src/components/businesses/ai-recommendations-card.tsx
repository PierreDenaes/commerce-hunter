"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";

export interface AiRecommendations {
  summary: string;
  priorityActions: {
    title: string;
    why: string;
    impact: "FORT" | "MOYEN";
    effort: "FAIBLE" | "MOYEN" | "IMPORTANT";
  }[];
  quickWins: string[];
  emailDraft: { subject: string; body: string };
}

const IMPACT_CLASSES: Record<string, string> = {
  FORT: "bg-success/20 text-success",
  MOYEN: "bg-warning/20 text-warning",
};

export function AiRecommendationsCard({
  businessId,
  initial,
  generatedAt,
}: {
  businessId: string;
  initial: AiRecommendations | null;
  generatedAt: string | null;
}) {
  const [reco, setReco] = useState<AiRecommendations | null>(initial);
  const [date, setDate] = useState<string | null>(generatedAt);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async (force: boolean) => {
    setLoading(true);
    try {
      const res = await api.post<{
        recommendations: AiRecommendations;
        generatedAt: string;
      }>(`/api/v1/businesses/${businessId}/ai-recommendations`, { force });
      setReco(res.recommendations);
      setDate(res.generatedAt);
      showSuccess("Recommandations générées");
    } catch (err) {
      showApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = async () => {
    if (!reco) return;
    try {
      await navigator.clipboard.writeText(
        `Objet : ${reco.emailDraft.subject}\n\n${reco.emailDraft.body}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponible — ignore
    }
  };

  return (
    <GlassCard className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-primary" />
          Recommandations IA
        </h2>
        {reco && !loading && (
          <button
            type="button"
            onClick={() => generate(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            title="Régénérer les recommandations"
          >
            <RefreshCw className="size-3.5" />
            Régénérer
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-8">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Analyse en cours… (15 à 30 secondes)
          </p>
        </div>
      )}

      {!loading && !reco && (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-muted-foreground">
            Générez une synthèse commerciale personnalisée : actions priorisées
            par impact, quick wins et brouillon d&apos;email de prospection.
          </p>
          <GradientButton variant="primary" size="sm" onClick={() => generate(false)}>
            <Sparkles className="size-4" />
            Générer les recommandations
          </GradientButton>
        </div>
      )}

      {!loading && reco && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="text-sm leading-relaxed">{reco.summary}</p>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions prioritaires
              </h3>
              <ol className="space-y-3">
                {reco.priorityActions.map((action, i) => (
                  <li key={i} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{action.title}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          IMPACT_CLASSES[action.impact] ?? "bg-muted",
                        )}
                      >
                        Impact {action.impact.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{action.why}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Effort : {action.effort.toLowerCase()}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {reco.quickWins.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick wins
                </h3>
                <ul className="space-y-1.5">
                  {reco.quickWins.map((win, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 text-success">✓</span>
                      {win}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Brouillon d&apos;email de prospection
              </h3>
              <button
                type="button"
                onClick={copyEmail}
                className="flex items-center gap-1.5 text-xs text-primary transition hover:underline"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/30 p-4 text-sm">
              <p className="mb-3 font-medium">Objet : {reco.emailDraft.subject}</p>
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {reco.emailDraft.body}
              </p>
            </div>
            {date && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Généré le {new Date(date).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
