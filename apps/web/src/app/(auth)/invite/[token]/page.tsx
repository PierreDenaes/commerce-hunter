"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    api
      .get<{ email: string; organizationName: string }>(
        `/api/v1/organization/invite/${token}`,
      )
      .then((res) => {
        setInviteEmail(res.email);
        setOrgName(res.organizationName);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(
            typeof err.message === "string"
              ? err.message
              : "Invitation invalide.",
          );
        } else {
          setError("Impossible de vérifier l'invitation.");
        }
      })
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const password = form.get("password") as string;

    try {
      await api.post(`/api/v1/organization/invite/${token}/accept`, {
        name,
        password,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          typeof err.message === "string"
            ? err.message
            : "Erreur lors de la création du compte.",
        );
      } else {
        setError("Une erreur inattendue est survenue.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Vérification de l&apos;invitation...
        </p>
      </div>
    );
  }

  if (error && !inviteEmail) {
    return (
      <div className="text-center">
        <h1 className="text-gradient-neon font-heading mb-4 text-3xl font-bold">
          CommerceHunter
        </h1>
        <div className="glass rounded-xl p-8">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-gradient-neon font-heading text-3xl font-bold">
          CommerceHunter
        </h1>
        <p className="text-muted-foreground mt-2">
          Rejoindre <strong className="text-foreground">{orgName}</strong>
        </p>
      </div>

      <div className="glass rounded-xl p-8">
        <p className="text-muted-foreground mb-6 text-center text-sm">
          Vous avez été invité avec l&apos;adresse{" "}
          <strong className="text-foreground">{inviteEmail}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Votre nom</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Jean Dupont"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Minimum 8 caractères"
            />
          </div>

          <GradientButton
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Créer mon compte
          </GradientButton>
        </form>
      </div>
    </>
  );
}
