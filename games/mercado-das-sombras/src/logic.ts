import { defineGame, type GameCtx, type GameManifest, type I18nText } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { SECTORS } from './companies.ts';
import { closeMarket, drawRules, rulePieces, seeded, type Effect, type Rule, type RoundInput } from './rules.ts';
import { RULES, SLIDES } from './texts.ts';
import {
  CLOSING_MS,
  FINAL_MS,
  MAX_QTY,
  MILESTONES,
  MILESTONE_CLOSING_MS,
  ROUNDS,
  START_CASH,
  START_PRICE,
  TOP_BONUS,
  bandPoints,
  nextMilestone,
  revealedWords,
} from './shared.ts';

// Mercado das Sombras: 24 rounds of trading 7 stocks whose price rules are hidden and revealed
// piece by piece. Each player may hide one stock from everyone for two rounds (the Secret).

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  roundSeconds: string;
  noise: 'off' | 'light' | 'strong';
  dealerHints: boolean;
}

export type Phase = 'intro' | 'trading' | 'closing' | 'final';

interface Company {
  sector: string;
  icon: string;
  name: I18nText;
  /** SECRET: the rule and its words; only revealed words leave the engine. */
  rule: Rule;
  words: Record<Lang, string[]>;
  /** SECRET: the order words are revealed in (indexes into `words`); vague words come first. */
  order: Record<Lang, number[]>;
  /** history[0] = opening price; history[k] = price after the close of round k. */
  history: number[];
  /** stats[k-1] = what happened in round k (aggregated, never per player). */
  stats: { buys: number; sells: number; held: number }[];
}

export interface State {
  phase: Phase;
  round: number;
  slide: number;
  tvRules: number | null;
  companies: Company[];
  pending: (Effect | null)[];
  /** SECRET (each player's own). */
  cash: Record<string, number>;
  holdings: Record<string, number[]>;
  /** SECRET until the close: this round's volumes. */
  buys: number[];
  sells: number[];
  secretUsed: Record<string, boolean>;
  /** SECRET: Secret each player asked for this round (company index). */
  secretReq: Record<string, number>;
  /** Activated Secrets: the company and the round they were activated in. Never who. */
  secrets: { company: number; round: number }[];
  /** SECRET: player traded blind; their cash stays hidden while this round (or earlier) is on screen. */
  blindUntil: Record<string, number>;
  /** Final net worth and points, set after the last close. */
  final: Record<string, { worth: number; points: number }> | null;
}

type Lang = 'pt-BR' | 'en';

/** A revealed word, or a run of hidden words drawn as one fixed placeholder (no length leaks). */
export type RuleToken = { w: string; fresh?: boolean } | { hidden: 'next' | 'later' };

export interface CompanyView {
  icon: string;
  name: I18nText;
  /** Current price, or null under a Secret. */
  price: number | null;
  /** Change at the last close, or null if unknown. */
  change: number | null;
  /** Price after each close so far (null = hidden by a Secret; those gaps stay for good). */
  history: (number | null)[];
  /** Last round's volumes and total held (null under a Secret or before the first close). */
  buys: number | null;
  sells: number | null;
  held: number | null;
  hidden: boolean;
  rule: Record<Lang, RuleToken[]>;
}

export interface MarketView {
  phase: Phase;
  round: number;
  rounds: number;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  /** This closing reveals more of every rule (the next round is a milestone). */
  milestone: boolean;
  noise: boolean;
  companies: CompanyView[];
  /** Ranking order; worth is null while any Secret hides prices. */
  ranking: { id: string; worth: number | null; points: number | null }[];
}

export type PublicView = MarketView;

/** The standing Dealer screen when the Host turns on "only the hints": public rule hints, nothing else. */
export interface DealerHintsView {
  round: number;
  phase: Phase;
  milestone: boolean;
  noise: boolean;
  companies: { icon: string; name: I18nText; rule: Record<Lang, RuleToken[]> }[];
}

