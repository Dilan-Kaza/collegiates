"use client";

import { useAppSelector } from "@/store/hooks";

// Presentational full-screen loading overlay (no hooks, no state). Shared by the
// redux-driven <LoadingOverlay /> below and by Next's route-level loading.tsx,
// which renders it via Suspense while a server component resolves during
// navigation. `fixed inset-0` means it covers the viewport wherever it's
// mounted in the tree.
export default function LoadingScreen({ boxed = false }: { boxed?: boolean }) {
    // With `boxed`, wrap the spinner in an opaque-black squircle so it stays
    // legible over any page background (`corner-shape` renders a true squircle
    // where supported, falling back to rounded corners; the spinner uses the
    // bright secondary so it reads against the black). Without it, the spinner
    // floats centered over a transparent overlay.
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

// App-wide loading screen. Mounted once in the root layout and driven by the
// `loading` slice — dispatch setLoading(true)/setLoading(false) from any client
// component to cover the whole viewport with a centered spinner. (Waits on
// server-rendered navigations are handled separately by the route-level
// loading.tsx, which shows the same <LoadingScreen /> via Suspense.)
function LoadingOverlay() {
    const loading = useAppSelector(state => state.loading.loading);

    if (!loading) return null;

    return <LoadingScreen boxed />;
}

export { LoadingOverlay };
