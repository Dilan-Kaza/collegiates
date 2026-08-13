"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg } from "@slices";

/**
 * Copies a list to the clipboard as tab-separated rows.
 *
 * @remarks
 * TSV is what a paste into Sheets or Excel splits back into columns, which is
 * how an organizer turns a filtered view into a working spreadsheet.
 */
export default function CopyButton({
    getRows,
    label = "Copy list",
}: {
    /**
     * Builds the rows. Called **on click**, not on render, so a frequently
     * re-rendering view does not rebuild an export it may never copy.
     */
    getRows: () => string[][];
    /** Button text. Defaults to `"Copy list"`. */
    label?: string;
}) {

    const dispatch = useAppDispatch();
    const [copied, setCopied] = useState(false);
    // Held so a second click restarts the "Copied" window instead of the first
    // click's timer clearing it early, and so it is dropped on unmount.
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const onCopy = async () => {
        const rows = getRows();
        // A cell holding a tab or newline would silently shift every column to
        // its right, so they are flattened to spaces before joining.
        const text = rows
            .map((row) => row.map((cell) => cell.replace(/[\t\r\n]+/g, " ").trim()).join("\t"))
            .join("\n");
        try {
            // Needs a secure context (https or localhost); over plain http the
            // API is simply absent, which is what the catch below reports.
            await navigator.clipboard.writeText(text);
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("[CopyButton]", err);
            dispatch(setErrorMsg("Could not copy to the clipboard. Select the list and copy it manually."));
        }
    };

    return (
        <button type="button" className="btn btn-ghost btn-xs" onClick={onCopy}>
            {copied ? "✓ Copied" : label}
        </button>
    );
}
