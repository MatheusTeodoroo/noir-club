import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { scoreMatch, type DealerView, type PlayerView, type PublicView, type State } from '../src/logic.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;
const MIN = 60_000;

function phoneRoom(players: number, config: Record<string, unknown> = {}, seed = 3) {
  const room = createTestRoom<State>(game, { players, seed, config: { roleReveal: 'phone', ...config } });
  for (const id of room.ids) room.act(id, { type: 'seen' });
  return room;
}

const zombies = (room: Room) => room.ids.filter((id) => room.state().zombie[id]);
const humans = (room: Room) => room.ids.filter((id) => !room.state().zombie[id]);

/** The whole in-person touch: request, accept, both type the other's code. */
function touch(room: Room, a: string, b: string) {
  room.act(a, { type: 'touch', target: b });
  room.act(b, { type: 'accept' });
  const codeA = phone(room, a).request!.myCode!;
  const codeB = phone(room, b).request!.myCode!;
  room.act(a, { type: 'code', value: codeB });
  room.act(b, { type: 'code', value: codeA });
}

describe('Surto', () => {
  it('plays a full match at the minimum player count', () => {
    const room = phoneRoom(5, { rounds: 2, intervalSec: 0 });
    expect(pub(room).phase).toBe('round');
    expect(room.state().initial).toHaveLength(1);
    for (let round = 1; round <= 2; round++) {
      expect(pub(room)).toMatchObject({ phase: 'round', round });
      const h = humans(room);
      for (let i = 0; i + 1 < h.length; i += 2) touch(room, h[i]!, h[i + 1]!);
      if (h.length % 2) touch(room, h[h.length - 1]!, h[0]!);
      room.advance(8 * MIN);
      if (round === 1) {
        expect(pub(room).phase).toBe('interval');
        room.advance(8_000);
      }
    }
    expect(pub(room).phase).toBe('final');
    room.advance(25_000);
    expect(room.phase()).toBe('results');
    expect(room.results()).toHaveLength(5);
  });

  it('plays a full match at the maximum player count, roles at the Dealer', () => {
    const room = createTestRoom<State>(game, { players: 12, seed: 5, config: { rounds: 1 } });
    expect(pub(room).phase).toBe('roles');
    for (const id of room.ids) room.visitDealer(id);
    expect(pub(room).phase).toBe('round');
    expect(room.state().initial).toHaveLength(2);
    room.advance(8 * MIN);
    expect(pub(room).phase).toBe('final');
    room.advance(25_000);
    expect(room.phase()).toBe('results');
    expect(room.results()).toHaveLength(12);
  });

  it('timers alone carry the match to the end (nobody touches → everyone turns)', () => {
    const room = createTestRoom<State>(game, { players: 6, config: { rounds: 3 } });
    room.advance(30_000 + 20_000 * 6);
    expect(pub(room).phase).toBe('round');
    room.advance(8 * MIN);
    // Every human failed to touch: all zombies, so the match ends early.
    expect(pub(room).phase).toBe('final');
    expect(pub(room).final?.scenario).toBe('zombies');
    room.advance(25_000);
    expect(room.phase()).toBe('results');
  });

  it('roles end early once everyone has seen theirs', () => {
    const room = createTestRoom<State>(game, { players: 5, config: { roleReveal: 'phone' } });
    for (const id of room.ids.slice(0, 4)) room.act(id, { type: 'seen' });
    expect(pub(room).phase).toBe('roles');
    room.act('p5', { type: 'seen' });
    expect(pub(room).phase).toBe('round');
  });

  it('scores a human-human touch and infects on a human-zombie touch', () => {
    const room = phoneRoom(6);
    const [z] = zombies(room);
    const [h1, h2, h3] = humans(room);
    touch(room, h1!, h2!);
    expect(room.state().points[h1!]).toBe(1);
    expect(room.state().points[h2!]).toBe(1);
    touch(room, h3!, z!);
    expect(room.state().zombie[h3!]).toBe(true);
    expect(room.state().infections[0]).toMatchObject({ id: h3, by: z, cause: 'touch', round: 1 });
    // The infected now infects too.
    touch(room, h3!, h1!);
    expect(room.state().zombie[h1!]).toBe(true);
    expect(room.state().points[h1!]).toBe(1);
  });

  it('zombie-zombie touches do nothing', () => {
    const room = phoneRoom(8, { zombies: '2' });
    const [z1, z2] = zombies(room);
    touch(room, z1!, z2!);
    expect(room.state().touchCount).toBe(1);
    expect(room.state().points[z1!]).toBe(0);
    expect(room.state().infections).toEqual([]);
  });

  it('phones only say the touch was registered', () => {
    const room = phoneRoom(6);
    const [z] = zombies(room);
    const [h] = humans(room);
    const before = phone(room, h!);
    touch(room, h!, z!);
    const after = phone(room, h!);
    expect(after.notice).toMatchObject({ kind: 'touched', other: z });
    expect(after.role).toBeNull();
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    expect(JSON.stringify(after)).not.toMatch(/zombie|points|infect/);
  });

  it('forbids touching the same partner twice in a round, but allows it next round', () => {
    const room = phoneRoom(6, { intervalSec: 0 });
    const [h1, h2] = humans(room);
    touch(room, h1!, h2!);
    const snap = room.snapshot();
    room.act(h1!, { type: 'touch', target: h2 });
    room.act(h2!, { type: 'touch', target: h1 });
    expect(room.snapshot()).toBe(snap);
    expect(phone(room, h1!).targets.find((t) => t.id === h2)?.touched).toBe(true);
    room.advance(8 * MIN + 8_000);
    expect(pub(room)).toMatchObject({ phase: 'round', round: 2 });
    room.act(h1!, { type: 'touch', target: h2 });
    expect(phone(room, h1!).request?.partner).toBe(h2);
  });

  it('calls a touch off after three wrong codes, or when it expires, or is declined', () => {
    const room = phoneRoom(6);
    const [a, b, c] = room.ids;
    room.act(a!, { type: 'touch', target: b });
    room.act(b!, { type: 'accept' });
    const right = phone(room, b!).request!.myCode!;
    const wrong = right === 99 ? 98 : right + 1;
    room.act(a!, { type: 'code', value: wrong });
    room.act(a!, { type: 'code', value: wrong });
    expect(phone(room, a!).request?.missesLeft).toBe(1);
    room.act(a!, { type: 'code', value: wrong });
    expect(phone(room, a!).request).toBeNull();
    expect(phone(room, b!).notice?.kind).toBe('failed');
    expect(room.state().touchCount).toBe(0);

    room.act(a!, { type: 'touch', target: c });
    expect(phone(room, c!).request).toMatchObject({ partner: a, outgoing: false, accepted: false });
    room.advance(45_000);
    expect(phone(room, a!).request).toBeNull();
    expect(phone(room, a!).notice?.kind).toBe('expired');

    room.act(a!, { type: 'touch', target: c });
    room.act(c!, { type: 'decline' });
    expect(phone(room, a!).notice).toMatchObject({ kind: 'declined', other: c });
  });

  it('lets a player hold only one open request at a time', () => {
    const room = phoneRoom(6);
    const [a, b, c] = room.ids;
    room.act(a!, { type: 'touch', target: b });
    const snap = room.snapshot();
    room.act(c!, { type: 'touch', target: b });
    room.act(a!, { type: 'touch', target: c });
    expect(room.snapshot()).toBe(snap);
    expect(phone(room, c!).targets.find((t) => t.id === b)?.busy).toBe(true);
  });

  it('cures a fresh infection inside the window, silently', () => {
    const room = phoneRoom(6, { cureWindowMin: 3 });
    const [z] = zombies(room);
    const [h] = humans(room);
    touch(room, h!, z!);
    room.advance(2 * MIN);
    room.act(h!, { type: 'cure' });
    expect(room.state().zombie[h!]).toBe(false);
    expect(room.state().infections[0]!.curedAt).not.toBeNull();
    expect(phone(room, h!)).toMatchObject({ cures: 0, notice: { kind: 'cured' } });
  });

  it('a cure fails outside the window, when not infected, and for a starting zombie — same feedback', () => {
    const room = phoneRoom(6, { cureWindowMin: 1 });
    const [z] = zombies(room);
    const [h1, h2] = humans(room);
    touch(room, h1!, z!);
    room.advance(MIN + 1);
    room.act(h1!, { type: 'cure' });
    expect(room.state().zombie[h1!]).toBe(true);

    room.act(h2!, { type: 'cure' });
    room.act(z!, { type: 'cure' });
    expect(room.state().zombie[z!]).toBe(true);
    for (const id of [h1!, h2!, z!]) expect(phone(room, id)).toMatchObject({ cures: 0, notice: { kind: 'cured' } });
  });

  it('an infection from an earlier round cannot be cured', () => {
    const room = phoneRoom(6, { cureWindowMin: 10, roundMin: 2, intervalSec: 0 });
    const [z] = zombies(room);
    const others = humans(room);
    const [h] = others;
    room.advance(2 * MIN - 30_000);
    touch(room, h!, z!);
    for (let i = 1; i + 1 < others.length; i += 2) touch(room, others[i]!, others[i + 1]!);
    room.advance(30_000 + 8_000);
    expect(pub(room)).toMatchObject({ phase: 'round', round: 2 });
    room.act(h!, { type: 'cure' });
    expect(room.state().zombie[h!]).toBe(true);
  });

  it('turns a human who touched nobody at the end of the round, for good', () => {
    const room = phoneRoom(6, { intervalSec: 0 });
    const lonely = humans(room)[0]!;
    const rest = humans(room).slice(1);
    for (let i = 0; i + 1 < rest.length; i += 2) touch(room, rest[i]!, rest[i + 1]!);
    room.advance(8 * MIN);
    expect(room.state().zombie[lonely]).toBe(true);
    expect(room.state().infections.find((i) => i.id === lonely)).toMatchObject({ by: null, cause: 'idle' });
    room.advance(8_000);
    room.act(lonely, { type: 'cure' });
    expect(room.state().zombie[lonely]).toBe(true);
  });

  it('gives a cure in secret: the receiver sees who, nobody else does', () => {
    const room = phoneRoom(6);
    const [a, b, c] = room.ids;
    room.act(a!, { type: 'give', target: b });
    expect(phone(room, a!)).toMatchObject({ cures: 0, notice: { kind: 'gave', other: b } });
    expect(phone(room, b!)).toMatchObject({ cures: 2, giftsFrom: [a], notice: { kind: 'gift', other: a } });
    expect(phone(room, c!).giftsFrom).toEqual([]);
    expect(room.publicJson()).not.toContain('gift');
    // Nothing left to give.
    const snap = room.snapshot();
    room.act(a!, { type: 'give', target: c });
    expect(room.snapshot()).toBe(snap);
  });

  it('a starting zombie can give away its cure, and a gifted cure works', () => {
    const room = phoneRoom(6);
    const [z] = zombies(room);
    const [h, h2] = humans(room);
    room.act(z!, { type: 'give', target: h });
    room.act(h!, { type: 'give', target: h2 });
    touch(room, h!, z!);
    room.act(h!, { type: 'cure' });
    expect(room.state().zombie[h!]).toBe(false);
    expect(phone(room, h!).cures).toBe(0);
  });

  it('cures can be given during the break but not taken', () => {
    const room = phoneRoom(6, { intervalSec: 60 });
    const h = humans(room);
    for (let i = 0; i + 1 < h.length; i += 2) touch(room, h[i]!, h[i + 1]!);
    room.advance(8 * MIN);
    expect(pub(room).phase).toBe('interval');
    const [a, b] = room.ids;
    room.act(a!, { type: 'give', target: b });
    expect(phone(room, b!).cures).toBe(2);
    const snap = room.snapshot();
    room.act(b!, { type: 'cure' });
    expect(room.snapshot()).toBe(snap);
  });

  it('reveals only the counts between rounds', () => {
    const room = phoneRoom(6, { intervalSec: 30 });
    const [z] = zombies(room);
    const [h, ...rest] = humans(room);
    touch(room, h!, z!);
    for (let i = 0; i + 1 < rest.length; i += 2) touch(room, rest[i]!, rest[i + 1]!);
    room.advance(8 * MIN);
    expect(pub(room).phase).toBe('interval');
    const c = room.state();
    const zombieCount = Object.values(c.zombie).filter(Boolean).length;
    expect(pub(room).history).toEqual([{ round: 1, zombies: zombieCount, humans: 6 - zombieCount }]);
    expect(pub(room).final).toBeNull();
  });

  it('never leaks roles, outcomes, points, cures or codes before the final', () => {
    const room = phoneRoom(8);
    const zs = zombies(room);
    const [h1, h2, h3] = humans(room);
    touch(room, h1!, h2!);
    touch(room, h3!, zs[0]!);
    room.act(h1!, { type: 'give', target: h2 });
    room.act(h1!, { type: 'touch', target: h3 });
    room.act(h3!, { type: 'accept' });
    const json = room.publicJson();
    for (const key of ['initial', 'zombie', 'points', 'cures', 'infections', 'gifts', 'codes', 'myCode', 'notice']) {
      expect(json).not.toContain(`"${key}"`);
    }
    const codeOf = (id: string) => phone(room, id).request!.myCode;
    // Each phone carries its own code only.
    expect(JSON.stringify(phone(room, h1!))).not.toContain(`"partnerCode"`);
    expect(codeOf(h1!)).not.toBe(codeOf(h3!));
    for (const id of room.ids) {
      const v = phone(room, id);
      expect(v.role).toBeNull();
      if (id !== h2) expect(v.giftsFrom).toEqual([]);
    }
  });

  it('shows the role only to its owner: on the phone during roles, or at the Dealer', () => {
    const room = createTestRoom<State>(game, { players: 6, seed: 9, config: { roleReveal: 'phone' } });
    const initial = room.state().initial;
    for (const id of room.ids) {
      expect(phone(room, id).role).toBe(initial.includes(id) ? 'zombie' : 'human');
      expect(room.playerFrame(id)?.platform.canRequestDealer).toBe(false);
    }
    expect(room.publicJson()).not.toContain('"role"');

    const dealer = createTestRoom<State>(game, { players: 6, seed: 9, remote: ['p6'] });
    expect(phone(dealer, 'p1').role).toBeNull();
    expect(dealer.playerFrame('p1')?.platform.canRequestDealer).toBe(true);
    const seen = dealer.visitDealer('p1') as DealerView;
    expect(seen.role).toBe(dealer.state().initial.includes('p1') ? 'zombie' : 'human');
    expect(dealer.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
    const remote = dealer.enterDealer('p6') as DealerView;
    expect(remote.role).toBe(dealer.state().initial.includes('p6') ? 'zombie' : 'human');
    expect(dealer.dealerFrame()?.game).toBeNull();
    dealer.leaveDealer('p6');
    for (const id of ['p2', 'p3', 'p4', 'p5']) dealer.visitDealer(id);
    expect(pub(dealer).phase).toBe('round');
    expect(dealer.playerFrame('p1')?.platform.canRequestDealer).toBe(false);
  });

  it('ignores invalid actions', () => {
    const room = phoneRoom(5);
    const before = room.snapshot();
    room.act('p1', null);
    room.act('p1', { type: 'nonsense' });
    room.act('p1', { type: 'touch', target: 'p1' });
    room.act('p1', { type: 'touch', target: 'p99' });
    room.act('p1', { type: 'accept' });
    room.act('p1', { type: 'code', value: 42 });
    room.act('p1', { type: 'give', target: 'p1' });
    room.act('p1', { type: 'seen' });
    expect(room.snapshot()).toBe(before);

    room.act('p1', { type: 'touch', target: 'p2' });
    room.act('p2', { type: 'accept' });
    const mid = room.snapshot();
    room.act('p1', { type: 'accept' });
    room.act('p1', { type: 'code', value: 3.5 });
    room.act('p1', { type: 'code', value: 100 });
    room.act('p3', { type: 'code', value: 50 });
    expect(room.snapshot()).toBe(mid);
  });

  it('cancels the requests of a player who drops and keeps playing', () => {
    const room = phoneRoom(6);
    room.act('p1', { type: 'touch', target: 'p2' });
    room.disconnect('p2');
    expect(room.publicPlatform().paused?.playerId).toBe('p2');
    room.advance(20_001);
    expect(room.publicPlatform().paused).toBeFalsy();
    expect(phone(room, 'p1').request).toBeNull();
    expect(pub(room).phase).toBe('round');
  });

  it('a player who drops during roles counts as having seen theirs', () => {
    const room = createTestRoom<State>(game, { players: 5, config: { roleReveal: 'phone' } });
    for (const id of room.ids.slice(0, 4)) room.act(id, { type: 'seen' });
    room.disconnect('p5');
    room.advance(20_001);
    expect(pub(room).phase).toBe('round');
  });

  describe('scoring', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const base = { initial: ['a'], infections: [] };

    it('survivors keep their points, the best gets +3, every zombie 0', () => {
      const r = scoreMatch(
        { ...base, zombie: { a: true, b: true, c: false, d: false, e: false }, points: { b: 4, c: 3, d: 1, e: 2 } },
        ids,
      );
      expect(r.scenario).toBe('survivors');
      expect(r.scores).toEqual({ a: 0, b: 0, c: 6, d: 1, e: 2 });
    });

    it('a tie at the top gives every tied survivor the bonus', () => {
      const r = scoreMatch(
        { ...base, zombie: { a: true, b: false, c: false, d: false, e: true }, points: { b: 2, c: 2, d: 1 } },
        ids,
      );
      expect(r.scenario).toBe('survivors');
      expect(r.scores).toMatchObject({ b: 5, c: 5, d: 1, a: 0, e: 0 });
    });

    it('all survivors equal: joint victory', () => {
      const r = scoreMatch(
        { ...base, zombie: { a: true, b: false, c: false, d: false, e: false }, points: { b: 2, c: 2, d: 2, e: 2 } },
        ids,
      );
      expect(r.scenario).toBe('tie');
      expect(r.scores).toEqual({ a: 0, b: 5, c: 5, d: 5, e: 5 });
    });

    it('everyone turned: the zombies win the game but score nothing', () => {
      const r = scoreMatch(
        { ...base, zombie: { a: true, b: true, c: true, d: true, e: true }, points: { b: 3 } },
        ids,
      );
      expect(r.scenario).toBe('zombies');
      expect(r.scores).toEqual({ a: 0, b: 0, c: 0, d: 0, e: 0 });
    });

    it('a scripted match ends with the scores the rules give', () => {
      const room = phoneRoom(6, { rounds: 1 });
      const [z] = zombies(room);
      const [h1, h2, h3, h4, h5] = humans(room);
      touch(room, h1!, h2!);
      touch(room, h1!, h3!);
      touch(room, h4!, h5!);
      touch(room, h2!, z!);
      room.advance(8 * MIN);
      expect(pub(room).final).toMatchObject({ scenario: 'survivors', survivors: [h1, h3, h4, h5].sort() });
      room.advance(25_000);
      const scores = Object.fromEntries(room.results()!.map((r) => [r.playerId, r.score]));
      expect(scores).toEqual({ [z!]: 0, [h1!]: 5, [h2!]: 0, [h3!]: 1, [h4!]: 1, [h5!]: 1 });
    });
  });
});
