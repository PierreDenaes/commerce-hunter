import { buildApp } from "./app.js";
import { startQueueWorkers, stopQueue } from "./queue/index.js";

const PORT = Number(process.env.PORT_API) || 3001;
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    await startQueueWorkers(app.prisma, app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Arrêt gracieux : les jobs en cours ont 15 s pour se terminer, au-delà
  // ils seront re-livrés par pg-boss après expiration (aucun scan perdu).
  let shuttingDown = false;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      app.log.info({ signal }, "Shutting down gracefully");
      try {
        await stopQueue(app.log);
        await app.close();
        process.exit(0);
      } catch (err) {
        app.log.error({ err }, "Graceful shutdown failed");
        process.exit(1);
      }
    });
  }
}

start();
