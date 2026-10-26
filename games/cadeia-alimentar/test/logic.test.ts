import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { ANIMALS, ANIMAL_LIST, type Animal, type Area } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const SETUP = 30_000;
const TALK = 90_000;
const MOVE = 20_000;
const HUNT = 45_000;
const DUSK = 12_000;
const FINAL = 40_000;

const pub = (room: Room) => room.publicView() as PublicView;
const pv = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** A 13-player room already past the tutorial. */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { players: 13, seed: 3, ...opts, config: { tutorial: false, ...opts.config } });

/** Player id holding each animal. */
const cast = (room: Room) =>
  Object.fromEntries(Object.entries(room.state().animals).map(([id, a]) => [a, id])) as Record<Animal, string>;

/** Plays the opening: everyone ready (Chameleon disguised), peeks at the next players, guesses. */
function opening(room: Room, o: { disguise?: Animal; crowGuess?: Animal } = {}) {
  const who = cast(room);
  const ids = room.ids;
  for (const id of ids) {
    if (id === who.chameleon) room.act(id, { type: 'disguise', animal: o.disguise ?? 'deer' });
    else room.act(id, { type: 'ready' });
  }
  for (const [i, id] of ids.entries()) {
    const n = ANIMALS[room.state().animals[id]!].peeks;
    room.act(id, { type: 'peek', targets: [1, 2].slice(0, n).map((k) => ids[(i + k) % ids.length]) });
  }
  for (const [i, id] of ids.entries()) {
    const target = id === who.crow && o.crowGuess ? who[o.crowGuess] : ids[(i + 1) % ids.length];
    room.act(id, { type: 'guess', target });
  }
  expect(pub(room).phase).toBe('talk');
}

/** Talk runs out, everyone alive moves (habitat unless told otherwise), the hunt starts. */
function toHunt(room: Room, moves: Partial<Record<Animal, Area>> = {}) {
  room.advance(TALK);
  expect(pub(room).phase).toBe('move');
  const s = room.state();
  for (const id of room.ids) {
    if (!s.alive[id]) continue;
    const a = s.animals[id]!;
    room.act(id, { type: 'move', area: moves[a] ?? ANIMALS[a].habitat });
  }
  expect(pub(room).phase).toBe('hunt');
}

const attack = (room: Room, by: Animal, target: Animal) => {
  const who = cast(room);
  room.act(who[by], { type: 'attack', target: who[target] });
};

/** Hunt and dusk run out. */
const endRound = (room: Room) => {
  room.advance(HUNT);
  expect(pub(room).phase).toBe('dusk');
  room.advance(DUSK);
};

const alive = (room: Room, a: Animal) => room.state().alive[cast(room)[a]];

