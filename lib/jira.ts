// ─────────────────────────────────────────────────────────────────────────────
// DISABLED 2026-08-02 — Jira bug-report integration, commented out on request.
// UNCOMMENT THIS WHOLE FILE when asked to fix the Jira bug report code.
// The feature spans four places; re-enable them together:
//   1. lib/jira.ts                     (this file's sibling — Jira REST client)
//   2. functions/actions/bug-report.ts (submitBugReport server action)
//   3. app/contact/BugReportForm.tsx   (the form)
//   4. functions/actions/index.ts      (submitBugReport exports)
//   5. app/contact/page.tsx            (the "Report a Bug" band)
// Also set JIRA_BASE_URL / JIRA_USER_EMAIL / JIRA_API_TOKEN / JIRA_PROJECT_KEY.
// ─────────────────────────────────────────────────────────────────────────────

// // Jira Cloud issue creation for the public bug-report form.
// //
// // Configured entirely through environment variables so the site runs fine with
// // no Jira at all — `jiraConfig()` returns null when the credentials are absent
// // and the caller falls back to logging the report instead of losing it.
// //
// //   JIRA_BASE_URL     https://your-org.atlassian.net   (no trailing slash)
// //   JIRA_USER_EMAIL   the Atlassian account the API token belongs to
// //   JIRA_API_TOKEN    id.atlassian.com/manage-profile/security/api-tokens
// //   JIRA_PROJECT_KEY  e.g. CWC
// //   JIRA_ISSUE_TYPE   optional, defaults to "Bug"
//
// interface JiraConfig {
//   baseUrl: string;
//   email: string;
//   token: string;
//   projectKey: string;
//   issueType: string;
// }
//
// export function jiraConfig(): JiraConfig | null {
//   const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/+$/, "");
//   const email = process.env.JIRA_USER_EMAIL;
//   const token = process.env.JIRA_API_TOKEN;
//   const projectKey = process.env.JIRA_PROJECT_KEY;
//   if (!baseUrl || !email || !token || !projectKey) return null;
//   return { baseUrl, email, token, projectKey, issueType: process.env.JIRA_ISSUE_TYPE || "Bug" };
// }
//
// // Jira's v3 API takes rich text as Atlassian Document Format, not a string.
// // Each line of the report becomes its own paragraph; blank lines are dropped
// // because ADF rejects a paragraph with an empty text node.
// function adf(lines: string[]) {
//   return {
//     type: "doc",
//     version: 1,
//     content: lines
//       .filter((line) => line.trim().length > 0)
//       .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })),
//   };
// }
//
// export interface JiraIssueInput {
//   summary: string;
//   bodyLines: string[];
//   labels?: string[];
// }
//
// // Creates the issue and returns its key (e.g. "CWC-42"). Throws on a non-2xx
// // so the caller's actionError path reports it and logs the Jira response.
// export async function createJiraIssue({
//   summary,
//   bodyLines,
//   labels = [],
// }: JiraIssueInput): Promise<string> {
//   const config = jiraConfig();
//   if (!config) throw new Error("Jira is not configured");
//
//   const auth = Buffer.from(`${config.email}:${config.token}`).toString("base64");
//   const res = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
//     method: "POST",
//     headers: {
//       Authorization: `Basic ${auth}`,
//       "Content-Type": "application/json",
//       Accept: "application/json",
//     },
//     // A form submission must never be served from a cache.
//     cache: "no-store",
//     body: JSON.stringify({
//       fields: {
//         project: { key: config.projectKey },
//         // Jira caps summary at 255 characters and 400s on anything longer.
//         summary: summary.slice(0, 255),
//         description: adf(bodyLines),
//         issuetype: { name: config.issueType },
//         labels,
//       },
//     }),
//   });
//
//   if (!res.ok) {
//     const detail = await res.text().catch(() => "");
//     throw new Error(`Jira responded ${res.status}: ${detail.slice(0, 500)}`);
//   }
//
//   const created = (await res.json()) as { key?: string };
//   return created.key ?? "";
// }
