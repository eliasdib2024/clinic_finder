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
| `SUPPORT_EMAIL` | Real support inbox (error messages, reply-to, where support links lead) | `mauriceyaacoub22@gmail.com` |
| `SUPPORT_EMAIL_DISPLAY` | Address shown on clickable support links | `support@clinicfinder.lb` |
| `APP_URL` | Frontend address, used for links in emails | `http://localhost:5173` |
| `MAIL_TRANSPORT` | `console` (print emails in the terminal, development) or `smtp` (send them) | `console` |
| `MAIL_FROM` | Sender shown in the inbox | `ClinicFinder <no-reply@clinicfinder.lb>` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | SMTP server, only for `MAIL_TRANSPORT=smtp` | see `.env.example` |

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
| `npm run mail:test -- you@example.com` | Sends one test email with the `.env` mail settings |

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

## Email verification

Every new patient or doctor gets a 6-digit code by email right after sign-up. The account works straight away; the code confirms the address.

| Step | Endpoint | Auth | Body | Success |
|---|---|---|---|---|
| Confirm the address | `POST /auth/verify-email` | Bearer token | `{ code }` | `200 { message, user }` (`user.emailVerified: true`) |
| Get a new code | `POST /auth/resend-verification` | Bearer token | – | `202 { message, expiresInMinutes, resendAfterSeconds }` |

`user.emailVerified` is in every user object (`/auth/me`, sign-in, sign-up), so the frontend knows when to show the code screen.

**Rules**

- The code is valid for **15 minutes**, **5 attempts**. A new code replaces the old one; codes are at least **60 seconds** apart (`429` with the wait time) and at most 5 per hour per account.
- Only an HMAC of the code is stored (`users.email_verification_code`). The HMAC includes the purpose, so a password reset code never works as a verification code.
- Errors: `422` wrong / expired / too many attempts (message under `errors[0]` for the `code` field), `409` already verified on resend. Verifying an already verified address answers `200`.
- **A completed password reset also verifies the address**: the reset code was read from the same inbox.
- **An admin cannot approve a doctor** whose email is not verified (`409`). Doctor applications show `user.emailVerified`.
- For future routes that need a confirmed address (e.g. booking), add `requireVerifiedEmail` after `authenticate`. It answers `403` with `errors[0].field = "emailVerified"`.

**Database:** `user_email_verified`, `user_email_verified_at`, `email_verification_code`, `email_verification_expiry`, `email_verification_attempts` on `users` (migration `email_verification_code`). Administrators are verified by the seed script.

**Files:** `routes/auth.routes.js` → `controllers/email-verification.controller.js` → `services/email-verification.service.js` → `repositories/users.repository.js`, plus `emails/templates.js` and `middleware/authenticate.js` (`requireVerifiedEmail`).

---

## Change password (Settings)

`PATCH /users/me/password` (Bearer token) with `{ currentPassword, newPassword }` → `200 { message, token }`.

- The current password must be correct (`422` on `currentPassword`), and the new one must follow the sign-up rules and **differ from the current one** (`422` on `newPassword`, checked against the stored hash).
- Saved as `bcrypt(HMAC-SHA256(password, PASSWORD_PEPPER))` in `users.user_password_hash`, in an update that only succeeds if the old hash is still there. A pending "forgot password" code is cancelled.
- **Every other session is signed out.** This device gets the new `token` in the response (same "keep me signed in" lifetime); the frontend stores it in place of the old one.
- Email ("changed from your account settings"), in-app notification and admin activity entry. 10 wrong current passwords per 15 minutes per account.

---

## Forgot password

Three public endpoints under `/api/v1/auth`. The frontend's 3-step "Forgot password" page calls them in order.

| Step | Endpoint | Body | Success |
|---|---|---|---|
| 1. Ask for a code | `POST /auth/forgot-password` | `{ email }` | `202` with the same message for every email |
| 2. Check the code | `POST /auth/verify-reset-code` | `{ email, code }` | `200 { resetToken, expiresInMinutes }` |
| 3. New password | `POST /auth/reset-password` | `{ resetToken, password }` | `200 { message }` |

**How it is protected**

- **No account discovery.** Step 1 gives the same answer, in the same time, for known, unknown, suspended or rate-limited emails (emails are sent in the background). Step 2 uses one message for a wrong, expired, used-up or unknown code.
- **The code.** 6 digits from `crypto.randomInt`, emailed, valid for **10 minutes**, **5 attempts**. Only an HMAC-SHA256 of it (keyed with `PASSWORD_PEPPER`) is stored in `users.reset_code`, and it is compared in constant time. Requesting a new code replaces the old one; a second request within 60 seconds keeps the current code.
- **The reset token.** Returned once the code is correct, valid for 10 minutes, and only able to set a new password. It is signed with a separate key, so it can't be used as a sign-in token (and the reverse), and it is tied to the code, so it works once.
- **The new password.** Same rules as sign-up, must differ from the current one, stored as `bcrypt(HMAC-SHA256(password, PASSWORD_PEPPER))`. The code is cleared in the same database update, so two requests can't both use it.
- **Every session is signed out.** Sign-in tokens carry a fingerprint of the password hash; after the change, all older tokens get `401 Your password was changed`.
- **Rate limits.** Code requests: 10 per 15 min per IP and 5 per hour per email. Wrong codes: 20 per 15 min per IP. New-password attempts: 10 per 15 min per IP.
- **Notices.** A "your password was changed" email, an in-app notification, and an entry in the admin activity log.
- **Logs.** Codes, reset tokens and passwords are redacted. With `MAIL_TRANSPORT=console` (development only, refused in production) the email itself is printed so you can test without a mail account.

