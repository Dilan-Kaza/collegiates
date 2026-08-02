"use client";

// Client-side handling of the { data } | { error } shape every mutation action
// returns. Two problems these solve at every call site:
//
//  1. `error.detail` alone drops field-keyed errors. An action reports "You are
//     already in a groupset" as { groupset: ... } and "Host user not found." as
//     { host: ... }; reading only `detail` turns both into a generic fallback.
//  2. An action can still reject — a network drop between the browser and the
//     server action, or a bug outside the action's own try/catch. `await`ing one
//     bare leaves the caller's `loading` flag stuck on forever.

import type { FieldErrors } from "@functions/actions";

// The message to show for a returned { error }. Prefers `detail` (the general
// message) and otherwise falls back to the first field message, so nothing an
// action reports goes unseen.
export function errorMessage(error: FieldErrors | undefined, fallback: string): string {
  if (!error) return fallback;
  return error.detail || Object.values(error).find(Boolean) || fallback;
}

// Runs a mutation and normalizes a rejection into the same { error } shape the
// action itself would have returned, so callers only handle one outcome type.
export async function runAction<T>(
  action: () => Promise<{ data?: T; error?: FieldErrors }>,
  fallback: string,
): Promise<{ data?: T; error?: FieldErrors }> {
  try {
    return await action();
  } catch (err) {
    // In production Next replaces a server-side throw with an opaque digest, so
    // there is nothing here worth showing the user — log it and report `fallback`.
    console.error("[action]", err);
    return { error: { detail: fallback } };
  }
}
