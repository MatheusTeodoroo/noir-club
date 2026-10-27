import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';

// Testa a Testa: a two-player poker duel. Each round both players get one card from a 20-card deck
// (two runs of 1–10) and see only the rival's card, on their own phone. They bet in turns — match
// (Pagar) to reveal, raise (Aumentar) to keep going, or fold (Desistir) — and the higher card takes
// the pot. Equal cards carry the pot over; folding with a 10 costs a 10-chip penalty.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  chips: number;
  rounds: number;
  turnSeconds: number;
}

type Phase = 'intro' | 'bet' | 'reveal';

export interface LogEntry {
  by: string;
  kind: 'raise' | 'call' | 'fold';
  /** The player's total bet after a raise or call. */
  to: number;
  /** The turn timer ran out and the engine called for them. */
  auto: boolean;
}

export interface RoundResult {
  kind: 'showdown' | 'fold';
  cards: Record<string, number>;
  /** null on a showdown between equal cards. */
  winnerId: string | null;
  /** Chips the winner took (or that carried over on a tie), before any penalty. */
  pot: number;
  folderId: string | null;
  /** 10-penalty paid by the folder (capped at their chips). */
  penalty: number;
  /** On a tie: the pot went back half and half because a player had no chips left. */
  refunded: boolean;
  /** Chips in front of each player before the payout (the TV shows them until the cards flip). */
  before: Record<string, number>;
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  slide: number;
  tvRules: number | null;
  round: number;
  /** The two participants, in seat order. */
  order: [string, string];
  starter: string;
  turn: string;
  /** SECRET: remaining deck. */
  deck: number[];
  /** Cards revealed since the last shuffle. */
  used: number[];
  reshuffled: boolean;
  /** SECRET until the reveal: each player's card this round. */
  cards: Record<string, number>;
  /** Chips in front of each player (not counting this round's bets). */
  chips: Record<string, number>;
  /** This round's bets, ante included. */
  bets: Record<string, number>;
  /** Pot carried over from tied rounds. */
  carry: number;
  log: LogEntry[];
  last: RoundResult | null;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  round: number;
  rounds: number;
  suddenDeath: boolean;
  deadline: number | null;
  total: number | null;
  order: [string, string];
  starter: string;
  turn: string | null;
  chips: Record<string, number>;
  bets: Record<string, number>;
  carry: number;
  log: LogEntry[];
  used: number[];
  deckLeft: number;
  reshuffled: boolean;
  reveal: RoundResult | null;
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  round: number;
  rounds: number;
  suddenDeath: boolean;
  deadline: number | null;
  total: number | null;
  rivalId: string | null;
  /** The card on the rival's brow — the only card this phone sees before the reveal. */
  rivalCard: number | null;
  /** Your own card, only once the round is revealed. */
  myCard: number | null;
  myTurn: boolean;
  chips: Record<string, number>;
  bets: Record<string, number>;
  carry: number;
  /** Chips needed to match the rival's bet. */
  toCall: number;
  /** Largest raise allowed over the rival's bet (0 = no raise possible). */
  maxRaise: number;
  log: LogEntry[];
  reveal: RoundResult | null;
}

export type Action =
  | { type: 'call' }
  | { type: 'raise'; by: number }
  | { type: 'fold' }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

