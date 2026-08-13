// DISABLED 2026-08-02 — Jira bug reports. Re-enable together: lib/jira.ts,
// functions/actions/{bug-report,index}.ts, app/contact/{BugReportForm,page}.tsx; set JIRA_* env.

// "use server";
//
// // Public bug-report form -> Jira issue. Unauthenticated by design (a broken
// // sign-in is exactly the kind of thing people need to report), so it is guarded
// // by a length cap, a honeypot field, and a per-IP rate limit rather than a
// // session check.
//
// import { headers } from "next/headers";
// import { createJiraIssue, jiraConfig } from "@/lib/jira";
// import { actionError } from "./shared";
// import type { Mutation } from "./shared";
//
// export interface BugReportBody {
//   summary?: string;
//   description?: string;
//   email?: string;
//   page?: string;
//   // Hidden input no human fills in; a bot that autofills every field trips it.
//   website?: string;
// }
//
// const MAX = { summary: 200, description: 5000, email: 200, page: 300 };
//
// // Per-IP throttle. Process-local, so it resets on deploy and is not shared
// // across instances — enough to stop a stuck submit button or a naive script
// // from flooding the Jira project, not a substitute for a real WAF.
// const WINDOW_MS = 10 * 60 * 1000;
// const MAX_PER_WINDOW = 5;
// const hits = new Map<string, number[]>();
//
// function rateLimited(ip: string): boolean {
//   const now = Date.now();
//   const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
//   // Drop the key entirely when nothing is left so the map cannot grow forever.
//   if (recent.length === 0) hits.delete(ip);
//   if (recent.length >= MAX_PER_WINDOW) {
//     hits.set(ip, recent);
//     return true;
//   }
//   recent.push(now);
//   hits.set(ip, recent);
//   return false;
// }
//
// export async function submitBugReport(body: BugReportBody): Promise<Mutation<{ key: string }>> {
//   const summary = (body?.summary ?? "").trim();
//   const description = (body?.description ?? "").trim();
//   const email = (body?.email ?? "").trim();
//   const page = (body?.page ?? "").trim();
//
//   // A filled honeypot is a bot. Report success so it has nothing to tune against.
//   if ((body?.website ?? "").trim()) return { data: { key: "" } };
//
//   if (!summary) return { error: { summary: "Please give the problem a short title." } };
//   if (!description) return { error: { description: "Please describe what went wrong." } };
//   if (summary.length > MAX.summary) {
//     return { error: { summary: `Keep the title under ${MAX.summary} characters.` } };
//   }
//   if (description.length > MAX.description) {
//     return { error: { description: `Keep the description under ${MAX.description} characters.` } };
//   }
//   if (email && !/\S+@\S+\.\S+/.test(email)) {
//     return { error: { email: "That email address does not look valid." } };
//   }
//
//   const headerList = await headers();
//   const ip =
//     headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
//     headerList.get("x-real-ip") ||
//     "unknown";
//   if (rateLimited(ip)) {
//     return { error: { detail: "Too many reports from this connection. Please try again later." } };
//   }
//
//   const bodyLines = [
//     description.slice(0, MAX.description),
//     "",
//     `Reported from: ${page.slice(0, MAX.page) || "unknown"}`,
//     `Reporter email: ${email.slice(0, MAX.email) || "not provided"}`,
//     `User agent: ${(headerList.get("user-agent") ?? "unknown").slice(0, 300)}`,
//   ];
//
//   // With no Jira credentials the report would otherwise vanish, and the
//   // reporter would have been told it was filed. Log it and say so plainly.
//   if (!jiraConfig()) {
//     console.warn("[bug-report] Jira not configured; report not filed:", { summary, bodyLines });
//     return {
//       error: {
//         detail:
//           "Bug reporting is not connected yet. Please email collegiatewushucommittee@gmail.com instead.",
//       },
//     };
//   }
//
//   try {
//     const key = await createJiraIssue({
//       summary,
//       bodyLines,
//       labels: ["website", "bug-report"],
//     });
//     return { data: { key } };
//   } catch (err) {
//     return { error: actionError("submitBugReport", err, "Could not file your report. Please try again.") };
//   }
// }
