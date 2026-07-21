import { getSessionCache, setSessionCache } from "@functions/sessionCache";
import { getOrganizerGroupsets, getOrganizerGroupset, getOrganizerRegistrations, getOrganizerEvents } from "@functions/actions";
import type { OrganizerGroupsetDTO, OrganizerRegistrationDTO, EventDTO } from "@/lib/api";

// Plain async data-fetchers that replace the old use*-hooks. Each reads the
// sessionStorage cache first and falls back to the server action on a miss,
// populating the cache. Call from a client component — typically in an effect
// keyed on the auth status — and store the result in local state. The server
// actions self-authorize (return null/[] when unauthorized), so no client-side
// organizer gating is needed here.

export async function fetchOrganizerGroupsets(): Promise<OrganizerGroupsetDTO[]> {
  const cached = getSessionCache<OrganizerGroupsetDTO[]>("organizerGroupsets");
  if (cached?.length) return cached;
  const data = await getOrganizerGroupsets();
  setSessionCache("organizerGroupsets", data);
  return data;
}

export async function fetchOrganizerGroupset(uuid: string): Promise<Partial<OrganizerGroupsetDTO>> {
  if (!uuid) return {};
  const cached = getSessionCache<Partial<OrganizerGroupsetDTO>>(`groupset_${uuid}`);
  if (cached && Object.keys(cached).length > 0) return cached;
  const data = (await getOrganizerGroupset(uuid)) ?? {};
  setSessionCache(`groupset_${uuid}`, data);
  return data;
}

export async function fetchOrganizerRegistrations(): Promise<OrganizerRegistrationDTO[]> {
  const cached = getSessionCache<OrganizerRegistrationDTO[]>("organizerRegistrations");
  if (cached?.length) return cached;
  const data = await getOrganizerRegistrations();
  setSessionCache("organizerRegistrations", data);
  return data;
}

// Every event in the catalogue (all levels/genders), for the organizer's
// registration editor where the athlete filters that gate the competitor list
// don't apply.
export async function fetchOrganizerEvents(): Promise<EventDTO[]> {
  const cached = getSessionCache<EventDTO[]>("organizerEvents");
  // A cached list is only usable if it was written by the current shape. The
  // editor filters on `gender_category`, added after this key first shipped; a
  // cache from before that lacks the field and would filter out every event, so
  // treat it as a miss and refetch.
  if (cached?.length && "gender_category" in cached[0]) return cached;
  const data = await getOrganizerEvents();
  setSessionCache("organizerEvents", data);
  return data;
}
