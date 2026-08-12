"use client";

import { useMemo } from "react";
import { MtHeader, LogoutButton, AllAroundStatus } from "@components";
import { Link } from "@/routerCompat";
import { useCachedResource, fetchMe, fetchSettings, fetchRegistrations, cacheKeys } from "@functions";
import type { SettingsDTO, CompetitorDTO } from "@/lib/api";
import { studentTypeLabel } from "@/lib/api";
// Pricing lives in lib/fees so the organizer payments screen bills identically.
import { computeTotalOwed } from "@/lib/fees";
// competitor dashboard

// Registration opens at early_reg_start when configured, else reg_start — the same
// boundary regActive() uses server-side. Dates arrive JSON-serialized, so rebuild them.
function registrationStarted(settings: Partial<SettingsDTO>): boolean {
    const opens = settings.early_reg_start ?? settings.reg_start;
    if (!opens) return true;
    return new Date().getTime() >= new Date(opens).getTime();
}

// First-load data arrives as props from the server, so this renders populated
// with no client fetch. Publish state is read off settings.order_public.
export default function Dashboard ({
    settings: initialSettings = {},
    userinfo = null,
}: {
    settings?: Partial<SettingsDTO>;
    userinfo?: CompetitorDTO | null;
}){

    // Server data for first paint, then the cache entry — so a save on another page that
    // clears `currentUser` is re-read here instead of showing a stale copy.
    const me = useCachedResource(cacheKeys.currentUser, fetchMe, userinfo);

    // Same binding for the fee schedule: an organizer editing settings in another tab drops
    // this key, and the "Total Owed" figure below re-prices rather than staying stale.
    const settings = useCachedResource(cacheKeys.settings, fetchSettings, initialSettings);

    // The registered-event list has its own entry as well as travelling inside `currentUser`.
    // Both are dropped together on every path that changes them (see Register.tsx), so this
    // reads the dedicated key and `me` is left to the profile fields.
    const registrations = useCachedResource(
        cacheKeys.registrations,
        fetchRegistrations,
        userinfo?.registrations ?? [],
    );

    // The group set loads bundled with the current user.
    const myTeam = me?.groupset ?? undefined;

    // The team competition is entered by registering for the groupset event, so join/create
    // only appears once that registration exists. An existing team still shows regardless.
    const inGroupsetEvent = registrations.some((reg) => reg.event_category === "G");

    // `null` = nothing owed, a CostSummary = show the total. Derived during
    // render, so the figure is on screen at first paint.
    const cost = useMemo(
        () => computeTotalOwed(registrations, settings as SettingsDTO, myTeam?.date_created),
        [registrations, settings, myTeam?.date_created],
    );

    // Whether the event order is published lives on settings (order_public); the
    // dashboard only uses it to enable the "Event Order" link.
    const hasPublicOrder = settings.order_public ?? false;

    // Before the registration window opens there is nowhere for /register to go,
    // so the button is replaced rather than just disabled.
    const regStarted = registrationStarted(settings);

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="bg-off-white grid grid-cols-[1fr_2fr] rounded-lg px-[5%] py-8 max-w-3xl mx-auto w-full">
                <div className="grid-row p-1">
                    <div className="flex flex-col gap-2">
                        <span className="text-4xl">{me?.first_name} {me?.last_name}</span>
                        <div className="flex gap-2">
                            <LogoutButton />
                            <Link to="/edit-profile-info" className="btn btn-secondary btn-sm">Edit Profile Info</Link>
                        </div>
                    </div>
                    <div className="py-2 text-sm space-y-1">
                        <div>email: {me?.email}</div>
                        <div>gender: {me?.gender}</div>
                        <div>school: {me?.school_name}</div>
                        <div>student type: {studentTypeLabel(me?.student_type)}</div>
                        <div>skill level: {me?.skill_level}</div>
                    </div>
                </div>
                <div className="p-1 content-center flex flex-col items-center gap-2 w-full">
                    {registrations.length > 0 ? (
                        <div className="space-y-2 flex flex-col items-center w-full">
                            <div className="text-lg font-semibold mb-2">Registered Events</div>
                            {registrations.map((reg, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full text-center">
                                    <div className="font-medium">{reg.event_name}</div>
                                    {reg.nandu_str && <div className="text-gray-500">Nandu: {reg.nandu_str}</div>}
                                </div>
                            ))}
                        </div>
                    ) : regStarted ? (
                        // Registering starts at the profile, where gender, level and class — which decide event
                        // eligibility — are confirmed; saving continues on to event selection.
                        <Link to="/competitor/profile" className="btn btn-primary">Register</Link>
                    ) : (
                        <button className="btn btn-primary" disabled>Registration is not open</button>
                    )}
                    {myTeam ? (
                        <div className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full text-center mt-2">
                            <div className="cg-eyebrow-muted">Group Set</div>
                            <div className="font-medium">{myTeam.team_name}</div>
                            {myTeam.school && <div className="text-gray-400 text-xs">{myTeam.school}</div>}
                            {myTeam.members.length > 0 && (
                                <div className="text-gray-500 text-xs mt-1">{myTeam.members.join(", ")}</div>
                            )}
                        </div>
                    ) : inGroupsetEvent ? (
                        <Link to="/competitor/groupset" className="btn btn-secondary mt-2">Join/Create Team</Link>
                    ) : null}
                </div>
                {/* Scored over the events actually registered, so it reads as a
                    standing rather than the running count the picker shows. */}
                <AllAroundStatus
                    events={registrations}
                    studentType={me?.student_type}
                    skillLevel={me?.skill_level}
                    className="col-span-2 cg-list-row mt-4"
                />
                {cost ? (
                    <div className="col-span-2 cg-list-row mt-4 text-sm flex items-center justify-between">
                        <div>
                            <div className="font-semibold">Total Owed</div>
                            {/* Either part can be absent — a competitor can be in the
                                team competition alone — so the two are joined rather
                                than one being suffixed onto the other. */}
                            <div className="text-gray-500 text-xs">
                                {[
                                    cost.count > 0 && `${cost.count} event${cost.count > 1 ? "s" : ""} registered`,
                                    cost.hasGroupset && "group set",
                                ].filter(Boolean).join(" + ")}
                                {cost.earlyCount > 0 && ` (${cost.earlyCount} at early rate)`}
                            </div>
                        </div>
                        <div className="text-xl font-bold text-primary">${cost.total}</div>
                    </div>
                ) : null}
                <div className="col-span-2 flex justify-center pt-4">
                    {hasPublicOrder ? (
                        <Link to="/event-order" className="btn btn-secondary">Event Order</Link>
                    ) : (
                        <button className="btn btn-secondary" disabled>Event Order Coming Soon</button>
                    )}
                </div>
            </div>
        </>
    )
}
