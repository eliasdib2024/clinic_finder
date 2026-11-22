-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('patient', 'doctor', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "user_language" AS ENUM ('en', 'fr', 'ar');

-- CreateEnum
CREATE TYPE "notification_kind" AS ENUM ('info', 'success', 'warning');

-- CreateEnum
CREATE TYPE "activity_kind" AS ENUM ('signup', 'verification', 'booking', 'user', 'clinic', 'catalog');

-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('pending', 'done');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

-- CreateEnum
CREATE TYPE "appointment_type" AS ENUM ('in-person', 'video');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "user_full_name" VARCHAR(100) NOT NULL,
    "user_email" VARCHAR(255) NOT NULL,
    "user_phone" VARCHAR(20) NOT NULL,
    "user_password_hash" VARCHAR(255) NOT NULL,
    "user_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "user_role" "user_role" NOT NULL,
    "user_status" "user_status" NOT NULL DEFAULT 'active',
    "user_status_reason" VARCHAR(300),
    "gender_id" INTEGER,
    "user_language" "user_language" NOT NULL DEFAULT 'en',
    "notify_email" BOOLEAN NOT NULL DEFAULT true,
    "notify_sms" BOOLEAN NOT NULL DEFAULT false,
    "notify_reminders" BOOLEAN NOT NULL DEFAULT true,
    "notify_new_booking" BOOLEAN NOT NULL DEFAULT true,
    "notify_marketing" BOOLEAN NOT NULL DEFAULT false,
    "reset_code" VARCHAR(255),
    "reset_code_expiry" TIMESTAMPTZ(3),
    "reset_code_attempts" INTEGER NOT NULL DEFAULT 0,
    "reset_code_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "genders" (
    "gender_id" SERIAL NOT NULL,
    "gender_desc" VARCHAR(30) NOT NULL,

    CONSTRAINT "genders_pkey" PRIMARY KEY ("gender_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "notification_title" VARCHAR(150) NOT NULL,
    "notification_body" TEXT NOT NULL,
    "notification_vars" JSONB,
    "notification_link" VARCHAR(255),
    "notification_kind" "notification_kind" NOT NULL DEFAULT 'info',
    "notification_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "activity_id" SERIAL NOT NULL,
    "activity_text" VARCHAR(255) NOT NULL,
    "activity_vars" JSONB,
    "activity_kind" "activity_kind" NOT NULL,
    "activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "patients" (
    "patient_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "patient_dob" DATE,
    "city_id" INTEGER,
    "blood_id" INTEGER,
    "insurance_id" INTEGER,
    "patient_insurance_number" VARCHAR(50),
    "patient_emergency_contact" VARCHAR(100),
    "patient_no_known_allergies" BOOLEAN NOT NULL DEFAULT false,
    "patient_onboarding" "onboarding_status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "blood_types" (
    "blood_id" SERIAL NOT NULL,
    "blood_name" VARCHAR(3) NOT NULL,

    CONSTRAINT "blood_types_pkey" PRIMARY KEY ("blood_id")
);

-- CreateTable
CREATE TABLE "patient_allergies" (
    "allergy_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "allergy_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("allergy_id")
);

-- CreateTable
CREATE TABLE "insurances" (
    "insurance_id" SERIAL NOT NULL,
    "insurance_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("insurance_id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "doctor_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "doctor_license" VARCHAR(30) NOT NULL,
    "clinic_id" INTEGER,
    "city_id" INTEGER NOT NULL,
    "practice_name" VARCHAR(150) NOT NULL,
    "practice_address" VARCHAR(255) NOT NULL,
    "practice_phone" VARCHAR(20),
    "doctor_fee" DECIMAL(10,2) NOT NULL,
    "doctor_experience" INTEGER NOT NULL DEFAULT 0,
    "doctor_bio" TEXT,
    "doctor_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "doctor_reviews_count" INTEGER NOT NULL DEFAULT 0,
    "doctor_video_consult" BOOLEAN NOT NULL DEFAULT false,
    "doctor_slot_length" INTEGER NOT NULL DEFAULT 30,
    "doctor_auto_confirm" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "verification_status" NOT NULL DEFAULT 'pending',
    "verification_reason" TEXT,
    "verification_resubmitted" BOOLEAN NOT NULL DEFAULT false,
    "verification_note" TEXT,
    "verification_submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verification_reviewed_at" TIMESTAMPTZ(3),
    "reviewed_by_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("doctor_id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "specialty_id" SERIAL NOT NULL,
    "specialty_name" VARCHAR(100) NOT NULL,
    "specialty_icon" VARCHAR(50),

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("specialty_id")
);

-- CreateTable
CREATE TABLE "languages" (
    "language_id" SERIAL NOT NULL,
    "language_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("language_id")
);

-- CreateTable
CREATE TABLE "doctor_languages" (
    "doctor_id" INTEGER NOT NULL,
    "language_id" INTEGER NOT NULL,

    CONSTRAINT "doctor_languages_pkey" PRIMARY KEY ("doctor_id","language_id")
);

-- CreateTable
CREATE TABLE "doctor_insurances" (
    "doctor_id" INTEGER NOT NULL,
    "insurance_id" INTEGER NOT NULL,

    CONSTRAINT "doctor_insurances_pkey" PRIMARY KEY ("doctor_id","insurance_id")
);

-- CreateTable
CREATE TABLE "doctor_educations" (
    "education_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "education_degree" VARCHAR(100) NOT NULL,
    "education_institution" VARCHAR(150) NOT NULL,
    "education_year" INTEGER NOT NULL,

    CONSTRAINT "doctor_educations_pkey" PRIMARY KEY ("education_id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "clinic_id" SERIAL NOT NULL,
    "clinic_name" VARCHAR(150) NOT NULL,
    "clinic_type_id" INTEGER NOT NULL,
    "city_id" INTEGER NOT NULL,
    "clinic_address" VARCHAR(255) NOT NULL,
    "clinic_phone" VARCHAR(20),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("clinic_id")
);

-- CreateTable
CREATE TABLE "clinic_types" (
    "clinic_type_id" SERIAL NOT NULL,
    "clinic_type_desc" VARCHAR(50) NOT NULL,

    CONSTRAINT "clinic_types_pkey" PRIMARY KEY ("clinic_type_id")
);

-- CreateTable
CREATE TABLE "cities" (
    "city_id" SERIAL NOT NULL,
    "governorate_id" INTEGER NOT NULL,
    "city_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("city_id")
);

-- CreateTable
CREATE TABLE "governorates" (
    "governorate_id" SERIAL NOT NULL,
    "governorate_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "governorates_pkey" PRIMARY KEY ("governorate_id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "working_hours_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "working_hours_weekday" "weekday" NOT NULL,
    "working_hours_enabled" BOOLEAN NOT NULL DEFAULT true,
    "working_hours_start" TIME(0) NOT NULL,
    "working_hours_end" TIME(0) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("working_hours_id")
);

-- CreateTable
CREATE TABLE "breaks" (
    "break_id" SERIAL NOT NULL,
    "working_hours_id" INTEGER NOT NULL,
    "break_start" TIME(0) NOT NULL,
    "break_end" TIME(0) NOT NULL,

    CONSTRAINT "breaks_pkey" PRIMARY KEY ("break_id")
);

-- CreateTable
CREATE TABLE "blocked_dates" (
    "blocked_date_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "blocked_date_date" DATE NOT NULL,
    "blocked_date_note" VARCHAR(200),

    CONSTRAINT "blocked_dates_pkey" PRIMARY KEY ("blocked_date_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "appointment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "appointment_date" DATE NOT NULL,
    "appointment_time" TIME(0) NOT NULL,
    "appointment_duration" INTEGER NOT NULL,
    "appointment_type" "appointment_type" NOT NULL DEFAULT 'in-person',
    "appointment_reason" VARCHAR(500),
    "status_id" INTEGER NOT NULL,
    "appointment_status_note" VARCHAR(300),
    "appointment_late_cancellation" BOOLEAN NOT NULL DEFAULT false,
    "rescheduled_from_date" DATE,
    "rescheduled_from_time" TIME(0),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "appointment_statuses" (
    "status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(20) NOT NULL,

    CONSTRAINT "appointment_statuses_pkey" PRIMARY KEY ("status_id")
);

-- CreateTable
CREATE TABLE "appointment_histories" (
    "history_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "changed_by_id" INTEGER,
    "history_note" VARCHAR(300),
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_histories_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "prescription_id" SERIAL NOT NULL,
    "prescription_code" VARCHAR(20) NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "prescription_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prescription_diagnosis" VARCHAR(200) NOT NULL,
    "prescription_follow_up_date" DATE,
    "prescription_follow_up_note" VARCHAR(300),
    "prescription_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "item_id" SERIAL NOT NULL,
    "prescription_id" INTEGER NOT NULL,
    "medication_id" INTEGER,
    "item_medication_name" VARCHAR(150) NOT NULL,
    "item_dose" VARCHAR(50) NOT NULL,
    "frequency_id" INTEGER NOT NULL,
    "item_duration" VARCHAR(50) NOT NULL,
    "item_instructions" VARCHAR(300),

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "medications" (
    "medication_id" SERIAL NOT NULL,
    "medication_name" VARCHAR(150) NOT NULL,
    "medication_allergen_group" VARCHAR(100),

    CONSTRAINT "medications_pkey" PRIMARY KEY ("medication_id")
);

-- CreateTable
CREATE TABLE "frequencies" (
    "frequency_id" SERIAL NOT NULL,
    "frequency_desc" VARCHAR(100) NOT NULL,

    CONSTRAINT "frequencies_pkey" PRIMARY KEY ("frequency_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_email_key" ON "users"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");

-- CreateIndex
CREATE INDEX "users_user_role_user_status_idx" ON "users"("user_role", "user_status");

-- CreateIndex
CREATE UNIQUE INDEX "genders_gender_desc_key" ON "genders"("gender_desc");

-- CreateIndex
CREATE INDEX "notifications_user_id_notification_read_idx" ON "notifications"("user_id", "notification_read");

-- CreateIndex
CREATE INDEX "activity_logs_activity_at_idx" ON "activity_logs"("activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blood_types_blood_name_key" ON "blood_types"("blood_name");

-- CreateIndex
CREATE UNIQUE INDEX "patient_allergies_patient_id_allergy_name_key" ON "patient_allergies"("patient_id", "allergy_name");

-- CreateIndex
CREATE UNIQUE INDEX "insurances_insurance_name_key" ON "insurances"("insurance_name");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_doctor_license_key" ON "doctors"("doctor_license");

-- CreateIndex
CREATE INDEX "doctors_specialty_id_city_id_idx" ON "doctors"("specialty_id", "city_id");

-- CreateIndex
CREATE INDEX "doctors_verification_status_idx" ON "doctors"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_specialty_name_key" ON "specialties"("specialty_name");

-- CreateIndex
CREATE UNIQUE INDEX "languages_language_name_key" ON "languages"("language_name");

-- CreateIndex
CREATE INDEX "doctor_educations_doctor_id_idx" ON "doctor_educations"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_clinic_name_key" ON "clinics"("clinic_name");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_types_clinic_type_desc_key" ON "clinic_types"("clinic_type_desc");

-- CreateIndex
CREATE UNIQUE INDEX "cities_governorate_id_city_name_key" ON "cities"("governorate_id", "city_name");

-- CreateIndex
CREATE UNIQUE INDEX "governorates_governorate_name_key" ON "governorates"("governorate_name");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_doctor_id_working_hours_weekday_key" ON "working_hours"("doctor_id", "working_hours_weekday");

-- CreateIndex
CREATE INDEX "breaks_working_hours_id_idx" ON "breaks"("working_hours_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_dates_doctor_id_blocked_date_date_key" ON "blocked_dates"("doctor_id", "blocked_date_date");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_appointment_date_idx" ON "appointments"("doctor_id", "appointment_date");

-- CreateIndex
CREATE INDEX "appointments_patient_id_appointment_date_idx" ON "appointments"("patient_id", "appointment_date");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_statuses_status_name_key" ON "appointment_statuses"("status_name");

-- CreateIndex
CREATE INDEX "appointment_histories_appointment_id_idx" ON "appointment_histories"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescription_code_key" ON "prescriptions"("prescription_code");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_appointment_id_key" ON "prescriptions"("appointment_id");

-- CreateIndex
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions"("patient_id");

-- CreateIndex
CREATE INDEX "prescriptions_doctor_id_idx" ON "prescriptions"("doctor_id");

-- CreateIndex
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");

-- CreateIndex
CREATE UNIQUE INDEX "medications_medication_name_key" ON "medications"("medication_name");

-- CreateIndex
CREATE UNIQUE INDEX "frequencies_frequency_desc_key" ON "frequencies"("frequency_desc");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "genders"("gender_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("city_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_blood_id_fkey" FOREIGN KEY ("blood_id") REFERENCES "blood_types"("blood_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_insurance_id_fkey" FOREIGN KEY ("insurance_id") REFERENCES "insurances"("insurance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("specialty_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("clinic_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("city_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_languages" ADD CONSTRAINT "doctor_languages_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_languages" ADD CONSTRAINT "doctor_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("language_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_insurances" ADD CONSTRAINT "doctor_insurances_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_insurances" ADD CONSTRAINT "doctor_insurances_insurance_id_fkey" FOREIGN KEY ("insurance_id") REFERENCES "insurances"("insurance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_educations" ADD CONSTRAINT "doctor_educations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_clinic_type_id_fkey" FOREIGN KEY ("clinic_type_id") REFERENCES "clinic_types"("clinic_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("city_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_governorate_id_fkey" FOREIGN KEY ("governorate_id") REFERENCES "governorates"("governorate_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_working_hours_id_fkey" FOREIGN KEY ("working_hours_id") REFERENCES "working_hours"("working_hours_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "appointment_statuses"("status_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_histories" ADD CONSTRAINT "appointment_histories_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_histories" ADD CONSTRAINT "appointment_histories_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "appointment_statuses"("status_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_histories" ADD CONSTRAINT "appointment_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("prescription_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("medication_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_frequency_id_fkey" FOREIGN KEY ("frequency_id") REFERENCES "frequencies"("frequency_id") ON DELETE RESTRICT ON UPDATE CASCADE;
