"use client";

import { useState } from "react";
import { MtHeader, ShortAnswer, DatePicker, Dropdown, LogoutButton } from "@components";
import { createSettings, createSchoolAccount } from "@functions/actions";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { useAppDispatch } from "@/store/hooks";
// admin console: create new competition settings and school accounts.
// Access is enforced server-side (requireAdmin on the page + both actions).

type Form = Record<string, string>;

// Surfaces a { error: FieldErrors } result: prefer a general `detail`, else the
// first field message. Returns true when an error was shown.
function showError(dispatch: ReturnType<typeof useAppDispatch>, error?: Record<string, string>): boolean {
  if (!error) return false;
  const msg = error.detail ?? Object.values(error)[0] ?? "Something went wrong.";
  dispatch(setErrorMsg(msg));
  return true;
}

export default function Admin({
  colleges = {},
  schools = {},
}: {
  colleges?: Record<string, string>;
  schools?: Record<string, string>;
}) {
  const dispatch = useAppDispatch();

  const [school, setSchool] = useState<Form>({});
  const [settings, setSettings] = useState<Form>({});
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const schoolChange = (key: string, value: string) => setSchool((f) => ({ ...f, [key]: value }));
  const settingsChange = (key: string, value: string) => setSettings((f) => ({ ...f, [key]: value }));

  const submitSchool = async () => {
    setSavingSchool(true);
    const { error } = await createSchoolAccount({
      email: school.email,
      first_name: school.first_name,
      last_name: school.last_name,
      college: school.college,
    });
    if (!showError(dispatch, error)) {
      dispatch(setSuccessMsg(`School account set up for ${school.email}.`));
      setSchool({});
    }
    setSavingSchool(false);
  };

  const submitSettings = async () => {
    setSavingSettings(true);
    const num = (v: string | undefined) => (v ? Number(v) : undefined);
    const { error } = await createSettings({
      reg_year: num(settings.reg_year),
      reg_start: settings.reg_start || undefined,
      reg_end: settings.reg_end || undefined,
      early_reg_start: settings.early_reg_start || null,
      reg_cost_first: num(settings.reg_cost_first),
      reg_cost_extra: num(settings.reg_cost_extra),
      early_reg_cost_first: settings.early_reg_cost_first ? Number(settings.early_reg_cost_first) : null,
      early_reg_cost_extra: settings.early_reg_cost_extra ? Number(settings.early_reg_cost_extra) : null,
      due_date: settings.due_date || null,
      comp_date: settings.comp_date || null,
      contact_email: settings.contact_email,
      host: settings.host,
      order_public: settings.order_public === "true",
    });
    if (!showError(dispatch, error)) {
      dispatch(setSuccessMsg(`Settings created for ${settings.reg_year}.`));
      setSettings({});
    }
    setSavingSettings(false);
  };

  return (
    <>
      <div className="hidden md:block"><MtHeader /></div>
      <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div className="text-3xl text-secondary font-semibold">Admin Console</div>
          <LogoutButton />
        </div>

        {/* Set up school account (promotes an existing user) */}
        <section className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-4">
          <div className="text-xl font-semibold">Set Up School Account</div>
          <p className="text-sm text-gray-500 -mt-2">
            Promotes an existing user (matched by email) to a school account linked to the chosen college.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShortAnswer label="Email" type="email" value={school.email ?? ""} onChange={(e) => schoolChange("email", e.target.value)} />
            <Dropdown label="College" options={colleges} value={school.college ?? ""} onChange={(e) => schoolChange("college", e.target.value)} />
            <ShortAnswer label="First name (optional)" value={school.first_name ?? ""} onChange={(e) => schoolChange("first_name", e.target.value)} />
            <ShortAnswer label="Last name (optional)" value={school.last_name ?? ""} onChange={(e) => schoolChange("last_name", e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={submitSchool} disabled={savingSchool}>
              {savingSchool ? "Setting up…" : "Set up account"}
            </button>
          </div>
        </section>

        {/* Create settings */}
        <section className="bg-off-white rounded-2xl px-6 py-5 flex flex-col gap-4">
          <div className="text-xl font-semibold">Create Competition Settings</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShortAnswer label="Registration year" type="number" value={settings.reg_year ?? ""} onChange={(e) => settingsChange("reg_year", e.target.value)} />
            <Dropdown label="Host school account" options={schools} value={settings.host ?? ""} onChange={(e) => settingsChange("host", e.target.value)} />
            <DatePicker label="Registration start" value={settings.reg_start ?? ""} onChange={(e) => settingsChange("reg_start", e.target.value)} />
            <DatePicker label="Registration end" value={settings.reg_end ?? ""} onChange={(e) => settingsChange("reg_end", e.target.value)} />
            <DatePicker label="Early registration start (optional)" value={settings.early_reg_start ?? ""} onChange={(e) => settingsChange("early_reg_start", e.target.value)} />
            <DatePicker label="Payment & proof of enrollment due (optional)" value={settings.due_date ?? ""} onChange={(e) => settingsChange("due_date", e.target.value)} />
            <DatePicker label="Competition date (optional)" value={settings.comp_date ?? ""} onChange={(e) => settingsChange("comp_date", e.target.value)} />
            <ShortAnswer label="First-event cost" type="number" value={settings.reg_cost_first ?? ""} onChange={(e) => settingsChange("reg_cost_first", e.target.value)} />
            <ShortAnswer label="Extra-event cost" type="number" value={settings.reg_cost_extra ?? ""} onChange={(e) => settingsChange("reg_cost_extra", e.target.value)} />
            <ShortAnswer label="Early first-event cost (optional)" type="number" value={settings.early_reg_cost_first ?? ""} onChange={(e) => settingsChange("early_reg_cost_first", e.target.value)} />
            <ShortAnswer label="Early extra-event cost (optional)" type="number" value={settings.early_reg_cost_extra ?? ""} onChange={(e) => settingsChange("early_reg_cost_extra", e.target.value)} />
            <ShortAnswer label="Contact email" type="email" value={settings.contact_email ?? ""} onChange={(e) => settingsChange("contact_email", e.target.value)} />
            <Dropdown label="Publish event order" options={{ No: "false", Yes: "true" }} value={settings.order_public ?? "false"} onChange={(e) => settingsChange("order_public", e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={submitSettings} disabled={savingSettings}>
              {savingSettings ? "Creating…" : "Create settings"}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
