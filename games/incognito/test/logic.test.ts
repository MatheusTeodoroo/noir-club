import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { FIXED, role, type RoleId, type Setup } from '../src/shared.ts';
import { HINTS, RULES, SLIDES } from '../src/texts.ts';

import { skipDay, alive, finishVerdict, match, night, pub, pv, toNight, toVote, vote } from './helpers.ts';

describe('Incógnito — flow', () => {
  it('plays a full match at the minimum player count, through every phase', () => {
    const room = match(['impostor', 'investigator', 'protector', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'kill', target: 'p4' }]]);
    room.advance(FIXED.report);
    expect(pub(room).phase).toBe('dawn');
    expect(pub(room).dawn).toMatchObject({ deaths: ['p4'] });
    room.advance(20_000);
    expect(pub(room).phase).toBe('day');
    skipDay(room);
    vote(room, { p2: 'p1', p3: 'p1', p5: 'p1', p1: 'p2' });
    expect(pub(room).phase).toBe('verdict');
    expect(pub(room).condemned).toBe('p1');
    expect(pub(room).tally).toEqual({ p1: 3, p2: 1 });
    finishVerdict(room);
    expect(pub(room).phase).toBe('end');
    expect(pub(room).result).toMatchObject({ side: 'innocent', winners: ['p2', 'p3', 'p4', 'p5'] });
    expect(pub(room).result?.roles.p1).toBe('impostor');
    room.act('p1', { type: 'finish' });
    expect(room.phase()).toBe('results');
    expect(room.results()?.every((r) => r.score === 0)).toBe(true);
  });

  it('plays a full match at the maximum player count', () => {
    const roles: RoleId[] = [...Array(4).fill('impostor'), ...Array(12).fill('innocent')];
    const room = match(roles, { neutrals: 0 });
    for (let day = 1; day <= 4; day++) {
      const s = room.state();
      const victim = s.seats.find((id) => s.alive[id] && s.roles[id] === 'innocent')!;
      const imps = s.seats.filter((id) => s.alive[id] && s.roles[id] === 'impostor');
      night(room, imps.map((id): [string, unknown] => [id, { type: 'kill', target: victim }]));
      toVote(room);
      const votes = Object.fromEntries(room.ids.map((id) => [id, id === `p${day}` ? 'skip' : `p${day}`]));
      vote(room, votes);
      expect(pub(room).condemned).toBe(`p${day}`);
      if (day < 4) toNight(room);
      else finishVerdict(room);
    }
    expect(pub(room).result?.side).toBe('innocent');
    expect(pub(room).alive).toHaveLength(8);
  });

  it('timers alone cycle through every phase', () => {
    const room = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 }, { ack: false });
    const seen: string[] = [pub(room).phase];
    for (let i = 0; i < 12; i++) {
      room.advance((pub(room).deadline ?? room.now) - room.now);
      seen.push(pub(room).phase);
    }
    for (const phase of ['reveal', 'night', 'report', 'dawn', 'day', 'vote', 'verdict', 'dusk']) expect(seen).toContain(phase);
  });

  it('finishes the night early once everyone acted, and the vote once everyone voted', () => {
    const room = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    room.act('p1', { type: 'kill', target: null });
    for (const id of ['p2', 'p3', 'p4']) room.act(id, { type: 'ability', targets: ['p1'] });
    expect(pub(room).phase).toBe('night');
    expect(pub(room).acted).toEqual([]); // the TV never shows who acted at night
    room.act('p5', { type: 'ability', targets: ['p2'] });
    expect(pub(room).phase).toBe('report');
    toVote(room);
    vote(room);
    expect(pub(room).phase).toBe('verdict');
    expect(pub(room).condemned).toBeNull();
  });

  it('ignores invalid actions', () => {
    const room = match(['impostor', 'sheriff', 'innocent', 'investigator', 'innocent'], { neutrals: 0 });
    const before = room.snapshot();
    room.act('p2', null);
    room.act('p2', { type: 'nonsense' });
    room.act('p2', { type: 'vote', target: 'p1' }); // wrong phase
    room.act('p2', { type: 'kill', target: 'p3' }); // not an Impostor
    room.act('p1', { type: 'kill', target: 'p1' }); // own team
    room.act('p2', { type: 'ability', targets: ['p2'] }); // Sheriff cannot shoot himself
    room.act('p4', { type: 'ability', targets: ['p1'] }); // Investigator needs 2
    room.act('p4', { type: 'ability', targets: ['p1', 'p1'] });
    room.act('p3', { type: 'ability', targets: ['p1', 'p2'] }); // decoy is one pick
    room.act('p2', { type: 'start' }); // not the Host
    skipDay(room); // wrong phase
    room.act('p1', { type: 'again' });
    expect(room.snapshot()).toBe(before);
  });

  it('refuses to start an invalid setup', () => {
    const room = createTestRoom<State>(game, { players: 5, config: { tutorial: false } });
    room.act('p1', { type: 'setup', patch: { impostors: 2, neutrals: 1 } }); // 2 innocents ≤ 2 impostors
    expect(pv(room, 'p1').setup?.errors).toContain('tooManyImpostors');
    room.act('p1', { type: 'start' });
    expect(pub(room).phase).toBe('setup');
    room.act('p1', { type: 'setup', patch: { impostors: 1, picks: { poisoner: 'force', sniper: 'force' } } });
    expect(pv(room, 'p1').setup?.errors).toEqual(['forcedImpostors']);
    room.act('p1', { type: 'setup', patch: { picks: { sniper: 'auto', twin: 'force' } } });
    expect(pv(room, 'p1').setup?.errors).toEqual(['forcedImpostors', 'twinNeedsTwo']);
  });

  it('deals forced classes and never banned ones, without repeats', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const room = createTestRoom<State>(game, { players: 12, seed, config: { tutorial: false } });
      room.act('p1', {
        type: 'setup',
        patch: { impostors: 3, neutrals: 2, picks: { sheriff: 'force', twin: 'force', cultist: 'force', guard: 'ban', sniper: 'ban' } },
      });
      room.act('p1', { type: 'start' });
      const dealt = Object.values(room.state().roles);
      expect(dealt).toHaveLength(12);
      expect(dealt).toEqual(expect.arrayContaining(['sheriff', 'twin', 'cultist']));
      expect(dealt).not.toContain('guard');
      expect(dealt).not.toContain('sniper');
      const special = dealt.filter((r) => !role(r).common);
      expect(new Set(special).size).toBe(special.length);
      expect(dealt.filter((r) => role(r).team === 'impostor')).toHaveLength(3);
      expect(dealt.filter((r) => role(r).team === 'neutral')).toHaveLength(2);
      const twin = Object.entries(room.state().roles).find(([, r]) => r === 'twin')![0];
      expect(room.state().perks.twinOf[twin]).toBeDefined();
    }
  });

  it('play again returns to setup with the same choices', () => {
    const room = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0, oratorVotes: 3 });
    night(room);
    toVote(room);
    vote(room, { p2: 'p1', p3: 'p1', p4: 'p1' });
    finishVerdict(room);
    expect(pub(room).phase).toBe('end');
    room.act('p2', { type: 'again' });
    expect(pub(room).phase).toBe('end');
    room.act('p1', { type: 'again' });
    expect(pub(room).phase).toBe('setup');
    expect(pv(room, 'p1').setup?.setup).toMatchObject({ impostors: 1, neutrals: 0, oratorVotes: 3 });
  });

  it('removes a player who drops for good and carries on', () => {
    const room = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    for (const id of ['p1', 'p2', 'p3', 'p4']) room.act(id, { type: 'vote', target: 'skip' });
    room.disconnect('p5');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).deaths).toContainEqual({ id: 'p5', cause: 'left', day: 1 });
    expect(pub(room).phase).toBe('verdict');
    expect(room.publicJson()).not.toContain('"innocent"');
  });
});

