import { describe, expect, it } from 'vitest';
import { FIXED, type RoleId } from '../src/shared.ts';
import { skipDay, alive, finishVerdict, match, night, pub, pv, toNight, toVote, vote } from './helpers.ts';

const day = (room: ReturnType<typeof match>) => {
  toVote(room);
  vote(room);
  toNight(room);
};

describe('Incógnito — the other ten classes', () => {
  it('Telepath: both learn the link, and a night death takes both', () => {
    const room = match(['impostor', 'telepath', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect(pv(room, 'p2').report).toContainEqual({ k: 'linked', other: 'p3' });
    expect(pv(room, 'p3').report).toContainEqual({ k: 'linked', other: 'p2' });
    expect(pv(room, 'p3').link).toBe('p2');
    day(room);
    night(room, [['p1', { type: 'kill', target: 'p3' }]]);
    expect([alive(room, 'p2'), alive(room, 'p3')]).toEqual([false, false]);
  });

  it('Telepath: protection on one shields the other; expulsion does not carry over', () => {
    const room = match(['impostor', 'telepath', 'protector', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p2', { type: 'ability', targets: ['p4'] }]]);
    day(room);
    night(room, [
      ['p3', { type: 'ability', targets: ['p2'] }],
      ['p1', { type: 'kill', target: 'p4' }],
    ]);
    expect(alive(room, 'p4')).toBe(true);
    toVote(room);
    vote(room, { p1: 'p4', p3: 'p4', p5: 'p4', p6: 'p4', p7: 'p4' });
    finishVerdict(room);
    expect([alive(room, 'p2'), alive(room, 'p4')]).toEqual([true, false]);
  });

  it('Saboteur stops an action silently', () => {
    const room = match(['impostor', 'saboteur', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [
      ['p1', { type: 'kill', target: 'p3' }],
      ['p2', { type: 'ability', targets: ['p1'] }],
    ]);
    expect(alive(room, 'p3')).toBe(true);
    expect(pv(room, 'p1').report).toEqual([]);
  });

  it('Persistent survives one attack and falls to two', () => {
    const roles = ['impostor', 'impostor', 'persistent', ...Array(6).fill('innocent')] as RoleId[];
    const one = match(roles, { neutrals: 0, killMode: 'each' });
    night(one, [['p1', { type: 'kill', target: 'p3' }]]);
    expect(alive(one, 'p3')).toBe(true);
    const two = match(roles, { neutrals: 0, killMode: 'each' });
    night(two, [
      ['p1', { type: 'kill', target: 'p3' }],
      ['p2', { type: 'kill', target: 'p3' }],
    ]);
    expect(alive(two, 'p3')).toBe(false);
  });

  it('Alchemist brews, hands over, and the potion protects later', () => {
    const room = match(['impostor', 'alchemist', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    expect(pv(room, 'p2').night?.brew).toBe(true);
    night(room, [['p2', { type: 'ability', targets: [], potion: 'protect' }]]);
    expect(pv(room, 'p2').alchemy).toEqual({ potion: 'protect', given: false });
    day(room);
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect(pv(room, 'p3').report).toContainEqual({ k: 'potion', kind: 'protect' });
    expect(pv(room, 'p2').usesLeft).toBe(0);
    day(room);
    expect(pv(room, 'p3').night?.potion?.kind).toBe('protect');
    night(room, [
      ['p3', { type: 'potion', target: 'p4' }],
      ['p1', { type: 'kill', target: 'p4' }],
    ]);
    expect(alive(room, 'p4')).toBe(true);
    expect(pv(room, 'p3').potion).toBeNull();
  });

  it('a Death potion kills and an Insight potion reads a side', () => {
    const room = match(['impostor', 'alchemist', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent'], {
      neutrals: 0,
    });
    night(room, [['p2', { type: 'ability', targets: [], potion: 'kill' }]]);
    day(room);
    night(room, [['p2', { type: 'ability', targets: ['p2'] }]]);
    day(room);
    room.act('p2', { type: 'potion', target: 'p2' }); // a Death potion cannot be drunk
    expect(room.state().night.potion.p2).toBeUndefined();
    night(room, [['p2', { type: 'potion', target: 'p8' }]]);
    expect(alive(room, 'p8')).toBe(false);
  });

  it('Pacifist Tracker dies the night after voting out an Innocent', () => {
    const room = match(['impostor', 'pacifistTracker', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    vote(room, { p1: 'p3', p2: 'p3', p4: 'p3', p5: 'p3' });
    toNight(room);
    expect(pv(room, 'p2').doomed).toBe(true);
    night(room);
    expect(alive(room, 'p2')).toBe(false);
  });

  it('Shapeshifter swaps the votes received, votes for two, and is revealed if the copy is expelled', () => {
    const room = match(['shapeshifter', 'impostor', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {
      neutrals: 0,
    });
    night(room);
    toVote(room);
    expect(pv(room, 'p1').vote?.special).toBe('shapeshifter');
    room.act('p1', { type: 'shift', target: 'p3' });
    expect(pub(room).live).toEqual([]);
    vote(room, { p1: 'p4', p3: 'p5', p4: 'p1', p5: 'p1', p6: 'p1', p7: 'p2', p8: 'p1' });
    // p1 had 4 votes, p3 none → swapped; p1's ballot counts twice; p3's ballot is void.
    expect(pub(room).tally).toEqual({ p3: 4, p4: 2, p2: 1, skip: 2 });
    expect(pub(room).condemned).toBe('p3');
    finishVerdict(room);
    expect(pub(room).revealed.p1).toEqual({ role: 'shapeshifter' });
    expect(alive(room, 'p1')).toBe(true);
    expect(pv(room, 'p1').usesLeft).toBe(0);
  });

  it('Phantom lingers one night after a night death', () => {
    const room = match(['phantom', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent', 'innocent'], {
      neutrals: 0,
    });
    night(room, [['p2', { type: 'ability', targets: ['p1'] }]]);
    expect(alive(room, 'p1')).toBe(true);
    expect(pv(room, 'p1').lingering).toBe(true);
    room.advance(FIXED.report);
    expect(pub(room).dawn?.deaths).toEqual([]);
    room.advance(20_000);
    skipDay(room);
    vote(room);
    toNight(room);
    night(room);
    expect(alive(room, 'p1')).toBe(false);
  });

  it('Thief steals the class and side but still reads as Thief', () => {
    const room = match(['impostor', 'thief', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent', 'sniper'], {});
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect(alive(room, 'p3')).toBe(false);
    expect(pv(room, 'p2')).toMatchObject({ role: 'sheriff', team: 'innocent', stole: true });
    expect(pv(room, 'p2').report).toContainEqual({ k: 'stole', role: 'sheriff' });
    toVote(room);
    room.act('p8', { type: 'snipe', target: 'p2', guess: 'thief' });
    expect(alive(room, 'p2')).toBe(false);
    expect(pub(room).revealed.p2).toEqual({ role: 'thief' });
  });

  it('a Thief who becomes an Impostor stays unknown to the team and kills alone', () => {
    const room = match(['impostor', 'thief', 'poisoner', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect(pv(room, 'p2')).toMatchObject({ role: 'poisoner', team: 'impostor', mates: [] });
    expect(pv(room, 'p1').mates.map((m) => m.alive)).toEqual([false]); // still sees the dead Poisoner, not the Thief
    day(room);
    expect(pv(room, 'p2').night?.kill?.candidates).toContain('p1');
    night(room, [
      ['p1', { type: 'kill', target: 'p4' }],
      ['p2', { type: 'kill', target: 'p5' }],
    ]);
    expect([alive(room, 'p4'), alive(room, 'p5')]).toEqual([false, false]);
  });

  it('Nomad sends the next night\'s actions to the swap partner and wins alongside when alive', () => {
    const room = match(['impostor', 'nomad', 'innocent', 'innocent', 'innocent'], {});
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    day(room);
    night(room, [['p1', { type: 'kill', target: 'p2' }]]);
    expect([alive(room, 'p2'), alive(room, 'p3')]).toEqual([true, false]);
    toVote(room);
    vote(room, { p2: 'p4', p1: 'p4', p5: 'p4' });
    finishVerdict(room);
    expect(pub(room).result).toMatchObject({ side: 'impostor', winners: ['p1', 'p2'] });
  });

  it('Parasite takes half its host\'s votes and wins at 5', () => {
    const roles = ['impostor', 'parasite', ...Array(10).fill('innocent')] as RoleId[];
    const room = match(roles, {});
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect(pv(room, 'p2').parasite).toEqual({ host: 'p3', leeched: 0 });
    toVote(room);
    vote(room, Object.fromEntries(['p1', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'].map((id) => [id, 'p3'])));
    expect(pub(room).result).toMatchObject({ side: 'neutral', winners: ['p2'] });
  });

  it('Parasite gains nothing when its host is expelled', () => {
    const roles = ['impostor', 'parasite', ...Array(10).fill('innocent')] as RoleId[];
    const room = match(roles, {});
    night(room, [['p2', { type: 'ability', targets: ['p3'] }]]);
    toVote(room);
    vote(room, Object.fromEntries(['p1', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'].map((id) => [id, 'p3'])));
    expect(pub(room).tally).toEqual({ p3: 5, p2: 4, skip: 3 });
    expect(pub(room).condemned).toBe('p3');
    expect(pv(room, 'p2').parasite?.leeched).toBe(0);
  });
});

describe('Incógnito — discussion skip and revealed deaths', () => {
  it('each skip request cuts an equal share of the remaining debate; all of them end it', () => {
    const room = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    room.advance(FIXED.report);
    room.advance(20_000);
    expect(pub(room).phase).toBe('day');
    const remaining = () => (pub(room).deadline ?? 0) - room.now;
    expect(remaining()).toBe(180_000);
    room.act('p2', { type: 'skip' });
    expect(remaining()).toBe(144_000); // 1 of 5 → 20% off
    expect(pub(room).skips).toEqual({ count: 1, of: 5 });
    expect(pub(room).total).toBe(180_000);
    room.act('p2', { type: 'skip' }); // only once
    expect(remaining()).toBe(144_000);
    room.act('p3', { type: 'skip' });
    expect(remaining()).toBe(108_000);
    room.act('p4', { type: 'skip' });
    expect(remaining()).toBe(72_000);
    room.act('p5', { type: 'skip' });
    expect(remaining()).toBe(36_000);
    room.act('p1', { type: 'skip' });
    expect(pub(room).phase).toBe('vote');
  });

  it('the Host can reveal the class of every dead or expelled player', () => {
    const hidden = match(['impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(hidden, [['p1', { type: 'kill', target: 'p2' }]]);
    expect(pub(hidden).revealed).toEqual({});

    const shown = match(['impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0, revealDead: true });
    night(shown, [['p1', { type: 'kill', target: 'p2' }]]);
    expect(pub(shown).revealed).toEqual({ p2: { role: 'sheriff' } });
    expect(pub(shown).rules.revealDead).toBe(true);
    toVote(shown);
    vote(shown, { p3: 'p4', p5: 'p4', p6: 'p4' });
    finishVerdict(shown);
    expect(pub(shown).revealed.p4).toEqual({ role: 'innocent' });
    expect(pub(shown).alive).not.toContain('p4');
  });
});
