import "./globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { Metadata } from "next";
// (root layout + metadata)
import type { ReactNode } from "react";
import Providers from "./providers";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { NavBar, NavDock, BackgroundShapes, Notif, LoadingOverlay } from "@components";

export const metadata: Metadata = {
  title: "Collegiate Wushu",
  description: "Collegiate Wushu",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const rawSession = await auth();
  // Resolve the signed-in user's first name on the server so the nav shows it
  // immediately, with no client fetch or auth-status flash.
  const currentUser = rawSession ? await getCurrentUser() : null;
  const firstName = currentUser?.first_name ?? "";
  // Seed the client session as authenticated ONLY when a real user row backs the
  // JWT. A JWT can outlive its user (DB reset, deleted account, wrong DB), and
  // every server-side gate (requireUser/requireOrganizer) is DB-backed via
  // getCurrentUser. Seeding the context straight from the raw JWT would leave the
  // client believing it's signed in while the gates reject it — the infinite
  // dashboard<->signin redirect loop. Passing null here makes the context agree
  // with the server, which also trips SessionProvider's reconciler to drop any
  // stale per-tab session cache.
  const session = currentUser ? rawSession : null;
  return (
    <Providers session={session}>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="https://use.typekit.net/org5cfx.css" />
          <link rel="stylesheet" href="https://use.typekit.net/zao2vdq.css" />
        </head>
        <body>
          <div
            id="bg-component"
            className="bg-tertiary fixed h-screen w-screen -top-[0svh] left-0 -z-20"
          />
          <BackgroundShapes />

          <div className="hidden md:block">
            <NavBar firstName={firstName} />
          </div>

          <div className="antialiased text-dark font-grotesk lg:w-[80%] lg:translate-x-[12.5%] my-2">
            {children}
          </div>

          <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center sm:hidden">
            <Notif />
          </div>
          <div className="hidden sm:block">
            <Notif />
          </div>
          <div className="md:hidden pt-14">
            <NavDock firstName={firstName} />
          </div>
          <LoadingOverlay />
        </body>
      </html>
    </Providers>
  );
}
