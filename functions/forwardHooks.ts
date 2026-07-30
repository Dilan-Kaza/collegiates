"use client";

import { useSession } from "@functions/sessionContext";
import { useNavigate } from "@/routerCompat";
import { useEffect } from "react";

// Redirect hook driven by the Auth.js session (via useSession) instead of the
// old Redux loginStatus slice. SessionProvider is seeded server-side, so the
// session is already resolved on first render.
//
// (The equivalent "forward if already signed in" case for /signin and /signup
// is handled server-side by requireGuest() in lib/auth.ts instead of a client
// hook like this one — see app/signin/page.tsx and app/signup/page.tsx.)

function useForwardIfNotOrganizer() {
  const { data } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    // The session is server-seeded, so `data` is already resolved on first
    // render — no "loading" state to wait through before redirecting.
    if (data?.user?.user_type !== "O") nav("/");
  }, [data]);
}

export { useForwardIfNotOrganizer };
