// Rings -> the finished Google Sheets grid: the running clock, durations, entry counts and team
// grouping. Pure, runs in the browser, and sits with the other ring maths so the two agree.

import { groupIntoTeams } from "@/lib/teams";
import type { Cell, SheetTabData } from "@/lib/sheetGrid";
import { eventSeconds, toHrMin } from "./utils";
import { isEventItem } from "./types";
import type { RingEvent, RingKey, Rings } from "./types";

// A ring stores durations only — nothing records when the day starts — so the
// export anchors it at 9:00 AM and walks the ring adding each slot's length. The
// organizer shifts the whole column in the sheet if the day begins elsewhere.
const DAY_START_MINUTES = 9 * 60;

// Elapsed seconds -> wall clock. A plain string cell, written literally by lib/sheets.ts, so
// the organizer reads exactly this — not a time re-rendered in the spreadsheet's own locale.
function clock(elapsedSeconds: number): string {
  const total = DAY_START_MINUTES + Math.floor(elapsedSeconds / 60);
  const hour24 = Math.floor(total / 60) % 24;
  const minute = total % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

const HEADER = ["Start", "Slot", "Minutes", "Entries", "#", "Name", "Team / Members", "Nandu"];

const RING_LABEL: Record<RingKey, string> = { ring1: "Ring 1", ring2: "Ring 2", ring3: "Ring 3" };

// One ring: a title line, the header, then a row per slot followed by an indented row per entry.
// Entry rows leave the slot columns blank so Start reads as the running order of the day.
function ringRows(label: string, items: RingEvent[]): Cell[][] {
  const totalSeconds = items.reduce((acc, ev) => acc + eventSeconds(ev), 0);
  const eventCount = items.filter(isEventItem).length;

  const rows: Cell[][] = [
    [`${label} — ${eventCount} event${eventCount === 1 ? "" : "s"}, ${toHrMin(totalSeconds)}, from ${clock(0)}`],
    [],
    HEADER,
  ];

  let elapsed = 0;
  for (const item of items) {
    const seconds = eventSeconds(item);

    if (!isEventItem(item)) {
      rows.push([clock(elapsed), `${item.name || "Break"} (break)`, item.duration]);
      elapsed += seconds;
      continue;
    }

    // A groupset event is contested by teams, not individuals: it is listed and
    // counted by team here for the same reason the ring clock counts teams.
    const teams = item.is_groupset ? groupIntoTeams(item.competitors) : null;
    const entries = teams ? teams.length : item.competitors.length;
    rows.push([clock(elapsed), item.event_name, Math.round(seconds / 60), entries]);

    if (teams) {
      teams.forEach((team, i) => {
        // An unassigned competitor is a registration problem the organizer has to
        // resolve, so it is flagged in the sheet rather than quietly listed.
        rows.push(team.unassigned
          ? ["", "", "", "", i + 1, team.name, "NO TEAM", ""]
          : ["", "", "", "", i + 1, team.name, team.members.map((m) => m.name ?? "").join(", "), ""]);
      });
    } else {
      item.competitors.forEach((c, i) => {
        rows.push(["", "", "", "", i + 1, c.name, c.team?.team_name ?? "", c.nandu_str ?? ""]);
      });
    }

    elapsed += seconds;
  }

  rows.push([clock(elapsed), "End of ring"]);
  return rows;
}

// One tab per ring that has anything in it, titled with the competition year so a
// later year's export lands beside this one instead of overwriting it.
export function buildOrderSheetTabs(rings: Rings, year?: number | null): SheetTabData[] {
  const ringKeys: RingKey[] = ["ring1", "ring2", "ring3"];
  return ringKeys
    .filter((key) => rings[key].length > 0)
    .map((key) => ({
      title: year ? `${RING_LABEL[key]} ${year}` : RING_LABEL[key],
      rows: ringRows(RING_LABEL[key], rings[key]),
    }));
}
