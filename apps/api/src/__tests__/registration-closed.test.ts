import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/test";
process.env.LOG_LEVEL = "silent";
process.env.REGISTRATION_ENABLED = "false";

const { buildApp } = await import("../app.js");

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

describe("inscriptions fermées (REGISTRATION_ENABLED=false)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    delete process.env.REGISTRATION_ENABLED;
    await app.close();
  });

  it("refuse POST /auth/register en 403 avant toute validation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { "content-type": "application/json", origin: CORS_ORIGIN },
      payload: JSON.stringify({
        organizationName: "X",
        name: "X",
        email: "x@example.com",
        password: "password123",
      }),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/fermées/);
  });

  it("laisse le login accessible", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json", origin: CORS_ORIGIN },
      payload: "{}",
    });
    // 400 = body invalide (la route répond), pas 403
    expect(res.statusCode).toBe(400);
  });
});
