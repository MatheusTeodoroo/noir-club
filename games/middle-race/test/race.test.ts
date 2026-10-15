import { describe, expect, it } from 'vitest';
import {
  answer, beginTurn, leapTarget, newRace, nextTurn, playTurn, pump, runner, standings, turnOptions, validTurn,
  type PromptKind, type Race, type TurnChoice,
} from '../src/race.ts';
import { DELETE, FAST, GRAVITY, JUMP, JUNTO, MIRROR, MOVE_LIMIT, ONE, PUSH, RESET, SILENCE, UNION, pointsFor } from '../src/shared.ts';

// Board helper: everyone not listed sits on the start column.
function board(pos: Record<number, number>, cols = 32, fastBack = [1, 2]): Race {
  const race = newRace(cols, fastBack);
  for (const [c, p] of Object.entries(pos)) {
    runner(race, Number(c)).pos = p;
    if (p !== 1) runner(race, Number(c)).moved = true;
  }
  return race;
}

const outExcept = (race: Race, keep: number[]) => {
  for (let c = 1; c <= 11; c++) if (!keep.includes(c)) runner(race, c).out = true;
};

type Answer = { kind: PromptKind; value: number };

/** Plays `cls`'s turn and runs the reaction system, answering prompts in order. */
function play(race: Race, cls: number, choice: TurnChoice, answers: Answer[] = []) {
  race.turn = cls;
  beginTurn(race);
  expect(validTurn(race, choice)).toBe(true);
  playTurn(race, choice);
  const asked: PromptKind[] = [];
  for (;;) {
    const r = pump(race);
    if (r === 'beat') continue;
    if (r !== 'prompt') break;
    const next = answers.shift();
    asked.push(race.prompt!.kind);
    if (!next) throw new Error(`unexpected prompt ${race.prompt!.kind} for class ${race.prompt!.cls}`);
    expect(race.prompt!.kind).toBe(next.kind);
    expect(race.prompt!.options).toContain(next.value);
    answer(race, next.value);
  }
  expect(answers).toEqual([]);
  return asked;
}

const pos = (race: Race, c: number) => runner(race, c).pos;

describe('cards and movement', () => {
  it('moves forward by the card and refills an empty hand', () => {
    const race = board({});
    runner(race, JUMP).hand = [3];
    play(race, JUMP, { card: 3 });
    expect(pos(race, JUMP)).toBe(4);
    expect(runner(race, JUMP).hand).toEqual([0, 1, 2, 3, 4]);
    expect(runner(race, JUMP).discard).toEqual([]);
  });

  it('stops at the start column and finishes on the last one', () => {
    const race = board({ [FAST]: 2 }, 32, [3, 4]);
    play(race, FAST, { card: 3, double: true });
    expect(pos(race, FAST)).toBe(1);
    const r2 = board({ [JUMP]: 30 });
    play(r2, JUMP, { card: 4 });
    expect(runner(r2, JUMP).out).toBe(true);
    expect(r2.finish).toEqual([JUMP]);
  });

  it('Swift doubles and its backward cards go back', () => {
    const race = board({ [FAST]: 10 }, 32, [1, 2]);
    play(race, FAST, { card: 4, double: true });
    expect(pos(race, FAST)).toBe(18);
    play(race, FAST, { card: 2 });
    expect(pos(race, FAST)).toBe(16);
  });

  it('Leap jumps players without counting them, and its 0 card stays put', () => {
    const race = board({ [JUMP]: 5, [JUNTO]: 6, [SILENCE]: 8 });
    expect(leapTarget(race, JUMP, 3)).toBe(10); // 6 and 8 are occupied: counts 7, 9, 10
    play(race, JUMP, { card: 3 });
    expect(pos(race, JUMP)).toBe(10);
    play(race, JUMP, { card: 0 });
    expect(pos(race, JUMP)).toBe(10);
    expect(runner(race, JUMP).discard).toEqual([3, 0]);
  });

  it('Leap may reset with 2 cards', () => {
    const race = board({ [JUMP]: 5 });
    runner(race, JUMP).hand = [0, 4];
    runner(race, JUMP).discard = [1, 2, 3];
    race.turn = JUMP;
    beginTurn(race);
    expect(turnOptions(race).resetCards).toEqual([0, 1, 2, 3, 4]);
    expect(validTurn(race, { card: 2, leapReset: true })).toBe(true);
    expect(validTurn(race, { card: 2 })).toBe(false);
    play(race, JUMP, { card: 2, leapReset: true });
    expect(runner(race, JUMP).hand).toEqual([0, 1, 3, 4]);
  });
});

