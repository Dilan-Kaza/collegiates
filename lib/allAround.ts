// All-Around eligibility, scored exactly as rules 4.I states it — keep in step with
// app/rules/_components/AllAround.tsx. Pure and shared; reads DTO codes, not Prisma members.

// The fields a title is scored over. Both EventDTO and RegistrationDTO satisfy
// this, which is what lets the picker and the dashboard share the scoring.
export interface AllAroundEvent {
  event_category: string | null;
  weapon_type: string | null;
  is_cq_nq: boolean | null;
}

const isExternal = (e: AllAroundEvent) => e.event_category === "E";
const isInternal = (e: AllAroundEvent) => e.event_category === "I";

// A form is an individual event of either category. The group set ("G") is the team competition,
// so it fills no requirement — not even the external title's open fourth slot.
const isForm = (e: AllAroundEvent) => isExternal(e) || isInternal(e);

const isBarehand = (e: AllAroundEvent) => e.weapon_type === "B";
// Short, Long and Other are all weapons; a null weapon_type is unknown, so it
// counts as neither barehand nor weapon rather than being guessed at.
const isWeapon = (e: AllAroundEvent) => ["S", "L", "O"].includes(e.weapon_type ?? "");

// Read straight off Event.is_cq_nq, stated per seed row: nothing else identifies the discipline,
// and a null (an event predating the column) counts as "not" rather than being guessed at.
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

// Which requirements the given events can cover at once. The requirements overlap and one event
// can't fill two, so this is a maximum bipartite matching (Kuhn's) — greedy would under-count.
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

// One entry per title the competitor is actually working toward, closest first. A title only
// shows once one of its own requirements is met, so an internal competitor sees no noise.
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
