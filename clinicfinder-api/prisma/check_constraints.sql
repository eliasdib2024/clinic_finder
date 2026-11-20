-- Business rules Prisma cannot express in schema.prisma
ALTER TABLE "doctors"
  ADD CONSTRAINT "doctors_fee_check"         CHECK ("doctor_fee" >= 0),
  ADD CONSTRAINT "doctors_rating_check"      CHECK ("doctor_rating" BETWEEN 0 AND 5),
  ADD CONSTRAINT "doctors_slot_length_check" CHECK ("doctor_slot_length" BETWEEN 15 AND 60),
  ADD CONSTRAINT "doctors_experience_check"  CHECK ("doctor_experience" >= 0);

ALTER TABLE "working_hours"
  ADD CONSTRAINT "working_hours_range_check" CHECK ("working_hours_end" > "working_hours_start");

ALTER TABLE "breaks"
  ADD CONSTRAINT "breaks_range_check" CHECK ("break_end" > "break_start");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_duration_check" CHECK ("appointment_duration" BETWEEN 15 AND 60);

ALTER TABLE "prescriptions"
  ADD CONSTRAINT "prescriptions_diagnosis_check" CHECK (char_length("prescription_diagnosis") >= 3),
  ADD CONSTRAINT "prescriptions_follow_up_check" CHECK ("prescription_follow_up_date" IS NULL OR "prescription_follow_up_date" > "prescription_date");

ALTER TABLE "users"
  ADD CONSTRAINT "users_reset_attempts_check" CHECK ("reset_code_attempts" >= 0);
