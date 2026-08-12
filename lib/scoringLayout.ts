// The shape of a scoring tab: which column holds what, and what the tabs are called. Shared
// because the builder writes them and the live page reads them back — both must move together.

export const INDIVIDUAL_JUDGES = 5;
export const GROUPSET_PANEL = 3;

// A team fielding other than six members carries one point per member
// (GroupSetRules.tsx I).
export const GROUPSET_TEAM_SIZE = 6;

// A re-score is called when the spread between the highest and lowest raw scores
// reaches this (AllIndividual.tsx IV.B).
export const RESCORE_SPREAD = 0.7;

// Column indices. Every formula the builder writes addresses its siblings through
// these, and the reader pulls its values out by the same names.
export const IND = {
  number: 0,
  name: 1,
  team: 2,
  firstJudge: 3,
  high: 3 + INDIVIDUAL_JUDGES,
  low: 4 + INDIVIDUAL_JUDGES,
  rescore: 5 + INDIVIDUAL_JUDGES,
  merited: 6 + INDIVIDUAL_JUDGES,
  chiefDeduction: 7 + INDIVIDUAL_JUDGES,
  final: 8 + INDIVIDUAL_JUDGES,
  place: 9 + INDIVIDUAL_JUDGES,
} as const;

export const GRP = {
  number: 0,
  team: 1,
  size: 2,
  members: 3,
  firstTechnical: 4,
  firstCoordination: 4 + GROUPSET_PANEL,
  firstPerformance: 4 + GROUPSET_PANEL * 2,
  technical: 4 + GROUPSET_PANEL * 3,
  coordination: 5 + GROUPSET_PANEL * 3,
  performance: 6 + GROUPSET_PANEL * 3,
  sizeDeduction: 7 + GROUPSET_PANEL * 3,
  otherDeduction: 8 + GROUPSET_PANEL * 3,
  final: 9 + GROUPSET_PANEL * 3,
  place: 10 + GROUPSET_PANEL * 3,
} as const;

const numbered = (label: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `${label}${i + 1}`);

export const INDIVIDUAL_HEADER: string[] = [
  "#", "Name", "Team",
  ...numbered("J", INDIVIDUAL_JUDGES),
  "High", "Low", "Re-score?", "Merited", "CJ Ded", "Final", "Place",
];

export const GROUPSET_HEADER: string[] = [
  "#", "Team", "Size", "Members",
  ...numbered("Tech J", GROUPSET_PANEL),
  ...numbered("Coord J", GROUPSET_PANEL),
  ...numbered("Perf J", GROUPSET_PANEL),
  "Tech /4", "Coord /3", "Perf /3", "Size Ded", "Other Ded", "Final", "Place",
];

// The group set's three subscores in column order, with the maximum each is judged out of — the
// reader labels them from here, so the page can't disagree with the sheet about what a 3.5 was.
export const GROUPSET_SUBSCORES = [
  { label: "Technical", column: GRP.technical, max: 4 },
  { label: "Coordination", column: GRP.coordination, max: 3 },
  { label: "Performance", column: GRP.performance, max: 3 },
] as const;

// The marker the reader finds a block by. Every block starts with this header row,
// and the row above it is the event's title.
export const BLOCK_MARKER = INDIVIDUAL_HEADER[0]; // "#"

// Which kind of block a header row belongs to. Read off the header itself rather
// than the block title, because the title is free text an organizer may edit.
export const isGroupsetHeader = (row: readonly unknown[]): boolean =>
  row[GRP.team] === GROUPSET_HEADER[GRP.team] && row[GRP.size] === GROUPSET_HEADER[GRP.size];

export const RING_KEYS = ["ring1", "ring2", "ring3"] as const;

export type ScoringRingKey = (typeof RING_KEYS)[number];

export const RING_LABEL: Record<ScoringRingKey, string> = {
  ring1: "Ring 1",
  ring2: "Ring 2",
  ring3: "Ring 3",
};

// Prefixed so scoring tabs sort apart from the event-order tabs, and stamped with the year so a
// later competition lands beside this one. A function, since the reader rebuilds these names.
export const scoringTabTitle = (ring: ScoringRingKey, year?: number | null): string =>
  year ? `Scoring ${RING_LABEL[ring]} ${year}` : `Scoring ${RING_LABEL[ring]}`;
