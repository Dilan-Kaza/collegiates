"use server";

// Organizer server actions for group sets: list, single read, and full CRUD.

import { unstable_cache, revalidateTag } from "next/cache";
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

// The event code every group-set member must be registered for. NOTE: the
// `school + members.member` include is written inline at each query site so
// Prisma can infer the related payload — a shared object typed as
// Prisma.GroupsetInclude would widen and drop the relations from the result.
const GROUPSET_EVENT = "NAN901";

export async function getOrganizerGroupsets(): Promise<OrganizerGroupsetDTO[]> {
  const { error } = await requireOrganizer();
  if (error) return [];
  const settings = await loadSettings();
  if (!settings) return [];
  const year = settings.reg_year;
  const groupsets = await unstable_cache(
    async (): Promise<OrganizerGroupsetDTO[]> => {
      const rows = await prisma.groupset.findMany({ where: { comp_year: year }, include: { school: true, members: { include: { member: true } } } });
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
      const g = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { school: true, members: { include: { member: true } } } });
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

  const nameTaken = await prisma.groupset.findFirst({ where: { team_name: body.team_name, comp_year: year }, select: { groupset_id: true } });
  if (nameTaken) return { error: { groupset: "A groupset with this name already exists" } };

  for (const memberId of members) {
    const inGroupset = await prisma.groupsetMember.findFirst({ where: { member_id: memberId, groupset: { comp_year: year } }, select: { id: true } });
    if (inGroupset) return { error: { groupset: "Member is already in a groupset" } };
    const member = await prisma.user.findUnique({ where: { user_id: memberId }, select: { competitor_profile: { select: { school_id: true } } } });
    if (!member || member.competitor_profile?.school_id !== body.school) return { error: { groupset: "Members must be from same school as groupset" } };
    const registered = await prisma.registration.findFirst({ where: { competitor_id: memberId, event_code: GROUPSET_EVENT, comp_year: year }, select: { id: true } });
    if (!registered) return { error: { groupset: "Member did not register for groupset" } };
  }

  const groupset = await prisma.groupset.create({
    data: {
      team_name: body.team_name,
      school_id: body.school,
      comp_year: year,
      members: { create: members.map((id) => ({ member_id: id, leader: id === body.leader })) },
    },
    include: { school: true, members: { include: { member: true } } },
  });
  // Each assigned member now has a group set bundled into their getMe payload.
  for (const id of members) revalidateUserData(id);
  revalidateTag(TAG_GROUPSETS); // new group set appears in the organizer list
  revalidateTag(groupsetTag(groupset.groupset_id));
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
  if (ops.length) await prisma.$transaction(ops);

  // Membership may have shifted; drop the payload of everyone who was or is now
  // a member (gs.members holds the originals, body.members the new roster).
  const affected = new Set<string>([...gs.members.map((m) => m.member_id), ...(body.members ?? [])]);
  for (const id of affected) revalidateUserData(id);
  revalidateTag(TAG_GROUPSETS);
  revalidateTag(groupsetTag(uuid));

  const updated = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { school: true, members: { include: { member: true } } } });
  if (!updated) return { error: { detail: "Not found." } };
  return { data: shapeOrganizerGroupset(updated) };
}

export async function deleteOrganizerGroupset(uuid: string): Promise<Mutation<{ detail: string }>> {
  const { error } = await requireOrganizer();
  if (error) return { error };
  // Capture members before the delete so we can drop their bundled payloads.
  const gs = await prisma.groupset.findUnique({
    where: { groupset_id: uuid },
    select: { members: { select: { member_id: true } } },
  });
  await prisma.groupset.delete({ where: { groupset_id: uuid } });
  for (const m of gs?.members ?? []) revalidateUserData(m.member_id);
  revalidateTag(TAG_GROUPSETS);
  revalidateTag(groupsetTag(uuid));
  return { data: { detail: "deleted" } };
}
