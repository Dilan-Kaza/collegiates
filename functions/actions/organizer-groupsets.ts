"use server";

// Organizer server actions for group sets: list, single read, and full CRUD.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeOrganizerGroupset } from "@/lib/api";
import type { OrganizerGroupsetDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_GROUPSETS, groupsetTag,
  requireOrganizer, revalidateUserData, reOrganizerGroupset,
} from "./shared";
import type { Mutation, CreateOrganizerGroupsetBody, UpdateOrganizerGroupsetBody } from "./shared";

// The event code every group-set member must be registered for. The school/members
// include stays inline per query — a shared Prisma.GroupsetInclude widens it away.
const GROUPSET_EVENT = "NAN901";

export async function getOrganizerGroupsets(): Promise<OrganizerGroupsetDTO[]> {
  const { error } = await requireOrganizer();
  if (error) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const year = settings.reg_year;
  const groupsets = await unstable_cache(
    async (): Promise<OrganizerGroupsetDTO[]> => {
      const rows = await prisma.groupset.findMany({ where: { comp_year: year }, include: { school: true, members: { include: { member: { include: { user: true } } } } } });
      return rows.map(shapeOrganizerGroupset);
    },
    ["organizer-groupsets", String(year)],
    { tags: [TAG_GROUPSETS], revalidate: READ_CACHE_TTL },
  )();
  return groupsets.map(reOrganizerGroupset);
}

export async function getOrganizerGroupset(uuid: string): Promise<OrganizerGroupsetDTO | null> {
  const { error } = await requireOrganizer();
  if (error) return null;
  const gs = await unstable_cache(
    async (): Promise<OrganizerGroupsetDTO | null> => {
      const g = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { school: true, members: { include: { member: { include: { user: true } } } } } });
      return g ? shapeOrganizerGroupset(g) : null;
    },
    ["organizer-groupset", uuid],
    { tags: [TAG_GROUPSETS, groupsetTag(uuid)], revalidate: READ_CACHE_TTL },
  )();
  return gs ? reOrganizerGroupset(gs) : null;
}

export async function createOrganizerGroupset(body: CreateOrganizerGroupsetBody): Promise<Mutation<OrganizerGroupsetDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;
  const members = body.members ?? [];

  if (new Set(members).size !== members.length) return { error: { groupset: "Duplicate members" } };
  if (members.length > 6) return { error: { groupset: "Number of members cannot exceed 6" } };

  // Every precondition in one round trip: name check plus one batched query per
  // member rule, replacing three sequential queries per member.
  const [nameTaken, taken, memberRows, registeredRows] = await Promise.all([
    prisma.groupset.findFirst({ where: { team_name: body.team_name, comp_year: year }, select: { groupset_id: true } }),
    prisma.groupsetMember.findMany({
      where: { member_id: { in: members }, groupset: { comp_year: year } },
      select: { member_id: true },
    }),
    prisma.user.findMany({
      where: { user_id: { in: members } },
      select: { user_id: true, competitor_profile: { select: { school_id: true } } },
    }),
    prisma.registration.findMany({
      where: { competitor_id: { in: members }, event_code: GROUPSET_EVENT, comp_year: year },
      select: { competitor_id: true },
    }),
  ]);
  if (nameTaken) return { error: { groupset: "A groupset with this name already exists" } };

  const alreadyInGroupset = new Set(taken.map((m) => m.member_id));
  const schoolByMember = new Map(memberRows.map((u) => [u.user_id, u.competitor_profile?.school_id ?? null]));
  const registeredMembers = new Set(registeredRows.map((r) => r.competitor_id));

  // Checked in payload order, and in the same order per member, so the reported
  // error is the one the sequential version would have surfaced.
  for (const memberId of members) {
    if (alreadyInGroupset.has(memberId)) return { error: { groupset: "Member is already in a groupset" } };
    if (!schoolByMember.has(memberId) || schoolByMember.get(memberId) !== body.school) return { error: { groupset: "Members must be from same school as groupset" } };
    if (!registeredMembers.has(memberId)) return { error: { groupset: "Member did not register for groupset" } };
  }

  const groupset = await prisma.groupset.create({
    data: {
      team_name: body.team_name,
      school_id: body.school,
      comp_year: year,
      members: { create: members.map((id) => ({ member_id: id, leader: id === body.leader })) },
    },
    include: { school: true, members: { include: { member: { include: { user: true } } } } },
  });
  // Each assigned member now has a group set bundled into their getMe payload.
  for (const id of members) revalidateUserData(id);
  updateTag(TAG_GROUPSETS); // new group set appears in the organizer list
  updateTag(groupsetTag(groupset.groupset_id));
  return { data: shapeOrganizerGroupset(groupset) };
}

