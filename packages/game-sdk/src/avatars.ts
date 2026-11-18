/** The portraits players choose from (files in `/avatars/<id>-<variant>.webp`). */
export const AVATAR_IDS = [
  'banqueiro', 'croupier', 'apostador', 'herdeira', 'professor', 'detetive', 'cantora', 'magico',
  'novato', 'diplomata', 'barao', 'espia', 'matriarca', 'veterano', 'pianista', 'duquesa',
] as const;

/**
 * base: normal. gold: winner / highlighted. crimson: in the crosshairs. red / blue / green: teams.
 * out: eliminated or offline (faded). shadow: unknown player ("?").
 */
export type AvatarVariant = 'base' | 'gold' | 'crimson' | 'red' | 'blue' | 'green' | 'out' | 'shadow';

const AVATAR_SET = new Set<string>(AVATAR_IDS);

/** The old emoji sigils, mapped to the portraits that replaced them (saved profiles, demos). */
const LEGACY_EMOJI: Record<string, string> = {
  '🎩': 'banqueiro', '🃏': 'croupier', '🎲': 'apostador', '🍷': 'herdeira', '💎': 'professor', '👑': 'detetive',
  '🌙': 'cantora', '🦊': 'magico', '🦉': 'novato', '🐺': 'diplomata', '🎭': 'barao', '🗝️': 'espia',
  '⚜️': 'matriarca', '🕯️': 'veterano', '🌹': 'pianista', '♠️': 'duquesa',
};

/** Portrait id of an avatar string (a portrait id or an old emoji sigil), or null for anything else. */
export function avatarId(value: string): string | null {
  if (AVATAR_SET.has(value)) return value;
  return LEGACY_EMOJI[value] ?? null;
}

/** A random portrait id (placeholders, tests, defaults). */
export function randomAvatarId(): string {
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)]!;
}

/**
 * Image URL of a player's portrait, or null when the avatar is something else (draw it as text).
 * "?" / "❔" give the faceless shadow portrait. Use it where a component cannot be (SVG, canvas).
 */
export function avatarSrc(value: string, variant: AvatarVariant = 'base'): string | null {
  if (value === '?' || value === '❔') return '/avatars/banqueiro-shadow.webp';
  const id = avatarId(value);
  return id ? `/avatars/${id}-${variant}.webp` : null;
}
