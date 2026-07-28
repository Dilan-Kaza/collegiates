"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useDispatch } from "react-redux";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { findUserByEmail, updateOrganizerRegistration } from "@functions/actions";
import { Dropdown } from "@components";
import type { RegEventItem } from "@/types";
import type { EventDTO, OrganizerRegistrationDTO } from "@/lib/api";

// choices mirror the enums defined in models.py (same as the sign-up flow)
const GENDER_CHOICES = { Male: "M", Female: "F" };
const SKILL_LEVELS = { Beginner: "B", Intermediate: "I", Advanced: "A" };
const STUDENT_TYPES = {
    "Full/Part-Time Undergraduate Student": "1",
    "Full-Time Graduate/Professional School Student": "2",
    "Early Graduate Of Current Year": "3",
    "Non-Enrolled Student": "4",
    "One Year Alumni": "5",
    "Part-Time Graduate Student": "6",
    "International Student": "7",
};

// The editable profile fields pulled off an athlete DTO into form strings.
interface ProfileForm {
    gender: string;
    skill_level: string;
    student_type: string;
    school: string;
}

const profileFrom = (a: OrganizerRegistrationDTO | null): ProfileForm => ({
    gender: a?.gender ?? "",
    skill_level: a?.skill_level ?? "",
    student_type: a?.student_type ?? "",
    school: a?.school_id ?? "",
});

