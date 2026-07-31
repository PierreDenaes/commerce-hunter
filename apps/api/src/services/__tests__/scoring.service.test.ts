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

describe("assignPriority", () => {
  it("assigns HIGH for score >= 80", () => {
    expect(assignPriority(80)).toBe("HIGH");
    expect(assignPriority(100)).toBe("HIGH");
    expect(assignPriority(95)).toBe("HIGH");
  });

  it("assigns MEDIUM for score >= 60 and < 80", () => {
    expect(assignPriority(60)).toBe("MEDIUM");
    expect(assignPriority(79)).toBe("MEDIUM");
    expect(assignPriority(70)).toBe("MEDIUM");
  });

  it("assigns LOW for score < 60", () => {
    expect(assignPriority(59)).toBe("LOW");
    expect(assignPriority(0)).toBe("LOW");
    expect(assignPriority(30)).toBe("LOW");
  });

  it("correctly handles boundary at 79 → MEDIUM", () => {
    expect(assignPriority(79)).toBe("MEDIUM");
  });

  it("correctly handles boundary at 80 → HIGH", () => {
    expect(assignPriority(80)).toBe("HIGH");
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
    expect(result.priority).toBe("HIGH");
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
});
