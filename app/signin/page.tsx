import SignIn from "./SignIn";
import { requireGuest } from "@/lib/auth";

// requireGuest() forwards an already-authenticated visitor to /dashboard
// before anything renders, mirroring requireUser()'s gate on the other
// protected pages. Also what makes the post-login redirect work: the client
// component's router.refresh() re-runs this server check, which redirects
// once the new session is visible.
export default async function Page() {
  await requireGuest();
  return <SignIn />;
}
