import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, {
  COOP_HOLD_MS,
  LEAD_MS,
  VERSUS_HOLD_MS,
  revealStep,
  type PlayerView,
  type PublicView,
  type State,
} from '../src/logic.ts';
import { CLUE_MAX, PERFECT_BONUS } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;
const me = (room: Room, id: string) => room.playerView(id) as PlayerView;

function revealMs(room: Room) {
  const n = room.state().cards.length;
  return LEAD_MS + n * revealStep(n) + (room.state().last?.coop ? COOP_HOLD_MS : VERSUS_HOLD_MS);
}

/** The master picks the first drawn theme. */
function pickTheme(room: Room) {
  room.act(pub(room).master, { type: 'pickTheme', index: 0 });
}

/** Every listed player writes a clue for each of their cards. */
function writeClues(room: Room, ids = room.ids) {
  for (const id of ids)
    for (const c of me(room, id).mine) room.act(id, { type: 'clue', cardId: c.id, text: `dica ${c.value}` });
}

/** Ids in correct order (lowest value first), read from private state. */
const correctOrder = (room: Room) => [...room.state().cards].sort((a, b) => a.value - b.value).map((c) => c.id);

/** Rearranges `id`'s row (or the shared row in coop) into `target`. */
function arrange(room: Room, id: string, target: string[]) {
  target.forEach((cardId, i) => room.act(id, { type: 'move', cardId, to: i }));
}

