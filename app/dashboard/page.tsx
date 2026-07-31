import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";
import { getSettings } from "@functions/data";
import { getMe } from "@functions/actions";
import { requireUser, canAccessOrganizer } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// dashboard page (server component)

export default async function Page() {
  // Gate auth before fetching so unauthenticated users are redirected to sign-in.
  const user = await requireUser();
  // Organizers have no competitor dashboard — send them straight to the
  // organizer console before any dashboard data is fetched or rendered.
  if (await canAccessOrganizer(user)) redirect("/organizer");
  const settings = await getSettings();
  // Route the competitor to /profile/setup if they have no profile yet (sign-up
  // creates the account only) or if their profile was last confirmed under an
  // earlier competition year — they re-confirm it once per new reg_year.
  const currentYear = settings?.reg_year;
  const profile = user.competitor_profile;
  if (!profile || (currentYear != null && profile.last_reg_year !== currentYear)) {
    redirect("/profile/setup");
  }
  const userinfo = await getMe();
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.settings]: settings, [cacheKeys.currentUser]: userinfo }} />
      <Dashboard settings={settings ?? {}} userinfo={userinfo ?? {}} />
    </>
  );
}
