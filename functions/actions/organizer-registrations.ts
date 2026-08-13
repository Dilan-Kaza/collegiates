"use server";

/**
 * Organizer server actions for competitor registrations: list, single read,
 * edit, and lookup by email.
 *
 * @remarks
 * These back the registrations and payments screens, where an organizer records
 * what has been paid, marks proof of enrollment, and corrects profile details
 * the competitor can no longer change themselves.
 *
 * @packageDocumentation
 */

import { unstable_cache, updateTag } from "next/cache";
import { Prisma, type StudentType, type Gender, type SkillLevel } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeOrganizerRegistration, toStudentType, toGender, toSkillLevel } from "@/lib/api";
import type { OrganizerRegistrationDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_REGISTRATIONS, userDataTag,
  organizerGate, revalidateUserData, reOrganizerRegistration, actionError,
} from "./shared";
import type { Mutation, OrganizerRegFilters, UpdateOrganizerRegBody } from "./shared";

// Returns the un-awaited PrismaPromise so callers can await it or append it to a $transaction
// batch. Scoped to Competitor accounts: a School or Admin user_id must not resolve here.
function loadOrganizerUser(userId: string, year: number) {
  return prisma.user.findFirst({
    where: { user_id: userId, user_type: "Competitor" },
    include: {
      competitor_profile: {
        include: {
          school: true,
          registration: { where: { comp_year: year }, include: { event: true } },
          groupset_member: { include: { groupset: true } },
        },
      },
    },
  });
}

/**
 * Every competitor's registration state for the current year, optionally
 * filtered.
 *
 * @param filters - Payment, proof-of-enrollment, competing, and school filters.
 * Omitted means unfiltered, which is the default organizer view.
 * @returns The competitors, or `[]` for a denied read.
 */
export async function getOrganizerRegistrations(filters: OrganizerRegFilters = {}): Promise<OrganizerRegistrationDTO[]> {
  const { error } = await organizerGate();
  if (error) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const year = settings.reg_year;

  // Each distinct filter combination is a distinct result set, so it gets its
  // own cache entry keyed by the (stable) filter signature.
  const filterKey = `${filters.paid ?? ""}|${filters.proof_of_reg ?? ""}|${filters.is_competing ?? ""}|${filters.school ?? ""}`;
  const users = await unstable_cache(
    async (): Promise<OrganizerRegistrationDTO[]> => {
      // Registrations and the competing/paid/proof/school filters all live on the
      // profile, so the whole predicate goes through competitor_profile.
      const profileFilter: Prisma.CompetitorProfileWhereInput = {
        registration: { some: { comp_year: year } },
      };
      // amt_paid is an amount, so "paid" is anything above zero.
      if (filters.paid !== undefined) profileFilter.amt_paid = filters.paid ? { gt: 0 } : { lte: 0 };
      if (filters.proof_of_reg !== undefined) profileFilter.proof_of_reg = filters.proof_of_reg;
      if (filters.is_competing !== undefined) profileFilter.is_competing = filters.is_competing;
      if (filters.school) profileFilter.school_id = filters.school;
      const where: Prisma.UserWhereInput = { competitor_profile: { is: profileFilter } };
      const rows = await prisma.user.findMany({
        where: { ...where, user_type: "Competitor" },
        include: {
          competitor_profile: {
            include: {
              school: true,
              registration: { where: { comp_year: year }, include: { event: true } },
              groupset_member: { include: { groupset: true } },
            },
          },
        },
      });
      return rows.map((row) => shapeOrganizerRegistration(row, year));
    },
    ["organizer-registrations", String(year), filterKey],
    { tags: [TAG_REGISTRATIONS], revalidate: READ_CACHE_TTL },
  )();
  return users.map(reOrganizerRegistration);
}

/**
 * One competitor's registration state.
 *
 * @remarks
 * Tagged with the target's own user-data tag, so this view drops in step with
 * their dashboard whenever their registration changes.
 *
 * @param uuid - The competitor's user id.
 * @returns The competitor, or `null` for a denied read or an id that is not a
 * competitor account.
 */
