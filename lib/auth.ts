import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { auth } from "@/auth";

// The current user always carries its competitor_profile (gender, school,
// student_type, competing/paid flags) so callers can read those without a
// second query. Competitor-specific fields moved off `users` into this
// one-to-one table keyed by user_id.
export type CurrentUser = Prisma.UserGetPayload<{ include: { competitor_profile: true } }>;

// Resolves the authenticated user from the Auth.js session cookie, or null.
// Callable inside route handlers / server components with no arguments.
//
// Wrapped in React `cache()`: a single request often resolves the current user
// several times (e.g. requireUser() then getMe()), and each call decodes the
// session JWT and hits Prisma. cache() memoizes the result for the duration of
// the request only — it is tied to that request/session and discarded the
// moment the request ends, so it never leaks across users.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.user_id;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: { competitor_profile: true },
  });
});

// Server-Component auth gates. Call at the top of a page so the redirect
// happens before any markup renders (no client-side flash) and the resolved
// user is available for the page's server-side data fetch. These replace the
// client-side useForwardSignIn / useForwardIfNotOrganizer effects.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireOrganizer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isOrganizer(user)) redirect("/");
  return user;
}

// Inverse of requireUser(): forwards an already-authenticated visitor away
// from guest-only pages (sign in / sign up) before anything renders, the same
// way requireUser()/requireOrganizer() gate the other direction. Always
// forwards to /dashboard regardless of user type — /dashboard's own
// isOrganizer check re-routes organizers to /organizer from there.
export async function requireGuest(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
}

type UserTypeHolder = { user_type: string } | null | undefined;

export const isOrganizer = (user: UserTypeHolder): boolean => user?.user_type === "O";
export const isCompetitor = (user: UserTypeHolder): boolean => user?.user_type === "C";
