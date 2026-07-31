// Informations légales de l'instance, lues au RUNTIME côté serveur
// (les pages légales sont en force-dynamic — pas de build arg Docker requis).
// Chaque instance self-hosted renseigne ses propres valeurs via l'environnement.
export interface LegalConfig {
  ownerName: string;
  legalForm: string;
  siren: string;
  siret: string;
  vat: string;
  address: string;
  email: string;
  activity: string;
  hostName: string;
  hostWebsite: string;
  hostAddress: string;
}

// Chaîne vide = non configuré (docker compose injecte "" pour les vars absentes)
function env(name: string): string {
  const value = process.env[name];
  return value && value.trim() ? value : `[À configurer — ${name}]`;
}

export function getLegalConfig(): LegalConfig {
  return {
    ownerName: env("LEGAL_OWNER_NAME"),
    legalForm: env("LEGAL_FORM"),
    siren: env("LEGAL_SIREN"),
    siret: env("LEGAL_SIRET"),
    vat: env("LEGAL_VAT"),
    address: env("LEGAL_ADDRESS"),
    email: env("LEGAL_EMAIL"),
    activity: env("LEGAL_ACTIVITY"),
    hostName: env("LEGAL_HOST_NAME"),
    hostWebsite: env("LEGAL_HOST_WEBSITE"),
    hostAddress: env("LEGAL_HOST_ADDRESS"),
  };
}
