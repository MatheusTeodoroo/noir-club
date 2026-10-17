import { defineGame, type GameCtx, type GameManifest, type I18nText } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { CATEGORIES } from './questions/index.ts';
import { LEAD_MS, MAX_GUESS } from './shared.ts';

// Duvido!: one question with a numeric answer per round. Players take turns in seat order, each
// either raising the last guess or doubting it. A doubt reveals the answer: a guess above it goes
// to the guesser as a card, otherwise the doubter takes it. Every card is -1 point.

export const manifest = manifestJson as GameManifest;

export type EndMode = 'rounds' | 'cards';

export interface Config {
  endMode: EndMode;
  /** Cards that end the match (endMode "cards"). */
  cardLimit: number;
  rounds: number;
  categoryChoices: number;
  turnSeconds: number;
  dobrei: boolean;
  revealSeconds: number;
}

export type Phase = 'category' | 'guess' | 'reveal';

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

export type Action = { type: 'category'; index: number } | { type: 'guess'; value: number } | { type: 'doubt' };

type Ctx = GameCtx<Config>;

const qKey = (c: number, q: number) => `${c}:${q}`;

const isConnected = (ctx: Ctx, id: string) => ctx.players.find((p) => p.id === id)?.connected ?? false;
const connectedCount = (ctx: Ctx) => ctx.players.filter((p) => p.connected).length;

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

function publicView(state: State, ctx: Ctx): PublicView {
  const timer = state.phase === 'reveal' ? 'phase' : 'turn';
  const q =
    state.category !== null && state.question !== null ? CATEGORIES[state.category]!.questions[state.question]! : null;
  return {
    round: state.round,
    rounds: ctx.config.endMode === 'rounds' ? ctx.config.rounds : null,
    cardLimit: ctx.config.endMode === 'cards' ? ctx.config.cardLimit : null,
    phase: state.phase,
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
      phase: 'category',
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
    startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    if (!raw || typeof raw !== 'object' || playerId !== state.turn) return;
    const action = raw as Action;
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
    if (state.phase === 'reveal' || playerId !== state.turn) return;
    const next = nextConnected(state, ctx, playerId)!;
    if (state.phase === 'category' || state.guesses.length === 0) state.starter = next;
    state.turn = next;
    armTurn(ctx);
  },

  publicView,

  playerView(state, playerId, ctx): PlayerView {
    const prev = state.guesses.at(-1);
    const isTurn = state.phase !== 'reveal' && state.turn === playerId;
    return {
      ...publicView(state, ctx),
      isTurn,
      minGuess: prev ? prev.value + 1 : 0,
      canDoubt: isTurn && state.phase === 'guess' && !!prev,
      doubleAt: ctx.config.dobrei && prev && prev.value > 0 ? prev.value * 2 : null,
    };
  },
});
