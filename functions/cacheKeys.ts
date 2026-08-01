// Single source of truth for session-cache keys, so a seed, a fetch, and an
// invalidation can't drift. Directive-free so server components can import it.

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
