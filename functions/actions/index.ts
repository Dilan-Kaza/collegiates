// Barrel for the server actions in this directory. Consumers keep importing from
// "@functions/actions" unchanged; the individual actions are grouped by domain
// into sibling modules, with shared types/helpers in ./shared.
//
// These re-exports replace the internal /api routes: each is an RPC callable
// directly from client components. Reads return data (or null/[] when
// unauthenticated/forbidden); mutations return { data } on success or { error }
// (a field->message object) on failure.

export { loginAction, logoutAction, verifySession } from "./auth";
export { checkEmail, registerUser, saveCompetitorProfile, getMe, updateMe, deleteMe, activate } from "./account";
export {
  getCompetitorEvents, getRegistrations, createRegistrations,
  getMyGroupset, createGroupset, getJoinableGroupsets, joinGroupset,
} from "./competitor";
export { saveSettings, getOrganizerEvents } from "./organizer-settings";
export {
  getOrganizerBlogPosts, getBlogPostById, createBlogPost, updateBlogPost, deleteBlogPost,
} from "./blog";
export {
  getOrganizerRegistrations, getOrganizerRegistration,
  updateOrganizerRegistration, findUserByEmail,
} from "./organizer-registrations";
export {
  getOrganizerGroupsets, getOrganizerGroupset, createOrganizerGroupset,
  updateOrganizerGroupset, deleteOrganizerGroupset,
} from "./organizer-groupsets";
export { getOrganizerOrder, saveOrder, setOrderPublic, getPublicOrder } from "./order";
export { createSettings, createSchoolAccount } from "./admin";

export type { Mutation, FieldErrors } from "./shared";
