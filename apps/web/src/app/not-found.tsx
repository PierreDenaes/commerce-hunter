import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-gradient-neon font-heading text-7xl font-bold">
          404
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Page introuvable
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Retour au dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
