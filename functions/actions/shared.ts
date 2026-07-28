// Shared internals for the server-action modules in this directory.
//
// This module is intentionally NOT a "use server" file: it holds the request
// body/result types, cache-tag constants, and plain helper functions that the
// action modules import. (A "use server" module may only export async server
// actions, so cross-action helpers and types have to live here instead.)

import { revalidateTag } from "next/cache";
import { getCurrentUser, isOrganizer } from "@/lib/auth";
import type { User } from "@prisma/client";
import type {
  CompetitorDTO, RegistrationDTO, BlogDTO,
  GroupsetDTO, OrganizerGroupsetDTO, OrganizerRegistrationDTO,
} from "@/lib/api";

// ---------- result / body types ----------

export type FieldErrors = Record<string, string>;
export type Mutation<T> = { data: T; error?: undefined } | { data?: undefined; error: FieldErrors };

// Sign-up now only creates the account. The competitor profile (gender,
// school, student_type, skill_level) is filled in
// afterward via createCompetitorProfile — see CompetitorProfileBody.
export interface RegisterBody {
  email?: string;
  password?: string;
  re_password?: string;
  first_name?: string;
  last_name?: string;
}

// Fields collected in the separate profile-setup step after sign-up.
export interface CompetitorProfileBody {
  gender?: string;
  school?: string;
  student_type?: string;
  skill_level?: string;
}

export interface UpdateMeBody {
  first_name?: string;
  last_name?: string;
  gender?: string;
  student_type?: string;
  skill_level?: string;
  school?: string | null;
}

export interface RegistrationItem {
  event_code: string;
  nandu_str?: string;
}

export interface SettingsBody {
  reg_year?: number;
  early_reg_start?: string | null;
  early_reg_cost_first?: number | null;
  early_reg_cost_extra?: number | null;
  reg_start?: string;
  reg_end?: string;
  reg_cost_first?: number;
  reg_cost_extra?: number;
  comp_date?: string | null;
  contact_email?: string;
  host?: string;
  order_public?: boolean;
}

export interface BlogBody {
  author?: string;
  category?: string;
  title?: string;
  blog_content?: string;
}

export interface OrganizerRegFilters {
  has_paid?: boolean;
  proof_of_reg?: boolean;
  is_competing?: boolean;
  school?: string;
}

export interface RegistrationInputItem {
  event: string;
  nandu_str?: string;
}

export interface UpdateOrganizerRegBody {
  registration_input?: RegistrationInputItem[];
  has_paid?: boolean;
  proof_of_reg?: boolean;
  is_competing?: boolean;
  // Competitor profile edits the organizer may make from the registrations view.
  // Unlike the competitor-facing flow these are not gated on existing
  // registrations — an organizer can correct a profile at any time.
  gender?: string;
  school?: string;
  student_type?: string;
  skill_level?: string;
}

export interface CreateOrganizerGroupsetBody {
  team_name: string;
  school: string;
  leader?: string;
  members?: string[];
}

export interface UpdateOrganizerGroupsetBody {
  team_name?: string;
  school?: string;
  leader?: string;
  members?: string[];
}

// Event-order write payload (mirrors the Django OrderSerializer / EventOrderSerializer
// write path). Each ring item is either an event (event_id + competitor_list) or a
// break (break_length, no event_id). `id` is present when re-saving an existing slot.
export type RingKey = "ring1" | "ring2" | "ring3";

export interface EventOrderCompetitorInput {
  id?: string;
  order?: number;
}

export interface EventOrderInput {
  id?: string;
  order?: number;
  event_id?: string; // event_code; absent for breaks
  name?: string;
  break_length?: number;
  competitor_list?: EventOrderCompetitorInput[];
}

export interface OrderBody {
  ring1?: EventOrderInput[];
  ring2?: EventOrderInput[];
  ring3?: EventOrderInput[];
}

// ---------- session-tied user-data cache ----------
//
// The dashboard and register pages fetch the current user's full payload on
// every load. That payload is expensive (auth + a nested Prisma query) and was
// re-run on each navigation, leaving those pages blank for a beat. We cache it
// across requests, but keep it tied to the session:
//   * keyed by user_id — the session identity (auth is JWT, so there is no
//     server session row to key on; user_id is the stable per-session handle);
//   * expires after USER_DATA_TTL seconds so it self-heals even if an
//     invalidation is ever missed;
//   * dropped immediately when the session ends (logout) or the user mutates
//     their own data, via revalidateUserData().
export const USER_DATA_TTL = 60; // seconds
export const userDataTag = (userId: string) => `user-data-${userId}`;

// Drop a user's cached payload. Call on logout and after any mutation to their
// profile, registrations, or group set.
export function revalidateUserData(userId: string): void {
  revalidateTag(userDataTag(userId));
}

// ---------- shared read cache (Data Cache) ----------
//
// The read actions query Prisma on every call. They're wrapped in unstable_cache
// with the same short-TTL-plus-tags model as the user-data cache above: served
// from the Data Cache across requests, expiring after READ_CACHE_TTL as a safety
// net, and dropped immediately by the matching mutation via revalidateTag.
// Auth/gating (getCurrentUser / requireOrganizer, which read cookies) always runs
// OUTSIDE the cached callback — only pure Prisma reads keyed by primitives go inside.
export const READ_CACHE_TTL = USER_DATA_TTL; // 60s, matching the user-data cache

// Global invalidation tags for shared (non-user-scoped) reads, plus a per-group
// -set tag for single-record reads.
export const TAG_GROUPSETS = "groupsets";
export const TAG_REGISTRATIONS = "registrations";
export const TAG_EVENTS = "events";
export const groupsetTag = (uuid: string) => `groupset-${uuid}`;

// ---------- date rehydration ----------
//
// unstable_cache serializes through JSON, which flattens Date fields to ISO
// strings. These helpers reconstruct them so the returned DTOs honor their
// Date-typed contracts (mirrors getSettings' date rehydration).
export function rehydrateCompetitor(c: CompetitorDTO): CompetitorDTO {
  return {
    ...c,
    registrations: c.registrations.map((r) => ({ ...r, date_created: new Date(r.date_created) })),
    groupset: c.groupset ? { ...c.groupset, date_created: new Date(c.groupset.date_created) } : null,
  };
}

export const reBlog = (b: BlogDTO): BlogDTO => ({ ...b, date_created: new Date(b.date_created) });
export const reRegistration = (r: RegistrationDTO): RegistrationDTO => ({ ...r, date_created: new Date(r.date_created) });
export const reGroupset = (g: GroupsetDTO): GroupsetDTO => ({ ...g, date_created: new Date(g.date_created) });
export const reOrganizerGroupset = (g: OrganizerGroupsetDTO): OrganizerGroupsetDTO => ({ ...g, date_created: new Date(g.date_created) });
export const reOrganizerRegistration = (u: OrganizerRegistrationDTO): OrganizerRegistrationDTO => ({
  ...u,
  registration: u.registration.map(reRegistration),
});

// ---------- organizer gate ----------

export type OrganizerGate = { user: User; error?: undefined } | { user?: undefined; error: FieldErrors };

export async function requireOrganizer(): Promise<OrganizerGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!isOrganizer(user)) return { error: { detail: "You do not have permission." } };
  return { user };
}
