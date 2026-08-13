/**
 * Prisma rows to the DTOs the client consumes.
 *
 * @remarks
 * These are the port of the old Django REST serializers, and each is named
 * after the one it replaces. They do three jobs: pick the fields that may leave
 * the server, translate Prisma enum members back to the codes the DTOs and
 * forms speak (see {@link "lib/api/enums"}), and flatten relations the client
 * would otherwise have to walk.
 *
 * Every shaper is pure and synchronous. The Prisma payload types they accept,
 * and the matching `include` values, live in {@link "lib/api/payloads"} so the
 * query shape and the accepted type cannot drift apart.
 *
 * @packageDocumentation
 */
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

/** A college row as the client sees it. */
export const shapeCollege = (c: College): CollegeDTO => ({
  college_id: c.college_id,
  college_name: c.college_name,
});

/** A catalogue event, with its Prisma enums translated back to DTO codes. */
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

/** A blog post with its complete body. Use {@link shapeBlogListItem} for lists. */
export const shapeBlog = (b: Blog): BlogDTO => ({
  blog_id: b.blog_id,
  date_created: b.date_created,
  author: b.author,
  category: b.category,
  title: b.title,
  blog_content: b.blog_content,
});

/** How much of a post's body a list item carries, in characters. */
export const BLOG_EXCERPT_CHARS = 300;

/**
 * A blog post truncated to an excerpt, for list views.
 *
 * @remarks
 * Every blog **list** reader uses this rather than {@link shapeBlog}: the list
 * clips the body visually anyway, so shipping whole posts would only inflate the
 * payload and the cache entry. Single-post readers still serve the full text.
 */
export const shapeBlogListItem = (b: Blog): BlogDTO => ({
  ...shapeBlog(b),
  blog_content:
    b.blog_content.length > BLOG_EXCERPT_CHARS
      ? `${b.blog_content.slice(0, BLOG_EXCERPT_CHARS).trimEnd()}…`
      : b.blog_content,
});

/**
 * The competition settings as the client sees them.
 *
 * @remarks
 * `reg_open` is resolved here, on the server, rather than left for each client
 * to compute — otherwise every browser would judge the window against its own
 * clock. The rule mirrors `regActive` in {@link "lib/settings"}.
 *
 * The host is flattened to their email (the key writes resolve a host by) plus
 * their college's name for display.
 *
 * @param s - The settings row with its host included, or null.
 * @returns The DTO, or `null` when no competition exists yet.
 */
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

/**
 * A registration flattened into its event's shape — the port of
 * `EventRegistrationSerializer`.
 *
 * @remarks
 * The event's own fields are lifted onto the registration so the dashboard can
 * score All-Around progress straight off a registration list, without a second
 * pass over the catalogue.
 *
 * `nandu_str` is only included for nandu events, so a non-nandu registration
 * carries no empty difficulty string.
 *
 * @param reg - A registration row with its `event` included.
 */
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

/**
 * A group set for its own members — the port of `GroupsetSerializer`.
 *
 * @remarks
 * Members and school are rendered as plain display strings, since the
 * competitor-facing views only ever show them. Organizers need ids to edit with,
 * so they get {@link shapeOrganizerGroupset} instead.
 *
 * @param gs - A group set with `school` and `members.member.user` included.
 */
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

/**
 * A group set for the organizer console — the port of `OrganizerGroupsetSerializer`.
 *
 * @remarks
 * Carries user ids and the school id alongside the display names, because the
 * organizer's editor has to preselect members and reassign the team.
 *
 * @param gs - A group set with `school` and `members.member.user` included.
 */
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

/**
 * One competitor as the organizer's registration and payment views need them —
 * the port of `OrganizerRegistrationSerializer`.
 *
 * @param user - The user with `competitor_profile` included, whose
 * `registration` relation should already be filtered to the competition year and
 * have its `event` included. This shaper does not filter by year itself.
 * @param year - Which year's team membership to report. Memberships accumulate
 * across years, so without this the most recent team is used as a guess.
 */
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

/**
 * One slot of a ring — the port of `EventOrderSerializer.to_representation`.
 *
 * @remarks
 * The competitor list is sorted by its stored `order`, so running order survives
 * however the rows came back from Postgres.
 *
 * Each competitor's team is resolved against the **slot's own** `comp_year`, not
 * today's, so re-reading a past year's order still shows the teams as they stood
 * that year.
 *
 * @param eo - An `EventOrder` row with `EVENT_ORDER_INCLUDE` applied.
 */
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

/**
 * A competition year's whole event order — the port of `OrderSerializer`.
 *
 * @remarks
 * Rings are stored as rows keyed by `ring_number` and picked out into the three
 * flat DTO fields; a ring that was never created reads as `[]` rather than being
 * absent.
 *
 * The order hangs off the year's `Settings` row, which is why `comp_year` comes
 * from `reg_year`, and why `created_at` stands in when `order_updated_at` is
 * still null.
 *
 * @param s - A `Settings` row with `ORDER_INCLUDE` applied.
 */
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

/**
 * The signed-in competitor's own payload: profile, registrations, and team.
 *
 * @remarks
 * The three parts are passed separately rather than read off one deep include,
 * because the callers fetch them under different cache keys — see
 * {@link "functions/actions/account"}. `school` is the college **id** (what the
 * profile form binds to) while `school_name` is the display name.
 *
 * @param user - The user with `competitor_profile.school` included.
 * @param registrations - This year's registrations, each with its `event`.
 * @param groupset - Their team, or null when they are on none.
 */
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