export async function getOrganizerRegistration(uuid: string): Promise<OrganizerRegistrationDTO | null> {
  const { error } = await organizerGate();
  if (error) return null;
  const settings = await loadSettings();
  if (!settings) return null;
  const year = settings.reg_year;
  // Tagged with the target's user-data tag so the organizer view drops in step
  // with their own dashboard whenever their registration changes.
  const target = await unstable_cache(
    async (): Promise<OrganizerRegistrationDTO | null> => {
      const t = await loadOrganizerUser(uuid, year);
      return t ? shapeOrganizerRegistration(t, year) : null;
    },
    ["organizer-registration", uuid, String(year)],
    { tags: [userDataTag(uuid), TAG_REGISTRATIONS], revalidate: READ_CACHE_TTL },
  )();
  return target ? reOrganizerRegistration(target) : null;
}

/**
 * Edits a competitor's registrations, payment state, and profile.
 *
 * @remarks
 * The organizer's counterpart to the competitor's own screens, and deliberately
 * less restricted: the profile fields freeze for a competitor once they hold a
 * registration, but an organizer can correct them at any time.
 *
 * `amt_paid` is a **total, not a delta** — the organizer types the figure they
 * have on record and it replaces whatever was stored.
 *
 * Supplying `registration_input` replaces the competitor's registrations for the
 * year wholesale. Omitting it leaves them alone.
 *
 * @param uuid - The competitor's user id. A School or Admin id is rejected
 * rather than having a competitor profile written onto it.
 * @param body - The fields to change; every one is optional.
 * @returns The updated competitor, or field errors.
 */
export async function updateOrganizerRegistration(
  uuid: string,
  body: UpdateOrganizerRegBody
): Promise<Mutation<OrganizerRegistrationDTO>> {
  const { error } = await organizerGate();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;

  try {
    // Resolve the target before any write: this action edits competitor rows, so a School or Admin
    // user_id must be rejected rather than have a competitor profile written onto it.
    const isCompetitorTarget = await prisma.user.findFirst({
      where: { user_id: uuid, user_type: "Competitor" },
      select: { user_id: true },
    });
    if (!isCompetitorTarget) return { error: { detail: "User not found." } };

    // Registration row edits; the profile write and read-back join this batch below.
    const regOps: Prisma.PrismaPromise<unknown>[] = [];

    // Profile columns for this save, merged into one upsert. Order matters: an
    // explicit is_competing overrides the implicit true that registering sets.
    const profileData: {
      is_competing?: boolean;
      amt_paid?: number;
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

    // These live on the profile; the upsert below creates one for a competitor without it when an
    // organizer records a payment or sets a flag. A negative amount is a typo, so it floors at zero.
    if (body.amt_paid !== undefined) profileData.amt_paid = Math.max(0, Math.round(body.amt_paid));
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
    return { data: shapeOrganizerRegistration(target, year) };
  } catch (err) {
    // An event_code the catalogue no longer has, or a school_id that was removed,
    // both arrive here as P2003 rather than being caught by a check above.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: { detail: "One of the selected events or the college is no longer available." } };
    }
    return { error: actionError("updateOrganizerRegistration", err, "Could not save the registration.") };
  }
}

/**
 * Finds one competitor by email address, for the organizer's lookup box.
 *
 * @remarks
 * Competitor-scoped like the rest of this module: it exists to pull a competitor
 * into the registration views, not to resolve arbitrary accounts. Matched
 * case-insensitively. Uncached, since it is a one-off lookup by a typed value.
 *
 * @param email - The address to look up.
 * @returns The competitor, or `null` for a denied read or no match.
 */
export async function findUserByEmail(email: string): Promise<OrganizerRegistrationDTO | null> {
  const { error } = await organizerGate();
  if (error) return null;
  const settings = await loadSettings();
  const year = settings?.reg_year;
  // Competitor-scoped like the rest of this file: the lookup exists to pull a
  // competitor into the registration views, not to resolve arbitrary accounts.
  const target = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" }, user_type: "Competitor" },
    include: {
      competitor_profile: {
        include: {
          school: true,
          registration:
            year != null ? { where: { comp_year: year }, include: { event: true } } : { include: { event: true } },
          groupset_member: { include: { groupset: true } },
        },
      },
    },
  });
  // `year` is undefined here when no settings exist yet, which teamForYear reads
  // as "no year to match" and answers with their most recent team.
  return target ? shapeOrganizerRegistration(target, year) : null;
}
