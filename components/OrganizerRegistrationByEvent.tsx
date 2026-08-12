"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import type { OrganizerRegistrationDTO } from "@/lib/api";

const TABS = [
    { label: "Beginner", level: "B" },
    { label: "Intermediate", level: "I" },
    { label: "Advanced", level: "A" },
];

const EVENT_ORDER = [
    "Nandu Longfist", "Nandu Southern Fist",
    "Longfist", "Southern Fist",
    "Straightsword", "Broadsword", "Southern Broadsword", "Spear", "Staff", "Southern Staff",
    "Traditional Open Barehand", "Traditional Short Weapon", "Traditional Long Weapon", "Traditional Soft Weapon", "Other Weapon",
    "Taiji 24", "Yang", "Chen", "42 Fist", "42 Sword", "Taiji Weapon",
    "Internal Open Barehand", "Internal Open Weapon",
];

interface Athlete {
    user_id: string;
    name: string;
    school: string | null;
    nandu_str?: string | null;
}

interface EventGroup {
    event_name: string;
    athletes: Athlete[];
}

const eventRank = (name: string) => {
    const idx = EVENT_ORDER.findIndex((key) => name.includes(key));
    return idx === -1 ? EVENT_ORDER.length : idx;
};

// `registrations` is resolved on the server and passed in (was fetched on mount).
export default function OrganizerRegistrationByEvent({ registrations = [] }: { registrations?: OrganizerRegistrationDTO[] }) {

    const [activeLevel, setActiveLevel] = useState("B");
    const [activeGender, setActiveGender] = useState("Male");

    if (registrations.length === 0) {
        return <div className="text-sm text-gray-400">No registrations found.</div>;
    }

    const eventMap = new Map<string, EventGroup>();
    for (const user of registrations) {
        for (const reg of user.registration) {
            if (reg.event_level !== activeLevel) continue;
            const eventName = reg.event_name;
            if (!eventName || !eventName.includes(activeGender)) continue;
            if (!eventMap.has(reg.event_code)) {
                eventMap.set(reg.event_code, { event_name: eventName, athletes: [] });
            }
            eventMap.get(reg.event_code)!.athletes.push({
                user_id: user.user_id,
                name: user.name,
                school: user.school,
                nandu_str: reg.nandu_str,
            });
        }
    }

    const sorted = [...eventMap.entries()].sort(([, a], [, b]) => eventRank(a.event_name) - eventRank(b.event_name));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                {TABS.map(({ label, level }) => (
                    <button
                        key={level}
                        className={`btn btn-sm ${activeLevel === level ? "btn-secondary" : "btn-ghost"}`}
                        onClick={() => setActiveLevel(level)}
                    >
                        {label}
                    </button>
                ))}
                <div className="w-4" />
                {["Male", "Female"].map((g) => (
                    <button
                        key={g}
                        className={`btn btn-sm ${activeGender === g ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setActiveGender(g)}
                    >
                        {g}
                    </button>
                ))}
            </div>
            {sorted.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        {sorted.length} event{sorted.length === 1 ? "" : "s"} in this view
                    </span>
                    {/* The active level/gender tab only — the same rows on screen,
                        flattened to one line per athlete under their event. */}
                    <CopyButton
                        label="Copy these events"
                        getRows={() => [
                            ["Event", "Name", "College", "Nandu"],
                            ...sorted.flatMap(([, { event_name, athletes }]) =>
                                athletes.map((a) => [event_name, a.name, a.school ?? "", a.nandu_str ?? ""]),
                            ),
                        ]}
                    />
                </div>
            )}
            {sorted.length === 0 ? (
                <div className="text-sm text-gray-400">No events.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {sorted.map(([code, { event_name, athletes }]) => (
                        <div key={code} className="cg-list-row flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-dark text-sm">{event_name.replace(/\b(Beginner|Intermediate|Advanced|Male|Female)\b\s*/g, "")}</div>
                                <span className="text-xs text-gray-400">{athletes.length}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {athletes.map((a) => (
                                    <div key={a.user_id} className="text-xs text-gray-600 flex gap-1">
                                        <span>·</span>
                                        <span>
                                            {a.name}
                                            <span className="text-gray-400"> — {a.school}</span>
                                            {a.nandu_str && <span className="text-gray-400"> ({a.nandu_str})</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
