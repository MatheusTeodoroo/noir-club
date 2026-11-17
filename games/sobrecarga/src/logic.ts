import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { CARDS, HAND_COLORS, HAND_ROUNDS, LIMIT, PILES, type Color, type Pile } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Sobrecarga: everyone secretly sends a card (0–6, the chip's value) and a colour chip (which
// stack). The reveal sorts the stacking order; players then stack one at a time, or pass once to
// go to the back. Whoever brings a stack to 13 or more takes the chips that were on it as a
// penalty. Fewest penalties wins.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  rounds: number;
  submitSeconds: number;
  turnSeconds: number;
  showSpent: boolean;
}

export type Phase = 'intro' | 'submit' | 'reveal' | 'place' | 'roundEnd';

export interface Hand {
  cards: number[];
  colors: Color[];
}

export interface Play {
  card: number;
  color: Color;
  /** Drawn by the game (time ran out or the player was away). */
  auto: boolean;
}

/** One stacking, as the TV animates it. */
export interface StackEvent {
  id: number;
  playerId: string;
  pile: Pile;
  value: number;
  /** Chips collected as a penalty (0 = the stack held). */
  penalty: number;
}

export interface State {
  phase: Phase;
  round: number;
  slide: number;
  tvRules: number | null;
  /** Seating order (clockwise) = lobby order. */
  seats: string[];
  /** First-player marker. */
  marker: string;
  /** Who held the marker when the round started (the TV shows the change). */
  prevMarker: string;
  /** SECRET: what each player still holds (the current submission is removed at the reveal). */
  hands: Record<string, Hand>;
  /** Public once revealed: what each player already played this hand. */
  spent: Record<string, Hand>;
  /** SECRET until the reveal. */
  subs: Record<string, Play>;
  stacks: Record<Pile, number[]>;
  penalties: Record<string, number>;
  /** Sequence number of each player's latest penalty (0 = never), for the final tie-break. */
  lastPenalty: Record<string, number>;
  penaltySeq: number;
  /** Players the platform timed out; they play automatically while still disconnected. */
  timedOut: Record<string, boolean>;
  /** Stacking phase: players still to stack, in order (passers excluded). */
  queue: string[];
  /** Passers, already in the order they will stack (last to pass first). */
  tail: string[];
  passed: string[];
  placed: string[];
  /** Whose turn it is; null during the short beat between turns. */
  turn: string | null;
  events: StackEvent[];
  eventSeq: number;
}

export interface PublicView {
  phase: Phase;
  round: number;
  rounds: number;
  /** 1..7 within the current hand. */
  handRound: number;
  /** True on the first round of a refreshed hand (round 8, 15…). */
  newHand: boolean;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  limit: number;
  seats: string[];
  marker: string;
  prevMarker: string;
  stacks: Record<Pile, number[]>;
  /** Submit phase: who already sent — never what. */
  submitted: string[];
  /** From the reveal on: every player's card and colour this round. */
  plays: Record<string, Play> | null;
  /** Stacking order still to come (current turn first). */
  order: string[];
  turn: string | null;
  passed: string[];
  placed: string[];
  /** This round's stackings, oldest first. */
  events: StackEvent[];
  penalties: Record<string, number>;
  /** Players best → worst (fewest penalties; tie: penalised last is worse). */
  standing: string[];
  /** Cards and colours already used this hand (when the Host shows them). */
  spent: Record<string, Hand> | null;
  /** Players currently playing automatically. */
  autos: string[];
}

export interface PlayerView {
  phase: Phase;
  round: number;
  rounds: number;
  handRound: number;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  limit: number;
  hand: Hand;
  mySub: { card: number; color: Color } | null;
  myPlay: Play | null;
  /** Stack totals (public), for the rainbow choice. */
  sums: Record<Pile, number>;
  myTurn: boolean;
  canPass: boolean;
  /** 1-based position in the remaining order, or null once stacked / outside the reveal. */
  position: number | null;
  penalties: number;
  hasMarker: boolean;
}

export type Action =
  | { type: 'submit'; card: number; color: Color }
  | { type: 'place'; pile?: Pile }
  | { type: 'pass' }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

export const REVEAL_MS = 7_000;
export const BEAT_MS = 1_400;
export const TOPPLE_BEAT_MS = 3_200;
export const AUTO_MS = 1_500;
export const ROUND_END_MS = 6_000;
export const LAST_ROUND_END_MS = 8_000;
const INTRO_MAX_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// Pure rules (exported for tests)
// ---------------------------------------------------------------------------

