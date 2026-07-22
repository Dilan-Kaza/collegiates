"use client";

import { MtHeader, EventSelection, RegistrationConfirm } from "@components";
import { useState } from "react";
import { useNavigate } from "@/routerCompat";
import { createRegistrations } from "@functions/actions";
import { clearSessionCache } from "@functions/sessionCache";
import type { SettingsDTO, EventDTO } from "@/lib/api";
import type { RegEventItem } from "@/types";
// event registration flow

// `catalogEvents` (the events this competitor is eligible for) is resolved on
// the server and passed in, so the selection/confirm steps render without a
// client fetch. Auth and the "already registered" redirect are handled by the
// server page before this renders.
export default function Register({
    settings = {},
    catalogEvents = [],
}: {
    settings?: Partial<SettingsDTO>;
    catalogEvents?: EventDTO[];
}) {

    const nav = useNavigate();

    const [events, setEvents] = useState<RegEventItem[]>([]);
    const [confirming, setConfirming] = useState(false);

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

    return (
        <div>
            <div className="hidden sm:block"><MtHeader/></div>
            {confirming ? (
                <RegistrationConfirm
                    events={events}
                    catalogEvents={catalogEvents}
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
                    catalogEvents={catalogEvents}
                    isEarly={isEarly}
                    firstCost={firstCost}
                    extraCost={extraCost}
                    onSubmit={() => setConfirming(true)}
                />
            )}
        </div>
    );
}
