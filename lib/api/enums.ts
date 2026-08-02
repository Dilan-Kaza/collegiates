// Bridges between the legacy Django codes the DB/DTOs use and the enum member
// names Prisma Client speaks. Translate at the server boundary, both directions.
import type { StudentType, Gender, SkillLevel, EventCategory, WeaponType } from "@prisma/client";

const STUDENT_TYPE_BY_CODE: Record<string, StudentType> = {
  "1": "Undergraduate",
  "2": "FullTimeGraduate",
  "3": "EarlyGraduate",
  "4": "NonEnrolled",
  "5": "OneYearAlumni",
  "6": "PartTimeGraduate",
  "7": "International",
};
const STUDENT_CODE_BY_TYPE: Record<StudentType, string> = {
  Undergraduate: "1",
  FullTimeGraduate: "2",
  EarlyGraduate: "3",
  NonEnrolled: "4",
  OneYearAlumni: "5",
  PartTimeGraduate: "6",
  International: "7",
};

// code ("1"–"7" or "") -> StudentType | null, for Prisma writes.
export function toStudentType(code: string | null | undefined): StudentType | null {
  return code ? STUDENT_TYPE_BY_CODE[code] ?? null : null;
}

// StudentType | null -> code ("1"–"7") | null, for the DTOs the UI reads.
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

const EVENT_CATEGORY_BY_CODE: Record<string, EventCategory> = { E: "External", I: "Internal" };
const EVENT_CATEGORY_CODE_BY_MEMBER: Record<EventCategory, string> = { External: "E", Internal: "I" };

// code ("E"/"I" or "") -> EventCategory | null, for Prisma writes.
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

// Readable names for the "1"–"7" codes the DTOs carry. The single source for
// this wording — both the read-only label below and STUDENT_TYPE_CHOICES.
const STUDENT_TYPE_LABEL_BY_CODE: Record<string, string> = {
  "1": "Full/Part-Time Undergraduate Student",
  "2": "Full-Time Graduate/Professional School Student",
  "3": "Early Graduate Of Current Year",
  "4": "Non-Enrolled Student",
  "5": "One Year Alumni",
  "6": "Part-Time Graduate Student",
  "7": "International Student",
};

// code ("1"–"7") -> display label, for read-only UI. Returns "" for null/blank.
export function studentTypeLabel(code: string | null | undefined): string {
  return code ? STUDENT_TYPE_LABEL_BY_CODE[code] ?? "" : "";
}

// ---------- competitor class eligibility ----------

// Rules I: a competitor is Class 1 only as a current full-time undergraduate or
// graduate student, a current part-time undergraduate working towards a degree,
// or a fall graduate of the current academic year. Everyone else affiliated with
// a North American school is Class 2. The undergraduate 5-for-4 limit is not
// tracked in the profile, so it is not decided here — organizers still verify
// eligibility from the proof of enrollment.
const CLASS_ONE_STUDENT_TYPES: ReadonlySet<StudentType> = new Set<StudentType>([
  "Undergraduate",
  "FullTimeGraduate",
  "EarlyGraduate",
]);

// Class 1 gates the team competition: teams must be made up solely of Class 1
// competitors, so a Class 2 student type cannot create or join a group set.
export function isClassOne(value: StudentType | null | undefined): boolean {
  return !!value && CLASS_ONE_STUDENT_TYPES.has(value);
}

// ---------- profile dropdown choices ----------

// Display label -> code, the shape <Dropdown options> takes. One source for every
// profile dropdown, so the competitor-facing profile setup and the organizer's
// registration editor can't drift apart or from the labels used above.
// For gender and skill level the Prisma member names double as the display
// labels, so the member -> code maps are already exactly this shape.
export const GENDER_CHOICES: Record<string, string> = GENDER_CODE_BY_MEMBER;
export const SKILL_LEVEL_CHOICES: Record<string, string> = SKILL_LEVEL_CODE_BY_MEMBER;

// Student-type members are terse ("Undergraduate"), so their choices come from
// inverting the label map instead — the wording stays in one place.
export const STUDENT_TYPE_CHOICES: Record<string, string> = Object.fromEntries(
  Object.entries(STUDENT_TYPE_LABEL_BY_CODE).map(([code, label]) => [label, code])
);
