// Secret-free constants used by both the logic and the UI.

export type Stone = 'onyx' | 'ivory';

/** One-digit bids (0–9) are onyx (black), two-digit bids (10–99) ivory (white). */
export const stoneOf = (n: number): Stone => (n < 10 ? 'onyx' : 'ivory');

export const START_POINTS = 99;
export const ROUNDS = 9;
/** Five wins settle the duel: the rival can no longer catch up. */
export const WIN_TARGET = 5;

export const LAMP_STAGES = 5;
/**
 * Lit stages of a player's lamp: 80–99 → 5, 60–79 → 4, 40–59 → 3, 20–39 → 2, 1–19 → 1, 0 → off.
 * One stage goes out for every 20 points spent.
 */
export const lampsOf = (points: number): number =>
  points <= 0 ? 0 : Math.min(LAMP_STAGES, Math.floor(points / 20) + 1);

/** Duel reveal: the drumroll plays, then one round flips every REVEAL_STEP_MS. */
export const REVEAL_AT = 2200;
export const REVEAL_STEP_MS = 900;
/** How long the duel reveal stays up for a duel of `rounds` rounds. */
export const revealMs = (rounds: number) => REVEAL_AT + rounds * REVEAL_STEP_MS + 4_200;
