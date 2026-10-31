import type { ClientId, Lang, PlayerPlatformView, PublicPlatformView } from '@mp/protocol';

/**
 * Contract every game implements. A game ships two separately loaded modules:
 *  - `logic`  (pure, no DOM, runs inside the engine Web Worker)  → `defineGame`
 *  - `ui`     (React views for display / player / dealer)          → `defineGameUI`
 *
 * The engine only ever sends what `publicView` / `playerView` / `dealerView` return,
 * so secrets stay inside `state` unless a view deliberately exposes them.
 */

export type I18nText = { 'pt-BR': string; en: string };

export type ConfigField =
  | { key: string; type: 'number'; label: I18nText; min: number; max: number; step?: number; default: number }
  | { key: string; type: 'boolean'; label: I18nText; default: boolean }
  | { key: string; type: 'select'; label: I18nText; options: { value: string; label: I18nText }[]; default: string };

export interface GameManifest {
  id: string;
  version: string;
  name: I18nText;
  description: I18nText;
  minPlayers: number;
  maxPlayers: number;
  /** Player counts go up in steps of this size from `minPlayers` (2 = 4, 6, 8…). Default 1. */
  playerStep?: number;
  usesDealer: boolean;
  estimatedMinutes: number;
  /** Accent colour for lobby cards. */
  accent: string;
  config: ConfigField[];
}

export interface PlayerInfo {
  id: ClientId;
  name: string;
  avatar: string;
  connected: boolean;
  remote: boolean;
  /** The room's Host: drives shared screens such as tutorial slides and rules shown on the TV. */
  isHost: boolean;
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export interface GameResult {
  /** Points earned this match, added to the room scoreboard. */
  scores: Record<ClientId, number>;
}

export interface GameCtx<Cfg = Record<string, unknown>> {
  /** Room-clock time (ms). Use it instead of Date.now(). */
  now: number;
  rng: Rng;
  players: PlayerInfo[];
  config: Cfg;
  /** Player currently verified at the dealer, if any. */
  atDealer: ClientId | null;
  setTimer(key: string, ms: number): void;
  clearTimer(key: string): void;
  /** Deadline of a running timer (room clock) — useful for countdowns in views. */
  timerDeadline(key: string): number | null;
  /** Full duration (ms) the running timer was set with — pair it with timerDeadline for countdown rings. */
  timerTotal(key: string): number | null;
  /** Fire a sound/fx on every display at the same instant. */
  emit(kind: 'sound' | 'fx', name: string, delayMs?: number): void;
  /** Finish the match. */
  end(result: GameResult): void;
  /** Ask the platform to send this player away from the dealer. */
  releaseDealer(): void;
}

export interface GameLogic<S = any, Cfg = any> {
  manifest: GameManifest;
  setup(ctx: GameCtx<Cfg>): S;
  /** Return the next state, or mutate `state` (it is already a private copy) and return nothing. */
  onAction(state: S, playerId: ClientId, action: unknown, ctx: GameCtx<Cfg>): S | void;
  onTimer?(state: S, key: string, ctx: GameCtx<Cfg>): S | void;
  /** Player stayed offline past the grace period: skip, auto-play or eliminate. */
  onPlayerTimeout?(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): S | void;
  /** Whether the player may join the dealer queue right now. */
  canVisitDealer?(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): boolean;
  onDealerEnter?(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): S | void;
  onDealerLeave?(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): S | void;
  publicView(state: S, ctx: GameCtx<Cfg>): unknown;
  playerView(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): unknown;
  /** Shown on the dealer device while `playerId` is verified inside. */
  dealerView?(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): unknown;
  /**
   * Shown on the dealer device while nobody is called or visiting. For games whose Dealer sits in
   * one team's room and shows that team's board the whole match (usually nobody ever visits).
   */
  dealerIdleView?(state: S, ctx: GameCtx<Cfg>): unknown;
  /**
   * Remote screens (a Host option): players who may open `dealerIdleView` on their own screen,
   * i.e. the team that stands in the Dealer's room. Leave it out and nobody can.
   */
  dealerAudience?(state: S, ctx: GameCtx<Cfg>): ClientId[];
  /**
   * Remote screens (a Host option): the room this player should be in now, shown on their phone
   * so remote players switch calls (e.g. "Sala Vermelha"). Null = no specific place.
   */
  playerSpace?(state: S, playerId: ClientId, ctx: GameCtx<Cfg>): I18nText | null;
}

export function defineGame<S, Cfg = Record<string, unknown>>(logic: GameLogic<S, Cfg>): GameLogic<S, Cfg> {
  return logic;
}

// ---------------------------------------------------------------------------
// UI side. Games never import platform UI directly: the platform hands its kit in
// through props, so a game bundle only shares `react` with the shell.
// ---------------------------------------------------------------------------

// Props of the platform components handed to games. `any` for React nodes and styles keeps the
// SDK free of React types; games get full JSX type-checking through their own `react` import.
export interface KitButtonProps {
  children?: any;
  onClick?(): void;
  disabled?: boolean;
  /** gold = primary, crimson = important/dangerous, ghost = secondary. */
  variant?: 'gold' | 'crimson' | 'ghost';
  block?: boolean;
  small?: boolean;
  className?: string;
  style?: any;
}

export interface KitAvatarProps {
  emoji: string;
  /** Pixels, or a CSS length such as "6em" (scales with the TV stage). */
  size?: number | string;
  /** Gold glow (e.g. "has voted", winner). */
  active?: boolean;
  /** Crimson glow (e.g. "at the Dealer", accused). */
  crimson?: boolean;
  offline?: boolean;
  /** Small round badge at the bottom-right (an emoji or a short string). */
  badge?: any;
  title?: string;
}

export interface KitCountdownProps {
  /** Room-clock deadline, e.g. `ctx.timerDeadline('phase')` passed through a view. */
  deadline: number | null;
  /** Full duration in ms, for the ring's progress. */
  total: number;
  /** Diameter: px, or a CSS length — use em on the TV (`"7em"`), px on phones. */
  size?: number | string;
  /** Freeze while the room is paused (`!!platform.paused`). */
  paused?: boolean;
}

export interface KitPanelProps {
  children?: any;
  className?: string;
  style?: any;
}

export interface KitRiveViewProps {
  /** URL of a .riv file shipped with the game (import it: `import riv from '../assets/x.riv?url'`). */
  src: string;
  artboard?: string;
  /** Defaults to "Main". */
  stateMachine?: string;
  /** Written to the bound view model: string, number or boolean properties by name. */
  values?: Record<string, string | number | boolean>;
  /** Fires the trigger property `name` whenever `nonce` changes. */
  trigger?: { name: string; nonce: number | string };
  className?: string;
  style?: any;
  /** Rendered if the file fails to load (weak TV browsers). */
  fallback?: any;
}

export interface KitTextInputProps {
  /** Called with the trimmed text when the player taps the button or presses Enter. */
  onSubmit(text: string): void;
  placeholder?: string;
  maxLength?: number;
  /** Strip spaces while typing (one-word answers). */
  oneWord?: boolean;
  /** Button content, e.g. `t(L.send)`. */
  submitLabel?: any;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Clear the field after a submit (default true). */
  clearOnSubmit?: boolean;
}

export interface UIKit {
  Button(props: KitButtonProps): any;
  /** Phone text entry + submit button (autocorrect/capitalisation off, Enter submits). */
  TextInput(props: KitTextInputProps): any;
  Avatar(props: KitAvatarProps): any;
  Countdown(props: KitCountdownProps): any;
  Panel(props: KitPanelProps): any;
  RiveView(props: KitRiveViewProps): any;
  /** Room-clock now (ms); re-renders the calling component a few times per second. */
  useRoomNow(): number;
  /** Plays one of the platform's built-in cues locally. Synced cues across TVs go through `ctx.emit`. */
  playSound(name: string): void;
}

export interface CommonUIProps {
  kit: UIKit;
  lang: Lang;
  t(text: I18nText): string;
  platform: PublicPlatformView;
}

export interface DisplayProps<PV = any> extends CommonUIProps {
  view: PV;
}

export interface PlayerProps<V = any> extends CommonUIProps {
  view: V;
  you: PlayerPlatformView;
  send(action: unknown): void;
}

export interface DealerProps<DV = any> extends CommonUIProps {
  view: DV;
  /** The visitor's name; empty while the Dealer shows the game's `dealerIdleView`. */
  playerName: string;
}

export interface GameUI {
  Display: (props: DisplayProps) => any;
  Player: (props: PlayerProps) => any;
  Dealer?: (props: DealerProps) => any;
}

export function defineGameUI(ui: GameUI): GameUI {
  return ui;
}

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32). State is a single uint32 so snapshots can carry it.
// ---------------------------------------------------------------------------

