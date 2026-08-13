// Domain types for the event-builder (ring scheduling) UI.

import type { TeamRefDTO } from "@/lib/api";

/** A competitor as the builder holds them, inside an event's running order. */
export interface Competitor {
  id: string;
  name: string;
  email?: string;
  nandu_str?: string | null;
  order?: number;
  // Their team for this competition year, when they are on one. Only groupset
  // events group by it (see lib/teams.ts).
  team?: TeamRefDTO | null;
}

/** A scheduled event slot. Distinguished from {@link BreakItem} by `type` being absent. */
export interface EventItem {
  id: string;
  type?: undefined;
  event_name: string;
  event_level?: string | null;
  is_nandu?: boolean | null;
  competitors: Competitor[];
  orderId?: string;
  // A "G" event: contested by teams, so its card lists teams and its ring time is
  // counted per team rather than per competitor.
  is_groupset?: boolean;
}

/** A scheduled gap in a ring — lunch, an awards block, a changeover. */
export interface BreakItem {
  id: string;
  type: "break";
  name: string;
  /** In minutes, unlike `eventSeconds`' return value. */
  duration: number;
  orderId?: string;
}

/** One slot in a ring: an event or a break. Narrow it with {@link isEventItem}. */
export type RingEvent = EventItem | BreakItem;

/** Which ring a slot belongs to. */
export type RingKey = "ring1" | "ring2" | "ring3";

/** The whole schedule: three rings of slots, in running order. */
export interface Rings {
  ring1: RingEvent[];
  ring2: RingEvent[];
  ring3: RingEvent[];
}

/**
 * Scheduling problems found by `computeConflicts`.
 *
 * @remarks
 * `twoRing` holds bare competitor ids — one competitor booked in two rings at
 * once. `close` holds `"competitorId:eventId"` pairs, marking both events of a
 * gap under 20 minutes.
 */
export interface Conflicts {
  twoRing: Set<string>;
  close: Set<string>;
}

/**
 * A persisted order slot, as read back from the server.
 *
 * @remarks
 * Structurally compatible with `EventOrderDTO`, so an `OrderDTO` ring feeds
 * straight into the builder's reconstruction path without a conversion step.
 */
export interface OrderItem {
  id: string;
  order: number;
  event_id?: string | null;
  name?: string | null;
  break_length?: number;
  /**
   * `name` and `team` are what the read-only views render. The builder needs
   * only the ids, resolving everything else from the live registrations.
   */
  competitor_list?: { id: string; order: number; name?: string; team?: TeamRefDTO | null }[];
  /** `"E"`/`"I"`/`"G"` from the linked event; absent on breaks. */
  event_category?: string | null;
}

/** A persisted order: three rings of {@link OrderItem}. */
export interface OrderData {
  ring1: OrderItem[];
  ring2: OrderItem[];
  ring3: OrderItem[];
}

/** Narrows a {@link RingEvent} to an {@link EventItem}, excluding breaks. */
export const isEventItem = (ev: RingEvent): ev is EventItem => ev.type !== "break";
