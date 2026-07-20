"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Session } from "next-auth";

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
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
