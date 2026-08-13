/**
 * Bridges between the legacy Django codes and Prisma's enum member names.
 *
 * @remarks
 * The database stores single-character codes inherited from Django's
 * `CharField(choices)` — `"M"`, `"A"`, `"G"` and so on. The Prisma schema maps
 * those to readable member names, and Prisma Client reads and writes the
 * **names**. Everything above the database — DTOs, forms, URL parameters, the
 * All-Around scoring — still speaks the **codes**.
 *
 * So every value crosses a translation at the server boundary: `to*` on the way
 * into a Prisma write, `from*` on the way out into a DTO. Nothing between the
 * two layers should be holding the other side's vocabulary.
 *
 * This file also owns the display labels and the dropdown option sets, so the
 * competitor-facing form and the organizer's editor cannot word the same choice
 * differently.
 *
 * @packageDocumentation
 */
import type { StudentType, Gender, SkillLevel, EventCategory, WeaponType } from "@prisma/client";

const STUDENT_TYPE_BY_CODE: Record<string, StudentType> = {
  "1": "ClassOne",
  "2": "ClassTwo",
};
const STUDENT_CODE_BY_TYPE: Record<StudentType, string> = {
  ClassOne: "1",
  ClassTwo: "2",
};

/** Code `"1"`/`"2"` (or blank) to a Prisma `StudentType`, for writes. */
export function toStudentType(code: string | null | undefined): StudentType | null {
  return code ? STUDENT_TYPE_BY_CODE[code] ?? null : null;
}

/** Prisma `StudentType` to code `"1"`/`"2"`, for the DTOs the UI reads. */
export function fromStudentType(value: StudentType | null | undefined): string | null {
  return value ? STUDENT_CODE_BY_TYPE[value] ?? null : null;
}

const GENDER_BY_CODE: Record<string, Gender> = { M: "Male", F: "Female" };
const GENDER_CODE_BY_MEMBER: Record<Gender, string> = { Male: "M", Female: "F" };

/** Code `"M"`/`"F"` (or blank) to a Prisma `Gender`, for writes. */
export function toGender(code: string | null | undefined): Gender | null {
  return code ? GENDER_BY_CODE[code] ?? null : null;
}

/** Prisma `Gender` to code `"M"`/`"F"`, for the DTOs the UI reads. */
export function fromGender(value: Gender | null | undefined): string | null {
  return value ? GENDER_CODE_BY_MEMBER[value] ?? null : null;
}

const SKILL_LEVEL_BY_CODE: Record<string, SkillLevel> = { B: "Beginner", I: "Intermediate", A: "Advanced" };
const SKILL_LEVEL_CODE_BY_MEMBER: Record<SkillLevel, string> = { Beginner: "B", Intermediate: "I", Advanced: "A" };

/** Code `"B"`/`"I"`/`"A"` (or blank) to a Prisma `SkillLevel`, for writes. */
export function toSkillLevel(code: string | null | undefined): SkillLevel | null {
  return code ? SKILL_LEVEL_BY_CODE[code] ?? null : null;
}

/** Prisma `SkillLevel` to code `"B"`/`"I"`/`"A"`, for the DTOs the UI reads. */
export function fromSkillLevel(value: SkillLevel | null | undefined): string | null {
  return value ? SKILL_LEVEL_CODE_BY_MEMBER[value] ?? null : null;
}

const EVENT_CATEGORY_BY_CODE: Record<string, EventCategory> = { E: "External", I: "Internal", G: "Groupset" };
const EVENT_CATEGORY_CODE_BY_MEMBER: Record<EventCategory, string> = { External: "E", Internal: "I", Groupset: "G" };

/** Code `"E"`/`"I"`/`"G"` (or blank) to a Prisma `EventCategory`, for writes. */
export function toEventCategory(code: string | null | undefined): EventCategory | null {
  return code ? EVENT_CATEGORY_BY_CODE[code] ?? null : null;
}

/** Prisma `EventCategory` to code `"E"`/`"I"`/`"G"`, for the DTOs the UI reads. */
export function fromEventCategory(value: EventCategory | null | undefined): string | null {
  return value ? EVENT_CATEGORY_CODE_BY_MEMBER[value] ?? null : null;
}

const WEAPON_TYPE_BY_CODE: Record<string, WeaponType> = { B: "Barehand", S: "Short", L: "Long", O: "Other" };
const WEAPON_TYPE_CODE_BY_MEMBER: Record<WeaponType, string> = { Barehand: "B", Short: "S", Long: "L", Other: "O" };

