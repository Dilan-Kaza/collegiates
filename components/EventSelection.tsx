"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, Dispatch, MouseEventHandler, SetStateAction } from "react";
import type { RegEventItem } from "@/types";
import type { EventDTO } from "@/lib/api";
import AllAroundStatus from "./AllAroundStatus";

interface EventSelectionProps {
  events: RegEventItem[];
  setEvents: Dispatch<SetStateAction<RegEventItem[]>>;
  // The event catalogue, resolved on the server and passed in (was fetched on
  // mount here).
  catalogEvents?: EventDTO[];
  registeredEvents?: string[];
  isEarly?: boolean;
  baseCost?: number | null;
  eventCost?: number | null;
  // Profile fields the All-Around readout is gated on, so the
  // picker can tell the competitor how close the current selection is to a title.
  studentType?: string | null;
  skillLevel?: string | null;
  // Step back out of the flow (to profile setup). Omitted when there is nowhere
  // to go back to, which hides the button — same shape as RegistrationConfirm's.
  onBack?: MouseEventHandler<HTMLButtonElement>;
  // Leave the flow entirely (to the dashboard), for a competitor who finished the
  // profile step but is not registering events right now. Optional like onBack.
  onExit?: MouseEventHandler<HTMLButtonElement>;
  onSubmit?: MouseEventHandler<HTMLButtonElement>;
}

/**
 * The registration flow's event picker, tabbed by category.
 *
 * @remarks
 * Only events the competitor is eligible for are offered — the catalogue is
 * already filtered to their level and gender by `getCompetitorEvents` — and
 * events they hold a registration for are shown as taken rather than hidden.
 *
 * Nandu events prompt for a difficulty string, and All-Around progress updates
 * beside the list as selections change, so a competitor can see what a fourth
 * form would earn them before committing.
 */
