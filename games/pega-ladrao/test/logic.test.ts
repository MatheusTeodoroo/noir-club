import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, {
  finalResult,
  robbery,
  splitSalons,
  type PlayerView,
  type PublicView,
  type Salon,
  type State,
} from '../src/logic.ts';
import { RULES, SLIDES } from '../src/texts.ts';

const pub = (room: { publicView(): unknown }) => room.publicView() as PublicView;
const view = (room: { playerView(id: string): unknown }, id: string) => room.playerView(id) as PlayerView;

/** A room already past the tutorial (the gameplay tests start at the role phase). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { ...opts, config: { tutorial: false, ...opts.config } });

type Room = ReturnType<typeof playing>;
const members = (room: Room, s: Salon) => pub(room).salons[s];

/** Everyone taps "Pronto". */
const allReady = (room: Room) => room.ids.forEach((id) => room.act(id, { type: 'ready' }));

/** Each salão votes unanimously for `pick(salão)`; returns the exiles. */
function exileBy(room: Room, pick: (s: Salon, ids: string[]) => string) {
  const chosen = { nobre: pick('nobre', members(room, 'nobre')), prive: pick('prive', members(room, 'prive')) };
  for (const s of ['nobre', 'prive'] as Salon[]) {
    for (const id of members(room, s)) room.act(id, { type: 'vote', target: chosen[s] });
  }
  return chosen;
}

const arriveAll = (room: Room) => {
  const ex = pub(room).exiles!;
  room.act(ex.nobre, { type: 'arrived' });
  room.act(ex.prive, { type: 'arrived' });
};

describe('rules helpers', () => {
  it('splits 7–12 players into the two salões', () => {
    expect([7, 8, 9, 10, 11, 12].map((n) => splitSalons(n))).toEqual([
      { nobre: 4, prive: 3 },
      { nobre: 5, prive: 3 },
      { nobre: 6, prive: 3 },
      { nobre: 6, prive: 4 },
      { nobre: 7, prive: 4 },
      { nobre: 7, prive: 5 },
    ]);
  });

  const salon: Record<string, Salon> = { a: 'nobre', b: 'nobre', c: 'nobre', d: 'nobre', e: 'nobre', f: 'prive', g: 'prive', h: 'prive' };
  const gold = { a: 0, b: 10, c: 10, d: 10, e: 10, f: 10, g: 10, h: 10 };

  it('robs the 3 residents left in the big salão', () => {
    const next = robbery(gold, salon, 'a', { nobre: 'e', prive: 'h' });
    expect(next).toMatchObject({ a: 3, b: 9, c: 9, d: 9, e: 10, f: 10, g: 10, h: 10 });
  });

  it('robs the single resident left in the small salão', () => {
    const next = robbery({ ...gold, a: 10, f: 0 }, salon, 'f', { nobre: 'e', prive: 'h' });
    expect(next).toMatchObject({ f: 1, g: 9, h: 10, a: 10, b: 10 });
  });

  it('does not rob when the burglar is in exile', () => {
    expect(robbery(gold, salon, 'a', { nobre: 'a', prive: 'h' })).toEqual(gold);
  });

  it('declares winners, losers and the burglar strictly richest', () => {
    const letters = {};
    const r = finalResult({ a: 12, b: 7, c: 7, d: 8, e: 10, f: 9, g: 9, h: 6 }, salon, 'a', letters);
    expect(r.losing).toBe('nobre');
    expect(r.winners.sort()).toEqual(['a', 'f', 'g']); // prive tie at 9 shares; burglar 12 > 10
    expect(r.losers.sort()).toEqual(['b', 'c']); // tie at the bottom shares; burglar excluded
    expect(r.scores).toEqual({ a: 3, b: 0, c: 0, d: 0, e: 0, f: 3, g: 3, h: 1 });
  });

  it('makes a burglar who only ties for most gold a loser', () => {
    const r = finalResult({ a: 10, b: 7, c: 8, d: 8, e: 10, f: 9, g: 5, h: 6 }, salon, 'a', {});
    expect(r.burglarRichest).toBe(false);
    expect(r.winners).toEqual(['f']);
    expect(r.losers.sort()).toEqual(['a', 'b']);
    expect(r.scores.a).toBe(0);
  });
});

