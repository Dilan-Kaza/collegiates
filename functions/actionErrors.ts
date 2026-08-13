"use client";

/**
 * Client-side handling of the `{ data } | { error }` shape every mutation
 * returns.
 *
 * @remarks
 * Two mistakes these helpers exist to prevent: reading `error.detail` alone,
 * which silently drops field-keyed errors, and awaiting an action bare, which
 * strands a `loading` flag forever if it rejects.
 *
 * @packageDocumentation
 */

import type { FieldErrors } from "@functions/actions";

/**
 * The message to show for a returned `{ error }`.
 *
 * @remarks
 * Prefers `detail`, the general message, and otherwise falls back to the first
 * field message — so nothing an action reports goes unseen, even when the form
 * has no field to attach it to.
 *
 * @param error - The errors an action returned, if any.
 * @param fallback - Shown when there is no error object or no message in it.
 */
export function errorMessage(error: FieldErrors | undefined, fallback: string): string {
  if (!error) return fallback;
  return error.detail || Object.values(error).find(Boolean) || fallback;
}

/**
 * The confirmable warning in an `{ error }`, if there is one.
 *
 * @remarks
 * An error keyed `confirm` is a rule the action will write past if the user says
 * so: the UI offers "Save anyway" and re-submits with `override: true`. Carried
 * as an error key rather than a separate flag so a caller that does not handle
 * confirmation still shows the message instead of silently succeeding.
 *
 * @param error - The errors an action returned, if any.
 * @returns The warning text, or `undefined` when the failure is not confirmable.
 */
export function confirmMessage(error: FieldErrors | undefined): string | undefined {
  return error?.confirm || undefined;
}

/**
 * Runs a mutation, normalizing a rejection into the `{ error }` shape the action
 * itself would have returned.
 *
 * @remarks
 * Actions are written not to throw, but a network failure or a bug still can —
 * and an unhandled rejection leaves the submit button spinning. Wrapping here
 * means every call site handles exactly one outcome type.
 *
 * @param action - The mutation to run.
 * @param fallback - The message to report if it rejects. In production Next
 * replaces a server-side throw with an opaque digest, so there is nothing in the
 * error itself worth showing — it is logged instead.
 */
export async function runAction<T>(
  action: () => Promise<{ data?: T; error?: FieldErrors }>,
  fallback: string,
): Promise<{ data?: T; error?: FieldErrors }> {
  try {
    return await action();
  } catch (err) {
    console.error("[action]", err);
    return { error: { detail: fallback } };
  }
}
