"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/v1/auth/reset-password", { token, password });
      router.push("/login?reset=success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "Une erreur est survenue");
      } else {
        setError("Une erreur inattendue est survenue");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-destructive text-sm">Lien de réinitialisation invalide.</p>
        <Link
          href="/forgot-password"
          className="text-primary mt-4 inline-block font-medium hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Confirmez votre mot de passe"
          />
        </div>

        <GradientButton
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          Réinitialiser le mot de passe
        </GradientButton>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt="CommerceHunter" width={64} height={64} className="mx-auto mb-3" />
        <h1 className="text-gradient-neon font-heading text-3xl font-bold">
          CommerceHunter
        </h1>
        <p className="text-muted-foreground mt-2">
          Nouveau mot de passe
        </p>
      </div>

      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
