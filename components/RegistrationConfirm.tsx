"use client";

import type { MouseEventHandler } from "react";
import { useState } from "react";
import { formatSettingsDate } from "@/lib/dates";
import type { RegEventItem } from "@/types";
import type { EventDTO } from "@/lib/api";
import AllAroundStatus from "./AllAroundStatus";

interface RegistrationConfirmProps {
  events: RegEventItem[];
  // The event catalogue, resolved on the server and passed in (was fetched on
  // mount here).
  catalogEvents?: EventDTO[];
  isEarly?: boolean;
  baseCost?: number | null;
  eventCost?: number | null;
  totalCost?: number | null;
  // Profile fields the All-Around readout is gated on, so what
  // is being confirmed states the title this registration qualifies for.
  studentType?: string | null;
  skillLevel?: string | null;
  // Payment + proof-of-enrollment deadline, shown in the agreement text.
  dueDate?: Date | null;
  onBack?: MouseEventHandler<HTMLButtonElement>;
  onConfirm?: () => void | Promise<void>;
  // Why the last confirm was rejected, shown above the buttons. The competitor
  // stays on this screen when it is set, so the message has to be visible here.
  error?: string;
}

export default function RegistrationConfirm({ events, catalogEvents = [], isEarly, baseCost, eventCost, totalCost, studentType, skillLevel, dueDate, onBack, onConfirm, error }: RegistrationConfirmProps) {
    const eventsFromApi = catalogEvents;
    const [submitting, setSubmitting] = useState(false);
    const [agreePayment, setAgreePayment] = useState(false);
    const [agreeEnrollment, setAgreeEnrollment] = useState(false);

    // Shown on the competition's clock (Pacific), like every other settings date.
    const dueDateStr = formatSettingsDate("due_date", dueDate, undefined, "the posted deadline");

    const handleConfirm = async () => {
        if (submitting || !agreePayment || !agreeEnrollment) return;
        setSubmitting(true);
        try {
            await onConfirm?.();
        } finally {
            setSubmitting(false);
        }
    };

    const getEventName = (eventCode: string) => eventsFromApi.find(e => e.event_code === eventCode)?.event_name;

    // Resolved back to catalogue entries, which is what All-Around progress is
    // scored over.
    const selectedEvents = events
        .map(event => eventsFromApi.find(e => e.event_code === event.event_code))
        .filter((e): e is EventDTO => e !== undefined);

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
            <AllAroundStatus
                events={selectedEvents}
                studentType={studentType}
                skillLevel={skillLevel}
                className="bg-off-white rounded-lg px-4 py-3 mb-6"
            />
            {totalCost != null && (
                <div className="flex justify-between items-center bg-off-white rounded-lg px-4 py-3 mb-6">
                    <div>
                        <div className="font-medium text-primary">Total Price</div>
                        <div className="text-xs text-secondary">
                            {isEarly ? "Early registration rate" : "Standard registration rate"} — ${baseCost} base
                            {events.length > 0 && `, $${eventCost} each event (${events.length})`}
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">${totalCost}</div>
                </div>
            )}
            <div className="flex flex-col gap-3 mb-6">
                <label className="flex items-start gap-3 bg-off-white rounded-lg px-4 py-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm mt-0.5"
                        checked={agreePayment}
                        onChange={(e) => setAgreePayment(e.target.checked)}
                        disabled={submitting}
                    />
                    <span className="text-sm text-primary">
                        I agree to pay {totalCost != null && <span className="font-medium">${totalCost}</span>} in
                        registration fees by <span className="font-medium">{dueDateStr}</span>.
                    </span>
                </label>
                <label className="flex items-start gap-3 bg-off-white rounded-lg px-4 py-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm mt-0.5"
                        checked={agreeEnrollment}
                        onChange={(e) => setAgreeEnrollment(e.target.checked)}
                        disabled={submitting}
                    />
                    <span className="text-sm text-primary">
                        I agree to submit my proof of enrollment by <span className="font-medium">{dueDateStr}</span>.
                    </span>
                </label>
            </div>
            {error && (
                <div className="bg-off-white border-l-4 border-red-500 rounded-lg px-4 py-3 mb-6 text-sm text-red-600">
                    {error}
                </div>
            )}
            <div className="flex justify-between">
                <button className="btn btn-ghost text-off-white" onClick={onBack} disabled={submitting}>Back</button>
                <button className="btn btn-secondary" onClick={handleConfirm} disabled={submitting || !agreePayment || !agreeEnrollment}>
                    {submitting && <span className="loading loading-spinner loading-sm" />}
                    Confirm
                </button>
            </div>
        </div>
    );
}
