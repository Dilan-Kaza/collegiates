import SignUp from "./SignUp";
import { requireGuest } from "@/lib/auth";

// Sign-up only creates the account, so it needs no server data (the college
// list moved to the /profile/setup step). requireGuest() forwards an
// already-authenticated visitor to /dashboard before anything renders.
export default async function Page() {
  await requireGuest();
  return <SignUp />;
}
