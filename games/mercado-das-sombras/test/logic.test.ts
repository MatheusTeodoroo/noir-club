import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { RULES, SLIDES } from '../src/texts.ts';
import {
  ALL_KINDS,
  applyEffect,
  balanced,
  closeMarket,
  drawRules,
  rulePieces,
  seeded,
  type Rule,
  type RoundInput,
} from '../src/rules.ts';
import { ROUNDS, START_CASH, bandPoints, money, revealedWords } from '../src/shared.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;
const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** A room past the tutorial, with 60 s rounds. */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, roundSeconds: '60', ...opts.config } });

/** Runs the current phase's timer out (timers start with the phase and nothing else moves the clock). */
const step = (room: Room) => room.advance(pub(room).total!);
/** From trading in round r to trading in round r+1. */
const nextRound = (room: Room) => {
  step(room);
  step(room);
};

describe('match flow', () => {
  it('plays 24 rounds to the results at 3 players, with trades', () => {
    const room = playing({ players: 3 });
    for (let r = 1; r <= ROUNDS; r++) {
      expect(pub(room)).toMatchObject({ phase: 'trading', round: r });
      room.act('p1', { type: 'trade', company: r % 7, qty: 2 });
      room.act('p2', { type: 'trade', company: (r + 3) % 7, qty: -1 });
      step(room);
      if (r < ROUNDS) {
        expect(pub(room).phase).toBe('closing');
        step(room);
      }
    }
    expect(pub(room).phase).toBe('final');
    step(room);
    expect(room.phase()).toBe('results');
  });

  it('plays to the results at 16 players and the TV ranking lists all of them', () => {
    const room = playing({ players: 16 });
    expect(pub(room).ranking).toHaveLength(16);
    for (let r = 1; r < ROUNDS; r++) nextRound(room);
    step(room);
    step(room);
    expect(room.phase()).toBe('results');
    expect(room.results()).toHaveLength(16);
  });

  it('timers drive every phase with nobody acting, and a round never ends early', () => {
    const room = playing({ players: 3 });
    room.advance(59_000);
    expect(pub(room).phase).toBe('trading');
    room.advance(1_000);
    expect(pub(room).phase).toBe('closing');
    room.advance(8_000);
    expect(pub(room)).toMatchObject({ phase: 'trading', round: 2 });
  });

  it('round length follows the Host setting (5 minutes by default)', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    expect(pub(room).total).toBe(300_000);
  });

  it('reveals words: one clue at the start, 25/50/75% at rounds 5/10/15, all at 20', () => {
    const room = playing({ players: 3 });
    const n = room.state().companies[0]!.words['pt-BR'].length;
    const shown = () => pub(room).companies[0]!.rule['pt-BR'].filter((t) => 'w' in t).length;
    expect(shown()).toBe(1);
    for (let r = 1; r < 4; r++) nextRound(room);
    step(room); // closing of round 4 shows round 5's words
    expect(pub(room).milestone).toBe(true);
    expect(pub(room).total).toBe(14_000);
    expect(shown()).toBe(revealedWords(5, n));
    expect(pub(room).companies[0]!.rule['pt-BR'].some((t) => 'w' in t && t.fresh)).toBe(true);
    step(room);
    for (let r = 5; r < 10; r++) nextRound(room);
    expect(shown()).toBe(revealedWords(10, n));
    for (let r = 10; r < 20; r++) nextRound(room);
    expect(shown()).toBe(n);
  });
});

