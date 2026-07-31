import type { PrismaClient } from "@commercehunter/db";
import type { FastifyBaseLogger } from "fastify";
import { CreateScanSchema } from "@commercehunter/shared";
import { enqueueScan } from "../queue/index.js";
import { QuotaService } from "./quota.service.js";

// ─── Types ────────────────────────────────────────────────

interface CreateScanParams {
  userId: string;
  organizationId: string;
  body: unknown;
}

interface ListScansParams {
  organizationId: string;
  page: number;
  limit: number;
  status?: string;
}

// ─── Service ──────────────────────────────────────────────

class QuotaExceededError extends Error {}

export class ScanService {
  constructor(
    private prisma: PrismaClient,
    private log: FastifyBaseLogger,
  ) {}

  async createScan(params: CreateScanParams) {
    const parsed = CreateScanSchema.safeParse(params.body);
    if (!parsed.success) {
      return { error: parsed.error.flatten(), status: 400 };
    }

    const { name, postalCode, radiusKm, entityType, minEmployees, apeCategories } =
      parsed.data;

    // Pré-check informatif du quota d'analyses (l'application stricte se fait
    // par réservation atomique dans le worker)
    const quotaService = new QuotaService(this.prisma);
    const analysisCheck = await quotaService.checkAnalysisQuota(params.organizationId, 1);
    if (!analysisCheck.allowed) {
      return { error: analysisCheck.error, status: 403 };
    }

    // Check ville + création dans une transaction sérialisable : deux créations
    // concurrentes ne peuvent pas dépasser cityLimit (l'une des deux échoue en P2034)
    let scan;
    try {
      scan = await this.prisma.$transaction(
        async (tx) => {
          const txQuota = new QuotaService(tx as PrismaClient);
          const cityCheck = await txQuota.checkCityLimit(params.organizationId, postalCode);
          if (!cityCheck.allowed) {
            throw new QuotaExceededError(cityCheck.error);
          }
          return tx.scan.create({
            data: {
              organizationId: params.organizationId,
              createdById: params.userId,
              name,
              postalCode,
              radiusKm: radiusKm ?? null,
              entityType,
              minEmployees: minEmployees ?? null,
              apeCategories,
              status: "PENDING",
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return { error: err.message, status: 403 };
      }
      if ((err as { code?: string }).code === "P2034") {
        return { error: "Conflit de création concurrent — réessayez.", status: 409 };
      }
      throw err;
    }

    // Job durable : survit aux redeploys, retenté automatiquement
    try {
      await enqueueScan(scan.id, this.log);
    } catch (err) {
      this.log.error({ err, scanId: scan.id }, "Failed to enqueue scan");
      await this.prisma.scan.update({
        where: { id: scan.id },
        data: { status: "FAILED", errorMessage: "Impossible de démarrer le scan — réessayez." },
      });
      return { error: "Impossible de démarrer le scan — réessayez.", status: 500 };
    }

    return { data: this.formatScan(scan), status: 201 };
  }

  async listScans(params: ListScansParams) {
    const { organizationId, page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    const [scans, total] = await Promise.all([
      this.prisma.scan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.scan.count({ where }),
    ]);

    return {
      data: scans.map(this.formatScan),
      pagination: { page, limit, total },
    };
  }

  async getScan(scanId: string, organizationId: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
    });

    if (!scan || scan.organizationId !== organizationId) {
      return { error: "Scan not found", status: 404 };
    }

    // Single aggregation query — no N+1
    const [stats] = await this.prisma.$queryRawUnsafe<
      Array<{
        commerce_count: bigint;
        pme_count: bigint;
        with_website: bigint;
        without_website: bigint;
        avg_digital_score: number | null;
        high_priority_count: bigint;
        found_count: bigint;
        analyzed_count: bigint;
        websites_analyzed_count: bigint;
      }>
    >(
      `SELECT
        COUNT(DISTINCT b.id) FILTER (WHERE b.entity_type = 'COMMERCE') AS commerce_count,
        COUNT(DISTINCT b.id) FILTER (WHERE b.entity_type = 'PME') AS pme_count,
        COUNT(DISTINCT b.id) FILTER (WHERE b.website IS NOT NULL AND b.website != '') AS with_website,
        COUNT(DISTINCT b.id) FILTER (WHERE b.website IS NULL OR b.website = '') AS without_website,
        ROUND(AVG(a.digital_score)::numeric, 1) AS avg_digital_score,
        COUNT(DISTINCT b.id) FILTER (WHERE a.priority = 'HIGH') AS high_priority_count,
        COUNT(DISTINCT b.id) AS found_count,
        COUNT(DISTINCT b.id) FILTER (WHERE a.status IN ('COMPLETED', 'FAILED', 'NO_WEBSITE')) AS analyzed_count,
        COUNT(DISTINCT b.id) FILTER (WHERE b.website IS NOT NULL AND b.website != '' AND a.status IN ('COMPLETED', 'FAILED')) AS websites_analyzed_count
      FROM scan_businesses sb
      JOIN businesses b ON b.id = sb.business_id
      LEFT JOIN analyses a ON a.business_id = b.id
      WHERE sb.scan_id = $1::uuid`,
      scanId,
    );

    return {
      data: {
        ...this.formatScan(scan),
        stats: {
          commerceCount: Number(stats.commerce_count),
          pmeCount: Number(stats.pme_count),
          withWebsite: Number(stats.with_website),
          withoutWebsite: Number(stats.without_website),
          averageDigitalScore: Number(stats.avg_digital_score ?? 0),
          highPriorityCount: Number(stats.high_priority_count),
          foundBusinesses: Number(stats.found_count),
          analyzedCount: Number(stats.analyzed_count),
          websitesAnalyzedCount: Number(stats.websites_analyzed_count),
        },
      },
      status: 200,
    };
  }

  private formatScan(scan: {
    id: string;
    name: string;
    postalCode: string;
    radiusKm: number | null;
    entityType: string;
    minEmployees: number | null;
    apeCategories: string[];
    status: string;
    totalBusinesses: number;
    createdAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: scan.id,
      name: scan.name,
      postalCode: scan.postalCode,
      radiusKm: scan.radiusKm,
      entityType: scan.entityType,
      minEmployees: scan.minEmployees,
      apeCategories: scan.apeCategories,
      status: scan.status,
      totalBusinesses: scan.totalBusinesses,
      createdAt: scan.createdAt.toISOString(),
      completedAt: scan.completedAt?.toISOString() ?? null,
    };
  }
}
