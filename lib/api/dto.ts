// DTO shapes returned to the client, mirroring the Django REST serializers. Date crosses server
// actions natively; the session-storage layer round-trips it through superjson.

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
  // Changquan/Nanquan, which the External All-Around's first requirement is
  // scored on (rules 4.I).
  is_cq_nq: boolean | null;
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
  // Flat fee charged once per competitor, plus a per-event fee on top of it.
  early_reg_cost_base: number | null;
  early_reg_cost_event: number | null;
  reg_start: Date;
  reg_end: Date;
  reg_cost_base: number;
  reg_cost_event: number;
  // Payment + proof-of-enrollment deadline.
  due_date: Date | null;
  comp_date: Date | null;
  contact_email: string;
  // Where live scores are published, or null when there is no link yet.
  scoring_url: string | null;
  // The host account's email — the key writes resolve the host by.
  host: string | null;
  // The host's university, for display.
  host_school: string | null;
  // Whether registration is open right now, resolved server-side so clients
  // don't each compare against their own clock.
  reg_open: boolean;
  order_public: boolean;
  created_at: Date;
}

export interface RegistrationDTO {
  comp_year: number;
  date_created: Date;
  event_code: string;
  event_name: string | null;
  event_level: string | null;
  // "E"/"I"/"G"; the dashboard keys the team competition off a "G" registration.
  event_category: string | null;
  // Carried so All-Around progress scores off a registration the same way it does off the
  // catalogue (lib/allAround.ts needs bare-hand vs. weapon, and Changquan/Nanquan).
  weapon_type: string | null;
  is_cq_nq: boolean | null;
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

// Just enough of a competitor's team to group and label them. Groupset events are ordered by
// team rather than individual, so both the registration payload and the saved order carry this.
export interface TeamRefDTO {
  groupset_id: string;
  team_name: string;
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
  // The school's id (`school` above is its display name), so the organizer edit
  // form can preselect and change the competitor's college.
  school_id: string | null;
  student_type: string | null;
  registration: RegistrationDTO[];
  is_competing: boolean;
  // Whole dollars received so far; 0 when nothing has been paid.
  amt_paid: number;
  proof_of_reg: boolean;
  // Their team for the payload's comp_year, or null when they are on none.
  team: TeamRefDTO | null;
}

export interface EventOrderCompetitorDTO {
  id: string;
  name: string;
  order: number;
  // Their team for the slot's comp_year. Only groupset slots group by it, but it
  // is carried on every competitor rather than conditionally on the category.
  team: TeamRefDTO | null;
}

export interface EventOrderDTO {
  id: string;
  comp_year: number;
  event_id: string | null;
  break_length: number;
  name: string | null;
  competitor_list: EventOrderCompetitorDTO[];
  order: number;
  // "E"/"I"/"G" from the linked event; null for breaks. Read-only order views key
  // team grouping off "G".
  event_category: string | null;
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

// ---------- live scoring ----------

// Read out of the competition's Google Sheet, not the database — judges enter scores there and
// formulas compute them. Every number is what the sheet holds; `null` is "not scored yet".

export interface LiveSubscore {
  label: string;
  // What this subscore is judged out of, so the page can show 3.5/4 without
  // restating the rules.
  max: number;
  value: number | null;
}

export interface LiveScoreEntry {
  // The running-order number within the event, as the sheet's "#" column has it.
  position: number;
  // A competitor for an individual event, a team for a group set.
  name: string;
  // The competitor's school, or a group set's member list.
  affiliation: string | null;
  // Empty for a viewer not permitted judge-by-judge detail.
  judges: (number | null)[];
  // Individual events only: the mean of the middle three judges.
  merited: number | null;
  deduction: number | null;
  final: number | null;
  place: number | null;
  // The raw spread reached the re-score threshold and the Chief Judge has one to
  // call. Always false for a viewer without judge detail.
  rescore: boolean;
  // Group sets only.
  subscores: LiveSubscore[] | null;
  size: number | null;
}

export interface LiveScoreEvent {
  // Stable identity for the block, so a client can ask for exactly this one. Built from the ring
  // and the event's title, which survive a re-export — a row index would not.
  key: string;
  event: string;
  is_groupset: boolean;
  // Only the one block the viewer has expanded carries its rows; every other event is just this
  // header, which is what keeps a poll from shipping the whole competition.
  entries: LiveScoreEntry[];
  loaded: boolean;
  // Always populated, even when `entries` is empty, so a collapsed header can still
  // show "7 of 12 scored" and be worth reading on its own.
  entry_count: number;
  scored: number;
}

export interface LiveScoreRing {
  label: string;
  events: LiveScoreEvent[];
}

export interface LiveScoresDTO {
  rings: LiveScoreRing[];
  // When the sheet was last read. The page shows this so a stale cache reads as
  // stale rather than as "no scores yet".
  fetched_at: Date;
  // Whether this payload carries judge-by-judge detail, so the page knows to render
  // those columns. It reflects what was sent, not what the viewer asked for.
  detail: boolean;
}
