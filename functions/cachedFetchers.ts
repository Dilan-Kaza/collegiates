"use client";

import { useEffect, useRef } from "react";
import { getSessionCache, setSessionCache, useSessionCache } from "@functions/sessionCache";
import { cacheKeys, organizerRegistrationsKey } from "@functions/cacheKeys";
import {
  getMe,
  getCompetitorEvents,
  getRegistrations,
  getMyGroupset,
  getJoinableGroupsets,
  getBlogPostById,
  getPublicOrder,
  getSharedSettings,
  getSharedColleges,
  getSharedBlogPosts,
  getOrganizerBlogPosts,
  getOrganizerEvents,
  getOrganizerRegistrations,
  getOrganizerRegistration,
  getOrganizerGroupsets,
  getOrganizerGroupset,
  getOrganizerOrder,
} from "@functions/actions";
import type {
  CompetitorDTO,
  EventDTO,
  SettingsDTO,
  RegistrationDTO,
  GroupsetDTO,
  BlogDTO,
  OrderDTO,
  OrganizerGroupsetDTO,
  OrganizerRegistrationDTO,
} from "@/lib/api";

/**
 * Cache-first client fetchers over the read actions.
 *
 * @remarks
 * Each one checks `sessionStorage` first and only calls its action on a miss,
 * caching the result. Entries live until a mutation clears them or the tab
 * closes — see {@link "functions/sessionCache"}.
 *
 * Components rarely call these directly. The usual entry point is
 * {@link useCachedResource}, which binds a server-rendered prop to its cache
 * entry and passes the fetcher in for refills.
 *
 * @packageDocumentation
 */

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = getSessionCache<T>(key);
  if (hit !== undefined) return hit;
  const data = await fetcher();
  setSessionCache(key, data);
  return data;
}

// ---------- the read path components actually use ----------

/**
 * Binds a server-rendered value to its `sessionStorage` cache entry.
 *
 * @remarks
 * This is the read path components actually use, and the only thing that ever
 * seeds a cache entry. It does three things:
 *
 * 1. Writes `initial` — the server's copy, arriving as a prop — into the entry.
 * 2. Reads the entry reactively, so a sibling component's write shows up here.
 * 3. Refetches through `fetcher`, but **only** once a mutation has dropped the
 *    key. A populated entry is never refetched.
 *
 * `initial` is compared by **identity, not value**: a new object means the
 * server sent a fresh payload for this route, and the server's copy always wins
 * over whatever an earlier visit left in `sessionStorage`.
 *
 * A failed refetch leaves the entry empty and falls back to `initial`, which
 * shows slightly stale data rather than blanking the view.
 *
 * @param key - A key from `cacheKeys`.
 * @param fetcher - The refill, from this module. Safe to pass as an inline arrow.
 * @param initial - The server-rendered value.
 * @returns The cached value, or `initial` before the first seed. Note this is
 * superjson's round-trip of what the server sent, so identity changes once.
 *
 * @example
 * ```tsx
 * const settings = useCachedResource(cacheKeys.settings, fetchSettings, initialSettings);
 * ```
 */
export function useCachedResource<T>(key: string, fetcher: () => Promise<T>, initial: T): T {
  const cached = useSessionCache<T>(key);

  // Latest-ref so a call site can pass an inline arrow (the uuid-parameterized
  // fetchers all do) without its identity re-arming the refetch effect below.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const seededFrom = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (seededFrom.current === initial) return;
    seededFrom.current = initial;
    setSessionCache(key, initial);
  }, [key, initial]);

  useEffect(() => {
    // Before the first seed there is nothing to refill — `undefined` here just
    // means the effect above has not run yet, not that a mutation cleared it.
    if (cached !== undefined || seededFrom.current === undefined) return;
    let cancelled = false;
    fetcherRef
      .current()
      // Stored as null rather than undefined: an undefined entry reads back as a
      // miss, which would re-arm this effect and refetch forever.
      .then((data) => {
        if (!cancelled) setSessionCache(key, (data ?? null) as T);
      })
      .catch((err) => {
        console.error(`[useCachedResource:${key}]`, err);
      });
    return () => {
      cancelled = true;
    };
  }, [cached, key]);

  return cached ?? initial;
}

// ---------- shared across routes ----------

