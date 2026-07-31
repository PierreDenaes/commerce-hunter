// NEXT_PUBLIC_REGISTRATION_ENABLED=false masque les CTA d'inscription et
// ferme la page /register (instance vitrine). Doit être cohérent avec
// REGISTRATION_ENABLED côté API. Les invitations d'équipe restent ouvertes.
export const REGISTRATION_ENABLED =
  process.env.NEXT_PUBLIC_REGISTRATION_ENABLED !== "false";
