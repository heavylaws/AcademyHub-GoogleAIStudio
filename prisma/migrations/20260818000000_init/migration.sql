-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'coach', 'parent');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('manual', 'ai_agentic');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('deterministic_fallback', 'ai_evaluated', 'ai_error');

-- CreateEnum
CREATE TYPE "PaymentSchedule" AS ENUM ('upfront', '2-part', 'monthly');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "ChurnRisk" AS ENUM ('Low', 'Medium', 'High');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'parent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TEXT,
    "parent_user_id" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "emergency_contact" TEXT,
    "guardian_consent" BOOLEAN NOT NULL DEFAULT false,
    "guardian_consent_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_sports" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "monthly_fee" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "athlete_name" TEXT NOT NULL,
    "parent_email" TEXT,
    "sport" TEXT NOT NULL,
    "exercise_type" TEXT NOT NULL,
    "grading_rubric_sop" TEXT,
    "coach_id" TEXT,
    "coach_name" TEXT,
    "data_source" "DataSource" NOT NULL DEFAULT 'manual',
    "pipeline_status" "PipelineStatus",
    "error_detail" TEXT,
    "quantitative_metrics" JSONB NOT NULL,
    "qualitative_observations" JSONB NOT NULL,
    "media_references" JSONB NOT NULL,
    "agent_insights" JSONB,
    "computed_score" DOUBLE PRECISION NOT NULL,
    "rubric_grade" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "parent_user_id" TEXT NOT NULL,
    "parent_name" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discounted_child_name" TEXT,
    "sibling_discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_total" DOUBLE PRECISION NOT NULL,
    "payment_schedule" "PaymentSchedule" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "issued_date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_children" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "athlete_id" TEXT,
    "child_name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "monthly_fee" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "due_date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "facility" TEXT NOT NULL,
    "coach_id" TEXT,
    "coach_name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 20,
    "enrolled_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "sports" JSONB NOT NULL,
    "attendance_rate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "churn_risk" "ChurnRisk" NOT NULL DEFAULT 'Low',
    "retention_score" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "batch_fill_rate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "athletes_parent_user_id_idx" ON "athletes"("parent_user_id");

-- CreateIndex
CREATE INDEX "athlete_sports_athlete_id_idx" ON "athlete_sports"("athlete_id");

-- CreateIndex
CREATE INDEX "assessments_athlete_id_idx" ON "assessments"("athlete_id");

-- CreateIndex
CREATE INDEX "assessments_coach_id_idx" ON "assessments"("coach_id");

-- CreateIndex
CREATE INDEX "invoices_parent_user_id_idx" ON "invoices"("parent_user_id");

-- CreateIndex
CREATE INDEX "invoice_children_invoice_id_idx" ON "invoice_children"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_children_athlete_id_idx" ON "invoice_children"("athlete_id");

-- CreateIndex
CREATE INDEX "installments_invoice_id_idx" ON "installments"("invoice_id");

-- CreateIndex
CREATE INDEX "schedules_coach_id_idx" ON "schedules"("coach_id");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_user_id_key" ON "coaches"("user_id");

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_sports" ADD CONSTRAINT "athlete_sports_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_children" ADD CONSTRAINT "invoice_children_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_children" ADD CONSTRAINT "invoice_children_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
