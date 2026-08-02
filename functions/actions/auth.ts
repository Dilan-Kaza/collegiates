"use server";

// Auth server actions (Auth.js via the Credentials provider).

import { AuthError } from "next-auth";
import type { UserType } from "@prisma/client";
import { signIn, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { canAccessOrganizer, getCurrentUser } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { actionError, revalidateUserData } from "./shared";

// What loginAction reports about the user it just signed in: server-only facts,
// gathered here so the sign-in page can pick a landing route. No routing here.
export interface SignedInUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  // Whether this user may reach the organizer console (settings host or admin).
  can_access_organizer: boolean;
  // Profile state: absent until /profile/setup runs, re-confirmed yearly.
  // profile_reg_year behind reg_year means setup is due.
  has_profile: boolean;
  profile_reg_year: number | null;
  reg_year: number | null;
}

// Signs the user in with the Credentials provider. Sets the Auth.js session
// cookie server-side; returns { user } or { error }.
export async function loginAction({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ user?: SignedInUser; error?: string }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password" };
    // Anything else (the database being unreachable, a provider misconfiguration)
    // is not a credentials problem, and must not be reported as one.
    return { error: actionError("loginAction", error, "Could not sign you in. Please try again.").detail };
  }

  try {
    // The Credentials provider just authenticated this email, so load the row by
    // email rather than reading back the session cookie we set moments ago.
    const user = await prisma.user.findUnique({
      where: { email },
      include: { competitor_profile: true },
    });
    if (!user) return { error: "Invalid email or password" };

    const settings = await loadSettings();

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
        can_access_organizer: await canAccessOrganizer(user),
        has_profile: !!user.competitor_profile,
        profile_reg_year: user.competitor_profile?.last_reg_year ?? null,
        reg_year: settings?.reg_year ?? null,
      },
    };
  } catch (error) {
    // The cookie is already set at this point, so the sign-in itself succeeded;
    // only the landing-route lookup failed. Say so rather than "invalid password".
    return { error: actionError("loginAction", error, "Signed in, but could not load your account. Please retry.").detail };
  }
}

// Whether the caller's session cookie is still valid server-side, so the client
// can drop a per-tab cache that outlived a silently-expired JWT.
export async function verifySession(): Promise<{ authenticated: boolean }> {
  try {
    const current = await getCurrentUser();
    return { authenticated: !!current };
  } catch (error) {
    // A failed check means "couldn't tell", not "signed out". Reporting false
    // here would wipe the tab's cache and refresh on every transient blip.
    console.error("[action:verifySession]", error);
    return { authenticated: true };
  }
}

export async function logoutAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Capture the user before the session is cleared so we can drop their cached
    // payload — the cache must not outlive the session.
    const current = await getCurrentUser();
    await signOut({ redirect: false });
    if (current) revalidateUserData(current.user_id);
    return { ok: true };
  } catch (error) {
    // The cookie may well still be set, so the caller must not clear its cache
    // and present the user as signed out — report the failure instead.
    return { ok: false, error: actionError("logoutAction", error, "Could not log you out. Please try again.").detail };
  }
}
