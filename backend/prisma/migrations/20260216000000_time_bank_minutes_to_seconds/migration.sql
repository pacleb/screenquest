-- AlterTable: Rename minutes columns to seconds and convert values

-- quest_library
ALTER TABLE "quest_library" RENAME COLUMN "suggested_reward_minutes" TO "suggested_reward_seconds";
UPDATE "quest_library" SET "suggested_reward_seconds" = "suggested_reward_seconds" * 60;

-- quests
ALTER TABLE "quests" RENAME COLUMN "reward_minutes" TO "reward_seconds";
UPDATE "quests" SET "reward_seconds" = "reward_seconds" * 60;

-- quest_completions
ALTER TABLE "quest_completions" RENAME COLUMN "earned_minutes" TO "earned_seconds";
UPDATE "quest_completions" SET "earned_seconds" = "earned_seconds" * 60;

-- time_banks
ALTER TABLE "time_banks" RENAME COLUMN "stackable_balance_minutes" TO "stackable_balance_seconds";
ALTER TABLE "time_banks" RENAME COLUMN "non_stackable_balance_minutes" TO "non_stackable_balance_seconds";
UPDATE "time_banks" SET "stackable_balance_seconds" = "stackable_balance_seconds" * 60,
                        "non_stackable_balance_seconds" = "non_stackable_balance_seconds" * 60;

-- play_sessions
ALTER TABLE "play_sessions" RENAME COLUMN "requested_minutes" TO "requested_seconds";
UPDATE "play_sessions" SET "requested_seconds" = "requested_seconds" * 60;

-- violations
ALTER TABLE "violations" RENAME COLUMN "penalty_minutes" TO "penalty_seconds";
UPDATE "violations" SET "penalty_seconds" = "penalty_seconds" * 60;
