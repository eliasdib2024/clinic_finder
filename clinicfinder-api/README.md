# ClinicFinder API

REST API for **ClinicFinder**, a web application that helps patients in Lebanon find doctors and clinics by specialty, location, fees, languages, insurance and availability, book appointments, and receive digital prescriptions.

This folder holds the **backend** only. The React frontend lives in its own folder (`clinicfinder-web`).

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 22.18 (ES modules) |
| Web framework | Express *(next stage)* |
| ORM | Prisma ORM 7 with the `@prisma/adapter-pg` driver adapter |
| Database | PostgreSQL 16+ |
| Validation | Zod *(next stage)* |
| Logging | Pino *(next stage)* |
| Deployment | AWS Elastic Beanstalk (API) + AWS RDS (PostgreSQL) |

---

## Prerequisites

- **Node.js 22.18 or newer.** Prisma 7 generates its client as TypeScript, and Node 22.18+ can import it directly. Check with `node -v`.
- **PostgreSQL 16 or newer**, running locally, plus `psql` or pgAdmin.
- **npm** (bundled with Node.js).

---

## Getting started

### 1. Create the database

Open `psql` as the `postgres` user and run:

```sql
CREATE USER clinicfinder_user WITH PASSWORD 'change_me';
ALTER USER clinicfinder_user CREATEDB;   -- prisma migrate dev needs to create a temporary "shadow" database
CREATE DATABASE clinicfinder OWNER clinicfinder_user;
ALTER DATABASE clinicfinder SET timezone TO 'UTC';
```

### 2. Install dependencies

```bash
npm install
```

The `postinstall` script runs `prisma generate` automatically, which builds the Prisma client into `src/generated/prisma`.

### 3. Configure environment variables

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

Then edit `.env`:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | `development`, `production` or `test` | `development` |
| `PORT` | Port the API listens on | `3000` |
| `LOG_LEVEL` | `error`, `warn`, `info` or `debug` | `info` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://clinicfinder_user:change_me@localhost:5432/clinicfinder?schema=public` |

> URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`).
> **Never commit `.env`.** Only `.env.example` belongs in Git.

### 4. Create the tables

```bash
npm run db:migrate
```

This applies every migration in `prisma/migrations`:

- `..._init` creates the 28 tables, enums, indexes and foreign keys.
- `..._check_constraints` adds the business rules Prisma cannot express in the schema, such as slot length 15–60 minutes, rating 0–5, and a follow-up date after the prescription date.

### 5. Check the connection

```bash
npm run db:test
```

Expected output:

```
Connected to PostgreSQL — server time 2026-11-20 17:42:06.89+00 (UTC)
users: 0
```

---

## npm scripts

| Script | What it does |
|---|---|
| `npm run db:validate` | Checks `prisma/schema.prisma` for errors |
| `npm run db:migrate` | Development only: applies pending migrations, or creates a new one after a schema change (`npm run db:migrate -- --name <change_name>`) |
| `npm run db:generate` | Rebuilds the Prisma client after editing the schema |
| `npm run db:deploy` | Production: applies existing migrations and never creates new ones |
| `npm run db:studio` | Opens Prisma Studio, a browser UI to view and edit the data |
| `npm run db:test` | Checks that the database connection works |

---

## Project structure

```
clinicfinder-api/
├── prisma/
│   ├── schema.prisma            # data model (from the final class diagram)
│   ├── check_constraints.sql    # source of the CHECK-constraints migration
│   └── migrations/              # SQL migrations (committed to Git)
├── scripts/
│   └── test-db.js               # database connection check
├── src/
│   ├── config/
│   │   └── prisma.js            # shared Prisma client (with the pg adapter)
│   └── generated/prisma/        # generated Prisma client (not in Git)
├── prisma.config.ts             # Prisma CLI config (schema path, migrations, DATABASE_URL)
├── .env.example
├── .gitignore
└── package.json
```

### Planned layers (next stage)

The API follows a layered architecture. Each layer only calls the layer below it:

```
src/
├── config/        env loading + Zod validation, Prisma client, Pino logger
├── routes/        URL → middlewares → controller        (/api/v1/...)
├── middlewares/   auth (JWT), requireRole, validate(zodSchema), rate limit, request logging
├── validators/    Zod schemas per feature
├── controllers/   read the request, call a service, send the response
├── services/      business rules (availability, cancellations, prescriptions…)
├── repositories/  the only layer that uses Prisma
├── errors/        AppError classes + global error handler
├── utils/         helpers (dates, pagination, responses)
├── app.js         builds the Express app
└── server.js      starts the HTTP server
```

---

## Database conventions

- **Tables** are plural and snake_case: `users`, `doctor_languages`, `appointment_histories`.
- **Columns** are snake_case and follow the class diagram: `user_full_name`, `prescription_follow_up_date`, `reviewed_by_id`.
- **In code**, Prisma models are PascalCase and singular, and fields are camelCase. They map to the database names with `@@map` / `@map`:

  ```js
  const doctors = await prisma.doctor.findMany({
    where: { verificationStatus: "approved", cityId: 3 },
    include: { specialty: true, languages: { include: { language: true } } },
  });
  ```

- **Timestamps** are stored as `timestamptz` and the database runs in **UTC**. The frontend converts them to the user's local time.
- **Deleting records**:
  - Deleting a user removes their patient or doctor profile and their notifications.
  - Appointments and prescriptions are **protected** (`RESTRICT`), so medical records can't be deleted by accident.
  - Lookup rows (cities, specialties, insurances…) can't be deleted while they are still in use.

### Changing the schema

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate -- --name describe_the_change`. This creates and applies a new migration.
3. Commit both the schema and the new folder in `prisma/migrations/`.

Never edit a migration that has already been applied or shared. Create a new one instead.

---

## Deployment (AWS)

- **Database:** AWS RDS for PostgreSQL in a private subnet. Only the API's security group can connect to it.
- **API:** AWS Elastic Beanstalk, Node.js 22 platform.
- **Environment variables:** set them in Elastic Beanstalk → Configuration → Environment properties (or AWS Secrets Manager), not in a file. For RDS, add `sslmode=require`:

  ```
  DATABASE_URL=postgresql://USER:PASSWORD@<rds-endpoint>:5432/clinicfinder?schema=public&sslmode=require
  ```

- **Migrations on deploy:** run `npm run db:deploy` (`prisma migrate deploy`). Never use `migrate dev` in production.
- **Logs:** Pino writes JSON to stdout, and Elastic Beanstalk streams it to CloudWatch Logs.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Environment variable not found: DATABASE_URL` | `.env` is missing or not in the project root. Copy it from `.env.example`. |
| Prisma does not print `Loaded Prisma config from prisma.config.ts` | The config file must be named exactly `prisma.config.ts`, in the project root. |
| `permission denied to create database` during `db:migrate` | Run `ALTER USER clinicfinder_user CREATEDB;` (needed for the shadow database). |
| `Can't reach database server at localhost:5432` | PostgreSQL isn't running, or the host, port or password in `DATABASE_URL` is wrong. |
| `Cannot find module '../generated/prisma/client.ts'` | Run `npm run db:generate`. |
| `SyntaxError` when importing `client.ts` | Upgrade Node.js to 22.18 or newer. |
| Raw query times are off by 2 hours | Run `ALTER DATABASE clinicfinder SET timezone TO 'UTC';` and reconnect. |

---

## Related

- Frontend: `../clinicfinder-web` (React + Vite)
- Data model: `ClinicFinder-ClassDiagram-FINAL.drawio` (class diagram + system architecture)