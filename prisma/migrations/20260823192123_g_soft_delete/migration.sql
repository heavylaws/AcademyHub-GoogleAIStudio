-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "athletes" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "assessments_academy_id_deleted_at_idx" ON "assessments"("academy_id", "deleted_at");

-- CreateIndex
CREATE INDEX "athletes_academy_id_deleted_at_idx" ON "athletes"("academy_id", "deleted_at");
