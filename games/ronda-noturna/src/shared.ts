// Constants both the logic and the UI need. Nothing secret lives here.

export const TEAMS = ['red', 'blue', 'green'] as const;
export type Team = (typeof TEAMS)[number];
/** A turn belongs to the thieves or to one police team. */
export type Side = 'thieves' | Team;

export const ACTIONS_PER_COP = 2;
export const THIEF_STEPS = 2;
export const POINTS_PER_WINNER = 3;

export const TEAM_COLORS: Record<Team, string> = {
  red: '#c8343f',
  blue: '#3b6fd1',
  green: '#2f9e6e',
};

/** Police team order for a round: red-blue-green, then blue-green-red, then green-red-blue… */
export function groupOrder(round: number): Team[] {
  const k = (round - 1) % 3;
  return [...TEAMS.slice(k), ...TEAMS.slice(0, k)];
}
