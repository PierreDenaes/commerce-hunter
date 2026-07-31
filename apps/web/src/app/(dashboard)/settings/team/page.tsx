"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { Input } from "@/components/ui/input";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface OrgData {
  id: string;
  name: string;
  members: Member[];
}

interface InviteResult {
  id: string;
  email: string;
  inviteUrl: string;
  expiresAt: string;
}

export default function TeamPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<"ADMIN" | "USER">("USER");

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<OrgData & { usage: unknown; plan: unknown }>("/api/v1/organization"),
      api.get<{ user: { id: string; role: "ADMIN" | "USER" } }>("/api/v1/auth/me"),
    ])
      .then(([orgRes, meRes]) => {
        setOrg({ id: orgRes.id, name: orgRes.name, members: orgRes.members });
        setCurrentRole(meRes.user.role);
      })
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteResult(null);
    setInviting(true);

    try {
      const result = await api.post<InviteResult>(
        "/api/v1/organization/invite",
        { email: inviteEmail },
      );
      setInviteResult(result);
      setInviteEmail("");
      showSuccess("Invitation envoyée");

      // Refresh members list
      const res = await api.get<OrgData & { usage: unknown; plan: unknown }>(
        "/api/v1/organization",
      );
      setOrg({ id: res.id, name: res.name, members: res.members });
    } catch (err) {
      if (err instanceof ApiError) {
        setInviteError(
          typeof err.message === "string" ? err.message : "Erreur lors de l'invitation",
        );
      } else {
        setInviteError("Une erreur inattendue est survenue.");
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteResult) return;
    await navigator.clipboard.writeText(inviteResult.inviteUrl);
    showSuccess("Lien copié dans le presse-papier");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Équipe</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gérez les membres de votre organisation
        </p>
      </div>

      {/* Members list */}
      <GlassCard className="mb-6">
        <h2 className="font-heading mb-4 font-semibold">
          Membres ({org?.members.length ?? 0})
        </h2>
        <div className="space-y-3">
          {org?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-muted-foreground text-xs">{member.email}</p>
              </div>
              <RoleBadge role={member.role} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Invite form — ADMIN only */}
      {currentRole === "ADMIN" && (
        <GlassCard>
          <h2 className="font-heading mb-4 font-semibold">
            Inviter un membre
          </h2>

          <form onSubmit={handleInvite} className="space-y-4">
            {inviteError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {inviteError}
              </div>
            )}

            <div className="flex gap-3">
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemple.fr"
                className="flex-1"
              />
              <GradientButton
                type="submit"
                variant="primary"
                size="md"
                loading={inviting}
              >
                Inviter
              </GradientButton>
            </div>
          </form>

          {inviteResult && (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
              <p className="text-success mb-2">
                Invitation créée pour {inviteResult.email}
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteResult.inviteUrl}
                  className="bg-card/50 border-border flex-1 rounded border px-3 py-2 text-xs text-foreground"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs font-medium transition hover:bg-muted"
                >
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Ce lien expire le{" "}
                {new Date(inviteResult.expiresAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "ADMIN" | "USER" }) {
  return role === "ADMIN" ? (
    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      Admin
    </span>
  ) : (
    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      Membre
    </span>
  );
}
