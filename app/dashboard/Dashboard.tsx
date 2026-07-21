"use client"

import { fetchCurrentUser, useForwardSignIn, fetchEventOrder } from "@functions";
import { MtHeader, LogoutButton } from "@components";
import { useNavigate } from "@/routerCompat";
import { useSession } from "@functions/sessionContext";
import { useState, useEffect } from "react";
import type { SettingsDTO, RegistrationDTO, GroupsetDTO, CompetitorDTO } from "@/lib/api";
// competitor dashboard

function isEarlyRegistration(dateCreated: Date | string, settings: SettingsDTO): boolean {
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

function computeTotalOwed(
    registrations: RegistrationDTO[] | undefined,
    settings: SettingsDTO,
    groupset: GroupsetDTO | undefined,
): CostSummary | null {
    if (!registrations?.length || settings.reg_cost_first == null) return null;

    // Each registration's own create date decides which pricing tier (early vs standard) it falls under;
    // the earliest-created registration is billed as the "first event", every other as an "extra event".
    const sorted = [...registrations].sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());

    let total = 0;
    let earlyCount = 0;
    sorted.forEach((r, i) => {
        const early = isEarlyRegistration(r.date_created, settings);
        if (early) earlyCount += 1;
        total += i === 0
            ? (early ? (settings.early_reg_cost_first ?? 0) : settings.reg_cost_first)
            : (early ? (settings.early_reg_cost_extra ?? 0) : settings.reg_cost_extra);
    });

    // A group set is billed as an extra event, priced by the tier its own create date falls under.
    if (groupset?.date_created) {
        const early = isEarlyRegistration(groupset.date_created, settings);
        if (early) earlyCount += 1;
        total += early ? (settings.early_reg_cost_extra ?? 0) : settings.reg_cost_extra;
    }

    return { total, count: sorted.length, earlyCount, hasGroupset: !!groupset };
}

export default function Dashboard ({ settings = {} }: { settings?: Partial<SettingsDTO> }){


    const { status } = useSession();
    const nav = useNavigate();

    const [userinfo, setUserinfo] = useState<Partial<CompetitorDTO>>({});
    const [hasPublicOrder, setHasPublicOrder] = useState(false);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetchCurrentUser().then(setUserinfo);
        // getPublicOrder already filters to public: true, so a non-null result means a public order exists.
        fetchEventOrder().then((order) => setHasPublicOrder(!!order));
    }, [status]);

    // The group set now loads bundled with the current user (like registrations).
    const myTeam = userinfo.groupset ?? undefined;
    const cost = computeTotalOwed(userinfo.registrations, settings as SettingsDTO, myTeam);

    useForwardSignIn();

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
                        <LogoutButton/>
                    </div>
                    <div className="py-2 text-sm space-y-1">
                        <div>email: {userinfo.email}</div>
                        <div>gender: {userinfo.gender}</div>
                        <div>school: {userinfo.school_name}</div>
                        <div>student type: {userinfo.student_type}</div>
                        <div>first comp: {userinfo.first_comp}</div>
                        <div>skill level: {userinfo.skill_level}</div>
                    </div>
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
                {cost && (
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
                )}
                {hasPublicOrder && (
                    <div className="col-span-2 flex justify-center pt-4">
                        <button className="btn btn-secondary" onClick={() => nav('/event-order')}>Event Order</button>
                    </div>
                )}
            </div>
        </>
    )
}
