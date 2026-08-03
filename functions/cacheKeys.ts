// Single source of truth for session-cache keys, so a seed, a fetch, and an
// invalidation can't drift. Directive-free so server components can import it.

// The filter fields getOrganizerRegistrations accepts, in a fixed order. The
// order is the point: JSON.stringify follows insertion order, so the same query
// written { has_paid, school } and { school, has_paid } produced two different
// keys — and two copies of one result set — before this listed them explicitly.
const ORGANIZER_REG_FILTERS = ["has_paid", "proof_of_reg", "is_competing", "school"] as const;

type OrganizerRegFilterKey = (typeof ORGANIZER_REG_FILTERS)[number];

export function organizerRegistrationsKey(
  filters?: Partial<Record<OrganizerRegFilterKey, boolean | string | undefined>>,
): string {
  const signature = ORGANIZER_REG_FILTERS.map((field) => filters?.[field] ?? "").join("|");
  // All-empty means the unfiltered default view, which shares the plain key.
  return signature === "|||"
    ? cacheKeys.organizerRegistrations
    : `${cacheKeys.organizerRegistrations}_${signature}`;
}

export const cacheKeys = {
  // Public / competitor data
  currentUser: "currentUser",
  settings: "settings",
  blogPosts: "blogPosts",
  colleges: "colleges",
  groupSet: "groupSet",
  joinableGroupsets: "joinableGroupsets",
  competitorEvents: "competitorEvents",
  registrations: "registrations",
  publicOrder: "publicOrder",
  blogPost: (blogId: string) => `blogPost_${blogId}`,

  // Organizer data
  organizerRegistrations: "organizerRegistrations",
  organizerRegistration: (uuid: string) => `organizerRegistration_${uuid}`,
  organizerEvents: "organizerEvents",
  organizerGroupsets: "organizerGroupsets",
  organizerGroupset: (uuid: string) => `groupset_${uuid}`,
  organizerBlogPosts: "organizerBlogPosts",
  organizerOrder: "organizerOrder",
} as const;
