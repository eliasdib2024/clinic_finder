-- Email verification with a 6-digit code (same design as the password reset code).
--
-- The old "email_verification_token" column was never written by the API, so nothing is lost.
-- It had a UNIQUE index, which cannot work for a code: two users may receive the same 6 digits.

DROP INDEX "users_email_verification_token_key";

ALTER TABLE "users" DROP COLUMN "email_verification_token",
ADD COLUMN     "email_verification_code" VARCHAR(255),          -- HMAC of the code, never the code itself
ADD COLUMN     "email_verification_expiry" TIMESTAMPTZ(3),      -- the code stops working after this
ADD COLUMN     "email_verification_attempts" INTEGER NOT NULL DEFAULT 0,   -- wrong guesses for the current code
ADD COLUMN     "user_email_verified_at" TIMESTAMPTZ(3);         -- when the address was confirmed

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_verification_attempts_check" CHECK ("email_verification_attempts" >= 0);

-- Administrators are created by the seed script with a known address: treat them as verified.
UPDATE "users" SET "user_email_verified" = true, "user_email_verified_at" = now()
WHERE "user_role" = 'admin' AND "user_email_verified" = false;
UPDATE "users" SET "user_email_verified_at" = "created_at"
WHERE "user_email_verified" = true AND "user_email_verified_at" IS NULL;
