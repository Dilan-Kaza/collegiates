/*
  Warnings:

  - The `gender` column on the `competitor_profile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `skill_level` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "skill_level" AS ENUM ('B', 'I', 'A');

-- AlterTable
ALTER TABLE "competitor_profile" DROP COLUMN "gender",
ADD COLUMN     "gender" "gender";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "skill_level",
ADD COLUMN     "skill_level" "skill_level";
