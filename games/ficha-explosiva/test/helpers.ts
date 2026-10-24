import { expect } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import type { CharId, Room as Hall } from '../src/shared.ts';

export type Room = ReturnType<typeof createTestRoom<State>>;
export const pub = (room: Room) => room.publicView() as PublicView;
export const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

export function newRoom(players: number, config: Record<string, unknown> = {}, seed = 7) {
  return createTestRoom<State>(game, { players, config: { tutorial: false, preset: 'basico', ...config }, seed });
}

/** Deals with the given units, then overwrites the cards and halls: cards[i] / halls[i] go to p(i+1). */
export function match(
  cards: CharId[],
  halls: (Hall | null)[],
  opts: { config?: Record<string, unknown>; units?: string[]; buried?: CharId | null; ready?: boolean } = {},
) {
  const room = newRoom(cards.length, opts.config);
  room.act('p1', { type: 'intro', dir: 'skip' }); // when the tutorial is on
  for (const u of opts.units ?? []) room.act('p1', { type: 'toggleUnit', unit: u });
  room.act('p1', { type: 'deal' });
  const s = room.state();
  expect(s.phase).toBe('briefing');
  s.revealed = {};
  cards.forEach((c, i) => {
    const id = `p${i + 1}`;
    s.card[id] = c;
    s.room[id] = halls[i]!;
    s.conditions[id] = c === 'tirano' ? [{ k: 'foolish' }] : [];
    if (halls[i] === null) s.revealed[id] = c;
  });
  const extra = opts.buried !== undefined ? [opts.buried] : [];
  s.deck = [...cards, ...extra].filter((c): c is CharId => !!c).sort();
  s.buried = opts.buried ?? null;
  if (opts.ready ?? true) readyAll(room);
  return room;
}

export function readyAll(room: Room) {
  for (const id of room.ids) if (room.state().phase === 'briefing') room.act(id, { type: 'ready' });
}

/** Elects a leader in each hall (nominated by someone else in that hall). */
export function elect(room: Room, a: string, b: string) {
  const s = room.state();
  const nominator = (target: string) => room.ids.find((id) => id !== target && s.room[id] === s.room[target])!;
  room.act(nominator(a), { type: 'nominate', target: a });
  room.act(nominator(b), { type: 'nominate', target: b });
}

/** Runs the clock to the end of the current round. */
export function finishRound(room: Room) {
  const s = room.state();
  expect(s.phase).toBe('round');
  room.advance((s.minutes[s.round - 1] ?? 1) * 60_000);
}

export function arriveAll(room: Room) {
  const ex = room.state().exchange!;
  for (const id of [...ex.A, ...ex.B]) room.act(id, { type: 'arrived' });
}

/** Plays every remaining round on timers, skipping the walk. */
export function playOut(room: Room) {
  while (room.state().phase === 'round') {
    finishRound(room);
    arriveAll(room);
  }
}
