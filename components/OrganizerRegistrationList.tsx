"use client";

import CopyButton from "./CopyButton";
import type { OrganizerRegistrationDTO } from "@/lib/api";

// One athlete per row, events joined into a single cell — a roster that pastes
// into a sheet as it reads here.
const copyRows = (registrations: OrganizerRegistrationDTO[]): string[][] => [
    ["Name", "Email", "College", "Level", "Competing", "Paid ($)", "Proof", "Events"],
    ...registrations.map((user) => [
        user.name,
        user.email,
        user.school ?? "",
        user.skill_level ?? "",
        user.is_competing ? "Yes" : "No",
        `$${user.amt_paid}`,
        user.proof_of_reg ? "Yes" : "No",
        user.registration.map((reg) => reg.event_name ?? reg.event_code).join("; "),
    ]),
];

/**
 * Registrations listed by competitor: one row each, with their events, payment,
 * and proof state. Copyable as TSV.
 */
export default function OrganizerRegistrationList({
    registrations = [],
    onEdit,
}: {
    /** Resolved on the server. */
    registrations?: OrganizerRegistrationDTO[];
    /**
     * Adds a per-row action opening the edit view pre-loaded on that competitor,
     * skipping the email search. Omitted hides the action.
     */
    onEdit?: (athlete: OrganizerRegistrationDTO) => void;
}) {

    if (registrations.length === 0) {
        return <div className="text-sm text-gray-400">No registrations found.</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{registrations.length} athlete{registrations.length === 1 ? "" : "s"}</span>
                <CopyButton getRows={() => copyRows(registrations)} />
            </div>
            {registrations.map((user) => (
                <div key={user.user_id} className="cg-list-row flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="font-medium text-dark">{user.name}</div>
                            <div className="text-xs text-gray-400">{user.school} · {user.skill_level}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <StatusBadge active={user.is_competing} label="Competing" />
                            {/* An amount, so the badge says how much rather than
                                just yes/no; grey until anything has been paid. */}
                            <StatusBadge active={user.amt_paid > 0} label={`Paid $${user.amt_paid}`} />
                            <StatusBadge active={user.proof_of_reg} label="Proof" />
                            {onEdit && (
                                <button className="btn btn-ghost btn-xs" onClick={() => onEdit(user)}>Edit</button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        {user.registration.map((reg, i) => (
                            <div key={i} className="text-xs text-gray-600 flex gap-1">
                                <span>·</span>
                                <span>{reg.event_name}{reg.nandu_str && <span className="text-gray-400"> ({reg.nandu_str})</span>}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
            {label}
        </span>
    );
}
