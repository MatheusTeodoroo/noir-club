import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type DealerView, type State } from '../src/logic.ts';
import { CATALOG, hostageTable, type CharId } from '../src/shared.ts';
import { CREDITS, RULES, SLIDES } from '../src/texts.ts';
import { arriveAll, elect, finishRound, match, newRoom, playOut, pub, pv, readyAll } from './helpers.ts';

const BASIC: CharId[] = ['chefao', 'assassino', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim'];
const HALLS = ['A', 'B', 'A', 'A', 'B', 'B'] as const;
const basic = (opts: Parameters<typeof match>[2] = {}) => match(BASIC, [...HALLS], opts);

describe('Ficha Explosiva — flow', () => {
  it('plays a full basic match at the minimum player count', () => {
    const room = newRoom(6);
    expect(pub(room).phase).toBe('mesa');
    expect(pub(room).mesa?.preview).toHaveLength(6);
    room.act('p1', { type: 'deal' });
    expect(pub(room).phase).toBe('briefing');
    expect(pub(room).rooms.A.length + pub(room).rooms.B.length).toBe(6);
    readyAll(room);
    expect(pub(room)).toMatchObject({ phase: 'round', round: 1, rounds: 3, hostages: [1, 1, 1] });

    for (let round = 1; round <= 3; round++) {
      const s = room.state();
      const [a1, a2] = pub(room).rooms.A;
      const [b1, b2] = pub(room).rooms.B;
      if (!s.leader.A) room.act(a2!, { type: 'nominate', target: a1 });
      if (!s.leader.B) room.act(b2!, { type: 'nominate', target: b1 });
      for (const hall of ['A', 'B'] as const) {
        const leader = room.state().leader[hall]!;
        const target = pv(room, leader).eligible[0]!;
        room.act(leader, { type: 'toggleHostage', target });
        room.act(leader, { type: 'lockHostages' });
        expect(pub(room).locked[hall]).toBe(true);
      }
      finishRound(room);
      expect(pub(room).phase).toBe('exchange');
      arriveAll(room);
    }
    expect(['pause', 'reveal']).toContain(pub(room).phase);
    room.advance(200_000);
    expect(room.phase()).toBe('results');
  });

  it('plays a full chaotic match at the maximum player count, timers only', () => {
    const room = newRoom(30, { preset: 'caos', rounds: '5' });
    expect(pub(room).mesa?.errors).toEqual([]);
    room.act('p1', { type: 'deal' });
    expect(pub(room).rounds).toBe(5);
    room.advance(2_000_000);
    expect(room.phase()).toBe('results');
  });

  it('timers alone move every phase after the deal', () => {
    const room = newRoom(7);
    room.act('p1', { type: 'deal' });
    room.advance(90_000);
    expect(pub(room).phase).toBe('round');
    room.advance(180_000);
    expect(pub(room).phase).toBe('exchange');
    room.advance(30_000);
    expect(pub(room)).toMatchObject({ phase: 'round', round: 2 });
    room.advance(1_000_000);
    expect(room.phase()).toBe('results');
  });

  it('only the Host builds the deck, and an invalid deck cannot be dealt', () => {
    const room = newRoom(6);
    const before = room.snapshot();
    room.act('p2', { type: 'deal' });
    room.act('p2', { type: 'toggleUnit', unit: 'medico' });
    expect(room.snapshot()).toBe(before);
    for (const u of ['medico', 'afilhado', 'rival']) room.act('p1', { type: 'toggleUnit', unit: u });
    expect(pub(room).mesa?.errors).toContain('tooMany');
    room.act('p1', { type: 'deal' });
    expect(pub(room).phase).toBe('mesa');
    room.act('p1', { type: 'toggleUnit', unit: 'investigador' });
    expect(pub(room).mesa?.errors).toContain('needBury');
  });

  it('builds balanced decks, adding the Apostador on an odd count', () => {
    const odd = newRoom(7);
    expect(odd.publicView()).toMatchObject({ mesa: { canBury: true } });
    const deck = pub(odd).mesa!.preview;
    expect(deck.filter((c) => CATALOG[c].team === 'ouro')).toHaveLength(3);
    expect(deck.filter((c) => CATALOG[c].team === 'carmim')).toHaveLength(3);
    expect(deck).toContain('apostador');
    const even = newRoom(8);
    expect(pub(even).mesa!.canBury).toBe(false);
    const before = even.snapshot();
    even.act('p1', { type: 'setBury', on: true });
    expect(even.snapshot()).toBe(before);
  });

  it('presets fit the table', () => {
    for (const n of [6, 9, 12, 20, 30]) {
      for (const preset of ['basico', 'classico', 'caos']) {
        const room = newRoom(n, { preset });
        expect(pub(room).mesa!.errors).toEqual([]);
        // The Bêbado brings one extra card: the one set aside until the last round.
        const extra = pub(room).mesa!.units.includes('bebado') ? 1 : 0;
        expect(pub(room).mesa!.preview).toHaveLength(n + extra);
      }
    }
  });

  it('uses the leader-card hostage table', () => {
    expect(hostageTable(6, 3)).toEqual([1, 1, 1]);
    expect(hostageTable(13, 3)).toEqual([1, 1, 1]);
    expect(hostageTable(14, 3)).toEqual([2, 1, 1]);
    expect(hostageTable(22, 3)).toEqual([3, 2, 1]);
    expect(hostageTable(11, 5)).toEqual([2, 2, 1, 1, 1]);
    expect(hostageTable(18, 5)).toEqual([4, 3, 2, 1, 1]);
    expect(hostageTable(30, 5)).toEqual([5, 4, 3, 2, 1]);
  });

  it('plays 3 rounds when 5 are asked with fewer than 11', () => {
    const room = newRoom(10, { rounds: '5' });
    room.act('p1', { type: 'deal' });
    expect(pub(room)).toMatchObject({ rounds: 3, big: false });
  });

  it('ends the briefing early when everyone is ready, and the exchange when every hostage arrived', () => {
    const room = basic({ ready: false });
    expect(pub(room).phase).toBe('briefing');
    readyAll(room);
    expect(pub(room).phase).toBe('round');
    elect(room, 'p1', 'p2');
    finishRound(room);
    expect(pub(room).phase).toBe('exchange');
    arriveAll(room);
    expect(pub(room)).toMatchObject({ phase: 'round', round: 2 });
  });

  it('without a clock, a round ends when both leaders lock', () => {
    const room = basic({ config: { timing: 'sem' } });
    expect(pub(room).deadline).toBeNull();
    elect(room, 'p1', 'p2');
    room.act('p1', { type: 'toggleHostage', target: 'p3' });
    room.act('p1', { type: 'lockHostages' });
    room.advance(600_000);
    expect(pub(room).phase).toBe('round');
    room.act('p2', { type: 'toggleHostage', target: 'p5' });
    room.act('p2', { type: 'lockHostages' });
    expect(pub(room).phase).toBe('exchange');
  });
});

describe('leaders and hostages', () => {
  it('a player cannot nominate themselves; a nomination sticks', () => {
    const room = basic();
    room.act('p1', { type: 'nominate', target: 'p1' });
    expect(pub(room).leaders.A).toBeNull();
    room.act('p1', { type: 'nominate', target: 'p2' }); // other hall
    expect(pub(room).leaders.A).toBeNull();
    room.act('p3', { type: 'nominate', target: 'p1' });
    room.act('p4', { type: 'nominate', target: 'p4' });
    expect(pub(room).leaders.A).toBe('p1');
  });

  it('the leader cannot be a hostage and must lock the exact count', () => {
    const room = basic();
    elect(room, 'p1', 'p2');
    room.act('p1', { type: 'toggleHostage', target: 'p1' });
    room.act('p1', { type: 'lockHostages' });
    expect(pub(room).locked.A).toBe(false);
    room.act('p1', { type: 'toggleHostage', target: 'p3' });
    room.act('p1', { type: 'toggleHostage', target: 'p4' }); // over the count
    expect(pv(room, 'p1').picks).toEqual(['p3']);
    room.act('p1', { type: 'lockHostages' });
    room.act('p1', { type: 'toggleHostage', target: 'p3' }); // locked: can't change
    expect(pv(room, 'p1').picks).toEqual(['p3']);
    expect(pv(room, 'p4').picks).toEqual(['p3']); // the hall knows
    expect(pv(room, 'p5').picks).toEqual([]); // the other hall does not
    expect(room.publicJson()).not.toContain('"picks"');
  });

  it('the exchange swaps the hostages between halls', () => {
    const room = basic();
    elect(room, 'p1', 'p2');
    room.act('p1', { type: 'toggleHostage', target: 'p3' });
    room.act('p2', { type: 'toggleHostage', target: 'p5' });
    finishRound(room);
    expect(pub(room).exchange).toEqual({ A: ['p3'], B: ['p5'] });
    expect(pv(room, 'p3').hostage).toBe('B');
    expect(pub(room).rooms.A).toEqual(expect.arrayContaining(['p1', 'p4', 'p5']));
    expect(pub(room).rooms.B).toEqual(expect.arrayContaining(['p2', 'p6', 'p3']));
  });

  it('a hall without a leader gets a random one when time runs out', () => {
    const room = basic();
    finishRound(room);
    const s = room.state();
    expect(s.leader.A).not.toBeNull();
    expect(s.exchange!.A).toHaveLength(1);
    expect(s.exchange!.A).not.toContain(s.leader.A);
  });

  it('a majority pointing at someone topples the leader', () => {
    const room = basic();
    elect(room, 'p1', 'p2');
    room.act('p3', { type: 'point', target: 'p4' });
    expect(pub(room).leaders.A).toBe('p1');
    room.act('p4', { type: 'point', target: 'p4' }); // you may point at yourself
    expect(pub(room).leaders.A).toBe('p4');
    expect(pv(room, 'p3').points).toEqual({ p1: null, p3: null, p4: null });
  });

  it('a handed-over leadership cannot come back the same round', () => {
    const room = basic();
    elect(room, 'p1', 'p2');
    room.act('p1', { type: 'offerLead', target: 'p3' });
    room.act('p3', { type: 'answerLead', accept: true });
    expect(pub(room).leaders.A).toBe('p3');
    room.act('p3', { type: 'offerLead', target: 'p1' });
    expect(pv(room, 'p1').offer).toBeNull();
    room.act('p3', { type: 'offerLead', target: 'p4' });
    room.act('p4', { type: 'answerLead', accept: false });
    expect(pub(room).leaders.A).toBe('p3');
  });
});

describe('sharing and secrets', () => {
  it('keeps every card off the TV and off other phones', () => {
    const room = basic();
    const json = room.publicJson();
    expect(json).not.toContain('"card"');
    expect(json).not.toContain('"cards"');
    for (const id of room.ids) expect(pv(room, id).card).toBe(room.state().card[id]);
    const { deck: _deck, ...p3 } = pv(room, 'p3');
    expect(JSON.stringify(p3)).not.toContain('chefao');
  });

  it('a card share needs consent, happens in the same hall, and only the pair learns', () => {
    const room = basic();
    room.act('p1', { type: 'request', to: 'p2', kind: 'card' }); // other hall
    expect(pv(room, 'p1').requestOut).toBeNull();
    room.act('p1', { type: 'request', to: 'p3', kind: 'card' });
    const req = pv(room, 'p3').requestsIn[0]!;
    expect(req).toMatchObject({ from: 'p1', kind: 'card' });
    room.act('p3', { type: 'answer', id: req.id, accept: true });
    expect(pv(room, 'p1').seen[0]).toMatchObject({ who: 'p3', card: 'soldadoOuro' });
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: 'chefao' });
    expect(pv(room, 'p4').seen).toEqual([]);
    expect(room.publicJson()).not.toContain('chefao"}');
  });

  it('a declined or expired offer tells the requester only that', () => {
    const room = basic();
    room.act('p1', { type: 'request', to: 'p3', kind: 'card' });
    room.act('p3', { type: 'answer', id: pv(room, 'p3').requestsIn[0]!.id, accept: false });
    expect(pv(room, 'p1').notices.at(-1)).toMatchObject({ k: 'declined', who: 'p3' });
    room.act('p1', { type: 'request', to: 'p4', kind: 'card' });
    room.advance(30_000);
    expect(pv(room, 'p1').notices.at(-1)).toMatchObject({ k: 'expired', who: 'p4' });
    expect(pv(room, 'p1').seen).toEqual([]);
  });

  it('colour sharing only exists at 11+, and the Infiltrado shows the other colour', () => {
    const small = basic();
    small.act('p1', { type: 'request', to: 'p3', kind: 'color' });
    expect(pv(small, 'p1').requestOut).toBeNull();

    const cards: CharId[] = ['infiltradoCarmim', ...Array(10).fill('soldadoOuro')];
    const room = match(cards, cards.map((_, i) => (i % 2 ? 'B' : 'A')), {});
    room.state().big = true;
    room.act('p1', { type: 'request', to: 'p3', kind: 'color' });
    room.act('p3', { type: 'answer', id: pv(room, 'p3').requestsIn[0]!.id, accept: true });
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: null, look: 'ouro' });
  });

  it('a public reveal reaches the whole hall but not the TV', () => {
    const room = basic();
    room.act('p1', { type: 'showRoom' });
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: 'chefao', how: 'public' });
    expect(pv(room, 'p4').seen[0]).toMatchObject({ who: 'p1', card: 'chefao' });
    expect(pv(room, 'p2').seen).toEqual([]);
    expect(pub(room).revealed).toEqual({});
  });

  it('ignores invalid actions', () => {
    const room = basic();
    const before = room.snapshot();
    room.act('p1', null);
    room.act('p1', { type: 'nonsense' });
    room.act('p1', { type: 'toggleHostage', target: 'p3' }); // not the leader
    room.act('p1', { type: 'request', to: 'p1', kind: 'card' });
    room.act('p1', { type: 'request', to: 'p3', kind: 'x' });
    room.act('p1', { type: 'show', to: 'zz', kind: 'card' });
    room.act('p1', { type: 'power', targets: ['p3'] }); // no power
    room.act('p1', { type: 'arrived' });
    room.act('p1', { type: 'pauseChoice', value: 'ouro' });
    room.act('p1', { type: 'deal' });
    expect(room.snapshot()).toBe(before);
  });
});