/** Code `"B"`/`"S"`/`"L"`/`"O"` (or blank) to a Prisma `WeaponType`, for writes. */
export function toWeaponType(code: string | null | undefined): WeaponType | null {
  return code ? WEAPON_TYPE_BY_CODE[code] ?? null : null;
}

/** Prisma `WeaponType` to code `"B"`/`"S"`/`"L"`/`"O"`, for the DTOs the UI reads. */
export function fromWeaponType(value: WeaponType | null | undefined): string | null {
  return value ? WEAPON_TYPE_CODE_BY_MEMBER[value] ?? null : null;
}

// Readable names for the "1"/"2" codes the DTOs carry. The single source for
// this wording — both the read-only label below and STUDENT_TYPE_CHOICES.
const STUDENT_TYPE_LABEL_BY_CODE: Record<string, string> = {
  "1": "Class 1",
  "2": "Class 2",
};

/** Student-type code to its display label. `""` for null or blank. */
export function studentTypeLabel(code: string | null | undefined): string {
  return code ? STUDENT_TYPE_LABEL_BY_CODE[code] ?? "" : "";
}

/**
 * Gender code to its display label. `""` for null or blank.
 *
 * @remarks
 * `Gender` and `SkillLevel` members already read as prose ("Male",
 * "Intermediate"), so their labels expand the code through the enum maps rather
 * than repeating the wording in a second list that could drift.
 */
export function genderLabel(code: string | null | undefined): string {
  return code ? GENDER_BY_CODE[code] ?? "" : "";
}

/** Skill-level code to its display label. `""` for null or blank. */
export function skillLevelLabel(code: string | null | undefined): string {
  return code ? SKILL_LEVEL_BY_CODE[code] ?? "" : "";
}

// ---------- competitor class eligibility ----------

/**
 * Whether a competitor is Class 1.
 *
 * @remarks
 * The class is **self-reported** (rules I), so eligibility reads straight off
 * the profile; organizers verify it separately from proof of enrollment. Class 1
 * gates the team competition — a Class 2 competitor cannot create or join a
 * group set — and, with advanced skill level, the All-Around titles.
 */
export function isClassOne(value: StudentType | null | undefined): boolean {
  return value === "ClassOne";
}

// ---------- profile dropdown choices ----------

/**
 * Gender options as display label → code, the shape `<Dropdown options>` takes.
 *
 * @remarks
 * The single source for every gender picker, so the competitor-facing profile
 * form and the organizer's editor cannot drift apart.
 */
export const GENDER_CHOICES: Record<string, string> = GENDER_CODE_BY_MEMBER;

/**
 * Skill-level options as display label → code.
 *
 * @remarks
 * The labels carry their year ranges (rules 3.I) because the level is
 * self-reported and those ranges are how a competitor picks one. Abbreviated to
 * fit the `<select>` in its column.
 */
export const SKILL_LEVEL_CHOICES: Record<string, string> = {
  "Beginner (0–1 yrs)": SKILL_LEVEL_CODE_BY_MEMBER.Beginner,
  "Intermediate (1–3 yrs)": SKILL_LEVEL_CODE_BY_MEMBER.Intermediate,
  "Advanced (3+ yrs)": SKILL_LEVEL_CODE_BY_MEMBER.Advanced,
};

/**
 * The form restrictions each skill level carries (rules 3.II), keyed by code.
 *
 * @remarks
 * Keyed by {@link SKILL_LEVEL_CHOICES}' codes so a form can show the picked
 * level's limits inline, at the moment the competitor is choosing. Exceeding
 * them costs 0.3 per occurrence on the day.
 */
export const SKILL_LEVEL_RESTRICTIONS: Record<string, string> = {
  [SKILL_LEVEL_CODE_BY_MEMBER.Beginner]:
    "Linear forms only. No aerials, splits, or other B-level moves. At most two jumping kicks (front, inside or outside crescent), and you may not land on the jumping leg.",
  [SKILL_LEVEL_CODE_BY_MEMBER.Intermediate]:
    "No butterfly twists, aerial twists, or any jumping technique rotating 540° or more.",
  [SKILL_LEVEL_CODE_BY_MEMBER.Advanced]: "No form restrictions.",
};

/**
 * Student-type options as display label → code.
 *
 * @remarks
 * Built by inverting the label map rather than restating the wording, because
 * the Prisma members are terse (`ClassOne`) and unfit for display. The wording
 * therefore lives in exactly one place.
 */
export const STUDENT_TYPE_CHOICES: Record<string, string> = Object.fromEntries(
  Object.entries(STUDENT_TYPE_LABEL_BY_CODE).map(([code, label]) => [label, code])
);
