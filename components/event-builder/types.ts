// Domain types for the event-builder (ring scheduling) UI.

export interface Competitor {
  id: string;
  name: string;
  email?: string;
  nandu_str?: string | null;
  order?: number;
}

export interface EventItem {
  id: string;
  type?: undefined;
  event_name: string;
  event_level?: string | null;
  is_nandu?: boolean | null;
  competitors: Competitor[];
  orderId?: string;
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
  competitor_list?: { id: string; order: number }[];
}

export interface OrderData {
  ring1: OrderItem[];
  ring2: OrderItem[];
  ring3: OrderItem[];
}

export const isEventItem = (ev: RingEvent): ev is EventItem => ev.type !== "break";
