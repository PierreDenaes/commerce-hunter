import Link from "next/link";
import Image from "next/image";
import { getLegalConfig } from "@/config/legal";

export const metadata = {
  title: "Mentions légales – CommerceHunter",
};

// Lecture des variables LEGAL_* au runtime (configurable par instance)
export const dynamic = "force-dynamic";

export default function MentionsLegalesPage() {
  const legal = getLegalConfig();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="CommerceHunter" width={32} height={32} />
            <span className="text-gradient-neon font-heading text-xl font-bold">
              CommerceHunter
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <h1 className="font-heading mb-10 text-3xl font-bold">Mentions légales</h1>

        <Section title="Éditeur du site">
          <Row label="Nom" value={legal.ownerName} />
          <Row label="Forme juridique" value={legal.legalForm} />
          <Row label="SIREN" value={legal.siren} />
          <Row label="SIRET (siège)" value={legal.siret} />
          <Row label="N° TVA intracommunautaire" value={legal.vat} />
          <Row label="Adresse" value={legal.address} />
          <Row label="Email" value={legal.email} />
          <Row label="Activité" value={legal.activity} />
        </Section>

        <Section title="Responsable de la publication">
          <p className="text-muted-foreground">
            {legal.ownerName} —{" "}
            <a
              href={`mailto:${legal.email}`}
              className="text-primary hover:underline"
            >
              {legal.email}
            </a>
          </p>
        </Section>

        <Section title="Hébergement">
          <Row label="Hébergeur" value={legal.hostName} />
          <Row label="Site web" value={legal.hostWebsite} />
          <p className="mt-2 text-sm text-muted-foreground">
            {legal.hostAddress}
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p className="text-muted-foreground">
            L&apos;ensemble du contenu de ce site (textes, images, logiciels,
            marques, logos) est la propriété exclusive de {legal.ownerName}{" "}
            ou de ses partenaires et est protégé par les lois françaises et
            internationales relatives à la propriété intellectuelle. Toute
            reproduction, représentation ou diffusion, en tout ou partie, est
            interdite sans autorisation préalable et écrite de l&apos;éditeur.
          </p>
        </Section>

        <Section title="Limitation de responsabilité">
          <p className="text-muted-foreground">
            Les informations fournies sur ce site le sont à titre indicatif.
            {legal.ownerName} ne saurait être tenu responsable des erreurs
            ou omissions, ni de tout dommage direct ou indirect résultant de
            l&apos;utilisation du site. Les données issues de la base SIRENE
            (INSEE) sont utilisées à des fins d&apos;information ; leur
            exactitude relève de la responsabilité de l&apos;INSEE.
          </p>
        </Section>

        <Section title="Droit applicable">
          <p className="text-muted-foreground">
            Le présent site est soumis au droit français. Tout litige relatif à
            son utilisation sera soumis à la compétence exclusive des tribunaux
            français.
          </p>
        </Section>

        <div className="mt-10 text-sm text-muted-foreground">
          Dernière mise à jour : mars 2026
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-subtle mb-8 rounded-xl p-6">
      <h2 className="font-heading mb-4 text-lg font-semibold">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1 sm:flex-row sm:gap-4">
      <span className="w-56 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} CommerceHunter. Tous droits réservés.
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
  );
}
