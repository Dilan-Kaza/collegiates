// DISABLED 2026-08-02 — Jira bug reports. Re-enable together: lib/jira.ts,
// functions/actions/{bug-report,index}.ts, app/contact/{BugReportForm,page}.tsx; set JIRA_* env.

// "use client";
//
// import { useState } from "react";
// import type { SyntheticEvent } from "react";
// import { Field, FormError, SubmitButton, LongAnswer } from "@components";
// import { submitBugReport } from "@functions/actions";
// import { runAction, errorMessage } from "@functions/actionErrors";
// import { handleFormChange } from "@functions/forms";
// import { useLocation } from "@/routerCompat";
// // Bug report form — files an issue in Jira via the submitBugReport action.
//
// export default function BugReportForm() {
//   const [formData, setFormData] = useState<Record<string, string>>({});
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [error, setError] = useState("");
//   const [filed, setFiled] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//
//   const { pathname } = useLocation();
//   const handleChange = handleFormChange(setFormData, setErrors);
//
//   const handleSubmit = async (e: SyntheticEvent) => {
//     e.preventDefault();
//
//     const allErrors: Record<string, string> = {};
//     if (!formData.summary?.trim()) allErrors.summary = "Required";
//     if (!formData.description?.trim()) allErrors.description = "Required";
//     if (Object.keys(allErrors).length > 0) {
//       setErrors(allErrors);
//       return;
//     }
//
//     setLoading(true);
//     const fallback = "Could not file your report. Please try again.";
//     try {
//       const { data, error: fieldErrors } = await runAction(
//         () =>
//           submitBugReport({
//             summary: formData.summary,
//             description: formData.description,
//             email: formData.email,
//             website: formData.website,
//             // The reporter is on /contact, so record where the problem was seen
//             // rather than where the form lives — they can correct it by hand.
//             page: formData.page?.trim() || pathname,
//           }),
//         fallback,
//       );
//       if (fieldErrors) {
//         setErrors(fieldErrors);
//         setError(errorMessage(fieldErrors, fallback));
//         return;
//       }
//       setError("");
//       setErrors({});
//       setFormData({});
//       setFiled(data?.key ?? "");
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const fieldProps = { formData, errors, handleChange };
//
//   if (filed !== null) {
//     return (
//       <div className="cg-card max-w-2xl text-primary">
//         <div className="text-lg font-bold">Thanks — your report is filed.</div>
//         <div className="text-sm">
//           {filed
//             ? `It was logged as ${filed}. If you left an email we may follow up there.`
//             : "If you left an email we may follow up there."}
//         </div>
//         <button className="btn btn-primary self-start" onClick={() => setFiled(null)}>
//           Report something else
//         </button>
//       </div>
//     );
//   }
//
//   return (
//     <form onSubmit={handleSubmit} className="cg-card max-w-2xl text-primary">
//       <FormError error={error} />
//       <Field {...fieldProps} name="summary" type="text" label="What went wrong?*" maxLength={200} />
//       <Field
//         {...fieldProps}
//         name="description"
//         as={LongAnswer}
//         label="Details — what you did, what you expected, what happened*"
//         maxLength={5000}
//       />
//       <Field
//         {...fieldProps}
//         name="page"
//         type="text"
//         label="Page it happened on"
//         placeholder="/tournament"
//       />
//       <Field
//         {...fieldProps}
//         name="email"
//         type="email"
//         label="Your email (optional, so we can follow up)"
//       />
//
//       {/* Honeypot: hidden from people, filled in by naive bots. */}
//       <input
//         name="website"
//         type="text"
//         tabIndex={-1}
//         autoComplete="off"
//         aria-hidden="true"
//         value={formData.website ?? ""}
//         onChange={handleChange}
//         className="hidden"
//       />
//
//       <SubmitButton loading={loading} label="Send report" loadingLabel="Sending…" />
//     </form>
//   );
// }
