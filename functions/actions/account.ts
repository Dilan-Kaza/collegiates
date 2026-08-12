"use server";

// Account server actions: email check, registration, and the current user's
// own profile (read/update) plus activation. The college list lives here
// too — it is the option source for the profile's `school` field.

import { unstable_cache } from "next/cache";
import { Prisma, type StudentType, type Gender, type SkillLevel } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { getColleges } from "@functions/data";
import { shapeCompetitor, toStudentType, toGender, toSkillLevel } from "@/lib/api";
import type { CompetitorDTO } from "@/lib/api";
import { sendEmail, fromAddress } from "@/lib/email";
import { activationEmail } from "@/lib/email-templates";
import { issueToken, consumeToken } from "@/lib/tokens";
import {
  USER_DATA_TTL, userDataTag,
  revalidateUserData, rehydrateCompetitor, competitorGate, actionError, appUrl,
} from "./shared";
import type { Mutation, RegisterBody, CompetitorProfileBody, UpdateMeBody } from "./shared";

// The { college_name: college_id } dropdown source, client-callable. data.ts's copy is
// `server-only` and reaches the browser only as props, so a component that binds the `colleges`
// cache entry needs this to refill it. Signed-in only: every screen with a college picker — the
// competitor profile, the admin console, the organizer group-set and registration views — is
// already behind a gate. `{}` on a denied read, matching the other reads' [] / null.
export async function getSharedColleges(): Promise<Record<string, string>> {
  if (!(await getCurrentUser())) return {};
  return getColleges();
}

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

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { user_id: true } });
    if (existing) return { error: { email: "A user with this email already exists." } };

    // Both halves of the activation link's delivery are checked before the
    // insert — appUrl() throws on a missing NEXT_PUBLIC_APP_URL, fromAddress()
    // on a missing SES_FROM_EMAIL. A user written without a sendable activation
    // email is stranded: inactive, so unable to sign in, yet holding the address
    // so they cannot sign up again. Failing here leaves nothing saved and the
    // form retryable.
    const baseUrl = appUrl();
    fromAddress();

    // Sign-up creates the account only; the profile is filled in afterward via
    // createCompetitorProfile, so a fresh user has competitor_profile == null.
    // is_active starts false — the account can't sign in until the emailed
    // activation link is clicked (see activate()).
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashPassword(password),
        user_type: "Competitor",
        is_active: false,
        first_name: body.first_name ?? "",
        last_name: body.last_name ?? "",
      },
      include: { competitor_profile: { include: { school: true } } },
    });

    // The pre-flight checks above only cover missing config; the send itself can
    // still fail (SES down, throttled, recipient rejected). Same stranded-account
    // problem, so undo the insert — the token rows cascade with the user — and
    // hand the form back an error it can retry.
    try {
      const token = await issueToken(user.user_id, "A");
      const link = `${baseUrl}/activate/${user.user_id}/${token}`;
      await sendEmail(user.email, activationEmail(link));
    } catch (err) {
      await prisma.user.delete({ where: { user_id: user.user_id } }).catch(() => {});
      return {
        error: actionError(
          "registerUser/activationEmail",
          err,
          "Could not send your activation email. Please try again.",
        ),
      };
    }

    return { data: shapeCompetitor(user, []) };
  } catch (err) {
    // The findUnique above isn't atomic with the insert, so a simultaneous
    // sign-up on the same address lands here as P2002 — report it on the field.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { email: "A user with this email already exists." } };
    }
    return { error: actionError("registerUser", err, "Could not create your account.") };
  }
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
  // Competitor-only: a School or Admin account has no competitor profile, so it
  // must not be able to create one for itself by calling this action directly.
  const { user: current, error: gateError } = await competitorGate();
  if (gateError) return { error: gateError };

  try {
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
  } catch (err) {
    // school_id is the one submitted value that reaches the database unchecked
    // (the enums go through to*), so a stale college id surfaces as P2003 here.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: { school: "That college is no longer available." } };
    }
    return { error: actionError("saveCompetitorProfile", err, "Could not save your profile.") };
  }
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
  // Competitor-only, like saveCompetitorProfile: the whole payload is competitor
  // fields, so there is nothing here for a School or Admin account to update.
  const { user: current, error: gateError } = await competitorGate();
  if (gateError) return { error: gateError };

  try {
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: { school: "That college is no longer available." } };
    }
    return { error: actionError("updateMe", err, "Could not save your changes.") };
  }
}


export async function activate({ uid, token }: { uid?: string; token?: string }): Promise<Mutation<{ detail: string }>> {
  if (!uid || !token) return { error: { detail: "Invalid activation link." } };
  const ok = await consumeToken(uid, token, "A");
  if (!ok) return { error: { detail: "This activation link is invalid or has expired." } };

  await prisma.user.update({ where: { user_id: uid }, data: { is_active: true } });
  return { data: { detail: "Account active." } };
}

// Re-sends the activation email for an inactive account. Always returns the
// same generic response regardless of whether the email matched an account,
// so this can't be used to enumerate registered addresses.
export async function resendActivation({ email }: { email: string }): Promise<Mutation<{ detail: string }>> {
  const user = await prisma.user.findUnique({
    where: { email: (email ?? "").trim().toLowerCase() },
    select: { user_id: true, email: true, is_active: true },
  });
  if (user && !user.is_active) {
    const token = await issueToken(user.user_id, "A");
    const link = `${appUrl()}/activate/${user.user_id}/${token}`;
    await sendEmail(user.email, activationEmail(link));
  }
  return { data: { detail: "If an account with that email exists, an activation link was sent." } };
}
