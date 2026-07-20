"use client";

import { MtHeader, GroupsetList, OrganizerBlogList, OrganizerRegistrationList } from "@components";
import { StillView } from "@components/event-builder";
import { useForwardIfNotOrganizer } from "@functions";
import { Link } from "@/routerCompat";
import { useState } from "react";
import type { SettingsDTO } from "@/lib/api";
// organizer dashboard

export default function Organizer({ settings = {} }: { settings?: Partial<SettingsDTO> }) {

    useForwardIfNotOrganizer();
    const [registrationsOpen, setRegistrationsOpen] = useState(true);
    const [groupsetsOpen, setGroupsetsOpen] = useState(true);
    const [blogOpen, setBlogOpen] = useState(true);
    const [orderOpen, setOrderOpen] = useState(true);

    const dateFields = new Set(["early_reg_start", "reg_start", "reg_end", "comp_date"]);
    const costFields = new Set(["early_reg_cost_first", "early_reg_cost_extra", "reg_cost_first", "reg_cost_extra"]);
    const labels: Record<string, string> = {
        reg_year: "Year",
        early_reg_start: "Early Reg Opens",
        early_reg_cost_first: "Early Reg Cost (1st Event)",
        early_reg_cost_extra: "Early Reg Cost (Extra)",
        reg_start: "Reg Opens",
        reg_end: "Reg Deadline",
        reg_cost_first: "Reg Cost (1st Event)",
        reg_cost_extra: "Reg Cost (Extra)",
        comp_date: "Competition Date",
        contact_email: "Contact Email",
        host: "Host",
    };

    const formatValue = (key: string, value: unknown): string => {
        if (value === null || value === undefined) return "—";
        if (dateFields.has(key)) {
            return (value as Date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        }
        if (costFields.has(key)) {
            return `$${String(value)}`;
        }
        return String(value);
    };

    return (
        <>
            <div className="hidden md:block"><MtHeader /></div>
            <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="text-3xl text-secondary font-semibold">Organizer</div>

                <div className="bg-off-white rounded-lg px-6 py-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <div className="text-xl font-semibold text-primary">Tournament Settings</div>
                        <Link to="/organizer/settings" className="btn btn-secondary btn-sm">Edit</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {Object.entries(labels).map(([key, label]) => (
                            <div key={key} className="flex flex-col gap-0.5">
                                <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
                                <span className="text-dark font-medium">{formatValue(key, settings[key as keyof SettingsDTO])}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-off-white rounded-lg px-6 py-5 flex flex-col gap-4">
                    <button
                        className="flex justify-between items-center text-xl font-semibold text-primary border-b border-gray-200 pb-2 w-full text-left"
                        onClick={() => setRegistrationsOpen(o => !o)}
                    >
                        <Link to="/organizer/registrations" className="hover:underline" onClick={e => e.stopPropagation()}>Registrations</Link>
                        <span className="text-sm text-gray-400">{registrationsOpen ? "▲" : "▼"}</span>
                    </button>
                    {registrationsOpen && <OrganizerRegistrationList />}
                </div>

                <div className="bg-off-white rounded-lg px-6 py-5 flex flex-col gap-4">
                    <button
                        className="flex justify-between items-center text-xl font-semibold text-primary border-b border-gray-200 pb-2 w-full text-left"
                        onClick={() => setGroupsetsOpen(o => !o)}
                    >
                        <Link to="/organizer/groupset" className="hover:underline" onClick={e => e.stopPropagation()}>Group Sets</Link>
                        <span className="text-sm text-gray-400">{groupsetsOpen ? "▲" : "▼"}</span>
                    </button>
                    {groupsetsOpen && <GroupsetList />}
                </div>

                <div className="bg-off-white rounded-lg px-6 py-5 flex flex-col gap-4">
                    <button
                        className="flex justify-between items-center text-xl font-semibold text-primary border-b border-gray-200 pb-2 w-full text-left"
                        onClick={() => setOrderOpen(o => !o)}
                    >
                        <Link to="/organizer/eventbuilder" className="hover:underline" onClick={e => e.stopPropagation()}>Event Order</Link>
                        <span className="text-sm text-gray-400">{orderOpen ? "▲" : "▼"}</span>
                    </button>
                    {orderOpen && <StillView />}
                </div>

                <div className="bg-off-white rounded-lg px-6 py-5 flex flex-col gap-4">
                    <button
                        className="flex justify-between items-center text-xl font-semibold text-primary border-b border-gray-200 pb-2 w-full text-left"
                        onClick={() => setBlogOpen(o => !o)}
                    >
                        <Link to="/organizer/blog" className="hover:underline" onClick={e => e.stopPropagation()}>Blog Posts</Link>
                        <span className="text-sm text-gray-400">{blogOpen ? "▲" : "▼"}</span>
                    </button>
                    {blogOpen && <OrganizerBlogList />}
                </div>
            </div>
        </>
    );
}
