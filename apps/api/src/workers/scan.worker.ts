import type { PrismaClient } from "@commercehunter/db";
import type { FastifyBaseLogger } from "fastify";
import { classifyByApe } from "@commercehunter/shared";
import { SireneService } from "../services/sirene.service.js";
import { GooglePlacesService } from "../services/google-places.service.js";

const MAX_GOOGLE_ENRICHMENTS = 200; // Cap Google Places API calls per scan

export async function processScan(
  scanId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<void> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    log.error({ scanId }, "Scan not found");
    return;
  }

  // Mark as RUNNING
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // ─── Step 1: SIRENE Search ─────────────────────────────
    const sirene = new SireneService(log);

    // Build APE categories: if entityType is BOTH and no explicit ape categories,
    // we don't filter by APE. Otherwise use the provided categories.
    const apeCategories = scan.apeCategories.length > 0 ? scan.apeCategories : [];

    const sireneResults = await sirene.searchEstablishments({
      postalCode: scan.postalCode,
      entityType: scan.entityType,
      apeCategories,
      minEmployees: scan.minEmployees,
    });

    log.info(
      { scanId, count: sireneResults.length },
      "SIRENE search complete",
    );

    // ─── Step 2: Upsert businesses (batched) ───────────────
    const UPSERT_BATCH_SIZE = 50;
    const businessIds: string[] = [];

    // Filter by entity type first
    const filtered = sireneResults.filter((data) => {
      const et = classifyByApe(data.apeCode);
      return scan.entityType === "BOTH" || et === scan.entityType;
    });

    log.info({ scanId, filtered: filtered.length }, "Upserting businesses");

    for (let i = 0; i < filtered.length; i += UPSERT_BATCH_SIZE) {
      const batch = filtered.slice(i, i + UPSERT_BATCH_SIZE);
      const results = await prisma.$transaction(
        batch.map((data) => {
          const entityType = classifyByApe(data.apeCode);
          return prisma.business.upsert({
            where: { siret: data.siret },
            create: {
              siret: data.siret,
              siren: data.siren,
              name: data.name,
              entityType,
              apeCode: data.apeCode,
              legalFormCode: data.legalFormCode,
              employeesRangeCode: data.employeesRangeCode,
              employeesRange: data.employeesRange,
              address: data.address,
              city: data.city,
              postalCode: data.postalCode,
              isHeadquarters: data.isHeadquarters,
              sireneLastUpdated: new Date(),
            },
            update: {
              name: data.name,
              apeCode: data.apeCode,
              legalFormCode: data.legalFormCode,
              employeesRangeCode: data.employeesRangeCode,
              employeesRange: data.employeesRange,
              address: data.address,
              city: data.city,
              postalCode: data.postalCode,
              isHeadquarters: data.isHeadquarters,
              sireneLastUpdated: new Date(),
            },
          });
        }),
      );
      for (const biz of results) businessIds.push(biz.id);
    }

    // ─── Step 3: Create ScanBusiness join records (batched) ─
    for (let i = 0; i < businessIds.length; i += UPSERT_BATCH_SIZE) {
      const batch = businessIds.slice(i, i + UPSERT_BATCH_SIZE);
      await prisma.$transaction(
        batch.map((businessId) =>
          prisma.scanBusiness.upsert({
            where: { scanId_businessId: { scanId, businessId } },
            create: { scanId, businessId },
            update: {},
          }),
        ),
      );
    }

    // ─── Step 4: Google Places enrichment ──────────────────
    const placesService = new GooglePlacesService(prisma, log);

    if (placesService.isEnabled()) {
      // Only enrich businesses without a website
      const toEnrich = await prisma.business.findMany({
        where: {
          id: { in: businessIds },
          website: null,
        },
        select: { id: true, name: true, city: true },
      });

      const enrichList = toEnrich.slice(0, MAX_GOOGLE_ENRICHMENTS);

      log.info(
        { scanId, toEnrichCount: toEnrich.length, capped: enrichList.length },
        "Starting Google Places enrichment",
      );

      for (const biz of enrichList) {
        const enrichment = await placesService.enrichBusiness(
          biz.name,
          biz.city,
          biz.id,
        );

        if (enrichment) {
          await prisma.business.update({
            where: { id: biz.id },
            data: {
              phone: enrichment.phone,
              website: enrichment.website,
              latitude: enrichment.latitude,
              longitude: enrichment.longitude,
              googlePlaceId: enrichment.googlePlaceId,
            },
          });
        }

        // Don't continue if places service got disabled (quota exceeded)
        if (!placesService.isEnabled()) break;
      }
    }

    // ─── Step 5: Mark scan as COMPLETED ────────────────────
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "COMPLETED",
        totalBusinesses: businessIds.length,
        completedAt: new Date(),
      },
    });

    log.info(
      { scanId, totalBusinesses: businessIds.length },
      "Scan completed successfully",
    );
    // L'analyse est enchaînée par le handler de queue (job séparé) —
    // voir src/queue/index.ts
  } catch (err) {
    log.error({ err, scanId }, "Scan processing failed");

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}
