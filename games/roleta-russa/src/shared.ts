// Fixed numbers both the engine and the phones need (no secrets here: it ships to every device).

export const START_CREDITS = 16;
export const COST = { pubInvestigate: 1, privInvestigate: 2, spin1: 3, spin2: 4, manipulate: 6 } as const;
/** Most credits a player may load into the Manipulation per turn. */
export const MAX_CHARGE = 3;

/** Chamber labels, clockwise around the cylinder. */
export const LABELS = 'ABCDEFGHIJ';

/** The two adjacent chambers of pair `k`: k and the next one clockwise. */
export const pairOf = (k: number, n: number): [number, number] => [k, (k + 1) % n];
export const pairLabel = (k: number, n: number) => {
  const [a, b] = pairOf(k, n);
  return `${LABELS[a]}·${LABELS[b]}`;
};

/** Chamber facing seat `seat` when the cylinder has turned `rot` steps clockwise. */
export const chamberAt = (seat: number, rot: number, n: number) => (((seat - rot) % n) + n) % n;

/** The seat the barrel points at: seat 1 at the start, one more clockwise per spin step. */
export const aimSeat = (rot: number, n: number) => ((rot % n) + n) % n;

/** How many players must be out of credits for the firing to start: half, rounded up. */
export const triggerCount = (n: number) => Math.ceil(n / 2);
