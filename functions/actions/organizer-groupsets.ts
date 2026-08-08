"use server";

// Organizer server actions for group sets: list, single read, and full CRUD.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { shapeOrganizerGroupset, isClassOne } from "@/lib/api";
import type { OrganizerGroupsetDTO } from "@/lib/api";
import {
  READ_CACHE_TTL, TAG_GROUPSETS, groupsetTag,
  organizerGate, revalidateUserData, reOrganizerGroupset, actionError,
} from "./shared";
import type { Mutation, FieldErrors, CreateOrganizerGroupsetBody, UpdateOrganizerGroupsetBody } from "./shared";

// The event code every group-set member must be registered for. The school/members
// include stays inline per query — a shared Prisma.GroupsetInclude widens it away.
const GROUPSET_EVENT = "NAN901";

// Rules I caps a team at six.
const MAX_MEMBERS = 6;

// What the checks below can find. `blocking` cannot be written at all; `warnings` are eligibility
// rules, reported for confirmation because a hand edit usually fixes the very gap they describe.
interface MemberProblems {
  blocking: string[];
  warnings: string[];
  // Members currently on a different team this year. A confirmed save has to take
  // them off it, so the caller needs the ids and not just the warning text.
  moving: string[];
}

// The member rules the competitor flow enforces, checked for an organizer write: Class 1 only, one
// team per year, same school, registered for the team event. `members` is only who is being added.
async function memberProblems(
  members: string[],
  schoolId: string | null | undefined,
  year: number,
  rosterSize: number,
  groupsetId?: string,
): Promise<MemberProblems> {
  const problems: MemberProblems = { blocking: [], warnings: [], moving: [] };
  if (rosterSize > MAX_MEMBERS) {
    problems.warnings.push(`A team may have at most ${MAX_MEMBERS} members; this one would have ${rosterSize}.`);
  }
  if (members.length === 0) return problems;

  // One batched query per rule, rather than three per member.
  const [memberRows, held, registeredRows] = await Promise.all([
    prisma.user.findMany({
      where: { user_id: { in: members }, user_type: "Competitor" },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        competitor_profile: { select: { school_id: true, student_type: true } },
      },
    }),
    prisma.groupsetMember.findMany({
      where: { member_id: { in: members }, groupset: { comp_year: year } },
      select: { member_id: true, groupset: { select: { groupset_id: true, team_name: true } } },
    }),
    prisma.registration.findMany({
      where: { competitor_id: { in: members }, event_code: GROUPSET_EVENT, comp_year: year },
      select: { competitor_id: true },
    }),
  ]);

  const byId = new Map(memberRows.map((u) => [u.user_id, u]));
  const otherTeam = new Map(
    held.filter((m) => m.groupset.groupset_id !== groupsetId).map((m) => [m.member_id, m.groupset.team_name]),
  );
  const registered = new Set(registeredRows.map((r) => r.competitor_id));

  // Payload order, and the same order of rules per member, so what gets reported
  // is stable rather than dependent on how the rows came back.
  for (const memberId of members) {
    const row = byId.get(memberId);
    if (!row) {
      problems.blocking.push("One of the selected members is not a competitor account.");
      continue;
    }
    const name = `${row.first_name} ${row.last_name}`;
    if (!isClassOne(row.competitor_profile?.student_type)) {
      problems.warnings.push(`${name} is not Class 1, and the team competition is open to Class 1 competitors only.`);
    }
    if (schoolId && row.competitor_profile?.school_id !== schoolId) {
      problems.warnings.push(`${name} is not from this team's school.`);
    }
    if (!registered.has(memberId)) {
      problems.warnings.push(`${name} has not registered for the team event.`);
    }
    const heldBy = otherTeam.get(memberId);
    if (heldBy) {
      problems.warnings.push(`${name} is already on ${heldBy}, and saving will move them.`);
      problems.moving.push(memberId);
    }
  }

  return problems;
}

// Warnings the organizer has not confirmed, as the `confirm`-keyed error the UI
// turns into a "Save anyway" (see confirmMessage in functions/actionErrors.ts).
const confirmError = (warnings: string[]): FieldErrors => ({ confirm: warnings.join(" ") });

