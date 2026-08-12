"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { verifySession } from "@functions/actions";

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
  // Memoized on `session`: a fresh object re-renders every useSession() consumer — the nav bar,
  // the dock, the forward hooks — on every render of this provider, which sits at the root.
  const value = useMemo<SessionValue>(
    () => ({ data: session, status: session ? "authenticated" : "unauthenticated" }),
    [session],
  );

  useSessionRevalidator(value.status);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Shortest gap between two server-side session checks. Matches the 60s TTL the
// server-side user-data cache uses.
const SESSION_RECHECK_MS = 60_000;

// The JWT can expire mid-session, so re-verify on focus and re-render the tree as signed out once
// the server disagrees. Throttled because alt-tab fires `focus` and `visibilitychange` together.
function useSessionRevalidator(status: SessionStatus) {
  const router = useRouter();
  const lastChecked = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    const revalidate = async () => {
      if (inFlight.current) return;
      if (Date.now() - lastChecked.current < SESSION_RECHECK_MS) return;
      inFlight.current = true;
      try {
        const { authenticated } = await verifySession();
        if (cancelled || authenticated) return;
        router.refresh();
      } catch (err) {
        // A failed check means "couldn't tell", not "signed out", so the session is left alone.
        // Caught rather than left to reject: as event listeners, a rejection escapes unhandled.
        console.error("[verifySession]", err);
      } finally {
        // Stamped whatever the outcome. Advancing it only on success meant a failing check never
        // armed the throttle, so every later tab switch fired another request — indefinitely.
        lastChecked.current = Date.now();
        inFlight.current = false;
      }
    };

    const onFocus = () => void revalidate();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void revalidate();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, router]);
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
