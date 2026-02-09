-- AlterTable
ALTER TABLE "users" ADD COLUMN     "guardian_permissions" JSONB;

-- CreateTable
CREATE TABLE "quest_library" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "category" VARCHAR(50) NOT NULL,
    "suggested_reward_minutes" INTEGER NOT NULL,
    "suggested_stacking_type" VARCHAR(20) NOT NULL DEFAULT 'stackable',
    "age_range" VARCHAR(20),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quest_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "library_quest_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50) NOT NULL DEFAULT '⭐',
    "category" VARCHAR(50) NOT NULL,
    "reward_minutes" INTEGER NOT NULL,
    "stacking_type" VARCHAR(20) NOT NULL,
    "recurrence" VARCHAR(20) NOT NULL DEFAULT 'one_time',
    "recurrence_days" JSONB,
    "requires_proof" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "bonus_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_assignments" (
    "id" UUID NOT NULL,
    "quest_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,

    CONSTRAINT "quest_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_completions" (
    "id" UUID NOT NULL,
    "quest_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "proof_image_url" VARCHAR(500),
    "approved_by_user_id" UUID,
    "earned_minutes" INTEGER NOT NULL,
    "stacking_type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "parent_note" TEXT,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,

    CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_banks" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "stackable_balance_minutes" INTEGER NOT NULL DEFAULT 0,
    "non_stackable_balance_minutes" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_banks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quest_assignments_quest_id_child_id_key" ON "quest_assignments"("quest_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_banks_child_id_key" ON "time_banks"("child_id");

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_library_quest_id_fkey" FOREIGN KEY ("library_quest_id") REFERENCES "quest_library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_assignments" ADD CONSTRAINT "quest_assignments_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_assignments" ADD CONSTRAINT "quest_assignments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_banks" ADD CONSTRAINT "time_banks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
