"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { verifySession } from "@functions/actions";

/**
 * A server-seeded replacement for `next-auth/react`'s `SessionProvider`.
 *
 * @remarks
 * The root layout resolves the session on the server and passes it in, so there
 * is no client-side `/api/auth/session` fetch — which is just as well, since
 * this app has no such route. The practical benefit is that the first paint
 * already knows who is signed in: no loading state, no auth-status flash.
 *
 * @packageDocumentation
 */

type SessionStatus = "authenticated" | "unauthenticated";

interface SessionValue {
  data: Session | null;
  status: SessionStatus;
}

const SessionContext = createContext<SessionValue>({
  data: null,
  status: "unauthenticated",
});

/**
 * Provides the server-resolved session to the client tree.
 *
 * @remarks
 * Also arms a revalidator: the JWT can expire mid-session, or be revoked by a
 * password change on another device, so the session is re-verified when the tab
 * regains focus and the tree re-renders as signed out once the server disagrees.
 * That check is throttled to once a minute, matching the server-side user-data
 * cache TTL — alt-tabbing fires `focus` and `visibilitychange` together.
 *
 * @param session - The result of `auth()`, resolved in the root layout. Pass
 * `null` for a signed-out visitor.
 */
export function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  // Memoized: a fresh object re-renders every useSession() consumer on every
  // render of this provider, which sits at the root.
  const value = useMemo<SessionValue>(
    () => ({ data: session, status: session ? "authenticated" : "unauthenticated" }),
    [session],
  );

  useSessionRevalidator(value.status);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Shortest gap between two server-side session checks, matching the user-data
// cache TTL.
const SESSION_RECHECK_MS = 60_000;

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
        // "Couldn't tell", not "signed out" — leave the session alone. Caught
        // because a rejection from an event listener escapes unhandled.
        console.error("[verifySession]", err);
      } finally {
        // Stamped whatever the outcome: advancing only on success left a failing
        // check unthrottled, firing a request on every later tab switch.
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

/**
 * Reads the current session.
 *
 * @returns `data` (the session or null) and `status`. There is no `"loading"`
 * status: the session is server-seeded, so it is known at first paint.
 */
export function useSession(): SessionValue {
  return useContext(SessionContext);
}
