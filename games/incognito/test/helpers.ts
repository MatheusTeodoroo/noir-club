import { expect } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { FIXED, role, type RoleId, type Setup } from '../src/shared.ts';

export type Room = ReturnType<typeof createTestRoom<State>>;
export const pub = (room: Room) => room.publicView() as PublicView;
export const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** Starts a match and overwrites the dealt classes: roles[i] goes to p(i+1). */
export function match(roles: RoleId[], patch: Partial<Setup> = {}, opts: { ack?: boolean } = {}) {
  const room = createTestRoom<State>(game, { players: roles.length, config: { tutorial: false } });
  const impostors = roles.filter((r) => role(r).team === 'impostor').length;
  const neutrals = roles.filter((r) => role(r).team === 'neutral').length;
  room.act('p1', { type: 'setup', patch: { impostors, neutrals, ...patch } });
  room.act('p1', { type: 'start' });
  const s = room.state();
  expect(s.phase).toBe('reveal');
  roles.forEach((r, i) => (s.roles[`p${i + 1}`] = r));
  s.perks.twinOf = {};
  s.perks.bounty = {};
  if (opts.ack ?? true) for (const id of room.ids) room.act(id, { type: 'ack' });
  return room;
}

/** Sends the given night actions, then makes every other living player pass. */
export function night(room: Room, acts: [string, unknown][] = []) {
  expect(room.state().phase).toBe('night');
  for (const [id, a] of acts) room.act(id, a);
  for (const id of room.ids) {
    const s = room.state();
    if (s.phase !== 'night') return;
    if (!s.alive[id]) continue;
    if (s.perks.entangled[id] === s.nightNo) {
      room.act(id, { type: 'ack' });
      continue;
    }
    const held = s.perks.potion[id];
    if (held && held.from <= s.nightNo && !(id in s.night.potion)) room.act(id, { type: 'potion', target: null });
    if (role(s.roles[id]!).team === 'impostor') {
      if (!(id in s.night.kill)) room.act(id, { type: 'kill', target: null });
      if (s.perks.extraKill[id] === s.nightNo && !(id in s.night.kill2)) room.act(id, { type: 'kill2', target: null });
    }
    if (room.state().phase === 'night' && !room.state().night.ability[id]) room.act(id, { type: 'ability', targets: [] });
  }
}

/** From the night report to the start of the vote. */
export function toVote(room: Room) {
  expect(room.state().phase).toBe('report');
  room.advance(FIXED.report);
  expect(room.state().phase).toBe('dawn');
  room.advance(room.state().setup.times.dawn * 1000);
  expect(room.state().phase).toBe('day');
  skipDay(room);
  expect(room.state().phase).toBe('vote');
}

/** Every living player votes (default "skip"); stops at the verdict. */
export function vote(room: Room, votes: Record<string, string> = {}) {
  for (const id of room.ids) {
    if (room.state().phase !== 'vote') return;
    if (room.state().alive[id]) room.act(id, { type: 'vote', target: votes[id] ?? 'skip' });
  }
}

export const finishVerdict = (room: Room) => room.advance(FIXED.verdict);
export const toNight = (room: Room) => {
  finishVerdict(room);
  room.advance(FIXED.dusk);
};
export const alive = (room: Room, id: string) => !!room.state().alive[id];

/** Every living player asks to skip the discussion. */
export function skipDay(room: Room) {
  for (const id of room.ids) if (room.state().phase === 'day' && room.state().alive[id]) room.act(id, { type: 'skip' });
}