describe('Dealer briefing', () => {
  it('only during the briefing, once, showing exactly the visitor card', () => {
    const room = newRoom(6, { briefing: 'dealer' }, 3);
    expect(room.playerFrame('p2')!.platform.canRequestDealer).toBe(false);
    room.act('p1', { type: 'deal' });
    expect(pv(room, 'p2').card).toBeNull();
    expect(room.playerFrame('p2')!.platform.canRequestDealer).toBe(true);
    const seen = room.enterDealer('p2') as DealerView;
    expect(seen.card).toBe(room.state().card.p2);
    room.leaveDealer('p2');
    expect(room.playerFrame('p2')!.platform.canRequestDealer).toBe(false);
    expect(pv(room, 'p2').card).toBe(room.state().card.p2);
    room.act('p3', { type: 'ready' });
    expect(pub(room).briefing?.done).toEqual(['p2']);
    for (const id of room.ids.filter((x) => x !== 'p2')) room.visitDealer(id);
    expect(pub(room).phase).toBe('round');
    expect(room.playerFrame('p3')!.platform.canRequestDealer).toBe(false);
  });

  it('a remote player sees the card on the phone', () => {
    const room = createTestRoom<State>(game, { players: 6, remote: ['p4'], config: { tutorial: false, briefing: 'dealer' } });
    room.act('p1', { type: 'deal' });
    const shown = room.enterDealer('p4') as DealerView;
    expect(shown.card).toBe(room.state().card.p4);
  });
});

