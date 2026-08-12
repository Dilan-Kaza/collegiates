// Rings -> the judges' scoring sheets. Every derived cell is a Sheets *formula*, so merited
// score, deductions and placement compute live as judges type; see app/rules/_components/ for the rules.

import { groupIntoTeams } from "@/lib/teams";
import { columnLetter, formula } from "@/lib/sheetGrid";
import type { Cell, SheetTabData } from "@/lib/sheetGrid";
import {
  GRP, GROUPSET_HEADER, GROUPSET_PANEL, GROUPSET_TEAM_SIZE,
  IND, INDIVIDUAL_HEADER, INDIVIDUAL_JUDGES,
  RESCORE_SPREAD, RING_KEYS, RING_LABEL, scoringTabTitle,
} from "@/lib/scoringLayout";
import { isEventItem } from "./types";
import type { EventItem, RingEvent, RingKey, Rings } from "./types";

const cell = (column: number, row: number): string => `${columnLetter(column)}${row}`;
const span = (from: number, to: number, row: number): string => `${cell(from, row)}:${cell(to, row)}`;
const down = (column: number, from: number, to: number): string => `${cell(column, from)}:${cell(column, to)}`;

// A deduction column is typed by hand and is usually left empty, so anything that
// reads one has to treat blank as nothing rather than propagate an error.
const orZero = (address: string): string => `IF(ISNUMBER(${address}),${address},0)`;

const blanks = (count: number): Cell[] => Array.from({ length: count }, () => "");

// Padded so every row in a block is the full width of its header — the sheet's
// used range is then the block, not a ragged edge.
const row = (width: number, values: Array<[number, Cell]>): Cell[] => {
  const cells = blanks(width);
  for (const [column, value] of values) cells[column] = value;
  return cells;
};

// The heading over each event's block. Carries what judges need before the first score, which
// for a nandu event is that this block is not the scheme it is judged under.
function blockTitle(event: EventItem, entries: number, unit: string): string {
  const parts = [event.event_name];
  if (event.event_level) parts.push(`(${event.event_level})`);
  parts.push(`— ${entries} ${unit}${entries === 1 ? "" : "s"}`);
  if (event.is_nandu) parts.push("— NANDU: judged under IWUF 2005, add nandu columns");
  return parts.join(" ");
}

// One individual event: a row per competitor, with the five judge columns left
// empty to be typed into and everything right of them derived from them.
function individualBlock(event: EventItem, startRow: number): Cell[][] {
  const width = INDIVIDUAL_HEADER.length;
  const lastJudge = IND.firstJudge + INDIVIDUAL_JUDGES - 1;
  // The block's own final-score column, so RANK places an entry among the
  // competitors it actually competed against rather than the whole ring.
  const firstEntryRow = startRow + 2;
  const lastEntryRow = firstEntryRow + event.competitors.length - 1;
  const finals = down(IND.final, firstEntryRow, lastEntryRow);

  const rows: Cell[][] = [
    [blockTitle(event, event.competitors.length, "entry")],
    [...INDIVIDUAL_HEADER],
  ];

  event.competitors.forEach((competitor, index) => {
    const r = firstEntryRow + index;
    const judges = span(IND.firstJudge, lastJudge, r);
    // Nothing derived shows until the whole panel is in — a partial average read
    // as a score is how a competitor gets placed on three judges.
    const complete = `COUNT(${judges})=${INDIVIDUAL_JUDGES}`;
    const merited = cell(IND.merited, r);
    const final = cell(IND.final, r);

    rows.push(
      row(width, [
        [IND.number, index + 1],
        [IND.name, competitor.name],
        [IND.team, competitor.team?.team_name ?? ""],
        [IND.high, formula(`=IF(${complete},MAX(${judges}),"")`)],
        [IND.low, formula(`=IF(${complete},MIN(${judges}),"")`)],
        [
          IND.rescore,
          formula(`=IF(${complete},IF(MAX(${judges})-MIN(${judges})>=${RESCORE_SPREAD},"RE-SCORE",""),"")`),
        ],
        // Mean of the middle three, truncated rather than rounded.
        [
          IND.merited,
          formula(`=IF(${complete},TRUNC((SUM(${judges})-MAX(${judges})-MIN(${judges}))/3,2),"")`),
        ],
        [IND.final, formula(`=IF(${merited}="","",ROUND(${merited}-${orZero(cell(IND.chiefDeduction, r))},2))`)],
        [IND.place, formula(`=IF(${final}="","",RANK(${final},${finals}))`)],
      ]),
    );
  });

  return rows;
}

