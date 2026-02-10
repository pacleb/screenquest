-- AlterTable
ALTER TABLE "families" ADD COLUMN     "grace_period_ends_at" TIMESTAMPTZ,
ADD COLUMN     "revenuecat_app_user_id" VARCHAR(255),
ADD COLUMN     "subscription_status" VARCHAR(20);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_app_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "play_settings" JSONB;

-- CreateTable
CREATE TABLE "play_sessions" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "requested_minutes" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'requested',
    "approved_by_user_id" UUID,
    "started_at" TIMESTAMPTZ,
    "paused_at" TIMESTAMPTZ,
    "total_paused_seconds" INTEGER NOT NULL DEFAULT 0,
    "ended_at" TIMESTAMPTZ,
    "last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "violation_number" INTEGER NOT NULL,
    "penalty_minutes" INTEGER NOT NULL,
    "description" TEXT,
    "forgiven" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_counters" (
    "child_id" UUID NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "last_reset_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violation_counters_pkey" PRIMARY KEY ("child_id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "platform" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_pack_purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pack_id" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_pack_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "quest_completions" BOOLEAN NOT NULL DEFAULT true,
    "play_requests" BOOLEAN NOT NULL DEFAULT true,
    "play_state_changes" BOOLEAN NOT NULL DEFAULT true,
    "violations" BOOLEAN NOT NULL DEFAULT true,
    "daily_summary" BOOLEAN NOT NULL DEFAULT true,
    "weekly_summary" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_user_id_token_key" ON "push_tokens"("user_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "avatar_pack_purchases_user_id_pack_id_key" ON "avatar_pack_purchases"("user_id", "pack_id");

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violation_counters" ADD CONSTRAINT "violation_counters_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatar_pack_purchases" ADD CONSTRAINT "avatar_pack_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
