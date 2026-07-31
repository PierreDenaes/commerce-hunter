// Construction CSV partagée par les exports (scan + listes de prospects).
// Colonnes sélectionnables via le paramètre ?columns=cle1,cle2 (ordre de
// sortie = ordre de définition ci-dessous ; clés inconnues ignorées ;
// absent ou vide = toutes les colonnes).

interface CsvAnalysis {
  seoScore: number | null;
  digitalScore: number | null;
  priority: string | null;
  status: string;
  contactEmails?: string[];
}

export interface CsvBusinessRow {
  name: string;
  siret: string;
  siren: string;
  entityType: string;
  apeCode: string;
  legalForm: string | null;
  employeesRange: string | null;
  address: string | null;
  postalCode: string;
  city: string;
  phone: string | null;
  website: string | null;
  isHeadquarters: boolean;
  analysis: CsvAnalysis | null;
}

export const CSV_COLUMNS = {
  name: { header: "Nom", value: (b: CsvBusinessRow) => b.name },
  siret: { header: "SIRET", value: (b: CsvBusinessRow) => b.siret },
  siren: { header: "SIREN", value: (b: CsvBusinessRow) => b.siren },
  type: { header: "Type", value: (b: CsvBusinessRow) => b.entityType },
  ape: { header: "Code APE", value: (b: CsvBusinessRow) => b.apeCode },
  legalForm: { header: "Forme juridique", value: (b: CsvBusinessRow) => b.legalForm },
  employees: { header: "Effectifs", value: (b: CsvBusinessRow) => b.employeesRange },
  address: { header: "Adresse", value: (b: CsvBusinessRow) => b.address },
  postalCode: { header: "Code postal", value: (b: CsvBusinessRow) => b.postalCode },
  city: { header: "Ville", value: (b: CsvBusinessRow) => b.city },
  phone: { header: "Téléphone", value: (b: CsvBusinessRow) => b.phone },
  website: { header: "Site web", value: (b: CsvBusinessRow) => b.website },
  emails: {
    header: "Emails",
    value: (b: CsvBusinessRow) => b.analysis?.contactEmails?.join(", ") ?? "",
  },
  headquarters: {
    header: "Siège social",
    value: (b: CsvBusinessRow) => (b.isHeadquarters ? "Oui" : "Non"),
  },
  seoScore: { header: "Score SEO", value: (b: CsvBusinessRow) => b.analysis?.seoScore },
  digitalScore: {
    header: "Score Digital",
    value: (b: CsvBusinessRow) => b.analysis?.digitalScore,
  },
  priority: { header: "Priorité", value: (b: CsvBusinessRow) => b.analysis?.priority },
  analysisStatus: {
    header: "Statut analyse",
    value: (b: CsvBusinessRow) => b.analysis?.status,
  },
} as const;

export type CsvColumnKey = keyof typeof CSV_COLUMNS;

const ALL_COLUMN_KEYS = Object.keys(CSV_COLUMNS) as CsvColumnKey[];

/** Parse ?columns=a,b,c — clés inconnues ignorées, vide/absent = tout. */
export function parseColumnsParam(raw: string | undefined): CsvColumnKey[] {
  if (!raw) return ALL_COLUMN_KEYS;
  const requested = new Set(raw.split(",").map((s) => s.trim()));
  const keys = ALL_COLUMN_KEYS.filter((k) => requested.has(k));
  return keys.length > 0 ? keys : ALL_COLUMN_KEYS;
}

function escapeCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  // Anti-injection de formules Excel/Sheets : neutralise les cellules
  // commençant par = ou @ (les données proviennent de sites scrapés).
  // (+ et - ne sont pas neutralisés : les téléphones commencent par +33.)
  if (/^[=@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(";") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(businesses: CsvBusinessRow[], keys: CsvColumnKey[]): string {
  const BOM = "\uFEFF"; // UTF-8 BOM pour Excel
  const headers = keys.map((k) => CSV_COLUMNS[k].header);
  const rows = businesses.map((b) =>
    keys.map((k) => escapeCell(CSV_COLUMNS[k].value(b))),
  );
  return BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}
