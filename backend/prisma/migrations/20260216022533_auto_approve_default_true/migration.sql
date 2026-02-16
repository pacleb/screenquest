-- AlterTable
ALTER TABLE "quests" ALTER COLUMN "auto_approve" SET DEFAULT true;

-- Update existing quests to auto-approve
UPDATE "quests" SET "auto_approve" = true WHERE "auto_approve" = false;
