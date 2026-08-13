"use server";

/**
 * Competitor-facing server actions: eligible events, registrations, and group
 * sets.
 *
 * @remarks
 * Every action here is scoped to the signed-in competitor and the current
 * competition year — none takes a user id, so none can be pointed at somebody
 * else's data.
 *
 * @packageDocumentation
 */

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import type { StudentType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, isCompetitor } from "@/lib/auth";
import { loadSettings, regActive } from "@/lib/settings";
import { shapeEvent, shapeRegistration, shapeGroupset, fromGender, fromSkillLevel, isClassOne } from "@/lib/api";
import type { EventDTO, RegistrationDTO, GroupsetDTO } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { registrationConfirmedEmail } from "@/lib/email-templates";
import {
  READ_CACHE_TTL, TAG_EVENTS, TAG_REGISTRATIONS, TAG_GROUPSETS,
  userDataTag, groupsetTag, revalidateUserData, reRegistration, reGroupset, actionError,
} from "./shared";
import type { Mutation } from "./shared";
import type { RegEventItem } from "@/types";

/**
 * The events this competitor may register for.
 *
 * @remarks
 * Filtered to their own skill level and gender category — the eligibility rule
 * `createRegistrations` enforces on the way in, applied here so an ineligible
 * event is never offered in the first place.
 *
 * Group-set events carry neither level nor gender, so they never match that
 * slice. Class 1 competitors get them through a second branch; Class 2 stays a
 * single branch, since the team competition is not open to them.
 *
 * Cached by `(level, gender, class)` — the query's only inputs — so a profile
 * change moves to a different key rather than needing an invalidation.
 *
 * @returns The eligible events, or `[]` for a non-competitor.
 */
export async function getCompetitorEvents(): Promise<EventDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  // The cache key uses the legacy codes; the query uses Prisma's enum members.
  const skillLevel = user.competitor_profile?.skill_level ?? null;
  const gender = user.competitor_profile?.gender ?? null;
  const levelCode = fromSkillLevel(skillLevel) ?? "";
  const genderCode = fromGender(gender) ?? "";
  const classOne = isClassOne(user.competitor_profile?.student_type);
  return unstable_cache(
    async (): Promise<EventDTO[]> => {
      const events = await prisma.event.findMany({
        where: classOne
          ? { OR: [{ event_level: skillLevel, gender_category: gender }, { event_category: "Groupset" }] }
          : { event_level: skillLevel, gender_category: gender },
      });
      return events.map(shapeEvent);
    },
    ["competitor-events", levelCode, genderCode, classOne ? "1" : "2"],
    { tags: [TAG_EVENTS], revalidate: READ_CACHE_TTL },
  )();
}

/**
 * This competitor's registrations for the current competition year.
 *
 * @returns The registrations, or `[]` for a non-competitor or before a
 * competition year exists.
 */
export async function getRegistrations(): Promise<RegistrationDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const userId = user.user_id;
  const year = settings.reg_year;
  const regs = await unstable_cache(
    async (): Promise<RegistrationDTO[]> => {
      const rows = await prisma.registration.findMany({
        where: { competitor_id: userId, comp_year: year },
        include: { event: true },
      });
      return rows.map(shapeRegistration);
    },
    ["my-registrations", userId, String(year)],
    { tags: [userDataTag(userId)], revalidate: READ_CACHE_TTL },
  )();
  return regs.map(reRegistration);
}

/**
 * Registers the competitor for a set of events, in one transaction.
 *
 * @remarks
 * All-or-nothing: the whole batch is validated first, and any failure rejects
 * the submission rather than writing part of it.
 *
 * Each event is checked against the competitor's own profile — gender category
 * and skill level must match exactly. Group-set events have neither, so Class 1
 * eligibility gates them instead, mirroring {@link getCompetitorEvents}.
 *
 * Registering also flips `is_competing`, and sends a confirmation email on a
 * best-effort basis: a delivery failure is logged, never allowed to fail a
 * registration that already succeeded.
 *
 * @param items - Event codes, each with an optional nandu difficulty string.
 * @returns The created registrations, shaped from what was written — the write
 * is not followed by a read-back. Or field errors, including a duplicate that
 * raced past the pre-check onto the unique index.
 */
