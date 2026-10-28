import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';

// Frente e Verso: a two-player poker duel with double-sided cards. Each round both players get a
// card with two different numbers (1–10): the front is face up for everyone, the back is seen only
// by its owner. On their first move each player picks the side they bet on — front, back, or both
// (twice the stake, wins only if both faces beat the rival's side, +10 chips bonus). Then they bet
// in turns — call to reveal, raise to keep going, fold to concede. Equal faces carry the pot over.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  chips: number;
  rounds: number;
  turnSeconds: number;
}

type Phase = 'intro' | 'bet' | 'reveal';
export type Side = 'front' | 'back' | 'both';

export interface Card {
  front: number;
  back: number;
}

export interface LogEntry {
  by: string;
  kind: 'check' | 'call' | 'raise' | 'fold';
  /** The side picked with this move (first move only). */
  side: Side | null;
  /** The player's level (chips per side) after the move. */
  level: number;
  /** The turn timer ran out and the engine folded for them. */
  auto: boolean;
}

export interface RoundResult {
  kind: 'showdown' | 'fold';
  cards: Record<string, Card>;
  sides: Record<string, Side | null>;
  /** null on a showdown between equal faces. */
  winnerId: string | null;
  /** Chips the winner took (or that carried over on a tie), before the bonus. */
  pot: number;
  folderId: string | null;
  /** Both-sides bonus paid by the loser (capped at their chips). */
  bonus: number;
  /** On a tie: the pot went back half and half because a player had no chips left. */
  refunded: boolean;
  /** Chips in front of each player before the payout (the TV shows them until the cards flip). */
  before: Record<string, number>;
  /** Each player's bet this round. */
  bets: Record<string, number>;
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
  /** SECRET: remaining shoe. */
  shoe: Card[];
  reshuffled: boolean;
  /** Fronts are public; backs are SECRET until the reveal. */
  cards: Record<string, Card>;
  /** Chips in front of each player (not counting this round's bets). */
  chips: Record<string, number>;
  /** Chips per side this round, ante included. */
  levels: Record<string, number>;
  /** Side each player bets on (public once picked). */
  sides: Record<string, Side | null>;
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
  /** Front of each card (null before the first deal). */
  fronts: Record<string, number> | null;
  sides: Record<string, Side | null>;
  levels: Record<string, number>;
  bets: Record<string, number>;
  chips: Record<string, number>;
  carry: number;
  log: LogEntry[];
  shoeLeft: number;
  reshuffled: boolean;
  reveal: RoundResult | null;
}

/** One way to act on your turn: the side you would bet on and what it costs. */
export interface Move {
  side: Side;
  /** Chips to pay to match the rival's level on this side choice. */
  call: number;
  /** Largest raise (per side) over the rival's level; 0 = no raise. */
  maxRaise: number;
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
  /** Your card, both faces — the back is yours alone. */
  myCard: Card | null;
  /** The rival's front; their back only once the round is revealed (in `reveal`). */
  rivalFront: number | null;
  myTurn: boolean;
  /** The available moves on your turn (one per side you may still pick). */
  moves: Move[];
  /** Calling now only passes the turn: the rival has not picked a side yet. */
  checks: boolean;
  sides: Record<string, Side | null>;
  levels: Record<string, number>;
  bets: Record<string, number>;
  chips: Record<string, number>;
  carry: number;
  log: LogEntry[];
  reveal: RoundResult | null;
}

export type Action =
  | { type: 'call'; side?: Side }
  | { type: 'raise'; by: number; side?: Side }
  | { type: 'fold' }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

export const BOTH_BONUS = 10;
const ANTE = 1;
const SETS = 4;
const EXTRA_PER_SET = 5;
const REVEAL_MS = 8_000;
/** Safety net: if the Host never advances the tutorial, the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;
const SIDES: Side[] = ['front', 'back', 'both'];

const rivalOf = (state: State, id: string) => (state.order[0] === id ? state.order[1] : state.order[0]);
const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
export const multOf = (side: Side | null) => (side === 'both' ? 2 : 1);
const betOf = (state: State, id: string) => state.levels[id]! * multOf(state.sides[id] ?? null);
const potOf = (state: State) => state.carry + betOf(state, state.order[0]) + betOf(state, state.order[1]);
export const faceOf = (card: Card, side: 'front' | 'back') => card[side];

/** 4 sets of 50: the 45 distinct pairs once plus 5 random ones, each with a random front. */
function newShoe(ctx: Ctx): Card[] {
  const pairs: [number, number][] = [];
  for (let a = 1; a <= 10; a++) for (let b = a + 1; b <= 10; b++) pairs.push([a, b]);
  const cards: Card[] = [];
  for (let s = 0; s < SETS; s++) {
    const set = [...pairs];
    for (let i = 0; i < EXTRA_PER_SET; i++) set.push(ctx.rng.pick(pairs));
    for (const [a, b] of set) cards.push(ctx.rng.next() < 0.5 ? { front: a, back: b } : { front: b, back: a });
  }
  return ctx.rng.shuffle(cards);
}

