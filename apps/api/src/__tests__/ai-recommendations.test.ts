import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/test";
process.env.LOG_LEVEL = "silent";
// Simule une instance SANS clé IA
delete process.env.ANTHROPIC_API_KEY;

const { isAiEnabled } = await import("../services/ai-recommendations.service.js");
const { buildApp } = await import("../app.js");

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

describe("recommandations IA — service désactivé sans clé", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("isAiEnabled reflète la présence de la clé", () => {
    expect(isAiEnabled()).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(isAiEnabled()).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("la route répond 401 sans authentification (route enregistrée)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/businesses/5f1e7ab2-51f4-4b0e-9db0-1c1a2b3c4d5e/ai-recommendations",
      headers: { "content-type": "application/json", origin: CORS_ORIGIN },
      payload: "{}",
    });
    expect(res.statusCode).toBe(401);
  });
});
