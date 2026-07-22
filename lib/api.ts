// Shared API helpers plus object shapers mirroring the Django REST serializers.
//
// Responses are serialized with superjson so rich types survive the wire:
// Date (Prisma timestamps) is preserved and reconstructed on the client (see
// lib/apiClient.ts). This replaces the old hand-rolled JSON.stringify replacer
// that flattened Date to an ISO string. (Ids are all UUID strings now, so no
// BigInt crosses the wire.)
import superjson from "superjson";
import type { Prisma, College, Event, Blog } from "@prisma/client";

// ---------- DTO shapes returned to the client ----------

export interface CollegeDTO {
  college_id: string;
  college_name: string;
}

export interface EventDTO {
  event_code: string;
  event_name: string | null;
  event_level: string | null;
  gender_category: string | null;
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
  student_type: string | null;
  grad_date: Date | null;
  first_comp: number | null;
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
  first_comp: number | null;
  skill_level: string | null;
  grad_date: Date | null;
  registrations: RegistrationDTO[];
  groupset: GroupsetDTO | null;
  user_type: string;
}

// ---------- Prisma payload shapes accepted by the shapers ----------

export type SettingsWithHost = Prisma.SettingsGetPayload<{ include: { host: true } }>;
export type RegistrationWithEvent = Prisma.RegistrationGetPayload<{ include: { event: true } }>;
export type GroupsetWithMembers = Prisma.GroupsetGetPayload<{
  include: { school: true; members: { include: { member: true } } };
}>;
export type UserWithSchool = Prisma.UserGetPayload<{ include: { school: true } }>;
export type UserWithSchoolAndRegistration = Prisma.UserGetPayload<{
  include: { school: true; registration: { include: { event: true } } };
}>;
export type EventOrderWithCompetitors = Prisma.EventOrderGetPayload<{
  include: { competitor_orders: { include: { competitor: true } } };
}>;
// Order with each ring's join rows resolved down to the EventOrder (and its
// competitors). Mirrors the nested representation of the Django OrderSerializer.
type RingInclude = {
  include: { eventorder: { include: { competitor_orders: { include: { competitor: true } } } } };
};
export type OrderWithRings = Prisma.OrderGetPayload<{
  include: { ring1: RingInclude; ring2: RingInclude; ring3: RingInclude };
}>;

// Runtime include values matching the payload types above. Shared by every
// order query (server actions + the cached reader) so the shape stays in one
// place. `satisfies` preserves the literal so Prisma infers the related payload.
export const EVENT_ORDER_INCLUDE = {
  competitor_orders: { include: { competitor: true } },
} satisfies Prisma.EventOrderInclude;

export const ORDER_INCLUDE = {
  ring1: { include: { eventorder: { include: EVENT_ORDER_INCLUDE } } },
  ring2: { include: { eventorder: { include: EVENT_ORDER_INCLUDE } } },
  ring3: { include: { eventorder: { include: EVENT_ORDER_INCLUDE } } },
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
  event_level: e.event_level,
  gender_category: e.gender_category,
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
      comp_date: s.comp_date,
      contact_email: s.contact_email,
      host: s.host?.college_name ?? null,
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
    event_level: reg.event.event_level,
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
    members: (gs.members ?? []).map((m) => memberName(m.member)),
  };
}

// OrganizerGroupsetSerializer representation
export function shapeOrganizerGroupset(gs: GroupsetWithMembers): OrganizerGroupsetDTO {
  const members = (gs.members ?? []).map((m) => ({ user_id: m.member.user_id, name: memberName(m.member) }));
  const leaderRow = (gs.members ?? []).find((m) => m.leader);
  return {
    groupset_id: gs.groupset_id,
    comp_year: gs.comp_year,
    date_created: gs.date_created,
    team_name: gs.team_name,
    members,
    leader: leaderRow ? { user_id: leaderRow.member.user_id, name: memberName(leaderRow.member) } : null,
    school: { school_name: gs.school?.college_name ?? null, school_id: gs.school_id },
  };
}

// OrganizerRegistrationSerializer representation. `user.registration` should be
// pre-filtered to the current comp_year and include the related event.
export function shapeOrganizerRegistration(user: UserWithSchoolAndRegistration): OrganizerRegistrationDTO {
  return {
    user_id: user.user_id,
    name: memberName(user),
    email: user.email,
    gender: user.gender,
    skill_level: user.skill_level,
    school: user.school?.college_name ?? null,
    student_type: user.student_type,
    grad_date: user.grad_date,
    first_comp: user.first_comp,
    registration: (user.registration ?? []).map(shapeRegistration),
    is_competing: user.is_competing,
    has_paid: user.has_paid,
    proof_of_reg: user.proof_of_reg,
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
      .map((co) => ({ id: co.competitor_id, name: memberName(co.competitor), order: co.order })),
    order: eo.order,
  };
}

// OrderSerializer: each ring is a list of nested EventOrder representations.
export function shapeOrder(o: OrderWithRings): OrderDTO {
  const ring = (rows: { eventorder: EventOrderWithCompetitors }[]): EventOrderDTO[] =>
    rows.map((r) => shapeEventOrder(r.eventorder)).sort((a, b) => a.order - b.order);
  return {
    comp_year: o.comp_year,
    ring1: ring(o.ring1),
    ring2: ring(o.ring2),
    ring3: ring(o.ring3),
    updated_at: o.updated_at,
  };
}

export function shapeCompetitor(
  user: UserWithSchool,
  registrations: RegistrationWithEvent[] = [],
  groupset: GroupsetWithMembers | null = null,
): CompetitorDTO {
  return {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    gender: user.gender,
    school: user.school_id,
    school_name: user.school?.college_name ?? null,
    student_type: user.student_type,
    first_comp: user.first_comp,
    skill_level: user.skill_level,
    grad_date: user.grad_date,
    registrations: registrations.map(shapeRegistration),
    groupset: groupset ? shapeGroupset(groupset) : null,
    user_type: user.user_type,
  };
}
