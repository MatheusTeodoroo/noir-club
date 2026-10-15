import { defineGame, type GameCtx, type GameManifest, type I18nText } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { CLUE_MAX, DECK_SIZE, EXTREME_MAX, PERFECT_BONUS, THEME_MAX, THEME_OPTIONS } from './shared.ts';
import { THEMES, type Theme } from './themes.ts';

// Escala: each round has a theme that runs from 1 to 100. Every player gets secret cards from a
// 1–100 deck and writes a clue for each one on that scale. Then the cards are put in order using
// only the clues: together on one shared row (coop) or each player on their own row (versus).

export const manifest = manifestJson as GameManifest;
export type { Theme };

export type Mode = 'coop' | 'versus';
export type ThemeSource = 'draw' | 'write';

export interface Config {
  mode: Mode;
  themeSource: ThemeSource;
  cardsPerPlayer: number;
  rounds: number;
  clueSeconds: number;
  sortSeconds: number;
}

export type Phase = 'theme' | 'clues' | 'sort' | 'reveal';

interface Card {
  id: string;
  owner: string;
  /** SECRET: only the owner knows it until the reveal. */
  value: number;
  clue: string | null;
}

export interface VersusPoints {
  exact: number;
  perfect: number;
  bonus: number;
  total: number;
}

export interface RoundResult {
  values: Record<string, number>;
  /** Card ids from lowest to highest value. */
  correct: string[];
  /** Delay before the first card flips, then one card every `stepMs`. */
  leadMs: number;
  stepMs: number;
  coop: null | { order: string[]; hits: number; accuracy: number };
  versus: null | { orders: Record<string, string[]>; points: Record<string, VersusPoints> };
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  round: number;
  phase: Phase;
  master: string;
  /** Index in ctx.players where the next master search starts. */
  cursor: number;
  /** Theme bank indices offered to the master (draw mode). */
  options: number[];
  used: number[];
  theme: Theme | null;
  cardsPer: number;
  cards: Card[];
  clueTimer: boolean;
  /** Coop: the shared row. */
  order: string[];
  /** Versus: SECRET until the reveal — each player's own row. */
  orders: Record<string, string[]>;
  ready: Record<string, boolean>;
  last: RoundResult | null;
  /** Versus running totals. */
  scores: Record<string, number>;
  /** Coop accuracy (0–100) of each finished round. */
  accuracies: number[];
}

export interface PublicCard {
  id: string;
  owner: string;
  clue: string | null;
}

/** What every TV shows. */
export interface PublicView {
  round: number;
  rounds: number;
  phase: Phase;
  mode: Mode;
  source: ThemeSource;
  master: string;
  options: Theme[];
  theme: Theme | null;
  cardsPer: number;
  /** The Host asked for more cards than the deck allows for this many players. */
  cut: boolean;
  deadline: number | null;
  total: number | null;
  /** Clues written per player (clues phase) — never the clues themselves. */
  progress: Record<string, number>;
  cards: PublicCard[];
  /** Coop: the shared row, live. Empty in versus. */
  order: string[];
  ready: string[];
  result: RoundResult | null;
  scores: Record<string, number>;
  accuracies: number[];
}

export interface MyCard {
  id: string;
  value: number;
  clue: string | null;
}

/** What one phone shows. */
export interface PlayerView {
  round: number;
  rounds: number;
  phase: Phase;
  mode: Mode;
  source: ThemeSource;
  master: string;
  isMaster: boolean;
  options: Theme[];
  theme: Theme | null;
  deadline: number | null;
  total: number | null;
  mine: MyCard[];
  cards: PublicCard[];
  /** Coop: the shared row; versus: this player's own row. */
  order: string[];
  ready: boolean;
  readyCount: number;
  playing: number;
  /** Room-clock time when the TV has flipped every card. */
  showAt: number | null;
  myResult: null | { accuracy: number } | VersusPoints;
}

export type Action =
  | { type: 'pickTheme'; index: number }
  | { type: 'writeTheme'; title: string; low?: string; high?: string }
  | { type: 'clue'; cardId: string; text: string }
  | { type: 'move'; cardId: string; to: number }
  | { type: 'ready'; value: boolean };

type Ctx = GameCtx<Config>;

export const LEAD_MS = 2_500;
export const COOP_HOLD_MS = 7_000;
export const VERSUS_HOLD_MS = 10_000;

