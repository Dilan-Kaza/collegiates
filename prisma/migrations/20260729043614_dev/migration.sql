/*
  Warnings:

  - You are about to drop the column `school_id` on the `settings` table. All the data in the column will be lost.
  - Added the required column `host_id` to the `settings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_school_id_fkey";

-- AlterTable
ALTER TABLE "settings" DROP COLUMN "school_id",
ADD COLUMN     "host_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "college_profile" (
    "user_id" UUID NOT NULL,
    "college_id" UUID,
    "host_years" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "college_profile_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "college_profile" ADD CONSTRAINT "college_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "college_profile" ADD CONSTRAINT "college_profile_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("college_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
