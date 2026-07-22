// Single source of truth for session-cache keys, shared by the client-side
// cache-first fetchers (cachedFetchers.ts), the seeding layer (CacheSeed.tsx),
// and the mutation call sites that invalidate entries with clearSessionCache.
// Keeping every key here means a seed, a fetch, and an invalidation can never
// silently drift apart. This module is directive-free so server components can
// import the keys when seeding props into the cache.

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
