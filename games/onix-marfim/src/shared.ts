// Secret-free constants used by both the logic and the UI.

export type Stone = 'onyx' | 'ivory';

/** Even numbers are onyx (black), odd numbers ivory (white). */
export const stoneOf = (n: number): Stone => (n % 2 === 0 ? 'onyx' : 'ivory');

/** Every player starts each duel with these numbers. */
export const STONES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const ROUNDS = STONES.length;

/** Duel reveal: the drumroll plays, then one round flips every REVEAL_STEP_MS. */
export const REVEAL_AT = 2200;
export const REVEAL_STEP_MS = 900;
