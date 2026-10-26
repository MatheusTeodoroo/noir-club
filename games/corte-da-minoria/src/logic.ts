import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { COLORS, MIN_PER_SPACE, SPACES, isColorRound, type Color, type Space } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Everyone holds a secret colour (Azul or Verde). The court elects a first king; each round the
// king splits every player between two halls (A and B, at least 2 in each), then anyone may spend
// their single Royal Pass to cross to the other hall. In each hall, the players of the smaller
// colour score 1 point. The throne passes along — the king names an heir who hasn't reigned —
// until everyone has been king once. Colours may change before rounds 3, 5, 7…; points stay
// secret until the final reveal.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  colorMode: 'phone' | 'dealer';
  electionSeconds: number;
  colorSeconds: number;
  dealerColorSeconds: number;
  divideSeconds: number;
  passSeconds: number;
  revealSeconds: number;
  successorSeconds: number;
}

export type Phase =
  | 'intro'
  | 'election'
  | 'runoff'
  | 'crown'
  | 'color'
  | 'divide'
  | 'pass'
  | 'reveal'
  | 'successor'
  | 'final';

export type Counts = Record<Space, Record<Color, number>>;

/** How a king took the throne: elected, drawn after a second tie, named heir, or drawn by the timer. */
export type CrownReason = 'vote' | 'draw' | 'heir' | 'random';

export interface RoundRecord {
  round: number;
  king: string;
  /** Halls after the passes. */
  spaces: Record<string, Space>;
  /** Who used their Royal Pass this round. */
  passes: string[];
  counts: Counts;
  /** The colour that scored in each hall, or null (tie, one colour, empty). */
  minority: Record<Space, Color | null>;
  /** SECRET until the final reveal. */
  colors: Record<string, Color>;
  /** SECRET until the final reveal: who scored this round. */
  scored: string[];
}

/** A round as the TVs see it before the final reveal. */
export type PublicRound = Omit<RoundRecord, 'colors' | 'scored'>;

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  slide: number;
  tvRules: number | null;
  /** 0 until the first king's round starts. */
  round: number;
  king: string | null;
  /** Everyone who has taken the throne, in order (the current king included). */
  reigned: string[];
  /** Players who left the match (timed out). */
  gone: string[];
  /** SECRET: voter → candidate. */
  votes: Record<string, string>;
  candidates: string[];
  /** Votes per candidate in the last count (public once counted). */
  tally: Record<string, number> | null;
  crown: { king: string; reason: CrownReason } | null;
  /** SECRET: each player's colour. */
  colors: Record<string, Color>;
  /** Who has chosen (or visited the Dealer) in the current colour window. */
  chosen: string[];
  /** The king's split; public, live. */
  spaces: Record<string, Space>;
  /** Player → round in which they spent their pass. */
  passUsed: Record<string, number>;
  /** Pass holders who said they are done in the pass window. */
  ready: string[];
  /** SECRET: points per player. */
  scores: Record<string, number>;
  history: RoundRecord[];
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  round: number;
  rounds: number;
  deadline: number | null;
  total: number | null;
  colorMode: Config['colorMode'];
  king: string | null;
  reigned: string[];
  /** Players still in the match. */
  active: string[];
  /** Who has voted — never for whom. */
  voted: string[];
  candidates: string[];
  tally: Record<string, number> | null;
  crown: State['crown'];
  /** Who has chosen a colour in this window — never which. */
  chosen: string[];
  spaces: Record<string, Space>;
  passUsed: Record<string, number>;
  ready: string[];
  /** Players the king may still name as heir (successor phase). */
  heirs: string[];
  atDealer: string | null;
  reveal: PublicRound | null;
  history: PublicRound[];
  /** Only in the final phase: everything, colours and points included. */
  final: null | { history: RoundRecord[]; scores: Record<string, number> };
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  round: number;
  rounds: number;
  deadline: number | null;
  total: number | null;
  colorMode: Config['colorMode'];
  active: boolean;
  king: string | null;
  isKing: boolean;
  candidates: string[];
  myVote: string | null;
  /** Own colour: always in phone mode; in Dealer mode only at the final reveal. */
  myColor: Color | null;
  /** Chosen (or visited the Dealer) in this colour window. */
  chosen: boolean;
  /** Inside the Dealer during a colour window, not chosen yet: the phone shows Azul / Verde. */
  visiting: boolean;
  /** Everyone's hall (public), for the king's split screen. */
  spaces: Record<string, Space>;
  /** Players in the match, for the king's split screen. */
  players: string[];
  passAvailable: boolean;
  ready: boolean;
  heirs: string[];
  /** In the reveal: whether this player scored this round. */
  scored: boolean | null;
  myScore: number;
  crown: State['crown'];
}

