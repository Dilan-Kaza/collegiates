/*
  Warnings:

  - You are about to drop the column `eventorder_id` on the `ring` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order_id,ring_number]` on the table `ring` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ring" DROP CONSTRAINT "ring_eventorder_id_fkey";

-- DropIndex
DROP INDEX "ring_order_id_ring_number_eventorder_id_key";

-- AlterTable
ALTER TABLE "event_order" ADD COLUMN     "ring_id" UUID;

-- AlterTable
ALTER TABLE "ring" DROP COLUMN "eventorder_id";

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "due_date" DATE;

-- CreateIndex
CREATE INDEX "event_order_ring_id_idx" ON "event_order"("ring_id");

-- CreateIndex
CREATE UNIQUE INDEX "ring_order_id_ring_number_key" ON "ring"("order_id", "ring_number");

-- AddForeignKey
ALTER TABLE "event_order" ADD CONSTRAINT "event_order_ring_id_fkey" FOREIGN KEY ("ring_id") REFERENCES "ring"("id") ON DELETE CASCADE ON UPDATE CASCADE;
