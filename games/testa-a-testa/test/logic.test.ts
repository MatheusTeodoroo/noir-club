import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;
const other = (id: string) => (id === 'p1' ? 'p2' : 'p1');

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** The first seed whose round-1 deal satisfies `deal` (cards and starter come from the seed). */
function dealt(deal: (s: State) => boolean, opts: TestRoomOptions = {}): Room {
  for (let seed = 1; seed < 5000; seed++) {
    const room = playing({ ...opts, seed });
    if (deal(room.state())) return room;
  }
  throw new Error('no seed found');
}

/** The player whose turn it is calls; returns who called. */
function callNow(room: Room) {
  const id = pub(room).turn!;
  room.act(id, { type: 'call' });
  return id;
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays every round to the final results', () => {
    const room = playing({ config: { rounds: 3 } });
    let rounds = 0;
    while (room.phase() === 'playing' && rounds < 40) {
      expect(pub(room).phase).toBe('bet');
      const id = pub(room).turn!;
      room.act(id, { type: 'raise', by: 1 });
      room.act(other(id), { type: 'call' });
      expect(pub(room).phase).toBe('reveal');
      room.advance(8_000);
      rounds++;
    }
    expect(rounds).toBeGreaterThanOrEqual(3);
    expect(room.phase()).toBe('results');
    const results = room.results()!;
    expect(results.map((r) => r.score).sort()).toEqual([0, 1]);
  });

  it('shows each player only the rival card until the reveal', () => {
    const room = playing();
    const s = room.state();
    expect(phone(room, 'p1')).toMatchObject({ rivalId: 'p2', rivalCard: s.cards.p2, myCard: null, reveal: null });
    expect(phone(room, 'p2')).toMatchObject({ rivalId: 'p1', rivalCard: s.cards.p1, myCard: null, reveal: null });
    expect(room.publicJson()).not.toContain('"cards"');
    expect(room.publicJson()).not.toContain('"deck"');
    expect(room.publicJson()).not.toContain('rivalCard');
    expect(pub(room).used).toEqual([]);

    callNow(room);
    expect(pub(room).reveal!.cards).toEqual(s.cards);
    expect(pub(room).used).toEqual([s.cards.p1, s.cards.p2]);
    expect(phone(room, 'p1').myCard).toBe(s.cards.p1);
  });

  it('runs on timers when nobody acts: the turn timer calls automatically', () => {
    const room = playing({ config: { rounds: 3, turnSeconds: 15 } });
    room.advance(15_000);
    expect(pub(room).phase).toBe('reveal');
    expect(pub(room).log.at(-1)).toMatchObject({ kind: 'call', auto: true });
    for (let i = 0; i < 40 && room.phase() === 'playing'; i++) room.advance(15_000);
    expect(room.phase()).toBe('results');
  });

  it('ends the betting at once when a player calls', () => {
    const room = playing({ config: { turnSeconds: 60 } });
    callNow(room);
    expect(pub(room).phase).toBe('reveal');
  });

  it('ignores invalid actions', () => {
    const room = playing({ config: { chips: 20 } });
    const turn = pub(room).turn!;
    const before = room.snapshot();
    room.act(other(turn), { type: 'call' });
    room.act(other(turn), { type: 'fold' });
    room.act(turn, { type: 'raise', by: 0 });
    room.act(turn, { type: 'raise', by: 1.5 });
    room.act(turn, { type: 'raise', by: 20 });
    room.act(turn, { type: 'raise' });
    room.act(turn, { type: 'nonsense' });
    room.act(turn, { type: 'intro', dir: 1 });
    room.act(turn, null);
    expect(room.snapshot()).toBe(before);

    callNow(room);
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

  it('pays the pot to the higher card after a raise and a call', () => {
    const room = dealt((s) => s.cards[s.starter]! > s.cards[other(s.starter)]!, { config: { chips: 20 } });
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'raise', by: 4 }); // a bets 5
    expect(pub(room)).toMatchObject({ turn: b, bets: { [a]: 5, [b]: 1 }, chips: { [a]: 15, [b]: 19 } });
    expect(phone(room, b)).toMatchObject({ toCall: 4, maxRaise: 15 });
    room.act(b, { type: 'call' });
    expect(pub(room).reveal).toMatchObject({ kind: 'showdown', winnerId: a, pot: 10 });
    expect(pub(room).chips).toEqual({ [a]: 25, [b]: 15 });
  });

  it('caps a raise at what the rival can cover', () => {
    const room = playing({ config: { chips: 20 } });
    const a = pub(room).turn!;
    expect(phone(room, a).maxRaise).toBe(19);
    room.act(a, { type: 'raise', by: 19 });
    expect(pub(room).chips[a]).toBe(0);
    expect(phone(room, other(a))).toMatchObject({ toCall: 19, maxRaise: 0 });
  });

  it('gives the pot to the rival on a fold, with no penalty below 10', () => {
    const room = dealt((s) => s.cards[s.starter]! < 10, { config: { chips: 20 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'fold' });
    expect(pub(room).reveal).toMatchObject({ kind: 'fold', winnerId: other(a), folderId: a, pot: 2, penalty: 0 });
    expect(pub(room).chips).toEqual({ [a]: 19, [other(a)]: 21 });
  });

  it('charges 10 chips for folding with a 10', () => {
    const room = dealt((s) => s.cards[s.starter] === 10, { config: { chips: 20 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'fold' });
    expect(pub(room).reveal).toMatchObject({ penalty: 10 });
    expect(pub(room).chips).toEqual({ [a]: 9, [other(a)]: 31 });
  });

  it('caps the 10 penalty at the chips left, which can end the match', () => {
    const room = dealt((s) => s.cards[s.starter] === 10, { config: { chips: 5 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'fold' });
    expect(pub(room).reveal).toMatchObject({ penalty: 4 });
    expect(pub(room).chips).toEqual({ [a]: 0, [other(a)]: 10 });
    room.advance(8_000);
    expect(room.phase()).toBe('results');
    expect(room.results()![0]).toEqual({ playerId: other(a), score: 1 });
  });

  it('carries the pot over on equal cards, to the next round winner', () => {
    const room = dealt((s) => s.cards.p1 === s.cards.p2, { config: { chips: 20 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'raise', by: 2 });
    room.act(other(a), { type: 'call' });
    expect(pub(room).reveal).toMatchObject({ winnerId: null, pot: 6, refunded: false });
    expect(pub(room)).toMatchObject({ carry: 6, chips: { p1: 17, p2: 17 } });
    room.advance(8_000);
    expect(pub(room)).toMatchObject({ round: 2, carry: 6 });
    expect(pub(room).turn).toBe(other(a)); // the starter alternates
    const s = room.state();
    const winner = s.cards.p1 === s.cards.p2 ? null : s.cards.p1! > s.cards.p2! ? 'p1' : 'p2';
    callNow(room);
    if (winner) {
      expect(pub(room).reveal!.pot).toBe(8);
      expect(pub(room).chips[winner]).toBe(16 + 8);
      expect(pub(room).carry).toBe(0);
    }
  });

  it('splits the carried pot back when a tie leaves someone with no chips', () => {
    const room = dealt((s) => s.cards.p1 === s.cards.p2, { config: { chips: 5 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'raise', by: 4 });
    room.act(other(a), { type: 'call' });
    expect(pub(room).reveal).toMatchObject({ winnerId: null, pot: 10, refunded: true });
    expect(pub(room)).toMatchObject({ carry: 0, chips: { p1: 5, p2: 5 } });
    room.advance(8_000);
    expect(room.phase()).toBe('playing');
  });

  it('reshuffles the deck only once all 20 cards are used', () => {
    const room = playing({ config: { rounds: 12 } });
    for (let r = 1; r <= 10; r++) {
      expect(pub(room)).toMatchObject({ round: r, deckLeft: 20 - 2 * r, reshuffled: false });
      callNow(room);
      expect(pub(room).used).toHaveLength(2 * r);
      room.advance(8_000);
    }
    expect(pub(room)).toMatchObject({ round: 11, used: [], deckLeft: 18, reshuffled: true });
  });

  it('deals two of each number per deck', () => {
    const room = playing({ config: { rounds: 10 } });
    const seen: number[] = [];
    for (let r = 1; r <= 10; r++) {
      callNow(room);
      seen.push(...Object.values(pub(room).reveal!.cards));
      if (r < 10) room.advance(8_000);
    }
    expect(seen.sort((x, y) => x - y)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]);
  });

  it('plays sudden death when the chips are equal after the last round', () => {
    // Immediate calls: each round moves 1 chip. Find a deal that leaves 2–2 after four rounds.
    for (let seed = 1; seed < 500; seed++) {
      const room = playing({ seed, config: { rounds: 4 } });
      for (let r = 0; r < 4; r++) {
        callNow(room);
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
        callNow(room);
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
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    expect(phone(room, 'p1').rivalCard).toBeNull();
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
