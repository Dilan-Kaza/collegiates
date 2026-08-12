"use server";

// Auth server actions (Auth.js via the Credentials provider).

import { CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { getCurrentUser, landingRoute } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { actionError, revalidateUserData } from "./shared";

// Signs the user in with the Credentials provider. Sets the Auth.js session cookie server-side;
// returns { redirectTo }, { error }, or { inactive } (correct credentials, but the account hasn't
// clicked its activation link yet). The destination is decided here, by the same lib/auth
// landingRoute the auth-page gate uses, so a fresh sign-in and a return visit land alike.
//
// The credentials are checked here (not just left to the provider) only so
// this specific case can be told apart from a wrong password — the provider
// itself also refuses to sign in an inactive user (see auth.ts), so this is
// purely a messaging improvement, not the actual gate.
export async function loginAction({
  email,
  password,
}: {
  email: string;
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
    // CredentialsSignin is the *only* AuthError that means "bad credentials": Auth.js
    // throws it when our authorize() returns null. Anything thrown inside authorize
    // (an unreachable database) arrives as CallbackRouteError, and a bad setup as
    // MissingSecret/UntrustedHost/AdapterError — all AuthError subclasses too, so
    // matching the base class here would report an outage as a wrong password.
    if (error instanceof CredentialsSignin) return { error: "Invalid email or password" };
    return { error: actionError("loginAction", error, "Could not sign you in. Please try again.").detail };
  }

  try {
    // The Credentials provider just authenticated this email, so load the row by
    // email rather than reading back the session cookie we set moments ago.
    // Selected down to what landingRoute reads: the success path has no need of
    // the password hash, so it is never loaded here.
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
