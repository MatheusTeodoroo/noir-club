import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type State } from '../src/logic.ts';
import { DELETE, FAST, GRAVITY } from '../src/shared.ts';
import { newRoom, ownerOf, pickAll, pub, pv, resolveVotes, runOut, toRace } from './helpers.ts';

describe('Middle Race', () => {
  it('plays a full match with 11 players to the results', () => {
    const room = newRoom();
    expect(pub(room).phase).toBe('read');
    toRace(room);
    expect(pub(room).phase).toBe('race');
    expect(pub(room).race!.turn).toBe(GRAVITY);
    runOut(room);
    expect(room.phase()).toBe('results');
    const results = room.results()!;
    expect(results).toHaveLength(11);
    const total = results.reduce((n, r) => n + r.score, 0);
    expect(total).toBe(10 + 2 * (7 + 5 + 3 + 1));
  });

  it('scores by distance from 6th place', () => {
    const room = newRoom();
    toRace(room);
    runOut(room);
    const s = room.state();
    const finish = s.race!.finish;
    const scoreOf = (cls: number) => room.results()!.find((r) => r.playerId === s.owner[cls])!.score;
    expect(scoreOf(finish[5]!)).toBe(10);
    expect(scoreOf(finish[4]!)).toBe(7);
    expect(scoreOf(finish[6]!)).toBe(7);
    expect(scoreOf(finish[0]!)).toBe(0);
    expect(scoreOf(finish[10]!)).toBe(0);
  });

  it('only the Host configures, and values are clamped', () => {
    const room = createTestRoom<State>(game, { players: 11, config: { tutorial: false } });
    room.act('p2', { type: 'setup', patch: { columns: 20 } });
    expect(pub(room).setup.columns).toBe(32);
    room.act('p1', { type: 'setup', patch: { columns: 999, readOn: false, turnSec: 17 } });
    expect(pub(room).setup).toMatchObject({ columns: 48, readOn: false, turnSec: 15 });
    room.act('p2', { type: 'start' });
    expect(pub(room).phase).toBe('setup');
    room.act('p1', { type: 'start' });
    expect(pub(room).phase).toBe('vote'); // reading time switched off
  });

  it('runs the reading, strategy and pause timers, and each ends early when everyone is ready', () => {
    const room = newRoom({ pauseEvery: 1 });
    for (const id of room.ids) room.act(id, { type: 'ready' });
    expect(pub(room).phase).toBe('vote');
    resolveVotes(room);
    pickAll(room);
    expect(pub(room).phase).toBe('strategy');
    for (const id of room.ids) room.act(id, { type: 'ready' });
    expect(pub(room).phase).toBe('strategy'); // Swift must choose its backward cards first
    room.act(ownerOf(room, FAST), { type: 'fastBack', cards: [2, 4] });
    room.act(ownerOf(room, FAST), { type: 'ready' });
    expect(pub(room).phase).toBe('race');
    for (let i = 0; i < 500 && pub(room).phase === 'race'; i++) room.advance(5_000);
    expect(pub(room).phase).toBe('pause');
    expect(pub(room).race!.round).toBe(2);
    for (const id of room.ids) room.act(id, { type: 'ready' });
    expect(pub(room).phase).toBe('race');
  });

  it('timers alone move through reading, picking, strategy and the race', () => {
    const room = newRoom({ pauseOn: false });
    room.advance(90_000);
    expect(pub(room).phase).toBe('vote');
    resolveVotes(room);
    for (let i = 0; i < 11; i++) room.advance(30_000);
    expect(pub(room).phase).toBe('strategy');
    expect(Object.keys(pub(room).owner)).toHaveLength(11);
    room.advance(120_000);
    expect(pub(room).phase).toBe('race');
    runOut(room);
    expect(room.phase()).toBe('results');
  });

  it('repeats a vote while it stays tied', () => {
    const room = newRoom({ readOn: false });
    const first = pub(room).vote!;
    room.advance(45_000); // nobody voted: everyone tied
    room.advance(6_000);
    expect(pub(room).phase).toBe('vote');
    expect(pub(room).vote!.cands).toEqual(first.cands);
    expect(pub(room).vote!.no).toBe(2);
  });

  it('places the most voted last and votes the ties again, later slots first', () => {
    const room = newRoom({ readOn: false });
    const votes: Record<string, string> = {
      p1: 'p1', p2: 'p1', p3: 'p1', p4: 'p1', p5: 'p2', p6: 'p2', p7: 'p2', p8: 'p3', p9: 'p3', p10: 'p3', p11: 'p4',
    };
    for (const [voter, target] of Object.entries(votes)) room.act(voter, { type: 'vote', target });
    expect(pub(room).phase).toBe('voteResult');
    expect(pub(room).vote!.result!.counts).toMatchObject({ p1: 4, p2: 3, p3: 3, p4: 1, p5: 0 });
    expect(pub(room).vote!.order[10]).toBe('p1');
    expect(pub(room).vote!.order[7]).toBe('p4');
    room.advance(6_000);
    expect(pub(room).vote!).toMatchObject({ cands: ['p2', 'p3'], lo: 9, hi: 10 });
  });

  it('keeps hands, votes and Swift\'s backward cards secret', () => {
    const room = newRoom({ readOn: false });
    room.act('p3', { type: 'vote', target: 'p5' });
    expect(room.publicJson()).not.toContain('ballots');
    expect(pub(room).vote!.voted).toEqual(['p3']);
    expect(pv(room, 'p3').vote!.myVote).toBe('p5');
    expect(pv(room, 'p4').vote!.myVote).toBeNull();
    for (const id of room.ids) room.act(id, { type: 'vote', target: 'p5' });
    expect(room.publicJson()).not.toContain('"p3":"p5"');

    resolveVotes(room);
    pickAll(room);
    const fast = ownerOf(room, FAST);
    room.act(fast, { type: 'fastBack', cards: [3, 4] });
    expect(pv(room, fast).fastBack).toEqual([3, 4]);
    for (const id of room.ids) if (id !== fast) expect(pv(room, id).fastBack).toBeNull();
    expect(room.publicJson()).not.toContain('fastBack');
    for (const id of room.ids) room.act(id, { type: 'ready' });

    const json = room.publicJson();
    expect(json).not.toMatch(/"hand":/);
    expect(json).not.toMatch(/"options":/);
    const g = ownerOf(room, GRAVITY);
    expect(pv(room, g).race!.hand).toEqual([1, 2, 3, 4]);
    expect(pv(room, g).race!.turn).not.toBeNull();
    expect(pv(room, ownerOf(room, DELETE)).race!.turn).toBeNull();
  });

  it('shows Delete\'s choice of cards only to Delete', () => {
    const room = newRoom({ readOn: false });
    toRace(room);
    const s = room.state();
    // Gravity pulls Delete: place them so Delete is ahead.
    s.race!.runners[DELETE]!.pos = 10;
    s.race!.runners[DELETE]!.moved = true;
    const g = ownerOf(room, GRAVITY);
    room.act(g, { type: 'turn', card: 2, gravity: DELETE });
    room.advance(1_200);
    const del = ownerOf(room, DELETE);
    expect(pv(room, del).race!.prompt?.kind).toBe('deleteTarget');
    const target = pv(room, del).race!.prompt!.options[0]!;
    room.act(del, { type: 'answer', value: target });
    expect(pv(room, del).race!.prompt?.kind).toBe('deleteKeep');
    for (const id of room.ids) if (id !== del) expect(pv(room, id).race!.prompt).toBeNull();
    expect(room.publicJson()).not.toMatch(/"options":/); // TV sees who decides, never the cards
  });

  it('ignores invalid actions', () => {
    const room = newRoom({ readOn: false });
    toRace(room);
    const g = ownerOf(room, GRAVITY);
    const other = ownerOf(room, 5);
    const before = room.snapshot();
    room.act(other, { type: 'turn', card: 1 }); // not their turn
    room.act(g, { type: 'turn', card: 9 });
    room.act(g, { type: 'turn', card: 2, double: true }); // only Swift doubles
    room.act(g, { type: 'turn', card: 2, gravity: GRAVITY }); // not itself
    room.act(g, { type: 'turn', card: 2, gravity: 4 }); // same column (everyone is on the start)
    room.act(g, { type: 'answer', value: 1 }); // no prompt
    room.act(g, { type: 'vote', target: 'p1' });
    room.act(g, { type: 'pick', cls: 3 });
    room.act(g, { type: 'setup', patch: { columns: 20 } });
    room.act(g, { type: 'ready' });
    room.act(g, { type: 'nonsense' });
    room.act(g, null);
    room.act(g, 'turn');
    expect(room.snapshot()).toBe(before);
  });

  it('auto-plays for a player who dropped and does not come back', () => {
    const room = newRoom({ readOn: false });
    toRace(room);
    const g = ownerOf(room, GRAVITY);
    room.disconnect(g);
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(room.publicPlatform().paused).toBeFalsy();
    room.advance(20_000); // beats, and One's reaction timer if the random card was a 1
    expect(room.state().race!.turn).not.toBe(GRAVITY);
    expect(room.state().race!.runners[GRAVITY]!.discard).toHaveLength(1);
  });

  it('a random card is played when the turn timer runs out', () => {
    const room = newRoom({ readOn: false, turnSec: 20 });
    toRace(room);
    room.advance(20_000);
    expect(room.state().race!.runners[GRAVITY]!.discard).toHaveLength(1);
  });
});
