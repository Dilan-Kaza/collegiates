"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { apiSheets } from "@/lib/apiClient";
// google-sheet import view

interface SheetEvent {
    name: string;
    competitors: Record<string, string>[];
}

function parseEvents(values: string[][]): { compHeaders: string[]; events: SheetEvent[] } {
    const [headerRow, ...dataRows] = values;
    const eventCol = headerRow.indexOf("Event");
    const compHeaders = headerRow.filter((_, i) => i !== eventCol);
    const events: SheetEvent[] = [];
    let current: SheetEvent | null = null;
    for (const row of dataRows) {
        const eventName = row[eventCol];
        if (eventName) {
            current = { name: eventName, competitors: [] };
            events.push(current);
        } else if (current) {
            const competitor: Record<string, string> = {};
            compHeaders.forEach((h, i) => { competitor[h] = row[i + 1] ?? ""; });
            current.competitors.push(competitor);
        }
    }
    return { compHeaders, events };
}

export default function SheetView() {
    const [sheetId, setSheetId] = useState("");
    const [compHeaders, setCompHeaders] = useState<string[]>([]);
    const [events, setEvents] = useState<SheetEvent[]>([]);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const toggleCollapse = (name: string) => setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

    const fetchSheet = async (id: string) => {
        setLoading(true);
        setError("");
        try {
            const res = await apiSheets.get(`/${id}/values/Sheet1`);
            const values = (res.data as { values?: string[][] })?.values ?? [];
            if (values.length < 2) { setError("Sheet is empty."); setLoading(false); return; }
            const parsed = parseEvents(values);
            setCompHeaders(parsed.compHeaders);
            setEvents(parsed.events);
        } catch {
            setError("Failed to load sheet. Check the sheet ID and make sure it is publicly accessible.");
        }
        setLoading(false);
    };

    const handleLoad = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setEvents([]); fetchSheet(sheetId); };
    const handleRefresh = () => fetchSheet(sheetId);

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={handleLoad} className="flex gap-2 items-center">
                <input
                    className="cg-input flex-1"
                    placeholder="Google Sheet ID"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    required
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
                    {loading ? "Loading..." : "Load"}
                </button>
                {events.length > 0 && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={loading}>
                        Refresh
                    </button>
                )}
            </form>
            {error && <div className="text-sm text-red-400">{error}</div>}
            {events.map((ev) => (
                <div key={ev.name} className="bg-off-white rounded-2xl overflow-hidden">
                    <button
                        onClick={() => toggleCollapse(ev.name)}
                        className="w-full flex items-center justify-between px-4 py-3 text-primary font-semibold text-lg hover:bg-gray-100 transition-colors"
                    >
                        <span>{ev.name}</span>
                        <span className="text-sm">{collapsed[ev.name] ? "▸" : "▾"}</span>
                    </button>
                    {!collapsed[ev.name] && (
                        <div className="overflow-auto">
                            <table className="table w-full text-sm">
                                <thead>
                                    <tr>{compHeaders.map((h) => <th key={h} className="text-primary uppercase tracking-wide">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {ev.competitors.map((comp, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            {compHeaders.map((h) => <td key={h}>{comp[h]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