export interface PlayerView extends MarketView {
  /** Null while this player's cash would reveal a hidden price (blind trade). */
  cash: number | null;
  holdings: number[];
  worth: number | null;
  rank: number;
  secretUsed: boolean;
  /** Company this player put a Secret on this round (may still cancel). */
  secretReq: number | null;
  canSecret: boolean;
  blind: boolean;
}

export type Action =
  | { type: 'trade'; company: number; qty: number }
  | { type: 'secret'; company: number | null }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const INTRO_MAX_MS = 10 * 60_000;
const COMPANIES = 7;
const NOISE: Record<string, number> = { off: 0, light: 2, strong: 5 };

const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);
const price = (c: Company) => c.history[c.history.length - 1]!;
const roundMs = (ctx: Ctx) => {
  const s = Number(ctx.config.roundSeconds);
  return (Number.isFinite(s) && s > 0 ? s : 300) * 1000;
};
const isMilestone = (round: number) => (MILESTONES as readonly number[]).includes(round);

/** The round whose screen is showing: during a closing, the next round's view (the close's results). */
function viewRound(state: State): number {
  return state.phase === 'closing' || state.phase === 'final' ? state.round + 1 : state.round;
}

/** Is company `c` hidden by a Secret while round `d` is on screen? (A Secret in round r hides r+1 and r+2.) */
function hiddenAt(state: State, c: number, d: number): boolean {
  if (state.phase === 'final') return false;
  return state.secrets.some((s) => s.company === c && d >= s.round + 1 && d <= s.round + 2);
}

/**
 * Is the close of round k (history[k]) masked for company c while round d is on screen? A Secret in
 * round r hides closes r and r+1 from the moment it takes effect and for good: those points never
 * come back to the chart (only the price on screen returns, once the Secret ends).
 */
function maskedClose(state: State, c: number, k: number, d: number): boolean {
  const last = state.companies[c]!.history.length - 1;
  if (state.phase === 'final' && k === last) return false;
  return state.secrets.some((s) => s.company === c && d >= s.round + 1 && (k === s.round || k === s.round + 1));
}

function worthOf(state: State, id: string): number {
  const h = state.holdings[id]!;
  return state.cash[id]! + state.companies.reduce((sum, c, i) => sum + h[i]! * price(c), 0);
}

function startRound(state: State, ctx: Ctx) {
  state.phase = 'trading';
  state.buys = new Array(COMPANIES).fill(0);
  state.sells = new Array(COMPANIES).fill(0);
  state.secretReq = {};
  ctx.setTimer('phase', roundMs(ctx));
  ctx.emit('sound', 'round');
}

function closeRound(state: State, ctx: Ctx) {
  const R = state.round;
  const ids = ctx.players.map((p) => p.id);
  const n = state.companies.length;
  const prices = state.companies.map(price);
  const worths = ids.map((id) => worthOf(state, id));
  const best = Math.max(...worths);
  const leaders = ids.filter((_, i) => worths[i] === best);
  const held = state.companies.map((_, j) => ids.reduce((s, id) => s + state.holdings[id]![j]!, 0));
  const secretPlaced = new Array<boolean>(n).fill(false);
  for (const [id, c] of Object.entries(state.secretReq)) {
    secretPlaced[c] = true;
    state.secretUsed[id] = true;
  }
  const inp: RoundInput = {
    round: R,
    players: ids.length,
    buys: [...state.buys],
    sells: [...state.sells],
    held,
    heldPrev: state.companies.map((c) => c.stats[c.stats.length - 1]?.held ?? 0),
    holders: state.companies.map((_, j) => ids.filter((id) => state.holdings[id]![j]! > 0).length),
    leaderHolds: state.companies.map((_, j) => leaders.some((id) => state.holdings[id]![j]! > 0)),
    secretPlaced,
    underSecret: state.companies.map((_, j) => hiddenAt(state, j, R)),
  };
  const res = closeMarket(
    { rules: state.companies.map((c) => c.rule), prices, pending: state.pending },
    inp,
    NOISE[ctx.config.noise] ?? 0,
    () => ctx.rng.next(),
  );
  state.companies.forEach((c, j) => {
    c.history.push(res.prices[j]!);
    c.stats.push({ buys: state.buys[j]!, sells: state.sells[j]!, held: held[j]! });
  });
  state.pending = res.pending;
  secretPlaced.forEach((s, j) => {
    if (s) state.secrets.push({ company: j, round: R });
  });
  state.secretReq = {};
  state.buys = new Array(n).fill(0);
  state.sells = new Array(n).fill(0);

  if (R >= ROUNDS) {
    finish(state, ctx);
    return;
  }
  state.phase = 'closing';
  const milestone = isMilestone(R + 1);
  ctx.setTimer('phase', milestone ? MILESTONE_CLOSING_MS : CLOSING_MS);
  ctx.emit('sound', 'phase');
  if (milestone) {
    ctx.emit('sound', 'drumroll', 3000);
    ctx.emit('sound', 'reveal', 5300);
    ctx.emit('fx', 'reveal', 5300);
  }
}

