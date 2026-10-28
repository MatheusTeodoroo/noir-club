import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { lampsOf, revealMs, stoneOf } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const RESULT_MS = 4_000;
const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;
const other = (id: string) => (id === 'p1' ? 'p2' : 'p1');

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** Plays one round: the starter bids `lead`, the other answers `answer`; returns the starter. */
function round(room: Room, lead: number, answer: number) {
  const a = pub(room).turn!;
  room.act(a, { type: 'bid', amount: lead });
  room.act(other(a), { type: 'bid', amount: answer });
  return a;
}

/** Plays a whole duel where both players bid the same each round (all ties). */
function tiedDuel(room: Room, amount = 1) {
  for (let r = 0; r < 9; r++) {
    round(room, amount, amount);
    room.advance(RESULT_MS);
  }
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays nine rounds, reveals the duel and ends with 1 point for the winner', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    // a wins 4 of the first 8 (and keeps the lead), b wins the other 4 and round 9.
    const plan: [number, number][] = [
      [5, 4], [5, 4], [5, 4], [5, 4], // a wins, keeps the lead
    ];
    for (const [x, y] of plan) {
      expect(round(room, x, y)).toBe(a);
      room.advance(RESULT_MS);
    }
    for (let r = 5; r <= 9; r++) {
      expect(pub(room)).toMatchObject({ phase: 'play', round: r });
      room.act(pub(room).turn!, { type: 'bid', amount: pub(room).turn === b ? 6 : 1 });
      room.act(pub(room).turn!, { type: 'bid', amount: pub(room).turn === b ? 6 : 1 });
      if (r < 9) room.advance(RESULT_MS);
    }
    // b reached 5 wins in round 9 — that is also the last round.
    room.advance(RESULT_MS);
    expect(pub(room)).toMatchObject({ phase: 'reveal', reveal: { winnerId: b, wins: { [a]: 4, [b]: 5 } } });
    expect(pub(room).reveal!.rounds).toHaveLength(9);
    expect(room.phase()).toBe('playing');
    room.advance(revealMs(9));
    expect(room.phase()).toBe('results');
    expect(room.results()).toEqual([
      { playerId: b, score: 1 },
      { playerId: a, score: 0 },
    ]);
  });

  it('ends the duel at once when a player reaches five wins', () => {
    const room = playing();
    const a = pub(room).turn!;
    for (let r = 1; r <= 5; r++) {
      round(room, 2, 1);
      room.advance(RESULT_MS);
    }
    expect(pub(room)).toMatchObject({ phase: 'reveal', round: 5, reveal: { winnerId: a, wins: { [a]: 5 } } });
    expect(pub(room).reveal!.rounds).toHaveLength(5);
    room.advance(revealMs(5));
    expect(room.phase()).toBe('results');
    expect(room.results()![0]).toEqual({ playerId: a, score: 1 });
  });

  it('colours one-digit bids onyx and two-digit bids ivory', () => {
    expect([0, 9, 10, 99].map(stoneOf)).toEqual(['onyx', 'onyx', 'ivory', 'ivory']);
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'bid', amount: 9 });
    expect(pub(room).current).toEqual({ [a]: 'onyx', [b]: null });
    room.act(b, { type: 'bid', amount: 10 });
    expect(pub(room).result).toMatchObject({ stones: { [a]: 'onyx', [b]: 'ivory' }, winnerId: b });
  });

  it('lights one lamp stage less for every 20 points spent', () => {
    expect([99, 80, 79, 60, 59, 40, 39, 20, 19, 1, 0].map(lampsOf)).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0]);
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    expect(pub(room).lamps).toEqual({ [a]: 5, [b]: 5 });
    // 10 → 89 left: no change. Then 10 more → 79: one stage goes out.
    round(room, 10, 0);
    expect(pub(room).lamps).toEqual({ [a]: 5, [b]: 5 });
    room.advance(RESULT_MS);
    room.act(a, { type: 'bid', amount: 10 });
    // Shown before the rival answers.
    expect(pub(room)).toMatchObject({ turn: b, lamps: { [a]: 4, [b]: 5 } });
    expect(phone(room, b).lamps[a]).toBe(4);
  });

  it('keeps every number off the TV and the rival’s phone until the duel reveal', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'bid', amount: 37 });
    expect(phone(room, b)).toMatchObject({ current: { [a]: 'ivory' }, mine: null, myTurn: true, myPoints: 99 });
    expect(phone(room, a)).toMatchObject({ mine: 37, myPoints: 62 });
    room.act(b, { type: 'bid', amount: 41 });

    const json = room.publicJson();
    for (const key of ['"bids"', '"points"', '"left"', '"mine"', '"myPoints"']) expect(json).not.toContain(key);
    const rivalPhone = phone(room, b);
    expect(JSON.stringify(rivalPhone)).not.toContain('"bids"');
    expect(rivalPhone).toMatchObject({ mine: 41, myPoints: 58, reveal: null });
    expect(phone(room, a).myBids).toEqual([37]);
    expect(phone(room, b).myBids).toEqual([41]);
  });

  it('reveals every bid of the duel and the points left at its end', () => {
    const room = playing();
    tiedDuel(room, 3);
    const reveal = pub(room).reveal!;
    expect(reveal.rounds.map((r) => Object.values(r.bids))).toEqual(Array.from({ length: 9 }, () => [3, 3]));
    expect(reveal.left).toEqual({ p1: 72, p2: 72 });
    expect(phone(room, 'p1').reveal).toEqual(reveal);
  });

  it('gives the next lead to the round winner, and keeps it after a tied round', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    round(room, 2, 5); // b wins
    room.advance(RESULT_MS);
    expect(pub(room)).toMatchObject({ round: 2, turn: b, starter: b, wins: { [a]: 0, [b]: 1 } });
    round(room, 4, 4); // b leads, tie
    expect(pub(room).result).toMatchObject({ winnerId: null });
    room.advance(RESULT_MS);
    expect(pub(room)).toMatchObject({ round: 3, turn: b, wins: { [a]: 0, [b]: 1 } });
  });

  it('starts a tiebreak duel with 99 points each when the wins are level', () => {
    const room = playing();
    const a = pub(room).turn!;
    tiedDuel(room);
    expect(pub(room).reveal).toMatchObject({ winnerId: null, wins: { p1: 0, p2: 0 } });
    room.advance(revealMs(9));
    expect(room.phase()).toBe('playing');
    expect(pub(room)).toMatchObject({ phase: 'play', duel: 2, round: 1, turn: a, history: [], lamps: { p1: 5, p2: 5 } });
    expect(phone(room, a).myPoints).toBe(99);
  });

  it('bids 0 at once for a player with no points left, and ends the duel when both are out', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    round(room, 99, 50); // a wins and leads, now with 0 points
    expect(pub(room).lamps).toEqual({ [a]: 0, [b]: 3 });
    room.advance(RESULT_MS);
    // a's bid is made on its own: the turn goes straight to b.
    expect(pub(room)).toMatchObject({ round: 2, turn: b, current: { [a]: 'onyx' }, auto: { [a]: 'empty' } });
    room.act(b, { type: 'bid', amount: 49 });
    room.advance(RESULT_MS);
    // b won round 2 and leads; both are now at 0, so nothing more can happen.
    expect(pub(room)).toMatchObject({ phase: 'reveal', reveal: { wins: { [a]: 1, [b]: 1 }, winnerId: null } });
  });

  it('runs on timers when nobody acts: each time-out bids 0', () => {
    const room = playing({ config: { turnSeconds: 15 } });
    const a = pub(room).turn!;
    room.advance(15_000);
    expect(pub(room)).toMatchObject({ turn: other(a), current: { [a]: 'onyx' }, auto: { [a]: 'time' } });
    expect(phone(room, a).myPoints).toBe(99);
    // Both always bid 0 → every round ties → tiebreak after tiebreak.
    for (let i = 0; i < 200 && pub(room).duel === 1; i++) room.advance(5_000);
    expect(pub(room)).toMatchObject({ duel: 2, phase: 'play' });
  });

  it('moves on as soon as the player on turn bids', () => {
    const room = playing({ config: { turnSeconds: 90 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'bid', amount: 1 });
    expect(pub(room).turn).toBe(other(a));
    room.act(other(a), { type: 'bid', amount: 0 });
    expect(pub(room).phase).toBe('result');
  });

  it('ignores invalid actions', () => {
    const room = playing();
    const a = pub(room).turn!;
    const before = room.snapshot();
    room.act(other(a), { type: 'bid', amount: 3 });
    room.act(a, { type: 'bid', amount: 100 });
    room.act(a, { type: 'bid', amount: -1 });
    room.act(a, { type: 'bid', amount: 2.5 });
    room.act(a, { type: 'bid', amount: '3' });
    room.act(a, { type: 'bid' });
    room.act(a, { type: 'nonsense' });
    room.act(a, { type: 'intro', dir: 1 });
    room.act(a, null);
    expect(room.snapshot()).toBe(before);

    room.act(a, { type: 'bid', amount: 90 });
    const afterLead = room.snapshot();
    room.act(a, { type: 'bid', amount: 4 }); // not your turn any more
    expect(room.snapshot()).toBe(afterLead);

    room.act(other(a), { type: 'bid', amount: 2 });
    room.advance(RESULT_MS);
    // `a` won and leads again, with 9 points left.
    const round2 = room.snapshot();
    room.act(a, { type: 'bid', amount: 10 });
    expect(room.snapshot()).toBe(round2);

    room.act(a, { type: 'bid', amount: 9 });
    room.act(other(a), { type: 'bid', amount: 0 });
    const result = room.snapshot();
    room.act('p1', { type: 'bid', amount: 0 });
    room.act('p2', { type: 'bid', amount: 0 });
    expect(room.snapshot()).toBe(result);
  });

  it('gives the win to the player who stays when the other drops', () => {
    const room = playing();
    room.disconnect('p2');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(room.phase()).toBe('results');
    expect(room.results()![0]).toEqual({ playerId: 'p1', score: 1 });
  });

  it('scores 1 win per round won and none on a tie', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    round(room, 7, 8); // b
    room.advance(RESULT_MS);
    round(room, 0, 0); // b leads, tie
    room.advance(RESULT_MS);
    round(room, 1, 2); // b leads, a wins
    room.advance(RESULT_MS);
    expect(pub(room).wins).toEqual({ [a]: 1, [b]: 1 });
    expect(pub(room).history.map((h) => h.winnerId)).toEqual([b, null, a]);
    expect(phone(room, a).myPoints).toBe(99 - 7 - 0 - 2);
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, {});
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'play', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, {});
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('play');
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
    expect(pub(room).phase).toBe('play');
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
