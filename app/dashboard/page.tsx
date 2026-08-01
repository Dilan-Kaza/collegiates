import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";
import { getSettings } from "@functions/data";
import { getMe } from "@functions/actions";
import { requireCompetitor } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// dashboard page (server component)

export default async function Page() {
  // Gate before fetching: unauthenticated users go to sign-in, and organizers
  // (who have no competitor dashboard) go straight to the organizer console —
  // both before any dashboard data is fetched or rendered.
  const user = await requireCompetitor();
  // Independent reads, so they resolve together. On the redirect path below getMe
  // is wasted, but it's cached and that path fires once per competitor per year.
  const [settings, userinfo] = await Promise.all([getSettings(), getMe()]);
  // To /profile/setup when there's no profile yet, or it was last confirmed
  // under an earlier competition year (re-confirmed once per new reg_year).
  const currentYear = settings?.reg_year;
  const profile = user.competitor_profile;
  if (!profile || (currentYear != null && profile.last_reg_year !== currentYear)) {
    redirect("/profile/setup");
  }
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.settings]: settings, [cacheKeys.currentUser]: userinfo }} />
      <Dashboard settings={settings ?? {}} userinfo={userinfo ?? {}} />
    </>
  );
}
