"use client";

import { useState } from "react";
import { ReactSortable } from "react-sortablejs";
import type { BreakItem } from "./types";
import { newBreakId } from "./utils";

const BREAK_PRESETS: BreakItem[] = [
    { id: "preset_lunch", type: "break", name: "Lunch", duration: 60 },
    { id: "preset_judges", type: "break", name: "Judges Break", duration: 15 },
];

const chipClass =
    "rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 cursor-grab select-none flex items-center gap-2 text-xs";

function BreakChip({ item }: { item: BreakItem }) {
    return (
        <div className={chipClass}>
            <span className="text-gray-400">⏸</span>
            <span className="font-medium text-gray-600">{item.name}</span>
            <span className="text-gray-400 ml-auto">{item.duration} min</span>
        </div>
    );
}

// Sidebar palette of draggable breaks. Staged and preset chips share the "rings"
// sortable group, so dragging one into a ring is what moves it out of here.
export default function BreakPanel() {
    const [stagedBreaks, setStagedBreaks] = useState<BreakItem[]>([]);
    const [breakName, setBreakName] = useState("");
    const [breakDuration, setBreakDuration] = useState(60);

    const addBreak = () => {
        if (!breakName.trim()) return;
        setStagedBreaks((prev) => [...prev, { id: newBreakId(), type: "break", name: breakName.trim(), duration: Number(breakDuration) }]);
        setBreakName("");
        setBreakDuration(60);
    };

    return (
        <div className="w-48 shrink-0 flex flex-col gap-3 sticky top-4">
            <div className="bg-off-white rounded-lg border border-gray-200 flex flex-col gap-2 p-3">
                <div className="text-xs font-semibold text-primary">Add Break</div>
                {stagedBreaks.length > 0 && (
                    <ReactSortable<BreakItem>
                        list={stagedBreaks}
                        setList={setStagedBreaks}
                        group="rings"
                        animation={150}
                        className="flex flex-col gap-1"
                    >
                        {stagedBreaks.map((b) => (
                            <BreakChip key={b.id} item={b} />
                        ))}
                    </ReactSortable>
                )}
                <ReactSortable<BreakItem>
                    list={BREAK_PRESETS}
                    setList={() => {}}
                    group={{ name: "rings", pull: "clone", put: false }}
                    sort={false}
                    className="flex flex-col gap-1"
                >
                    {BREAK_PRESETS.map((preset) => (
                        <BreakChip key={preset.id} item={preset} />
                    ))}
                </ReactSortable>
                <div className="border-t border-gray-100 pt-2 text-xs text-gray-400">Custom</div>
                <input
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-primary"
                    placeholder="Name (e.g. Lunch)"
                    value={breakName}
                    onChange={(e) => setBreakName(e.target.value)}
                />
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        min={1}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-primary w-16"
                        value={breakDuration}
                        onChange={(e) => setBreakDuration(Number(e.target.value))}
                    />
                    <span className="text-xs text-gray-400">min</span>
                </div>
                <button className="btn btn-ghost btn-sm text-xs" onClick={addBreak} disabled={!breakName.trim()}>+ Add</button>
            </div>
        </div>
    );
}
