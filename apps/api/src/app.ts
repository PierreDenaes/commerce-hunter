import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import dbPlugin from "./plugins/db.js";
import authPlugin from "./plugins/auth.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import authRoutes from "./routes/auth.js";
import scanRoutes from "./routes/scans.js";
import businessRoutes from "./routes/businesses.js";
import dashboardRoutes from "./routes/dashboard.js";
import exportRoutes from "./routes/export.js";
import organizationRoutes from "./routes/organization.js";
import billingRoutes from "./routes/billing.js";
import prospectListRoutes from "./routes/prospect-lists.js";
import { isBillingEnabled } from "./utils/billing-status.js";

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

export async function buildApp(): Promise<FastifyInstance> {
  const REQUIRED_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"] as const;
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) throw new Error(`[startup] Missing required env var: ${key}`);
  }

  const app = Fastify({
    // Derrière Caddy : sans trustProxy, request.ip = IP du proxy pour tous
    // et le rate limiting devient global. Le port API n'est pas exposé publiquement.
    trustProxy: true,
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.passwordHash",
          "req.body.token",
          "req.body.refreshToken",
          "req.body.accessToken",
          "req.body.apiKey",
          "req.body.secret",
        ],
        censor: "[REDACTED]",
      },
    },
  });

  // ─── Security headers ──────────────────────────────────
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0");
    reply.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
    reply.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
  });

  // ─── CSRF origin check on mutations ────────────────────
  app.addHook("onRequest", async (request, reply) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

    // Le webhook Stripe est serveur→serveur (pas de header Origin) ;
    // il est authentifié par la vérification de signature Stripe.
    if (request.url.split("?")[0] === "/api/v1/billing/webhook") return;

    const origin = request.headers.origin;
    if (!origin || origin !== CORS_ORIGIN) {
      return reply.status(403).send({ error: "Forbidden: origin mismatch" });
    }
  });

  // ─── Gestionnaire d'erreurs global : enveloppe uniforme { error } ──
  // Déclaré AVANT l'enregistrement des routes pour que les contextes
  // encapsulés l'héritent. Sans lui, les exceptions non catchées fuient
  // le format Fastify brut (message interne inclus).
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Erreurs Fastify avec statut < 500 (rate limit 429, body malformé 400…)
    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send({ error: error.message });
    }

    // Prisma : identifiant malformé (P2023) ou introuvable (P2025)
    const prismaCode = error.code;
    if (prismaCode === "P2023") {
      return reply.status(400).send({ error: "Invalid identifier format" });
    }
    if (prismaCode === "P2025") {
      return reply.status(404).send({ error: "Resource not found" });
    }

    request.log.error({ err: error }, "Unhandled error");
    return reply.status(500).send({ error: "Internal server error" });
  });

  // Core plugins
  await app.register(cors, {
    origin: CORS_ORIGIN,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimitPlugin);

  // App plugins
  await app.register(dbPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(authRoutes);
  await app.register(scanRoutes);
  await app.register(businessRoutes);
  await app.register(dashboardRoutes);
  await app.register(exportRoutes);
  await app.register(organizationRoutes);
  if (isBillingEnabled()) {
    await app.register(billingRoutes);
  } else {
    app.log.info("Billing dormant (no STRIPE_SECRET_KEY or BILLING_ENABLED=false) — billing routes not registered");
  }
  await app.register(prospectListRoutes);

  app.get("/api/v1/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  return app;
}
