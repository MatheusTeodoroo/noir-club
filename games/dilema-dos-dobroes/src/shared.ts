// Constants both the logic and the UI need. Nothing secret lives here: it ships to every device.

export type Team = 'gold' | 'crimson';
export const TEAMS: Team[] = ['gold', 'crimson'];

/** Doubloons each player starts with — for the whole match, never refilled. */
export const START_COINS = 10;
/** Rounds that count (ties are replayed and don't count). */
export const MAX_ROUNDS = 5;
/** Round wins that end the match. */
export const WINS_NEEDED = 3;
/** Ties in a row after which the match stops, as if everyone were broke. */
export const MAX_TIES = 3;
