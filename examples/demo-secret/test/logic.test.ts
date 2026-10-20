import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type DealerView, type PlayerView, type PublicView, type State } from '../src/logic.ts';

function visitAll(room: ReturnType<typeof createTestRoom<State>>) {
  return Object.fromEntries(room.ids.map((id) => [id, (room.visitDealer(id) as DealerView).number]));
}

describe('Número Secreto', () => {
  it('plays a full match to the results', () => {
    const room = createTestRoom(game, { players: 3, config: { rounds: 1 } });
    visitAll(room);
    expect((room.publicView() as PublicView).phase).toBe('discuss');

    room.advance(60_000);
    expect((room.publicView() as PublicView).phase).toBe('vote');

    const winner = Object.entries(room.state().numbers).sort((a, b) => b[1] - a[1])[0]![0];
    for (const id of room.ids)
      room.act(id, { type: 'vote', target: id === winner ? room.ids.find((x) => x !== id) : winner });
    expect((room.publicView() as PublicView).phase).toBe('reveal');

    room.advance(12_000);
    expect(room.phase()).toBe('results');
    expect(room.results()).toHaveLength(3);
  });

  it('shows each secret only on the Dealer screen, to its owner', () => {
    const room = createTestRoom(game, { players: 4 });
    const seen = visitAll(room);
    expect(seen).toEqual(room.state().numbers);

    for (const n of Object.values(seen)) {
      expect(room.publicJson()).not.toMatch(new RegExp(`"number":${n}\\b`));
    }
    for (const id of room.ids) {
      const phone = room.playerView(id) as PlayerView;
      expect(phone.revealedNumber).toBeNull();
      expect(JSON.stringify(phone)).not.toContain('"numbers"');
    }
  });

  it('lets each player visit the Dealer once per round', () => {
    const room = createTestRoom(game, { players: 2 });
    room.visitDealer('p1');
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
    expect(room.playerFrame('p2')?.platform.canRequestDealer).toBe(true);
  });

  it('remote players see their number on their own phone', () => {
    const room = createTestRoom(game, { players: 2, remote: ['p2'] });
    const seen = room.enterDealer('p2') as DealerView;
    expect(seen.number).toBe(room.state().numbers['p2']);
    expect(room.dealerFrame()?.game).toBeNull();
  });

  it('a player who drops during the visit phase plays blind after the grace period', () => {
    const room = createTestRoom(game, { players: 3 });
    room.visitDealer('p1');
    room.visitDealer('p2');
    room.disconnect('p3');
    expect(room.publicPlatform().paused?.playerId).toBe('p3');
    room.advance(20_001);
    expect((room.publicView() as PublicView).phase).toBe('discuss');
  });

  it('refuses to start below the minimum player count', () => {
    expect(() => createTestRoom(game, { players: 1 })).toThrow(/did not start/);
  });
});
