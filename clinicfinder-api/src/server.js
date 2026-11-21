// server.js – the only file that listens on a port
import { app } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './loggers/logger.js';

const server = app.listen(config.port, () => {
  logger.info(`ClinicFinder API (${config.nodeEnv}) listening on http://localhost:${config.port}`);
});

// Stop cleanly (Ctrl+C locally, or AWS replacing the instance): finish requests, close the database pool
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'unhandled promise rejection');
  process.exit(1);
});
