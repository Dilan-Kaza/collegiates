"use server";

// Event-order server actions: read/save the ring order for the current year,
// plus publish/unpublish and the public competitor-facing read.
//
// Order/EventOrder include shapes live in lib/api (ORDER_INCLUDE) so the query
// shape and its shaper stay together and are shared with the cached reader.

import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, isCompetitor } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { shapeSettings, shapeOrder, ORDER_INCLUDE } from "@/lib/api";
import type { SettingsDTO, OrderDTO } from "@/lib/api";
import { getOrderByYear } from "../data";
import { requireOrganizer } from "./shared";
import type { Mutation, OrderBody, RingKey, EventOrderInput, EventOrderCompetitorInput } from "./shared";

// EventOrderSerializer._sync_competitors: upsert each provided competitor's
// CompetitorOrder, then drop any that are no longer listed. (CompetitorOrder has
// no DB unique constraint, matching Django, so this emulates update_or_create.)
async function syncCompetitors(
  tx: Prisma.TransactionClient,
  eventOrderId: string,
  comps: EventOrderCompetitorInput[],
): Promise<void> {
  const keep: string[] = [];
  for (const item of comps) {
    if (!item.id) continue;
    const existing = await tx.competitorOrder.findFirst({
      where: { event_order_id: eventOrderId, competitor_id: item.id },
      select: { id: true },
    });
    if (existing) {
      await tx.competitorOrder.update({ where: { id: existing.id }, data: { order: item.order ?? 0 } });
    } else {
      await tx.competitorOrder.create({
        data: { event_order_id: eventOrderId, competitor_id: item.id, order: item.order ?? 0 },
      });
    }
    keep.push(item.id);
  }
  await tx.competitorOrder.deleteMany({
    where: { event_order_id: eventOrderId, competitor_id: { notIn: keep } },
  });
}

// EventOrderRelatedField.to_internal_value: an item with an `id` updates that
// EventOrder in place; an item without one is created fresh (new uuid, comp_year
// from settings). Every slot is written owned by `ringId`, which also moves a
// slot dragged between rings. Returns the persisted EventOrder id either way.
async function persistEventOrder(
  tx: Prisma.TransactionClient,
  item: EventOrderInput,
  year: number,
  ringId: string,
): Promise<string> {
  const comps = item.competitor_list;

  if (item.id) {
    const existing = await tx.eventOrder.findUnique({ where: { id: item.id }, select: { id: true } });
    if (existing) {
      const data: Prisma.EventOrderUncheckedUpdateInput = { ring_id: ringId };
      if (item.event_id !== undefined) data.event_id = item.event_id;
      if (item.name !== undefined) data.name = item.name;
      if (item.break_length !== undefined) data.break_length = item.break_length;
      if (item.order !== undefined) data.order = item.order;
      await tx.eventOrder.update({ where: { id: item.id }, data });
      if (comps !== undefined) await syncCompetitors(tx, item.id, comps);
      return item.id;
    }
    // id supplied but the row is gone — recreate it with the same id so the
    // client-provided reference stays stable.
    await tx.eventOrder.create({
      data: {
        id: item.id,
        comp_year: year,
        ring_id: ringId,
        event_id: item.event_id ?? null,
        break_length: item.break_length ?? 0,
        name: item.name ?? null,
        order: item.order ?? 0,
      },
    });
    if (comps !== undefined) await syncCompetitors(tx, item.id, comps);
    return item.id;
  }

  const created = await tx.eventOrder.create({
    data: {
      id: crypto.randomUUID(),
      comp_year: year,
      ring_id: ringId,
      event_id: item.event_id ?? null,
      break_length: item.break_length ?? 0,
      name: item.name ?? null,
      order: item.order ?? 0,
    },
    select: { id: true },
  });
  await syncCompetitors(tx, created.id, comps ?? []);
  return created.id;
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

// Drop the slots that used to be in this ring but are no longer listed (Django
// M2M `.set()`). Cascades clear their CompetitorOrder rows. An empty `keep`
// clears the ring — Prisma treats `notIn: []` as matching every row.
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
      const ids: string[] = [];
      for (const item of items) ids.push(await persistEventOrder(tx, item, year, ringId));
      await pruneRing(tx, ringId, ids);
    }
  });

  revalidateTag(`order-${year}`);

  const saved = await prisma.order.findUnique({ where: { comp_year: year }, include: ORDER_INCLUDE });
  if (!saved) return { error: { detail: "Failed to save order." } };
  return { data: shapeOrder(saved) };
}

// Publish / unpublish the event order for the current year. Publicity now lives
// on Settings (order_public), so this flips that single flag rather than the
// Order row. Returns the updated settings so the UI can reflect the new state.
export async function setOrderPublic(value: boolean): Promise<Mutation<SettingsDTO | null>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const existing = await loadSettings();
  if (!existing) return { error: { detail: "No settings have been created yet." } };
  const s = await prisma.settings.update({
    where: { id: existing.id },
    data: { order_public: value },
    include: { host: true },
  });
  revalidateTag("settings");
  return { data: shapeSettings(s) };
}

// CompetitorOrderView: the published (public) order for the current year, if any.
// Publicity now lives on Settings (order_public), so a public order is one that
// exists AND whose year's settings have publishing enabled. Shares the cached
// per-year read so the entry can be reused by both organizer and competitor paths.
export async function getPublicOrder(): Promise<OrderDTO | null> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return null;
  const settings = await loadSettings();
  if (!settings || !settings.order_public) return null;
  const order = await getOrderByYear(settings.reg_year);
  return order ?? null;
}
