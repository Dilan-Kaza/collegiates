"use client";

import { useState, useEffect, useMemo } from "react";
import { saveOrder, setOrderPublic } from "@functions/actions";
import type { OrganizerRegistrationDTO } from "@/lib/api";
import { ReactSortable } from "react-sortablejs";
import SortableRing from "./SortableRing";
import { eventRank, eventSeconds, toHrMin, buildIdToName, computeConflicts } from "./utils";
import { isEventItem } from "./types";
import type { BreakItem, Competitor, EventItem, OrderData, RingEvent, RingKey, Rings } from "./types";

const BREAK_PRESETS: BreakItem[] = [
    { id: "preset_lunch", type: "break", name: "Lunch", duration: 60 },
    { id: "preset_judges", type: "break", name: "Judges Break", duration: 15 },
];

// `rawRegistrations` and `initialOrder` are resolved on the server and passed
// in (both were fetched on mount here). `initialOrder` is null when no order has
// been saved for the current year yet.
export default function BuildView({
    rawRegistrations = [],
    initialOrder = null,
    orderPublic = false,
}: {
    rawRegistrations?: OrganizerRegistrationDTO[];
    initialOrder?: OrderData | null;
    orderPublic?: boolean;
}) {

    const allEvents = useMemo<EventItem[]>(() => {
        const eventMap = new Map<string, EventItem>();
        for (const user of rawRegistrations) {
            for (const reg of user.registration) {
                if (!eventMap.has(reg.event_code)) {
                    eventMap.set(reg.event_code, {
                        id: reg.event_code,
                        event_name: reg.event_name ?? "",
                        event_level: reg.event_level,
                        is_nandu: reg.is_nandu,
                        competitors: [],
                    });
                }
                eventMap.get(reg.event_code)!.competitors.push({ id: user.user_id, name: user.name, email: user.email, nandu_str: reg.nandu_str });
            }
        }
        return [...eventMap.values()].sort((a, b) => eventRank(a.event_name) - eventRank(b.event_name));
    }, [rawRegistrations]);

    const eventMap = useMemo(() => new Map<string, EventItem>(allEvents.map((ev) => [ev.id, ev])), [allEvents]);

    const reconstructRings = (orderData: OrderData): Rings => {
        const reconstruct = (items: OrderData["ring1"]): RingEvent[] =>
            [...items]
                .sort((a, b) => a.order - b.order)
                .map((item): RingEvent | null => {
                    if (item.event_id) {
                        const event = eventMap.get(item.event_id);
                        return event ? { ...event, orderId: item.id } : null;
                    }
                    return { id: item.id, orderId: item.id, type: "break", name: item.name ?? "", duration: item.break_length ?? 0 };
                })
                .filter((x): x is RingEvent => x !== null);

        const ring1 = reconstruct(orderData.ring1);
        const ring2 = reconstruct(orderData.ring2);
        const ring3 = reconstruct(orderData.ring3);

        const placedIds = new Set([...ring1, ...ring2, ...ring3].filter(isEventItem).map((ev) => ev.id));
        const unplaced = allEvents.filter((ev) => !placedIds.has(ev.id));
        unplaced.forEach((ev) => (ev.event_level === "A" ? ring1 : ring2).push(ev));

        return { ring1, ring2, ring3 };
    };

    const [rings, setRings] = useState<Rings>({ ring1: [], ring2: [], ring3: [] });
    const [initialized, setInitialized] = useState(false);
    const [thirdRing, setThirdRing] = useState(false);
    const [existingOrder, setExistingOrder] = useState<OrderData | null>(initialOrder); // null = none saved yet
    const [isPublic, setIsPublic] = useState(orderPublic); // publicity now lives on Settings
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [stagedBreaks, setStagedBreaks] = useState<BreakItem[]>([]);
    const [breakName, setBreakName] = useState("");
    const [breakDuration, setBreakDuration] = useState(60);

    const addBreak = () => {
        if (!breakName.trim()) return;
        setStagedBreaks((prev) => [...prev, { id: `break_${Date.now()}`, type: "break", name: breakName.trim(), duration: Number(breakDuration) }]);
        setBreakName("");
        setBreakDuration(60);
    };

    useEffect(() => {
        if (allEvents.length === 0 || initialized) return;

        if (existingOrder) {
            const { ring1, ring2, ring3 } = reconstructRings(existingOrder);
            setRings({ ring1, ring2, ring3 });
            if (existingOrder.ring3.length > 0) setThirdRing(true);
        } else {
            const withLunch = (events: EventItem[], id: string): RingEvent[] => {
                if (events.length === 0) return events;
                const mid = Math.ceil(events.length / 2);
                const lunch: BreakItem = { id, type: "break", name: "Lunch", duration: 60 };
                return [...events.slice(0, mid), lunch, ...events.slice(mid)];
            };
            setRings({
                ring1: withLunch(allEvents.filter((ev) => ev.event_level === "A"), "break_lunch_r1"),
                ring2: withLunch(allEvents.filter((ev) => ev.event_level !== "A"), "break_lunch_r2"),
                ring3: [],
            });
        }
        setInitialized(true);
    }, [allEvents, initialized, existingOrder]);

    // Serializes a ring into the event-order write payload (EventOrderInput[]):
    // each item carries its position (`order`), its saved slot id when re-saving,
    // and either event + ordered competitors or a break length.
    const serializeRing = (items: RingEvent[]) => items.map((item, index) => {
        const base: { order: number; id?: string } = { order: index };
        if (item.orderId) base.id = item.orderId;
        return item.type === "break"
            ? { ...base, name: item.name, break_length: item.duration }
            : { ...base, event_id: item.id, name: item.event_name, competitor_list: item.competitors.map((c, i) => ({ id: c.id, order: i })) };
    });

    // Persist all three rings for the current year, then re-hydrate from the saved
    // order so each slot picks up its server-assigned orderId for the next save.
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        const res = await saveOrder({
            ring1: serializeRing(rings.ring1),
            ring2: serializeRing(rings.ring2),
            ring3: serializeRing(rings.ring3),
        });
        if (res.data) {
            setExistingOrder(res.data);
            setRings(reconstructRings(res.data));
        }
        setSaving(false);
    };

    // Toggle publishing of the event order. Publicity lives on Settings
    // (order_public) now, so this flips that flag rather than touching the order.
    const handleTogglePublic = async () => {
        if (!existingOrder || publishing) return;
        setPublishing(true);
        const res = await setOrderPublic(!isPublic);
        if (res.data) setIsPublic(res.data.order_public);
        setPublishing(false);
    };

    const setRing = (key: RingKey) => (list: RingEvent[]) => setRings((prev) => ({ ...prev, [key]: list }));

    const toggleThirdRing = () => {
        if (!thirdRing) {
            setRings((prev) => {
                const beginners = prev.ring2.filter((ev) => ev.type !== "break" && ev.event_level === "B");
                const ring2 = prev.ring2.filter((ev) => ev.type === "break" || ev.event_level !== "B");
                const mid = Math.ceil(beginners.length / 2);
                const lunch: BreakItem = { id: "break_lunch_r3", type: "break", name: "Lunch", duration: 60 };
                const ring3 = beginners.length > 0 ? [...beginners.slice(0, mid), lunch, ...beginners.slice(mid)] : [];
                return { ...prev, ring2, ring3 };
            });
        } else {
            setRings((prev) => {
                const toMove = prev.ring3.filter((ev) => ev.type !== "break");
                return { ...prev, ring2: [...prev.ring2, ...toMove], ring3: [] };
            });
        }
        setThirdRing((v) => !v);
    };

    const setCompetitors = (ringKey: RingKey, eventId: string, newComps: Competitor[]) =>
        setRings((prev) => ({
            ...prev,
            [ringKey]: prev[ringKey].map((ev) => ev.id === eventId && ev.type !== "break" ? { ...ev, competitors: newComps } : ev),
        }));

    const conflicts = useMemo(() => computeConflicts(rings), [rings]);
    const idToName = useMemo(() => buildIdToName(rings), [rings]);

    const duplicateNames = useMemo(() => {
        const nameToIds = new Map<string, Set<string>>();
        [rings.ring1, rings.ring2, rings.ring3].forEach((events) =>
            events.filter(isEventItem).forEach((ev) =>
                ev.competitors.forEach((c) => {
                    if (!nameToIds.has(c.name)) nameToIds.set(c.name, new Set());
                    nameToIds.get(c.name)!.add(c.id);
                })
            )
        );
        return new Set([...nameToIds.entries()].filter(([, ids]) => ids.size > 1).map(([name]) => name));
    }, [rings]);

    const ringTime = (key: RingKey) => {
        const s = rings[key].reduce((acc, ev) => acc + eventSeconds(ev), 0);
        return s > 0 ? toHrMin(s) : null;
    };

    return (
        <div className="flex gap-4 items-start">
            {/* Sidebar */}
            <div className="w-48 shrink-0 flex flex-col gap-3 sticky top-4">
                <div className="bg-off-white rounded-lg border border-gray-200 flex flex-col gap-2 p-3">
                    <div className="text-xs font-semibold text-primary">Add Break</div>
                    {stagedBreaks.length > 0 && (
                        <ReactSortable<BreakItem>
                            list={stagedBreaks}
                            setList={setStagedBreaks}
                            group="rings"
                            animation={150}
                            className="flex flex-col gap-1"
                        >
                            {stagedBreaks.map((b) => (
                                <div key={b.id} className="rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 cursor-grab select-none flex items-center gap-2 text-xs">
                                    <span className="text-gray-400">⏸</span>
                                    <span className="font-medium text-gray-600">{b.name}</span>
                                    <span className="text-gray-400 ml-auto">{b.duration} min</span>
                                </div>
                            ))}
                        </ReactSortable>
                    )}
                    <ReactSortable<BreakItem>
                        list={BREAK_PRESETS}
                        setList={() => {}}
                        group={{ name: "rings", pull: "clone", put: false }}
                        sort={false}
                        clone={(item) => ({ ...item, id: `break_${Date.now()}` })}
                        className="flex flex-col gap-1"
                    >
                        {BREAK_PRESETS.map((preset) => (
                            <div key={preset.id} className="rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 cursor-grab select-none flex items-center gap-2 text-xs">
                                <span className="text-gray-400">⏸</span>
                                <span className="font-medium text-gray-600">{preset.name}</span>
                                <span className="text-gray-400 ml-auto">{preset.duration} min</span>
                            </div>
                        ))}
                    </ReactSortable>
                    <div className="border-t border-gray-100 pt-2 text-xs text-gray-400">Custom</div>
                    <input
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-primary"
                        placeholder="Name (e.g. Lunch)"
                        value={breakName}
                        onChange={(e) => setBreakName(e.target.value)}
                    />
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            min={1}
                            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-primary w-16"
                            value={breakDuration}
                            onChange={(e) => setBreakDuration(Number(e.target.value))}
                        />
                        <span className="text-xs text-gray-400">min</span>
                    </div>
                    <button className="btn btn-ghost btn-sm text-xs" onClick={addBreak} disabled={!breakName.trim()}>+ Add</button>
                </div>
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {conflicts.twoRing.size > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
                        <strong>Two-ring conflict:</strong> {[...conflicts.twoRing].map((id) => idToName.get(id) ?? id).join(", ")}
                    </div>
                )}
                {conflicts.close.size > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                        <strong>Too close:</strong> {[...new Set([...conflicts.close].map((s) => s.split(":")[0]))].map((id) => idToName.get(id) ?? id).join(", ")}
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={toggleThirdRing}>
                        {thirdRing ? "− Ring 3" : "+ Ring 3"}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : existingOrder ? "Save Changes" : "Save Order"}
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleTogglePublic}
                        disabled={!existingOrder || publishing}
                        title={!existingOrder ? "Save the order before publishing" : undefined}
                    >
                        {publishing ? "..." : isPublic ? "Unpublish" : "Publish"}
                    </button>
                </div>

                <div className={`grid gap-4 ${thirdRing ? "grid-cols-3" : "grid-cols-2"}`}>
                    <SortableRing label="Ring 1" timeLabel={ringTime("ring1")} events={rings.ring1} setEvents={setRing("ring1")} conflicts={conflicts} ringKey="ring1" onSetCompetitors={setCompetitors} duplicateNames={duplicateNames} />
                    <SortableRing label="Ring 2" timeLabel={ringTime("ring2")} events={rings.ring2} setEvents={setRing("ring2")} conflicts={conflicts} ringKey="ring2" onSetCompetitors={setCompetitors} duplicateNames={duplicateNames} />
                    {thirdRing && <SortableRing label="Ring 3" timeLabel={ringTime("ring3")} events={rings.ring3} setEvents={setRing("ring3")} conflicts={conflicts} ringKey="ring3" onSetCompetitors={setCompetitors} duplicateNames={duplicateNames} />}
                </div>
            </div>
        </div>
    );
}
