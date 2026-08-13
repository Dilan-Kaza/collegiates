"use server";

/**
 * Live scoring reads.
 *
 * @remarks
 * The scores live in the competition's Google Sheet, entered by judges and
 * computed by formulas there. This module is strictly read-only — nothing here
 * sits between a judge and a number.
 *
 * @packageDocumentation
 */

import { getCurrentUser, canViewLiveScores } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { spreadsheetIdFromUrl, sheetsCredentials } from "@/lib/sheets";
import { withoutJudgeDetail, onlyOpen } from "@/lib/liveScores";
import type { LiveScoresDTO } from "@/lib/api";
import { getLiveScoresForSheet } from "../data";
import { actionError } from "./shared";

/**
 * Why there is nothing to show, so the page can do better than "no scores".
 *
 * @remarks
 * An organizer who forgot to paste the Scoring Link needs to be told exactly
 * that, not shown an empty table they will read as a bug.
 */
export type LiveScoresStatus =
  | "ok"
  | "denied"        // not permitted at all, or a competitor before the day
  | "unconfigured"  // no service account on this deployment, or no sheet in Settings
  | "empty";        // sheet is reachable but has no scoring tabs yet

/** A live-scores read: the payload, or a {@link LiveScoresStatus} explaining its absence. */
export interface LiveScoresResult {
  status: LiveScoresStatus;
  scores: LiveScoresDTO | null;
}

const nothing = (status: LiveScoresStatus): LiveScoresResult => ({ status, scores: null });

/**
 * This year's live results, narrowed to one open block and redacted for the
 * viewer.
 *
 * @remarks
 * Gated by `canViewLiveScores`: organizers and admins at any time and in full
 * detail, competitors only on competition day and outcomes only, nobody else.
 *
 * The response is narrowed **then** redacted, in that order, because projecting
 * first is cheaper. The redaction happens here rather than in the UI, so
 * judge-by-judge numbers never reach a browser that may not see them.
 *
 * @param open - The key of the one block whose rows are wanted. Exactly one, so
 * the largest possible response is a single event — this page polls all day.
 * @returns The scores with a status of `"ok"`, or a null payload with the
 * {@link LiveScoresStatus} explaining why.
 */
export async function getLiveScores(open: string | null = null): Promise<LiveScoresResult> {
  const user = await getCurrentUser();
  const { allowed, detail } = await canViewLiveScores(user);
  if (!allowed) return nothing("denied");

  // A deployment with no service account cannot read the sheet at all. Reported
  // rather than logged: it is configuration, not a failure.
  if (!sheetsCredentials()) return nothing("unconfigured");

  const settings = await loadSettings();
  const spreadsheetId = spreadsheetIdFromUrl(settings?.scoring_url);
  if (!settings || !spreadsheetId) return nothing("unconfigured");

  try {
    const scores = await getLiveScoresForSheet(spreadsheetId, settings.reg_year);
    if (scores.rings.length === 0) return nothing("empty");

    // Narrowed to what is on screen first, then stripped of what this viewer may not see — the
    // projection is cheaper. Stripped here so judge-by-judge numbers never reach the wrong browser.
    const requested = onlyOpen(scores.rings, open);
    return {
      status: "ok",
      scores: {
        ...scores,
        rings: detail ? requested : withoutJudgeDetail(requested),
        detail,
      },
    };
  } catch (err) {
    // A Sheets failure on the day is worth logging with its response body — the usual causes are a
    // sheet never shared with the service account and a link pointing at a different spreadsheet.
    actionError("getLiveScores", err, "Could not read live scores.");
    return nothing("empty");
  }
}
