-- Registration pricing moves from "first event + each additional event" to
-- "base + each event": total = base + per_event * events.
--
-- Written by hand rather than generated: `prisma migrate dev` emits DROP COLUMN
-- + ADD COLUMN for a rename, which would discard the configured prices and fail
-- on the NOT NULL columns while a settings row exists.

-- AlterTable
ALTER TABLE "settings" RENAME COLUMN "reg_cost_first" TO "reg_cost_base";
ALTER TABLE "settings" RENAME COLUMN "reg_cost_extra" TO "reg_cost_event";
ALTER TABLE "settings" RENAME COLUMN "early_reg_cost_first" TO "early_reg_cost_base";
ALTER TABLE "settings" RENAME COLUMN "early_reg_cost_extra" TO "early_reg_cost_event";

-- The renamed base columns still hold first-event prices, which the new formula
-- would bill on top of a per-event fee for that same first event. Subtracting
-- one per-event fee out of the base keeps every existing total identical:
--   first + extra * (N - 1)  ==  (first - extra) + extra * N
-- Drop this UPDATE if you would rather set the new prices by hand afterwards.
UPDATE "settings"
SET "reg_cost_base" = GREATEST("reg_cost_base" - "reg_cost_event", 0),
    -- GREATEST() skips NULLs, so an unconfigured early window would come back
    -- as 0 (a real price) instead of staying unset.
    "early_reg_cost_base" = CASE
        WHEN "early_reg_cost_base" IS NULL THEN NULL
        ELSE GREATEST("early_reg_cost_base" - COALESCE("early_reg_cost_event", 0), 0)
    END;
