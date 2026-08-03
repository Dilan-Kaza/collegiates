"use client";

import { useMemo } from "react";
import { MtHeader, LogoutButton, AllAroundStatus } from "@components";
import { useNavigate } from "@/routerCompat";
import { useCachedResource, fetchMe, cacheKeys } from "@functions";
import type { SettingsDTO, RegistrationDTO, GroupsetDTO, CompetitorDTO } from "@/lib/api";
import { studentTypeLabel } from "@/lib/api";
// competitor dashboard

function isEarlyRegistration(dateCreated: Date | string, settings: SettingsDTO): boolean {
    return !!settings.early_reg_start
        && settings.early_reg_cost_base != null
        && new Date(dateCreated).getTime() < new Date(settings.reg_start).getTime();
}

// Registration opens at early_reg_start when an early window is configured,
// otherwise at reg_start — the same boundary regActive() uses on the server.
// Dates arrive JSON-serialized from the server component, so rebuild them.
function registrationStarted(settings: Partial<SettingsDTO>): boolean {
    const opens = settings.early_reg_start ?? settings.reg_start;
    if (!opens) return true;
    return new Date().getTime() >= new Date(opens).getTime();
}

interface CostSummary {
    total: number;
    count: number;
    earlyCount: number;
    hasGroupset: boolean;
}

// Pure and synchronous. This was `async` with an `await` per registration, run
// from an effect — which bought nothing but an extra render and a "calculating…"
// flash on every mount, since none of the work is actually asynchronous.
function computeTotalOwed(
    registrations: RegistrationDTO[] | undefined,
    settings: SettingsDTO,
    groupset: GroupsetDTO | undefined,
): CostSummary | null {
    if (!registrations?.length || settings.reg_cost_base == null) return null;

    // The team competition is entered by registering for the groupset event, so
    // that registration is what bills it. A team row only adds a charge of its
    // own when the registration is missing — otherwise both would be counted.
    const groupsetRegistered = registrations.some((reg) => reg.event_category === "G");

    // Everything that carries a per-event charge: each registration, plus a group
    // set with no groupset-event registration behind it.
    const billed: (Date | string)[] = registrations.map((reg) => reg.date_created);
    if (groupset?.date_created && !groupsetRegistered) billed.push(groupset.date_created);
    billed.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // The base fee is charged once, at the tier the earliest registration falls
    // under; each event is then charged on top, priced by its own create date.
    const baseEarly = isEarlyRegistration(billed[0], settings);
    let total = baseEarly ? (settings.early_reg_cost_base ?? 0) : settings.reg_cost_base;
    let earlyCount = 0;
    for (const dateCreated of billed) {
        const early = isEarlyRegistration(dateCreated, settings);
        if (early) earlyCount += 1;
        total += early ? (settings.early_reg_cost_event ?? 0) : settings.reg_cost_event;
    }

    // `count` is the individual events only; the team competition is reported
    // separately, so a groupset registration must not show up in both.
    return {
        total,
        count: registrations.filter((reg) => reg.event_category !== "G").length,
        earlyCount,
        hasGroupset: groupsetRegistered || !!groupset,
    };
}

// First-load data arrives as props from the server, so this renders populated
// with no client fetch. Publish state is read off settings.order_public.
export default function Dashboard ({
    settings = {},
    userinfo = null,
}: {
    settings?: Partial<SettingsDTO>;
    userinfo?: CompetitorDTO | null;
}){

    const nav = useNavigate();

    // Server data for first paint, then the cache entry — so the profile,
    // registrations and group set here re-read after a save on any other page
    // clears `currentUser`, instead of showing the old copy until a navigation.
    const me = useCachedResource(cacheKeys.currentUser, fetchMe, userinfo);

    // The group set now loads bundled with the current user (like registrations).
    const myTeam = me?.groupset ?? undefined;

    // The team competition is entered by registering for the groupset event, so
    // the join/create button only appears once that registration exists. An
    // existing team still shows below regardless.
    const inGroupsetEvent = (me?.registrations ?? []).some((reg) => reg.event_category === "G");

    // `null` = nothing owed, a CostSummary = show the total. Derived during
    // render, so the figure is on screen at first paint.
    const cost = useMemo(
        () => computeTotalOwed(me?.registrations, settings as SettingsDTO, myTeam),
        [me?.registrations, settings, myTeam],
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
            <div
                id="bg-component"
                className="bg-gradient-to-b from-tertiary via-secondary via-100% to-primary h-[60vh] w-[80%] absolute top-20 left-[10%] -z-20 [clip-path:polygon(0%_0%,100%_0%,100%_100%,50%_88%,0%_100%)]"
            />
            <div className="bg-off-white grid grid-cols-[1fr_2fr] rounded-lg px-[5%] py-8 max-w-3xl mx-auto w-full">
                <div className="grid-row p-1">
                    <div className="flex flex-col gap-2">
                        <span className="text-4xl">{me?.first_name} {me?.last_name}</span>
                        <LogoutButton />
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
                    {(me?.registrations?.length ?? 0) > 0 ? (
                        <div className="space-y-2 flex flex-col items-center w-full">
                            <div className="text-lg font-semibold mb-2">Registered Events</div>
                            {me?.registrations?.map((reg, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full text-center">
                                    <div className="font-medium">{reg.event_name}</div>
                                    {reg.nandu_str && <div className="text-gray-500">Nandu: {reg.nandu_str}</div>}
                                </div>
                            ))}
                        </div>
                    ) : regStarted ? (
                        // Registering starts at the profile, which is where gender, level
                        // and class — the things that decide event eligibility — get
                        // confirmed; saving it continues on to event selection. The button
                        // only shows with zero registrations, so /competitor/profile never
                        // bounces back here.
                        <button className="btn btn-primary" onClick={() => nav("/competitor/profile")}>Register</button>
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
                        <button className="btn btn-secondary mt-2" onClick={() => nav("/competitor/groupset")}>Join/Create Team</button>
                    ) : null}
                </div>
                {/* Scored over the events actually registered, so it reads as a
                    standing rather than the running count the picker shows. */}
                <AllAroundStatus
                    events={me?.registrations ?? []}
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
                        <button className="btn btn-secondary" onClick={() => nav("/event-order")}>Event Order</button>
                    ) : (
                        <button className="btn btn-secondary" disabled>Event Order Coming Soon</button>
                    )}
                </div>
            </div>
        </>
    )
}
