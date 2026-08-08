import Admin from "./Admin";
import { getColleges, getSchoolAccounts } from "@functions/data";
import { requireAdmin } from "@/lib/auth";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";
// admin console (server component): create settings + school accounts

export default async function Page() {
  // Admin-only. Gate before any data fetch so non-admins never see the page.
  await requireAdmin();
  const [colleges, schools] = await Promise.all([getColleges(), getSchoolAccounts()]);
  return (
    <>
      <CacheSeed entries={{ [cacheKeys.colleges]: colleges }} />
      <Admin colleges={colleges} schools={schools} />
    </>
  );
}
