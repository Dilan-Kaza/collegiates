// The cell vocabulary the Sheets exports are written in: string (literal), number (summable),
// formula (evaluated by Sheets, which is how scoring stays live). Import-free — both sides need it.

export interface FormulaCell {
  formula: string;
}

export type Cell = string | number | FormulaCell;

export interface SheetTabData {
  title: string;
  rows: Cell[][];
}

export const formula = (expression: string): FormulaCell => ({ formula: expression });

// Structural, not instanceof: these cross a server-action boundary and arrive as
// plain deserialized objects.
export const isFormulaCell = (cell: unknown): cell is FormulaCell =>
  typeof cell === "object" && cell !== null && typeof (cell as FormulaCell).formula === "string";

// A1 column label for a zero-based index: 0 -> A, 25 -> Z, 26 -> AA. The scoring formulas address
// sibling cells from the same column constants that lay the header out, so they cannot desync.
export function columnLetter(index: number): string {
  let label = "";
  for (let n = index; n >= 0; n = Math.floor(n / 26) - 1) {
    label = String.fromCharCode(65 + (n % 26)) + label;
  }
  return label;
}
