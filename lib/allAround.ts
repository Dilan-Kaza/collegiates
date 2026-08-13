/**
 * All-Around title eligibility, scored exactly as rules 4.I states it.
 *
 * @remarks
 * There are two titles, External and Internal, each defined by a short list of
 * requirements that must be filled by *different* events. That last constraint
 * is what makes this more than a set of independent checks: a single form can
 * satisfy several requirements on paper, but may only be counted once. See
 * {@link allAroundProgress} for how that is resolved.
 *
 * Keep this in step with `app/rules/_components/AllAround.tsx`, which states the
 * same rules to competitors in prose.
 *
 * Pure and shared, reading DTO codes rather than Prisma enum members, so the
 * event picker and the dashboard score identically.
 *
 * @packageDocumentation
 */

/**
 * The event fields a title is scored over.
 *
 * @remarks
 * Both `EventDTO` and `RegistrationDTO` structurally satisfy this, which is what
 * lets the registration picker (scoring hypothetical selections) and the
 * dashboard (scoring saved registrations) share one implementation.
 */
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

/** One requirement and whether the competitor's events currently fill it. */
export interface RequirementProgress {
  label: string;
  met: boolean;
}

/** A competitor's standing against one All-Around title. */
export interface AllAroundTitleProgress {
  /** The event-category code the title belongs to: `"E"` or `"I"`. */
  key: string;
  title: string;
  /** In rules order, so the rendered checklist reads like the rules page. */
  requirements: RequirementProgress[];
  met: number;
  required: number;
  eligible: boolean;
}

// Which requirements the given events can cover at once. Requirements overlap and one event can't
// fill two, so this is a maximum bipartite matching (Kuhn's) — greedy would under-count.
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

/**
 * The profile-level gate on All-Around titles (rules 4.I).
 *
 * @remarks
 * Class 1 *and* advanced skill level are both required. Without them the events
 * a competitor has entered are irrelevant — no combination qualifies.
 *
 * @param studentType - The DTO code: `"1"` or `"2"`.
 * @param skillLevel - The DTO code: `"B"`, `"I"`, or `"A"`.
 */
export function canCompeteForAllAround(
  studentType: string | null | undefined,
  skillLevel: string | null | undefined,
): boolean {
  return studentType === "1" && skillLevel === "A";
}

/**
 * Scores a set of events against every All-Around title.
 *
 * @remarks
 * Each title's requirements must be filled by *distinct* events, and the
 * requirements overlap heavily — "an external weapon form" and "another
 * external form" both accept the same event. Deciding how many can be filled at
 * once is therefore a maximum bipartite matching, solved with Kuhn's algorithm.
 * A greedy pass would assign an event to the first requirement it fits and
 * under-count titles that were in fact within reach.
 *
 * Only titles the competitor is actually working toward are returned. A title
 * qualifies once one of its **non-wildcard** requirements is met: the External
 * title's fourth slot accepts any form at all, so counting it would show every
 * internal competitor an External checklist they never asked about.
 *
 * @param events - The competitor's events, registered or merely selected.
 * @returns One entry per pursued title, closest to complete first.
 */
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

/**
 * Whether any All-Around title is already locked in.
 *
 * @remarks
 * The yes/no form of {@link canCompeteForAllAround} plus {@link allAroundProgress},
 * for callers that do not render the checklist.
 *
 * @param studentType - The DTO code: `"1"` or `"2"`.
 * @param skillLevel - The DTO code: `"B"`, `"I"`, or `"A"`.
 * @param events - The competitor's events.
 */
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
