"use server";

// Event-order server actions: read/save this year's ring order, publish state,
// and the public read. Include shapes live in lib/api beside their shapers.

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, isCompetitor } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { shapeSettings, shapeOrder, ORDER_INCLUDE, SETTINGS_INCLUDE } from "@/lib/api";
import type { SettingsDTO, OrderDTO } from "@/lib/api";
import { getOrderByYear } from "../data";
import { requireOrganizer } from "./shared";
import type { Mutation, OrderBody, RingKey, EventOrderInput, EventOrderCompetitorInput } from "./shared";

// One slot's competitor list, resolved to the EventOrder id it belongs to.
interface CompetitorSlot {
  eventOrderId: string;
  comps: EventOrderCompetitorInput[];
}

// _sync_competitors batched across a ring: delete the rewritten slots' rows, then
// re-insert in one statement. Safe — a row's surrogate id never reaches the client.
async function syncRingCompetitors(
  tx: Prisma.TransactionClient,
  slots: CompetitorSlot[],
): Promise<void> {
  if (slots.length === 0) return;

  // Only the slots whose competitor list was actually provided are rewritten;
  // a slot that omitted `competitor_list` keeps whatever it had.
  await tx.competitorOrder.deleteMany({
    where: { event_order_id: { in: slots.map((s) => s.eventOrderId) } },
  });

  // Keyed by (slot, competitor) so a competitor listed twice in one slot
  // collapses to a single row, matching the old update_or_create behaviour.
  const rows = new Map<string, Prisma.CompetitorOrderCreateManyInput>();
  for (const slot of slots) {
    for (const comp of slot.comps) {
      if (!comp.id) continue;
      rows.set(`${slot.eventOrderId}:${comp.id}`, {
        event_order_id: slot.eventOrderId,
        competitor_id: comp.id,
        order: comp.order ?? 0,
      });
    }
  }
  if (rows.size) await tx.competitorOrder.createMany({ data: [...rows.values()] });
}

// to_internal_value for a whole ring: an existing `id` updates in place, anything
// else is created. All slots are owned by `ringId`, so cross-ring drags follow.
async function persistRing(
  tx: Prisma.TransactionClient,
  items: EventOrderInput[],
  year: number,
  ringId: string,
): Promise<string[]> {
  const suppliedIds = items.map((i) => i.id).filter((id): id is string => !!id);
  const existing = suppliedIds.length
    ? new Set(
        (
          await tx.eventOrder.findMany({
            where: { id: { in: suppliedIds } },
            select: { id: true },
          })
        ).map((r) => r.id),
      )
    : new Set<string>();

  const ids: string[] = [];
  const toCreate: Prisma.EventOrderCreateManyInput[] = [];
  const toUpdate: { id: string; data: Prisma.EventOrderUncheckedUpdateInput }[] = [];
  const compSlots: CompetitorSlot[] = [];

  for (const item of items) {
    const id = item.id ?? crypto.randomUUID();
    ids.push(id);

    if (item.id && existing.has(item.id)) {
      const data: Prisma.EventOrderUncheckedUpdateInput = { ring_id: ringId };
      if (item.event_id !== undefined) data.event_id = item.event_id;
      if (item.name !== undefined) data.name = item.name;
      if (item.break_length !== undefined) data.break_length = item.break_length;
      if (item.order !== undefined) data.order = item.order;
      toUpdate.push({ id, data });
      // An existing slot only has its roster rewritten when one was provided.
      if (item.competitor_list !== undefined) {
        compSlots.push({ eventOrderId: id, comps: item.competitor_list });
      }
    } else {
      toCreate.push({
        id,
        comp_year: year,
        ring_id: ringId,
        event_id: item.event_id ?? null,
        break_length: item.break_length ?? 0,
        name: item.name ?? null,
        order: item.order ?? 0,
      });
      compSlots.push({ eventOrderId: id, comps: item.competitor_list ?? [] });
    }
  }

  if (toCreate.length) await tx.eventOrder.createMany({ data: toCreate });
  // Each surviving slot carries its own payload, so these can't be collapsed
  // into an updateMany; there is one per slot, not one per competitor.
  for (const { id, data } of toUpdate) await tx.eventOrder.update({ where: { id }, data });
  await syncRingCompetitors(tx, compSlots);

  return ids;
}

// Each ring is a single Ring row per (order, ring_number); its slots hang off it
// via EventOrder.ring_id.
const RING_NUMBER: Record<RingKey, number> = { ring1: 1, ring2: 2, ring3: 3 };

// The Ring row for this year's `ring`, created on first save.
async function ensureRing(
  tx: Prisma.TransactionClient,
  ring: RingKey,
  year: number,
): Promise<string> {
  const ring_number = RING_NUMBER[ring];
  const row = await tx.ring.upsert({
    where: { order_id_ring_number: { order_id: year, ring_number } },
    create: { order_id: year, ring_number },
    update: {},
    select: { id: true },
  });
  return row.id;
}

// Drop slots no longer listed in this ring (Django M2M `.set()`); cascades clear
// their CompetitorOrder rows. Empty `keep` clears the ring (`notIn: []` matches all).
async function pruneRing(
  tx: Prisma.TransactionClient,
  ringId: string,
  keep: string[],
): Promise<void> {
  await tx.eventOrder.deleteMany({ where: { ring_id: ringId, id: { notIn: keep } } });
}

// OrganizerOrderView retrieve: the saved order for the current comp_year, served
// from the Data Cache (getOrderByYear) behind the organizer gate.
export async function getOrganizerOrder(): Promise<OrderDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  return getOrderByYear(settings.reg_year);
}

// OrganizerOrderView create/update: upsert the single Order for the current year
// (comp_year is its primary key) and rewrite whichever rings were provided.
export async function saveOrder(body: OrderBody): Promise<Mutation<OrderDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;
  const rings: RingKey[] = ["ring1", "ring2", "ring3"];

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: { comp_year: year },
      create: { comp_year: year },
      update: {},
    });

    for (const ring of rings) {
      const items = body[ring];
      if (items === undefined) continue; // ring omitted → leave it untouched
      const ringId = await ensureRing(tx, ring, year);
      const ids = await persistRing(tx, items, year, ringId);
      await pruneRing(tx, ringId, ids);
    }
  });

  updateTag(`order-${year}`);

  const saved = await prisma.order.findUnique({ where: { comp_year: year }, include: ORDER_INCLUDE });
  if (!saved) return { error: { detail: "Failed to save order." } };
  return { data: shapeOrder(saved) };
}

// Publish / unpublish this year's order. Publicity lives on Settings
// (order_public), so this flips that flag and returns the updated settings.
export async function setOrderPublic(value: boolean): Promise<Mutation<SettingsDTO | null>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const existing = await loadSettings();
  if (!existing) return { error: { detail: "No settings have been created yet." } };
  const s = await prisma.settings.update({
    where: { id: existing.id },
    data: { order_public: value },
    include: SETTINGS_INCLUDE,
  });
  updateTag("settings");
  return { data: shapeSettings(s) };
}

// CompetitorOrderView: this year's order, but only when settings have publishing
// enabled. Shares the cached per-year read with the organizer path.
export async function getPublicOrder(): Promise<OrderDTO | null> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return null;
  const settings = await loadSettings();
  if (!settings || !settings.order_public) return null;
  const order = await getOrderByYear(settings.reg_year);
  return order ?? null;
}
