import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { InviteSchema, AcceptInviteSchema, TokenParamSchema } from "@commercehunter/shared";
import type { JwtPayload } from "../plugins/auth.js";
import { sendInvitationEmail } from "../services/email.service.js";

const FRONTEND_URL = process.env.CORS_ORIGIN ?? "http://localhost:3000";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
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
    maxAge: 15 * 60,
  });
  reply.setCookie("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
  });
}

export default async function organizationRoutes(app: FastifyInstance) {
  // ─── GET /api/v1/organization — Current org details ─────
  app.get(
    "/api/v1/organization",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const org = await app.prisma.organization.findUnique({
        where: { id: request.user.organizationId },
        include: {
          plan: true,
          users: {
            select: { id: true, name: true, email: true, role: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!org) {
        return reply.status(404).send({ error: "Organization not found" });
      }

      return {
        id: org.id,
        name: org.name,
        plan: {
          id: org.plan.id,
          name: org.plan.name,
          priceCents: org.plan.priceCents,
          cityLimit: org.plan.cityLimit,
          monthlyAnalysisLimit: org.plan.monthlyAnalysisLimit,
          hasPdfExport: org.plan.hasPdfExport,
          hasWhiteLabel: org.plan.hasWhiteLabel,
          hasApiAccess: org.plan.hasApiAccess,
        },
        usage: {
          monthlyAnalysesUsed: org.monthlyAnalysesUsed,
          monthlyAnalysisLimit: org.plan.monthlyAnalysisLimit,
          billingPeriodStart: org.billingPeriodStart.toISOString(),
        },
        members: org.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        })),
      };
    },
  );

  // ─── POST /api/v1/organization/invite — ADMIN only ─────
  app.post<{ Body: { email: string } }>(
    "/api/v1/organization/invite",
    { preHandler: app.authenticate },
    async (request, reply) => {
      if (request.user.role !== "ADMIN") {
        return reply
          .status(403)
          .send({ error: "Seuls les administrateurs peuvent inviter des membres." });
      }

      const parsed = InviteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Adresse email invalide." });
      }
      const { email } = parsed.data;

      // Check if user already in this org
      const existingUser = await app.prisma.user.findFirst({
        where: {
          email,
          organizationId: request.user.organizationId,
        },
      });
      if (existingUser) {
        return reply
          .status(409)
          .send({ error: "Cet utilisateur fait déjà partie de l'organisation." });
      }

      // Check for pending invitation with same email
      const existingInvite = await app.prisma.invitation.findFirst({
        where: {
          email,
          organizationId: request.user.organizationId,
          status: "PENDING",
        },
      });
      if (existingInvite) {
        return reply
          .status(409)
          .send({ error: "Une invitation est déjà en attente pour cet email." });
      }

      const [org, inviter] = await Promise.all([
        app.prisma.organization.findUnique({
          where: { id: request.user.organizationId },
          select: { name: true },
        }),
        app.prisma.user.findUnique({
          where: { id: request.user.userId },
          select: { name: true },
        }),
      ]);

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await app.prisma.invitation.create({
        data: {
          organizationId: request.user.organizationId,
          invitedById: request.user.userId,
          email,
          token,
          expiresAt,
        },
      });

      const inviteUrl = `${FRONTEND_URL}/invite/${token}`;

      sendInvitationEmail(
        email,
        inviteUrl,
        org?.name ?? "votre équipe",
        inviter?.name ?? "Un membre",
      ).catch((err) => console.error("[email] Failed to send invitation:", err));

      return reply.status(201).send({
        id: invitation.id,
        email: invitation.email,
        inviteUrl,
        expiresAt: invitation.expiresAt.toISOString(),
      });
    },
  );

  // ─── GET /api/v1/organization/invite/:token — Validate token ──
  app.get<{ Params: { token: string } }>(
    "/api/v1/organization/invite/:token",
    async (request, reply) => {
      const paramsParsed = TokenParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid invitation token" });
      }
      const { token } = paramsParsed.data;

      const invitation = await app.prisma.invitation.findUnique({
        where: { token },
        include: { organization: { select: { name: true } } },
      });

      if (!invitation) {
        return reply.status(404).send({ error: "Invitation introuvable." });
      }

      if (invitation.status !== "PENDING") {
        return reply
          .status(410)
          .send({ error: "Cette invitation a déjà été utilisée." });
      }

      if (invitation.expiresAt < new Date()) {
        await app.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        return reply.status(410).send({ error: "Cette invitation a expiré." });
      }

      return {
        email: invitation.email,
        organizationName: invitation.organization.name,
      };
    },
  );

  // ─── POST /api/v1/organization/invite/:token/accept — Public ──
  app.post<{
    Params: { token: string };
    Body: { name: string; password: string };
  }>("/api/v1/organization/invite/:token/accept", async (request, reply) => {
    const paramsParsed = TokenParamSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({ error: "Invalid invitation token" });
    }
    const { token } = paramsParsed.data;
    const parsed = AcceptInviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Nom requis et mot de passe minimum 8 caractères.",
      });
    }
    const { name, password } = parsed.data;

    const invitation = await app.prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return reply.status(404).send({ error: "Invitation introuvable." });
    }

    if (invitation.status !== "PENDING") {
      return reply
        .status(410)
        .send({ error: "Cette invitation a déjà été utilisée." });
    }

    if (invitation.expiresAt < new Date()) {
      await app.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return reply.status(410).send({ error: "Cette invitation a expiré." });
    }

    // Check email not already registered
    const existingUser = await app.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (existingUser) {
      return reply
        .status(409)
        .send({ error: "Un compte existe déjà avec cet email." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [user] = await app.prisma.$transaction([
      app.prisma.user.create({
        data: {
          organizationId: invitation.organizationId,
          email: invitation.email,
          passwordHash,
          name,
          role: "USER",
        },
      }),
      app.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      }),
    ]);

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

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
    });
  });
}
