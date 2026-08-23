-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "schedules_academy_id_deleted_at_idx" ON "schedules"("academy_id", "deleted_at");

-- CreateIndex
CREATE INDEX "schedules_academy_id_date_deleted_at_idx" ON "schedules"("academy_id", "date", "deleted_at");
