/**
 * The shape of a scoring tab: which column holds what, and what the tabs are
 * called.
 *
 * @remarks
 * This is the contract between the two halves of live scoring. The event
 * builder's scoring export *writes* tabs in this layout; {@link "lib/liveScores"}
 * *reads* them back out of it. Neither side can move a column without the other
 * following, which is why every index here is derived rather than typed twice.
 *
 * The judging rules the layout encodes are documented on the rules pages under
 * `app/rules/_components/`; the cross-references below name the section.
 *
 * @packageDocumentation
 */

/** Judges on an individual-event panel. The middle three scores are averaged. */
export const INDIVIDUAL_JUDGES = 5;

/** Judges per group-set criterion (technical, coordination, performance). */
export const GROUPSET_PANEL = 3;

/**
 * The team size a group set is expected to field.
 *
 * @remarks
 * Fielding any other number carries a one-point deduction per missing or extra
 * member (GroupSetRules I).
 */
export const GROUPSET_TEAM_SIZE = 6;

/**
 * The high-to-low spread at which the Chief Judge must call a re-score
 * (AllIndividual IV.B).
 */
export const RESCORE_SPREAD = 0.7;

/**
 * Zero-based column indices for an individual event's block.
 *
 * @remarks
 * Every formula the builder writes addresses its siblings through these names,
 * and the reader pulls values out by the same ones — so the arithmetic in the
 * sheet and the parsing of it cannot disagree about where a number lives.
 */
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

/**
 * Zero-based column indices for a group-set event's block.
 *
 * @remarks
 * Wider than {@link IND}: three judges score each of three criteria, so the
 * per-judge columns run in three panels before the averaged subscores.
 */
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

/** The header row written above every individual-event block, in {@link IND} order. */
export const INDIVIDUAL_HEADER: string[] = [
  "#", "Name", "Team",
  ...numbered("J", INDIVIDUAL_JUDGES),
  "High", "Low", "Re-score?", "Merited", "CJ Ded", "Final", "Place",
];

/** The header row written above every group-set block, in {@link GRP} order. */
export const GROUPSET_HEADER: string[] = [
  "#", "Team", "Size", "Members",
  ...numbered("Tech J", GROUPSET_PANEL),
  ...numbered("Coord J", GROUPSET_PANEL),
  ...numbered("Perf J", GROUPSET_PANEL),
  "Tech /4", "Coord /3", "Perf /3", "Size Ded", "Other Ded", "Final", "Place",
];

/**
 * A group set's three averaged subscores, in column order, each with the maximum
 * it is judged out of.
 *
 * @remarks
 * The live page labels the subscores from here, so it cannot disagree with the
 * sheet about whether a 3.5 was out of 4 or out of 3.
 */
export const GROUPSET_SUBSCORES = [
  { label: "Technical", column: GRP.technical, max: 4 },
  { label: "Coordination", column: GRP.coordination, max: 3 },
  { label: "Performance", column: GRP.performance, max: 3 },
] as const;

/**
 * The `"#"` marker that starts every block's header row.
 *
 * @remarks
 * How the reader finds blocks in a tab: the header row begins with this, and the
 * row directly above it holds the event's title.
 */
export const BLOCK_MARKER = INDIVIDUAL_HEADER[0]; // "#"

/**
 * Whether a header row belongs to a group-set block rather than an individual one.
 *
 * @remarks
 * Decided from the header's own cells, not from the block title, because the
 * title is free text an organizer may rewrite in the sheet.
 *
 * @param row - The candidate header row.
 */
export const isGroupsetHeader = (row: readonly unknown[]): boolean =>
  row[GRP.team] === GROUPSET_HEADER[GRP.team] && row[GRP.size] === GROUPSET_HEADER[GRP.size];

/** The rings a competition runs, in order. One scoring tab is written per ring. */
export const RING_KEYS = ["ring1", "ring2", "ring3"] as const;

/** One of {@link RING_KEYS}. */
export type ScoringRingKey = (typeof RING_KEYS)[number];

/** Display label for each ring, used in tab titles and on the live page. */
export const RING_LABEL: Record<ScoringRingKey, string> = {
  ring1: "Ring 1",
  ring2: "Ring 2",
  ring3: "Ring 3",
};

/**
 * The tab title for one ring's scoring sheet.
 *
 * @remarks
 * Prefixed `Scoring ` so these tabs sort apart from the event-order tabs in the
 * same spreadsheet, and stamped with the year so a later competition lands
 * beside this one rather than over it. Written as a function because the reader
 * rebuilds the names to look tabs up rather than discovering them.
 *
 * @param ring - Which ring.
 * @param year - The competition year. Omitted or null yields an unstamped title.
 */
export const scoringTabTitle = (ring: ScoringRingKey, year?: number | null): string =>
  year ? `Scoring ${RING_LABEL[ring]} ${year}` : `Scoring ${RING_LABEL[ring]}`;
