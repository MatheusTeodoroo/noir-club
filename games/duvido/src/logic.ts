import { defineGame, type GameCtx, type GameManifest, type I18nText } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { CATEGORIES } from './questions/index.ts';
import { LEAD_MS, MAX_GUESS } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Duvido!: one question with a numeric answer per round. Players take turns in seat order, each
// either raising the last guess or doubting it. A doubt reveals the answer: a guess above it goes
// to the guesser as a card, otherwise the doubter takes it. Every card is -1 point.

export const manifest = manifestJson as GameManifest;

export type EndMode = 'rounds' | 'cards';

export interface Config {
  tutorial: boolean;
  endMode: EndMode;
  /** Cards that end the match (endMode "cards"). */
  cardLimit: number;
  rounds: number;
  categoryChoices: number;
  turnSeconds: number;
  dobrei: boolean;
  revealSeconds: number;
}

export type Phase = 'intro' | 'category' | 'guess' | 'reveal';

/** First-round coaching line on the TV while the tutorial option is on. */
export type Hint = 'category' | 'open' | 'raise' | null;

export interface Guess {
  by: string;
  value: number;
  /** Dobrei!: at least twice the previous guess (only with the module on). */
  doubled: boolean;
}

export interface RoundResult {
  answer: number;
  guess: number;
  guesser: string;
  doubter: string;
  /** Who takes the card. */
  loser: string;
  /** The doubt came from a turn timeout, not a tap. */
  auto: boolean;
  /** Players who earned a Dobrei chip this round. */
  chips: string[];
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  round: number;
  phase: Phase;
  /** Tutorial slide on screen during the intro. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
  /** Turn order for the whole match ("clockwise"). */
  seats: string[];
  /** Picks the category and makes the opening guess. */
  starter: string;
  /** Whose action the game is waiting for (category and guess phases). */
  turn: string;
  /** Category indices offered to the starter. */
  options: number[];
  category: number | null;
  /** SECRET: indexes the bank, whose entry holds the answer. */
  question: number | null;
  /** "category:question" keys already played this match. */
  used: string[];
  guesses: Guess[];
  cards: Record<string, number>;
  chips: Record<string, number>;
  /** Set when the round's doubt is resolved (reveal phase). */
  last: RoundResult | null;
}

export interface QuestionView {
  text: I18nText;
  unit: I18nText;
}

/** What every TV shows. Nothing secret: the answer appears only in `result`, in the reveal phase. */
export interface PublicView {
  round: number;
  /** Round limit, or null when the match ends by cards. */
  rounds: number | null;
  /** Card count that ends the match, or null when it ends by rounds. */
  cardLimit: number | null;
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  hint: Hint;
  seats: string[];
  starter: string;
  turn: string;
  options: I18nText[];
  category: I18nText | null;
  question: QuestionView | null;
  guesses: Guess[];
  cards: Record<string, number>;
  chips: Record<string, number>;
  dobrei: boolean;
  deadline: number | null;
  total: number | null;
  result: RoundResult | null;
}

/** What one phone shows: the public board plus this player's controls. */
export interface PlayerView extends PublicView {
  isTurn: boolean;
  /** Smallest guess this player may make now. */
  minGuess: number;
  canDoubt: boolean;
  /** Guess from which Dobrei! pays (null when the module is off or there is nothing to double). */
  doubleAt: number | null;
}

export type Action =
  | { type: 'category'; index: number }
  | { type: 'guess'; value: number }
  | { type: 'doubt' }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

/** Safety net: if the Host never advances the tutorial, round 1 starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

const qKey = (c: number, q: number) => `${c}:${q}`;

const isConnected = (ctx: Ctx, id: string) => ctx.players.find((p) => p.id === id)?.connected ?? false;
const connectedCount = (ctx: Ctx) => ctx.players.filter((p) => p.connected).length;
const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);

/** Next connected player after `from` in seat order (never `from` itself). */
function nextConnected(state: State, ctx: Ctx, from: string): string | null {
  const n = state.seats.length;
  const start = state.seats.indexOf(from);
  for (let i = 1; i < n; i++) {
    const id = state.seats[(start + i) % n]!;
    if (isConnected(ctx, id)) return id;
  }
  return null;
}

const freeQuestions = (state: State, c: number) =>
  CATEGORIES[c]!.questions.map((_, q) => q).filter((q) => !state.used.includes(qKey(c, q)));

