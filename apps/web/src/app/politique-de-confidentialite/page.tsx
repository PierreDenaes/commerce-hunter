import Link from "next/link";
import Image from "next/image";
import { getLegalConfig } from "@/config/legal";

export const metadata = {
  title: "Politique de confidentialité – CommerceHunter",
};

// Lecture des variables LEGAL_* au runtime (configurable par instance)
export const dynamic = "force-dynamic";

export default function PolitiqueConfidentialitePage() {
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
        <h1 className="font-heading mb-4 text-3xl font-bold">
          Politique de confidentialité
        </h1>
        <p className="mb-10 text-muted-foreground">
          {legal.ownerName} (ci-après « CommerceHunter ») s&apos;engage à
          protéger la vie privée de ses utilisateurs conformément au Règlement
          Général sur la Protection des Données (RGPD — UE 2016/679) et à la
          loi Informatique et Libertés.
        </p>

        <Section title="1. Responsable du traitement">
          <p className="text-muted-foreground">
            {legal.ownerName} — {legal.legalForm}
            <br />
            {legal.address}
            <br />
            Email :{" "}
            <a
              href={`mailto:${legal.email}`}
              className="text-primary hover:underline"
            >
              {legal.email}
            </a>
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p className="mb-3 text-muted-foreground">
            Lors de l&apos;utilisation de CommerceHunter, nous collectons les
            données suivantes :
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <DataItem
              label="Données de compte"
              value="Nom, adresse e-mail, mot de passe (hashé avec bcrypt)"
            />
            <DataItem
              label="Données d'organisation"
              value="Nom de l'organisation, plan d'abonnement"
            />
            <DataItem
              label="Données d'utilisation"
              value="Scans effectués, analyses réalisées, exports générés"
            />
            <DataItem
              label="Données de facturation"
              value="Gérées par Stripe — CommerceHunter ne stocke pas vos coordonnées bancaires"
            />
            <DataItem
              label="Données techniques"
              value="Adresse IP, type de navigateur, logs d'accès (à des fins de sécurité)"
            />
          </ul>
        </Section>

        <Section title="3. Finalités du traitement">
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              Création et gestion de votre compte utilisateur
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              Fourniture du service (scans SIRENE, analyses, exports)
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              Gestion de l&apos;abonnement et de la facturation
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              Envoi d&apos;emails transactionnels (confirmation, invitation, réinitialisation de mot de passe)
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              Sécurité et prévention des abus
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              Amélioration du service
            </li>
          </ul>
        </Section>

        <Section title="4. Base légale">
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <strong className="text-foreground">Exécution du contrat</strong> — traitement nécessaire à la fourniture du service souscrit
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <strong className="text-foreground">Intérêt légitime</strong> — sécurité, prévention de la fraude, amélioration du produit
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <strong className="text-foreground">Obligation légale</strong> — conservation des données de facturation (10 ans)
              </span>
            </li>
          </ul>
        </Section>

        <Section title="5. Durée de conservation">
          <ul className="space-y-2 text-muted-foreground">
            <DataItem label="Données de compte" value="Jusqu'à la suppression du compte + 30 jours" />
            <DataItem label="Données d'utilisation" value="Durée de l'abonnement actif" />
            <DataItem label="Données de facturation" value="10 ans (obligation légale)" />
            <DataItem label="Logs techniques" value="90 jours" />
          </ul>
        </Section>

        <Section title="6. Sous-traitants et tiers">
          <ul className="space-y-2 text-muted-foreground">
            <DataItem
              label="Stripe"
              value="Paiement en ligne — politique disponible sur stripe.com/fr/privacy"
            />
            <DataItem
              label="Google PageSpeed API"
              value="Analyse de performance des sites web"
            />
            <DataItem
              label="INSEE / SIRENE"
              value="Données d'entreprises françaises (données publiques)"
            />
            <DataItem
              label={legal.hostName}
              value="Hébergement des serveurs"
            />
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Ces sous-traitants sont soumis à des obligations contractuelles de
            confidentialité et ne peuvent utiliser vos données qu&apos;aux fins
            pour lesquelles elles leur ont été transmises.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p className="mb-3 text-muted-foreground">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2"><span className="mt-0.5 text-primary">•</span>Droit d&apos;accès à vos données personnelles</li>
            <li className="flex gap-2"><span className="mt-0.5 text-primary">•</span>Droit de rectification des données inexactes</li>
            <li className="flex gap-2"><span className="mt-0.5 text-primary">•</span>Droit à l&apos;effacement (« droit à l&apos;oubli »)</li>
            <li className="flex gap-2"><span className="mt-0.5 text-primary">•</span>Droit à la portabilité de vos données</li>
            <li className="flex gap-2"><span className="mt-0.5 text-primary">•</span>Droit d&apos;opposition au traitement</li>
            <li className="flex gap-2"><span className="mt-0.5 text-primary">•</span>Droit à la limitation du traitement</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Pour exercer ces droits, contactez-nous à{" "}
            <a
              href={`mailto:${legal.email}`}
              className="text-primary hover:underline"
            >
              {legal.email}
            </a>
            . Nous répondrons dans un délai maximum de 30 jours. Vous pouvez
            également introduire une réclamation auprès de la{" "}
            <strong className="text-foreground">CNIL</strong> (
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              www.cnil.fr
            </a>
            ).
          </p>
        </Section>

        <Section title="8. Cookies">
          <p className="text-muted-foreground">
            CommerceHunter utilise uniquement des cookies strictement
            nécessaires au fonctionnement du service (token d&apos;authentification
            en cookie httpOnly sécurisé). Aucun cookie de tracking ou
            publicitaire n&apos;est utilisé.
          </p>
        </Section>

        <Section title="9. Sécurité">
          <p className="text-muted-foreground">
            Nous mettons en œuvre des mesures techniques et organisationnelles
            appropriées pour protéger vos données : chiffrement HTTPS, mots de
            passe hashés (bcrypt), tokens JWT à durée de vie limitée, accès
            restreint aux données par rôle.
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
    <section className="glass-subtle mb-6 rounded-xl p-6">
      <h2 className="font-heading mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-56 shrink-0 text-sm font-medium text-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </li>
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