function readyAll(room: Room) {
  for (const id of room.ids) room.act(id, { type: 'ready', value: true });
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays a full coop match at the minimum player count', () => {
    const room = createTestRoom<State>(game, {
      players: 2,
      config: { tutorial: false, rounds: 2, mode: 'coop', cardsPerPlayer: 2 },
    });
    for (let round = 1; round <= 2; round++) {
      expect(pub(room)).toMatchObject({ phase: 'theme', round });
      expect(pub(room).options).toHaveLength(3);
      pickTheme(room);
      expect(pub(room).phase).toBe('clues');
      writeClues(room);
      expect(pub(room).phase).toBe('sort');
      expect(pub(room).cards).toHaveLength(4);
      arrange(room, 'p1', correctOrder(room));
      readyAll(room);
      expect(pub(room).phase).toBe('reveal');
      expect(pub(room).result?.coop).toMatchObject({ hits: 4, accuracy: 100 });
      room.advance(revealMs(room));
    }
    expect(room.phase()).toBe('results');
    expect(room.results()).toEqual(
      expect.arrayContaining([
        { playerId: 'p1', score: 100 },
        { playerId: 'p2', score: 100 },
      ]),
    );
  });

  it('plays a full versus match at the maximum player count', () => {
    const room = createTestRoom<State>(game, {
      players: 16,
      config: { tutorial: false, rounds: 2, mode: 'versus', cardsPerPlayer: 6 },
    });
    for (let round = 1; round <= 2; round++) {
      pickTheme(room);
      writeClues(room);
      expect(pub(room).phase).toBe('sort');
      expect(pub(room).cards).toHaveLength(96);
      readyAll(room);
      expect(pub(room).phase).toBe('reveal');
      room.advance(revealMs(room));
    }
    expect(room.phase()).toBe('results');
  });

  it('caps cards per player at what the 100-card deck allows', () => {
    const room = createTestRoom<State>(game, { players: 16, config: { tutorial: false, cardsPerPlayer: 50 } });
    expect(pub(room)).toMatchObject({ cardsPer: 6, cut: true });
    pickTheme(room);
    expect(me(room, 'p3').mine).toHaveLength(6);
    const values = room.state().cards.map((c) => c.value);
    expect(new Set(values).size).toBe(96);
    expect(values.every((v) => v >= 1 && v <= 100)).toBe(true);
  });

  it('rotates the theme master each round', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false, rounds: 4 } });
    const masters: string[] = [];
    for (let round = 1; round <= 4; round++) {
      masters.push(pub(room).master);
      expect(me(room, pub(room).master).isMaster).toBe(true);
      pickTheme(room);
      writeClues(room);
      readyAll(room);
      room.advance(revealMs(room));
    }
    expect(masters).toEqual(['p1', 'p2', 'p3', 'p1']);
  });

  it('only the master sees theme options on the phone, and only the master may choose', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    expect(me(room, 'p1').options).toHaveLength(3);
    expect(me(room, 'p2').options).toHaveLength(0);
    const before = room.snapshot();
    room.act('p2', { type: 'pickTheme', index: 0 });
    expect(room.snapshot()).toBe(before);
  });

  it('lets the master write the theme in write mode', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false, themeSource: 'write' } });
    expect(pub(room).options).toHaveLength(0);
    const before = room.snapshot();
    room.act('p1', { type: 'pickTheme', index: 0 });
    room.act('p1', { type: 'writeTheme', title: '   ' });
    room.act('p1', { type: 'writeTheme', title: 'x'.repeat(61) });
    room.act('p1', { type: 'writeTheme', title: 'Ok', low: 'y'.repeat(25) });
    room.act('p2', { type: 'writeTheme', title: 'Not master' });
    expect(room.snapshot()).toBe(before);
    room.act('p1', { type: 'writeTheme', title: '  Tamanho   de bolos ', low: 'cupcake', high: '' });
    expect(pub(room).theme).toEqual({
      title: { 'pt-BR': 'Tamanho de bolos', en: 'Tamanho de bolos' },
      low: { 'pt-BR': 'cupcake', en: 'cupcake' },
      high: null,
    });
    expect(pub(room).phase).toBe('clues');
  });

  it('keeps card values secret from the TV and from other phones', () => {
    const room = createTestRoom<State>(game, {
      players: 4,
      config: { tutorial: false, cardsPerPlayer: 3, mode: 'versus' },
    });
    pickTheme(room);
    const cards = room.state().cards;
    const valueOf = (id: string) => cards.find((c) => c.id === id)!.value;
    // Own cards on own phone, nobody else's.
    for (const id of room.ids) {
      const mine = me(room, id).mine;
      expect(mine).toHaveLength(3);
      for (const c of mine) expect(cards.find((x) => x.id === c.id)!.owner).toBe(id);
      expect(mine.map((c) => c.value)).toEqual(mine.map((c) => valueOf(c.id)));
    }
    const leak = (json: string) => expect(json).not.toMatch(/"value"|"values"/);
    leak(room.publicJson());
    writeClues(room);
    leak(room.publicJson());
    // Clue text echoes the value in this test: the TV must not show clues before the sort phase,
    // and phones carry only their own values.
    for (const id of room.ids) {
      const v = me(room, id);
      expect(JSON.stringify({ ...v, mine: [] })).not.toMatch(/"value"/);
    }
    // Versus rows stay private.
    const p2Order = me(room, 'p2').order;
    room.act('p1', { type: 'move', cardId: me(room, 'p1').order[0]!, to: 5 });
    expect(me(room, 'p2').order).toEqual(p2Order);
    expect(pub(room).order).toEqual([]);
    expect(room.publicJson()).not.toContain('"orders"');
    leak(room.publicJson());
    readyAll(room);
    expect(pub(room).result?.values).toBeDefined();
  });

  it('hides clues on the TV until everyone is done writing', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    pickTheme(room);
    writeClues(room, ['p1']);
    expect(pub(room).cards).toEqual([]);
    expect(pub(room).progress).toEqual({ p1: 1, p2: 0, p3: 0 });
    expect(room.publicJson()).not.toContain('dica');
  });

  it('starts the clue timer once half the table is done, then moves on', () => {
    const room = createTestRoom<State>(game, { players: 4, config: { tutorial: false, clueSeconds: 30 } });
    pickTheme(room);
    writeClues(room, ['p1']);
    expect(pub(room).deadline).toBeNull();
    room.advance(600_000);
    expect(pub(room).phase).toBe('clues');
    writeClues(room, ['p2']);
    expect(pub(room).deadline).not.toBeNull();
    room.advance(30_000);
    expect(pub(room).phase).toBe('sort');
    const missing = pub(room).cards.filter((c) => c.owner === 'p3' || c.owner === 'p4');
    expect(missing.every((c) => c.clue === null)).toBe(true);
  });

  it('accepts clues up to the character limit', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    pickTheme(room);
    const card = me(room, 'p1').mine[0]!;
    const long = 'a'.repeat(CLUE_MAX);
    room.act('p1', { type: 'clue', cardId: card.id, text: long });
    expect(me(room, 'p1').mine[0]!.clue).toBe(long);
  });

  it('lets a player edit a clue until the phase ends', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    pickTheme(room);
    const card = me(room, 'p1').mine[0]!;
    room.act('p1', { type: 'clue', cardId: card.id, text: 'gato' });
    room.act('p1', { type: 'clue', cardId: card.id, text: 'leão' });
    expect(me(room, 'p1').mine[0]!.clue).toBe('leão');
  });

  it('timers drive the sort and reveal phases when nobody acts', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false, rounds: 1, sortSeconds: 60 } });
    pickTheme(room);
    writeClues(room);
    room.advance(60_000);
    expect(pub(room).phase).toBe('reveal');
    room.advance(revealMs(room));
    expect(room.phase()).toBe('results');
  });

  it('coop: any move clears everyone’s ready', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { tutorial: false, mode: 'coop', cardsPerPlayer: 2 },
    });
    pickTheme(room);
    writeClues(room);
    room.act('p1', { type: 'ready', value: true });
    room.act('p2', { type: 'ready', value: true });
    expect(pub(room).ready).toEqual(['p1', 'p2']);
    const order = pub(room).order;
    room.act('p3', { type: 'move', cardId: order[0]!, to: 3 });
    expect(pub(room).order[3]).toBe(order[0]);
    expect(me(room, 'p1').order).toEqual(pub(room).order);
    expect(pub(room).ready).toEqual([]);
  });

  it('versus: moving only clears your own ready', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { tutorial: false, mode: 'versus', cardsPerPlayer: 2 },
    });
    pickTheme(room);
    writeClues(room);
    room.act('p1', { type: 'ready', value: true });
    room.act('p2', { type: 'ready', value: true });
    room.act('p2', { type: 'move', cardId: me(room, 'p2').order[0]!, to: 1 });
    expect(pub(room).ready).toEqual(['p1']);
  });

  it('scores coop by exact positions', () => {
    const room = createTestRoom<State>(game, {
      players: 2,
      config: { tutorial: false, mode: 'coop', cardsPerPlayer: 2, rounds: 1 },
    });
    pickTheme(room);
    writeClues(room);
    const [a, b, c, d] = correctOrder(room) as [string, string, string, string];
    arrange(room, 'p1', [a, c, b, d]);
    readyAll(room);
    expect(pub(room).result?.coop).toEqual({ order: [a, c, b, d], hits: 2, accuracy: 50 });
    room.advance(revealMs(room));
    expect(room.results()).toEqual(
      expect.arrayContaining([
        { playerId: 'p1', score: 50 },
        { playerId: 'p2', score: 50 },
      ]),
    );
  });

  it('scores versus: exact positions, perfect bonus and the clue owner bonus, with a tie', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { tutorial: false, mode: 'versus', cardsPerPlayer: 1, rounds: 1 },
    });
    pickTheme(room);
    writeClues(room);
    const correct = correctOrder(room) as [string, string, string];
    const [a, b, c] = correct;
    const owner = Object.fromEntries(room.state().cards.map((x) => [x.id, x.owner]));
    arrange(room, 'p1', correct); // perfect: 3 + 5
    arrange(room, 'p2', [a, c, b]); // a only
    arrange(room, 'p3', [b, a, c]); // c only
    readyAll(room);
    const pts = pub(room).result!.versus!.points;
    const bonus: Record<string, number> = { p1: 0, p2: 0, p3: 0 };
    const credit = (by: string, cardId: string) => {
      if (owner[cardId] !== by) bonus[owner[cardId]!]! += 1;
    };
    [a, b, c].forEach((id) => credit('p1', id));
    credit('p2', a);
    credit('p3', c);
    expect(pts.p1).toMatchObject({ exact: 3, perfect: PERFECT_BONUS, bonus: bonus.p1 });
    expect(pts.p2).toMatchObject({ exact: 1, perfect: 0, bonus: bonus.p2 });
    expect(pts.p3).toMatchObject({ exact: 1, perfect: 0, bonus: bonus.p3 });
    for (const id of room.ids) expect(pts[id]!.total).toBe(pts[id]!.exact + pts[id]!.perfect + pts[id]!.bonus);
    room.advance(revealMs(room));
    const results = room.results()!;
    expect(results.find((r) => r.playerId === 'p1')!.score).toBe(pts.p1!.total);
  });

  it('versus tie: equal play gives equal scores', () => {
    const room = createTestRoom<State>(game, {
      players: 2,
      config: { tutorial: false, mode: 'versus', cardsPerPlayer: 2, rounds: 1 },
    });
    pickTheme(room);
    writeClues(room);
    const correct = correctOrder(room);
    arrange(room, 'p1', correct);
    arrange(room, 'p2', correct);
    readyAll(room);
    const pts = pub(room).result!.versus!.points;
    // Each placed all 4 cards; each owns 2, so each gets +2 from the other.
    expect(pts.p1).toEqual({ exact: 4, perfect: PERFECT_BONUS, bonus: 2, total: 11 });
    expect(pts.p2).toEqual(pts.p1);
  });

  it('ignores invalid actions', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false, cardsPerPlayer: 2 } });
    let before = room.snapshot();
    room.act('p1', null);
    room.act('p1', { type: 'nonsense' });
    room.act('p1', { type: 'pickTheme', index: 3 });
    room.act('p1', { type: 'pickTheme', index: 1.5 });
    room.act('p1', { type: 'clue', cardId: 'c1', text: 'cedo' });
    room.act('p1', { type: 'ready', value: true });
    expect(room.snapshot()).toBe(before);

    pickTheme(room);
    before = room.snapshot();
    const other = me(room, 'p2').mine[0]!;
    room.act('p1', { type: 'clue', cardId: other.id, text: 'not mine' });
    room.act('p1', { type: 'clue', cardId: me(room, 'p1').mine[0]!.id, text: 'x'.repeat(CLUE_MAX + 1) });
    room.act('p1', { type: 'clue', cardId: me(room, 'p1').mine[0]!.id, text: '   ' });
    room.act('p1', { type: 'clue', cardId: 'zzz', text: 'ok' });
    room.act('p1', { type: 'move', cardId: 'c1', to: 0 });
    room.act('p2', { type: 'pickTheme', index: 0 });
    expect(room.snapshot()).toBe(before);

    writeClues(room);
    before = room.snapshot();
    const first = pub(room).order[0]!;
    room.act('p1', { type: 'move', cardId: first, to: 99 });
    room.act('p1', { type: 'move', cardId: first, to: -1 });
    room.act('p1', { type: 'move', cardId: first, to: 0 });
    room.act('p1', { type: 'move', cardId: 'nope', to: 1 });
    room.act('p1', { type: 'ready', value: 'yes' });
    room.act('p1', { type: 'ready', value: false });
    room.act('p1', { type: 'clue', cardId: me(room, 'p1').mine[0]!.id, text: 'late' });
    expect(room.snapshot()).toBe(before);
  });

  it('auto-picks a theme when the master drops', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    room.disconnect('p1');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).phase).toBe('clues');
    expect(pub(room).theme).not.toBeNull();
  });

  it('does not wait for a player who dropped while writing or sorting', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false } });
    pickTheme(room);
    writeClues(room, ['p1', 'p2']);
    room.disconnect('p3');
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).phase).toBe('sort');

    room.act('p1', { type: 'ready', value: true });
    room.act('p2', { type: 'ready', value: true });
    expect(pub(room).phase).toBe('reveal');
  });

  it('skips a disconnected player when choosing the next master', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { tutorial: false, rounds: 2 } });
    pickTheme(room);
    writeClues(room);
    room.disconnect('p2');
    room.advance(20_001);
    readyAll(room);
    room.advance(revealMs(room));
    expect(pub(room)).toMatchObject({ round: 2, master: 'p3' });
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    room.act('p1', { type: 'intro', dir: 1 });
    room.act('p1', { type: 'intro', dir: -1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'theme', round: 1, master: 'p1' });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 2 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('theme');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('theme');
    expect(pub(room).master).toBe('p2');
  });

  it('starts on its own if nobody advances the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    room.advance(5 * 60_000);
    expect(pub(room).phase).toBe('theme');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 2 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    room.act('p1', { type: 'tvRules', page: 1.5 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    expect(me(room, 'p2').tvRules).toBe(1);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('gives first-round hints only while the tutorial option is on', () => {
    const room = createTestRoom<State>(game, { players: 2, config: { rounds: 2, cardsPerPlayer: 1 } });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).hint).toBe('theme');
    pickTheme(room);
    expect(pub(room).hint).toBe('clues');
    writeClues(room, ['p1']);
    expect(pub(room).hint).toBe('hurry');
    writeClues(room, ['p2']);
    expect(pub(room).hint).toBe('sort');
    room.act('p1', { type: 'ready', value: true });
    expect(pub(room).hint).toBe('ready');
    room.act('p2', { type: 'ready', value: true });
    room.advance(revealMs(room));
    expect(pub(room)).toMatchObject({ round: 2, hint: null });

    const plain = createTestRoom<State>(game, { players: 2, config: { tutorial: false } });
    expect(pub(plain).hint).toBeNull();
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