export async function getOrganizerGroupsets(): Promise<OrganizerGroupsetDTO[]> {
  const { error } = await organizerGate();
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
  const { error } = await organizerGate();
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
  const { error } = await organizerGate();
  if (error) return { error };
  const settings = await loadSettings();
  if (!settings) return { error: { detail: "No settings have been created yet." } };
  const year = settings.reg_year;
  const members = body.members ?? [];

  // These three are not confirmable: an empty name or missing school cannot be
  // written, and a member listed twice is malformed input rather than a rule call.
  if (!body.team_name?.trim()) return { error: { groupset: "A team name is required" } };
  if (!body.school) return { error: { groupset: "A school is required" } };
  if (new Set(members).size !== members.length) return { error: { groupset: "Duplicate members" } };

  try {
    // The name check and the member rules are independent, so they go out together.
    const [nameTaken, problems] = await Promise.all([
      prisma.groupset.findFirst({ where: { team_name: body.team_name, comp_year: year }, select: { groupset_id: true } }),
      // Every member is being added, so the roster is exactly the payload.
      memberProblems(members, body.school, year, members.length),
    ]);
    // Also not confirmable: the unique index would reject it anyway.
    if (nameTaken) return { error: { groupset: "A groupset with this name already exists" } };
    if (problems.blocking.length) return { error: { groupset: problems.blocking[0] } };
    if (problems.warnings.length && !body.override) return { error: confirmError(problems.warnings) };

    const create = prisma.groupset.create({
      data: {
        team_name: body.team_name,
        school_id: body.school,
        comp_year: year,
        members: { create: members.map((id) => ({ member_id: id, leader: id === body.leader })) },
      },
      include: { school: true, members: { include: { member: { include: { user: true } } } } },
    });

    // A confirmed save can move members off other teams: the unique index is per (groupset, member),
    // so the old membership must go atomically with the create. Without one it stays one statement.
    let groupset: Awaited<typeof create>;
    if (problems.moving.length) {
      const results = await prisma.$transaction([
        prisma.groupsetMember.deleteMany({
          where: { member_id: { in: problems.moving }, groupset: { comp_year: year } },
        }),
        create,
      ]);
      groupset = results[1];
    } else {
      groupset = await create;
    }
    // Each assigned member now has a group set bundled into their getMe payload.
    for (const id of members) revalidateUserData(id);
    updateTag(TAG_GROUPSETS); // new group set appears in the organizer list
    updateTag(groupsetTag(groupset.groupset_id));
    return { data: shapeOrganizerGroupset(groupset) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { groupset: "A groupset with this name already exists" } };
    }
    return { error: actionError("createOrganizerGroupset", err, "Could not create the groupset.") };
  }
}

export async function updateOrganizerGroupset(
  uuid: string,
  body: UpdateOrganizerGroupsetBody
): Promise<Mutation<OrganizerGroupsetDTO>> {
  const { error } = await organizerGate();
  if (error) return { error };
  if (body.team_name !== undefined && !body.team_name.trim()) {
    return { error: { groupset: "A team name is required" } };
  }
  if (Array.isArray(body.members) && new Set(body.members).size !== body.members.length) {
    return { error: { groupset: "Duplicate members" } };
  }

  try {
    const gs = await prisma.groupset.findUnique({ where: { groupset_id: uuid }, include: { members: true } });
    if (!gs) return { error: { detail: "Not found." } };

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    const data: Prisma.GroupsetUncheckedUpdateInput = {};
    if (body.team_name !== undefined) data.team_name = body.team_name;

    // A school change re-seats the whole team, so every member counts as newly
    // added — and is re-checked against the new school.
    const schoolMoved = body.school !== undefined && body.school !== gs.school_id;
    const oldMemberIds = schoolMoved ? [] : gs.members.map((m) => m.member_id);
    const toAdd = Array.isArray(body.members) ? body.members.filter((id) => !oldMemberIds.includes(id)) : [];

    // The same member rules the create path applies. This is the action the organizer console
    // actually calls, and until now it checked nothing about who was being added.
    if (Array.isArray(body.members)) {
      const problems = await memberProblems(
        toAdd,
        body.school ?? gs.school_id,
        gs.comp_year,
        body.members.length,
        uuid,
      );
      if (problems.blocking.length) return { error: { groupset: problems.blocking[0] } };
      if (problems.warnings.length && !body.override) return { error: confirmError(problems.warnings) };
    }

    if (schoolMoved) {
      data.school_id = body.school;
      ops.push(prisma.groupsetMember.deleteMany({ where: { groupset_id: uuid } }));
    }

    if (Array.isArray(body.members)) {
      const newIds = body.members;
      const toDelete = oldMemberIds.filter((id) => !newIds.includes(id));
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { groupset: "A groupset with this name already exists" } };
    }
    // A member removed from the system, or a school that no longer exists.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: { groupset: "One of the selected members or the school is no longer available." } };
    }
    return { error: actionError("updateOrganizerGroupset", err, "Could not save the groupset.") };
  }
}

export async function deleteOrganizerGroupset(uuid: string): Promise<Mutation<{ detail: string }>> {
  const { error } = await organizerGate();
  if (error) return { error };
  try {
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
  } catch (err) {
    // Already gone is the outcome the caller asked for; the tags still get
    // dropped so the lists stop showing it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      updateTag(TAG_GROUPSETS);
      updateTag(groupsetTag(uuid));
      return { data: { detail: "deleted" } };
    }
    return { error: actionError("deleteOrganizerGroupset", err, "Could not delete the groupset.") };
  }
}