describe(game.manifest.name['pt-BR'], () => {
  it('plays a full match at 7 players with actions ending every phase early', () => {
    const room = playing({ players: 7, config: { rounds: '6' } });
    expect(pub(room).phase).toBe('papel');
    expect(members(room, 'nobre')).toHaveLength(4);
    expect(members(room, 'prive')).toHaveLength(3);
    allReady(room);
    for (let round = 1; round <= 6; round++) {
      expect(pub(room)).toMatchObject({ phase: 'dia', round });
      const ex = exileBy(room, (_s, ids) => ids[0]!);
      expect(pub(room).phase).toBe('noite');
      expect(pub(room).exiles).toEqual(ex);
      room.advance(60_000);
      expect(pub(room).phase).toBe('troca');
      expect(members(room, 'prive')).toContain(ex.nobre);
      expect(members(room, 'nobre')).toContain(ex.prive);
      arriveAll(room);
      if (round === 2 || round === 4) {
        expect(pub(room).phase).toBe('contagem');
        expect(pub(room).counts.at(-1)?.round).toBe(round);
        room.advance(15_000);
      }
    }
    expect(pub(room).phase).toBe('final');
    const result = pub(room).result!;
    expect(result.burglar).toBe(room.state().burglar);
    room.advance(25_000);
    expect(room.phase()).toBe('results');
    for (const r of room.results() ?? []) expect(r.score).toBe(result.scores[r.playerId]);
  });

  it('timers alone drive a 12-player match to the end', () => {
    const room = playing({ players: 12, config: { rounds: '6', dayMinutes: '2', nightSeconds: 30 } });
    expect(members(room, 'nobre')).toHaveLength(7);
    expect(members(room, 'prive')).toHaveLength(5);
    const seen: string[] = [];
    for (let i = 0; i < 400 && room.phase() === 'playing'; i++) {
      const p = pub(room).phase;
      if (seen.at(-1) !== p) seen.push(p);
      room.advance(5_000);
    }
    expect(room.phase()).toBe('results');
    expect(seen.filter((p) => p === 'contagem')).toHaveLength(2);
    expect(seen.filter((p) => p === 'noite')).toHaveLength(6);
    expect(seen.at(-1)).toBe('final');
  });

  it('keeps sizes constant and the burglar robbing every night it is not exiled', () => {
    const room = playing({ players: 8, config: { rounds: '6' } });
    allReady(room);
    const { burglar } = room.state();
    for (let round = 1; round <= 3; round++) {
      // Never exile the burglar: their salão loses residents−2 gold (one exiled, one is the burglar).
      const where = room.state().salon[burglar]!;
      const before = room.state().gold;
      exileBy(room, (_s, ids) => ids.find((id) => id !== burglar)!);
      const after = room.state().gold;
      const robbed = members(room, where).length - 2;
      expect(after[burglar]! - before[burglar]!).toBe(robbed);
      room.advance(60_000);
      arriveAll(room);
      if (pub(room).phase === 'contagem') room.advance(15_000);
      expect(members(room, 'nobre')).toHaveLength(5);
      expect(members(room, 'prive')).toHaveLength(3);
    }
  });

  it('keeps the burglar, gold and letters secret until the final reveal', () => {
    const room = playing({ players: 8, config: { rounds: '6' } });
    const { burglar, letters } = room.state();
    const phones = room.ids.map((id) => JSON.stringify(view(room, id)));
    for (const [i, id] of room.ids.entries()) {
      expect(view(room, id).role).toBe(id === burglar ? 'burglar' : 'resident');
      expect(phones[i]).not.toContain('"gold"');
      expect(phones[i]).not.toContain('"letter');
    }
    allReady(room);
    for (let round = 1; round <= 6; round++) {
      const json = room.publicJson();
      expect(json).not.toContain('"burglar"');
      expect(json).not.toContain('"letters"');
      expect(json).not.toContain('"votes"');
      for (const id of room.ids) expect(JSON.stringify(view(room, id))).not.toContain('"burglar":');
      // Day votes reach only the voter's own salão.
      const voter = members(room, 'nobre')[0]!;
      room.act(voter, { type: 'vote', target: voter });
      expect(view(room, members(room, 'prive')[0]!).votes).toEqual({});
      expect(view(room, members(room, 'nobre')[1]!).votes).toEqual({ [voter]: voter });
      exileBy(room, (_s, ids) => ids[1]!);
      room.advance(60_000);
      arriveAll(room);
      if (pub(room).phase === 'contagem') {
        // Counts show gold by letter only.
        const count = pub(room).counts.at(-1)!;
        expect(Object.keys(count.gold).sort()).toEqual(Object.values(letters).sort());
        expect(room.publicJson()).not.toContain('"burglar"');
        room.advance(15_000);
      }
    }
    expect(pub(room).result?.letters).toEqual(letters);
  });

  it('ends the day early only when both salões are unanimous', () => {
    const room = playing({ players: 7 });
    allReady(room);
    const nobre = members(room, 'nobre');
    for (const id of nobre) room.act(id, { type: 'vote', target: nobre[0]! });
    expect(pub(room)).toMatchObject({ phase: 'dia', decided: { nobre: true, prive: false } });
    // A decided salão can no longer change its vote.
    const before = room.snapshot();
    room.act(nobre[1]!, { type: 'vote', target: nobre[2]! });
    expect(room.snapshot()).toBe(before);
    const prive = members(room, 'prive');
    room.act(prive[0]!, { type: 'vote', target: prive[1]! });
    room.act(prive[1]!, { type: 'vote', target: prive[1]! });
    room.act(prive[2]!, { type: 'vote', target: prive[0]! });
    expect(pub(room).phase).toBe('dia');
    room.act(prive[2]!, { type: 'vote', target: prive[1]! });
    expect(pub(room).phase).toBe('noite');
    expect(pub(room).exiles).toEqual({ nobre: nobre[0], prive: prive[1] });
  });

  it('exiles the most voted at the end of the day, drawing among ties', () => {
    const room = playing({ players: 9, seed: 3 });
    allReady(room);
    const nobre = members(room, 'nobre'); // 6
    const prive = members(room, 'prive'); // 3
    room.act(nobre[0]!, { type: 'vote', target: nobre[5]! });
    room.act(nobre[1]!, { type: 'vote', target: nobre[5]! });
    room.act(nobre[2]!, { type: 'vote', target: nobre[4]! });
    room.act(prive[0]!, { type: 'vote', target: prive[0]! });
    room.act(prive[1]!, { type: 'vote', target: prive[1]! });
    room.advance(3 * 60_000);
    const ex = pub(room).exiles!;
    expect(ex.nobre).toBe(nobre[5]);
    expect([prive[0], prive[1]]).toContain(ex.prive);
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 7 });
    allReady(room);
    const before = room.snapshot();
    const nobre = members(room, 'nobre');
    const prive = members(room, 'prive');
    room.act(nobre[0]!, { type: 'vote', target: prive[0]! }); // other salão
    room.act(nobre[0]!, { type: 'vote', target: 'p99' });
    room.act(nobre[0]!, { type: 'vote', target: 3 });
    room.act(nobre[0]!, { type: 'arrived' }); // wrong phase
    room.act(nobre[0]!, { type: 'ready' }); // wrong phase
    room.act(nobre[0]!, { type: 'intro', dir: 1 });
    room.act(nobre[0]!, { type: 'nonsense' });
    room.act(nobre[0]!, null);
    expect(room.snapshot()).toBe(before);
    exileBy(room, (_s, ids) => ids[0]!);
    room.advance(60_000);
    const swap = room.snapshot();
    room.act(nobre[1]!, { type: 'arrived' }); // not an exile
    expect(room.snapshot()).toBe(swap);
  });

  it('does not wait for a player who dropped', () => {
    const room = playing({ players: 7 });
    allReady(room);
    const nobre = members(room, 'nobre');
    const prive = members(room, 'prive');
    for (const id of prive) room.act(id, { type: 'vote', target: prive[0]! });
    for (const id of nobre.slice(0, 3)) room.act(id, { type: 'vote', target: nobre[0]! });
    room.act(nobre[3]!, { type: 'vote', target: nobre[1]! });
    room.disconnect(nobre[3]!);
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    // Their vote is dropped and the rest of the Nobre is unanimous.
    expect(pub(room).phase).toBe('noite');
    expect(pub(room).exiles?.nobre).toBe(nobre[0]);
    room.advance(60_000);
    room.act(pub(room).exiles!.nobre, { type: 'arrived' });
    room.act(pub(room).exiles!.prive, { type: 'arrived' });
    expect(pub(room)).toMatchObject({ phase: 'dia', round: 2 });
  });

  it('does not wait for a missing exile during the swap', () => {
    const room = playing({ players: 7 });
    allReady(room);
    const ex = exileBy(room, (_s, ids) => ids[0]!);
    room.advance(60_000);
    room.act(ex.nobre, { type: 'arrived' });
    room.disconnect(ex.prive);
    room.advance(20_001);
    expect(pub(room)).toMatchObject({ phase: 'dia', round: 2 });
    expect(members(room, 'nobre')).toContain(ex.prive);
  });

  it('tells an exile where to go', () => {
    const room = playing({ players: 7 });
    allReady(room);
    const ex = exileBy(room, (_s, ids) => ids[0]!);
    expect(view(room, ex.nobre).exile).toEqual({ from: 'nobre', to: 'prive', arrived: false });
    expect(view(room, members(room, 'nobre')[1]!).exile).toBeNull();
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 7 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).phase).toBe('papel');
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 7 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('papel');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 7 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('papel');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 7 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('shows first-day hints only with the tutorial on', () => {
    const room = createTestRoom<State>(game, { players: 7 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    allReady(room);
    expect(pub(room).hint).toBe('vote');
    room.act(members(room, 'nobre')[0]!, { type: 'vote', target: members(room, 'nobre')[0]! });
    expect(pub(room).hint).toBe('unanimous');
    const off = playing({ players: 7 });
    allReady(off);
    expect(pub(off).hint).toBeNull();
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

describe('remote screens (Host option)', () => {
  const where = (room: Room, id: string) => room.playerFrame(id)!.platform.space?.['pt-BR'] ?? null;

  it('is off unless the Host turns it on', () => {
    const room = playing({ players: 7 });
    expect(where(room, 'p1')).toBeNull();
  });

  it('sends each player to their salão, the exiles to the Terrace at night and to their new salão in the swap', () => {
    const room = playing({ players: 7 });
    room.engine.action('p1', { type: 'setSettings', remoteScreens: true }, room.now);
    for (const id of members(room, 'nobre')) expect(where(room, id)).toBe('Salão Nobre');
    for (const id of members(room, 'prive')) expect(where(room, id)).toBe('Salão Privé');
    allReady(room);
    const ex = exileBy(room, (_s, ids) => ids[0]!);
    expect(pub(room).phase).toBe('noite');
    expect(where(room, ex.nobre)).toBe('Terraço');
    expect(where(room, ex.prive)).toBe('Terraço');
    room.advance(60_001);
    expect(pub(room).phase).toBe('troca');
    expect(where(room, ex.nobre)).toBe('Salão Privé');
    expect(where(room, ex.prive)).toBe('Salão Nobre');
  });
});