export async function createRegistrations(items: RegEventItem[]): Promise<Mutation<RegistrationDTO[]>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { event: "Competition settings have not been set" } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  if (!Array.isArray(items) || items.length === 0) return { error: { event: "No data" } };

  const codes = items.map((i) => i.event_code);
  if (new Set(codes).size !== codes.length) return { error: { event: "Duplicate events are not allowed." } };

  const year = settings.reg_year;

  try {
    // Catalogue slice and the competitor's existing rows for those events in one
    // round trip, replacing the per-event lookup + duplicate check (2N queries).
    const [events, existing] = await Promise.all([
      prisma.event.findMany({ where: { event_code: { in: codes } } }),
      prisma.registration.findMany({
        where: { competitor_id: user.user_id, comp_year: year, event_code: { in: codes } },
        select: { event_code: true },
      }),
    ]);
    const eventByCode = new Map(events.map((e) => [e.event_code, e]));
    const alreadyRegistered = new Set(existing.map((r) => r.event_code));

    // date_created is stamped here rather than left to the column default so the
    // created rows can be shaped into DTOs without reading them back.
    const date_created = new Date();
    const toCreate: Prisma.RegistrationCreateManyInput[] = [];
    for (const item of items) {
      const event = eventByCode.get(item.event_code);
      if (!event) return { error: { event: `Event with id ${item.event_code} does not exist.` } };
      // A groupset event has no level or gender to match against — Class 1
      // eligibility is what gates it, mirroring getCompetitorEvents.
      if (event.event_category === "Groupset") {
        if (!isClassOne(user.competitor_profile?.student_type)) return { error: { event: "Only Class 1 competitors are eligible for the team event" } };
      } else {
        if (event.gender_category !== (user.competitor_profile?.gender ?? null)) return { error: { event: "Competitor signed up for wrong gender category" } };
        if (event.event_level !== (user.competitor_profile?.skill_level ?? null)) return { error: { event: "Competitor signed up for wrong level" } };
      }
      if (alreadyRegistered.has(event.event_code)) return { error: { event: "You are already registered for this event." } };
      toCreate.push({ competitor_id: user.user_id, event_code: event.event_code, comp_year: year, nandu_str: item.nandu_str ?? "", date_created });
    }

    await prisma.$transaction([
      prisma.registration.createMany({ data: toCreate }),
      prisma.user.update({
        where: { user_id: user.user_id },
        data: { competitor_profile: { upsert: { create: { is_competing: true }, update: { is_competing: true } } } },
      }),
    ]);
    revalidateUserData(user.user_id);
    updateTag(TAG_REGISTRATIONS); // organizer registration lists include this competitor now

    // Best-effort: a delivery failure shouldn't fail a registration that already
    // succeeded in the database.
    try {
      const eventNames = items.map((item) => {
        const event = eventByCode.get(item.event_code)!;
        return event.event_name ?? event.event_code;
      });
      await sendEmail(user.email, registrationConfirmedEmail(eventNames));
    } catch (err) {
      console.error("Failed to send registration confirmation email", err);
    }

    // Shaped from the rows we just wrote plus the events already in hand, so the
    // write isn't followed by a read-back query.
    return {
      data: items.map((item) =>
        shapeRegistration({
          id: 0n,
          competitor_id: user.user_id,
          event_code: item.event_code,
          comp_year: year,
          nandu_str: item.nandu_str ?? "",
          date_created,
          event: eventByCode.get(item.event_code)!,
        }),
      ),
    };
  } catch (err) {
    // The "already registered" check above isn't atomic with the insert; a double
    // submit races through it and lands on the unique index instead.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { event: "You are already registered for one of these events." } };
    }
    return { error: actionError("createRegistrations", err, "Could not save your registration.") };
  }
}

// The team competition is Class 1 only (rules V), so create and join both reject a Class 2
// student type. Returns the message to hand back, or null when the competitor is eligible.
function classOneError(user: { competitor_profile: { student_type: StudentType | null } | null }): string | null {
  const studentType = user.competitor_profile?.student_type ?? null;
  if (!studentType) return "Set your student type in your profile before joining the team competition";
  if (!isClassOne(studentType)) return "Only Class 1 competitors are eligible for the team competition";
  return null;
}

/**
 * The competitor's group set for the current year.
 *
 * @returns An array, though a competitor may be on at most one team per year —
 * the shape matches what the dashboard binds. `[]` when they are on none.
 */
export async function getMyGroupset(): Promise<GroupsetDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const userId = user.user_id;
  const year = settings.reg_year;
  const groupsets = await unstable_cache(
    async (): Promise<GroupsetDTO[]> => {
      const rows = await prisma.groupset.findMany({
        where: { comp_year: year, members: { some: { member_id: userId } } },
        include: { school: true, members: { include: { member: { include: { user: true } } } } },
      });
      return rows.map(shapeGroupset);
    },
    ["my-groupset", userId, String(year)],
    { tags: [userDataTag(userId), TAG_GROUPSETS], revalidate: READ_CACHE_TTL },
  )();
  return groupsets.map(reGroupset);
}

/**
 * Creates a group set with the competitor as its leader.
 *
 * @remarks
 * Only while registration is open, and only for Class 1 competitors (rules V).
 * The team inherits the creator's school, so they must have one set; a
 * competitor may be on at most one team per year, and the team name must be
 * unique within the year.
 *
 * @param body - Carries `team_name`, which must be unique within the year.
 * @returns The created group set, or a field error.
 */
