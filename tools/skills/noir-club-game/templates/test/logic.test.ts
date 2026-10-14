import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';

const pub = (room: { publicView(): unknown }) => room.publicView() as PublicView;

describe(game.manifest.name['pt-BR'], () => {
  it('plays every round to the final results', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { rounds: 2 } });
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
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p1', { type: 'pick', value: 4 });
    expect(pub(room).picked).toEqual(['p1']);
    expect(room.publicJson()).not.toContain('"picks"');
    expect((room.playerView('p1') as PlayerView).myPick).toBe(4);
    expect((room.playerView('p2') as PlayerView).myPick).toBeNull();
  });

  it('reveals when the timer runs out even if someone did not pick', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { pickSeconds: 20 } });
    room.act('p1', { type: 'pick', value: 2 });
    room.advance(20_000);
    expect(pub(room).phase).toBe('reveal');
  });

  it('does not wait for a player who dropped', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p1', { type: 'pick', value: 1 });
    room.act('p2', { type: 'pick', value: 2 });
    room.disconnect('p3');
    room.advance(20_001); // platform grace period, then onPlayerTimeout
    expect(pub(room).phase).toBe('reveal');
  });

  it('ignores invalid actions', () => {
    const room = createTestRoom<State>(game, { players: 2 });
    const before = room.snapshot();
    room.act('p1', { type: 'pick', value: 9 });
    room.act('p1', { type: 'pick', value: 2.5 });
    room.act('p1', { type: 'nonsense' });
    room.act('p1', null);
    expect(room.snapshot()).toBe(before);
  });
});