function finish(state: State, ctx: Ctx) {
  const ids = ctx.players.map((p) => p.id);
  const worths = Object.fromEntries(ids.map((id) => [id, worthOf(state, id)]));
  const best = Math.max(...Object.values(worths));
  state.final = Object.fromEntries(
    ids.map((id) => [
      id,
      { worth: worths[id]!, points: bandPoints(worths[id]!) + (worths[id] === best ? TOP_BONUS : 0) },
    ]),
  );
  state.phase = 'final';
  ctx.setTimer('phase', FINAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'final', 2300);
}

function ruleTokens(c: Company, lang: Lang, d: number, final: boolean, milestone: boolean): RuleToken[] {
  const words = c.words[lang];
  const order = c.order[lang];
  const n = words.length;
  const shown = final ? n : revealedWords(d, n);
  const visible = new Set(order.slice(0, shown));
  const next = nextMilestone(d);
  const upcoming = new Set(final || next === null ? [] : order.slice(shown, revealedWords(next, n)));
  const fresh = new Set(milestone ? order.slice(revealedWords(d - 1, n), shown) : []);
  const out: RuleToken[] = [];
  words.forEach((w, i) => {
    if (visible.has(i)) {
      out.push(fresh.has(i) ? { w, fresh: true } : { w });
      return;
    }
    const kind = upcoming.has(i) ? 'next' : 'later';
    const last = out[out.length - 1];
    if (last && 'hidden' in last && last.hidden === kind) return;
    out.push({ hidden: kind });
  });
  return out;
}

const norm = (w: string) =>
  w
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Connective words that say nothing on their own. */
const FILLER = new Set(
  (
    'se o a os as de da do das dos e em na no nas nos ou por para com que esta este nesta neste ' +
    'if the a an of is in on or and its it this than to for at by be are'
  ).split(' '),
);

/**
 * Splits the rule into words and orders their reveal so each milestone gives an idea without giving
 * the rule away: the first word is always a clue (never a connective, number or company name), then
 * clues and connectives mixed, and numbers, amounts and company names last.
 */
function ruleWords(pieces: I18nText[], names: I18nText[], lang: Lang, rng: Ctx['rng']) {
  const words = pieces
    .map((p) => p[lang])
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);
  const nameWords = new Set(names.flatMap((nm) => nm[lang].split(/\s+/).map(norm)).filter((w) => w.length > 2));
  const telling = (w: string) => /[\d$%]/.test(w) || nameWords.has(norm(w));
  const filler = (w: string) => norm(w) === '' || FILLER.has(norm(w));
  const idx = words.map((_, i) => i);
  const clues = rng.shuffle(idx.filter((i) => !telling(words[i]!) && !filler(words[i]!)));
  const middle = rng.shuffle([...clues.slice(1), ...idx.filter((i) => filler(words[i]!) && !telling(words[i]!))]);
  const order = [...clues.slice(0, 1), ...middle, ...rng.shuffle(idx.filter((i) => telling(words[i]!)))];
  return { words, order };
}

