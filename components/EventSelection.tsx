"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent, Dispatch, MouseEventHandler, SetStateAction } from "react";
import { fetchEvents } from "@functions";
import { useSession } from "@functions/sessionContext";
import type { RegEventItem } from "@/types";
import type { EventDTO } from "@/lib/api";

interface EventSelectionProps {
  events: RegEventItem[];
  setEvents: Dispatch<SetStateAction<RegEventItem[]>>;
  registeredEvents?: string[];
  isEarly?: boolean;
  firstCost?: number | null;
  extraCost?: number | null;
  onSubmit?: MouseEventHandler<HTMLButtonElement>;
}

export default function EventSelection({ events, setEvents, registeredEvents, isEarly, firstCost, extraCost, onSubmit }: EventSelectionProps) {

    const [eventOrder, setEventOrder] = useState<string[]>([]);
    const [remainingEvents, setRemainingEvents] = useState<string[]>(["Northern Barehand Nandu", "Southern Barehand Nandu", "Northern Barehand", "Southern Barehand", "Northern Staff", "Southern Staff"]);
    const [selectedEvent, setSelectedEvent] = useState("");

    const { status } = useSession();
    const [eventsFromApi, setEventsFromApi] = useState<EventDTO[]>([]);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetchEvents().then(setEventsFromApi);
    }, [status]);

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) =>{
        const { value } = e.target;
        setSelectedEvent(value);
    }

    const onAdd = () => {
        if (selectedEvent == ""){
            return;
        }
        setEvents([...events, {'event_code': selectedEvent, 'nandu_str': ""}]);
        setSelectedEvent("");
        const rest = (remainingEvents: string[]) => remainingEvents.filter(e => e !== selectedEvent);
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
                <div className="relative flex flex-col gap-2 transition-outline ease-in-out duration-200 border border-gray-300 focus-within:outline-2 focus-within:outline-primary rounded-md py-[10px] px-2">
                    <select
                        onChange={handleChange}
                        value={selectedEvent}>
                        <option value="" disabled hidden></option>
                            {remainingEvents.map((eventCode, index) => (
                                <option value={eventCode} key={index}>
                                    {getEventName(eventCode)}
                                </option>
                            ))}
                    </select>
                </div>
                <div className="flex flex-row">
                    <div className="felx">
                        <button className="btn btn-primary my-4" onClick={onAdd}>Add</button>
                    </div>
                    <div className="flex flex-1"/>
                    <div className="flex">
                        <button className="btn btn-primary my-4" onClick={onSubmit}>Submit</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