describe('disconnects', () => {
  it('a leader who drops leaves the chair empty and the hall nominates again', () => {
    const room = basic();
    elect(room, 'p1', 'p2');
    room.act('p3', { type: 'request', to: 'p1', kind: 'card' });
    room.disconnect('p1');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).leaders.A).toBeNull();
    expect(pv(room, 'p3').requestOut).toBeNull();
    room.act('p3', { type: 'nominate', target: 'p4' });
    expect(pub(room).leaders.A).toBe('p4');
    expect(pub(room).rooms.A).toContain('p1'); // still a standing card
  });

  it('the briefing does not wait for a dropped player', () => {
    const room = basic({ ready: false });
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) room.act(id, { type: 'ready' });
    room.disconnect('p6');
    room.advance(20_001);
    expect(pub(room).phase).toBe('round');
  });
});

describe('the end and scoring', () => {
  function endWith(room: ReturnType<typeof basic>) {
    playOut(room);
    room.advance(200_000);
    return room;
  }

  it('Crimson wins when the Hitman ends with the Boss', () => {
    const room = basic();
    elect(room, 'p3', 'p5');
    room.act('p3', { type: 'toggleHostage', target: 'p1' }); // the Boss walks to B
    room.act('p5', { type: 'toggleHostage', target: 'p6' });
    finishRound(room);
    arriveAll(room);
    // Rounds 2 and 3: the Boss leads hall B, so neither he nor the Hitman travels.
    for (let i = 0; i < 2; i++) {
      const leaderB = room.state().leader.B!;
      if (leaderB !== 'p1') {
        room.act(leaderB, { type: 'offerLead', target: 'p1' });
        room.act('p1', { type: 'answerLead', accept: true });
      }
      for (const hall of ['A', 'B'] as const) {
        const s = room.state();
        const leader = s.leader[hall]!;
        const target = pv(room, leader).eligible.find((x) => x !== 'p1' && x !== 'p2')!;
        room.act(leader, { type: 'toggleHostage', target });
      }
      finishRound(room);
      arriveAll(room);
    }
    expect(pub(room).phase).toBe('reveal');
    const result = pub(room).result!;
    expect(result.verdict).toBe('carmim');
    expect(result.dead).toContain('p1');
    expect(result.winners.sort()).toEqual(['p2', 'p4', 'p6']);
    room.advance(22_000);
    const scores = Object.fromEntries((room.results() ?? []).map((r) => [r.playerId, r.score]));
    expect(scores).toMatchObject({ p2: 1, p4: 1, p6: 1, p1: 0, p3: 0, p5: 0 });
  });

  it('with the Médico in play and no consultation, both families lose (a tie at zero)', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'medico', 'armeiro', 'soldadoOuro', 'soldadoCarmim'];
    const room = match(cards, ['A', 'B', 'A', 'B', 'A', 'B'], { units: ['medico'] });
    const s = room.state();
    s.room = { p1: 'A', p2: 'B', p3: 'A', p4: 'B', p5: 'A', p6: 'B' };
    playOut(room);
    const result = room.state().result!;
    // The Boss may have been moved by random hostages; whichever way, no consultation → no Gold win.
    expect(result.doctorOk).toBe(false);
    expect(result.verdict === 'ouro').toBe(false);
  });

  it('the Médico consultation lets Gold win', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'medico', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim'];
    const room = match(cards, ['A', 'B', 'A', 'B', 'A', 'B']);
    room.state().deck = [...cards].sort();
    room.act('p1', { type: 'request', to: 'p3', kind: 'card' });
    room.act('p3', { type: 'answer', id: pv(room, 'p3').requestsIn[0]!.id, accept: true });
    // Keep the Boss and the Hitman apart: only soldiers travel.
    for (let i = 0; i < 3; i++) {
      elect(room, room.state().leader.A ?? 'p3', room.state().leader.B ?? 'p4');
      for (const hall of ['A', 'B'] as const) {
        const leader = room.state().leader[hall]!;
        const target = pv(room, leader).eligible.find((x) => x !== 'p1' && x !== 'p2')!;
        room.act(leader, { type: 'toggleHostage', target });
      }
      finishRound(room);
      arriveAll(room);
    }
    const result = room.state().result!;
    expect(result.doctorOk).toBe(true);
    expect(result.verdict).toBe('ouro');
    expect(result.winners).toContain('p3');
  });

  it('a buried Boss passes the role to the Herdeiro', () => {
    const cards: CharId[] = ['herdeiro', 'assassino', 'bracoDireito', 'soldadoCarmim', 'soldadoOuro', 'soldadoOuro', 'apostador'];
    const room = match(cards, ['A', 'A', 'B', 'B', 'B', 'A', 'B'], { buried: 'chefao' });
    const s = room.state();
    for (const id of room.ids) s.room[id] = ['A', 'A', 'B', 'B', 'B', 'A', 'B'][Number(id.slice(1)) - 1] as 'A' | 'B';
    s.round = 3;
    s.picks = { A: ['p6'], B: ['p5'] };
    s.leader = { A: 'p2', B: 'p3' };
    s.locked = { A: true, B: true };
    room.advance(180_000);
    arriveAll(room);
    room.act('p7', { type: 'pauseChoice', value: 'carmim' });
    const result = room.state().result!;
    expect(result.bossId).toBe('p1');
    expect(result.verdict).toBe('carmim');
    expect(result.winners).toContain('p7');
  });

  it('pause steps announce in order: Investigador, Apostador, Atirador', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'investigador', 'apostador', 'atirador', 'alvo', 'isca', 'herdeiro', 'bracoDireito'];
    const room = match(cards, ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'A'], { buried: 'soldadoOuro' });
    room.state().round = 3;
    room.advance(180_000);
    arriveAll(room);
    expect(pub(room).pause).toMatchObject({ step: 5, choosers: ['p3'] });
    room.act('p4', { type: 'pauseChoice', value: 'ouro' }); // not yet
    expect(pv(room, 'p4').pause?.choice).toBeNull();
    room.act('p3', { type: 'pauseChoice', value: 'soldadoOuro' });
    expect(pub(room).pause).toMatchObject({ step: 10, choosers: ['p4'] });
    room.act('p4', { type: 'pauseChoice', value: 'nenhum' });
    expect(pub(room).pause?.step).toBe(15);
    room.act('p5', { type: 'pauseChoice', value: 'p7' });
    expect(pub(room).announcements.map((a) => a.step)).toEqual([5, 10, 15]);
    const result = pub(room).result!;
    expect(result.winners).toContain('p3'); // guessed the buried card
    expect(result.winners).toContain('p6'); // the Alvo was not shot
    expect(result.winners).toContain('p7'); // the Isca was shot
    expect(result.winners).not.toContain('p5'); // missed the Alvo
  });

  it('the Tirano who escaped both heads wins alone', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'tirano', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'B', 'A']);
    playOut(room);
    room.advance(200_000);
    const scores = Object.fromEntries((room.results() ?? []).map((r) => [r.playerId, r.score]));
    expect(scores.p3).toBe(1);
    expect(Object.values(scores).reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('powers', () => {
  it('Dinamite ends the match at once by card sharing with the Chefão', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'dinamite', 'soldadoOuro', 'guardaCostas', 'soldadoCarmim'];
    const room = match(cards, [...HALLS]);
    room.act('p3', { type: 'request', to: 'p1', kind: 'card' });
    room.act('p1', { type: 'answer', id: pv(room, 'p1').requestsIn[0]!.id, accept: true });
    expect(pub(room).phase).toBe('reveal');
    const result = pub(room).result!;
    expect(result.boom?.kind).toBe('dinamite');
    expect(result.dead.sort()).toEqual(['p1', 'p3', 'p4']);
    expect(result.verdict).toBe('carmim');
  });

  it('Guarda-costas takes down the Assassino’s hall but spares the Chefão', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'soldadoCarmim', 'soldadoOuro', 'guardaCostas', 'soldadoCarmim'];
    const room = match(cards, ['B', 'B', 'A', 'A', 'B', 'A']);
    room.act('p5', { type: 'request', to: 'p2', kind: 'card' });
    room.act('p2', { type: 'answer', id: pv(room, 'p2').requestsIn[0]!.id, accept: true });
    const result = pub(room).result!;
    expect(result.dead.sort()).toEqual(['p2', 'p5']);
    expect(result.verdict).toBe('ouro');
  });

  it('Ficha Quente swaps cards on any share, and the new card is clean', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'fichaQuente', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, [...HALLS]);
    room.state().conditions.p4 = [{ k: 'love', with: 'p1' }];
    room.act('p4', { type: 'request', to: 'p3', kind: 'card' });
    room.act('p3', { type: 'answer', id: pv(room, 'p3').requestsIn[0]!.id, accept: true });
    expect(pv(room, 'p4').card).toBe('fichaQuente');
    expect(pv(room, 'p4').conditions).toEqual([]);
    expect(pv(room, 'p3').card).toBe('soldadoOuro');
    expect(pv(room, 'p3').notices.at(-1)).toMatchObject({ k: 'swapped', who: 'p4' });
  });

  it('Federal forces a card share once per round', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'federalCarmim', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, [...HALLS]);
    expect(pv(room, 'p3').power).toEqual({ kind: 'federal', ready: true });
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: 'chefao' });
    expect(pv(room, 'p1').notices.at(-1)).toMatchObject({ k: 'forced', who: 'p3' });
    const before = room.snapshot();
    room.act('p3', { type: 'power', targets: ['p4'] });
    expect(room.snapshot()).toBe(before);
  });

  it('Cobrador makes two others share with each other', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'cobradorOuro', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'A']);
    room.act('p3', { type: 'power', targets: ['p3', 'p1'] }); // not yourself
    expect(pv(room, 'p1').seen).toEqual([]);
    room.act('p3', { type: 'power', targets: ['p1', 'p4'] });
    expect(pv(room, 'p1').seen.map((x) => x.who).sort()).toEqual(['p3', 'p4']);
    expect(pv(room, 'p4').seen.find((x) => x.who === 'p1')?.card).toBe('chefao');
    expect(pv(room, 'p3').seen).toEqual([]);
  });

  it('Casamenteira: lovers must end together; love and hate cancel', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'casamenteira', 'intrigante', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'A']);
    room.act('p3', { type: 'power', targets: ['p1', 'p6'] });
    expect(pv(room, 'p1').conditions).toEqual([{ k: 'love', with: 'p6' }]);
    expect(pv(room, 'p6').notices.at(-1)).toMatchObject({ k: 'love', who: 'p3', who2: 'p1' });
    room.act('p4', { type: 'power', targets: ['p1', 'p3'] });
    expect(pv(room, 'p1').conditions).toEqual([]);
    expect(pv(room, 'p3').conditions).toEqual([{ k: 'hate', with: 'p1' }]);
  });

  it('Usurpador takes the chair, is revealed on the TV and cannot be toppled that round', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'usurpadorOuro', 'lacaio', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'A']);
    elect(room, 'p1', 'p2');
    room.act('p3', { type: 'power', targets: [] });
    expect(pub(room).leaders.A).toBe('p3');
    expect(pub(room).revealed).toEqual({ p3: 'usurpadorOuro' });
    for (const id of ['p1', 'p4', 'p6']) room.act(id, { type: 'point', target: 'p1' });
    expect(pub(room).leaders.A).toBe('p3');
    expect(room.state().minionFail.p4).toBe(true);
  });

  it('Guarda keeps a player from being a hostage this round', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'guardaOuro', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'B']);
    elect(room, 'p4', 'p2');
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(pub(room).tackled).toEqual(['p1']);
    room.act('p4', { type: 'toggleHostage', target: 'p1' });
    expect(pv(room, 'p4').picks).toEqual([]);
    expect(pv(room, 'p4').eligible).toEqual(['p3']);
  });

  it('Vereador votes twice in an even hall', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'vereadorCarmim', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'A', 'B', 'B', 'B']);
    elect(room, 'p1', 'p2');
    room.act('p3', { type: 'point', target: 'p5' });
    expect(pub(room).leaders.A).toBe('p1'); // 1 of 4
    room.act('p3', { type: 'power', targets: [] });
    room.act('p5', { type: 'point', target: 'p5' }); // 2 + 1 = 3 of 4
    expect(pub(room).leaders.A).toBe('p5');
  });

  it('Leão-de-chácara sends someone out of the bigger hall', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'leaoCarmim', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'habitue'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'A', 'B']);
    elect(room, 'p1', 'p2');
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(pub(room).rooms.B).toContain('p1');
    expect(pub(room).leaders.A).toBeNull();
    expect(pv(room, 'p1').notices.at(-1)).toMatchObject({ k: 'bounced', who: 'p3', room: 'B' });
    expect(pv(room, 'p3').power?.ready).toBe(false); // halls are now even-ish: 3 vs 4
  });

  it('Embaixadores stand outside, are public and can share with either hall', () => {
    const cards: CharId[] = [
      'chefao', 'assassino', 'embaixadorOuro', 'embaixadorCarmim',
      'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim',
    ];
    const room = match(cards, ['A', 'B', null, null, 'A', 'B', 'A', 'B']);
    expect(pub(room).envoys).toEqual(['p3', 'p4']);
    expect(pub(room).revealed).toMatchObject({ p3: 'embaixadorOuro', p4: 'embaixadorCarmim' });
    room.act('p3', { type: 'request', to: 'p2', kind: 'card' });
    expect(pv(room, 'p2').requestsIn).toHaveLength(1);
    room.act('p1', { type: 'nominate', target: 'p3' });
    expect(pub(room).leaders.A).toBeNull();
  });

  it('Sombra wins with its first share; Sabotador against it', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'sombra', 'sabotador', 'soldadoOuro', 'soldadoCarmim'];
    const room = match(cards, ['A', 'B', 'A', 'B', 'A', 'B']);
    room.act('p3', { type: 'request', to: 'p1', kind: 'card' });
    room.act('p1', { type: 'answer', id: pv(room, 'p1').requestsIn[0]!.id, accept: true });
    room.act('p4', { type: 'request', to: 'p2', kind: 'card' });
    room.act('p2', { type: 'answer', id: pv(room, 'p2').requestsIn[0]!.id, accept: true });
    playOut(room);
    const result = room.state().result!;
    const goldWon = result.verdict === 'ouro';
    expect(result.winners.includes('p3')).toBe(goldWon);
    expect(result.winners.includes('p4')).toBe(goldWon); // the Sabotador's partner (Carmim) lost
  });

  it('the Tirano accepts every card share on his own', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'tirano', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'B']);
    room.act('p1', { type: 'request', to: 'p3', kind: 'card' });
    expect(pv(room, 'p1').seen[0]).toMatchObject({ who: 'p3', card: 'tirano' });
  });

  it('premature loss: a Habitué who left plays the last round as an Apostador', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'habitue', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'B', 'A'], { config: { prematureLoss: true } });
    elect(room, 'p1', 'p2');
    room.act('p1', { type: 'toggleHostage', target: 'p3' });
    finishRound(room);
    arriveAll(room);
    finishRound(room);
    arriveAll(room);
    expect(room.state().gamblerAlt).toEqual(['p3']);
    finishRound(room);
    arriveAll(room);
    expect(pub(room).pause).toMatchObject({ step: 10, choosers: ['p3'] });
  });
});

