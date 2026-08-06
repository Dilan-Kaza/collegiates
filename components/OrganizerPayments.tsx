"use client";

import { useMemo, useState } from "react";
import CopyButton from "./CopyButton";
import { useAppDispatch } from "@/store/hooks";
import { setErrorMsg, setSuccessMsg } from "@slices";
import { clearSessionCache } from "@functions/sessionCache";
import { cacheKeys } from "@functions";
import { updateOrganizerRegistration } from "@functions/actions";
import { errorMessage, runAction } from "@functions/actionErrors";
import { computeTotalOwed } from "@/lib/fees";
import type { OrganizerRegistrationDTO, SettingsDTO } from "@/lib/api";

// Processing screen for what an organizer confirms off-platform: the fee arriving and proof of
// enrollment. Both are profile fields; `is_competing` is here so a withdrawal fits the same row.

// The two yes/no fields. amt_paid is an amount and is edited separately.
type FlagField = "proof_of_reg" | "is_competing";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Unpaid" },
    { key: "no_proof", label: "No proof" },
    { key: "outstanding", label: "Outstanding" },
    { key: "done", label: "Cleared" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

type RowState = { amt_paid: number } & Record<FlagField, boolean>;

const stateOf = (a: OrganizerRegistrationDTO): RowState => ({
    amt_paid: a.amt_paid,
    proof_of_reg: a.proof_of_reg,
    is_competing: a.is_competing,
});

// Settled up. What is owed can be unknown (no costs configured, so owedFor returns null), and
// then any payment at all counts as paid — the same answer the old has_paid flag gave.
const isPaid = (amt: number, due: number | null): boolean =>
    due == null ? amt > 0 : amt >= due;

// Amount owed, priced exactly as the competitor's own dashboard prices it so the two figures
// can be checked against each other. With no team date carried, the earliest registration stands in.
function owedFor(a: OrganizerRegistrationDTO, settings: Partial<SettingsDTO>): number | null {
    if (settings.reg_cost_base == null) return null;
    const earliest = a.registration
        .map((r) => r.date_created)
        .sort((x, y) => new Date(x).getTime() - new Date(y).getTime())[0];
    return computeTotalOwed(a.registration, settings as SettingsDTO, a.team ? earliest : null)?.total ?? null;
}

export default function OrganizerPayments({
    registrations = [],
    settings = {},
}: {
    registrations?: OrganizerRegistrationDTO[];
    settings?: Partial<SettingsDTO>;
}) {

    const dispatch = useAppDispatch();

    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<FilterKey>("all");
    // What an edit saved here, overlaid on the server's copy: the `registrations` prop only catches
    // up once the cache entry cleared below is refetched, and a row must not flip back meanwhile.
    const [overrides, setOverrides] = useState<Record<string, RowState>>({});
    // Keyed `${user_id}:${field}` so a row's controls disable independently.
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const stateFor = (a: OrganizerRegistrationDTO): RowState => overrides[a.user_id] ?? stateOf(a);

    const rows = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return registrations
            .filter((a) => {
                if (needle) {
                    const haystack = `${a.name} ${a.email} ${a.school ?? ""}`.toLowerCase();
                    if (!haystack.includes(needle)) return false;
                }
                const row = overrides[a.user_id] ?? stateOf(a);
                const paid = isPaid(row.amt_paid, owedFor(a, settings));
                switch (filter) {
                    case "unpaid": return !paid;
                    case "no_proof": return !row.proof_of_reg;
                    case "outstanding": return !paid || !row.proof_of_reg;
                    case "done": return paid && row.proof_of_reg;
                    default: return true;
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [registrations, query, filter, overrides, settings]);

    // Totals cover every registration, not the filtered view — the header answers "where does the
    // competition stand". Collected is what actually came in; outstanding is floored at zero.
    const totals = useMemo(() => {
        let paid = 0, proof = 0, collected = 0, outstanding = 0;
        for (const a of registrations) {
            const row = overrides[a.user_id] ?? stateOf(a);
            const owed = owedFor(a, settings);
            collected += row.amt_paid;
            outstanding += Math.max(0, (owed ?? 0) - row.amt_paid);
            if (isPaid(row.amt_paid, owed)) paid += 1;
            if (row.proof_of_reg) proof += 1;
        }
        return { paid, proof, collected, outstanding, count: registrations.length };
    }, [registrations, overrides, settings]);

    // One field per save: updateOrganizerRegistration leaves an absent field alone, so nothing else
    // on the profile — and no registration row — is touched by an edit here.
    const commit = async (
        athlete: OrganizerRegistrationDTO,
        field: FlagField | "amt_paid",
        body: { amt_paid?: number; proof_of_reg?: boolean; is_competing?: boolean },
        confirmation: string,
    ) => {
        const key = `${athlete.user_id}:${field}`;
        if (saving[key]) return;
        setSaving((s) => ({ ...s, [key]: true }));
        const fallback = "Could not update that athlete";
        try {
            const result = await runAction(
                () => updateOrganizerRegistration(athlete.user_id, body),
                fallback,
            );
            const saved = result.data;
            if (result.error || !saved) {
                dispatch(setErrorMsg(errorMessage(result.error, fallback)));
                return;
            }
            // Show what the server actually saved, then drop the cached lists so
            // the other tabs and the organizer dashboard re-read them.
            setOverrides((o) => ({ ...o, [athlete.user_id]: stateOf(saved) }));
            clearSessionCache(cacheKeys.organizerRegistrations);
            clearSessionCache(cacheKeys.organizerRegistration(athlete.user_id));
            dispatch(setSuccessMsg(`${athlete.name} ${confirmation}`));
        } finally {
            setSaving((s) => {
                const rest = { ...s };
                delete rest[key];
                return rest;
            });
        }
    };

    const toggle = (athlete: OrganizerRegistrationDTO, field: FlagField) => {
        const next = !stateFor(athlete)[field];
        return commit(athlete, field, { [field]: next }, CONFIRMATIONS[field][next ? 1 : 0]);
    };

    // The figure the organizer types is the running total received, not a top-up,
    // so it replaces what was recorded.
    const setAmount = (athlete: OrganizerRegistrationDTO, amount: number) => {
        if (amount === stateFor(athlete).amt_paid) return;
        return commit(athlete, "amt_paid", { amt_paid: amount }, `is recorded as having paid $${amount}`);
    };

    if (registrations.length === 0) {
        return <div className="text-sm text-gray-400">No registrations found.</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Paid" value={`${totals.paid} / ${totals.count}`} />
                <Stat label="Proof of enrollment" value={`${totals.proof} / ${totals.count}`} />
                <Stat label="Collected" value={settings.reg_cost_base == null ? "—" : `$${totals.collected}`} />
                <Stat label="Outstanding" value={settings.reg_cost_base == null ? "—" : `$${totals.outstanding}`} />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                    className="cg-input flex-1"
                    placeholder="Search name, email or college"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex gap-1 flex-wrap">
                    {FILTERS.map(({ key, label }) => (
                        <button
                            key={key}
                            className={`btn btn-xs ${filter === key ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {rows.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        Showing {rows.length} of {registrations.length}
                    </span>
                    {/* The filtered view, not the whole year — copying under the
                        "Unpaid" chip is how a chase-up list gets made. Values come
                        from the same overlay the row renders, so a copy taken
                        right after an edit matches what is on screen. */}
                    <CopyButton
                        label="Copy shown"
                        getRows={() => [
                            ["Name", "Email", "College", "Events", "Due", "Paid", "Balance", "Proof", "Competing"],
                            ...rows.map((a) => {
                                const row = stateFor(a);
                                const due = owedFor(a, settings);
                                return [
                                    a.name,
                                    a.email,
                                    a.school ?? "",
                                    String(a.registration.filter((r) => r.event_category !== "G").length),
                                    due == null ? "" : `$${due}`,
                                    `$${row.amt_paid}`,
                                    due == null ? "" : `$${Math.max(0, due - row.amt_paid)}`,
                                    row.proof_of_reg ? "Yes" : "No",
                                    row.is_competing ? "Yes" : "No",
                                ];
                            }),
                        ]}
                    />
                </div>
            )}
            {rows.length === 0 ? (
                <div className="text-sm text-gray-400">No athletes match that search.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {rows.map((athlete) => {
                        const row = stateFor(athlete);
                        const due = owedFor(athlete, settings);
                        const balance = due == null ? null : due - row.amt_paid;
                        const events = athlete.registration.filter((r) => r.event_category !== "G").length;
                        return (
                            <div key={athlete.user_id} className="cg-list-row flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="min-w-0">
                                        <div className="font-medium text-dark truncate">{athlete.name}</div>
                                        <div className="text-xs text-gray-400 truncate">
                                            {athlete.email}
                                            {athlete.school && ` · ${athlete.school}`}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {events} event{events === 1 ? "" : "s"}
                                            {athlete.team && ` · ${athlete.team.team_name}`}
                                            {due != null && <span className="text-dark font-medium"> · ${due} due</span>}
                                            {/* Only the shortfall is worth calling
                                                out; a settled row says so through
                                                the amount box being green. */}
                                            {balance != null && balance > 0 && (
                                                <span className="text-red-600 font-medium"> · ${balance} left</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {/* Remounts on the saved value so the box
                                            shows what the server took, including
                                            the flooring it applies. */}
                                        <AmountInput
                                            key={row.amt_paid}
                                            amount={row.amt_paid}
                                            settled={isPaid(row.amt_paid, due)}
                                            busy={!!saving[`${athlete.user_id}:amt_paid`]}
                                            onCommit={(next) => setAmount(athlete, next)}
                                        />
                                        <ToggleButton
                                            active={row.proof_of_reg}
                                            label={LABELS.proof_of_reg}
                                            busy={!!saving[`${athlete.user_id}:proof_of_reg`]}
                                            onClick={() => toggle(athlete, "proof_of_reg")}
                                        />
                                        <ToggleButton
                                            active={row.is_competing}
                                            label={LABELS.is_competing}
                                            busy={!!saving[`${athlete.user_id}:is_competing`]}
                                            onClick={() => toggle(athlete, "is_competing")}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const LABELS: Record<FlagField, string> = {
    proof_of_reg: "Proof",
    is_competing: "Competing",
};

// [cleared, marked] wording per flag, so the confirmation says what was recorded
// rather than which column moved.
const CONFIRMATIONS: Record<FlagField, [string, string]> = {
    proof_of_reg: ["no longer has proof of enrollment on file", "has proof of enrollment on file"],
    is_competing: ["is marked not competing", "is marked competing"],
};

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-gray-200 rounded-lg px-3 py-2 flex flex-col gap-0.5">
            <span className="cg-eyebrow-muted">{label}</span>
            <span className="text-dark font-medium">{value}</span>
        </div>
    );
}

// What has been received, in whole dollars. Commits on blur and Enter rather than per keystroke
// (typing "120" would save 1, 12, 120); Escape abandons. Green once the competitor is settled.
function AmountInput({
    amount,
    settled,
    busy,
    onCommit,
}: {
    amount: number;
    settled: boolean;
    busy: boolean;
    onCommit: (next: number) => void;
}) {
    const [text, setText] = useState(String(amount));

    const commit = () => {
        const next = Math.max(0, Math.round(Number(text)));
        // A box left blank or holding something unparseable is a slip, not an
        // instruction to zero the payment out.
        if (text.trim() === "" || Number.isNaN(next)) {
            setText(String(amount));
            return;
        }
        setText(String(next));
        onCommit(next);
    };

    return (
        <label
            className={`text-xs pl-2 pr-1 py-1 rounded-full font-medium border inline-flex items-center gap-1 ${
                settled
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
            }`}
        >
            <span className="w-4 h-4 inline-flex items-center justify-center">
                {busy ? <span className="loading loading-spinner loading-xs" /> : "$"}
            </span>
            <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                aria-label="Amount paid"
                disabled={busy}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                        setText(String(amount));
                        e.currentTarget.blur();
                    }
                }}
                className="w-14 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
        </label>
    );
}

// A flag reads as a badge and clicks as a switch: the same green/grey the
// read-only registration list uses, so the two views agree at a glance.
function ToggleButton({
    active,
    label,
    busy,
    onClick,
}: {
    active: boolean;
    label: string;
    busy: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            disabled={busy}
            onClick={onClick}
            className={`text-xs px-2 py-1 rounded-full font-medium border transition-colors inline-flex items-center gap-1 ${
                active
                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                    : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
            }`}
        >
            {/* The spinner takes the ✓/○ slot rather than replacing the whole
                badge, so the row keeps its width and the label stays readable
                while the save is in flight. Fixed-width so nothing shifts. */}
            <span className="w-4 h-4 inline-flex items-center justify-center">
                {busy ? <span className="loading loading-spinner loading-xs" /> : active ? "✓" : "○"}
            </span>
            {label}
        </button>
    );
}