export async function updateOrganizerGroupset(
  uuid: string,
  body: UpdateOrganizerGroupsetBody
): Promise<Mutation<OrganizerGroupsetDTO>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  const gs = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { members: true } });
  if (!gs) return { error: { detail: "Not found." } };

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const data: Prisma.GroupsetUncheckedUpdateInput = {};
  if (body.team_name !== undefined) data.team_name = body.team_name;

  let oldMemberIds = gs.members.map((m) => m.member_id);
  if (body.school !== undefined && body.school !== gs.school_id) {
    data.school_id = body.school;
    ops.push(prisma.groupsetMember.deleteMany({ where: { groupset_id: uuid } }));
    oldMemberIds = [];
  }

  if (Array.isArray(body.members)) {
    const newIds = body.members;
    const toDelete = oldMemberIds.filter((id) => !newIds.includes(id));
    const toAdd = newIds.filter((id) => !oldMemberIds.includes(id));
    if (toDelete.length) ops.push(prisma.groupsetMember.deleteMany({ where: { groupset_id: uuid, member_id: { in: toDelete } } }));
    for (const id of toAdd) {
      ops.push(prisma.groupsetMember.deleteMany({ where: { member_id: id, groupset: { comp_year: gs.comp_year } } }));
      ops.push(prisma.groupsetMember.create({ data: { groupset_id: uuid, member_id: id, leader: id === body.leader } }));
    }
    if (body.leader !== undefined) {
      ops.push(prisma.groupsetMember.updateMany({ where: { groupset_id: uuid }, data: { leader: false } }));
      ops.push(prisma.groupsetMember.updateMany({ where: { groupset_id: uuid, member_id: body.leader }, data: { leader: true } }));
    }
  }

  if (Object.keys(data).length) ops.push(prisma.groupset.update({ where: { groupset_id: uuid }, data }));

  // With writes, the read-back rides the same transaction (array order, so it
  // sees them all); with none, it goes out alone rather than opening one.
  const readBack = prisma.groupset.findUnique({
    where: { groupset_id: uuid },
    include: { school: true, members: { include: { member: { include: { user: true } } } } },
  });
  let updated: Awaited<typeof readBack>;
  if (ops.length) {
    const results = await prisma.$transaction([...ops, readBack]);
    updated = results[results.length - 1] as Awaited<typeof readBack>;
  } else {
    updated = await readBack;
  }

  // Membership may have shifted; drop the payload of everyone who was or is now
  // a member (gs.members holds the originals, body.members the new roster).
  const affected = new Set<string>([...gs.members.map((m) => m.member_id), ...(body.members ?? [])]);
  for (const id of affected) revalidateUserData(id);
  updateTag(TAG_GROUPSETS);
  updateTag(groupsetTag(uuid));

  if (!updated) return { error: { detail: "Not found." } };
  return { data: shapeOrganizerGroupset(updated) };
}

export async function deleteOrganizerGroupset(uuid: string): Promise<Mutation<{ detail: string }>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  // Capture members before the delete so their bundled payloads can be dropped.
  // Two plain statements — a batch's WebSocket session costs more (see admin.ts).
  const gs = await prisma.groupset.findUnique({
    where: { groupset_id: uuid },
    select: { members: { select: { member_id: true } } },
  });
  await prisma.groupset.delete({ where: { groupset_id: uuid } });
  for (const m of gs?.members ?? []) revalidateUserData(m.member_id);
  updateTag(TAG_GROUPSETS);
  updateTag(groupsetTag(uuid));
  return { data: { detail: "deleted" } };
}
