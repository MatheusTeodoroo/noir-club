import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type DealerView, type PlayerView, type PublicView, type State } from '../src/logic.ts';
import type { Color, Space } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** A room already past the tutorial (the gameplay tests start at the election). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** Everyone votes for `king`; the crown phase then runs out into round 1. */
function elect(room: Room, king: string) {
  for (const id of room.ids) room.act(id, { type: 'vote', target: king });
  expect(pub(room)).toMatchObject({ phase: 'crown', king });
  room.advance(6_000);
}

/** Phone mode: everyone sets a colour (a missing entry defaults to blue). */
function colors(room: Room, map: Record<string, Color> = {}) {
  expect(pub(room).phase).toBe('color');
  for (const id of room.ids) room.act(id, { type: 'color', color: map[id] ?? 'blue' });
}

/** The king places `a` in hall A and everyone else in B, then confirms. */
function split(room: Room, a: string[]) {
  const view = pub(room);
  expect(view.phase).toBe('divide');
  for (const id of view.active) room.act(view.king!, { type: 'place', target: id, space: a.includes(id) ? 'A' : 'B' });
  room.act(view.king!, { type: 'confirm' });
}

function allReady(room: Room) {
  for (const id of room.ids) room.act(id, { type: 'ready' });
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays a full match at 5 players, everyone reigning once', () => {
    const room = playing({ players: 5 });
    expect(pub(room)).toMatchObject({ phase: 'election', rounds: 5 });
    elect(room, 'p3');
    const kings: string[] = [];
    for (let round = 1; round <= 5; round++) {
      const view = pub(room);
      expect(view.round).toBe(round);
      kings.push(view.king!);
      // Colour windows only before rounds 1, 3 and 5.
      if (round % 2 === 1) colors(room, { p1: 'green', p2: 'green' });
      split(room, ['p1', 'p2']);
      if (pub(room).phase === 'pass') allReady(room);
      expect(pub(room).phase).toBe('reveal');
      room.advance(10_500);
      if (round < 5) {
        const next = pub(room).heirs[0]!;
        expect(pub(room).phase).toBe('successor');
        room.act(pub(room).king!, { type: 'heir', target: next });
        room.advance(6_000);
      }
    }
    expect(new Set(kings).size).toBe(5);
    expect(pub(room).phase).toBe('final');
    room.advance(25_000);
    expect(room.phase()).toBe('results');
  });

  it('plays a full match at 15 players on timers alone', () => {
    const room = playing({ players: 15 });
    const seen: string[] = [];
    let guard = 0;
    while (room.phase() === 'playing' && guard++ < 1500) {
      seen.push(pub(room).phase);
      room.advance(5_000);
    }
    expect(room.phase()).toBe('results');
    expect((room.state() as State).reigned).toHaveLength(15);
    for (const phase of ['election', 'crown', 'color', 'divide', 'pass', 'reveal', 'successor', 'final']) {
      expect(seen).toContain(phase);
    }
  });

  it('timers drive every phase when nobody acts', () => {
    const room = playing({ players: 5 });
    room.advance(45_000);
    expect(pub(room).phase).toBe('runoff'); // nobody voted: everyone tied
    room.advance(45_000);
    expect(pub(room)).toMatchObject({ phase: 'crown', crown: { reason: 'draw' } });
    room.advance(6_000);
    expect(pub(room).phase).toBe('color');
    room.advance(30_000);
    const state = room.state();
    expect(Object.keys(state.colors)).toHaveLength(5); // random colours for round 1
    expect(pub(room).phase).toBe('divide');
    room.advance(120_000);
    const spaces = pub(room).spaces;
    expect(Object.keys(spaces)).toHaveLength(5);
    for (const s of ['A', 'B'] as Space[]) expect(Object.values(spaces).filter((x) => x === s).length).toBeGreaterThanOrEqual(2);
    expect(pub(room).phase).toBe('pass');
    room.advance(20_000);
    expect(pub(room).phase).toBe('reveal');
    room.advance(10_500);
    expect(pub(room).phase).toBe('successor');
    const king = pub(room).king;
    room.advance(30_000);
    expect(pub(room)).toMatchObject({ phase: 'crown', crown: { reason: 'random' } });
    expect(pub(room).king).not.toBe(king);
  });

  it('ends phases early once everyone has acted', () => {
    const room = playing({ players: 5 });
    for (const id of room.ids) room.act(id, { type: 'vote', target: 'p1' });
    expect(pub(room).phase).toBe('crown');
    room.advance(6_000);
    colors(room);
    expect(pub(room).phase).toBe('divide');
    split(room, ['p1', 'p2']);
    expect(pub(room).phase).toBe('pass');
    room.act('p1', { type: 'pass' }); // a pass holder who used it no longer needs to tap Ready
    for (const id of ['p2', 'p3', 'p4']) room.act(id, { type: 'ready' });
    expect(pub(room).phase).toBe('pass');
    room.act('p5', { type: 'ready' });
    expect(pub(room).phase).toBe('reveal');
  });

  describe('election', () => {
    it('breaks a tie with a runoff among the tied only', () => {
      const room = playing({ players: 5 });
      room.act('p1', { type: 'vote', target: 'p2' });
      room.act('p2', { type: 'vote', target: 'p2' }); // self-vote is allowed
      room.act('p3', { type: 'vote', target: 'p4' });
      room.act('p4', { type: 'vote', target: 'p4' });
      room.act('p5', { type: 'vote', target: 'p1' });
      expect(pub(room)).toMatchObject({ phase: 'runoff', candidates: ['p2', 'p4'], tally: { p2: 2, p4: 2, p1: 1 } });
      room.act('p1', { type: 'vote', target: 'p1' }); // no longer a candidate
      expect(pv(room, 'p1').myVote).toBeNull();
      for (const id of room.ids) room.act(id, { type: 'vote', target: id === 'p5' ? 'p2' : 'p4' });
      expect(pub(room)).toMatchObject({ phase: 'crown', king: 'p4', crown: { reason: 'vote' } });
    });

    it('draws among the tied when the runoff ties again', () => {
      const room = playing({ players: 6, seed: 3 });
      for (const [voter, target] of [
        ['p1', 'p1'], ['p2', 'p1'], ['p3', 'p3'], ['p4', 'p3'], ['p5', 'p5'], ['p6', 'p5'],
      ] as const) room.act(voter, { type: 'vote', target });
      expect(pub(room).candidates).toEqual(['p1', 'p3', 'p5']);
      for (const [voter, target] of [
        ['p1', 'p1'], ['p2', 'p1'], ['p3', 'p3'], ['p4', 'p3'], ['p5', 'p5'], ['p6', 'p5'],
      ] as const) room.act(voter, { type: 'vote', target });
      expect(pub(room)).toMatchObject({ phase: 'crown', crown: { reason: 'draw' } });
      expect(['p1', 'p3', 'p5']).toContain(pub(room).king);
    });
  });

  describe('scoring', () => {
    it('scores the strict minority of each hall (the 12-player example)', () => {
      const room = playing({ players: 12 });
      elect(room, 'p1');
      // Hall A (p1–p7): 4 blue, 3 green → green scores. Hall B (p8–p12): 3 green, 2 blue → blue scores.
      colors(room, { p5: 'green', p6: 'green', p7: 'green', p8: 'green', p9: 'green', p10: 'green' });
      split(room, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
      allReady(room);
      expect(pub(room).reveal).toMatchObject({
        counts: { A: { blue: 4, green: 3 }, B: { blue: 2, green: 3 } },
        minority: { A: 'green', B: 'blue' },
      });
      const scorers = ['p5', 'p6', 'p7', 'p11', 'p12'];
      for (const id of room.ids) {
        expect(pv(room, id).scored).toBe(scorers.includes(id));
        expect(pv(room, id).myScore).toBe(scorers.includes(id) ? 1 : 0);
      }
    });

    it('scores nobody in a tied hall, a one-colour hall or for a lone player', () => {
      const room = playing({ players: 6 });
      elect(room, 'p1');
      // A: p1 p2 p3 p4 = 2 blue × 2 green (tie). B: p5 p6 both blue (one colour).
      colors(room, { p3: 'green', p4: 'green' });
      split(room, ['p1', 'p2', 'p3', 'p4']);
      allReady(room);
      expect(pub(room).reveal?.minority).toEqual({ A: null, B: null });
      expect(room.state().scores).toEqual({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 });
    });

    it('lets a Royal Pass leave a hall with fewer than 2, and a lone player does not score', () => {
      const room = playing({ players: 5 });
      elect(room, 'p1');
      colors(room, { p1: 'green' });
      split(room, ['p1', 'p2']);
      room.act('p2', { type: 'pass' }); // A: p1 alone (green); B: p2..p5 all blue
      expect(pub(room).spaces).toMatchObject({ p1: 'A', p2: 'B' });
      expect(pub(room).passUsed).toEqual({ p2: 1 });
      allReady(room);
      expect(pub(room).reveal).toMatchObject({ counts: { A: { blue: 0, green: 1 } }, minority: { A: null, B: null }, passes: ['p2'] });
    });
  });

  it('spends each Royal Pass once per match', () => {
    const room = playing({ players: 5 });
    elect(room, 'p1');
    colors(room);
    split(room, ['p1', 'p2']);
    room.act('p3', { type: 'pass' });
    const before = room.snapshot();
    room.act('p3', { type: 'pass' });
    expect(room.snapshot()).toBe(before);
    allReady(room);
    room.advance(10_500);
    room.act('p1', { type: 'heir', target: 'p2' });
    room.advance(6_000);
    split(room, ['p1', 'p3']);
    expect(pv(room, 'p3').passAvailable).toBe(false);
    const again = room.snapshot();
    room.act('p3', { type: 'pass' });
    expect(room.snapshot()).toBe(again);
  });

  it('only opens colour windows before odd rounds and keeps colours in between', () => {
    const room = playing({ players: 5 });
    elect(room, 'p1');
    colors(room, { p2: 'green' });
    split(room, ['p1', 'p2']);
    allReady(room);
    room.advance(10_500);
    room.act('p1', { type: 'heir', target: 'p2' });
    room.advance(6_000);
    expect(pub(room)).toMatchObject({ round: 2, phase: 'divide' });
    split(room, ['p1', 'p2']);
    allReady(room);
    room.advance(10_500);
    room.act('p2', { type: 'heir', target: 'p3' });
    room.advance(6_000);
    expect(pub(room)).toMatchObject({ round: 3, phase: 'color' });
    expect(pv(room, 'p2').myColor).toBe('green');
    room.advance(30_000); // nobody answers: everyone keeps their colour
    expect(room.state().colors.p2).toBe('green');
  });

  it('completes an unfinished split at random with at least 2 per hall', () => {
    const room = playing({ players: 7, seed: 11 });
    elect(room, 'p1');
    colors(room);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) room.act('p1', { type: 'place', target: id, space: 'A' });
    room.act('p1', { type: 'confirm' }); // invalid: p7 unplaced, B empty
    expect(pub(room).phase).toBe('divide');
    room.advance(120_000);
    const spaces = Object.values(pub(room).spaces);
    expect(spaces).toHaveLength(7);
    expect(spaces.filter((s) => s === 'B').length).toBeGreaterThanOrEqual(2);
    expect(spaces.filter((s) => s === 'A').length).toBeGreaterThanOrEqual(2);
  });

  it('never crowns the same player twice', () => {
    const room = playing({ players: 5 });
    elect(room, 'p1');
    colors(room);
    split(room, ['p1', 'p2']);
    allReady(room);
    room.advance(10_500);
    expect(pub(room).heirs).toEqual(['p2', 'p3', 'p4', 'p5']);
    const before = room.snapshot();
    room.act('p1', { type: 'heir', target: 'p1' });
    room.act('p2', { type: 'heir', target: 'p3' }); // not the king
    expect(room.snapshot()).toBe(before);
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 5 });
    let before = room.snapshot();
    room.act('p1', null);
    room.act('p1', { type: 'nonsense' });
    room.act('p1', { type: 'vote', target: 'p99' });
    room.act('p1', { type: 'color', color: 'blue' }); // wrong phase
    room.act('p1', { type: 'place', target: 'p2', space: 'A' });
    expect(room.snapshot()).toBe(before);
    elect(room, 'p1');
    before = room.snapshot();
    room.act('p1', { type: 'color', color: 'red' });
    expect(room.snapshot()).toBe(before);
    colors(room);
    before = room.snapshot();
    room.act('p2', { type: 'place', target: 'p3', space: 'A' }); // not the king
    room.act('p1', { type: 'place', target: 'p3', space: 'C' });
    room.act('p1', { type: 'place', target: 'p99', space: 'A' });
    room.act('p1', { type: 'confirm' });
    room.act('p1', { type: 'pass' });
    expect(room.snapshot()).toBe(before);
  });

  describe('hidden information', () => {
    it('keeps colours, votes and points off the TV until the final reveal', () => {
      const room = playing({ players: 5 });
      room.act('p1', { type: 'vote', target: 'p2' });
      expect(pub(room).voted).toEqual(['p1']);
      expect(room.publicJson()).not.toContain('"votes"');
      expect(pv(room, 'p1').myVote).toBe('p2');
      expect(pv(room, 'p2').myVote).toBeNull();
      for (const id of room.ids) room.act(id, { type: 'vote', target: 'p2' });
      room.advance(6_000);
      colors(room, { p1: 'green' });
      split(room, ['p1', 'p2']);
      allReady(room);
      const json = room.publicJson();
      for (const secret of ['"colors"', '"scored"', '"scores"', '"myScore"']) expect(json).not.toContain(secret);
      expect(json).not.toMatch(/"p\d+":"(blue|green)"/);
      expect(pv(room, 'p1').myColor).toBe('green');
      expect(JSON.stringify(pv(room, 'p2'))).not.toContain('green');
      expect(JSON.stringify(pv(room, 'p2'))).not.toMatch(/"myScore":[1-9]/);
    });

    it('reveals every colour and score in the final phase', () => {
      const room = playing({ players: 5 });
      elect(room, 'p1');
      colors(room, { p1: 'green' });
      for (let r = 0; r < 200 && pub(room).phase !== 'final'; r++) room.advance(60_000);
      const final = pub(room).final!;
      expect(final.history).toHaveLength(5);
      expect(final.history[0]!.colors.p1).toBe('green');
      expect(Object.keys(final.scores)).toHaveLength(5);
    });

    it('in Dealer mode, the phone never shows the colour and only the Dealer does', () => {
      const room = playing({ players: 5, config: { colorMode: 'dealer' }, remote: ['p5'] });
      expect(room.playerFrame('p1')!.platform.canRequestDealer).toBe(false); // election
      elect(room, 'p1');
      expect(pub(room).phase).toBe('color');
      expect(room.playerFrame('p1')!.platform.canRequestDealer).toBe(true);
      // Choosing from the phone outside the Dealer does nothing.
      const before = room.snapshot();
      room.act('p2', { type: 'color', color: 'green' });
      expect(room.snapshot()).toBe(before);
      expect((room.enterDealer('p2') as DealerView).current).toBeNull();
      expect(pv(room, 'p2').visiting).toBe(true);
      room.act('p2', { type: 'color', color: 'green' });
      expect(room.state().colors.p2).toBe('green');
      expect(pv(room, 'p2').myColor).toBeNull();
      expect(room.playerFrame('p2')!.platform.canRequestDealer).toBe(false);
      // A remote player sees the Dealer view on their phone.
      const remote = room.enterDealer('p5') as DealerView;
      expect(remote).toMatchObject({ round: 1, current: null });
      room.act('p5', { type: 'color', color: 'blue' });
      for (const id of ['p1', 'p3']) room.visitDealer(id); // visited without choosing
      expect(pub(room).phase).toBe('color');
      room.visitDealer('p4');
      expect(pub(room).phase).toBe('divide'); // everyone has been
      expect(Object.keys(room.state().colors)).toHaveLength(5);
    });

    it('in Dealer mode, the second window shows the current colour at the Dealer', () => {
      const room = playing({ players: 5, config: { colorMode: 'dealer' } });
      elect(room, 'p1');
      room.enterDealer('p2');
      room.act('p2', { type: 'color', color: 'green' });
      room.advance(300_000);
      for (let r = 0; r < 200 && !(pub(room).phase === 'color' && pub(room).round === 3); r++) room.advance(5_000);
      expect(pub(room).round).toBe(3);
      expect((room.enterDealer('p2') as DealerView).current).toBe('green');
    });
  });

  describe('disconnects', () => {
    it('pauses, then drops the player from the halls and the throne line', () => {
      const room = playing({ players: 6 });
      elect(room, 'p1');
      colors(room);
      room.disconnect('p6');
      expect(room.publicPlatform().paused).toBeTruthy();
      room.advance(20_001);
      expect(pub(room).active).not.toContain('p6');
      split(room, ['p1', 'p2']);
      expect(pub(room).spaces.p6).toBeUndefined();
      allReady(room);
      room.advance(10_500);
      expect(pub(room).heirs).not.toContain('p6');
      expect(pub(room).rounds).toBe(5);
    });

    it('finishes a departed king’s split at random', () => {
      const room = playing({ players: 6 });
      elect(room, 'p1');
      colors(room);
      room.disconnect('p1');
      room.advance(20_001);
      expect(pub(room).phase).toBe('pass');
      expect(Object.keys(pub(room).spaces)).toHaveLength(5);
    });

    it('ends the match when fewer than 4 players remain', () => {
      const room = playing({ players: 5 });
      elect(room, 'p1');
      room.disconnect('p5');
      room.advance(20_001);
      room.disconnect('p4');
      room.advance(20_001);
      expect(pub(room).phase).toBe('final');
    });
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'election' });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('election');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('election');
    expect(pub(room).active).not.toContain('p1');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 5 });
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