describe('Flow A — One', () => {
  it('moves One right after another player plays a "1"', () => {
    const race = board({ [ONE]: 5, [JUMP]: 3 });
    const asked = play(race, JUMP, { card: 1 }, [{ kind: 'oneDir', value: -1 }]);
    expect(asked).toEqual(['oneDir']);
    expect(pos(race, JUMP)).toBe(4);
    expect(pos(race, ONE)).toBe(4);
  });

  it('does not react to its own "1"', () => {
    const race = board({ [ONE]: 5 });
    play(race, ONE, { card: 1 });
    expect(pos(race, ONE)).toBe(6);
  });

  it('reacts from the start column too, on the very first "1" of the match', () => {
    const race = board({});
    const asked = play(race, GRAVITY, { card: 1 }, [{ kind: 'oneDir', value: 1 }]);
    expect(asked).toEqual(['oneDir']);
    expect(race.prompt).toBeNull();
    expect(pos(race, ONE)).toBe(2);
    const r2 = board({});
    r2.turn = GRAVITY;
    beginTurn(r2);
    playTurn(r2, { card: 1 });
    pump(r2);
    expect(pump(r2)).toBe('prompt');
    expect(r2.prompt!.options).toEqual([1]); // cannot go back from the start
  });

  it('reacts to Swift\'s doubled "1"', () => {
    const race = board({ [ONE]: 5, [FAST]: 3 }, 32, [3, 4]);
    play(race, FAST, { card: 1, double: true }, [{ kind: 'oneDir', value: 1 }]);
    expect(pos(race, FAST)).toBe(5);
    expect(pos(race, ONE)).toBe(6);
  });
});

describe('Flow B — forced reactions', () => {
  it('Reset moved backwards returns a player\'s discards', () => {
    const race = board({ [GRAVITY]: 5, [RESET]: 9, [JUMP]: 12 });
    runner(race, JUMP).hand = [4];
    runner(race, JUMP).discard = [0, 1, 2, 3];
    play(race, GRAVITY, { card: 2, gravity: RESET }, [{ kind: 'resetTarget', value: JUMP }]);
    expect(pos(race, RESET)).toBe(6);
    expect(runner(race, JUMP).hand).toEqual([0, 1, 2, 3, 4]);
    expect(runner(race, JUMP).discard).toEqual([]);
  });

  it('Delete moved by another class leaves its target one chosen card until their reset', () => {
    const race = board({ [GRAVITY]: 5, [DELETE]: 9, [JUNTO]: 12 });
    play(race, GRAVITY, { card: 2, gravity: DELETE }, [
      { kind: 'deleteTarget', value: JUNTO },
      { kind: 'deleteKeep', value: 3 },
    ]);
    expect(runner(race, JUNTO).hand).toEqual([3]);
    expect(runner(race, JUNTO).removed).toEqual([1, 2, 4]);
    play(race, JUNTO, { card: 3 }, [{ kind: 'juntoTarget', value: JUMP }]); // its last card
    expect(runner(race, JUNTO).hand).toEqual([1, 2, 3, 4]);
    expect(runner(race, JUNTO).removed).toEqual([]);
  });

  it('Delete and Mirror do not react to their own cards', () => {
    const race = board({ [DELETE]: 5, [MIRROR]: 5 });
    expect(play(race, DELETE, { card: 2 })).toEqual([]);
    expect(play(race, MIRROR, { card: 3 })).toEqual([]);
  });

  it('Mirror moves its target the same distance the other way', () => {
    const race = board({ [GRAVITY]: 5, [MIRROR]: 12, [JUMP]: 20 });
    play(race, GRAVITY, { card: 1, gravity: MIRROR }, [{ kind: 'mirrorTarget', value: JUMP }]);
    expect(pos(race, MIRROR)).toBe(6);
    expect(pos(race, JUMP)).toBe(26);
  });

  it('reacts before the reactive flow, and again when moved by it', () => {
    // Gravity pulls Mirror to 6, right in front of Union at 5. Mirror reacts (B), then Union
    // pulls Mirror onto 5 (C), and Mirror reacts again — not to the same player twice in a row.
    const race = board({ [GRAVITY]: 5, [UNION]: 5, [MIRROR]: 12, [JUMP]: 20, [JUNTO]: 15 });
    const asked = play(race, GRAVITY, { card: 1, gravity: MIRROR }, [
      { kind: 'mirrorTarget', value: JUMP },
      { kind: 'mirrorTarget', value: JUNTO },
    ]);
    expect(asked).toEqual(['mirrorTarget', 'mirrorTarget']);
    expect(pos(race, MIRROR)).toBe(5);
    expect(pos(race, JUMP)).toBe(26);
    expect(pos(race, JUNTO)).toBe(16);
  });
});

