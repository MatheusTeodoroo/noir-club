import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { COST, MAX_CHARGE, START_CREDITS, aimSeat, chamberAt, pairOf, triggerCount } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Roleta Russa — adapted from "Russian Roulette" (The Devil's Plan, season 3, episode 5).
// One chamber per seat, a few hidden bullets. On your turn you pay credits to investigate,
// spin or secretly swap chambers. Spinning turns the whole gun clockwise: the barrel (always over
// chamber A) aims at the next seat. When half the table is out of credits, the gun fires once at
// every seat, starting with the one in its sights and going clockwise.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  bullets: number;
}

export type Phase = 'intro' | 'play' | 'firing' | 'end';

/** A turn as everyone saw it. Private actions all look the same; no result is ever kept here. */
export type LogEntry =
  | { turn: number; pid: string; kind: 'pub'; pair: number }
  | { turn: number; pid: string; kind: 'spin'; steps: 1 | 2; rot: number }
  | { turn: number; pid: string; kind: 'private' };

/** What one player alone knows about their own past turns. */
export type Note =
  | { turn: number; kind: 'peek'; pair: number }
  | { turn: number; kind: 'charge'; amount: number; total: number; lost: boolean }
  | { turn: number; kind: 'swap'; pair: number }
  | { turn: number; kind: 'pass' };

/** An investigation result, shown for FLASH_MS and then gone for good. */
export interface Flash {
  turn: number;
  pid: string;
  pair: number;
  result: [boolean, boolean];
  /** true: only the investigator's phone shows it. */
  secret: boolean;
}

/** What a phone shows of a live investigation result. */
export interface FlashView extends Flash {
  deadline: number | null;
  total: number | null;
}

export interface Shot {
  seat: number;
  chamber: number;
  hit: boolean;
}

export interface State {
  phase: Phase;
  slide: number;
  tvRules: number | null;
  /** Player ids clockwise; seat 0 drew ball 1 and starts in the gun's sights. */
  seats: string[];
  /** SECRET until the firing: which chambers hold a bullet. */
  bullets: boolean[];
  /** Clockwise steps the gun has turned (public: spins are announced). Aims at seat rot. */
  rot: number;
  round: number;
  /** Turns already taken this round (the seat to play is (round - 1 + this) mod n). */
  turnInRound: number;
  /** Global turn counter, 1-based, of the turn being played. */
  turn: number;
  /** SECRET per player. */
  credits: Record<string, number>;
  /** SECRET per player: credits loaded into the Manipulation. */
  charge: Record<string, number>;
  /** The current player completed a Manipulation and must still pick the pair (secret). */
  swapPending: boolean;
  /** Players gone past the grace period: still targets, but their turns pass on their own. */
  out: Record<string, boolean>;
  log: LogEntry[];
  /** SECRET per player. */
  notes: Record<string, Note[]>;
  /** SECRET: the investigation result on display right now (phones only, never the TV). */
  flash: Flash | null;
  shots: Shot[];
}

export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  seats: string[];
  n: number;
  rot: number;
  bulletCount: number;
  trigger: number;
  round: number;
  turn: number;
  /** Who is playing now (null outside the play phase). */
  current: string | null;
  /** The most recent turns, newest last. */
  log: LogEntry[];
  shots: Shot[];
  /** Every chamber, revealed once the firing is over. */
  reveal: boolean[] | null;
  out: string[];
}

export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  /** Public seating, so the phone can say whom each chamber points at. */
  seats: string[];
  n: number;
  rot: number;
  trigger: number;
  round: number;
  turn: number;
  current: string | null;
  myTurn: boolean;
  credits: number;
  charge: number;
  swapPending: boolean;
  out: boolean;
  notes: Note[];
  /** The investigation result this phone may show right now (public: everyone; private: the investigator). */
  flash: FlashView | null;
  /** After the firing: whether this player was hit (null before the end). */
  hit: boolean | null;
}

export type Action =
  | { type: 'investigate'; pair: number; secret: boolean }
  | { type: 'spin'; steps: 1 | 2 }
  | { type: 'charge'; amount: number }
  | { type: 'manipulate'; pair: number }
  | { type: 'pass' }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

/** Pause on the "the gun fires" title before the first shot. */
export const FIRE_INTRO_MS = 4_000;
/** One shot: drumroll, then click or bang (the TV reveals at SHOT_REVEAL_MS). */
export const SHOT_MS = 3_400;
export const SHOT_REVEAL_MS = 2_300;
/** The whole cylinder on the TV before the platform's scoreboard. */
export const END_MS = 10_000;
/** How long an investigation result stays on the phones. */
export const FLASH_MS = 8_000;
const INTRO_MAX_MS = 5 * 60_000;
const LOG_SIZE = 8;

