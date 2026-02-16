/*
  Warnings:

  - Made the column `data` on table `in_app_notifications` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "in_app_notifications_user_id_read_created_at_idx";

-- AlterTable
ALTER TABLE "in_app_notifications" ALTER COLUMN "body" SET DATA TYPE TEXT,
ALTER COLUMN "type" SET DEFAULT 'general',
ALTER COLUMN "data" SET NOT NULL;
