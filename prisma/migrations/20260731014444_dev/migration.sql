/*
  Warnings:

  - The values [N,S] on the enum `event_category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "event_category_new" AS ENUM ('E', 'I');
ALTER TABLE "events" ALTER COLUMN "event_category" TYPE "event_category_new" USING ("event_category"::text::"event_category_new");
ALTER TYPE "event_category" RENAME TO "event_category_old";
ALTER TYPE "event_category_new" RENAME TO "event_category";
DROP TYPE "public"."event_category_old";
COMMIT;
