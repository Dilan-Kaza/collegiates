"use client";

import { useEffect, useRef } from "react";
import { setSessionCache } from "@functions/sessionCache";

// Bridges server-fetched data into the client session cache. A server page
// fetches its data, passes it to the matching client component as props, and
// also hands it to <CacheSeed entries={{ [cacheKeys.x]: value }} />. On mount
// the entries are written to sessionStorage, so a later client-side read of the
// same key (via the cachedFetchers) resolves straight from the cache instead of
// re-hitting the server action — even for data that only ever loads on the
// server. Because each server render is authoritative, seeding overwrites any
// stale entry, refreshing the cache on every navigation that carries the data.
//
// `undefined` entries are skipped (nothing was fetched for that key); `null` is
// seeded as a real value, matching the "no row" results the actions return.
export default function CacheSeed({ entries }: { entries: Record<string, unknown> }) {
  // Seed once per mount. `entries` is a fresh object each render, so it stays in
  // the dependency array for lint correctness, but the ref stops re-seeding on
  // unrelated re-renders of the parent.
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
