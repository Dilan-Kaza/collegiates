"use client";

import { ReactSortable } from "react-sortablejs";
import EventCard from "./EventCard";
import BreakCard from "./BreakCard";
import type { Competitor, RingEvent, RingKey, Conflicts } from "./types";
// drag-and-drop ring column

interface SortableRingProps {
  label: string;
  timeLabel?: string | null;
  events: RingEvent[];
  setEvents: (list: RingEvent[]) => void;
  conflicts: Conflicts;
  ringKey: RingKey;
  onSetCompetitors: (ringKey: RingKey, eventId: string, newComps: Competitor[]) => void;
  compact?: boolean;
  duplicateNames?: Set<string>;
}

export default function SortableRing({ label, timeLabel, events, setEvents, conflicts, ringKey, onSetCompetitors, compact, duplicateNames }: SortableRingProps) {
    return (
        <div className="bg-off-white rounded-lg border border-gray-200 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{label}</span>
                {timeLabel && <span className="text-xs text-gray-400">{timeLabel}</span>}
            </div>
            <ReactSortable<RingEvent> list={events} setList={setEvents} group="rings" animation={150} className="flex flex-col gap-2 p-3 min-h-16">
                {events.map((ev) => ev.type === "break" ? (
                    <BreakCard
                        key={ev.id}
                        item={ev}
                        onRemove={() => setEvents(events.filter((e) => e.id !== ev.id))}
                        onUpdate={(updated) => setEvents(events.map((e) => e.id === ev.id ? updated : e))}
                    />
                ) : (
                    <EventCard
                        key={ev.id}
                        ev={ev}
                        conflicts={conflicts}
                        onSetCompetitors={(newComps) => onSetCompetitors(ringKey, ev.id, newComps)}
                        compact={compact}
                        duplicateNames={duplicateNames}
                    />
                ))}
            </ReactSortable>
        </div>
    );
}
