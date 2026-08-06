// Prisma payload types accepted by the shapers, plus the runtime `include`
// values that match them, so query shape and result type stay in one place.
import type { Prisma } from "@prisma/client";

// The host's university lives on its CollegeProfile, so the college comes with the host user
// (`satisfies` keeps the literal). `select`, not `include`: adapter-ppg chokes on empty Int[].
export const SETTINGS_INCLUDE = {
  host: {
    include: { college_profile: { select: { college: { select: { college_name: true } } } } },
  },
} satisfies Prisma.SettingsInclude;

export type SettingsWithHost = Prisma.SettingsGetPayload<{ include: typeof SETTINGS_INCLUDE }>;
export type RegistrationWithEvent = Prisma.RegistrationGetPayload<{ include: { event: true } }>;

// `member` points at CompetitorProfile and names live only on User, so the
// member's `user` is included to resolve them.
export type GroupsetWithMembers = Prisma.GroupsetGetPayload<{
  include: { school: true; members: { include: { member: { include: { user: true } } } } };
}>;

// Competitor fields (gender, school, student_type, is_competing, amt_paid,
// proof_of_reg) live on the one-to-one CompetitorProfile, not on User.
export type UserWithProfile = Prisma.UserGetPayload<{
  include: { competitor_profile: { include: { school: true } } };
}>;

// `registration` hangs off CompetitorProfile; `groupset_member` brings the team with the Groupset
// carrying `comp_year`. Written out literally — Prisma cannot infer a payload through a spread.
export type UserWithProfileAndRegistration = Prisma.UserGetPayload<{
  include: {
    competitor_profile: {
      include: {
        school: true;
        registration: { include: { event: true } };
        groupset_member: { include: { groupset: true } };
      };
    };
  };
}>;

// `satisfies` preserves the literal so Prisma still infers the related payload. `event` comes
// along for its category, and each competitor for their team (groupset slots order by team).
export const EVENT_ORDER_INCLUDE = {
  event: { select: { event_category: true } },
  competitor_orders: {
    include: {
      competitor: { include: { user: true, groupset_member: { include: { groupset: true } } } },
    },
  },
} satisfies Prisma.EventOrderInclude;

// One row per ring; shapeOrder picks each out by `ring_number`, mirroring Django's
// OrderSerializer. The order is part of the year's Settings row, so this is a Settings include.
export const ORDER_INCLUDE = {
  rings: { include: { event_orders: { include: EVENT_ORDER_INCLUDE } } },
} satisfies Prisma.SettingsInclude;

// Derived from the includes above rather than restated, so the query shape and
// the type the shapers accept cannot drift apart.
export type EventOrderWithCompetitors = Prisma.EventOrderGetPayload<{
  include: typeof EVENT_ORDER_INCLUDE;
}>;

export type OrderWithRings = Prisma.SettingsGetPayload<{ include: typeof ORDER_INCLUDE }>;
