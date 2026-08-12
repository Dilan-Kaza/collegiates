"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// next/link rather than the routerCompat Link: this boundary can catch a failure
// from anywhere in the tree, so the escape hatch shouldn't depend on
// NavigationProvider's context being intact.
import NextLink from "next/link";

// Route-level error boundary. The read actions deliberately don't swallow database failures
// — an outage would render an empty dashboard — so a failed read lands here, with a retry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // In production the message is already replaced by `digest`; log whatever is
    // available so a report can be matched to the server-side entry.
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-off-white rounded-2xl border border-brown/50 px-6 py-8 max-w-md w-full flex flex-col gap-4 text-center">
        <div className="text-2xl font-semibold text-secondary">Something went wrong</div>
        <p className="text-sm text-gray-500">
          This page couldn&apos;t be loaded. This is usually temporary — try again in a moment.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400">Reference: {error.digest}</p>
        )}
        <div className="flex justify-center gap-2">
          <button
            className="btn btn-primary btn-sm"
            // reset() re-renders the segment; refresh() re-runs the server
            // components so the failed read is actually retried.
            onClick={() => { router.refresh(); reset(); }}
          >
            Try again
          </button>
          <NextLink href="/" className="btn btn-ghost btn-sm">
            Go home
          </NextLink>
        </div>
      </div>
    </div>
  );
}
