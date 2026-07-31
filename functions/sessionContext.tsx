"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { verifySession } from "@functions/actions";
import { clearAllSessionCache, getSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions/cacheKeys";

// Server-seeded session context replacing next-auth/react's SessionProvider /
// useSession. The root layout resolves the session with auth() and passes it in;
// the login/logout server actions plus router.refresh() re-run the layout, so
// this value flips authenticated <-> unauthenticated without any client-side
// /api/auth/session fetch. Shape mirrors useSession() so consumers are unchanged.

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

// Reconciles the client's belief that it is signed in with the server's view,
// and — when they disagree — drops the per-tab sessionStorage data that makes
// the client act "logged in" (the cached currentUser the cache-first fetchers
// serve without re-checking). Two ways the beliefs diverge, both handled here:
//
//  1. The root layout re-ran auth() and seeded an UNAUTHENTICATED session, but
//     this tab still holds a cached currentUser from an earlier signed-in
//     render. Detected immediately from the seeded status; we clear on sight so
//     the next fetchMe() goes to the server instead of returning the stale user.
//
//  2. The JWT cookie expired MID-SESSION with no full reload, so the seeded
//     status is still (stale) "authenticated". We re-ask the server via
//     verifySession() whenever the tab regains focus; if it reports no session
//     we clear the cache and router.refresh(), which re-seeds the status as
//     unauthenticated and lets the server-side page gates redirect.
function useSessionCacheReconciler(status: SessionStatus) {
  const router = useRouter();

  // Case 1 — server says unauthenticated, but stale signed-in data lingers.
  // Gate on the currentUser marker so we never touch an anonymous visitor's
  // cached public data (settings, blog posts, ...).
  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (getSessionCache(cacheKeys.currentUser) !== undefined) {
      clearAllSessionCache();
    }
  }, [status]);

  // Case 2 — we believe we're signed in; verify with the server on focus and
  // drop everything if the session is gone.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    const revalidate = async () => {
      const { authenticated } = await verifySession();
      if (cancelled || authenticated) return;
      clearAllSessionCache();
      router.refresh();
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
