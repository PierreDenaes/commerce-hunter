import type { FastifyInstance } from "fastify";
import { Prisma } from "@commercehunter/db";
import {
  CreateProspectListSchema,
  UpdateProspectListSchema,
  AddBusinessesToListSchema,
  ListProspectListsQuerySchema,
  ListProspectListBusinessesQuerySchema,
  UuidParamSchema,
  BusinessIdParamSchema,
} from "@commercehunter/shared";
import { destructiveRateLimit } from "../plugins/rate-limit.js";

export default async function prospectListRoutes(app: FastifyInstance) {
  // ─── POST /api/v1/prospect-lists — Create a list ───────
  app.post(
    "/api/v1/prospect-lists",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = CreateProspectListSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const list = await app.prisma.prospectList.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          organizationId: request.user.organizationId,
          createdById: request.user.userId,
        },
      });

      return reply.status(201).send(list);
    },
  );

  // ─── GET /api/v1/prospect-lists — List all lists ───────
  app.get(
    "/api/v1/prospect-lists",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = ListProspectListsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { page, limit, search } = parsed.data;
      const where: Prisma.ProspectListWhereInput = {
        organizationId: request.user.organizationId,
      };

      if (search) {
        where.name = { contains: search, mode: "insensitive" };
      }

      const [data, total] = await Promise.all([
        app.prisma.prospectList.findMany({
          where,
          include: {
            _count: { select: { businesses: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        app.prisma.prospectList.count({ where }),
      ]);

      return reply.send({
        data,
        pagination: { page, limit, total },
      });
    },
  );

  // ─── GET /api/v1/prospect-lists/:id — Get list detail ──
  app.get(
    "/api/v1/prospect-lists/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid list ID" });
      }

      const list = await app.prisma.prospectList.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
        include: {
          _count: { select: { businesses: true } },
          createdBy: { select: { name: true } },
        },
      });

      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      return reply.send(list);
    },
  );

  // ─── PUT /api/v1/prospect-lists/:id — Update list ──────
  app.put(
    "/api/v1/prospect-lists/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid list ID" });
      }

      const parsed = UpdateProspectListSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const list = await app.prisma.prospectList.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
      });

      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      const updated = await app.prisma.prospectList.update({
        where: { id: list.id },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.description !== undefined && {
            description: parsed.data.description ?? null,
          }),
        },
      });

      return reply.send(updated);
    },
  );

  // ─── DELETE /api/v1/prospect-lists/:id — Delete list ───
  app.delete(
    "/api/v1/prospect-lists/:id",
    { preHandler: app.authenticate, config: { rateLimit: destructiveRateLimit } },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid list ID" });
      }

      const list = await app.prisma.prospectList.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
      });

      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      await app.prisma.prospectList.delete({ where: { id: list.id } });

      return reply.send({ message: "Liste supprimée" });
    },
  );

  // ─── POST /api/v1/prospect-lists/:id/businesses — Add businesses ──
  app.post(
    "/api/v1/prospect-lists/:id/businesses",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid list ID" });
      }

      const parsed = AddBusinessesToListSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      // Verify list belongs to org
      const list = await app.prisma.prospectList.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
      });

      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      // Verify all businesses belong to org (via scanBusinesses)
      const ownedBusinesses = await app.prisma.business.findMany({
        where: {
          id: { in: parsed.data.businessIds },
          scanBusinesses: {
            some: {
              scan: { organizationId: request.user.organizationId },
            },
          },
        },
        select: { id: true },
      });

      const ownedIds = new Set(ownedBusinesses.map((b) => b.id));
      const validIds = parsed.data.businessIds.filter((id) => ownedIds.has(id));

      if (validIds.length === 0) {
        return reply
          .status(400)
          .send({ error: "Aucune entreprise valide à ajouter" });
      }

      // Bulk insert, skip duplicates
      const result = await app.prisma.prospectListBusiness.createMany({
        data: validIds.map((businessId) => ({
          prospectListId: list.id,
          businessId,
        })),
        skipDuplicates: true,
      });

      return reply
        .status(201)
        .send({ added: result.count, total: validIds.length });
    },
  );

  // ─── DELETE /api/v1/prospect-lists/:id/businesses/:businessId — Remove ──
  app.delete<{ Params: { id: string; businessId: string } }>(
    "/api/v1/prospect-lists/:id/businesses/:businessId",
    { preHandler: app.authenticate, config: { rateLimit: destructiveRateLimit } },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.merge(BusinessIdParamSchema).safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid id" });
      }
      const { id, businessId } = paramsParsed.data;

      // Verify list belongs to org
      const list = await app.prisma.prospectList.findFirst({
        where: { id, organizationId: request.user.organizationId },
      });

      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      // Find the junction record
      const entry = await app.prisma.prospectListBusiness.findUnique({
        where: {
          prospectListId_businessId: {
            prospectListId: id,
            businessId,
          },
        },
      });

      if (!entry) {
        return reply
          .status(404)
          .send({ error: "Entreprise non trouvée dans cette liste" });
      }

      await app.prisma.prospectListBusiness.delete({
        where: { id: entry.id },
      });

      return reply.send({ message: "Entreprise retirée de la liste" });
    },
  );

  // ─── GET /api/v1/prospect-lists/:id/businesses — List businesses ──
  app.get(
    "/api/v1/prospect-lists/:id/businesses",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid list ID" });
      }

      const parsed = ListProspectListBusinessesQuerySchema.safeParse(
        request.query,
      );
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      // Verify list belongs to org
      const list = await app.prisma.prospectList.findFirst({
        where: {
          id: paramsParsed.data.id,
          organizationId: request.user.organizationId,
        },
      });

      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      const { page, limit, search, sortBy, sortOrder } = parsed.data;

      const where: Prisma.ProspectListBusinessWhereInput = {
        prospectListId: list.id,
      };

      if (search) {
        where.business = {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ],
        };
      }

      const orderByMap: Record<
        string,
        Prisma.ProspectListBusinessOrderByWithRelationInput
      > = {
        digital_score: { business: { analysis: { digitalScore: sortOrder } } },
        seo_score: { business: { analysis: { seoScore: sortOrder } } },
        name: { business: { name: sortOrder } },
        city: { business: { city: sortOrder } },
        added_at: { createdAt: sortOrder },
      };

      const [entries, total] = await Promise.all([
        app.prisma.prospectListBusiness.findMany({
          where,
          include: {
            business: {
              include: {
                analysis: {
                  select: {
                    seoScore: true,
                    digitalScore: true,
                    priority: true,
                    status: true,
                    contactEmails: true,
                  },
                },
              },
            },
          },
          orderBy: orderByMap[sortBy] ?? { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        app.prisma.prospectListBusiness.count({ where }),
      ]);

      // Flatten to match BusinessRow shape expected by frontend
      const data = entries.map((entry) => ({
        id: entry.business.id,
        entryId: entry.id,
        name: entry.business.name,
        entityType: entry.business.entityType,
        apeCode: entry.business.apeCode,
        city: entry.business.city,
        website: entry.business.website,
        seoScore: entry.business.analysis?.seoScore ?? null,
        digitalScore: entry.business.analysis?.digitalScore ?? null,
        priority: entry.business.analysis?.priority ?? null,
        analysisStatus: entry.business.analysis?.status ?? null,
        contactEmails: entry.business.analysis?.contactEmails ?? [],
        addedAt: entry.createdAt,
      }));

      return reply.send({
        data,
        pagination: { page, limit, total },
      });
    },
  );
}
