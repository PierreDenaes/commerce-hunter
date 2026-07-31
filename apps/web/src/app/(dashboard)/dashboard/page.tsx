"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { showApiError } from "@/lib/toast";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { Radar, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrgUsage {
  monthlyAnalysesUsed: number;
  monthlyAnalysisLimit: number;
}

interface DashboardStats {
  totalEntities: number;
  commerceCount: number;
  pmeCount: number;
  withoutWebsite: number;
  withoutWebsitePercent: number;
  averageDigitalScore: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  topSectors: Array<{ apeCode: string; label: string; count: number }>;
}

interface ScanOption {
  id: string;
  name: string;
  status: string;
  totalBusinesses: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanOption[]>([]);
  const [selectedScan, setSelectedScan] = useState("");
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<OrgUsage | null>(null);

  useEffect(() => {
    api
      .get<{ data: ScanOption[] }>("/api/v1/scans")
      .then((res) => setScans(res.data.filter((s) => s.status === "COMPLETED")))
      .catch(showApiError);

    // Fetch org usage for quota banner
    api
      .get<{ usage: OrgUsage }>("/api/v1/organization")
      .then((res) => setUsage(res.usage))
      .catch(showApiError);
  }, []);

  useEffect(() => {
    setLoading(true);
    const path = selectedScan
      ? `/api/v1/dashboard/stats?scanId=${selectedScan}`
      : "/api/v1/dashboard/stats";

    api
      .get<DashboardStats>(path)
      .then(setStats)
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, [selectedScan]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Digital Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Scan. Analyze. Convert.
          </p>
        </div>

        {scans.length > 0 && (
          <select
            value={selectedScan}
            onChange={(e) => setSelectedScan(e.target.value)}
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="">Tous les scans</option>
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.totalBusinesses})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Quota warning banner */}
      {usage &&
        usage.monthlyAnalysisLimit > 0 &&
        usage.monthlyAnalysesUsed / usage.monthlyAnalysisLimit > 0.9 && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <span>
              Attention : vous avez utilisé{" "}
              <strong>
                {usage.monthlyAnalysesUsed}/{usage.monthlyAnalysisLimit}
              </strong>{" "}
              analyses ce mois-ci.{" "}
            </span>
            <Link
              href="/settings/billing"
              className="font-medium underline hover:no-underline"
            >
              Mettre à niveau
            </Link>
          </div>
        )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
      ) : stats ? (
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StaggerItem>
            <KPICard label="Total entreprises" value={stats.totalEntities} />
          </StaggerItem>
          <StaggerItem>
            <KPICard label="Commerce" value={stats.commerceCount} />
          </StaggerItem>
          <StaggerItem>
            <KPICard label="PME" value={stats.pmeCount} />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              label="Sans site web"
              value={stats.withoutWebsite}
              suffix={` (${stats.withoutWebsitePercent}%)`}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              label="Score digital moyen"
              value={stats.averageDigitalScore}
              decimals={1}
              suffix="/100"
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              label="Priorité HIGH"
              value={stats.highPriorityCount}
              valueClass="text-success"
            />
          </StaggerItem>
        </StaggerContainer>
      ) : (
        <GlassCard className="py-10 text-center">
          <h2 className="font-heading text-xl font-bold">
            Bienvenue sur CommerceHunter
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Identifiez et analysez les entreprises locales en 3 étapes
          </p>
          <div className="mx-auto mt-8 grid max-w-lg gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Radar className="size-5 text-primary" />
              </div>
              <p className="text-sm font-medium">1. Scan</p>
              <p className="text-xs text-muted-foreground">
                Recherchez par code postal
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="size-5 text-primary" />
              </div>
              <p className="text-sm font-medium">2. Analyse</p>
              <p className="text-xs text-muted-foreground">
                Score digital & SEO
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Download className="size-5 text-primary" />
              </div>
              <p className="text-sm font-medium">3. Export</p>
              <p className="text-xs text-muted-foreground">
                PDF & CSV
              </p>
            </div>
          </div>
          <Button asChild className="mt-8">
            <Link href="/scans/new">Lancer mon premier scan</Link>
          </Button>
        </GlassCard>
      )}

      {stats && stats.topSectors.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading mb-4 text-lg font-semibold">
            Top secteurs
          </h2>
          <div className="space-y-2">
            {stats.topSectors.map((sector) => (
              <GlassCard
                key={sector.apeCode}
                variant="subtle"
                className="flex items-center justify-between py-3 px-4"
              >
                <div>
                  <span className="text-sm font-medium">{sector.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({sector.apeCode})
                  </span>
                </div>
                <span className="font-heading font-bold tabular-nums">
                  {sector.count}
                </span>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  decimals = 0,
  suffix = "",
  valueClass = "",
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  valueClass?: string;
}) {
  return (
    <GlassCard hoverable>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-heading mt-2 text-3xl font-bold ${valueClass}`}>
        <AnimatedCounter value={value} decimals={decimals} />
        {suffix && (
          <span className="text-muted-foreground ml-1 text-base font-normal">
            {suffix}
          </span>
        )}
      </p>
    </GlassCard>
  );
}
