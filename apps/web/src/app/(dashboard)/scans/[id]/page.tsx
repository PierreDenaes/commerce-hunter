"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { showApiError } from "@/lib/toast";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ScanRadar } from "@/components/ui/scan-radar";
import { GradientProgressBar } from "@/components/ui/gradient-progress-bar";
import { GradientButton } from "@/components/ui/gradient-button";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScanDetail {
  id: string;
  name: string;
  postalCode: string;
  entityType: string;
  status: string;
  totalBusinesses: number;
  createdAt: string;
  completedAt: string | null;
  stats: {
    commerceCount: number;
    pmeCount: number;
    withWebsite: number;
    withoutWebsite: number;
    averageDigitalScore: number;
    highPriorityCount: number;
    foundBusinesses: number;
    analyzedCount: number;
    websitesAnalyzedCount: number;
  };
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  COMPLETED: {
    label: "Terminé",
    class: "bg-success/20 text-success",
  },
  RUNNING: {
    label: "En cours...",
    class: "bg-warning/20 text-warning",
  },
  PENDING: {
    label: "En attente",
    class: "bg-muted text-muted-foreground",
  },
  FAILED: {
    label: "Échoué",
    class: "bg-destructive/20 text-destructive",
  },
};

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchScan = useCallback(() => {
    api
      .get<ScanDetail>(`/api/v1/scans/${scanId}`)
      .then((data) => {
        setScan(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le scan");
        setLoading(false);
      });
  }, [scanId]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Poll pendant la collecte (PENDING/RUNNING) et tant que les analyses
  // ne sont pas toutes terminées
  useEffect(() => {
    if (!scan) return;
    const collecting = scan.status === "PENDING" || scan.status === "RUNNING";
    const analyzing =
      scan.status === "COMPLETED" &&
      scan.stats.foundBusinesses > 0 &&
      scan.stats.analyzedCount < scan.stats.foundBusinesses;
    if (!collecting && !analyzing) return;

    const interval = setInterval(fetchScan, 3000);
    return () => clearInterval(interval);
  }, [scan, fetchScan]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/scans/${scanId}`);
      router.push("/scans");
    } catch (err) {
      showApiError(err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="card" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error || "Scan introuvable"}
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[scan.status] ?? STATUS_LABELS.PENDING;
  const isActive = scan.status === "RUNNING" || scan.status === "PENDING";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">{scan.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {scan.postalCode} &middot; {scan.entityType}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${statusInfo.class}`}
          >
            {statusInfo.label}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Supprimer ce scan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce scan ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Les données du scan seront supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Suppression..." : "Supprimer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* RUNNING / PENDING state */}
      {isActive && (
        <GlassCard className="flex flex-col items-center gap-6 py-10">
          <ScanRadar active progress={scan.status === "RUNNING" ? 50 : 5} size={140} />
          <p className="text-muted-foreground text-sm text-center">
            {scan.status === "RUNNING"
              ? `Scan en cours sur le code postal ${scan.postalCode} — ${scan.stats.foundBusinesses.toLocaleString("fr-FR")} entreprise${scan.stats.foundBusinesses > 1 ? "s" : ""} trouvée${scan.stats.foundBusinesses > 1 ? "s" : ""} pour l'instant.`
              : "Scan en attente de traitement..."}
          </p>
        </GlassCard>
      )}

      {/* Analyses en cours après la collecte : progression réelle */}
      {scan.status === "COMPLETED" &&
        scan.stats.foundBusinesses > 0 &&
        scan.stats.analyzedCount < scan.stats.foundBusinesses && (
          <GlassCard className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Analyse des sites web...
              </span>
              <span className="font-medium">
                {scan.stats.websitesAnalyzedCount.toLocaleString("fr-FR")} /{" "}
                {scan.stats.withWebsite.toLocaleString("fr-FR")} sites
              </span>
            </div>
            <GradientProgressBar
              value={
                scan.stats.withWebsite > 0
                  ? Math.round(
                      (scan.stats.websitesAnalyzedCount /
                        scan.stats.withWebsite) *
                        100,
                    )
                  : 100
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {scan.stats.withoutWebsite.toLocaleString("fr-FR")} entreprises
              sans site web sont classées directement en priorité haute, sans
              analyse.
            </p>
          </GlassCard>
        )}

      {/* COMPLETED state */}
      {scan.status === "COMPLETED" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Entreprises" value={scan.totalBusinesses} />
            <StatCard label="Commerce" value={scan.stats.commerceCount} />
            <StatCard label="PME" value={scan.stats.pmeCount} />
            <StatCard
              label="Sans site web"
              value={scan.stats.withoutWebsite}
              subtext={
                scan.totalBusinesses > 0
                  ? `${Math.round((scan.stats.withoutWebsite / scan.totalBusinesses) * 100)}%`
                  : undefined
              }
            />
          </div>

          <Link href={`/businesses?scanId=${scan.id}`}>
            <GradientButton variant="primary">
              Voir les entreprises
            </GradientButton>
          </Link>
        </>
      )}

      {/* FAILED state */}
      {scan.status === "FAILED" && (
        <GlassCard variant="subtle">
          <p className="text-sm text-destructive">
            Le scan a échoué. Veuillez réessayer.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number;
  subtext?: string;
}) {
  return (
    <GlassCard hoverable>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-heading mt-1 text-2xl font-bold">
        <AnimatedCounter value={value} />
      </p>
      {subtext && (
        <p className="text-muted-foreground mt-0.5 text-xs">{subtext}</p>
      )}
    </GlassCard>
  );
}
