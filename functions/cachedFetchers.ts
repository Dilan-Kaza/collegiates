"use client";

import { getSessionCache, setSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions/cacheKeys";
import {
  getMe,
  getCompetitorEvents,
  getRegistrations,
  getMyGroupset,
  getJoinableGroupsets,
  getBlogPostById,
  getOrganizerBlogPosts,
  getOrganizerEvents,
  getOrganizerRegistrations,
  getOrganizerRegistration,
  getOrganizerGroupsets,
  getOrganizerGroupset,
  getOrganizerOrder,
  getPublicOrder,
} from "@functions/actions";
import type {
  CompetitorDTO,
  EventDTO,
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
): Promise<OrganizerRegistrationDTO[]> => {
  const hasFilters = filters && Object.keys(filters).length > 0;
  const key = hasFilters
    ? `${cacheKeys.organizerRegistrations}_${JSON.stringify(filters)}`
    : cacheKeys.organizerRegistrations;
  return cached(key, () => getOrganizerRegistrations(filters));
};

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