describe('trading', () => {
  it('buys and sells at the current price, capped by cash and shares', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'trade', company: 0, qty: 3 });
    expect(pv(room, 'p1')).toMatchObject({ cash: START_CASH - 30_000 });
    expect(pv(room, 'p1').holdings[0]).toBe(3);
    room.act('p1', { type: 'trade', company: 1, qty: 50 }); // only 7 affordable
    expect(pv(room, 'p1').holdings[1]).toBe(7);
    expect(pv(room, 'p1').cash).toBe(0);
    room.act('p1', { type: 'trade', company: 0, qty: -10 }); // sells the 3 it has
    expect(pv(room, 'p1').holdings[0]).toBe(0);
    expect(pv(room, 'p1').cash).toBe(30_000);
    expect(pv(room, 'p1').worth).toBe(START_CASH); // trading at the current price never changes worth
  });

  it('shows volumes and total held only after the close', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'trade', company: 2, qty: 4 });
    room.act('p2', { type: 'trade', company: 2, qty: 1 });
    room.act('p2', { type: 'trade', company: 2, qty: -1 });
    expect(pub(room).companies[2]).toMatchObject({ buys: null, sells: null, held: null });
    step(room);
    expect(pub(room).companies[2]).toMatchObject({ buys: 5, sells: 1, held: 4 });
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 3 });
    const before = room.snapshot();
    for (const a of [
      null,
      'trade',
      { type: 'nonsense' },
      { type: 'trade', company: 0, qty: 0 },
      { type: 'trade', company: 0, qty: 2.5 },
      { type: 'trade', company: 7, qty: 1 },
      { type: 'trade', company: -1, qty: 1 },
      { type: 'trade', company: 0, qty: 100_000 },
      { type: 'trade', company: 0, qty: -1 }, // has no shares
      { type: 'secret', company: 9 },
      { type: 'secret', company: 1.5 },
      { type: 'intro', dir: 1 },
    ]) {
      room.act('p2', a);
    }
    expect(room.snapshot()).toBe(before);
    step(room);
    const closing = room.snapshot();
    room.act('p1', { type: 'trade', company: 0, qty: 1 });
    room.act('p1', { type: 'secret', company: 0 });
    expect(room.snapshot()).toBe(closing);
  });
});

