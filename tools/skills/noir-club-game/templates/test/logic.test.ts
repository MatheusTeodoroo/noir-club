import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { RULES, SLIDES } from '../src/texts.ts';

const pub = (room: { publicView(): unknown }) => room.publicView() as PublicView;

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

describe(game.manifest.name['pt-BR'], () => {
  it('plays every round to the final results', () => {
    const room = playing({ players: 3, config: { rounds: 2 } });
    for (let round = 1; round <= 2; round++) {
      expect(pub(room)).toMatchObject({ phase: 'pick', round });
      room.act('p1', { type: 'pick', value: 5 });
      room.act('p2', { type: 'pick', value: 5 });
      room.act('p3', { type: 'pick', value: 3 });
      expect(pub(room).reveal).toMatchObject({ winnerId: 'p3', points: 3 });
      room.advance(8_000);
    }
    expect(room.phase()).toBe('results');
    expect(room.results()?.[0]).toEqual({ playerId: 'p3', score: 6 });
  });

  it('keeps picks secret until the reveal', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'pick', value: 4 });
    expect(pub(room).picked).toEqual(['p1']);
    expect(room.publicJson()).not.toContain('"picks"');
    expect((room.playerView('p1') as PlayerView).myPick).toBe(4);
    expect((room.playerView('p2') as PlayerView).myPick).toBeNull();
  });

  it('reveals when the timer runs out even if someone did not pick', () => {
    const room = playing({ players: 3, config: { pickSeconds: 20 } });
    room.act('p1', { type: 'pick', value: 2 });
    room.advance(20_000);
    expect(pub(room).phase).toBe('reveal');
  });

  it('does not wait for a player who dropped', () => {
    const room = playing({ players: 3 });
    room.act('p1', { type: 'pick', value: 1 });
    room.act('p2', { type: 'pick', value: 2 });
    room.disconnect('p3');
    room.advance(20_001); // platform grace period, then onPlayerTimeout
    expect(pub(room).phase).toBe('reveal');
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 2 });
    const before = room.snapshot();
    room.act('p1', { type: 'pick', value: 9 });
    room.act('p1', { type: 'pick', value: 2.5 });
    room.act('p1', { type: 'nonsense' });
    room.act('p1', null);
    expect(room.snapshot()).toBe(before);
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'pick', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 2 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('pick');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('pick');
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
