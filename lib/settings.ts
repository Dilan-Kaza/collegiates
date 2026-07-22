import { cache } from "react";
import prisma from "./prisma";
import type { SettingsWithHost } from "./api";

// Mirrors Settings.load() — the most-recently created settings row.
//
// Wrapped in React `cache()`: a single render/action asks for settings from
// several places (auth-gated data fetch, mutation validation, the group-set
// year filter). cache() collapses those to one query for the current request
// only; nothing persists across requests.
export const loadSettings = cache((): Promise<SettingsWithHost | null> =>
  prisma.settings.findFirst({
    orderBy: { created_at: "desc" },
    include: { host: true },
  })
);

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
