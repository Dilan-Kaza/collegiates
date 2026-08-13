import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "./prisma";
import { SETTINGS_INCLUDE } from "./api";
import type { SettingsWithHost } from "./api";

const loadSettingsCached = unstable_cache(
  (): Promise<SettingsWithHost | null> =>
    prisma.settings.findFirst({
      orderBy: { created_at: "desc" },
      include: SETTINGS_INCLUDE,
    }),
  ["settings-row"],
  { tags: ["settings"], revalidate: 3600 }
);

// The Data Cache serializes through JSON, flattening DateTime to a string.
// Rebuild them — regActive's `<=` would otherwise compare strings silently.
function rehydrate(s: SettingsWithHost): SettingsWithHost {
  return {
    ...s,
    early_reg_start: s.early_reg_start ? new Date(s.early_reg_start) : null,
    reg_start: new Date(s.reg_start),
    reg_end: new Date(s.reg_end),
    due_date: s.due_date ? new Date(s.due_date) : null,
    comp_date: s.comp_date ? new Date(s.comp_date) : null,
    created_at: new Date(s.created_at),
    host: { ...s.host, date_joined: new Date(s.host.date_joined) },
  };
}

/**
 * The current competition's Settings row, with its host and the host's college.
 *
 * @remarks
 * "Current" means the most recently created row — the port of Django's
 * `Settings.load()`. A new competition year is a new row, so history is kept.
 *
 * Two caches sit in front of the query, because this is read on nearly every
 * request and written a handful of times a year:
 *
 * - Next's Data Cache, tagged `settings`, which every write path invalidates.
 * - React's `cache()`, which collapses a single request's several callers
 *   (layout, page gate, action) down to one read plus one rehydration.
 *
 * The Data Cache round-trips through JSON, which flattens `DateTime` to a
 * string, so the date columns are rebuilt on the way out. Without that
 * {@link regActive}'s `<=` would compare strings and silently misjudge the
 * window.
 *
 * @returns The settings row, or `null` before a first competition is created.
 */
export const loadSettings = cache(async (): Promise<SettingsWithHost | null> => {
  const s = await loadSettingsCached();
  return s ? rehydrate(s) : null;
});

/**
 * Whether registration is open right now — the port of `Settings.reg_active`.
 *
 * @remarks
 * When an early window is configured, the open period runs from
 * `early_reg_start` all the way to `reg_end`; early and regular registration
 * differ in price, not in availability. With no early window it is
 * `reg_start`..`reg_end`.
 *
 * @param s - A settings row, or null/undefined when none exists.
 */
export function regActive(s: SettingsWithHost | null | undefined): boolean {
  if (!s) return false;
  const now = new Date();
  if (s.early_reg_start) {
    return s.early_reg_start <= now && now <= s.reg_end;
  }
  return s.reg_start <= now && now <= s.reg_end;
}

/**
 * Whether the discounted early window is open — the port of
 * `Settings.early_reg_active`.
 *
 * @remarks
 * True only between `early_reg_start` and `reg_start`; once regular
 * registration opens, the early tier has closed even though
 * {@link regActive} stays true.
 *
 * @param s - A settings row, or null/undefined when none exists.
 */
export function earlyRegActive(s: SettingsWithHost | null | undefined): boolean {
  if (!s || !s.early_reg_start) return false;
  const now = new Date();
  return s.early_reg_start <= now && now <= s.reg_start;
}
