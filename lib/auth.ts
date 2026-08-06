import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { loadSettings } from "./settings";
import { isCompetitionDay } from "./dates";
import { auth } from "@/auth";

// Always carries competitor_profile — the one-to-one table competitor fields
// moved to — so callers read gender/school/flags without a second query.
export type CurrentUser = Prisma.UserGetPayload<{ include: { competitor_profile: true } }>;

// Resolves the authenticated user from the Auth.js session cookie, or null; `cache()` memoizes
// per request only. Re-read every request, so a user_type change or deactivation is immediate.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.user_id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: { competitor_profile: true },
  });
  return user?.is_active ? user : null;
});

// Server-Component auth gates. Call at the top of a page so the redirect beats any markup.
// Server actions use the *Gate helpers in functions/actions/shared.ts, which return { error }.
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

// Competitor-only page gate. Organizers and admins are sent to their own console; anyone else —
// a School account that isn't the current host — has no competitor area, so goes home.
export async function requireCompetitor(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (await canAccessOrganizer(user)) redirect("/organizer");
  if (!isCompetitor(user)) redirect("/");
  return user;
}

type UserTypeHolder = { user_type: string } | null | undefined;

export const isOrganizer = (user: UserTypeHolder): boolean => user?.user_type === "School";
export const isCompetitor = (user: UserTypeHolder): boolean => user?.user_type === "Competitor";
export const isAdmin = (user: UserTypeHolder): boolean => user?.user_type === "Admin";

// Who may see live scoring, and how much. Organizers and admins any time, including the
// judge-by-judge columns; competitors only while it runs, outcomes only. Anyone else, nothing.
export async function canViewLiveScores(
  user: { user_id: string; user_type: string } | null | undefined,
): Promise<{ allowed: boolean; detail: boolean }> {
  if (!user) return { allowed: false, detail: false };
  if (await canAccessOrganizer(user)) return { allowed: true, detail: true };
  if (!isCompetitor(user)) return { allowed: false, detail: false };
  const settings = await loadSettings();
  return { allowed: isCompetitionDay(settings?.comp_date), detail: false };
}

// Organizer access is NOT tied to user_type: only the host named in the current
// settings, plus admins. Reads settings to resolve the host, so it must be awaited.
export async function canAccessOrganizer(user: { user_id: string; user_type: string } | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const settings = await loadSettings();
  return !!settings && settings.host_id === user.user_id;
}
