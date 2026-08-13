"use server";

/**
 * Sign-in, session verification, and sign-out, over Auth.js's Credentials
 * provider.
 *
 * @remarks
 * There is no `/api/auth/[...nextauth]` route handler in this app — these
 * actions are the entire auth surface. See {@link "auth"} for the provider
 * configuration.
 *
 * @packageDocumentation
 */

import { CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { getCurrentUser, landingRoute } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { actionError, revalidateUserData } from "./shared";

/**
 * Signs a user in with the Credentials provider.
 *
 * @remarks
 * Sets the Auth.js session cookie server-side and decides where to send them,
 * using the same `landingRoute` the auth-page gate uses — so a fresh sign-in and
 * a return visit land in the same place.
 *
 * The `inactive` result exists purely for messaging: the provider already
 * refuses to sign in an unactivated account, so checking the credentials here as
 * well is what lets "you haven't clicked your activation link" be told apart
 * from "wrong password". It is not the gate.
 *
 * @returns `{ redirectTo }` on success, `{ inactive: true }` for correct
 * credentials on an unactivated account, or `{ error }` otherwise.
 */
export async function loginAction({
  email,
  password,
}: {
  /** The submitted address; normalized before lookup. */
  email: string;
  /** The submitted password. */
  password: string;
}): Promise<{ redirectTo?: string; error?: string; inactive?: true }> {
  const normalizedEmail = email.trim().toLowerCase();
  const precheck = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { is_active: true, password: true },
  });
  if (precheck && !precheck.is_active && verifyPassword(password, precheck.password)) {
    return { inactive: true };
  }

  try {
    await signIn("credentials", { email: normalizedEmail, password, redirect: false });
  } catch (error) {
    // The *only* AuthError meaning "bad credentials" — an outage arrives as
    // CallbackRouteError, so matching the base class would misreport it.
    if (error instanceof CredentialsSignin) return { error: "Invalid email or password" };
    return { error: actionError("loginAction", error, "Could not sign you in. Please try again.").detail };
  }

  try {
    // Loaded by email, not from the cookie just set — it is not readable back in
    // the same request. Selected down to what landingRoute reads.
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        user_id: true,
        user_type: true,
        competitor_profile: { select: { last_reg_year: true } },
      },
    });
    if (!user) return { error: "Invalid email or password" };

    return { redirectTo: await landingRoute(user) };
  } catch (error) {
    // The cookie is already set at this point, so the sign-in itself succeeded;
    // only the landing-route lookup failed. Say so rather than "invalid password".
    return { error: actionError("loginAction", error, "Signed in, but could not load your account. Please retry.").detail };
  }
}

/**
 * Whether the caller's session is still valid server-side.
 *
 * @remarks
 * Lets a tab drop a `sessionStorage` cache that outlived a silently-expired JWT,
 * or a session revoked by a password change elsewhere.
 *
 * @returns `authenticated`. A **failed check reports `true`**: it means "could
 * not tell", not "signed out", and answering false would wipe the tab's cache on
 * every transient blip.
 */
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

/**
 * Clears the session cookie and drops the user's cached payload.
 *
 * @returns `{ ok: true }` on success. On failure `ok` is false and the caller
 * must **not** clear its cache or present the user as signed out — the cookie
 * may well still be set.
 */
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
