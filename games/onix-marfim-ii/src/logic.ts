import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';
import { REVEAL_AT, REVEAL_STEP_MS, ROUNDS, START_POINTS, WIN_TARGET, lampsOf, revealMs, stoneOf, type Stone } from './shared.ts';

// Ônix & Marfim II: a two-player duel over a budget of 99 points. Each round the starter bids any
// part of what they have left, the other answers, and the higher bid wins the round — but only
// the bids' colours (one digit = onyx, two digits = ivory) and each player's five-stage lamp are
// shown until the duel ends. Nine rounds, or five wins; equal wins start a tiebreak duel.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  turnSeconds: number;
}

type Phase = 'intro' | 'play' | 'result' | 'reveal';

/** Why the engine bid for a player: the turn timer ran out, or they had no points left. */
export type AutoBid = 'time' | 'empty';

/** One finished round, bids included — SECRET until the duel reveal. */
export interface RoundRecord {
  starter: string;
  bids: Record<string, number>;
  /** null when both bids were equal. */
  winnerId: string | null;
  auto: Record<string, AutoBid>;
}

/** A finished round as everyone may see it during the duel: colours only. */
export interface PublicRound {
  starter: string;
  stones: Record<string, Stone>;
  winnerId: string | null;
  auto: Record<string, AutoBid>;
}

export interface DuelReveal {
  rounds: RoundRecord[];
  wins: Record<string, number>;
  /** Points each player had left at the end of the duel. */
  left: Record<string, number>;
  /** null: wins are level and a tiebreak duel follows. */
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
  /** SECRET: the points each player still has. */
  points: Record<string, number>;
  /** SECRET: the bids made this round. */
  current: Record<string, number>;
  auto: Record<string, AutoBid>;
  /** SECRET (bids): this duel's finished rounds. */
  history: RoundRecord[];
  wins: Record<string, number>;
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
  winTarget: number;
  deadline: number | null;
  total: number | null;
  order: [string, string];
  starter: string;
  turn: string | null;
  wins: Record<string, number>;
  /** Lit lamp stages per player (0–5): the only public trace of the points left. */
  lamps: Record<string, number>;
  /** Colours bid this round (null = not yet). */
  current: Record<string, Stone | null>;
  /** Who the engine bid for this round, and why. */
  auto: Record<string, AutoBid>;
  history: PublicRound[];
  /** During `result`: the round just played. */
  result: PublicRound | null;
  /** During `reveal`: the whole duel with its bids. */
  reveal: DuelReveal | null;
}

/** What one phone shows: the public board plus this player's own numbers. */
export interface PlayerView extends PublicView {
  rivalId: string | null;
  /** Your points left. */
  myPoints: number;
  myTurn: boolean;
  /** Your bid this round. */
  mine: number | null;
  /** Your bid in each finished round of this duel (same order as `history`). */
  myBids: number[];
}

export type Action =
  | { type: 'bid'; amount: number }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const RESULT_MS = 4_000;
/** Safety net: if the Host never advances the tutorial, the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

const rivalOf = (state: State, id: string) => (state.order[0] === id ? state.order[1] : state.order[0]);
const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
const both = <T>(state: State, value: (id: string) => T): Record<string, T> =>
  Object.fromEntries(state.order.map((id) => [id, value(id)]));

function startDuel(state: State, ctx: Ctx) {
  state.points = both(state, () => START_POINTS);
  state.wins = both(state, () => 0);
  state.history = [];
  state.round = 1;
  startRound(state, ctx);
}

function startRound(state: State, ctx: Ctx) {
  state.current = {};
  state.auto = {};
  state.phase = 'play';
  ctx.emit('sound', 'round');
  beginTurn(state, state.starter, ctx);
}

/** Hands the turn to `id`; a player with no points left bids 0 at once. */
function beginTurn(state: State, id: string, ctx: Ctx): void {
  state.turn = id;
  if (state.points[id] === 0) return bid(state, id, 0, ctx, 'empty');
  ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
}

function bid(state: State, id: string, amount: number, ctx: Ctx, auto?: AutoBid): void {
  state.points[id]! -= amount;
  state.current[id] = amount;
  if (auto) state.auto[id] = auto;
  if (id === state.starter) {
    ctx.emit('sound', 'tick');
    return beginTurn(state, rivalOf(state, id), ctx);
  }
  const [a, b] = state.order;
  const ba = state.current[a]!;
  const bb = state.current[b]!;
  const winnerId = ba === bb ? null : ba > bb ? a : b;
  if (winnerId) state.wins[winnerId]! += 1;
  state.history.push({ starter: state.starter, bids: { ...state.current }, winnerId, auto: { ...state.auto } });
  state.phase = 'result';
  ctx.setTimer('phase', RESULT_MS);
  ctx.emit('sound', 'reveal');
  if (winnerId) ctx.emit('fx', 'round');
}

/** The duel is over: nine rounds played, five wins, or nobody has a point left to bid. */
const duelOver = (state: State) =>
  state.round >= ROUNDS ||
  state.order.some((id) => state.wins[id]! >= WIN_TARGET) ||
  state.order.every((id) => state.points[id] === 0);

function afterResult(state: State, ctx: Ctx) {
  const last = state.history.at(-1)!;
  // The round winner starts the next round; a tied round keeps the same starter.
  state.starter = last.winnerId ?? state.starter;
  if (!duelOver(state)) {
    state.round += 1;
    startRound(state, ctx);
    return;
  }
  const rounds = state.history.length;
  state.phase = 'reveal';
  ctx.setTimer('phase', revealMs(rounds));
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', REVEAL_AT);
  ctx.emit('fx', 'duel', REVEAL_AT + rounds * REVEAL_STEP_MS);
}

function duelWinner(state: State): string | null {
  const [a, b] = state.order;
  const wa = state.wins[a]!;
  const wb = state.wins[b]!;
  return wa === wb ? null : wa > wb ? a : b;
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
    stones: Object.fromEntries(Object.entries(r.bids).map(([id, n]) => [id, stoneOf(n)])),
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
    winTarget: WIN_TARGET,
    deadline: ctx.timerDeadline('phase'),
    total: ctx.timerTotal('phase'),
    order: state.order,
    starter: state.starter,
    turn: state.phase === 'play' ? state.turn : null,
    wins: state.wins,
    lamps: both(state, (id) => lampsOf(state.points[id]!)),
    current: both(state, (id) => (state.current[id] === undefined ? null : stoneOf(state.current[id]!))),
    auto: state.auto,
    history,
    result: state.phase === 'result' ? (history.at(-1) ?? null) : null,
    reveal:
      state.phase === 'reveal'
        ? { rounds: state.history, wins: state.wins, left: state.points, winnerId: duelWinner(state) }
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
      points: Object.fromEntries(order.map((id) => [id, START_POINTS])),
      current: {},
      auto: {},
      history: [],
      wins: Object.fromEntries(order.map((id) => [id, 0])),
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

    if (action.type !== 'bid' || state.phase !== 'play' || state.turn !== playerId) return;
    const { amount } = action;
    if (!Number.isInteger(amount) || amount < 0 || amount > state.points[playerId]!) return;
    bid(state, playerId, amount, ctx);
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startDuel(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'play') bid(state, state.turn, 0, ctx, 'time');
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
      myPoints: seated ? state.points[playerId]! : 0,
      myTurn: seated && state.phase === 'play' && state.turn === playerId,
      mine: seated ? (state.current[playerId] ?? null) : null,
      myBids: seated ? state.history.map((r) => r.bids[playerId]!) : [],
    };
  },
});
