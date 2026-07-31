"use client";

import { Button } from "@/components/ui/button";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center">
      <h1 className="text-gradient-neon font-heading mb-4 text-3xl font-bold">
        CommerceHunter
      </h1>
      <div className="glass rounded-xl p-8">
        <h2 className="font-heading text-lg font-semibold">
          Une erreur est survenue
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Impossible de charger cette page.
        </p>
        <Button onClick={reset} className="mt-4">
          Réessayer
        </Button>
      </div>
    </div>
  );
}
