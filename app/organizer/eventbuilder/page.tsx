"use client";

import { MtHeader } from "@components";
import { useForwardIfNotOrganizer } from "@functions";
import { useState } from "react";
import { BuildView, SheetView, StillView } from "@components/event-builder";
// organizer event builder tabs

export default function EventBuilder() {
    useForwardIfNotOrganizer();
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
                {tab === "view" && <StillView />}
                {tab === "build" && <BuildView />}
                {tab === "sheet" && <SheetView />}
            </div>
        </>
    );
}