describe('Flow C — reactive classes', () => {
  it('Union pulls whoever lands exactly 1 ahead onto its space', () => {
    const race = board({ [UNION]: 5, [JUNTO]: 2 });
    play(race, JUNTO, { card: 4 });
    expect(pos(race, JUNTO)).toBe(5);
    expect(race.log.some((e) => e.k === 'union' && e.b === JUNTO)).toBe(true);
  });

  it('a Union pull moves Reset backwards, so Reset reacts', () => {
    const race = board({ [UNION]: 5, [RESET]: 2, [JUMP]: 9 });
    const asked = play(race, RESET, { card: 4 }, [{ kind: 'resetTarget', value: JUMP }]);
    expect(asked).toEqual(['resetTarget']);
    expect(pos(race, RESET)).toBe(5);
  });

  it('Shove pushes everyone on its space in class order, one reaction system each', () => {
    const race = board({ [PUSH]: 2, [JUNTO]: 6, [JUMP]: 6 });
    const asked = play(race, PUSH, { card: 4 }, [
      { kind: 'pushDir', value: 1 },
      { kind: 'pushDir', value: -1 },
    ]);
    expect(asked).toEqual(['pushDir', 'pushDir']);
    expect(pos(race, JUNTO)).toBe(7);
    expect(pos(race, JUMP)).toBe(5);
  });

  it('Shove born on the start column does not push until it has moved', () => {
    const race = board({});
    expect(play(race, JUMP, { card: 2 })).toEqual([]); // everyone shares column 1 with Shove
    const r2 = board({ [JUMP]: 3 });
    outExcept(r2, [PUSH, JUNTO, JUMP]);
    runner(r2, PUSH).moved = true; // brought back to the start after moving: now it reacts
    const asked = play(r2, JUMP, { card: 2 }, [{ kind: 'pushDir', value: 1 }]);
    expect(asked).toEqual(['pushDir']);
    expect(pos(r2, JUNTO)).toBe(2);
  });

  it('Together moving with its last card sends a player forward the same distance', () => {
    const race = board({ [JUNTO]: 3, [JUMP]: 10 });
    runner(race, JUNTO).hand = [4];
    const asked = play(race, JUNTO, { card: 4 }, [{ kind: 'juntoTarget', value: JUMP }]);
    expect(asked).toEqual(['juntoTarget']);
    expect(pos(race, JUMP)).toBe(14);
    expect(play(race, JUNTO, { card: 2 })).toEqual([]); // not its last card
  });
});

