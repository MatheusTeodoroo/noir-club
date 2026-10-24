import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';

// Pega Ladrão — after "Catch the Burglar" (The Genius, S1E6). Two salões and a Terraço between
// them. Each day both salões exile one player to the Terraço; at night the burglar, unless
// exiled, robs every resident left in their salão. The exiles then swap salões. Gold is never
// shown to its owner: every 2 rounds the TV lists it by letter, and nobody knows whose letter is
// whose until the end.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  rounds: string;
  dayMinutes: string;
  nightSeconds: number;
}

export type Phase = 'intro' | 'papel' | 'dia' | 'noite' | 'troca' | 'contagem' | 'final';
export type Salon = 'nobre' | 'prive';
export const SALONS: Salon[] = ['nobre', 'prive'];

export const START_GOLD = 10;
export const LETTERS = 'ABCDEFGHIJKL';

/** One anonymous gold count: letter → gold, as the TV shows it. */
export interface Count {
  round: number;
  gold: Record<string, number>;
}

export interface FinalResult {
  burglar: string;
  losing: Salon;
  winners: string[];
  losers: string[];
  burglarRichest: boolean;
  gold: Record<string, number>;
  letters: Record<string, string>;
  salon: Record<string, Salon>;
  scores: Record<string, number>;
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  round: number;
  slide: number;
  tvRules: number | null;
  /** SECRET until the final reveal. */
  burglar: string;
  /** SECRET: nobody sees their own gold; letters show it every 2 rounds. */
  gold: Record<string, number>;
  /** SECRET until the final reveal: player id → letter. */
  letters: Record<string, string>;
  /** Public: where each player is (exiles keep their origin salão during the night). */
  salon: Record<string, Salon>;
  ready: string[];
  /** Only the voter's own salão sees these. */
  votes: Record<string, string>;
  /** Exile a salão agreed on unanimously during the day. */
  decided: Record<Salon, string | null>;
  /** The night's exiles, by origin salão. */
  exiles: Record<Salon, string> | null;
  arrived: string[];
  /** Revealed counts, oldest first. */
  counts: Count[];
  result: FinalResult | null;
}

export interface PublicView {
  phase: Phase;
  round: number;
  rounds: number;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  salons: Record<Salon, string[]>;
  ready: string[];
  /** Whether each salão already decided — never who. */
  decided: Record<Salon, boolean>;
  exiles: Record<Salon, string> | null;
  arrived: string[];
  counts: Count[];
  result: FinalResult | null;
  hint: 'vote' | 'unanimous' | null;
}

export interface PlayerView {
  phase: Phase;
  round: number;
  rounds: number;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  role: 'burglar' | 'resident';
  salon: Salon;
  /** Own salão's members, for the vote list. */
  mates: string[];
  /** Own salão's votes (voter → target), during the day only. */
  votes: Record<string, string>;
  decided: string | null;
  ready: boolean;
  /** Set while this player is an exile (night and swap). */
  exile: null | { from: Salon; to: Salon; arrived: boolean };
  result: FinalResult | null;
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null }
  | { type: 'ready' }
  | { type: 'vote'; target: string }
  | { type: 'arrived' };

type Ctx = GameCtx<Config>;

const PAPEL_MS = 45_000;
const TROCA_MS = 30_000;
const CONTAGEM_MS = 15_000;
const FINAL_MS = 25_000;
const INTRO_MAX_MS = 5 * 60_000;

export const other = (s: Salon): Salon => (s === 'nobre' ? 'prive' : 'nobre');

/** Sizes of the two salões for n players: Privé ≈ 3/8 of the group, at least 3. */
export function splitSalons(n: number): Record<Salon, number> {
  const prive = Math.max(3, Math.round((n * 3) / 8));
  return { nobre: n - prive, prive };
}

/** The night's robbery: residents left in the burglar's salão lose 1 each, the burglar gains it. */
export function robbery(
  gold: Record<string, number>,
  salon: Record<string, Salon>,
  burglar: string,
  exiles: Record<Salon, string>,
): Record<string, number> {
  const next = { ...gold };
  const where = salon[burglar]!;
  if (exiles[where] === burglar) return next;
  for (const id of Object.keys(salon)) {
    const g = next[id] ?? 0;
    if (id === burglar || salon[id] !== where || id === exiles[where] || g <= 0) continue;
    next[id] = g - 1;
    next[burglar] = (next[burglar] ?? 0) + 1;
  }
  return next;
}

