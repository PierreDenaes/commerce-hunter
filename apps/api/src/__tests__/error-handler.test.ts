import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/test";
process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../app.js");

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

describe("setErrorHandler global", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("renvoie l'enveloppe { error } sur un body JSON malformé", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json", origin: CORS_ORIGIN },
      payload: "{invalid json",
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(Object.keys(body)).toEqual(["error"]);
    expect(typeof body.error).toBe("string");
  });

  it("renvoie l'enveloppe { error } sur une route inconnue (404 Fastify)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/nope" });
    expect(res.statusCode).toBe(404);
  });
});