describe('secrets and hidden information', () => {
  it('keeps hidden rule pieces, cash, holdings and Secret requests out of every other device', () => {
    const room = playing({ players: 3, seed: 3 });
    room.act('p2', { type: 'trade', company: 4, qty: 3 });
    room.act('p2', { type: 'secret', company: 5 });
    const state = room.state();
    const json = room.publicJson();
    for (const view of [pub(room), pv(room, 'p1'), pv(room, 'p2')]) {
      state.companies.forEach((c, j) => {
        for (const lang of ['pt-BR', 'en'] as const) {
          const toks = view.companies[j]!.rule[lang];
          const shown = toks.flatMap((t) => ('w' in t ? [t.w] : []));
          expect(shown).toEqual([c.words[lang][c.order[lang][0]!]]);
          for (const t of toks) if (!('w' in t)) expect(Object.keys(t)).toEqual(['hidden']);
        }
      });
    }
    expect(json).not.toContain('"order"');
    expect(json).not.toContain('"kind"');
    expect(json).not.toContain('secretReq');
    expect(json).not.toContain('"cash"');
    expect(pv(room, 'p1').secretReq).toBeNull();
    expect(pv(room, 'p1').holdings[4]).toBe(0);
    expect(pv(room, 'p2')).toMatchObject({ secretReq: 5, cash: START_CASH - 30_000 });
    expect(pv(room, 'p2').holdings[4]).toBe(3);
  });

  it('a Secret hides a company from everyone, the activator included, for the next 2 rounds', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'secret', company: 3 });
    expect(pub(room).companies[3]!.hidden).toBe(false);
    step(room); // closing of round 1 already hides the close
    const check = (hidden: boolean) => {
      for (const view of [pub(room), pv(room, 'p1'), pv(room, 'p2')]) {
        const c = view.companies[3]!;
        expect(c.hidden).toBe(hidden);
        if (hidden) {
          expect(c).toMatchObject({ price: null, change: null, buys: null, sells: null, held: null });
          expect(view.ranking.every((r) => r.worth === null)).toBe(true);
        }
      }
    };
    check(true);
    expect(pub(room).companies[3]!.history).toEqual([10_000, null]);
    expect(pub(room).companies[0]!.hidden).toBe(false);
    step(room); // round 2
    check(true);
    nextRound(room); // round 3
    check(true);
    expect(pub(room).companies[3]!.history.slice(1)).toEqual([null, null]);
    step(room); // closing of round 3 shows round 4: visible again, gaps filled
    check(false);
    expect(pub(room).companies[3]!.history.every((p) => p !== null)).toBe(true);
    expect(pub(room).ranking.every((r) => r.worth !== null)).toBe(true);
    expect(pv(room, 'p1').secretUsed).toBe(true);
  });

  it('simultaneous Secrets on one company take effect once and are all spent', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'secret', company: 2 });
    room.act('p2', { type: 'secret', company: 2 });
    room.act('p3', { type: 'secret', company: 6 });
    room.act('p3', { type: 'secret', company: null }); // changed their mind
    step(room);
    expect(room.state().secrets).toEqual([{ company: 2, round: 1 }]);
    expect(pv(room, 'p1').secretUsed && pv(room, 'p2').secretUsed).toBe(true);
    expect(pv(room, 'p3').secretUsed).toBe(false);
    step(room);
    const before = room.snapshot();
    room.act('p1', { type: 'secret', company: 4 }); // already spent
    expect(room.snapshot()).toBe(before);
  });

  it('a blind trade hides the trader’s own cash until the Secret ends', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'secret', company: 1 });
    nextRound(room); // round 2: company 1 hidden
    room.act('p2', { type: 'trade', company: 1, qty: 2 });
    expect(pv(room, 'p2')).toMatchObject({ cash: null, blind: true });
    expect(pv(room, 'p2').holdings[1]).toBe(2);
    expect(pv(room, 'p3').cash).toBe(START_CASH);
    nextRound(room); // round 3: still hidden
    expect(pv(room, 'p2').cash).toBeNull();
    step(room); // closing shows round 4
    expect(pv(room, 'p2').cash).not.toBeNull();
    expect(pv(room, 'p2').blind).toBe(false);
  });

  it('a blind buy fills from the last visible price, so the fill never reveals the hidden one', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'secret', company: 1 });
    nextRound(room); // round 2: company 1 hidden; last visible price is the opening $10,000
    const hiddenPrice = room.state().companies[1]!.history.at(-1)!;
    room.act('p1', { type: 'trade', company: 1, qty: 9_999 });
    expect(pv(room, 'p1').holdings[1]).toBe(10);
    expect(room.state().cash.p1).toBe(START_CASH - 10 * hiddenPrice);
    expect(pv(room, 'p1').cash).toBeNull();
  });

  it('the first revealed word is a clue: never a connective, a number or a company name', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const room = playing({ players: 4, seed });
      const s = room.state();
      const names = s.companies.flatMap((c) => c.name['pt-BR'].toLowerCase().split(' ')).filter((w) => w.length > 2);
      for (const c of s.companies) {
        const first = c.words['pt-BR'][c.order['pt-BR'][0]!]!;
        expect(first).not.toMatch(/[\d$%]/);
        expect(['se', 'o', 'a', 'de', 'da', 'do', 'e', 'em', 'na', 'no', 'ou', 'por']).not.toContain(first.toLowerCase());
        expect(names).not.toContain(first.toLowerCase());
      }
    }
  });

  it('no Secret in the last round', () => {
    const room = playing({ players: 3 });
    for (let r = 1; r < ROUNDS; r++) nextRound(room);
    expect(pv(room, 'p1').canSecret).toBe(false);
    const before = room.snapshot();
    room.act('p1', { type: 'secret', company: 0 });
    expect(room.snapshot()).toBe(before);
  });
});

describe('Dealer hints board (Host option)', () => {
  it('is off by default: the Dealer shows nothing of the game and nobody can queue', () => {
    const room = playing({ players: 3 });
    expect(room.dealerView()).toBeNull();
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBeFalsy();
  });

  it('when on, shows every company’s public hints and nothing private', () => {
    const room = playing({ players: 3, config: { dealerHints: true } });
    room.act('p2', { type: 'trade', company: 0, qty: 4 });
    room.act('p2', { type: 'secret', company: 3 });
    const view = room.dealerView() as { companies: { rule: unknown }[] };
    expect(view.companies).toHaveLength(7);
    expect(view.companies.map((c) => c.rule)).toEqual(pub(room).companies.map((c) => c.rule));
    const json = JSON.stringify(view);
    for (const leak of ['cash', 'holdings', 'secretReq', 'price', 'order', 'words']) expect(json).not.toContain(`"${leak}"`);
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBeFalsy();
  });

  it('stays blank during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { dealerHints: true } });
    expect(room.dealerView()).toBeNull();
  });
});

