/**
 * Shared internals for the server actions: request/result types, cache tags,
 * gates, and failure handling.
 *
 * @remarks
 * Deliberately **not** marked `"use server"`. That directive restricts a module
 * to exporting async functions only, which would rule out the types and
 * constants below.
 *
 * @packageDocumentation
 */

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser, canAccessOrganizer, isAdmin, isCompetitor } from "@/lib/auth";
import { formatSettingsDate, parseSettingsDate } from "@/lib/dates";
import { totalOwedFor } from "@/lib/fees";
import { shapeSettings } from "@/lib/api";
import type { Cell } from "@/lib/sheetGrid";
import type { CurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";
import type { RegistrationLine, RegistrationBilling } from "@/lib/email-templates";
import type {
  CompetitorDTO, RegistrationDTO, BlogDTO, SettingsWithHost,
  GroupsetDTO, OrganizerGroupsetDTO, OrganizerRegistrationDTO,
} from "@/lib/api";

// ---------- result / body types ----------

/**
 * Errors keyed by form field, plus two special keys.
 *
 * @remarks
 * `detail` carries a general message with no field to attach it to. `confirm`
 * marks a warning the action will write past if re-submitted with
 * `override: true` — see `confirmMessage` in {@link "functions/actionErrors"}.
 */
export type FieldErrors = Record<string, string>;

/** What every mutation returns: `{ data }` on success, `{ error }` on failure. */
export type Mutation<T> = { data: T; error?: undefined } | { data?: undefined; error: FieldErrors };

// ---------- failure handling ----------

// Prisma failures a correct caller can still plausibly hit — a race against a pre-check, a row
// deleted in another tab. Anything unlisted is a bug or an outage: generic message, logged.
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

/**
 * Maps a thrown error to the {@link FieldErrors} a mutation returns.
 *
 * @remarks
 * Every mutation catches, because a mutation that throws is useless to the
 * client: Next replaces the message with an opaque digest and the caller's
 * `await` rejects instead of yielding `{ error }`.
 *
 * Read actions are deliberately **not** wrapped in this. They return `[]` or
 * `null` for a denied read, and catching a database outage into that would
 * render an empty dashboard as though it were correct. A throw should reach
 * `app/error.tsx`.
 *
 * @param where - Identifies the action in the server log. The client never sees it.
 * @param err - The thrown value.
 * @param fallback - Shown for anything not specifically recognized.
 * @returns The errors to hand back to the form.
 * @throws Re-throws Next's own control flow — `redirect()` and `notFound()`
 * signal by throwing, and must keep propagating rather than being reported to
 * the user as a failed save.
 */
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

/**
 * Sign-up input.
 *
 * @remarks
 * Sign-up creates the account only; the competitor profile is filled in
 * afterwards — see {@link CompetitorProfileBody}.
 */
export interface RegisterBody {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * The profile-setup step after sign-up, and the yearly re-confirmation.
 *
 * @remarks
 * Every value is a DTO code, not a Prisma enum member. These fields freeze once
 * the competitor holds a registration for the year.
 */
export interface CompetitorProfileBody {
  gender?: string;
  school?: string;
  student_type?: string;
  skill_level?: string;
}

/** A competitor editing their own details. Absent fields are left unchanged. */
export interface UpdateMeBody {
  first_name?: string;
  last_name?: string;
  gender?: string;
  student_type?: string;
  skill_level?: string;
  school?: string | null;
}

/**
 * The writable competition-settings columns.
 *
 * @remarks
 * Dates arrive as `yyyy-mm-dd` and are anchored to the competition's time zone
 * on the way in — see {@link "lib/dates"}. `host` is an email, and writing it is
 * admin-only, since it grants organizer access.
 */
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

/** A blog post being created or edited. */
export interface BlogBody {
  author?: string;
  category?: string;
  title?: string;
  blog_content?: string;
}

/**
 * Promoting an existing user to a School account.
 *
 * @remarks
 * Matched by email — the account must already exist. Sets `user_type` to
 * `"School"` and links a college through the one-to-one `CollegeProfile`.
 */
export interface CreateSchoolAccountBody {
  email?: string;
  first_name?: string;
  last_name?: string;
  /** A `college_id`, which is what the Dropdown's value carries. */
  college?: string;
}

/** Filters for the organizer's registration list. */
export interface OrganizerRegFilters {
  /**
   * True keeps competitors who have paid something, false those who have paid
   * nothing at all. `amt_paid` is an amount, but this filter stays a yes/no.
   */
  paid?: boolean;
  proof_of_reg?: boolean;
  is_competing?: boolean;
  /** A `college_id`. */
  school?: string;
}

/** One event in a registration payload, with its nandu difficulty if it has one. */
export interface RegistrationInputItem {
  event: string;
  nandu_str?: string;
}

/** An organizer editing a competitor's registrations, payment, and profile. */
export interface UpdateOrganizerRegBody {
  /** Replaces the year's registrations wholesale. Omit to leave them alone. */
  registration_input?: RegistrationInputItem[];
  /**
   * Whole dollars received **in total, not a delta** — the organizer types the
   * figure they have on record and it replaces whatever was stored.
   */
  amt_paid?: number;
  proof_of_reg?: boolean;
  is_competing?: boolean;
  /**
   * Profile corrections. Unlike the competitor-facing flow, an organizer can
   * change these at any time, including after the competitor's profile locks.
   */
  gender?: string;
  school?: string;
  student_type?: string;
  skill_level?: string;
}

/**
 * Creating a group set from the organizer console.
 *
 * @remarks
 * `override` confirms a save the member rules warned about. Without it, a roster
 * that breaks an eligibility rule comes back under `confirm` — see
 * `memberProblems` in {@link "functions/actions/organizer-groupsets"}.
 */
export interface CreateOrganizerGroupsetBody {
  team_name: string;
  school: string;
  leader?: string;
  members?: string[];
  override?: boolean;
}

/** Editing a group set. Only members being added are re-checked. */
export interface UpdateOrganizerGroupsetBody {
  team_name?: string;
  school?: string;
  leader?: string;
  members?: string[];
  override?: boolean;
}

/** Which ring a slot belongs to. */
export type RingKey = "ring1" | "ring2" | "ring3";

/** One competitor's place in a slot's running order. */
export interface EventOrderCompetitorInput {
  id?: string;
  order?: number;
}

/**
 * One slot of a ring: an event with a running order, or a break.
 *
 * @remarks
 * `id` is present when re-saving an existing slot, and carrying it across rings
 * is what makes a cross-ring drag a move rather than a delete and recreate.
 *
 * Omitted fields keep their stored values, and an omitted `competitor_list` is
 * not a request to clear one — see `saveOrder`.
 */
export interface EventOrderInput {
  id?: string;
  order?: number;
  /** An `event_code`. Absent for breaks. */
  event_id?: string;
  name?: string;
  break_length?: number;
  competitor_list?: EventOrderCompetitorInput[];
}

/** An event-order save. A ring omitted here is left untouched. */
export interface OrderBody {
  ring1?: EventOrderInput[];
  ring2?: EventOrderInput[];
  ring3?: EventOrderInput[];
}

/**
 * One tab of a Google Sheets export.
 *
 * @remarks
 * Used by both the event-order and scoring exports. The browser sends finished
 * cells and the action re-derives nothing — but it is still bounded and
 * sanitized at the boundary, since a payload from a browser is untrusted
 * whatever built it. See `cleanTabs` in {@link "functions/actions/order"}.
 */
export interface SheetTabInput {
  title?: string;
  rows?: Cell[][];
}

/** A Google Sheets export: one tab per ring. */
export interface SheetExportBody {
  tabs?: SheetTabInput[];
}

// ---------- session-tied user-data cache ----------

/** How long a user's cached payload lives, in seconds. */
export const USER_DATA_TTL = 60;

/** The Data Cache tag scoping every read of one user's own data. */
export const userDataTag = (userId: string) => `user-data-${userId}`;

/**
 * Drops one user's cached payload.
 *
 * @remarks
 * The current user's payload is expensive — auth plus a deeply nested query —
 * and is re-read on every navigation, so it is cached per user id. Call this on
 * logout, and after **any** mutation to their profile, registrations, or group
 * set, including one made by an organizer on their behalf.
 *
 * @param userId - Whose payload to drop.
 */
export function revalidateUserData(userId: string): void {
  updateTag(userDataTag(userId));
}

// ---------- shared read cache (Data Cache) ----------

/**
 * How long a shared (non-user-scoped) read is cached, in seconds.
 *
 * @remarks
 * Matches {@link USER_DATA_TTL}, so the two layers expire together.
 *
 * A rule that holds for every cached read in this directory: **auth and gating
 * run outside the cached callback**, because they read cookies. Only
 * primitive-keyed Prisma reads go inside one.
 */
export const READ_CACHE_TTL = USER_DATA_TTL;

/** Data Cache tag for every group-set read. */
export const TAG_GROUPSETS = "groupsets";

/** Data Cache tag for every registration read. */
export const TAG_REGISTRATIONS = "registrations";

/** Data Cache tag for every event-catalogue read. */
export const TAG_EVENTS = "events";

/** Data Cache tag for one group set, alongside {@link TAG_GROUPSETS}. */
export const groupsetTag = (uuid: string) => `groupset-${uuid}`;

// ---------- date rehydration ----------

/**
 * Rebuilds the `Date` fields a cached competitor payload lost.
 *
 * @remarks
 * `unstable_cache` serializes through JSON, which flattens `Date` to an ISO
 * string. The DTOs are typed as carrying real `Date`s, so every cached read
 * rehydrates before returning — otherwise a `.getTime()` downstream throws on a
 * cache hit but not on a miss.
 */
export function rehydrateCompetitor(c: CompetitorDTO): CompetitorDTO {
  return {
    ...c,
    registrations: c.registrations.map((r) => ({ ...r, date_created: new Date(r.date_created) })),
    groupset: c.groupset ? { ...c.groupset, date_created: new Date(c.groupset.date_created) } : null,
  };
}

/** Rebuilds a blog post's `Date` fields after a cached read. */
export const reBlog = (b: BlogDTO): BlogDTO => ({ ...b, date_created: new Date(b.date_created) });

/** Rebuilds a registration's `Date` fields after a cached read. */
export const reRegistration = (r: RegistrationDTO): RegistrationDTO => ({ ...r, date_created: new Date(r.date_created) });

/** Rebuilds a group set's `Date` fields after a cached read. */
export const reGroupset = (g: GroupsetDTO): GroupsetDTO => ({ ...g, date_created: new Date(g.date_created) });

/** Rebuilds an organizer group set's `Date` fields after a cached read. */
export const reOrganizerGroupset = (g: OrganizerGroupsetDTO): OrganizerGroupsetDTO => ({ ...g, date_created: new Date(g.date_created) });

/** Rebuilds an organizer registration's nested `Date` fields after a cached read. */
export const reOrganizerRegistration = (u: OrganizerRegistrationDTO): OrganizerRegistrationDTO => ({
  ...u,
  registration: u.registration.map(reRegistration),
});

// ---------- action gates ----------

/**
 * The result of an action gate: the authorized user, or the error to return.
 *
 * @remarks
 * These are named `*Gate` rather than `require*` to keep them distinct from
 * {@link "lib/auth"}'s page gates. Those **redirect**; these return an
 * `{ error }` an action can hand straight back to the form, because a server
 * action has no page to redirect.
 */
export type OrganizerGate = { user: User; error?: undefined } | { user?: undefined; error: FieldErrors };

// ---------- email links ----------

/**
 * The base URL for links embedded in transactional email.
 *
 * @remarks
 * Must be the deployed origin, e.g. `https://collegiates.example.com`. Actions
 * that write before they send call this up front, for its throw, so a missing
 * value fails while nothing is persisted — see `registerUser`.
 *
 * @returns The origin, without a trailing slash.
 * @throws When `NEXT_PUBLIC_APP_URL` is unset.
 */
export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set.");
  return url.replace(/\/$/, "");
}

/**
 * Authorizes an action for the organizer console.
 *
 * @remarks
 * Organizer access is the host named on the current settings row, plus admins —
 * not a `user_type`. See `canAccessOrganizer`.
 */
export async function organizerGate(): Promise<OrganizerGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!(await canAccessOrganizer(user))) return { error: { detail: "You do not have permission." } };
  return { user };
}

/** The result of {@link adminGate}, mirroring {@link OrganizerGate}'s shape. */
export type AdminGate = { user: User; error?: undefined } | { user?: undefined; error: FieldErrors };

/**
 * Authorizes an admin-only action.
 *
 * @remarks
 * Admin access is strictly `user_type` `"Admin"`, independent of the organizer
 * host rule — an organizer is not an admin.
 */
export async function adminGate(): Promise<AdminGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!isAdmin(user)) return { error: { detail: "You do not have permission." } };
  return { user };
}

/**
 * The result of {@link competitorGate}.
 *
 * @remarks
 * Carries a {@link CurrentUser} rather than a bare `User`, because the callers
 * read school, gender, and the payment flags off `competitor_profile`.
 */
export type CompetitorGate =
  | { user: CurrentUser; error?: undefined }
  | { user?: undefined; error: FieldErrors };

/**
 * Authorizes an action that writes competitor-owned data.
 *
 * @remarks
 * A School or Admin account has no competitor profile, so this keeps one from
 * creating a profile for itself by calling such an action directly.
 */
export async function competitorGate(): Promise<CompetitorGate> {
  const user = await getCurrentUser();
  if (!user) return { error: { detail: "Not authenticated." } };
  if (!isCompetitor(user)) return { error: { detail: "Not a competitor." } };
  return { user };
}

// ---------- registration email bodies ----------

/**
 * The events-and-money body the two registration emails share.
 *
 * @remarks
 * Both the receipt sent at sign-up and the notice sent when an organizer edits a
 * registration state the same three things: the events, what is owed, and the
 * deadline. Building them here keeps a competitor's receipt, their dashboard,
 * and the organizer's payments table quoting one figure — {@link totalOwedFor}
 * is what all three price against.
 *
 * @param registrations - The competitor's registrations for the year, as they
 * stand *after* whatever write is being reported.
 * @param settings - The current settings row, for the fee schedule and deadline.
 * @param onTeam - Whether the competitor belongs to a group set, which can carry
 * a charge of its own.
 * @param amtPaid - Whole dollars recorded as received so far.
 */
export function registrationEmailBody(
  registrations: RegistrationDTO[],
  settings: SettingsWithHost,
  onTeam: boolean,
  amtPaid: number,
): { events: RegistrationLine[]; billing: RegistrationBilling } {
  const dto = shapeSettings(settings)!;
  return {
    events: registrations.map((reg) => ({
      name: reg.event_name ?? reg.event_code,
      nandu: reg.nandu_str,
    })),
    billing: {
      total: totalOwedFor(registrations, onTeam, dto),
      paid: amtPaid,
      // On the competition's clock, like every other settings date the
      // competitor is shown — see the confirm screen's identical fallback.
      dueDate: formatSettingsDate("due_date", dto.due_date, undefined, "the posted deadline"),
      contactEmail: dto.contact_email,
    },
  };
}

const SETTINGS_DATE_FIELDS = [
  "early_reg_start", "reg_start", "reg_end", "due_date", "comp_date",
] as const;

/**
 * Validates the date fields of a settings payload.
 *
 * @remarks
 * Necessary because `parseSettingsDate` maps an unparseable day to `null`, which
 * {@link settingsWritable} then treats as "not supplied" — so a typo would
 * silently leave the old date in place. Checking up front lets each bad value be
 * reported on its own field.
 *
 * @param body - The settings payload.
 * @returns The errors, or `null` when every supplied date parses. Absent and
 * explicitly-cleared fields are both fine; only a non-empty unparseable value is
 * an error.
 */
export function settingsDateErrors(body: SettingsBody): FieldErrors | null {
  const errors: FieldErrors = {};
  for (const field of SETTINGS_DATE_FIELDS) {
    const value = body[field];
    if (value == null || value === "") continue;
    if (parseSettingsDate(field, value) === null) errors[field] = "Enter a valid date.";
  }
  return Object.keys(errors).length ? errors : null;
}

/**
 * The writable Settings columns, extracted from a request body.
 *
 * @remarks
 * Shared by the organizer's save and the admin's create, so the two cannot
 * disagree about which columns a payload may set. `host_id` is **not** among
 * them: it grants organizer access, and each caller handles it separately under
 * its own authorization.
 *
 * Dates arrive as `yyyy-mm-dd` and are anchored to the competition's time zone —
 * a bare `new Date()` would land them a day early. See {@link "lib/dates"}.
 *
 * @param body - The settings payload, ideally after {@link settingsDateErrors}.
 * @returns A Prisma update input. Undefined values mean "leave alone" and should
 * be stripped before an update; nulls are genuine clears.
 */
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
