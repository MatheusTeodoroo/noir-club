import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type Card, type PlayerView, type PublicView, type Slot, type State } from '../src/logic.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room) => room.playerView('p1') as PlayerView;

let n = 0;
const card = (def: string): Card => ({ uid: `t${++n}`, def });
const slot = (def: string, down = false): Slot => ({ ...card(def), down });
const defs = (cards: (Card | null)[]) => cards.map((c) => (c ? c.def : null));

/** A room past the intro, in the play phase of Mission One. */
function playing(config: Record<string, unknown> = {}, seed = 3): Room {
  const room = createTestRoom<State>(game, { config: { tutorial: false, ...config }, seed });
  room.act('p1', { type: 'intro', dir: 'skip' });
  return room;
}

/** Rigs the private state directly (tests only) — the next action sees it. */
function rig(room: Room, fn: (s: State) => void) {
  fn(room.state());
}

function setLine(room: Room, line: (Slot | null)[]) {
  rig(room, (s) => {
    s.line = line;
  });
}

describe('Agent Decker', () => {
  describe('match flow', () => {
    it('plays the whole campaign from the intro to the final results', () => {
      const room = createTestRoom<State>(game, { seed: 1 });
      expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: 6 });
      for (let i = 0; i < 5; i++) room.act('p1', { type: 'intro', dir: 1 });
      expect(pub(room).slide).toBe(5);
      room.act('p1', { type: 'intro', dir: 1 });
      expect(pub(room).phase).toBe('play');

      const finish = (fn: (s: State) => void, alarm: number) => {
        rig(room, (s) => {
          fn(s);
          s.alarm = alarm;
        });
        room.act('p1', { type: 'endTurn' });
      };
      // Mission One: 6 stealth.
      finish((s) => (s.pool = { stealth: 6, fight: 0 }), 10);
      expect(pub(room)).toMatchObject({ phase: 'mission', mission: 1, alarm: 0, results: [10] });
      expect(pub(room).equip.map((c) => c.def)).toContain('map');
      room.act('p1', { type: 'continue' });
      // Mission Two: 6 fight and the Guard Uniform.
      finish((s) => {
        s.pool = { stealth: 0, fight: 6 };
        s.equip.push(card('locker'));
      }, 20);
      expect(pub(room)).toMatchObject({ phase: 'mission', mission: 2, maxInteractions: 2 });
      room.act('p1', { type: 'continue' });
      // Mission Three: seven cards in hand.
      finish((s) => {
        while (s.hand.length < 7) s.hand.push(card('punch'));
      }, 0);
      expect(pub(room)).toMatchObject({ phase: 'mission', mission: 3, draw: 5 });
      expect(pub(room).hand).toHaveLength(5);
      room.act('p1', { type: 'continue' });
      // Mission Four: 18 of anything and the Prisoner.
      finish((s) => {
        s.pool = { stealth: 9, fight: 9 };
        s.equip.push(card('prison'));
      }, 5);
      expect(pub(room)).toMatchObject({ phase: 'mission', mission: 4, maxInteractions: 3 });
      room.act('p1', { type: 'continue' });
      // Mission Five: the six cards of the line knocked out.
      finish((s) => s.line.forEach((c) => (c!.down = true)), 15);
      expect(pub(room)).toMatchObject({ phase: 'over', outcome: { won: true, reason: 'done' } });
      expect(pub(room).results).toEqual([10, 20, 0, 5, 15]);
      room.act('p1', { type: 'finish' });
      expect(room.phase()).toBe('results');
      expect(room.results()?.[0]).toEqual({ playerId: 'p1', score: 40 + 30 + 50 + 45 + 35 });
    });

    it('stops after the configured number of missions', () => {
      const room = playing({ missions: 1 });
      rig(room, (s) => (s.pool = { stealth: 6, fight: 0 }));
      room.act('p1', { type: 'endTurn' });
      expect(pub(room)).toMatchObject({ phase: 'over', outcome: { won: true } });
    });

    it('skips the how-to slides when the tutorial is off', () => {
      const room = createTestRoom<State>(game, { config: { tutorial: false } });
      expect(pub(room).slides).toBe(2);
      room.act('p1', { type: 'intro', dir: 1 });
      room.act('p1', { type: 'intro', dir: 1 });
      expect(pub(room).phase).toBe('play');
    });

    it('starts with the setup of the rulebook', () => {
      const room = playing();
      const v = pub(room);
      expect(v.line.every((s) => s)).toBe(true);
      expect(v.hand).toHaveLength(4);
      expect(v.deck).toBe(4);
      expect(v.obDeck).toBe(16);
      expect(v).toMatchObject({ alarm: 0, mission: 0, maxInteractions: 1, draw: 4 });
    });
  });

  describe('timers', () => {
    it('ends turns by the turn timer until the alarm goes off, then shows the results', () => {
      const room = playing({ turnSeconds: 30 });
      for (let i = 0; i < 40 && pub(room).phase === 'play'; i++) room.advance(30_000);
      expect(pub(room)).toMatchObject({ phase: 'over', outcome: { won: false } });
      room.advance(60_000);
      expect(room.phase()).toBe('results');
      expect(room.results()?.[0]).toEqual({ playerId: 'p1', score: 0 });
    });

    it('ends the turn early when the agent taps End turn', () => {
      const room = playing({ turnSeconds: 120 });
      expect(pub(room).turn).toBe(1);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room).turn).toBe(2);
      expect(pub(room).deadline).not.toBeNull();
    });

    it('has no turn timer by default', () => {
      const room = playing();
      expect(pub(room).deadline).toBeNull();
    });
  });

  describe('secrets', () => {
    it('never shows the order of the decks; looked-at cards only reach the phone', () => {
      const room = playing();
      rig(room, (s) => {
        s.hand = [card('archive')];
        s.deck = [card('hide'), card('punch'), card('guard'), card('camera')];
      });
      const deckUids = room.state().deck.map((c) => c.uid);
      for (const u of deckUids) expect(room.publicJson()).not.toContain(`"${u}"`);
      room.act('p1', { type: 'play', uid: room.state().hand[0]!.uid });
      expect(pub(room).pendingKind).toBe('planAhead');
      expect(phone(room).looking?.map((c) => c.def)).toEqual(['hide', 'punch', 'guard']);
      for (const u of deckUids) expect(room.publicJson()).not.toContain(`"${u}"`);
      expect(room.publicJson()).not.toContain('looking');
    });
  });

  describe('using cards', () => {
    it('adds resources and can undo them until something is spent', () => {
      const room = playing();
      rig(room, (s) => (s.hand = [card('hide'), card('punch'), card('guard')]));
      const [hide, punch, gun] = room.state().hand;
      room.act('p1', { type: 'play', uid: hide!.uid });
      room.act('p1', { type: 'play', uid: punch!.uid });
      room.act('p1', { type: 'play', uid: gun!.uid });
      expect(pub(room).pool).toEqual({ stealth: 1, fight: 3 });
      room.act('p1', { type: 'undo' });
      expect(pub(room).pool).toEqual({ stealth: 1, fight: 1 });
      expect(pub(room).hand.map((c) => c.def)).toEqual(['guard']);
      room.act('p1', { type: 'play', uid: gun!.uid });
      setLine(room, [null, null, null, null, null, slot('guard')]);
      room.act('p1', { type: 'interact', slot: 5, mode: 'knock' });
      expect(pub(room).canUndo).toBe(false);
    });

    it('Flashy Move gives fight for every two discarded cards', () => {
      const room = playing();
      rig(room, (s) => {
        s.hand = [card('gym')];
        s.discard = [card('hide'), card('hide'), card('hide'), card('hide'), card('hide')];
      });
      room.act('p1', { type: 'play', uid: room.state().hand[0]!.uid });
      expect(pub(room).pool.fight).toBe(2);
    });

    it('Throw a Rock needs a choice: fight or a card', () => {
      const room = playing();
      rig(room, (s) => (s.hand = [card('yard'), card('yard')]));
      const [a, b] = room.state().hand;
      const before = room.snapshot();
      room.act('p1', { type: 'play', uid: a!.uid });
      expect(room.snapshot()).toBe(before);
      room.act('p1', { type: 'play', uid: a!.uid, opt: 'fight' });
      expect(pub(room).pool.fight).toBe(1);
      const hand = pub(room).hand.length;
      room.act('p1', { type: 'play', uid: b!.uid, opt: 'draw' });
      expect(pub(room).hand.length).toBe(hand);
    });

    it('Bazooka goes to the obstacles discard', () => {
      const room = playing();
      rig(room, (s) => (s.hand = [card('bazooka')]));
      const obDiscard = pub(room).obDiscard;
      room.act('p1', { type: 'play', uid: room.state().hand[0]!.uid });
      expect(pub(room).pool.fight).toBe(5);
      expect(pub(room).play).toHaveLength(0);
      expect(pub(room).obDiscard).toBe(obDiscard + 1);
    });

    it('Misdirect, Bin, Recall, Burn and Save Bullets resolve their choice', () => {
      const room = playing();
      rig(room, (s) => {
        s.hand = [card('radio'), card('punch'), card('punch'), card('waste'), card('fence'), card('hide')];
        s.discard = [card('inspector'), card('camera'), card('barrel'), card('guard'), card('guard')];
      });
      const h = room.state().hand.slice();
      room.act('p1', { type: 'play', uid: h[0]!.uid });
      expect(pub(room).pendingKind).toBe('misdirect');
      room.act('p1', { type: 'endTurn' }); // blocked while choosing
      expect(pub(room).turn).toBe(1);
      room.act('p1', { type: 'resolve', uids: [h[1]!.uid, h[2]!.uid] });
      expect(pub(room).pool.stealth).toBe(4);
      room.act('p1', { type: 'play', uid: h[3]!.uid }); // Bin
      room.act('p1', { type: 'resolve', uids: [] });
      expect(pub(room).pendingKind).toBeNull();
      room.act('p1', { type: 'play', uid: h[4]!.uid }); // Save Bullets
      room.act('p1', { type: 'resolve', uids: [h[5]!.uid] });
      expect(pub(room).saved).toBe(h[5]!.uid);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room).hand.map((c) => c.uid)).toContain(h[5]!.uid);
      expect(pub(room).hand).toHaveLength(5);

      rig(room, (s) => s.hand.push(card('inspector'), card('barrel')));
      const recall = room.state().hand.at(-2)!;
      const burn = room.state().hand.at(-1)!;
      const target = room.state().discard[0]!;
      room.act('p1', { type: 'play', uid: recall.uid });
      room.act('p1', { type: 'resolve', uids: [target.uid] });
      expect(pub(room).hand.map((c) => c.uid)).toContain(target.uid);
      room.act('p1', { type: 'play', uid: burn.uid });
      const three = room.state().discard.slice(0, 3).map((c) => c.uid);
      room.act('p1', { type: 'resolve', uids: three });
      expect(pub(room).pendingKind).toBe('burn');
      room.act('p1', { type: 'resolve', uids: three.slice(0, 2) });
      expect(pub(room).removed).toBe(2);
    });

    it('Plan Ahead keeps one and puts the rest back in the chosen order', () => {
      const room = playing();
      rig(room, (s) => {
        s.hand = [card('archive')];
        s.deck = [card('hide'), card('punch'), card('guard'), card('camera')];
      });
      const [a, b, c] = room.state().deck;
      room.act('p1', { type: 'play', uid: room.state().hand[0]!.uid });
      room.act('p1', { type: 'resolve', keep: b!.uid, order: [c!.uid, a!.uid] });
      expect(pub(room).hand.map((x) => x.uid)).toEqual([b!.uid]);
      expect(room.state().deck.map((x) => x.def)).toEqual(['guard', 'hide', 'camera']);
    });

    it('equips KEEP items from the hand and adds equipped resources every turn', () => {
      const room = playing();
      rig(room, (s) => (s.hand = [card('locker'), card('sleeping')]));
      const [uniform, keycard] = room.state().hand;
      room.act('p1', { type: 'play', uid: keycard!.uid });
      expect(pub(room).hand).toHaveLength(2);
      room.act('p1', { type: 'equip', uid: uniform!.uid });
      room.act('p1', { type: 'equip', uid: keycard!.uid });
      expect(pub(room).equip.map((c) => c.def)).toEqual(['locker', 'sleeping']);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room).pool).toEqual({ stealth: 1, fight: 0 });
    });
  });

  describe('interacting with the line', () => {
    it('disarms to the Play Area, knocks out in place, one interaction per turn', () => {
      const room = playing();
      setLine(room, [slot('camera'), slot('camera'), null, null, null, slot('guard')]);
      rig(room, (s) => (s.pool = { stealth: 4, fight: 0 }));
      room.act('p1', { type: 'interact', slot: 0, mode: 'disarm' });
      expect(pub(room).line[0]).toBeNull();
      expect(pub(room).play.map((c) => c.def)).toEqual(['camera']);
      const before = room.snapshot();
      room.act('p1', { type: 'interact', slot: 1, mode: 'knock' });
      expect(room.snapshot()).toBe(before);
    });

    it('pays {any} costs with the chosen split of stealth and fight', () => {
      const room = playing();
      setLine(room, [null, null, null, null, null, slot('patrol')]);
      rig(room, (s) => (s.pool = { stealth: 4, fight: 4 }));
      room.act('p1', { type: 'interact', slot: 5, mode: 'knock', stealth: 5 });
      expect(pub(room).line[5]!.down).toBe(false);
      room.act('p1', { type: 'interact', slot: 5, mode: 'knock', stealth: 3 });
      expect(pub(room).pool).toEqual({ stealth: 1, fight: 2 });
      expect(pub(room).line[5]!.down).toBe(true);
    });

    it('a disarmed KEEP item can go straight to the Equip Area', () => {
      const room = playing();
      setLine(room, [null, null, null, null, null, slot('sleeping')]);
      rig(room, (s) => (s.pool = { stealth: 3, fight: 0 }));
      room.act('p1', { type: 'interact', slot: 5, mode: 'disarm', equip: true });
      expect(pub(room).equip.map((c) => c.def)).toEqual(['sleeping']);
    });

    it('an equipped Keycard pays for a door and goes to the discard', () => {
      const room = playing();
      setLine(room, [null, null, null, null, slot('camera'), slot('yard')]);
      rig(room, (s) => s.equip.push(card('sleeping')));
      const key = room.state().equip[0]!.uid;
      expect(pub(room).line[5]!.items).toEqual([key]);
      expect(pub(room).line[4]!.items).toEqual([]);
      room.act('p1', { type: 'interact', slot: 4, mode: 'knock', item: key });
      expect(pub(room).line[4]!.down).toBe(false);
      room.act('p1', { type: 'interact', slot: 5, mode: 'disarm', item: key });
      expect(pub(room).line[5]).toBeNull();
      expect(pub(room).discard.map((c) => c.uid)).toContain(key);
      expect(pub(room).equip).toHaveLength(0);
    });

    it('Watchtower adds 2 to its neighbours', () => {
      const room = playing();
      setLine(room, [slot('camera'), slot('watchtower'), slot('guard'), null, slot('camera'), null]);
      const v = pub(room);
      expect(v.line[0]!.cost).toEqual({ kind: 'stealth', n: 4 });
      expect(v.line[2]!.cost).toEqual({ kind: 'fight', n: 4 });
      expect(v.line[4]!.cost).toEqual({ kind: 'stealth', n: 2 });
    });

    it('Hawk blocks stealth-only costs; Sniper needs to be the only person', () => {
      const room = playing();
      setLine(room, [slot('hawk'), slot('camera'), slot('patrol'), slot('sniper'), slot('guard'), slot('guard', true)]);
      const v = pub(room);
      expect(v.line[1]!.blocked).toBe('hawk');
      expect(v.line[2]!.blocked).toBeNull();
      expect(v.line[3]!.blocked).toBe('sniper');
      rig(room, (s) => {
        s.line[4]!.down = true;
        s.line[2]!.down = true;
        s.pool = { stealth: 0, fight: 10 };
      });
      room.act('p1', { type: 'interact', slot: 3, mode: 'knock' });
      expect(pub(room).line[3]!.down).toBe(true);
    });

    it('Flammable Barrel knocks out its neighbours; Clumsy Guard can knock out a neighbour instead', () => {
      const room = playing();
      setLine(room, [slot('camera'), slot('barrel'), slot('guard'), slot('camera'), slot('clumsy'), slot('guard')]);
      rig(room, (s) => {
        s.pool = { stealth: 14, fight: 8 };
        s.equip.push(card('rule2'));
      });
      room.act('p1', { type: 'interact', slot: 1, mode: 'disarm', stealth: 14 });
      expect(defs(pub(room).line)).toEqual(['camera', null, 'guard', 'camera', 'clumsy', 'guard']);
      expect(pub(room).line[0]!.down && pub(room).line[2]!.down).toBe(true);
      room.act('p1', { type: 'interact', slot: 4, mode: 'adjacent', target: 5 });
      expect(pub(room).line[5]!.down).toBe(true);
      expect(pub(room).line[4]!.down).toBe(false);
    });
  });

  describe('line scroll', () => {
    it('the rightmost card leaves and raises the alarm; the rest slide right and new ones come in from the left', () => {
      const room = playing();
      setLine(room, [slot('guard'), slot('sentry'), null, slot('motion'), slot('camera'), null]);
      room.act('p1', { type: 'endTurn' });
      const v = pub(room);
      expect(v.alarm).toBe(8);
      expect(defs(v.line).slice(3)).toEqual(['guard', 'sentry', 'motion']);
      expect(v.line.every((s) => s)).toBe(true);
    });

    it('knocked-out cards leave without raising the alarm', () => {
      const room = playing();
      setLine(room, [slot('guard'), slot('guard'), slot('guard'), slot('guard'), slot('guard'), slot('camera', true)]);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room).alarm).toBe(0);
    });

    it('Patrolling Guard slides one more position', () => {
      const room = playing();
      setLine(room, [slot('guard'), slot('patrol'), slot('sentry'), slot('motion'), slot('yard'), slot('camera')]);
      room.act('p1', { type: 'endTurn' });
      expect(defs(pub(room).line).slice(1)).toEqual(['guard', 'sentry', 'patrol', 'motion', 'yard']);
    });

    it('Dormitory keeps face-down cards in place', () => {
      const room = playing();
      setLine(room, [slot('dormitory'), slot('guard', true), slot('sentry'), null, slot('yard'), slot('camera')]);
      room.act('p1', { type: 'endTurn' });
      const line = pub(room).line;
      expect(line[1]).toMatchObject({ def: 'guard', down: true });
      expect(defs(line).slice(3)).toEqual(['dormitory', 'sentry', 'yard']);
    });

    it('Inspector flips the last card face up before it leaves', () => {
      const room = playing();
      setLine(room, [slot('inspector'), slot('guard'), slot('guard'), slot('guard'), slot('guard'), slot('camera', true)]);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room).alarm).toBe(8);
    });

    it('Siren takes the whole line with it, raising only its own alarm', () => {
      const room = playing();
      setLine(room, [slot('camera'), slot('camera'), slot('camera'), slot('camera'), slot('camera'), slot('siren')]);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room).alarm).toBe(5);
      expect(pub(room).line.some((s) => s && s.uid.startsWith('t'))).toBe(false);
    });

    it('Guard Dog appears next to a person; Radio Tower gathers every person', () => {
      const room = playing();
      rig(room, (s) => (s.obDeck = [card('dog'), ...s.obDeck]));
      setLine(room, [slot('camera'), slot('camera'), slot('camera'), slot('guard'), slot('camera'), slot('camera')]);
      room.act('p1', { type: 'endTurn' });
      // The last camera leaves; the dog comes in at the left and runs to the guard.
      expect(defs(pub(room).line)).toEqual(['camera', 'camera', 'camera', 'dog', 'guard', 'camera']);

      const room2 = playing();
      rig(room2, (s) => (s.obDeck = [card('radio'), ...s.obDeck]));
      setLine(room2, [slot('camera'), slot('guard'), slot('camera'), slot('guard'), slot('camera'), slot('camera')]);
      room2.act('p1', { type: 'endTurn' });
      expect(defs(pub(room2).line)).toEqual(['radio', 'guard', 'guard', 'camera', 'camera', 'camera']);
    });

    it('the alarm reaching 50 is game over', () => {
      const room = playing();
      rig(room, (s) => (s.alarm = 45));
      setLine(room, [slot('guard'), slot('guard'), slot('guard'), slot('guard'), slot('guard'), slot('camera')]);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room)).toMatchObject({ phase: 'over', outcome: { won: false, reason: 'alarm' }, alarm: 53 });
    });

    it('running out of obstacles is game over', () => {
      const room = playing();
      rig(room, (s) => {
        s.obDeck = [];
        s.obDiscard = [];
      });
      // Two cards were disarmed: the one leaving can be reshuffled, but that's still not enough.
      setLine(room, [null, null, slot('guard'), slot('guard'), slot('guard'), slot('guard')]);
      room.act('p1', { type: 'endTurn' });
      expect(pub(room)).toMatchObject({ phase: 'over', outcome: { reason: 'time' } });
    });
  });

  describe('missions', () => {
    it('completing a mission shuffles its obstacles in and resets the alarm and decks', () => {
      const room = playing();
      rig(room, (s) => {
        s.pool = { stealth: 7, fight: 0 };
        s.alarm = 12;
      });
      room.act('p1', { type: 'endTurn' });
      const s = room.state();
      const all = [...s.obDeck, ...s.obDiscard, ...s.line.filter((x) => x)].map((c) => c!.def);
      expect(all).toHaveLength(25);
      expect(all).toEqual(expect.arrayContaining(['siren', 'locker', 'inspector']));
      expect(pub(room)).toMatchObject({ alarm: 0, results: [12], score: 38, phase: 'mission' });
      expect(pub(room).hand.length + pub(room).deck).toBe(8);
      room.act('p1', { type: 'continue' });
      expect(pub(room).pool).toEqual({ stealth: 1, fight: 0 }); // the Map
    });

    it('the mission goal needs the item equipped', () => {
      const room = playing();
      rig(room, (s) => {
        s.mission = 1;
        s.pool = { stealth: 0, fight: 6 };
        s.hand = [card('locker')];
      });
      expect(pub(room).goalMet).toBe(false);
      room.act('p1', { type: 'equip', uid: room.state().hand[0]!.uid });
      expect(pub(room).goalMet).toBe(true);
    });
  });

  describe('robustness', () => {
    it('ignores invalid actions', () => {
      const room = playing();
      const before = room.snapshot();
      room.act('p1', null);
      room.act('p1', { type: 'nonsense' });
      room.act('p1', { type: 'play', uid: 'nope' });
      room.act('p1', { type: 'interact', slot: 9, mode: 'disarm' });
      room.act('p1', { type: 'interact', slot: 0, mode: 'explode' });
      room.act('p1', { type: 'interact', slot: 0, mode: 'adjacent', target: 1 }); // not a Clumsy Guard
      room.act('p1', { type: 'resolve', uids: [] }); // nothing pending
      room.act('p1', { type: 'undo' });
      room.act('p1', { type: 'continue' });
      room.act('p1', { type: 'finish' });
      room.act('p1', { type: 'intro', dir: 1 });
      room.act('p1', { type: 'tvRules', page: 99 });
      expect(room.snapshot()).toBe(before);
    });

    it("refuses an interaction the agent can't afford", () => {
      const room = playing();
      setLine(room, [null, null, null, null, null, slot('guard')]);
      const before = room.snapshot();
      room.act('p1', { type: 'interact', slot: 5, mode: 'disarm' });
      expect(room.snapshot()).toBe(before);
    });

    it('shows a rules page on the TV on request', () => {
      const room = playing();
      room.act('p1', { type: 'tvRules', page: 2 });
      expect(pub(room).tvRules).toBe(2);
      room.act('p1', { type: 'tvRules', page: null });
      expect(pub(room).tvRules).toBeNull();
    });

    it('a dropped agent pauses the game, then the match ends with the points so far', () => {
      const room = playing();
      rig(room, (s) => (s.pool = { stealth: 6, fight: 0 }));
      room.act('p1', { type: 'endTurn' });
      room.act('p1', { type: 'continue' });
      room.disconnect('p1');
      expect(room.publicPlatform().paused).toBeTruthy();
      room.advance(20_001);
      expect(room.phase()).toBe('results');
      expect(room.results()?.[0]).toEqual({ playerId: 'p1', score: 50 });
    });

    it('shows guided hints in the first turns when the tutorial is on', () => {
      const room = createTestRoom<State>(game, { seed: 2 });
      room.act('p1', { type: 'intro', dir: 'skip' });
      setLine(room, [null, null, null, null, null, slot('guard')]);
      rig(room, (s) => (s.hand = [card('punch'), card('punch')]));
      room.act('p1', { type: 'tvRules', page: null });
      expect(pub(room).hint).toBe('play');
      for (const c of room.state().hand.slice()) room.act('p1', { type: 'play', uid: c.uid });
      expect(pub(room).hint).toBe('interact');
      room.act('p1', { type: 'interact', slot: 5, mode: 'knock' });
      expect(pub(room).hint).toBe('end');
    });
  });
});