export const FOLD_PENALTY = 10;
const ANTE = 1;
const REVEAL_MS = 8_000;
/** Safety net: if the Host never advances the tutorial, the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;
const FULL_DECK = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const rivalOf = (state: State, id: string) => (state.order[0] === id ? state.order[1] : state.order[0]);
const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
const potOf = (state: State) => state.carry + state.bets[state.order[0]]! + state.bets[state.order[1]]!;

function maxRaise(state: State, id: string): number {
  const rival = rivalOf(state, id);
  const toCall = state.bets[rival]! - state.bets[id]!;
  return Math.max(0, Math.min(state.chips[id]! - toCall, state.chips[rival]!));
}

function startRound(state: State, ctx: Ctx) {
  state.reshuffled = false;
  if (state.deck.length < 2) {
    state.deck = ctx.rng.shuffle([...FULL_DECK]);
    state.reshuffled = state.round > 1;
    state.used = [];
  }
  state.cards = {};
  for (const id of state.order) {
    state.cards[id] = state.deck.pop()!;
    state.chips[id]! -= ANTE;
    state.bets[id] = ANTE;
  }
  state.log = [];
  state.last = null;
  state.turn = state.starter;
  state.phase = 'bet';
  ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
  ctx.emit('sound', 'round');
}

function toReveal(state: State, ctx: Ctx, result: RoundResult) {
  for (const id of state.order) state.used.push(state.cards[id]!);
  state.last = result;
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2000);
  ctx.emit('fx', 'reveal', 2000);
}

function call(state: State, id: string, ctx: Ctx, auto: boolean) {
  const rival = rivalOf(state, id);
  const pay = Math.min(state.bets[rival]! - state.bets[id]!, state.chips[id]!);
  state.chips[id]! -= pay;
  state.bets[id]! += pay;
  // All-in short of the rival's bet: the excess goes back to the rival.
  if (state.bets[rival]! > state.bets[id]!) {
    state.chips[rival]! += state.bets[rival]! - state.bets[id]!;
    state.bets[rival] = state.bets[id]!;
  }
  state.log.push({ by: id, kind: 'call', to: state.bets[id]!, auto });

  const pot = potOf(state);
  const before = { ...state.chips };
  const [a, b] = state.order;
  const ca = state.cards[a]!;
  const cb = state.cards[b]!;
  const winnerId = ca === cb ? null : ca > cb ? a : b;
  let refunded = false;
  if (winnerId) {
    state.chips[winnerId]! += pot;
    state.carry = 0;
  } else {
    state.carry = pot;
    // Bets are equal at every showdown, so the carried pot is always even.
    if (state.chips[a] === 0 || state.chips[b] === 0) {
      state.chips[a]! += pot / 2;
      state.chips[b]! += pot / 2;
      state.carry = 0;
      refunded = true;
    }
  }
  state.bets = { [a]: 0, [b]: 0 };
  toReveal(state, ctx, { kind: 'showdown', cards: { ...state.cards }, winnerId, pot, folderId: null, penalty: 0, refunded, before });
}

function fold(state: State, id: string, ctx: Ctx) {
  const rival = rivalOf(state, id);
  const pot = potOf(state);
  const before = { ...state.chips };
  state.chips[rival]! += pot;
  state.carry = 0;
  const penalty = state.cards[id] === 10 ? Math.min(FOLD_PENALTY, state.chips[id]!) : 0;
  state.chips[id]! -= penalty;
  state.chips[rival]! += penalty;
  state.log.push({ by: id, kind: 'fold', to: state.bets[id]!, auto: false });
  state.bets = { [state.order[0]]: 0, [state.order[1]]: 0 };
  toReveal(state, ctx, { kind: 'fold', cards: { ...state.cards }, winnerId: rival, pot, folderId: id, penalty, refunded: false, before });
}

function endMatch(winnerId: string, state: State, ctx: Ctx) {
  ctx.end({ scores: Object.fromEntries(state.order.map((id) => [id, id === winnerId ? 1 : 0])) });
}

function nextOrEnd(state: State, ctx: Ctx) {
  const [a, b] = state.order;
  const ca = state.chips[a]!;
  const cb = state.chips[b]!;
  if (ca === 0 || cb === 0) return endMatch(ca === 0 ? b : a, state, ctx);
  if (state.round >= ctx.config.rounds && state.carry === 0 && ca !== cb) return endMatch(ca > cb ? a : b, state, ctx);
  state.round += 1;
  state.starter = rivalOf(state, state.starter);
  startRound(state, ctx);
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const order = ctx.players.map((p) => p.id).slice(0, 2) as [string, string];
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      round: 1,
      order,
      starter: ctx.rng.pick(order),
      turn: order[0],
      deck: [],
      used: [],
      reshuffled: false,
      cards: {},
      chips: Object.fromEntries(order.map((id) => [id, ctx.config.chips])),
      bets: Object.fromEntries(order.map((id) => [id, 0])),
      carry: 0,
      log: [],
      last: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRound(state, ctx);
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
        startRound(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (state.phase !== 'bet' || state.turn !== playerId) return;
    if (action.type === 'call') call(state, playerId, ctx, false);
    else if (action.type === 'fold') fold(state, playerId, ctx);
    else if (action.type === 'raise') {
      if (!Number.isInteger(action.by) || action.by < 1 || action.by > maxRaise(state, playerId)) return;
      const rival = rivalOf(state, playerId);
      const to = state.bets[rival]! + action.by;
      state.chips[playerId]! -= to - state.bets[playerId]!;
      state.bets[playerId] = to;
      state.log.push({ by: playerId, kind: 'raise', to, auto: false });
      state.turn = rival;
      ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
      ctx.emit('sound', 'tick');
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startRound(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'bet') call(state, state.turn, ctx, true);
    else if (state.phase === 'reveal') nextOrEnd(state, ctx);
  },

  onPlayerTimeout(state, playerId, ctx) {
    // A duel cannot go on with one player: whoever stayed wins.
    if (state.order.includes(playerId)) endMatch(rivalOf(state, playerId), state, ctx);
  },

  publicView(state, ctx): PublicView {
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      round: state.round,
      rounds: ctx.config.rounds,
      suddenDeath: state.round > ctx.config.rounds,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      order: state.order,
      starter: state.starter,
      turn: state.phase === 'bet' ? state.turn : null,
      chips: state.chips,
      bets: state.bets,
      carry: state.carry,
      log: state.log,
      used: state.used,
      deckLeft: state.deck.length,
      reshuffled: state.reshuffled,
      reveal: state.phase === 'reveal' ? state.last : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const seated = state.order.includes(playerId);
    const rivalId = seated ? rivalOf(state, playerId) : null;
    const dealt = state.phase !== 'intro';
    const myTurn = seated && state.phase === 'bet' && state.turn === playerId;
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      round: state.round,
      rounds: ctx.config.rounds,
      suddenDeath: state.round > ctx.config.rounds,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      rivalId,
      rivalCard: rivalId && dealt ? (state.cards[rivalId] ?? null) : null,
      myCard: seated && state.phase === 'reveal' ? (state.cards[playerId] ?? null) : null,
      myTurn,
      chips: state.chips,
      bets: state.bets,
      carry: state.carry,
      toCall: myTurn && rivalId ? state.bets[rivalId]! - state.bets[playerId]! : 0,
      maxRaise: myTurn ? maxRaise(state, playerId) : 0,
      log: state.log,
      reveal: state.phase === 'reveal' ? state.last : null,
    };
  },
});
