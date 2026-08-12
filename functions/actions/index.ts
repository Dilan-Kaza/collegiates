// Barrel for this directory's server actions, grouped by domain. Reads return
// data (null/[] when denied); mutations return { data } or { error }.

export { loginAction, logoutAction, verifySession } from "./auth";
export { checkEmail, registerUser, saveCompetitorProfile, getMe, updateMe, activate, resendActivation, getSharedColleges } from "./account";
export { requestPasswordReset, resetPassword } from "./password-reset";
export { changePassword, requestEmailChange, confirmEmailChange } from "./profile-security";
export {
  getCompetitorEvents, getRegistrations, createRegistrations,
  getMyGroupset, createGroupset, getJoinableGroupsets, joinGroupset,
} from "./competitor";
export { saveSettings, getOrganizerEvents, getSharedSettings } from "./organizer-settings";
export {
  getOrganizerBlogPosts, getBlogPostById, getSharedBlogPosts,
  createBlogPost, updateBlogPost, deleteBlogPost,
} from "./blog";
export {
  getOrganizerRegistrations, getOrganizerRegistration,
  updateOrganizerRegistration, findUserByEmail,
} from "./organizer-registrations";
export {
  getOrganizerGroupsets, getOrganizerGroupset, createOrganizerGroupset,
  updateOrganizerGroupset, deleteOrganizerGroupset,
} from "./organizer-groupsets";
export { getOrganizerOrder, saveOrder, setOrderPublic, getPublicOrder, exportSheetTabs } from "./order";
export { getLiveScores } from "./scoring";
export type { LiveScoresResult, LiveScoresStatus } from "./scoring";
export { createSettings, createSchoolAccount } from "./admin";
// DISABLED 2026-08-02 — Jira bug report. Uncomment when asked to fix that code;
// see the header note in functions/actions/bug-report.ts for the other places.
// export { submitBugReport } from "./bug-report";
// export type { BugReportBody } from "./bug-report";

export type { Mutation, FieldErrors } from "./shared";
