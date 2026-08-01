"use client";

import { useEffect, useRef } from "react";
import { setSessionCache } from "@functions/sessionCache";

// Bridges server-fetched data into the client session cache so a later
// cachedFetchers read hits it. `undefined` is skipped; `null` is a real value.
export default function CacheSeed({ entries }: { entries: Record<string, unknown> }) {
  // Seed once per mount: `entries` is a fresh object each render, so the ref
  // stops re-seeding while the dep array stays lint-correct.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    for (const [key, value] of Object.entries(entries)) {
      if (value !== undefined) setSessionCache(key, value);
    }
  }, [entries]);
  return null;
}
