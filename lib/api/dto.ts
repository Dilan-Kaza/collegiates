// DTO shapes returned to the client, mirroring the Django REST serializers.
// Server actions carry Date across the boundary natively; the session-storage
// layer round-trips it through superjson (see functions/sessionCache.ts).

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
  // Carried so All-Around progress can be scored off a registration the same way
  // it is off the catalogue (lib/allAround.ts needs bare-hand vs. weapon, and
  // Changquan/Nanquan for the external title's first requirement).
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
