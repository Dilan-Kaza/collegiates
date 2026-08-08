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
  onSubmit?: MouseEventHandler<HTMLButtonElement>;
}

export default function EventSelection({ events, setEvents, catalogEvents = [], registeredEvents, isEarly, baseCost, eventCost, studentType, skillLevel, onBack, onSubmit }: EventSelectionProps) {

    // Active event-type filter for the picker ("" = no filter, every type shows).
    // There is no "All" chip: the chips toggle, so clicking the active one clears
    // the filter and gets you back to the unfiltered list.
    const [typeFilter, setTypeFilter] = useState("");

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

    // The picked events resolved back to their catalogue entries, which is what
    // All-Around progress is scored over — so the readout moves as events are
    // added and removed.
    const selectedEvents = useMemo(
        () =>
            events
                .map((e) => eventsByCode.get(e.event_code))
                .filter((e): e is EventDTO => e !== undefined),
        [events, eventsByCode],
    );

    // Derived, not mirrored in state. The old version kept `remainingEvents` in
    // state and reset it from an effect keyed on the catalogue prop, so any RSC
    // refresh (a server action's updateTag, a router.refresh) put already-picked
    // events back in the dropdown while they were still selected — letting the
    // same event be added twice, which createRegistrations then rejects outright.
    // Catalogue order is preserved for free, which is what the sort-on-remove
    // was reconstructing.
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

    // Only the types this competitor actually has events in get a filter button:
    // the catalogue carries groupset events for Class 1 competitors only, so a
    // Class 2 competitor would otherwise get a button that filters to nothing.
    const availableTypes = Object.keys(TYPE_LABELS).filter(code => eventsFromApi.some(e => e.event_category === code));

    // Suffix an option with its type so the categories coexist within a weapon
    // group. Only the External/Internal split needs it — a groupset event is
    // already named for what it is, so it would just read "Groupset (Groupset)".
    const getOptionLabel = (eventCode: string) => {
        const category = getEventFromCode(eventCode)?.event_category;
        const type = category === "E" || category === "I" ? TYPE_LABELS[category] : null;
        return type ? `${getEventName(eventCode)} (${type})` : getEventName(eventCode);
    }

    // Narrow the pickable events to the active type filter (External/Internal).
    // An empty filter keeps every type.
    const filteredRemainingEvents = typeFilter
        ? remainingEvents.filter(code => getEventFromCode(code)?.event_category === typeFilter)
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
                {/* The All-Around readout sits beside the events it is scored from,
                    stacking under them once there is no room for two columns. It
                    renders nothing for a competitor who can't hold a title, in which
                    case the list keeps the full width it had before. */}
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
                            className={`btn btn-sm ${typeFilter === code ? "btn-primary" : "btn-outline btn-primary"}`}
                            onClick={() => setTypeFilter(typeFilter === code ? "" : code)}>
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
                                    {getOptionLabel(eventCode)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {/* Back sits opposite Submit, matching the confirm step's row so
                    the two steps of the flow read the same way. */}
                <div className={`flex flex-row ${onBack ? "justify-between" : "justify-end"}`}>
                    {onBack && <button className="btn btn-ghost my-4" onClick={onBack}>Back</button>}
                    <button className="btn btn-primary my-4" onClick={onSubmit}>Submit</button>
                </div>
            </div>
        </div>
    );
}
