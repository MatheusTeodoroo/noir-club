import { describe, expect, it } from 'vitest';
import type { CharId } from '../src/shared.ts';
import { finishRound, arriveAll, match, newRoom, pub, pv, type Room } from './helpers.ts';

// The 0.3.0 characters: acting cards, conditions and the wild cards. Halls: odd players in A.
const halls = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'A' : 'B')) as ('A' | 'B')[];
const table = (cards: CharId[], size = 6) => {
  const all = [...cards, ...Array<CharId>(Math.max(0, size - cards.length)).fill('soldadoOuro')];
  return match(all, halls(all.length));
};
/** p1, p3, p5… are in hall A; p2, p4, p6… in hall B. */
const offer = (room: Room, from: string, to: string, kind: 'card' | 'color' = 'card') =>
  room.act(from, { type: 'request', to, kind });
const accept = (room: Room, who: string) => {
  const q = pv(room, who).requestsIn[0];
  if (q) room.act(who, { type: 'answer', id: q.id, accept: true });
};
const conds = (room: Room, id: string) => pv(room, id).conditions.map((c) => c.k);

describe('conditions', () => {
  it('Tímido shows and shares nothing, but a Federal still forces a card share', () => {
    const room = table(['timidoOuro', 'chefao', 'federalCarmim', 'assassino']);
    expect(pv(room, 'p1').allowed).toEqual({ cardShare: false, colorShare: false, show: false });
    const before = room.snapshot();
    offer(room, 'p1', 'p3');
    room.act('p1', { type: 'show', to: 'p3', kind: 'card' });
    room.act('p1', { type: 'showRoom' });
    expect(room.snapshot()).toBe(before);
    offer(room, 'p5', 'p1');
    expect(pv(room, 'p1').requestsIn[0]).toMatchObject({ canAccept: false });
    accept(room, 'p1');
    expect(pv(room, 'p5').seen).toEqual([]);
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: 'timidoOuro' });
  });

  it('Recatado only colour shares (11+ players)', () => {
    const room = table(['recatadoOuro', 'chefao', 'assassino'], 11);
    expect(pv(room, 'p1').allowed).toEqual({ cardShare: false, colorShare: true, show: false });
    offer(room, 'p1', 'p3');
    expect(pv(room, 'p1').requestOut).toBeNull();
    offer(room, 'p1', 'p3', 'color');
    accept(room, 'p3');
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: null, look: 'ouro' });
  });

  it('Paranoico card shares once; forced shares don’t count', () => {
    const room = table(['paranoicoCarmim', 'chefao', 'cobradorOuro', 'assassino', 'soldadoOuro'], 7);
    room.act('p3', { type: 'power', targets: ['p1', 'p5'] }); // forced
    expect(pv(room, 'p1').allowed.cardShare).toBe(true);
    offer(room, 'p1', 'p7');
    accept(room, 'p7');
    expect(pv(room, 'p7').seen.at(-1)).toMatchObject({ who: 'p1', card: 'paranoicoCarmim' });
    expect(pv(room, 'p1').allowed.cardShare).toBe(false);
    offer(room, 'p1', 'p5');
    expect(pv(room, 'p1').requestOut).toBeNull();
  });

  it('Tolo accepts colour shares too', () => {
    const room = table(['tirano', 'chefao', 'soldadoOuro', 'assassino'], 11);
    offer(room, 'p3', 'p1', 'color');
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', look: 'prata' });
  });

  it('Chantagista leaves you shy; the Trapaceiro’s gullible cancels it', () => {
    const room = table(['chantagistaOuro', 'chefao', 'soldadoCarmim', 'assassino', 'trapaceiroCarmim']);
    offer(room, 'p3', 'p1');
    accept(room, 'p1');
    expect(conds(room, 'p3')).toEqual(['shy']);
    expect(pv(room, 'p3').notices.at(-1)).toMatchObject({ k: 'condition', who: 'p1', cond: 'shy' });
    // Shy can't share by choice, so a Cobrador forces the share with the Trapaceiro.
    room.state().card.p1 = 'cobradorOuro';
    room.act('p1', { type: 'power', targets: ['p3', 'p5'] });
    expect(conds(room, 'p3')).toEqual([]);
    expect(pv(room, 'p3').notices.at(-1)).toMatchObject({ k: 'condition', cancelled: true });
  });

  it('Mordaça gags: no spoken powers', () => {
    const room = table(['mordacaOuro', 'chefao', 'federalCarmim', 'assassino']);
    offer(room, 'p3', 'p1');
    accept(room, 'p1');
    expect(conds(room, 'p3')).toEqual(['cursed']);
    expect(pv(room, 'p3').power).toEqual({ kind: 'federal', ready: false });
  });

  it('Golpista turns an accepted colour share into two full reveals', () => {
    const room = table(['golpistaCarmim', 'chefao', 'soldadoOuro', 'assassino'], 11);
    offer(room, 'p3', 'p1', 'color');
    accept(room, 'p1');
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: 'golpistaCarmim', how: 'shown' });
    expect(pv(room, 'p1').seen[0]).toMatchObject({ who: 'p3', card: 'soldadoOuro', how: 'shown' });
    expect(room.state().shares).toEqual([]);
  });

  it('Negociador only card shares', () => {
    const room = table(['negociadorOuro', 'chefao', 'soldadoCarmim', 'assassino'], 11);
    expect(pv(room, 'p1').allowed).toEqual({ cardShare: true, colorShare: false, show: false });
  });

  it('Intocável: no power or condition touches them', () => {
    const room = table(['intocavelOuro', 'chefao', 'federalCarmim', 'assassino', 'chantagistaCarmim']);
    const before = room.snapshot();
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(room.snapshot()).toBe(before);
    offer(room, 'p1', 'p5');
    accept(room, 'p5');
    expect(conds(room, 'p1')).toEqual([]);
  });

  it('Terapeuta cures a psych condition through an offer the shy player can accept', () => {
    const room = table(['timidoCarmim', 'chefao', 'terapeutaOuro', 'assassino']);
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(pv(room, 'p1').seen[0]).toMatchObject({ who: 'p3', card: 'terapeutaOuro' });
    expect(pv(room, 'p1').requestsIn[0]).toMatchObject({ from: 'p3', psych: true, canAccept: true });
    accept(room, 'p1');
    expect(conds(room, 'p1')).toEqual([]);
    expect(pv(room, 'p1').allowed.show).toBe(true);
    expect(pv(room, 'p3').seen[0]).toMatchObject({ who: 'p1', card: 'timidoCarmim' });
  });

  it('a Terapeuta’s card shown to someone without a psych condition brings no offer', () => {
    const room = table(['soldadoCarmim', 'chefao', 'terapeutaOuro', 'assassino']);
    room.act('p3', { type: 'power', targets: ['p1'] });
    expect(pv(room, 'p1').requestsIn).toEqual([]);
  });

  it('Santo and Mentiroso start honest / liar', () => {
    const room = table(['santoOuro', 'chefao', 'mentirosoCarmim', 'assassino']);
    expect(conds(room, 'p1')).toEqual(['honest']);
    expect(conds(room, 'p3')).toEqual(['liar']);
  });
});

