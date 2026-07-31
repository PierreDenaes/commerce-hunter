"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Download, Pencil, ArrowLeft, ListChecks } from "lucide-react";
import { api } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import { BusinessTable, type BusinessRow } from "@/components/businesses/business-table";
import { GradientButton } from "@/components/ui/gradient-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface ProspectListDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { businesses: number };
  createdBy: { name: string };
}

interface BusinessListResponse {
  data: (BusinessRow & { entryId: string; addedAt: string })[];
  pagination: { page: number; limit: number; total: number };
}

const LIMIT = 20;

export default function ProspectListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [list, setList] = useState<ProspectListDetail | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(() => {
    setListLoading(true);
    api
      .get<ProspectListDetail>(`/api/v1/prospect-lists/${listId}`)
      .then((data) => {
        setList(data);
        setEditName(data.name);
        setEditDescription(data.description ?? "");
      })
      .catch((err) => {
        showApiError(err);
        router.push("/prospects");
      })
      .finally(() => setListLoading(false));
  }, [listId, router]);

  const fetchBusinesses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (search) params.set("search", search);

    api
      .get<BusinessListResponse>(
        `/api/v1/prospect-lists/${listId}/businesses?${params.toString()}`,
      )
      .then((res) => {
        setBusinesses(res.data);
        setTotal(res.pagination.total);
      })
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, [listId, page, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleRemoveBusiness = async (businessId: string) => {
    try {
      await api.delete(
        `/api/v1/prospect-lists/${listId}/businesses/${businessId}`,
      );
      showSuccess("Entreprise retirée de la liste");
      fetchBusinesses();
      fetchList();
    } catch (err) {
      showApiError(err);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/prospect-lists/${listId}`);
      showSuccess("Liste supprimée");
      router.push("/prospects");
    } catch (err) {
      showApiError(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/prospect-lists/${listId}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      showSuccess("Liste mise à jour");
      setEditOpen(false);
      fetchList();
    } catch (err) {
      showApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    window.open(
      `${apiUrl}/api/v1/export/prospect-list-csv/${listId}`,
      "_blank",
    );
    showSuccess("Export CSV en cours");
  };

  if (listLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="table-row" />
        <SkeletonLoader variant="table-row" />
      </div>
    );
  }

  if (!list) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/prospects"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour aux listes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">{list.name}</h1>
            {list.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {list.description}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {list._count.businesses} entreprise
              {list._count.businesses !== 1 ? "s" : ""} — Créée par{" "}
              {list.createdBy.name} le{" "}
              {new Date(list.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4 mr-1" />
              Modifier
            </Button>
            <GradientButton
              variant="accent"
              size="sm"
              onClick={handleExportCsv}
            >
              <Download className="size-4" />
              Export CSV
            </GradientButton>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher dans la liste..."
          className="w-full max-w-sm rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <BusinessTable
        data={businesses}
        loading={loading}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
        extraColumns={[
          {
            header: "",
            render: (row) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveBusiness(row.id);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Retirer de la liste"
              >
                <Trash2 className="size-4" />
              </button>
            ),
          },
        ]}
      />

      {!loading && businesses.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="Liste vide"
          description="Ajoutez des entreprises depuis la page Entreprises en les sélectionnant."
          action={{ label: "Voir les entreprises", href: "/businesses" }}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la liste</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la liste &quot;{list.name}
              &quot; ? Les entreprises ne seront pas supprimées, seule la liste
              sera retirée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier la liste</AlertDialogTitle>
            <AlertDialogDescription>
              Modifiez le nom et la description de votre liste.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="edit-name">
                Nom
              </label>
              <input
                id="edit-name"
                autoFocus
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                }}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="edit-desc">
                Description (optionnel)
              </label>
              <input
                id="edit-desc"
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
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
              onClick={handleSaveEdit}
              loading={saving}
              disabled={!editName.trim()}
            >
              Enregistrer
            </GradientButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
