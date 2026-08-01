// Barrel for this directory's server actions, grouped by domain. Reads return
// data (null/[] when denied); mutations return { data } or { error }.

export { loginAction, logoutAction, verifySession } from "./auth";
export type { SignedInUser } from "./auth";
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
