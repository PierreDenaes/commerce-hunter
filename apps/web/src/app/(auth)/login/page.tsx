"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { REGISTRATION_ENABLED } from "@/lib/registration";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      await api.post("/api/v1/auth/login", { email, password });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "Échec de la connexion");
      } else {
        setError("Une erreur inattendue est survenue");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-xl p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {resetSuccess && (
          <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Mot de passe modifié avec succès. Connectez-vous avec votre nouveau mot de passe.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.fr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-muted-foreground text-xs hover:text-primary"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <GradientButton
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          Se connecter
        </GradientButton>
      </form>

      {REGISTRATION_ENABLED && (
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-primary font-medium hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt="CommerceHunter" width={64} height={64} className="mx-auto mb-3" />
        <h1 className="text-gradient-neon font-heading text-3xl font-bold">
          CommerceHunter
        </h1>
        <p className="text-muted-foreground mt-2">
          Connectez-vous à votre compte
        </p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
