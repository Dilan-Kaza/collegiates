import { MtHeader } from "@components";
import { getPublicOrder } from "@functions/actions";
import { requireCompetitor } from "@/lib/auth";
import EventOrder from "./EventOrder";

export default async function Page() {
    // Auth on the server so data ships with the page and unauthenticated visitors are redirected
    // before any markup renders. Competitor-only, matching getPublicOrder's own gate.
    await requireCompetitor();

    // getPublicOrder self-authorizes too: this year's published order, or null
    // when none is public yet.
    const order = await getPublicOrder();

    if (!order) {
        return <div className="text-sm text-gray-400">The event order has not been published yet.</div>;
    }

    // <EventOrder> binds the order to its cache entry, which is what seeds it.
    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <EventOrder order={order} />
        </>
    );
}