describe('abilities and rules', () => {
  it('Gravity pulls in front of or behind itself and cannot pick its own space', () => {
    const race = board({ [GRAVITY]: 10, [JUMP]: 20, [JUNTO]: 3, [SILENCE]: 10 });
    race.turn = GRAVITY;
    beginTurn(race);
    expect(turnOptions(race).gravityTargets).not.toContain(SILENCE);
    play(race, GRAVITY, { card: 3, gravity: JUMP });
    expect(pos(race, JUMP)).toBe(11);
    expect(pos(race, GRAVITY)).toBe(10);
    play(race, GRAVITY, { card: 2, gravity: JUNTO });
    expect(pos(race, JUNTO)).toBe(9);
  });

  it('non-consecutive: Gravity cannot pick the same player twice in a row', () => {
    const race = board({ [GRAVITY]: 10, [JUMP]: 20, [JUNTO]: 25 });
    play(race, GRAVITY, { card: 3, gravity: JUMP });
    race.turn = GRAVITY;
    beginTurn(race);
    expect(turnOptions(race).gravityTargets).not.toContain(JUMP);
    expect(turnOptions(race).gravityTargets).toContain(JUNTO);
  });

  it('non-consecutive with one player left: the activation is lost, then allowed again', () => {
    const race = board({ [GRAVITY]: 5, [RESET]: 12 });
    outExcept(race, [GRAVITY, RESET]);
    runner(race, RESET).last = GRAVITY;
    play(race, GRAVITY, { card: 1, gravity: RESET });
    expect(race.log.some((e) => e.k === 'lost' && e.a === RESET)).toBe(true);
    expect(runner(race, RESET).last).toBeNull();
  });

  it('Silence switches abilities off until Silence\'s next turn', () => {
    const race = board({ [SILENCE]: 3, [ONE]: 5, [JUMP]: 2 });
    play(race, SILENCE, { card: 1, silence: ONE });
    expect(race.silenced).toBe(ONE);
    expect(play(race, JUMP, { card: 1 })).toEqual([]); // One is silenced
    race.turn = SILENCE;
    beginTurn(race);
    expect(race.silenced).toBeNull();
  });

  it('a silenced Swift cannot double and a silenced Leap does not leap', () => {
    const race = board({ [FAST]: 5 }, 32, [1, 2]);
    race.silenced = FAST;
    race.turn = FAST;
    beginTurn(race);
    expect(validTurn(race, { card: 4, double: true })).toBe(false);
    const r2 = board({ [JUMP]: 5, [JUNTO]: 6 });
    r2.silenced = JUMP;
    play(r2, JUMP, { card: 2 });
    expect(pos(r2, JUMP)).toBe(7);
  });

  it('cuts a cascade at the movement limit and the turn goes on', () => {
    // Union lands on Shove and Leap: Shove pushes back, Union pulls, Shove pushes… down the board.
    const race = board({ [UNION]: 36, [PUSH]: 40, [JUMP]: 40 }, 48);
    race.turn = UNION;
    beginTurn(race);
    playTurn(race, { card: 4 });
    for (;;) {
      const r = pump(race);
      if (r === 'beat') continue;
      if (r !== 'prompt') break;
      expect(race.prompt!.kind).toBe('pushDir');
      answer(race, race.prompt!.options.includes(-1) ? -1 : 1);
    }
    expect(race.moves).toBe(MOVE_LIMIT);
    expect(race.log.some((e) => e.k === 'loop')).toBe(true);
    expect(race.stack).toEqual([]);
  });

  it('orders arrivals chronologically and ends with one runner left', () => {
    const race = board({ [JUNTO]: 31, [JUMP]: 30 });
    play(race, JUMP, { card: 3 });
    play(race, JUNTO, { card: 1 });
    expect(race.finish).toEqual([JUMP, JUNTO]);
    outExcept(race, [FAST]);
    race.finish.push(1, 2, 3, 4, 6, 7, 8, 10);
    expect(nextTurn(race).over).toBe(true);
    expect(standings(race)[10]).toBe(FAST);
  });

  it('turn order skips finished classes and counts rounds', () => {
    const race = board({});
    runner(race, RESET).out = true;
    race.turn = GRAVITY;
    expect(nextTurn(race)).toEqual({ newRound: false, over: false });
    expect(race.turn).toBe(PUSH);
    race.turn = FAST;
    expect(nextTurn(race).newRound).toBe(true);
    expect(race.round).toBe(2);
  });
});

describe('scoring table', () => {
  it('rewards closeness to 6th place, sharing ranks at equal distance', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(pointsFor)).toEqual([0, 1, 3, 5, 7, 10, 7, 5, 3, 1, 0]);
  });
});
