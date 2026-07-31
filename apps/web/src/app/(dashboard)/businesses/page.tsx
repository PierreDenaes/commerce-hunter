"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import { BusinessTable, type BusinessRow } from "@/components/businesses/business-table";
import { FilterPanel, type FilterValues } from "@/components/businesses/filter-panel";
import { SelectionActionBar } from "@/components/businesses/selection-action-bar";
import { ExportCsvDialog, EXPORT_COLUMNS } from "@/components/businesses/export-csv-dialog";
import { AddToListDialog } from "@/components/prospects/add-to-list-dialog";
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

interface BusinessListResponse {
  data: BusinessRow[];
  pagination: { page: number; limit: number; total: number };
}

interface ScanOption {
  id: string;
  name: string;
  totalBusinesses: number;
}

interface ScanListResponse {
  data: ScanOption[];
}

const LIMIT_OPTIONS = [20, 50, 100] as const;

export default function BusinessesPage() {
  return (
    <Suspense fallback={<SkeletonLoader variant="card" />}>
      <BusinessesPageInner />
    </Suspense>
  );
}

function BusinessesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<BusinessRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [scans, setScans] = useState<ScanOption[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const scanId = searchParams.get("scanId") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = LIMIT_OPTIONS.includes(Number(searchParams.get("limit")) as typeof LIMIT_OPTIONS[number])
    ? Number(searchParams.get("limit"))
    : 20;

  const filters: FilterValues = {
    entityType: searchParams.get("entityType") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    hasWebsite: searchParams.get("hasWebsite") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    employeesRangeCodes: searchParams.get("employeesRangeCodes") ?? undefined,
    isHeadquarters: searchParams.get("isHeadquarters") ?? undefined,
    analysisStatus: searchParams.get("analysisStatus") ?? undefined,
    minScore: searchParams.get("minScore") ?? undefined,
    maxScore: searchParams.get("maxScore") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? "digital_score",
    sortOrder: searchParams.get("sortOrder") ?? "desc",
  };

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // replace : les changements de filtres ne polluent pas l'historique
      router.replace(`/businesses?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handleFilterChange = useCallback(
    (newFilters: FilterValues) => {
      const params: Record<string, string | undefined> = {
        ...newFilters,
        scanId: scanId || undefined,
        page: "1",
      };
      setParams(params);
    },
    [scanId, setParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setParams({ page: String(newPage) });
    },
    [setParams],
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setParams({ limit: String(newLimit), page: "1" });
    },
    [setParams],
  );

  const handleScanChange = useCallback(
    (newScanId: string) => {
      setParams({ scanId: newScanId || undefined, page: "1" });
    },
    [setParams],
  );

  // Load scans for the selector
  useEffect(() => {
    api
      .get<ScanListResponse>("/api/v1/scans?limit=100&status=COMPLETED")
      .then((res) => setScans(res.data))
      .catch(() => {});
  }, []);

  // Load businesses
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (scanId) params.set("scanId", scanId);
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.hasWebsite) params.set("hasWebsite", filters.hasWebsite);
    if (filters.city) params.set("city", filters.city);
    if (filters.employeesRangeCodes) params.set("employeesRangeCodes", filters.employeesRangeCodes);
    if (filters.isHeadquarters) params.set("isHeadquarters", filters.isHeadquarters);
    if (filters.analysisStatus) params.set("analysisStatus", filters.analysisStatus);
    if (filters.minScore) params.set("minScore", filters.minScore);
    if (filters.maxScore) params.set("maxScore", filters.maxScore);
    if (filters.search) params.set("search", filters.search);
    params.set("sortBy", filters.sortBy);
    params.set("sortOrder", filters.sortOrder);

    api
      .get<BusinessListResponse>(`/api/v1/businesses?${params.toString()}`)
      .then((res) => {
        setData(res.data);
        setTotal(res.pagination.total);
      })
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, [scanId, page, limit, filters.entityType, filters.priority, filters.hasWebsite, filters.city, filters.employeesRangeCodes, filters.isHeadquarters, filters.analysisStatus, filters.minScore, filters.maxScore, filters.search, filters.sortBy, filters.sortOrder]);

  const handleExportCsv = (columns: string[]) => {
    if (!scanId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const params = new URLSearchParams();
    params.set("scanId", scanId);
    if (columns.length < EXPORT_COLUMNS.length) {
      params.set("columns", columns.join(","));
    }
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.hasWebsite) params.set("hasWebsite", filters.hasWebsite);
    if (filters.city) params.set("city", filters.city);
    if (filters.employeesRangeCodes) params.set("employeesRangeCodes", filters.employeesRangeCodes);
    if (filters.isHeadquarters) params.set("isHeadquarters", filters.isHeadquarters);
    if (filters.analysisStatus) params.set("analysisStatus", filters.analysisStatus);
    if (filters.minScore) params.set("minScore", filters.minScore);
    if (filters.maxScore) params.set("maxScore", filters.maxScore);
    if (filters.search) params.set("search", filters.search);
    params.set("sortBy", filters.sortBy);
    params.set("sortOrder", filters.sortOrder);

    window.open(`${apiUrl}/api/v1/export/csv?${params.toString()}`, "_blank");
    setExportOpen(false);
    showSuccess("Export CSV en cours");
  };

  const handleBulkReanalyze = async () => {
    if (!scanId) return;
    setReanalyzing(true);
    try {
      const res = await api.post<{ message: string; businessCount: number }>(
        `/api/v1/scans/${scanId}/reanalyze`,
      );
      showSuccess(`Re-analyse lancée pour ${res.businessCount} entreprises`);
    } catch (err) {
      showApiError(err);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold">Entreprises</h1>
        <div className="flex flex-wrap items-center gap-3">
          {scanId && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <GradientButton variant="primary" size="sm" loading={reanalyzing}>
                    Re-analyser tout
                  </GradientButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Re-analyser toutes les entreprises</AlertDialogTitle>
                    <AlertDialogDescription>
                      Toutes les analyses de ce scan seront relancées. Cela peut prendre plusieurs minutes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkReanalyze}>
                      Lancer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <GradientButton variant="accent" size="sm" onClick={() => setExportOpen(true)}>
                Export CSV
              </GradientButton>
              <ExportCsvDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleExportCsv}
              />
            </>
          )}
        </div>
      </div>

      {/* Scan selector */}
      <div className="mb-4">
        <select
          value={scanId}
          onChange={(e) => handleScanChange(e.target.value)}
          className="rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary cursor-pointer w-full md:min-w-[250px] md:w-auto"
        >
          <option value="">Tous les scans</option>
          {scans.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.totalBusinesses})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filter sidebar */}
        <div className="lg:w-64 lg:shrink-0">
          <FilterPanel values={filters} onChange={handleFilterChange} />
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
          <BusinessTable
            data={data}
            loading={loading}
            page={page}
            limit={limit}
            total={total}
            onPageChange={handlePageChange}
            limitOptions={LIMIT_OPTIONS as unknown as number[]}
            onLimitChange={handleLimitChange}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      </div>

      <SelectionActionBar
        count={selectedIds.size}
        onAddToList={() => setAddToListOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      <AddToListDialog
        open={addToListOpen}
        onOpenChange={setAddToListOpen}
        businessIds={Array.from(selectedIds)}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