function armTurn(ctx: Ctx) {
  if (ctx.config.turnSeconds > 0) ctx.setTimer('turn', ctx.config.turnSeconds * 1000);
  else ctx.clearTimer('turn');
}

function startRound(state: State, ctx: Ctx) {
  const available = CATEGORIES.map((_, c) => c).filter((c) => freeQuestions(state, c).length > 0);
  if (available.length === 0) return finish(state, ctx);
  // An opener who dropped (e.g. during the tutorial) hands the opening to the next seat.
  if (!isConnected(ctx, state.starter)) {
    const next = nextConnected(state, ctx, state.starter);
    if (!next) return finish(state, ctx);
    state.starter = next;
  }
  state.phase = 'category';
  state.turn = state.starter;
  state.category = null;
  state.question = null;
  state.guesses = [];
  state.last = null;
  ctx.clearTimer('phase');
  ctx.emit('sound', 'round');
  state.options = ctx.rng.shuffle(available).slice(0, ctx.config.categoryChoices);
  if (state.options.length === 1) return chooseCategory(state, state.options[0]!, ctx);
  armTurn(ctx);
}

function chooseCategory(state: State, c: number, ctx: Ctx) {
  const q = ctx.rng.pick(freeQuestions(state, c));
  state.used.push(qKey(c, q));
  state.category = c;
  state.question = q;
  state.options = [];
  state.phase = 'guess';
  state.turn = state.starter;
  armTurn(ctx);
  ctx.emit('sound', 'phase');
}

function placeGuess(state: State, playerId: string, value: number, ctx: Ctx) {
  const prev = state.guesses.at(-1);
  const doubled = ctx.config.dobrei && !!prev && prev.value > 0 && value >= prev.value * 2;
  state.guesses.push({ by: playerId, value, doubled });
  const next = nextConnected(state, ctx, playerId);
  if (!next) return finish(state, ctx);
  state.turn = next;
  armTurn(ctx);
  ctx.emit('sound', 'tick');
}

function doubt(state: State, doubter: string, auto: boolean, ctx: Ctx) {
  const g = state.guesses.at(-1)!;
  const answer = CATEGORIES[state.category!]!.questions[state.question!]!.answer;
  const loser = g.value > answer ? g.by : doubter;
  state.cards[loser] = (state.cards[loser] ?? 0) + 1;
  // A doubled guess pays its chip unless it is the very guess that was doubted and lost.
  const chips: string[] = [];
  state.guesses.forEach((x, i) => {
    if (!x.doubled) return;
    if (i === state.guesses.length - 1 && loser === x.by) return;
    state.chips[x.by] = (state.chips[x.by] ?? 0) + 1;
    chips.push(x.by);
  });
  state.last = {
    answer,
    guess: g.value,
    guesser: g.by,
    doubter,
    loser,
    auto,
    chips,
  };
  state.phase = 'reveal';
  ctx.clearTimer('turn');
  ctx.setTimer('phase', LEAD_MS + ctx.config.revealSeconds * 1000);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', LEAD_MS);
  ctx.emit('fx', 'reveal', LEAD_MS);
}

/** Match points: -1 per card, each Dobrei chip cancels one card (never above 0). */
export function matchScore(cards: number, chips: number): number {
  const net = Math.max(0, cards - chips);
  return net === 0 ? 0 : -net;
}

function finish(state: State, ctx: Ctx) {
  ctx.clearTimer('turn');
  ctx.clearTimer('phase');
  ctx.end({
    scores: Object.fromEntries(
      ctx.players.map((p) => [p.id, matchScore(state.cards[p.id] ?? 0, state.chips[p.id] ?? 0)]),
    ),
  });
}

/** After a reveal: the round limit was reached, or someone holds `cardLimit` cards. */
function matchOver(state: State, ctx: Ctx): boolean {
  if (ctx.config.endMode === 'cards') return Object.values(state.cards).some((n) => n >= ctx.config.cardLimit);
  return state.round >= ctx.config.rounds;
}

function nextRound(state: State, ctx: Ctx) {
  if (matchOver(state, ctx)) return finish(state, ctx);
  const doubter = state.last?.doubter ?? state.starter;
  const starter = isConnected(ctx, doubter) ? doubter : nextConnected(state, ctx, doubter);
  if (!starter) return finish(state, ctx);
  state.round += 1;
  state.starter = starter;
  startRound(state, ctx);
}

