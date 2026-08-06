// What a competitor owes for a year's registrations. Shared by the competitor dashboard and the
// organizer payments screen, so a payment is checked against the figure the competitor saw.

import type { RegistrationDTO, SettingsDTO } from "@/lib/api";

export interface CostSummary {
  total: number;
  count: number;
  earlyCount: number;
  hasGroupset: boolean;
}

// A registration is priced at the early tier when an early window is configured
// and it was created before the regular window opened.
export function isEarlyRegistration(
  dateCreated: Date | string,
  settings: SettingsDTO,
): boolean {
  return !!settings.early_reg_start
    && settings.early_reg_cost_base != null
    && new Date(dateCreated).getTime() < new Date(settings.reg_start).getTime();
}

// Pure and synchronous — callers derive it during render. `groupsetDate` is when the team was
// created; it only bills when no groupset-event registration exists. Pass null with no team.
export function computeTotalOwed(
  registrations: RegistrationDTO[] | undefined,
  settings: SettingsDTO,
  groupsetDate?: Date | string | null,
): CostSummary | null {
  if (!registrations?.length || settings.reg_cost_base == null) return null;

  // The team competition is entered by registering for the groupset event, so that registration is
  // what bills it. A team row only adds a charge of its own when the registration is missing.
  const groupsetRegistered = registrations.some((reg) => reg.event_category === "G");

  // Everything that carries a per-event charge: each registration, plus a group
  // set with no groupset-event registration behind it.
  const billed: (Date | string)[] = registrations.map((reg) => reg.date_created);
  if (groupsetDate && !groupsetRegistered) billed.push(groupsetDate);
  billed.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // The base fee is charged once, at the tier the earliest registration falls
  // under; each event is then charged on top, priced by its own create date.
  const baseEarly = isEarlyRegistration(billed[0], settings);
  let total = baseEarly ? (settings.early_reg_cost_base ?? 0) : settings.reg_cost_base;
  let earlyCount = 0;
  for (const dateCreated of billed) {
    const early = isEarlyRegistration(dateCreated, settings);
    if (early) earlyCount += 1;
    total += early ? (settings.early_reg_cost_event ?? 0) : settings.reg_cost_event;
  }

  // `count` is the individual events only; the team competition is reported
  // separately, so a groupset registration must not show up in both.
  return {
    total,
    count: registrations.filter((reg) => reg.event_category !== "G").length,
    earlyCount,
    hasGroupset: groupsetRegistered || !!groupsetDate,
  };
}