export const freshHand = (): Hand => ({ cards: [...CARDS], colors: [...HAND_COLORS] });
export const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

/**
 * Stacking order: rainbow first (higher card first among them), then higher card first; ties go
 * to the marker, then clockwise from the marker.
 */
export function playOrder(seats: string[], marker: string, plays: Record<string, Play>): string[] {
  const n = seats.length;
  const m = seats.indexOf(marker);
  const clock = (id: string) => (seats.indexOf(id) - m + n) % n;
  return seats
    .filter((id) => plays[id])
    .sort((a, b) => {
      const pa = plays[a]!;
      const pb = plays[b]!;
      const wa = pa.color === 'w' ? 0 : 1;
      const wb = pb.color === 'w' ? 0 : 1;
      return wa - wb || pb.card - pa.card || clock(a) - clock(b);
    });
}

/** Adds a chip; returns the new stack and the chips collected (penalty). */
export function stackChip(stack: number[], value: number): { stack: number[]; penalty: number } {
  const next = [...stack, value];
  if (sum(next) >= LIMIT) return { stack: [value], penalty: stack.length };
  return { stack: next, penalty: 0 };
}

/** Best → worst: fewest penalties; equal → the one penalised more recently is worse. */
export function standing(seats: string[], penalties: Record<string, number>, last: Record<string, number>): string[] {
  return [...seats].sort((a, b) => (penalties[a] ?? 0) - (penalties[b] ?? 0) || (last[a] ?? 0) - (last[b] ?? 0));
}

/** Match points: N−1 for the best … 0 for the worst; exact ties share the better position. */
export function matchScores(
  seats: string[],
  penalties: Record<string, number>,
  last: Record<string, number>,
): Record<string, number> {
  const n = seats.length;
  const better = (a: string, b: string) => {
    const pa = penalties[a] ?? 0;
    const pb = penalties[b] ?? 0;
    return pa < pb || (pa === pb && (last[a] ?? 0) < (last[b] ?? 0));
  };
  return Object.fromEntries(seats.map((id) => [id, n - 1 - seats.filter((o) => better(o, id)).length]));
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);
const isAuto = (state: State, ctx: Ctx, id: string) =>
  !!state.timedOut[id] && !ctx.players.find((p) => p.id === id)?.connected;
const remaining = (state: State) => [...state.queue, ...state.tail];

function randomPlay(state: State, ctx: Ctx, id: string): Play {
  const hand = state.hands[id]!;
  return { card: ctx.rng.pick(hand.cards), color: ctx.rng.pick(hand.colors), auto: true };
}

function startRound(state: State, ctx: Ctx) {
  if ((state.round - 1) % HAND_ROUNDS === 0) {
    for (const id of state.seats) {
      state.hands[id] = freshHand();
      state.spent[id] = { cards: [], colors: [] };
    }
  }
  state.phase = 'submit';
  state.subs = {};
  state.queue = [];
  state.tail = [];
  state.passed = [];
  state.placed = [];
  state.turn = null;
  state.events = [];
  state.prevMarker = state.marker;
  for (const id of state.seats) if (isAuto(state, ctx, id)) state.subs[id] = randomPlay(state, ctx, id);
  ctx.setTimer('phase', ctx.config.submitSeconds * 1000);
  ctx.emit('sound', 'round');
  checkAllSubmitted(state, ctx);
}

function checkAllSubmitted(state: State, ctx: Ctx) {
  if (state.phase !== 'submit') return;
  if (ctx.players.every((p) => !p.connected || state.subs[p.id])) reveal(state, ctx);
}

function reveal(state: State, ctx: Ctx) {
  for (const id of state.seats) {
    if (!state.subs[id]) state.subs[id] = randomPlay(state, ctx, id);
    const play = state.subs[id]!;
    const hand = state.hands[id]!;
    hand.cards.splice(hand.cards.indexOf(play.card), 1);
    hand.colors.splice(hand.colors.indexOf(play.color), 1);
    state.spent[id]!.cards.push(play.card);
    state.spent[id]!.colors.push(play.color);
  }
  state.queue = playOrder(state.seats, state.marker, state.subs);
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
}

