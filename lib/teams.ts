// Groupset events are contested by teams: several competitors from one school register for "G"
// and perform as one entry. Pure and shared, so builder, Still view and published order agree.
import type { TeamRefDTO } from "./api";

export const isGroupsetCategory = (category: string | null | undefined): boolean => category === "G";

// A competitor as any of the order views holds them: an id, a display name, and
// the team they belong to when they are on one.
export interface TeamMember {
  id: string;
  name?: string;
  team?: TeamRefDTO | null;
}

// One row of a groupset event's list. `unassigned` marks a competitor who registered for the team
// event without joining a team — kept as its own row, since the organizer has to resolve it.
export interface TeamRow<T extends TeamMember> {
  id: string;
  name: string;
  members: T[];
  unassigned: boolean;
}

// Competitors -> team rows, in the order the teams first appear. Position comes from each team's
// first member, so a list already ordered by team survives the round trip unchanged.
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

// Back to the flat competitor list the order actually stores, in team order —
// so dragging a team in the builder moves its members together.
export const flattenTeams = <T extends TeamMember>(rows: TeamRow<T>[]): T[] =>
  rows.flatMap((row) => row.members);
