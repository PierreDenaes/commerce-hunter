"use client";

import { Button } from "@/components/ui/button";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold">Une erreur est survenue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Quelque chose s&apos;est mal passé. Veuillez réessayer.
        </p>
        <Button onClick={reset} className="mt-4">
          Réessayer
        </Button>
      </div>
    </div>
  );
}
