// Secret-free constants shared by logic.ts and ui.tsx.

/** A pile collapses when its total reaches this. */
export const LIMIT = 13;
/** Rounds per hand: each hand has 7 cards and 7 colour chips, refreshed every 7 rounds. */
export const HAND_ROUNDS = 7;
export const CARDS = [0, 1, 2, 3, 4, 5, 6] as const;

export type Pile = 'r' | 'g' | 'b';
/** A colour chip: one of the piles, or the rainbow (any pile, plays first). */
export type Color = Pile | 'w';

export const PILES: Pile[] = ['r', 'g', 'b'];
export const HAND_COLORS: Color[] = ['r', 'r', 'g', 'g', 'b', 'b', 'w'];
