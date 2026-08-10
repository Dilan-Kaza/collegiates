-- The per-year `order` table is merged into `settings` — its only columns were
-- comp_year, which a settings row already is, and updated_at — and the has_paid
-- flag becomes an amount.
--
-- Written by hand rather than generated: `prisma migrate dev` emits plain DROPs
-- for all three moves, which would discard every recorded payment and every
-- saved event order.

-- ----------------------------------------------------------------- payments

-- AlterTable
ALTER TABLE "competitor_profile" ADD COLUMN     "amt_paid" INTEGER NOT NULL DEFAULT 0;

-- has_paid only ever recorded *that* someone paid, so the amount has to be
-- reconstructed: the fee lib/fees.ts would have shown them, priced off the
-- settings for their most recent registration year. Same rules as that file —
-- the base fee once, at the tier the earliest billed item falls under, then
-- every billed item priced by its own create date, plus one extra event for a
-- team with no groupset-event registration behind it.
--
-- A competitor marked paid with no registrations at all has no fee to
-- reconstruct and lands on 0. List them first if that matters:
--   SELECT user_id FROM competitor_profile p WHERE p.has_paid
--     AND NOT EXISTS (SELECT 1 FROM registration r WHERE r.competitor_id = p.user_id);
WITH latest_year AS (
    SELECT "competitor_id", MAX("comp_year") AS "yr"
    FROM "registration"
    GROUP BY "competitor_id"
),
-- One settings row per year: the most recently created, which is the row the
-- app reads (see loadSettings) when a year has more than one.
year_settings AS (
    SELECT DISTINCT ON ("reg_year") *
    FROM "settings"
    ORDER BY "reg_year", "created_at" DESC
),
billed AS (
    SELECT r."competitor_id", y."yr", r."date_created"
    FROM "registration" r
    JOIN latest_year y
      ON y."competitor_id" = r."competitor_id" AND y."yr" = r."comp_year"
    UNION ALL
    SELECT gm."member", y."yr", g."date_created"
    FROM "groupset_members" gm
    JOIN "groupset" g ON g."groupset_id" = gm."groupset_id"
    JOIN latest_year y
      ON y."competitor_id" = gm."member" AND y."yr" = g."comp_year"
    WHERE NOT EXISTS (
        SELECT 1
        FROM "registration" r2
        JOIN "events" e ON e."event_code" = r2."event_code"
        WHERE r2."competitor_id" = gm."member"
          AND r2."comp_year" = y."yr"
          AND e."event_category" = 'G'
    )
),
owed AS (
    SELECT b."competitor_id",
           CASE
               WHEN s."early_reg_start" IS NOT NULL
                    AND s."early_reg_cost_base" IS NOT NULL
                    AND MIN(b."date_created") < s."reg_start"
                   THEN COALESCE(s."early_reg_cost_base", 0)
               ELSE s."reg_cost_base"
           END
           + SUM(
               CASE
                   WHEN s."early_reg_start" IS NOT NULL
                        AND s."early_reg_cost_base" IS NOT NULL
                        AND b."date_created" < s."reg_start"
                       THEN COALESCE(s."early_reg_cost_event", 0)
                   ELSE s."reg_cost_event"
               END
           ) AS "total"
    FROM billed b
    JOIN year_settings s ON s."reg_year" = b."yr"
    GROUP BY b."competitor_id", s."early_reg_start", s."reg_start",
             s."reg_cost_base", s."reg_cost_event",
             s."early_reg_cost_base", s."early_reg_cost_event"
)
UPDATE "competitor_profile" p
SET "amt_paid" = o."total"
FROM owed o
WHERE o."competitor_id" = p."user_id" AND p."has_paid";

-- AlterTable
ALTER TABLE "competitor_profile" DROP COLUMN "has_paid";

-- ----------------------------------------------------------------- settings

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "scoring_url" VARCHAR(500),
                       ADD COLUMN     "order_updated_at" TIMESTAMPTZ(6);

-- order.updated_at moves onto the year's settings row — the same row the rings
-- are attached to below, so the two agree about which row owns the order. Years
-- with no order row keep NULL, which is what the reads now treat as "no order
-- saved yet": exactly what a missing order row used to mean.
UPDATE "settings" s
SET "order_updated_at" = o."updated_at"
FROM "order" o
WHERE o."comp_year" = s."reg_year"
  AND s."id" = (
      SELECT s2."id"
      FROM "settings" s2
      WHERE s2."reg_year" = s."reg_year"
      ORDER BY s2."created_at" DESC
      LIMIT 1
  );

-- -------------------------------------------------------------------- rings

-- AlterTable
ALTER TABLE "ring" ADD COLUMN     "settings_id" UUID;

-- ring.order_id held a comp_year, so the new owner is that year's settings row.
UPDATE "ring" r
SET "settings_id" = s."id"
FROM (
    SELECT DISTINCT ON ("reg_year") "reg_year", "id"
    FROM "settings"
    ORDER BY "reg_year", "created_at" DESC
) s
WHERE s."reg_year" = r."order_id";

-- A ring for a year with no settings row has nowhere left to hang: a settings
-- row is what a competition year is now. The cascade takes its slots and their
-- competitor lists with it, so check for any before applying:
--   SELECT DISTINCT order_id FROM ring WHERE settings_id IS NULL;
DELETE FROM "ring" WHERE "settings_id" IS NULL;

ALTER TABLE "ring" ALTER COLUMN "settings_id" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "ring" DROP CONSTRAINT "ring_order_id_fkey";

-- DropIndex
DROP INDEX "ring_order_id_ring_number_key";

-- AlterTable
ALTER TABLE "ring" DROP COLUMN "order_id";

-- CreateIndex
CREATE UNIQUE INDEX "ring_settings_id_ring_number_key" ON "ring"("settings_id", "ring_number");

-- AddForeignKey
ALTER TABLE "ring" ADD CONSTRAINT "ring_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "order";
