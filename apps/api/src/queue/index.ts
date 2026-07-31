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

export async function enqueueAnalyses(
  scanId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const b = await getBoss(log);
  await b.send(ANALYSIS_QUEUE, { scanId } satisfies ScanJobData, JOB_OPTIONS);
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
      // L'analyse est un job séparé : si elle échoue/est interrompue,
      // elle est retentée sans refaire la collecte SIRENE/Places.
      await enqueueAnalyses(job.data.scanId, log);
    }
  });

  await b.work<ScanJobData>(ANALYSIS_QUEUE, async (jobs: Job<ScanJobData>[]) => {
    for (const job of jobs) {
      log.info({ scanId: job.data.scanId, jobId: job.id }, "Analysis job started");
      await processAnalyses(job.data.scanId, prisma, log);
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
