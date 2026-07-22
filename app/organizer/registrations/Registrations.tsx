"use client";

import { MtHeader, OrganizerRegistrationList, OrganizerRegistrationByEvent, OrganizerRegistrationEdit } from "@components";
import { useNavigate } from "@/routerCompat";
import { useState } from "react";
import type { OrganizerRegistrationDTO, EventDTO } from "@/lib/api";

// The registration list and full event catalogue are resolved on the server and
// passed in; this client component only owns the view-switching UI.
export default function Registrations({
    registrations = [],
    allEvents = [],
}: {
    registrations?: OrganizerRegistrationDTO[];
    allEvents?: EventDTO[];
}) {

    const nav = useNavigate();
    const [view, setView] = useState("athlete");

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button className="btn btn-ghost btn-sm" onClick={() => nav("/organizer")}>← Back</button>
                    <div className="text-3xl text-secondary font-semibold">Registrations</div>
                </div>
                <div className="flex gap-2">
                    <button
                        className={`btn btn-sm ${view === "athlete" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setView("athlete")}
                    >
                        By Athlete
                    </button>
                    <button
                        className={`btn btn-sm ${view === "event" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setView("event")}
                    >
                        By Event
                    </button>
                    <button
                        className={`btn btn-sm ${view === "edit" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setView("edit")}
                    >
                        Create / Edit
                    </button>
                </div>
                <div className="cg-card">
                    {view === "athlete" && <OrganizerRegistrationList registrations={registrations} />}
                    {view === "event" && <OrganizerRegistrationByEvent registrations={registrations} />}
                    {view === "edit" && <OrganizerRegistrationEdit allEvents={allEvents} />}
                </div>
            </div>
        </>
    );
}