/**
 * The competition settings.
 *
 * @returns `{}` when no settings row exists, normalizing the action's `null` to
 * the `Partial<SettingsDTO>` every page already passes its client component.
 */
export const fetchSettings = (): Promise<Partial<SettingsDTO>> =>
  cached(cacheKeys.settings, async () => (await getSharedSettings()) ?? {});

/** Every college, as `{ name: id }` for the pickers. */
export const fetchColleges = (): Promise<Record<string, string>> =>
  cached(cacheKeys.colleges, getSharedColleges);

/** The public blog list, as excerpts. */
export const fetchBlogPosts = (): Promise<BlogDTO[]> =>
  cached(cacheKeys.blogPosts, getSharedBlogPosts);

// ---------- competitor / public ----------

/** The signed-in competitor's own payload. */
export const fetchMe = (): Promise<CompetitorDTO | null> =>
  cached(cacheKeys.currentUser, getMe);

/** The events this competitor is eligible to register for. */
export const fetchCompetitorEvents = (): Promise<EventDTO[]> =>
  cached(cacheKeys.competitorEvents, getCompetitorEvents);

/** This competitor's registrations for the current year. */
export const fetchRegistrations = (): Promise<RegistrationDTO[]> =>
  cached(cacheKeys.registrations, getRegistrations);

/** This competitor's own team for the current year. */
export const fetchGroupSet = (): Promise<GroupsetDTO[]> =>
  cached(cacheKeys.groupSet, getMyGroupset);

/** The teams this competitor could join — their school's, this year. */
export const fetchJoinableGroupsets = (): Promise<GroupsetDTO[]> =>
  cached(cacheKeys.joinableGroupsets, getJoinableGroupsets);

/** One blog post with its full body. Keyed per post. */
export const fetchBlogPostById = (blogId: string): Promise<BlogDTO | null> =>
  cached(cacheKeys.blogPost(blogId), () => getBlogPostById(blogId));

/** The published event order, or null when it is unpublished. */
export const fetchPublicOrder = (): Promise<OrderDTO | null> =>
  cached(cacheKeys.publicOrder, getPublicOrder);

// ---------- organizer ----------

/** The organizer console's post list. */
export const fetchOrganizerBlogPosts = (): Promise<BlogDTO[]> =>
  cached(cacheKeys.organizerBlogPosts, getOrganizerBlogPosts);

/** The whole event catalogue, for the builder. */
export const fetchOrganizerEvents = (): Promise<EventDTO[]> =>
  cached(cacheKeys.organizerEvents, getOrganizerEvents);

/**
 * Every competitor's registration state, optionally filtered.
 *
 * @param filters - Omitted means the default organizer view, which shares the
 * canonical cache key. A filtered query is a different result set, so it derives
 * its own key and is not dropped by the mutations that clear the plain one.
 */
export const fetchOrganizerRegistrations = (
  filters?: Parameters<typeof getOrganizerRegistrations>[0],
): Promise<OrganizerRegistrationDTO[]> =>
  cached(organizerRegistrationsKey(filters), () => getOrganizerRegistrations(filters));

/**
 * One competitor's registration state.
 *
 * @remarks
 * Currently bound by no component — there is no single-athlete route. See the
 * remarks in {@link "functions/cacheKeys"} before relying on it.
 */
export const fetchOrganizerRegistration = (
  uuid: string,
): Promise<OrganizerRegistrationDTO | null> =>
  cached(cacheKeys.organizerRegistration(uuid), () => getOrganizerRegistration(uuid));

/** Every group set for the current year. */
export const fetchOrganizerGroupsets = (): Promise<OrganizerGroupsetDTO[]> =>
  cached(cacheKeys.organizerGroupsets, getOrganizerGroupsets);

/** One group set, for the detail and edit screens. Keyed per team. */
export const fetchOrganizerGroupset = (
  uuid: string,
): Promise<OrganizerGroupsetDTO | null> =>
  cached(cacheKeys.organizerGroupset(uuid), () => getOrganizerGroupset(uuid));

/** The saved event order, published or not, for the builder. */
export const fetchOrganizerOrder = (): Promise<OrderDTO | null> =>
  cached(cacheKeys.organizerOrder, getOrganizerOrder);
