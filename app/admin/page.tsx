import Admin from "./Admin";
import { getColleges, getSchoolAccounts } from "@functions/data";
import { requireAdmin } from "@/lib/auth";
// admin console (server component): create settings + school accounts

export default async function Page() {
  // Admin-only. Gate before any data fetch so non-admins never see the page.
  await requireAdmin();
  const [colleges, schools] = await Promise.all([getColleges(), getSchoolAccounts()]);
  // <Admin> binds the college list to its cache entry, which is what seeds it. The school-account
  // list has no entry: this is its only consumer and nothing invalidates it, so it stays a prop.
  return <Admin colleges={colleges} schools={schools} />;
}
