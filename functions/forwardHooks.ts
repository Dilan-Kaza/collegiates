"use client";

import { useSession } from "@functions/sessionContext";
import { useNavigate } from "@/routerCompat";
import { useEffect } from "react";

// Redirect hooks driven by the Auth.js session (via useSession) instead of the
// old Redux loginStatus slice. `status` is "loading" until the session is known;
// SessionProvider is seeded server-side so it's usually resolved on first render.

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
  const { data, status } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (status === "loading") return;
    if (data?.user?.user_type !== "O") nav("/");
  }, [data, status]);
}

export { useForwardDashboard, useForwardSignIn, useForwardIfNotOrganizer };
