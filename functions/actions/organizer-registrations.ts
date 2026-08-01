"use server";

// Organizer server actions for competitor registrations: list, single read,
// edit, and lookup by email.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma, type StudentType, type Gender, type SkillLevel } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeOrganizerRegistration, toStudentType, toGender, toSkillLevel } from "@/lib/api";
import type { OrganizerRegistrationDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_REGISTRATIONS, userDataTag,
  requireOrganizer, revalidateUserData, reOrganizerRegistration,
} from "./shared";
import type { Mutation, OrganizerRegFilters, UpdateOrganizerRegBody } from "./shared";

// Returns the un-awaited PrismaPromise so callers can either await it directly
// or append it to a $transaction batch (see updateOrganizerRegistration).
function loadOrganizerUser(userId: string, year: number) {
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      competitor_profile: {
        include: { school: true, registration: { where: { comp_year: year }, include: { event: true } } },
      },
    },
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
      // Registrations and the competing/paid/proof/school filters all live on the
      // profile, so the whole predicate goes through competitor_profile.
      const profileFilter: Prisma.CompetitorProfileWhereInput = {
        registration: { some: { comp_year: year } },
      };
      if (filters.has_paid !== undefined) profileFilter.has_paid = filters.has_paid;
      if (filters.proof_of_reg !== undefined) profileFilter.proof_of_reg = filters.proof_of_reg;
      if (filters.is_competing !== undefined) profileFilter.is_competing = filters.is_competing;
      if (filters.school) profileFilter.school_id = filters.school;
      const where: Prisma.UserWhereInput = { competitor_profile: { is: profileFilter } };
      const rows = await prisma.user.findMany({
        where,
        include: {
          competitor_profile: {
            include: { school: true, registration: { where: { comp_year: year }, include: { event: true } } },
          },
        },
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

  // Registration row edits; the profile write and read-back join this batch below.
  const regOps: Prisma.PrismaPromise<unknown>[] = [];

  // Profile columns for this save, merged into one upsert. Order matters: an
  // explicit is_competing overrides the implicit true that registering sets.
  const profileData: {
    is_competing?: boolean;
    has_paid?: boolean;
    proof_of_reg?: boolean;
    gender?: Gender | null;
    skill_level?: SkillLevel | null;
    school_id?: string | null;
    student_type?: StudentType | null;
  } = {};

  const newReg = body.registration_input;
  if (Array.isArray(newReg)) {
    const events = newReg.map((r) => r.event);
    if (new Set(events).size !== events.length) return { error: { detail: "No duplicate events" } };

    const old = await prisma.registration.findMany({ where: { competitor_id: uuid, comp_year: year } });
    const oldEvents = new Set(old.map((r) => r.event_code));

    const toDelete = [...oldEvents].filter((e) => !events.includes(e));
    const toAdd = newReg.filter((r) => !oldEvents.has(r.event));
    const toUpdate = newReg.filter((r) => oldEvents.has(r.event) && r.nandu_str !== "");

    if (toDelete.length) regOps.push(prisma.registration.deleteMany({ where: { competitor_id: uuid, comp_year: year, event_code: { in: toDelete } } }));
    if (toAdd.length) regOps.push(prisma.registration.createMany({ data: toAdd.map((r) => ({ competitor_id: uuid, event_code: r.event, nandu_str: r.nandu_str ?? "", comp_year: year })) }));
    for (const r of toUpdate) regOps.push(prisma.registration.updateMany({ where: { competitor_id: uuid, comp_year: year, event_code: r.event }, data: { nandu_str: r.nandu_str } }));
    profileData.is_competing = true;
  }

  // These flags live on the profile; the upsert below means a competitor without
  // one still gets it created when an organizer sets a flag.
  if (body.has_paid !== undefined) profileData.has_paid = body.has_paid;
  if (body.proof_of_reg !== undefined) profileData.proof_of_reg = body.proof_of_reg;
  if (body.is_competing !== undefined) profileData.is_competing = body.is_competing;

  // Competitor profile edits. Organizers may correct these at any time (no
  // registration lock, unlike the competitor-facing saveCompetitorProfile).
  if (body.skill_level !== undefined) profileData.skill_level = toSkillLevel(body.skill_level);
  if (body.gender !== undefined) profileData.gender = toGender(body.gender);
  if (body.school !== undefined) profileData.school_id = body.school || null;
  if (body.student_type !== undefined) profileData.student_type = toStudentType(body.student_type);

  const profileWrite = Object.keys(profileData).length
    ? prisma.user.update({
        where: { user_id: uuid },
        data: { competitor_profile: { upsert: { create: profileData, update: profileData } } },
      })
    : null;

  const readBack = loadOrganizerUser(uuid, year);
  let target: Awaited<typeof readBack>;
  if (regOps.length) {
    // Registration edits need a transaction anyway, so the profile write and
    // read-back ride along (array order, so the read sees every write).
    const results = await prisma.$transaction([...regOps, ...(profileWrite ? [profileWrite] : []), readBack]);
    target = results[results.length - 1] as Awaited<typeof readBack>;
  } else {
    // Nothing needs atomicity, so these stay plain single statements over HTTP
    // rather than opening a WebSocket session (see admin.ts).
    if (profileWrite) await profileWrite;
    target = await readBack;
  }

  // Organizer edits change the competitor's own dashboard payload; drop it.
  revalidateUserData(uuid);
  updateTag(TAG_REGISTRATIONS); // and the organizer registration lists
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
      competitor_profile: {
        include: {
          school: true,
          registration:
            year != null ? { where: { comp_year: year }, include: { event: true } } : { include: { event: true } },
        },
      },
    },
  });
  return target ? shapeOrganizerRegistration(target) : null;
}