/** What the Dealer screen shows the visitor. */
export interface DealerView {
  round: number;
  current: Color | null;
}

export type Action =
  | { type: 'vote'; target: string }
  | { type: 'color'; color: Color }
  | { type: 'place'; target: string; space: Space | null }
  | { type: 'confirm' }
  | { type: 'pass' }
  | { type: 'ready' }
  | { type: 'heir'; target: string }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const CROWN_MS = 6_000;
const FINAL_MS = 25_000;
/** Drumroll before the reveal lands. */
const REVEAL_DELAY_MS = 2_500;
/** Safety net: if the Host never advances the tutorial (left the room), the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;
/** Below this the king can't put 2 players in each hall: the match ends. */
const MIN_ACTIVE = MIN_PER_SPACE * 2;

const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
const activeIds = (state: State, ctx: Ctx) => ctx.players.map((p) => p.id).filter((id) => !state.gone.includes(id));
const isActive = (state: State, ctx: Ctx, id: unknown): id is string =>
  typeof id === 'string' && activeIds(state, ctx).includes(id);
const heirsOf = (state: State, ctx: Ctx) => activeIds(state, ctx).filter((id) => !state.reigned.includes(id));
const countIn = (state: State, space: Space) => Object.values(state.spaces).filter((s) => s === space).length;
const flip = (space: Space): Space => (space === 'A' ? 'B' : 'A');
const passHolders = (state: State, ctx: Ctx) => activeIds(state, ctx).filter((id) => state.passUsed[id] === undefined);

function startElection(state: State, ctx: Ctx) {
  state.phase = 'election';
  state.votes = {};
  state.candidates = activeIds(state, ctx);
  state.tally = null;
  ctx.setTimer('phase', ctx.config.electionSeconds * 1000);
  ctx.emit('sound', 'round');
}

function countVotes(state: State, ctx: Ctx) {
  if (state.candidates.length === 0) state.candidates = activeIds(state, ctx);
  const tally = Object.fromEntries(state.candidates.map((c) => [c, 0]));
  for (const target of Object.values(state.votes)) if (target in tally) tally[target]! += 1;
  state.tally = tally;
  const best = Math.max(...Object.values(tally));
  const top = state.candidates.filter((c) => tally[c] === best);
  if (top.length === 1) crownKing(state, top[0]!, 'vote', ctx);
  else if (state.phase === 'election') {
    // Tie: a second vote among the tied only.
    state.phase = 'runoff';
    state.candidates = top;
    state.votes = {};
    ctx.setTimer('phase', ctx.config.electionSeconds * 1000);
    ctx.emit('sound', 'phase');
  } else crownKing(state, ctx.rng.pick(top), 'draw', ctx);
}

function crownKing(state: State, id: string, reason: CrownReason, ctx: Ctx) {
  state.king = id;
  state.reigned.push(id);
  state.crown = { king: id, reason };
  if (reason === 'heir' || reason === 'random') state.tally = null;
  state.phase = 'crown';
  ctx.setTimer('phase', CROWN_MS);
  ctx.emit('sound', 'reveal');
  ctx.emit('fx', 'crown');
}

/** The current king left: draw one of the remaining heirs, or end the match. */
function replaceKing(state: State, ctx: Ctx) {
  const heirs = heirsOf(state, ctx);
  if (heirs.length === 0) toFinal(state, ctx);
  else crownKing(state, ctx.rng.pick(heirs), 'random', ctx);
}

function startRound(state: State, ctx: Ctx) {
  state.round += 1;
  state.spaces = {};
  state.ready = [];
  if (isColorRound(state.round)) startColor(state, ctx);
  else startDivide(state, ctx);
}

function startColor(state: State, ctx: Ctx) {
  state.phase = 'color';
  state.chosen = [];
  const seconds = ctx.config.colorMode === 'dealer' ? ctx.config.dealerColorSeconds : ctx.config.colorSeconds;
  ctx.setTimer('phase', seconds * 1000);
  ctx.emit('sound', 'phase');
}

