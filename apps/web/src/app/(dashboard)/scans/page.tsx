"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { showApiError } from "@/lib/toast";
import { GradientButton } from "@/components/ui/gradient-button";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Radar } from "lucide-react";

interface ScanItem {
  id: string;
  name: string;
  postalCode: string;
  entityType: string;
  status: string;
  totalBusinesses: number;
  createdAt: string;
}

interface ScansResponse {
  data: ScanItem[];
  pagination: { page: number; limit: number; total: number };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-success/20 text-success",
  RUNNING: "bg-warning/20 text-warning",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/20 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Terminé",
  RUNNING: "En cours",
  PENDING: "En attente",
  FAILED: "Échec",
};

export default function ScansPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ScansResponse>("/api/v1/scans")
      .then((res) => setScans(res.data))
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Scans</h1>
        <Link href="/scans/new">
          <GradientButton variant="primary" size="md">
            Nouveau scan
          </GradientButton>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
      ) : scans.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Aucun scan"
          description="Créez votre premier scan pour identifier les entreprises de votre zone."
          action={{ label: "Nouveau scan", href: "/scans/new" }}
        />
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              href={`/scans/${scan.id}`}
              className="glass glass-glow-hover block rounded-xl p-5 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-semibold">{scan.name}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {scan.postalCode} &middot; {scan.entityType} &middot;{" "}
                    {scan.totalBusinesses} entreprises
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[scan.status] ?? ""}`}
                  >
                    {STATUS_LABELS[scan.status] ?? scan.status}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(scan.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
