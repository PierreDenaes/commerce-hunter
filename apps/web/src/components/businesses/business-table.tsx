"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Priority } from "@/components/ui/priority-badge";

// ─── Visibilité des colonnes ──────────────────────────────
// La colonne Nom est toujours affichée ; les autres sont activables via le
// menu « Colonnes », choix persisté en localStorage.

const HIDEABLE_COLUMNS = [
  { key: "type", label: "Type" },
  { key: "ape", label: "APE" },
  { key: "city", label: "Ville" },
  { key: "website", label: "Site web" },
  { key: "email", label: "Email" },
  { key: "seo", label: "Score SEO" },
  { key: "digital", label: "Score digital" },
  { key: "priority", label: "Priorité" },
  { key: "analyzedAt", label: "Analysé le" },
] as const;

// Badge site mort + date d'analyse : périmée au-delà de 60 jours.
const STALE_ANALYSIS_DAYS = 60;

function SiteDownBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning whitespace-nowrap">
      Site mort
    </span>
  );
}

function AnalyzedAtCell({ analyzedAt }: { analyzedAt: string | null }) {
  if (!analyzedAt) return <span className="text-muted-foreground">—</span>;
  const date = new Date(analyzedAt);
  const ageDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const stale = ageDays > STALE_ANALYSIS_DAYS;
  return (
    <span
      className={stale ? "text-warning" : "text-muted-foreground"}
      title={stale ? "Analyse ancienne — pensez à ré-analyser" : undefined}
    >
      {date.toLocaleDateString("fr-FR")}
    </span>
  );
}

const HIDDEN_COLS_STORAGE_KEY = "ch-business-table-hidden";

function useHiddenColumns() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_COLS_STORAGE_KEY);
      if (saved) setHidden(new Set(JSON.parse(saved)));
    } catch {
      // stockage indisponible/corrompu — tout affiché
    }
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(HIDDEN_COLS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { hidden, toggleColumn };
}

// ─── Colonnes redimensionnables ───────────────────────────
// Largeurs persistées en localStorage ; drag sur le bord droit de l'en-tête,
// double-clic pour réinitialiser une colonne. Le tableau passe en layout
// fixe dès qu'une largeur est personnalisée (sinon rendu auto d'origine).

const COLUMN_MIN_PX = 60;
const COLUMN_MAX_PX = 640;
const WIDTHS_STORAGE_KEY = "ch-business-table-widths";

