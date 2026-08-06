// Settings dates are Pacific calendar days — writes anchor to that zone and reads format in it,
// so a date shows as the day typed. `new Date("2026-08-02")` is UTC midnight: the old off-by-one.

export const PACIFIC_TZ = "America/Los_Angeles";

// The settings fields that hold a date.
export type SettingsDateField =
  | "early_reg_start"
  | "reg_start"
  | "reg_end"
  | "due_date"
  | "comp_date";

// due_date and comp_date are Postgres `date` columns: no time, no zone. Prisma reads and writes
// them as UTC midnight, so giving them a Pacific offset would push the stored day forward.
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

// How far `timeZone` sits from UTC at `instant`, in ms. Reading the wall clock in that zone and
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

// The instant a Pacific calendar day begins, or its last millisecond.
function pacificInstant(day: string, endOfDay: boolean): Date {
  const asUTC = Date.parse(`${day}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(asUTC)) return new Date(NaN);
  // Guess that the wall clock is UTC, then step back by the Pacific offset. DST switches at 02:00
  // local so neither boundary lands in a gap; the second pass only matters across a transition.
  const guess = new Date(asUTC - zoneOffsetMs(new Date(asUTC), PACIFIC_TZ));
  return new Date(asUTC - zoneOffsetMs(guess, PACIFIC_TZ));
}

// Which clock a stored value should be read on.
function readZone(field: SettingsDateField, date: Date): string {
  if (CALENDAR_FIELDS.has(field)) return "UTC";
  // Rows written before these instants were Pacific-anchored sit on exact UTC midnight, which a
  // Pacific write never produces — read those on the UTC clock; saving the row re-anchors it.
  return date.getTime() % MS_PER_DAY === 0 ? "UTC" : PACIFIC_TZ;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// A yyyy-mm-dd form value -> the instant to store. Returns null for a blank
// field, which is what the nullable columns take.
export function parseSettingsDate(field: SettingsDateField, value: string | null | undefined): Date | null {
  const day = value?.slice(0, 10);
  if (!day) return null;
  const instant = CALENDAR_FIELDS.has(field)
    ? new Date(`${day}T00:00:00.000Z`)
    : pacificInstant(day, END_OF_DAY_FIELDS.has(field));
  return Number.isNaN(instant.getTime()) ? null : instant;
}

// A stored value -> display text on the competition's clock.
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

// Whether the competition is running today, on its own clock. Gates competitor live-scoring, so
// both sides reduce to a Pacific yyyy-mm-dd — a UTC compare would open the page a day early.
export function isCompetitionDay(compDate: Date | string | null | undefined): boolean {
  const day = settingsDateInput("comp_date", compDate);
  if (!day) return false;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return day === today;
}

// A stored value -> the yyyy-mm-dd an <input type="date"> expects. en-CA is
// formatted ISO-style, so this round-trips with parseSettingsDate.
export function settingsDateInput(field: SettingsDateField, value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: readZone(field, date),
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
