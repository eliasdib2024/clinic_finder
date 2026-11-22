import { prisma } from "../src/config/prisma.js";

const [{ server_time, timezone }] = await prisma.$queryRaw`
  SELECT now()::text AS server_time, current_setting('TimeZone') AS timezone`;
console.log(`Connected to PostgreSQL — server time ${server_time} (${timezone})`);
console.log("users:", await prisma.user.count());
await prisma.$disconnect();