// One group set event: a row per team, three panels of three, and the size
// deduction derived from the roster the builder already knows.
function groupsetBlock(event: EventItem, startRow: number): Cell[][] {
  const width = GROUPSET_HEADER.length;
  const teams = groupIntoTeams(event.competitors);
  const firstEntryRow = startRow + 2;
  const lastEntryRow = firstEntryRow + teams.length - 1;
  const finals = down(GRP.final, firstEntryRow, lastEntryRow);

  const rows: Cell[][] = [
    [blockTitle(event, teams.length, "team")],
    [...GROUPSET_HEADER],
  ];

  teams.forEach((team, index) => {
    const r = firstEntryRow + index;
    const panels = [
      { first: GRP.firstTechnical, mean: GRP.technical },
      { first: GRP.firstCoordination, mean: GRP.coordination },
      { first: GRP.firstPerformance, mean: GRP.performance },
    ];
    const means = panels.map(({ mean }) => cell(mean, r));
    const size = cell(GRP.size, r);
    const final = cell(GRP.final, r);

    const values: Array<[number, Cell]> = [
      [GRP.number, index + 1],
      [GRP.team, team.name],
      [GRP.size, team.members.length],
      // An unassigned competitor is a registration problem the organizer has to
      // resolve, so it is flagged in the sheet rather than quietly listed.
      [GRP.members, team.unassigned ? "NO TEAM" : team.members.map((m) => m.name ?? "").join(", ")],
      [
        GRP.sizeDeduction,
        formula(`=IF(${size}="","",ABS(${size}-${GROUPSET_TEAM_SIZE}))`),
      ],
      [
        GRP.final,
        // All three subscores, then both deductions. Same rule as the individual
        // block: an incomplete panel shows nothing rather than a partial total.
        formula(
          `=IF(OR(${means.map((m) => `${m}=""`).join(",")}),"",ROUND(${means.join("+")}-${orZero(
            cell(GRP.sizeDeduction, r),
          )}-${orZero(cell(GRP.otherDeduction, r))},2))`,
        ),
      ],
      [GRP.place, formula(`=IF(${final}="","",RANK(${final},${finals}))`)],
    ];

    for (const { first, mean } of panels) {
      const judges = span(first, first + GROUPSET_PANEL - 1, r);
      values.push([
        mean,
        formula(`=IF(COUNT(${judges})=${GROUPSET_PANEL},ROUND(AVERAGE(${judges}),2),"")`),
      ]);
    }

    rows.push(row(width, values));
  });

  return rows;
}

// One ring's tab: a title line, then a block per event in running order, so the scorekeeper
// works down the tab in the order the ring runs. Breaks are skipped — nothing is scored.
function ringRows(label: string, items: RingEvent[]): Cell[][] {
  const rows: Cell[][] = [[`${label} — Scoring`], []];

  for (const item of items) {
    if (!isEventItem(item)) continue;
    if (item.competitors.length === 0) continue;
    // The block's formulas address absolute rows, so each is built knowing where
    // on the tab it landed.
    const startRow = rows.length + 1;
    const block = item.is_groupset ? groupsetBlock(item, startRow) : individualBlock(item, startRow);
    rows.push(...block, []);
  }

  return rows;
}

// One tab per ring that has anything scoreable in it. Titles come from
// scoringTabTitle, which the live page also calls to know what to read back.
export function buildScoringSheetTabs(rings: Rings, year?: number | null): SheetTabData[] {
  return RING_KEYS
    .map((key) => ({ key, rows: ringRows(RING_LABEL[key], rings[key as RingKey]) }))
    // A ring holding only breaks produces a title and nothing under it.
    .filter(({ rows }) => rows.length > 2)
    .map(({ key, rows }) => ({ title: scoringTabTitle(key, year), rows }));
}
