import type { FastifyBaseLogger } from "fastify";
import { withRetry } from "../utils/retry.js";

// ─── Types ────────────────────────────────────────────────

interface SireneEstablishment {
  siret: string;
  siren: string;
  etablissementSiege: boolean;
  trancheEffectifsEtablissement: string | null;
  uniteLegale: {
    denominationUniteLegale: string | null;
    denominationUsuelle1UniteLegale: string | null;
    nomUniteLegale: string | null;
    prenom1UniteLegale: string | null;
    categorieJuridiqueUniteLegale: string | null;
    trancheEffectifsUniteLegale: string | null;
  };
  adresseEtablissement: {
    numeroVoieEtablissement: string | null;
    typeVoieEtablissement: string | null;
    libelleVoieEtablissement: string | null;
    codePostalEtablissement: string | null;
    libelleCommuneEtablissement: string | null;
  };
  periodesEtablissement: Array<{
    dateFin: string | null;
    activitePrincipaleEtablissement: string | null;
    etatAdministratifEtablissement: string | null;
    trancheEffectifsEtablissement: string | null;
  }>;
}

interface SireneSearchResponse {
  header: {
    statut: number;
    total: number;
    curseur: string | null;
    curseurSuivant: string | null;
  };
  etablissements: SireneEstablishment[];
}

export interface SireneBusinessData {
  siret: string;
  siren: string;
  name: string;
  apeCode: string;
  legalFormCode: string | null;
  employeesRangeCode: string | null;
  employeesRange: string | null;
  address: string | null;
  city: string;
  postalCode: string;
  isHeadquarters: boolean;
}

// ─── Constants ────────────────────────────────────────────

const BASE_URL = "https://api.insee.fr/api-sirene/3.11";
const RPM_LIMIT = 25;
const BATCH_SIZE = 1000;
const MAX_RESULTS = 5000; // Safety cap — avoid fetching 40K+ establishments

const EMPLOYEES_RANGE_MAP: Record<string, string> = {
  "00": "0",
  "01": "1-2",
  "02": "3-5",
  "03": "6-9",
  "11": "10-19",
  "12": "20-49",
  "21": "50-99",
  "22": "100-199",
  "31": "200-249",
  "32": "250-499",
  "33": "500-999",
  "41": "1000-1999",
  "42": "2000-4999",
  "51": "5000-9999",
  "52": "10000+",
  NN: "Inconnu",
};

// ─── Rate limiter ─────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs = 60_000;

  constructor(maxRequests: number) {
    this.maxRequests = maxRequests;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (t) => now - t < this.windowMs,
    );

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.wait();
    }

    this.timestamps.push(Date.now());
  }
}

// ─── Query Builder ────────────────────────────────────────
// SIRENE API v3.11 requires period fields to be wrapped in periode()

function buildQuery(params: {
  postalCode: string;
  entityType: string;
  apeCategories: string[];
  minEmployees?: number | null;
}): string {
  // Top-level (non-period) fields
  const topParts: string[] = [];
  topParts.push(`codePostalEtablissement:${params.postalCode}`);

  // Period fields — must be wrapped in periode()
  const periodParts: string[] = [];
  periodParts.push("etatAdministratifEtablissement:A");

  // APE code filter (period field)
  // Full NAF code = "XX.XXY" (5 chars + dot, e.g. "47.11B"); anything shorter is a prefix
  if (params.apeCategories.length > 0) {
    const isFullNafCode = (code: string) => /^\d{2}\.\d{2}[A-Z]$/.test(code);
    const apeFilters = params.apeCategories.map((code) => {
      return isFullNafCode(code)
        ? `activitePrincipaleEtablissement:${code}`
        : `activitePrincipaleEtablissement:${code}*`;
    });
    if (apeFilters.length === 1) {
      periodParts.push(apeFilters[0]);
    } else {
      periodParts.push(`(${apeFilters.join(" OR ")})`);
    }
  }

  // Employee range filter (period field)
  if (params.minEmployees) {
    const minCode = getMinEmployeeCode(params.minEmployees);
    if (minCode) {
      periodParts.push(`trancheEffectifsEtablissement:[${minCode} TO *]`);
    }
  }

  const periodQuery = `periode(${periodParts.join(" AND ")})`;
  return [...topParts, periodQuery].join(" AND ");
}

function getMinEmployeeCode(minEmployees: number): string | null {
  if (minEmployees >= 10000) return "52";
  if (minEmployees >= 5000) return "51";
  if (minEmployees >= 2000) return "42";
  if (minEmployees >= 1000) return "41";
  if (minEmployees >= 500) return "33";
  if (minEmployees >= 250) return "32";
  if (minEmployees >= 200) return "31";
  if (minEmployees >= 100) return "22";
  if (minEmployees >= 50) return "21";
  if (minEmployees >= 20) return "12";
  if (minEmployees >= 10) return "11";
  if (minEmployees >= 6) return "03";
  if (minEmployees >= 3) return "02";
  if (minEmployees >= 1) return "01";
  return null;
}

