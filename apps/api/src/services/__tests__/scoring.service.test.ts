import { describe, it, expect } from "vitest";
import {
  calculateSeoScore,
  calculateDigitalScore,
  assignPriority,
  scoreAnalysis,
} from "../scoring.service.js";
import type { Analysis, Business } from "@commercehunter/db";

// ─── Helpers ──────────────────────────────────────────────

function makeAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    id: "analysis-1",
    businessId: "biz-1",
    status: "COMPLETED",
    analyzedUrl: "https://example.com",
    isHttps: null,
    httpStatusCode: null,
    responseTimeMs: null,
    hasRobotsTxt: null,
    hasSitemapXml: null,
    title: null,
    titleLength: null,
    metaDescription: null,
    metaDescriptionLength: null,
    h1: null,
    hasCanonical: null,
    hasFavicon: null,
    hasViewport: null,
    mobileScore: null,
    cityInTitle: null,
    cityInH1: null,
    cityInDescription: null,
    hasSchemaLocalBusiness: null,
    hasGoogleMapsEmbed: null,
    seoScore: null,
    digitalScore: null,
    priority: null,
    rawAnalysisJson: null,
    wordCount: null,
    textRatio: null,
    hasOgImage: null,
    jsonLdInvalidCount: null,
    detectedPlatform: null,
    isFreeHosting: null,
    brokenLinksCount: null,
    checkedLinksCount: null,
    errorMessage: null,
    analyzedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Analysis;
}

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    siret: "12345678901234",
    siren: "123456789",
    name: "Test Business",
    entityType: "COMMERCE",
    apeCode: "47.11B",
    legalForm: null,
    legalFormCode: "5710",
    employeesRange: "10-19",
    employeesRangeCode: "11",
    address: "1 rue de test",
    city: "La Ciotat",
    postalCode: "13600",
    phone: "+33412345678",
    website: "https://example.com",
    latitude: null,
    longitude: null,
    googlePlaceId: null,
    isHeadquarters: true,
    sireneLastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Business;
}

// ─── Tests ────────────────────────────────────────────────

describe("calculateSeoScore", () => {
  it("returns perfect score (100) when all checks pass", () => {
    const analysis = makeAnalysis({
      isHttps: true,
      httpStatusCode: 200,
      responseTimeMs: 500,
      hasRobotsTxt: true,
      hasSitemapXml: true,
      title: "Test Page",
      metaDescription: "A test page",
      h1: "Welcome",
      hasCanonical: true,
      hasFavicon: true,
      hasViewport: true,
      cityInTitle: true,
      cityInH1: true,
      cityInDescription: true,
      hasSchemaLocalBusiness: true,
      hasGoogleMapsEmbed: true,
      rawAnalysisJson: { isPageWeightOk: true },
    });

    expect(calculateSeoScore(analysis)).toBe(100);
  });

  it("returns 0 when no checks pass", () => {
    const analysis = makeAnalysis({
      isHttps: false,
      httpStatusCode: 500,
      responseTimeMs: 5000,
      hasRobotsTxt: false,
      hasSitemapXml: false,
      title: null,
      metaDescription: null,
      h1: null,
      hasCanonical: false,
      hasFavicon: false,
      hasViewport: false,
      cityInTitle: false,
      cityInH1: false,
      cityInDescription: false,
      hasSchemaLocalBusiness: false,
      hasGoogleMapsEmbed: false,
      rawAnalysisJson: { isPageWeightOk: false },
    });

    expect(calculateSeoScore(analysis)).toBe(0);
  });

  it("returns correct partial score for technical-only pass", () => {
    const analysis = makeAnalysis({
      isHttps: true,       // +10
      httpStatusCode: 200,  // +10
      responseTimeMs: 500,  // +10
      hasRobotsTxt: true,   // +5
      hasSitemapXml: true,  // +5
      // All others fail
      title: null,
      metaDescription: null,
      h1: null,
      hasCanonical: false,
      hasFavicon: false,
      hasViewport: false,
      cityInTitle: false,
      cityInH1: false,
      cityInDescription: false,
      hasSchemaLocalBusiness: false,
      hasGoogleMapsEmbed: false,
      rawAnalysisJson: { isPageWeightOk: false },
    });

    expect(calculateSeoScore(analysis)).toBe(40);
  });

  it("handles slow response time correctly", () => {
    const analysis = makeAnalysis({
      isHttps: true,
      httpStatusCode: 200,
      responseTimeMs: 3001, // Over 3s threshold
      hasRobotsTxt: false,
      hasSitemapXml: false,
    });

    // HTTPS (10) + status 200 (10) + response NOT counted (0) = 20
    // + pageWeight default (5) = 25
    expect(calculateSeoScore(analysis)).toBe(25);
  });
});

