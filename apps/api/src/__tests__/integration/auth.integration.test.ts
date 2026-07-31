import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

process.env.DATABASE_URL ??=
  "postgresql://commercehunter:password@localhost:5433/commercehunter";
process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy";
process.env.LOG_LEVEL = "silent";

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const RUN_ID = Date.now();
const EMAIL = `auth-test-${RUN_ID}@example.com`;
const PASSWORD = "Sup3rSecret!pass";

async function dbAvailable(): Promise<boolean> {
  try {
    const { prisma } = await import("@commercehunter/db");
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
const dbUp = await dbAvailable();
if (!dbUp) {
  console.warn("[auth.integration] DATABASE_URL injoignable — suite ignorée");
}

function getCookies(res: { headers: Record<string, unknown> }): Record<string, string> {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  const out: Record<string, string> = {};
  for (const c of list) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    out[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return out;
}

describe.skipIf(!dbUp)("auth (intégration DB)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import("../../app.js");
    app = await buildApp();
    // Le register a besoin du plan par défaut
    await app.prisma.subscriptionPlan.upsert({
      where: { name: "Starter" },
      update: {},
      create: {
        name: "Starter",
        priceCents: 4900,
        cityLimit: 3,
        monthlyAnalysisLimit: 500,
        hasPdfExport: false,
        hasWhiteLabel: false,
        hasApiAccess: false,
      },
    });
  });

  afterAll(async () => {
    // Nettoyage des données de test
    const user = await app.prisma.user.findUnique({ where: { email: EMAIL } });
    if (user) {
      await app.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await app.prisma.user.delete({ where: { id: user.id } });
      await app.prisma.organization.delete({ where: { id: user.organizationId } });
    }
    await app.close();
  });

  function post(url: string, payload: unknown, cookies?: Record<string, string>, ip = "203.0.113.10") {
    return app.inject({
      method: "POST",
      url,
      headers: {
        "content-type": "application/json",
        origin: CORS_ORIGIN,
        "x-forwarded-for": ip,
      },
      cookies,
      payload: JSON.stringify(payload),
    });
  }

  let refreshToken1: string;

  it("register crée l'org + l'utilisateur et pose les cookies", async () => {
    const res = await post("/api/v1/auth/register", {
      organizationName: `TestOrg-${RUN_ID}`,
      name: "Test User",
      email: EMAIL,
      password: PASSWORD,
    });
    expect(res.statusCode).toBe(201);
    const cookies = getCookies(res);
    expect(cookies.access_token).toBeTruthy();
    expect(cookies.refresh_token).toBeTruthy();
    expect(res.json().user.email).toBe(EMAIL);
  });

  it("login échoue avec un mauvais mot de passe", async () => {
    const res = await post(
      "/api/v1/auth/login",
      { email: EMAIL, password: "wrong-password-123" },
      undefined,
      "203.0.113.11",
    );
    expect(res.statusCode).toBe(401);
  });

  it("login réussit et /auth/me renvoie l'utilisateur", async () => {
    const res = await post(
      "/api/v1/auth/login",
      { email: EMAIL, password: PASSWORD },
      undefined,
      "203.0.113.12",
    );
    expect(res.statusCode).toBe(200);
    const cookies = getCookies(res);
    refreshToken1 = cookies.refresh_token;

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { access_token: cookies.access_token },
      headers: { "x-forwarded-for": "203.0.113.12" },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(EMAIL);
  });

  it("refresh fait tourner le token, et le replay de l'ancien révoque tout", async () => {
    // Rotation normale
    const r1 = await post("/api/v1/auth/refresh", {}, { refresh_token: refreshToken1 }, "203.0.113.13");
    expect(r1.statusCode).toBe(200);
    const newCookies = getCookies(r1);
    expect(newCookies.refresh_token).toBeTruthy();
    expect(newCookies.refresh_token).not.toBe(refreshToken1);

    // Replay de l'ancien token → détection → 401
    const replay = await post("/api/v1/auth/refresh", {}, { refresh_token: refreshToken1 }, "203.0.113.13");
    expect(replay.statusCode).toBe(401);

    // Tous les tokens de l'utilisateur ont été révoqués, y compris le neuf
    const r2 = await post("/api/v1/auth/refresh", {}, { refresh_token: newCookies.refresh_token }, "203.0.113.13");
    expect(r2.statusCode).toBe(401);
  });
});
