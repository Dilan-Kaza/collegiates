"use client";

import { MtHeader, EventSelection, RegistrationConfirm } from "@components";
import { useState } from "react";
import { useNavigate } from "@/routerCompat";
import { createRegistrations } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { useCachedResource, fetchCompetitorEvents, fetchMe, fetchSettings, cacheKeys } from "@functions";
import { clearSessionCache } from "@functions/sessionCache";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg, setSuccessMsg } from "@slices";
import type { SettingsDTO, EventDTO, CompetitorDTO } from "@/lib/api";
import type { RegEventItem } from "@/types";
// event registration flow

// `catalogEvents` (what this competitor is eligible for) arrives from the server.
// Auth and the "already registered" redirect happen on the page before this.
export default function Register({
    settings: initialSettings = {},
    catalogEvents = [],
    userinfo = null,
}: {
    settings?: Partial<SettingsDTO>;
    catalogEvents?: EventDTO[];
    userinfo?: CompetitorDTO | null;
}) {

    const nav = useNavigate();
    const dispatch = useAppDispatch();

    // The fee schedule this flow prices against — bound like the two below, so an
    // organizer's mid-session change to the cost fields is picked up.
    const settings = useCachedResource(cacheKeys.settings, fetchSettings, initialSettings);

    // Class and skill level decide whether an All-Around title is in reach, so both steps below
    // need the profile. Cache-bound like the catalogue: /competitor/profile clears it on save.
    const me = useCachedResource(cacheKeys.currentUser, fetchMe, userinfo);

    // Eligibility depends on the gender and skill level saved in the profile, so
    // /competitor/profile clears this key on save rather than leaving the catalogue stale.
    const events_catalog = useCachedResource(
        cacheKeys.competitorEvents,
        fetchCompetitorEvents,
        catalogEvents,
    );

    const [events, setEvents] = useState<RegEventItem[]>([]);
    const [confirming, setConfirming] = useState(false);
    // Kept on the confirm screen so a rejected registration explains itself
    // there, instead of the Confirm button silently re-enabling.
    const [error, setError] = useState("");

    const isEarly = !!settings.early_reg_start
        && settings.early_reg_cost_base != null
        && new Date().getTime() < new Date(settings.reg_start ?? 0).getTime();
    const baseCost = isEarly ? settings.early_reg_cost_base : settings.reg_cost_base;
    const eventCost = isEarly ? settings.early_reg_cost_event : settings.reg_cost_event;
    // The base fee is charged once, on top of a fee for every event entered.
    const totalCost = events.length > 0 && baseCost != null
        ? baseCost + (eventCost ?? 0) * events.length
        : null;

    // createRegistrations rejects for reasons the competitor can act on — closed registration, a
    // gender/level mismatch, already registered — so the message must reach the confirm screen.
    const onConfirm = async () => {
        setError("");
        const fallback = "Could not complete your registration.";
        const { error: fieldErrors } = await runAction(
            () => createRegistrations(events),
            fallback,
        );
        if (fieldErrors) {
            const message = errorMessage(fieldErrors, fallback);
            setError(message);
            dispatch(setErrorMsg(message));
            return;
        }
        clearSessionCache(cacheKeys.currentUser);
        clearSessionCache(cacheKeys.registrations);
        dispatch(setSuccessMsg("Registration complete"));
        nav("/competitor");
    };

    return (
        <div>
            <div className="hidden sm:block"><MtHeader /></div>
            {confirming ? (
                <RegistrationConfirm
                    events={events}
                    catalogEvents={events_catalog}
                    isEarly={isEarly}
                    baseCost={baseCost}
                    eventCost={eventCost}
                    totalCost={totalCost}
                    studentType={me?.student_type}
                    skillLevel={me?.skill_level}
                    dueDate={settings.due_date}
                    onBack={() => { setError(""); setConfirming(false); }}
                    onConfirm={onConfirm}
                    error={error}
                />
            ) : (
                <EventSelection
                    events={events}
                    setEvents={setEvents}
                    catalogEvents={events_catalog}
                    isEarly={isEarly}
                    baseCost={baseCost}
                    eventCost={eventCost}
                    studentType={me?.student_type}
                    skillLevel={me?.skill_level}
                    // Back goes to the profile, the step before this one. Safe to return to: it only bounces to
                    // the dashboard once registrations exist, and reaching this page means there are none.
                    onBack={() => nav("/competitor/profile")}
                    // The profile is already saved by the time this page loads, so leaving without
                    // picking events loses nothing — the dashboard links back in to register later.
                    onExit={() => nav("/competitor")}
                    onSubmit={() => setConfirming(true)}
                />
            )}
        </div>
    );
}