/** Close the colour window: whoever never chose keeps their colour (round 1: a random one). */
function finishColor(state: State, ctx: Ctx) {
  for (const id of activeIds(state, ctx)) if (!state.colors[id]) state.colors[id] = ctx.rng.pick([...COLORS]);
  if (ctx.atDealer) ctx.releaseDealer();
  startDivide(state, ctx);
}

function allChosen(state: State, ctx: Ctx) {
  return activeIds(state, ctx).every((id) => state.chosen.includes(id));
}

function startDivide(state: State, ctx: Ctx) {
  state.phase = 'divide';
  state.spaces = {};
  if (!state.king || state.gone.includes(state.king)) {
    finishDivide(state, ctx);
    return;
  }
  ctx.setTimer('phase', ctx.config.divideSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function splitValid(state: State, ctx: Ctx) {
  return (
    activeIds(state, ctx).every((id) => state.spaces[id]) &&
    SPACES.every((s) => countIn(state, s) >= MIN_PER_SPACE)
  );
}

/** Finish an incomplete split at random, keeping at least 2 players in each hall. */
function completeSplit(state: State, ctx: Ctx) {
  const unplaced = ctx.rng.shuffle(activeIds(state, ctx).filter((id) => !state.spaces[id]));
  unplaced.forEach((id, i) => {
    const left = unplaced.length - i;
    const need = SPACES.map((s) => Math.max(0, MIN_PER_SPACE - countIn(state, s)));
    if (left <= need[0]! + need[1]!) state.spaces[id] = need[0]! >= need[1]! ? 'A' : 'B';
    else state.spaces[id] = ctx.rng.pick([...SPACES]);
  });
  for (const space of SPACES) {
    while (countIn(state, space) < MIN_PER_SPACE) {
      const others = Object.keys(state.spaces).filter((id) => state.spaces[id] === flip(space));
      state.spaces[ctx.rng.pick(others)] = space;
    }
  }
}

function finishDivide(state: State, ctx: Ctx) {
  ctx.clearTimer('phase');
  completeSplit(state, ctx);
  startPass(state, ctx);
}

function startPass(state: State, ctx: Ctx) {
  state.ready = [];
  if (passHolders(state, ctx).length === 0) {
    reveal(state, ctx);
    return;
  }
  state.phase = 'pass';
  ctx.setTimer('phase', ctx.config.passSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function allReady(state: State, ctx: Ctx) {
  return passHolders(state, ctx).every((id) => state.ready.includes(id));
}

/** In a hall, the strictly smaller colour scores — if both colours are there. */
function minorityOf(counts: Record<Color, number>): Color | null {
  const { blue, green } = counts;
  if (blue === 0 || green === 0 || blue === green) return null;
  return blue < green ? 'blue' : 'green';
}

function reveal(state: State, ctx: Ctx) {
  const counts: Counts = { A: { blue: 0, green: 0 }, B: { blue: 0, green: 0 } };
  const colors: Record<string, Color> = {};
  for (const id of activeIds(state, ctx)) {
    const space = state.spaces[id];
    const color = state.colors[id];
    if (!space || !color) continue;
    counts[space][color] += 1;
    colors[id] = color;
  }
  const minority = { A: minorityOf(counts.A), B: minorityOf(counts.B) };
  const scored = Object.keys(colors).filter((id) => minority[state.spaces[id]!] === colors[id]);
  for (const id of scored) state.scores[id] = (state.scores[id] ?? 0) + 1;
  state.history.push({
    round: state.round,
    king: state.king!,
    spaces: { ...state.spaces },
    passes: Object.keys(state.passUsed).filter((id) => state.passUsed[id] === state.round),
    counts,
    minority,
    colors,
    scored,
  });
  state.phase = 'reveal';
  ctx.setTimer('phase', ctx.config.revealSeconds * 1000 + REVEAL_DELAY_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', REVEAL_DELAY_MS);
  ctx.emit('fx', 'reveal', REVEAL_DELAY_MS);
}

function afterReveal(state: State, ctx: Ctx) {
  if (heirsOf(state, ctx).length === 0) {
    toFinal(state, ctx);
    return;
  }
  if (!state.king || state.gone.includes(state.king)) {
    replaceKing(state, ctx);
    return;
  }
  state.phase = 'successor';
  ctx.setTimer('phase', ctx.config.successorSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function toFinal(state: State, ctx: Ctx) {
  if (ctx.atDealer) ctx.releaseDealer();
  state.phase = 'final';
  state.king = null;
  ctx.setTimer('phase', FINAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', REVEAL_DELAY_MS);
  ctx.emit('fx', 'final', REVEAL_DELAY_MS);
}

function publicRound({ colors: _c, scored: _s, ...round }: RoundRecord): PublicRound {
  return round;
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      round: 0,
      king: null,
      reigned: [],
      gone: [],
      votes: {},
      candidates: [],
      tally: null,
      crown: null,
      colors: {},
      chosen: [],
      spaces: {},
      passUsed: {},
      ready: [],
      scores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
      history: [],
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startElection(state, ctx);
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
        startElection(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (!isActive(state, ctx, playerId)) return;
    const king = state.king === playerId;

    switch (action.type) {
      case 'vote': {
        if (state.phase !== 'election' && state.phase !== 'runoff') return;
        if (!state.candidates.includes(action.target)) return;
        state.votes[playerId] = action.target;
        ctx.emit('sound', 'tick');
        if (activeIds(state, ctx).every((id) => state.votes[id])) countVotes(state, ctx);
        return;
      }
      case 'color': {
        if (state.phase !== 'color' || !COLORS.includes(action.color)) return;
        if (ctx.config.colorMode === 'dealer') {
          if (ctx.atDealer !== playerId || state.chosen.includes(playerId)) return;
          state.colors[playerId] = action.color;
          state.chosen.push(playerId);
          // The end-of-window check runs in onDealerLeave, once the visitor is out.
          ctx.releaseDealer();
          return;
        }
        state.colors[playerId] = action.color;
        if (!state.chosen.includes(playerId)) state.chosen.push(playerId);
        ctx.emit('sound', 'tick');
        if (allChosen(state, ctx)) finishColor(state, ctx);
        return;
      }
      case 'place': {
        if (state.phase !== 'divide' || !king || !isActive(state, ctx, action.target)) return;
        if (action.space === null) delete state.spaces[action.target];
        else if (SPACES.includes(action.space)) state.spaces[action.target] = action.space;
        return;
      }
      case 'confirm': {
        if (state.phase === 'divide' && king && splitValid(state, ctx)) finishDivide(state, ctx);
        return;
      }
      case 'pass': {
        if (state.phase !== 'pass' || state.passUsed[playerId] !== undefined) return;
        state.spaces[playerId] = flip(state.spaces[playerId]!);
        state.passUsed[playerId] = state.round;
        ctx.emit('sound', 'tick');
        ctx.emit('fx', 'pass');
        if (allReady(state, ctx)) reveal(state, ctx);
        return;
      }
      case 'ready': {
        if (state.phase !== 'pass' || state.ready.includes(playerId)) return;
        state.ready.push(playerId);
        if (allReady(state, ctx)) reveal(state, ctx);
        return;
      }
      case 'heir': {
        if (state.phase !== 'successor' || !king || !heirsOf(state, ctx).includes(action.target)) return;
        ctx.clearTimer('phase');
        crownKing(state, action.target, 'heir', ctx);
        return;
      }
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startElection(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    switch (state.phase) {
      case 'election':
      case 'runoff':
        return countVotes(state, ctx);
      case 'crown':
        return startRound(state, ctx);
      case 'color':
        return finishColor(state, ctx);
      case 'divide':
        return finishDivide(state, ctx);
      case 'pass':
        return reveal(state, ctx);
      case 'reveal':
        return afterReveal(state, ctx);
      case 'successor':
        return replaceKing(state, ctx);
      case 'final':
        return ctx.end({ scores: state.scores });
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro' && isHost(ctx, playerId)) {
      ctx.clearTimer('intro');
      state.gone.push(playerId);
      startElection(state, ctx);
      return;
    }
    if (state.gone.includes(playerId) || state.phase === 'final') return;
    // The player leaves the match: halls, throne line and every "everyone acted" check.
    state.gone.push(playerId);
    delete state.votes[playerId];
    for (const [voter, target] of Object.entries(state.votes)) if (target === playerId) delete state.votes[voter];
    state.candidates = state.candidates.filter((id) => id !== playerId);
    delete state.spaces[playerId];
    state.ready = state.ready.filter((id) => id !== playerId);
    if (state.phase === 'intro') return;
    if (activeIds(state, ctx).length < MIN_ACTIVE) {
      toFinal(state, ctx);
      return;
    }
    const wasKing = state.king === playerId;
    switch (state.phase) {
      case 'election':
      case 'runoff':
        if (state.candidates.length <= 1 || activeIds(state, ctx).every((id) => state.votes[id])) {
          countVotes(state, ctx);
        }
        return;
      case 'crown':
        if (wasKing) replaceKing(state, ctx);
        return;
      case 'color':
        if (ctx.atDealer !== playerId && allChosen(state, ctx)) finishColor(state, ctx);
        return;
      case 'divide':
        if (wasKing) finishDivide(state, ctx);
        return;
      case 'pass':
        if (allReady(state, ctx)) reveal(state, ctx);
        return;
      case 'successor':
        if (wasKing || heirsOf(state, ctx).length === 0) replaceKing(state, ctx);
        return;
    }
  },

  canVisitDealer(state, playerId, ctx) {
    return (
      state.phase === 'color' &&
      ctx.config.colorMode === 'dealer' &&
      isActive(state, ctx, playerId) &&
      !state.chosen.includes(playerId)
    );
  },

  onDealerLeave(state, playerId, ctx) {
    if (state.phase !== 'color' || !isActive(state, ctx, playerId)) return;
    // Visited without choosing: keep the colour (round 1: drawn when the window closes).
    if (!state.chosen.includes(playerId)) state.chosen.push(playerId);
    ctx.emit('sound', 'tick');
    if (allChosen(state, ctx)) finishColor(state, ctx);
  },

  publicView(state, ctx): PublicView {
    const last = state.history[state.history.length - 1];
    const voting = state.phase === 'election' || state.phase === 'runoff';
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      round: state.round,
      rounds: state.reigned.length + heirsOf(state, ctx).length,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      colorMode: ctx.config.colorMode,
      king: state.king,
      reigned: state.reigned,
      active: activeIds(state, ctx),
      voted: voting ? Object.keys(state.votes) : [],
      candidates: voting ? state.candidates : [],
      tally: state.phase === 'runoff' || state.phase === 'crown' ? state.tally : null,
      crown: state.phase === 'crown' ? state.crown : null,
      chosen: state.phase === 'color' ? state.chosen : [],
      spaces: state.spaces,
      passUsed: state.passUsed,
      ready: state.phase === 'pass' ? state.ready : [],
      heirs: state.phase === 'successor' ? heirsOf(state, ctx) : [],
      atDealer: ctx.atDealer,
      reveal: state.phase === 'reveal' && last ? publicRound(last) : null,
      history: state.history.map(publicRound),
      final: state.phase === 'final' ? { history: state.history, scores: state.scores } : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const last = state.history[state.history.length - 1];
    const active = isActive(state, ctx, playerId);
    const isKing = state.king === playerId;
    const showColor = ctx.config.colorMode === 'phone' || state.phase === 'final';
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      round: state.round,
      rounds: state.reigned.length + heirsOf(state, ctx).length,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      colorMode: ctx.config.colorMode,
      active,
      king: state.king,
      isKing,
      candidates: state.phase === 'election' || state.phase === 'runoff' ? state.candidates : [],
      myVote: state.votes[playerId] ?? null,
      myColor: showColor ? (state.colors[playerId] ?? null) : null,
      chosen: state.chosen.includes(playerId),
      visiting:
        state.phase === 'color' &&
        ctx.config.colorMode === 'dealer' &&
        ctx.atDealer === playerId &&
        !state.chosen.includes(playerId),
      spaces: state.spaces,
      players: activeIds(state, ctx),
      passAvailable: active && state.passUsed[playerId] === undefined,
      ready: state.ready.includes(playerId),
      heirs: isKing && state.phase === 'successor' ? heirsOf(state, ctx) : [],
      scored: state.phase === 'reveal' && last ? last.scored.includes(playerId) : null,
      myScore: state.scores[playerId] ?? 0,
      crown: state.phase === 'crown' ? state.crown : null,
    };
  },

  dealerView(state, playerId): DealerView {
    return { round: state.round, current: state.colors[playerId] ?? null };
  },
});
