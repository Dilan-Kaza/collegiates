"use server";

// Event-order server actions: read/save this year's ring order, publish state,
// and the public read. Include shapes live in lib/api beside their shapers.

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, isCompetitor } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { shapeOrder, ORDER_INCLUDE } from "@/lib/api";
import type { OrderDTO } from "@/lib/api";
import { sheetsCredentials, spreadsheetIdFromUrl, writeSheetTabs } from "@/lib/sheets";
import { isFormulaCell } from "@/lib/sheetGrid";
import type { Cell, SheetTabData } from "@/lib/sheetGrid";
import { getOrderForSettings, orderTag } from "../data";
import { organizerGate, actionError } from "./shared";
import type { Mutation, OrderBody, SheetExportBody, RingKey, EventOrderInput, EventOrderCompetitorInput } from "./shared";

// The stored columns a save may change. Read back with the create-vs-update lookup the save
// already does, since the rewrite writes every column — an omitted field is merged from here.
const SLOT_SELECT = {
  id: true,
  comp_year: true,
  event_id: true,
  name: true,
  break_length: true,
  order: true,
} satisfies Prisma.EventOrderSelect;

interface SlotFields {
  comp_year: number;
  event_id: string | null;
  name: string | null;
  break_length: number;
  order: number;
}

type SlotRow = SlotFields & { id: string; ring_id: string };

// Where a slot's competitor list comes from: the one the payload supplied, or the
// rows already stored against it when the payload omitted one.
type RosterSource = EventOrderCompetitorInput[] | "stored";

interface SavePlan {
  slots: SlotRow[];
  rosters: Map<string, RosterSource>;
}

// A field the payload did not mention keeps what the row already held, and falls
// back to the column default only when there is no row yet.
function pick<T>(supplied: T | undefined, stored: T | undefined, fallback: T): T {
  if (supplied !== undefined) return supplied;
  return stored !== undefined ? stored : fallback;
}

// to_internal_value for every ring in the body. Every listed slot becomes a row, stamped with the
// ring it was listed under so cross-ring drags follow. Pure — `stored` is read by the caller.
function planSave(
  rings: { ringId: string; items: EventOrderInput[] }[],
  stored: Map<string, SlotFields>,
  year: number,
): SavePlan {
  // Keyed by id, so an id listed twice in one payload collapses to a single row instead of failing
  // the whole save on a duplicate key. Later listings merge over earlier: last listing wins.
  const slots = new Map<string, SlotRow>();
  const rosters = new Map<string, RosterSource>();

  for (const { ringId, items } of rings) {
    for (const item of items) {
      const id = item.id ?? crypto.randomUUID();
      const previous: SlotFields | undefined = slots.get(id) ?? stored.get(id);

      slots.set(id, {
        id,
        ring_id: ringId,
        // Never reassigned by a save: a slot belongs to the year of the settings
        // row whose rings it hangs off.
        comp_year: previous?.comp_year ?? year,
        event_id: pick(item.event_id, previous?.event_id, null),
        name: pick(item.name, previous?.name, null),
        break_length: pick(item.break_length, previous?.break_length, 0),
        order: pick(item.order, previous?.order, 0),
      });

      if (item.competitor_list !== undefined) {
        rosters.set(id, item.competitor_list);
      } else if (!rosters.has(id)) {
        // An omitted roster is not a request to clear one: an existing slot keeps its rows and a
        // new slot starts empty. It must not override a list an earlier listing supplied.
        rosters.set(id, stored.has(id) ? "stored" : []);
      }
    }
  }

  return { slots: [...slots.values()], rosters };
}

// The competitor rows for every slot being written, resolved against the rosters carried over from
// storage. Keyed by (slot, competitor), matching the old update_or_create behaviour.
function competitorRows(
  plan: SavePlan,
  carried: Map<string, EventOrderCompetitorInput[]>,
): Prisma.CompetitorOrderCreateManyInput[] {
  const rows = new Map<string, Prisma.CompetitorOrderCreateManyInput>();
  for (const [eventOrderId, source] of plan.rosters) {
    const comps = source === "stored" ? carried.get(eventOrderId) ?? [] : source;
    for (const comp of comps) {
      if (!comp.id) continue;
      rows.set(`${eventOrderId}:${comp.id}`, {
        event_order_id: eventOrderId,
        competitor_id: comp.id,
        order: comp.order ?? 0,
      });
    }
  }
  return [...rows.values()];
}

// The stored rosters of slots whose payload entry omitted one. Must run before the
// delete below, which cascades those rows away.
async function carryRosters(
  tx: Prisma.TransactionClient,
  plan: SavePlan,
): Promise<Map<string, EventOrderCompetitorInput[]>> {
  const ids = [...plan.rosters].filter(([, source]) => source === "stored").map(([id]) => id);
  const carried = new Map<string, EventOrderCompetitorInput[]>();
  if (ids.length === 0) return carried;

  const rows = await tx.competitorOrder.findMany({
    where: { event_order_id: { in: ids } },
    select: { event_order_id: true, competitor_id: true, order: true },
  });
  for (const r of rows) {
    const list = carried.get(r.event_order_id) ?? [];
    list.push({ id: r.competitor_id, order: r.order });
    carried.set(r.event_order_id, list);
  }
  return carried;
}

