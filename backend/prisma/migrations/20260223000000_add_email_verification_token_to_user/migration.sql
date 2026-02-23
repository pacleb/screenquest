-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verification_token" VARCHAR(64),
ADD COLUMN "email_verification_expiry" TIMESTAMPTZ;