function marketView(state: State, ctx: Ctx): MarketView {
  const d = viewRound(state);
  const final = state.phase === 'final';
  const anyHidden = state.companies.some((_, j) => hiddenAt(state, j, d));
  const milestone = state.phase === 'closing' && isMilestone(d);
  const companies = state.companies.map((c, j): CompanyView => {
    const hidden = hiddenAt(state, j, d);
    const last = c.history.length - 1;
    const history = c.history.map((p, k) => (maskedClose(state, j, k, d) ? null : p));
    const cur = history[last] ?? null;
    const before = last > 0 ? (history[last - 1] ?? null) : null;
    const st = c.stats[c.stats.length - 1];
    return {
      icon: c.icon,
      name: c.name,
      price: hidden ? null : cur,
      change: hidden || cur === null || before === null ? null : cur - before,
      history,
      buys: hidden || !st ? null : st.buys,
      sells: hidden || !st ? null : st.sells,
      held: hidden || !st ? null : st.held,
      hidden,
      rule: { 'pt-BR': ruleTokens(c, 'pt-BR', d, final, milestone), en: ruleTokens(c, 'en', d, final, milestone) },
    };
  });
  const ids = ctx.players.map((p) => p.id);
  const worths = Object.fromEntries(ids.map((id) => [id, state.final?.[id]?.worth ?? worthOf(state, id)]));
  const ranking = [...ids]
    .sort((a, b) => worths[b]! - worths[a]!)
    .map((id) => ({
      id,
      worth: anyHidden ? null : worths[id]!,
      points: state.final?.[id]?.points ?? null,
    }));
  return {
    phase: state.phase,
    round: state.round,
    rounds: ROUNDS,
    slide: state.slide,
    slides: SLIDES.length,
    tvRules: state.tvRules,
    deadline: ctx.timerDeadline('phase'),
    total: ctx.timerTotal('phase'),
    milestone,
    noise: (NOISE[ctx.config.noise] ?? 0) > 0,
    companies,
    ranking,
  };
}

