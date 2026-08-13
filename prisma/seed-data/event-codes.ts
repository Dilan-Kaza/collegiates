// Event choice columns are Prisma enums @mapped to legacy single-char codes, so
// seed rows carry codes and translate here. Local, to keep the seed self-contained.
import type { EventSeed } from "./events.ts";

type SkillLevelMember = "Beginner" | "Intermediate" | "Advanced";
type GenderMember = "Male" | "Female";
type EventCategoryMember = "External" | "Internal" | "Groupset";
type WeaponType = "Barehand" | "Short" | "Long" | "Other";

export const skillLevelByCode: Record<string, SkillLevelMember> = { B: "Beginner", I: "Intermediate", A: "Advanced" };
export const genderByCode: Record<string, GenderMember> = { M: "Male", F: "Female" };

// event_category is the External("E")/Internal("I") split: taiji/internal forms are Internal,
// everything else (longfist, southern, weapons) is External. The team event is Groupset("G").
export function eventCategoryFor(e: EventSeed): EventCategoryMember | null {
  if (e.event_category === "I") return "Internal";
  if (e.event_category === "E") return "External";
  if (e.event_category === "G") return "Groupset";
  return null;
}

// Weapon type per 3-digit discipline suffix of the event_code (the prefix encodes level/gender). A
// suffix with no entry seeds a null weapon_type — how the groupset event ("901") stays weaponless.
export const weaponTypeBySuffix: Record<string, WeaponType> = {
  "101": "Barehand", // Longfist
  "102": "Barehand", // Southern Fist
  "111": "Barehand", // Nandu Longfist
  "112": "Barehand", // Nandu Southern Fist
  "121": "Short",    // Straightsword
  "122": "Short",    // Broadsword
  "123": "Short",    // Southern Broadsword
  "141": "Long",     // Spear
  "142": "Long",     // Staff
  "143": "Long",     // Southern Staff
  "181": "Other",    // Other Weapon
  "201": "Barehand", // Traditional Open Barehand
  "221": "Short",    // Traditional Short Weapon
  "241": "Long",     // Traditional Long Weapon
  "281": "Other",    // Traditional Soft Weapon
  "301": "Barehand", // 42 Fist
  "302": "Short",    // 42 Sword
  "311": "Barehand", // Nandu Taiji Barehand
  "321": "Barehand", // Taiji 24
  "322": "Barehand", // Yang
  "323": "Barehand", // Chen
  "341": "Other",    // Taiji Weapon
  "361": "Barehand", // Internal Open Barehand
  "381": "Other",    // Internal Open Weapon
};
