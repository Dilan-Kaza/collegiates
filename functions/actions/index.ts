/**
 * The application's entire read/write surface, grouped by domain.
 *
 * @remarks
 * There are no HTTP route handlers in this app; these server actions replace
 * them. Two conventions hold throughout:
 *
 * - **Reads** return their data directly, and `null` or `[]` for a denied read.
 *   They are not wrapped in try/catch — a database outage should reach
 *   `app/error.tsx`, not render an empty dashboard as though it were correct.
 * - **Mutations** return `{ data }` or `{ error }`, never throw. A thrown error
 *   is useless to the client: Next replaces the message with an opaque digest
 *   and rejects the caller's `await`.
 *
 * Every action is reachable by anyone who can address it, so each authorizes
 * itself — see the `*Gate` helpers in {@link "functions/actions/shared"}.
 *
 * @packageDocumentation
 */

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
// DISABLED 2026-08-02 — Jira bug report. See the header note in bug-report.ts.
// export { submitBugReport } from "./bug-report";
// export type { BugReportBody } from "./bug-report";

export type { Mutation, FieldErrors } from "./shared";
