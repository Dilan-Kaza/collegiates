// All-Around eligibility, scored exactly as rules 4.I states
// it — see components/rules/AllAround.tsx, which this file has to keep agreeing
// with. Pure and shared: the registration flow scores the events being picked,
// the dashboard scores the ones already registered, so the two can't disagree.
//
// Codes, not Prisma members: everything on this side of the boundary reads the
// DTOs, which carry the legacy "1"/"A"/"E"/"B" codes (see lib/api/enums.ts).

// The fields a title is scored over. Both EventDTO and RegistrationDTO satisfy
// this, which is what lets the picker and the dashboard share the scoring.
export interface AllAroundEvent {
  event_category: string | null;
  weapon_type: string | null;
  is_cq_nq: boolean | null;
}

const isExternal = (e: AllAroundEvent) => e.event_category === "E";
const isInternal = (e: AllAroundEvent) => e.event_category === "I";

// A form is an individual event of either category. The group set ("G") is the
// team competition, not a form, so it fills no requirement — not even the
// external title's open fourth slot.
const isForm = (e: AllAroundEvent) => isExternal(e) || isInternal(e);

const isBarehand = (e: AllAroundEvent) => e.weapon_type === "B";
// Short, Long and Other are all weapons; a null weapon_type is unknown, so it
// counts as neither barehand nor weapon rather than being guessed at.
const isWeapon = (e: AllAroundEvent) => ["S", "L", "O"].includes(e.weapon_type ?? "");

// Read straight off Event.is_cq_nq, which the seed states per row. Nothing else
// about an event identifies the discipline — external + barehand also catches
// Traditional Open Barehand — and a null (an event predating the column) counts
// as "not", rather than being guessed at from the name or code.
const isChangquanOrNanquan = (e: AllAroundEvent) => e.is_cq_nq === true;

interface Requirement {
  label: string;
  matches: (event: AllAroundEvent) => boolean;
  // An "any other form" slot, which any form fills. A title whose only satisfied
  // requirements are wildcards isn't being pursued — see allAroundProgress.
  wildcard?: boolean;
}

interface TitleSpec {
  key: string;
  title: string;
  // In rules order. Each one is filled by a *different* event, which is why the
  // scoring below is a matching rather than a set of independent checks.
  requirements: Requirement[];
}

const TITLES: TitleSpec[] = [
  {
    key: "E",
    // Just the category — the readout is already headed "All-Around", so
    // "External All-Around" under it would say the same thing twice.
    title: "External",
    requirements: [
      { label: "Changquan or Nanquan", matches: isChangquanOrNanquan },
      { label: "An external weapon form", matches: (e) => isExternal(e) && isWeapon(e) },
      { label: "Another external form", matches: isExternal },
      { label: "Any other form", matches: isForm, wildcard: true },
    ],
  },
  {
    key: "I",
    title: "Internal",
    requirements: [
      { label: "An internal bare-hand form", matches: (e) => isInternal(e) && isBarehand(e) },
      { label: "An internal weapon form", matches: (e) => isInternal(e) && isWeapon(e) },
      { label: "Another internal form", matches: isInternal },
    ],
  },
];

export interface RequirementProgress {
  label: string;
  met: boolean;
}

export interface AllAroundTitleProgress {
  // Event-category code the title belongs to ("E"/"I").
  key: string;
  title: string;
  // In rules order, so the checklist reads like the rules page.
  requirements: RequirementProgress[];
  met: number;
  required: number;
  eligible: boolean;
}

// Which requirements the given events can cover at once.
//
// One event cannot fill two requirements ("any other external form not counted
// in 1 and 2"), and the requirements overlap — a straightsword satisfies both
// "an external weapon form" and "another external form" — so filling them
// greedily in order would under-count: the straightsword taken for slot 3 leaves
// slot 2 empty even when a spear is sitting right there. This is a maximum
// bipartite matching, solved with Kuhn's augmenting-path algorithm, so an event
// already assigned gets handed off whenever that frees up a slot for another.
//
// Requirements are tried in rules order and the matching only ever grows, so a
// slot that fills stays filled: what's reported unmet is the loosest set of
// requirements that genuinely can't be covered.
function matchRequirements(requirements: Requirement[], events: AllAroundEvent[]): boolean[] {
  // Event index -> the requirement currently holding it.
  const heldBy: (number | null)[] = events.map(() => null);
  const filled = requirements.map(() => false);

  const augment = (req: number, visited: boolean[]): boolean => {
    for (let e = 0; e < events.length; e++) {
      if (visited[e] || !requirements[req].matches(events[e])) continue;
      visited[e] = true;
      // Free, or its current holder can be re-housed elsewhere.
      const holder = heldBy[e];
      if (holder === null || augment(holder, visited)) {
        heldBy[e] = req;
        return true;
      }
    }
    return false;
  };

  for (let req = 0; req < requirements.length; req++) {
    if (augment(req, events.map(() => false))) filled[req] = true;
  }
  return filled;
}

// Class 1 and advanced skill level are the profile gate (rules 4.I) — the events
// below mean nothing without both.
export function canCompeteForAllAround(
  studentType: string | null | undefined,
  skillLevel: string | null | undefined,
): boolean {
  return studentType === "1" && skillLevel === "A";
}

// One entry per title the competitor is actually working toward, closest first.
//
// A title only shows once one of its own requirements is met: three internal
// events fill the external title's open fourth slot, and reporting that as
// "External All-Around, 1 of 4" would be noise for someone competing internal.
export function allAroundProgress(events: AllAroundEvent[]): AllAroundTitleProgress[] {
  const scored = TITLES.map((spec) => {
    const filled = matchRequirements(spec.requirements, events);
    const met = filled.filter(Boolean).length;
    return {
      pursued: spec.requirements.some((req, i) => filled[i] && !req.wildcard),
      progress: {
        key: spec.key,
        title: spec.title,
        requirements: spec.requirements.map((req, i) => ({ label: req.label, met: filled[i] })),
        met,
        required: spec.requirements.length,
        eligible: met === spec.requirements.length,
      },
    };
  });

  return scored
    .filter((entry) => entry.pursued)
    .map((entry) => entry.progress)
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.met - a.met);
}

// Whether a title is already locked in, for callers that only need the yes/no.
export function isAllAroundEligible(
  studentType: string | null | undefined,
  skillLevel: string | null | undefined,
  events: AllAroundEvent[],
): boolean {
  return (
    canCompeteForAllAround(studentType, skillLevel) &&
    allAroundProgress(events).some((progress) => progress.eligible)
  );
}