function trade(state: State, id: string, company: number, qty: number) {
  const c = state.companies[company]!;
  const p = price(c);
  const h = state.holdings[id]!;
  const blind = hiddenAt(state, company, state.round);
  let done: number;
  if (qty > 0) {
    // A blind buy is capped by the last price everyone saw, never by the hidden one: the fill must
    // not reveal the price. If the real price is higher, cash goes negative until it is earned back.
    const lastSeen = blind
      ? (c.history.filter((_, k) => !maskedClose(state, company, k, state.round)).at(-1) ?? p)
      : p;
    done = Math.max(0, Math.min(qty, Math.floor(state.cash[id]! / lastSeen)));
    state.cash[id]! -= done * p;
    h[company]! += done;
    state.buys[company]! += done;
  } else {
    done = Math.min(-qty, h[company]!);
    state.cash[id]! += done * p;
    h[company]! -= done;
    state.sells[company]! += done;
  }
  if (done > 0 && blind) {
    const until = Math.max(...state.secrets.filter((s) => s.company === company).map((s) => s.round + 2));
    state.blindUntil[id] = Math.max(state.blindUntil[id] ?? 0, until);
  }
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const sectors = ctx.rng.shuffle(SECTORS).slice(0, COMPANIES);
    const names = sectors.map((s) => ctx.rng.pick(s.names));
    const rules = drawRules(COMPANIES, ctx.players.length, seeded(ctx.rng.int(1, 2 ** 31 - 1)));
    const companies: Company[] = sectors.map((s, i) => {
      const pieces = rulePieces(rules[i]!, names);
      const pt = ruleWords(pieces, names, 'pt-BR', ctx.rng);
      const en = ruleWords(pieces, names, 'en', ctx.rng);
      return {
        sector: s.id,
        icon: s.icon,
        name: names[i]!,
        rule: rules[i]!,
        words: { 'pt-BR': pt.words, en: en.words },
        order: { 'pt-BR': pt.order, en: en.order },
        history: [START_PRICE],
        stats: [],
      };
    });
    const state: State = {
      phase: 'intro',
      round: 1,
      slide: 0,
      tvRules: null,
      companies,
      pending: new Array(COMPANIES).fill(null),
      cash: Object.fromEntries(ctx.players.map((p) => [p.id, START_CASH])),
      holdings: Object.fromEntries(ctx.players.map((p) => [p.id, new Array(COMPANIES).fill(0)])),
      buys: new Array(COMPANIES).fill(0),
      sells: new Array(COMPANIES).fill(0),
      secretUsed: Object.fromEntries(ctx.players.map((p) => [p.id, false])),
      secretReq: {},
      secrets: [],
      blindUntil: {},
      final: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object') return;
    if (!ctx.players.some((p) => p.id === playerId)) return;

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
    if (state.phase !== 'trading') return;

    if (action.type === 'trade') {
      const { company, qty } = action;
      if (!Number.isInteger(company) || company < 0 || company >= state.companies.length) return;
      if (!Number.isInteger(qty) || qty === 0 || Math.abs(qty) > MAX_QTY) return;
      trade(state, playerId, company, qty);
      return;
    }
    if (action.type === 'secret') {
      if (state.secretUsed[playerId] || state.round >= ROUNDS) return;
      if (action.company === null) {
        delete state.secretReq[playerId];
        return;
      }
      const c = action.company;
      if (!Number.isInteger(c) || c < 0 || c >= state.companies.length) return;
      state.secretReq[playerId] = c;
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startRound(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'trading') closeRound(state, ctx);
    else if (state.phase === 'closing') {
      state.round += 1;
      startRound(state, ctx);
    } else if (state.phase === 'final' && state.final) {
      ctx.end({ scores: Object.fromEntries(Object.entries(state.final).map(([id, f]) => [id, f.points])) });
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro' && isHost(ctx, playerId)) {
      ctx.clearTimer('intro');
      startRound(state, ctx);
    }
    // Otherwise nothing waits on anyone: the player keeps their cash and shares, and a Secret
    // they asked for this round still goes off at the close.
  },

  publicView(state, ctx): PublicView {
    return marketView(state, ctx);
  },

  // Host option: the Dealer screen becomes a standing board with the rule hints (all public).
  dealerIdleView(state, ctx): DealerHintsView | null {
    if (!ctx.config.dealerHints || state.phase === 'intro') return null;
    const m = marketView(state, ctx);
    return {
      round: m.round,
      phase: m.phase,
      milestone: m.milestone,
      noise: m.noise,
      companies: m.companies.map((c) => ({ icon: c.icon, name: c.name, rule: c.rule })),
    };
  },

  // With remote screens on, anyone may open the hints board on their own screen.
  dealerAudience(_state, ctx) {
    return ctx.config.dealerHints ? ctx.players.map((p) => p.id) : [];
  },

  playerView(state, playerId, ctx): PlayerView {
    const m = marketView(state, ctx);
    const d = viewRound(state);
    const known = state.cash[playerId] !== undefined;
    const blind = known && state.phase !== 'final' && (state.blindUntil[playerId] ?? 0) >= d;
    const anyHidden = m.ranking.some((r) => r.worth === null);
    return {
      ...m,
      cash: !known || blind ? null : state.cash[playerId]!,
      holdings: state.holdings[playerId] ?? new Array(COMPANIES).fill(0),
      worth: !known || anyHidden ? null : (state.final?.[playerId]?.worth ?? worthOf(state, playerId)),
      rank: known ? 1 + ctx.players.filter((p) => worthOf(state, p.id) > worthOf(state, playerId)).length : 0,
      secretUsed: state.secretUsed[playerId] ?? false,
      secretReq: state.secretReq[playerId] ?? null,
      canSecret: known && state.phase === 'trading' && !state.secretUsed[playerId] && state.round < ROUNDS,
      blind,
    };
  },
});
