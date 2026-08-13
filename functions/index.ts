/**
 * The client-side data layer: cache-first fetchers, the cache-key registry, and
 * the action-result helpers.
 *
 * @remarks
 * Import from `"@functions"`. Server-side readers live in
 * {@link "functions/data"}, which is `server-only` and deliberately not
 * re-exported here.
 *
 * @packageDocumentation
 */
export {
  useCachedResource,
  fetchSettings,
  fetchColleges,
  fetchBlogPosts,
  fetchMe,
  fetchCompetitorEvents,
  fetchRegistrations,
  fetchGroupSet,
  fetchJoinableGroupsets,
  fetchBlogPostById,
  fetchPublicOrder,
  fetchOrganizerBlogPosts,
  fetchOrganizerEvents,
  fetchOrganizerRegistrations,
  fetchOrganizerRegistration,
  fetchOrganizerGroupsets,
  fetchOrganizerGroupset,
  fetchOrganizerOrder,
} from "./cachedFetchers";
export { cacheKeys, organizerRegistrationsKey } from "./cacheKeys";
export { errorMessage, runAction } from "./actionErrors";
