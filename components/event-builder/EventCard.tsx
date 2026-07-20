"use client";

import { ReactSortable } from "react-sortablejs";
import type { Competitor, EventItem, Conflicts } from "./types";
// draggable event card with competitor sub-list

interface EventCardProps {
  ev: EventItem;
  conflicts: Conflicts;
  onSetCompetitors: (newComps: Competitor[]) => void;
  compact?: boolean;
  duplicateNames?: Set<string>;
}

export default function EventCard({ ev, conflicts, onSetCompetitors, compact, duplicateNames }: EventCardProps) {
    const displayName = ev.event_name
        .replace(/\bAdvanced\b/g, "Adv")
        .replace(/\bIntermediate\b/g, "Int")
        .replace(/\bBeginner\b/g, "Beg")
        .replace(/\bMale\b/g, "M")
        .replace(/\bFemale\b/g, "F");
    const hasConflict = ev.competitors.some((c) => conflicts.twoRing.has(c.id) || conflicts.close.has(`${c.id}:${ev.id}`));

    return (
        <div className={`rounded border px-3 py-2 select-none text-xs ${hasConflict ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
            <div className="font-medium text-dark text-sm cursor-grab flex items-center justify-between gap-2">
                <span>{displayName}</span>
                {compact && <span className="text-gray-400 font-normal shrink-0">{ev.competitors.length}</span>}
            </div>
            {!compact && (
                <ReactSortable<Competitor> list={ev.competitors} setList={onSetCompetitors} group={ev.id} animation={150} className="flex flex-col gap-0.5 mt-1">
                    {ev.competitors.map((c) => {
                        const isTwoRing = conflicts.twoRing.has(c.id);
                        const isClose = conflicts.close.has(`${c.id}:${ev.id}`);
                        const isDuplicate = duplicateNames?.has(c.name);
                        const style = isTwoRing
                            ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                            : isClose
                            ? "border-red-300 bg-red-50 text-red-600"
                            : isDuplicate
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-600";
                        return (
                            <div key={c.id} className={`cursor-grab rounded border px-2 py-0.5 ${style}`}>
                                {c.name}{isDuplicate && <span className="opacity-60"> ({c.email})</span>}
                            </div>
                        );
                    })}
                </ReactSortable>
            )}
        </div>
    );
}
