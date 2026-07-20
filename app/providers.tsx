"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "@functions/sessionContext";
import StoreProvider from "./storeProvider";

// Client providers: a server-seeded SessionProvider (auth state read via
// useSession from the server-resolved session, so there's no loading flash and
// no /api/auth/session round-trip) wrapping the Redux store, which now only
// holds transient UI state (success/error notifications and the blog filter).
export default function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