function nextTurn(state: State, ctx: Ctx) {
  const id = remaining(state)[0];
  if (!id) return endRound(state, ctx);
  state.turn = id;
  ctx.setTimer('turn', isAuto(state, ctx, id) ? AUTO_MS : ctx.config.turnSeconds * 1000);
}

export function lowestPile(stacks: Record<Pile, number[]>): Pile {
  return PILES.reduce((best, p) => (sum(stacks[p]) < sum(stacks[best]) ? p : best), PILES[0]!);
}

function place(state: State, ctx: Ctx, id: string, pile: Pile) {
  const play = state.subs[id]!;
  const { stack, penalty } = stackChip(state.stacks[pile], play.card);
  state.stacks[pile] = stack;
  state.eventSeq += 1;
  state.events.push({ id: state.eventSeq, playerId: id, pile, value: play.card, penalty });
  if (penalty > 0) {
    state.penalties[id] = (state.penalties[id] ?? 0) + penalty;
    state.penaltySeq += 1;
    state.lastPenalty[id] = state.penaltySeq;
    state.marker = id;
    ctx.emit('sound', 'reveal');
    ctx.emit('fx', 'topple');
  } else {
    ctx.emit('sound', 'tick');
  }
  state.queue = state.queue.filter((x) => x !== id);
  state.tail = state.tail.filter((x) => x !== id);
  state.placed.push(id);
  state.turn = null;
  ctx.setTimer('turn', penalty > 0 ? TOPPLE_BEAT_MS : BEAT_MS);
}

function autoPlace(state: State, ctx: Ctx, id: string) {
  const play = state.subs[id]!;
  place(state, ctx, id, play.color === 'w' ? lowestPile(state.stacks) : play.color);
}

function endRound(state: State, ctx: Ctx) {
  ctx.clearTimer('turn');
  state.turn = null;
  if (!state.events.some((e) => e.penalty > 0)) {
    const i = state.seats.indexOf(state.marker);
    state.marker = state.seats[(i + 1) % state.seats.length]!;
  }
  state.phase = 'roundEnd';
  ctx.setTimer('phase', state.round >= ctx.config.rounds ? LAST_ROUND_END_MS : ROUND_END_MS);
  ctx.emit('sound', 'phase');
}

function startPlay(state: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  state.tvRules = null;
  startRound(state, ctx);
}

