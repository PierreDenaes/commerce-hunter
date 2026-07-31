/**
 * Billing is dormant (routes unregistered, self-hosted plan assigned at signup)
 * unless a Stripe key is configured. BILLING_ENABLED=false forces it off even
 * with a key present.
 */
export function isBillingEnabled(): boolean {
  if (process.env.BILLING_ENABLED === "false") return false;
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const SELF_HOSTED_PLAN_NAME = "Self-hosted";

/**
 * REGISTRATION_ENABLED=false ferme les inscriptions publiques (l'instance
 * devient vitrine/outil privé). Les invitations d'équipe restent ouvertes.
 */
export function isRegistrationEnabled(): boolean {
  return process.env.REGISTRATION_ENABLED !== "false";
}
