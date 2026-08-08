import "./globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";
import { auth } from "@/auth";
import { getCurrentUser, canViewLiveScores } from "@/lib/auth";
import { NavBar, NavDock, BackgroundShapes, Notif, LoadingOverlay, Footer } from "@components";
// root layout + metadata

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
  // Whether to offer the Live tab, resolved here so no client decides what day it is. Both
  // reads it needs are Data-Cache backed, so this is not a query per page render.
  const { allowed: liveScores } = await canViewLiveScores(currentUser);
  // Seed as authenticated only when a real user row backs the JWT — a JWT can
  // outlive its user, and seeding raw would loop dashboard<->signin forever.
  const session = currentUser ? rawSession : null;
  return (
    <Providers session={session}>
      <html lang="en">
        <head>
          {/* Both stylesheets are render-blocking and cross-origin, so the
              connection setup (DNS + TCP + TLS) would otherwise happen only once
              the parser reaches the first <link>. Warm it in parallel instead. */}
          <link rel="preconnect" href="https://use.typekit.net" />
          <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
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
            <NavBar firstName={firstName} liveScores={liveScores} />
          </div>

          <div className="antialiased text-dark font-grotesk lg:w-[80%] lg:translate-x-[12.5%] my-2">
            {children}
            <Footer />
          </div>

          <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center sm:hidden">
            <Notif />
          </div>
          <div className="hidden sm:block">
            <Notif />
          </div>
          {/* The dock is `position: fixed`, so it contributes no height to the
              document. This spacer reserves exactly the dock's own height
              (daisyUI: 4rem + the bottom safe-area inset) at the end of the
              page so content scrolls to a stop above the dock instead of
              disappearing behind it. */}
          <div className="md:hidden h-[calc(4rem+env(safe-area-inset-bottom))]">
            <NavDock firstName={firstName} liveScores={liveScores} />
          </div>
          <LoadingOverlay />
        </body>
      </html>
    </Providers>
  );
}
