import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type Card, type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;
const other = (id: string) => (id === 'p1' ? 'p2' : 'p1');

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** The first seed whose round-1 deal satisfies `deal`, given the starter's card and the rival's. */
function dealt(deal: (a: Card, b: Card) => boolean, opts: TestRoomOptions = {}): Room {
  for (let seed = 1; seed < 5000; seed++) {
    const room = playing({ ...opts, seed });
    const s = room.state();
    if (deal(s.cards[s.starter]!, s.cards[other(s.starter)]!)) return room;
  }
  throw new Error('no seed found');
}

/** Starter checks on the front, the rival calls on the front: the quickest showdown. */
function quickRound(room: Room) {
  const a = pub(room).turn!;
  room.act(a, { type: 'call', side: 'front' });
  room.act(other(a), { type: 'call', side: 'front' });
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays every round to the final results', () => {
    const room = playing({ config: { rounds: 3 } });
    let rounds = 0;
    while (room.phase() === 'playing' && rounds < 40) {
      expect(pub(room).phase).toBe('bet');
      const a = pub(room).turn!;
      room.act(a, { type: 'raise', by: 1, side: 'back' });
      room.act(other(a), { type: 'call', side: 'front' });
      expect(pub(room).phase).toBe('reveal');
      room.advance(8_000);
      rounds++;
    }
    expect(rounds).toBeGreaterThanOrEqual(3);
    expect(room.phase()).toBe('results');
    expect(room.results()!.map((r) => r.score).sort()).toEqual([0, 1]);
  });

  it('shows the backs only to their owners until the reveal', () => {
    const room = playing();
    const s = room.state();
    for (const id of ['p1', 'p2']) {
      const view = phone(room, id);
      expect(view.myCard).toEqual(s.cards[id]);
      expect(view.rivalFront).toBe(s.cards[other(id)]!.front);
      const { myCard: _mine, ...rest } = view;
      expect(JSON.stringify(rest)).not.toContain('"back":');
    }
    expect(pub(room).fronts).toEqual({ p1: s.cards.p1!.front, p2: s.cards.p2!.front });
    expect(room.publicJson()).not.toContain('"back":');
    expect(room.publicJson()).not.toContain('"cards"');
    expect(room.publicJson()).not.toContain('"shoe"');

    // The side picked is public at once.
    const a = pub(room).turn!;
    room.act(a, { type: 'call', side: 'back' });
    expect(pub(room).sides[a]).toBe('back');
    expect(phone(room, other(a)).sides[a]).toBe('back');
    expect(room.publicJson()).not.toContain('"back":');

    room.act(other(a), { type: 'fold' });
    expect(pub(room).reveal!.cards).toEqual(s.cards);
  });

  it('runs on timers when nobody acts: a turn timeout folds', () => {
    const room = playing({ config: { rounds: 3, turnSeconds: 15 } });
    const a = pub(room).turn!;
    room.advance(15_000);
    expect(pub(room).reveal).toMatchObject({ kind: 'fold', folderId: a, winnerId: other(a) });
    expect(pub(room).log.at(-1)).toMatchObject({ kind: 'fold', auto: true });
    for (let i = 0; i < 80 && room.phase() === 'playing'; i++) room.advance(15_000);
    expect(room.phase()).toBe('results');
  });

  it('lets the starter check, and ends the betting when the rival calls', () => {
    const room = playing({ config: { turnSeconds: 60 } });
    const a = pub(room).turn!;
    expect(phone(room, a).checks).toBe(true);
    room.act(a, { type: 'call', side: 'front' });
    expect(pub(room)).toMatchObject({ phase: 'bet', turn: other(a) });
    expect(pub(room).log.at(-1)).toMatchObject({ kind: 'check', side: 'front', level: 1 });
    expect(phone(room, other(a)).checks).toBe(false);
    room.act(other(a), { type: 'call', side: 'back' });
    expect(pub(room).phase).toBe('reveal');
  });

  it('ignores invalid actions', () => {
    const room = playing({ config: { chips: 20 } });
    const a = pub(room).turn!;
    const b = other(a);
    const before = room.snapshot();
    room.act(b, { type: 'call', side: 'front' });
    room.act(b, { type: 'fold' });
    room.act(a, { type: 'call' }); // first move needs a side
    room.act(a, { type: 'call', side: 'sideways' });
    room.act(a, { type: 'raise', by: 1 });
    room.act(a, { type: 'raise', by: 0, side: 'front' });
    room.act(a, { type: 'raise', by: 1.5, side: 'front' });
    room.act(a, { type: 'raise', by: 20, side: 'front' });
    room.act(a, { type: 'raise', by: 10, side: 'both' }); // 2 × 11 > 20 chips
    room.act(a, { type: 'nonsense' });
    room.act(a, { type: 'intro', dir: 1 });
    room.act(a, null);
    expect(room.snapshot()).toBe(before);

    room.act(a, { type: 'raise', by: 2, side: 'front' });
    room.act(b, { type: 'raise', by: 1, side: 'back' });
    const locked = room.snapshot();
    room.act(a, { type: 'call', side: 'back' }); // the side is locked
    room.act(a, { type: 'raise', by: 1, side: 'front' });
    expect(room.snapshot()).toBe(locked);

    room.act(a, { type: 'call' });
    const revealed = room.snapshot();
    room.act('p1', { type: 'call' });
    room.act('p2', { type: 'fold' });
    expect(room.snapshot()).toBe(revealed);
  });

  it('gives the win to the player who stays when the other drops', () => {
    const room = playing();
    room.disconnect('p2');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(room.phase()).toBe('results');
    expect(room.results()![0]).toEqual({ playerId: 'p1', score: 1 });
  });

  it('compares the chosen sides after a raise and a call', () => {
    const room = dealt((a, b) => a.front > b.back, { config: { chips: 20 } });
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'raise', by: 4, side: 'front' }); // a bets 5
    expect(pub(room)).toMatchObject({ turn: b, bets: { [a]: 5, [b]: 1 }, chips: { [a]: 15, [b]: 19 } });
    expect(phone(room, b).moves).toEqual([
      { side: 'front', call: 4, maxRaise: 15 },
      { side: 'back', call: 4, maxRaise: 15 },
      { side: 'both', call: 9, maxRaise: 5 },
    ]);
    room.act(b, { type: 'call', side: 'back' });
    expect(pub(room).reveal).toMatchObject({ kind: 'showdown', winnerId: a, pot: 10, bonus: 0 });
    expect(pub(room).chips).toEqual({ [a]: 25, [b]: 15 });
  });

  it('pays the pot plus 10 to a both-sides win', () => {
    const room = dealt((a, b) => a.front > b.front && a.back > b.front, { config: { chips: 20 } });
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'call', side: 'both' });
    expect(pub(room)).toMatchObject({ bets: { [a]: 2, [b]: 1 }, chips: { [a]: 18 } });
    room.act(b, { type: 'call', side: 'front' });
    expect(pub(room).reveal).toMatchObject({ winnerId: a, pot: 3, bonus: 10 });
    expect(pub(room).chips).toEqual({ [a]: 31, [b]: 9 });
  });

  it('loses a both-sides bet when one side only ties', () => {
    const room = dealt((a, b) => a.front > b.front && a.back === b.front, { config: { chips: 20 } });
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'call', side: 'both' });
    room.act(b, { type: 'call', side: 'front' });
    expect(pub(room).reveal).toMatchObject({ winnerId: b, pot: 3, bonus: 0 });
    expect(pub(room).chips).toEqual({ [a]: 18, [b]: 22 });
  });

  it('pays the both-sides bonus when the rival folds, capped at their chips', () => {
    const room = playing({ config: { chips: 5 } });
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'call', side: 'both' });
    room.act(b, { type: 'fold' });
    expect(pub(room).reveal).toMatchObject({ kind: 'fold', winnerId: a, pot: 3, bonus: 4 });
    expect(pub(room).chips).toEqual({ [a]: 10, [b]: 0 });
    room.advance(8_000);
    expect(room.phase()).toBe('results');
    expect(room.results()![0]).toEqual({ playerId: a, score: 1 });
  });

  it('allows only one player per round on both sides', () => {
    const room = playing({ config: { chips: 20 } });
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'call', side: 'both' });
    expect(phone(room, b).moves.map((m) => m.side)).toEqual(['front', 'back']);
    const before = room.snapshot();
    room.act(b, { type: 'call', side: 'both' });
    expect(room.snapshot()).toBe(before);
  });

  it('offers both sides only to a player who can cover double', () => {
    const room = playing({ config: { chips: 5 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'raise', by: 4, side: 'front' });
    expect(phone(room, other(a)).moves).toEqual([
      { side: 'front', call: 4, maxRaise: 0 },
      { side: 'back', call: 4, maxRaise: 0 },
    ]);
  });

  it('caps a raise at what a both-sides rival can cover', () => {
    const room = playing({ config: { chips: 20 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'call', side: 'both' }); // a: 18 left, 2 in
    expect(phone(room, other(a)).moves[0]).toEqual({ side: 'front', call: 0, maxRaise: 9 });
    room.act(other(a), { type: 'raise', by: 9, side: 'front' });
    expect(phone(room, a).moves).toEqual([{ side: 'both', call: 18, maxRaise: 0 }]);
    room.act(a, { type: 'call' });
    expect(pub(room).reveal).toMatchObject({ pot: 30 });
  });

  it('carries the pot over on equal sides, to the next round winner', () => {
    const room = dealt((a, b) => a.front === b.front, { config: { chips: 20 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'raise', by: 2, side: 'front' });
    room.act(other(a), { type: 'call', side: 'front' });
    expect(pub(room).reveal).toMatchObject({ winnerId: null, pot: 6, refunded: false });
    expect(pub(room)).toMatchObject({ carry: 6, chips: { p1: 17, p2: 17 } });
    room.advance(8_000);
    expect(pub(room)).toMatchObject({ round: 2, carry: 6, sides: { p1: null, p2: null } });
    expect(pub(room).turn).toBe(other(a)); // the starter alternates
    const s = room.state();
    quickRound(room);
    if (s.cards.p1!.front !== s.cards.p2!.front) {
      const winner = s.cards.p1!.front > s.cards.p2!.front ? 'p1' : 'p2';
      expect(pub(room).reveal!.pot).toBe(8);
      expect(pub(room).chips[winner]).toBe(16 + 8);
      expect(pub(room).carry).toBe(0);
    }
  });

  it('splits the carried pot back when a tie leaves someone with no chips', () => {
    const room = dealt((a, b) => a.front === b.front, { config: { chips: 5 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'raise', by: 4, side: 'front' });
    room.act(other(a), { type: 'call', side: 'front' });
    expect(pub(room).reveal).toMatchObject({ winnerId: null, pot: 10, refunded: true });
    expect(pub(room)).toMatchObject({ carry: 0, chips: { p1: 5, p2: 5 } });
    room.advance(8_000);
    expect(room.phase()).toBe('playing');
  });

  it('deals from a 200-card shoe of two different numbers per card', () => {
    const room = playing();
    const s = room.state();
    const all = [...s.shoe, s.cards.p1!, s.cards.p2!];
    expect(all).toHaveLength(200);
    expect(pub(room)).toMatchObject({ shoeLeft: 198, reshuffled: false });
    const pairs = new Map<string, number>();
    for (const c of all) {
      expect(c.front).not.toBe(c.back);
      expect(Math.min(c.front, c.back)).toBeGreaterThanOrEqual(1);
      expect(Math.max(c.front, c.back)).toBeLessThanOrEqual(10);
      const key = `${Math.min(c.front, c.back)}-${Math.max(c.front, c.back)}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
    expect(pairs.size).toBe(45);
    for (const n of pairs.values()) expect(n).toBeGreaterThanOrEqual(4);
    quickRound(room);
    room.advance(8_000);
    expect(pub(room).shoeLeft).toBe(196);
  });

  it('plays sudden death when the chips are equal after the last round', () => {
    for (let seed = 1; seed < 500; seed++) {
      const room = playing({ seed, config: { rounds: 4 } });
      for (let r = 0; r < 4; r++) {
        quickRound(room);
        room.advance(8_000);
      }
      if (room.phase() !== 'playing') continue;
      expect(pub(room)).toMatchObject({ round: 5, suddenDeath: true });
      const s = room.state();
      expect(s.chips.p1 === s.chips.p2 || s.carry > 0).toBe(true);
      return;
    }
    throw new Error('no seed found');
  });

  it('ends after the last round with the most chips winning', () => {
    for (let seed = 1; seed < 200; seed++) {
      const room = playing({ seed, config: { rounds: 3 } });
      for (let r = 0; r < 3; r++) {
        quickRound(room);
        room.advance(8_000);
      }
      if (room.phase() !== 'results') continue;
      const chips = room.state().chips;
      const leader = chips.p1! > chips.p2! ? 'p1' : 'p2';
      expect(room.results()![0]).toEqual({ playerId: leader, score: 1 });
      return;
    }
    throw new Error('no seed found');
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, {});
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length, fronts: null });
    expect(phone(room, 'p1').myCard).toBeNull();
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'bet', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, {});
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('bet');
  });

  it('gives the win to the other player if the Host leaves during the tutorial', () => {
    const room = createTestRoom<State>(game, {});
    room.disconnect('p1');
    room.advance(20_001);
    expect(room.phase()).toBe('results');
    expect(room.results()![0]).toEqual({ playerId: 'p2', score: 1 });
  });

  it('starts on its own if the tutorial is never finished', () => {
    const room = createTestRoom<State>(game, {});
    room.advance(5 * 60_000);
    expect(pub(room).phase).toBe('bet');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, {});
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
