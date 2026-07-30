"use server";

// Auth server actions (Auth.js via the Credentials provider).

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { revalidateUserData } from "./shared";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Signs the user in with the Credentials provider. Sets the Auth.js session
// cookie server-side; returns { ok }, { error }, or { inactive } (correct
// credentials, but the account hasn't clicked its activation link yet).
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
}): Promise<{ ok?: true; error?: string; inactive?: true }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (user && !user.is_active && verifyPassword(password, user.password)) {
    return { inactive: true };
  }

  try {
    await signIn("credentials", { email: normalizedEmail, password, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password" };
    throw error;
  }
}

export async function logoutAction(): Promise<{ ok: true }> {
  // Capture the user before the session is cleared so we can drop their cached
  // payload — the cache must not outlive the session.
  const current = await getCurrentUser();
  await signOut({ redirect: false });
  if (current) revalidateUserData(current.user_id);
  return { ok: true };
}
