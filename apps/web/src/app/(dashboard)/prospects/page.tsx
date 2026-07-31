"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ListChecks, Plus, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ProspectList {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { businesses: number };
  createdBy: { name: string };
}

interface ListResponse {
  data: ProspectList[];
  pagination: { page: number; limit: number; total: number };
}

export default function ProspectsPage() {
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchLists = useCallback(() => {
    setLoading(true);
    api
      .get<ListResponse>("/api/v1/prospect-lists?limit=100")
      .then((res) => setLists(res.data))
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/api/v1/prospect-lists", {
        name: newName.trim(),
        description: newDescription.trim() || null,
      });
      showSuccess("Liste créée");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      fetchLists();
    } catch (err) {
      showApiError(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Listes de prospects</h1>
        <GradientButton
          variant="accent"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Nouvelle liste
        </GradientButton>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Aucune liste de prospects"
          description="Créez votre première liste depuis cette page ou sélectionnez des entreprises depuis un scan."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Link key={list.id} href={`/prospects/${list.id}`}>
              <GlassCard hoverable className="h-full transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-base font-semibold truncate">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                  <ListChecks className="size-5 shrink-0 text-primary" />
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {list._count.businesses} entreprise
                    {list._count.businesses !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {list.createdBy.name}
                  </span>
                  <span>
                    {new Date(list.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nouvelle liste de prospects</AlertDialogTitle>
            <AlertDialogDescription>
              Donnez un nom à votre liste pour organiser vos prospects.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="list-name">
                Nom
              </label>
              <input
                id="list-name"
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="Ex: Prospects La Ciotat"
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="list-desc">
                Description (optionnel)
              </label>
              <input
                id="list-desc"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ex: Restaurants sans site web"
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <GradientButton
              variant="accent"
              size="sm"
              onClick={handleCreate}
              loading={creating}
              disabled={!newName.trim()}
            >
              Créer
            </GradientButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
