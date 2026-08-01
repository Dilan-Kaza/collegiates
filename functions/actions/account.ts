"use server";

// Account server actions: email check, registration, and the current user's
// own profile (read/update/delete) plus activation.

import { unstable_cache, updateTag } from "next/cache";
import { Prisma, type StudentType, type Gender, type SkillLevel } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { shapeCompetitor, toStudentType, toGender, toSkillLevel } from "@/lib/api";
import type { CompetitorDTO } from "@/lib/api";
import {
  USER_DATA_TTL, userDataTag, TAG_REGISTRATIONS, TAG_GROUPSETS,
  revalidateUserData, rehydrateCompetitor,
} from "./shared";
import type { Mutation, RegisterBody, CompetitorProfileBody, UpdateMeBody } from "./shared";

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" }, user_type: "Competitor" },
    select: { user_id: true },
  });
  return { exists: !!user };
}

export async function registerUser(body: RegisterBody): Promise<Mutation<CompetitorDTO>> {
  const { email, password, re_password } = body ?? {};
  if (!email || !password) return { error: { detail: "Email and password are required." } };
  if (password !== re_password) return { error: { re_password: "Passwords do not match" } };

  const existing = await prisma.user.findUnique({ where: { email }, select: { user_id: true } });
  if (existing) return { error: { email: "A user with this email already exists." } };

  // Sign-up creates the account only; the profile is filled in afterward via
  // createCompetitorProfile, so a fresh user has competitor_profile == null.
  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      user_type: "Competitor",
      is_active: true,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
    },
    include: { competitor_profile: { include: { school: true } } },
  });
  return { data: shapeCompetitor(user, []) };
}

// Locked once the competitor has a registration this year: gender/skill drive
// event eligibility. Enforced by every profile write, not just the setup UI.
async function competitorProfileLock(
  userId: string,
): Promise<{ currentYear: number | null; locked: boolean }> {
  const settings = await loadSettings();
  const currentYear = settings?.reg_year ?? null;
  const locked =
    currentYear != null &&
    (await prisma.registration.count({
      where: { competitor_id: userId, comp_year: currentYear },
    })) > 0;
  return { currentYear, locked };
}

// Onboarding step two, also the yearly re-confirmation: upsert the profile and
// stamp last_reg_year. Fields are frozen when locked, but the stamp still lands.
export async function saveCompetitorProfile(
  body: CompetitorProfileBody,
): Promise<Mutation<CompetitorDTO>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };

  const { currentYear, locked } = await competitorProfileLock(current.user_id);

  // last_reg_year is only stamped when a competition year is configured; if none
  // exists yet we leave it untouched so the gate re-checks once settings appear.
  const yearPatch = currentYear != null ? { last_reg_year: currentYear } : {};

  const fieldPatch = {
    gender: toGender(body.gender),
    skill_level: toSkillLevel(body.skill_level),
    school_id: body.school || null,
    student_type: toStudentType(body.student_type),
  };

  // The update carries the full read include, so it returns the payload the DTO
  // needs instead of being followed by a second query.
  const user = await prisma.user.update({
    where: { user_id: current.user_id },
    data: {
      // Competitor-owned fields on the profile are frozen while locked.
      competitor_profile: {
        upsert: {
          // A new profile is never locked (registering requires one), so
          // create always carries the submitted fields.
          create: { ...fieldPatch, ...yearPatch },
          update: locked ? yearPatch : { ...fieldPatch, ...yearPatch },
        },
      },
    },
    include: fullUserInclude(currentYear),
  });
  revalidateUserData(current.user_id);
  return { data: shapeFullUser(user) };
}

