import Dashboard from "./Dashboard";
import { getSettings } from "@functions/data";
import { getMe } from "@functions/actions";
import { requireUser } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// dashboard page (server component)

export default async function Page() {
  // Gate auth before fetching so unauthenticated users are redirected to sign-in.
  await requireUser();
  const [settings, userinfo] = await Promise.all([getSettings(), getMe()]);
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.settings]: settings, [cacheKeys.currentUser]: userinfo }} />
      <Dashboard settings={settings ?? {}} userinfo={userinfo ?? {}} />
    </>
  );
}