**Files:** `routes/auth.routes.js` → `validation/auth.schemas.js` → `controllers/password-reset.controller.js` → `services/password-reset.service.js` → `repositories/users.repository.js`, plus `services/mail.service.js`, `emails/templates.js` (English, French, Arabic), `config/mailer.js`, `utils/one-time-code.js` and `utils/jwt.js`.

**Try it:** the *FORGOT PASSWORD* section of `requests.http`. With `MAIL_TRANSPORT=console`, copy the code from the API terminal.

---

## Profiles (Settings and practice profile)

Every profile form saves to the database. Each one is validated twice: in the frontend before sending,
and again here with Zod (+ checks that every id exists). Errors use the same problem-details format.

| Form | Endpoint | Columns written |
|---|---|---|
| Settings → Profile (all roles) | `PATCH /users/me` | `user_full_name`, `user_email`, `user_phone`, `gender_id` (a new email sets `user_email_verified = false` and sends a code to the new address) |
| Settings → Language / Notifications | `PATCH /users/me` | `user_language`, `notify_*` |
| Patient sign-up step 2 | `PUT /patients/me/health-profile` | `patient_dob`, `city_id`, `blood_id`, `insurance_id`, `patient_insurance_number`, `patient_no_known_allergies`, `patient_allergies` rows, **`patient_onboarding = done`** |
| Settings → Health & insurance | `PATCH /patients/me/health-profile` | the same columns + `patient_emergency_contact` |
| Settings → Password | `PATCH /users/me/password` | `user_password_hash` |
| Settings → Danger zone | `POST /users/me/deactivate` | `user_status = deactivated`, `user_status_reason` |
| Doctor → Practice profile | `PATCH /doctors/me` | `clinic_id`, `practice_name`, `practice_address`, `practice_phone`, `city_id`, `doctor_fee`, `doctor_experience`, `doctor_bio`, `doctor_video_consult`, `doctor_languages`, `doctor_insurances`, `doctor_educations` rows |
| Doctor → Re-submit application | `POST /doctors/me/verification` | `doctor_license`, `verification_status = pending`, `verification_resubmitted`, `verification_note` |

`patient_onboarding` is `pending` from sign-up until the patient saves the health-profile step, then `done`.
While it is `pending`, the frontend keeps the patient on the "Complete your profile" page.

`GET /lookups` also returns `genders` and `clinics` (seeded by `npm run db:seed`).

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
- **Email (Amazon SES):** verify the `clinicfinder.lb` domain in SES (add the DKIM and SPF DNS records it gives you), request production access (new SES accounts can only send to verified addresses), then create **SMTP credentials** in the SES console and set `MAIL_TRANSPORT=smtp`, `SMTP_HOST=email-smtp.<region>.amazonaws.com`, `SMTP_PORT=587`, `SMTP_USER` and `SMTP_PASS`. The API refuses to start in production with `MAIL_TRANSPORT=console`.

---

## Testing email verification and forgot password

See [TESTING.md](TESTING.md) for the full checklist (console mode, real Gmail emails, edge cases).

## Troubleshooting

| Problem | Fix |
|---|---|
| `Environment variable not found: DATABASE_URL` | `.env` is missing or not in the project root. Copy it from `.env.example`. |
| Prisma does not print `Loaded Prisma config from prisma.config.ts` | The config file must be named exactly `prisma.config.ts`, in the project root. |
| `permission denied to create database` during `db:migrate` | Run `ALTER USER clinicfinder_user CREATEDB;` (needed for the shadow database). |
| `Can't reach database server at localhost:5432` | PostgreSQL isn't running, or the host, port or password in `DATABASE_URL` is wrong. |
| `Cannot find module '../generated/prisma/client.ts'` | Run `npm run db:generate`. |
| `SyntaxError` when importing `client.ts` | Upgrade Node.js to 22.18 or newer. |
| No reset email arrives (development) | With `MAIL_TRANSPORT=console` nothing is sent: the email and its code are printed in the API terminal. |
| No reset email arrives (SMTP) | Check the API log for `email could not be sent`. On SES, the sender domain must be verified and the account out of the sandbox. With Gmail, use an app password, not your normal password. |
| `401 Your password was changed. Please sign in again.` | Expected after a password reset: every older session is signed out. Sign in again. |
| Raw query times are off by 2 hours | Run `ALTER DATABASE clinicfinder SET timezone TO 'UTC';` and reconnect. |

---

## Related

- Frontend: `../clinicfinder-web` (React + Vite)
- Data model: `ClinicFinder-ClassDiagram-FINAL.drawio` (class diagram + system architecture)