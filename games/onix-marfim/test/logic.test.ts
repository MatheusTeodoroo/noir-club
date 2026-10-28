import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { REVEAL_MS, type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const RESULT_MS = 4_000;
const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;
const other = (id: string) => (id === 'p1' ? 'p2' : 'p1');

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** Plays one round: the starter presents `lead`, the other answers `answer`; returns the starter. */
function round(room: Room, lead: number, answer: number) {
  const a = pub(room).turn!;
  room.act(a, { type: 'present', tile: lead });
  room.act(other(a), { type: 'present', tile: answer });
  return a;
}

/** Plays a whole duel where both players present the same number each round (all ties). */
function tiedDuel(room: Room) {
  for (let n = 0; n < 9; n++) {
    round(room, n, n);
    room.advance(RESULT_MS);
  }
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays nine rounds, reveals the duel and ends with 1 point for the winner', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    // a leads 8,7,…,0 and b answers 7,6,…,0 then 8: a wins rounds 1–8 (and so keeps the lead),
    // b wins round 9.
    const answers = [7, 6, 5, 4, 3, 2, 1, 0, 8];
    for (let r = 1; r <= 9; r++) {
      expect(pub(room)).toMatchObject({ phase: 'play', round: r, turn: a });
      room.act(a, { type: 'present', tile: 9 - r });
      room.act(b, { type: 'present', tile: answers[r - 1]! });
      expect(pub(room).result!.winnerId).toBe(r < 9 ? a : b);
      room.advance(RESULT_MS);
    }
    expect(pub(room)).toMatchObject({ phase: 'reveal', reveal: { winnerId: a, points: { [a]: 8, [b]: 1 } } });
    expect(room.phase()).toBe('playing');
    room.advance(REVEAL_MS);
    expect(room.phase()).toBe('results');
    expect(room.results()).toEqual([
      { playerId: a, score: 1 },
      { playerId: b, score: 0 },
    ]);
  });

  it('shows only colours on the TV and to the rival until the duel reveal', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    room.act(a, { type: 'present', tile: 6 });
    expect(pub(room).current).toEqual({ [a]: 'onyx', [b]: null });
    expect(phone(room, b)).toMatchObject({ current: { [a]: 'onyx' }, mine: null, myTurn: true });
    expect(phone(room, a)).toMatchObject({ mine: 6 });
    room.act(b, { type: 'present', tile: 3 });
    expect(pub(room).result).toMatchObject({ stones: { [a]: 'onyx', [b]: 'ivory' }, winnerId: a });

    // No number anywhere public, and none of the rival's numbers on a phone.
    const json = room.publicJson();
    expect(json).not.toContain('"tiles"');
    expect(json).not.toContain('"hands"');
    expect(json).not.toContain('"hand"');
    expect(JSON.stringify(phone(room, b))).not.toContain('"tiles"');
    expect(phone(room, b).myTiles).toEqual([3]);
    expect(phone(room, a).myTiles).toEqual([6]);
    expect(phone(room, a).hand).toEqual([0, 1, 2, 3, 4, 5, 7, 8]);
    expect(phone(room, b).hand).toEqual([0, 1, 2, 4, 5, 6, 7, 8]);
  });

  it('lists remaining stones by colour only, onyx first', () => {
    const room = playing();
    expect(pub(room).remaining[pub(room).turn!]).toEqual([
      'onyx', 'onyx', 'onyx', 'onyx', 'onyx', 'ivory', 'ivory', 'ivory', 'ivory',
    ]);
    // Playing 0 or 8 leaves the same public row: its order says nothing about numbers.
    const r1 = playing({ seed: 3 });
    const r2 = playing({ seed: 3 });
    const a = pub(r1).turn!;
    r1.act(a, { type: 'present', tile: 0 });
    r2.act(a, { type: 'present', tile: 8 });
    expect(pub(r1).remaining).toEqual(pub(r2).remaining);
    expect(pub(r1).current).toEqual(pub(r2).current);
  });

  it('reveals every number of the duel, round by round, at its end', () => {
    const room = playing();
    tiedDuel(room);
    const reveal = pub(room).reveal!;
    expect(reveal.rounds.map((r) => Object.values(r.tiles))).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, n]),
    );
    expect(phone(room, 'p1').reveal).toEqual(reveal);
  });

  it('gives the next lead to the round winner, and keeps it after a tied round', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    round(room, 2, 5); // b wins
    room.advance(RESULT_MS);
    expect(pub(room)).toMatchObject({ round: 2, turn: b, starter: b, points: { [a]: 0, [b]: 1 } });
    round(room, 4, 4); // b leads, tie
    expect(pub(room).result).toMatchObject({ winnerId: null });
    room.advance(RESULT_MS);
    expect(pub(room)).toMatchObject({ round: 3, turn: b, points: { [a]: 0, [b]: 1 } });
  });

  it('starts a tiebreak duel with fresh stones when the points are level', () => {
    const room = playing();
    const a = pub(room).turn!;
    tiedDuel(room);
    expect(pub(room).reveal).toMatchObject({ winnerId: null, points: { p1: 0, p2: 0 } });
    room.advance(REVEAL_MS);
    expect(room.phase()).toBe('playing');
    expect(pub(room)).toMatchObject({ phase: 'play', duel: 2, round: 1, turn: a, history: [] });
    expect(phone(room, a).hand).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(pub(room).remaining[other(a)]).toHaveLength(9);
  });

  it('runs on timers when nobody acts: each time-out plays the lowest stone', () => {
    const room = playing({ config: { turnSeconds: 15 } });
    const a = pub(room).turn!;
    room.advance(15_000);
    expect(pub(room)).toMatchObject({ turn: other(a), current: { [a]: 'onyx' }, auto: { [a]: true } });
    expect(phone(room, a).hand).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Both always play their lowest stone → every round ties → tiebreak after tiebreak.
    for (let i = 0; i < 200 && pub(room).duel === 1; i++) room.advance(5_000);
    expect(pub(room)).toMatchObject({ duel: 2, phase: 'play' });
  });

  it('moves on as soon as the player on turn presents', () => {
    const room = playing({ config: { turnSeconds: 90 } });
    const a = pub(room).turn!;
    room.act(a, { type: 'present', tile: 1 });
    expect(pub(room).turn).toBe(other(a));
    room.act(other(a), { type: 'present', tile: 0 });
    expect(pub(room).phase).toBe('result');
  });

  it('ignores invalid actions', () => {
    const room = playing();
    const a = pub(room).turn!;
    const before = room.snapshot();
    room.act(other(a), { type: 'present', tile: 3 });
    room.act(a, { type: 'present', tile: 9 });
    room.act(a, { type: 'present', tile: -1 });
    room.act(a, { type: 'present', tile: 2.5 });
    room.act(a, { type: 'present', tile: '3' });
    room.act(a, { type: 'present' });
    room.act(a, { type: 'nonsense' });
    room.act(a, { type: 'intro', dir: 1 });
    room.act(a, null);
    expect(room.snapshot()).toBe(before);

    room.act(a, { type: 'present', tile: 3 });
    const afterLead = room.snapshot();
    room.act(a, { type: 'present', tile: 4 }); // not your turn any more
    expect(room.snapshot()).toBe(afterLead);

    room.act(other(a), { type: 'present', tile: 2 });
    room.advance(RESULT_MS);
    // `a` won and leads again, but stone 3 is gone.
    const round2 = room.snapshot();
    room.act(a, { type: 'present', tile: 3 });
    expect(room.snapshot()).toBe(round2);

    room.act(a, { type: 'present', tile: 4 });
    room.act(other(a), { type: 'present', tile: 0 });
    const result = room.snapshot();
    room.act('p1', { type: 'present', tile: 5 });
    room.act('p2', { type: 'present', tile: 5 });
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

  it('scores 1 point per round won and none on a tie', () => {
    const room = playing();
    const a = pub(room).turn!;
    const b = other(a);
    round(room, 7, 8); // b
    room.advance(RESULT_MS);
    round(room, 0, 0); // b leads, tie
    room.advance(RESULT_MS);
    round(room, 1, 2); // b leads, a wins
    room.advance(RESULT_MS);
    expect(pub(room).points).toEqual({ [a]: 1, [b]: 1 });
    expect(pub(room).history.map((h) => h.winnerId)).toEqual([b, null, a]);
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, {});
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    expect(phone(room, 'p1').hand).toEqual([]);
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
