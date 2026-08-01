"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent, Dispatch, MouseEventHandler, SetStateAction } from "react";
import type { RegEventItem } from "@/types";
import type { EventDTO } from "@/lib/api";

interface EventSelectionProps {
  events: RegEventItem[];
  setEvents: Dispatch<SetStateAction<RegEventItem[]>>;
  // The event catalogue, resolved on the server and passed in (was fetched on
  // mount here).
  catalogEvents?: EventDTO[];
  registeredEvents?: string[];
  isEarly?: boolean;
  firstCost?: number | null;
  extraCost?: number | null;
  onSubmit?: MouseEventHandler<HTMLButtonElement>;
}

export default function EventSelection({ events, setEvents, catalogEvents = [], registeredEvents, isEarly, firstCost, extraCost, onSubmit }: EventSelectionProps) {

    const [eventOrder, setEventOrder] = useState<string[]>([]);
    const [remainingEvents, setRemainingEvents] = useState<string[]>(["Northern Barehand Nandu", "Southern Barehand Nandu", "Northern Barehand", "Southern Barehand", "Northern Staff", "Southern Staff"]);
    // Active event-type filter for the picker ("" = show all types).
    const [typeFilter, setTypeFilter] = useState("");

    const eventsFromApi = catalogEvents;

    // Picking an event in the dropdown adds it straight to the list; the select
    // stays pinned to the placeholder so it always reads as "add another".
    const onAdd = (e: ChangeEvent<HTMLSelectElement>) => {
        const eventCode = e.target.value;
        if (eventCode == ""){
            return;
        }
        setEvents([...events, {'event_code': eventCode, 'nandu_str': ""}]);
        const rest = (remainingEvents: string[]) => remainingEvents.filter(e => e !== eventCode);
        setRemainingEvents(rest);
    }

    const onRemove = (event: RegEventItem) => {
        setRemainingEvents([...remainingEvents, event.event_code].sort((a, b) => eventOrder.indexOf(a) - eventOrder.indexOf(b)));
        const rest = (events: RegEventItem[]) => events.filter(e => e.event_code !== event.event_code);
        setEvents(rest);
    }

    const getEventFromCode = (eventCode: string) =>{
        return eventsFromApi.find(e => e.event_code === eventCode);
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
    const TYPE_LABELS: Record<string, string> = { E: "External", I: "Internal" };

    // Suffix an option with its type so the categories coexist within a weapon
    // group.
    const getOptionLabel = (eventCode: string) => {
        const event = getEventFromCode(eventCode);
        const type = event?.event_category ? TYPE_LABELS[event.event_category] : null;
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

    const getEventCost = (index: number) => index === 0 ? firstCost : extraCost;

    useEffect(()=>{
        const eventsList = eventsFromApi.map(({event_code})=>event_code);
        if (registeredEvents){
            const rest = (eventsList: string[]) => eventsList.filter(e => !registeredEvents?.includes(e));
            setRemainingEvents(rest);
        } else {
            setRemainingEvents(eventsList);
        }
        setEventOrder(eventsList);
    },[eventsFromApi]);

    return (
        <div>
            <div className="bg-off-white rounded-lg mx-[10%] px-[5%] py-5">
                <div className="text-4xl text-secondary py-10">
                    Registration
                </div>
                {firstCost != null && (
                    <div className="text-sm text-gray-500 -mt-6 mb-6">
                        {isEarly ? "Early registration rate" : "Standard registration rate"} — ${firstCost} for the first event, ${extraCost} each additional event
                    </div>
                )}
                {events.map((event, index) => (
                    <div key={event.event_code} className="flex flex-row rounded-lg border border-gray-300 py-[10px] px-2 items-center">
                        <div className="flex-1 flex-col">
                            <div className="flex mx-4 items-center gap-2">
                                <span>{getEventName(event.event_code)}</span>
                                {firstCost != null && <span className="text-sm text-secondary">${getEventCost(index)}</span>}
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
                <div>
                    Add an Event!
                </div>
                <div className="flex flex-row flex-wrap gap-2 my-2">
                    {[{ code: "", label: "All" }, ...Object.entries(TYPE_LABELS).map(([code, label]) => ({ code, label }))].map(({ code, label }) => (
                        <button
                            key={code || "all"}
                            className={`btn btn-sm ${typeFilter === code ? "btn-primary" : "btn-outline btn-primary"}`}
                            onClick={() => setTypeFilter(code)}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="cg-field">
                    <select
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
                </div>
                <div className="flex flex-row justify-end">
                    <button className="btn btn-primary my-4" onClick={onSubmit}>Submit</button>
                </div>
            </div>
        </div>
    );
}
