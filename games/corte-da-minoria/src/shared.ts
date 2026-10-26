// Constants both the logic and the UI need. No secrets here: this ships to every phone and TV.

export const COLORS = ['blue', 'green'] as const;
export type Color = (typeof COLORS)[number];

export const SPACES = ['A', 'B'] as const;
export type Space = (typeof SPACES)[number];

/** Players the king must put in each hall. */
export const MIN_PER_SPACE = 2;

/** A colour window opens before round 1 and then every second round (3, 5, 7…). */
export const isColorRound = (round: number) => round % 2 === 1;
