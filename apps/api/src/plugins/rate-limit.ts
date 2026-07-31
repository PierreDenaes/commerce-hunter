import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

interface KeyableRequest {
  ip: string;
  cookies?: Record<string, string | undefined>;
}

/**
 * Clé de rate limit : userId si un access token valide est présent, IP sinon.
 * Le plugin rate-limit s'exécute en onRequest, AVANT le preHandler authenticate —
 * request.user n'existe pas encore, on vérifie donc le cookie directement
 * (HMAC, coût négligeable, authenticate re-vérifie de toute façon).
 */
export function rateLimitKey(request: KeyableRequest): string {
  const token = request.cookies?.access_token;
  if (token && JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId?: string };
      if (payload.userId) return `user:${payload.userId}`;
    } catch {
      // token invalide/expiré → clé IP
    }
  }
  return `ip:${request.ip}`;
}

export default fp(async (app: FastifyInstance) => {
  // Global rate limit: 100 req/min per user (authenticated) or per IP (anonymous)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: rateLimitKey,
  });
});

/**
 * Stricter rate limit config for auth routes: 10 req/min per IP.
 * Usage: app.post("/auth/login", { config: { rateLimit: authRateLimit } }, handler)
 */
export const authRateLimit = {
  max: 10,
  timeWindow: "1 minute",
  keyGenerator: (request: { ip: string }) => request.ip,
};

/**
 * Strict rate limit for destructive operations (DELETE, bulk): 10 req/min per user.
 * Usage: app.delete("/api/v1/resource/:id", { config: { rateLimit: destructiveRateLimit }, preHandler: app.authenticate }, handler)
 */
export const destructiveRateLimit = {
  max: 10,
  timeWindow: "1 minute",
  keyGenerator: rateLimitKey,
};
