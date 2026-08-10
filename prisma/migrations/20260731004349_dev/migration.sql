/*
  Warnings:

  - You are about to drop the `order_ring1` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_ring2` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_ring3` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_ring1" DROP CONSTRAINT "order_ring1_eventorder_id_fkey";

-- DropForeignKey
ALTER TABLE "order_ring1" DROP CONSTRAINT "order_ring1_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_ring2" DROP CONSTRAINT "order_ring2_eventorder_id_fkey";

-- DropForeignKey
ALTER TABLE "order_ring2" DROP CONSTRAINT "order_ring2_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_ring3" DROP CONSTRAINT "order_ring3_eventorder_id_fkey";

-- DropForeignKey
ALTER TABLE "order_ring3" DROP CONSTRAINT "order_ring3_order_id_fkey";

-- DropTable
DROP TABLE "order_ring1";

-- DropTable
DROP TABLE "order_ring2";

-- DropTable
DROP TABLE "order_ring3";

-- CreateTable
CREATE TABLE "ring" (
    "id" UUID NOT NULL,
    "ring_number" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "eventorder_id" UUID NOT NULL,

    CONSTRAINT "ring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ring_order_id_ring_number_eventorder_id_key" ON "ring"("order_id", "ring_number", "eventorder_id");

-- AddForeignKey
ALTER TABLE "ring" ADD CONSTRAINT "ring_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("comp_year") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ring" ADD CONSTRAINT "ring_eventorder_id_fkey" FOREIGN KEY ("eventorder_id") REFERENCES "event_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
