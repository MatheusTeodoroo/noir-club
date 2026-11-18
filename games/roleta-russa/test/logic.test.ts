import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, {
  END_MS,
  FIRE_INTRO_MS,
  FLASH_MS,
  SHOT_MS,
  type Action,
  type PlayerView,
  type PublicView,
  type State,
} from '../src/logic.ts';
import { aimSeat, chamberAt } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;
const me = (room: Room, id: string) => room.playerView(id) as PlayerView;

const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

/** The player whose turn it is. */
const current = (room: Room) => pub(room).current!;
/** The current player sends `action`. */
const play = (room: Room, action: Action) => room.act(current(room), action);

/** Drains the current player's credits with public investigations until the firing starts. */
function playToFiring(room: Room) {
  for (let guard = 0; guard < 500 && pub(room).phase === 'play'; guard++) {
    const view = me(room, current(room));
    play(room, view.credits > 0 ? { type: 'investigate', pair: 0, secret: false } : { type: 'pass' });
  }
}

/** Runs the firing to the platform results. */
function fireAll(room: Room) {
  room.advance(FIRE_INTRO_MS);
  for (let i = 0; i < 12 && pub(room).phase === 'firing'; i++) room.advance(SHOT_MS);
  room.advance(END_MS);
}

describe(game.manifest.name['pt-BR'], () => {
  for (const players of [3, 10]) {
    it(`plays a full match to the results with ${players} players`, () => {
      const room = playing({ players, seed: players });
      expect(pub(room)).toMatchObject({ phase: 'play', n: players, round: 1, rot: 0 });
      playToFiring(room);
      expect(pub(room).phase).toBe('firing');
      const broke = room.state().seats.filter((id) => room.state().credits[id] === 0).length;
      expect(broke).toBe(Math.ceil(players / 2));
      fireAll(room);
      expect(room.phase()).toBe('results');
      const results = room.results()!;
      expect(results.filter((r) => r.score === 1)).toHaveLength(players - 2);
      expect(results.filter((r) => r.score === 0)).toHaveLength(2);
    });
  }

  it('turns pass clockwise and the first seat moves on each round', () => {
    const room = playing({ players: 4, seed: 3 });
    const seats = room.state().seats;
    const order: string[] = [];
    for (let i = 0; i < 8; i++) {
      order.push(current(room));
      play(room, { type: 'charge', amount: 1 });
    }
    expect(order).toEqual([seats[0], seats[1], seats[2], seats[3], seats[1], seats[2], seats[3], seats[0]]);
    expect(pub(room).round).toBe(3);
  });

  it('keeps bullets, credits, charge and private results secret', () => {
    const room = playing({ players: 4, seed: 11 });
    const [a, b] = room.state().seats as [string, string];
    room.act(a, { type: 'investigate', pair: 2, secret: true });
    room.act(b, { type: 'charge', amount: 3 });
    // (The platform frame carries the Host's config, whose key is also "bullets": check our view.)
    const json = JSON.stringify(pub(room));
    expect(json).not.toContain('"bullets"');
    expect(json).not.toContain('"credits"');
    expect(json).not.toContain('"charge"');
    expect(json).not.toContain('"notes"');
    expect(json).not.toContain('"swapPending"');
    expect(json).not.toContain('"result"');
    expect(json).not.toContain('"flash"');
    expect(pub(room).log.map((e) => e.kind)).toEqual(['private', 'private']);
    expect(pub(room).reveal).toBeNull();
    // Each player sees only their own credits and notes.
    expect(me(room, a)).toMatchObject({ credits: 14, charge: 0 });
    expect(me(room, a).notes).toEqual([{ turn: 1, kind: 'peek', pair: 2 }]);
    expect(me(room, a).flash).toMatchObject({ pid: a, pair: 2, secret: true });
    for (const other of room.ids.filter((id) => id !== a)) expect(me(room, other).flash).toBeNull();
    expect(me(room, b)).toMatchObject({ credits: 13, charge: 3 });
    expect(me(room, b).notes.some((n) => n.kind === 'peek')).toBe(false);
  });

  it('a public investigation shows the result on every phone, never on the TV', () => {
    const room = playing({ players: 5, seed: 2 });
    const bullets = room.state().bullets;
    const who = current(room);
    play(room, { type: 'investigate', pair: 4, secret: false });
    expect(pub(room).log[0]).toEqual({ turn: 1, pid: who, kind: 'pub', pair: 4 });
    expect(JSON.stringify(pub(room))).not.toContain('"result"');
    for (const id of room.ids)
      expect(me(room, id).flash).toMatchObject({ pid: who, pair: 4, result: [bullets[4], bullets[0]], secret: false });
  });

  it('investigation results are temporary', () => {
    const room = playing({ players: 4, seed: 2 });
    const who = current(room);
    play(room, { type: 'investigate', pair: 1, secret: true });
    expect(me(room, who).flash).not.toBeNull();
    room.advance(FLASH_MS - 1);
    expect(me(room, who).flash).not.toBeNull();
    room.advance(1);
    expect(me(room, who).flash).toBeNull();
    expect(JSON.stringify(me(room, who))).not.toContain('"result"');
    // A new investigation replaces the one on screen and restarts the clock.
    play(room, { type: 'investigate', pair: 0, secret: false });
    room.advance(FLASH_MS / 2);
    play(room, { type: 'investigate', pair: 2, secret: false });
    room.advance(FLASH_MS / 2);
    expect(me(room, who).flash).toMatchObject({ pair: 2 });
    room.advance(FLASH_MS / 2);
    expect(me(room, who).flash).toBeNull();
  });

  it('spins are public and change whom each chamber points at', () => {
    const room = playing({ players: 6, seed: 4 });
    play(room, { type: 'spin', steps: 1 });
    play(room, { type: 'spin', steps: 2 });
    expect(pub(room).rot).toBe(3);
    expect(pub(room).log.map((e) => e.kind)).toEqual(['spin', 'spin']);
    expect(chamberAt(0, 3, 6)).toBe(3);
    expect(chamberAt(4, 3, 6)).toBe(1);
  });

  it('manipulation loads up to 3 per turn and swaps at exactly 6', () => {
    const room = playing({ players: 3, seed: 5 });
    const seats = room.state().seats;
    const p = seats[0]!;
    // Turn 1: load 3; others load 1.
    room.act(p, { type: 'charge', amount: 3 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    // Round 2 starts at seat 1; p (seat 0) plays last.
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    expect(current(room)).toBe(p);
    const before = [...room.state().bullets];
    room.act(p, { type: 'charge', amount: 3 });
    expect(me(room, p)).toMatchObject({ swapPending: true, charge: 0, credits: 10 });
    expect(current(room)).toBe(p); // same turn: pick the pair
    const snap = room.snapshot();
    room.act(p, { type: 'spin', steps: 1 }); // nothing else is allowed now
    expect(room.snapshot()).toBe(snap);
    room.act(p, { type: 'manipulate', pair: 2 });
    const after = room.state().bullets;
    expect(after).toEqual([before[2], before[1], before[0]]); // pair 2 = chambers C and A
    expect(after.filter(Boolean)).toHaveLength(before.filter(Boolean).length);
    expect(me(room, p).notes.at(-1)).toEqual({ turn: 6, kind: 'swap', pair: 2 });
    expect(pub(room).log.at(-1)).toEqual({ turn: 6, pid: p, kind: 'private' });
    expect(current(room)).not.toBe(p);
  });

  it('loading past 6 loses the whole charge', () => {
    const room = playing({ players: 3, seed: 6 });
    const p = room.state().seats[0]!;
    room.act(p, { type: 'charge', amount: 2 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    room.act(p, { type: 'charge', amount: 3 }); // 5 — still fine
    while (current(room) !== p) play(room, { type: 'charge', amount: 1 });
    room.act(p, { type: 'charge', amount: 2 }); // 7 — over
    expect(me(room, p)).toMatchObject({ charge: 0, credits: 9, swapPending: false });
    expect(me(room, p).notes.at(-1)).toMatchObject({ kind: 'charge', total: 7, lost: true });
  });

  it('broke players can only pass, and it looks like any private action', () => {
    const room = playing({ players: 4, seed: 8 });
    const p = room.state().seats[0]!;
    // p spends 16 over four turns: 4 + 4 + 4 + 4 (double spins), others load 1 each turn.
    for (let r = 0; r < 4; r++) {
      while (current(room) !== p) play(room, { type: 'charge', amount: 1 });
      room.act(p, { type: 'spin', steps: 2 });
    }
    expect(me(room, p).credits).toBe(0);
    while (current(room) !== p) play(room, { type: 'charge', amount: 1 });
    const snap = room.snapshot();
    room.act(p, { type: 'investigate', pair: 0, secret: false });
    room.act(p, { type: 'charge', amount: 1 });
    expect(room.snapshot()).toBe(snap);
    room.act(p, { type: 'pass' });
    expect(pub(room).log.at(-1)).toMatchObject({ pid: p, kind: 'private' });
  });

  it('a player with credits cannot pass or overspend', () => {
    const room = playing({ players: 3, seed: 9 });
    const snap = room.snapshot();
    play(room, { type: 'pass' });
    expect(room.snapshot()).toBe(snap);
  });

  it('fires from the seat in its sights, clockwise, and the hit seats score 0', () => {
    const room = playing({ players: 4, seed: 12, config: { bullets: 2 } });
    play(room, { type: 'spin', steps: 1 });
    const { seats, bullets, rot } = room.state();
    playToFiring(room);
    room.advance(FIRE_INTRO_MS);
    const first = aimSeat(rot, 4);
    expect(first).toBe(rot);
    expect(chamberAt(first, rot, 4)).toBe(0); // the barrel is always over chamber A
    expect(pub(room).shots).toEqual([{ seat: first, chamber: 0, hit: bullets[0] }]);
    room.advance(SHOT_MS);
    if (pub(room).phase === 'firing') expect(pub(room).shots[1]!.seat).toBe((first + 1) % 4);
    fireAll(room);
    const expected = Object.fromEntries(seats.map((id, s) => [id, bullets[chamberAt(s, rot, 4)] ? 0 : 1]));
    for (const r of room.results()!) expect(r.score).toBe(expected[r.playerId]);
  });

  it('the firing stops after the last bullet and reveals the cylinder', () => {
    const room = playing({ players: 6, seed: 13 });
    playToFiring(room);
    const { bullets, rot } = room.state();
    // Shot k hits seat (rot + k) mod 6, which faces chamber k: the last bullet is the last loaded chamber.
    const lastShot = Math.max(...[0, 1, 2, 3, 4, 5].filter((k) => bullets[k]));
    room.advance(FIRE_INTRO_MS);
    for (let i = 0; i < lastShot; i++) room.advance(SHOT_MS);
    expect(pub(room).shots).toHaveLength(lastShot + 1);
    expect(pub(room).reveal).toBeNull();
    room.advance(SHOT_MS);
    expect(pub(room)).toMatchObject({ phase: 'end', reveal: bullets });
    expect(pub(room).shots).toHaveLength(lastShot + 1);
    room.advance(END_MS);
    expect(room.phase()).toBe('results');
  });

  it('caps the bullets at players − 1', () => {
    const room = playing({ players: 3, config: { bullets: 9 } });
    expect(pub(room).bulletCount).toBe(2);
    expect(room.state().bullets.filter(Boolean)).toHaveLength(2);
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 3, seed: 1 });
    const p = current(room);
    const other = room.ids.find((id) => id !== p)!;
    const snap = room.snapshot();
    const bad: unknown[] = [
      null,
      42,
      { type: 'nonsense' },
      { type: 'investigate', pair: 3, secret: false },
      { type: 'investigate', pair: -1, secret: true },
      { type: 'investigate', pair: 0.5, secret: true },
      { type: 'investigate', pair: 0 },
      { type: 'spin', steps: 3 },
      { type: 'charge', amount: 4 },
      { type: 'charge', amount: 0 },
      { type: 'manipulate', pair: 0 },
      { type: 'intro', dir: 1 },
    ];
    for (const a of bad) room.act(p, a);
    room.act(other, { type: 'spin', steps: 1 }); // not their turn
    expect(room.snapshot()).toBe(snap);
  });

  it('pauses when someone drops; if they do not return they pass and count as broke', () => {
    const room = playing({ players: 4, seed: 21 });
    const seats = room.state().seats;
    room.disconnect(seats[0]!);
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    // Their turn passed on its own; the next seat plays.
    expect(current(room)).toBe(seats[1]);
    expect(pub(room).log[0]).toMatchObject({ pid: seats[0], kind: 'private' });
    expect(pub(room).out).toEqual([seats[0]]);
    // One more broke player (of 2 needed) fires the gun.
    room.disconnect(seats[2]!);
    room.advance(20_001);
    expect(pub(room).phase).toBe('firing');
  });

  it('a manipulation left half-done by a dropped player is lost', () => {
    const room = playing({ players: 3, seed: 22 });
    const p = room.state().seats[0]!;
    room.act(p, { type: 'charge', amount: 3 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    play(room, { type: 'charge', amount: 1 });
    room.act(p, { type: 'charge', amount: 3 });
    const before = [...room.state().bullets];
    room.disconnect(p);
    room.advance(20_001);
    expect(room.state().bullets).toEqual(before);
    expect(current(room)).not.toBe(p);
    expect(pub(room).phase).toBe('play');
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'play', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('play');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('play');
    expect(pub(room).out).toEqual(['p1']);
  });

  it('shows rules on the TV only for the Host and only existing pages', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length - 1 });
    expect(pub(room).tvRules).toBe(RULES.length - 1);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('has every slide and rules page in both languages', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
  });
});
