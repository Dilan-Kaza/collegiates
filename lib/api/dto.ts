/**
 * The shapes returned to the client, mirroring the old Django REST serializers.
 *
 * @remarks
 * These are the only object shapes that cross the server boundary. They speak
 * the legacy single-character **codes** rather than Prisma's enum member names —
 * see {@link "lib/api/enums"} for the translation, which happens in the shapers.
 *
 * `Date` survives a server-action return natively, and the `sessionStorage`
 * layer round-trips it through superjson, so DTO date fields are typed as real
 * `Date`s throughout. The one place that is not true is Next's Data Cache, which
 * serializes through JSON — cached readers rehydrate explicitly.
 *
 * @packageDocumentation
 */

/** A college, for pickers and display. */
export interface CollegeDTO {
  college_id: string;
  college_name: string;
}

/** One event from the catalogue. */
export interface EventDTO {
  event_code: string;
  event_name: string | null;
  event_level: string | null;
  event_category: string | null;
  gender_category: string | null;
  weapon_type: string | null;
  is_nandu: boolean | null;
  /**
   * Marks the Changquan and Nanquan disciplines, nandu variants included.
   * Nothing else identifies them, and the External All-Around's first
   * requirement is scored on it (rules 4.I).
   */
  is_cq_nq: boolean | null;
}

/** A blog post. List readers carry an excerpt; single-post readers the full body. */
export interface BlogDTO {
  blog_id: string;
  date_created: Date;
  author: string;
  category: string;
  title: string;
  blog_content: string;
}

/** The current competition's public settings. */
export interface SettingsDTO {
  reg_year: number;
  early_reg_start: Date | null;
  /** Flat fee charged once per competitor at the early tier. */
  early_reg_cost_base: number | null;
  /** Per-event fee at the early tier, charged on top of the base. */
  early_reg_cost_event: number | null;
  reg_start: Date;
  reg_end: Date;
  /** Flat fee charged once per competitor at the regular tier. */
  reg_cost_base: number;
  /** Per-event fee at the regular tier, charged on top of the base. */
  reg_cost_event: number;
  /** Deadline for payment and proof of enrollment. Separate from `reg_end`. */
  due_date: Date | null;
  comp_date: Date | null;
  contact_email: string;
  /**
   * The spreadsheet live scores are published from, and the target both Sheets
   * exports write to. Null until an organizer pastes one.
   */
  scoring_url: string | null;
  /** The host account's email — the key writes resolve a host by. */
  host: string | null;
  /** The host's university, for display. */
  host_school: string | null;
  /**
   * Whether registration is open right now, resolved server-side so browsers do
   * not each judge the window against their own clock.
   */
  reg_open: boolean;
  order_public: boolean;
  created_at: Date;
}

/**
 * One registration, flattened to carry its event's fields.
 *
 * @remarks
 * The event fields are lifted onto the registration so All-Around progress
 * scores off a registration list exactly as it does off the catalogue —
 * {@link "lib/allAround"} needs bare-hand vs. weapon and Changquan/Nanquan, and
 * would otherwise need a second pass over the events.
 */
export interface RegistrationDTO {
  comp_year: number;
  date_created: Date;
  event_code: string;
  event_name: string | null;
  event_level: string | null;
  /** `"E"`/`"I"`/`"G"`. The dashboard keys the team competition off a `"G"` row. */
  event_category: string | null;
  weapon_type: string | null;
  is_cq_nq: boolean | null;
  is_nandu: boolean | null;
  /** The declared difficulty string. Present only for nandu events. */
  nandu_str?: string | null;
}

/** A group-set member as the organizer console needs them: id plus display name. */
export interface OrganizerMemberDTO {
  user_id: string;
  name: string;
}

/** A group set as its own members see it — names only, no ids to edit with. */
export interface GroupsetDTO {
  groupset_id: string;
  team_name: string;
  school: string | null;
  comp_year: number;
  date_created: Date;
  members: string[];
}

/**
 * Just enough of a competitor's team to group and label them.
 *
 * @remarks
 * Group-set events are ordered by team rather than by individual, so both the
 * registration payload and the saved event order carry this on every competitor.
 */
export interface TeamRefDTO {
  groupset_id: string;
  team_name: string;
}

/** A group set as the organizer console needs it: ids alongside display names. */
export interface OrganizerGroupsetDTO {
  groupset_id: string;
  comp_year: number;
  date_created: Date;
  team_name: string;
  members: OrganizerMemberDTO[];
  leader: OrganizerMemberDTO | null;
  school: { school_name: string | null; school_id: string };
}

