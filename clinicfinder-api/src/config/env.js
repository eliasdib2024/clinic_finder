// env.js – the ONLY file that reads process.env. Every value is checked at start-up,
// so a missing or wrong variable stops the server with a clear message instead of failing later.
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().startsWith('postgresql://', 'must start with postgresql://'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Password hashing: bcrypt cost + a secret "pepper" mixed into every password before hashing.
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  PASSWORD_PEPPER: z.string().min(32, 'must be at least 32 characters'),

  // Sign-in tokens (JWT)
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REMEMBER_EXPIRES_IN: z.string().default('30d'),

  // First administrator, created by the seed script (npm run db:seed)
  ADMIN_NAME: z.string().default('ClinicFinder Admin'),
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_PHONE: z.string().default('+9611000000'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\nInvalid environment variables (check your .env file):\n${lines}\n`);
  process.exit(1);
}

const env = parsed.data;

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  corsOrigins: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  password: { rounds: env.BCRYPT_ROUNDS, pepper: env.PASSWORD_PEPPER },
  jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN, rememberExpiresIn: env.JWT_REMEMBER_EXPIRES_IN },
  admin: { name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, phone: env.ADMIN_PHONE },
});
