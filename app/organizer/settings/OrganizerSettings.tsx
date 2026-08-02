"use client";

import { MtHeader, ShortAnswer, DatePicker, Dropdown } from "@components";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { saveSettings } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { clearSessionCache } from "@functions/sessionCache";
import { useNavigate } from "@/routerCompat";
import { useState, useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { settingsDateInput } from "@/lib/dates";
import type { SettingsDTO } from "@/lib/api";

// organizer settings edit page

// The editable slice of SettingsDTO. host is admin-only (saveSettings rejects it
// from an organizer), and host_school/reg_open/created_at are derived, so those
// are shown read-only instead of being posted back.
type EditableField =
    | "reg_year"
    | "reg_start"
    | "reg_end"
    | "reg_cost_first"
    | "reg_cost_extra"
    | "early_reg_start"
    | "early_reg_cost_first"
    | "early_reg_cost_extra"
    | "due_date"
    | "comp_date"
    | "contact_email"
    | "order_public";

// Controls are all string-valued; handleSave converts back to the body's types.
type SettingsForm = Record<EditableField, string>;

const EMPTY_FORM: SettingsForm = {
    reg_year: "",
    reg_start: "",
    reg_end: "",
    reg_cost_first: "",
    reg_cost_extra: "",
    early_reg_start: "",
    early_reg_cost_first: "",
    early_reg_cost_extra: "",
    due_date: "",
    comp_date: "",
    contact_email: "",
    order_public: "false",
};

const toText = (value: number | string | null | undefined): string =>
    value === null || value === undefined ? "" : String(value);

const num = (value: string): number | undefined => (value.trim() === "" ? undefined : Number(value));
const numOrNull = (value: string): number | null => (value.trim() === "" ? null : Number(value));
const textOrNull = (value: string): string | null => (value.trim() === "" ? null : value);

export default function OrganizerSettings({ settings = {} }: { settings?: Partial<SettingsDTO> }) {

    // Access is gated server-side by the page (requireOrganizer), so there is no
    // client-side redirect here.
    const nav = useNavigate();
    const dispatch = useAppDispatch();

    const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setForm({
            reg_year: toText(settings.reg_year),
            reg_start: settingsDateInput("reg_start", settings.reg_start),
            reg_end: settingsDateInput("reg_end", settings.reg_end),
            reg_cost_first: toText(settings.reg_cost_first),
            reg_cost_extra: toText(settings.reg_cost_extra),
            early_reg_start: settingsDateInput("early_reg_start", settings.early_reg_start),
            early_reg_cost_first: toText(settings.early_reg_cost_first),
            early_reg_cost_extra: toText(settings.early_reg_cost_extra),
            due_date: settingsDateInput("due_date", settings.due_date),
            comp_date: settingsDateInput("comp_date", settings.comp_date),
            contact_email: toText(settings.contact_email),
            order_public: settings.order_public ? "true" : "false",
        });
    }, [settings]);

    const handleChange = (key: EditableField, value: string) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        const fallback = "Failed to save settings";
        try {
            const { error } = await runAction(
                () => saveSettings({
                    reg_year: num(form.reg_year),
                    reg_start: form.reg_start || undefined,
                    reg_end: form.reg_end || undefined,
                    reg_cost_first: num(form.reg_cost_first),
                    reg_cost_extra: num(form.reg_cost_extra),
                    early_reg_start: textOrNull(form.early_reg_start),
                    early_reg_cost_first: numOrNull(form.early_reg_cost_first),
                    early_reg_cost_extra: numOrNull(form.early_reg_cost_extra),
                    due_date: textOrNull(form.due_date),
                    comp_date: textOrNull(form.comp_date),
                    contact_email: form.contact_email,
                    order_public: form.order_public === "true",
                }),
                fallback,
            );
            if (error) {
                // saveSettings reports per-field ("Enter a valid date." on
                // reg_start, "Host user not found." on host), so errorMessage
                // falls through to those rather than only reading `detail`.
                dispatch(setErrorMsg(errorMessage(error, fallback)));
                return;
            }
            // saveSettings revalidates the "settings" cache tag, so /organizer
            // re-fetches fresh data on navigation — but the per-tab copy is
            // separate and has to be dropped here.
            clearSessionCache("settings");
            dispatch(setSuccessMsg("Settings saved"));
            nav("/organizer");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <button className="btn btn-ghost w-fit" onClick={() => nav("/organizer")}>← Back</button>
                </div>

                <div className="text-3xl text-secondary font-semibold">Competition Settings</div>

                <section className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-4">
                    <div className="text-xl font-semibold">Registration</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ShortAnswer
                            label="Registration year"
                            type="number"
                            min={2000}
                            step={1}
                            value={form.reg_year}
                            onChange={(e) => handleChange("reg_year", e.target.value)}
                        />
                        <ShortAnswer
                            label="Contact email"
                            type="email"
                            value={form.contact_email}
                            onChange={(e) => handleChange("contact_email", e.target.value)}
                        />
                        <DatePicker
                            label="Registration opens"
                            value={form.reg_start}
                            onChange={(e) => handleChange("reg_start", e.target.value)}
                        />
                        <DatePicker
                            label="Registration deadline"
                            value={form.reg_end}
                            onChange={(e) => handleChange("reg_end", e.target.value)}
                        />
                        <ShortAnswer
                            label="Cost, first event ($)"
                            type="number"
                            min={0}
                            step={1}
                            value={form.reg_cost_first}
                            onChange={(e) => handleChange("reg_cost_first", e.target.value)}
                        />
                        <ShortAnswer
                            label="Cost, each extra event ($)"
                            type="number"
                            min={0}
                            step={1}
                            value={form.reg_cost_extra}
                            onChange={(e) => handleChange("reg_cost_extra", e.target.value)}
                        />
                    </div>
                </section>

                <section className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-4">
                    <div className="text-xl font-semibold">Early Registration</div>
                    <p className="text-sm text-gray-500 -mt-2">
                        Optional. Leave the start date blank to skip an early-registration window.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DatePicker
                            label="Early registration opens"
                            value={form.early_reg_start}
                            onChange={(e) => handleChange("early_reg_start", e.target.value)}
                        />
                        <div className="hidden sm:block" />
                        <ShortAnswer
                            label="Early cost, first event ($)"
                            type="number"
                            min={0}
                            step={1}
                            value={form.early_reg_cost_first}
                            onChange={(e) => handleChange("early_reg_cost_first", e.target.value)}
                        />
                        <ShortAnswer
                            label="Early cost, each extra event ($)"
                            type="number"
                            min={0}
                            step={1}
                            value={form.early_reg_cost_extra}
                            onChange={(e) => handleChange("early_reg_cost_extra", e.target.value)}
                        />
                    </div>
                </section>

                <section className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-4">
                    <div className="text-xl font-semibold">Competition</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DatePicker
                            label="Competition date (optional)"
                            value={form.comp_date}
                            onChange={(e) => handleChange("comp_date", e.target.value)}
                        />
                        <DatePicker
                            label="Payment & proof of enrollment due (optional)"
                            value={form.due_date}
                            onChange={(e) => handleChange("due_date", e.target.value)}
                        />
                        <Dropdown
                            label="Publish event order"
                            options={{ No: "false", Yes: "true" }}
                            value={form.order_public}
                            onChange={(e) => handleChange("order_public", e.target.value)}
                        />
                    </div>
                </section>

                {/* Host is set by an admin — saveSettings rejects it from an organizer. */}
                <section className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-2">
                    <div className="text-xl font-semibold">Host</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-0.5">
                            <span className="cg-eyebrow-muted">Host account</span>
                            <span className="text-dark font-medium">{settings.host ?? "—"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="cg-eyebrow-muted">Host school</span>
                            <span className="text-dark font-medium">{settings.host_school ?? "—"}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">Only an admin can change the host account.</p>
                </section>

                <div className="flex justify-end">
                    <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </>
    );
}