/** One competitor as the organizer's registration and payment views need them. */
export interface OrganizerRegistrationDTO {
  user_id: string;
  name: string;
  email: string;
  gender: string | null;
  skill_level: string | null;
  /** The school's display name. */
  school: string | null;
  /** The school's id, so the organizer's editor can preselect and change it. */
  school_id: string | null;
  student_type: string | null;
  registration: RegistrationDTO[];
  is_competing: boolean;
  /** Whole dollars received so far. `0` means nothing has been paid. */
  amt_paid: number;
  proof_of_reg: boolean;
  /** Their team for the payload's `comp_year`, or null when they are on none. */
  team: TeamRefDTO | null;
}

/** One competitor's place in a slot's running order. */
export interface EventOrderCompetitorDTO {
  id: string;
  name: string;
  order: number;
  /**
   * Their team for the slot's `comp_year`. Only group-set slots group by it, but
   * it is carried on every competitor rather than conditionally by category.
   */
  team: TeamRefDTO | null;
}

/** One scheduled slot in a ring: an event with its running order, or a break. */
export interface EventOrderDTO {
  id: string;
  comp_year: number;
  /** The event's code, or null when this slot is a break. */
  event_id: string | null;
  break_length: number;
  name: string | null;
  competitor_list: EventOrderCompetitorDTO[];
  order: number;
  /** `"E"`/`"I"`/`"G"` from the linked event; null for breaks. */
  event_category: string | null;
}

/** A competition year's whole event order, one field per ring. */
export interface OrderDTO {
  comp_year: number;
  ring1: EventOrderDTO[];
  ring2: EventOrderDTO[];
  ring3: EventOrderDTO[];
  updated_at: Date;
}

/** The signed-in competitor's own payload: profile, registrations, and team. */
export interface CompetitorDTO {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  /** The college's **id**, which the profile form binds to. */
  school: string | null;
  /** The college's display name. */
  school_name: string | null;
  student_type: string | null;
  skill_level: string | null;
  registrations: RegistrationDTO[];
  groupset: GroupsetDTO | null;
  user_type: string;
}

// ---------- live scoring ----------

/**
 * One averaged criterion of a group set's score, with what it is judged out of.
 *
 * @remarks
 * The maximum travels with the value so the page can render "3.5 / 4" without
 * restating the rules, and cannot disagree with the sheet about the scale.
 */
export interface LiveSubscore {
  label: string;
  max: number;
  value: number | null;
}

/**
 * One competitor's or team's line in a live-scoring block.
 *
 * @remarks
 * Every number is read from the competition's Google Sheet, where judges enter
 * scores and formulas compute the rest — nothing here is recomputed. `null`
 * means "not scored yet" rather than zero.
 */
export interface LiveScoreEntry {
  /** Running-order number within the event, from the sheet's "#" column. */
  position: number;
  /** A competitor for an individual event, a team for a group set. */
  name: string;
  /** The competitor's school, or a group set's member list. */
  affiliation: string | null;
  /** Empty for a viewer not permitted judge-by-judge detail. */
  judges: (number | null)[];
  /** Individual events only: the mean of the middle three judges. */
  merited: number | null;
  deduction: number | null;
  final: number | null;
  place: number | null;
  /**
   * The raw spread reached the re-score threshold and the Chief Judge has one to
   * call. Always false for a viewer without judge detail.
   */
  rescore: boolean;
  /** Group sets only. */
  subscores: LiveSubscore[] | null;
  /** Group sets only: how many members the team fielded. */
  size: number | null;
}

/** One event's block within a ring. */
export interface LiveScoreEvent {
  /**
   * Stable identity for the block, so a client can request exactly this one.
   * Built from the ring and the event's title, both of which survive a
   * re-export — a row index would not.
   */
  key: string;
  event: string;
  is_groupset: boolean;
  /**
   * Populated only for the one block the viewer has expanded. Every other event
   * ships as a bare header, which is what keeps a poll from carrying the whole
   * competition.
   */
  entries: LiveScoreEntry[];
  loaded: boolean;
  /** Always populated, so a collapsed header can still read "7 of 12 scored". */
  entry_count: number;
  /** How many entries have a final score. */
  scored: number;
}

/** One ring's worth of live scoring. */
export interface LiveScoreRing {
  label: string;
  events: LiveScoreEvent[];
}

/** The live-scoring payload for the whole competition. */
export interface LiveScoresDTO {
  rings: LiveScoreRing[];
  /**
   * When the sheet was last read. Shown on the page so a stale cache reads as
   * stale rather than as "no scores yet".
   */
  fetched_at: Date;
  /**
   * Whether this payload carries judge-by-judge detail. Reflects what was
   * actually sent, not what the viewer asked for, so the page renders those
   * columns only when the data is really there.
   */
  detail: boolean;
}
