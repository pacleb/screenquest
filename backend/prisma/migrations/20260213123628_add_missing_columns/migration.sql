-- AlterTable
ALTER TABLE "families" ADD COLUMN     "leaderboard_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "gamification" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "child_progress" (
    "child_id" UUID NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_completion_date" DATE,
    "weekly_xp" INTEGER NOT NULL DEFAULT 0,
    "weekly_xp_reset_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_progress_pkey" PRIMARY KEY ("child_id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "criteria" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_achievements" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_items" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "slot" VARCHAR(20) NOT NULL,
    "unlock_type" VARCHAR(20) NOT NULL,
    "unlock_value" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_equipped_items" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "avatar_item_id" UUID NOT NULL,
    "slot" VARCHAR(20) NOT NULL,
    "equipped_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_equipped_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_key" ON "achievements"("key");

-- CreateIndex
CREATE UNIQUE INDEX "child_achievements_child_id_achievement_id_key" ON "child_achievements"("child_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "avatar_items_key_key" ON "avatar_items"("key");

-- CreateIndex
CREATE UNIQUE INDEX "child_equipped_items_child_id_slot_key" ON "child_equipped_items"("child_id", "slot");

-- AddForeignKey
ALTER TABLE "child_progress" ADD CONSTRAINT "child_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_achievements" ADD CONSTRAINT "child_achievements_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_achievements" ADD CONSTRAINT "child_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_equipped_items" ADD CONSTRAINT "child_equipped_items_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_equipped_items" ADD CONSTRAINT "child_equipped_items_avatar_item_id_fkey" FOREIGN KEY ("avatar_item_id") REFERENCES "avatar_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
