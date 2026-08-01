import SignIn from "./SignIn";

// Sign-in talks to loginAction directly, so it needs no server data. Kept a
// server component for routing consistency.
export default async function Page() {
  return <SignIn />;
}
