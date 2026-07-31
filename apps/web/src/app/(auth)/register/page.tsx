"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { REGISTRATION_ENABLED } from "@/lib/registration";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  if (!REGISTRATION_ENABLED) {
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="font-heading text-2xl font-bold">Inscriptions fermées</h1>
        <p className="text-muted-foreground mt-4 text-sm">
          Les inscriptions sont fermées sur cette instance. CommerceHunter est
          open source : vous pouvez l&apos;héberger vous-même avec vos propres
          clés API.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
  }
  return <RegisterPageInner />;
}

function RegisterPageInner() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const organizationName = form.get("organizationName") as string;
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      await api.post("/api/v1/auth/register", {
        organizationName,
        name,
        email,
        password,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "Échec de l'inscription");
      } else {
        setError("Une erreur inattendue est survenue");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt="CommerceHunter" width={64} height={64} className="mx-auto mb-3" />
        <h1 className="text-gradient-neon font-heading text-3xl font-bold">
          CommerceHunter
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez votre compte gratuitement
        </p>
      </div>

      <div className="glass rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="organizationName">Nom de l&apos;organisation</Label>
            <Input
              id="organizationName"
              name="organizationName"
              type="text"
              required
              placeholder="Mon Entreprise"
            />
          </div>

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

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </>
  );
}
