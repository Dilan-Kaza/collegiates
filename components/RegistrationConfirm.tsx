"use client";

import type { MouseEventHandler } from "react";
import { useState } from "react";
import type { RegEventItem } from "@/types";
import type { EventDTO } from "@/lib/api";

interface RegistrationConfirmProps {
  events: RegEventItem[];
  // The event catalogue, resolved on the server and passed in (was fetched on
  // mount here).
  catalogEvents?: EventDTO[];
  isEarly?: boolean;
  firstCost?: number | null;
  extraCost?: number | null;
  totalCost?: number | null;
  onBack?: MouseEventHandler<HTMLButtonElement>;
  onConfirm?: () => void | Promise<void>;
  error?: string;
}

export default function RegistrationConfirm({ events, catalogEvents = [], isEarly, firstCost, extraCost, totalCost, onBack, onConfirm, error }: RegistrationConfirmProps) {
    const eventsFromApi = catalogEvents;
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await onConfirm?.();
        } finally {
            setSubmitting(false);
        }
    };

    const getEventName = (eventCode: string) => eventsFromApi.find(e => e.event_code === eventCode)?.event_name;

    return (
        <div className="bg-primary rounded-lg mx-[10%] px-[5%] py-5">
            <div className="text-4xl text-off-white py-10">Confirm Registration</div>
            <div className="flex flex-col gap-3 mb-6">
                {events.map(event => (
                    <div key={event.event_code} className="bg-off-white rounded-lg px-4 py-3 border-l-4 border-secondary">
                        <div className="font-medium text-primary">{getEventName(event.event_code)}</div>
                        {event.nandu_str && (
                            <div className="text-sm text-secondary">Nandu Code: {event.nandu_str}</div>
                        )}
                    </div>
                ))}
            </div>
            {totalCost != null && (
                <div className="flex justify-between items-center bg-off-white rounded-lg px-4 py-3 mb-6">
                    <div>
                        <div className="font-medium text-primary">Total Price</div>
                        <div className="text-xs text-secondary">
                            {isEarly ? "Early registration rate" : "Standard registration rate"} — ${firstCost} first event
                            {events.length > 1 && `, $${extraCost} each additional event (${events.length - 1})`}
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">${totalCost}</div>
                </div>
            )}
            {error && <div className="text-red-300 mb-4">{error}</div>}
            <div className="flex justify-between">
                <button className="btn btn-ghost text-off-white" onClick={onBack} disabled={submitting}>Back</button>
                <button className="btn btn-secondary" onClick={handleConfirm} disabled={submitting}>
                    {submitting && <span className="loading loading-spinner loading-sm" />}
                    Submit
                </button>
            </div>
        </div>
    );
}