// ─── Response Mapper ──────────────────────────────────────

function mapEstablishment(etab: SireneEstablishment): SireneBusinessData {
  const currentPeriod = etab.periodesEtablissement?.[0];
  const addr = etab.adresseEtablissement;
  const ul = etab.uniteLegale;

  const addressParts = [
    addr?.numeroVoieEtablissement,
    addr?.typeVoieEtablissement,
    addr?.libelleVoieEtablissement,
  ].filter(Boolean);

  const empCode =
    currentPeriod?.trancheEffectifsEtablissement ??
    etab.trancheEffectifsEtablissement ??
    ul?.trancheEffectifsUniteLegale ??
    null;

  // Build name: company denomination, then enseigne/usuelle, then nom+prenom for individuals
  const name =
    ul?.denominationUniteLegale ??
    ul?.denominationUsuelle1UniteLegale ??
    (ul?.nomUniteLegale
      ? [ul.prenom1UniteLegale, ul.nomUniteLegale].filter(Boolean).join(" ")
      : null) ??
    "Inconnu";

  return {
    siret: etab.siret,
    siren: etab.siren,
    name,
    apeCode: currentPeriod?.activitePrincipaleEtablissement ?? "",
    legalFormCode: ul?.categorieJuridiqueUniteLegale ?? null,
    employeesRangeCode: empCode,
    employeesRange: empCode ? (EMPLOYEES_RANGE_MAP[empCode] ?? null) : null,
    address: addressParts.length > 0 ? addressParts.join(" ") : null,
    city: addr?.libelleCommuneEtablissement ?? "",
    postalCode: addr?.codePostalEtablissement ?? "",
    isHeadquarters: etab.etablissementSiege === true,
  };
}

// ─── Service ──────────────────────────────────────────────

export class SireneService {
  private apiKey: string;
  private rateLimiter: RateLimiter;
  private log: FastifyBaseLogger;

  constructor(log: FastifyBaseLogger) {
    const apiKey = process.env.SIRENE_API_TOKEN;
    if (!apiKey) {
      throw new Error("SIRENE_API_TOKEN is required");
    }

    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(RPM_LIMIT);
    this.log = log;
  }

  async searchEstablishments(params: {
    postalCode: string;
    entityType: string;
    apeCategories: string[];
    minEmployees?: number | null;
  }): Promise<SireneBusinessData[]> {
    const query = buildQuery(params);
    this.log.info({ query }, "SIRENE search query");

    const allResults: SireneBusinessData[] = [];
    let cursor: string | null = "*";
    let hasMore = true;
    const today = new Date().toISOString().split("T")[0];

    while (hasMore) {
      await this.rateLimiter.wait();

      const url = new URL(`${BASE_URL}/siret`);
      url.searchParams.set("q", query);
      url.searchParams.set("nombre", String(BATCH_SIZE));
      url.searchParams.set("date", today);
      if (cursor) {
        url.searchParams.set("curseur", cursor);
      }

      this.log.info(
        { url: url.toString(), cursor, resultsSoFar: allResults.length },
        "SIRENE API request",
      );

      const data = await withRetry(
        async () => {
          const res = await fetch(url.toString(), {
            headers: {
              "X-INSEE-Api-Key-Integration": this.apiKey,
              Accept: "application/json",
            },
            // Sans timeout, une connexion qui pend gèle tout le scan
            signal: AbortSignal.timeout(30_000),
          });

          if (res.status === 404) {
            return null; // No results — not an error
          }

          if (!res.ok) {
            const body = await res.text();
            throw new Error(`SIRENE API error ${res.status}: ${body}`);
          }

          return (await res.json()) as SireneSearchResponse;
        },
        this.log,
        "SIRENE API",
      );

      if (!data) {
        this.log.info("SIRENE returned 404 — no establishments found");
        break;
      }
      const establishments = data.etablissements ?? [];

      for (const etab of establishments) {
        allResults.push(mapEstablishment(etab));
      }

      this.log.info(
        { batchSize: establishments.length, total: data.header.total },
        "SIRENE batch received",
      );

      cursor = data.header.curseurSuivant ?? null;
      hasMore = cursor !== null && establishments.length === BATCH_SIZE;

      // Safety cap to avoid extremely large scans
      if (allResults.length >= MAX_RESULTS) {
        this.log.warn(
          { total: data.header.total, capped: allResults.length },
          "SIRENE results capped at MAX_RESULTS",
        );
        break;
      }
    }

    return allResults;
  }
}
