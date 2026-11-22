// app.js – assembles the application (exported so tests can import it without opening a port)
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';
import { httpLogger } from './loggers/http-logger.js';
import { requestId } from './middleware/request-id.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.set('trust proxy', 1);                 // behind the AWS load balancer: real client IP for rate limiting
app.use(helmet());                         // security headers
app.use(cors({ origin: config.corsOrigins, exposedHeaders: ['X-Request-Id', 'Location'] }));
app.use(requestId);
app.use(httpLogger);
app.use(express.json({ limit: '100kb' }));
app.get('/', (req, res) => {
  res.json({ name: 'ClinicFinder API', version: 'v1', health: '/health', docs: '/api/v1' });
});
// Health check for the load balancer: is the API up and can it reach the database?
app.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
