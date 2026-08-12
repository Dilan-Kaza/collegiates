// Scoring tabs -> live results, the inverse of scoringExport.ts over the same lib/scoringLayout.
// Does no arithmetic — every derived number is already a Sheets formula. Pure, no Prisma/Sheets.

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

// One tab. Blocks are found by their header row rather than by counting rows from the top, so a
// note or spare row inserted between blocks doesn't shift everything below out of alignment.
export function parseScoringTab(label: string, rows: Row[]): LiveScoreRing {
  const events: LiveScoreEvent[] = [];
  // Two blocks in one ring can carry the same title — nothing stops an event being listed twice —
  // and the key must stay unique. Counted per title so the first occurrence keeps the clean key.
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

// Keep the rows only for the one block the viewer has open, dropping every other event to its
// header. That bounds a poll to one event's rows; `null` keeps nothing, which is first paint.
export function onlyOpen(rings: LiveScoreRing[], open: string | null): LiveScoreRing[] {
  return rings.map((ring) => ({
    ...ring,
    events: ring.events.map((event) =>
      event.key === open ? event : { ...event, entries: [], loaded: false },
    ),
  }));
}

// Judge-by-judge scores and deductions are the panel's working numbers, not a result. Stripped
// here rather than hidden in the UI, so the detail never reaches a browser without the rights.
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
