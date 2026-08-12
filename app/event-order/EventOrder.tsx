"use client";

import { useCachedResource, cacheKeys, fetchPublicOrder } from "@functions";
import { groupIntoTeams, isGroupsetCategory } from "@/lib/teams";
import type { EventOrderDTO, OrderDTO } from "@/lib/api";
// the published event order, as competitors see it

function StaticRing({ label, items }: { label: string; items: EventOrderDTO[] }) {
    return (
        <div className="bg-off-white rounded-lg border border-gray-200 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{label}</span>
            </div>
            <div className="flex flex-col gap-2 p-3">
                {[...items].sort((a, b) => a.order - b.order).map((item, i) =>
                    !item.event_id ? (
                        <div key={item.id ?? i} className="cg-chip">
                            <span className="text-gray-400 text-xs">⏸</span>
                            <span className="font-medium text-gray-600">{item.name}</span>
                            <span className="text-xs text-gray-400 ml-auto">{item.break_length} min</span>
                        </div>
                    ) : (
                        <div key={item.id ?? i} className="rounded border border-gray-200 bg-white px-3 py-2">
                            <div className="font-medium text-dark text-sm">{item.name}</div>
                            <div className="flex flex-col gap-0.5 mt-1">
                                {/* Groupset events are contested by teams, so they are listed
                                    by team here too — a competitor looking up when they run
                                    finds their team's slot. */}
                                {isGroupsetCategory(item.event_category)
                                    ? groupIntoTeams([...(item.competitor_list ?? [])].sort((a, b) => a.order - b.order)).map((team) => (
                                        <div
                                            key={team.id}
                                            className={`text-xs border rounded px-2 py-0.5 flex items-center gap-2 ${team.unassigned ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-100 bg-gray-50 text-gray-500"}`}
                                        >
                                            <span className="truncate">{team.name}</span>
                                            <span className="ml-auto shrink-0 opacity-60">
                                                {team.unassigned ? "No team" : team.members.length}
                                            </span>
                                        </div>
                                    ))
                                    : [...(item.competitor_list ?? [])].sort((a, b) => a.order - b.order).map((c) => (
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

// The order arrives from the server, which also gates to competitors. Bound to the shared
// `publicOrder` entry, which the event builder drops when an organizer saves or re-publishes —
// so a competitor with this page open gets the new running order on the next read.
export default function EventOrder({ order: initialOrder }: { order: OrderDTO }) {
    const order = useCachedResource(cacheKeys.publicOrder, fetchPublicOrder, initialOrder);

    // The key can be cleared and the refetch return null (the organizer un-published it
    // mid-session), so this handles an absent order rather than assuming the server's copy.
    if (!order) {
        return <div className="text-sm text-gray-400">The event order has not been published yet.</div>;
    }

    const hasThirdRing = order.ring3.length > 0;

    return (
        <div className="max-w-5xl mx-auto w-full px-[5%] py-8">
            <div className="text-2xl font-semibold text-primary mb-4">Event Order</div>
            <div className={`grid gap-4 ${hasThirdRing ? "grid-cols-3" : "grid-cols-2"}`}>
                <StaticRing label="Ring 1" items={order.ring1} />
                <StaticRing label="Ring 2" items={order.ring2} />
                {hasThirdRing && <StaticRing label="Ring 3" items={order.ring3} />}
            </div>
        </div>
    );
}
