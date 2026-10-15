import { createTestRoom } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import type { Setup } from '../src/shared.ts';

export type Room = ReturnType<typeof createTestRoom<State>>;

export const pub = (room: Room) => room.publicView() as PublicView;
export const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

export function newRoom(setup: Partial<Setup> = {}, seed = 7): Room {
  const room = createTestRoom<State>(game, { players: 11, seed });
  if (Object.keys(setup).length) room.act('p1', { type: 'setup', patch: setup });
  room.act('p1', { type: 'start' });
  return room;
}

/** Everyone votes for the first candidate: one player is placed per vote. */
export function resolveVotes(room: Room) {
  while (pub(room).phase === 'vote' || pub(room).phase === 'voteResult') {
    const v = pub(room).vote!;
    if (pub(room).phase === 'vote') for (const id of room.ids) room.act(id, { type: 'vote', target: v.cands[0] });
    room.advance(6_000);
  }
}

/** Each chooser takes the lowest free class: the voting order decides who gets what. */
export function pickAll(room: Room) {
  while (pub(room).phase === 'pick') {
    const chooser = pub(room).pick!.chooser!;
    room.act(chooser, { type: 'pick', cls: pv(room, chooser).pick!.free[0] });
  }
}

export const ownerOf = (room: Room, cls: number) => pub(room).owner[cls]!;

/** From the start of the match to the first turn of the race. */
export function toRace(room: Room) {
  if (pub(room).phase === 'read') for (const id of room.ids) room.act(id, { type: 'ready' });
  resolveVotes(room);
  pickAll(room);
  if (pub(room).phase === 'strategy') {
    room.act(ownerOf(room, 11), { type: 'fastBack', cards: [1, 2] });
    for (const id of room.ids) room.act(id, { type: 'ready' });
  } else if (pub(room).phase === 'fast') {
    room.act(ownerOf(room, 11), { type: 'fastBack', cards: [1, 2] });
  }
}

/** Lets every timer run (random plays, random answers) until the results. */
export function runOut(room: Room, maxSteps = 20_000) {
  for (let i = 0; i < maxSteps && room.phase() !== 'results'; i++) room.advance(5_000);
}
