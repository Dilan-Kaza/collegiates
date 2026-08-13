import { groupIntoTeams } from "@/lib/teams";
import type { RingEvent, Rings, Conflicts } from "./types";
import { isEventItem } from "./types";

/**
 * Scheduling helpers for the event builder: ring timing and conflict detection.
 *
 * @remarks
 * Everything here is pure and runs client-side while an organizer drags slots
 * around, so the ring times and conflict badges update on every move.
 *
 * @packageDocumentation
 */

let breakIdSeq = 0;

/**
 * A fresh id for a newly inserted break.
 *
 * @remarks
 * Break ids key the React lists and are what a `BreakCard`'s remove and update
 * match on, so they must be unique per instance. A bare `Date.now()` collides
 * within a millisecond of double-clicking, hence the counter.
 */
export const newBreakId = (): string => `break_${Date.now()}_${breakIdSeq++}`;

/**
 * Event names in the order a competition conventionally runs them.
 *
 * @remarks
 * Matched by substring, so it covers every level and gender variant of a
 * discipline without listing them all.
 */
export const EVENT_ORDER = [
    "Nandu Longfist", "Nandu Southern Fist",
    "Longfist", "Southern Fist",
    "Straightsword", "Broadsword", "Southern Broadsword", "Spear", "Staff", "Southern Staff",
    "Traditional Open Barehand", "Traditional Short Weapon", "Traditional Long Weapon", "Traditional Soft Weapon", "Other Weapon",
    "Taiji 24", "Yang", "Chen", "42 Fist", "42 Sword", "Taiji Weapon",
    "Internal Open Barehand", "Internal Open Weapon",
];

/**
 * An event's position in {@link EVENT_ORDER}, for sorting the unscheduled pool.
 *
 * @param name - The event's display name.
 * @returns Its index, or a value past the end for anything unrecognized, which
 * sorts such events last rather than first.
 */
export const eventRank = (name: string): number => {
    const idx = EVENT_ORDER.findIndex((k) => name.includes(k));
    return idx === -1 ? EVENT_ORDER.length : idx;
};

/**
 * How long a slot occupies its ring, in seconds.
 *
 * @remarks
 * Estimated as *entries × seconds per entry*. A group-set event runs once per
 * **team**, not once per competitor, so the count there is teams.
 *
 * Per-entry times: nandu 4:00, Taiji disciplines 6:00, then by level — advanced
 * 3:00, intermediate 2:30, beginner 2:00. A break is simply its own duration.
 *
 * @param ev - The slot.
 */
export function eventSeconds(ev: RingEvent): number {
    if (ev.type === "break") return ev.duration * 60;
    const n = ev.is_groupset ? groupIntoTeams(ev.competitors).length : ev.competitors.length;
    if (ev.is_nandu) return n * 240;
    const name = ev.event_name;
    if (name.includes("Taiji") || name.includes("Yang") || name.includes("Chen")) return n * 360;
    if (ev.event_level === "A") return n * 180;
    if (ev.event_level === "I") return n * 150;
    return n * 120;
}

/**
 * Formats seconds as `"2h 15m"`, or `"45m"` under an hour.
 *
 * @remarks
 * Minutes round **up**, so a ring's displayed time is never optimistic.
 */
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

/**
 * Every scheduled competitor's id mapped to their name, across all three rings.
 *
 * @remarks
 * Lets the conflict badges name a competitor without re-walking the schedule per
 * badge.
 */
export function buildIdToName(rings: Rings): Map<string, string> {
    const map = new Map<string, string>();
    [rings.ring1, rings.ring2, rings.ring3].forEach((events) =>
        events.filter(isEventItem).forEach((ev) => ev.competitors.forEach((c) => map.set(c.id, c.name)))
    );
    return map;
}

/**
 * Finds the two scheduling problems an organizer needs flagged.
 *
 * @remarks
 * **Two-ring**: a competitor scheduled in more than one ring, who cannot be in
 * two places at once. Reported as bare competitor ids, since the whole entry is
 * the problem.
 *
 * **Close**: two of a competitor's events less than 20 minutes apart within the
 * same ring, leaving no time to change weapons and recover. Reported as
 * `"competitorId:eventId"` pairs, marking *both* events involved, so the badge
 * lands on the specific slots rather than the competitor generally.
 *
 * Timing walks each ring accumulating {@link eventSeconds}, so it reflects the
 * same estimate the ring's displayed duration does.
 *
 * @param rings - The current schedule.
 */
export function computeConflicts(rings: Rings): Conflicts {
    const crossCheck = (sets: Set<string>[]): Set<string> => {
        const conflicts = new Set<string>();
        for (let i = 0; i < sets.length; i++)
            for (let j = i + 1; j < sets.length; j++)
                sets[i].forEach((x) => { if (sets[j].has(x)) conflicts.add(x); });
        return conflicts;
    };

    const twoRing = crossCheck([getIds(rings.ring1), getIds(rings.ring2), getIds(rings.ring3)]);

    const MIN_GAP_SECONDS = 20 * 60;

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
