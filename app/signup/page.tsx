import SignUp from "./SignUp";

// Sign-up only creates the account, so it needs no server data (the college
// list moved to the /profile/setup step). Kept as a server component for
// routing consistency.
export default async function Page() {
  return <SignUp />;
}
