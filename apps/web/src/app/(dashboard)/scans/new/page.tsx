"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { showSuccess } from "@/lib/toast";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APE_GROUPS } from "@commercehunter/shared";

const ENTITY_TYPES = [
  { value: "BOTH", label: "Tous" },
  { value: "COMMERCE", label: "Commerce" },
  { value: "PME", label: "PME" },
];

export default function NewScanPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedApe, setSelectedApe] = useState<string[]>([]);

  function toggleApe(code: string) {
    setSelectedApe((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsQuotaError(false);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const postalCode = form.get("postalCode") as string;
    const entityType = form.get("entityType") as string;
    const minEmployeesRaw = form.get("minEmployees") as string;

    if (!/^\d{5}$/.test(postalCode)) {
      setError("Le code postal doit contenir exactement 5 chiffres.");
      setLoading(false);
      return;
    }

    try {
      const scan = await api.post<{ id: string }>("/api/v1/scans", {
        name,
        postalCode,
        entityType,
        apeCategories: selectedApe,
        minEmployees: minEmployeesRaw ? parseInt(minEmployeesRaw, 10) : null,
      });
      showSuccess("Scan lancé avec succès");
      router.push(`/scans/${scan.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "Échec de la création du scan");
        if (err.status === 403) setIsQuotaError(true);
      } else {
        setError("Une erreur inattendue est survenue");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading mb-6 text-2xl font-bold">Nouveau scan</h1>

      <div className="glass rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={`rounded-lg px-4 py-3 text-sm ${isQuotaError ? "border border-warning/30 bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
              <p>{error}</p>
              {isQuotaError && (
                <Link
                  href="/settings/billing"
                  className="mt-2 inline-block font-medium underline hover:no-underline"
                >
                  Mettre à niveau mon plan
                </Link>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nom du scan</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ex: La Ciotat Commerce Q1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Code postal</Label>
            <Input
              id="postalCode"
              name="postalCode"
              type="text"
              required
              maxLength={5}
              pattern="\d{5}"
              placeholder="13600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entityType">Type d&apos;entité</Label>
            <select
              id="entityType"
              name="entityType"
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <Label>Catégories APE (optionnel)</Label>
            <p className="text-xs text-muted-foreground">Sélectionnez un ou plusieurs secteurs pour cibler votre recherche</p>
            {APE_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleApe(opt.value)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        selectedApe.includes(opt.value)
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-card/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="minEmployees">Employés minimum (optionnel)</Label>
            <Input
              id="minEmployees"
              name="minEmployees"
              type="number"
              min={1}
              placeholder="Ex: 10"
            />
          </div>

          <GradientButton
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Lancer le scan
          </GradientButton>
        </form>
      </div>
    </div>
  );
}
