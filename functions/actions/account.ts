"use server";

/**
 * Account server actions: email availability, sign-up, activation, and the
 * current user's own profile.
 *
 * @remarks
 * The college list lives here too, because it is the option source for the
 * profile's `school` field.
 *
 * Every export is a public POST endpoint — server actions have no route file but
 * are still reachable by anyone who can address them — so each one authorizes
 * itself rather than trusting its caller.
 *
 * @packageDocumentation
 */

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
import { activationEmail, schoolAccountInviteEmail } from "@/lib/email-templates";
import { issueToken, consumeToken, TokenPurpose } from "@/lib/tokens";
import {
  USER_DATA_TTL, userDataTag,
  revalidateUserData, rehydrateCompetitor, competitorGate, actionError, appUrl,
} from "./shared";
import type { Mutation, RegisterBody, CompetitorProfileBody, UpdateMeBody } from "./shared";

/**
 * The `{ college_name: college_id }` dropdown source, callable from the browser.
 *
 * @remarks
 * {@link "functions/data"} has the same read, but that module is `server-only`
 * and reaches the browser only as props. A component binding the `colleges`
 * cache entry needs a client-callable action to refill it after a mutation
 * clears the key. Both share one Data Cache entry, so this is not a second query.
 *
 * Signed-in only: every screen with a college picker — the competitor profile,
 * the admin console, the organizer group-set and registration views — is already
 * behind a gate.
 *
 * @returns The colleges, or `{}` for a denied read, matching the other reads'
 * `[]` / `null` convention.
 */
export async function getSharedColleges(): Promise<Record<string, string>> {
  if (!(await getCurrentUser())) return {};
  return getColleges();
}

/**
 * Whether a competitor account already exists for an address.
 *
 * @remarks
 * Backs the sign-up form's inline availability check. Matched
 * case-insensitively, matching how sign-up normalizes the address before
 * storing it.
 *
 * @param email - The address to check.
 */
export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email ?? "", mode: "insensitive" }, user_type: "Competitor" },
    select: { user_id: true },
  });
  return { exists: !!user };
}

/**
 * Creates a competitor account and emails its activation link.
 *
 * @remarks
 * Sign-up creates the **account only**. The competitor profile is filled in
 * afterwards through `saveCompetitorProfile`, so a fresh user has
 * `competitor_profile == null`. `is_active` starts false: the account cannot
 * sign in until the emailed link is clicked — see {@link activate}.
 *
 * Delivery is checked twice, because a user written without a sendable
 * activation email is permanently stranded — inactive, so unable to sign in, yet
 * holding the address, so unable to sign up again:
 *
 * - **Before the insert**, `appUrl()` and `fromAddress()` are called for their
 *   throw, catching a missing `NEXT_PUBLIC_APP_URL` or `SES_FROM_EMAIL` while
 *   nothing has been saved.
 * - **After the insert**, a failed send (SES down, throttled, recipient
 *   rejected) rolls the user back — the token rows cascade with it.
 *
 * Either way the form gets an error it can retry against a clean database.
 *
 * @param body - Email, password, and optionally the competitor's name.
 * @returns The new competitor, or field errors to display.
 */