describe('inference leaks', () => {
  it('the TV keeps a hall locked even when a locked hostage is thrown out', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'leaoCarmim', 'soldadoOuro', 'soldadoCarmim', 'soldadoOuro', 'soldadoCarmim'];
    const room = match(cards, ['A', 'B', 'A', 'A', 'B', 'A', 'B']);
    elect(room, 'p1', 'p2');
    room.act('p1', { type: 'toggleHostage', target: 'p4' });
    room.act('p1', { type: 'lockHostages' });
    room.act('p3', { type: 'power', targets: ['p4'] });
    expect(pv(room, 'p1').locked).toBe(false);
    expect(pub(room).locked.A).toBe(true);
  });

  it('a pause step whose card was buried still waits its turn', () => {
    const cards: CharId[] = ['chefao', 'assassino', 'herdeiro', 'bracoDireito', 'soldadoOuro', 'soldadoCarmim', 'apostador'];
    const room = match(cards, ['A', 'B', 'A', 'B', 'A', 'B', 'A'], { buried: 'investigador' });
    room.state().round = 3;
    room.advance(180_000);
    arriveAll(room);
    expect(pub(room).pause).toMatchObject({ step: 5, choosers: [] });
    room.advance(40_000);
    expect(pub(room).pause?.step).toBe(10);
  });
});

