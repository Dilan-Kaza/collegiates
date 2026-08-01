"use client";

import type { OrganizerRegistrationDTO } from "@/lib/api";
// registrations by athlete

// `registrations` arrives from the server. `onEdit` adds a per-row action that
// opens the Create/Edit view pre-loaded, skipping the email search.
export default function OrganizerRegistrationList({
    registrations = [],
    onEdit,
}: {
    registrations?: OrganizerRegistrationDTO[];
    onEdit?: (athlete: OrganizerRegistrationDTO) => void;
}) {

    if (registrations.length === 0) {
        return <div className="text-sm text-gray-400">No registrations found.</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            {registrations.map((user) => (
                <div key={user.user_id} className="cg-list-row flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="font-medium text-dark">{user.name}</div>
                            <div className="text-xs text-gray-400">{user.school} · {user.skill_level}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <StatusBadge active={user.is_competing} label="Competing" />
                            <StatusBadge active={user.has_paid} label="Paid" />
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
