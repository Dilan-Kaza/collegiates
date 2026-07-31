"use server";

// Auth server actions (Auth.js via the Credentials provider).

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { revalidateUserData } from "./shared";

// Signs the user in with the Credentials provider. Sets the Auth.js session
// cookie server-side; returns { ok } or { error }.
export async function loginAction({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ ok?: true; error?: string }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password" };
    throw error;
  }
}

// Reports whether the caller's Auth.js session cookie is still valid on the
// server. The client caches its signed-in state per tab (sessionStorage), which
// can outlive a silently-expired JWT; the SessionGuard calls this to reconcile
// that belief and drop the stale cache when the server no longer recognizes the
// session. Cheap: getCurrentUser is React-cache()-wrapped (JWT decode + one
// indexed Prisma lookup).
export async function verifySession(): Promise<{ authenticated: boolean }> {
  const current = await getCurrentUser();
  return { authenticated: !!current };
}

export async function logoutAction(): Promise<{ ok: true }> {
  // Capture the user before the session is cleared so we can drop their cached
  // payload — the cache must not outlive the session.
  const current = await getCurrentUser();
  await signOut({ redirect: false });
  if (current) revalidateUserData(current.user_id);
  return { ok: true };
}
