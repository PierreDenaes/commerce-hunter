import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: "ADMIN" | "USER";
}

declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET");

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest("user", null as unknown as JwtPayload);

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.cookies.access_token;
      if (!token) {
        return reply.status(401).send({ error: "Not authenticated" });
      }
      try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        request.user = payload;
      } catch {
        return reply.status(401).send({ error: "Invalid or expired token" });
      }
    },
  );
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