export function createRng(getState: () => number, setState: (s: number) => void): Rng {
  const next = () => {
    let t = (getState() + 0x6d2b79f5) >>> 0;
    setState(t);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[int(0, items.length - 1)]!;
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}

/** Whether a match of this game may start with `count` players (range and `playerStep`). */
export function fitsPlayerCount(manifest: GameManifest, count: number): boolean {
  const step = Math.max(1, manifest.playerStep ?? 1);
  return count >= manifest.minPlayers && count <= manifest.maxPlayers && (count - manifest.minPlayers) % step === 0;
}

export function configDefaults(manifest: GameManifest): Record<string, unknown> {
  return Object.fromEntries(manifest.config.map((f) => [f.key, f.default]));
}

/** Clamp/validate a config patch against the manifest. Unknown keys are dropped. */
export function sanitizeConfig(manifest: GameManifest, input: Record<string, unknown>): Record<string, unknown> {
  const out = configDefaults(manifest);
  for (const field of manifest.config) {
    const v = input[field.key];
    if (v === undefined) continue;
    if (field.type === 'number' && typeof v === 'number' && Number.isFinite(v)) {
      out[field.key] = Math.min(field.max, Math.max(field.min, v));
    } else if (field.type === 'boolean' && typeof v === 'boolean') {
      out[field.key] = v;
    } else if (field.type === 'select' && field.options.some((o) => o.value === v)) {
      out[field.key] = v;
    }
  }
  return out;
}
