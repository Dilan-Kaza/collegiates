"use server";

// Competitor server actions: the current competitor's events, registrations,
// and group set (read + create/join).

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, isCompetitor } from "@/lib/auth";
import { loadSettings, regActive } from "@/lib/settings";
import { shapeEvent, shapeRegistration, shapeGroupset, fromGender, fromSkillLevel } from "@/lib/api";
import type { EventDTO, RegistrationDTO, GroupsetDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_EVENTS, TAG_REGISTRATIONS, TAG_GROUPSETS,
  userDataTag, groupsetTag, revalidateUserData, reRegistration, reGroupset,
} from "./shared";
import type { Mutation, RegistrationItem } from "./shared";

export async function getCompetitorEvents(): Promise<EventDTO[]> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return [];
  // Keyed by (level, gender), the query's only inputs, so a profile change just
  // moves keys. Key uses the legacy codes; the query uses Prisma's enum members.
  const skillLevel = user.competitor_profile?.skill_level ?? null;
  const gender = user.competitor_profile?.gender ?? null;
  const levelCode = fromSkillLevel(skillLevel) ?? "";
  const genderCode = fromGender(gender) ?? "";
  return unstable_cache(
    async (): Promise<EventDTO[]> => {
      const events = await prisma.event.findMany({
        where: { event_level: skillLevel, gender_category: gender },
      });
      return events.map(shapeEvent);
    },
    ["competitor-events", levelCode, genderCode],
    { tags: [TAG_EVENTS], revalidate: READ_CACHE_TTL },
  )();
}

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

export async function createRegistrations(items: RegistrationItem[]): Promise<Mutation<RegistrationDTO[]>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { event: "Competition settings have not been set" } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  if (!Array.isArray(items) || items.length === 0) return { error: { event: "No data" } };

  const codes = items.map((i) => i.event_code);
  if (new Set(codes).size !== codes.length) return { error: { event: "Duplicate events are not allowed." } };

  const year = settings.reg_year;

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
    if (event.gender_category !== (user.competitor_profile?.gender ?? null)) return { error: { event: "Competitor signed up for wrong gender category" } };
    if (event.event_level !== (user.competitor_profile?.skill_level ?? null)) return { error: { event: "Competitor signed up for wrong level" } };
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
}

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

export async function createGroupset(body: { team_name: string }): Promise<Mutation<GroupsetDTO>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  const year = settings.reg_year;

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
}

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

export async function joinGroupset(body: { groupset: string }): Promise<Mutation<GroupsetDTO>> {
  const user = await getCurrentUser();
  if (!user || !isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  if (!regActive(settings)) return { error: { detail: "Registration is not active" } };
  const year = settings.reg_year;

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
}
