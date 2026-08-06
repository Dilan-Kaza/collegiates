"use client";

import { useEffect } from "react";

// Last-resort boundary: app/error.tsx cannot catch a throw from the root layout, which reads
// the session. Replaces the document, so it owns <html>/<body> and can't rely on app CSS.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
              The site couldn&apos;t be loaded. This is usually temporary — please try again.
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>
                Reference: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
