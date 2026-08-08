"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveScores } from "@functions/actions";
import type { LiveScoresResult } from "@functions/actions";
import type { LiveScoreEntry, LiveScoreEvent, LiveScoresDTO } from "@/lib/api";

// How often the page asks for a fresh read. Longer than the server's cache window
// (functions/data.ts LIVE_SCORES_TTL) on purpose: polling faster only spends invocations.
const POLL_MS = 25_000;

const score = (value: number | null): string => (value === null ? "—" : value.toFixed(2));

// A place is only meaningful once the entry has a final score; RANK over a column with
// blanks in it would otherwise read as a provisional standing.
function Place({ entry }: { entry: LiveScoreEntry }) {
  if (entry.final === null || entry.place === null) return <span className="text-gray-300">—</span>;
  return (
    <span className={entry.place <= 3 ? "font-semibold text-primary" : "text-gray-600"}>
      {entry.place}
    </span>
  );
}

function EntryTable({
  event,
  entries,
  detail,
}: {
  event: LiveScoreEvent;
  entries: LiveScoreEntry[];
  detail: boolean;
}) {
  // Ordered by place once scores exist, so the block reads as results. Unscored entries keep
  // their running order below, which is also the order they will compete in.
  const ordered = [...entries].sort((a, b) => {
    if (a.place !== null && b.place !== null) return a.place - b.place;
    if (a.place !== null) return -1;
    if (b.place !== null) return 1;
    return a.position - b.position;
  });
  // One source for both header and cells, so their column counts cannot disagree. Read off the
  // first entry that has them, which keeps the labels the ones lib/scoringLayout defined.
  const subscores = event.is_groupset ? ordered.find((e) => e.subscores)?.subscores ?? [] : [];

  return (
    // Wide on a phone even without the judge columns, so the table scrolls inside its
    // own box rather than the page scrolling sideways.
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/60 text-xs text-gray-500">
          <tr>
            <th className="text-left font-medium px-3 py-2 w-10">Pl</th>
            <th className="text-left font-medium px-3 py-2">{event.is_groupset ? "Team" : "Name"}</th>
            <th className="text-left font-medium px-3 py-2">{event.is_groupset ? "Members" : "Team"}</th>
            {subscores.map((s) => (
              <th key={s.label} className="text-right font-medium px-3 py-2 whitespace-nowrap">
                {s.label} /{s.max}
              </th>
            ))}
            {detail && !event.is_groupset && (
              <>
                <th className="text-right font-medium px-3 py-2">Merited</th>
                <th className="text-right font-medium px-3 py-2">Ded</th>
              </>
            )}
            {detail && event.is_groupset && <th className="text-right font-medium px-3 py-2">Ded</th>}
            <th className="text-right font-medium px-3 py-2">Final</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((entry) => (
            <tr key={`${entry.position}-${entry.name}`} className="border-t border-gray-100">
              <td className="px-3 py-2"><Place entry={entry} /></td>
              <td className="px-3 py-2 text-dark">
                {entry.name || <span className="text-gray-300">—</span>}
                {/* Organizers only: an instruction to the Chief Judge, not a result. */}
                {entry.rescore && (
                  <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    re-score
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-gray-500 text-xs max-w-[16rem] truncate">
                {entry.affiliation ?? ""}
                {entry.size !== null && entry.size !== 6 && (
                  <span className="ml-2 text-amber-700">{entry.size} members</span>
                )}
              </td>
              {/* Positional against the same list the header used, so an entry missing
                  a subscore shows a dash rather than shifting every column after it. */}
              {subscores.map((s, i) => (
                <td key={s.label} className="px-3 py-2 text-right text-gray-600 tabular-nums">
                  {score(entry.subscores?.[i]?.value ?? null)}
                </td>
              ))}
              {detail && !event.is_groupset && (
                <>
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">{score(entry.merited)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                    {entry.deduction ? entry.deduction.toFixed(2) : "—"}
                  </td>
                </>
              )}
              {detail && event.is_groupset && (
                <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                  {entry.deduction ? entry.deduction.toFixed(2) : "—"}
                </td>
              )}
              <td className="px-3 py-2 text-right font-semibold text-dark tabular-nums">
                {score(entry.final)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// `initial` is read on the server so first paint already lists every event with its progress
// — the page is opened mid-competition. It carries no rows, since nothing is expanded yet.
export default function LiveScores({ initial }: { initial: LiveScoresDTO }) {
  const [summary, setSummary] = useState(initial);
  // Rows for the blocks that have been expanded at least once, kept after collapsing so
  // reopening one is instant rather than a round trip.
  const [rows, setRows] = useState<Record<string, LiveScoreEntry[]>>({});
  // One block at a time: opening another closes the current one, so a poll never asks
  // for more than a single event's rows.
  const [open, setOpen] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  // The poll reads the open block through a ref so changing it does not tear down and
  // rebuild the interval on every toggle.
  const openRef = useRef(open);
  openRef.current = open;
  // Guards against two polls overlapping on a slow connection, which would let an older
  // response land after a newer one.
  const inFlight = useRef(false);

  const refresh = useCallback(async (key: string | null) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      // Null asks for headers only, which is a few KB and still refreshes every event's
      // scored count.
      const res: LiveScoresResult = await getLiveScores(key);
      // A poll that comes back denied or empty leaves the screen alone: the competition ending, or
      // a transient Sheets failure, must not blank results someone is reading — only mark them stale.
      if (res.status !== "ok" || !res.scores) {
        setStale(true);
        return;
      }
      const scores = res.scores;
      setSummary({ ...scores, fetched_at: new Date(scores.fetched_at) });
      setRows((prev) => {
        const next = { ...prev };
        for (const ring of scores.rings) {
          // Only the blocks this response actually carried; the rest came back as
          // headers and must not overwrite rows already held for them.
          for (const event of ring.events) if (event.loaded) next[event.key] = event.entries;
        }
        return next;
      });
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Expanding fetches that block straight away — the click is the request. Collapsing needs no
  // read at all, and drops the block from every poll that follows.
  const toggle = (key: string) => {
    const next = open === key ? null : key;
    setOpen(next);
    if (next) refresh(next);
  };

  useEffect(() => {
    // Polling a hidden tab spends invocations on a page nobody is looking at. Resume with an
    // immediate read, since the screen is by then as old as the tab was hidden.
    const poll = () => {
      if (document.visibilityState === "visible") refresh(openRef.current);
    };
    document.addEventListener("visibilitychange", poll);
    const id = setInterval(poll, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", poll);
      clearInterval(id);
    };
  }, [refresh]);

  const total = summary.rings.reduce((n, ring) => n + ring.events.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-400">
          {stale ? "Reconnecting — showing the last result" : "Updated"}{" "}
          {summary.fetched_at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
        {summary.detail && (
          <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
            Organizer view
          </span>
        )}
        <button className="btn btn-ghost btn-xs ml-auto" onClick={() => refresh(open)}>
          Refresh
        </button>
      </div>

      {total === 0 && <div className="text-sm text-gray-400">No events have been scored yet.</div>}

      {summary.rings.map((ring) => (
        <div key={ring.label} className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-primary">{ring.label}</div>

          {ring.events.map((event) => {
            const expanded = open === event.key;
            const entries = rows[event.key];
            const complete = event.entry_count > 0 && event.scored === event.entry_count;

            return (
              <div key={event.key} className="bg-off-white rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggle(event.key)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-primary font-semibold hover:bg-gray-100 transition-colors"
                >
                  <span className="text-left">{event.event}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-normal ${complete ? "text-green-700" : "text-gray-400"}`}>
                      {complete ? "Complete" : `${event.scored} of ${event.entry_count} scored`}
                    </span>
                    <span className="text-sm">{expanded ? "▾" : "▸"}</span>
                  </span>
                </button>

                {expanded && (
                  entries
                    ? <EntryTable event={event} entries={entries} detail={summary.detail} />
                    // Only shows on the very first expand of a block; after that its
                    // rows are held and reopening renders immediately.
                    : <div className="px-4 py-3 text-xs text-gray-400">Loading scores…</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