describe('tutorial and rules', () => {
  const withTutorial = () => createTestRoom<State>(game, { players: 6, config: { preset: 'basico' } });

  it('opens in the tutorial and only the Host advances it', () => {
    const room = withTutorial();
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    room.act('p1', { type: 'intro', dir: 1 });
    room.act('p1', { type: 'intro', dir: -1 });
    room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(1);
    for (let i = 1; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room).phase).toBe('mesa');
  });

  it('the Host can skip it', () => {
    const room = withTutorial();
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('mesa');
  });

  it('moves on by itself if the Host leaves or never advances', () => {
    const room = withTutorial();
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('mesa');
    const idle = withTutorial();
    idle.advance(5 * 60_000);
    expect(pub(idle).phase).toBe('mesa');
  });

  it('rules on the TV: only the Host, only existing pages, in any phase', () => {
    const room = withTutorial();
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    room.act('p1', { type: 'tvRules', page: 1.5 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length - 1 });
    expect(pub(room).tvRules).toBe(RULES.length - 1);
    room.act('p1', { type: 'intro', dir: 'skip' });
    room.act('p1', { type: 'tvRules', page: 2 });
    expect(pub(room)).toMatchObject({ phase: 'mesa', tvRules: 2 });
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('every slide and rules page has text in both languages', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
    expect(CREDITS?.en).toContain('Two Rooms and a Boom');
  });

  it('first-round hints follow what the halls can do', () => {
    const room = basic({ config: { tutorial: true } });
    expect(pub(room).hint).toBe('nominate');
    elect(room, 'p1', 'p2');
    expect(pub(room).hint).toBe('share');
    room.advance(125_000);
    expect(pub(room).hint).toBe('lock');
    const quiet = basic();
    expect(pub(quiet).hint).toBeNull();
  });
});
