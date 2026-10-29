// Limits both the engine and the phone enforce (no secrets here: it ships to every device).

export const QUESTION_MAX = 140;
export const ANSWER_MAX = 40;

/** Case-, accent- and space-insensitive form, to refuse two answers that read the same. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The Author's points: 100 × minority ÷ majority over the votes cast (0 when nobody voted). */
export const splitPoints = (a: number, b: number) => {
  const hi = Math.max(a, b);
  return hi === 0 ? 0 : Math.round((100 * Math.min(a, b)) / hi);
};
