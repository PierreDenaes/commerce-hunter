"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Miroir des clés de colonnes de l'API (apps/api/src/utils/csv-export.ts)
export const EXPORT_COLUMNS = [
  { key: "name", label: "Nom" },
  { key: "siret", label: "SIRET" },
  { key: "siren", label: "SIREN" },
  { key: "type", label: "Type" },
  { key: "ape", label: "Code APE" },
  { key: "legalForm", label: "Forme juridique" },
  { key: "employees", label: "Effectifs" },
  { key: "address", label: "Adresse" },
  { key: "postalCode", label: "Code postal" },
  { key: "city", label: "Ville" },
  { key: "phone", label: "Téléphone" },
  { key: "website", label: "Site web" },
  { key: "emails", label: "Emails" },
  { key: "headquarters", label: "Siège social" },
  { key: "seoScore", label: "Score SEO" },
  { key: "digitalScore", label: "Score digital" },
  { key: "priority", label: "Priorité" },
  { key: "analysisStatus", label: "Statut analyse" },
  { key: "analyzedAt", label: "Analysé le" },
] as const;

const STORAGE_KEY = "ch-export-csv-columns";
const ALL_KEYS = EXPORT_COLUMNS.map((c) => c.key as string);

export function ExportCsvDialog({
  open,
  onOpenChange,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reçoit les clés sélectionnées — vide jamais (bouton désactivé sinon). */
  onExport: (columns: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const keys = (JSON.parse(saved) as string[]).filter((k) =>
          ALL_KEYS.includes(k),
        );
        if (keys.length > 0) setSelected(new Set(keys));
      }
    } catch {
      // stockage indisponible — tout sélectionné
    }
  }, []);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = selected.size === ALL_KEYS.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set<string>() : new Set(ALL_KEYS));
  };

  const handleExport = () => {
    // Ordre canonique (celui de l'API), pas l'ordre de clic
    const columns = ALL_KEYS.filter((k) => selected.has(k));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
      // ignore
    }
    onExport(columns);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Colonnes à exporter</AlertDialogTitle>
          <AlertDialogDescription>
            Choisissez les colonnes du fichier CSV. Votre sélection est
            mémorisée pour les prochains exports.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-2">
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded border-border bg-card accent-primary"
            />
            Tout sélectionner
          </label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {EXPORT_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(col.key)}
                  onChange={() => toggle(col.key)}
                  className="size-4 rounded border-border bg-card accent-primary"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleExport} disabled={selected.size === 0}>
            Exporter ({selected.size} colonne{selected.size > 1 ? "s" : ""})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