export function cardsPerPlayer(requested: number, players: number): number {
  return Math.max(1, Math.min(requested, Math.floor(DECK_SIZE / players)));
}

export function revealStep(cards: number): number {
  return Math.max(250, Math.min(1_200, Math.round(24_000 / cards)));
}

const connected = (ctx: Ctx) => ctx.players.filter((p) => p.connected);

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text || text.length > max) return null;
  return text;
}

function pickMaster(state: State, ctx: Ctx) {
  const n = ctx.players.length;
  for (let i = 0; i < n; i++) {
    const idx = (state.cursor + i) % n;
    const p = ctx.players[idx]!;
    if (p.connected) {
      state.master = p.id;
      state.cursor = idx + 1;
      return;
    }
  }
  state.master = ctx.players[state.cursor % n]!.id;
  state.cursor += 1;
}

function drawOptions(state: State, ctx: Ctx): number[] {
  let free = THEMES.map((_, i) => i).filter((i) => !state.used.includes(i));
  if (free.length < THEME_OPTIONS) {
    state.used = [];
    free = THEMES.map((_, i) => i);
  }
  return ctx.rng.shuffle(free).slice(0, THEME_OPTIONS);
}

function startRound(state: State, ctx: Ctx) {
  state.phase = 'theme';
  state.theme = null;
  state.cards = [];
  state.order = [];
  state.orders = {};
  state.ready = {};
  state.last = null;
  state.clueTimer = false;
  pickMaster(state, ctx);
  state.options = ctx.config.themeSource === 'draw' ? drawOptions(state, ctx) : [];
  ctx.clearTimer('phase');
  ctx.clearTimer('clues');
  ctx.emit('sound', 'round');
}

function setTheme(state: State, theme: Theme, ctx: Ctx) {
  state.theme = theme;
  state.options = [];
  const deck = ctx.rng.shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i + 1));
  const cards: Card[] = [];
  for (const p of ctx.players) {
    for (let k = 0; k < state.cardsPer; k++) cards.push({ id: '', owner: p.id, value: deck.pop()!, clue: null });
  }
  // Ids follow a shuffled order, so neither the id nor the list position hints at a value.
  state.cards = ctx.rng.shuffle(cards).map((c, i) => ({ ...c, id: `c${i + 1}` }));
  state.phase = 'clues';
  ctx.emit('sound', 'phase');
}

function autoTheme(state: State, ctx: Ctx) {
  const index = state.options.length ? ctx.rng.pick(state.options) : drawOptions(state, ctx)[0]!;
  state.used.push(index);
  setTheme(state, THEMES[index]!, ctx);
}

const hasAllClues = (state: State, playerId: string) =>
  state.cards.every((c) => c.owner !== playerId || c.clue !== null);

function checkClues(state: State, ctx: Ctx) {
  if (state.phase !== 'clues') return;
  const live = connected(ctx);
  const done = live.filter((p) => hasAllClues(state, p.id)).length;
  if (done === live.length) {
    startSort(state, ctx);
  } else if (!state.clueTimer && done * 2 >= live.length) {
    // Half the table is done: the rest now have a deadline.
    state.clueTimer = true;
    ctx.setTimer('clues', ctx.config.clueSeconds * 1000);
    ctx.emit('sound', 'tick');
  }
}

