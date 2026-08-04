"use client"

import { useEffect, useState } from "react";
import { MtHeader, LogoutButton } from "@components";
import { useNavigate } from "@/routerCompat";
import type { SettingsDTO, RegistrationDTO, GroupsetDTO, CompetitorDTO } from "@/lib/api";
// competitor dashboard

async function isEarlyRegistration(dateCreated: Date | string, settings: SettingsDTO): Promise<boolean> {
    return !!settings.early_reg_start
        && settings.early_reg_cost_first != null
        && new Date(dateCreated).getTime() < new Date(settings.reg_start).getTime();
}

interface CostSummary {
    total: number;
    count: number;
    earlyCount: number;
    hasGroupset: boolean;
}

async function computeTotalOwed(
    registrations: RegistrationDTO[] | undefined,
    settings: SettingsDTO,
    groupset: GroupsetDTO | undefined,
): Promise<CostSummary | null> {
    if (!registrations?.length || settings.reg_cost_first == null) return null;

    // Each registration's own create date decides which pricing tier (early vs standard) it falls under;
    // the earliest-created registration is billed as the "first event", every other as an "extra event".
    const sorted = [...registrations].sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());

    let total = 0;
    let earlyCount = 0;
    for (let i = 0; i < sorted.length; i++) {
        const early = await isEarlyRegistration(sorted[i].date_created, settings);
        if (early) earlyCount += 1;
        total += i === 0
            ? (early ? (settings.early_reg_cost_first ?? 0) : settings.reg_cost_first)
            : (early ? (settings.early_reg_cost_extra ?? 0) : settings.reg_cost_extra);
    }

    // A group set is billed as an extra event, priced by the tier its own create date falls under.
    if (groupset?.date_created) {
        const early = await isEarlyRegistration(groupset.date_created, settings);
        if (early) earlyCount += 1;
        total += early ? (settings.early_reg_cost_extra ?? 0) : settings.reg_cost_extra;
    }

    return { total, count: sorted.length, earlyCount, hasGroupset: !!groupset };
}

// First-load data (settings and the current user) is resolved on the server and
// passed in as props, so the dashboard renders fully populated with no client
// fetch or loading overlay. Whether the event order is published is read off
// settings (order_public) rather than passed separately.
export default function Dashboard ({
    settings = {},
    userinfo = {},
}: {
    settings?: Partial<SettingsDTO>;
    userinfo?: Partial<CompetitorDTO>;
}){

    const nav = useNavigate();

    // The group set now loads bundled with the current user (like registrations).
    const myTeam = userinfo.groupset ?? undefined;

    // The total-owed figure is derived by an async computation. `undefined` marks
    // it as still computing so the section can show a loading placeholder; once it
    // resolves, `null` means "nothing owed" and a CostSummary means show the total.
    const [cost, setCost] = useState<CostSummary | null | undefined>(undefined);
    useEffect(() => {
        let cancelled = false;
        setCost(undefined);
        computeTotalOwed(userinfo.registrations, settings as SettingsDTO, myTeam)
            .then((result) => { if (!cancelled) setCost(result); });
        return () => { cancelled = true; };
    }, [userinfo.registrations, settings, myTeam]);

    // Whether the event order is published lives on settings (order_public); the
    // dashboard only uses it to enable the "Event Order" link.
    const hasPublicOrder = settings.order_public ?? false;

    return (
        <>
            <div className="hidden md:block"><MtHeader/></div>
            <div
                id="bg-component"
                className="bg-gradient-to-b from-tertiary via-secondary via-100% to-primary h-[60vh] w-[80%] absolute top-20 left-[10%] -z-20 [clip-path:polygon(0%_0%,100%_0%,100%_100%,50%_88%,0%_100%)]"
            />
            <div className="bg-off-white grid grid-cols-[1fr_2fr] rounded-lg px-[5%] py-8 max-w-3xl mx-auto w-full">
                <div className="grid-row p-1">
                    <div className="flex flex-col gap-2">
                        <span className="text-4xl">{userinfo.first_name} {userinfo.last_name}</span>
                        <div className="flex gap-2">
                            <LogoutButton/>
                            <button className="btn btn-secondary btn-sm" onClick={() => nav('/dashboard/edit-profile-info')}>Edit Profile Info</button>
                        </div>
                    </div>
                    <div className="py-2 text-sm space-y-1">
                        <div>email: {userinfo.email}</div>
                        <div>gender: {userinfo.gender}</div>
                        <div>school: {userinfo.school_name}</div>
                        <div>student type: {userinfo.student_type}</div>
                        <div>skill level: {userinfo.skill_level}</div>
                    </div>
                    {/* The profile is only editable while there are no registrations
                        (gender/skill drive event eligibility), matching the server guard. */}
                    {(userinfo.registrations?.length ?? 0) === 0 && (
                        <button className="btn btn-secondary btn-sm mt-1" onClick={() => nav('/profile/setup')}>Edit Profile</button>
                    )}
                </div>
                <div className="p-1 content-center flex flex-col items-center gap-2 w-full">
                    {(userinfo.registrations?.length ?? 0) > 0 ? (
                        <div className="space-y-2 flex flex-col items-center w-full">
                            <div className="text-lg font-semibold mb-2">Registered Events</div>
                            {userinfo.registrations?.map((reg, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full text-center">
                                    <div className="font-medium">{reg.event_name}</div>
                                    {reg.nandu_str && <div className="text-gray-500">Nandu: {reg.nandu_str}</div>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <button className="btn btn-primary" onClick={() => nav('/register')}>Register</button>
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
                    ) : (
                        <button className="btn btn-secondary mt-2" onClick={() => nav('/groupset')}>Group Set</button>
                    )}
                </div>
                {cost === undefined ? (
                    <div className="col-span-2 cg-list-row mt-4 text-sm flex items-center justify-between animate-pulse">
                        <div>
                            <div className="font-semibold text-gray-300">Total Owed</div>
                            <div className="text-gray-300 text-xs">calculating…</div>
                        </div>
                        <div className="text-xl font-bold text-gray-300">$—</div>
                    </div>
                ) : cost ? (
                    <div className="col-span-2 cg-list-row mt-4 text-sm flex items-center justify-between">
                        <div>
                            <div className="font-semibold">Total Owed</div>
                            <div className="text-gray-500 text-xs">
                                {cost.count} event{cost.count > 1 ? "s" : ""} registered
                                {cost.hasGroupset && " + group set"}
                                {cost.earlyCount > 0 && ` (${cost.earlyCount} at early rate)`}
                            </div>
                        </div>
                        <div className="text-xl font-bold text-primary">${cost.total}</div>
                    </div>
                ) : null}
                <div className="col-span-2 flex justify-center pt-4">
                    {hasPublicOrder ? (
                        <button className="btn btn-secondary" onClick={() => nav('/event-order')}>Event Order</button>
                    ) : (
                        <button className="btn btn-secondary" disabled>Event Order Coming Soon</button>
                    )}
                </div>
            </div>
        </>
    )
}
