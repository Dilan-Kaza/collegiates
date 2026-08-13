"use client";

import { useMemo } from "react";
import { ReactSortable } from "react-sortablejs";
import { groupIntoTeams, flattenTeams } from "@/lib/teams";
import type { TeamRow } from "@/lib/teams";
import type { Competitor, EventItem, Conflicts } from "./types";

interface EventCardProps {
  ev: EventItem;
  conflicts: Conflicts;
  onSetCompetitors: (newComps: Competitor[]) => void;
  compact?: boolean;
  /** Names shared by more than one competitor, disambiguated in the list. */
  duplicateNames?: Set<string>;
}

/**
 * A draggable event card with its running order nested inside.
 *
 * @remarks
 * The nested list is itself sortable, so an organizer reorders competitors
 * within an event without leaving the ring view.
 *
 * A group-set event lists **teams** rather than individuals, since it is
 * contested by teams. Dragging a team writes its members back out in the new
 * team order, so `competitors` stays the stored flat list either way.
 *
 * The card turns red when any of its competitors has a conflict — booked in two
 * rings, or with too little recovery time before or after this event.
 */
export default function EventCard({ ev, conflicts, onSetCompetitors, compact, duplicateNames }: EventCardProps) {
    const displayName = ev.event_name
        .replace(/\bAdvanced\b/g, "Adv")
        .replace(/\bIntermediate\b/g, "Int")
        .replace(/\bBeginner\b/g, "Beg")
        .replace(/\bMale\b/g, "M")
        .replace(/\bFemale\b/g, "F");
    const hasConflict = ev.competitors.some((c) => conflicts.twoRing.has(c.id) || conflicts.close.has(`${c.id}:${ev.id}`));

    const teams = useMemo<TeamRow<Competitor>[]>(
        () => (ev.is_groupset ? groupIntoTeams(ev.competitors) : []),
        [ev.is_groupset, ev.competitors],
    );

    return (
        <div className={`rounded border px-3 py-2 select-none text-xs ${hasConflict ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
            <div className="font-medium text-dark text-sm cursor-grab flex items-center justify-between gap-2">
                <span>{displayName}</span>
                {compact && (
                    <span className="text-gray-400 font-normal shrink-0">
                        {ev.is_groupset ? teams.length : ev.competitors.length}
                    </span>
                )}
            </div>
            {!compact && ev.is_groupset && (
                <ReactSortable<TeamRow<Competitor>>
                    list={teams}
                    setList={(newTeams) => onSetCompetitors(flattenTeams(newTeams))}
                    group={ev.id}
                    animation={150}
                    className="flex flex-col gap-0.5 mt-1"
                >
                    {teams.map((team) => {
                        // A team inherits its members' conflicts: whoever is double-booked,
                        // it is this entry that has to move.
                        const isTwoRing = team.members.some((c) => conflicts.twoRing.has(c.id));
                        const isClose = team.members.some((c) => conflicts.close.has(`${c.id}:${ev.id}`));
                        const style = team.unassigned
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : isTwoRing
                            ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                            : isClose
                            ? "border-red-300 bg-red-50 text-red-600"
                            : "border-gray-200 bg-white text-gray-600";
                        return (
                            <div key={team.id} className={`cursor-grab rounded border px-2 py-0.5 flex items-center gap-2 ${style}`}>
                                <span className="truncate">{team.unassigned ? `⚠ ${team.name}` : team.name}</span>
                                <span className="ml-auto shrink-0 opacity-60">
                                    {team.unassigned ? "No team" : team.members.length}
                                </span>
                            </div>
                        );
                    })}
                </ReactSortable>
            )}
            {!compact && !ev.is_groupset && (
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
