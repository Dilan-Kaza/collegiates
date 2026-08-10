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

// Cache-first client fetchers over the read actions: sessionStorage hit, else call
// the action and cache it. Entries live until a mutation clears them or the tab closes.

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = getSessionCache<T>(key);
  if (hit !== undefined) return hit;
  const data = await fetcher();
  setSessionCache(key, data);
  return data;
}

// ---------- the read path components actually use ----------

// Binds a server-rendered value to its cache entry: `initial` is first paint, and the fetcher only
// runs once a mutation drops the key. Returns superjson's round-trip, so identity changes once.
export function useCachedResource<T>(key: string, fetcher: () => Promise<T>, initial: T): T {
  const cached = useSessionCache<T>(key);

  // Latest-ref so a call site can pass an inline arrow (the uuid-parameterized
  // fetchers all do) without its identity re-arming the refetch effect below.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Compared by identity, not value: a new object means the server sent a new payload for this
  // route, and the server's copy always wins over what an earlier visit left in sessionStorage.
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
        // Leave the key empty and fall back to `initial` — a failed refresh
        // shows slightly stale data rather than blanking the view.
        console.error(`[useCachedResource:${key}]`, err);
      });
    return () => {
      cancelled = true;
    };
  }, [cached, key]);

  return cached ?? initial;
}

// ---------- shared across routes ----------

// `null` (no settings row yet) is normalized to {} so this matches the
// Partial<SettingsDTO> every page already passes its client component.
export const fetchSettings = (): Promise<Partial<SettingsDTO>> =>
  cached(cacheKeys.settings, async () => (await getSharedSettings()) ?? {});

export const fetchColleges = (): Promise<Record<string, string>> =>
  cached(cacheKeys.colleges, getSharedColleges);

export const fetchBlogPosts = (): Promise<BlogDTO[]> =>
  cached(cacheKeys.blogPosts, getSharedBlogPosts);

// ---------- competitor / public ----------

export const fetchMe = (): Promise<CompetitorDTO | null> =>
  cached(cacheKeys.currentUser, getMe);

export const fetchCompetitorEvents = (): Promise<EventDTO[]> =>
  cached(cacheKeys.competitorEvents, getCompetitorEvents);

export const fetchRegistrations = (): Promise<RegistrationDTO[]> =>
  cached(cacheKeys.registrations, getRegistrations);

export const fetchGroupSet = (): Promise<GroupsetDTO[]> =>
  cached(cacheKeys.groupSet, getMyGroupset);

export const fetchJoinableGroupsets = (): Promise<GroupsetDTO[]> =>
  cached(cacheKeys.joinableGroupsets, getJoinableGroupsets);

export const fetchBlogPostById = (blogId: string): Promise<BlogDTO | null> =>
  cached(cacheKeys.blogPost(blogId), () => getBlogPostById(blogId));

export const fetchPublicOrder = (): Promise<OrderDTO | null> =>
  cached(cacheKeys.publicOrder, getPublicOrder);

// ---------- organizer ----------

export const fetchOrganizerBlogPosts = (): Promise<BlogDTO[]> =>
  cached(cacheKeys.organizerBlogPosts, getOrganizerBlogPosts);

export const fetchOrganizerEvents = (): Promise<EventDTO[]> =>
  cached(cacheKeys.organizerEvents, getOrganizerEvents);

// Only the unfiltered call (the default organizer view) shares the canonical
// key; a filtered query is a different result set, so it derives its own key.
export const fetchOrganizerRegistrations = (
  filters?: Parameters<typeof getOrganizerRegistrations>[0],
): Promise<OrganizerRegistrationDTO[]> =>
  cached(organizerRegistrationsKey(filters), () => getOrganizerRegistrations(filters));

export const fetchOrganizerRegistration = (
  uuid: string,
): Promise<OrganizerRegistrationDTO | null> =>
  cached(cacheKeys.organizerRegistration(uuid), () => getOrganizerRegistration(uuid));

export const fetchOrganizerGroupsets = (): Promise<OrganizerGroupsetDTO[]> =>
  cached(cacheKeys.organizerGroupsets, getOrganizerGroupsets);

export const fetchOrganizerGroupset = (
  uuid: string,
): Promise<OrganizerGroupsetDTO | null> =>
  cached(cacheKeys.organizerGroupset(uuid), () => getOrganizerGroupset(uuid));

export const fetchOrganizerOrder = (): Promise<OrderDTO | null> =>
  cached(cacheKeys.organizerOrder, getOrganizerOrder);
