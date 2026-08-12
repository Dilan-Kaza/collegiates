import { requireUser } from "@/lib/auth";
import EditProfileInfo from "./EditProfileInfo";
// edit profile info page (server component) — change password / change email

export default async function Page() {
  const user = await requireUser();
  return <EditProfileInfo email={user.email} />;
}
