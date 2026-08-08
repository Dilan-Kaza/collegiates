"use server";

// Live scoring reads. The scores live in the competition's Google Sheet, entered by judges and
// computed by formulas there, so this is read-only — nothing here sits between a judge and a number.

import { getCurrentUser, canViewLiveScores } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { spreadsheetIdFromUrl, sheetsCredentials } from "@/lib/sheets";
import { withoutJudgeDetail, onlyOpen } from "@/lib/liveScores";
import type { LiveScoresDTO } from "@/lib/api";
import { getLiveScoresForSheet } from "../data";
import { actionError } from "./shared";

// Why there is nothing to show, so the page can do better than "no scores". An organizer who
// forgot to paste the Scoring Link needs to be told that, not shown an empty table.
export type LiveScoresStatus =
  | "ok"
  | "denied"        // not permitted at all, or a competitor before the day
  | "unconfigured"  // no service account on this deployment, or no sheet in Settings
  | "empty";        // sheet is reachable but has no scoring tabs yet

export interface LiveScoresResult {
  status: LiveScoresStatus;
  scores: LiveScoresDTO | null;
}

const nothing = (status: LiveScoresStatus): LiveScoresResult => ({ status, scores: null });

// This year's live results, gated per lib/auth's canViewLiveScores. `open` is the key of the one
// block whose rows are wanted — one key, so the largest response is one event. Self-authorizing.
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
