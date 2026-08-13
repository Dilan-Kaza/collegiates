/**
 * Grouping competitors into the teams that contest group-set events.
 *
 * @remarks
 * A group-set event is entered by several competitors from one school who
 * register for the `"G"` event individually and then perform as a single entry.
 * The database stores the flat competitor list; these helpers convert between
 * that and the team-shaped view.
 *
 * Pure and shared on purpose, so the event builder, the Still view, and the
 * published order all group identically.
 *
 * @packageDocumentation
 */
import type { TeamRefDTO } from "./api";

/** Whether an event category code is the group set (team) category. */
export const isGroupsetCategory = (category: string | null | undefined): boolean => category === "G";

/** A competitor as the order views hold them: an id, a name, and their team. */
export interface TeamMember {
  id: string;
  name?: string;
  team?: TeamRefDTO | null;
}

/** One row of a group-set event's list — a team, or a single unassigned competitor. */
export interface TeamRow<T extends TeamMember> {
  id: string;
  name: string;
  members: T[];
  /**
   * True for a competitor who registered for the team event without joining a
   * team. They are kept as their own row rather than dropped, because it is a
   * gap the organizer has to resolve before the day.
   */
  unassigned: boolean;
}

/**
 * Collapses a competitor list into team rows.
 *
 * @remarks
 * Teams appear in the order their first member does, so a list already sorted
 * by team survives the round trip through {@link flattenTeams} unchanged — which
 * is what lets an organizer drag a team in the builder without reshuffling the
 * rest of the ring.
 *
 * @param competitors - The flat list, in running order.
 * @returns One row per team, plus one row per unassigned competitor.
 */
export function groupIntoTeams<T extends TeamMember>(competitors: T[]): TeamRow<T>[] {
  const rows: TeamRow<T>[] = [];
  const byTeam = new Map<string, TeamRow<T>>();

  for (const c of competitors) {
    if (!c.team) {
      rows.push({ id: `unassigned:${c.id}`, name: c.name ?? "Unknown competitor", members: [c], unassigned: true });
      continue;
    }
    const row = byTeam.get(c.team.groupset_id);
    if (row) {
      row.members.push(c);
      continue;
    }
    const fresh: TeamRow<T> = {
      id: `team:${c.team.groupset_id}`,
      name: c.team.team_name,
      members: [c],
      unassigned: false,
    };
    byTeam.set(c.team.groupset_id, fresh);
    rows.push(fresh);
  }

  return rows;
}

/**
 * Flattens team rows back into the competitor list the order actually stores,
 * in team order — so dragging a team moves its members together.
 */
export const flattenTeams = <T extends TeamMember>(rows: TeamRow<T>[]): T[] =>
  rows.flatMap((row) => row.members);