describe('disconnects', () => {
  it('pauses, then goes on without the player, who keeps cash and shares', () => {
    const room = playing({ players: 3 });
    room.act('p3', { type: 'trade', company: 0, qty: 5 });
    room.disconnect('p3');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(room.publicPlatform().paused).toBeFalsy();
    step(room);
    expect(pub(room).phase).toBe('closing');
    expect(room.state().holdings.p3![0]).toBe(5);
  });
});

describe('scoring', () => {
  it('bands: $1.5M = 1, $3M = 2, $6M = 3', () => {
    expect(bandPoints(1_499_999)).toBe(0);
    expect(bandPoints(1_500_000)).toBe(1);
    expect(bandPoints(3_000_000)).toBe(2);
    expect(bandPoints(6_000_000)).toBe(3);
    expect(bandPoints(60_000_000)).toBe(3);
  });

  it('everyone tied at $100,000 shares 1st place: 1 point each', () => {
    const room = playing({ players: 3 });
    for (let r = 1; r < ROUNDS; r++) nextRound(room);
    step(room);
    expect(pub(room).ranking.map((r) => r.points)).toEqual([1, 1, 1]);
    expect(pub(room).ranking.map((r) => r.worth)).toEqual([START_CASH, START_CASH, START_CASH]);
    step(room);
    expect(room.results()?.map((r) => r.score)).toEqual([1, 1, 1]);
  });

  it('final points follow each player’s final worth, with +1 for the leader only', () => {
    const room = playing({ players: 3, seed: 11 });
    room.act('p1', { type: 'trade', company: 0, qty: 10 });
    room.act('p2', { type: 'trade', company: 1, qty: 10 });
    for (let r = 1; r < ROUNDS; r++) nextRound(room);
    step(room);
    const s = room.state();
    const worth = (id: string) =>
      s.cash[id]! + s.holdings[id]!.reduce((t, q, i) => t + q * s.companies[i]!.history.at(-1)!, 0);
    const worths = ['p1', 'p2', 'p3'].map(worth);
    const best = Math.max(...worths);
    const expected = worths.map((w) => bandPoints(w) + (w === best ? 1 : 0));
    expect(['p1', 'p2', 'p3'].map((id) => s.final![id]!.points)).toEqual(expected);
    step(room);
    const scores = Object.fromEntries((room.results() ?? []).map((r) => [r.playerId, r.score]));
    expect([scores.p1, scores.p2, scores.p3]).toEqual(expected);
  });
});