/** End of the match: who wins, who loses, and the platform points. */
export function finalResult(
  gold: Record<string, number>,
  salon: Record<string, Salon>,
  burglar: string,
  letters: Record<string, string>,
): FinalResult {
  const ids = Object.keys(salon);
  const g = (id: string) => gold[id] ?? 0;
  const losing = salon[burglar]!;
  const winning = other(losing);
  const winSide = ids.filter((id) => salon[id] === winning);
  const loseSide = ids.filter((id) => salon[id] === losing && id !== burglar);
  const top = Math.max(...winSide.map(g));
  const bottom = Math.min(...loseSide.map(g));
  const winners = winSide.filter((id) => g(id) === top);
  const losers = loseSide.filter((id) => g(id) === bottom);
  const burglarRichest = ids.every((id) => id === burglar || g(id) < g(burglar));
  if (burglarRichest) winners.push(burglar);
  else losers.push(burglar);
  const scores: Record<string, number> = {};
  for (const id of ids) scores[id] = winners.includes(id) ? 3 : salon[id] === winning ? 1 : 0;
  return { burglar, losing, winners, losers, burglarRichest, gold: { ...gold }, letters: { ...letters }, salon: { ...salon }, scores };
}

/** Plurality exile; ties (or no votes) are drawn among the tied (or the whole salão). */
function pickExile(state: State, s: Salon, ctx: Ctx): string {
  const members = membersOf(state, s);
  const tally: Record<string, number> = {};
  for (const [voter, target] of Object.entries(state.votes)) {
    if (state.salon[voter] === s && members.includes(target)) tally[target] = (tally[target] ?? 0) + 1;
  }
  const best = Math.max(0, ...Object.values(tally));
  const tied = best === 0 ? members : members.filter((id) => tally[id] === best);
  return ctx.rng.pick(tied);
}

const membersOf = (state: State, s: Salon) => Object.keys(state.salon).filter((id) => state.salon[id] === s);
const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);
const connected = (ctx: Ctx) => ctx.players.filter((p) => p.connected).map((p) => p.id);
const rounds = (ctx: Ctx) => Number(ctx.config.rounds) || 10;

function startPapel(state: State, ctx: Ctx) {
  state.phase = 'papel';
  state.tvRules = null;
  state.ready = [];
  ctx.setTimer('phase', PAPEL_MS);
  ctx.emit('sound', 'phase');
}

function startDay(state: State, ctx: Ctx) {
  state.phase = 'dia';
  state.votes = {};
  state.decided = { nobre: null, prive: null };
  state.exiles = null;
  state.arrived = [];
  ctx.setTimer('phase', (Number(ctx.config.dayMinutes) || 3) * 60_000);
  ctx.emit('sound', 'round');
}

/** A salão whose connected members all vote for the same player has decided. */
function checkUnanimous(state: State, s: Salon, ctx: Ctx) {
  if (state.decided[s]) return;
  const online = connected(ctx);
  const voters = membersOf(state, s).filter((id) => online.includes(id));
  if (!voters.length) return;
  const targets = new Set(voters.map((id) => state.votes[id]));
  const [target] = targets;
  if (targets.size === 1 && target !== undefined) {
    state.decided[s] = target;
    ctx.emit('sound', 'tick');
  }
}

