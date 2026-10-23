import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';

// Starter game: everyone secretly picks 1–5 on their phone; at the reveal, the highest pick that
// nobody else made scores that many points. It exercises the whole contract — a tutorial intro,
// rules shown on the TV, secret state, a timed phase, an early finish when everyone acted, a
// reveal and the final ranking — and is meant to be replaced by your game, keeping the same shape.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  rounds: number;
  pickSeconds: number;
}

type Phase = 'intro' | 'pick' | 'reveal';

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  round: number;
  phase: Phase;
  /** Tutorial slide on screen during the intro. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
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
  slide: number;
  slides: number;
  tvRules: number | null;
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
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  /** Full length of the running phase timer, for the countdown ring. */
  total: number | null;
  myPick: number | null;
}

export type Action =
  { type: 'pick'; value: number } | { type: 'intro'; dir: 1 | -1 | 'skip' } | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const REVEAL_MS = 8_000;
/** Safety net: if the Host never advances the tutorial (left the room), the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

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

const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      round: 1,
      phase: 'intro',
      slide: 0,
      tvRules: null,
      picks: {},
      scores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
      last: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object') return;

    // Shared screens (tutorial slides, rules on the TV) follow the Host only.
    if (action.type === 'tvRules') {
      const ok =
        action.page === null || (Number.isInteger(action.page) && action.page >= 0 && action.page < RULES.length);
      if (ok && isHost(ctx, playerId)) state.tvRules = action.page;
      return;
    }
    if (action.type === 'intro') {
      if (state.phase !== 'intro' || !isHost(ctx, playerId)) return;
      const last = state.slide === SLIDES.length - 1;
      if (action.dir === 'skip' || (action.dir === 1 && last)) {
        ctx.clearTimer('intro');
        state.tvRules = null;
        startRound(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (action.type !== 'pick' || state.phase !== 'pick') return;
    if (!Number.isInteger(action.value) || action.value < 1 || action.value > 5) return;
    state.picks[playerId] = action.value;
    ctx.emit('sound', 'tick');
    const waiting = ctx.players.filter((p) => p.connected && state.picks[p.id] === undefined);
    if (waiting.length === 0) reveal(state, ctx);
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startRound(state, ctx);
      return;
    }
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

  onPlayerTimeout(state, playerId, ctx) {
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro' && isHost(ctx, playerId)) {
      ctx.clearTimer('intro');
      startRound(state, ctx);
      return;
    }
    // A missing player simply doesn't pick; finish early if everyone else already did.
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
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
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
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      myPick: state.picks[playerId] ?? null,
    };
  },
});
