import type { I18nText } from '@mp/game-sdk';
import { MIN_PRICE, ROUNDS, START_CASH, START_PRICE, money } from './shared.ts';

// The hidden company rules: a bank of templates, each drawn with random numbers, written as
// pieces that are revealed during the match, and evaluated at every market close.
// SECRET: this module is imported only by logic.ts (never by the UI bundle).

/** A price change: a percentage of the price or a fixed amount per share, signed. */
export interface Effect {
  kind: 'pct' | 'abs';
  v: number;
}

export type RuleKind =
  | 'heldRange'
  | 'heldDelta'
  | 'buysVs'
  | 'sellsVsBuys'
  | 'noBuys'
  | 'holders'
  | 'demand'
  | 'leader'
  | 'marketMood'
  | 'contrarian'
  | 'followB'
  | 'inverseB'
  | 'cheaperB'
  | 'cycle'
  | 'parity'
  | 'everyM'
  | 'lateBloom'
  | 'reversion'
  | 'secretOnB'
  | 'underSecret';

export interface Rule {
  kind: RuleKind;
  /** Template numbers (threshold, rounds, per-share amount…), meaning depends on `kind`. */
  n1: number;
  n2: number;
  /** Company the rule looks at, or -1. */
  ref: number;
  /** Effect when the condition holds / when it does not. */
  yes: Effect;
  no: Effect;
}

const PLAYER_KINDS: RuleKind[] = ['heldRange', 'heldDelta', 'buysVs', 'sellsVsBuys', 'noBuys', 'holders', 'demand', 'leader'];
const PATTERN_KINDS: RuleKind[] = ['cycle', 'parity', 'everyM', 'lateBloom', 'reversion'];
const MARKET_KINDS: RuleKind[] = ['marketMood', 'contrarian'];
/** Kinds that read another company's move in the same close (that company must be evaluated first). */
const SAME_CLOSE_REF: RuleKind[] = ['followB', 'inverseB'];
export const ALL_KINDS: RuleKind[] = [
  ...PLAYER_KINDS,
  ...PATTERN_KINDS,
  ...MARKET_KINDS,
  'followB',
  'inverseB',
  'cheaperB',
  'secretOnB',
  'underSecret',
];
export const isMarketKind = (k: RuleKind) => MARKET_KINDS.includes(k);

/** Everything a close needs to know about the round that just ended. */
export interface RoundInput {
  round: number;
  players: number;
  buys: number[];
  sells: number[];
  /** Shares held by all players after the round / after the previous close. */
  held: number[];
  heldPrev: number[];
  /** How many players hold at least one share. */
  holders: number[];
  /** Does a leader of the ranking (before the close) hold this stock? */
  leaderHolds: boolean[];
  /** A Secret was activated on this company during the round. */
  secretPlaced: boolean[];
  /** This company was under a Secret during the round. */
  underSecret: boolean[];
}

export interface MarketCore {
  rules: Rule[];
  prices: number[];
  /** Next-close effects queued by market-mood rules. */
  pending: (Effect | null)[];
}

export interface CloseResult {
  prices: number[];
  /** +1 rose, -1 fell, 0 unchanged. */
  moves: number[];
  pending: (Effect | null)[];
}

export function applyEffect(price: number, e: Effect | null): number {
  if (!e) return price;
  const next = e.kind === 'pct' ? price * (1 + e.v / 100) : price + e.v;
  return Math.max(MIN_PRICE, Math.round(next));
}

