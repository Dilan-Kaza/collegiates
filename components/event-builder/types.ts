// Domain types for the event-builder (ring scheduling) UI.

import type { TeamRefDTO } from "@/lib/api";

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

export interface BreakItem {
  id: string;
  type: "break";
  name: string;
  duration: number;
  orderId?: string;
}

export type RingEvent = EventItem | BreakItem;

export type RingKey = "ring1" | "ring2" | "ring3";

export interface Rings {
  ring1: RingEvent[];
  ring2: RingEvent[];
  ring3: RingEvent[];
}

export interface Conflicts {
  twoRing: Set<string>;
  close: Set<string>;
}

// Persisted order shape, structurally compatible with the server's EventOrderDTO,
// so an OrderDTO ring feeds straight into the reconstruction paths below.
export interface OrderItem {
  id: string;
  order: number;
  event_id?: string | null;
  name?: string | null;
  break_length?: number;
  // `name`/`team` are what the read-only views render; the builder only needs the
  // ids, since it resolves everything else from the live registrations.
  competitor_list?: { id: string; order: number; name?: string; team?: TeamRefDTO | null }[];
  // "E"/"I"/"G" from the linked event; absent on breaks.
  event_category?: string | null;
}

export interface OrderData {
  ring1: OrderItem[];
  ring2: OrderItem[];
  ring3: OrderItem[];
}

export const isEventItem = (ev: RingEvent): ev is EventItem => ev.type !== "break";
