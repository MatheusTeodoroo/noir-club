import { defineGame, type GameCtx, type GameManifest, type I18nText } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { PROMPTS, type Prompt } from './prompts.ts';
import { ANSWER_MAX, QUESTION_MAX, normalize, splitPoints } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Meio a Meio: each player is the Author once. The Author writes a dilemma with two answers,
// everyone else picks a side in secret, and the Author scores for how evenly the room split.

export const manifest = manifestJson as GameManifest;
export type { Prompt };

export interface Config {
  tutorial: boolean;
  writeSeconds: number;
  voteSeconds: number;
}

type Phase = 'intro' | 'writing' | 'voting' | 'reveal';
export type Side = 'a' | 'b';

export interface Result {
  a: string[];
  b: string[];
  points: number;
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  /** Tutorial slide on screen during the intro. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
  /** Authors in play order (shuffled once); `turn` indexes it. */
  order: string[];
  turn: number;
  /** SECRET (Author only) until submitted: the bank prompt last suggested, and how many so far. */
  suggestion: number | null;
  suggestions: number;
  /** Bank prompts already suggested or played this match. */
  used: number[];
  /** The question in play, public from the start of voting. */
  prompt: Prompt | null;
  /** True when the house filled the prompt in (the Author ran out of time or left). */
  auto: boolean;
  /** SECRET until the reveal. */
  votes: Record<string, Side>;
  result: Result | null;
  scores: Record<string, number>;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  turn: number;
  turns: number;
  /** Authors in play order. */
  order: string[];
  authorId: string;
  prompt: Prompt | null;
  auto: boolean;
  /** Who already voted — never which side. */
  voted: string[];
  /** Players who may vote this round (everyone but the Author). */
  voters: string[];
  result: Result | null;
  scores: Record<string, number>;
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  authorId: string;
  isAuthor: boolean;
  /** Author only, while writing: the bank prompt to fill the form with, and a counter that changes on every new one. */
  suggestion: Prompt | null;
  suggestions: number;
  prompt: Prompt | null;
  myVote: Side | null;
  votedCount: number;
  voterCount: number;
  result: Result | null;
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null }
  | { type: 'suggest' }
  | { type: 'submit'; question: string; a: string; b: string }
  | { type: 'vote'; side: Side };

type Ctx = GameCtx<Config>;

const REVEAL_MS = 10_000;
/** Safety net: if the Host never advances the tutorial (left the room), the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

const author = (state: State) => state.order[state.turn]!;
const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
const same = (text: string): I18nText => ({ 'pt-BR': text, en: text });

/** A bank prompt not used yet this match (the bank reshuffles once it runs out). */
function drawPrompt(state: State, ctx: Ctx): number {
  if (state.used.length >= PROMPTS.length) state.used = [];
  const free = PROMPTS.map((_, i) => i).filter((i) => !state.used.includes(i));
  const index = ctx.rng.pick(free);
  state.used.push(index);
  return index;
}

function startWriting(state: State, ctx: Ctx) {
  state.phase = 'writing';
  state.suggestion = null;
  state.suggestions = 0;
  state.prompt = null;
  state.auto = false;
  state.votes = {};
  state.result = null;
  ctx.emit('sound', 'round');
  const present = ctx.players.find((p) => p.id === author(state))?.connected;
  if (present) ctx.setTimer('phase', ctx.config.writeSeconds * 1000);
  else autoPrompt(state, ctx);
}

/** The Author ran out of time or left: the house plays their last suggestion, or a fresh one. */
function autoPrompt(state: State, ctx: Ctx) {
  state.prompt = PROMPTS[state.suggestion ?? drawPrompt(state, ctx)]!;
  state.auto = true;
  startVoting(state, ctx);
}

