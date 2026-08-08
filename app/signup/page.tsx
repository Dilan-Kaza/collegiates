import SignUp from "./SignUp";

// Sign-up only creates the account, so it needs no server data. Kept a server
// component for routing consistency.
export default async function Page() {
  return <SignUp />;
}
