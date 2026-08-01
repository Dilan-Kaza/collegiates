"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { verifySession } from "@functions/actions";
import { clearAllSessionCache, getSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions/cacheKeys";

// Server-seeded replacement for next-auth/react's SessionProvider: the root
// layout passes auth()'s result in, so no client /api/auth/session fetch runs.

type SessionStatus = "authenticated" | "unauthenticated";

interface SessionValue {
  data: Session | null;
  status: SessionStatus;
}

const SessionContext = createContext<SessionValue>({
  data: null,
  status: "unauthenticated",
});

export function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  const value: SessionValue = {
    data: session,
    status: session ? "authenticated" : "unauthenticated",
  };

  useSessionCacheReconciler(value.status);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Shortest gap between two server-side session checks. Matches the 60s TTL the
// server-side user-data cache uses.
const SESSION_RECHECK_MS = 60_000;

// Drops the per-tab sessionStorage that makes the client act "logged in" once the
// server disagrees. See the two divergence cases handled in the effects below.
function useSessionCacheReconciler(status: SessionStatus) {
  const router = useRouter();
  const lastChecked = useRef(0);
  const inFlight = useRef(false);

  // Case 1 — server says unauthenticated but stale signed-in data lingers. Gated
  // on the currentUser marker so an anonymous visitor's public cache is untouched.
  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (getSessionCache(cacheKeys.currentUser) !== undefined) {
      clearAllSessionCache();
    }
  }, [status]);

  // Case 2 — the JWT may have expired mid-session; re-verify on focus. Throttled
  // because alt-tab fires `focus` and `visibilitychange` together.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    const revalidate = async () => {
      if (inFlight.current) return;
      if (Date.now() - lastChecked.current < SESSION_RECHECK_MS) return;
      inFlight.current = true;
      try {
        const { authenticated } = await verifySession();
        lastChecked.current = Date.now();
        if (cancelled || authenticated) return;
        clearAllSessionCache();
        router.refresh();
      } finally {
        inFlight.current = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") revalidate();
    };

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, router]);
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