// Each ring is a single Ring row per (settings, ring_number); its slots hang off
// it via EventOrder.ring_id.
const RING_NUMBER: Record<RingKey, number> = { ring1: 1, ring2: 2, ring3: 3 };

// The Ring rows for the rings being written, created on first save. One
// createMany plus one read, rather than an upsert round trip per ring.
async function ensureRings(
  tx: Prisma.TransactionClient,
  ringKeys: RingKey[],
  settingsId: string,
): Promise<Map<RingKey, string>> {
  const numbers = ringKeys.map((r) => RING_NUMBER[r]);
  await tx.ring.createMany({
    data: numbers.map((ring_number) => ({ settings_id: settingsId, ring_number })),
    skipDuplicates: true,
  });
  const rows = await tx.ring.findMany({
    where: { settings_id: settingsId, ring_number: { in: numbers } },
    select: { id: true, ring_number: true },
  });
  const byNumber = new Map(rows.map((r) => [r.ring_number, r.id]));
  return new Map(ringKeys.map((r) => [r, byNumber.get(RING_NUMBER[r])!]));
}

// Clear the rings being written so the createMany that follows is their whole new contents; rings
// absent from the body keep theirs. Scoped by ring *and* id, so a cross-ring drag can't collide.
async function clearRings(
  tx: Prisma.TransactionClient,
  ringIds: string[],
  writing: string[],
): Promise<void> {
  await tx.eventOrder.deleteMany({
    where: { OR: [{ ring_id: { in: ringIds } }, { id: { in: writing } }] },
  });
}

// OrganizerOrderView retrieve: the saved order for the current comp_year, served
// from the Data Cache (getOrderForSettings) behind the organizer gate.
export async function getOrganizerOrder(): Promise<OrderDTO | null> {
  const { error } = await organizerGate();
  if (error) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  return getOrderForSettings(settings.id);
}

// OrganizerOrderView create/update: stamp the current year's settings row as
// having a saved order and rewrite whichever rings were provided.
export async function saveOrder(body: OrderBody): Promise<Mutation<OrderDTO>> {
  const { error } = await organizerGate();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;
  const rings: RingKey[] = ["ring1", "ring2", "ring3"];

  // Rings omitted from the body are left untouched.
  const present = rings.filter((r) => body[r] !== undefined);

  try {
    await prisma.$transaction(
      async (tx) => {
        // Marks the year's order as saved — the null this clears is what the
        // reads treat as "no order yet", the way a missing Order row used to.
        await tx.settings.update({
          where: { id: settings.id },
          data: { order_updated_at: new Date() },
        });
        if (present.length === 0) return;

        const ringIds = await ensureRings(tx, present, settings.id);
        const listed = present.map((r) => ({ ringId: ringIds.get(r)!, items: body[r]! }));

        // What the supplied slots already hold, for every ring at once — the merge
        // in planSave needs the stored columns, not just which ids exist.
        const suppliedIds = listed.flatMap(({ items }) =>
          items.map((i) => i.id).filter((id): id is string => !!id),
        );
        const stored = new Map<string, SlotFields>(
          suppliedIds.length
            ? (
                await tx.eventOrder.findMany({
                  where: { id: { in: suppliedIds } },
                  select: SLOT_SELECT,
                })
              ).map((r) => [r.id, r])
            : [],
        );

        const plan = planSave(listed, stored, year);
        const carried = await carryRosters(tx, plan);
        const comps = competitorRows(plan, carried);

        // The listed rings are replaced rather than reconciled row by row: per-slot updates cost
        // round trips proportional to the schedule. Client-supplied ids survive the rewrite.
        await clearRings(tx, [...ringIds.values()], plan.slots.map((s) => s.id));
        if (plan.slots.length) await tx.eventOrder.createMany({ data: plan.slots });
        if (comps.length) await tx.competitorOrder.createMany({ data: comps });
      },
      // A save is a fixed handful of statements whatever the schedule's size, so this is headroom
      // rather than a budget the work grows into — the 5s default left no room for a slow link.
      { timeout: 20_000, maxWait: 10_000 },
    );
  } catch (err) {
    // The whole save is one transaction, so a failure here left nothing written
    // and the tag below must not be dropped — the cached order is still current.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: { detail: "An event or competitor in this order no longer exists. Reload and try again." } };
    }
    return { error: actionError("saveOrder", err, "Could not save the event order.") };
  }

  updateTag(orderTag(settings.id));

  try {
    const saved = await prisma.settings.findUnique({ where: { id: settings.id }, include: ORDER_INCLUDE });
    if (!saved) return { error: { detail: "Failed to save order." } };
    return { data: shapeOrder(saved) };
  } catch (err) {
    // The save itself committed; only reading it back failed. Say so, so the
    // organizer doesn't re-save work that is already persisted.
    return { error: actionError("saveOrder:readBack", err, "The order was saved, but could not be reloaded. Refresh to see it.") };
  }
}

