import type { RingEvent, Rings, Conflicts } from "./types";
import { isEventItem } from "./types";
// ring scheduling helpers

export const EVENT_ORDER = [
    "Nandu Longfist", "Nandu Southern Fist",
    "Longfist", "Southern Fist",
    "Straightsword", "Broadsword", "Southern Broadsword", "Spear", "Staff", "Southern Staff",
    "Traditional Open Barehand", "Traditional Short Weapon", "Traditional Long Weapon", "Traditional Soft Weapon", "Other Weapon",
    "Taiji 24", "Yang", "Chen", "42 Fist", "42 Sword", "Taiji Weapon",
    "Internal Open Barehand", "Internal Open Weapon",
];

export const eventRank = (name: string): number => {
    const idx = EVENT_ORDER.findIndex((k) => name.includes(k));
    return idx === -1 ? EVENT_ORDER.length : idx;
};

export function eventSeconds(ev: RingEvent): number {
    if (ev.type === "break") return ev.duration * 60;
    const n = ev.competitors.length;
    if (ev.is_nandu) return n * 240;
    const name = ev.event_name;
    if (name.includes("Taiji") || name.includes("Yang") || name.includes("Chen")) return n * 360;
    if (ev.event_level === "A") return n * 180;
    if (ev.event_level === "I") return n * 150;
    return n * 120;
}

export function toHrMin(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.ceil((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getIds(events: RingEvent[]): Set<string> {
    const set = new Set<string>();
    events.filter(isEventItem).forEach((ev) => ev.competitors.forEach((c) => set.add(c.id)));
    return set;
}

export function buildIdToName(rings: Rings): Map<string, string> {
    const map = new Map<string, string>();
    [rings.ring1, rings.ring2, rings.ring3].forEach((events) =>
        events.filter(isEventItem).forEach((ev) => ev.competitors.forEach((c) => map.set(c.id, c.name)))
    );
    return map;
}

export function computeConflicts(rings: Rings): Conflicts {
    const crossCheck = (sets: Set<string>[]): Set<string> => {
        const conflicts = new Set<string>();
        for (let i = 0; i < sets.length; i++)
            for (let j = i + 1; j < sets.length; j++)
                sets[i].forEach((x) => { if (sets[j].has(x)) conflicts.add(x); });
        return conflicts;
    };

    const twoRing = crossCheck([getIds(rings.ring1), getIds(rings.ring2), getIds(rings.ring3)]);

    const MIN_GAP_SECONDS = 20 * 60; // 20 minutes

    // close is a Set of "competitorId:eventId" — only the specific events that are too close
    const close = new Set<string>();
    for (const ringEvents of [rings.ring1, rings.ring2, rings.ring3]) {
        let elapsed = 0;
        const lastSeen = new Map<string, { time: number; eventId: string }>();
        for (const ev of ringEvents) {
            if (ev.type !== "break") {
                for (const c of ev.competitors) {
                    const prev = lastSeen.get(c.id);
                    if (prev) {
                        const { time, eventId: prevEventId } = prev;
                        if (elapsed - time < MIN_GAP_SECONDS) {
                            close.add(`${c.id}:${ev.id}`);
                            close.add(`${c.id}:${prevEventId}`);
                        }
                    }
                    lastSeen.set(c.id, { time: elapsed, eventId: ev.id });
                }
            }
            elapsed += eventSeconds(ev);
        }
    }
    return { twoRing, close };
}
