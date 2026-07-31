"use client";

import { useEffect, useState } from "react";
import { Plus, ListChecks } from "lucide-react";
import { api } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { GradientButton } from "@/components/ui/gradient-button";
import { Button } from "@/components/ui/button";

interface ProspectListItem {
  id: string;
  name: string;
  _count: { businesses: number };
}

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessIds: string[];
  onSuccess: () => void;
}

export function AddToListDialog({
  open,
  onOpenChange,
  businessIds,
  onSuccess,
}: AddToListDialogProps) {
  const [lists, setLists] = useState<ProspectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setShowCreateInput(false);
    setNewListName("");
    api
      .get<{ data: ProspectListItem[] }>("/api/v1/prospect-lists?limit=100")
      .then((res) => setLists(res.data))
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, [open]);

  const handleAddToList = async (listId: string) => {
    setAdding(true);
    try {
      await api.post(`/api/v1/prospect-lists/${listId}/businesses`, {
        businessIds,
      });
      showSuccess(
        `${businessIds.length} entreprise${businessIds.length > 1 ? "s" : ""} ajoutée${businessIds.length > 1 ? "s" : ""} à la liste`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      showApiError(err);
    } finally {
      setAdding(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const newList = await api.post<{ id: string }>("/api/v1/prospect-lists", {
        name: newListName.trim(),
      });
      await api.post(`/api/v1/prospect-lists/${newList.id}/businesses`, {
        businessIds,
      });
      showSuccess(
        `Liste "${newListName.trim()}" créée avec ${businessIds.length} entreprise${businessIds.length > 1 ? "s" : ""}`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      showApiError(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ajouter à une liste</AlertDialogTitle>
          <AlertDialogDescription>
            {businessIds.length} entreprise{businessIds.length > 1 ? "s" : ""}{" "}
            sélectionnée{businessIds.length > 1 ? "s" : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {/* Create new list */}
          {showCreateInput ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card/50">
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateAndAdd();
                  if (e.key === "Escape") setShowCreateInput(false);
                }}
                placeholder="Nom de la liste..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                maxLength={200}
              />
              <GradientButton
                variant="accent"
                size="sm"
                onClick={handleCreateAndAdd}
                loading={creating}
                disabled={!newListName.trim()}
              >
                Créer & ajouter
              </GradientButton>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateInput(true)}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <Plus className="size-4" />
              Créer une nouvelle liste
            </button>
          )}

          {/* Existing lists */}
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : lists.length === 0 && !showCreateInput ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Aucune liste. Créez-en une !
            </div>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleAddToList(list.id)}
                disabled={adding}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-card/50 transition-colors disabled:opacity-50"
              >
                <ListChecks className="size-4 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{list.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {list._count.businesses} entreprise
                    {list._count.businesses !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