/** One effect for a non-market rule (null = unchanged). */
function evaluate(rule: Rule, i: number, inp: RoundInput, prices: number[], moves: number[]): Effect | null {
  const pick = (c: boolean) => (c ? rule.yes : rule.no);
  switch (rule.kind) {
    case 'heldRange':
      return pick(inp.held[i]! >= rule.n1 && inp.held[i]! <= rule.n2);
    case 'heldDelta': {
      const d = inp.held[i]! - inp.heldPrev[i]!;
      return d === 0 ? null : { kind: 'abs', v: -rule.n1 * d };
    }
    case 'buysVs':
      return pick(inp.buys[i]! > inp.buys[rule.ref]!);
    case 'sellsVsBuys':
      return pick(inp.sells[i]! > inp.buys[i]!);
    case 'noBuys':
      return pick(inp.buys[i] === 0);
    case 'holders':
      return pick(inp.holders[i]! >= rule.n1);
    case 'demand':
      return pick(inp.held[i]! > inp.heldPrev[i]!);
    case 'leader':
      return pick(inp.leaderHolds[i]!);
    case 'followB':
      return pick(moves[rule.ref]! > 0);
    case 'inverseB':
      return pick(moves[rule.ref]! < 0);
    case 'cheaperB':
      return pick(prices[i]! < prices[rule.ref]!);
    case 'cycle':
      return pick((inp.round - 1 + rule.n2) % (rule.n1 + 1) === rule.n1);
    case 'parity':
      return pick(inp.round % 2 === 1);
    case 'everyM':
      return pick(inp.round % rule.n1 === 0);
    case 'lateBloom':
      return pick(inp.round >= rule.n1);
    case 'reversion':
      return pick(prices[i]! < rule.n1);
    case 'secretOnB':
      return pick(inp.secretPlaced[rule.ref]!);
    case 'underSecret':
      return pick(inp.underSecret[i]!);
    default:
      return null;
  }
}

/**
 * Closes the market for one round. Market-mood companies apply the effect queued at the previous
 * close; the others follow their rule in index order (cross rules only look at earlier companies or
 * market-mood ones, so every move they read is already known); then market-mood rules queue the
 * next effect from how the other six moved. `noise` (percent) jitters every new price.
 */
export function closeMarket(m: MarketCore, inp: RoundInput, noise: number, rand: () => number): CloseResult {
  const n = m.rules.length;
  const prices = [...m.prices];
  const moves = new Array<number>(n).fill(0);
  const settle = (i: number, e: Effect | null) => {
    let p = applyEffect(m.prices[i]!, e);
    if (noise > 0) p = Math.max(MIN_PRICE, Math.round(p * (1 + ((rand() * 2 - 1) * noise) / 100)));
    prices[i] = p;
    moves[i] = Math.sign(p - m.prices[i]!);
  };
  for (let i = 0; i < n; i++) if (isMarketKind(m.rules[i]!.kind)) settle(i, m.pending[i] ?? null);
  for (let i = 0; i < n; i++) {
    const rule = m.rules[i]!;
    if (!isMarketKind(rule.kind)) settle(i, evaluate(rule, i, inp, m.prices, moves));
  }
  const pending = m.rules.map((rule, i): Effect | null => {
    if (!isMarketKind(rule.kind)) return null;
    const others = moves.filter((_, j) => j !== i);
    const rose = others.filter((x) => x > 0).length;
    const fell = others.filter((x) => x < 0).length;
    if (rule.kind === 'marketMood') return rose >= rule.n1 ? rule.yes : fell >= rule.n1 ? rule.no : null;
    return fell > rose ? rule.yes : rose > fell ? rule.no : null;
  });
  return { prices, moves, pending };
}

// ---------------------------------------------------------------------------
// Drawing rules
// ---------------------------------------------------------------------------

export interface Rand {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

/** A small seeded RNG for the balance simulation (mulberry32), seeded from ctx.rng. */
export function seeded(seed: number): Rand {
  let s = seed >>> 0;
  const next = () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)]!,
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}

const up = (r: Rand): Effect =>
  r.next() < 0.5 ? { kind: 'pct', v: r.int(5, 18) } : { kind: 'abs', v: r.int(6, 20) * 100 };
const down = (r: Rand): Effect =>
  r.next() < 0.5 ? { kind: 'pct', v: -r.int(4, 12) } : { kind: 'abs', v: -r.int(4, 12) * 100 };

