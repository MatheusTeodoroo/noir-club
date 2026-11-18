// Constants and helpers shared by the logic and the UI. No secrets here: this ships to every phone.

export const ROUNDS = 24;
export const START_PRICE = 10_000;
export const MIN_PRICE = 100;
export const START_CASH = 100_000;
/** Rounds whose start reveals one more piece of every hidden rule; at the last one, everything. */
export const MILESTONES = [5, 10, 15, 20] as const;
/** Point bands on the final net worth. */
export const BANDS = [
  { min: 1_500_000, points: 1 },
  { min: 3_000_000, points: 2 },
  { min: 6_000_000, points: 3 },
] as const;
export const TOP_BONUS = 1;
export const CLOSING_MS = 8_000;
export const MILESTONE_CLOSING_MS = 14_000;
export const FINAL_MS = 14_000;
export const MAX_QTY = 9_999;

/** Share of each rule's words visible from each milestone on (before the first: one vague word). */
export const REVEAL_SHARE: readonly (readonly [number, number])[] = [
  [5, 0.25],
  [10, 0.5],
  [15, 0.75],
  [20, 1],
];

/** Words of an n-word rule visible while round `round` is on screen. */
export function revealedWords(round: number, n: number): number {
  let share = 0;
  for (const [m, f] of REVEAL_SHARE) if (round >= m) share = f;
  return Math.max(1, Math.min(n, Math.ceil(share * n)));
}

/** The next milestone after `round`, or null. */
export function nextMilestone(round: number): number | null {
  return MILESTONES.find((m) => m > round) ?? null;
}

export function bandPoints(worth: number): number {
  let p = 0;
  for (const b of BANDS) if (worth >= b.min) p = b.points;
  return p;
}

export type Lang = 'pt-BR' | 'en';

/** $10.000 (PT) / $10,000 (EN). */
export function money(v: number, lang: Lang): string {
  const s = Math.round(Math.abs(v))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.');
  return `${v < 0 ? '−' : ''}$${s}`;
}
