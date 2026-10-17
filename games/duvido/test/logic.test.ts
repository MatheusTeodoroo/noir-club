import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { matchScore, type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { CATEGORIES } from '../src/questions/index.ts';
import { LEAD_MS } from '../src/shared.ts';

type Room = ReturnType<typeof createTestRoom<State>>;
const pub = (room: Room) => room.publicView() as PublicView;
const me = (room: Room, id: string) => room.playerView(id) as PlayerView;
const REVEAL_MS = LEAD_MS + 7_000;

/** If the round is waiting on a category, the starter picks the first option. */
function pick(room: Room) {
  const v = pub(room);
  if (v.phase === 'category') room.act(v.starter, { type: 'category', index: 0 });
}

/** The round's answer, read from private state (never from a view). */
function answer(room: Room) {
  pick(room);
  const s = room.state();
  return CATEGORIES[s.category!]!.questions[s.question!]!.answer;
}

const turn = (room: Room) => {
  pick(room);
  return pub(room).turn;
};

/** Whoever holds the turn guesses `value`; returns their id. */
function guess(room: Room, value: number) {
  const id = turn(room);
  room.act(id, { type: 'guess', value });
  return id;
}

function doubt(room: Room) {
  const id = turn(room);
  room.act(id, { type: 'doubt' });
  return id;
}

describe(game.manifest.name['pt-BR'], () => {
  it('plays a full match at the minimum player count, in seat order', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { rounds: 10 },
    });
    const seats = pub(room).seats;
    expect([...seats].sort()).toEqual(['p1', 'p2', 'p3']);
    for (let round = 1; round <= 10; round++) {
      // Each round opens on the starter's category choice, then the guesses.
      expect(pub(room)).toMatchObject({ phase: 'category', round });
      expect(pub(room).options).toHaveLength(5);
      pick(room);
      expect(pub(room)).toMatchObject({ phase: 'guess', round });
      expect(pub(room).question).not.toBeNull();
      const starter = pub(room).starter;
      expect(turn(room)).toBe(starter);
      const opener = guess(room, 0);
      expect(turn(room)).toBe(seats[(seats.indexOf(opener) + 1) % 3]);
      const doubter = doubt(room);
      expect(pub(room).phase).toBe('reveal');
      // 0 never overshoots: the doubter takes the card.
      expect(pub(room).result).toMatchObject({
        guess: 0,
        guesser: opener,
        doubter,
        loser: doubter,
        auto: false,
      });
      room.advance(REVEAL_MS);
      if (round < 10) expect(pub(room).starter).toBe(doubter);
    }
    expect(room.phase()).toBe('results');
    const total = room.results()!.reduce((sum, r) => sum + r.score, 0);
    expect(total).toBe(-10);
  });

  it('plays a full match at the maximum player count', () => {
    const room = createTestRoom<State>(game, {
      players: 16,
      config: { rounds: 2 },
    });
    expect(pub(room).seats).toHaveLength(16);
    for (let round = 1; round <= 2; round++) {
      for (let v = 0; v < 20; v++) guess(room, v);
      expect(pub(room).guesses).toHaveLength(20);
      doubt(room);
      expect(pub(room).phase).toBe('reveal');
      room.advance(REVEAL_MS);
    }
    expect(room.phase()).toBe('results');
  });

  it('gives the card to a guesser who overshot', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    guess(room, 0);
    const greedy = guess(room, answer(room) + 1);
    const doubter = doubt(room);
    expect(pub(room).result).toMatchObject({
      loser: greedy,
      doubter,
      answer: answer(room),
    });
    expect(pub(room).cards[greedy]).toBe(1);
    expect(pub(room).cards[doubter]).toBe(0);
  });

  it('a guess equal to the answer survives the doubt', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    const exact = guess(room, answer(room));
    const doubter = doubt(room);
    expect(pub(room).result).toMatchObject({ guesser: exact, loser: doubter });
  });

  it('keeps the answer out of every view until the reveal', () => {
    const room = createTestRoom<State>(game, { players: 4 });
    guess(room, 1);
    guess(room, 2);
    expect(room.publicJson()).not.toContain('"answer"');
    for (const id of room.ids) expect(JSON.stringify(me(room, id))).not.toContain('"answer"');
    const a = answer(room);
    doubt(room);
    expect(pub(room).result?.answer).toBe(a);
    for (const id of room.ids) expect(me(room, id).result?.answer).toBe(a);
  });

  it('shows each phone its own controls', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    const first = turn(room);
    expect(me(room, first)).toMatchObject({
      isTurn: true,
      minGuess: 0,
      canDoubt: false,
    });
    const others = room.ids.filter((id) => id !== first);
    for (const id of others) expect(me(room, id).isTurn).toBe(false);
    guess(room, 7);
    const second = turn(room);
    expect(me(room, second)).toMatchObject({
      isTurn: true,
      minGuess: 8,
      canDoubt: true,
      doubleAt: null,
    });
    expect(me(room, first).isTurn).toBe(false);
  });

  it('without a turn limit, nothing moves until someone acts', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    expect(pub(room).deadline).toBeNull();
    room.advance(3_600_000);
    expect(pub(room)).toMatchObject({ phase: 'category', round: 1 });
    pick(room);
    room.advance(3_600_000);
    expect(pub(room)).toMatchObject({ phase: 'guess', round: 1, guesses: [] });
  });

  it('with a turn limit, timers alone play the match to the end', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { rounds: 2, turnSeconds: 10 },
    });
    expect(pub(room)).toMatchObject({ phase: 'category', total: 10_000 });
    room.advance(10_000);
    // The starter ran out of time: a category was drawn for them.
    expect(pub(room).phase).toBe('guess');
    room.advance(10_000);
    // The opener ran out of time: their guess became 1.
    expect(pub(room).guesses).toEqual([expect.objectContaining({ value: 1 })]);
    room.advance(10_000);
    // The next player ran out of time: they doubted.
    expect(pub(room)).toMatchObject({
      phase: 'reveal',
      result: { auto: true },
    });
    room.advance(REVEAL_MS + 30_000);
    room.advance(REVEAL_MS);
    expect(room.phase()).toBe('results');
  });

  it('ignores invalid actions', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    const first = turn(room);
    const other = room.ids.find((id) => id !== first)!;
    let before = room.snapshot();
    room.act(first, { type: 'doubt' }); // nothing to doubt yet
    room.act(other, { type: 'guess', value: 5 }); // not their turn
    room.act(first, { type: 'guess', value: -1 });
    room.act(first, { type: 'guess', value: 2.5 });
    room.act(first, { type: 'guess', value: '5' });
    room.act(first, { type: 'guess', value: 1e13 });
    room.act(first, { type: 'category', index: 0 }); // wrong phase
    room.act(first, { type: 'nonsense' });
    room.act(first, null);
    expect(room.snapshot()).toBe(before);

    guess(room, 10);
    const second = turn(room);
    before = room.snapshot();
    room.act(second, { type: 'guess', value: 10 }); // not higher
    room.act(second, { type: 'guess', value: 3 });
    room.act(first, { type: 'doubt' }); // doubting yourself, out of turn
    expect(room.snapshot()).toBe(before);
  });

  it('skips a player who dropped on their turn', () => {
    const room = createTestRoom<State>(game, { players: 4 });
    const seats = pub(room).seats;
    const opener = guess(room, 1);
    const gone = turn(room);
    room.disconnect(gone);
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    const next = seats[(seats.indexOf(gone) + 1) % 4];
    expect(turn(room)).toBe(next);
    // Later laps skip them too: next → fourth → opener → (gone skipped) → next.
    guess(room, 2);
    guess(room, 3);
    expect(turn(room)).toBe(opener);
    guess(room, 4);
    expect(turn(room)).toBe(next);
  });

  it('a starter who drops hands the opening to the next player', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    const seats = pub(room).seats;
    const starter = pub(room).starter;
    room.disconnect(starter);
    room.advance(20_001);
    const next = seats[(seats.indexOf(starter) + 1) % 3];
    expect(pub(room)).toMatchObject({ starter: next, turn: next, guesses: [] });
  });

  it('ends the match when fewer than two players remain', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    const [a, b] = pub(room).seats;
    room.disconnect(a!);
    room.advance(20_001);
    room.disconnect(b!);
    room.advance(20_001);
    expect(room.phase()).toBe('results');
  });

  it('Dobrei! pays a chip for a doubled guess that holds', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { dobrei: true },
    });
    // Find a round whose answer is at least 2 so 1 → 2 is a safe double.
    while (answer(room) < 2) {
      guess(room, 0);
      doubt(room);
      room.advance(REVEAL_MS);
    }
    const cardsBefore = { ...pub(room).cards };
    guess(room, 1);
    expect(me(room, turn(room)).doubleAt).toBe(2);
    const doubler = guess(room, 2);
    expect(pub(room).guesses.at(-1)).toMatchObject({ value: 2, doubled: true });
    const doubter = doubt(room);
    expect(pub(room).result).toMatchObject({
      loser: doubter,
      chips: [doubler],
    });
    expect(pub(room).chips[doubler]).toBe(1);
    expect(pub(room).cards[doubter]).toBe((cardsBefore[doubter] ?? 0) + 1);
  });

  it('Dobrei! pays nothing when the doubled guess is doubted and wrong', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { dobrei: true },
    });
    guess(room, 1);
    const doubler = guess(room, answer(room) * 2 + 2);
    expect(pub(room).guesses.at(-1)!.doubled).toBe(true);
    doubt(room);
    expect(pub(room).result).toMatchObject({ loser: doubler, chips: [] });
    expect(pub(room).chips[doubler]).toBe(0);
  });

  it('Dobrei! is off by default', () => {
    const room = createTestRoom<State>(game, { players: 3 });
    guess(room, 1);
    guess(room, 100);
    expect(pub(room).guesses.at(-1)!.doubled).toBe(false);
  });

  it('scores -1 per card, chips cancel cards, and ties stay ties', () => {
    expect(matchScore(3, 1)).toBe(-2);
    expect(matchScore(1, 4)).toBe(0);
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { rounds: 2 },
    });
    const seats = pub(room).seats;
    // Round 1: the opener overshoots and is doubted → opener takes the card.
    const loser1 = guess(room, answer(room) + 1);
    doubt(room);
    room.advance(REVEAL_MS);
    // Round 2: the doubter of round 1 opens with 0, the next doubts → that doubter takes it.
    guess(room, 0);
    const loser2 = doubt(room);
    room.advance(REVEAL_MS);
    expect(loser1).not.toBe(loser2);
    const scores = Object.fromEntries(room.results()!.map((r) => [r.playerId, r.score]));
    expect(scores[loser1]).toBe(-1);
    expect(scores[loser2]).toBe(-1);
    const clean = seats.find((id) => id !== loser1 && id !== loser2)!;
    expect(scores[clean]).toBe(0);
  });

  it('ends by cards once a player holds the limit', () => {
    const room = createTestRoom<State>(game, { players: 3, config: { endMode: 'cards', cardLimit: 2, rounds: 1 } });
    expect(pub(room)).toMatchObject({ rounds: null, cardLimit: 2 });
    let rounds = 0;
    while (room.phase() === 'playing' && rounds < 20) {
      rounds++;
      // The opener overshoots every round and is doubted.
      guess(room, answer(room) + 1);
      doubt(room);
      room.advance(REVEAL_MS);
    }
    expect(room.phase()).toBe('results');
    const cards = room.state().cards;
    expect(Math.max(...Object.values(cards))).toBe(2);
    expect(Object.values(cards).reduce((a, b) => a + b, 0)).toBe(rounds);
  });

  it('never repeats a question within a match', () => {
    const room = createTestRoom<State>(game, {
      players: 3,
      config: { rounds: 30 },
    });
    const seen = new Set<string>();
    for (let round = 1; round <= 30; round++) {
      pick(room);
      const s = room.state();
      const key = `${s.category}:${s.question}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      guess(room, 0);
      doubt(room);
      room.advance(REVEAL_MS);
    }
    expect(room.phase()).toBe('results');
  });
});
