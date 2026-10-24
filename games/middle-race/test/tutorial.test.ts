import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type State } from '../src/logic.ts';
import { HINTS, RULES, SLIDES } from '../src/texts.ts';
import { pub, pv, toRace, type Room } from './helpers.ts';

const room11 = (config: { tutorial?: boolean } = {}) => createTestRoom<State>(game, { players: 11, config }) as Room;

describe('Middle Race — tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances, then goes to the setup', () => {
    const room = room11();
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    room.act('p1', { type: 'intro', dir: 1 });
    room.act('p1', { type: 'intro', dir: -1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).phase).toBe('setup');
  });

  it('lets the Host skip the tutorial', () => {
    const room = room11();
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('setup');
  });

  it('moves on to the setup if the Host leaves during the tutorial', () => {
    const room = room11();
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('setup');
  });

  it('moves on by itself if nobody advances the tutorial for 5 minutes', () => {
    const room = room11();
    room.advance(5 * 60_000);
    expect(pub(room).phase).toBe('setup');
  });

  it('starts at the setup when the tutorial option is off', () => {
    expect(pub(room11({ tutorial: false })).phase).toBe('setup');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = room11();
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    room.act('p1', { type: 'tvRules', page: -1 });
    room.act('p1', { type: 'tvRules', page: 1.5 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 3 });
    expect(pub(room).tvRules).toBe(3);
    expect(pv(room, 'p5').tvRules).toBe(3);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('gives first-round hints only while the tutorial option is on', () => {
    const on = room11();
    on.act('p1', { type: 'intro', dir: 'skip' });
    on.act('p1', { type: 'start' });
    toRace(on);
    expect(pub(on).hint).toBe('turn');

    const off = room11({ tutorial: false });
    off.act('p1', { type: 'start' });
    toRace(off);
    expect(pub(off).race).not.toBeNull();
    expect(pub(off).hint).toBeNull();
  });

  it('has the tutorial, every rules page and every hint in both languages', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
    for (const h of Object.values(HINTS)) expect(h['pt-BR'] && h.en).toBeTruthy();
    expect(SLIDES.length).toBeGreaterThanOrEqual(3);
    expect(SLIDES.length).toBeLessThanOrEqual(6);
  });
});