/** Derived from state, never scripted: what the player on turn can do right now. */
function hint(state: State, ctx: Ctx): Hint {
  if (!ctx.config.tutorial || state.round !== 1) return null;
  if (state.phase === 'category') return 'category';
  if (state.phase === 'guess') return state.guesses.length === 0 ? 'open' : 'raise';
  return null;
}

function endIntro(state: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  state.tvRules = null;
  startRound(state, ctx);
}

function publicView(state: State, ctx: Ctx): PublicView {
  const timer = state.phase === 'reveal' ? 'phase' : 'turn';
  const q =
    state.category !== null && state.question !== null ? CATEGORIES[state.category]!.questions[state.question]! : null;
  return {
    round: state.round,
    rounds: ctx.config.endMode === 'rounds' ? ctx.config.rounds : null,
    cardLimit: ctx.config.endMode === 'cards' ? ctx.config.cardLimit : null,
    phase: state.phase,
    slide: state.slide,
    slides: SLIDES.length,
    tvRules: state.tvRules,
    hint: hint(state, ctx),
    seats: state.seats,
    starter: state.starter,
    turn: state.turn,
    options: state.phase === 'category' ? state.options.map((c) => CATEGORIES[c]!.name) : [],
    category: state.category !== null ? CATEGORIES[state.category]!.name : null,
    question: q ? { text: q.text, unit: q.unit } : null,
    guesses: state.guesses,
    cards: state.cards,
    chips: state.chips,
    dobrei: ctx.config.dobrei,
    deadline: ctx.timerDeadline(timer),
    total: ctx.timerTotal(timer),
    result: state.phase === 'reveal' ? state.last : null,
  };
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const seats = ctx.rng.shuffle(ctx.players.map((p) => p.id));
    const starter = ctx.rng.pick(seats);
    const state: State = {
      round: 1,
      phase: ctx.config.tutorial ? 'intro' : 'category',
      slide: 0,
      tvRules: null,
      seats,
      starter,
      turn: starter,
      options: [],
      category: null,
      question: null,
      used: [],
      guesses: [],
      cards: Object.fromEntries(seats.map((id) => [id, 0])),
      chips: Object.fromEntries(seats.map((id) => [id, 0])),
      last: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    if (!raw || typeof raw !== 'object') return;
    const action = raw as Action;

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
      if (action.dir === 'skip' || (action.dir === 1 && last)) endIntro(state, ctx);
      else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (playerId !== state.turn) return;
    switch (action.type) {
      case 'category': {
        if (state.phase !== 'category') return;
        if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.options.length) return;
        chooseCategory(state, state.options[action.index]!, ctx);
        return;
      }
      case 'guess': {
        if (state.phase !== 'guess') return;
        const value = action.value;
        if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GUESS) return;
        const prev = state.guesses.at(-1);
        if (prev && value <= prev.value) return;
        placeGuess(state, playerId, value, ctx);
        return;
      }
      case 'doubt': {
        if (state.phase !== 'guess' || state.guesses.length === 0) return;
        doubt(state, playerId, false, ctx);
        return;
      }
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') endIntro(state, ctx);
      return;
    }
    if (key === 'turn') {
      if (state.phase === 'category') chooseCategory(state, ctx.rng.pick(state.options), ctx);
      else if (state.phase === 'guess') {
        // Out of time: the opening guess becomes 1, any later turn doubts the last guess.
        if (state.guesses.length === 0) placeGuess(state, state.turn, 1, ctx);
        else doubt(state, state.turn, true, ctx);
      }
    } else if (key === 'phase' && state.phase === 'reveal') {
      nextRound(state, ctx);
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    if (connectedCount(ctx) < 2) return finish(state, ctx);
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro') {
      if (isHost(ctx, playerId)) endIntro(state, ctx);
      return;
    }
    if (state.phase === 'reveal' || playerId !== state.turn) return;
    const next = nextConnected(state, ctx, playerId)!;
    if (state.phase === 'category' || state.guesses.length === 0) state.starter = next;
    state.turn = next;
    armTurn(ctx);
  },

  publicView,

  playerView(state, playerId, ctx): PlayerView {
    const prev = state.guesses.at(-1);
    const isTurn = (state.phase === 'category' || state.phase === 'guess') && state.turn === playerId;
    return {
      ...publicView(state, ctx),
      isTurn,
      minGuess: prev ? prev.value + 1 : 0,
      canDoubt: isTurn && state.phase === 'guess' && !!prev,
      doubleAt: ctx.config.dobrei && prev && prev.value > 0 ? prev.value * 2 : null,
    };
  },
});
