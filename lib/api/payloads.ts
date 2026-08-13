/**
 * The Prisma payload types the shapers accept, and the runtime `include` values
 * that produce them.
 *
 * @remarks
 * Both halves live here on purpose: an `include` and the type describing its
 * result are the same fact stated twice, and splitting them is how a query
 * quietly stops matching the shaper that consumes it. Each `include` is written
 * with `satisfies` so TypeScript still infers the literal, and each payload type
 * is derived from that constant rather than hand-written.
 *
 * @packageDocumentation
 */
import type { Prisma } from "@prisma/client";

/**
 * Settings with the host user and the host's college.
 *
 * @remarks
 * The host's university lives on their `CollegeProfile`, so it has to be walked
 * to. `select` rather than `include` on the college profile because
 * `adapter-ppg` chokes on an empty `Int[]` (`host_years`).
 */
export const SETTINGS_INCLUDE = {
  host: {
    include: { college_profile: { select: { college: { select: { college_name: true } } } } },
  },
} satisfies Prisma.SettingsInclude;

/** A settings row shaped by {@link SETTINGS_INCLUDE}. */
export type SettingsWithHost = Prisma.SettingsGetPayload<{ include: typeof SETTINGS_INCLUDE }>;

/** A registration with the event it is for, which `shapeRegistration` flattens. */
export type RegistrationWithEvent = Prisma.RegistrationGetPayload<{ include: { event: true } }>;

/**
 * A group set with its school and members.
 *
 * @remarks
 * `member` points at `CompetitorProfile`, but names live only on `User`, so the
 * member's `user` has to be included to resolve them.
 */
export type GroupsetWithMembers = Prisma.GroupsetGetPayload<{
  include: { school: true; members: { include: { member: { include: { user: true } } } } };
}>;

/**
 * A user with their competitor profile and college.
 *
 * @remarks
 * The competitor fields — gender, school, student type, `is_competing`,
 * `amt_paid`, `proof_of_reg` — live on the one-to-one `CompetitorProfile`, not
 * on `User`, so reading any of them means including it.
 */
export type UserWithProfile = Prisma.UserGetPayload<{
  include: { competitor_profile: { include: { school: true } } };
}>;

/**
 * A user with their profile, this year's registrations, and their team
 * memberships — everything `shapeOrganizerRegistration` reads.
 *
 * @remarks
 * `registration` hangs off `CompetitorProfile`, and `groupset_member` brings the
 * `Groupset` along because that is where `comp_year` lives. Written out in full
 * rather than composed from {@link UserWithProfile}: Prisma cannot infer a
 * payload through a spread.
 */
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

/**
 * One order slot with everything the shaper needs.
 *
 * @remarks
 * `event` comes along for its category, and each competitor brings their team,
 * because group-set slots are ordered by team rather than by individual.
 */
export const EVENT_ORDER_INCLUDE = {
  event: { select: { event_category: true } },
  competitor_orders: {
    include: {
      competitor: { include: { user: true, groupset_member: { include: { groupset: true } } } },
    },
  },
} satisfies Prisma.EventOrderInclude;

/**
 * A whole year's event order, hanging off its `Settings` row.
 *
 * @remarks
 * A `Settings` include rather than its own top-level query, because the order
 * *is* part of the competition year: it used to be a separate per-year `order`
 * table, and its rings now hang off `Settings`. `shapeOrder` picks each ring out
 * by `ring_number`, mirroring Django's `OrderSerializer`.
 */
export const ORDER_INCLUDE = {
  rings: { include: { event_orders: { include: EVENT_ORDER_INCLUDE } } },
} satisfies Prisma.SettingsInclude;

/** An order slot shaped by {@link EVENT_ORDER_INCLUDE}. */
export type EventOrderWithCompetitors = Prisma.EventOrderGetPayload<{
  include: typeof EVENT_ORDER_INCLUDE;
}>;

/** A settings row shaped by {@link ORDER_INCLUDE}, carrying the year's rings. */
export type OrderWithRings = Prisma.SettingsGetPayload<{ include: typeof ORDER_INCLUDE }>;
