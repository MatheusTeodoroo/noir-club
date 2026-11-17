import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, {
  AUTO_MS,
  BEAT_MS,
  REVEAL_MS,
  ROUND_END_MS,
  LAST_ROUND_END_MS,
  TOPPLE_BEAT_MS,
  lowestPile,
  matchScores,
  playOrder,
  stackChip,
  standing,
  type Play,
  type PlayerView,
  type PublicView,
  type State,
} from '../src/logic.ts';
import type { Color } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;
const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** Every player sends the given play, or the first card/colour still in their hand. */
function submitAll(room: Room, plays: Record<string, [number, Color]> = {}) {
  for (const id of room.ids) {
    if (pub(room).phase !== 'submit') return;
    const hand = pv(room, id).hand;
    const [card, color] = plays[id] ?? [hand.cards[0]!, hand.colors[0]!];
    room.act(id, { type: 'submit', card, color });
  }
}

/** Stacks for whoever is up (rainbow → red) until the round ends. */
function stackAll(room: Room, pile: 'r' | 'g' | 'b' = 'r') {
  for (let guard = 0; guard < 200 && pub(room).phase === 'place'; guard++) {
    const turn = pub(room).turn;
    if (turn) room.act(turn, { type: 'place', pile: pv(room, turn).myPlay!.color === 'w' ? pile : undefined });
    else room.advance(TOPPLE_BEAT_MS);
  }
}

function playMatch(room: Room) {
  for (let guard = 0; guard < 100 && room.phase() === 'playing'; guard++) {
    expect(pub(room).phase).toBe('submit');
    submitAll(room);
    expect(pub(room).phase).toBe('reveal');
    room.advance(REVEAL_MS);
    stackAll(room);
    expect(pub(room).phase).toBe('roundEnd');
    room.advance(LAST_ROUND_END_MS);
  }
}

/** Forces the marker so order tests are deterministic. */
const withMarker = (room: Room, id: string) => {
  const s = room.state();
  s.marker = id;
};

describe('pure rules', () => {
  const p = (card: number, color: Color): Play => ({ card, color, auto: false });

  it('orders rainbow first, then higher cards, then marker and clockwise', () => {
    const seats = ['a', 'b', 'c', 'd', 'e'];
    const plays = { a: p(5, 'r'), b: p(3, 'w'), c: p(5, 'g'), d: p(6, 'b'), e: p(5, 'w') };
    // marker c: rainbows e(5) then b(3); then d(6); then the 5s from c clockwise: c, a
    expect(playOrder(seats, 'c', plays)).toEqual(['e', 'b', 'd', 'c', 'a']);
    // marker d: the 5s clockwise from d are a then c
    expect(playOrder(seats, 'd', plays)).toEqual(['e', 'b', 'd', 'a', 'c']);
  });

  it('collects the chips already on a stack when it reaches 13', () => {
    expect(stackChip([6, 5], 1)).toEqual({ stack: [6, 5, 1], penalty: 0 });
    expect(stackChip([6, 5], 2)).toEqual({ stack: [2], penalty: 2 });
    expect(stackChip([0, 6, 6], 6)).toEqual({ stack: [6], penalty: 3 });
    expect(stackChip([], 6)).toEqual({ stack: [6], penalty: 0 });
  });

  it('ranks by penalties, the latest penalised losing ties, and shares exact ties', () => {
    const seats = ['a', 'b', 'c', 'd'];
    const pen = { a: 3, b: 3, c: 0, d: 0 };
    const last = { a: 4, b: 2, c: 0, d: 0 };
    expect(standing(seats, pen, last)).toEqual(['c', 'd', 'b', 'a']);
    expect(matchScores(seats, pen, last)).toEqual({ c: 3, d: 3, b: 1, a: 0 });
  });

  it('auto-stacks a rainbow on the lowest stack', () => {
    expect(lowestPile({ r: [5], g: [2], b: [4] })).toBe('g');
    expect(lowestPile({ r: [], g: [], b: [] })).toBe('r');
  });
});

