import { describe, expect, it, vi } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import type { PlayerView, PublicView, State } from '../src/logic.ts';

// A small fake bank: 7 categories ("C0".."C6") with 1 question each (answer 10 × index + 10).
vi.mock('../src/questions/index.ts', () => ({
  CATEGORIES: Array.from({ length: 7 }, (_, c) => ({
    name: { 'pt-BR': `C${c}`, en: `C${c}` },
    questions: [
      {
        text: { 'pt-BR': `Q${c}`, en: `Q${c}` },
        answer: 10 * c + 10,
        unit: { 'pt-BR': 'u', en: 'u' },
      },
    ],
  })),
}));

const { default: game } = await import('../src/logic.ts');

type Room = ReturnType<typeof createTestRoom<State>>;
/** Gameplay tests start past the tutorial (covered in tutorial.test.ts). */
const newRoom = (opts: NonNullable<Parameters<typeof createTestRoom<State>>[1]>) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });
const pub = (room: Room) => room.publicView() as PublicView;

describe('category choice', () => {
  it('the starter picks one of the drawn categories', () => {
    const room = newRoom({ players: 3 });
    const view = pub(room);
    expect(view.phase).toBe('category');
    expect(view.options).toHaveLength(5);
    expect(view.question).toBeNull();
    const starter = view.starter;
    expect((room.playerView(starter) as PlayerView).isTurn).toBe(true);
    // Someone else cannot pick.
    const other = room.ids.find((id) => id !== starter)!;
    const before = room.snapshot();
    room.act(other, { type: 'category', index: 0 });
    room.act(starter, { type: 'category', index: 5 });
    expect(room.snapshot()).toBe(before);

    const chosen = view.options[2]!;
    room.act(starter, { type: 'category', index: 2 });
    expect(pub(room)).toMatchObject({
      phase: 'guess',
      category: chosen,
      turn: starter,
      options: [],
    });
    expect(pub(room).question?.text['pt-BR']).toBe(`Q${chosen['pt-BR'].slice(1)}`);
  });

  it('honours the number of choices set by the Host', () => {
    const room = newRoom({
      players: 3,
      config: { categoryChoices: 3 },
    });
    expect(pub(room).options).toHaveLength(3);
  });

  it('a turn timeout picks a category for the starter', () => {
    const room = newRoom({
      players: 3,
      config: { turnSeconds: 15 },
    });
    room.advance(15_000);
    expect(pub(room).phase).toBe('guess');
    expect(pub(room).category).not.toBeNull();
  });

  it('offers only categories with unused questions and ends when the bank runs dry', () => {
    const room = newRoom({
      players: 3,
      config: { rounds: 30 },
    });
    const played: string[] = [];
    for (let round = 1; round <= 7; round++) {
      const view = pub(room);
      if (view.phase === 'category') {
        for (const o of view.options) expect(played).not.toContain(o['pt-BR']);
        room.act(view.starter, { type: 'category', index: 0 });
      }
      played.push(pub(room).category!['pt-BR']);
      room.act(pub(room).turn, { type: 'guess', value: 0 });
      room.act(pub(room).turn, { type: 'doubt' });
      room.advance(20_000);
    }
    expect(new Set(played).size).toBe(7);
    expect(room.phase()).toBe('results');
  });
});
