import { redirectIfSignedIn } from "@/lib/auth";
import SignUp from "./SignUp";

// Sign-up only creates the account, so it needs no server data — only the gate,
// which sends an already-signed-in visitor on before the form renders.
export default async function Page() {
  await redirectIfSignedIn();
  return <SignUp />;
}
