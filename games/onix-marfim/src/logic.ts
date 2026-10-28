import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';
import { REVEAL_AT, REVEAL_STEP_MS, ROUNDS, STONES, stoneOf, type Stone } from './shared.ts';

// Ônix & Marfim: a two-player duel. Each player holds stones 0–8 (even = onyx, odd = ivory). Each
// round the starter presents a stone, the other answers, and the higher number scores a point —
// but only the colours are ever shown until the duel ends. Nine rounds; equal points start a
// tiebreak duel with fresh stones.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  turnSeconds: number;
}

type Phase = 'intro' | 'play' | 'result' | 'reveal';

/** One finished round, numbers included — SECRET until the duel reveal. */
export interface RoundRecord {
  starter: string;
  tiles: Record<string, number>;
  /** null when both numbers were equal. */
  winnerId: string | null;
  /** The turn timer ran out and the engine played the lowest stone for them. */
  auto: Record<string, boolean>;
}

/** A finished round as everyone may see it during the duel: colours only. */
export interface PublicRound {
  starter: string;
  stones: Record<string, Stone>;
  winnerId: string | null;
  auto: Record<string, boolean>;
}

export interface DuelReveal {
  rounds: RoundRecord[];
  points: Record<string, number>;
  /** null: points are level and a tiebreak duel follows. */
  winnerId: string | null;
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  slide: number;
  tvRules: number | null;
  /** 1 = the main duel, 2+ = tiebreak duels. */
  duel: number;
  round: number;
  order: [string, string];
  starter: string;
  turn: string;
  /** SECRET: the numbers each player still holds. */
  hands: Record<string, number[]>;
  /** SECRET: the numbers presented this round. */
  current: Record<string, number>;
  auto: Record<string, boolean>;
  /** SECRET (numbers): this duel's finished rounds. */
  history: RoundRecord[];
  points: Record<string, number>;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  duel: number;
  round: number;
  rounds: number;
  deadline: number | null;
  total: number | null;
  order: [string, string];
  starter: string;
  turn: string | null;
  points: Record<string, number>;
  /** Each player's remaining stones by colour — onyx first, never in number order. */
  remaining: Record<string, Stone[]>;
  /** Colours presented this round (null = not yet). */
  current: Record<string, Stone | null>;
  /** Who played automatically this round. */
  auto: Record<string, boolean>;
  history: PublicRound[];
  /** During `result`: the round just played. */
  result: PublicRound | null;
  /** During `reveal`: the whole duel with its numbers. */
  reveal: DuelReveal | null;
}

/** What one phone shows: the public board plus this player's own numbers. */
export interface PlayerView extends PublicView {
  rivalId: string | null;
  /** Your remaining numbers, ascending. */
  hand: number[];
  myTurn: boolean;
  /** The number you presented this round. */
  mine: number | null;
  /** Your number in each finished round of this duel (same order as `history`). */
  myTiles: number[];
}

export type Action =
  | { type: 'present'; tile: number }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const RESULT_MS = 4_000;