describe('Incógnito — secrets', () => {
  it('keeps classes, picks and votes off the TV and off other phones', () => {
    const room = match(['poisoner', 'investigator', 'twin', 'innocent', 'innocent', 'journalist', 'innocent', 'innocent'], {});
    const json = room.publicJson();
    for (const r of ['poisoner', 'investigator', 'twin', 'journalist']) expect(json).not.toContain(`"${r}"`);
    expect(pv(room, 'p2').role).toBe('investigator');
    expect(JSON.stringify(pv(room, 'p2'))).not.toContain('poisoner');
    expect(pv(room, 'p1').mates).toEqual([{ id: 'p3', role: 'twin', alive: true }]);
    expect(pv(room, 'p4').mates).toEqual([]);

    room.act('p1', { type: 'kill', target: 'p4' });
    room.act('p1', { type: 'ability', targets: ['p5'] });
    expect(room.publicJson()).not.toContain('"kill":{');
    expect(pv(room, 'p3').night?.kill?.mates).toEqual({ p1: 'p4' });
    expect(JSON.stringify(pv(room, 'p2'))).not.toContain('"kill":{');

    night(room);
    toVote(room);
    room.act('p2', { type: 'vote', target: 'p1' });
    expect(pub(room).acted).toEqual(['p2']);
    expect(JSON.stringify(pub(room))).not.toContain('votes');
    expect(pv(room, 'p3').vote?.mine).toBeNull();
    expect(pv(room, 'p2').vote?.mine).toBe('p1');
  });

  it('keeps forced and banned classes secret from the TV and the other phones', () => {
    const room = createTestRoom<State>(game, { players: 6, config: { tutorial: false } });
    room.act('p1', { type: 'setup', patch: { picks: { sheriff: 'force', guard: 'ban' } } });
    expect(room.publicJson()).not.toContain('sheriff');
    expect(JSON.stringify(pv(room, 'p2'))).not.toContain('sheriff');
    expect(pv(room, 'p1').setup?.setup.picks).toEqual({ sheriff: 'force', guard: 'ban' });
    room.act('p1', { type: 'start' });
    expect(JSON.stringify(pv(room, 'p1'))).not.toContain('"ban"');
  });

  it('shows dead players everything only in omniscient mode', () => {
    const blind = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(blind, [['p1', { type: 'kill', target: 'p2' }]]);
    expect(pv(blind, 'p2').omni).toBeNull();
    const omni = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0, spectator: 'omniscient' });
    night(omni, [['p1', { type: 'kill', target: 'p2' }]]);
    expect(pv(omni, 'p2').omni?.roles.p1).toBe('impostor');
    expect(pv(omni, 'p3').omni).toBeNull();
  });
});

