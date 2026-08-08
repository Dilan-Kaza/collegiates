"use client";

// Client-side handling of the { data } | { error } shape every mutation returns: `error.detail`
// alone drops field-keyed errors, and a bare `await` on a rejection strands `loading` forever.

import type { FieldErrors } from "@functions/actions";

// The message to show for a returned { error }. Prefers `detail` (the general message) and
// otherwise falls back to the first field message, so nothing an action reports goes unseen.
export function errorMessage(error: FieldErrors | undefined, fallback: string): string {
  if (!error) return fallback;
  return error.detail || Object.values(error).find(Boolean) || fallback;
}

// An error keyed `confirm` is a rule the action will write past if the user says so — the UI
// offers "Save anyway" and re-submits with `override: true`. A key, not a flag, so it still shows.
export function confirmMessage(error: FieldErrors | undefined): string | undefined {
  return error?.confirm || undefined;
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