/** Draws the numbers for one template at company `i` (refs come from `refs`). */
function drawRule(kind: RuleKind, i: number, refs: number[], players: number, r: Rand): Rule {
  const rule: Rule = { kind, n1: 0, n2: 0, ref: -1, yes: up(r), no: down(r) };
  const ref = () => r.pick(refs.filter((j) => j !== i));
  switch (kind) {
    case 'heldRange': {
      const lo = Math.max(1, Math.round(players * (0.5 + r.next() * 1.5)));
      rule.n1 = lo;
      rule.n2 = lo + Math.max(3, Math.round(players * (1 + r.next() * 2)));
      break;
    }
    case 'heldDelta':
      rule.n1 = r.int(1, 4) * 100;
      break;
    case 'holders':
      rule.n1 = Math.max(2, Math.round(players * (0.3 + r.next() * 0.3)));
      break;
    case 'noBuys':
      rule.yes = down(r);
      rule.no = up(r);
      break;
    case 'underSecret':
      rule.yes = down(r);
      rule.no = { kind: 'abs', v: r.int(3, 8) * 100 };
      break;
    case 'marketMood':
      rule.n1 = r.int(4, 5);
      break;
    case 'cycle':
      rule.n1 = r.int(2, 4);
      rule.n2 = r.int(0, rule.n1);
      rule.yes = { kind: 'pct', v: r.int(20, 45) };
      break;
    case 'everyM':
      rule.n1 = r.int(3, 4);
      rule.yes = { kind: 'pct', v: r.int(20, 40) };
      break;
    case 'lateBloom':
      rule.n1 = r.int(8, 15);
      rule.yes = up(r);
      rule.no = down(r);
      break;
    case 'reversion':
      rule.n1 = r.int(7, 14) * 1000;
      break;
    case 'buysVs':
    case 'followB':
    case 'inverseB':
    case 'cheaperB':
    case 'secretOnB':
      rule.ref = ref();
      break;
  }
  if (kind === 'secretOnB') rule.yes = { kind: 'pct', v: r.int(10, 25) };
  return rule;
}

/** Draws 7 distinct templates with a healthy mix (player-driven, pattern, cross, market). */
function drawSet(count: number, players: number, r: Rand): Rule[] {
  for (;;) {
    const kinds = r.shuffle(ALL_KINDS).slice(0, count);
    const nPlayer = kinds.filter((k) => PLAYER_KINDS.includes(k)).length;
    const nPattern = kinds.filter((k) => PATTERN_KINDS.includes(k)).length;
    const nMarket = kinds.filter((k) => MARKET_KINDS.includes(k)).length;
    if (nPlayer < 2 || nPlayer > 4 || nPattern < 1 || nPattern > 3 || nMarket > 1) continue;
    // A company that reads another's move in the same close must come after it (or after a market one).
    const order = r.shuffle(kinds);
    const ok = order.every((k, i) => !SAME_CLOSE_REF.includes(k) || i > 0);
    if (!ok) continue;
    return order.map((k, i) => {
      const refs = SAME_CLOSE_REF.includes(k)
        ? order.map((_, j) => j).filter((j) => j < i || isMarketKind(order[j]!))
        : order.map((_, j) => j);
      return drawRule(k, i, refs, players, r);
    });
  }
}

// ---------------------------------------------------------------------------
// Balance simulation
// ---------------------------------------------------------------------------

interface SimReport {
  /** Rounds where every company moved the same way (all up or all down). */
  sameWay: number;
  final: number[];
  max: number;
}

/** Plays 24 closes with either nobody trading or random bots, and reports how the market moved. */
export function simulate(rules: Rule[], players: number, bots: boolean, r: Rand): SimReport {
  const n = rules.length;
  const core: MarketCore = { rules, prices: new Array(n).fill(START_PRICE), pending: new Array(n).fill(null) };
  const cash = new Array<number>(players).fill(START_CASH);
  const hold = Array.from({ length: players }, () => new Array<number>(n).fill(0));
  const secretUsed = new Array<boolean>(players).fill(false);
  const secretUntil = new Array<number>(n).fill(0);
  let heldPrev = new Array<number>(n).fill(0);
  let sameWay = 0;
  let max = START_PRICE;
  for (let round = 1; round <= ROUNDS; round++) {
    const buys = new Array<number>(n).fill(0);
    const sells = new Array<number>(n).fill(0);
    const secretPlaced = new Array<boolean>(n).fill(false);
    if (bots) {
      for (let p = 0; p < players; p++) {
        if (r.next() < 0.5) {
          const c = r.int(0, n - 1);
          const q = Math.floor((cash[p]! * (0.2 + r.next() * 0.6)) / core.prices[c]!);
          cash[p]! -= q * core.prices[c]!;
          hold[p]![c]! += q;
          buys[c]! += q;
        }
        if (r.next() < 0.4) {
          const c = r.int(0, n - 1);
          const q = hold[p]![c]!;
          cash[p]! += q * core.prices[c]!;
          hold[p]![c] = 0;
          sells[c]! += q;
        }
        if (!secretUsed[p] && r.next() < 0.06) {
          secretUsed[p] = true;
          secretPlaced[r.int(0, n - 1)] = true;
        }
      }
    }
    const worth = cash.map((c, p) => c + hold[p]!.reduce((s, q, j) => s + q * core.prices[j]!, 0));
    const best = Math.max(...worth);
    const leaders = worth.map((w, p) => (w === best ? p : -1)).filter((p) => p >= 0);
    const held = core.prices.map((_, j) => hold.reduce((s, h) => s + h[j]!, 0));
    const inp: RoundInput = {
      round,
      players,
      buys,
      sells,
      held,
      heldPrev,
      holders: core.prices.map((_, j) => hold.filter((h) => h[j]! > 0).length),
      leaderHolds: core.prices.map((_, j) => leaders.some((p) => hold[p]![j]! > 0)),
      secretPlaced,
      underSecret: secretUntil.map((u) => u >= round),
    };
    secretPlaced.forEach((s, j) => {
      if (s) secretUntil[j] = Math.max(secretUntil[j]!, round + 2);
    });
    const res = closeMarket(core, inp, 0, r.next);
    if (res.moves.every((x) => x > 0) || res.moves.every((x) => x < 0)) sameWay++;
    core.prices = res.prices;
    core.pending = res.pending;
    heldPrev = held;
    max = Math.max(max, ...res.prices);
  }
  return { sameWay, final: core.prices, max };
}

