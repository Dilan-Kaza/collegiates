"use client";

import { useSession } from "@functions/sessionContext";
import { useNavigate } from "@/routerCompat";
import { useEffect } from "react";

// Redirect hook driven by useSession. SessionProvider is server-seeded, so
// `status` is resolved on first render — never a transient "loading".
//
// There is deliberately no client-side organizer/admin gate here: every route
// under /organizer and /admin is gated on the server by requireOrganizer /
// requireAdmin, which redirects before any markup renders.

// Forwards an already-signed-in visitor off an auth page. enabled=false suspends
// it, so the sign-in page can pick its own destination after signing someone in.
function useForwardDashboard(enabled = true) {
  const { status } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (enabled && status === "authenticated") nav("/competitor");
  }, [status, enabled, nav]);
}

export { useForwardDashboard };