export async function createGroupset(body: { team_name: string }): Promise<Mutation<GroupsetDTO>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  const year = settings.reg_year;
  const ineligible = classOneError(user);
  if (ineligible) return { error: { groupset: ineligible } };
  if (!body.team_name?.trim()) return { error: { groupset: "A team name is required" } };

  try {
    const alreadyIn = await prisma.groupsetMember.findFirst({
      where: { member_id: user.user_id, groupset: { comp_year: year } }, select: { id: true },
    });
    if (alreadyIn) return { error: { groupset: "You are already in a groupset" } };

    const nameTaken = await prisma.groupset.findFirst({ where: { team_name: body.team_name, comp_year: year }, select: { groupset_id: true } });
    if (nameTaken) return { error: { groupset: "A groupset with this name already exists" } };
    const schoolId = user.competitor_profile?.school_id;
    if (!schoolId) return { error: { groupset: "You must belong to a school to create a groupset" } };

    const groupset = await prisma.groupset.create({
      data: {
        team_name: body.team_name,
        school_id: schoolId,
        comp_year: year,
        members: { create: [{ member_id: user.user_id, leader: true }] },
      },
      include: { school: true, members: { include: { member: { include: { user: true } } } } },
    });
    // The group set is bundled into the creator's getMe payload, so refresh it.
    revalidateUserData(user.user_id);
    updateTag(TAG_GROUPSETS); // new group set appears in joinable/organizer lists
    return { data: shapeGroupset(groupset) };
  } catch (err) {
    // Same race as the name check above, resolved by the unique index.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { groupset: "A groupset with this name already exists" } };
    }
    return { error: actionError("createGroupset", err, "Could not create the groupset.") };
  }
}

/**
 * The teams this competitor could join: their own school's, this year.
 *
 * @returns The group sets, or `[]` when they have no school set — the team
 * competition is contested by schools, so an unaffiliated competitor has none.
 */
export async function getJoinableGroupsets(): Promise<GroupsetDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const schoolId = user.competitor_profile?.school_id;
  if (!schoolId) return [];
  const year = settings.reg_year;
  const groupsets = await unstable_cache(
    async (): Promise<GroupsetDTO[]> => {
      const rows = await prisma.groupset.findMany({
        where: { school_id: schoolId, comp_year: year },
        include: { school: true, members: { include: { member: { include: { user: true } } } } },
      });
      return rows.map(shapeGroupset);
    },
    ["joinable-groupsets", schoolId, String(year)],
    { tags: [TAG_GROUPSETS], revalidate: READ_CACHE_TTL },
  )();
  return groupsets.map(reGroupset);
}

/**
 * Joins an existing group set as an ordinary member.
 *
 * @remarks
 * The same rules as {@link createGroupset} — registration open, Class 1 only,
 * one team per year — plus the team having to be from the competitor's own
 * school and in the current year.
 *
 * @param body - Carries `groupset`, the target group set's id.
 * @returns The joined group set, or a field error.
 */
export async function joinGroupset(body: { groupset: string }): Promise<Mutation<GroupsetDTO>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  const year = settings.reg_year;
  const ineligible = classOneError(user);
  if (ineligible) return { error: { groupset: ineligible } };
  if (!body.groupset) return { error: { groupset: "Please choose a groupset to join" } };

  try {
    // The target group set and the "already in a group set this year" check are
    // independent, so they go out together.
    const [groupset, alreadyIn] = await Promise.all([
      prisma.groupset.findUnique({ where: { groupset_id: body.groupset }, include: { members: true } }),
      prisma.groupsetMember.findFirst({ where: { member_id: user.user_id, groupset: { comp_year: year } }, select: { id: true } }),
    ]);
    if (!groupset) return { error: { groupset: "Groupset does not exist" } };
    if (groupset.comp_year !== year) return { error: { groupset: "Groupset is not in current registration year" } };
    if (groupset.school_id !== user.competitor_profile?.school_id) return { error: { groupset: "You must sign up for a groupset from your school" } };
    if (groupset.members.some((m) => m.member_id === user.user_id)) return { error: { groupset: "You are already registered with this groupset" } };
    if (alreadyIn) return { error: { groupset: "You are already in a groupset" } };
    if (groupset.members.length >= 6) return { error: { groupset: "Groupset is full" } };

    // The insert returns the updated roster through its own select, so there is no
    // read-back query after the write.
    const joined = await prisma.groupsetMember.create({
      data: { groupset_id: groupset.groupset_id, member_id: user.user_id, leader: false },
      select: {
        groupset: { include: { school: true, members: { include: { member: { include: { user: true } } } } } },
      },
    });
    // The member list is bundled into every member's getMe payload, so refresh
    // the joiner and the existing members alike.
    revalidateUserData(user.user_id);
    for (const m of groupset.members) revalidateUserData(m.member_id);
    updateTag(TAG_GROUPSETS); // roster change shows in joinable/organizer lists
    updateTag(groupsetTag(groupset.groupset_id));
    return { data: shapeGroupset(joined.groupset) };
  } catch (err) {
    // Two competitors joining at once both clear the roster checks above; the
    // membership unique index is what actually settles it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { groupset: "You are already registered with this groupset" } };
    }
    return { error: actionError("joinGroupset", err, "Could not join the groupset.") };
  }
}
