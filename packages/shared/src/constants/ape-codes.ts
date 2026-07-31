import type { EntityType } from "../types/business.js";

/**
 * APE code prefix → EntityType mapping.
 * Must cover ALL prefixes used in APE_GROUPS to avoid filtering issues.
 * Commerce (B2C): retail, food, hospitality, personal services
 * PME (B2B): construction, IT, professional services
 */
const COMMERCE_PREFIXES = [
  "10", // Industries alimentaires
  "45", // Commerce et réparation automobile
  "46", // Commerce de gros
  "47", // Commerce de détail
  "55", // Hébergement
  "56", // Restauration
  "79", // Agences de voyage
  "86", // Activités pour la santé
  "93", // Activités sportives et de loisirs
  "95", // Réparation d'ordinateurs et de biens personnels
  "96", // Services personnels (coiffure, beauté, bien-être)
];
const PME_PREFIXES = [
  "41", // Construction de bâtiments
  "42", // Génie civil
  "43", // Travaux de construction spécialisés
  "62", // Programmation et conseil informatique
  "63", // Services d'information
  "69", // Activités juridiques et comptables
  "70", // Activités de conseil de gestion
  "73", // Publicité et études de marché
  "74", // Autres activités spécialisées (design, photo)
];

export function classifyByApe(apeCode: string): EntityType {
  const prefix2 = apeCode.slice(0, 2);
  if (COMMERCE_PREFIXES.includes(prefix2)) return "COMMERCE";
  if (PME_PREFIXES.includes(prefix2)) return "PME";
  // Default: classify as PME for unrecognized codes
  return "PME";
}

export const APE_COMMERCE_PREFIXES = COMMERCE_PREFIXES;
export const APE_PME_PREFIXES = PME_PREFIXES;

export const APE_LABELS: Record<string, string> = {
  "10": "Industries alimentaires",
  "45": "Commerce et réparation automobile",
  "46": "Commerce de gros",
  "47": "Commerce de détail",
  "55": "Hébergement",
  "56": "Restauration",
  "79": "Agences de voyage",
  "86": "Activités pour la santé",
  "93": "Activités sportives et de loisirs",
  "95": "Réparation d'ordinateurs et de biens personnels",
  "96": "Services personnels (coiffure, beauté, bien-être)",
  "41": "Construction de bâtiments",
  "42": "Génie civil",
  "43": "Travaux de construction spécialisés",
  "62": "Programmation et conseil informatique",
  "63": "Services d'information",
  "69": "Activités juridiques et comptables",
  "70": "Activités de conseil de gestion",
  "73": "Publicité et études de marché",
  "74": "Autres activités spécialisées (design, photo)",
};
