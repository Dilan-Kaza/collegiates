import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { loadSettings } from "./settings";
import { auth } from "@/auth";

// Always carries competitor_profile — the one-to-one table competitor fields
// moved to — so callers read gender/school/flags without a second query.
export type CurrentUser = Prisma.UserGetPayload<{ include: { competitor_profile: true } }>;

// Resolves the authenticated user from the Auth.js session cookie, or null.
// React `cache()` memoizes per request only, so it never leaks across users.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.user_id;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { user_id: userId },
    include: { competitor_profile: true },
  });
});

// Server-Component auth gates. Call at the top of a page so the redirect beats
// any markup (no client flash) and the user is ready for its data fetch.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireOrganizer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !(await canAccessOrganizer(user))) redirect("/");
  return user;
}

// Admin-only page gate (the /admin area: create settings + school accounts).
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) redirect("/");
  return user;
}

type UserTypeHolder = { user_type: string } | null | undefined;

export const isOrganizer = (user: UserTypeHolder): boolean => user?.user_type === "School";
export const isCompetitor = (user: UserTypeHolder): boolean => user?.user_type === "Competitor";
export const isAdmin = (user: UserTypeHolder): boolean => user?.user_type === "Admin";

// Organizer access is NOT tied to user_type: only the host named in the current
// settings, plus admins. Reads settings to resolve the host, so it must be awaited.
export async function canAccessOrganizer(user: { user_id: string; user_type: string } | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const settings = await loadSettings();
  return !!settings && settings.host_id === user.user_id;
}