/** Is this set of rules a fair market: no runaway, never a one-way market, winners and losers? */
export function balanced(rules: Rule[], players: number, seed: number): boolean {
  for (let k = 0; k < 4; k++) {
    const rep = simulate(rules, players, k > 0, seeded(seed + k * 7919));
    if (rep.sameWay > 1 || rep.max > 4_000_000) return false;
    const risers = rep.final.filter((p) => p > START_PRICE).length;
    const fallers = rep.final.filter((p) => p < START_PRICE).length;
    if (risers < 2 || fallers < 2) return false;
  }
  return true;
}

/** Draws a balanced set of rules, retrying until the simulation is happy. */
export function drawRules(count: number, players: number, r: Rand): Rule[] {
  let last: Rule[] = [];
  for (let attempt = 0; attempt < 200; attempt++) {
    last = drawSet(count, players, r);
    if (balanced(last, players, r.int(1, 1_000_000))) return last;
  }
  return last;
}

// ---------------------------------------------------------------------------
// Rule text, as revealable pieces
// ---------------------------------------------------------------------------

const fmt = (e: Effect, lang: 'pt-BR' | 'en') =>
  e.kind === 'pct' ? `${e.v > 0 ? '+' : '−'}${Math.abs(e.v)}%` : `${e.v > 0 ? '+' : ''}${money(e.v, lang)}`;