const revealedPhase = (phase: Phase) => phase === 'reveal' || phase === 'place' || phase === 'roundEnd';
const handRoundOf = (round: number) => ((round - 1) % HAND_ROUNDS) + 1;

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const seats = ctx.players.map((p) => p.id);
    const marker = ctx.rng.pick(seats);
    const state: State = {
      phase: 'intro',
      round: 1,
      slide: 0,
      tvRules: null,
      seats,
      marker,
      prevMarker: marker,
      hands: {},
      spent: {},
      subs: {},
      stacks: { r: [], g: [], b: [] },
      penalties: Object.fromEntries(seats.map((id) => [id, 0])),
      lastPenalty: Object.fromEntries(seats.map((id) => [id, 0])),
      penaltySeq: 0,
      timedOut: {},
      queue: [],
      tail: [],
      passed: [],
      placed: [],
      turn: null,
      events: [],
      eventSeq: 0,
    };
    for (const id of seats) {
      state.hands[id] = freshHand();
      state.spent[id] = { cards: [], colors: [] };
    }
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object') return;
    if (!state.seats.includes(playerId)) return;

    if (action.type === 'tvRules') {
      const ok =
        action.page === null || (Number.isInteger(action.page) && action.page >= 0 && action.page < RULES.length);
      if (ok && isHost(ctx, playerId)) state.tvRules = action.page;
      return;
    }
    if (action.type === 'intro') {
      if (state.phase !== 'intro' || !isHost(ctx, playerId)) return;
      const last = state.slide === SLIDES.length - 1;
      if (action.dir === 'skip' || (action.dir === 1 && last)) startPlay(state, ctx);
      else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (action.type === 'submit') {
      if (state.phase !== 'submit') return;
      const hand = state.hands[playerId]!;
      if (!Number.isInteger(action.card) || !hand.cards.includes(action.card)) return;
      if (typeof action.color !== 'string' || !hand.colors.includes(action.color)) return;
      const prev = state.subs[playerId];
      if (prev && prev.card === action.card && prev.color === action.color) return;
      state.subs[playerId] = { card: action.card, color: action.color, auto: false };
      if (!prev) ctx.emit('sound', 'tick');
      checkAllSubmitted(state, ctx);
      return;
    }

    if (state.phase !== 'place' || state.turn !== playerId) return;
    const play = state.subs[playerId]!;
    if (action.type === 'place') {
      if (play.color === 'w') {
        if (action.pile !== 'r' && action.pile !== 'g' && action.pile !== 'b') return;
        place(state, ctx, playerId, action.pile);
      } else {
        if (action.pile !== undefined && action.pile !== play.color) return;
        place(state, ctx, playerId, play.color);
      }
      return;
    }
    if (action.type === 'pass') {
      if (state.passed.includes(playerId) || !state.queue.includes(playerId)) return;
      state.passed.push(playerId);
      state.queue = state.queue.filter((x) => x !== playerId);
      state.tail.unshift(playerId);
      state.turn = null;
      ctx.emit('sound', 'phase');
      ctx.setTimer('turn', BEAT_MS);
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startPlay(state, ctx);
      return;
    }
    if (key === 'turn') {
      if (state.phase !== 'place') return;
      if (state.turn) autoPlace(state, ctx, state.turn);
      else nextTurn(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'submit') reveal(state, ctx);
    else if (state.phase === 'reveal') {
      state.phase = 'place';
      nextTurn(state, ctx);
    } else if (state.phase === 'roundEnd') {
      if (state.round >= ctx.config.rounds) {
        ctx.end({ scores: matchScores(state.seats, state.penalties, state.lastPenalty) });
      } else {
        state.round += 1;
        startRound(state, ctx);
      }
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    state.timedOut[playerId] = true;
    if (state.phase === 'intro') {
      if (isHost(ctx, playerId)) startPlay(state, ctx);
      return;
    }
    if (state.phase === 'submit') {
      if (!state.subs[playerId]) state.subs[playerId] = randomPlay(state, ctx, playerId);
      checkAllSubmitted(state, ctx);
    } else if (state.phase === 'place' && state.turn === playerId) {
      autoPlace(state, ctx, playerId);
    }
  },

  publicView(state, ctx): PublicView {
    const revealed = revealedPhase(state.phase);
    const handRound = handRoundOf(state.round);
    const timer = state.phase === 'place' ? 'turn' : 'phase';
    return {
      phase: state.phase,
      round: state.round,
      rounds: ctx.config.rounds,
      handRound,
      newHand: handRound === 1 && state.round > 1,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: state.phase === 'place' && !state.turn ? null : ctx.timerDeadline(timer),
      total: ctx.timerTotal(timer),
      limit: LIMIT,
      seats: state.seats,
      marker: state.marker,
      prevMarker: state.prevMarker,
      stacks: state.stacks,
      submitted: state.phase === 'submit' ? state.seats.filter((id) => state.subs[id]) : [],
      plays: revealed ? state.subs : null,
      order: revealed ? remaining(state) : [],
      turn: state.turn,
      passed: state.passed,
      placed: state.placed,
      events: state.events,
      penalties: state.penalties,
      standing: standing(state.seats, state.penalties, state.lastPenalty),
      spent: ctx.config.showSpent ? state.spent : null,
      autos: state.seats.filter((id) => isAuto(state, ctx, id)),
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const revealed = revealedPhase(state.phase);
    const sub = state.subs[playerId];
    const order = remaining(state);
    const myTurn = state.phase === 'place' && state.turn === playerId;
    const timer = state.phase === 'place' ? 'turn' : 'phase';
    return {
      phase: state.phase,
      round: state.round,
      rounds: ctx.config.rounds,
      handRound: handRoundOf(state.round),
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: state.phase === 'place' && !myTurn ? null : ctx.timerDeadline(timer),
      total: ctx.timerTotal(timer),
      limit: LIMIT,
      hand: state.hands[playerId] ?? { cards: [], colors: [] },
      mySub: state.phase === 'submit' && sub ? { card: sub.card, color: sub.color } : null,
      myPlay: revealed && sub ? sub : null,
      sums: { r: sum(state.stacks.r), g: sum(state.stacks.g), b: sum(state.stacks.b) },
      myTurn,
      canPass: myTurn && state.queue.includes(playerId) && !state.passed.includes(playerId),
      position: revealed && order.includes(playerId) ? order.indexOf(playerId) + 1 : null,
      penalties: state.penalties[playerId] ?? 0,
      hasMarker: state.marker === playerId,
    };
  },
});
