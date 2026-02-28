-- DropForeignKey
ALTER TABLE "quest_completions" DROP CONSTRAINT "quest_completions_quest_id_fkey";

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
