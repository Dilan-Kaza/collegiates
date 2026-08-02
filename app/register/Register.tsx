"use client";

import { MtHeader, EventSelection, RegistrationConfirm } from "@components";
import { useState } from "react";
import { useNavigate } from "@/routerCompat";
import { createRegistrations } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { clearSessionCache } from "@functions/sessionCache";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg, setSuccessMsg } from "@slices";
import type { SettingsDTO, EventDTO } from "@/lib/api";
import type { RegEventItem } from "@/types";
// event registration flow

// `catalogEvents` (what this competitor is eligible for) arrives from the server.
// Auth and the "already registered" redirect happen on the page before this.
export default function Register({
    settings = {},
    catalogEvents = [],
}: {
    settings?: Partial<SettingsDTO>;
    catalogEvents?: EventDTO[];
}) {

    const nav = useNavigate();
    const dispatch = useAppDispatch();

    const [events, setEvents] = useState<RegEventItem[]>([]);
    const [confirming, setConfirming] = useState(false);
    // Kept on the confirm screen so a rejected registration explains itself
    // there, instead of the Confirm button silently re-enabling.
    const [error, setError] = useState("");

    const isEarly = !!settings.early_reg_start
        && settings.early_reg_cost_first != null
        && new Date().getTime() < new Date(settings.reg_start ?? 0).getTime();
    const firstCost = isEarly ? settings.early_reg_cost_first : settings.reg_cost_first;
    const extraCost = isEarly ? settings.early_reg_cost_extra : settings.reg_cost_extra;
    const totalCost = events.length > 0 && firstCost != null
        ? firstCost + (extraCost ?? 0) * (events.length - 1)
        : null;

    // createRegistrations rejects a submission for reasons the competitor can act
    // on — registration closed, an event that doesn't match their gender/level,
    // already registered — so the message has to reach the confirm screen.
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
        clearSessionCache("currentUser");
        clearSessionCache("registrations");
        dispatch(setSuccessMsg("Registration complete"));
        nav("/dashboard");
    };

    return (
        <div>
            <div className="hidden sm:block"><MtHeader /></div>
            {confirming ? (
                <RegistrationConfirm
                    events={events}
                    catalogEvents={catalogEvents}
                    isEarly={isEarly}
                    firstCost={firstCost}
                    extraCost={extraCost}
                    totalCost={totalCost}
                    dueDate={settings.due_date}
                    onBack={() => { setError(""); setConfirming(false); }}
                    onConfirm={onConfirm}
                    error={error}
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
