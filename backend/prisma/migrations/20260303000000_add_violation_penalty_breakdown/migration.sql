-- Add columns to track penalty breakdown (non-stackable vs stackable)
-- This allows proper restoration of time when a violation is forgiven

ALTER TABLE "violations" ADD COLUMN "penalty_non_stackable_seconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "violations" ADD COLUMN "penalty_stackable_seconds" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing violations: assume all penalty was from stackable (conservative approach)
-- Since we don't know the original breakdown for historical violations
UPDATE "violations" SET "penalty_stackable_seconds" = "penalty_seconds";
