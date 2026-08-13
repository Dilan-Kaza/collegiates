"use client";

import { useMemo } from "react";
import { groupIntoTeams, isGroupsetCategory } from "@/lib/teams";
import type { TeamRefDTO } from "@/lib/api";
import type { OrderData, OrderItem } from "./types";
// read-only ring layout

type StillCompetitor = { id: string; name?: string; order?: number; team?: TeamRefDTO | null };
type StillItem =
    | { id: string; type?: undefined; event_name: string; competitors: StillCompetitor[]; isGroupset: boolean }
    | { id: string; type: "break"; name: string; duration: number };

interface StillRings {
    ring1: StillItem[];
    ring2: StillItem[];
    ring3: StillItem[];
}

function StaticRing({ label, items }: { label: string; items: StillItem[] }) {
    return (
        <div className="bg-off-white rounded-lg border border-gray-200 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{label}</span>
            </div>
            <div className="flex flex-col gap-2 p-3">
                {items.map((item) =>
                    item.type === "break" ? (
                        <div key={item.id} className="cg-chip">
                            <span className="text-gray-400 text-xs">⏸</span>
                            <span className="font-medium text-gray-600">{item.name}</span>
                            <span className="text-xs text-gray-400 ml-auto">{item.duration} min</span>
                        </div>
                    ) : (
                        <div key={item.id} className="rounded border border-gray-200 bg-white px-3 py-2">
                            <div className="font-medium text-dark text-sm">
                                {item.event_name
                                    .replace(/\bAdvanced\b/g, "Adv")
                                    .replace(/\bIntermediate\b/g, "Int")
                                    .replace(/\bBeginner\b/g, "Beg")
                                    .replace(/\bMale\b/g, "M")
                                    .replace(/\bFemale\b/g, "F")}
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1">
                                {/* Groupset events are listed by team, matching the builder. */}
                                {item.isGroupset
                                    ? groupIntoTeams(item.competitors).map((team) => (
                                        <div
                                            key={team.id}
                                            className={`text-xs border rounded px-2 py-0.5 flex items-center gap-2 ${team.unassigned ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-100 bg-gray-50 text-gray-500"}`}
                                        >
                                            <span className="truncate">{team.unassigned ? `⚠ ${team.name}` : team.name}</span>
                                            <span className="ml-auto shrink-0 opacity-60">
                                                {team.unassigned ? "No team" : team.members.length}
                                            </span>
                                        </div>
                                    ))
                                    : item.competitors.map((c) => (
                                        <div key={c.id} className="text-xs text-gray-500 border border-gray-100 rounded px-2 py-0.5 bg-gray-50">
                                            {c.name}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

/**
 * The saved event order, read-only — what a competitor sees once it is
 * published.
 *
 * @remarks
 * Renders from the persisted order alone, without the live registrations the
 * builder resolves against, so it shows the schedule exactly as it was saved.
 * Group-set slots are grouped into teams, matching how the builder laid them out.
 *
 * @param order - The saved order, or null when none exists for this year.
 */
export default function StillView({ order = null }: { order?: OrderData | null }) {

    const rings = useMemo<StillRings | null>(() => {
        if (!order) return null;
        const reconstruct = (items: OrderItem[]): StillItem[] =>
            [...items]
                .sort((a, b) => a.order - b.order)
                .map((item): StillItem => item.event_id
                    ? {
                        id: item.id,
                        event_name: item.name ?? item.event_id,
                        competitors: [...(item.competitor_list ?? [])].sort((a, b) => a.order - b.order),
                        isGroupset: isGroupsetCategory(item.event_category),
                    }
                    : { id: item.id, type: "break", name: item.name ?? "", duration: item.break_length ?? 0 });
        return {
            ring1: reconstruct(order.ring1),
            ring2: reconstruct(order.ring2),
            ring3: reconstruct(order.ring3),
        };
    }, [order]);

    if (!order || !rings) {
        return <div className="text-sm text-gray-400">No saved order found. Use the Build tab to create one.</div>;
    }

    const hasThirdRing = rings.ring3.length > 0;

    return (
        <div className={`grid gap-4 ${hasThirdRing ? "grid-cols-3" : "grid-cols-2"}`}>
            <StaticRing label="Ring 1" items={rings.ring1} />
            <StaticRing label="Ring 2" items={rings.ring2} />
            {hasThirdRing && <StaticRing label="Ring 3" items={rings.ring3} />}
        </div>
    );
}