const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);
const currentSeat = (s: State) => (s.round - 1 + s.turnInRound) % s.seats.length;
const currentId = (s: State) => s.seats[currentSeat(s)]!;
const isPair = (s: State, k: unknown): k is number =>
  Number.isInteger(k) && (k as number) >= 0 && (k as number) < s.seats.length;
const brokeCount = (s: State) => s.seats.filter((id) => s.credits[id] === 0).length;

function startPlay(state: State, ctx: Ctx) {
  state.phase = 'play';
  state.tvRules = null;
  ctx.emit('sound', 'round');
  passAbsent(state, ctx);
}

/** Ends the current turn: the firing if enough players are broke, else the next seat. */
function endTurn(state: State, ctx: Ctx) {
  state.swapPending = false;
  if (brokeCount(state) >= triggerCount(state.seats.length)) {
    startFiring(state, ctx);
    return;
  }
  state.turn += 1;
  state.turnInRound += 1;
  if (state.turnInRound >= state.seats.length) {
    state.turnInRound = 0;
    state.round += 1;
    ctx.emit('sound', 'round');
  } else ctx.emit('sound', 'tick');
  passAbsent(state, ctx);
}

/** Players who left the match pass on their own (it can only chain until the firing starts). */
function passAbsent(state: State, ctx: Ctx) {
  if (state.phase !== 'play') return;
  const id = currentId(state);
  if (!state.out[id]) return;
  state.log.push({ turn: state.turn, pid: id, kind: 'private' });
  state.notes[id]!.push({ turn: state.turn, kind: 'pass' });
  endTurn(state, ctx);
}

function startFiring(state: State, ctx: Ctx) {
  state.phase = 'firing';
  state.swapPending = false;
  state.flash = null;
  ctx.clearTimer('flash');
  state.shots = [];
  ctx.setTimer('shot', FIRE_INTRO_MS);
  ctx.emit('sound', 'phase');
}

function fireNext(state: State, ctx: Ctx) {
  const n = state.seats.length;
  const seat = (aimSeat(state.rot, n) + state.shots.length) % n;
  const chamber = chamberAt(seat, state.rot, n);
  const hit = state.bullets[chamber]!;
  state.shots.push({ seat, chamber, hit });
  ctx.emit('sound', 'drumroll');
  if (hit) {
    ctx.emit('sound', 'reveal', SHOT_REVEAL_MS);
    ctx.emit('fx', 'bang', SHOT_REVEAL_MS);
  } else ctx.emit('sound', 'tick', SHOT_REVEAL_MS);
  const fired = state.shots.filter((s) => s.hit).length;
  const total = state.bullets.filter(Boolean).length;
  if (fired >= total || state.shots.length >= n) ctx.setTimer('done', SHOT_MS);
  else ctx.setTimer('shot', SHOT_MS);
}

function finish(state: State, ctx: Ctx) {
  const hit = new Set(state.shots.filter((s) => s.hit).map((s) => state.seats[s.seat]));
  ctx.end({ scores: Object.fromEntries(state.seats.map((id) => [id, hit.has(id) ? 0 : 1])) });
}