// A competitor's full payload: profile + school + registrations + this year's
// group set. Shared by the cached reader and by the profile writes.
function fullUserInclude(year: number | null) {
  return {
    competitor_profile: {
      include: {
        school: true,
        registration: { include: { event: true } },
        // This cycle's group set, loaded alongside registrations. Mirrors
        // getMyGroupset's year filter; matches nothing until settings exist.
        groupset_member: {
          where: { groupset: { comp_year: year ?? -1 } },
          include: {
            groupset: {
              include: { school: true, members: { include: { member: { include: { user: true } } } } },
            },
          },
        },
      },
    },
  } satisfies Prisma.UserInclude;
}

type FullUser = Prisma.UserGetPayload<{ include: ReturnType<typeof fullUserInclude> }>;

const shapeFullUser = (user: FullUser): CompetitorDTO => {
  const profile = user.competitor_profile;
  return shapeCompetitor(user, profile?.registration ?? [], profile?.groupset_member[0]?.groupset ?? null);
};

function loadFullUser(userId: string, year: number | null) {
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: fullUserInclude(year),
  });
}

// Keyed by year as well as user so a rollover misses rather than serving the
// old year's group set. The settings read stays outside the cached callback.
function loadCompetitorCached(userId: string, year: number | null): Promise<CompetitorDTO | null> {
  return unstable_cache(
    async (): Promise<CompetitorDTO | null> => {
      const user = await loadFullUser(userId, year);
      return user ? shapeFullUser(user) : null;
    },
    ["competitor-data", userId, String(year)],
    { tags: [userDataTag(userId)], revalidate: USER_DATA_TTL },
  )();
}

export async function getMe(): Promise<CompetitorDTO | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const settings = await loadSettings();
  const data = await loadCompetitorCached(current.user_id, settings?.reg_year ?? null);
  return data ? rehydrateCompetitor(data) : null;
}

export async function updateMe(body: UpdateMeBody): Promise<Mutation<CompetitorDTO>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };

  // Eligibility-driving fields freeze once registrations exist. Enforced here,
  // not just in the UI, so a direct call to this action can't bypass it.
  const { currentYear, locked } = await competitorProfileLock(current.user_id);

  const data: Prisma.UserUpdateInput = {};
  if (body.first_name !== undefined) data.first_name = body.first_name;
  if (body.last_name !== undefined) data.last_name = body.last_name;

  if (!locked) {
    // Competitor attributes live on the one-to-one profile; upsert so users
    // without one still get it created on first edit.
    const profile: {
      gender?: Gender | null;
      skill_level?: SkillLevel | null;
      student_type?: StudentType | null;
      school_id?: string | null;
    } = {};
    if (body.skill_level !== undefined) profile.skill_level = toSkillLevel(body.skill_level);
    if (body.gender !== undefined) profile.gender = toGender(body.gender);
    if (body.student_type !== undefined) profile.student_type = toStudentType(body.student_type);
    if (body.school !== undefined) profile.school_id = body.school;
    if (Object.keys(profile).length) {
      data.competitor_profile = { upsert: { create: profile, update: profile } };
    }
  }

  // As in saveCompetitorProfile: the update returns the full payload, so there
  // is no read-back query.
  const user = await prisma.user.update({
    where: { user_id: current.user_id },
    data,
    include: fullUserInclude(currentYear),
  });
  revalidateUserData(current.user_id);
  return { data: shapeFullUser(user) };
}

export async function deleteMe(): Promise<Mutation<{ detail: string }>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };
  await prisma.user.delete({ where: { user_id: current.user_id } });
  revalidateUserData(current.user_id);
  // Removing the user drops them from the organizer registration and group set
  // lists, so bust those shared caches too.
  updateTag(TAG_REGISTRATIONS);
  updateTag(TAG_GROUPSETS);
  return { data: { detail: "deleted" } };
}

export async function activate({ uid }: { uid?: string; token?: string }): Promise<Mutation<{ detail: string }>> {
  if (uid) {
    const u = await prisma.user.findUnique({ where: { user_id: uid }, select: { user_id: true } });
    if (!u) return { error: { detail: "Invalid activation link." } };
  }
  return { data: { detail: "Account active." } };
}
