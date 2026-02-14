-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "badge_color" VARCHAR(7) NOT NULL DEFAULT '#CD7F32',
ADD COLUMN     "badge_tier" VARCHAR(10) NOT NULL DEFAULT 'bronze',
ADD COLUMN     "is_secret" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xp_reward" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "child_progress" ADD COLUMN     "showcase_badges" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN     "streak_freeze_used_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_theme_id" UUID;

-- CreateTable
CREATE TABLE "themes" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "preview_url" VARCHAR(500),
    "unlock_type" VARCHAR(20) NOT NULL,
    "unlock_value" INTEGER,
    "colors" JSONB NOT NULL,
    "gradients" JSONB,
    "is_animated" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(30) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_key_key" ON "themes"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_theme_id_fkey" FOREIGN KEY ("active_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
