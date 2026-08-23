-- CreateTable
CREATE TABLE "ai_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usages_user_id_created_at_idx" ON "ai_usages"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usages_academy_id_created_at_idx" ON "ai_usages"("academy_id", "created_at");
