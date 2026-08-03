import type { FastifyInstance } from "fastify";
import { Prisma } from "@commercehunter/db";
import { ExportCsvQuerySchema, BusinessIdParamSchema, UuidParamSchema } from "@commercehunter/shared";
import { buildCsv, parseColumnsParam, type CsvBusinessRow } from "../utils/csv-export.js";
import { renderAuditReport, type AuditReportData } from "@commercehunter/pdf";
import { QuotaService } from "../services/quota.service.js";

export default async function exportRoutes(app: FastifyInstance) {
  // ─── GET /api/v1/export/csv — Stream CSV of businesses ──
  app.get<{ Querystring: Record<string, string> }>(
    "/api/v1/export/csv",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = ExportCsvQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const {
        scanId,
        entityType,
        priority,
        hasWebsite,
        city,
        apeCode,
        minScore,
        maxScore,
        search,
        sortBy,
        sortOrder,
      } = parsed.data;

      // Verify scan belongs to org
      const scan = await app.prisma.scan.findFirst({
        where: { id: scanId, organizationId: request.user.organizationId },
        select: { id: true, name: true },
      });
      if (!scan) {
        return reply.status(404).send({ error: "Scan not found" });
      }

      // Build where clause (same logic as businesses route)
      const where: Prisma.BusinessWhereInput = {
        scanBusinesses: { some: { scanId } },
      };

      if (entityType) where.entityType = entityType;
      if (hasWebsite === true) where.website = { not: null };
      if (hasWebsite === false) where.website = null;
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (apeCode) where.apeCode = { startsWith: apeCode };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
        ];
      }

      if (minScore !== undefined || maxScore !== undefined || priority) {
        const analysisFilter: Prisma.AnalysisWhereInput = {};
        if (minScore !== undefined) analysisFilter.digitalScore = { gte: minScore };
        if (maxScore !== undefined) {
          analysisFilter.digitalScore = {
            ...(analysisFilter.digitalScore as Prisma.IntNullableFilter || {}),
            lte: maxScore,
          };
        }
        if (priority) analysisFilter.priority = priority;
        where.analysis = analysisFilter;
      }

      const sortMap: Record<string, Prisma.BusinessOrderByWithRelationInput> = {
        digital_score: { analysis: { digitalScore: sortOrder } },
        seo_score: { analysis: { seoScore: sortOrder } },
        name: { name: sortOrder },
        city: { city: sortOrder },
      };

      // Fetch ALL matching businesses (no pagination for export)
      const businesses = await app.prisma.business.findMany({
        where,
        include: {
          analysis: {
            select: {
              seoScore: true,
              digitalScore: true,
              priority: true,
              status: true,
              contactEmails: true,
              analyzedAt: true,
              analyzedUrl: true,
            },
          },
        },
        orderBy: sortMap[sortBy] ?? { name: "asc" },
      });

      // Build CSV (colonnes sélectionnables via ?columns=)
      const csv = buildCsv(
        businesses as unknown as CsvBusinessRow[],
        parseColumnsParam(parsed.data.columns),
      );

      const filename = `commercehunter-export-${scan.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(csv);
    },
  );

  // ─── GET /api/v1/export/prospect-list-csv/:id — CSV from prospect list ──
  app.get<{ Params: { id: string } }>(
    "/api/v1/export/prospect-list-csv/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid id" });
      }
      const { id } = paramsParsed.data;

      // Verify list belongs to org
      const list = await app.prisma.prospectList.findFirst({
        where: { id, organizationId: request.user.organizationId },
        select: { id: true, name: true },
      });
      if (!list) {
        return reply.status(404).send({ error: "Liste introuvable" });
      }

      // Fetch all businesses in the list
      const entries = await app.prisma.prospectListBusiness.findMany({
        where: { prospectListId: list.id },
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
                  analyzedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const businesses = entries.map((e) => e.business);

      // Build CSV (colonnes sélectionnables via ?columns=)
      const csv = buildCsv(
        businesses as unknown as CsvBusinessRow[],
        parseColumnsParam((request.query as { columns?: string }).columns),
      );

      const filename = `commercehunter-prospects-${list.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(csv);
    },
  );

  // ─── GET /api/v1/export/pdf/:businessId — PDF audit ─────
  app.get<{ Params: { businessId: string } }>(
    "/api/v1/export/pdf/:businessId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      // Validate params
      const paramsParsed = BusinessIdParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid business ID" });
      }

      // Check plan feature gate
      const quotaService = new QuotaService(app.prisma);
      const featureCheck = await quotaService.checkFeatureAccess(
        request.user.organizationId,
        "hasPdfExport",
      );

      if (!featureCheck.allowed) {
        return reply.status(403).send({
          error: featureCheck.error,
          plan: featureCheck.plan,
          upgradeRequired: true,
        });
      }

      // Fetch business with analysis
      const { businessId } = paramsParsed.data;

      const business = await app.prisma.business.findUnique({
        where: { id: businessId },
        include: {
          scanBusinesses: {
            include: {
              scan: { select: { organizationId: true } },
            },
          },
          analysis: true,
        },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      // Verify org ownership
      const orgMatch = business.scanBusinesses.some(
        (sb) => sb.scan.organizationId === request.user.organizationId,
      );
      if (!orgMatch) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const a = business.analysis;

      // Build report data
      const reportData: AuditReportData = {
        business: {
          name: business.name,
          siret: business.siret,
          siren: business.siren,
          entityType: business.entityType,
          apeCode: business.apeCode,
          legalForm: business.legalForm,
          employeesRange: business.employeesRange,
          address: business.address,
          city: business.city,
          postalCode: business.postalCode,
          phone: business.phone,
          website: business.website,
          isHeadquarters: business.isHeadquarters,
        },
        analysis: a
          ? {
              status: a.status,
              analyzedUrl: a.analyzedUrl,
              technical: {
                isHttps: a.isHttps,
                httpStatusCode: a.httpStatusCode,
                responseTimeMs: a.responseTimeMs,
                hasRobotsTxt: a.hasRobotsTxt,
                hasSitemapXml: a.hasSitemapXml,
              },
              seoOnPage: {
                title: a.title,
                titleLength: a.titleLength,
                metaDescription: a.metaDescription,
                metaDescriptionLength: a.metaDescriptionLength,
                h1: a.h1,
                hasCanonical: a.hasCanonical,
                hasFavicon: a.hasFavicon,
              },
              mobile: {
                hasViewport: a.hasViewport,
                mobileScore: a.mobileScore,
              },
              localSeo: {
                cityInTitle: a.cityInTitle,
                cityInH1: a.cityInH1,
                cityInDescription: a.cityInDescription,
                hasSchemaLocalBusiness: a.hasSchemaLocalBusiness,
                hasGoogleMapsEmbed: a.hasGoogleMapsEmbed,
              },
              scores: {
                seoScore: a.seoScore,
                digitalScore: a.digitalScore,
                priority: a.priority,
              },
              analyzedAt: a.analyzedAt?.toISOString() ?? null,
            }
          : null,
        // Recommandations IA si générées — sans le brouillon d'email
        // (le PDF est destiné au prospect, l'email au prestataire)
        aiRecommendations: a?.aiRecommendations
          ? (() => {
              const reco = a.aiRecommendations as {
                summary: string;
                priorityActions: {
                  title: string;
                  why: string;
                  impact: string;
                  effort: string;
                }[];
                quickWins: string[];
              };
              return {
                summary: reco.summary,
                priorityActions: reco.priorityActions,
                quickWins: reco.quickWins,
              };
            })()
          : null,
        generatedAt: new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const pdfBuffer = await renderAuditReport(reportData);

      const filename = `audit-${business.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(pdfBuffer);
    },
  );
}