describe('Cadeia Alimentar', () => {
  it('plays the opening and 4 rounds to the final results with 13 players', () => {
    const room = playing();
    expect(pub(room)).toMatchObject({ phase: 'role', round: 1 });
    opening(room, { crowGuess: 'lion' });
    for (let round = 1; round <= 4; round++) {
      expect(pub(room)).toMatchObject({ phase: 'talk', round });
      toHunt(room);
      attack(room, 'lion', round === 1 ? 'deer' : round === 2 ? 'hyena' : 'deer');
      room.advance(HUNT);
      expect(pub(room).phase).toBe('dusk');
      room.advance(DUSK);
    }
    expect(pub(room).phase).toBe('final');
    const final = pub(room).final!;
    // Lion ate in round 1 (Deer) and 2 (Hyena), then starved in round 3.
    expect(alive(room, 'lion')).toBe(false);
    expect(final.winners).toContain(cast(room).hyena);
    expect(final.winners).not.toContain(cast(room).crow); // guessed the Lion
    room.advance(FINAL);
    expect(room.phase()).toBe('results');
  });

  it('moves through every phase on timers alone, with nobody acting', () => {
    const room = playing();
    room.advance(SETUP * 3);
    expect(pub(room).phase).toBe('talk');
    expect(room.state().disguise).not.toBeNull();
    for (let round = 1; round <= 4; round++) {
      room.advance(TALK + MOVE);
      expect(pub(room)).toMatchObject({ phase: 'hunt', round });
      room.advance(HUNT + DUSK);
    }
    expect(pub(room).phase).toBe('final');
    // Nobody ate: the Lion starved in round 1, the Eagle and the Crocodile in round 2.
    const dead = Object.fromEntries(pub(room).dead.map((d) => [d.animal, `${d.round}:${d.cause}`]));
    expect(dead).toEqual({ lion: '1:starved', crocodile: '2:starved', eagle: '2:starved', hyena: '3:starved' });
    room.advance(FINAL);
    expect(room.phase()).toBe('results');
  });

  it('ends each opening step early once everyone acted', () => {
    const room = playing();
    const who = cast(room);
    for (const id of room.ids) if (id !== who.chameleon) room.act(id, { type: 'ready' });
    expect(pub(room).phase).toBe('role');
    expect(pub(room).acted).toHaveLength(12);
    room.act(who.chameleon, { type: 'disguise', animal: 'rabbit' });
    expect(pub(room).phase).toBe('peek');
  });

  describe('hidden information', () => {
    it('keeps animals, disguise, peeks and guesses off the TV and other phones', () => {
      const room = playing();
      const who = cast(room);
      opening(room, { disguise: 'rabbit', crowGuess: 'lion' });
      const json = room.publicJson();
      for (const a of ANIMAL_LIST) expect(json).not.toContain(`"${a}"`);
      expect(json).not.toContain('peeks');
      expect(json).not.toContain('guess"');
      // Each phone holds only its own animal and peeks.
      for (const id of room.ids) {
        const v = pv(room, id);
        expect(v.animal).toBe(room.state().animals[id]);
        expect(v.peeks?.every((p) => room.state().peeks[id]!.some((q) => q.target === p.target))).toBe(true);
        if (id !== who.chameleon) expect(v.disguise).toBeNull();
      }
      expect(pv(room, who.chameleon).disguise).toBe('rabbit');
      expect(pv(room, who.crow).guess).toBe(who.lion);
    });

    it('shows the Chameleon disguise to whoever peeks at it', () => {
      const room = playing();
      const who = cast(room);
      for (const id of room.ids) {
        if (id === who.chameleon) room.act(id, { type: 'disguise', animal: 'lion' });
        else room.act(id, { type: 'ready' });
      }
      room.act(who.deer, { type: 'peek', targets: [who.chameleon] });
      room.act(who.lion, { type: 'peek', targets: [who.deer] });
      expect(pv(room, who.deer).peeks).toEqual([{ target: who.chameleon, shown: 'lion' }]);
      expect(pv(room, who.lion).peeks).toEqual([{ target: who.deer, shown: 'deer' }]);
      // Nobody learns they were peeked at — not even the Chameleon.
      expect(JSON.stringify(pv(room, who.chameleon))).not.toContain(who.deer);
    });

    it('hides the area choices until the hunt and the attacker from everyone outside the area', () => {
      const room = playing();
      const who = cast(room);
      opening(room);
      room.advance(TALK);
      room.act(who.lion, { type: 'move', area: 'forest' });
      expect(pub(room).acted).toEqual([who.lion]);
      expect(room.publicJson()).not.toContain('forest');
      for (const id of room.ids) if (id !== who.lion) expect(pv(room, id).myMove).toBeNull();
      room.advance(MOVE);
      expect(pub(room).board!.forest).toContain(who.lion);
      attack(room, 'lion', 'rabbit');
      // The TV still shows the Rabbit alive in the forest until dusk.
      expect(pub(room).board!.forest).toContain(who.rabbit);
      expect(pub(room).dead).toEqual([]);
      expect(room.publicJson()).not.toContain('rabbit');
      // Forest players saw it; the Rabbit too; nobody elsewhere did.
      for (const a of ['snake', 'chameleon', 'rat', 'rabbit', 'lion'] as Animal[]) {
        expect(pv(room, who[a]).sightings).toEqual([
          { round: 1, area: 'forest', kind: 'eaten', victim: who.rabbit, victimAnimal: 'rabbit', by: who.lion },
        ]);
      }
      for (const a of ['deer', 'hyena', 'eagle', 'crocodile'] as Animal[]) expect(pv(room, who[a]).sightings).toEqual([]);
      room.advance(HUNT);
      expect(pub(room).dead).toEqual([{ id: who.rabbit, animal: 'rabbit', round: 1, area: 'forest', cause: 'eaten' }]);
      expect(room.publicJson()).not.toContain(`"by"`);
    });

    it('never tells anyone that an attack failed', () => {
      const room = playing();
      opening(room);
      toHunt(room);
      const who = cast(room);
      const deerBefore = JSON.stringify(pv(room, who.lion));
      attack(room, 'deer', 'lion');
      expect(alive(room, 'lion')).toBe(true);
      expect(JSON.stringify(pv(room, who.lion))).toBe(deerBefore);
      expect(pv(room, who.deer).sightings).toEqual([]);
    });
  });

  describe('the food chain', () => {
    it('lets only a higher animal eat a lower one', () => {
      const room = playing();
      opening(room);
      toHunt(room, { eagle: 'field' });
      expect(pub(room).board!.field).toEqual(expect.arrayContaining([cast(room).hyena, cast(room).eagle]));
      attack(room, 'hyena', 'eagle');
      expect(alive(room, 'eagle')).toBe(true);
      attack(room, 'eagle', 'deer');
      attack(room, 'eagle', 'hyena');
      attack(room, 'eagle', 'lion');
      expect(alive(room, 'deer')).toBe(false);
      expect(alive(room, 'hyena')).toBe(false);
      expect(alive(room, 'lion')).toBe(true);
      attack(room, 'lion', 'eagle');
      expect(alive(room, 'eagle')).toBe(false);
    });

    it('only allows attacks inside your own area', () => {
      const room = playing();
      opening(room);
      toHunt(room);
      attack(room, 'lion', 'rabbit');
      expect(alive(room, 'rabbit')).toBe(true);
    });

    it('kills whoever attacks the Snake, which cannot die', () => {
      const room = playing();
      const who = cast(room);
      opening(room);
      toHunt(room, { lion: 'forest' });
      attack(room, 'lion', 'snake');
      expect(alive(room, 'lion')).toBe(false);
      expect(alive(room, 'snake')).toBe(true);
      expect(pv(room, who.rat).sightings[0]).toMatchObject({ kind: 'snake', victim: who.lion, by: who.snake });
      room.advance(HUNT);
      // The TV only says the Lion was eaten in the forest.
      expect(pub(room).dead).toEqual([{ id: who.lion, animal: 'lion', round: 1, area: 'forest', cause: 'eaten' }]);
    });

    it('protects the quartet while all its survivors share an area', () => {
      const room = playing();
      opening(room);
      toHunt(room, { mallard: 'field', otter: 'field', rabbit: 'field' });
      attack(room, 'lion', 'deer');
      attack(room, 'hyena', 'otter');
      expect(['deer', 'mallard', 'otter', 'rabbit'].every((a) => alive(room, a as Animal))).toBe(true);
      attack(room, 'lion', 'hyena'); // the Lion still has to eat
      endRound(room);
      toHunt(room, { lion: 'forest' }); // the others went home: the quartet is split
      attack(room, 'lion', 'rabbit');
      expect(alive(room, 'rabbit')).toBe(false);
    });

    it('protects nobody once a single quartet animal is left', () => {
      const room = playing();
      opening(room);
      toHunt(room);
      attack(room, 'lion', 'deer');
      attack(room, 'eagle', 'mallard');
      attack(room, 'crocodile', 'otter');
      endRound(room);
      toHunt(room, { lion: 'forest' });
      attack(room, 'lion', 'rabbit');
      expect(alive(room, 'rabbit')).toBe(false);
    });

    it('starves predators after their limit of rounds in a row without eating', () => {
      const room = playing();
      opening(room);
      toHunt(room);
      attack(room, 'lion', 'deer');
      endRound(room);
      expect(alive(room, 'lion')).toBe(true);
      expect(alive(room, 'crocodile')).toBe(true);
      expect(pv(room, cast(room).crocodile).hunger).toBe(1);
      toHunt(room);
      attack(room, 'crocodile', 'otter'); // the Crocodile eats in round 2, the Eagle never
      endRound(room);
      expect(alive(room, 'lion')).toBe(false);
      expect(alive(room, 'eagle')).toBe(false);
      expect(alive(room, 'crocodile')).toBe(true);
      expect(alive(room, 'hyena')).toBe(true);
      const starved = pub(room).dead.filter((d) => d.cause === 'starved').map((d) => d.animal);
      expect(starved.sort()).toEqual(['eagle', 'lion']);
      toHunt(room);
      endRound(room);
      expect(alive(room, 'hyena')).toBe(false);
    });
  });

  describe('movement', () => {
    it('forbids areas and sends wanderers home next round', () => {
      const room = playing();
      const who = cast(room);
      opening(room);
      room.advance(TALK);
      expect(pv(room, who.lion).moveOptions).toEqual(['river', 'field', 'forest']);
      expect(pv(room, who.eagle).moveOptions).toEqual(['river', 'sky', 'field', 'forest']);
      const before = room.snapshot();
      room.act(who.lion, { type: 'move', area: 'sky' });
      expect(room.snapshot()).toBe(before);
      room.act(who.lion, { type: 'move', area: 'river' });
      room.act(who.lion, { type: 'move', area: 'forest' }); // may change until the time is up
      room.advance(MOVE);
      expect(room.state().area[who.lion]).toBe('forest');
      expect(room.state().area[who.deer]).toBe('field'); // no choice: stays home
      attack(room, 'lion', 'rabbit');
      endRound(room);
      room.advance(TALK);
      expect(pv(room, who.lion).moveOptions).toEqual(['field']);
      room.act(who.lion, { type: 'move', area: 'river' });
      expect(pv(room, who.lion).myMove).toBeNull();
    });
  });

  describe('scoring', () => {
    it('gives 1 point to each player who met the goal, dead or alive', () => {
      const room = playing();
      opening(room, { crowGuess: 'snake' });
      // Everyone but the Snake and the Otter gathers in the field; the Lion eats them all.
      const toField = Object.fromEntries(
        ANIMAL_LIST.filter((a) => a !== 'snake' && a !== 'otter').map((a) => [a, 'field' as Area]),
      );
      toHunt(room, toField);
      for (const a of ['hyena', 'eagle', 'crocodile', 'chameleon', 'crow', 'plover', 'rat', 'deer', 'mallard', 'rabbit'] as Animal[])
        attack(room, 'lion', a);
      endRound(room);
      expect(pub(room).dead).toHaveLength(10);
      for (let round = 2; round <= 4; round++) {
        toHunt(room);
        endRound(room);
      }
      // The Lion starved in round 2; the Otter survived.
      const who = cast(room);
      const final = pub(room).final!;
      expect(final.deadCount).toBe(11);
      expect([...final.winners].sort()).toEqual([who.snake, who.hyena, who.crow, who.otter].sort());
      room.advance(FINAL);
      const scores = Object.fromEntries(room.results()!.map((r) => [r.playerId, r.score]));
      for (const id of room.ids) expect(scores[id]).toBe(final.winners.includes(id) ? 1 : 0);
    });

    it('lets dependants win dead: the Rat when the Lion lives, the Plover when the Crocodile lives', () => {
      const room = playing();
      opening(room, { crowGuess: 'deer' });
      toHunt(room, { lion: 'forest' });
      attack(room, 'lion', 'rat');
      attack(room, 'crocodile', 'plover');
      endRound(room);
      toHunt(room); // the Lion must go home to the field
      attack(room, 'lion', 'deer');
      attack(room, 'crocodile', 'otter');
      endRound(room);
      toHunt(room, { crocodile: 'forest' });
      attack(room, 'lion', 'hyena');
      attack(room, 'crocodile', 'chameleon');
      endRound(room);
      toHunt(room, { lion: 'forest' }); // the Crocodile goes home and skips a meal: 1 of 2
      attack(room, 'lion', 'rabbit');
      endRound(room);
      expect(pub(room).phase).toBe('final');
      const who = cast(room);
      const final = pub(room).final!;
      expect(alive(room, 'rat')).toBe(false);
      expect(alive(room, 'plover')).toBe(false);
      expect(final.winners).toContain(who.rat);
      expect(final.winners).toContain(who.plover);
      expect(final.winners).not.toContain(who.hyena);
      expect(final.winners).not.toContain(who.crow); // the Deer was eaten
    });

    it('lets the Host jump from the final reveal to the scoreboard', () => {
      const room = playing();
      room.advance(SETUP * 3);
      for (let round = 1; round <= 4; round++) room.advance(TALK + MOVE + HUNT + DUSK);
      expect(pub(room).phase).toBe('final');
      room.act('p2', { type: 'finish' });
      expect(pub(room).phase).toBe('final');
      room.act('p1', { type: 'finish' });
      expect(room.phase()).toBe('results');
    });
  });

  it('ignores invalid actions', () => {
    const room = playing();
    const who = cast(room);
    let before = room.snapshot();
    room.act(who.chameleon, { type: 'ready' }); // the Chameleon must pick a disguise
    room.act(who.chameleon, { type: 'disguise', animal: 'chameleon' });
    room.act(who.chameleon, { type: 'disguise', animal: 'dragon' });
    room.act(who.lion, { type: 'disguise', animal: 'deer' });
    room.act(who.lion, { type: 'peek', targets: [who.deer] }); // wrong phase
    room.act(who.lion, { type: 'move', area: 'field' });
    room.act(who.lion, { type: 'nonsense' });
    room.act(who.lion, null);
    expect(room.snapshot()).toBe(before);
    room.advance(SETUP);
    before = room.snapshot();
    room.act(who.lion, { type: 'peek', targets: [who.deer, who.rat] }); // the Lion peeks at 1
    room.act(who.crow, { type: 'peek', targets: [who.deer] }); // the Crow peeks at 2
    room.act(who.crow, { type: 'peek', targets: [who.deer, who.deer] });
    room.act(who.lion, { type: 'peek', targets: [who.lion] });
    room.act(who.lion, { type: 'peek', targets: ['p99'] });
    room.act(who.lion, { type: 'peek', targets: 'p2' });
    expect(room.snapshot()).toBe(before);
    room.act(who.lion, { type: 'peek', targets: [who.deer] });
    before = room.snapshot();
    room.act(who.lion, { type: 'peek', targets: [who.rat] }); // only one peek
    expect(room.snapshot()).toBe(before);
    room.advance(SETUP);
    before = room.snapshot();
    room.act(who.crow, { type: 'guess', target: who.crow });
    room.act(who.crow, { type: 'guess', target: 'p99' });
    room.act(who.lion, { type: 'attack', target: who.deer });
    expect(room.snapshot()).toBe(before);
  });

  it('turns a player who drops for good into a passive animal', () => {
    const room = playing();
    const who = cast(room);
    opening(room);
    room.advance(TALK);
    for (const id of room.ids) if (id !== who.eagle) room.act(id, { type: 'move', area: ANIMALS[room.state().animals[id]!].habitat });
    room.disconnect(who.eagle);
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room).phase).toBe('hunt'); // nobody waits for the Eagle, which stays in the sky
    expect(room.state().area[who.eagle]).toBe('sky');
    endRound(room);
    room.advance(TALK);
    room.reconnect(who.eagle);
    expect(pv(room, who.eagle).moveOptions).toEqual(['sky']);
    room.act(who.eagle, { type: 'move', area: 'sky' }); // acting again makes it a full player
    expect(room.state().passive[who.eagle]).toBeUndefined();
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 13 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'role', round: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 13 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('role');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 13 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).toBe('role');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 13 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
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
