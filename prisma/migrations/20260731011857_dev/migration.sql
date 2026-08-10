/*
  Warnings:

  - The `event_level` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `event_category` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `gender_category` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "event_category" AS ENUM ('N', 'S', 'I');

-- CreateEnum
CREATE TYPE "weapon_type" AS ENUM ('B', 'S', 'L', 'O');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "weapon_type" "weapon_type",
DROP COLUMN "event_level",
ADD COLUMN     "event_level" "skill_level",
DROP COLUMN "event_category",
ADD COLUMN     "event_category" "event_category",
DROP COLUMN "gender_category",
ADD COLUMN     "gender_category" "gender";
