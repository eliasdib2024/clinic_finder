// prisma.js – one shared Prisma client for the whole app (PostgreSQL through the pg driver adapter)
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { config } from './env.js';

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });
