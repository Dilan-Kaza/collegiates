// Shared API helpers plus object shapers mirroring the Django REST serializers.
//
// Responses are serialized with superjson so rich types survive the wire:
// Date (Prisma timestamps) is preserved and reconstructed on the client (see
// lib/apiClient.ts). This replaces the old hand-rolled JSON.stringify replacer
// that flattened Date to an ISO string. (Ids are all UUID strings now, so no
// BigInt crosses the wire.)
import superjson from "superjson";
import type { Prisma, College, Event, Blog, StudentType, Gender, SkillLevel, EventCategory, WeaponType } from "@prisma/client";

// ---------- student_type enum bridge ----------
//
// The DB `student_type` enum stores the legacy Django codes "1"–"7" (the @map
// targets in schema.prisma), and every UI dropdown + DTO is keyed by those
// codes. Prisma Client, however, speaks the enum MEMBER NAMES (Undergraduate…),
// so we translate at the server boundary: code -> member name on write, member
// name -> code on read. This keeps the "1"–"7" contract the forms and DTOs rely
// on while letting Prisma send the DB a value its enum actually accepts. (An
// unmapped/blank value round-trips to null.)
const STUDENT_TYPE_BY_CODE: Record<string, StudentType> = {
  "1": "Undergraduate",
  "2": "FullTimeGraduate",
  "3": "EarlyGraduate",
  "4": "NonEnrolled",
  "5": "OneYearAlumni",
  "6": "PartTimeGraduate",
  "7": "International",
};
const STUDENT_CODE_BY_TYPE: Record<StudentType, string> = {
  Undergraduate: "1",
  FullTimeGraduate: "2",
  EarlyGraduate: "3",
  NonEnrolled: "4",
  OneYearAlumni: "5",
  PartTimeGraduate: "6",
  International: "7",
};

// code ("1"–"7" or "") -> StudentType | null, for Prisma writes.
export function toStudentType(code: string | null | undefined): StudentType | null {
  return code ? STUDENT_TYPE_BY_CODE[code] ?? null : null;
}

// StudentType | null -> code ("1"–"7") | null, for the DTOs the UI reads.
export function fromStudentType(value: StudentType | null | undefined): string | null {
  return value ? STUDENT_CODE_BY_TYPE[value] ?? null : null;
}

// ---------- gender enum bridge ----------
//
// Same pattern as student_type: the DB `gender` enum stores the legacy "M"/"F"
// codes and every DTO + dropdown + Event.gender_category is keyed by those
// codes, while Prisma Client speaks the member names (Male/Female). Translate at
// the server boundary so the "M"/"F" contract holds everywhere else.
const GENDER_BY_CODE: Record<string, Gender> = { M: "Male", F: "Female" };
const GENDER_CODE_BY_MEMBER: Record<Gender, string> = { Male: "M", Female: "F" };

// code ("M"/"F" or "") -> Gender | null, for Prisma writes.
export function toGender(code: string | null | undefined): Gender | null {
  return code ? GENDER_BY_CODE[code] ?? null : null;
}

// Gender | null -> code ("M"/"F") | null, for the DTOs the UI reads.
export function fromGender(value: Gender | null | undefined): string | null {
  return value ? GENDER_CODE_BY_MEMBER[value] ?? null : null;
}

// ---------- skill_level enum bridge ----------
//
// As above: DB stores "B"/"I"/"A" codes (matching Event.event_level), Prisma
// Client speaks member names (Beginner/Intermediate/Advanced).
const SKILL_LEVEL_BY_CODE: Record<string, SkillLevel> = { B: "Beginner", I: "Intermediate", A: "Advanced" };
const SKILL_LEVEL_CODE_BY_MEMBER: Record<SkillLevel, string> = { Beginner: "B", Intermediate: "I", Advanced: "A" };

// code ("B"/"I"/"A" or "") -> SkillLevel | null, for Prisma writes.
export function toSkillLevel(code: string | null | undefined): SkillLevel | null {
  return code ? SKILL_LEVEL_BY_CODE[code] ?? null : null;
}

// SkillLevel | null -> code ("B"/"I"/"A") | null, for the DTOs the UI reads.
export function fromSkillLevel(value: SkillLevel | null | undefined): string | null {
  return value ? SKILL_LEVEL_CODE_BY_MEMBER[value] ?? null : null;
}

// ---------- event_category enum bridge ----------
//
// As above: DB stores "E"/"I" codes (matching Event.event_category), Prisma
// Client speaks member names (External/Internal).
const EVENT_CATEGORY_BY_CODE: Record<string, EventCategory> = { E: "External", I: "Internal" };
const EVENT_CATEGORY_CODE_BY_MEMBER: Record<EventCategory, string> = { External: "E", Internal: "I" };

// code ("E"/"I" or "") -> EventCategory | null, for Prisma writes.
export function toEventCategory(code: string | null | undefined): EventCategory | null {
  return code ? EVENT_CATEGORY_BY_CODE[code] ?? null : null;
}

// EventCategory | null -> code ("E"/"I") | null, for the DTOs the UI reads.
export function fromEventCategory(value: EventCategory | null | undefined): string | null {
  return value ? EVENT_CATEGORY_CODE_BY_MEMBER[value] ?? null : null;
}

// ---------- weapon_type enum bridge ----------
//
// As above: DB stores "B"/"S"/"L"/"O" codes (matching Event.weapon_type), Prisma
// Client speaks member names (Barehand/Short/Long/Other).
const WEAPON_TYPE_BY_CODE: Record<string, WeaponType> = { B: "Barehand", S: "Short", L: "Long", O: "Other" };
const WEAPON_TYPE_CODE_BY_MEMBER: Record<WeaponType, string> = { Barehand: "B", Short: "S", Long: "L", Other: "O" };

// code ("B"/"S"/"L"/"O" or "") -> WeaponType | null, for Prisma writes.
export function toWeaponType(code: string | null | undefined): WeaponType | null {
  return code ? WEAPON_TYPE_BY_CODE[code] ?? null : null;
}

// WeaponType | null -> code ("B"/"S"/"L"/"O") | null, for the DTOs the UI reads.
export function fromWeaponType(value: WeaponType | null | undefined): string | null {
  return value ? WEAPON_TYPE_CODE_BY_MEMBER[value] ?? null : null;
}

// Human-readable labels for the "1"–"7" codes the DTOs carry, so the UI can show
// a readable name instead of the bare code. Mirrors the dropdown in ProfileSetup.
const STUDENT_TYPE_LABEL_BY_CODE: Record<string, string> = {
  "1": "Full/Part-Time Undergraduate Student",
  "2": "Full-Time Graduate/Professional School Student",
  "3": "Early Graduate Of Current Year",
  "4": "Non-Enrolled Student",
  "5": "One Year Alumni",
  "6": "Part-Time Graduate Student",
  "7": "International Student",
};

// code ("1"–"7") -> display label, for read-only UI. Returns "" for null/blank.
export function studentTypeLabel(code: string | null | undefined): string {
  return code ? STUDENT_TYPE_LABEL_BY_CODE[code] ?? "" : "";
}

// ---------- DTO shapes returned to the client ----------

export interface CollegeDTO {
  college_id: string;
  college_name: string;
}

export interface EventDTO {
  event_code: string;
  event_name: string | null;
  event_level: string | null;
  event_category: string | null;
  gender_category: string | null;
  weapon_type: string | null;
  is_nandu: boolean | null;
}

export interface BlogDTO {
  blog_id: string;
  date_created: Date;
  author: string;
  category: string;
  title: string;
  blog_content: string;
}

export interface SettingsDTO {
  reg_year: number;
  early_reg_start: Date | null;
  early_reg_cost_first: number | null;
  early_reg_cost_extra: number | null;
  reg_start: Date;
  reg_end: Date;
  reg_cost_first: number;
  reg_cost_extra: number;
  // Payment + proof-of-enrollment deadline.
  due_date: Date | null;
  comp_date: Date | null;
  contact_email: string;
  host: string | null;
  order_public: boolean;
  created_at: Date;
}

export interface RegistrationDTO {
  comp_year: number;
  date_created: Date;
  event_code: string;
  event_name: string | null;
  event_level: string | null;
  is_nandu: boolean | null;
  nandu_str?: string | null;
}

export interface OrganizerMemberDTO {
  user_id: string;
  name: string;
}

export interface GroupsetDTO {
  groupset_id: string;
  team_name: string;
  school: string | null;
  comp_year: number;
  date_created: Date;
  members: string[];
}

export interface OrganizerGroupsetDTO {
  groupset_id: string;
  comp_year: number;
  date_created: Date;
  team_name: string;
  members: OrganizerMemberDTO[];
  leader: OrganizerMemberDTO | null;
  school: { school_name: string | null; school_id: string };
}

export interface OrganizerRegistrationDTO {
  user_id: string;
  name: string;
  email: string;
  gender: string | null;
  skill_level: string | null;
  school: string | null;
  // The school's id (the `school` field above is its display name). Exposed so
  // the organizer edit form can preselect and change the competitor's college.
  school_id: string | null;
  student_type: string | null;
  registration: RegistrationDTO[];
  is_competing: boolean;
  has_paid: boolean;
  proof_of_reg: boolean;
}

export interface EventOrderCompetitorDTO {
  id: string;
  name: string;
  order: number;
}

export interface EventOrderDTO {
  id: string;
  comp_year: number;
  event_id: string | null;
  break_length: number;
  name: string | null;
  competitor_list: EventOrderCompetitorDTO[];
  order: number;
}

export interface OrderDTO {
  comp_year: number;
  ring1: EventOrderDTO[];
  ring2: EventOrderDTO[];
  ring3: EventOrderDTO[];
  updated_at: Date;
}

export interface CompetitorDTO {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  school: string | null;
  school_name: string | null;
  student_type: string | null;
  skill_level: string | null;
  registrations: RegistrationDTO[];
  groupset: GroupsetDTO | null;
  user_type: string;
}

// ---------- Prisma payload shapes accepted by the shapers ----------

export type SettingsWithHost = Prisma.SettingsGetPayload<{ include: { host: true } }>;
export type RegistrationWithEvent = Prisma.RegistrationGetPayload<{ include: { event: true } }>;
// The `member` relation now points at CompetitorProfile (not User), and names
// live only on User, so the member's `user` is included to resolve them.
export type GroupsetWithMembers = Prisma.GroupsetGetPayload<{
  include: { school: true; members: { include: { member: { include: { user: true } } } } };
}>;
// Competitor-specific fields (gender, school, student_type, is_competing,
// has_paid, proof_of_reg) now live on the one-to-one CompetitorProfile, so the
// shapers take the user with its profile (and the profile's school) included.
export type UserWithProfile = Prisma.UserGetPayload<{
  include: { competitor_profile: { include: { school: true } } };
}>;
// `registration` moved off User onto CompetitorProfile, so it's included nested
// under the profile rather than at the top level.
export type UserWithProfileAndRegistration = Prisma.UserGetPayload<{
  include: {
    competitor_profile: {
      include: { school: true; registration: { include: { event: true } } };
    };
  };
}>;
export type EventOrderWithCompetitors = Prisma.EventOrderGetPayload<{
  include: { competitor_orders: { include: { competitor: { include: { user: true } } } } };
}>;
// Order with its rings resolved down to each ring's EventOrders (and their
// competitors). Mirrors the nested representation of the Django OrderSerializer.
// `rings` holds one row per ring; shapeOrder picks each out by `ring_number`.
type RingInclude = {
  include: {
    event_orders: {
      include: { competitor_orders: { include: { competitor: { include: { user: true } } } } };
    };
  };
};
export type OrderWithRings = Prisma.OrderGetPayload<{
  include: { rings: RingInclude };
}>;

// Runtime include values matching the payload types above. Shared by every
// order query (server actions + the cached reader) so the shape stays in one
// place. `satisfies` preserves the literal so Prisma infers the related payload.
export const EVENT_ORDER_INCLUDE = {
  competitor_orders: { include: { competitor: { include: { user: true } } } },
} satisfies Prisma.EventOrderInclude;

export const ORDER_INCLUDE = {
  rings: { include: { event_orders: { include: EVENT_ORDER_INCLUDE } } },
} satisfies Prisma.OrderInclude;

// ---------- response helpers ----------

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(superjson.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}

export const ok = (data: unknown): Response => json(data, { status: 200 });
export const created = (data: unknown): Response => json(data, { status: 201 });
export const badRequest = (detail: string | Record<string, unknown>): Response =>
  json(typeof detail === "string" ? { detail } : detail, { status: 400 });
export const unauthorized = (): Response =>
  json({ detail: "Authentication credentials were not provided." }, { status: 401 });
export const forbidden = (detail = "You do not have permission to perform this action."): Response =>
  json({ detail }, { status: 403 });
export const notFound = (detail = "Not found."): Response => json({ detail }, { status: 404 });

// --- serializer-equivalent shapers ---

export const shapeCollege = (c: College): CollegeDTO => ({
  college_id: c.college_id,
  college_name: c.college_name,
});

export const shapeEvent = (e: Event): EventDTO => ({
  event_code: e.event_code,
  event_name: e.event_name,
  event_level: fromSkillLevel(e.event_level),
  event_category: fromEventCategory(e.event_category),
  gender_category: fromGender(e.gender_category),
  weapon_type: fromWeaponType(e.weapon_type),
  is_nandu: e.is_nandu,
});

export const shapeBlog = (b: Blog): BlogDTO => ({
  blog_id: b.blog_id,
  date_created: b.date_created,
  author: b.author,
  category: b.category,
  title: b.title,
  blog_content: b.blog_content,
});

export function shapeSettings(s: SettingsWithHost | null): SettingsDTO | null {
  return (
    s && {
      reg_year: s.reg_year,
      early_reg_start: s.early_reg_start,
      early_reg_cost_first: s.early_reg_cost_first,
      early_reg_cost_extra: s.early_reg_cost_extra,
      reg_start: s.reg_start,
      reg_end: s.reg_end,
      reg_cost_first: s.reg_cost_first,
      reg_cost_extra: s.reg_cost_extra,
      due_date: s.due_date,
      comp_date: s.comp_date,
      contact_email: s.contact_email,
      host: s.host?.email ?? null,
      order_public: s.order_public,
      created_at: s.created_at,
    }
  );
}

// Registration row -> flattened event shape (matches EventRegistrationSerializer)
export function shapeRegistration(reg: RegistrationWithEvent): RegistrationDTO {
  const out: RegistrationDTO = {
    comp_year: reg.comp_year,
    date_created: reg.date_created,
    event_code: reg.event.event_code,
    event_name: reg.event.event_name,
    event_level: fromSkillLevel(reg.event.event_level),
    is_nandu: reg.event.is_nandu,
  };
  if (reg.event.is_nandu) out.nandu_str = reg.nandu_str;
  return out;
}

const memberName = (u: { first_name: string; last_name: string }): string =>
  `${u.first_name} ${u.last_name}`;

// GroupsetSerializer: members/school rendered as strings.
// `gs.members` is expected to include the related `member` user.
export function shapeGroupset(gs: GroupsetWithMembers): GroupsetDTO {
  return {
    groupset_id: gs.groupset_id,
    team_name: gs.team_name,
    school: gs.school?.college_name ?? null,
    comp_year: gs.comp_year,
    date_created: gs.date_created,
    members: (gs.members ?? []).map((m) => memberName(m.member.user)),
  };
}

// OrganizerGroupsetSerializer representation
export function shapeOrganizerGroupset(gs: GroupsetWithMembers): OrganizerGroupsetDTO {
  const members = (gs.members ?? []).map((m) => ({ user_id: m.member.user_id, name: memberName(m.member.user) }));
  const leaderRow = (gs.members ?? []).find((m) => m.leader);
  return {
    groupset_id: gs.groupset_id,
    comp_year: gs.comp_year,
    date_created: gs.date_created,
    team_name: gs.team_name,
    members,
    leader: leaderRow ? { user_id: leaderRow.member.user_id, name: memberName(leaderRow.member.user) } : null,
    school: { school_name: gs.school?.college_name ?? null, school_id: gs.school_id },
  };
}

// OrganizerRegistrationSerializer representation. `user.registration` should be
// pre-filtered to the current comp_year and include the related event.
export function shapeOrganizerRegistration(user: UserWithProfileAndRegistration): OrganizerRegistrationDTO {
  const profile = user.competitor_profile;
  return {
    user_id: user.user_id,
    name: memberName(user),
    email: user.email,
    gender: fromGender(profile?.gender),
    skill_level: fromSkillLevel(profile?.skill_level),
    school: profile?.school?.college_name ?? null,
    school_id: profile?.school_id ?? null,
    student_type: fromStudentType(profile?.student_type),
    registration: (profile?.registration ?? []).map(shapeRegistration),
    is_competing: profile?.is_competing ?? false,
    has_paid: profile?.has_paid ?? false,
    proof_of_reg: profile?.proof_of_reg ?? false,
  };
}

// EventOrderSerializer.to_representation: competitor_list rendered as
// {id, name, order} rows sorted by order.
export function shapeEventOrder(eo: EventOrderWithCompetitors): EventOrderDTO {
  return {
    id: eo.id,
    comp_year: eo.comp_year,
    event_id: eo.event_id,
    break_length: eo.break_length,
    name: eo.name,
    competitor_list: [...eo.competitor_orders]
      .sort((a, b) => a.order - b.order)
      .map((co) => ({ id: co.competitor_id, name: memberName(co.competitor.user), order: co.order })),
    order: eo.order,
  };
}

// OrderSerializer: each ring is a list of nested EventOrder representations.
// There is one Ring row per ring_number, so look each up and shape its slots
// into the three DTO fields the client expects. A ring that was never created
// (or was emptied) shapes to [].
export function shapeOrder(o: OrderWithRings): OrderDTO {
  const ring = (n: number): EventOrderDTO[] =>
    (o.rings.find((r) => r.ring_number === n)?.event_orders ?? [])
      .map(shapeEventOrder)
      .sort((a, b) => a.order - b.order);
  return {
    comp_year: o.comp_year,
    ring1: ring(1),
    ring2: ring(2),
    ring3: ring(3),
    updated_at: o.updated_at,
  };
}

export function shapeCompetitor(
  user: UserWithProfile,
  registrations: RegistrationWithEvent[] = [],
  groupset: GroupsetWithMembers | null = null,
): CompetitorDTO {
  const profile = user.competitor_profile;
  return {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    gender: fromGender(profile?.gender),
    school: profile?.school_id ?? null,
    school_name: profile?.school?.college_name ?? null,
    student_type: fromStudentType(profile?.student_type),
    skill_level: fromSkillLevel(profile?.skill_level),
    registrations: registrations.map(shapeRegistration),
    groupset: groupset ? shapeGroupset(groupset) : null,
    user_type: user.user_type,
  };
}
