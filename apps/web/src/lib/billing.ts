// Billing dormant : NEXT_PUBLIC_BILLING_ENABLED=false masque la page abonnement,
// les liens de navigation et la section tarifs de la landing (instance self-hosted).
// Doit être cohérent avec l'API (billing actif si STRIPE_SECRET_KEY est configurée).
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED !== "false";
