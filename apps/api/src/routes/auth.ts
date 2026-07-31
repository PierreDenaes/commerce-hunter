import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from "@commercehunter/shared";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/email.service.js";
import type { JwtPayload } from "../plugins/auth.js";
import { authRateLimit } from "../plugins/rate-limit.js";
import { isBillingEnabled, isRegistrationEnabled, SELF_HOSTED_PLAN_NAME } from "../utils/billing-status.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

interface RefreshTokenPayload extends JwtPayload {
  jti: string;
}

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(payload: JwtPayload, jti: string): string {
  return jwt.sign({ ...payload, jti }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
  });
}

function setTokenCookies(
  reply: import("fastify").FastifyReply,
  accessToken: string,
  refreshToken: string,
) {
  reply.setCookie("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });
  reply.setCookie("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
  });
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  app.post("/api/v1/auth/register", { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    if (!isRegistrationEnabled()) {
      return reply.status(403).send({
        error: "Les inscriptions sont fermées sur cette instance.",
      });
    }
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { organizationName, name, email, password } = parsed.data;

    const existingUser = await app.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    // Billing dormant → plan self-hosted illimité ; sinon Starter.
    // Fallback sur Starter si le seed n'a pas encore créé le plan Self-hosted.
    const defaultPlanName = isBillingEnabled() ? "Starter" : SELF_HOSTED_PLAN_NAME;
    let defaultPlan = await app.prisma.subscriptionPlan.findUnique({
      where: { name: defaultPlanName },
    });
    if (!defaultPlan && defaultPlanName !== "Starter") {
      request.log.warn(`Plan "${defaultPlanName}" absent — fallback Starter (relancer le seed)`);
      defaultPlan = await app.prisma.subscriptionPlan.findUnique({
        where: { name: "Starter" },
      });
    }
    if (!defaultPlan) {
      return reply.status(500).send({ error: "Default plan not found" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const organization = await app.prisma.organization.create({
      data: {
        name: organizationName,
        planId: defaultPlan.id,
        billingPeriodStart: new Date(),
        users: {
          create: {
            email,
            passwordHash,
            name,
            role: "ADMIN",
          },
        },
      },
      include: { users: true },
    });

    const user = organization.users[0];

    const tokenPayload: JwtPayload = {
      userId: user.id,
      organizationId: organization.id,
      role: user.role,
    };

    const jti = randomUUID();
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload, jti);

    await app.prisma.refreshToken.create({
      data: {
        jti,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000),
      },
    });

    setTokenCookies(reply, accessToken, refreshToken);

    sendWelcomeEmail(email, name).catch((err) =>
      console.error("[email] Failed to send welcome:", err),
    );

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  });

  // POST /api/v1/auth/login
  app.post("/api/v1/auth/login", { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const user = await app.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      request.log.warn(
        { email, ip: request.ip, ua: request.headers["user-agent"] },
        "Failed login: user not found",
      );
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      request.log.warn(
        { email, ip: request.ip, ua: request.headers["user-agent"] },
        "Failed login: wrong password",
      );
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    await app.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenPayload: JwtPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    const jti = randomUUID();
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload, jti);

    await app.prisma.refreshToken.create({
      data: {
        jti,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000),
      },
    });

    setTokenCookies(reply, accessToken, refreshToken);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    });
  });

  // GET /api/v1/auth/me — Current user info
  app.get(
    "/api/v1/auth/me",
    { preHandler: app.authenticate },
    async (request) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { id: true, email: true, name: true, role: true },
      });
      return { user };
    },
  );

  // POST /api/v1/auth/logout — revoke refresh tokens + clear cookies
  app.post("/api/v1/auth/logout", async (request, reply) => {
    // Best-effort: revoke the current refresh token if present
    const token = request.cookies.refresh_token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
        if (payload.jti) {
          await app.prisma.refreshToken.updateMany({
            where: { jti: payload.jti, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      } catch {
        // Token invalid/expired — just clear cookies
      }
    }

    reply.clearCookie("access_token", { path: "/" });
    reply.clearCookie("refresh_token", { path: "/" });
    return reply.send({ message: "Logged out" });
  });

  // POST /api/v1/auth/refresh — rotate refresh token
  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const token = request.cookies.refresh_token;
    if (!token) {
      return reply.status(401).send({ error: "No refresh token" });
    }

    try {
      const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;

      if (!payload.jti) {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      // Find the stored token and verify it hasn't been revoked
      const storedToken = await app.prisma.refreshToken.findUnique({
        where: { jti: payload.jti },
      });

      if (!storedToken || storedToken.revokedAt) {
        // Possible token replay — revoke ALL tokens for this user
        await app.prisma.refreshToken.updateMany({
          where: { userId: payload.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        reply.clearCookie("access_token", { path: "/" });
        reply.clearCookie("refresh_token", { path: "/" });
        return reply.status(401).send({ error: "Refresh token revoked" });
      }

      // Revoke the old token
      await app.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { revokedAt: new Date() },
      });

      const user = await app.prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      const newPayload: JwtPayload = {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      };

      // Issue new token pair with fresh jti
      const newJti = randomUUID();
      const newAccessToken = generateAccessToken(newPayload);
      const newRefreshToken = generateRefreshToken(newPayload, newJti);

      await app.prisma.refreshToken.create({
        data: {
          jti: newJti,
          userId: user.id,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000),
        },
      });

      setTokenCookies(reply, newAccessToken, newRefreshToken);
      return reply.send({ message: "Tokens refreshed" });
    } catch {
      reply.clearCookie("access_token", { path: "/" });
      reply.clearCookie("refresh_token", { path: "/" });
      return reply.status(401).send({ error: "Invalid or expired refresh token" });
    }
  });

  // POST /api/v1/auth/forgot-password
  app.post("/api/v1/auth/forgot-password", { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const parsed = ForgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { email } = parsed.data;

    const user = await app.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomUUID();
      await app.prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const frontendUrl = process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000";
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (err) {
        app.log.error({ err }, "Failed to send password reset email");
      }
    }

    // Always return 200 to not reveal if email exists
    return reply.send({ message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation." });
  });

  // POST /api/v1/auth/reset-password
  app.post("/api/v1/auth/reset-password", { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const parsed = ResetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { token, password } = parsed.data;

    const resetToken = await app.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Lien invalide ou expiré." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await app.prisma.$transaction([
      // Update the user's password
      app.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Mark the token as used
      app.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for this user (force re-login)
      app.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return reply.send({ message: "Mot de passe modifié avec succès." });
  });
}
