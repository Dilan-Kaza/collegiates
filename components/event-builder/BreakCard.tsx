"use client";

import { useState } from "react";
import type { BreakItem } from "./types";

interface BreakCardProps {
  item: BreakItem;
  onRemove?: () => void;
  onUpdate?: (updated: BreakItem) => void;
}

export default function BreakCard({ item, onRemove, onUpdate }: BreakCardProps) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const [duration, setDuration] = useState<number>(item.duration);

    const handleSave = () => {
        if (name.trim()) onUpdate?.({ ...item, name: name.trim(), duration: Number(duration) });
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="rounded border border-dashed border-blue-300 bg-blue-50 px-3 py-2 flex items-center gap-2">
                <span className="text-gray-400 text-xs">⏸</span>
                <input
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-primary flex-1 min-w-0"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />
                <input
                    type="number"
                    min={1}
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-primary w-14"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                />
                <span className="text-xs text-gray-400 shrink-0">min</span>
                <button className="text-xs text-primary hover:underline shrink-0" onClick={handleSave}>Save</button>
            </div>
        );
    }

    return (
        <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 cursor-grab select-none flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">⏸</span>
                <span className="text-sm font-medium text-gray-600">{item.name}</span>
                <span className="text-xs text-gray-400">{item.duration} min</span>
            </div>
            <div className="flex items-center gap-2">
                <button className="text-xs text-gray-400 hover:text-primary" onClick={() => setEditing(true)}>Edit</button>
                {onRemove && <button className="text-xs text-gray-400 hover:text-red-400" onClick={onRemove}>✕</button>}
            </div>
        </div>
    );
}
