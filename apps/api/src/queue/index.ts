import { PgBoss, type SendOptions, type Job } from "pg-boss";
import type { PrismaClient } from "@commercehunter/db";
import type { FastifyBaseLogger } from "fastify";
import { processScan } from "../workers/scan.worker.js";
import { processAnalyses } from "../workers/analysis.worker.js";

export const SCAN_QUEUE = "scan-process";
export const ANALYSIS_QUEUE = "scan-analyses";

// Un job tué par un redeploy est re-livré après expiration : 90 min borne
// la durée d'un scan ET le délai de reprise après un arrêt brutal.
// Les workers étant idempotents (upserts + skip des analyses récentes),
// un retry ne duplique ni données ni quota.
const JOB_OPTIONS: SendOptions = {
  retryLimit: 2,
  retryDelay: 60,
  expireInSeconds: 90 * 60,
};

interface ScanJobData {
  scanId: string;
}

interface AnalysisJobData {
  scanId: string;
  // Sous-ensemble à traiter (lot). Absent = toutes les entreprises du scan
  // (compatibilité avec les jobs déjà en file avant le découpage en lots).
  businessIds?: string[];
}

// Taille de lot : 50 analyses × ~1-2 min / 5 concurrentes ≈ 10-20 min par job,
// très en dessous de l'expiration de 90 min. Un gros scan avance lot par lot
// et un retry ne rejoue qu'un lot (les analyses fraîches sont sautées).
const ANALYSIS_CHUNK_SIZE = 50;

let boss: PgBoss | null = null;
let bossStarting: Promise<PgBoss> | null = null;

async function getBoss(log: FastifyBaseLogger): Promise<PgBoss> {
  if (boss) return boss;
  if (!bossStarting) {
    bossStarting = (async () => {
      const instance = new PgBoss({
        connectionString: process.env.DATABASE_URL,
        schema: "pgboss",
      });
      instance.on("error", (err: Error) => log.error({ err }, "pg-boss error"));
      await instance.start();
      await instance.createQueue(SCAN_QUEUE);
      await instance.createQueue(ANALYSIS_QUEUE);
      boss = instance;
      return instance;
    })();
  }
  return bossStarting;
}

export async function enqueueScan(
  scanId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const b = await getBoss(log);
  await b.send(SCAN_QUEUE, { scanId } satisfies ScanJobData, JOB_OPTIONS);
}

/** Enfile les analyses d'une liste d'entreprises, découpées en lots. */
export async function enqueueAnalyses(
  scanId: string,
  log: FastifyBaseLogger,
  businessIds: string[],
): Promise<void> {
  const b = await getBoss(log);
  for (let i = 0; i < businessIds.length; i += ANALYSIS_CHUNK_SIZE) {
    const chunk = businessIds.slice(i, i + ANALYSIS_CHUNK_SIZE);
    await b.send(
      ANALYSIS_QUEUE,
      { scanId, businessIds: chunk } satisfies AnalysisJobData,
      JOB_OPTIONS,
    );
  }
  log.info(
    { scanId, total: businessIds.length, chunks: Math.ceil(businessIds.length / ANALYSIS_CHUNK_SIZE) },
    "Analysis jobs enqueued",
  );
}

/** Enfile les analyses de TOUTES les entreprises d'un scan (par lots). */
export async function enqueueAnalysesForScan(
  scanId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<void> {
  const scanBusinesses = await prisma.scanBusiness.findMany({
    where: { scanId },
    select: { businessId: true },
  });
  await enqueueAnalyses(scanId, log, scanBusinesses.map((sb) => sb.businessId));
}

/**
 * Démarre les workers de queue + balaye les scans orphelins.
 * Appelé une fois au boot du serveur (pas dans buildApp, pour que les tests
 * n'ouvrent pas de connexion DB).
 */
export async function startQueueWorkers(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<void> {
  const b = await getBoss(log);

  await b.work<ScanJobData>(SCAN_QUEUE, async (jobs: Job<ScanJobData>[]) => {
    for (const job of jobs) {
      log.info({ scanId: job.data.scanId, jobId: job.id }, "Scan job started");
      await processScan(job.data.scanId, prisma, log);
      // Les analyses sont des jobs séparés, découpés en lots : un échec ou
      // une interruption ne rejoue qu'un lot, sans refaire la collecte.
      await enqueueAnalysesForScan(job.data.scanId, prisma, log);
    }
  });

  await b.work<AnalysisJobData>(ANALYSIS_QUEUE, async (jobs: Job<AnalysisJobData>[]) => {
    for (const job of jobs) {
      log.info(
        { scanId: job.data.scanId, jobId: job.id, batch: job.data.businessIds?.length ?? "all" },
        "Analysis job started",
      );
      await processAnalyses(job.data.scanId, prisma, log, job.data.businessIds);
    }
  });

  // Balayage des orphelins : scans RUNNING dont le job est mort au-delà de
  // toute retentative (redeploys pré-queue, retries épuisés). Fenêtre large
  // pour ne pas tuer un scan long légitimement actif.
  const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const swept = await prisma.scan.updateMany({
    where: { status: "RUNNING", startedAt: { lt: staleCutoff } },
    data: {
      status: "FAILED",
      errorMessage: "Scan interrompu par un redémarrage du serveur — relancez-le.",
    },
  });
  if (swept.count > 0) {
    log.warn({ count: swept.count }, "Marked stale RUNNING scans as FAILED");
  }

  log.info("pg-boss queue workers started");
}

/** Arrêt gracieux : attend la fin des jobs en cours (borné), puis ferme. */
export async function stopQueue(log: FastifyBaseLogger): Promise<void> {
  if (!boss) return;
  try {
    await boss.stop({ graceful: true, timeout: 15_000, close: true });
  } catch (err) {
    log.error({ err }, "pg-boss stop failed");
  }
  boss = null;
  bossStarting = null;
}
