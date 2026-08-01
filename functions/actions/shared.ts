// Shared internals for this directory's server actions: body/result types,
// cache tags, helpers. Deliberately not "use server" — that only allows actions.

import { updateTag } from "next/cache";
import { getCurrentUser, canAccessOrganizer, isAdmin, isCompetitor } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";
import type { User, Prisma } from "@prisma/client";
import type {
  CompetitorDTO, RegistrationDTO, BlogDTO,
  GroupsetDTO, OrganizerGroupsetDTO, OrganizerRegistrationDTO,
} from "@/lib/api";

// ---------- result / body types ----------

export type FieldErrors = Record<string, string>;
export type Mutation<T> = { data: T; error?: undefined } | { data?: undefined; error: FieldErrors };

// Sign-up only creates the account; the competitor profile is filled in
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

export interface SettingsBody {
  reg_year?: number;
  early_reg_start?: string | null;
  early_reg_cost_first?: number | null;
  early_reg_cost_extra?: number | null;
  reg_start?: string;
  reg_end?: string;
  reg_cost_first?: number;
  reg_cost_extra?: number;
  due_date?: string | null;
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

// Admin: promotes an existing user (matched by email) to a school account —
// user_type "School" plus its one-to-one CollegeProfile linking a college.
export interface CreateSchoolAccountBody {
  email?: string;
  first_name?: string;
  last_name?: string;
  college?: string; // college_id (Dropdown value)
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
  // Profile edits from the registrations view. Unlike the competitor-facing
  // flow, an organizer can correct these at any time.
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

// Event-order write payload. A ring item is either an event (event_id +
// competitor_list) or a break; `id` is present when re-saving an existing slot.
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

// The current user's payload is expensive (auth + nested query) and re-run on
// every navigation, so it is cached by user_id, TTL-expired, and tag-dropped.
export const USER_DATA_TTL = 60; // seconds
export const userDataTag = (userId: string) => `user-data-${userId}`;

// Drop a user's cached payload. Call on logout and after any mutation to their
// profile, registrations, or group set.
export function revalidateUserData(userId: string): void {
  updateTag(userDataTag(userId));
}

// ---------- shared read cache (Data Cache) ----------

// Same short-TTL-plus-tags model as above. Auth/gating reads cookies, so it runs
// OUTSIDE the cached callback — only primitive-keyed Prisma reads go inside.
export const READ_CACHE_TTL = USER_DATA_TTL; // 60s, matching the user-data cache

// Global tags for shared (non-user-scoped) reads, plus a per-groupset tag.
export const TAG_GROUPSETS = "groupsets";
export const TAG_REGISTRATIONS = "registrations";
export const TAG_EVENTS = "events";
export const groupsetTag = (uuid: string) => `groupset-${uuid}`;

// ---------- date rehydration ----------

// unstable_cache serializes through JSON, flattening Date to an ISO string.
// These rebuild it so the returned DTOs honor their Date-typed contracts.
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

// ---------- action gates ----------

// Named *Gate, not require*, to keep them distinct from lib/auth's page gates:
// those redirect, these return an { error } an action can hand back to the form.
export type OrganizerGate = { user: User; error?: undefined } | { user?: undefined; error: FieldErrors };

export async function organizerGate(): Promise<OrganizerGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!(await canAccessOrganizer(user))) return { error: { detail: "You do not have permission." } };
  return { user };
}

// Admin gate for server actions (mirrors organizerGate's shape). Admin access
// is strictly user_type "Admin", independent of the organizer host rule.
export type AdminGate = { user: User; error?: undefined } | { user?: undefined; error: FieldErrors };

export async function adminGate(): Promise<AdminGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!isAdmin(user)) return { error: { detail: "You do not have permission." } };
  return { user };
}

// Competitor gate for the actions that write competitor-owned data. Same shape
// again; carries competitor_profile because callers read school/gender off it.
export type CompetitorGate =
  | { user: CurrentUser; error?: undefined }
  | { user?: undefined; error: FieldErrors };

export async function competitorGate(): Promise<CompetitorGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  return { user };
}

// Writable Settings columns from a request body, shared by the organizer save
// and admin create paths. Optional fields -> null, required missing -> undefined.
export function settingsWritable(body: SettingsBody): Prisma.SettingsUncheckedUpdateInput {
  return {
    reg_year: body.reg_year,
    early_reg_start: body.early_reg_start ? new Date(body.early_reg_start) : null,
    early_reg_cost_first: body.early_reg_cost_first ?? null,
    early_reg_cost_extra: body.early_reg_cost_extra ?? null,
    reg_start: body.reg_start ? new Date(body.reg_start) : undefined,
    reg_end: body.reg_end ? new Date(body.reg_end) : undefined,
    reg_cost_first: body.reg_cost_first,
    reg_cost_extra: body.reg_cost_extra,
    due_date: body.due_date ? new Date(body.due_date) : null,
    comp_date: body.comp_date ? new Date(body.comp_date) : null,
    contact_email: body.contact_email,
    order_public: body.order_public,
  };
}
