"use client";

import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { DrawerPanel } from "@/components/ui/drawer-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPLOYEE_RANGE_OPTIONS } from "@commercehunter/shared";

export interface FilterValues {
  entityType?: string;
  priority?: string;
  hasWebsite?: string;
  city?: string;
  employeesRangeCodes?: string;
  isHeadquarters?: string;
  analysisStatus?: string;
  minScore?: string;
  maxScore?: string;
  search?: string;
  sortBy: string;
  sortOrder: string;
}

export interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

const TEXT_DEBOUNCE_MS = 300;
type TextFilterKey = "search" | "city" | "minScore" | "maxScore";

export function FilterPanel({ values, onChange }: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);

  const updateFilter = (key: keyof FilterValues, value: string) => {
    onChange({ ...values, [key]: value || undefined });
  };

  // Champs texte : état local + debounce (sinon 1 navigation + 1 requête API
  // par frappe). Les changements en attente sont mergés pour ne rien perdre
  // si plusieurs champs sont édités dans la même fenêtre.
  const [draft, setDraft] = useState<Pick<FilterValues, TextFilterKey>>({
    search: values.search,
    city: values.city,
    minScore: values.minScore,
    maxScore: values.maxScore,
  });
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const pendingRef = useRef<Partial<FilterValues>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft({
      search: values.search,
      city: values.city,
      minScore: values.minScore,
      maxScore: values.maxScore,
    });
  }, [values.search, values.city, values.minScore, values.maxScore]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const updateTextFilter = (key: TextFilterKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    pendingRef.current[key] = value || undefined;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange({ ...valuesRef.current, ...pendingRef.current });
      pendingRef.current = {};
    }, TEXT_DEBOUNCE_MS);
  };

  const selectedEmpCodes = values.employeesRangeCodes?.split(",").filter(Boolean) ?? [];

  const toggleEmpFilter = (code: string) => {
    const next = selectedEmpCodes.includes(code)
      ? selectedEmpCodes.filter((c) => c !== code)
      : [...selectedEmpCodes, code];
    onChange({ ...values, employeesRangeCodes: next.length > 0 ? next.join(",") : undefined });
  };

  const clearFilters = () => {
    onChange({ sortBy: "digital_score", sortOrder: "desc" });
  };

  const hasActiveFilters =
    values.entityType ||
    values.priority ||
    values.hasWebsite ||
    values.city ||
    values.employeesRangeCodes ||
    values.isHeadquarters ||
    values.analysisStatus ||
    values.minScore ||
    values.maxScore ||
    values.search;

  const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

  const toggleBtnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded-md border transition-colors ${
      active
        ? "border-primary bg-primary/20 text-primary"
        : "border-input bg-transparent text-muted-foreground hover:border-primary/50"
    }`;

  const filterContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-search" className="text-xs text-muted-foreground">Recherche</Label>
        <Input
          id="filter-search"
          type="text"
          value={draft.search ?? ""}
          onChange={(e) => updateTextFilter("search", e.target.value)}
          placeholder="Nom, adresse..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Priorité</Label>
        <select
          value={values.priority ?? ""}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className={selectClass}
        >
          <option value="">Toutes</option>
          <option value="HIGH">Haute</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Basse</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Site web</Label>
        <select
          value={values.hasWebsite ?? ""}
          onChange={(e) => updateFilter("hasWebsite", e.target.value)}
          className={selectClass}
        >
          <option value="">Tous</option>
          <option value="true">Avec site</option>
          <option value="false">Sans site</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Statut analyse</Label>
        <select
          value={values.analysisStatus ?? ""}
          onChange={(e) => updateFilter("analysisStatus", e.target.value)}
          className={selectClass}
        >
          <option value="">Tous</option>
          <option value="COMPLETED">Complétée</option>
          <option value="PENDING">En attente</option>
          <option value="RUNNING">En cours</option>
          <option value="FAILED">Échouée</option>
          <option value="NO_WEBSITE">Sans site web</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="filter-min-score" className="text-xs text-muted-foreground">Score min</Label>
          <Input
            id="filter-min-score"
            type="number"
            min={0}
            max={100}
            value={draft.minScore ?? ""}
            onChange={(e) => updateTextFilter("minScore", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-max-score" className="text-xs text-muted-foreground">Score max</Label>
          <Input
            id="filter-max-score"
            type="number"
            min={0}
            max={100}
            value={draft.maxScore ?? ""}
            onChange={(e) => updateTextFilter("maxScore", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-city" className="text-xs text-muted-foreground">Ville</Label>
        <Input
          id="filter-city"
          type="text"
          value={draft.city ?? ""}
          onChange={(e) => updateTextFilter("city", e.target.value)}
          placeholder="Ville..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Type d&apos;entité</Label>
        <select
          value={values.entityType ?? ""}
          onChange={(e) => updateFilter("entityType", e.target.value)}
          className={selectClass}
        >
          <option value="">Tous</option>
          <option value="COMMERCE">Commerce</option>
          <option value="PME">PME</option>
        </select>
      </div>

      {/* Employee range multi-select */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setEmpOpen(!empOpen)}
          className="flex w-full items-center justify-between"
        >
          <Label className="text-xs text-muted-foreground cursor-pointer">
            Effectifs{selectedEmpCodes.length > 0 ? ` (${selectedEmpCodes.length})` : ""}
          </Label>
          <span className="text-xs text-muted-foreground">{empOpen ? "▲" : "▼"}</span>
        </button>
        {empOpen && (
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-input p-2">
            <div className="flex flex-wrap gap-1">
              {EMPLOYEE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleEmpFilter(opt.value)}
                  className={toggleBtnClass(selectedEmpCodes.includes(opt.value))}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Siège social</Label>
        <select
          value={values.isHeadquarters ?? ""}
          onChange={(e) => updateFilter("isHeadquarters", e.target.value)}
          className={selectClass}
        >
          <option value="">Tous</option>
          <option value="true">Siège uniquement</option>
          <option value="false">Établissements secondaires</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Trier par</Label>
        <div className="flex gap-2">
          <select
            value={values.sortBy}
            onChange={(e) => updateFilter("sortBy", e.target.value)}
            className={`${selectClass} flex-1`}
          >
            <option value="digital_score">Score digital</option>
            <option value="seo_score">Score SEO</option>
            <option value="name">Nom</option>
            <option value="city">Ville</option>
          </select>
          <select
            value={values.sortOrder}
            onChange={(e) => updateFilter("sortOrder", e.target.value)}
            className={`${selectClass} w-20`}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden mb-4">
        <GradientButton
          variant="primary"
          size="sm"
          onClick={() => setMobileOpen(true)}
        >
          Filtres{hasActiveFilters ? " *" : ""}
        </GradientButton>
      </div>

      {/* Mobile drawer */}
      <DrawerPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="left"
        width="18rem"
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading font-semibold">Filtres</h3>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Fermer
            </button>
          </div>
          {filterContent}
        </div>
      </DrawerPanel>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <GlassCard variant="subtle" className="sticky top-6">
          <h3 className="font-heading mb-4 font-semibold">Filtres</h3>
          {filterContent}
        </GlassCard>
      </div>
    </>
  );
}
