import { describe, it, expect, beforeAll, afterAll } from "vitest";
import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";

process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/test";
process.env.LOG_LEVEL = "silent";

const { rateLimitKey } = await import("../plugins/rate-limit.js");
const { buildApp } = await import("../app.js");

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

describe("rateLimitKey", () => {
  it("utilise le userId d'un access token valide", () => {
    const token = jwt.sign({ userId: "u-123" }, process.env.JWT_SECRET as string);
    const key = rateLimitKey({ ip: "1.2.3.4", cookies: { access_token: token } });
    expect(key).toBe("user:u-123");
  });

  it("retombe sur l'IP sans cookie", () => {
    expect(rateLimitKey({ ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
  });

  it("retombe sur l'IP avec un token invalide", () => {
    const key = rateLimitKey({ ip: "1.2.3.4", cookies: { access_token: "garbage" } });
    expect(key).toBe("ip:1.2.3.4");
  });
});

describe("auth rate limit par IP réelle (trustProxy)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function login(ip: string) {
    return app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: {
        "content-type": "application/json",
        origin: CORS_ORIGIN,
        "x-forwarded-for": ip,
      },
      payload: "{}",
    });
  }

  it("limite à 10/min par IP sans impacter les autres IP", async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await login("10.0.0.1")).statusCode;
    }
    expect(last).toBe(429);

    // Une autre IP n'est pas affectée (400 = body invalide, pas 429)
    const other = await login("10.0.0.2");
    expect(other.statusCode).toBe(400);
  });
});