describe("calculateSeoScore — malus qualité", () => {
  it("pénalise un title hors plage optimale (30-60)", () => {
    const base = makeAnalysis({ title: "Accueil", titleLength: 8 });
    const optimal = makeAnalysis({
      title: "Boulangerie du Port — pain artisanal à La Ciotat",
      titleLength: 48,
    });
    expect(calculateSeoScore(base)).toBe(calculateSeoScore(optimal) - 3);
  });

  it("pénalise un contenu trop pauvre (< 100 mots)", () => {
    const thin = makeAnalysis({ wordCount: 40 });
    const rich = makeAnalysis({ wordCount: 400 });
    expect(calculateSeoScore(thin)).toBe(Math.max(0, calculateSeoScore(rich) - 10));
  });

  it("pénalise les liens cassés avec plafond", () => {
    const twoBroken = makeAnalysis({ isHttps: true, httpStatusCode: 200, brokenLinksCount: 2 });
    const manyBroken = makeAnalysis({ isHttps: true, httpStatusCode: 200, brokenLinksCount: 8 });
    const clean = makeAnalysis({ isHttps: true, httpStatusCode: 200, brokenLinksCount: 0 });
    expect(calculateSeoScore(twoBroken)).toBe(calculateSeoScore(clean) - 6);
    expect(calculateSeoScore(manyBroken)).toBe(calculateSeoScore(clean) - 10); // plafonné
  });

  it("pénalise le JSON-LD invalide", () => {
    const invalid = makeAnalysis({ isHttps: true, jsonLdInvalidCount: 2 });
    const valid = makeAnalysis({ isHttps: true, jsonLdInvalidCount: 0 });
    expect(calculateSeoScore(invalid)).toBe(calculateSeoScore(valid) - 3);
  });

  it("les analyses antérieures (champs null) ne sont pas pénalisées", () => {
    const legacy = makeAnalysis({ isHttps: true, httpStatusCode: 200 });
    const modern = makeAnalysis({
      isHttps: true,
      httpStatusCode: 200,
      wordCount: 500,
      brokenLinksCount: 0,
      jsonLdInvalidCount: 0,
    });
    expect(calculateSeoScore(legacy)).toBe(calculateSeoScore(modern));
  });
});

describe("calculateDigitalScore — hébergement gratuit", () => {
  it("dégrade la composante présence sur un hébergement gratuit", () => {
    const business = makeBusiness({ website: "https://monsite.wixsite.com/boulangerie" });
    const free = makeAnalysis({ seoScore: 50, isFreeHosting: true });
    const owned = makeAnalysis({ seoScore: 50, isFreeHosting: false });
    // 30 points de présence en moins × pondération 25 % = -7.5 → arrondi
    const diff =
      calculateDigitalScore(owned, business) - calculateDigitalScore(free, business);
    expect(diff).toBeGreaterThanOrEqual(7);
    expect(diff).toBeLessThanOrEqual(8);
  });
});

describe("assignPriority — priorité = opportunité (score faible → HIGH)", () => {
  it("assigns HIGH pour un score < 40 (grosse opportunité)", () => {
    expect(assignPriority(0)).toBe("HIGH");
    expect(assignPriority(25)).toBe("HIGH");
    expect(assignPriority(39)).toBe("HIGH");
  });

  it("assigns MEDIUM pour un score entre 40 et 64", () => {
    expect(assignPriority(40)).toBe("MEDIUM");
    expect(assignPriority(50)).toBe("MEDIUM");
    expect(assignPriority(64)).toBe("MEDIUM");
  });

  it("assigns LOW pour un score >= 65 (site déjà correct)", () => {
    expect(assignPriority(65)).toBe("LOW");
    expect(assignPriority(80)).toBe("LOW");
    expect(assignPriority(100)).toBe("LOW");
  });

  it("frontières exactes : 39 → HIGH, 40 → MEDIUM, 64 → MEDIUM, 65 → LOW", () => {
    expect(assignPriority(39)).toBe("HIGH");
    expect(assignPriority(40)).toBe("MEDIUM");
    expect(assignPriority(64)).toBe("MEDIUM");
    expect(assignPriority(65)).toBe("LOW");
  });
});