function startVoting(state: State, ctx: Ctx) {
  state.phase = 'voting';
  state.votes = {};
  ctx.setTimer('phase', ctx.config.voteSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function everyoneVoted(state: State, ctx: Ctx) {
  return ctx.players
    .filter((p) => p.connected && p.id !== author(state))
    .every((p) => state.votes[p.id] !== undefined);
}

function reveal(state: State, ctx: Ctx) {
  const a = ctx.players.filter((p) => state.votes[p.id] === 'a').map((p) => p.id);
  const b = ctx.players.filter((p) => state.votes[p.id] === 'b').map((p) => p.id);
  const points = splitPoints(a.length, b.length);
  state.scores[author(state)] = (state.scores[author(state)] ?? 0) + points;
  state.result = { a, b, points };
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  if (points === 100) ctx.emit('fx', 'perfect', 2300);
}

function nextTurn(state: State, ctx: Ctx) {
  if (state.turn + 1 >= state.order.length) {
    ctx.end({ scores: state.scores });
    return;
  }
  state.turn += 1;
  startWriting(state, ctx);
}

function startGame(state: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  state.tvRules = null;
  startWriting(state, ctx);
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;

/** A typed prompt; one that matches its suggestion word for word keeps both languages. */
function typedPrompt(state: State, question: string, a: string, b: string): Prompt {
  const s = state.suggestion === null ? null : PROMPTS[state.suggestion]!;
  for (const lang of ['pt-BR', 'en'] as const) {
    if (s && s.q[lang] === question && s.a[lang] === a && s.b[lang] === b) return s;
  }
  return { q: same(question), a: same(a), b: same(b) };
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      order: ctx.rng.shuffle(ctx.players.map((p) => p.id)),
      turn: 0,
      suggestion: null,
      suggestions: 0,
      used: [],
      prompt: null,
      auto: false,
      votes: {},
      result: null,
      scores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startWriting(state, ctx);
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
      if (action.dir === 'skip' || (action.dir === 1 && last)) startGame(state, ctx);
      else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (state.phase === 'writing' && playerId === author(state)) {
      if (action.type === 'suggest') {
        state.suggestion = drawPrompt(state, ctx);
        state.suggestions += 1;
      } else if (action.type === 'submit') {
        const question = text(action.question, QUESTION_MAX);
        const a = text(action.a, ANSWER_MAX);
        const b = text(action.b, ANSWER_MAX);
        if (!question || !a || !b || normalize(a) === normalize(b)) return;
        ctx.clearTimer('phase');
        state.prompt = typedPrompt(state, question, a, b);
        startVoting(state, ctx);
      }
      return;
    }

    if (action.type !== 'vote' || state.phase !== 'voting' || playerId === author(state)) return;
    if (action.side !== 'a' && action.side !== 'b') return;
    if (!ctx.players.some((p) => p.id === playerId) || state.votes[playerId] === action.side) return;
    // Only a first vote ticks, so the room can't hear someone switching sides.
    if (state.votes[playerId] === undefined) ctx.emit('sound', 'tick');
    state.votes[playerId] = action.side;
    if (everyoneVoted(state, ctx)) reveal(state, ctx);
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startGame(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'writing') autoPrompt(state, ctx);
    else if (state.phase === 'voting') reveal(state, ctx);
    else if (state.phase === 'reveal') nextTurn(state, ctx);
  },

  onPlayerTimeout(state, playerId, ctx) {
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro' && isHost(ctx, playerId)) {
      startGame(state, ctx);
      return;
    }
    if (state.phase === 'writing' && playerId === author(state)) {
      autoPrompt(state, ctx);
      return;
    }
    // A missing voter keeps a vote already cast; finish early if everyone left has voted.
    if (state.phase === 'voting' && everyoneVoted(state, ctx)) reveal(state, ctx);
  },

  publicView(state, ctx): PublicView {
    const voters = ctx.players.filter((p) => p.id !== author(state)).map((p) => p.id);
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      turn: state.turn + 1,
      turns: state.order.length,
      order: state.order,
      authorId: author(state),
      prompt: state.phase === 'voting' || state.phase === 'reveal' ? state.prompt : null,
      auto: state.auto,
      voted: state.phase === 'voting' ? voters.filter((id) => state.votes[id] !== undefined) : [],
      voters,
      result: state.phase === 'reveal' ? state.result : null,
      scores: state.scores,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const isAuthor = playerId === author(state);
    const writing = state.phase === 'writing' && isAuthor;
    const voters = ctx.players.filter((p) => p.id !== author(state));
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      authorId: author(state),
      isAuthor,
      suggestion: writing && state.suggestion !== null ? PROMPTS[state.suggestion]! : null,
      suggestions: writing ? state.suggestions : 0,
      prompt: state.phase === 'voting' || state.phase === 'reveal' ? state.prompt : null,
      myVote: state.votes[playerId] ?? null,
      votedCount: state.phase === 'voting' ? voters.filter((p) => state.votes[p.id] !== undefined).length : 0,
      voterCount: voters.length,
      result: state.phase === 'reveal' ? state.result : null,
    };
  },
});