function startNight(state: State, ctx: Ctx) {
  const exiles = {
    nobre: state.decided.nobre ?? pickExile(state, 'nobre', ctx),
    prive: state.decided.prive ?? pickExile(state, 'prive', ctx),
  };
  state.exiles = exiles;
  state.gold = robbery(state.gold, state.salon, state.burglar, exiles);
  state.phase = 'noite';
  ctx.setTimer('phase', ctx.config.nightSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function startSwap(state: State, ctx: Ctx) {
  const ex = state.exiles!;
  state.salon[ex.nobre] = 'prive';
  state.salon[ex.prive] = 'nobre';
  state.arrived = [];
  state.phase = 'troca';
  ctx.setTimer('phase', TROCA_MS);
  ctx.emit('sound', 'phase');
}

function checkArrived(state: State, ctx: Ctx) {
  if (state.phase !== 'troca' || !state.exiles) return;
  const online = connected(ctx);
  const waiting = SALONS.map((s) => state.exiles![s]).filter((id) => online.includes(id) && !state.arrived.includes(id));
  if (!waiting.length) afterSwap(state, ctx);
}

function afterSwap(state: State, ctx: Ctx) {
  if (state.round >= rounds(ctx)) {
    state.result = finalResult(state.gold, state.salon, state.burglar, state.letters);
    state.phase = 'final';
    ctx.setTimer('phase', FINAL_MS);
    ctx.emit('sound', 'drumroll');
    ctx.emit('sound', 'reveal', 2300);
    ctx.emit('fx', 'reveal', 2300);
  } else if (state.round % 2 === 0) {
    const gold: Record<string, number> = {};
    for (const [id, letter] of Object.entries(state.letters)) gold[letter] = state.gold[id] ?? 0;
    state.counts.push({ round: state.round, gold });
    state.phase = 'contagem';
    ctx.setTimer('phase', CONTAGEM_MS);
    ctx.emit('sound', 'drumroll');
    ctx.emit('sound', 'reveal', 2300);
  } else {
    state.round += 1;
    startDay(state, ctx);
  }
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const ids = ctx.rng.shuffle(ctx.players.map((p) => p.id));
    const sizes = splitSalons(ids.length);
    const salon: Record<string, Salon> = {};
    ids.forEach((id, i) => (salon[id] = i < sizes.nobre ? 'nobre' : 'prive'));
    const burglar = ctx.rng.pick(ids);
    const letterOrder = ctx.rng.shuffle([...ids]);
    const letters: Record<string, string> = Object.fromEntries(letterOrder.map((id, i) => [id, LETTERS.charAt(i)]));
    const state: State = {
      phase: 'intro',
      round: 1,
      slide: 0,
      tvRules: null,
      burglar,
      gold: Object.fromEntries(ids.map((id) => [id, id === burglar ? 0 : START_GOLD])),
      letters,
      salon,
      ready: [],
      votes: {},
      decided: { nobre: null, prive: null },
      exiles: null,
      arrived: [],
      counts: [],
      result: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startPapel(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object' || !(playerId in state.salon)) return;

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
        startPapel(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }
    if (action.type === 'ready') {
      if (state.phase !== 'papel' || state.ready.includes(playerId)) return;
      state.ready.push(playerId);
      if (connected(ctx).every((id) => state.ready.includes(id))) startDay(state, ctx);
      return;
    }
    if (action.type === 'vote') {
      const s = state.salon[playerId];
      if (state.phase !== 'dia' || !s || state.decided[s]) return;
      if (typeof action.target !== 'string' || state.salon[action.target] !== s) return;
      if (state.votes[playerId] === action.target) return;
      state.votes[playerId] = action.target;
      checkUnanimous(state, s, ctx);
      if (state.decided.nobre && state.decided.prive) startNight(state, ctx);
      return;
    }
    if (action.type === 'arrived') {
      if (state.phase !== 'troca' || !state.exiles || state.arrived.includes(playerId)) return;
      if (state.exiles.nobre !== playerId && state.exiles.prive !== playerId) return;
      state.arrived.push(playerId);
      checkArrived(state, ctx);
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startPapel(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    switch (state.phase) {
      case 'papel':
        return startDay(state, ctx);
      case 'dia':
        return startNight(state, ctx);
      case 'noite':
        return startSwap(state, ctx);
      case 'troca':
        return afterSwap(state, ctx);
      case 'contagem':
        state.round += 1;
        return startDay(state, ctx);
      case 'final':
        return ctx.end({ scores: state.result!.scores });
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    if (state.phase === 'intro' && isHost(ctx, playerId)) {
      ctx.clearTimer('intro');
      startPapel(state, ctx);
    } else if (state.phase === 'papel') {
      if (connected(ctx).every((id) => state.ready.includes(id))) startDay(state, ctx);
    } else if (state.phase === 'dia') {
      delete state.votes[playerId];
      for (const s of SALONS) checkUnanimous(state, s, ctx);
      if (state.decided.nobre && state.decided.prive) startNight(state, ctx);
    } else if (state.phase === 'troca') {
      checkArrived(state, ctx);
    }
  },

  publicView(state, ctx): PublicView {
    const firstDay = ctx.config.tutorial && state.round === 1 && state.phase === 'dia';
    const anyVotes = Object.keys(state.votes).length > 0;
    return {
      phase: state.phase,
      round: state.round,
      rounds: rounds(ctx),
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      salons: { nobre: membersOf(state, 'nobre'), prive: membersOf(state, 'prive') },
      ready: state.ready,
      decided: { nobre: !!state.decided.nobre, prive: !!state.decided.prive },
      exiles: state.phase === 'noite' || state.phase === 'troca' ? state.exiles : null,
      arrived: state.arrived,
      counts: state.counts,
      result: state.phase === 'final' ? state.result : null,
      hint: firstDay ? (anyVotes ? 'unanimous' : 'vote') : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const s = state.salon[playerId] ?? 'nobre';
    const ex = state.exiles;
    const exiled =
      ex && (state.phase === 'noite' || state.phase === 'troca')
        ? ex.nobre === playerId
          ? 'nobre'
          : ex.prive === playerId
            ? 'prive'
            : null
        : null;
    const votes: Record<string, string> = {};
    if (state.phase === 'dia') {
      for (const [voter, target] of Object.entries(state.votes)) if (state.salon[voter] === s) votes[voter] = target;
    }
    return {
      phase: state.phase,
      round: state.round,
      rounds: rounds(ctx),
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      role: state.burglar === playerId ? 'burglar' : 'resident',
      salon: s,
      mates: membersOf(state, s),
      votes,
      decided: state.phase === 'dia' ? state.decided[s] : null,
      ready: state.ready.includes(playerId),
      exile: exiled ? { from: exiled, to: other(exiled), arrived: state.arrived.includes(playerId) } : null,
      result: state.phase === 'final' ? state.result : null,
    };
  },
});