describe('wild cards', () => {
  it('Contagiado spreads through any share; the infected win when everyone standing is infected', () => {
    // Hall A: p1 Contagiado, p3, p5; hall B: Boss, Hitman, p6 → hall B goes down at the end.
    const room = match(
      ['contagiado', 'chefao', 'soldadoOuro', 'assassino', 'soldadoCarmim', 'soldadoOuro'],
      ['A', 'B', 'A', 'B', 'A', 'B'],
    );
    offer(room, 'p1', 'p3');
    accept(room, 'p3');
    expect(conds(room, 'p3')).toEqual(['zombie']);
    offer(room, 'p3', 'p5');
    accept(room, 'p5');
    expect(conds(room, 'p5')).toEqual(['zombie']);
    // Keep the halls as they are: leaders send each other's soldiers back and forth, never the infected.
    const s = room.state();
    s.round = 3;
    s.leader = { A: 'p1', B: 'p2' };
    s.picks = { A: ['p3'], B: ['p6'] };
    s.locked = { A: true, B: true };
    room.advance(180_000);
    // p3 (infected) and p6 swapped: hall A = p1, p5, p6 → p6 is standing and not infected.
    arriveAll(room);
    expect(room.state().result!.zombies).toBe(false);
  });

  it('the infected do win when only they are left standing', () => {
    const room = match(['contagiado', 'chefao', 'soldadoOuro', 'assassino', 'soldadoCarmim', 'soldadoOuro'], [
      'A', 'B', 'A', 'B', 'A', 'B',
    ]);
    offer(room, 'p1', 'p3');
    accept(room, 'p3');
    offer(room, 'p3', 'p5');
    accept(room, 'p5');
    const s = room.state();
    s.round = 3;
    s.leader = { A: 'p1', B: 'p2' };
    s.picks = { A: ['p3'], B: ['p6'] };
    s.locked = { A: true, B: true };
    // p6 would bring an uninfected player into A; infect them first through a forced share.
    s.conditions.p6 = [{ k: 'zombie' }];
    room.advance(180_000);
    arriveAll(room);
    const result = room.state().result!;
    expect(result.zombies).toBe(true);
    expect(result.winners).toEqual(expect.arrayContaining(['p1', 'p3', 'p5', 'p6']));
    expect(result.winners).not.toContain('p2'); // the Boss went down with the Hitman
  });

  it('Trevo da Sorte swaps on any share, never back to someone who held it; the holder wins', () => {
    const room = table(['trevo', 'chefao', 'soldadoCarmim', 'assassino', 'soldadoOuro']);
    offer(room, 'p3', 'p1');
    expect(pv(room, 'p3').card).toBe('trevo'); // the Trevo is gullible: accepted on its own
    expect(pv(room, 'p1').card).toBe('soldadoCarmim');
    offer(room, 'p1', 'p3');
    accept(room, 'p3');
    expect(pv(room, 'p1').card).toBe('soldadoCarmim'); // p1 already held it
    room.state().round = 3;
    room.advance(180_000);
    arriveAll(room);
    expect(room.state().result!.winners).toContain('p3');
  });

  it('Bêbado sobers up at the start of the last round', () => {
    const room = match(
      ['bebado', 'chefao', 'soldadoCarmim', 'assassino', 'soldadoOuro', 'soldadoCarmim'],
      ['A', 'B', 'A', 'B', 'A', 'B'],
      { sober: 'soldadoOuro' },
    );
    expect(pv(room, 'p1').card).toBe('bebado');
    finishRound(room);
    arriveAll(room);
    finishRound(room);
    arriveAll(room);
    expect(pub(room).round).toBe(3);
    expect(pv(room, 'p1').card).toBe('soldadoOuro');
    expect(pv(room, 'p1').notices.at(-1)).toMatchObject({ k: 'sober' });
    expect(room.state().sober).toBeNull();
  });

  it('a real deal with the Bêbado sets one card aside and deals one per player', () => {
    const room = newRoom(9);
    room.act('p1', { type: 'toggleUnit', unit: 'bebado' });
    expect(pub(room).mesa!.preview).toHaveLength(10);
    room.act('p1', { type: 'deal' });
    const s = room.state();
    expect(s.sober).not.toBeNull();
    expect(Object.values(s.card)).toContain('bebado');
    expect(s.deck).toHaveLength(10);
    expect(room.publicJson()).not.toContain('"sober"');
  });

  it('the Contagiado can’t be dealt with the Intocável', () => {
    const room = newRoom(12);
    room.act('p1', { type: 'toggleUnit', unit: 'contagiado' });
    room.act('p1', { type: 'toggleUnit', unit: 'intocavel' });
    expect(pub(room).mesa!.errors).toContain('zombieImmune');
  });
});

describe('0.3.0 inference leaks', () => {
  it('the Terapeuta never learns whether the target is psych from the offer', () => {
    const shy = table(['timidoCarmim', 'chefao', 'terapeutaOuro', 'assassino']);
    shy.act('p3', { type: 'power', targets: ['p1'] });
    expect(pv(shy, 'p3').requestOut).toBeNull();
    shy.act('p1', { type: 'answer', id: pv(shy, 'p1').requestsIn[0]!.id, accept: false });
    expect(pv(shy, 'p3').notices.filter((n) => n.k === 'declined')).toEqual([]);
    offer(shy, 'p3', 'p5'); // a normal offer is still possible
    expect(pv(shy, 'p3').requestOut).toMatchObject({ to: 'p5' });
  });

  it('an offer the sender may no longer make is withdrawn', () => {
    const room = table(['paranoicoOuro', 'chefao', 'soldadoCarmim', 'assassino', 'soldadoOuro']);
    offer(room, 'p1', 'p3');
    offer(room, 'p5', 'p1');
    accept(room, 'p1'); // the paranoid's one share
    expect(pv(room, 'p3').requestsIn).toEqual([]);
  });
});
