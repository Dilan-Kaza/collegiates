// Bridges between the legacy Django codes the DB/DTOs use and the enum member
// names Prisma Client speaks. Translate at the server boundary, both directions.
import type { StudentType, Gender, SkillLevel, EventCategory, WeaponType } from "@prisma/client";

const STUDENT_TYPE_BY_CODE: Record<string, StudentType> = {
  "1": "ClassOne",
  "2": "ClassTwo",
};
const STUDENT_CODE_BY_TYPE: Record<StudentType, string> = {
  ClassOne: "1",
  ClassTwo: "2",
};

// code ("1"/"2" or "") -> StudentType | null, for Prisma writes.
export function toStudentType(code: string | null | undefined): StudentType | null {
  return code ? STUDENT_TYPE_BY_CODE[code] ?? null : null;
}

// StudentType | null -> code ("1"/"2") | null, for the DTOs the UI reads.
export function fromStudentType(value: StudentType | null | undefined): string | null {
  return value ? STUDENT_CODE_BY_TYPE[value] ?? null : null;
}

const GENDER_BY_CODE: Record<string, Gender> = { M: "Male", F: "Female" };
const GENDER_CODE_BY_MEMBER: Record<Gender, string> = { Male: "M", Female: "F" };

// code ("M"/"F" or "") -> Gender | null, for Prisma writes.
export function toGender(code: string | null | undefined): Gender | null {
  return code ? GENDER_BY_CODE[code] ?? null : null;
}

// Gender | null -> code ("M"/"F") | null, for the DTOs the UI reads.
export function fromGender(value: Gender | null | undefined): string | null {
  return value ? GENDER_CODE_BY_MEMBER[value] ?? null : null;
}

const SKILL_LEVEL_BY_CODE: Record<string, SkillLevel> = { B: "Beginner", I: "Intermediate", A: "Advanced" };
const SKILL_LEVEL_CODE_BY_MEMBER: Record<SkillLevel, string> = { Beginner: "B", Intermediate: "I", Advanced: "A" };

// code ("B"/"I"/"A" or "") -> SkillLevel | null, for Prisma writes.
export function toSkillLevel(code: string | null | undefined): SkillLevel | null {
  return code ? SKILL_LEVEL_BY_CODE[code] ?? null : null;
}

// SkillLevel | null -> code ("B"/"I"/"A") | null, for the DTOs the UI reads.
export function fromSkillLevel(value: SkillLevel | null | undefined): string | null {
  return value ? SKILL_LEVEL_CODE_BY_MEMBER[value] ?? null : null;
}

const EVENT_CATEGORY_BY_CODE: Record<string, EventCategory> = { E: "External", I: "Internal", G: "Groupset" };
const EVENT_CATEGORY_CODE_BY_MEMBER: Record<EventCategory, string> = { External: "E", Internal: "I", Groupset: "G" };

// code ("E"/"I"/"G" or "") -> EventCategory | null, for Prisma writes.
export function toEventCategory(code: string | null | undefined): EventCategory | null {
  return code ? EVENT_CATEGORY_BY_CODE[code] ?? null : null;
}

// EventCategory | null -> code ("E"/"I") | null, for the DTOs the UI reads.
export function fromEventCategory(value: EventCategory | null | undefined): string | null {
  return value ? EVENT_CATEGORY_CODE_BY_MEMBER[value] ?? null : null;
}

const WEAPON_TYPE_BY_CODE: Record<string, WeaponType> = { B: "Barehand", S: "Short", L: "Long", O: "Other" };
const WEAPON_TYPE_CODE_BY_MEMBER: Record<WeaponType, string> = { Barehand: "B", Short: "S", Long: "L", Other: "O" };

// code ("B"/"S"/"L"/"O" or "") -> WeaponType | null, for Prisma writes.
export function toWeaponType(code: string | null | undefined): WeaponType | null {
  return code ? WEAPON_TYPE_BY_CODE[code] ?? null : null;
}

// WeaponType | null -> code ("B"/"S"/"L"/"O") | null, for the DTOs the UI reads.
export function fromWeaponType(value: WeaponType | null | undefined): string | null {
  return value ? WEAPON_TYPE_CODE_BY_MEMBER[value] ?? null : null;
}

// Readable names for the "1"/"2" codes the DTOs carry. The single source for
// this wording — both the read-only label below and STUDENT_TYPE_CHOICES.
const STUDENT_TYPE_LABEL_BY_CODE: Record<string, string> = {
  "1": "Class 1",
  "2": "Class 2",
};

// code ("1"/"2") -> display label, for read-only UI. Returns "" for null/blank.
export function studentTypeLabel(code: string | null | undefined): string {
  return code ? STUDENT_TYPE_LABEL_BY_CODE[code] ?? "" : "";
}

// ---------- competitor class eligibility ----------

// The class is self-reported (rules I), so eligibility is read straight off the
// profile. Organizers still verify it from the proof of enrollment — nothing
// here decides the undergraduate 5-for-4 limit.
//
// Class 1 gates the team competition: teams must be made up solely of Class 1
// competitors, so a Class 2 student type cannot create or join a group set.
export function isClassOne(value: StudentType | null | undefined): boolean {
  return value === "ClassOne";
}

// ---------- profile dropdown choices ----------

// Display label -> code, the shape <Dropdown options> takes. One source for every
// profile dropdown, so the competitor-facing profile setup and the organizer's
// registration editor can't drift apart or from the labels used above.
// For gender the Prisma member names double as the display labels, so the
// member -> code map is already exactly this shape.
export const GENDER_CHOICES: Record<string, string> = GENDER_CODE_BY_MEMBER;

// Skill level carries its year range in the label: the level is self-reported and
// the ranges (rules 3.I) are the whole basis for picking one, so they belong in
// the dropdown rather than only in the surrounding help text. Abbreviated to keep
// the <select> from outgrowing its column.
export const SKILL_LEVEL_CHOICES: Record<string, string> = {
  "Beginner (0–1 yrs)": SKILL_LEVEL_CODE_BY_MEMBER.Beginner,
  "Intermediate (1–3 yrs)": SKILL_LEVEL_CODE_BY_MEMBER.Intermediate,
  "Advanced (3+ yrs)": SKILL_LEVEL_CODE_BY_MEMBER.Advanced,
};

// The form restrictions each level carries (rules 3.II), keyed by the codes
// SKILL_LEVEL_CHOICES yields so a form can show the picked level's limits inline.
// Deviating costs 0.3 per occurrence, which is why this belongs next to the choice
// rather than only in the rules page.
export const SKILL_LEVEL_RESTRICTIONS: Record<string, string> = {
  [SKILL_LEVEL_CODE_BY_MEMBER.Beginner]:
    "Linear forms only. No aerials, splits, or other B-level moves. At most two jumping kicks (front, inside or outside crescent), and you may not land on the jumping leg.",
  [SKILL_LEVEL_CODE_BY_MEMBER.Intermediate]:
    "No butterfly twists, aerial twists, or any jumping technique rotating 540° or more.",
  [SKILL_LEVEL_CODE_BY_MEMBER.Advanced]: "No form restrictions.",
};

// Student-type members are terse ("ClassOne"), so their choices come from
// inverting the label map instead — the wording stays in one place.
export const STUDENT_TYPE_CHOICES: Record<string, string> = Object.fromEntries(
  Object.entries(STUDENT_TYPE_LABEL_BY_CODE).map(([code, label]) => [label, code])
);
