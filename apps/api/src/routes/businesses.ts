import type { FastifyInstance } from "fastify";
import { Prisma } from "@commercehunter/db";
import { BusinessQuerySchema, UuidParamSchema } from "@commercehunter/shared";
import { SeoAnalyzerService } from "../services/seo-analyzer.service.js";
import { PageSpeedService } from "../services/pagespeed.service.js";
import { scoreAnalysis } from "../services/scoring.service.js";
import { QuotaService } from "../services/quota.service.js";
import { AiRecommendationsService, isAiEnabled } from "../services/ai-recommendations.service.js";
import { destructiveRateLimit } from "../plugins/rate-limit.js";
import { analyzeSingleBusiness } from "../workers/analysis.worker.js";

export default async function businessRoutes(app: FastifyInstance) {
  // ─── GET /api/v1/businesses — List with filters ────────
  app.get<{ Querystring: Record<string, string> }>(
    "/api/v1/businesses",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = BusinessQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const {
        scanId,
        page,
        limit,
        entityType,
        priority,
        hasWebsite,
        city,
        apeCode,
        apeCategories,
        employeesRangeCodes,
        postalCode,
        isHeadquarters,
        analysisStatus,
        minScore,
        maxScore,
        search,
        sortBy,
        sortOrder,
      } = parsed.data;

      // Build where clause using AND to avoid OR conflicts
      const andConditions: Prisma.BusinessWhereInput[] = [];

      const where: Prisma.BusinessWhereInput = {};

      if (scanId) {
        // Verify scan belongs to org
        const scan = await app.prisma.scan.findFirst({
          where: { id: scanId, organizationId: request.user.organizationId },
          select: { id: true },
        });
        if (!scan) {
          return reply.status(404).send({ error: "Scan not found" });
        }
        where.scanBusinesses = { some: { scanId } };
      } else {
        // All businesses belonging to this org (via any scan)
        where.scanBusinesses = {
          some: { scan: { organizationId: request.user.organizationId } },
        };
      }

      if (entityType) where.entityType = entityType;
      if (hasWebsite === true) where.website = { not: null };
      if (hasWebsite === false) where.website = null;
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (apeCode) where.apeCode = { startsWith: apeCode };
      if (postalCode) where.postalCode = { startsWith: postalCode };
      if (isHeadquarters !== undefined) where.isHeadquarters = isHeadquarters;
      if (employeesRangeCodes && employeesRangeCodes.length > 0) {
        where.employeesRangeCode = { in: employeesRangeCodes };
      }

      if (apeCategories && apeCategories.length > 0) {
        andConditions.push({
          OR: apeCategories.map((c) => ({ apeCode: { startsWith: c } })),
        });
      }

      if (search) {
        andConditions.push({
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      // Score + analysis status filters via analysis relation
      if (minScore !== undefined || maxScore !== undefined || priority || analysisStatus) {
        const analysisFilter: Prisma.AnalysisWhereInput = {};
        if (minScore !== undefined) analysisFilter.digitalScore = { gte: minScore };
        if (maxScore !== undefined) {
          analysisFilter.digitalScore = {
            ...(analysisFilter.digitalScore as Prisma.IntNullableFilter || {}),
            lte: maxScore,
          };
        }
        if (priority) analysisFilter.priority = priority;
        if (analysisStatus) analysisFilter.status = analysisStatus;
        where.analysis = analysisFilter;
      }

      // Sort mapping
      const sortMap: Record<string, Prisma.BusinessOrderByWithRelationInput> = {
        digital_score: { analysis: { digitalScore: sortOrder } },
        seo_score: { analysis: { seoScore: sortOrder } },
        name: { name: sortOrder },
        city: { city: sortOrder },
      };

      const [data, total] = await Promise.all([
        app.prisma.business.findMany({
          where,
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
          orderBy: sortMap[sortBy] ?? { name: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        app.prisma.business.count({ where }),
      ]);

      return {
        data: data.map((b) => ({
          id: b.id,
          name: b.name,
          siret: b.siret,
          siren: b.siren,
          entityType: b.entityType,
          apeCode: b.apeCode,
          legalForm: b.legalForm,
          employeesRange: b.employeesRange,
          address: b.address,
          city: b.city,
          postalCode: b.postalCode,
          phone: b.phone,
          website: b.website,
          seoScore: b.analysis?.seoScore ?? null,
          digitalScore: b.analysis?.digitalScore ?? null,
          priority: b.analysis?.priority ?? null,
          analysisStatus: b.analysis?.status ?? null,
          contactEmails: b.analysis?.contactEmails ?? [],
        })),
        pagination: { page, limit, total },
      };
    },
  );

  // ─── GET /api/v1/businesses/:id — Detail with analysis ─
  app.get<{ Params: { id: string } }>(
    "/api/v1/businesses/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid business ID" });
      }
      const { id } = paramsParsed.data;

      const business = await app.prisma.business.findUnique({
        where: { id },
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

      return {
        id: business.id,
        name: business.name,
        siret: business.siret,
        siren: business.siren,
        entityType: business.entityType,
        apeCode: business.apeCode,
        legalForm: business.legalForm,
        legalFormCode: business.legalFormCode,
        employeesRange: business.employeesRange,
        address: business.address,
        city: business.city,
        postalCode: business.postalCode,
        phone: business.phone,
        website: business.website,
        isHeadquarters: business.isHeadquarters,
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
              performance: {
                performanceScore: a.performanceScore,
                lcpMs: a.lcpMs,
                clsScore: a.clsScore,
                ttfbMs: a.ttfbMs,
                fcpMs: a.fcpMs,
              },
              content: {
                totalImages: a.totalImages,
                imagesWithAlt: a.imagesWithAlt,
                h1Count: a.h1Count,
                h2Count: a.h2Count,
                h3Count: a.h3Count,
                hasProperHeadingHierarchy: a.hasProperHeadingHierarchy,
                internalLinkCount: a.internalLinkCount,
                externalLinkCount: a.externalLinkCount,
                wordCount: a.wordCount,
                textRatio: a.textRatio,
                brokenLinksCount: a.brokenLinksCount,
                checkedLinksCount: a.checkedLinksCount,
              },
              platform: {
                detectedPlatform: a.detectedPlatform,
                isFreeHosting: a.isFreeHosting,
              },
              security: {
                hasHsts: a.hasHsts,
                hasCsp: a.hasCsp,
                hasXFrameOptions: a.hasXFrameOptions,
                hasXContentTypeOptions: a.hasXContentTypeOptions,
              },
              social: {
                hasOgTags: a.hasOgTags,
                hasTwitterCard: a.hasTwitterCard,
                hasOgImage: a.hasOgImage,
                structuredDataTypes: a.structuredDataTypes,
                jsonLdInvalidCount: a.jsonLdInvalidCount,
              },
              scores: {
                seoScore: a.seoScore,
                digitalScore: a.digitalScore,
                priority: a.priority,
              },
              contactEmails: a.contactEmails,
              analyzedAt: a.analyzedAt,
              aiRecommendations: a.aiRecommendations,
              aiRecommendationsAt: a.aiRecommendationsAt,
            }
          : null,
        aiEnabled: isAiEnabled(),
      };
    },
  );

  // ─── POST /api/v1/businesses/:id/ai-recommendations ────
  // Génération à la demande, stockée sur Analysis (une fois, réutilisée
  // par l'UI et le PDF). body.force = true pour régénérer.
  app.post<{ Params: { id: string }; Body: { force?: boolean } }>(
    "/api/v1/businesses/:id/ai-recommendations",
    { preHandler: app.authenticate, config: { rateLimit: destructiveRateLimit } },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid business ID" });
      }
      const { id } = paramsParsed.data;

      if (!isAiEnabled()) {
        return reply.status(503).send({
          error:
            "Recommandations IA non disponibles : ANTHROPIC_API_KEY n'est pas configurée sur cette instance.",
        });
      }

      const business = await app.prisma.business.findUnique({
        where: { id },
        include: {
          analysis: true,
          scanBusinesses: {
            include: { scan: { select: { organizationId: true } } },
          },
        },
      });

      const orgMatch = business?.scanBusinesses.some(
        (sb) => sb.scan.organizationId === request.user.organizationId,
      );
      if (!business || !orgMatch) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const analysis = business.analysis;
      if (
        !analysis ||
        (analysis.status !== "COMPLETED" && analysis.status !== "NO_WEBSITE")
      ) {
        return reply.status(409).send({
          error:
            "L'analyse doit être terminée avant de générer les recommandations.",
        });
      }

      // Déjà générées et pas de force → renvoyer le cache
      if (analysis.aiRecommendations && !request.body?.force) {
        return reply.send({
          recommendations: analysis.aiRecommendations,
          generatedAt: analysis.aiRecommendationsAt,
          cached: true,
        });
      }

      // Contexte d'analyse compact et explicite (tokens bornés)
      const analysisData = {
        status: analysis.status,
        scores: {
          digitalScore: analysis.digitalScore,
          seoScore: analysis.seoScore,
          priority: analysis.priority,
          performanceScore: analysis.performanceScore,
        },
        technique: {
          isHttps: analysis.isHttps,
          httpStatusCode: analysis.httpStatusCode,
          responseTimeMs: analysis.responseTimeMs,
          hasRobotsTxt: analysis.hasRobotsTxt,
          hasSitemapXml: analysis.hasSitemapXml,
        },
        seoOnPage: {
          title: analysis.title,
          metaDescription: analysis.metaDescription,
          h1: analysis.h1,
          hasCanonical: analysis.hasCanonical,
          hasFavicon: analysis.hasFavicon,
        },
        mobile: { hasViewport: analysis.hasViewport },
        seoLocal: {
          cityInTitle: analysis.cityInTitle,
          cityInH1: analysis.cityInH1,
          cityInDescription: analysis.cityInDescription,
          hasSchemaLocalBusiness: analysis.hasSchemaLocalBusiness,
          hasGoogleMapsEmbed: analysis.hasGoogleMapsEmbed,
        },
        contenu: {
          totalImages: analysis.totalImages,
          imagesWithAlt: analysis.imagesWithAlt,
          h1Count: analysis.h1Count,
          hasProperHeadingHierarchy: analysis.hasProperHeadingHierarchy,
          internalLinkCount: analysis.internalLinkCount,
          externalLinkCount: analysis.externalLinkCount,
          nombreDeMots: analysis.wordCount,
          liensCasses:
            analysis.brokenLinksCount != null
              ? `${analysis.brokenLinksCount} sur ${analysis.checkedLinksCount} testés`
              : null,
        },
        plateforme: {
          cmsDetecte: analysis.detectedPlatform,
          hebergementGratuitOuPagePlateforme: analysis.isFreeHosting,
        },
        securite: {
          hasHsts: analysis.hasHsts,
          hasCsp: analysis.hasCsp,
        },
        social: {
          hasOgTags: analysis.hasOgTags,
          hasTwitterCard: analysis.hasTwitterCard,
          imageDePartageOgImage: analysis.hasOgImage,
          structuredDataTypes: analysis.structuredDataTypes,
          blocsJsonLdInvalides: analysis.jsonLdInvalidCount,
        },
        performance: {
          lcpMs: analysis.lcpMs,
          ttfbMs: analysis.ttfbMs,
        },
        emailsTrouves: analysis.contactEmails,
      };

      try {
        const service = new AiRecommendationsService();
        const recommendations = await service.generate(
          {
            name: business.name,
            apeCode: business.apeCode,
            city: business.city,
            postalCode: business.postalCode,
            website: business.website,
            phone: business.phone,
          },
          analysisData,
        );

        const generatedAt = new Date();
        await app.prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            aiRecommendations: recommendations,
            aiRecommendationsAt: generatedAt,
          },
        });

        return reply.send({ recommendations, generatedAt, cached: false });
      } catch (err) {
        request.log.error({ err, businessId: id }, "AI recommendations failed");
        return reply.status(502).send({
          error:
            "La génération des recommandations a échoué — réessayez dans un instant.",
        });
      }
    },
  );

  // ─── POST /api/v1/businesses/:id/reanalyze ─────────────
  app.post<{ Params: { id: string } }>(
    "/api/v1/businesses/:id/reanalyze",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const paramsParsed = UuidParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid business ID" });
      }
      const { id } = paramsParsed.data;

      const business = await app.prisma.business.findUnique({
        where: { id },
        include: {
          scanBusinesses: {
            include: {
              scan: { select: { organizationId: true } },
            },
          },
        },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const orgMatch = business.scanBusinesses.some(
        (sb) => sb.scan.organizationId === request.user.organizationId,
      );
      if (!orgMatch) {
        return reply.status(404).send({ error: "Business not found" });
      }

      // Une re-analyse consomme 1 crédit d'analyse (rendu si elle échoue)
      const quotaService = new QuotaService(app.prisma);
      if (business.website) {
        const granted = await quotaService.reserveAnalyses(
          request.user.organizationId,
          1,
        );
        if (granted === 0) {
          return reply.status(403).send({
            error:
              "Quota d'analyses mensuel dépassé. Passez à un plan supérieur pour plus d'analyses.",
          });
        }
      }

      // Set status to PENDING but keep old data visible until new analysis completes
      await app.prisma.analysis.upsert({
        where: { businessId: id },
        create: { businessId: id, status: "PENDING" },
        update: {
          status: "PENDING",
          errorMessage: null,
        },
      });

      if (business.website) {
        // Fire-and-forget : même pipeline que le worker (une seule implémentation)
        const log = request.log;
        const prisma = app.prisma;
        const organizationId = request.user.organizationId;

        (async () => {
          await analyzeSingleBusiness(
            id,
            business.website!,
            business.city,
            prisma,
            new SeoAnalyzerService(log),
            new PageSpeedService(log),
            log,
          );
          const final = await prisma.analysis.findUnique({
            where: { businessId: id },
            select: { status: true },
          });
          if (final?.status === "FAILED") {
            await quotaService.releaseAnalyses(organizationId, 1);
          }
        })().catch((err) =>
          log.error({ err, businessId: id }, "Re-analysis failed"),
        );
      } else {
        const analysis = await app.prisma.analysis.update({
          where: { businessId: id },
          data: { status: "NO_WEBSITE", seoScore: 0, analyzedAt: new Date() },
        });
        const scores = scoreAnalysis(analysis, business);
        await app.prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            digitalScore: scores.digitalScore,
            priority: scores.priority,
          },
        });
      }

      return reply.status(202).send({
        message: "Analysis queued",
        businessId: id,
        status: "PENDING",
      });
    },
  );
}
