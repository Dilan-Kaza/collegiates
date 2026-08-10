/*
  Warnings:

  - You are about to drop the column `is_staff` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_superuser` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_login` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_staff",
DROP COLUMN "is_superuser",
DROP COLUMN "last_login";
