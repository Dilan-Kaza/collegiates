// Shared internals for this directory's server actions: body/result types,
// cache tags, helpers. Deliberately not "use server" — that only allows actions.

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser, canAccessOrganizer, isAdmin, isCompetitor } from "@/lib/auth";
import { parseSettingsDate } from "@/lib/dates";
import type { Cell } from "@/lib/sheetGrid";
import type { CurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";
import type {
  CompetitorDTO, RegistrationDTO, BlogDTO,
  GroupsetDTO, OrganizerGroupsetDTO, OrganizerRegistrationDTO,
} from "@/lib/api";

// ---------- result / body types ----------

export type FieldErrors = Record<string, string>;
export type Mutation<T> = { data: T; error?: undefined } | { data?: undefined; error: FieldErrors };

// ---------- failure handling ----------

// A mutation that throws is useless to the client: Next replaces the message with an opaque digest
// and the caller's `await` rejects instead of yielding { error }. So each mutation catches.

// Prisma failures a correct caller can still plausibly hit — a race against the pre-check, a row
// deleted in another tab. Anything not listed is a bug or an outage: generic message, logged.
const PRISMA_MESSAGES: Record<string, string> = {
  P2002: "That value is already taken.",
  P2003: "That change conflicts with a related record.",
  P2025: "That record no longer exists — it may have been changed elsewhere.",
};

// redirect() and notFound() are signalled by throwing; those must keep
// propagating rather than being reported to the user as a failed save.
function isNextControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_REDIRECT"));
}

// Maps a thrown error to the FieldErrors a mutation returns. `where` identifies
// the action in the server log; the client only ever sees the mapped message.
export function actionError(
  where: string,
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): FieldErrors {
  if (isNextControlFlow(err)) throw err;
  console.error(`[action:${where}]`, err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const message = PRISMA_MESSAGES[err.code];
    if (message) return { detail: message };
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { detail: "The submitted data was not valid." };
  }
  return { detail: fallback };
}

// Read actions are deliberately NOT wrapped: they return [] / null for a denied read, so catching a
// database failure into that would render an empty dashboard. A throw reaches app/error.tsx.

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
  early_reg_cost_base?: number | null;
  early_reg_cost_event?: number | null;
  reg_start?: string;
  reg_end?: string;
  reg_cost_base?: number;
  reg_cost_event?: number;
  due_date?: string | null;
  comp_date?: string | null;
  contact_email?: string;
  scoring_url?: string | null;
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
  // true keeps competitors who have paid something, false those who have paid
  // nothing at all — amt_paid is an amount, but this filter is still a yes/no.
  paid?: boolean;
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
  // Whole dollars received in total, not a delta — the organizer types the
  // figure they have on record and it replaces whatever was there.
  amt_paid?: number;
  proof_of_reg?: boolean;
  is_competing?: boolean;
  // Profile edits from the registrations view. Unlike the competitor-facing
  // flow, an organizer can correct these at any time.
  gender?: string;
  school?: string;
  student_type?: string;
  skill_level?: string;
}

// `override` confirms a save the member rules warned about. Without it, a roster that breaks an
// eligibility rule comes back under `confirm` — see memberProblems in organizer-groupsets.ts.
export interface CreateOrganizerGroupsetBody {
  team_name: string;
  school: string;
  leader?: string;
  members?: string[];
  override?: boolean;
}

export interface UpdateOrganizerGroupsetBody {
  team_name?: string;
  school?: string;
  leader?: string;
  members?: string[];
  override?: boolean;
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

// Google Sheets export for both the event order and the scoring sheets: the browser sends finished
// cells, so the action re-derives nothing. Still validated at the boundary — see cleanTabs in ./order.
export interface SheetTabInput {
  title?: string;
  rows?: Cell[][];
}

export interface SheetExportBody {
  tabs?: SheetTabInput[];
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

// ---------- email links ----------

// Base URL for links embedded in transactional email (activation, password
// reset). Must be set to the deployed origin, e.g. https://collegiates.example.com.
export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set.");
  return url.replace(/\/$/, "");
}

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

// parseSettingsDate maps an unparseable day to null, which settingsWritable then treats as "not
// supplied" — so check the supplied ones up front and report them on their own fields.
const SETTINGS_DATE_FIELDS = [
  "early_reg_start", "reg_start", "reg_end", "due_date", "comp_date",
] as const;

export function settingsDateErrors(body: SettingsBody): FieldErrors | null {
  const errors: FieldErrors = {};
  for (const field of SETTINGS_DATE_FIELDS) {
    const value = body[field];
    // Absent or explicitly cleared is fine; only a non-empty unparseable value
    // is an error.
    if (value == null || value === "") continue;
    if (parseSettingsDate(field, value) === null) errors[field] = "Enter a valid date.";
  }
  return Object.keys(errors).length ? errors : null;
}

// Writable Settings columns from a request body, shared by the organizer save and admin create.
// Dates arrive as yyyy-mm-dd and are Pacific-anchored — a bare new Date() would land a day early.
export function settingsWritable(body: SettingsBody): Prisma.SettingsUncheckedUpdateInput {
  return {
    reg_year: body.reg_year,
    early_reg_start: parseSettingsDate("early_reg_start", body.early_reg_start),
    early_reg_cost_base: body.early_reg_cost_base ?? null,
    early_reg_cost_event: body.early_reg_cost_event ?? null,
    reg_start: parseSettingsDate("reg_start", body.reg_start) ?? undefined,
    reg_end: parseSettingsDate("reg_end", body.reg_end) ?? undefined,
    reg_cost_base: body.reg_cost_base,
    reg_cost_event: body.reg_cost_event,
    due_date: parseSettingsDate("due_date", body.due_date),
    comp_date: parseSettingsDate("comp_date", body.comp_date),
    contact_email: body.contact_email,
    scoring_url: body.scoring_url,
    order_public: body.order_public,
  };
}
