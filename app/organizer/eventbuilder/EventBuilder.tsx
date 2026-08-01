"use client";

import { MtHeader } from "@components";
import { useState } from "react";
import { BuildView, SheetView, StillView } from "@components/event-builder";
import type { OrderData } from "@components/event-builder";
import type { OrganizerRegistrationDTO } from "@/lib/api";
// organizer event builder tabs

// Registrations and the saved order arrive from the server; this owns the tab UI.
// SheetView still loads its sheet on demand — a user action, not a first load.
export default function EventBuilder({
    registrations = [],
    order = null,
    orderPublic = false,
}: {
    registrations?: OrganizerRegistrationDTO[];
    order?: OrderData | null;
    orderPublic?: boolean;
}) {
    const [tab, setTab] = useState("build");

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="text-3xl text-secondary font-semibold">Event Builder</div>
                    <div className="flex gap-2 ml-auto">
                        <button className={`btn btn-sm ${tab === "view" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("view")}>View</button>
                        <button className={`btn btn-sm ${tab === "build" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("build")}>Build</button>
                        <button className={`btn btn-sm ${tab === "sheet" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("sheet")}>Sheet</button>
                    </div>
                </div>
                {tab === "view" && <StillView order={order} />}
                {tab === "build" && <BuildView rawRegistrations={registrations} initialOrder={order} orderPublic={orderPublic} />}
                {tab === "sheet" && <SheetView />}
            </div>
        </>
    );
}
