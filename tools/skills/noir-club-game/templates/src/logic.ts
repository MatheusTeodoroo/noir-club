import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';

// Starter game: everyone secretly picks 1–5 on their phone; at the reveal, the highest pick that
// nobody else made scores that many points. It exercises the whole contract — secret state,
// a timed phase, an early finish when everyone acted, a reveal and the final ranking — and is
// meant to be replaced by your game, keeping the same shape.

export const manifest = manifestJson as GameManifest;

export interface Config {
  rounds: number;
  pickSeconds: number;
}

type Phase = 'pick' | 'reveal';

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  round: number;
  phase: Phase;
  /** SECRET until the reveal. */
  picks: Record<string, number>;
  scores: Record<string, number>;
  last: null | { picks: Record<string, number>; winnerId: string | null; points: number };
}

/** What every TV shows. */
export interface PublicView {
  round: number;
  rounds: number;
  phase: Phase;
  deadline: number | null;
  /** Full length of the running phase timer, for the countdown ring. */
  total: number | null;
  /** Who already picked — never what they picked. */
  picked: string[];
  reveal: State['last'];
  scores: Record<string, number>;
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  deadline: number | null;
  /** Full length of the running phase timer, for the countdown ring. */
  total: number | null;
  myPick: number | null;
}

export type Action = { type: 'pick'; value: number };

type Ctx = GameCtx<Config>;

const REVEAL_MS = 8_000;

function startRound(state: State, ctx: Ctx) {
  state.phase = 'pick';
  state.picks = {};
  ctx.setTimer('phase', ctx.config.pickSeconds * 1000);
  ctx.emit('sound', 'round');
}

function reveal(state: State, ctx: Ctx) {
  const counts = new Map<number, number>();
  for (const v of Object.values(state.picks)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const unique = [...counts].filter(([, n]) => n === 1).map(([v]) => v);
  const best = unique.length ? Math.max(...unique) : null;
  const winnerId = best === null ? null : (Object.entries(state.picks).find(([, v]) => v === best)?.[0] ?? null);
  if (winnerId && best !== null) state.scores[winnerId] = (state.scores[winnerId] ?? 0) + best;
  state.last = { picks: { ...state.picks }, winnerId, points: best ?? 0 };
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2000);
  ctx.emit('fx', 'reveal', 2000);
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      round: 1,
      phase: 'pick',
      picks: {},
      scores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
      last: null,
    };
    startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (action?.type !== 'pick' || state.phase !== 'pick') return;
    if (!Number.isInteger(action.value) || action.value < 1 || action.value > 5) return;
    state.picks[playerId] = action.value;
    ctx.emit('sound', 'tick');
    const waiting = ctx.players.filter((p) => p.connected && state.picks[p.id] === undefined);
    if (waiting.length === 0) reveal(state, ctx);
  },

  onTimer(state, key, ctx) {
    if (key !== 'phase') return;
    if (state.phase === 'pick') {
      reveal(state, ctx);
    } else if (state.round >= ctx.config.rounds) {
      ctx.end({ scores: state.scores });
    } else {
      state.round += 1;
      startRound(state, ctx);
    }
  },

  onPlayerTimeout(state, _playerId, ctx) {
    // The missing player simply doesn't pick; finish early if everyone else already did.
    if (
      state.phase === 'pick' &&
      ctx.players.filter((p) => p.connected).every((p) => state.picks[p.id] !== undefined)
    ) {
      reveal(state, ctx);
    }
  },

  publicView(state, ctx): PublicView {
    return {
      round: state.round,
      rounds: ctx.config.rounds,
      phase: state.phase,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      picked: Object.keys(state.picks),
      reveal: state.phase === 'reveal' ? state.last : null,
      scores: state.scores,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    return {
      phase: state.phase,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      myPick: state.picks[playerId] ?? null,
    };
  },
});