export async function registerUser(body: RegisterBody): Promise<Mutation<CompetitorDTO>> {
  const { email, password } = body ?? {};
  if (!email || !password) return { error: { detail: "Email and password are required." } };
  // The form asks for the password once — it is confirmed by the field's own
  // show/hide toggle rather than a second input, so there is nothing to match here.
  if (password.length < 8) return { error: { password: "Password must be at least 8 characters" } };

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { user_id: true } });
    if (existing) return { error: { email: "A user with this email already exists." } };

    // Called for their throw: fail on missing config while nothing is saved yet.
    const baseUrl = appUrl();
    fromAddress();

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

    // The send itself can still fail, so undo the insert rather than strand the
    // account; the token rows cascade with the user.
    try {
      const token = await issueToken(user.user_id, TokenPurpose.Activation);
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

/**
 * Onboarding step two, and the yearly re-confirmation: upserts the competitor's
 * profile and stamps `last_reg_year`.
 *
 * @remarks
 * Gender and skill level drive event eligibility, so the profile **locks** as
 * soon as the competitor holds a registration for the current year — otherwise
 * they could register at one level and then change it. The lock is enforced here
 * rather than in the setup UI, because the action is callable directly.
 *
 * When locked, the submitted fields are dropped but the `last_reg_year` stamp
 * still lands, so a returning competitor can confirm their profile for the new
 * year without being able to alter it.
 *
 * `last_reg_year` is only stamped when a competition year is configured; with no
 * settings row yet it is left untouched so the gate re-checks once one appears.
 *
 * @param body - Gender, school, student type, and skill level, as DTO codes.
 * @returns The competitor's full payload, or field errors.
 */
export async function saveCompetitorProfile(
  body: CompetitorProfileBody,
): Promise<Mutation<CompetitorDTO>> {
  // Competitor-only: a School or Admin account has no competitor profile, so it
  // must not be able to create one for itself by calling this action directly.
  const { user: current, error: gateError } = await competitorGate();
  if (gateError) return { error: gateError };

  try {
    const { currentYear, locked } = await competitorProfileLock(current.user_id);

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

/**
 * The signed-in competitor's own payload: profile, school, this year's
 * registrations, and this year's group set.
 *
 * @remarks
 * Cached per user *and* per competition year, so a year rollover misses rather
 * than serving the previous year's group set. The settings read stays outside
 * the cached callback, since it depends on cookies.
 *
 * @returns The competitor, or `null` when nobody is signed in.
 */
export async function getMe(): Promise<CompetitorDTO | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const settings = await loadSettings();
  const data = await loadCompetitorCached(current.user_id, settings?.reg_year ?? null);
  return data ? rehydrateCompetitor(data) : null;
}

/**
 * Edits the signed-in competitor's own details.
 *
 * @remarks
 * Name is always editable. The eligibility-driving profile fields — gender,
 * skill level, student type, school — freeze once the competitor holds a
 * registration this year, exactly as in {@link saveCompetitorProfile}. Organizers
 * can still correct a locked profile through their own screens.
 *
 * Fields absent from `body` are left alone rather than cleared, so a partial
 * form submit cannot blank what it did not show.
 *
 * @param body - The fields to change. Every one is optional.
 * @returns The competitor's full payload, or field errors.
 */
export async function updateMe(body: UpdateMeBody): Promise<Mutation<CompetitorDTO>> {
  // Competitor-only, like saveCompetitorProfile: the whole payload is competitor
  // fields, so there is nothing here for a School or Admin account to update.
  const { user: current, error: gateError } = await competitorGate();
  if (gateError) return { error: gateError };

  try {
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


/**
 * Redeems an activation link, letting the account sign in.
 *
 * @remarks
 * The token is single-use and expires in 24 hours; see {@link "lib/tokens"} for
 * how a double-click is prevented from redeeming it twice.
 *
 * @returns A confirmation, or one generic error for every failure mode —
 * missing, wrong, expired, or already used.
 */
export async function activate({ uid, token }: {
  /** The user id from the link. */
  uid?: string;
  /** The raw token from the link. */
  token?: string;
}): Promise<Mutation<{ detail: string }>> {
  if (!uid || !token) return { error: { detail: "Invalid activation link." } };
  const ok = await consumeToken(uid, token, TokenPurpose.Activation);
  if (!ok) return { error: { detail: "This activation link is invalid or has expired." } };

  await prisma.user.update({ where: { user_id: uid }, data: { is_active: true } });
  return { data: { detail: "Account active." } };
}

/**
 * Redeems a school account's invitation link: sets its first password and
 * activates it.
 *
 * @remarks
 * The counterpart to `createSchoolAccount`, which creates the account inactive
 * with a random password nobody holds. Both halves happen here because neither
 * is useful alone — activating without a password would leave the owner locked
 * out, and setting one without activating would leave them unable to sign in.
 *
 * The token is single-use and expires in 7 days; see {@link "lib/tokens"}. It
 * carries purpose `"S"`, so a plain activation link cannot be used here and
 * this link cannot be used on `/activate`.
 *
 * @returns A confirmation, or one generic error for every failure mode.
 */
export async function setInitialPassword({ uid, token, password }: {
  /** The user id from the link. */
  uid?: string;
  /** The raw token from the link. */
  token?: string;
  /** The chosen password; at least 8 characters. */
  password: string;
}): Promise<Mutation<{ detail: string }>> {
  if (!uid || !token) return { error: { detail: "Invalid activation link." } };
  if (!password || password.length < 8) return { error: { detail: "Password must be at least 8 characters" } };

  const ok = await consumeToken(uid, token, TokenPurpose.SchoolInvite);
  if (!ok) return { error: { detail: "This activation link is invalid or has expired." } };

  // token_version rides along as it does on every other password write, so the
  // invariant "a password change ends earlier sessions" holds without a caller
  // having to reason about whether this account could have one.
  await prisma.user.update({
    where: { user_id: uid },
    data: { password: hashPassword(password), is_active: true, token_version: { increment: 1 } },
  });
  return { data: { detail: "Password set." } };
}

/**
 * Re-sends the activation email for an inactive account.
 *
 * @remarks
 * Unauthenticated by design — someone who never received the first link cannot
 * sign in to ask for another. It therefore returns the **same generic response**
 * whether or not the address matched an account, so it cannot be used to
 * enumerate registered addresses.
 *
 * A School account gets its **invitation** link rather than a plain activation
 * one: it was created with a random password, so a link that only activated it
 * would leave it holding a credential nobody knows.
 */
export async function resendActivation({ email }: {
  /** The address to re-send to. */
  email: string;
}): Promise<Mutation<{ detail: string }>> {
  const user = await prisma.user.findUnique({
    where: { email: (email ?? "").trim().toLowerCase() },
    select: { user_id: true, email: true, is_active: true, user_type: true },
  });
  if (user && !user.is_active) {
    if (user.user_type === "School") {
      const token = await issueToken(user.user_id, TokenPurpose.SchoolInvite);
      const link = `${appUrl()}/set-password/${user.user_id}/${token}`;
      await sendEmail(user.email, schoolAccountInviteEmail(link));
    } else {
      const token = await issueToken(user.user_id, TokenPurpose.Activation);
      const link = `${appUrl()}/activate/${user.user_id}/${token}`;
      await sendEmail(user.email, activationEmail(link));
    }
  }
  return { data: { detail: "If an account with that email exists, an activation link was sent." } };
}
