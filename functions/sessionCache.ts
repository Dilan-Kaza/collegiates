"use client";

import { useSyncExternalStore } from "react";
import superjson from "superjson";

/**
 * The per-tab `sessionStorage` cache, with reactive reads.
 *
 * @remarks
 * This is the client half of the caching story: server data arrives as props,
 * gets seeded here, and is read from here on later navigations, so moving
 * between pages repaints instantly instead of refetching.
 *
 * Entries live until a mutation clears them or the tab closes. A subscription
 * layer makes reads reactive through {@link useSessionCache}, and a `storage`
 * listener keeps sibling tabs in step.
 *
 * Values are serialized with **superjson**, not `JSON`, so the DTOs' `Date`
 * fields survive the round trip instead of flattening to strings.
 *
 * See {@link "functions/cacheKeys"} for the key registry and the rules for
 * adding one.
 *
 * @packageDocumentation
 */

// Namespaced so clearAll() never stomps unrelated sessionStorage keys.
const PREFIX = "sc:";

const namespaced = (key: string) => PREFIX + key;

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

// useSyncExternalStore needs a referentially stable snapshot or React loops, so
// the parsed value is cached per key and re-parsed only when the raw differs.
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function safeParse<T>(raw: string): T | undefined {
  try {
    return superjson.parse<T>(raw);
  } catch {
    return undefined;
  }
}

function emit(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

// Cross-tab writes fire a `storage` event (never same-tab); invalidate the
// affected snapshot and notify subscribers so tabs stay in sync.
let storageListenerAttached = false;
function attachStorageListener(): void {
  if (storageListenerAttached || typeof window === "undefined") return;
  storageListenerAttached = true;
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.sessionStorage) return;
    if (event.key === null) {
      // sessionStorage.clear() elsewhere — invalidate everything we track.
      snapshots.clear();
      listeners.forEach((_set, key) => emit(key));
      return;
    }
    if (!event.key.startsWith(PREFIX)) return;
    const key = event.key.slice(PREFIX.length);
    snapshots.delete(key);
    emit(key);
  });
}

/**
 * Reads one cache entry.
 *
 * @param key - A key from `cacheKeys`.
 * @returns The value, or `undefined` during SSR and for a key that is absent.
 * A parse failure also reads as absent rather than throwing.
 */
export function getSessionCache<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(namespaced(key));
  const snapshot = snapshots.get(key);
  if (snapshot && snapshot.raw === raw) {
    return snapshot.value as T | undefined;
  }
  const value = raw === null ? undefined : safeParse<T>(raw);
  snapshots.set(key, { raw, value });
  return value as T | undefined;
}

/**
 * Writes one cache entry and notifies its subscribers.
 *
 * @param key - A key from `cacheKeys`.
 * @param data - The value. Store `null` rather than `undefined` for "nothing" —
 * an undefined entry reads back as a miss, which would re-arm a refetch.
 */
export function setSessionCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(namespaced(key), superjson.stringify(data));
  snapshots.delete(key);
  emit(key);
}

/**
 * Drops one cache entry, so its binding refetches.
 *
 * @remarks
 * The standard follow-up to a successful mutation: clear the keys the write
 * invalidated and let `useCachedResource` refill them.
 *
 * @param key - A key from `cacheKeys`.
 */
export function clearSessionCache(key: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(namespaced(key));
  snapshots.delete(key);
  emit(key);
}

/**
 * Drops every entry this cache owns.
 *
 * @remarks
 * For sign-out, where the whole tab's view of the data belongs to someone who is
 * no longer signed in. Only prefixed keys are removed, so unrelated
 * `sessionStorage` entries survive.
 */
export function clearAllSessionCache(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const k = window.sessionStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => window.sessionStorage.removeItem(k));
  snapshots.clear();
  listeners.forEach((_set, key) => emit(key));
}

function subscribe(key: string, listener: Listener): () => void {
  attachStorageListener();
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(key);
  };
}

/**
 * Reactive read: re-renders the component whenever `key` changes, in this tab or
 * another.
 *
 * @remarks
 * Most components should use `useCachedResource` instead, which binds a
 * server-rendered value to its entry and handles refilling. Reach for this
 * directly only to observe an entry you are not responsible for seeding.
 *
 * @param key - A key from `cacheKeys`.
 * @returns The value, or `undefined` during SSR and when the key is absent.
 */
export function useSessionCache<T>(key: string): T | undefined {
  return useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => getSessionCache<T>(key),
    () => undefined,
  );
}