/** The sides `id` may bet on now, with the cost of matching and the raise cap for each. */
export function movesOf(state: State, id: string): Move[] {
  const rival = rivalOf(state, id);
  const mine = state.sides[id] ?? null;
  const rl = state.levels[rival]!;
  const rivalMult = multOf(state.sides[rival] ?? null);
  const rivalCap = Math.floor((state.chips[rival]! + betOf(state, rival)) / rivalMult) - rl;
  const options = mine ? [mine] : SIDES.filter((s) => s !== 'both' || state.sides[rival] !== 'both');
  const moves: Move[] = [];
  for (const side of options) {
    const m = multOf(side);
    const call = rl * m - betOf(state, id);
    if (call > state.chips[id]!) continue;
    const myCap = Math.floor((state.chips[id]! + betOf(state, id)) / m) - rl;
    moves.push({ side, call, maxRaise: Math.max(0, Math.min(myCap, rivalCap)) });
  }
  return moves;
}

function startRound(state: State, ctx: Ctx) {
  state.reshuffled = false;
  if (state.shoe.length < 2) {
    state.reshuffled = state.round > 1;
    state.shoe = newShoe(ctx);
  }
  state.cards = {};
  for (const id of state.order) {
    state.cards[id] = state.shoe.pop()!;
    state.chips[id]! -= ANTE;
    state.levels[id] = ANTE;
    state.sides[id] = null;
  }
  state.log = [];
  state.last = null;
  state.turn = state.starter;
  state.phase = 'bet';
  ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
  ctx.emit('sound', 'round');
}

function toReveal(state: State, ctx: Ctx, result: Omit<RoundResult, 'cards' | 'sides'>) {
  state.last = { ...result, cards: { ...state.cards }, sides: { ...state.sides } };
  state.levels = { [state.order[0]]: 0, [state.order[1]]: 0 };
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2000);
  ctx.emit('fx', 'reveal', 2000);
}

/** Pays the both-sides bonus from `loser` to `winner`, capped at what the loser has. */
function payBonus(state: State, winner: string, loser: string): number {
  if (state.sides[winner] !== 'both') return 0;
  const bonus = Math.min(BOTH_BONUS, state.chips[loser]!);
  state.chips[loser]! -= bonus;
  state.chips[winner]! += bonus;
  return bonus;
}

/** Who wins a showdown: null on equal faces (only possible when nobody is on both sides). */
export function showdownWinner(cards: Record<string, Card>, sides: Record<string, Side | null>, order: [string, string]): string | null {
  const [a, b] = order;
  for (const [x, y] of [[a, b], [b, a]] as const) {
    if (sides[x] !== 'both') continue;
    const target = faceOf(cards[y]!, sides[y] as 'front' | 'back');
    return cards[x]!.front > target && cards[x]!.back > target ? x : y;
  }
  const fa = faceOf(cards[a]!, sides[a] as 'front' | 'back');
  const fb = faceOf(cards[b]!, sides[b] as 'front' | 'back');
  return fa === fb ? null : fa > fb ? a : b;
}

function showdown(state: State, ctx: Ctx) {
  const pot = potOf(state);
  const before = { ...state.chips };
  const bets = { [state.order[0]]: betOf(state, state.order[0]), [state.order[1]]: betOf(state, state.order[1]) };
  const [a, b] = state.order;
  const winnerId = showdownWinner(state.cards, state.sides, state.order);
  let refunded = false;
  let bonus = 0;
  if (winnerId) {
    state.chips[winnerId]! += pot;
    state.carry = 0;
    bonus = payBonus(state, winnerId, rivalOf(state, winnerId));
  } else {
    state.carry = pot;
    // Equal faces mean single sides at equal levels, so the carried pot is always even.
    if (state.chips[a] === 0 || state.chips[b] === 0) {
      state.chips[a]! += pot / 2;
      state.chips[b]! += pot / 2;
      state.carry = 0;
      refunded = true;
    }
  }
  toReveal(state, ctx, { kind: 'showdown', winnerId, pot, folderId: null, bonus, refunded, before, bets });
}

