import Image from "next/image";
import Link from "next/link";
import {
  Radar,
  BarChart3,
  Download,
  Zap,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { BILLING_ENABLED } from "@/lib/billing";
import { REGISTRATION_ENABLED } from "@/lib/registration";
import { PLAN_DEFINITIONS } from "@commercehunter/shared";

// Source unique du pricing : @commercehunter/shared (aussi consommée par le seed)
const PRICING = [
  {
    name: "Starter" as const,
    description: "Pour découvrir la plateforme",
    cta: "Commencer",
    highlighted: false,
  },
  {
    name: "Pro" as const,
    description: "Pour les freelances et petites agences",
    cta: "Essai gratuit",
    highlighted: true,
  },
  {
    name: "Agency" as const,
    description: "Pour les agences en croissance",
    cta: "Essai gratuit",
    highlighted: false,
  },
].map((plan) => {
  const def = PLAN_DEFINITIONS[plan.name];
  const features = [
    def.cityLimit === 0 ? "Villes illimitées" : `${def.cityLimit} villes`,
    def.monthlyAnalysisLimit === 0
      ? "Analyses illimitées"
      : `${def.monthlyAnalysisLimit.toLocaleString("fr-FR")} analyses / mois`,
    def.hasPdfExport ? "Export PDF & CSV" : "Export CSV",
  ];
  if (def.hasWhiteLabel) features.push("White Label");
  if (def.hasApiAccess) features.push("Accès API");
  return { ...plan, price: String(def.priceCents / 100), features };
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CommerceHunter",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Outil de prospection pour agences web : scan SIRENE par code postal, score de maturité digitale des entreprises, exports PDF/CSV.",
  inLanguage: "fr",
  ...(BILLING_ENABLED && {
    offers: PRICING.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.price,
      priceCurrency: "EUR",
    })),
  }),
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* Nav */}
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="CommerceHunter" width={32} height={32} />
            <span className="text-gradient-neon font-heading text-xl font-bold">
              CommerceHunter
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Connexion
            </Link>
            {REGISTRATION_ENABLED && (
              <Link
                href="/register"
                className="gradient-neon-primary inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {BILLING_ENABLED ? "Essai gratuit" : "Créer un compte"}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        {/* Glow background */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/4 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute right-1/4 top-1/2 size-[400px] rounded-full bg-accent/8 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="size-3.5" />
            Intelligence digitale pour agences web
          </div>

          <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Identifiez les entreprises{" "}
            <span className="text-gradient-neon">sans présence digitale</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Scannez un code postal, analysez le score digital de chaque
            entreprise et exportez vos leads en PDF ou CSV. Le prospecting            automatisé pour les agences web.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {REGISTRATION_ENABLED && (
              <Link
                href="/register"
                className="gradient-neon-primary inline-flex h-12 items-center gap-2 rounded-lg px-8 text-base font-semibold text-white transition hover:brightness-110"
              >
                Commencer gratuitement
                <ArrowRight className="size-4" />
              </Link>
            )}
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-8 text-base font-medium text-foreground transition hover:bg-muted"
            >
              Se connecter
            </Link>
          </div>

          {REGISTRATION_ENABLED && (
            <p className="mt-4 text-xs text-muted-foreground">
              Aucune carte bancaire requise
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-center text-3xl font-bold">
            Comment ça marche
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            3 étapes pour transformer un code postal en liste de prospects
            qualifiés
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <StepCard
              icon={Radar}
              step="1"
              title="Scannez"
              description="Entrez un code postal et un type d'activité. CommerceHunter interroge la base SIRENE pour trouver toutes les entreprises du secteur."
            />
            <StepCard
              icon={BarChart3}
              step="2"
              title="Analysez"
              description="Chaque entreprise reçoit un score digital automatique : présence web, SEO, mobile, référencement local. Identifiez les priorités HIGH en un clin d'œil."
            />
            <StepCard
              icon={Download}
              step="3"
              title="Exportez"
              description="Générez des rapports PDF individuels ou exportez la liste complète en CSV. Prêt pour votre CRM ou votre prochaine campagne de prospection."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-center text-3xl font-bold">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Un outil complet pour la prospection digitale locale
          </p>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Radar}
              title="Scan SIRENE"
              description="Recherche automatisée dans la base INSEE. Filtrez par code postal, code APE et taille d'entreprise."
            />
            <FeatureCard
              icon={BarChart3}
              title="Score digital"
              description="Analyse technique, SEO on-page, compatibilité mobile et SEO local. Un score sur 100 pour chaque entreprise."
            />
            <FeatureCard
              icon={Zap}
              title="Priorités auto"
              description="Classification HIGH / MEDIUM / LOW basée sur le score. Concentrez vos efforts sur les meilleurs prospects."
            />
            <FeatureCard
              icon={Download}
              title="Export PDF & CSV"
              description="Rapports d'audit PDF professionnels. Export CSV pour intégration dans votre CRM."
            />
            <FeatureCard
              icon={Users}
              title="Multi-utilisateurs"
              description="Invitez votre équipe. Rôles admin et membre. Quotas partagés par organisation."
            />
            <FeatureCard
              icon={Shield}
              title="Données fiables"
              description="Source officielle INSEE / SIRENE. Données à jour avec les dernières publications."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      {BILLING_ENABLED && (
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-center text-3xl font-bold">
            Tarifs simples et transparents
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Commencez gratuitement, évoluez quand vous en avez besoin
          </p>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {PRICING.map((plan) => (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                cta={plan.cta}
                ctaHref="/register"
                highlighted={plan.highlighted}
              />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA */}
      {REGISTRATION_ENABLED && (
      <section className="border-t border-border px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-heading text-3xl font-bold">
            Prêt à trouver vos prochains clients ?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Créez votre compte en 30 secondes et lancez votre premier scan.
          </p>
          <Link
            href="/register"
            className="gradient-neon-primary mt-8 inline-flex h-12 items-center gap-2 rounded-lg px-8 text-base font-semibold text-white transition hover:brightness-110"
          >
            Commencer gratuitement
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CommerceHunter" width={24} height={24} />
            <span className="text-gradient-neon font-heading text-sm font-bold">
              CommerceHunter
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CommerceHunter. Tous droits            réservés.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/mentions-legales" className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="/politique-de-confidentialite" className="hover:text-foreground">
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  icon: Icon,
  step,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass glass-glow-hover rounded-xl p-6 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-6 text-primary" />
      </div>
      <div className="mb-2 inline-flex size-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {step}
      </div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-subtle rounded-xl p-5">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>
      <h3 className="font-heading font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  cta,
  ctaHref,
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl p-6 ${
        highlighted
          ? "glass-elevated ring-2 ring-primary/30"
          : "glass-subtle"
      }`}
    >
      {highlighted && (
        <span className="mb-4 inline-flex w-fit items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
          Populaire
        </span>
      )}
      <h3 className="font-heading text-xl font-bold">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-heading text-4xl font-bold">{price}</span>
        <span className="text-muted-foreground">&euro;/mois</span>
      </div>
      <ul className="mt-6 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition ${
          highlighted
            ? "gradient-neon-primary text-white hover:brightness-110"
            : "border border-border text-foreground hover:bg-muted"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
