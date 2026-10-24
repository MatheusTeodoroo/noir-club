import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type PublicView, type State } from '../src/logic.ts';
import { CREDITS, RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length, question: null });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(1);
    room.act('p1', { type: 'intro', dir: -1 });
    expect(pub(room).slide).toBe(0);
    room.act('p1', { type: 'intro', dir: -1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'category', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room)).toMatchObject({ phase: 'category', round: 1 });
  });

  it('starts on its own if the Host never advances it', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.advance(5 * 60_000);
    expect(pub(room).phase).toBe('category');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('category');
    // The Host is gone, so someone else holds the opening.
    expect(pub(room).turn).not.toBe('p1');
  });

  it('skips the tutorial when the Host turns it off', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    expect(pub(room)).toMatchObject({ phase: 'category', hint: null });
  });

  it('coaches the first round with hints while the tutorial is on', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).hint).toBe('category');
    room.act(pub(room).starter, { type: 'category', index: 0 });
    expect(pub(room).hint).toBe('open');
    room.act(pub(room).turn, { type: 'guess', value: 0 });
    expect(pub(room).hint).toBe('raise');
    room.act(pub(room).turn, { type: 'doubt' });
    expect(pub(room).hint).toBeNull();
    room.advance(20_000);
    expect(pub(room)).toMatchObject({ round: 2, hint: null });
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    room.act('p1', { type: 'tvRules', page: -1 });
    room.act('p1', { type: 'tvRules', page: 1.5 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    // It stays over the board during play, and the Host closes it.
    room.act('p1', { type: 'intro', dir: 'skip' });
    room.act('p1', { type: 'tvRules', page: 2 });
    expect(pub(room)).toMatchObject({ phase: 'category', tvRules: 2 });
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('has the tutorial, every rules page and the credits in both languages', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
    expect(CREDITS?.['pt-BR']).toContain('Rodrigo Rego');
    expect(CREDITS?.en).toContain('Rodrigo Rego');
  });
});
