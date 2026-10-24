import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { CREDITS, RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** The whole in-person touch: request, accept, both type the other's code. */
function touch(room: Room, a: string, b: string) {
  room.act(a, { type: 'touch', target: b });
  room.act(b, { type: 'accept' });
  const codeA = phone(room, a).request!.myCode!;
  const codeB = phone(room, b).request!.myCode!;
  room.act(a, { type: 'code', value: codeB });
  room.act(b, { type: 'code', value: codeA });
}

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(1);
    room.act('p1', { type: 'intro', dir: -1 });
    room.act('p1', { type: 'intro', dir: -1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).phase).toBe('roles');
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(true);
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('roles');
  });

  it('starts on its own if the Host never advances it', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.advance(5 * 60_000);
    expect(pub(room).phase).toBe('roles');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('roles');
  });

  it('goes straight to the roles when the Host turns it off', () => {
    const room = createTestRoom<State>(game, { players: 5, config: { tutorial: false } });
    expect(pub(room)).toMatchObject({ phase: 'roles', hint: null });
  });

  it('coaches round 1 with hints from the state, and only round 1', () => {
    const room = createTestRoom<State>(game, { players: 6, config: { roleReveal: 'phone', intervalSec: 0 } });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).hint).toBeNull();
    for (const id of room.ids) room.act(id, { type: 'seen' });
    expect(pub(room)).toMatchObject({ phase: 'round', hint: 'touch' });
    touch(room, 'p1', 'p2');
    expect(pub(room).hint).toBe('idle');
    touch(room, 'p3', 'p4');
    touch(room, 'p5', 'p6');
    expect(pub(room).hint).toBe('cure');
    // Everyone touched and only one Zombie started, so Humans remain and round 2 follows.
    room.advance(8 * 60_000);
    expect(pub(room)).toMatchObject({ phase: 'interval', hint: null });
    room.advance(8_000);
    expect(pub(room)).toMatchObject({ phase: 'round', round: 2, hint: null });
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    room.act('p1', { type: 'tvRules', page: -1 });
    room.act('p1', { type: 'tvRules', page: 1.5 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    expect(phone(room, 'p3').tvRules).toBe(1);
    // It stays over the board during play, and the Host closes it.
    room.act('p1', { type: 'intro', dir: 'skip' });
    room.act('p1', { type: 'tvRules', page: 2 });
    expect(pub(room)).toMatchObject({ phase: 'roles', tvRules: 2 });
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
    expect(CREDITS?.['pt-BR']).toContain('The Genius');
    expect(CREDITS?.en).toContain('The Genius');
  });
});
