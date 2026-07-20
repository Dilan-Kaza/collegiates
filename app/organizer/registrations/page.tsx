"use client";

import { MtHeader, OrganizerRegistrationList, OrganizerRegistrationByEvent } from "@components";
import { useNavigate } from "@/routerCompat";
import { useForwardIfNotOrganizer } from "@functions";
import { useState } from "react";

export default function OrganizerRegistrations() {

    useForwardIfNotOrganizer();
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
                </div>
                <div className="bg-off-white rounded-lg px-6 py-5 flex flex-col gap-4">
                    {view === "athlete" ? <OrganizerRegistrationList /> : <OrganizerRegistrationByEvent />}
                </div>
            </div>
        </>
    );
}
