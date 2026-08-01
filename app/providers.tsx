"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { Provider } from "react-redux";
import { SessionProvider } from "@functions/sessionContext";
import { NavigationProvider } from "@components/NavigationProvider";
import store from "@/store";

// Client providers: server-seeded SessionProvider (no loading flash) around the
// Redux store, which holds only transient UI state. One shared store instance.
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
