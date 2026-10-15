// Constants both the rules and the phones need. No secrets here: the UI bundle ships this file.

/** How long a touch request (and, once accepted, the code entry) stays open. */
export const REQUEST_MS = 45_000;
/** Wrong codes a player may type before the touch is called off. */
export const CODE_MISSES = 3;
