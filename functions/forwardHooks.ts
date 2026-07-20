"use client";

import { useSession } from "@functions/sessionContext";
import { useNavigate } from "@/routerCompat";
import { useEffect } from "react";

// Redirect hooks driven by the Auth.js session (via useSession) instead of the
// old Redux loginStatus slice. SessionProvider is seeded server-side, so the
// session is already resolved on first render — `status` is only ever
// "authenticated" or "unauthenticated", never a transient "loading".

function useForwardDashboard() {
  const { status } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (status === "authenticated") nav("/dashboard");
  }, [status]);
}

function useForwardSignIn() {
  const { status } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") nav("/signin");
  }, [status]);
}

function useForwardIfNotOrganizer() {
  const { data } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    // The session is server-seeded, so `data` is already resolved on first
    // render — no "loading" state to wait through before redirecting.
    if (data?.user?.user_type !== "O") nav("/");
  }, [data]);
}

export { useForwardDashboard, useForwardSignIn, useForwardIfNotOrganizer };
