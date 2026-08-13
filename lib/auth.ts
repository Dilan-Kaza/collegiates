import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { loadSettings } from "./settings";
import { isCompetitionDay } from "./dates";
import { auth } from "@/auth";

/**
 * The signed-in user as the rest of the server sees them.
 *
 * @remarks
 * Always carries `competitor_profile` — the one-to-one table the competitor
 * fields (gender, school, skill level, payment flags) moved to — so callers can
 * read them without a second query.
 */
export type CurrentUser = Prisma.UserGetPayload<{ include: { competitor_profile: true } }>;

/**
 * Resolves the authenticated user from the Auth.js session cookie.
 *
 * @remarks
 * React's `cache()` memoizes this **per request only**, so a `user_type`
 * change or a deactivation takes effect on the very next request rather than
 * whenever a session happens to expire.
 *
 * Two things can invalidate an otherwise-valid session token:
 *
 * - `is_active` is false — the account has not clicked its activation link, or
 *   has been disabled.
 * - `token_version` no longer matches the value embedded in the session. A
 *   password change or reset bumps the column, which revokes every session
 *   issued before it, on every device, without a server-side session table.
 *   The comparison reuses the lookup this function already does.
 *
 * @returns The user with their competitor profile, or `null` when there is no
 * usable session.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.user_id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: { competitor_profile: true },
  });
  if (!user || !user.is_active) return null;
  if (user.token_version !== session.user.token_version) return null;
  return user;
});

/**
 * Server-Component gate requiring any signed-in user.
 *
 * @remarks
 * Call it at the top of a `page.tsx` so the redirect resolves before any markup
 * is produced. Server actions use the `*Gate` helpers in
 * {@link "functions/actions/shared"} instead, which return an `{ error }` a
 * form can display rather than redirecting.
 *
 * @returns The signed-in user.
 * @throws A Next.js redirect to `/signin` when there is no session.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/**
 * Server-Component gate for the organizer console.
 *
 * @returns The signed-in user.
 * @throws A Next.js redirect to `/` unless {@link canAccessOrganizer} allows them.
 */
export async function requireOrganizer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !(await canAccessOrganizer(user))) redirect("/");
  return user;
}

/**
 * Server-Component gate for `/admin` (creating settings rows and school accounts).
 *
 * @returns The signed-in user.
 * @throws A Next.js redirect to `/` for anyone who is not `user_type` `Admin`.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) redirect("/");
  return user;
}

/**
 * Server-Component gate for the competitor area.
 *
 * @remarks
 * Organizers and admins are sent to their own console rather than bounced home,
 * so a mistyped URL lands somewhere useful. A School account that is not the
 * current host has no competitor area at all and goes to `/`.
 *
 * @returns The signed-in competitor.
 * @throws A Next.js redirect to `/signin`, `/organizer`, or `/`.
 */
export async function requireCompetitor(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (await canAccessOrganizer(user)) redirect("/organizer");
  if (!isCompetitor(user)) redirect("/");
  return user;
}

/**
 * Where a signed-in user belongs when they have not asked for a particular page.
 *
 * @remarks
 * Takes a structural parameter rather than a {@link CurrentUser} because
 * `loginAction` routes by this too, and has to work from its own narrow
 * `select`: the session cookie it just set is not readable back within the same
 * request.
 *
 * A competitor with no profile, or one last confirmed under an earlier
 * competition year, is sent to the profile step — the same rule
 * `/competitor`'s own page gate applies.
 *
 * @param user - Identity, role, and the competitor profile's `last_reg_year`.
 * @returns The path to send them to.
 */
export async function landingRoute(user: {
  user_id: string;
  user_type: string;
  competitor_profile: { last_reg_year: number | null } | null;
}): Promise<string> {
  if (await canAccessOrganizer(user)) return "/organizer";
  // A School account that isn't the current host has no area of its own.
  if (!isCompetitor(user)) return "/";
  const settings = await loadSettings();
  const currentYear = settings?.reg_year;
  const profile = user.competitor_profile;
  if (!profile || (currentYear != null && profile.last_reg_year !== currentYear)) {
    return "/competitor/profile";
  }
  return "/competitor";
}

/**
 * The inverse of {@link requireUser}, for the sign-in and sign-up pages.
 *
 * @remarks
 * Routes an already-signed-in visitor in one hop via {@link landingRoute};
 * forwarding everyone to `/competitor` would make an organizer bounce a second
 * time off {@link requireCompetitor}.
 *
 * @throws A Next.js redirect when a session exists. Returns normally otherwise.
 */
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect(await landingRoute(user));
}

type UserTypeHolder = { user_type: string } | null | undefined;

/** Whether the user holds a School account, the `user_type` organizers are given. */
export const isOrganizer = (user: UserTypeHolder): boolean => user?.user_type === "School";

/** Whether the user holds a competitor account. */
export const isCompetitor = (user: UserTypeHolder): boolean => user?.user_type === "Competitor";

/** Whether the user holds an admin account. */
export const isAdmin = (user: UserTypeHolder): boolean => user?.user_type === "Admin";

/**
 * Who may see live scoring, and how much of it.
 *
 * @remarks
 * Organizers and admins may look at any time, including the judge-by-judge
 * columns. Competitors may look only while the competition is running, and see
 * outcomes only. Everyone else sees nothing.
 *
 * @param user - The viewer, or null for an anonymous visitor.
 * @returns `allowed` gates the page and the read; `detail` gates the per-judge
 * columns, which are stripped server-side rather than hidden in the markup.
 */
export async function canViewLiveScores(
  user: { user_id: string; user_type: string } | null | undefined,
): Promise<{ allowed: boolean; detail: boolean }> {
  if (!user) return { allowed: false, detail: false };
  if (await canAccessOrganizer(user)) return { allowed: true, detail: true };
  if (!isCompetitor(user)) return { allowed: false, detail: false };
  const settings = await loadSettings();
  return { allowed: isCompetitionDay(settings?.comp_date), detail: false };
}

/**
 * Whether the user may use the organizer console.
 *
 * @remarks
 * Organizer access is **not** tied to `user_type`: it is the single host named
 * on the current Settings row, plus admins. A School account that hosted a
 * previous year has no console until it is named host again. Resolving the host
 * reads settings, which is why this is async.
 *
 * @param user - The viewer, or null.
 */
export async function canAccessOrganizer(user: { user_id: string; user_type: string } | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const settings = await loadSettings();
  return !!settings && settings.host_id === user.user_id;
}
