"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { Provider } from "react-redux";
import { SessionProvider } from "@functions/sessionContext";
import { NavigationProvider } from "@components/NavigationProvider";
import store from "@/store";

// Client providers: a server-seeded SessionProvider (auth state read via
// useSession from the server-resolved session, so there's no loading flash and
// no /api/auth/session round-trip) wrapping the Redux store, which now only
// holds transient UI state (success/error notifications and the blog filter).
// A single shared store instance is used so the axios interceptors (which
// import `@/store` directly) dispatch into the same store the UI reads from.
export default function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <Provider store={store}>
        <NavigationProvider>{children}</NavigationProvider>
      </Provider>
    </SessionProvider>
  );
}
