/**
 * Turns scoring-sheet tabs into live results.
 *
 * @remarks
 * The exact inverse of the event builder's scoring export, reading the same
 * column layout from {@link "lib/scoringLayout"}.
 *
 * It does **no arithmetic**. Every derived number — the merited score, the
 * deductions, the final, the placing — is already a formula in the sheet, so
 * nothing here sits between a judge and a number. This module only locates
 * blocks and reads cells.
 *
 * Pure: it touches neither Prisma nor the Sheets API, which is what lets it be
 * called from a cached fetcher without pulling credentials into the cache key.
 *
 * @packageDocumentation
 */

import {
  GRP, GROUPSET_SUBSCORES, GROUPSET_PANEL,
  IND, INDIVIDUAL_JUDGES,
  BLOCK_MARKER, isGroupsetHeader,
} from "./scoringLayout";
import type { LiveScoreEntry, LiveScoreEvent, LiveScoreRing } from "./api";

type Row = readonly (string | number)[];

// The API omits trailing empty cells, so any column past the last filled one in a
// row simply is not there.
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

const range = (row: Row, first: number, count: number): (number | null)[] =>
  Array.from({ length: count }, (_, i) => num(row[first + i]));

// A row belongs to an entry when its "#" column holds the running-order number the builder wrote
// there. Anything else — a blank separator, the next block's title — ends the block.
const isEntryRow = (row: Row): boolean => num(row[IND.number]) !== null;

function individualEntry(row: Row): LiveScoreEntry {
  return {
    position: num(row[IND.number]) ?? 0,
    name: text(row[IND.name]),
    affiliation: text(row[IND.team]) || null,
    judges: range(row, IND.firstJudge, INDIVIDUAL_JUDGES),
    merited: num(row[IND.merited]),
    deduction: num(row[IND.chiefDeduction]),
    final: num(row[IND.final]),
    place: num(row[IND.place]),
    // The builder writes a literal "RE-SCORE" here when the raw spread reaches the
    // threshold; any non-empty value means the Chief Judge has one to call.
    rescore: text(row[IND.rescore]) !== "",
    subscores: null,
    size: null,
  };
}

function groupsetEntry(row: Row): LiveScoreEntry {
  const sizeDeduction = num(row[GRP.sizeDeduction]) ?? 0;
  const otherDeduction = num(row[GRP.otherDeduction]) ?? 0;
  return {
    position: num(row[GRP.number]) ?? 0,
    name: text(row[GRP.team]),
    affiliation: text(row[GRP.members]) || null,
    // Three panels of three, flattened in column order — the page shows them per
    // subscore, but a judge column is a judge column.
    judges: [
      ...range(row, GRP.firstTechnical, GROUPSET_PANEL),
      ...range(row, GRP.firstCoordination, GROUPSET_PANEL),
      ...range(row, GRP.firstPerformance, GROUPSET_PANEL),
    ],
    merited: null,
    // The two deduction columns are one number to a reader; they are separate in
    // the sheet only because one is derived and one is typed.
    deduction: sizeDeduction + otherDeduction || null,
    final: num(row[GRP.final]),
    place: num(row[GRP.place]),
    rescore: false,
    subscores: GROUPSET_SUBSCORES.map((s) => ({
      label: s.label,
      max: s.max,
      value: num(row[s.column]),
    })),
    size: num(row[GRP.size]),
  };
}

/**
 * Parses one ring's scoring tab into its events and entries.
 *
 * @remarks
 * Blocks are located by their header row rather than by counting rows from the
 * top of the tab. Organizers do edit these sheets live — a note, a spare row,
 * a re-ordered event — and row-counting would shift everything below out of
 * alignment the first time they did.
 *
 * Each block's title is the row directly above its header. Two blocks in one
 * ring can legitimately carry the same title, so repeats get a suffixed key;
 * the first occurrence keeps the clean one, which keeps a key stable across
 * re-exports.
 *
 * @param label - The ring's display label, and the first half of every event key.
 * @param rows - The tab's cells as the Sheets API returned them. Trailing empty
 * cells are omitted by the API, so short rows are normal.
 * @returns The ring, with every block fully loaded. Narrow it with
 * {@link onlyOpen} before sending it to a browser.
 */
export function parseScoringTab(label: string, rows: Row[]): LiveScoreRing {
  const events: LiveScoreEvent[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (text(row[0]) !== BLOCK_MARKER) continue;

    const groupset = isGroupsetHeader(row);
    // The block's title is the row above its header. Falling back to the header's
    // own position keeps an untitled block identifiable rather than blank.
    const title = text(rows[i - 1]?.[0]) || `Event at row ${i}`;

    const entries: LiveScoreEntry[] = [];
    let cursor = i + 1;
    while (cursor < rows.length && isEntryRow(rows[cursor] ?? [])) {
      entries.push(groupset ? groupsetEntry(rows[cursor]) : individualEntry(rows[cursor]));
      cursor++;
    }
    // Resume from the row that ended the block, not from inside it.
    i = cursor - 1;

    const repeat = seen.get(title) ?? 0;
    seen.set(title, repeat + 1);

    events.push({
      key: repeat === 0 ? `${label}::${title}` : `${label}::${title}::${repeat}`,
      event: title,
      is_groupset: groupset,
      entries,
      loaded: true,
      entry_count: entries.length,
      scored: entries.filter((e) => e.final !== null).length,
    });
  }

  return { label, events };
}

/**
 * Keeps entry rows only for the one block the viewer has expanded.
 *
 * @remarks
 * Every other event is reduced to its header, which still carries
 * `entry_count` and `scored` so a collapsed row can read "7 of 12 scored".
 * This is what bounds a poll to a single event's rows instead of the whole
 * competition, on a page that refreshes throughout the day.
 *
 * @param rings - Fully loaded rings from {@link parseScoringTab}.
 * @param open - The event key to keep, or `null` to keep none — which is the
 * shape of first paint.
 */
export function onlyOpen(rings: LiveScoreRing[], open: string | null): LiveScoreRing[] {
  return rings.map((ring) => ({
    ...ring,
    events: ring.events.map((event) =>
      event.key === open ? event : { ...event, entries: [], loaded: false },
    ),
  }));
}

/**
 * Strips judge-by-judge numbers, leaving only outcomes.
 *
 * @remarks
 * Individual judges' scores, the merited average, the deductions, and the
 * re-score flag are the panel's working numbers, not a result. Competitors see
 * placings and finals; organizers and admins see everything.
 *
 * Applied on the server, so the detail never reaches a browser that is not
 * entitled to it — hiding those columns in the UI would still ship them in the
 * payload. See `canViewLiveScores` for who gets which.
 *
 * @param rings - Rings to redact, ideally after {@link onlyOpen} has narrowed them.
 */
export function withoutJudgeDetail(rings: LiveScoreRing[]): LiveScoreRing[] {
  return rings.map((ring) => ({
    ...ring,
    events: ring.events.map((event) => ({
      ...event,
      entries: event.entries.map((entry) => ({
        ...entry,
        judges: [],
        merited: null,
        deduction: null,
        rescore: false,
      })),
    })),
  }));
}