describe('Incógnito — night classes', () => {
  it('Sheriff: dies with an innocent target, survives an impostor', () => {
    const a = match(['impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent'], { neutrals: 0 });
    night(a, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect([alive(a, 'p2'), alive(a, 'p3')]).toEqual([false, false]);
    const b = match(['impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent'], { neutrals: 0 });
    night(b, [['p2', { type: 'ability', targets: ['p1'] }]]);
    expect([alive(b, 'p2'), alive(b, 'p1')]).toEqual([true, false]);
  });

  it('Locksmith blocks the kill silently; Builder warns its target', () => {
    const room = match(['impostor', 'locksmith', 'builder', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [
      ['p1', { type: 'kill', target: 'p4' }],
      ['p2', { type: 'ability', targets: ['p1'] }],
      ['p3', { type: 'ability', targets: ['p5'] }],
    ]);
    expect(alive(room, 'p4')).toBe(true);
    expect(pv(room, 'p1').report).toEqual([]);
    expect(pv(room, 'p5').report).toEqual([{ k: 'barricaded' }]);
  });

  it('Protector saves (3 uses), Guard kills the attacker', () => {
    const room = match(['impostor', 'protector', 'guard', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent', 'innocent'], {
      neutrals: 0,
    });
    night(room, [
      ['p1', { type: 'kill', target: 'p4' }],
      ['p7', { type: 'kill', target: 'p4' }],
      ['p2', { type: 'ability', targets: ['p4'] }],
    ]);
    expect(alive(room, 'p4')).toBe(true);
    expect(pv(room, 'p2').usesLeft).toBe(2);
    toVote(room);
    vote(room);
    toNight(room);
    night(room, [
      ['p1', { type: 'kill', target: 'p5' }],
      ['p7', { type: 'kill', target: 'p5' }],
      ['p3', { type: 'ability', targets: ['p5'] }],
    ]);
    expect(alive(room, 'p5')).toBe(true);
    expect(alive(room, 'p1') && alive(room, 'p7')).toBe(false);
  });

  it('Investigator, Tracker and Cartographer read the night', () => {
    const room = match(['impostor', 'investigator', 'tracker', 'cartographer', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [
      ['p1', { type: 'kill', target: 'p5' }],
      ['p2', { type: 'ability', targets: ['p1', 'p6'] }],
      ['p3', { type: 'ability', targets: ['p1'] }],
      ['p4', { type: 'ability', targets: ['p5'] }],
      ['p6', { type: 'ability', targets: ['p5'] }], // decoy: not counted
    ]);
    expect(pv(room, 'p2').report).toEqual([{ k: 'investigator', a: 'p1', b: 'p6', same: false }]);
    expect(pv(room, 'p3').report).toEqual([{ k: 'tracker', target: 'p1', kind: 'attack' }]);
    expect(pv(room, 'p4').report).toEqual([{ k: 'cartographer', target: 'p5', count: 1 }]);
  });

  it('Poison kills the next night unless the Curator cures it', () => {
    const room = match(['poisoner', 'curator', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'ability', targets: ['p3'] }], ['p1', { type: 'kill', target: null }]]);
    expect(alive(room, 'p3')).toBe(true);
    room.advance(FIXED.report);
    expect(pub(room).dawn?.poisoned).toBe(true);
    room.advance(20_000);
    skipDay(room);
    vote(room);
    toNight(room);
    night(room, [['p2', { type: 'ability', targets: ['p4'] }]]);
    expect(alive(room, 'p3')).toBe(false);
    expect(pv(room, 'p2').report).toEqual([{ k: 'curator', target: 'p4', team: 'innocent' }]);

    const cured = match(['poisoner', 'curator', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(cured, [['p1', { type: 'ability', targets: ['p3'] }]]);
    toVote(cured);
    vote(cured);
    toNight(cured);
    night(cured, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect(alive(cured, 'p3')).toBe(true);
    expect(pv(cured, 'p2').report).toEqual([{ k: 'curatorCured', target: 'p3' }]);
    expect(pv(cured, 'p3').report).toEqual([{ k: 'cured' }]);
  });

  it('Sentinel cancels the first action and exposes its author', () => {
    const room = match(['impostor', 'sentinel', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [
      ['p2', { type: 'ability', targets: ['p3'] }],
      ['p1', { type: 'kill', target: 'p3' }],
    ]);
    expect(alive(room, 'p3')).toBe(true);
    room.advance(FIXED.report);
    expect(pub(room).dawn?.suspect).toBe('p1');
    expect(pv(room, 'p2').report).toEqual([{ k: 'trap', target: 'p3', triggered: true }]);
  });

  it('Tentacle entangles: the target only confirms the next night', () => {
    const room = match(['tentacle', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'ability', targets: ['p2'] }]]);
    expect(pv(room, 'p2').report).toEqual([{ k: 'entangled' }]);
    toVote(room);
    vote(room);
    toNight(room);
    expect(pv(room, 'p2').night).toMatchObject({ entangled: true, ability: null });
    const before = room.snapshot();
    room.act('p2', { type: 'ability', targets: ['p1'] });
    expect(room.snapshot()).toBe(before);
    night(room);
    expect(alive(room, 'p1')).toBe(true);
  });

  it('team kill: majority decides; individual mode: every Impostor kills', () => {
    const team = match(['impostor', 'impostor', 'impostor', ...Array(7).fill('innocent')], { neutrals: 0 });
    night(team, [
      ['p1', { type: 'kill', target: 'p4' }],
      ['p2', { type: 'kill', target: 'p4' }],
      ['p3', { type: 'kill', target: 'p5' }],
    ]);
    expect([alive(team, 'p4'), alive(team, 'p5')]).toEqual([false, true]);

    const each = match(['impostor', 'impostor', 'impostor', ...Array(7).fill('innocent')], { neutrals: 0, killMode: 'each' });
    night(each, [
      ['p1', { type: 'kill', target: 'p4' }],
      ['p2', { type: 'kill', target: 'p5' }],
    ]);
    expect([alive(each, 'p4'), alive(each, 'p5')]).toEqual([false, false]);
  });

  it('individual "or" mode: a special Impostor kills or uses the ability', () => {
    const room = match(['poisoner', 'impostor', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {
      neutrals: 0,
      killMode: 'each',
      abilityMode: 'or',
    });
    room.act('p1', { type: 'kill', target: 'p3' });
    room.act('p1', { type: 'ability', targets: ['p4'] });
    expect(room.state().night.kill.p1).toBeUndefined();
    expect(pv(room, 'p1').night?.done).toBe(true);
  });

  it('Twin avenges the partner with an extra kill', () => {
    const room = match(['twin', 'impostor', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    room.state().perks.twinOf = { p1: 'p2', p2: 'p1' };
    night(room);
    toVote(room);
    vote(room, Object.fromEntries(['p1', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map((id) => [id, 'p2'])));
    toNight(room);
    expect(pv(room, 'p1').night?.kill2).not.toBeNull();
    night(room, [
      ['p1', { type: 'kill', target: 'p3' }],
      ['p1', { type: 'kill2', target: 'p4' }],
    ]);
    expect([alive(room, 'p3'), alive(room, 'p4')]).toEqual([false, false]);
  });
});

describe('Incógnito — morning and afternoon classes', () => {
  it('Psychologist learns about a lethal attempt', () => {
    const room = match(['impostor', 'psychologist', 'protector', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [
      ['p1', { type: 'kill', target: 'p2' }],
      ['p3', { type: 'ability', targets: ['p2'] }],
    ]);
    expect(pv(room, 'p2').psych).toBeNull(); // report phase
    room.advance(FIXED.report);
    expect(pv(room, 'p2').psych).toBe(true);
  });

  it('Spokesperson announces a true event, signed or not, never naming the actor', () => {
    const room = match(['impostor', 'spokesperson', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'kill', target: 'p3' }]]);
    room.advance(FIXED.report);
    const offer = pv(room, 'p2').spokes!.offer;
    expect(offer).toContainEqual({ kind: 'attacked', victim: 'p3', night: 1 });
    room.act('p2', { type: 'spokes', index: 0, signed: true });
    expect(pub(room).news).toEqual([{ by: 'spokesperson', signer: 'p2', event: offer[0] }]);
    expect(JSON.stringify(pub(room).news)).not.toContain('p1');
    const before = room.snapshot();
    room.act('p2', { type: 'spokes', index: 0, signed: false });
    expect(room.snapshot()).toBe(before);
  });

  it('Historian stores events and reveals them later (2 per match)', () => {
    const room = match(['impostor', 'historian', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'kill', target: 'p3' }]]);
    room.advance(FIXED.report);
    const offer = pv(room, 'p2').hist!.offer!;
    room.act('p2', { type: 'histStore', index: 0 });
    expect(pv(room, 'p2').hist).toMatchObject({ offer: null, stored: [offer[0]], canReveal: false });
    room.advance(20_000);
    room.act('p2', { type: 'histReveal', index: 0 });
    expect(pub(room).news).toEqual([{ by: 'historian', signer: null, event: offer[0] }]);
    expect(pv(room, 'p2').usesLeft).toBe(1);
  });

  it('Coroner learns a dead player\'s side', () => {
    const room = match(['impostor', 'coroner', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'kill', target: 'p3' }]]);
    room.advance(FIXED.report);
    room.act('p2', { type: 'autopsy', target: 'p4' }); // alive: ignored
    room.act('p2', { type: 'autopsy', target: 'p3' });
    expect(pv(room, 'p2').autopsy).toMatchObject({ results: [{ target: 'p3', team: 'innocent' }], candidates: [] });
    expect(pv(room, 'p2').usesLeft).toBe(1);
  });

  it('Sniper: a hit kills and reveals the class, a miss kills the Sniper', () => {
    const room = match(['sniper', 'impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    room.act('p4', { type: 'vote', target: 'p3' });
    room.act('p1', { type: 'snipe', target: 'p3', guess: 'sheriff' });
    expect(alive(room, 'p3')).toBe(false);
    expect(pub(room).live).toEqual([{ k: 'snipe', target: 'p3', role: 'sheriff' }]);
    expect(pub(room).revealed.p3).toEqual({ role: 'sheriff' });
    expect(room.state().votes.p4).toBe('skip'); // vote on the dead turns into Skip
    room.act('p1', { type: 'snipe', target: 'p4', guess: 'innocent' }); // once per vote
    expect(alive(room, 'p4')).toBe(true);

    const miss = match(['sniper', 'impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(miss);
    toVote(miss);
    miss.act('p1', { type: 'snipe', target: 'p3', guess: 'guard' });
    expect([alive(miss, 'p1'), alive(miss, 'p3')]).toEqual([false, true]);
    expect(pub(miss).revealed.p1).toEqual({ role: 'sniper' });
  });

  it('Exorcist: an Impostor is exposed, anyone else takes both down', () => {
    const room = match(['impostor', 'exorcist', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    room.act('p2', { type: 'exorcise', target: 'p1' });
    expect(pub(room).revealed).toEqual({ p2: { role: 'exorcist' }, p1: { team: 'impostor' } });
    expect(alive(room, 'p1')).toBe(true);

    const miss = match(['impostor', 'exorcist', 'innocent', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent', 'innocent'], {
      neutrals: 0,
    });
    night(miss);
    toVote(miss);
    miss.act('p2', { type: 'exorcise', target: 'p3' });
    expect([alive(miss, 'p2'), alive(miss, 'p3')]).toEqual([false, false]);
    expect(pub(miss).live).toEqual([{ k: 'exorciseFail', ids: ['p2', 'p3'] }]);
    expect(pub(miss).revealed).toEqual({});
  });

  it('Lawyer annuls an expulsion without being named', () => {
    const room = match(['impostor', 'lawyer', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    vote(room, { p2: 'p1', p3: 'p1', p4: 'p1', p5: 'p1' });
    expect(pv(room, 'p2').appeal).toEqual({ appealed: false });
    expect(pv(room, 'p3').appeal).toBeNull();
    room.act('p2', { type: 'appeal' });
    finishVerdict(room);
    expect(pub(room).outcome).toEqual({ k: 'annulled', target: 'p1' });
    expect(alive(room, 'p1')).toBe(true);
    expect(JSON.stringify(pub(room))).not.toContain('lawyer');
  });

  it('Orator counts double (or triple); a tie expels nobody', () => {
    const room = match(['impostor', 'orator', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    room.act('p2', { type: 'vote', target: 'p1' });
    room.act('p3', { type: 'vote', target: 'p4' });
    room.advance(60_000);
    expect(pub(room).tally).toEqual({ p1: 2, p4: 1 });
    expect(pub(room).condemned).toBe('p1');

    const tie = match(['impostor', 'orator', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0, oratorVotes: 3 });
    night(tie);
    toVote(tie);
    vote(tie, { p2: 'p1', p1: 'p3', p4: 'p3', p5: 'p3' });
    expect(pub(tie).tally).toMatchObject({ p1: 3, p3: 3 });
    expect(pub(tie).condemned).toBeNull();
  });

  it('a live death keeps every voter checked on the TV', () => {
    const room = match(['sniper', 'impostor', 'sheriff', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room);
    toVote(room);
    room.act('p4', { type: 'vote', target: 'p3' });
    room.act('p5', { type: 'vote', target: 'p6' });
    room.act('p1', { type: 'snipe', target: 'p3', guess: 'sheriff' });
    expect(pub(room).acted).toEqual(['p4', 'p5']);
  });

  it('Maestro only redirects a ballot that was cast', () => {
    const room = match(['maestro', 'impostor', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [['p1', { type: 'ability', targets: ['p3', 'p4'] }]]);
    toVote(room);
    for (const id of ['p1', 'p2', 'p4', 'p5', 'p6']) room.act(id, { type: 'vote', target: 'skip' });
    room.advance(60_000);
    expect(pub(room).tally).toEqual({ skip: 5 });
  });

  it('Maestro conducts a vote; Trickster diverts one', () => {
    const room = match(['maestro', 'trickster', 'innocent', 'innocent', 'innocent', 'innocent', 'impostor', 'innocent', 'innocent'], {
      neutrals: 0,
    });
    night(room, [
      ['p1', { type: 'ability', targets: ['p3', 'p4'] }],
      ['p2', { type: 'ability', targets: ['p5'] }],
    ]);
    toVote(room);
    vote(room, { p3: 'p1', p5: 'p6' });
    expect(pv(room, 'p3').vote).toBeNull(); // verdict now
    const tally = pub(room).tally!;
    expect(tally.p4).toBe(1);
    expect(tally.p1).toBeUndefined();
    expect(tally.p6).toBeUndefined();
    expect(pv(room, 'p1').usesLeft).toBe(0);
  });
});

describe('Incógnito — neutral wins end the match', () => {
  it('Journalist wins at 3 different hits', () => {
    const room = match(['impostor', 'journalist', 'sheriff', 'guard', 'tracker', 'innocent', 'innocent'], {});
    const guesses: [string, RoleId][] = [
      ['p3', 'sheriff'],
      ['p4', 'guard'],
      ['p5', 'tracker'],
    ];
    guesses.forEach(([target, guess], i) => {
      night(room, [['p2', { type: 'ability', targets: [target], guess }]]);
      if (i < 2) {
        expect(pv(room, 'p2').journalistHits).toBe(i + 1);
        toVote(room);
        vote(room);
        toNight(room);
      }
    });
    expect(pub(room).result).toMatchObject({ side: 'neutral', neutral: { id: 'p2', role: 'journalist' }, winners: ['p2'] });
  });

  it('Prophet wins when the target dies in time, dies otherwise', () => {
    const win = match(['impostor', 'prophet', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    night(win, [['p2', { type: 'ability', targets: ['p3'] }]]);
    toVote(win);
    vote(win, { p1: 'p3', p4: 'p3', p5: 'p3', p6: 'p3', p7: 'p3' });
    finishVerdict(win);
    expect(pub(win).result).toMatchObject({ side: 'neutral', winners: ['p2'] });

    const fail = match(['impostor', 'prophet', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    night(fail, [['p2', { type: 'ability', targets: ['p3'] }]]);
    toVote(fail);
    vote(fail);
    toNight(fail);
    night(fail);
    expect(alive(fail, 'p2')).toBe(false);
    expect(pub(fail).phase).toBe('report');
  });

  it('Bounty Hunter: a hit wins, a miss dies', () => {
    const hit = match(['poisoner', 'bountyHunter', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    hit.state().perks.bounty = { p2: 'poisoner' };
    expect(pv(hit, 'p2').bounty).toBe('poisoner');
    night(hit, [['p2', { type: 'ability', targets: ['p1'] }]]);
    expect(pub(hit).result).toMatchObject({ side: 'neutral', winners: ['p2'] });

    const miss = match(['poisoner', 'bountyHunter', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    miss.state().perks.bounty = { p2: 'poisoner' };
    night(miss, [['p2', { type: 'ability', targets: ['p3'] }]]);
    expect([alive(miss, 'p2'), alive(miss, 'p3')]).toEqual([false, true]);
  });

  it('Cultist wins when the 3 chosen vote for them', () => {
    const room = match(['impostor', 'cultist', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    night(room, [['p2', { type: 'ability', targets: ['p3', 'p4', 'p5'] }]]);
    toVote(room);
    vote(room, { p3: 'p2', p4: 'p2', p5: 'p2' });
    expect(pub(room).result).toMatchObject({ side: 'neutral', winners: ['p2'] });
  });

  it('Drama Addict wins dying at night after 4 votes, loses when expelled', () => {
    const room = match(['impostor', 'dramaAddict', 'protector', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent', 'innocent'], {});
    for (let day = 1; day <= 4; day++) {
      night(room);
      toVote(room);
      vote(room);
      toNight(room);
    }
    night(room, [['p1', { type: 'kill', target: 'p2' }]]);
    expect(pub(room).result).toMatchObject({ side: 'neutral', winners: ['p2'] });
  });

  it('Impostors win at parity', () => {
    const room = match(['impostor', 'impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    night(room, [
      ['p1', { type: 'kill', target: 'p3' }],
      ['p2', { type: 'kill', target: 'p3' }],
    ]);
    toVote(room);
    vote(room, { p1: 'p4', p2: 'p4', p5: 'p4' });
    finishVerdict(room);
    expect(pub(room).result).toMatchObject({ side: 'impostor', winners: ['p1', 'p2'] });
  });
});


describe('Incógnito — tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances, then goes to the setup', () => {
    const room = createTestRoom<State>(game, { players: 5 });
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
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('setup');
  });

  it('moves on to the setup if the Host leaves during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('setup');
  });

  it('moves on by itself if nobody advances the tutorial for 5 minutes', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.advance(5 * 60_000);
    expect(pub(room).phase).toBe('setup');
  });

  it('shows a rules page or a class card on the TV only when the Host asks', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 2 });
    expect(pub(room).tvRules).toBe(2);
    room.act('p1', { type: 'tvClass', role: 'guard' });
    expect(pub(room)).toMatchObject({ tvClass: 'guard', tvRules: null });
    room.act('p1', { type: 'tvClass', role: 'nonsense' });
    expect(pub(room).tvClass).toBe('guard');
    room.act('p1', { type: 'tvClass', role: null });
    expect(pub(room).tvClass).toBeNull();
  });

  it('gives first-night and first-day hints only while the tutorial option is on', () => {
    const on = createTestRoom<State>(game, { players: 5 });
    on.act('p1', { type: 'intro', dir: 'skip' });
    on.act('p1', { type: 'start' });
    for (const id of on.ids) on.act(id, { type: 'ack' });
    expect(pub(on)).toMatchObject({ phase: 'night', hint: 'night' });
    const off = match(['impostor', 'innocent', 'innocent', 'innocent', 'innocent'], { neutrals: 0 });
    expect(pub(off)).toMatchObject({ phase: 'night', hint: null });
  });

  it('has the tutorial, every rules page and every hint in both languages', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
    for (const text of Object.values(HINTS)) expect(text['pt-BR'] && text.en).toBeTruthy();
  });
});
