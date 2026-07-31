"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import type { Priority } from "@/components/ui/priority-badge";

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
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nom
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  APE
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Ville
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Site web
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  SEO
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Digital
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Priorité
                </th>
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
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {b.entityType}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.apeCode}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.city}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {b.website ? (
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
                  <td className="px-4 py-3 text-right tabular-nums">
                    {b.seoScore ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {b.digitalScore ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {b.priority ? (
                      <PriorityBadge priority={b.priority as Priority} size="sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
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
        {b.website ? (
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
