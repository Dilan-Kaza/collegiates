"use server";

// Account server actions: email check, registration, and the current user's
// own profile (read/update/delete) plus activation.

import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { shapeCompetitor } from "@/lib/api";
import type { CompetitorDTO } from "@/lib/api";
import {
  USER_DATA_TTL, userDataTag, TAG_REGISTRATIONS, TAG_GROUPSETS,
  revalidateUserData, rehydrateCompetitor,
} from "./shared";
import type { Mutation, RegisterBody, UpdateMeBody } from "./shared";

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" }, user_type: "C" },
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

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      user_type: "C",
      is_active: true,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      gender: body.gender || null,
      school_id: body.school || null,
      student_type: body.student_type || null,
      first_comp: body.first_comp ? Number(body.first_comp) : null,
      skill_level: body.skill_level || null,
      grad_date: body.grad_date ? new Date(body.grad_date) : null,
    },
    include: { school: true },
  });
  return { data: shapeCompetitor(user, []) };
}

async function loadFullUser(userId: string) {
  const settings = await loadSettings();
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      school: true,
      registration: { include: { event: true } },
      // The competitor's group set for the current registration cycle, bundled
      // with the user so it loads the same way registrations do. Mirrors
      // getMyGroupset's year filter; matches nothing until settings exist.
      groupset_member: {
        where: { groupset: { comp_year: settings?.reg_year ?? -1 } },
        include: { groupset: { include: { school: true, members: { include: { member: true } } } } },
      },
    },
  });
}

function loadCompetitorCached(userId: string): Promise<CompetitorDTO | null> {
  return unstable_cache(
    async (): Promise<CompetitorDTO | null> => {
      const user = await loadFullUser(userId);
      if (!user) return null;
      return shapeCompetitor(user, user.registration, user.groupset_member[0]?.groupset ?? null);
    },
    ["competitor-data", userId],
    { tags: [userDataTag(userId)], revalidate: USER_DATA_TTL },
  )();
}

export async function getMe(): Promise<CompetitorDTO | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const data = await loadCompetitorCached(current.user_id);
  return data ? rehydrateCompetitor(data) : null;
}

export async function updateMe(body: UpdateMeBody): Promise<Mutation<CompetitorDTO>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };
  const data: Prisma.UserUncheckedUpdateInput = {};
  if (body.first_name !== undefined) data.first_name = body.first_name;
  if (body.last_name !== undefined) data.last_name = body.last_name;
  if (body.gender !== undefined) data.gender = body.gender;
  if (body.student_type !== undefined) data.student_type = body.student_type;
  if (body.skill_level !== undefined) data.skill_level = body.skill_level;
  if (body.first_comp !== undefined) data.first_comp = body.first_comp ? Number(body.first_comp) : null;
  if (body.school !== undefined) data.school_id = body.school;
  if (body.grad_date !== undefined) data.grad_date = body.grad_date ? new Date(body.grad_date) : null;

  await prisma.user.update({ where: { user_id: current.user_id }, data });
  revalidateUserData(current.user_id);
  const user = await loadFullUser(current.user_id);
  if (!user) return { error: { detail: "User not found." } };
  return { data: shapeCompetitor(user, user.registration, user.groupset_member[0]?.groupset ?? null) };
}

export async function deleteMe(): Promise<Mutation<{ detail: string }>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };
  await prisma.user.delete({ where: { user_id: current.user_id } });
  revalidateUserData(current.user_id);
  // Removing the user drops them from the organizer registration and group set
  // lists, so bust those shared caches too.
  revalidateTag(TAG_REGISTRATIONS);
  revalidateTag(TAG_GROUPSETS);
  return { data: { detail: "deleted" } };
}

export async function activate({ uid }: { uid?: string; token?: string }): Promise<Mutation<{ detail: string }>> {
  if (uid) {
    const u = await prisma.user.findUnique({ where: { user_id: uid }, select: { user_id: true } });
    if (!u) return { error: { detail: "Invalid activation link." } };
  }
  return { data: { detail: "Account active." } };
}
