/*
  Warnings:

  - The values [3,4,5,6,7] on the enum `student_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "student_type_new" AS ENUM ('1', '2');
ALTER TABLE "competitor_profile" ALTER COLUMN "student_type" TYPE "student_type_new" USING ("student_type"::text::"student_type_new");
ALTER TYPE "student_type" RENAME TO "student_type_old";
ALTER TYPE "student_type_new" RENAME TO "student_type";
DROP TYPE "public"."student_type_old";
COMMIT;
