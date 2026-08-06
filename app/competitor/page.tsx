import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";
import { getSettings } from "@functions/data";
import { getMe } from "@functions/actions";
import { requireCompetitor } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// dashboard page (server component)

export default async function Page() {
  // Gate before fetching: unauthenticated users go to sign-in, organizers to their console —
  // both before any dashboard data is fetched or rendered.
  const user = await requireCompetitor();

  // The redirect only needs settings, and requireCompetitor already returned the profile, so
  // it is decided before getMe runs — the setup path never pays for a dashboard payload.
  const settings = await getSettings();
  const currentYear = settings?.reg_year;
  const profile = user.competitor_profile;
  // To /competitor/profile when there's no profile yet, or it was last confirmed
  // under an earlier competition year (re-confirmed once per new reg_year).
  if (!profile || (currentYear != null && profile.last_reg_year !== currentYear)) {
    redirect("/competitor/profile");
  }

  const userinfo = await getMe();
  return (
    <>
      {/* `settings` has no client fetcher, so it stays a seed-only entry. */}
      <CacheSeed entries={{ [cacheKeys.settings]: settings }} />
      <Dashboard settings={settings ?? {}} userinfo={userinfo} />
    </>
  );
}