describe("calculateDigitalScore", () => {
  it("returns 0 for business without website and no data", () => {
    const analysis = makeAnalysis({ seoScore: 0 });
    const business = makeBusiness({
      website: null,
      phone: null,
      legalFormCode: null,
      employeesRangeCode: null,
    });

    const score = calculateDigitalScore(analysis, business);
    // SEO: 0, presence: 0, mobile: 0, data: 0/4 = 0, size: 30 (default) * 0.1 = 3
    expect(score).toBe(3);
  });

  it("gives non-zero score for business with website and good SEO", () => {
    const analysis = makeAnalysis({
      seoScore: 100,
      hasViewport: true,
      mobileScore: 90,
    });
    const business = makeBusiness();

    const score = calculateDigitalScore(analysis, business);
    // SEO: 100*0.4=40, presence: 100*0.25=25, mobile: 90*0.15=13.5, data: 4/4*100*0.1=10, size: 50*0.1=5
    expect(score).toBe(94);
  });

  it("calculates presence as 0 when no website", () => {
    const analysis = makeAnalysis({ seoScore: 50 });
    const business = makeBusiness({ website: null });

    const score = calculateDigitalScore(analysis, business);
    // SEO: 50*0.4=20, presence: 0*0.25=0, mobile: 0, data: 3/4*100*0.1=7.5, size: 50*0.1=5
    expect(score).toBeLessThan(40);
  });
});

describe("scoreAnalysis", () => {
  it("orchestrates scoring correctly for a complete analysis", () => {
    const analysis = makeAnalysis({
      isHttps: true,
      httpStatusCode: 200,
      responseTimeMs: 500,
      hasRobotsTxt: true,
      hasSitemapXml: true,
      title: "Test Page",
      metaDescription: "A test page",
      h1: "Welcome",
      hasCanonical: true,
      hasFavicon: true,
      hasViewport: true,
      cityInTitle: true,
      cityInH1: true,
      cityInDescription: true,
      hasSchemaLocalBusiness: true,
      hasGoogleMapsEmbed: true,
      rawAnalysisJson: { isPageWeightOk: true },
    });
    const business = makeBusiness();

    const result = scoreAnalysis(analysis, business);

    expect(result.seoScore).toBe(100);
    expect(result.digitalScore).toBeGreaterThan(80);
    // Site excellent → rien à vendre → priorité basse
    expect(result.priority).toBe("LOW");
  });

  it("handles NO_WEBSITE business correctly — forced HIGH priority", () => {
    const analysis = makeAnalysis({
      status: "NO_WEBSITE",
      seoScore: 0,
      rawAnalysisJson: { isPageWeightOk: false },
    });
    const business = makeBusiness({
      website: null,
      phone: null,
      legalFormCode: null,
      employeesRangeCode: null,
    });

    const result = scoreAnalysis(analysis, business);

    expect(result.seoScore).toBe(0);
    expect(result.digitalScore).toBeLessThan(10);
    // Business without website = maximum opportunity → priority forced to HIGH
    expect(result.priority).toBe("HIGH");
  });

  it("handles SITE_DOWN business — forced HIGH priority, zero SEO, collapsed digital score", () => {
    // Champs vides : le worker purge l'analyse quand le site est injoignable
    const analysis = makeAnalysis({ status: "SITE_DOWN" });
    const business = makeBusiness();

    const result = scoreAnalysis(analysis, business);

    expect(result.seoScore).toBe(0);
    // Le site est mort : la présence en ligne ne vaut rien, il ne reste que
    // les composantes données/taille (20 % max)
    expect(result.digitalScore).toBeLessThanOrEqual(20);
    expect(result.priority).toBe("HIGH");
  });

  it("SITE_DOWN ignores stale values from a previous successful analysis", () => {
    const analysis = makeAnalysis({
      status: "SITE_DOWN",
      isHttps: true,
      httpStatusCode: 200,
      title: "Vieux titre de mars",
      performanceScore: 90,
      hasViewport: true,
      rawAnalysisJson: { isPageWeightOk: true },
    });
    const business = makeBusiness();

    const result = scoreAnalysis(analysis, business);

    expect(result.seoScore).toBe(0);
    expect(result.digitalScore).toBeLessThanOrEqual(20);
    expect(result.priority).toBe("HIGH");
  });
});
