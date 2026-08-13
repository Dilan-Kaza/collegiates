"use client";

import { useMemo } from "react";
import { MtHeader, LogoutButton, AllAroundStatus } from "@components";
import { Link } from "@/routerCompat";
import { useCachedResource, fetchMe, fetchSettings, fetchRegistrations, cacheKeys } from "@functions";
import type { SettingsDTO, CompetitorDTO } from "@/lib/api";
import { studentTypeLabel, genderLabel, skillLevelLabel } from "@/lib/api";
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

    // Registrations have their own entry as well as travelling inside `currentUser`.
    // Both drop together, so this reads the dedicated key and `me` covers the profile.
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
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-4">
                {/* Same translucent surface as the cards below, but shorter and laid
                    out in a row, so it reads as a heading rather than another card. */}
                <div className="cg-card-glass flex-row justify-between items-center gap-2 py-4">
                    <span className="text-4xl">{me?.first_name} {me?.last_name}</span>
                    <div className="flex items-center gap-2">
                        {/* Credentials, not competition details, so they sit with logout
                            here. Icon-only, so the label carries the accessible name. */}
                        <Link
                            to="/edit-profile-info"
                            className="btn btn-square text-base"
                            aria-label="Account settings — change email or password"
                            title="Change email or password"
                        >
                            <i className="bi bi-gear" aria-hidden="true"></i>
                        </Link>
                        <LogoutButton />
                    </div>
                </div>
                {/* Side by side from `md` up, stacked below. `items-start` keeps each
                    card at its own height rather than matching the taller neighbour. */}
                <div className="grid gap-4 md:grid-cols-[1fr_2fr] md:items-start">
                    <div className="cg-card-glass gap-2">
                        <div className="flex items-center gap-2">
                            <div className="cg-eyebrow">Competitor Info</div>
                            {/* Edits the competition profile — gender, school, class, level.
                                Icon-only, so the label carries the accessible name. */}
                            <Link
                                to="/competitor/profile"
                                className="text-sm text-gray-500 hover:text-primary"
                                aria-label="Edit competitor info"
                                title="Edit competitor info"
                            >
                                <i className="bi bi-pencil-square" aria-hidden="true"></i>
                            </Link>
                        </div>
                        {/* The DTO carries the legacy codes ("M", "B"), so each value is
                            expanded through its label helper rather than shown raw. */}
                        <div className="text-sm space-y-1">
                            <div>Gender: {genderLabel(me?.gender)}</div>
                            <div>School: {me?.school_name}</div>
                            <div>Student type: {studentTypeLabel(me?.student_type)}</div>
                            <div>Skill level: {skillLevelLabel(me?.skill_level)}</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="cg-card-glass gap-2 items-center">
                            {/* Outside the branch so the card is labelled before there is
                                anything registered — where it holds the Register button. */}
                            <div className="cg-eyebrow self-start">
                                {registrations.length > 0 ? "Registered Events" : "Registration"}
                            </div>
                            {registrations.length > 0 ? (
                                registrations.map((reg, i) => (
                                    <div key={i} className="cg-list-row py-2 text-sm w-full text-center">
                                        <div className="font-medium">{reg.event_name}</div>
                                        {reg.nandu_str && <div className="text-gray-500">Nandu: {reg.nandu_str}</div>}
                                    </div>
                                ))
                            ) : regStarted ? (
                                // Registering starts at the profile, where gender, level and class — which decide event
                                // eligibility — are confirmed; saving continues on to event selection.
                                <Link to="/competitor/profile" className="btn btn-primary">Register</Link>
                            ) : (
                                <button className="btn btn-primary" disabled>Registration is not open</button>
                            )}
                        </div>
                        {myTeam ? (
                            <div className="cg-card-glass gap-1 text-sm text-center">
                                <div className="cg-eyebrow-muted">Group Set</div>
                                <div className="font-medium">{myTeam.team_name}</div>
                                {myTeam.school && <div className="text-gray-400 text-xs">{myTeam.school}</div>}
                                {myTeam.members.length > 0 && (
                                    <div className="text-gray-500 text-xs">{myTeam.members.join(", ")}</div>
                                )}
                            </div>
                        ) : inGroupsetEvent ? (
                            <div className="cg-card-glass items-center">
                                <Link to="/competitor/groupset" className="btn btn-secondary">Join/Create Team</Link>
                            </div>
                        ) : null}
                    </div>
                </div>
                {/* Scored over registered events, so it reads as a standing rather than
                    the picker's running count. `gap-0`: its sections carry own margins. */}
                <AllAroundStatus
                    events={registrations}
                    studentType={me?.student_type}
                    skillLevel={me?.skill_level}
                    className="cg-card-glass gap-0"
                />
                {cost ? (
                    <div className="cg-card-glass flex-row items-center justify-between text-sm">
                        <div>
                            <div className="font-semibold">Total Owed</div>
                            {/* Either part can be absent — a competitor may enter the
                                team event alone — so the two are joined, not suffixed. */}
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
                <div className="flex justify-center pt-2">
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
