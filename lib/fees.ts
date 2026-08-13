/**
 * What a competitor owes for a year's registrations.
 *
 * @remarks
 * Shared by the competitor dashboard and the organizer payments screen, so a
 * payment is always checked against the same figure the competitor was shown.
 *
 * @packageDocumentation
 */

import type { RegistrationDTO, SettingsDTO } from "@/lib/api";

/** The billing breakdown {@link computeTotalOwed} produces. */
export interface CostSummary {
  /** Whole dollars owed: one base fee plus a per-event fee for each billed entry. */
  total: number;
  /** Individual events only — the team competition is reported by `hasGroupset`. */
  count: number;
  /** How many billed entries were priced at the early tier. */
  earlyCount: number;
  /** Whether the team competition is being billed, by registration or by team row. */
  hasGroupset: boolean;
}

/**
 * Whether one registration is priced at the discounted early tier.
 *
 * @remarks
 * Three things must hold: an early window is configured, both early cost
 * columns are set, and the registration was created before the regular window
 * opened. Both cost columns are nullable, so a half-configured tier is not a
 * tier — it falls through to regular pricing rather than billing nothing.
 *
 * @param dateCreated - When the registration row was created.
 * @param settings - The competition's settings DTO.
 */
export function isEarlyRegistration(
  dateCreated: Date | string,
  settings: SettingsDTO,
): boolean {
  return !!settings.early_reg_start
    && settings.early_reg_cost_base != null
    && settings.early_reg_cost_event != null
    && new Date(dateCreated).getTime() < new Date(settings.reg_start).getTime();
}

/**
 * Totals what a competitor owes for their registrations and team entry.
 *
 * @remarks
 * Pure and synchronous, so callers derive it during render rather than storing
 * it. The pricing rules it implements:
 *
 * - The **base fee is charged once**, at the tier the *earliest* billed entry
 *   falls under. Registering early then adding events later keeps the cheaper
 *   base fee.
 * - Each entry is then charged a **per-event fee priced by its own create
 *   date**, so events added after the early window cost the regular rate.
 * - The **team competition is billed by the groupset registration**. A team row
 *   only adds a charge of its own when no `"G"` registration exists behind it,
 *   which is the case while a team is being assembled.
 *
 * @param registrations - This year's registrations. Empty or undefined yields null.
 * @param settings - The competition's settings DTO, for the cost columns and window.
 * @param groupsetDate - When the competitor's team was created, or null when
 * they are on no team.
 * @returns The breakdown, or `null` when there is nothing to bill or the
 * settings carry no base cost.
 */
export function computeTotalOwed(
  registrations: RegistrationDTO[] | undefined,
  settings: SettingsDTO,
  groupsetDate?: Date | string | null,
): CostSummary | null {
  if (!registrations?.length || settings.reg_cost_base == null) return null;

  const groupsetRegistered = registrations.some((reg) => reg.event_category === "G");

  // Everything carrying a per-event charge: each registration, plus a group set
  // with no groupset-event registration behind it.
  const billed: (Date | string)[] = registrations.map((reg) => reg.date_created);
  if (groupsetDate && !groupsetRegistered) billed.push(groupsetDate);
  billed.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // isEarlyRegistration already proved both early columns are set; the fallbacks
  // are the regular price so a missed guard can never bill nothing.
  const baseEarly = isEarlyRegistration(billed[0], settings);
  let total = baseEarly ? (settings.early_reg_cost_base ?? settings.reg_cost_base) : settings.reg_cost_base;
  let earlyCount = 0;
  for (const dateCreated of billed) {
    const early = isEarlyRegistration(dateCreated, settings);
    if (early) earlyCount += 1;
    total += early ? (settings.early_reg_cost_event ?? settings.reg_cost_event) : settings.reg_cost_event;
  }

  return {
    total,
    count: registrations.filter((reg) => reg.event_category !== "G").length,
    earlyCount,
    hasGroupset: groupsetRegistered || !!groupsetDate,
  };
}

/**
 * The amount owed alone, for callers that know whether the competitor is on a
 * team but not when that team was created.
 *
 * @remarks
 * Shared by the organizer's payments table and the registration emails, so the
 * figure mailed to a competitor is the same one the organizer is checking their
 * payment against.
 *
 * The team's create date is not carried on those payloads, so the competitor's
 * earliest registration stands in for it. That only affects pricing while a team
 * is still being assembled — once a `"G"` registration exists behind the team,
 * {@link computeTotalOwed} bills by that row and never consults the date.
 *
 * @param registrations - This year's registrations.
 * @param onTeam - Whether the competitor belongs to a group set.
 * @param settings - The competition's settings DTO.
 * @returns Whole dollars owed, or `null` when no fee schedule is configured.
 */
export function totalOwedFor(
  registrations: RegistrationDTO[] | undefined,
  onTeam: boolean,
  settings: SettingsDTO,
): number | null {
  if (settings.reg_cost_base == null) return null;
  const earliest = (registrations ?? [])
    .map((reg) => reg.date_created)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  return computeTotalOwed(registrations, settings, onTeam ? earliest : null)?.total ?? null;
}