describe('hidden company rules', () => {
  const zeros = new Array(7).fill(0);
  const input = (over: Partial<RoundInput> = {}): RoundInput => ({
    round: 1,
    players: 4,
    buys: zeros,
    sells: zeros,
    held: zeros,
    heldPrev: zeros,
    holders: zeros,
    leaderHolds: new Array(7).fill(false),
    secretPlaced: new Array(7).fill(false),
    underSecret: new Array(7).fill(false),
    ...over,
  });
  const flat = (kind: Rule['kind'], over: Partial<Rule> = {}): Rule => ({
    kind,
    n1: 0,
    n2: 0,
    ref: -1,
    yes: { kind: 'pct', v: 10 },
    no: { kind: 'abs', v: -1000 },
    ...over,
  });
  const close = (rules: Rule[], inp: RoundInput, prices = rules.map(() => 10_000)) =>
    closeMarket({ rules, prices, pending: rules.map(() => null) }, inp, 0, () => 0.5);

  it('never goes below $100', () => {
    expect(applyEffect(150, { kind: 'abs', v: -1000 })).toBe(100);
    expect(applyEffect(10_000, { kind: 'pct', v: 13 })).toBe(11_300);
  });

  it('total held in a range', () => {
    const r = [flat('heldRange', { n1: 10, n2: 30 })];
    expect(close(r, input({ held: [10] })).prices).toEqual([11_000]);
    expect(close(r, input({ held: [31] })).prices).toEqual([9_000]);
  });

  it('per-share change in total held', () => {
    const r = [flat('heldDelta', { n1: 200 })];
    expect(close(r, input({ held: [5], heldPrev: [2] })).prices).toEqual([9_400]);
    expect(close(r, input({ held: [0], heldPrev: [2] })).prices).toEqual([10_400]);
  });

  it('follows another company’s move in the same close', () => {
    const rules = [flat('parity'), flat('followB', { ref: 0 })];
    expect(close(rules, input({ round: 1 })).prices).toEqual([11_000, 11_000]);
    expect(close(rules, input({ round: 2 })).prices).toEqual([9_000, 9_000]);
  });

  it('market mood is applied at the next close', () => {
    const rules = [flat('marketMood', { n1: 4 }), ...Array.from({ length: 6 }, () => flat('parity'))];
    const first = close(rules, input({ round: 1 }));
    expect(first.prices[0]).toBe(10_000);
    expect(first.pending[0]).toEqual({ kind: 'pct', v: 10 });
    const second = closeMarket({ rules, prices: first.prices, pending: first.pending }, input({ round: 2 }), 0, () => 0.5);
    expect(second.prices[0]).toBe(11_000);
  });

  it('a cycle falls n rounds then rises', () => {
    const r = [flat('cycle', { n1: 2, n2: 0 })];
    const moves = [1, 2, 3, 4, 5, 6].map((round) => close(r, input({ round })).moves[0]);
    expect(moves).toEqual([-1, -1, 1, -1, -1, 1]);
  });

  it('draws 7 distinct, balanced rules with valid references, for 3 to 16 players', () => {
    for (const players of [3, 9, 16]) {
      for (let seed = 1; seed <= 6; seed++) {
        const rules = drawRules(7, players, seeded(seed * 31 + players));
        expect(new Set(rules.map((r) => r.kind)).size).toBe(7);
        rules.forEach((r, i) => {
          expect(ALL_KINDS).toContain(r.kind);
          if (r.ref >= 0) expect(r.ref).not.toBe(i);
          if (r.kind === 'followB' || r.kind === 'inverseB') {
            expect(r.ref < i || ['marketMood', 'contrarian'].includes(rules[r.ref]!.kind)).toBe(true);
          }
        });
      }
    }
    // The simulation check itself rejects a one-way market.
    const allUp = Array.from({ length: 7 }, (_, i) =>
      ({ kind: 'lateBloom', n1: 1, n2: 0, ref: -1, yes: { kind: 'pct', v: 5 + i }, no: { kind: 'pct', v: -5 } }) as Rule,
    );
    expect(balanced(allUp, 5, 1)).toBe(false);
  });

  it('writes every template as 4 pieces in both languages', () => {
    const names = Array.from({ length: 7 }, (_, i) => ({ 'pt-BR': `Emp ${i}`, en: `Co ${i}` }));
    for (const kind of ALL_KINDS) {
      const pieces = rulePieces(flat(kind, { ref: 1, n1: 3, n2: 9 }), names);
      expect(pieces).toHaveLength(4);
      for (const p of pieces) {
        expect(p['pt-BR'].trim()).not.toBe('');
        expect(p.en.trim()).not.toBe('');
      }
    }
    expect(money(1500, 'pt-BR')).toBe('$1.500');
    expect(money(-1500, 'en')).toBe('−$1,500');
    expect([1, 4, 5, 9, 10, 14, 15, 19, 20, 25].map((r) => revealedWords(r, 20))).toEqual([1, 1, 5, 5, 10, 10, 15, 15, 20, 20]);
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'trading', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('trading');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('trading');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('has the tutorial and every rules page in both languages', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
  });
});