/** Spend credits; returns false (and changes nothing) if the player can't afford it. */
function pay(state: State, id: string, cost: number) {
  if (state.credits[id]! < cost) return false;
  state.credits[id]! -= cost;
  return true;
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const seats = ctx.rng.shuffle(ctx.players.map((p) => p.id));
    const n = seats.length;
    const count = Math.max(1, Math.min(ctx.config.bullets, n - 1));
    const loaded = new Set(ctx.rng.shuffle(seats.map((_, i) => i)).slice(0, count));
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      seats,
      bullets: seats.map((_, i) => loaded.has(i)),
      rot: 0,
      round: 1,
      turnInRound: 0,
      turn: 1,
      credits: Object.fromEntries(seats.map((id) => [id, START_CREDITS])),
      charge: Object.fromEntries(seats.map((id) => [id, 0])),
      swapPending: false,
      out: {},
      log: [],
      notes: Object.fromEntries(seats.map((id) => [id, []])),
      flash: null,
      shots: []
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startPlay(state, ctx);
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
        startPlay(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (state.phase !== 'play' || playerId !== currentId(state) || state.out[playerId]) return;
    const n = state.seats.length;
    const id = playerId;
    const notes = state.notes[id]!;

    if (state.swapPending) {
      if (action.type !== 'manipulate' || !isPair(state, action.pair)) return;
      const [a, b] = pairOf(action.pair, n);
      [state.bullets[a], state.bullets[b]] = [state.bullets[b]!, state.bullets[a]!];
      notes.push({ turn: state.turn, kind: 'swap', pair: action.pair });
      state.log.push({ turn: state.turn, pid: id, kind: 'private' });
      endTurn(state, ctx);
      return;
    }

    switch (action.type) {
      case 'investigate': {
        if (!isPair(state, action.pair) || typeof action.secret !== 'boolean') return;
        if (!pay(state, id, action.secret ? COST.privInvestigate : COST.pubInvestigate)) return;
        const [a, b] = pairOf(action.pair, n);
        const result: [boolean, boolean] = [state.bullets[a]!, state.bullets[b]!];
        state.flash = { turn: state.turn, pid: id, pair: action.pair, result, secret: action.secret };
        ctx.setTimer('flash', FLASH_MS);
        if (action.secret) {
          notes.push({ turn: state.turn, kind: 'peek', pair: action.pair });
          state.log.push({ turn: state.turn, pid: id, kind: 'private' });
        } else {
          state.log.push({ turn: state.turn, pid: id, kind: 'pub', pair: action.pair });
        }
        endTurn(state, ctx);
        return;
      }
      case 'spin': {
        if (action.steps !== 1 && action.steps !== 2) return;
        if (!pay(state, id, action.steps === 1 ? COST.spin1 : COST.spin2)) return;
        state.rot = (state.rot + action.steps) % n;
        state.log.push({ turn: state.turn, pid: id, kind: 'spin', steps: action.steps, rot: state.rot });
        endTurn(state, ctx);
        return;
      }
      case 'charge': {
        const amount = action.amount;
        if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CHARGE) return;
        if (!pay(state, id, amount)) return;
        const total = state.charge[id]! + amount;
        const lost = total > COST.manipulate;
        notes.push({ turn: state.turn, kind: 'charge', amount, total, lost });
        if (total === COST.manipulate) {
          // Complete: the same turn continues with the (secret) choice of the pair.
          state.charge[id] = 0;
          state.swapPending = true;
          return;
        }
        state.charge[id] = lost ? 0 : total;
        state.log.push({ turn: state.turn, pid: id, kind: 'private' });
        endTurn(state, ctx);
        return;
      }
      case 'pass': {
        if (state.credits[id] !== 0) return;
        notes.push({ turn: state.turn, kind: 'pass' });
        state.log.push({ turn: state.turn, pid: id, kind: 'private' });
        endTurn(state, ctx);
        return;
      }
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'flash') {
      state.flash = null;
    } else if (key === 'intro') {
      if (state.phase === 'intro') startPlay(state, ctx);
    } else if (key === 'shot') {
      if (state.phase === 'firing') fireNext(state, ctx);
    } else if (key === 'done') {
      state.phase = 'end';
      ctx.setTimer('end', END_MS);
      ctx.emit('fx', 'reveal');
    } else if (key === 'end') {
      finish(state, ctx);
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    if (state.out[playerId] || state.phase === 'firing' || state.phase === 'end') return;
    // Still at the table (still a target), but out of the decisions: broke, and auto-pass.
    state.out[playerId] = true;
    state.credits[playerId] = 0;
    if (state.phase === 'intro') {
      // The Host left during the tutorial: nobody else can advance it, so start playing.
      if (isHost(ctx, playerId)) {
        ctx.clearTimer('intro');
        startPlay(state, ctx);
      }
      return;
    }
    if (currentId(state) === playerId) {
      // Whatever they had started (a Manipulation waiting for its pair) is lost.
      state.log.push({ turn: state.turn, pid: playerId, kind: 'private' });
      state.notes[playerId]!.push({ turn: state.turn, kind: 'pass' });
      endTurn(state, ctx);
    } else if (brokeCount(state) >= triggerCount(state.seats.length)) {
      startFiring(state, ctx);
    }
  },

  publicView(state): PublicView {
    const n = state.seats.length;
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      seats: state.seats,
      n,
      rot: state.rot,
      bulletCount: state.bullets.filter(Boolean).length,
      trigger: triggerCount(n),
      round: state.round,
      turn: state.turn,
      current: state.phase === 'play' ? currentId(state) : null,
      log: state.log.slice(-LOG_SIZE),
      shots: state.shots,
      reveal: state.phase === 'end' ? state.bullets : null,
      out: Object.keys(state.out).filter((id) => state.out[id]),
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const n = state.seats.length;
    const seat = state.seats.indexOf(playerId);
    const myTurn = state.phase === 'play' && seat >= 0 && currentId(state) === playerId;
    const shot = state.shots.find((s) => s.seat === seat);
    const f = state.flash;
    const flash: FlashView | null =
      f && (!f.secret || f.pid === playerId)
        ? { ...f, deadline: ctx.timerDeadline('flash'), total: ctx.timerTotal('flash') }
        : null;
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      seats: state.seats,
      n,
      rot: state.rot,
      trigger: triggerCount(n),
      round: state.round,
      turn: state.turn,
      current: state.phase === 'play' ? currentId(state) : null,
      myTurn,
      credits: state.credits[playerId] ?? 0,
      charge: state.charge[playerId] ?? 0,
      swapPending: myTurn && state.swapPending,
      out: !!state.out[playerId],
      notes: state.notes[playerId] ?? [],
      flash,
      hit: state.phase === 'end' ? (shot?.hit ?? false) : null,
    };
  },
});
