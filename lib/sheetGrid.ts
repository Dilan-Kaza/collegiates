/**
 * The cell vocabulary the Google Sheets exports are written in.
 *
 * @remarks
 * A cell is one of three things: a string literal, a number, or a formula that
 * Sheets evaluates. Formulas are what keep scoring live — the export writes the
 * arithmetic rather than its result, so a judge editing a raw score updates the
 * merited score, the deduction, and the placing without another export.
 *
 * Deliberately import-free: the builder, the export actions, and the live-score
 * reader all depend on it.
 *
 * @packageDocumentation
 */

/** A cell holding a Sheets expression, written including its leading `=`. */
export interface FormulaCell {
  formula: string;
}

/** One cell of an exported grid. */
export type Cell = string | number | FormulaCell;

/** One tab of an export: its title and its full grid, top-left anchored. */
export interface SheetTabData {
  title: string;
  rows: Cell[][];
}

/** Wraps a Sheets expression as a {@link FormulaCell}. */
export const formula = (expression: string): FormulaCell => ({ formula: expression });

/**
 * Narrows a cell to a {@link FormulaCell}.
 *
 * @remarks
 * A structural check rather than `instanceof`: these cells cross a server-action
 * boundary and arrive as plain deserialized objects with no prototype of ours.
 */
export const isFormulaCell = (cell: unknown): cell is FormulaCell =>
  typeof cell === "object" && cell !== null && typeof (cell as FormulaCell).formula === "string";

/**
 * The A1 column label for a zero-based index: `0` → `A`, `25` → `Z`, `26` → `AA`.
 *
 * @remarks
 * The scoring formulas address sibling cells using the same column constants
 * that lay the header out (see {@link "lib/scoringLayout"}), so a column can be
 * moved without the formulas drifting out of step with it.
 *
 * @param index - Zero-based column index.
 */
export function columnLetter(index: number): string {
  let label = "";
  for (let n = index; n >= 0; n = Math.floor(n / 26) - 1) {
    label = String.fromCharCode(65 + (n % 26)) + label;
  }
  return label;
}