// Organizer tool for building or amending a competitor's registration. The
// organizer either arrives with an athlete already selected (edited straight
// from the By Athlete list via `initialAthlete`) or searches for one by email,
// then adds/removes any event from the full catalogue (competitor gender/level
// gates don't apply here) and edits nandu codes before saving via
// updateOrganizerRegistration. `allEvents` (the full catalogue) is resolved on
// the server and passed in (was fetched on mount).
export default function OrganizerRegistrationEdit({
    allEvents = [],
    colleges = {},
    initialAthlete = null,
}: {
    allEvents?: EventDTO[];
    colleges?: Record<string, string>;
    initialAthlete?: OrganizerRegistrationDTO | null;
}) {

    const dispatch = useDispatch();

    const [email, setEmail] = useState("");
    const [searching, setSearching] = useState(false);
    const [athlete, setAthlete] = useState<OrganizerRegistrationDTO | null>(initialAthlete);
    // Editable competitor profile (organizer may correct it regardless of the
    // competitor's registration lock).
    const [profile, setProfile] = useState<ProfileForm>(() => profileFrom(initialAthlete));
    const onProfileChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile((p) => ({ ...p, [name]: value }));
    };

    const [events, setEvents] = useState<RegEventItem[]>(
        initialAthlete
            ? initialAthlete.registration.map((r) => ({ event_code: r.event_code, nandu_str: r.nandu_str ?? "" }))
            : []
    );
    const [selectedEvent, setSelectedEvent] = useState("");
    const [saving, setSaving] = useState(false);

    const getEvent = (code: string) => allEvents.find((e) => e.event_code === code);
    const selectedCodes = new Set(events.map((e) => e.event_code));
    // Only offer events that match the (in-progress) profile gender/skill level
    // — the same gates the competitor-facing flow applies — and aren't already
    // selected. Following the live profile form lets the organizer set
    // gender/level first and immediately see the matching events.
    const remainingEvents = allEvents.filter(
        (e) =>
            !selectedCodes.has(e.event_code) &&
            (profile.gender === "" || e.gender_category === profile.gender) &&
            (profile.skill_level === "" || e.event_level === profile.skill_level)
    );

    const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSearching(true);
        const user = await findUserByEmail(email);
        if (user) {
            setAthlete(user);
            setProfile(profileFrom(user));
            setEvents(user.registration.map((r) => ({ event_code: r.event_code, nandu_str: r.nandu_str ?? "" })));
        } else {
            dispatch(setErrorMsg("User not found"));
        }
        setSearching(false);
    };

    const onAdd = () => {
        if (!selectedEvent || selectedCodes.has(selectedEvent)) return;
        setEvents([...events, { event_code: selectedEvent, nandu_str: "" }]);
        setSelectedEvent("");
    };

    const onRemove = (code: string) => {
        setEvents(events.filter((e) => e.event_code !== code));
    };

    const onNandu = (e: ChangeEvent<HTMLInputElement>, code: string) => {
        const { value } = e.target;
        setEvents(events.map((ev) => (ev.event_code === code ? { ...ev, nandu_str: value } : ev)));
    };

    const clearSelection = () => {
        setAthlete(null);
        setProfile(profileFrom(null));
        setEvents([]);
        setSelectedEvent("");
        setEmail("");
    };

    const onSave = async () => {
        if (!athlete) return;
        setSaving(true);
        const result = await updateOrganizerRegistration(athlete.user_id, {
            registration_input: events.map((e) => ({ event: e.event_code, nandu_str: e.nandu_str ?? "" })),
            gender: profile.gender,
            skill_level: profile.skill_level,
            student_type: profile.student_type,
            school: profile.school,
        });
        setSaving(false);
        if (result.error) {
            dispatch(setErrorMsg(Object.values(result.error)[0] ?? "Could not save registration"));
            return;
        }
        // Invalidate the cached organizer registration list so the other tabs
        // refetch this athlete's updated registration on next view.
        clearSessionCache("organizerRegistrations");
        dispatch(setSuccessMsg(`Registration saved for ${athlete.name}`));
        setAthlete(result.data);
        setProfile(profileFrom(result.data));
        setEvents(result.data.registration.map((r) => ({ event_code: r.event_code, nandu_str: r.nandu_str ?? "" })));
    };

    if (!athlete) {
        return (
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="text-sm text-gray-500">Search for an athlete by email to create or edit their registration.</div>
                <div className="flex gap-2 items-center">
                    <input
                        type="email"
                        className="cg-input flex-1"
                        placeholder="Search by email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button className="btn btn-primary btn-sm" type="submit" disabled={searching}>
                        {searching ? "..." : "Find"}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-medium text-dark">{athlete.name}</div>
                    <div className="text-xs text-gray-400">{athlete.email}{athlete.school && ` · ${athlete.school}`}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={clearSelection}>Change athlete</button>
            </div>

            <div className="flex flex-col gap-3 border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-dark">Profile</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Dropdown name="gender" label="Gender" options={GENDER_CHOICES} value={profile.gender} onChange={onProfileChange} />
                    <Dropdown name="skill_level" label="Experience Level" options={SKILL_LEVELS} value={profile.skill_level} onChange={onProfileChange} />
                    <Dropdown name="school" label="College" options={colleges} value={profile.school} onChange={onProfileChange} />
                    <Dropdown name="student_type" label="Student Type" options={STUDENT_TYPES} value={profile.student_type} onChange={onProfileChange} />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {events.length === 0 ? (
                    <div className="text-sm text-gray-400">No events selected yet.</div>
                ) : (
                    events.map((event) => {
                        const meta = getEvent(event.event_code);
                        return (
                            <div key={event.event_code} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-sm text-dark">{meta?.event_name ?? event.event_code}</span>
                                    {meta?.is_nandu && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>Nandu code:</span>
                                            <input
                                                className="border-b border-gray-300 focus:outline-none flex-1 text-dark"
                                                value={event.nandu_str ?? ""}
                                                onChange={(e) => onNandu(e, event.event_code)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <button className="btn btn-ghost btn-sm btn-circle text-gray-400" onClick={() => onRemove(event.event_code)}>✕</button>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex gap-2 items-center">
                <select
                    className="cg-input flex-1"
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                >
                    <option value="" disabled hidden>Add an event…</option>
                    {remainingEvents.map((e) => (
                        <option value={e.event_code} key={e.event_code}>{e.event_name ?? e.event_code}</option>
                    ))}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={onAdd} disabled={!selectedEvent}>Add</button>
            </div>

            <div className="flex justify-end">
                <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                </button>
            </div>
        </div>
    );
}
