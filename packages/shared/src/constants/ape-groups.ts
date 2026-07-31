export interface ApeOption {
  value: string;
  label: string;
}

export interface ApeGroup {
  label: string;
  options: ApeOption[];
}

export const APE_GROUPS: ApeGroup[] = [
  {
    label: "Commerce & Vente",
    options: [
      { value: "47.1", label: "Alimentation en magasin" },
      { value: "47.2", label: "Alimentation spécialisée" },
      { value: "47.4", label: "Informatique & Télécom" },
      { value: "47.5", label: "Équipement du foyer" },
      { value: "47.6", label: "Culture & Loisirs" },
      { value: "47.7", label: "Habillement & Chaussures" },
      { value: "47.8", label: "Marchés & Éventaires" },
      { value: "45", label: "Commerce automobile" },
      { value: "46", label: "Commerce de gros" },
    ],
  },
  {
    label: "Restauration & Alimentaire",
    options: [
      { value: "56.10A", label: "Restaurants traditionnels" },
      { value: "56.10B", label: "Cafétérias & Libre-service" },
      { value: "56.10C", label: "Restauration rapide" },
      { value: "56.21", label: "Traiteurs & Événementiel" },
      { value: "56.30Z", label: "Bars & Débits de boissons" },
      { value: "10", label: "Industries alimentaires" },
    ],
  },
  {
    label: "Services aux particuliers",
    options: [
      { value: "96.02", label: "Coiffure & Soins de beauté" },
      { value: "96.04", label: "Entretien corporel" },
      { value: "96.01", label: "Blanchisserie & Pressing" },
      { value: "95", label: "Réparation (ordi, téléphone)" },
      { value: "93", label: "Activités sportives & Loisirs" },
      { value: "86", label: "Activités pour la santé" },
    ],
  },
  {
    label: "Hébergement & Tourisme",
    options: [
      { value: "55.10", label: "Hôtels" },
      { value: "55.20", label: "Hébergement touristique" },
      { value: "79", label: "Agences de voyage" },
    ],
  },
  {
    label: "BTP & Construction",
    options: [
      { value: "41", label: "Construction de bâtiments" },
      { value: "42", label: "Génie civil" },
      { value: "43", label: "Travaux spécialisés" },
    ],
  },
  {
    label: "Services aux entreprises",
    options: [
      { value: "62", label: "Informatique & Développement" },
      { value: "63", label: "Services d'information" },
      { value: "69", label: "Comptabilité & Juridique" },
      { value: "70", label: "Conseil de gestion" },
      { value: "73", label: "Publicité & Communication" },
      { value: "74", label: "Design & Photographie" },
    ],
  },
];

export interface EmployeeRangeOption {
  value: string;
  label: string;
}

export const EMPLOYEE_RANGE_OPTIONS: EmployeeRangeOption[] = [
  { value: "00", label: "0 salarié" },
  { value: "01", label: "1-2 salariés" },
  { value: "02", label: "3-5 salariés" },
  { value: "03", label: "6-9 salariés" },
  { value: "11", label: "10-19 salariés" },
  { value: "12", label: "20-49 salariés" },
  { value: "21", label: "50-99 salariés" },
  { value: "22", label: "100-199 salariés" },
  { value: "31", label: "200-249 salariés" },
  { value: "32", label: "250-499 salariés" },
  { value: "33", label: "500-999 salariés" },
  { value: "41", label: "1000-1999 salariés" },
  { value: "42", label: "2000-4999 salariés" },
  { value: "51", label: "5000-9999 salariés" },
  { value: "52", label: "10000+ salariés" },
];
