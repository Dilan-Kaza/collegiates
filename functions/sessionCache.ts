"use client";

import { useSyncExternalStore } from "react";

// sessionStorage-backed replacement for the old Redux `sessionCache` slice.
// Data lives in the browser's per-tab sessionStorage (cleared when the tab
// closes) instead of in-memory Redux state. A small subscription layer makes
// reads reactive so components still re-render when a cached value changes,
// via `useSessionCache` (built on useSyncExternalStore).

// All keys are namespaced so clearAll() only touches our own entries and never
// stomps unrelated sessionStorage keys.
const PREFIX = "sc:";

const namespaced = (key: string) => PREFIX + key;

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

// useSyncExternalStore requires a referentially stable snapshot when the value
// is unchanged, otherwise React re-renders forever. We cache the parsed value
// per key and only re-parse when the underlying raw string differs.
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function safeParse<T>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
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

export function setSessionCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(namespaced(key), JSON.stringify(data));
  snapshots.delete(key);
  emit(key);
}

export function clearSessionCache(key: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(namespaced(key));
  snapshots.delete(key);
  emit(key);
}

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

// Reactive read: re-renders the component whenever `key`'s cached value changes
// (same tab or cross-tab). Returns undefined during SSR and when the key is
// absent, matching the previous Redux selector semantics.
export function useSessionCache<T>(key: string): T | undefined {
  return useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => getSessionCache<T>(key),
    () => undefined,
  );
}
