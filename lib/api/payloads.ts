// Prisma payload types accepted by the shapers, plus the runtime `include`
// values that match them, so query shape and result type stay in one place.
import type { Prisma } from "@prisma/client";

// The host's university lives on its CollegeProfile, so the college comes along
// with the host user — `satisfies` keeps the literal for Prisma's inference.
// `select`, not `include`, on the profile: adapter-ppg 7.9.1 chokes on
// CollegeProfile.host_years' empty Int[] (see the raw-SQL note in
// actions/admin.ts), and the college name is all this needs anyway.
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

// Competitor fields (gender, school, student_type, is_competing, has_paid,
// proof_of_reg) live on the one-to-one CompetitorProfile, not on User.
export type UserWithProfile = Prisma.UserGetPayload<{
  include: { competitor_profile: { include: { school: true } } };
}>;

// `registration` hangs off CompetitorProfile, so it nests under the profile.
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

// One row per ring; shapeOrder picks each out by `ring_number`. Mirrors the
// nested representation of the Django OrderSerializer.
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

// `satisfies` preserves the literal so Prisma still infers the related payload.
export const EVENT_ORDER_INCLUDE = {
  competitor_orders: { include: { competitor: { include: { user: true } } } },
} satisfies Prisma.EventOrderInclude;

export const ORDER_INCLUDE = {
  rings: { include: { event_orders: { include: EVENT_ORDER_INCLUDE } } },
} satisfies Prisma.OrderInclude;
