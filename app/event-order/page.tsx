import { MtHeader } from "@components";
import { getPublicOrder } from "@functions/actions";
import { getCurrentUser } from "@/lib/auth";
import type { EventOrderDTO } from "@/lib/api";
import { redirect } from "next/navigation";
import CacheSeed from "@functions/CacheSeed";
import { cacheKeys } from "@functions/cacheKeys";

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
                                {[...(item.competitor_list ?? [])].sort((a, b) => a.order - b.order).map((c) => (
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

export default async function EventOrder() {
    // Resolve auth on the server so the data ships with the page — no client
    // fetch and no loading flash. Unauthenticated users are redirected before
    // any markup renders, mirroring the old useForwardSignIn behaviour.
    const user = await getCurrentUser();
    if (!user) redirect("/signin");

    // getPublicOrder self-authorizes: returns the published order for the
    // current year, or null when none is public yet (or the viewer isn't a
    // competitor).
    const order = await getPublicOrder();

    if (!order) {
        return <div className="text-sm text-gray-400">The event order has not been published yet.</div>;
    }

    const hasThirdRing = order.ring3.length > 0;

    return (
        <>
            <CacheSeed entries={{ [cacheKeys.publicOrder]: order }} />
            <div className="hidden md:block"><MtHeader/></div>
            <div className="max-w-5xl mx-auto w-full px-[5%] py-8">
                <div className="text-2xl font-semibold text-primary mb-4">Event Order</div>
                <div className={`grid gap-4 ${hasThirdRing ? "grid-cols-3" : "grid-cols-2"}`}>
                    <StaticRing label="Ring 1" items={order.ring1} />
                    <StaticRing label="Ring 2" items={order.ring2} />
                    {hasThirdRing && <StaticRing label="Ring 3" items={order.ring3} />}
                </div>
            </div>
        </>
    );
}
