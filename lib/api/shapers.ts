// Serializer-equivalent shapers: Prisma rows -> the DTOs the client consumes.
import type { College, Event, Blog } from "@prisma/client";
import { fromGender, fromSkillLevel, fromStudentType, fromEventCategory, fromWeaponType } from "./enums";
import type {
  CollegeDTO,
  EventDTO,
  BlogDTO,
  SettingsDTO,
  RegistrationDTO,
  GroupsetDTO,
  OrganizerGroupsetDTO,
  OrganizerRegistrationDTO,
  EventOrderDTO,
  OrderDTO,
  CompetitorDTO,
  TeamRefDTO,
} from "./dto";
import type {
  SettingsWithHost,
  RegistrationWithEvent,
  GroupsetWithMembers,
  UserWithProfile,
  UserWithProfileAndRegistration,
  EventOrderWithCompetitors,
  OrderWithRings,
} from "./payloads";

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
  is_cq_nq: e.is_cq_nq,
});

export const shapeBlog = (b: Blog): BlogDTO => ({
  blog_id: b.blog_id,
  date_created: b.date_created,
  author: b.author,
  category: b.category,
  title: b.title,
  blog_content: b.blog_content,
});

// How much of the body a list item carries.
export const BLOG_EXCERPT_CHARS = 300;

// Blog LIST readers use this, not shapeBlog: list views clip the body anyway.
// Single-post readers still serve the complete text.
export const shapeBlogListItem = (b: Blog): BlogDTO => ({
  ...shapeBlog(b),
  blog_content:
    b.blog_content.length > BLOG_EXCERPT_CHARS
      ? `${b.blog_content.slice(0, BLOG_EXCERPT_CHARS).trimEnd()}…`
      : b.blog_content,
});

export function shapeSettings(s: SettingsWithHost | null): SettingsDTO | null {
  // Mirrors Settings.reg_active / regActive in lib/settings.
  const now = new Date();
  const regOpen = (s: SettingsWithHost) => (s.early_reg_start ?? s.reg_start) <= now && now <= s.reg_end;
  return (
    s && {
      reg_year: s.reg_year,
      early_reg_start: s.early_reg_start,
      early_reg_cost_base: s.early_reg_cost_base,
      early_reg_cost_event: s.early_reg_cost_event,
      reg_start: s.reg_start,
      reg_end: s.reg_end,
      reg_cost_base: s.reg_cost_base,
      reg_cost_event: s.reg_cost_event,
      due_date: s.due_date,
      comp_date: s.comp_date,
      contact_email: s.contact_email,
      scoring_url: s.scoring_url,
      host: s.host?.email ?? null,
      host_school: s.host?.college_profile?.college?.college_name ?? null,
      reg_open: regOpen(s),
      order_public: s.order_public,
      created_at: s.created_at,
    }
  );
}

// Registration row -> flattened event shape (matches EventRegistrationSerializer).
export function shapeRegistration(reg: RegistrationWithEvent): RegistrationDTO {
  const out: RegistrationDTO = {
    comp_year: reg.comp_year,
    date_created: reg.date_created,
    event_code: reg.event.event_code,
    event_name: reg.event.event_name,
    event_level: fromSkillLevel(reg.event.event_level),
    event_category: fromEventCategory(reg.event.event_category),
    weapon_type: fromWeaponType(reg.event.weapon_type),
    is_cq_nq: reg.event.is_cq_nq,
    is_nandu: reg.event.is_nandu,
  };
  if (reg.event.is_nandu) out.nandu_str = reg.nandu_str;
  return out;
}

const memberName = (u: { first_name: string; last_name: string }): string =>
  `${u.first_name} ${u.last_name}`;

// A competitor's team for one competition year. Memberships accumulate across years and the year
// lives on the Groupset, so it is matched here; without one, the most recent team is the guess.
type MembershipRows = { groupset: { groupset_id: string; team_name: string; comp_year: number } }[];

function teamForYear(memberships: MembershipRows | undefined, year: number | undefined): TeamRefDTO | null {
  const rows = memberships ?? [];
  const row =
    year === undefined
      ? [...rows].sort((a, b) => b.groupset.comp_year - a.groupset.comp_year)[0]
      : rows.find((m) => m.groupset.comp_year === year);
  return row ? { groupset_id: row.groupset.groupset_id, team_name: row.groupset.team_name } : null;
}

// GroupsetSerializer: members/school rendered as strings. `gs.members` is
// expected to include the related `member` user.
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

// OrganizerGroupsetSerializer representation.
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

// OrganizerRegistrationSerializer. `user.registration` should be pre-filtered to the current
// comp_year with its event included; `year` picks the competitor's team out of their memberships.
export function shapeOrganizerRegistration(
  user: UserWithProfileAndRegistration,
  year?: number,
): OrganizerRegistrationDTO {
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
    amt_paid: profile?.amt_paid ?? 0,
    proof_of_reg: profile?.proof_of_reg ?? false,
    team: teamForYear(profile?.groupset_member, year),
  };
}

// EventOrderSerializer.to_representation: competitor_list as {id, name, order, team} sorted by
// order. The slot's own comp_year picks each team, so a past year's order keeps that year's.
export function shapeEventOrder(eo: EventOrderWithCompetitors): EventOrderDTO {
  return {
    id: eo.id,
    comp_year: eo.comp_year,
    event_id: eo.event_id,
    break_length: eo.break_length,
    name: eo.name,
    competitor_list: [...eo.competitor_orders]
      .sort((a, b) => a.order - b.order)
      .map((co) => ({
        id: co.competitor_id,
        name: memberName(co.competitor.user),
        order: co.order,
        team: teamForYear(co.competitor.groupset_member, eo.comp_year),
      })),
    order: eo.order,
    event_category: fromEventCategory(eo.event?.event_category),
  };
}

// OrderSerializer: one Ring row per ring_number, shaped into the three DTO fields ([] when never
// created). Rings hang off Settings, so `comp_year` is its reg_year and `created_at` stands in.
export function shapeOrder(s: OrderWithRings): OrderDTO {
  const ring = (n: number): EventOrderDTO[] =>
    (s.rings.find((r) => r.ring_number === n)?.event_orders ?? [])
      .map(shapeEventOrder)
      .sort((a, b) => a.order - b.order);
  return {
    comp_year: s.reg_year,
    ring1: ring(1),
    ring2: ring(2),
    ring3: ring(3),
    updated_at: s.order_updated_at ?? s.created_at,
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