// Publish / unpublish this year's order, a flag on Settings (order_public). Returns the flag as
// the server stored it; no `include`, which would force an interactive transaction (WebSocket).
export async function setOrderPublic(value: boolean): Promise<Mutation<{ order_public: boolean } | null>> {
  const { error } = await organizerGate();
  if (error) return { error };
  const existing = await loadSettings();
  if (!existing) return { error: { detail: "No settings have been created yet." } };
  try {
    const s = await prisma.settings.update({
      where: { id: existing.id },
      data: { order_public: value },
      select: { order_public: true },
    });
    updateTag("settings");
    return { data: s };
  } catch (err) {
    return { error: actionError("setOrderPublic", err, `Could not ${value ? "publish" : "unpublish"} the order.`) };
  }
}

// ---------- Google Sheets export ----------

// The grid comes off the client, so it is bounded here before it reaches the API. Nothing
// legitimate approaches these — past them is a client bug or someone poking the action directly.
const MAX_TABS = 6;
const MAX_ROWS = 2_000;
const MAX_COLS = 26;
const MAX_CELL = 500;

// Sheets rejects : \ / ? * [ ] in a tab title and caps it at 100 characters.
function sheetTitle(raw: unknown, index: number): string {
  const cleaned = typeof raw === "string" ? raw.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 80) : "";
  return cleaned || `Ring ${index + 1}`;
}

// Two tabs with the same title would make addSheet fail on the second, and sanitising can collapse
// two distinct titles into one, so uniqueness is enforced here rather than trusted.
function uniqueTitle(title: string, taken: Set<string>): string {
  if (!taken.has(title)) return title;
  for (let n = 2; ; n++) {
    const candidate = `${title} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}

// One cell, bounded. Drops anything unusable rather than rejecting the whole export — a stray cell
// isn't worth the schedule. A formula passes through; the cap is about payload size only.
function cleanCell(cell: Cell): Cell {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : "";
  if (typeof cell === "string") return cell.slice(0, MAX_CELL);
  if (isFormulaCell(cell)) {
    const expression = cell.formula.slice(0, MAX_CELL);
    return expression ? { formula: expression } : "";
  }
  return "";
}

function cleanTabs(body: SheetExportBody): SheetTabData[] {
  const taken = new Set<string>();
  return (body.tabs ?? []).slice(0, MAX_TABS).map((tab, index) => {
    const title = uniqueTitle(sheetTitle(tab.title, index), taken);
    taken.add(title);
    const rows = (Array.isArray(tab.rows) ? tab.rows : [])
      .slice(0, MAX_ROWS)
      .map((row) => (Array.isArray(row) ? row : []).slice(0, MAX_COLS).map(cleanCell));
    return { title, rows };
  });
}

// Pushes a built grid into this year's spreadsheet, one tab per ring, serving both exports. Reads
// no order rows and runs no maths — it gates, resolves the destination from Settings, and bounds.
export async function exportSheetTabs(body: SheetExportBody): Promise<Mutation<{ url: string }>> {
  const { error } = await organizerGate();
  if (error) return { error };

  // No service account configured is a deployment state, not a failure to log —
  // say so plainly rather than reporting a broken export.
  if (!sheetsCredentials()) {
    return { error: { detail: "The Google Sheets export is not configured on this deployment." } };
  }

  // Settings.scoring_url doubles as the export target: one per-year spreadsheet link, so a new
  // year is a Settings edit rather than a redeploy. Comes from the cached settings read.
  const settings = await loadSettings();
  const spreadsheetId = spreadsheetIdFromUrl(settings?.scoring_url);
  if (!spreadsheetId) {
    return {
      error: {
        detail: settings?.scoring_url
          ? "The Scoring Link in Settings is not a Google Sheets link. Paste the sheet's normal address, not a published-to-web one."
          : "No spreadsheet is set for this year. Paste the sheet's link into the Scoring Link field in Settings.",
      },
    };
  }

  const tabs = cleanTabs(body).filter((tab) => tab.rows.length > 0);
  if (tabs.length === 0) return { error: { detail: "There is nothing to export yet." } };

  try {
    const url = await writeSheetTabs(spreadsheetId, tabs);
    return { data: { url } };
  } catch (err) {
    // A partial write is possible — tabs are added, cleared, then filled — so the
    // message points the organizer at the sheet instead of implying nothing moved.
    return { error: actionError("exportSheetTabs", err, "Could not write to Google Sheets. Check the sheet before re-exporting.") };
  }
}

// CompetitorOrderView: this year's order, but only when settings have publishing
// enabled. Shares the cached per-year read with the organizer path.
export async function getPublicOrder(): Promise<OrderDTO | null> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return null;
  const settings = await loadSettings();
  if (!settings || !settings.order_public) return null;
  const order = await getOrderForSettings(settings.id);
  return order ?? null;
}