function useColumnWidths() {
  const [widths, setWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIDTHS_STORAGE_KEY);
      if (saved) setWidths(JSON.parse(saved));
    } catch {
      // stockage indisponible/corrompu — largeurs auto
    }
  }, []);

  const persist = (next: Record<string, number>) => {
    try {
      localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const startResize = useCallback(
    (key: string, e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      const th = (e.currentTarget as HTMLElement).closest("th");
      if (!th) return;
      const startX = e.clientX;
      const startWidth = th.offsetWidth;

      const onMove = (ev: PointerEvent) => {
        const width = Math.min(
          COLUMN_MAX_PX,
          Math.max(COLUMN_MIN_PX, startWidth + ev.clientX - startX),
        );
        setWidths((prev) => ({ ...prev, [key]: width }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setWidths((prev) => {
          persist(prev);
          return prev;
        });
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  const resetColumn = useCallback((key: string) => {
    setWidths((prev) => {
      const next = { ...prev };
      delete next[key];
      persist(next);
      return next;
    });
  }, []);

  return { widths, startResize, resetColumn };
}

function ResizableTh({
  colKey,
  widths,
  startResize,
  resetColumn,
  className,
  children,
}: {
  colKey: string;
  widths: Record<string, number>;
  startResize: (key: string, e: React.PointerEvent<HTMLElement>) => void;
  resetColumn: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      style={widths[colKey] ? { width: widths[colKey] } : undefined}
      className={cn(
        "relative px-4 py-3 text-left font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
      <span
        role="separator"
        aria-orientation="vertical"
        title="Glisser pour redimensionner — double-clic pour réinitialiser"
        onPointerDown={(e) => startResize(colKey, e)}
        onDoubleClick={() => resetColumn(colKey)}
        className="group/resize absolute inset-y-0 right-0 flex w-2.5 cursor-col-resize touch-none select-none items-center justify-center"
      >
        {/* Trait toujours visible : affordance de redimensionnement */}
        <span className="h-full w-0.5 rounded bg-muted-foreground/40 transition-all group-hover/resize:w-1 group-hover/resize:bg-primary" />
      </span>
    </th>
  );
}

export interface BusinessRow {
  id: string;
  name: string;
  entityType: string;
  apeCode: string;
  city: string;
  website: string | null;
  seoScore: number | null;
  digitalScore: number | null;
  priority: string | null;
  analysisStatus: string | null;
  analyzedAt: string | null;
  contactEmails: string[];
}

export interface BusinessTableProps {
  data: BusinessRow[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  limitOptions?: number[];
  onLimitChange?: (limit: number) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  extraColumns?: {
    header: string;
    render: (row: BusinessRow) => React.ReactNode;
  }[];
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="size-4 rounded border-border bg-card accent-primary cursor-pointer"
    />
  );
}

export function BusinessTable({
  data,
  loading,
  page,
  limit,
  total,
  onPageChange,
  limitOptions,
  onLimitChange,
  selectable = false,
  selectedIds,
  onSelectionChange,
  extraColumns,
}: BusinessTableProps) {
  const totalPages = Math.ceil(total / limit);
  const { widths, startResize, resetColumn } = useColumnWidths();
  const hasCustomWidths = Object.keys(widths).length > 0;
  const thProps = { widths, startResize, resetColumn };
  const { hidden, toggleColumn } = useHiddenColumns();
  const show = (key: string) => !hidden.has(key);

  const pageIds = data.map((b) => b.id);
  const allPageSelected =
    selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds?.has(id));
  const somePageSelected =
    selectable && !allPageSelected && pageIds.some((id) => selectedIds?.has(id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (allPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    onSelectionChange(next);
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonLoader key={i} variant="table-row" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Aucune entreprise trouvée"
        description="Modifiez vos filtres ou sélectionnez un autre scan pour afficher des résultats."
      />
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="mb-2 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Columns3 className="size-3.5" />
              Colonnes
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {HIDEABLE_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={show(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className={cn("w-full text-sm", hasCustomWidths && "table-fixed")}>
            <thead>
              <tr className="border-b border-border bg-card/50">
                {selectable && (
                  <th className="w-10 px-3 py-3">
                    <IndeterminateCheckbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <ResizableTh colKey="name" {...thProps}>
                  Nom
                </ResizableTh>
                {show("type") && (
                  <ResizableTh colKey="type" {...thProps} className="hidden lg:table-cell">
                    Type
                  </ResizableTh>
                )}
                {show("ape") && (
                  <ResizableTh colKey="ape" {...thProps}>
                    APE
                  </ResizableTh>
                )}
                {show("city") && (
                  <ResizableTh colKey="city" {...thProps}>
                    Ville
                  </ResizableTh>
                )}
                {show("website") && (
                  <ResizableTh colKey="website" {...thProps} className="hidden lg:table-cell">
                    Site web
                  </ResizableTh>
                )}
                {show("email") && (
                  <ResizableTh colKey="email" {...thProps} className="hidden xl:table-cell">
                    Email
                  </ResizableTh>
                )}
                {show("seo") && (
                  <ResizableTh colKey="seo" {...thProps} className="text-right">
                    SEO
                  </ResizableTh>
                )}
                {show("digital") && (
                  <ResizableTh colKey="digital" {...thProps} className="text-right">
                    Digital
                  </ResizableTh>
                )}
                {show("priority") && (
                  <ResizableTh colKey="priority" {...thProps}>
                    Priorité
                  </ResizableTh>
                )}
                {show("analyzedAt") && (
                  <ResizableTh colKey="analyzedAt" {...thProps} className="hidden xl:table-cell">
                    Analysé le
                  </ResizableTh>
                )}
                {extraColumns?.map((col) => (
                  <th
                    key={col.header}
                    className="px-4 py-3 text-left font-medium text-muted-foreground"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-border/50 transition-colors hover:bg-card/20"
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(b.id) ?? false}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleOne(b.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 rounded border-border bg-card accent-primary cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      href={`/businesses/${b.id}`}
                      title={b.name}
                      className="block truncate font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {b.name}
                    </Link>
                  </td>
                  {show("type") && (
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {b.entityType}
                    </td>
                  )}
                  {show("ape") && (
                    <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {b.apeCode}
                    </td>
                  )}
                  {show("city") && (
                    <td
                      className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-muted-foreground"
                      title={b.city}
                    >
                      {b.city}
                    </td>
                  )}
                  {show("website") && (
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {b.analysisStatus === "SITE_DOWN" ? (
                      <span className="flex items-center gap-2">
                        <SiteDownBadge />
                        {b.website && (
                          <span className="text-muted-foreground line-through truncate max-w-[140px]">
                            {b.website}
                          </span>
                        )}
                      </span>
                    ) : b.website ? (
                      <a
                        href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate block max-w-[200px]"
                      >
                        {b.website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  )}
                  {show("email") && (
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {b.contactEmails.length > 0 ? (
                      <a
                        href={`mailto:${b.contactEmails[0]}`}
                        className="text-primary hover:underline truncate block max-w-[200px] text-xs"
                        title={b.contactEmails.join(", ")}
                      >
                        {b.contactEmails[0]}
                        {b.contactEmails.length > 1 && (
                          <span className="text-muted-foreground ml-1">+{b.contactEmails.length - 1}</span>
                        )}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  )}
                  {show("seo") && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {b.seoScore ?? "—"}
                    </td>
                  )}
                  {show("digital") && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {b.digitalScore ?? "—"}
                    </td>
                  )}
                  {show("priority") && (
                    <td className="px-4 py-3">
                      {b.priority ? (
                        <PriorityBadge priority={b.priority as Priority} size="sm" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {show("analyzedAt") && (
                    <td className="px-4 py-3 hidden xl:table-cell text-xs">
                      <AnalyzedAtCell analyzedAt={b.analyzedAt} />
                    </td>
                  )}
                  {extraColumns?.map((col) => (
                    <td key={col.header} className="px-4 py-3">
                      {col.render(b)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {selectable && (
          <div className="flex items-center gap-2 px-1">
            <IndeterminateCheckbox
              checked={allPageSelected}
              indeterminate={somePageSelected}
              onChange={toggleAll}
            />
            <span className="text-xs text-muted-foreground">Tout sélectionner</span>
          </div>
        )}
        {data.map((b) => (
          <BusinessCard
            key={b.id}
            business={b}
            selectable={selectable}
            selected={selectedIds?.has(b.id) ?? false}
            onToggle={() => toggleOne(b.id)}
            extraColumns={extraColumns}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-sm">
            {total} résultat{total > 1 ? "s" : ""}
          </p>
          {limitOptions && onLimitChange && (
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-card/50 px-2 py-1 text-sm text-foreground outline-none focus:border-primary cursor-pointer"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <PaginationButton
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Précédent
            </PaginationButton>
            <span className="flex items-center px-3 text-sm tabular-nums text-muted-foreground">
              {page} / {totalPages}
            </span>
            <PaginationButton
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Suivant
            </PaginationButton>
          </div>
        )}
      </div>
    </div>
  );
}

function BusinessCard({
  business: b,
  selectable,
  selected,
  onToggle,
  extraColumns,
}: {
  business: BusinessRow;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  extraColumns?: BusinessTableProps["extraColumns"];
}) {
  return (
    <GlassCard variant="subtle" className="p-4">
      {/* Row 1: checkbox + name + priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              className="size-4 mt-0.5 shrink-0 rounded border-border bg-card accent-primary cursor-pointer"
            />
          )}
          <Link
            href={`/businesses/${b.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors leading-tight truncate"
          >
            {b.name}
          </Link>
        </div>
        {b.priority ? (
          <PriorityBadge priority={b.priority as Priority} size="sm" />
        ) : null}
      </div>

      {/* Row 2: city + APE */}
      <p className="mt-1.5 text-xs text-muted-foreground truncate">
        {b.city} &middot; {b.apeCode}
      </p>

      {/* Row 3: website */}
      <div className="mt-1">
        {b.analysisStatus === "SITE_DOWN" ? (
          <SiteDownBadge />
        ) : b.website ? (
          <a
            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate block"
          >
            {b.website}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Pas de site</span>
        )}
      </div>

      {/* Row 4: email */}
      {b.contactEmails.length > 0 && (
        <a
          href={`mailto:${b.contactEmails[0]}`}
          className="mt-1 text-xs text-primary hover:underline truncate block"
          title={b.contactEmails.join(", ")}
        >
          {b.contactEmails[0]}
          {b.contactEmails.length > 1 && (
            <span className="text-muted-foreground ml-1">+{b.contactEmails.length - 1}</span>
          )}
        </a>
      )}

      {/* Row 5: scores */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">
          SEO <span className="font-medium text-foreground tabular-nums">{b.seoScore ?? "—"}</span>
        </span>
        <span className="text-muted-foreground">
          Digital <span className="font-medium text-foreground tabular-nums">{b.digitalScore ?? "—"}</span>
        </span>
      </div>

      {/* Extra columns (e.g. remove button) */}
      {extraColumns && extraColumns.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          {extraColumns.map((col) => (
            <div key={col.header}>{col.render(b)}</div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-border bg-card/50 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