describe('Sobrecarga', () => {
  it('plays a full match at the minimum players', () => {
    const room = playing({ players: 2, config: { rounds: 7 } });
    playMatch(room);
    expect(room.phase()).toBe('results');
    expect(room.results()).toHaveLength(2);
  });

  it('plays a full match at the maximum players', () => {
    const room = playing({ players: 16, config: { rounds: 7 } });
    playMatch(room);
    expect(room.phase()).toBe('results');
    const total = Object.values(room.state().penalties).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('keeps submissions and hands secret until the reveal', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'submit', card: 6, color: 'w' });
    expect(pub(room)).toMatchObject({ phase: 'submit', submitted: ['p1'], plays: null });
    const json = room.publicJson();
    expect(json).not.toContain('"subs"');
    expect(json).not.toContain('"hands"');
    expect(json).not.toContain('"card"');
    expect(pv(room, 'p1').mySub).toEqual({ card: 6, color: 'w' });
    expect(pv(room, 'p2').mySub).toBeNull();
    expect(JSON.stringify(room.playerView('p2'))).not.toContain('"card"');
    submitAll(room, { p1: [6, 'w'], p2: [1, 'r'], p3: [2, 'g'] });
    expect(pub(room).plays).toMatchObject({ p1: { card: 6, color: 'w' }, p2: { card: 1 }, p3: { card: 2 } });
    expect(pv(room, 'p1').hand.cards).not.toContain(6);
    expect(pv(room, 'p1').hand.colors).not.toContain('w');
  });

  it('timers alone drive the whole match, drawing plays for everyone', () => {
    const room = playing({ players: 3, config: { rounds: 14 } });
    room.advance(60 * 60_000);
    expect(room.phase()).toBe('results');
  });

  it('reveals as soon as everyone has sent, and lets a player change before that', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'submit', card: 6, color: 'r' });
    room.act('p1', { type: 'submit', card: 2, color: 'b' });
    room.act('p2', { type: 'submit', card: 3, color: 'g' });
    expect(pub(room).phase).toBe('submit');
    room.act('p3', { type: 'submit', card: 4, color: 'r' });
    expect(pub(room).phase).toBe('reveal');
    expect(pub(room).plays!.p1).toMatchObject({ card: 2, color: 'b', auto: false });
  });

  it('draws a random card and colour for whoever did not send in time', () => {
    const room = playing({ players: 3, config: { submitSeconds: 30 } });
    room.act('p1', { type: 'submit', card: 6, color: 'r' });
    room.advance(30_000);
    const plays = pub(room).plays!;
    expect(plays.p1!.auto).toBe(false);
    expect(plays.p2!.auto).toBe(true);
    expect(plays.p3!.auto).toBe(true);
  });

  it('stacks in reveal order, and a pass goes to the back in reverse pass order', () => {
    const room = playing({ players: 4 });
    withMarker(room, 'p1');
    submitAll(room, { p1: [6, 'r'], p2: [5, 'g'], p3: [4, 'b'], p4: [3, 'r'] });
    room.advance(REVEAL_MS);
    expect(pub(room)).toMatchObject({ phase: 'place', turn: 'p1', order: ['p1', 'p2', 'p3', 'p4'] });
    room.act('p1', { type: 'pass' });
    room.advance(BEAT_MS);
    room.act('p2', { type: 'pass' });
    room.advance(BEAT_MS);
    expect(pub(room).order).toEqual(['p3', 'p4', 'p2', 'p1']);
    room.act('p3', { type: 'place' });
    room.advance(BEAT_MS);
    room.act('p4', { type: 'place' });
    room.advance(BEAT_MS);
    expect(pub(room).turn).toBe('p2');
    expect(pv(room, 'p2').canPass).toBe(false);
    const before = room.snapshot();
    room.act('p2', { type: 'pass' });
    expect(room.snapshot()).toBe(before);
    room.act('p2', { type: 'place' });
    room.advance(BEAT_MS);
    room.act('p1', { type: 'place' });
    expect(pub(room).events.map((e) => e.playerId)).toEqual(['p3', 'p4', 'p2', 'p1']);
  });

  it('gives a penalty for the chips collected and passes the marker to the last penalised', () => {
    const room = playing({ players: 3 });
    withMarker(room, 'p3');
    submitAll(room, { p1: [6, 'r'], p2: [5, 'r'], p3: [2, 'r'] });
    room.advance(REVEAL_MS);
    stackAll(room);
    expect(room.state().stacks.r).toEqual([2]);
    expect(pub(room).penalties).toEqual({ p1: 0, p2: 0, p3: 2 });
    expect(pub(room).events.at(-1)).toMatchObject({ playerId: 'p3', pile: 'r', value: 2, penalty: 2 });
    expect(pub(room).marker).toBe('p3');
  });

  it('turns the marker clockwise after a round with no penalty', () => {
    const room = playing({ players: 3 });
    withMarker(room, 'p3');
    submitAll(room, { p1: [1, 'r'], p2: [1, 'g'], p3: [1, 'b'] });
    room.advance(REVEAL_MS);
    stackAll(room);
    expect(pub(room)).toMatchObject({ phase: 'roundEnd', marker: 'p1' });
  });

  it('lets a rainbow choose any stack, and only a rainbow', () => {
    const room = playing({ players: 2 });
    withMarker(room, 'p1');
    submitAll(room, { p1: [3, 'w'], p2: [3, 'g'] });
    room.advance(REVEAL_MS);
    expect(pub(room).turn).toBe('p1');
    const before = room.snapshot();
    room.act('p1', { type: 'place' });
    room.act('p1', { type: 'place', pile: 'x' });
    expect(room.snapshot()).toBe(before);
    room.act('p1', { type: 'place', pile: 'b' });
    room.advance(BEAT_MS);
    const mid = room.snapshot();
    room.act('p2', { type: 'place', pile: 'r' });
    expect(room.snapshot()).toBe(mid);
    room.act('p2', { type: 'place' });
    expect(room.state().stacks).toEqual({ r: [], g: [3], b: [3] });
  });

  it('stacks automatically when a turn runs out (rainbow on the lowest stack)', () => {
    const room = playing({ players: 2, config: { turnSeconds: 10 } });
    withMarker(room, 'p1');
    room.state().stacks = { r: [5], g: [4], b: [1] };
    submitAll(room, { p1: [2, 'w'], p2: [2, 'g'] });
    room.advance(REVEAL_MS);
    room.advance(10_000);
    expect(pub(room).events[0]).toMatchObject({ playerId: 'p1', pile: 'b' });
  });

  it('refreshes every hand after 7 rounds and keeps the stacks', () => {
    const room = playing({ players: 2, config: { rounds: 14 } });
    for (let r = 1; r <= 7; r++) {
      submitAll(room);
      room.advance(REVEAL_MS);
      stackAll(room);
      if (r < 7) room.advance(ROUND_END_MS);
    }
    expect(pv(room, 'p1').hand).toEqual({ cards: [], colors: [] });
    const stacks = JSON.stringify(room.state().stacks);
    room.advance(ROUND_END_MS);
    expect(pub(room)).toMatchObject({ round: 8, handRound: 1, newHand: true });
    expect(pv(room, 'p1').hand.cards).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pv(room, 'p1').hand.colors).toHaveLength(7);
    expect(pub(room).spent!.p1).toEqual({ cards: [], colors: [] });
    expect(JSON.stringify(room.state().stacks)).toBe(stacks);
  });

  it('shows spent cards only when the Host turns it on', () => {
    const on = playing({ players: 2 });
    submitAll(on, { p1: [4, 'b'], p2: [0, 'g'] });
    expect(pub(on).spent!.p1).toEqual({ cards: [4], colors: ['b'] });
    const off = playing({ players: 2, config: { showSpent: false } });
    submitAll(off);
    expect(pub(off).spent).toBeNull();
  });

  it('scores the final ranking by placement with the latest-penalised tie-break', () => {
    const room = playing({ players: 3, config: { rounds: 7 } });
    room.advance(60 * 60_000);
    const s = room.state();
    const expected = matchScores(s.seats, s.penalties, s.lastPenalty);
    const results = room.results()!;
    for (const r of results) expect(r.score).toBe(expected[r.playerId]);
    expect(Math.max(...results.map((r) => r.score))).toBe(2);
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 2 });
    withMarker(room, 'p1');
    const before = room.snapshot();
    room.act('p1', { type: 'submit', card: 7, color: 'r' });
    room.act('p1', { type: 'submit', card: 2.5, color: 'r' });
    room.act('p1', { type: 'submit', card: 2, color: 'x' });
    room.act('p1', { type: 'place' });
    room.act('p1', { type: 'pass' });
    room.act('p1', { type: 'nonsense' });
    room.act('p1', null);
    expect(room.snapshot()).toBe(before);
    submitAll(room, { p1: [6, 'w'], p2: [1, 'r'] });
    const revealing = room.snapshot();
    room.act('p1', { type: 'submit', card: 5, color: 'r' });
    room.act('p1', { type: 'place', pile: 'r' });
    expect(room.snapshot()).toBe(revealing);
    room.advance(REVEAL_MS);
    const placing = room.snapshot();
    room.act('p2', { type: 'place' });
    room.act('p2', { type: 'pass' });
    expect(room.snapshot()).toBe(placing);
  });

  it('cannot reuse a card or colour already played this hand', () => {
    const room = playing({ players: 2 });
    submitAll(room, { p1: [6, 'w'], p2: [1, 'r'] });
    room.advance(REVEAL_MS);
    stackAll(room);
    room.advance(ROUND_END_MS);
    const before = room.snapshot();
    room.act('p1', { type: 'submit', card: 6, color: 'r' });
    room.act('p1', { type: 'submit', card: 5, color: 'w' });
    expect(room.snapshot()).toBe(before);
  });

  it('pauses on a disconnect, then plays the missing player automatically', () => {
    const room = playing({ players: 3 });
    withMarker(room, 'p1');
    room.act('p1', { type: 'submit', card: 6, color: 'r' });
    room.act('p2', { type: 'submit', card: 5, color: 'g' });
    room.disconnect('p3');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).phase).toBe('reveal');
    expect(pub(room).plays!.p3!.auto).toBe(true);
    expect(pub(room).autos).toEqual(['p3']);
    room.advance(REVEAL_MS);
    room.act('p1', { type: 'place' });
    room.advance(BEAT_MS);
    room.act('p2', { type: 'place' });
    room.advance(BEAT_MS + AUTO_MS);
    expect(pub(room).placed).toContain('p3');
    room.reconnect('p3');
    expect(pub(room).autos).toEqual([]);
  });

  it('auto-stacks for a player who drops during their own turn', () => {
    const room = playing({ players: 2 });
    withMarker(room, 'p1');
    submitAll(room, { p1: [6, 'r'], p2: [1, 'g'] });
    room.advance(REVEAL_MS);
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).events[0]).toMatchObject({ playerId: 'p1', pile: 'r' });
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'submit', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 2 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('submit');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('submit');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 2 });
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
