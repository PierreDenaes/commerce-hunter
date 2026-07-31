"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <GlassCard className="max-w-md text-center">
        <h2 className="font-heading text-xl font-bold">
          Une erreur est survenue
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Quelque chose s&apos;est mal passé. Veuillez réessayer.
        </p>
        <Button onClick={reset} className="mt-4">
          Réessayer
        </Button>
      </GlassCard>
    </div>
  );
}
