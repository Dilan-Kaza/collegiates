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
import { sendEmail } from "@/lib/email";
import { activationEmail } from "@/lib/email-templates";
import { issueToken, consumeToken } from "@/lib/tokens";
import {
  USER_DATA_TTL, userDataTag, TAG_REGISTRATIONS, TAG_GROUPSETS,
  revalidateUserData, rehydrateCompetitor, appUrl,
} from "./shared";
import type { Mutation, RegisterBody, CompetitorProfileBody, UpdateMeBody } from "./shared";

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
  if (password.length < 8) return { error: { password: "Password must be at least 8 characters" } };
  if (password !== re_password) return { error: { re_password: "Passwords do not match" } };

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { user_id: true } });
  if (existing) return { error: { email: "A user with this email already exists." } };

  // Sign-up creates the account only. The competitor profile (and the
  // competitor's own skill_level) is filled in afterward
  // via createCompetitorProfile, so a fresh user has competitor_profile == null.
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashPassword(password),
      user_type: "C",
      is_active: false,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
    },
    include: { competitor_profile: { include: { school: true } } },
  });

  const token = await issueToken(user.user_id, "A");
  const link = `${appUrl()}/activate/${user.user_id}/${token}`;
  await sendEmail(user.email, activationEmail(link));

  return { data: shapeCompetitor(user, []) };
}

// Whether the competitor's profile is locked for edits: true once they have at
// least one registration in the active competition year. Because gender/skill
// drive which events they may enter, these fields must not change out from under
// existing registrations. This is the single source of truth enforced by every
// user-facing profile write (saveCompetitorProfile, updateMe) so a crafted
// request cannot bypass the /profile/setup UI guard.
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

// Second step of onboarding, also used for the yearly re-confirmation: create
// or update the signed-in competitor's profile and stamp last_reg_year to the
// current reg_year (from Settings). The dashboard gate routes a competitor here
// whenever they have no profile or last_reg_year is behind the current year.
//
// Profile fields are only writable when the competitor has no registrations for
// the current year (gender/skill_level drive event eligibility, so they must
// not change out from under existing registrations). Either way last_reg_year
// is stamped, so submitting an unchanged form still clears the yearly re-check.
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
    gender: body.gender || null,
    school_id: body.school || null,
    student_type: body.student_type || null,
    skill_level: body.skill_level || null,
  };

  await prisma.user.update({
    where: { user_id: current.user_id },
    data: {
      competitor_profile: {
        upsert: {
          // A brand-new profile is never locked (registering requires a
          // profile), so create always carries the submitted fields.
          create: { ...fieldPatch, ...yearPatch },
          update: locked ? yearPatch : { ...fieldPatch, ...yearPatch },
        },
      },
    },
  });
  revalidateUserData(current.user_id);
  const user = await loadFullUser(current.user_id);
  if (!user) return { error: { detail: "User not found." } };
  return { data: shapeCompetitor(user, user.registration, user.groupset_member[0]?.groupset ?? null) };
}

// Re-sends the activation email for an inactive account. Always returns the
// same generic response regardless of whether the email matched an account,
// so this can't be used to enumerate registered addresses.
export async function resendActivation({ email }: { email: string }): Promise<Mutation<{ detail: string }>> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { user_id: true, email: true, is_active: true } });
  if (user && !user.is_active) {
    const token = await issueToken(user.user_id, "A");
    const link = `${appUrl()}/activate/${user.user_id}/${token}`;
    await sendEmail(user.email, activationEmail(link));
  }
  return { data: { detail: "If an account with that email exists, an activation link was sent." } };
}

async function loadFullUser(userId: string) {
  const settings = await loadSettings();
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      competitor_profile: { include: { school: true } },
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

  // Once the competitor has registrations in the current reg year, their
  // eligibility-driving fields (skill_level + the competitor_profile) are
  // frozen — enforced here, not just in the UI, so a direct call to this action
  // can't change them out from under existing registrations.
  const { locked } = await competitorProfileLock(current.user_id);

  const data: Prisma.UserUpdateInput = {};
  if (body.first_name !== undefined) data.first_name = body.first_name;
  if (body.last_name !== undefined) data.last_name = body.last_name;

  if (!locked) {
    // Competitor attributes live on the one-to-one profile. Build the patch
    // separately and apply it via upsert so users without a profile still get
    // one created on first edit.
    const profile: { gender?: string | null; student_type?: string | null; school_id?: string | null; skill_level?: string | null } = {};
    if (body.gender !== undefined) profile.gender = body.gender;
    if (body.student_type !== undefined) profile.student_type = body.student_type;
    if (body.school !== undefined) profile.school_id = body.school;
    if (body.skill_level !== undefined) profile.skill_level = body.skill_level;
    if (Object.keys(profile).length) {
      data.competitor_profile = { upsert: { create: profile, update: profile } };
    }
  }

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

export async function activate({ uid, token }: { uid?: string; token?: string }): Promise<Mutation<{ detail: string }>> {
  if (!uid || !token) return { error: { detail: "Invalid activation link." } };
  const ok = await consumeToken(uid, token, "A");
  if (!ok) return { error: { detail: "This activation link is invalid or has expired." } };

  await prisma.user.update({ where: { user_id: uid }, data: { is_active: true } });
  return { data: { detail: "Account active." } };
}
