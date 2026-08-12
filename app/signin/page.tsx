import { redirectIfSignedIn } from "@/lib/auth";
import SignIn from "./SignIn";

// Sign-in talks to loginAction directly, so it needs no server data — only the
// gate, which sends an already-signed-in visitor on before the form renders.
export default async function Page() {
  await redirectIfSignedIn();
  return <SignIn />;
}
