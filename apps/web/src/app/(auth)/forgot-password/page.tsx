"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    try {
      await api.post("/api/v1/auth/forgot-password", { email });
      setSuccess(true);
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

  return (
    <>
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt="CommerceHunter" width={64} height={64} className="mx-auto mb-3" />
        <h1 className="text-gradient-neon font-heading text-3xl font-bold">
          CommerceHunter
        </h1>
        <p className="text-muted-foreground mt-2">
          Mot de passe oublié
        </p>
      </div>

      <div className="glass rounded-xl p-8">
        {success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground">
              Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
            </p>
            <p className="text-muted-foreground text-sm">
              Vérifiez votre boîte de réception et vos spams.
            </p>
            <Link
              href="/login"
              className="text-primary inline-block font-medium hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <p className="text-muted-foreground text-sm">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

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

            <GradientButton
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Envoyer le lien
            </GradientButton>
          </form>
        )}

        {!success && (
          <p className="text-muted-foreground mt-6 text-center text-sm">
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
