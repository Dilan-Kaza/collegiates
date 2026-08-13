/**
 * The registry of `sessionStorage` cache keys.
 *
 * @remarks
 * One source of truth so that a seed, a fetch, and an invalidation cannot drift
 * apart. Deliberately directive-free — no `"use client"` or `"use server"` — so
 * Server Components can import it too.
 *
 * **Every key is wired the same way, and a new one needs all three parts:**
 *
 * 1. a fetcher in {@link "functions/cachedFetchers"},
 * 2. a key here,
 * 3. at least one component binding it with
 *    `useCachedResource(key, fetcher, initial)`.
 *
 * The binding is what seeds the entry from the server's props, reads it, and
 * refills it after a mutation calls `clearSessionCache`. Nothing else ever seeds
 * an entry — so a key no component binds is never written, and clearing it does
 * nothing at all.
 *
 * One key is knowingly in that state: `organizerRegistration`. It has a fetcher
 * and is cleared on save, but nothing binds it, because there is no
 * single-athlete route to bind it in — the edit and payments screens both work
 * off the `organizerRegistrations` list and hold their in-progress edits as
 * local state. Its clears are no-ops. Wire it up if such a route ever lands;
 * drop it, `fetchOrganizerRegistration`, and those clears if one never does.
 *
 * @packageDocumentation
 */

// A fixed order is the point: JSON.stringify follows insertion order, so
// { paid, school } and { school, paid } would otherwise key the same view twice.
const ORGANIZER_REG_FILTERS = ["paid", "proof_of_reg", "is_competing", "school"] as const;

type OrganizerRegFilterKey = (typeof ORGANIZER_REG_FILTERS)[number];

/**
 * The cache key for one filtered organizer-registrations query.
 *
 * @remarks
 * A filtered query is a different result set, so it gets its own entry. Only the
 * unfiltered call — the default organizer view — shares the plain
 * `organizerRegistrations` key, which is the one mutations invalidate.
 *
 * @param filters - The filter values, in any order; they are read in a fixed one.
 * @returns The plain key when no filter is set, otherwise a suffixed variant.
 */
export function organizerRegistrationsKey(
  filters?: Partial<Record<OrganizerRegFilterKey, boolean | string | undefined>>,
): string {
  const signature = ORGANIZER_REG_FILTERS.map((field) => filters?.[field] ?? "").join("|");
  // All-empty means the unfiltered default view, which shares the plain key.
  return signature === "|||"
    ? cacheKeys.organizerRegistrations
    : `${cacheKeys.organizerRegistrations}_${signature}`;
}

/** Every `sessionStorage` cache key. See the module remarks before adding one. */
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
