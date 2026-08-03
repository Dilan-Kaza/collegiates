"use client";

import { MtHeader, OrganizerRegistrationList, OrganizerRegistrationByEvent, OrganizerRegistrationEdit } from "@components";
import { useNavigate } from "@/routerCompat";
import { useState } from "react";
import {
    useCachedResource,
    cacheKeys,
    fetchOrganizerRegistrations,
    fetchOrganizerEvents,
} from "@functions";
import type { OrganizerRegistrationDTO, EventDTO } from "@/lib/api";

// The registration list and full event catalogue are resolved on the server and
// passed in; this client component only owns the view-switching UI.
export default function Registrations({
    registrations: initialRegistrations = [],
    allEvents: initialEvents = [],
    colleges = {},
}: {
    registrations?: OrganizerRegistrationDTO[];
    allEvents?: EventDTO[];
    colleges?: Record<string, string>;
}) {

    const nav = useNavigate();

    // The Create/Edit tab below saves through OrganizerRegistrationEdit, which
    // drops this key — so switching back to a list tab shows the edit rather
    // than the copy this page was rendered with.
    const registrations = useCachedResource(
        cacheKeys.organizerRegistrations,
        fetchOrganizerRegistrations,
        initialRegistrations,
    );
    const allEvents = useCachedResource(
        cacheKeys.organizerEvents,
        fetchOrganizerEvents,
        initialEvents,
    );
    const [view, setView] = useState("athlete");
    // Athlete handed off from the By Athlete list so the edit view opens
    // pre-loaded; null when the organizer opens Create / Edit fresh.
    const [editAthlete, setEditAthlete] = useState<OrganizerRegistrationDTO | null>(null);

    const openEdit = (athlete: OrganizerRegistrationDTO) => {
        setEditAthlete(athlete);
        setView("edit");
    };

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
                        onClick={() => { setEditAthlete(null); setView("edit"); }}
                    >
                        Create / Edit
                    </button>
                </div>
                <div className="cg-card">
                    {view === "athlete" && <OrganizerRegistrationList registrations={registrations} onEdit={openEdit} />}
                    {view === "event" && <OrganizerRegistrationByEvent registrations={registrations} />}
                    {view === "edit" && (
                        <OrganizerRegistrationEdit
                            key={editAthlete?.user_id ?? "new"}
                            allEvents={allEvents}
                            colleges={colleges}
                            initialAthlete={editAthlete}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
