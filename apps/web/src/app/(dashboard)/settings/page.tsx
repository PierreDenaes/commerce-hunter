import Link from "next/link";
import { Users, CreditCard } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { BILLING_ENABLED } from "@/lib/billing";

const SETTINGS_LINKS = [
  {
    href: "/settings/team",
    icon: Users,
    title: "Équipe",
    description: "Gérez les membres de votre organisation et envoyez des invitations.",
  },
  {
    href: "/settings/billing",
    icon: CreditCard,
    title: "Abonnement",
    description: "Consultez votre plan actuel, votre utilisation et passez à un plan supérieur.",
  },
].filter((link) => BILLING_ENABLED || link.href !== "/settings/billing");

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configurez votre organisation
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <GlassCard hoverable className="h-full">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <link.icon className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold">{link.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