export const REVEAL_MS = REVEAL_AT + ROUNDS * REVEAL_STEP_MS + 4_200;
/** Safety net: if the Host never advances the tutorial, the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

const rivalOf = (state: State, id: string) => (state.order[0] === id ? state.order[1] : state.order[0]);
const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
const both = <T>(state: State, value: (id: string) => T): Record<string, T> =>
  Object.fromEntries(state.order.map((id) => [id, value(id)]));

function startDuel(state: State, ctx: Ctx) {
  state.hands = both(state, () => [...STONES]);
  state.points = both(state, () => 0);
  state.history = [];
  state.round = 1;
  startRound(state, ctx);
}

function startRound(state: State, ctx: Ctx) {
  state.current = {};
  state.auto = {};
  state.turn = state.starter;
  state.phase = 'play';
  ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
  ctx.emit('sound', 'round');
}

function present(state: State, id: string, tile: number, ctx: Ctx, auto: boolean) {
  const hand = state.hands[id]!;
  hand.splice(hand.indexOf(tile), 1);
  state.current[id] = tile;
  state.auto[id] = auto;
  if (id === state.starter) {
    state.turn = rivalOf(state, id);
    ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
    ctx.emit('sound', 'tick');
    return;
  }
  const [a, b] = state.order;
  const ta = state.current[a]!;
  const tb = state.current[b]!;
  const winnerId = ta === tb ? null : ta > tb ? a : b;
  if (winnerId) state.points[winnerId]! += 1;
  state.history.push({ starter: state.starter, tiles: { ...state.current }, winnerId, auto: { ...state.auto } });
  state.phase = 'result';
  ctx.setTimer('phase', RESULT_MS);
  ctx.emit('sound', 'reveal');
  if (winnerId) ctx.emit('fx', 'round');
}

function afterResult(state: State, ctx: Ctx) {
  const last = state.history.at(-1)!;
  // The round winner starts the next round; a tied round keeps the same starter.
  state.starter = last.winnerId ?? state.starter;
  if (state.round < ROUNDS) {
    state.round += 1;
    startRound(state, ctx);
    return;
  }
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', REVEAL_AT);
  ctx.emit('fx', 'duel', REVEAL_AT + ROUNDS * REVEAL_STEP_MS);
}

function duelWinner(state: State): string | null {
  const [a, b] = state.order;
  const pa = state.points[a]!;
  const pb = state.points[b]!;
  return pa === pb ? null : pa > pb ? a : b;
}

function afterReveal(state: State, ctx: Ctx) {
  const winner = duelWinner(state);
  if (winner) return endMatch(winner, state, ctx);
  state.duel += 1;
  startDuel(state, ctx);
}

function endMatch(winnerId: string, state: State, ctx: Ctx) {
  ctx.end({ scores: both(state, (id) => (id === winnerId ? 1 : 0)) });
}

function publicRound(r: RoundRecord): PublicRound {
  return {
    starter: r.starter,
    stones: Object.fromEntries(Object.entries(r.tiles).map(([id, n]) => [id, stoneOf(n)])),
    winnerId: r.winnerId,
    auto: r.auto,
  };
}

function board(state: State, ctx: Ctx): PublicView {
  const history = state.history.map(publicRound);
  return {
    phase: state.phase,
    slide: state.slide,
    slides: SLIDES.length,
    tvRules: state.tvRules,
    duel: state.duel,
    round: state.round,
    rounds: ROUNDS,
    deadline: ctx.timerDeadline('phase'),
    total: ctx.timerTotal('phase'),
    order: state.order,
    starter: state.starter,
    turn: state.phase === 'play' ? state.turn : null,
    points: state.points,
    remaining: both(state, (id) => {
      const stones = (state.hands[id] ?? []).map(stoneOf);
      return [...stones.filter((s) => s === 'onyx'), ...stones.filter((s) => s === 'ivory')];
    }),
    current: both(state, (id) => (state.current[id] === undefined ? null : stoneOf(state.current[id]!))),
    auto: state.auto,
    history,
    result: state.phase === 'result' ? (history.at(-1) ?? null) : null,
    reveal:
      state.phase === 'reveal'
        ? { rounds: state.history, points: state.points, winnerId: duelWinner(state) }
        : null,
  };
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const order = ctx.players.map((p) => p.id).slice(0, 2) as [string, string];
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      duel: 1,
      round: 1,
      order,
      starter: ctx.rng.pick(order),
      turn: order[0],
      hands: Object.fromEntries(order.map((id) => [id, [...STONES]])),
      current: {},
      auto: {},
      history: [],
      points: Object.fromEntries(order.map((id) => [id, 0])),
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startDuel(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object') return;

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
        startDuel(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (action.type !== 'present' || state.phase !== 'play' || state.turn !== playerId) return;
    if (!Number.isInteger(action.tile) || !state.hands[playerId]!.includes(action.tile)) return;
    present(state, playerId, action.tile, ctx, false);
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startDuel(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'play') present(state, state.turn, Math.min(...state.hands[state.turn]!), ctx, true);
    else if (state.phase === 'result') afterResult(state, ctx);
    else if (state.phase === 'reveal') afterReveal(state, ctx);
  },

  onPlayerTimeout(state, playerId, ctx) {
    // A duel cannot go on with one player: whoever stayed wins.
    if (state.order.includes(playerId)) endMatch(rivalOf(state, playerId), state, ctx);
  },

  publicView(state, ctx): PublicView {
    return board(state, ctx);
  },

  playerView(state, playerId, ctx): PlayerView {
    const seated = state.order.includes(playerId);
    return {
      ...board(state, ctx),
      rivalId: seated ? rivalOf(state, playerId) : null,
      hand: seated && state.phase !== 'intro' ? [...state.hands[playerId]!].sort((x, y) => x - y) : [],
      myTurn: seated && state.phase === 'play' && state.turn === playerId,
      mine: seated ? (state.current[playerId] ?? null) : null,
      myTiles: seated ? state.history.map((r) => r.tiles[playerId]!) : [],
    };
  },
});
