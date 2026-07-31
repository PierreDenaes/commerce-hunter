import type { FastifyInstance } from "fastify";
import { ListScansQuerySchema, UuidParamSchema } from "@commercehunter/shared";
import { ScanService } from "../services/scan.service.js";
import { enqueueAnalyses } from "../queue/index.js";
import { destructiveRateLimit } from "../plugins/rate-limit.js";

export default async function scanRoutes(app: FastifyInstance) {
  const scanService = new ScanService(app.prisma, app.log);

  // POST /api/v1/scans — Create a new scan
  app.post(
    "/api/v1/scans",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await scanService.createScan({
        userId: request.user.userId,
        organizationId: request.user.organizationId,
        body: request.body,
      });

      if ("error" in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(result.status).send(result.data);
    },
  );

  // GET /api/v1/scans — List scans for current org
  app.get(
    "/api/v1/scans",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = ListScansQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const result = await scanService.listScans({
        organizationId: request.user.organizationId,
        page: parsed.data.page,
        limit: parsed.data.limit,
        status: parsed.data.status,
      });

      return reply.send(result);
    },
  );

  // GET /api/v1/scans/:id — Get scan details with stats
  app.get(
    "/api/v1/scans/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid scan ID" });
      }

      const result = await scanService.getScan(
        paramsParsed.data.id,
        request.user.organizationId,
      );

      if ("error" in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(result.status).send(result.data);
    },
  );

  // DELETE /api/v1/scans/:id — Delete a scan
  app.delete(
    "/api/v1/scans/:id",
    { preHandler: app.authenticate, config: { rateLimit: destructiveRateLimit } },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid scan ID" });
      }

      const scan = await app.prisma.scan.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
      });

      if (!scan) {
        return reply.status(404).send({ error: "Scan introuvable" });
      }

      await app.prisma.scan.delete({ where: { id: scan.id } });

      return reply.status(200).send({ message: "Scan supprimé" });
    },
  );

  // POST /api/v1/scans/:id/reanalyze — Bulk re-analyze all businesses in a scan
  app.post(
    "/api/v1/scans/:id/reanalyze",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid scan ID" });
      }

      const scan = await app.prisma.scan.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
        include: {
          _count: { select: { scanBusinesses: true } },
        },
      });

      if (!scan) {
        return reply.status(404).send({ error: "Scan introuvable" });
      }

      // Reset all existing analyses for this scan to PENDING
      const scanBusinesses = await app.prisma.scanBusiness.findMany({
        where: { scanId: scan.id },
        select: { businessId: true },
      });
      const businessIds = scanBusinesses.map((sb) => sb.businessId);

      if (businessIds.length === 0) {
        return reply.status(400).send({ error: "Aucune entreprise dans ce scan" });
      }

      await app.prisma.analysis.updateMany({
        where: { businessId: { in: businessIds } },
        data: { status: "PENDING", errorMessage: null },
      });

      // Job durable : survit aux redeploys, retenté automatiquement
      await enqueueAnalyses(scan.id, request.log);

      return reply.status(202).send({
        message: "Re-analyse lancée",
        scanId: scan.id,
        businessCount: businessIds.length,
      });
    },
  );
}
