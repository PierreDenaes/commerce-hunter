import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/test";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../app.js");

describe("CSRF origin check", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("laisse passer le webhook Stripe sans header Origin (serveur→serveur)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhook",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    // Atteint le handler : 400 (signature manquante), pas 403 (CSRF)
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/signature/i);
  });

  it("bloque toujours les autres mutations sans Origin", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/scans",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(403);
  });

  it("bloque une mutation avec un mauvais Origin", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example.com",
      },
      payload: "{}",
    });
    expect(res.statusCode).toBe(403);
  });
});
