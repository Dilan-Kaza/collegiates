"use client";

import { useAppSelector } from "@/store/hooks";

/**
 * A full-viewport loading overlay. Purely presentational — no hooks, no state.
 *
 * @remarks
 * Shared by {@link LoadingOverlay} and the route-level `loading.tsx` files.
 *
 * @param boxed - Puts the spinner in an opaque squircle so it stays legible over
 * any background. Unboxed it floats centred on a transparent overlay.
 */
export default function LoadingScreen({ boxed = false }: { boxed?: boolean }) {
    const boxClass = boxed
        ? "flex flex-col items-center justify-center gap-4 bg-black rounded-[2rem] [corner-shape:squircle] px-10 py-8 shadow-2xl"
        : "flex flex-col items-center justify-center gap-4 translate-y-[20vh]";
    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-label="Loading"
        >
            <div className={boxClass}>
                <span className="loading loading-spinner text-secondary w-14 h-14" />
                <span className="text-lg font-medium text-off-white">Loading…</span>
            </div>
        </div>
    );
}

/**
 * The app-wide loading overlay, mounted once in the root layout.
 *
 * @remarks
 * Driven by the Redux `loading` slice, so any client component can raise it with
 * `setLoading(true)`. Waits on a *server render* go through the route-level
 * `loading.tsx` files instead, which Next handles as a Suspense fallback.
 */
function LoadingOverlay() {
    const loading = useAppSelector(state => state.loading.loading);

    if (!loading) return null;

    return <LoadingScreen boxed />;
}

export { LoadingOverlay };
