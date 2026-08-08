"use client";

import { useState, useEffect, useMemo } from "react";
import { saveOrder, setOrderPublic, exportSheetTabs } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { clearSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg, setSuccessMsg } from "@slices";
import type { OrganizerRegistrationDTO } from "@/lib/api";
import { isGroupsetCategory } from "@/lib/teams";
import SortableRing from "./SortableRing";
import BreakPanel from "./BreakPanel";
import { buildOrderSheetTabs } from "./sheetExport";
import { buildScoringSheetTabs } from "./scoringExport";
import { eventRank, eventSeconds, toHrMin, buildIdToName, computeConflicts } from "./utils";
import { isEventItem } from "./types";
import type { BreakItem, Competitor, EventItem, OrderData, RingEvent, RingKey, Rings } from "./types";

// `rawRegistrations` and `initialOrder` are resolved on the server and passed in.
// `initialOrder` is null when no order has been saved for the current year yet.
export default function BuildView({
    rawRegistrations = [],
    initialOrder = null,
    orderPublic = false,
    regYear = null,
}: {
    rawRegistrations?: OrganizerRegistrationDTO[];
    initialOrder?: OrderData | null;
    orderPublic?: boolean;
    // Only labels the exported sheet's tabs, so it is optional.
    regYear?: number | null;
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
                        is_groupset: isGroupsetCategory(reg.event_category),
                    });
                }
                eventMap.get(reg.event_code)!.competitors.push({ id: user.user_id, name: user.name, email: user.email, nandu_str: reg.nandu_str, team: user.team });
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
        // Copied, not pushed by reference: `allEvents` is memoized and hands back the same objects as
        // `eventMap`, so ring state would share one object with the memo's cache. `competitors` too.
        const unplaced = allEvents
            .filter((ev) => !placedIds.has(ev.id))
            .map((ev) => ({ ...ev, competitors: [...ev.competitors] }));
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
    // Which export is in flight, so both buttons can show their own progress and
    // neither can be fired while the other is writing to the same spreadsheet.
    const [exporting, setExporting] = useState<"" | "order" | "scoring">("");
    // Sits with the conflict banners rather than only in the toast: a failed save
    // has to stay visible while the organizer decides what to do about it.
    const [saveError, setSaveError] = useState("");

    const dispatch = useAppDispatch();

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

    // Ring -> EventOrderInput[]: each item carries its position, its saved slot id
    // when re-saving, and either event + competitors or a break length.
    const serializeRing = (items: RingEvent[]) => items.map((item, index) => {
        const base: { order: number; id?: string } = { order: index };
        if (item.orderId) base.id = item.orderId;
        return item.type === "break"
            ? { ...base, name: item.name, break_length: item.duration }
            : { ...base, event_id: item.id, name: item.event_name, competitor_list: item.competitors.map((c, i) => ({ id: c.id, order: i })) };
    });

    // Persist all three rings for the year, then re-hydrate so each slot picks up its server-assigned
    // orderId. A silent failure is the costly one — the organizer would believe a day is stored.
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setSaveError("");
        const fallback = "Could not save the event order.";
        try {
            const res = await runAction(
                () => saveOrder({
                    ring1: serializeRing(rings.ring1),
                    ring2: serializeRing(rings.ring2),
                    ring3: serializeRing(rings.ring3),
                }),
                fallback,
            );
            if (res.error || !res.data) {
                const message = errorMessage(res.error, fallback);
                setSaveError(message);
                dispatch(setErrorMsg(message));
                return;
            }
            setExistingOrder(res.data);
            setRings(reconstructRings(res.data));
            // The order changed, so the organizer console's cached copy is stale.
            clearSessionCache(cacheKeys.organizerOrder);
            clearSessionCache(cacheKeys.publicOrder);
            dispatch(setSuccessMsg("Event order saved"));
        } finally {
            setSaving(false);
        }
    };

    // Toggle publishing of the event order. Publicity lives on Settings
    // (order_public) now, so this flips that flag rather than touching the order.
    const handleTogglePublic = async () => {
        if (!existingOrder || publishing) return;
        setPublishing(true);
        const wanted = !isPublic;
        const fallback = `Could not ${wanted ? "publish" : "unpublish"} the order.`;
        try {
            const res = await runAction(() => setOrderPublic(wanted), fallback);
            if (res.error || !res.data) {
                // Leave isPublic alone — the button must keep reflecting the
                // server's state, not the toggle the organizer attempted.
                dispatch(setErrorMsg(errorMessage(res.error, fallback)));
                return;
            }
            setIsPublic(res.data.order_public);
            clearSessionCache(cacheKeys.settings);
            clearSessionCache(cacheKeys.publicOrder);
            dispatch(setSuccessMsg(res.data.order_public ? "Event order published" : "Event order unpublished"));
        } finally {
            setPublishing(false);
        }
    };

    // Push a grid built here into the configured Sheet; both exports go through this, so the action
    // only forwards finished cells. Exports what is displayed, saved or not — useful mid-edit.
    const runExport = async (
        kind: "order" | "scoring",
        buildTabs: () => ReturnType<typeof buildOrderSheetTabs>,
        success: string,
    ) => {
        if (exporting) return;
        const tabs = buildTabs();
        if (tabs.length === 0) {
            dispatch(setErrorMsg("There is nothing to export yet."));
            return;
        }
        setExporting(kind);
        const fallback = "Could not export to Google Sheets.";
        try {
            const res = await runAction(() => exportSheetTabs({ tabs }), fallback);
            if (res.error || !res.data) {
                dispatch(setErrorMsg(errorMessage(res.error, fallback)));
                return;
            }
            // Opening the sheet is the point of the export, but a blocked popup
            // must not read as a failure — the toast confirms the write either way.
            window.open(res.data.url, "_blank", "noopener,noreferrer");
            dispatch(setSuccessMsg(success));
        } finally {
            setExporting("");
        }
    };

    const handleExportOrder = () =>
        runExport("order", () => buildOrderSheetTabs(rings, regYear), "Event order exported to Google Sheets");

    // Separate tabs in the same spreadsheet, so the schedule and the sheets the
    // judges score on stay one document per year.
    const handleExportScoring = () =>
        runExport("scoring", () => buildScoringSheetTabs(rings, regYear), "Scoring sheets exported to Google Sheets");

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
            <BreakPanel />

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
                {saveError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-start justify-between gap-4">
                        <span><strong>Not saved:</strong> {saveError}</span>
                        <button className="text-xs underline shrink-0" onClick={() => setSaveError("")}>Dismiss</button>
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
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleExportOrder}
                        disabled={!!exporting}
                        title="Write the schedule on screen to the Google Sheet"
                    >
                        {exporting === "order" ? "Exporting..." : "Export to Sheet"}
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleExportScoring}
                        disabled={!!exporting}
                        title="Write judge scoring sheets for this schedule to the Google Sheet"
                    >
                        {exporting === "scoring" ? "Exporting..." : "Export Scoring"}
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
