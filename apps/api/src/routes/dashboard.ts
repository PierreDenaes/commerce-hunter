import type { FastifyInstance } from "fastify";
import { APE_LABELS, DashboardQuerySchema } from "@commercehunter/shared";

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { scanId?: string } }>(
    "/api/v1/dashboard/stats",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = DashboardQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const orgId = request.user.organizationId;
      const { scanId } = parsed.data;

      // Build parameterized query — $1 = orgId, $2 = scanId (optional)
      const hasScanFilter = !!scanId;
      const scanClause = hasScanFilter ? "AND sb.scan_id = $2::uuid" : "";
      const params: string[] = hasScanFilter ? [orgId, scanId] : [orgId];

      const [stats] = await app.prisma.$queryRawUnsafe<
        Array<{
          total_entities: bigint;
          commerce_count: bigint;
          pme_count: bigint;
          without_website: bigint;
          avg_digital_score: number | null;
          high_count: bigint;
          medium_count: bigint;
          low_count: bigint;
        }>
      >(
        `SELECT
          COUNT(DISTINCT b.id) AS total_entities,
          COUNT(DISTINCT b.id) FILTER (WHERE b.entity_type = 'COMMERCE') AS commerce_count,
          COUNT(DISTINCT b.id) FILTER (WHERE b.entity_type = 'PME') AS pme_count,
          COUNT(DISTINCT b.id) FILTER (WHERE b.website IS NULL OR b.website = '') AS without_website,
          ROUND(AVG(a.digital_score)::numeric, 1) AS avg_digital_score,
          COUNT(DISTINCT b.id) FILTER (WHERE a.priority = 'HIGH') AS high_count,
          COUNT(DISTINCT b.id) FILTER (WHERE a.priority = 'MEDIUM') AS medium_count,
          COUNT(DISTINCT b.id) FILTER (WHERE a.priority = 'LOW') AS low_count
        FROM businesses b
        JOIN scan_businesses sb ON sb.business_id = b.id
        JOIN scans s ON s.id = sb.scan_id
        LEFT JOIN analyses a ON a.business_id = b.id
        WHERE s.organization_id = $1::uuid ${scanClause}`,
        ...params,
      );

      const totalEntities = Number(stats.total_entities);
      const withoutWebsite = Number(stats.without_website);

      // Top sectors query — group by APE 2-digit prefix
      const topSectors = await app.prisma.$queryRawUnsafe<
        Array<{ ape_prefix: string; count: bigint }>
      >(
        `SELECT
          LEFT(b.ape_code, 2) AS ape_prefix,
          COUNT(DISTINCT b.id) AS count
        FROM businesses b
        JOIN scan_businesses sb ON sb.business_id = b.id
        JOIN scans s ON s.id = sb.scan_id
        WHERE s.organization_id = $1::uuid ${scanClause}
        GROUP BY LEFT(b.ape_code, 2)
        ORDER BY count DESC
        LIMIT 5`,
        ...params,
      );

      return {
        totalEntities,
        commerceCount: Number(stats.commerce_count),
        pmeCount: Number(stats.pme_count),
        withoutWebsite,
        withoutWebsitePercent:
          totalEntities > 0
            ? Math.round((withoutWebsite / totalEntities) * 1000) / 10
            : 0,
        averageDigitalScore: Number(stats.avg_digital_score ?? 0),
        highPriorityCount: Number(stats.high_count),
        mediumPriorityCount: Number(stats.medium_count),
        lowPriorityCount: Number(stats.low_count),
        topSectors: topSectors.map((s) => ({
          apeCode: s.ape_prefix,
          label: APE_LABELS[s.ape_prefix] ?? s.ape_prefix,
          count: Number(s.count),
        })),
      };
    },
  );
}