/** The rule as 4 pieces of one sentence, in both languages. `names` are the companies' names. */
export function rulePieces(rule: Rule, names: I18nText[]): I18nText[] {
  const t = (f: (lang: 'pt-BR' | 'en') => string): I18nText => ({ 'pt-BR': f('pt-BR'), en: f('en') });
  const yes = t((l) => fmt(rule.yes, l));
  const no = (pre: [string, string]) => t((l) => `${l === 'en' ? pre[1] : pre[0]} ${fmt(rule.no, l)}`);
  const otherwise = no(['senão', 'otherwise']);
  const B = rule.ref >= 0 ? names[rule.ref]! : { 'pt-BR': '', en: '' };
  const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });
  switch (rule.kind) {
    case 'heldRange':
      return [tx('Se o total em carteira', 'If total shares held'), tx(`ficar entre ${rule.n1} e ${rule.n2} ações:`, `is between ${rule.n1} and ${rule.n2}:`), yes, otherwise];
    case 'heldDelta': {
      const k = (l: 'pt-BR' | 'en') => money(rule.n1, l);
      return [
        tx('A cada ação a mais no total em carteira:', 'For each share added to total held:'),
        t((l) => `−${k(l).replace('−', '')} ${l === 'en' ? 'per share' : 'por ação'};`),
        tx('a cada ação a menos:', 'for each share removed:'),
        t((l) => `+${k(l)} ${l === 'en' ? 'per share' : 'por ação'}`),
      ];
    }
    case 'buysVs':
      return [tx('Se as compras desta ação', 'If this stock’s buys'), t((l) => (l === 'en' ? `beat ${B.en}’s buys:` : `superarem as de ${B['pt-BR']}:`)), yes, otherwise];
    case 'sellsVsBuys':
      return [tx('Se as vendas', 'If sells'), tx('superarem as compras:', 'beat buys:'), yes, otherwise];
    case 'noBuys':
      return [tx('Se ninguém', 'If nobody'), tx('comprar esta ação na rodada:', 'buys this stock in the round:'), yes, otherwise];
    case 'holders':
      return [tx(`Se ${rule.n1} ou mais jogadores`, `If ${rule.n1} or more players`), tx('tiverem esta ação:', 'hold this stock:'), yes, otherwise];
    case 'demand':
      return [tx('Se o total em carteira', 'If total shares held'), tx('aumentar na rodada:', 'goes up in the round:'), yes, otherwise];
    case 'leader':
      return [tx('Se o 1º do ranking', 'If the ranking leader'), tx('tiver esta ação:', 'holds this stock:'), yes, otherwise];
    case 'marketMood':
      return [
        tx(`Se ${rule.n1}+ das outras ações subirem:`, `If ${rule.n1}+ other stocks rise:`),
        t((l) => `${fmt(rule.yes, l)} ${l === 'en' ? 'next round;' : 'na rodada seguinte;'}`),
        tx(`se ${rule.n1}+ caírem:`, `if ${rule.n1}+ fall:`),
        t((l) => `${fmt(rule.no, l)} ${l === 'en' ? 'next round (else steady)' : 'na seguinte (senão estável)'}`),
      ];
    case 'contrarian':
      return [
        tx('Se mais ações caírem do que subirem:', 'If more stocks fall than rise:'),
        t((l) => `${fmt(rule.yes, l)} ${l === 'en' ? 'next round;' : 'na rodada seguinte;'}`),
        tx('se mais subirem:', 'if more rise:'),
        t((l) => `${fmt(rule.no, l)} ${l === 'en' ? 'next round (tie: steady)' : 'na seguinte (empate: estável)'}`),
      ];
    case 'followB':
      return [t((l) => (l === 'en' ? `If ${B.en}` : `Se ${B['pt-BR']}`)), tx('subir nesta rodada:', 'rises this round:'), yes, otherwise];
    case 'inverseB':
      return [t((l) => (l === 'en' ? `If ${B.en}` : `Se ${B['pt-BR']}`)), tx('cair nesta rodada:', 'falls this round:'), yes, otherwise];
    case 'cheaperB':
      return [tx('Se a cotação estiver', 'If its price is'), t((l) => (l === 'en' ? `below ${B.en}’s:` : `abaixo da de ${B['pt-BR']}:`)), yes, otherwise];
    case 'cycle':
      return [
        tx(`Cai por ${rule.n1} rodadas`, `Falls for ${rule.n1} rounds`),
        no(['a cada queda,', 'each time,']),
        tx('depois sobe uma rodada', 'then rises for one round'),
        t((l) => `${fmt(rule.yes, l)} ${l === 'en' ? '— and repeats' : '— e repete'}`),
      ];
    case 'parity':
      return [tx('Nas rodadas ímpares:', 'In odd rounds:'), yes, tx('nas rodadas pares:', 'in even rounds:'), t((l) => fmt(rule.no, l))];
    case 'everyM':
      return [tx(`A cada ${rule.n1} rodadas`, `Every ${rule.n1} rounds`), yes, tx('nas outras rodadas:', 'in the other rounds:'), t((l) => fmt(rule.no, l))];
    case 'lateBloom':
      return [tx(`Até a rodada ${rule.n1 - 1}:`, `Up to round ${rule.n1 - 1}:`), t((l) => fmt(rule.no, l)), tx(`a partir da rodada ${rule.n1}:`, `from round ${rule.n1} on:`), yes];
    case 'reversion':
      return [t((l) => (l === 'en' ? `Below ${money(rule.n1, l)}:` : `Abaixo de ${money(rule.n1, l)}:`)), yes, t((l) => (l === 'en' ? `at ${money(rule.n1, l)} or more:` : `de ${money(rule.n1, l)} para cima:`)), t((l) => fmt(rule.no, l))];
    case 'secretOnB':
      return [tx('Se alguém ativar um Segredo', 'If someone activates a Secret'), t((l) => (l === 'en' ? `on ${B.en} this round:` : `em ${B['pt-BR']} nesta rodada:`)), yes, otherwise];
    case 'underSecret':
      return [tx('Enquanto estiver', 'While it is'), tx('sob Segredo:', 'under a Secret:'), yes, otherwise];
  }
}
