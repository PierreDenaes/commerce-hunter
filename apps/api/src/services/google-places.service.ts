import type { FastifyBaseLogger } from "fastify";
import type { PrismaClient } from "@commercehunter/db";

// ─── Types ────────────────────────────────────────────────

interface PlaceSearchResult {
  places: Array<{
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    location: { latitude: number; longitude: number };
  }>;
}

export interface PlacesEnrichmentData {
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
}

// ─── Constants ────────────────────────────────────────────

const PLACES_API_BASE = "https://places.googleapis.com/v1/places:searchText";
const CACHE_TTL_DAYS = 30;

// ─── Service ──────────────────────────────────────────────

export class GooglePlacesService {
  private apiKey: string | null;
  private prisma: PrismaClient;
  private log: FastifyBaseLogger;
  private enabled: boolean;

  constructor(prisma: PrismaClient, log: FastifyBaseLogger) {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY ?? null;
    this.prisma = prisma;
    this.log = log;
    this.enabled =
      !!this.apiKey &&
      this.apiKey !== "your-google-api-key";

    if (!this.enabled) {
      this.log.warn(
        "Google Places API key not configured — enrichment disabled",
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async enrichBusiness(
    businessName: string,
    city: string,
    businessId: string,
  ): Promise<PlacesEnrichmentData | null> {
    if (!this.enabled) return null;

    // Check cache: if business was enriched within CACHE_TTL_DAYS, skip
    const existing = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { googlePlaceId: true, updatedAt: true },
    });

    if (existing?.googlePlaceId) {
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() - CACHE_TTL_DAYS);
      if (existing.updatedAt > cacheExpiry) {
        this.log.info(
          { businessId },
          "Google Places cache hit — skipping enrichment",
        );
        return null;
      }
    }

    try {
      const result = await this.textSearch(`${businessName} ${city}`);
      if (!result) return null;

      return {
        phone: result.nationalPhoneNumber ?? null,
        website: result.websiteUri ?? null,
        latitude: result.location?.latitude ?? null,
        longitude: result.location?.longitude ?? null,
        googlePlaceId: result.id ?? null,
      };
    } catch (err) {
      this.log.error(
        { err, businessName, city },
        "Google Places enrichment failed — skipping",
      );
      return null;
    }
  }

  private async textSearch(
    query: string,
  ): Promise<PlaceSearchResult["places"][0] | null> {
    const res = await fetch(PLACES_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "fr",
        regionCode: "FR",
        maxResultCount: 1,
      }),
      // Sans timeout, une connexion qui pend gèle tout le scan
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      if (res.status === 429) {
        this.log.warn("Google Places quota exceeded — disabling enrichment");
        this.enabled = false;
        return null;
      }
      throw new Error(`Google Places API error: ${res.status}`);
    }

    const data = (await res.json()) as PlaceSearchResult;
    return data.places?.[0] ?? null;
  }
}
