// Single source of truth for session-cache keys, so a seed, a fetch, and an
// invalidation can't drift. Directive-free so server components can import it.

// Every key below is wired the same way, and a new one is only added with all three parts in
// place: a fetcher in cachedFetchers.ts, and at least one component binding it with
// useCachedResource(key, fetcher, initial) — which is what seeds the entry from the server's
// props, reads it, and refills it after a mutation calls clearSessionCache. Nothing seeds an
// entry except a binding, so a key nothing binds is never written and clearing it does nothing.
//
// One exception, `organizerRegistration` below: it has a fetcher and is cleared on save, but no
// component binds it, because there is no per-athlete view to bind it in — the edit and payments
// screens both work off the `organizerRegistrations` list and own their in-progress edits as
// local state. Its clears are no-ops. Wire it up if a single-athlete route ever lands; drop it
// with fetchOrganizerRegistration and those clears if one never does.

// The filter fields getOrganizerRegistrations accepts, in a fixed order. The order is the point:
// JSON.stringify follows insertion order, so { paid, school } and { school, paid } keyed twice.
const ORGANIZER_REG_FILTERS = ["paid", "proof_of_reg", "is_competing", "school"] as const;

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
