"use server";

// Organizer server actions for competitor registrations: list, single read,
// edit, and lookup by email.

import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeOrganizerRegistration } from "@/lib/api";
import type { OrganizerRegistrationDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_REGISTRATIONS, userDataTag,
  requireOrganizer, revalidateUserData, reOrganizerRegistration,
} from "./shared";
import type { Mutation, OrganizerRegFilters, UpdateOrganizerRegBody } from "./shared";

function loadOrganizerUser(userId: string, year: number) {
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: { school: true, registration: { where: { comp_year: year }, include: { event: true } } },
  });
}

export async function getOrganizerRegistrations(filters: OrganizerRegFilters = {}): Promise<OrganizerRegistrationDTO[]> {
  const { error } = await requireOrganizer();
  if (error) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const year = settings.reg_year;

  // Each distinct filter combination is a distinct result set, so it gets its
  // own cache entry keyed by the (stable) filter signature.
  const filterKey = `${filters.has_paid ?? ""}|${filters.proof_of_reg ?? ""}|${filters.is_competing ?? ""}|${filters.school ?? ""}`;
  const users = await unstable_cache(
    async (): Promise<OrganizerRegistrationDTO[]> => {
      const where: Prisma.UserWhereInput = { registration: { some: { comp_year: year } } };
      if (filters.has_paid !== undefined) where.has_paid = filters.has_paid;
      if (filters.proof_of_reg !== undefined) where.proof_of_reg = filters.proof_of_reg;
      if (filters.is_competing !== undefined) where.is_competing = filters.is_competing;
      if (filters.school) where.school_id = filters.school;
      const rows = await prisma.user.findMany({
        where,
        include: { school: true, registration: { where: { comp_year: year }, include: { event: true } } },
      });
      return rows.map(shapeOrganizerRegistration);
    },
    ["organizer-registrations", String(year), filterKey],
    { tags: [TAG_REGISTRATIONS], revalidate: READ_CACHE_TTL },
  )();
  return users.map(reOrganizerRegistration);
}

export async function getOrganizerRegistration(uuid: string): Promise<OrganizerRegistrationDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  const year = settings.reg_year;
  // Tagged with the target's user-data tag so the organizer view drops in step
  // with their own dashboard whenever their registration changes.
  const target = await unstable_cache(
    async (): Promise<OrganizerRegistrationDTO | null> => {
      const t = await loadOrganizerUser(uuid, year);
      return t ? shapeOrganizerRegistration(t) : null;
    },
    ["organizer-registration", uuid, String(year)],
    { tags: [userDataTag(uuid), TAG_REGISTRATIONS], revalidate: READ_CACHE_TTL },
  )();
  return target ? reOrganizerRegistration(target) : null;
}

export async function updateOrganizerRegistration(
  uuid: string,
  body: UpdateOrganizerRegBody
): Promise<Mutation<OrganizerRegistrationDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;

  const newReg = body.registration_input;
  if (Array.isArray(newReg)) {
    const events = newReg.map((r) => r.event);
    if (new Set(events).size !== events.length) return { error: { detail: "No duplicate events" } };

    const old = await prisma.registration.findMany({ where: { competitor_id: uuid, comp_year: year } });
    const oldEvents = new Set(old.map((r) => r.event_code));

    const toDelete = [...oldEvents].filter((e) => !events.includes(e));
    const toAdd = newReg.filter((r) => !oldEvents.has(r.event));
    const toUpdate = newReg.filter((r) => oldEvents.has(r.event) && r.nandu_str !== "");

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (toDelete.length) ops.push(prisma.registration.deleteMany({ where: { competitor_id: uuid, comp_year: year, event_code: { in: toDelete } } }));
    if (toAdd.length) ops.push(prisma.registration.createMany({ data: toAdd.map((r) => ({ competitor_id: uuid, event_code: r.event, nandu_str: r.nandu_str ?? "", comp_year: year })) }));
    for (const r of toUpdate) ops.push(prisma.registration.updateMany({ where: { competitor_id: uuid, comp_year: year, event_code: r.event }, data: { nandu_str: r.nandu_str } }));
    ops.push(prisma.user.update({ where: { user_id: uuid }, data: { is_competing: true } }));
    await prisma.$transaction(ops);
  }

  const flags: Prisma.UserUpdateInput = {};
  if (body.has_paid !== undefined) flags.has_paid = body.has_paid;
  if (body.proof_of_reg !== undefined) flags.proof_of_reg = body.proof_of_reg;
  if (body.is_competing !== undefined) flags.is_competing = body.is_competing;
  if (Object.keys(flags).length) await prisma.user.update({ where: { user_id: uuid }, data: flags });

  // Organizer edits change the competitor's own dashboard payload; drop it.
  revalidateUserData(uuid);
  revalidateTag(TAG_REGISTRATIONS); // and the organizer registration lists
  const target = await loadOrganizerUser(uuid, year);
  if (!target) return { error: { detail: "User not found." } };
  return { data: shapeOrganizerRegistration(target) };
}

export async function findUserByEmail(email: string): Promise<OrganizerRegistrationDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const settings = await loadSettings();
  const year = settings?.reg_year;
  const target = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" } },
    include: {
      school: true,
      registration: year != null ? { where: { comp_year: year }, include: { event: true } } : { include: { event: true } },
    },
  });
  return target ? shapeOrganizerRegistration(target) : null;
}