export default function EventSelection({ events, setEvents, catalogEvents = [], registeredEvents, isEarly, baseCost, eventCost, studentType, skillLevel, onBack, onExit, onSubmit }: EventSelectionProps) {

    // Active event-type filter for the picker. Exactly one type is always selected — the chips
    // pick between them rather than toggling off — so the picker offers one category at a time.
    const [typeFilter, setTypeFilter] = useState("E");

    const eventsFromApi = catalogEvents;

    // Indexed once per catalogue instead of an Array.find per lookup — the
    // helpers below are called from inside the option and row render loops.
    const eventsByCode = useMemo(
        () => new Map(eventsFromApi.map((e) => [e.event_code, e] as const)),
        [eventsFromApi],
    );

    const getEventFromCode = (eventCode: string) => eventsByCode.get(eventCode);

    const selectedCodes = useMemo(
        () => new Set(events.map((e) => e.event_code)),
        [events],
    );

    // The picked events resolved back to their catalogue entries, which is what All-Around
    // progress is scored over — so the readout moves as events are added and removed.
    const selectedEvents = useMemo(
        () =>
            events
                .map((e) => eventsByCode.get(e.event_code))
                .filter((e): e is EventDTO => e !== undefined),
        [events, eventsByCode],
    );

    // Derived, not mirrored in state. Kept in state and reset from an effect, an RSC refresh
    // re-offered already-picked events, letting one be added twice. Catalogue order comes free.
    const remainingEvents = useMemo(
        () =>
            eventsFromApi
                .map((e) => e.event_code)
                .filter((code) => !selectedCodes.has(code) && !registeredEvents?.includes(code)),
        [eventsFromApi, selectedCodes, registeredEvents],
    );

    // Picking an event in the dropdown adds it straight to the list; the select
    // stays pinned to the placeholder so it always reads as "add another".
    const onAdd = (e: ChangeEvent<HTMLSelectElement>) => {
        const eventCode = e.target.value;
        if (eventCode === "" || selectedCodes.has(eventCode)) return;
        setEvents([...events, { event_code: eventCode, nandu_str: "" }]);
    }

    const onRemove = (event: RegEventItem) => {
        const rest = (events: RegEventItem[]) => events.filter(e => e.event_code !== event.event_code);
        setEvents(rest);
    }

    const isNandu = (eventCode: string) =>{
        const foundEvent = getEventFromCode(eventCode);
        return foundEvent?.is_nandu;
    }

    const getNanduStr = (event: RegEventItem) =>{
        const foundEvent = events.find(e => e.event_code === event.event_code);
        return foundEvent?.nandu_str;
    }

    const getEventName = (eventCode: string) => {
        const foundEvent = getEventFromCode(eventCode);
        return foundEvent?.event_name;
    }

    // Labels for the dropdown sections. Filters cover gender/skill, so events
    // are organised by weapon (the section) and type (the suffix).
    const WEAPON_LABELS: Record<string, string> = { B: "Barehand", S: "Short Weapon", L: "Long Weapon", O: "Other Weapon" };
    const TYPE_LABELS: Record<string, string> = { E: "External", I: "Internal", G: "Groupset" };

    // Only types this competitor has events in get a filter button: the catalogue carries groupset
    // events for Class 1 only, so a Class 2 competitor would get a button filtering to nothing.
    const availableTypes = Object.keys(TYPE_LABELS).filter(code => eventsFromApi.some(e => e.event_category === code));

    // External is the usual start, falling back to the first type this competitor
    // has events in. Stays "" only for a catalogue with no categories at all.
    const activeType = availableTypes.includes(typeFilter) ? typeFilter : (availableTypes[0] ?? "");

    // Narrow the pickable events to the selected type. Since a type is always
    // selected, the sections below only ever hold one category's events.
    const filteredRemainingEvents = activeType
        ? remainingEvents.filter(code => getEventFromCode(code)?.event_category === activeType)
        : remainingEvents;

    // Bucket remaining events by weapon, keeping catalogue order within each.
    // Weaponless events fall into an "Other" section rendered last.
    const groupedRemainingEvents = (() => {
        const order = ["B", "S", "L", "O", "other"];
        const groups: Record<string, string[]> = {};
        for (const code of filteredRemainingEvents) {
            const weapon = getEventFromCode(code)?.weapon_type ?? "other";
            const key = WEAPON_LABELS[weapon] ? weapon : "other";
            (groups[key] ??= []).push(code);
        }
        return order
            .filter(key => groups[key]?.length)
            .map(key => ({ label: WEAPON_LABELS[key] ?? "Other", codes: groups[key] }));
    })();

    const onNandu = (e: ChangeEvent<HTMLInputElement>, event: RegEventItem) => {
            const { value } = e.target;
            const newEvents = (events: RegEventItem[]) => events.map(eventInList =>
                (eventInList.event_code === event.event_code)?
                {"event_code": eventInList.event_code, "nandu_str":value}:
                eventInList);
            setEvents(newEvents);
    }

    return (
        <div>
            <div className="bg-off-white rounded-lg mx-[10%] px-[5%] py-5">
                <div className="text-4xl text-secondary py-10">
                    Registration
                </div>
                {baseCost != null && (
                    <div className="text-sm text-gray-500 -mt-6 mb-6">
                        {isEarly ? "Early registration rate" : "Standard registration rate"} — ${baseCost} base, ${eventCost} each event
                    </div>
                )}
                {/* Sits beside the events it is scored from, stacking under them
                    when narrow. Renders nothing for an ineligible competitor. */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                        {events.map((event) => (
                            <div key={event.event_code} className="flex flex-row rounded-lg border border-gray-300 py-[10px] px-2 items-center">
                                <div className="flex-1 flex-col">
                                    <div className="flex mx-4 items-center gap-2">
                                        <span>{getEventName(event.event_code)}</span>
                                        {eventCost != null && <span className="text-sm text-secondary">${eventCost}</span>}
                                    </div>
                                    {isNandu(event.event_code) ? <div className="flex flex-1flex-row flex-nowrap">
                                        <div className="flex mx-4">
                                            Nandu Code:
                                        </div>
                                        <div className="flex flex-1 border-b">
                                            <input
                                                className="w-full"
                                                onChange={(e) => onNandu(e, event)}
                                                value={getNanduStr(event)}
                                                />
                                        </div>
                                    </div> : <></>}
                                </div>
                                <div className="flex justify-start">
                                    <button className="btn btn-circle btn-primary btn-ghost" onClick={()=>onRemove(event)}>x</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <AllAroundStatus
                        events={selectedEvents}
                        studentType={studentType}
                        skillLevel={skillLevel}
                        className="cg-list-row w-full sm:w-[38%] sm:shrink-0"
                    />
                </div>
                <div className="mt-3">
                    Add an Event!
                </div>
                <div className="flex flex-row flex-wrap gap-2 my-2">
                    {availableTypes.map((code) => (
                        <button
                            key={code}
                            className={`btn btn-sm ${activeType === code ? "btn-primary" : "btn-outline btn-primary"}`}
                            onClick={() => setTypeFilter(code)}>
                            {TYPE_LABELS[code]}
                        </button>
                    ))}
                </div>
                <select
                    className="select w-full"
                    onChange={onAdd}
                    value="">
                    <option value="" disabled hidden>Select an event to add</option>
                    {groupedRemainingEvents.map((group) => (
                        <optgroup label={group.label} key={group.label}>
                            {group.codes.map((eventCode) => (
                                <option value={eventCode} key={eventCode}>
                                    {getEventName(eventCode)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {/* Back sits opposite Submit, matching the confirm step's row so
                    both steps of the flow read the same way. */}
                <div className={`flex flex-row flex-wrap gap-2 ${onBack || onExit ? "justify-between" : "justify-end"}`}>
                    <div className="flex flex-row flex-wrap gap-2">
                        {onBack && <button className="btn btn-ghost my-4" onClick={onBack}>Back</button>}
                        {onExit && <button className="btn btn-ghost my-4" onClick={onExit}>Return to dashboard</button>}
                    </div>
                    <button className="btn btn-primary my-4" onClick={onSubmit}>Submit</button>
                </div>
            </div>
        </div>
    );
}
