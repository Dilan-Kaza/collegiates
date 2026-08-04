/*
  Warnings:

  - You are about to drop the column `skill_level` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "competitor_profile" ADD COLUMN     "skill_level" VARCHAR(1);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "skill_level";
