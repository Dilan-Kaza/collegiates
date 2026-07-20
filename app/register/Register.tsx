"use client";

import { MtHeader, EventSelection, RegistrationConfirm } from "@components";
import { useEffect, useState } from "react";
import { fetchCurrentUser, useForwardSignIn } from "@functions";
import { useNavigate } from "@/routerCompat";
import { useSession } from "@functions/sessionContext";
import { createRegistrations } from "@functions/actions";
import { clearSessionCache } from "@functions/sessionCache";
import type { SettingsDTO, CompetitorDTO } from "@/lib/api";
import type { RegEventItem } from "@/types";
// event registration flow

export default function Register({ settings = {} }: { settings?: Partial<SettingsDTO> }) {

    const nav = useNavigate();
    const { status } = useSession();
    const [userinfo, setUserinfo] = useState<Partial<CompetitorDTO>>({});

    const [events, setEvents] = useState<RegEventItem[]>([]);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetchCurrentUser().then(setUserinfo);
    }, [status]);

    const isEarly = !!settings.early_reg_start
        && settings.early_reg_cost_first != null
        && new Date().getTime() < new Date(settings.reg_start ?? 0).getTime();
    const firstCost = isEarly ? settings.early_reg_cost_first : settings.reg_cost_first;
    const extraCost = isEarly ? settings.early_reg_cost_extra : settings.reg_cost_extra;
    const totalCost = events.length > 0 && firstCost != null
        ? firstCost + (extraCost ?? 0) * (events.length - 1)
        : null;

    const onConfirm = async () => {
        const { error } = await createRegistrations(events);
        if (!error) {
            clearSessionCache("currentUser");
            nav('/dashboard');
        }
    };

    useEffect(()=>{
        if(Object.keys(userinfo).length !== 0 && (userinfo.registrations?.length ?? 0) !== 0){
            nav('/dashboard');
        }
    },[userinfo]);

    useForwardSignIn();

    return (
        <div>
            <div className="hidden sm:block"><MtHeader/></div>
            {confirming ? (
                <RegistrationConfirm
                    events={events}
                    isEarly={isEarly}
                    firstCost={firstCost}
                    extraCost={extraCost}
                    totalCost={totalCost}
                    onBack={() => setConfirming(false)}
                    onConfirm={onConfirm}
                />
            ) : (
                <EventSelection
                    events={events}
                    setEvents={setEvents}
                    isEarly={isEarly}
                    firstCost={firstCost}
                    extraCost={extraCost}
                    onSubmit={() => setConfirming(true)}
                />
            )}
        </div>
    );
}
