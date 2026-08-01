import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "./prisma";
import { SETTINGS_INCLUDE } from "./api";
import type { SettingsWithHost } from "./api";

// The Settings row in Next's Data Cache: rarely written, read on nearly every
// request. Tagged "settings", which every write path already invalidates.
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

// Mirrors Settings.load() — the most-recently created settings row. React
// `cache()` collapses a request's several callers to one read plus rehydration.
export const loadSettings = cache(async (): Promise<SettingsWithHost | null> => {
  const s = await loadSettingsCached();
  return s ? rehydrate(s) : null;
});

// Mirrors Settings.reg_active
export function regActive(s: SettingsWithHost | null | undefined): boolean {
  if (!s) return false;
  const now = new Date();
  if (s.early_reg_start) {
    return s.early_reg_start <= now && now <= s.reg_end;
  }
  return s.reg_start <= now && now <= s.reg_end;
}

// Mirrors Settings.early_reg_active
export function earlyRegActive(s: SettingsWithHost | null | undefined): boolean {
  if (!s || !s.early_reg_start) return false;
  const now = new Date();
  return s.early_reg_start <= now && now <= s.reg_start;
}
