/**
 * Pacific-anchored parsing and formatting for the competition's date settings.
 *
 * @remarks
 * Every date an organizer types is a **calendar day in the competition's own
 * time zone**, not an instant. Writes anchor to `America/Los_Angeles` and reads
 * format in it, so a date always displays as the day that was typed.
 *
 * The bug this module exists to prevent: `new Date("2026-08-02")` is parsed as
 * UTC midnight, which renders as August 1 anywhere west of Greenwich. Deadlines
 * then fire a day early for the people they apply to.
 *
 * @packageDocumentation
 */

/** The competition's time zone. All settings dates are calendar days in it. */
export const PACIFIC_TZ = "America/Los_Angeles";

/** The Settings columns that hold a date, and the only keys these helpers accept. */
export type SettingsDateField =
  | "early_reg_start"
  | "reg_start"
  | "reg_end"
  | "due_date"
  | "comp_date";

// Postgres `date` columns: no time, no zone. Prisma reads and writes them as UTC
// midnight, so a Pacific offset would push the stored day forward.
const CALENDAR_FIELDS = new Set<SettingsDateField>(["due_date", "comp_date"]);

// reg_end is a deadline, not a start: entering Aug 2 should keep registration
// open through the end of Aug 2 Pacific, not close it as Aug 2 begins.
const END_OF_DAY_FIELDS = new Set<SettingsDateField>(["reg_end"]);

const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "short",
  day: "numeric",
};

const MS_PER_DAY = 86_400_000;

// How far `timeZone` sits from UTC at `instant`, in ms. Reading the wall clock there and
// re-interpreting it as UTC gives the offset, so Intl handles DST rather than this file.
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const at = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(at("year"), at("month") - 1, at("day"), at("hour") % 24, at("minute"), at("second"));
  // The wall-clock reading has no sub-second part; drop it from both sides.
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

// The instant a Pacific calendar day begins, or its last millisecond. Guess the wall clock is UTC,
// then step back by the offset; the second pass only matters across a DST transition.
function pacificInstant(day: string, endOfDay: boolean): Date {
  const asUTC = Date.parse(`${day}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(asUTC)) return new Date(NaN);
  const guess = new Date(asUTC - zoneOffsetMs(new Date(asUTC), PACIFIC_TZ));
  return new Date(asUTC - zoneOffsetMs(guess, PACIFIC_TZ));
}

// Which clock a stored value should be read on. Rows written before dates were Pacific-anchored
// sit on exact UTC midnight, which a Pacific write never produces; saving the row re-anchors it.
function readZone(field: SettingsDateField, date: Date): string {
  if (CALENDAR_FIELDS.has(field)) return "UTC";
  return date.getTime() % MS_PER_DAY === 0 ? "UTC" : PACIFIC_TZ;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Converts a `yyyy-mm-dd` form value into the instant to store.
 *
 * @remarks
 * The anchoring depends on the field:
 *
 * - `due_date` and `comp_date` are Postgres `date` columns, so they are stored
 *   as UTC midnight — giving them an offset would move the stored day.
 * - `reg_end` is a deadline, so it is stored as the *last millisecond* of the
 *   Pacific day. Typing Aug 2 keeps registration open through Aug 2.
 * - Everything else is stored as the first instant of the Pacific day.
 *
 * @param field - Which settings column the value is destined for.
 * @param value - A `yyyy-mm-dd` string, or blank/null to clear the column.
 * @returns The instant to persist, or `null` for a blank field or an
 * unparseable day. Callers that need to tell those apart should check for a
 * non-empty input first — see `settingsDateErrors`.
 */
export function parseSettingsDate(field: SettingsDateField, value: string | null | undefined): Date | null {
  const day = value?.slice(0, 10);
  if (!day) return null;
  const instant = CALENDAR_FIELDS.has(field)
    ? new Date(`${day}T00:00:00.000Z`)
    : pacificInstant(day, END_OF_DAY_FIELDS.has(field));
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/**
 * Formats a stored settings date for display, on the competition's clock.
 *
 * @param field - Which settings column the value came from; it decides the zone.
 * @param value - The stored instant, an ISO string, or null.
 * @param options - `Intl.DateTimeFormat` options. Defaults to a long form such
 * as "Sunday, Aug 2, 2026".
 * @param fallback - Returned when there is no date. Defaults to `""`.
 */
export function formatSettingsDate(
  field: SettingsDateField,
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = LONG_DATE,
  fallback = "",
): string {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-US", { ...options, timeZone: readZone(field, date) });
}

/**
 * Whether the competition is running today, on its own clock.
 *
 * @remarks
 * Gates competitor access to live scoring, so both sides are reduced to a
 * Pacific `yyyy-mm-dd` before comparing — a UTC comparison would open the page
 * to competitors the evening before.
 *
 * @param compDate - `Settings.comp_date`, or null when no date is set.
 */
export function isCompetitionDay(compDate: Date | string | null | undefined): boolean {
  const day = settingsDateInput("comp_date", compDate);
  if (!day) return false;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return day === today;
}

/**
 * Converts a stored settings date into the `yyyy-mm-dd` an `<input type="date">`
 * expects.
 *
 * @remarks
 * `en-CA` formats ISO-style, so this round-trips with
 * {@link parseSettingsDate}: reading a row into a form and saving it unchanged
 * leaves the stored instant alone.
 *
 * @param field - Which settings column the value came from; it decides the zone.
 * @param value - The stored instant, an ISO string, or null.
 * @returns `yyyy-mm-dd`, or `""` when there is no date.
 */
export function settingsDateInput(field: SettingsDateField, value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: readZone(field, date),
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