function fold(state: State, id: string, ctx: Ctx, auto: boolean) {
  const rival = rivalOf(state, id);
  const pot = potOf(state);
  const before = { ...state.chips };
  const bets = { [state.order[0]]: betOf(state, state.order[0]), [state.order[1]]: betOf(state, state.order[1]) };
  state.log.push({ by: id, kind: 'fold', side: null, level: state.levels[id]!, auto });
  state.chips[rival]! += pot;
  state.carry = 0;
  const bonus = payBonus(state, rival, id);
  toReveal(state, ctx, { kind: 'fold', winnerId: rival, pot, folderId: id, bonus, refunded: false, before, bets });
}

/** Applies the side pick (first move) and moves `id` to `level`. Returns false if not allowed. */
function commit(state: State, id: string, move: Move | undefined, level: number): boolean {
  if (!move) return false;
  const cost = level * multOf(move.side) - betOf(state, id);
  if (cost > state.chips[id]!) return false;
  state.sides[id] = move.side;
  state.chips[id]! -= cost;
  state.levels[id] = level;
  return true;
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
      shoe: [],
      reshuffled: false,
      cards: {},
      chips: Object.fromEntries(order.map((id) => [id, ctx.config.chips])),
      levels: Object.fromEntries(order.map((id) => [id, 0])),
      sides: Object.fromEntries(order.map((id) => [id, null])),
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
    if (action.type === 'fold') return fold(state, playerId, ctx, false);
    if (action.type !== 'call' && action.type !== 'raise') return;

    // The side is picked with the first move, and only then.
    const mine = state.sides[playerId];
    if (mine ? action.side !== undefined : !SIDES.includes(action.side as Side)) return;
    const move = movesOf(state, playerId).find((m) => m.side === (mine ?? action.side));
    const rival = rivalOf(state, playerId);
    const rl = state.levels[rival]!;

    if (action.type === 'call') {
      if (!commit(state, playerId, move, rl)) return;
      const checks = state.sides[rival] === null;
      state.log.push({ by: playerId, kind: checks ? 'check' : 'call', side: mine ? null : state.sides[playerId]!, level: rl, auto: false });
      if (!checks) return showdown(state, ctx);
    } else {
      if (!move || !Number.isInteger(action.by) || action.by < 1 || action.by > move.maxRaise) return;
      if (!commit(state, playerId, move, rl + action.by)) return;
      state.log.push({ by: playerId, kind: 'raise', side: mine ? null : state.sides[playerId]!, level: rl + action.by, auto: false });
    }
    state.turn = rival;
    ctx.setTimer('phase', ctx.config.turnSeconds * 1000);
    ctx.emit('sound', 'tick');
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startRound(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'bet') fold(state, state.turn, ctx, true);
    else if (state.phase === 'reveal') nextOrEnd(state, ctx);
  },

  onPlayerTimeout(state, playerId, ctx) {
    // A duel cannot go on with one player: whoever stayed wins.
    if (state.order.includes(playerId)) endMatch(rivalOf(state, playerId), state, ctx);
  },

  publicView(state, ctx): PublicView {
    const dealt = state.phase !== 'intro';
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
      fronts: dealt ? Object.fromEntries(state.order.map((id) => [id, state.cards[id]!.front])) : null,
      sides: state.sides,
      levels: state.levels,
      bets: Object.fromEntries(state.order.map((id) => [id, betOf(state, id)])),
      chips: state.chips,
      carry: state.carry,
      log: state.log,
      shoeLeft: state.shoe.length,
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
      myCard: seated && dealt ? (state.cards[playerId] ?? null) : null,
      rivalFront: rivalId && dealt ? (state.cards[rivalId]?.front ?? null) : null,
      myTurn,
      moves: myTurn ? movesOf(state, playerId) : [],
      checks: myTurn && rivalId !== null && state.sides[rivalId] === null,
      sides: state.sides,
      levels: state.levels,
      bets: Object.fromEntries(state.order.map((id) => [id, betOf(state, id)])),
      chips: state.chips,
      carry: state.carry,
      log: state.log,
      reveal: state.phase === 'reveal' ? state.last : null,
    };
  },
});
