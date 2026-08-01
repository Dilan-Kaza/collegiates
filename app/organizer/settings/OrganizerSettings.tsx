"use client";

import { MtHeader } from "@components";
import { setErrorMsg } from "@slices";
import { saveSettings } from "@functions/actions";
import { useNavigate } from "@/routerCompat";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import type { SettingsDTO } from "@/lib/api";

// organizer settings edit page
type SettingsForm = Record<string, string | number | null>;

export default function OrganizerSettings({ settings = {} }: { settings?: Partial<SettingsDTO> }) {

    // Access is gated server-side by the page (requireOrganizer), so there is no
    // client-side redirect here.
    const nav = useNavigate();
    const dispatch = useDispatch();

    const [form, setForm] = useState<SettingsForm>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            const normalized = Object.fromEntries(
                Object.entries(settings).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])
            ) as SettingsForm;
            setForm(normalized);
        }
    }, [settings]);

    const handleChange = (key: string, value: string) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await saveSettings(form as unknown as Parameters<typeof saveSettings>[0]);
        if (error) {
            dispatch(setErrorMsg(error.detail ?? "Failed to save settings"));
        } else {
            // saveSettings revalidates the "settings" cache tag, so /organizer
            // re-fetches fresh data on navigation.
            nav("/organizer");
        }
        setLoading(false);
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <button className="btn btn-ghost w-fit" onClick={() => nav("/organizer")}>← Back</button>
                </div>

                <div className="text-3xl text-secondary font-semibold">Competition Settings</div>

                <div className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-5">
                    {Object.keys(form).map((key) => (
                        <div key={key} className="flex flex-col gap-1">
                            <label className="cg-eyebrow-muted">{key}</label>
                            <input
                                className="cg-input"
                                value={form[key] ?? ""}
                                onChange={(e) => handleChange(key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </>
    );
}
