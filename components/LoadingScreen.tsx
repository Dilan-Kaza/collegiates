"use client";

import { useAppSelector } from "@/store/hooks";

// Presentational full-screen overlay (no hooks, no state), shared by
// <LoadingOverlay /> and route-level loading.tsx. `fixed inset-0` covers the viewport.
export default function LoadingScreen({ boxed = false }: { boxed?: boolean }) {
    // `boxed` puts the spinner in an opaque squircle so it stays legible over any
    // background; otherwise it floats centered on a transparent overlay.
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

// App-wide loading screen: mounted once in the root layout, driven by the
// `loading` slice. Server-render waits go through route-level loading.tsx instead.
function LoadingOverlay() {
    const loading = useAppSelector(state => state.loading.loading);

    if (!loading) return null;

    return <LoadingScreen boxed />;
}

export { LoadingOverlay };
