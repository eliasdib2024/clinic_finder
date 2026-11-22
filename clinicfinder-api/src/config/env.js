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

  // Address of the frontend, used for links inside emails
  APP_URL: z.url('must be a full URL, e.g. http://localhost:5173').default('http://localhost:5173'),

  // Email (password reset codes, security notices)
  //   console = print emails in the API terminal (development only, nothing is sent)
  //   smtp    = send through an SMTP server: Amazon SES, SendGrid, Mailgun, Gmail…
  MAIL_TRANSPORT: z.enum(['console', 'smtp']).default('console'),
  // Optional. With Gmail leave it empty: Gmail only sends "from" the account you sign in with
  // (SMTP_USER), and a different address is rewritten or sent to spam.
  MAIL_FROM: z.string().trim().optional(),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.stringbool().default(false),   // true for port 465, false for 587 (STARTTLS)
  SMTP_USER: z.string().trim().optional(),
  // Google shows app passwords as "abcd efgh ijkl mnop": the spaces are removed here
  SMTP_PASS: z.string().transform((s) => s.replace(/\s+/g, '')).optional(),
}).superRefine((env, ctx) => {
  if (env.MAIL_TRANSPORT === 'smtp') {
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'required when MAIL_TRANSPORT=smtp' });
    }
  }
  if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT === 'console') {
    ctx.addIssue({ code: 'custom', path: ['MAIL_TRANSPORT'], message: 'must be smtp in production (console only prints emails)' });
  }
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
  appUrl: env.APP_URL.replace(/\/$/, ''),
  mail: {
    transport: env.MAIL_TRANSPORT,
    from: env.MAIL_FROM
      || (env.MAIL_TRANSPORT === 'smtp' ? `ClinicFinder <${env.SMTP_USER}>` : 'ClinicFinder <no-reply@clinicfinder.lb>'),
    smtp: { host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, user: env.SMTP_USER, pass: env.SMTP_PASS },
  },
  // Password reset rules (kept here so they are easy to find and the same everywhere)
  passwordReset: {
    codeTtlMinutes: 10,        // the emailed code expires after 10 minutes
    maxAttempts: 5,            // wrong codes allowed before a new code is needed
    resendCooldownSeconds: 60, // minimum gap between two codes for the same account
    sessionTtlMinutes: 10,     // time to choose the new password once the code is verified
  },
});
