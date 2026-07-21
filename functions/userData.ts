import { getSessionCache, setSessionCache } from "@functions/sessionCache";
import { getMe, getCompetitorEvents, getJoinableGroupsets, getMyGroupset, getPublicOrder } from "@functions/actions";
import type { CompetitorDTO, EventDTO, GroupsetDTO, OrderDTO } from "@/lib/api";

// Plain async data-fetchers that replace the old use*-hooks. Each reads the
// sessionStorage cache first and falls back to the server action on a miss,
// populating the cache. Call from a client component — typically in an effect
// keyed on the auth status — and store the result in local state. The server
// actions self-authorize (return null/[] when unauthenticated), so no
// client-side login gating is needed here.

export async function fetchCurrentUser(): Promise<Partial<CompetitorDTO>> {
  const cached = getSessionCache<Partial<CompetitorDTO>>("currentUser");
  if (cached && Object.keys(cached).length > 0) return cached;
  const data = (await getMe()) ?? {};
  setSessionCache("currentUser", data);
  return data;
}

export async function fetchEvents(): Promise<EventDTO[]> {
  const cached = getSessionCache<EventDTO[]>("events");
  if (cached?.length) return cached;
  const data = await getCompetitorEvents();
  setSessionCache("events", data);
  return data;
}

export async function fetchGroupSetMembers(): Promise<GroupsetDTO[]> {
  const cached = getSessionCache<GroupsetDTO[]>("groupSetMembers");
  if (cached?.length) return cached;
  const data = await getJoinableGroupsets();
  setSessionCache("groupSetMembers", data);
  return data;
}

export async function fetchGroupSet(): Promise<GroupsetDTO[]> {
  const cached = getSessionCache<GroupsetDTO[]>("groupSet");
  if (cached !== undefined) return cached;
  const data = await getMyGroupset();
  setSessionCache("groupSet", data);
  return data;
}

// The published event order for the current year, or null when the organizer
// hasn't made one public yet. Not session-cached — it can change between visits
// and the payload is small.
export async function fetchEventOrder(): Promise<OrderDTO | null> {
  return getPublicOrder();
}