function startSort(state: State, ctx: Ctx) {
  ctx.clearTimer('clues');
  state.phase = 'sort';
  const ids = state.cards.map((c) => c.id);
  if (ctx.config.mode === 'coop') state.order = ctx.rng.shuffle(ids);
  else state.orders = Object.fromEntries(ctx.players.map((p) => [p.id, ctx.rng.shuffle(ids)]));
  state.ready = {};
  ctx.setTimer('phase', ctx.config.sortSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function checkReady(state: State, ctx: Ctx) {
  if (state.phase !== 'sort') return;
  const live = connected(ctx);
  if (live.length > 0 && live.every((p) => state.ready[p.id])) reveal(state, ctx);
}

function reveal(state: State, ctx: Ctx) {
  const values = Object.fromEntries(state.cards.map((c) => [c.id, c.value]));
  const correct = [...state.cards].sort((a, b) => a.value - b.value).map((c) => c.id);
  const hitsOf = (order: string[]) => order.filter((id, i) => correct[i] === id).length;
  const n = correct.length;
  const stepMs = revealStep(n);
  const result: RoundResult = { values, correct, leadMs: LEAD_MS, stepMs, coop: null, versus: null };

  if (ctx.config.mode === 'coop') {
    const hits = hitsOf(state.order);
    const accuracy = Math.round((hits / n) * 100);
    state.accuracies.push(accuracy);
    result.coop = { order: [...state.order], hits, accuracy };
  } else {
    const owner = Object.fromEntries(state.cards.map((c) => [c.id, c.owner]));
    const points: Record<string, VersusPoints> = {};
    for (const p of ctx.players) points[p.id] = { exact: 0, perfect: 0, bonus: 0, total: 0 };
    for (const p of ctx.players) {
      const order = state.orders[p.id] ?? [];
      const exact = hitsOf(order);
      const pts = points[p.id]!;
      pts.exact = exact;
      pts.perfect = exact === n ? PERFECT_BONUS : 0;
      // A good clue pays its owner: +1 for every other player who placed that card right.
      order.forEach((id, i) => {
        const by = owner[id];
        if (correct[i] === id && by && by !== p.id) points[by]!.bonus += 1;
      });
    }
    for (const p of ctx.players) {
      const pts = points[p.id]!;
      pts.total = pts.exact + pts.perfect + pts.bonus;
      state.scores[p.id] = (state.scores[p.id] ?? 0) + pts.total;
    }
    const orders = Object.fromEntries(Object.entries(state.orders).map(([id, o]) => [id, [...o]]));
    result.versus = { orders, points };
  }

  state.last = result;
  state.phase = 'reveal';
  const flips = LEAD_MS + n * stepMs;
  ctx.setTimer('phase', flips + (ctx.config.mode === 'coop' ? COOP_HOLD_MS : VERSUS_HOLD_MS));
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', LEAD_MS);
  ctx.emit('fx', 'reveal', flips);
}

function finish(state: State, ctx: Ctx) {
  if (ctx.config.mode === 'coop') {
    const list = state.accuracies;
    const avg = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
    ctx.end({ scores: Object.fromEntries(ctx.players.map((p) => [p.id, avg])) });
  } else {
    ctx.end({ scores: state.scores });
  }
}

function moveInto(order: string[], cardId: unknown, to: unknown): boolean {
  if (typeof cardId !== 'string' || !Number.isInteger(to)) return false;
  const from = order.indexOf(cardId);
  const target = to as number;
  if (from < 0 || target < 0 || target >= order.length || from === target) return false;
  order.splice(from, 1);
  order.splice(target, 0, cardId);
  return true;
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      round: 1,
      phase: 'theme',
      master: ctx.players[0]!.id,
      cursor: 0,
      options: [],
      used: [],
      theme: null,
      cardsPer: cardsPerPlayer(ctx.config.cardsPerPlayer, ctx.players.length),
      cards: [],
      clueTimer: false,
      order: [],
      orders: {},
      ready: {},
      last: null,
      scores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
      accuracies: [],
    };
    startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    if (!raw || typeof raw !== 'object') return;
    const action = raw as Action;

    switch (action.type) {
      case 'pickTheme': {
        if (state.phase !== 'theme' || playerId !== state.master || ctx.config.themeSource !== 'draw') return;
        if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.options.length) return;
        const index = state.options[action.index]!;
        state.used.push(index);
        setTheme(state, THEMES[index]!, ctx);
        return;
      }
      case 'writeTheme': {
        if (state.phase !== 'theme' || playerId !== state.master || ctx.config.themeSource !== 'write') return;
        const title = cleanText(action.title, THEME_MAX);
        if (!title) return;
        const extreme = (v: unknown): I18nText | null | false => {
          if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) return null;
          const text = cleanText(v, EXTREME_MAX);
          return text ? { 'pt-BR': text, en: text } : false;
        };
        const low = extreme(action.low);
        const high = extreme(action.high);
        if (low === false || high === false) return;
        setTheme(state, { title: { 'pt-BR': title, en: title }, low, high }, ctx);
        return;
      }
      case 'clue': {
        if (state.phase !== 'clues') return;
        const card = state.cards.find((c) => c.id === action.cardId);
        if (!card || card.owner !== playerId) return;
        const text = cleanText(action.text, CLUE_MAX);
        if (!text || text === card.clue) return;
        card.clue = text;
        checkClues(state, ctx);
        return;
      }
      case 'move': {
        if (state.phase !== 'sort') return;
        if (ctx.config.mode === 'coop') {
          if (!moveInto(state.order, action.cardId, action.to)) return;
          state.ready = {};
        } else {
          const order = state.orders[playerId];
          if (!order || !moveInto(order, action.cardId, action.to)) return;
          delete state.ready[playerId];
        }
        return;
      }
      case 'ready': {
        if (state.phase !== 'sort' || typeof action.value !== 'boolean') return;
        if (!!state.ready[playerId] === action.value) return;
        if (action.value) state.ready[playerId] = true;
        else delete state.ready[playerId];
        checkReady(state, ctx);
        return;
      }
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'clues') {
      if (state.phase === 'clues') startSort(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'sort') {
      reveal(state, ctx);
    } else if (state.phase === 'reveal') {
      if (state.round >= ctx.config.rounds) finish(state, ctx);
      else {
        state.round += 1;
        startRound(state, ctx);
      }
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    if (state.phase === 'theme' && playerId === state.master) autoTheme(state, ctx);
    if (state.phase === 'clues') checkClues(state, ctx);
    else if (state.phase === 'sort') checkReady(state, ctx);
  },

  publicView(state, ctx): PublicView {
    const showCards = state.phase === 'sort' || state.phase === 'reveal';
    const timer = state.phase === 'clues' ? 'clues' : 'phase';
    return {
      round: state.round,
      rounds: ctx.config.rounds,
      phase: state.phase,
      mode: ctx.config.mode,
      source: ctx.config.themeSource,
      master: state.master,
      options: state.phase === 'theme' ? state.options.map((i) => THEMES[i]!) : [],
      theme: state.theme,
      cardsPer: state.cardsPer,
      cut: state.cardsPer < ctx.config.cardsPerPlayer,
      deadline: ctx.timerDeadline(timer),
      total: ctx.timerTotal(timer),
      progress:
        state.phase === 'clues'
          ? Object.fromEntries(
              ctx.players.map((p) => [p.id, state.cards.filter((c) => c.owner === p.id && c.clue).length]),
            )
          : {},
      cards: showCards ? state.cards.map((c) => ({ id: c.id, owner: c.owner, clue: c.clue })) : [],
      order: ctx.config.mode === 'coop' && state.phase === 'sort' ? state.order : [],
      ready: Object.keys(state.ready),
      result: state.phase === 'reveal' ? state.last : null,
      scores: state.scores,
      accuracies: state.accuracies,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const isMaster = playerId === state.master;
    const showCards = state.phase === 'sort' || state.phase === 'reveal';
    const timer = state.phase === 'clues' ? 'clues' : 'phase';
    const last = state.phase === 'reveal' ? state.last : null;
    let myResult: PlayerView['myResult'] = null;
    if (last?.coop) myResult = { accuracy: last.coop.accuracy };
    else if (last?.versus) myResult = last.versus.points[playerId] ?? null;
    const deadline = ctx.timerDeadline(timer);
    const total = ctx.timerTotal(timer);
    return {
      round: state.round,
      rounds: ctx.config.rounds,
      phase: state.phase,
      mode: ctx.config.mode,
      source: ctx.config.themeSource,
      master: state.master,
      isMaster,
      options: state.phase === 'theme' && isMaster ? state.options.map((i) => THEMES[i]!) : [],
      theme: state.theme,
      deadline,
      total,
      mine: state.cards
        .filter((c) => c.owner === playerId)
        .sort((a, b) => a.value - b.value)
        .map((c) => ({ id: c.id, value: c.value, clue: c.clue })),
      cards: showCards ? state.cards.map((c) => ({ id: c.id, owner: c.owner, clue: c.clue })) : [],
      order: state.phase !== 'sort' ? [] : ctx.config.mode === 'coop' ? state.order : (state.orders[playerId] ?? []),
      ready: !!state.ready[playerId],
      readyCount: Object.keys(state.ready).length,
      playing: ctx.players.filter((p) => p.connected).length,
      showAt:
        last && deadline !== null && total !== null
          ? deadline - total + last.leadMs + last.correct.length * last.stepMs
          : null,
      myResult,
    };
  },
});
