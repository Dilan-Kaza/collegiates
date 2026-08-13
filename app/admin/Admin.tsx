"use client";

import { useState } from "react";
import { MtHeader, ShortAnswer, DatePicker, Dropdown, LogoutButton } from "@components";
import { createSettings, createSchoolAccount } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { useCachedResource, cacheKeys, fetchColleges } from "@functions";
import { useAppDispatch } from "@/store/hooks";
// admin console: create new competition settings and school accounts.
// Access is enforced server-side (requireAdmin on the page + both actions).

type Form = Record<string, string>;

export default function Admin({
  colleges: initialColleges = {},
  schools = {},
}: {
  colleges?: Record<string, string>;
  schools?: Record<string, string>;
}) {
  const dispatch = useAppDispatch();

  // The new school account's college picker, bound to the shared `colleges` entry.
  // `schools` stays a plain prop — nothing else reads it and nothing invalidates it.
  const colleges = useCachedResource(cacheKeys.colleges, fetchColleges, initialColleges);

  const [school, setSchool] = useState<Form>({});
  const [settings, setSettings] = useState<Form>({});
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const schoolChange = (key: string, value: string) => setSchool((f) => ({ ...f, [key]: value }));
  const settingsChange = (key: string, value: string) => setSettings((f) => ({ ...f, [key]: value }));

  const submitSchool = async () => {
    setSavingSchool(true);
    const fallback = "Could not set up the school account.";
    try {
      const { error } = await runAction(
        () => createSchoolAccount({
          email: school.email,
          first_name: school.first_name,
          last_name: school.last_name,
          college: school.college,
        }),
        fallback,
      );
      if (error) {
        dispatch(setErrorMsg(errorMessage(error, fallback)));
        return;
      }
      dispatch(setSuccessMsg(`School account set up for ${school.email}.`));
      setSchool({});
    } finally {
      setSavingSchool(false);
    }
  };

  const submitSettings = async () => {
    setSavingSettings(true);
    const num = (v: string | undefined) => (v ? Number(v) : undefined);
    const fallback = "Could not create the settings.";
    try {
      const { error } = await runAction(
        () => createSettings({
          reg_year: num(settings.reg_year),
          reg_start: settings.reg_start || undefined,
          reg_end: settings.reg_end || undefined,
          early_reg_start: settings.early_reg_start || null,
          reg_cost_base: num(settings.reg_cost_base),
          reg_cost_event: num(settings.reg_cost_event),
          early_reg_cost_base: settings.early_reg_cost_base ? Number(settings.early_reg_cost_base) : null,
          early_reg_cost_event: settings.early_reg_cost_event ? Number(settings.early_reg_cost_event) : null,
          due_date: settings.due_date || null,
          comp_date: settings.comp_date || null,
          contact_email: settings.contact_email,
          scoring_url: settings.scoring_url || null,
          host: settings.host,
          order_public: settings.order_public === "true",
        }),
        fallback,
      );
      if (error) {
        dispatch(setErrorMsg(errorMessage(error, fallback)));
        return;
      }
      dispatch(setSuccessMsg(`Settings created for ${settings.reg_year}.`));
      setSettings({});
    } finally {
      setSavingSettings(false);
    }
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
            <ShortAnswer label="Registration fee" type="number" value={settings.reg_cost_base ?? ""} onChange={(e) => settingsChange("reg_cost_base", e.target.value)} />
            <ShortAnswer label="Per-event cost" type="number" value={settings.reg_cost_event ?? ""} onChange={(e) => settingsChange("reg_cost_event", e.target.value)} />
            <ShortAnswer label="Early registration fee (optional)" type="number" value={settings.early_reg_cost_base ?? ""} onChange={(e) => settingsChange("early_reg_cost_base", e.target.value)} />
            <ShortAnswer label="Early per-event cost (optional)" type="number" value={settings.early_reg_cost_event ?? ""} onChange={(e) => settingsChange("early_reg_cost_event", e.target.value)} />
            <ShortAnswer label="Contact email" type="email" value={settings.contact_email ?? ""} onChange={(e) => settingsChange("contact_email", e.target.value)} />
            <ShortAnswer label="Scoring link (optional)" type="url" value={settings.scoring_url ?? ""} onChange={(e) => settingsChange("scoring_url", e.target.value)} />
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
