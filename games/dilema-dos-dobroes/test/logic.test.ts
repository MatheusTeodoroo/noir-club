import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type DealerView, type PlayerView, type PublicView, type State } from '../src/logic.ts';
import type { Team } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const me = (room: Room, id: string) => room.playerView(id) as PlayerView;
const ROUND_MS = 15 * 60_000;

/** A room already in round 1 (tutorial off, teams shown). */
function playing(opts: TestRoomOptions = {}) {
  const room = createTestRoom<State>(game, { players: 4, ...opts, config: { tutorial: false, ...opts.config } });
  room.advance(10_000);
  return room;
}

const team = (room: Room, t: Team) => room.ids.filter((id) => room.state().teams[id] === t);

function deposit(room: Room, id: string, amount: number) {
  room.enterDealer(id);
  room.act(id, { type: 'deposit', amount });
}

/** Everyone still to play on `t` deposits `amount` each; everyone else deposits 0. */
function teamRound(room: Room, t: Team, amount: number) {
  for (const id of room.ids.filter((x) => !room.state().done.includes(x))) {
    deposit(room, id, room.state().teams[id] === t ? amount : 0);
  }
}

describe(game.manifest.name['pt-BR'], () => {
  it('only starts with an even number of players', () => {
    expect(() => createTestRoom<State>(game, { players: 5 })).toThrow(/did not start/);
    expect(createTestRoom<State>(game, { players: 6 }).phase()).toBe('playing');
  });

  it('draws two equal, public teams before round 1', () => {
    const room = createTestRoom<State>(game, { players: 6, config: { tutorial: false } });
    expect(pub(room).phase).toBe('teams');
    expect(team(room, 'gold')).toHaveLength(3);
    expect(team(room, 'crimson')).toHaveLength(3);
    expect(pub(room).teams).toEqual(room.state().teams);
    room.advance(10_000);
    expect(pub(room)).toMatchObject({ phase: 'deposit', round: 1 });
  });

  for (const players of [4, 12]) {
    it(`plays a full match to the results with ${players} players`, () => {
      const room = playing({ players });
      for (let round = 1; round <= 3; round++) {
        expect(pub(room)).toMatchObject({ phase: 'deposit', round });
        teamRound(room, 'gold', 1);
        expect(pub(room).phase).toBe('reveal');
        expect(pub(room).reveal).toMatchObject({ winner: 'gold', loserTotal: 0, winnerTotal: null });
        room.advance(12_000);
      }
      expect(pub(room).phase).toBe('final');
      expect(pub(room).final).toMatchObject({ winner: 'gold', reason: 'wins' });
      room.advance(25_000);
      expect(room.phase()).toBe('results');
    });
  }

  it('keeps balances, deposits and the winning total secret', () => {
    const room = playing();
    const [g1, g2] = team(room, 'gold');
    const [c1, c2] = team(room, 'crimson');
    deposit(room, g1!, 7);
    expect(room.publicJson()).not.toMatch(/"balances"|"deposits"|"draft"|"totals"/);
    expect(pub(room).done).toEqual([g1]);
    for (const id of room.ids) expect(JSON.stringify(me(room, id))).not.toContain('"max"');
    deposit(room, g2!, 2);
    deposit(room, c1!, 4);
    deposit(room, c2!, 1);
    // Gold 9 × Crimson 5: the loser's total is public, the winner's is not.
    expect(pub(room).reveal).toEqual({ round: 1, winner: 'gold', loserTotal: 5, winnerTotal: null });
    expect(room.publicJson()).not.toContain('"balances"');
    expect(JSON.stringify(pub(room).history)).not.toContain('9');
    room.advance(12_000);
    teamRound(room, 'gold', 1);
    room.advance(12_000);
    teamRound(room, 'gold', 1);
    room.advance(12_000);
    // The final reveal opens everything.
    expect(pub(room).history[0]).toEqual({ round: 1, winner: 'gold', loserTotal: 5, winnerTotal: 9 });
    expect(pub(room).final?.balances[g1!]).toBe(1);
  });

  it('shows the visitor their balance and choice at the Dealer, and the stepper limit only to them', () => {
    const room = playing();
    deposit(room, 'p1', 3);
    expect(room.enterDealer('p2') as DealerView).toMatchObject({ balance: 10, draft: 0 });
    room.act('p2', { type: 'draft', amount: 4 });
    expect((room.dealerView() as DealerView).draft).toBe(4);
    expect(me(room, 'p2').visit).toMatchObject({ max: 10, draft: 4 });
    for (const id of ['p1', 'p3', 'p4']) expect(me(room, id).visit).toBeNull();
  });

  it('lets only players who have not deposited queue for the Dealer, and only during deposits', () => {
    const room = createTestRoom<State>(game, { players: 4, config: { tutorial: false } });
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
    room.advance(10_000);
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(true);
    deposit(room, 'p1', 2);
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
    expect(room.playerFrame('p2')?.platform.canRequestDealer).toBe(true);
  });

  it('remote players see the Dealer on their own phone', () => {
    const room = playing({ remote: ['p3'] });
    const seen = room.enterDealer('p3') as DealerView;
    expect(seen.balance).toBe(10);
    room.act('p3', { type: 'deposit', amount: 6 });
    expect(room.state().balances['p3']).toBe(4);
  });

  it('timers drive the match to the end with nobody acting (ties pile up)', () => {
    const room = playing();
    for (let tie = 1; tie <= 3; tie++) {
      expect(pub(room)).toMatchObject({ phase: 'deposit', round: 1 });
      room.advance(ROUND_MS);
      expect(pub(room).reveal).toMatchObject({ winner: null, loserTotal: null });
      room.advance(12_000);
    }
    expect(pub(room).final).toMatchObject({ winner: null, reason: 'ties' });
    room.advance(25_000);
    expect(room.phase()).toBe('results');
    expect(room.results()?.every((r) => r.score === 0)).toBe(true);
  });

  it('ends the round as soon as everyone has deposited', () => {
    const room = playing();
    teamRound(room, 'crimson', 2);
    expect(pub(room)).toMatchObject({ phase: 'reveal', reveal: { winner: 'crimson', loserTotal: 0 } });
  });

  it('a tie refunds every deposit and replays the round without counting it', () => {
    const room = playing();
    const [g1, g2] = team(room, 'gold');
    const [c1, c2] = team(room, 'crimson');
    deposit(room, g1!, 3);
    deposit(room, g2!, 1);
    deposit(room, c1!, 2);
    deposit(room, c2!, 2);
    expect(pub(room).reveal).toEqual({ round: 1, winner: null, loserTotal: null, winnerTotal: null });
    expect(Object.values(room.state().balances)).toEqual([10, 10, 10, 10]);
    room.advance(12_000);
    expect(pub(room)).toMatchObject({ phase: 'deposit', round: 1, ties: 1, wins: { gold: 0, crimson: 0 } });
  });

  it('ends at once when both teams are broke, as a draw on equal wins', () => {
    const room = playing();
    const [g1, g2] = team(room, 'gold');
    const [c1, c2] = team(room, 'crimson');
    deposit(room, g1!, 10);
    deposit(room, g2!, 10);
    deposit(room, c1!, 10);
    deposit(room, c2!, 9);
    room.advance(12_000);
    deposit(room, g1!, 0);
    deposit(room, g2!, 0);
    deposit(room, c1!, 0);
    deposit(room, c2!, 1);
    room.advance(12_000);
    expect(pub(room).final).toMatchObject({ winner: null, reason: 'broke' });
    room.advance(25_000);
    expect(room.results()?.every((r) => r.score === 0)).toBe(true);
  });

  it('ranks the winners first by balance, shares equal places and scores N − place + 1', () => {
    const room = playing({ players: 6 });
    const [g1, g2, g3] = team(room, 'gold');
    const [c1, c2, c3] = team(room, 'crimson');
    // Three gold wins: g1 spends 1, g2 spends 3, g3 spends 3; crimson spends 0, 2, 2 in total.
    const plan: [string, number][][] = [
      [[g1!, 1], [g2!, 1], [g3!, 1], [c1!, 0], [c2!, 1], [c3!, 1]],
      [[g1!, 0], [g2!, 1], [g3!, 1], [c1!, 0], [c2!, 1], [c3!, 0]],
      [[g1!, 0], [g2!, 1], [g3!, 1], [c1!, 0], [c2!, 0], [c3!, 1]],
    ];
    for (const round of plan) {
      for (const [id, amount] of round) deposit(room, id, amount);
      expect(pub(room).reveal?.winner).toBe('gold');
      room.advance(12_000);
    }
    const places = Object.fromEntries(pub(room).final!.placements.map((p) => [p.playerId, [p.place, p.points]]));
    expect(places).toEqual({
      [g1!]: [1, 6],
      [g2!]: [2, 5],
      [g3!]: [2, 5],
      [c1!]: [4, 3],
      [c2!]: [5, 2],
      [c3!]: [5, 2],
    });
    expect(me(room, g1!)).toMatchObject({ myBalance: 9, placement: { place: 1, points: 6 } });
    room.advance(25_000);
    expect(room.results()?.[0]).toEqual({ playerId: g1, score: 6 });
  });

  it('sends a stalling visitor out after the visit time, with a deposit of 0', () => {
    const room = playing({ config: { visitSeconds: 30 } });
    room.enterDealer('p1');
    room.act('p1', { type: 'draft', amount: 5 });
    room.advance(30_000);
    expect(room.dealerFrame()?.current).not.toBe('p1');
    expect(pub(room).done).toContain('p1');
    expect(room.state().balances['p1']).toBe(10);
    expect(room.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
  });

  it('leaving the Dealer without confirming counts as a deposit of 0', () => {
    const room = playing();
    room.enterDealer('p2');
    room.leaveDealer('p2');
    expect(pub(room).done).toEqual(['p2']);
    expect(room.state().balances['p2']).toBe(10);
  });

  it('a player still at the Dealer when the round ends is sent out with 0', () => {
    const room = playing({ config: { roundMinutes: 5, visitSeconds: 60 } });
    room.advance(5 * 60_000 - 10_000);
    room.enterDealer('p1');
    room.act('p1', { type: 'draft', amount: 3 });
    room.advance(10_000);
    expect(pub(room).phase).toBe('reveal');
    expect(room.dealerFrame()?.current ?? null).toBeNull();
    expect(room.state().balances['p1']).toBe(10);
  });

  it('ignores invalid actions', () => {
    const room = playing();
    let before = room.snapshot();
    room.act('p1', { type: 'deposit', amount: 3 }); // not at the Dealer
    room.act('p1', { type: 'draft', amount: 3 });
    room.act('p1', { type: 'nonsense' });
    room.act('p1', null);
    room.act('p2', { type: 'intro', dir: 1 });
    expect(room.snapshot()).toBe(before);

    room.enterDealer('p1');
    before = room.snapshot();
    room.act('p1', { type: 'deposit', amount: 11 });
    room.act('p1', { type: 'deposit', amount: -1 });
    room.act('p1', { type: 'deposit', amount: 2.5 });
    room.act('p1', { type: 'deposit', amount: '3' });
    room.act('p2', { type: 'deposit', amount: 3 }); // someone else is inside
    room.act('p2', { type: 'draft', amount: 3 });
    expect(room.snapshot()).toBe(before);

    room.act('p1', { type: 'deposit', amount: 4 });
    before = room.snapshot();
    room.act('p1', { type: 'deposit', amount: 4 }); // only once per round
    expect(room.snapshot()).toBe(before);
  });

  it('a player who drops deposits 0 and the round does not wait for them', () => {
    const room = playing();
    deposit(room, 'p1', 1);
    deposit(room, 'p2', 1);
    deposit(room, 'p3', 1);
    room.disconnect('p4');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).phase).toBe('reveal');
    expect(room.state().balances['p4']).toBe(10);
  });

  it('a player still gone at the next round starts it already done', () => {
    const room = playing();
    room.disconnect('p4');
    room.advance(20_001);
    teamRound(room, 'gold', 1);
    expect(pub(room).phase).toBe('reveal');
    room.advance(12_000);
    expect(pub(room).done).toEqual(['p4']);
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 4 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).phase).toBe('teams');
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 4 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('teams');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 4 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('teams');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 4 });
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
