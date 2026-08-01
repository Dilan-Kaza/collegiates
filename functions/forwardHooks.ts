"use client";

import { useSession } from "@functions/sessionContext";
import { useNavigate } from "@/routerCompat";
import { useEffect } from "react";

// Redirect hooks driven by useSession. SessionProvider is server-seeded, so
// `status` is resolved on first render — never a transient "loading".

// Forwards an already-signed-in visitor off an auth page. enabled=false suspends
// it, so the sign-in page can pick its own destination after signing someone in.
function useForwardDashboard(enabled = true) {
  const { status } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (enabled && status === "authenticated") nav("/dashboard");
  }, [status, enabled]);
}

function useForwardIfNotOrganizer() {
  const { data } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    // The session is server-seeded, so `data` is already resolved on first
    // render — no "loading" state to wait through before redirecting.
    if (data?.user?.user_type !== "School") nav("/");
  }, [data]);
}

export { useForwardDashboard, useForwardIfNotOrganizer };
