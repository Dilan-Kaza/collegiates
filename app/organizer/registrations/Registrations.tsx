"use client";

import {
    MtHeader,
    OrganizerRegistrationList,
    OrganizerRegistrationByEvent,
    OrganizerRegistrationEdit,
    OrganizerPayments,
} from "@components";
import { Link } from "@/routerCompat";
import { useState } from "react";
import {
    useCachedResource,
    cacheKeys,
    fetchColleges,
    fetchSettings,
    fetchOrganizerRegistrations,
    fetchOrganizerEvents,
} from "@functions";
import type { OrganizerRegistrationDTO, EventDTO, SettingsDTO } from "@/lib/api";

// The registration list and event catalogue are resolved on the server; this component owns
// only the view-switching UI. `settings` carries the fee schedule Payments prices against.
export default function Registrations({
    registrations: initialRegistrations = [],
    allEvents: initialEvents = [],
    colleges: initialColleges = {},
    settings: initialSettings = {},
}: {
    registrations?: OrganizerRegistrationDTO[];
    allEvents?: EventDTO[];
    colleges?: Record<string, string>;
    settings?: Partial<SettingsDTO>;
}) {

    // The Create/Edit tab below saves through OrganizerRegistrationEdit, which drops this key —
    // so switching back to a list tab shows the edit, not this page's render-time copy.
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
    // The school dropdown in the edit view and the fee schedule Payments prices
    // against, on the same shared entries every other screen reads them from.
    const colleges = useCachedResource(cacheKeys.colleges, fetchColleges, initialColleges);
    const settings = useCachedResource(cacheKeys.settings, fetchSettings, initialSettings);
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
                    <Link to="/organizer" className="btn btn-ghost btn-sm">← Back</Link>
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
                        className={`btn btn-sm ${view === "payments" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setView("payments")}
                    >
                        Payments
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
                    {view === "payments" && <OrganizerPayments registrations={registrations} settings={settings} />}
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
