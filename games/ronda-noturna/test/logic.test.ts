import { describe, expect, it } from 'vitest';
import { createTestRoom } from '@mp/engine/testing';
import game, { type BoardView, type DealerView, type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { TEAMS } from '../src/shared.ts';
import { HINTS, RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const view = (room: Room, id: string) => room.playerView(id) as PlayerView;
const st = (room: Room) => room.state() as State;
const cops = (s: State) => TEAMS.flatMap((t) => s.teams[t]);
const honest = (s: State) => cops(s).filter((id) => !s.corrupt.includes(id));

/** A room past the briefing (unless `brief` is false), on the 150-stop map. */
function newRoom(players = 10, config: Record<string, unknown> = {}, seed = 7, brief = false) {
  const room = createTestRoom<State>(game, { players, seed, config: { tutorial: false, map: 'm150', maxRounds: '10', ...config } });
  if (!brief) room.advance(60_000);
  return room;
}

/** Everyone places: cops on node 0, thieves on the first free node without a star. */
function placeAll(room: Room, where: (id: string, s: State) => number = () => 0) {
  while (st(room).phase === 'placing') {
    const s = st(room);
    const id = s.placeOrder[s.placeIdx]!;
    let node = where(id, s);
    if (s.thieves.includes(id) && s.stars.includes(node)) node = s.adj.findIndex((_, i) => !s.stars.includes(i));
    room.act(id, { type: 'place', node });
  }
}

/** Ends the intermission. */
const skipBreak = (room: Room) => room.advance(14_001);

/** Path of up to 2 steps toward the nearest star (BFS). */
function towardStar(s: State, from: number): number[] {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h]!;
    if (u !== from && s.stars.includes(u)) {
      const path: number[] = [];
      for (let v = u; v !== from; v = prev.get(v)!) path.unshift(v);
      return path.slice(0, 2);
    }
    for (const v of s.adj[u]!) if (!prev.has(v)) prev.set(v, u), queue.push(v);
  }
  return [];
}

/** Thieves' turn with every free thief moving `pathOf`; then every cop passes. */
function playRound(room: Room, pathOf: (id: string, s: State) => number[] = () => []) {
  skipBreak(room);
  while (st(room).phase === 'thieves') {
    const s = st(room);
    const id = s.thieves[s.thiefIdx]!;
    room.act(id, { type: 'move', path: pathOf(id, s) });
  }
  for (let g = 0; g < 3 && st(room).phase === 'intermission'; g++) {
    skipBreak(room);
    while (st(room).phase === 'cops') {
      const s = st(room);
      room.act(s.teams[s.groupSeq[s.groupIdx]!][s.memberIdx]!, { type: 'pass' });
    }
  }
}

describe(game.manifest.name['pt-BR'], () => {
  it.each([10, 14])('deals 2 thieves, 3 even police teams and 2 corrupt cops in different teams (%i players)', (n) => {
    const room = newRoom(n);
    const s = st(room);
    expect(s.thieves).toHaveLength(2);
    const sizes = TEAMS.map((t) => s.teams[t].length);
    expect(sizes.reduce((a, b) => a + b)).toBe(n - 2);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(s.corrupt).toHaveLength(2);
    const corruptTeams = s.corrupt.map((id) => TEAMS.find((t) => s.teams[t].includes(id)));
    expect(new Set(corruptTeams).size).toBe(2);
    expect(s.stars).toHaveLength(28);
    expect(new Set(s.stars).size).toBe(28);
    expect(s.adj).toHaveLength(150);
  });

  it.each([10, 14])('plays a full match to the vote and the results (%i players)', (n) => {
    const room = newRoom(n, { maxRounds: '10' });
    expect(pub(room).phase).toBe('placing');
    placeAll(room);
    for (let r = 1; r <= 10; r++) {
      expect(pub(room).round).toBe(r);
      playRound(room);
    }
    expect(pub(room).phase).toBe('vote');
    const s = st(room);
    for (const id of cops(s)) room.act(id, { type: 'vote', target: 'none' });
    expect(pub(room).phase).toBe('over');
    expect(pub(room).result).toMatchObject({ winner: 'thieves', reason: 'vote' });
    room.advance(16_000);
    expect(room.phase()).toBe('results');
  });

  it('places cops in team order, then thieves; thieves cannot start on a star', () => {
    const room = newRoom();
    const s = st(room);
    expect(s.placeOrder).toEqual([...s.teams.red, ...s.teams.blue, ...s.teams.green, ...s.thieves]);
    for (const id of cops(s)) {
      expect(pub(room).turn.actor).toBe(id);
      room.act(id, { type: 'place', node: 3 });
    }
    expect(pub(room).cops[cops(s)[0]!]).toBe(3);
    const thief = s.thieves[0]!;
    expect(view(room, thief).thief!.stars).toEqual(s.stars);
    const before = room.snapshot();
    room.act(thief, { type: 'place', node: s.stars[0]! });
    expect(room.snapshot()).toBe(before);
  });

  it('rotates the police team order every round', () => {
    const room = newRoom();
    placeAll(room);
    const seqs: string[][] = [];
    for (let r = 0; r < 4; r++) {
      seqs.push(st(room).groupSeq);
      playRound(room);
    }
    expect(seqs).toEqual([
      ['red', 'blue', 'green'],
      ['blue', 'green', 'red'],
      ['green', 'red', 'blue'],
      ['red', 'blue', 'green'],
    ]);
  });

  it('a thief walks up to 2 stops, collecting every star on the way', () => {
    const room = newRoom(10, { totalStars: 40 });
    placeAll(room);
    skipBreak(room);
    const s = st(room);
    const [a] = s.thieves;
    const from = s.pos[a!]!;
    const [n1] = s.adj[from]!;
    const n2 = s.adj[n1!]!.find((x) => x !== from)!;
    const stars = st(room).stars.filter((x) => x === n1 || x === n2).length;
    room.act(a!, { type: 'move', path: [n1, n2] });
    const after = st(room);
    expect(after.pos[a!]).toBe(n2);
    expect(after.held[a!]).toBe(stars);
    expect(after.trail[n1!] && after.trail[n2]).toBe(true);
    expect(pub(room).log.at(-1)).toEqual({ r: 1, k: 'thiefPlayed', who: a });
  });

  it('ignores invalid moves and actions out of turn', () => {
    const room = newRoom();
    placeAll(room);
    skipBreak(room);
    const s = st(room);
    const [a, b] = s.thieves;
    const from = s.pos[a!]!;
    const far = s.adj.findIndex((_, i) => i !== from && !s.adj[from]!.includes(i));
    const n1 = s.adj[from]![0]!;
    const before = room.snapshot();
    room.act(a!, { type: 'move', path: [far] }); // not adjacent
    room.act(a!, { type: 'move', path: [n1, s.adj[n1]![0], s.adj[s.adj[n1]![0]!]![0]] }); // 3 steps
    room.act(a!, { type: 'move', path: [1.5] });
    room.act(a!, { type: 'move', path: 'x' });
    room.act(b!, { type: 'move', path: [] }); // not their turn yet
    room.act(cops(s)[0]!, { type: 'act', kind: 'arrest', node: 0 }); // thieves' turn
    room.act(a!, { type: 'vote', target: 'none' });
    room.act(a!, { type: 'nonsense' });
    room.act(a!, null);
    expect(room.snapshot()).toBe(before);
  });

  /** Everyone starts on N (no star), next to a starred stop S; thief 1 grabs S, thief 2 stays on N. */
  function heist() {
    const room = newRoom(10, { totalStars: 40 });
    const s0 = st(room);
    const N = s0.adj.findIndex((nb, i) => !s0.stars.includes(i) && nb.some((j) => s0.stars.includes(j)));
    const S = s0.adj[N]!.find((j) => s0.stars.includes(j))!;
    placeAll(room, () => N);
    skipBreak(room);
    const [a, b] = s0.thieves as [string, string];
    room.act(a, { type: 'move', path: [S] });
    room.act(b, { type: 'move', path: [] });
    skipBreak(room); // round 1: red acts first
    return { room, s0, N, S, a, b };
  }

  /** Passes cops' turns until `id` is the one to act. */
  function passUntil(room: Room, id: string) {
    for (let i = 0; i < 60 && pub(room).turn.actor !== id; i++) {
      const actor = pub(room).turn.actor;
      if (actor && st(room).phase === 'cops') room.act(actor, { type: 'pass' });
      else room.advance(14_001);
    }
    expect(pub(room).turn.actor).toBe(id);
  }

  it('investigation results are private; the public only learns where and by whom', () => {
    const { room, s0, N, S } = heist();
    const cop = s0.teams.red.find((id) => !s0.corrupt.includes(id))!;
    passUntil(room, cop);
    const untouched = s0.adj[S]!.find((j) => j !== N && !st(room).trail[j]);
    room.act(cop, { type: 'act', kind: 'investigate', node: S });
    expect(view(room, cop).inv).toEqual([{ r: 1, node: S, hit: true }]);
    expect(pub(room).log.slice(-2)).toEqual([
      { r: 1, k: 'copMove', who: cop, from: N, to: S },
      { r: 1, k: 'investigate', who: cop, node: S },
    ]);
    if (untouched !== undefined) {
      room.act(cop, { type: 'act', kind: 'investigate', node: untouched });
      expect(view(room, cop).inv.at(-1)).toEqual({ r: 1, node: untouched, hit: false });
    }
    expect(room.publicJson()).not.toContain('"hit"');
    for (const other of cops(s0).filter((id) => id !== cop)) expect(view(room, other).inv).toEqual([]);
  });

  it('an honest arrest catches the thief, returns their stars to the city; catching both ends it', () => {
    const { room, s0, N, S, a, b } = heist();
    expect(st(room).held[a]).toBe(1);
    const cop = s0.teams.red.find((id) => !s0.corrupt.includes(id))!;
    passUntil(room, cop);
    const starsBefore = st(room).stars.length;
    room.act(cop, { type: 'act', kind: 'arrest', node: S });
    expect(st(room).arrested[a]).toBe(true);
    expect(st(room).held[a]).toBe(0);
    expect(st(room).stars.length).toBe(starsBefore + 1);
    expect(st(room).stars).not.toContain(N); // never under the free thief
    expect(pub(room).arrested).toEqual({ [a]: S });
    expect(pub(room).log.slice(-2)).toEqual([
      { r: 1, k: 'arrest', who: cop, node: S, caught: [a] },
      { r: 1, k: 'starsReturned', who: a, n: null },
    ]);
    expect(view(room, b).log.at(-1)).toEqual({ r: 1, k: 'starsReturned', who: a, n: 1 });
    room.act(cop, { type: 'act', kind: 'arrest', node: N });
    expect(pub(room).result).toMatchObject({ winner: 'cops', reason: 'arrests' });
    room.advance(16_000);
    const scores = Object.fromEntries(room.results()!.map((r) => [r.playerId, r.score]));
    for (const id of honest(s0)) expect(scores[id]).toBe(3);
    for (const id of [...s0.thieves, ...s0.corrupt]) expect(scores[id]).toBe(0);
  });

  it('a corrupt cop’s arrest always fails, even on the thief’s stop', () => {
    const { room, s0, N } = heist();
    const corrupt = s0.corrupt[0]!;
    passUntil(room, corrupt);
    room.act(corrupt, { type: 'act', kind: 'arrest', node: N });
    expect(pub(room).log.at(-1)).toEqual({ r: 1, k: 'arrest', who: corrupt, node: N, caught: [] });
    expect(Object.values(st(room).arrested)).toEqual([false, false]);
  });

  it('several thieves on one stop are all caught by one arrest', () => {
    const room = newRoom();
    const s0 = st(room);
    const N = s0.adj.findIndex((_, i) => !s0.stars.includes(i));
    placeAll(room, () => N);
    skipBreak(room);
    for (const id of s0.thieves) room.act(id, { type: 'move', path: [] });
    skipBreak(room);
    const cop = s0.teams.red.find((id) => !s0.corrupt.includes(id))!;
    passUntil(room, cop);
    room.act(cop, { type: 'act', kind: 'arrest', node: N });
    expect(pub(room).log.find((e) => e.k === 'arrest')).toMatchObject({ caught: s0.thieves });
    expect(pub(room).phase).toBe('over');
  });

  it('thieves win the moment they reach the star goal; thieves and corrupt cops score', () => {
    const room = newRoom(10, { totalStars: 40, starGoal: 5, maxRounds: '0' });
    placeAll(room);
    const s = st(room);
    for (let r = 0; r < 30 && st(room).phase !== 'over'; r++) playRound(room, (id, x) => towardStar(x, x.pos[id]!));
    expect(pub(room).result).toMatchObject({ winner: 'thieves', reason: 'stars' });
    expect(pub(room).result!.stars).toBeGreaterThanOrEqual(5);
    room.advance(16_000);
    const scores = Object.fromEntries(room.results()!.map((r) => [r.playerId, r.score]));
    for (const id of [...s.thieves, ...s.corrupt]) expect(scores[id]).toBe(3);
    for (const id of honest(s)) expect(scores[id]).toBe(0);
  });

  it('reveals the thieves’ star count every 5 rounds', () => {
    const room = newRoom(10, { totalStars: 40, maxRounds: '0', starGoal: 30 });
    placeAll(room);
    for (let r = 0; r < 5; r++) playRound(room, (id, x) => towardStar(x, x.pos[id]!));
    const n = st(room).thieves.reduce((acc, id) => acc + st(room).held[id]!, 0);
    expect(pub(room).reveals).toEqual([{ round: 5, n }]);
    expect(pub(room).banner).toEqual({ round: 5, n });
  });

  it('timers drive every turn when nobody acts', () => {
    const room = newRoom(10, { maxRounds: '10' });
    placeAll(room);
    expect(pub(room).phase).toBe('intermission');
    for (let i = 0; i < 400 && room.phase() !== 'results'; i++) room.advance(60_000);
    expect(room.phase()).toBe('results');
  });

  it('turns end early once everyone acted', () => {
    const room = newRoom();
    placeAll(room);
    skipBreak(room);
    for (const id of st(room).thieves) room.act(id, { type: 'move', path: [] });
    expect(pub(room)).toMatchObject({ phase: 'intermission', next: 'red' });
    skipBreak(room);
    const s = st(room);
    const [c1, c2] = s.teams.red;
    expect(pub(room).turn).toEqual({ side: 'red', actor: c1, actionsLeft: 2 });
    room.act(c1!, { type: 'act', kind: 'investigate', node: s.pos[c1!]! });
    room.act(c1!, { type: 'act', kind: 'investigate', node: s.adj[s.pos[c1!]!]![0]! });
    expect(pub(room).turn.actor).toBe(c2);
    expect(pub(room).cops[c1!]).toBe(s.adj[s.pos[c1!]!]![0]);
    for (const id of s.teams.red.slice(1)) room.act(id, { type: 'pass' });
    expect(pub(room)).toMatchObject({ phase: 'intermission', next: 'blue' });
  });

  it('a cop moves at most one stop per action', () => {
    const room = newRoom();
    placeAll(room);
    skipBreak(room);
    for (const id of st(room).thieves) room.act(id, { type: 'move', path: [] });
    skipBreak(room);
    const s = st(room);
    const c = s.teams.red[0]!;
    const far = s.adj.findIndex((_, i) => i !== s.pos[c] && !s.adj[s.pos[c]!]!.includes(i));
    const before = room.snapshot();
    room.act(c, { type: 'act', kind: 'investigate', node: far });
    room.act(c, { type: 'act', kind: 'dance', node: s.pos[c] });
    room.act(s.teams.red[1]!, { type: 'pass' });
    expect(room.snapshot()).toBe(before);
  });

  describe('final vote', () => {
    function toVote(seed = 7) {
      const room = newRoom(10, { maxRounds: '10' }, seed);
      placeAll(room);
      for (let r = 0; r < 10; r++) playRound(room);
      expect(pub(room).phase).toBe('vote');
      return room;
    }

    it('cops win when every team names its corrupt cop (or unanimously nobody)', () => {
      const room = toVote();
      const s = st(room);
      for (const t of TEAMS) {
        const corrupt = s.teams[t].find((id) => s.corrupt.includes(id));
        for (const id of s.teams[t]) {
          const target = corrupt && corrupt !== id ? corrupt : corrupt === id ? s.teams[t].find((o) => o !== id)! : 'none';
          room.act(id, { type: 'vote', target });
        }
      }
      expect(pub(room).result).toMatchObject({ winner: 'cops', reason: 'vote' });
      expect(pub(room).result!.verdicts!.every((v) => v.correct)).toBe(true);
    });

    it("'none' only counts when the whole team agrees; a tie counts as wrong", () => {
      const room = toVote();
      const s = st(room);
      const clean = TEAMS.find((t) => !s.teams[t].some((id) => s.corrupt.includes(id)))!;
      const [first, ...rest] = s.teams[clean];
      room.act(first!, { type: 'vote', target: rest[0]! });
      for (const id of rest) room.act(id, { type: 'vote', target: 'none' });
      for (const t of TEAMS.filter((x) => x !== clean)) {
        const corrupt = s.teams[t].find((id) => s.corrupt.includes(id))!;
        for (const id of s.teams[t]) room.act(id, { type: 'vote', target: id === corrupt ? 'none' : corrupt });
      }
      const verdicts = pub(room).result!.verdicts!;
      expect(verdicts.find((v) => v.team === clean)).toMatchObject({ decision: null, correct: false });
      expect(pub(room).result!.winner).toBe('thieves');
    });

    it("the corrupt cop's own vote is not counted (no forced tie in a two-cop team)", () => {
      // 10 players: 8 cops split 3/3/2. Find a seed whose corrupt cop sits in the two-cop team.
      const seed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((x) => {
        const s = st(newRoom(10, {}, x));
        return TEAMS.some((t) => s.teams[t].length === 2 && s.teams[t].some((id) => s.corrupt.includes(id)));
      })!;
      const room = toVote(seed);
      const s = st(room);
      for (const t of TEAMS) {
        const corrupt = s.teams[t].find((id) => s.corrupt.includes(id));
        for (const id of s.teams[t]) {
          // The corrupt cop tries to split the vote by naming an honest teammate.
          const target = !corrupt ? 'none' : id === corrupt ? s.teams[t].find((o) => o !== id)! : corrupt;
          room.act(id, { type: 'vote', target });
        }
      }
      expect(pub(room).result).toMatchObject({ winner: 'cops', reason: 'vote' });
    });

    it('refuses votes for yourself, for other teams, and from thieves', () => {
      const room = toVote();
      const s = st(room);
      const red = s.teams.red[0]!;
      const before = room.snapshot();
      room.act(red, { type: 'vote', target: red });
      room.act(red, { type: 'vote', target: s.teams.blue[0]! });
      room.act(red, { type: 'vote', target: 42 });
      room.act(s.thieves[0]!, { type: 'vote', target: 'none' });
      expect(room.snapshot()).toBe(before);
    });

    it('closes by timer: missing votes count as no decision', () => {
      const room = toVote();
      room.advance(180_000);
      expect(pub(room).result).toMatchObject({ winner: 'thieves', reason: 'vote' });
    });
  });

  describe('hidden information', () => {
    it('the TV never shows stars, thieves, corrupt cops, trails or investigation results', () => {
      const room = newRoom(10, { totalStars: 40 });
      placeAll(room);
      for (let r = 0; r < 3; r++) playRound(room, (id, x) => towardStar(x, x.pos[id]!));
      const json = room.publicJson();
      for (const key of ['"stars"', '"corrupt"', '"trail"', '"hit"', '"held"', 'thiefPath', 'thiefPlacedAt', '"star"']) {
        expect(json).not.toContain(key);
      }
      const p = pub(room);
      const s = st(room);
      for (const id of s.thieves) expect(Object.keys(p.cops)).not.toContain(id);
      expect(p.arrested).toEqual({});
    });

    it('honest cops see only public moves; corrupt cops also see the thieves’ paths but no stars', () => {
      const room = newRoom(10, { totalStars: 40 });
      placeAll(room);
      playRound(room, (id, x) => towardStar(x, x.pos[id]!));
      const s = st(room);
      const h = honest(s)[0]!;
      const c = s.corrupt[0]!;
      const hv = view(room, h);
      expect(hv.corrupt).toBe(false);
      expect(hv.corruptIds).toBeNull();
      expect(hv.thief).toBeNull();
      expect(hv.log.some((e) => e.k === 'thiefPath' || e.k === 'star' || e.k === 'thiefPlacedAt')).toBe(false);
      const cv = view(room, c);
      expect(cv.corrupt).toBe(true);
      expect([...cv.corruptIds!].sort()).toEqual([...s.corrupt].sort());
      expect(cv.log.some((e) => e.k === 'thiefPath')).toBe(true);
      expect(cv.log.some((e) => e.k === 'star' || e.k === 'thiefPlacedAt')).toBe(false);
      // Apart from the secret lines, a corrupt phone's log matches an honest one.
      expect(cv.log.filter((e) => e.k !== 'thiefPath')).toEqual(hv.log);
      expect(JSON.stringify(cv)).not.toContain('"stars"');
    });

    it('thieves see the stars on their phones only during their turn; the Dealer shows them always', () => {
      const room = newRoom();
      placeAll(room);
      const s = st(room);
      const [a] = s.thieves;
      expect(view(room, a!).thief!.stars).toBeNull(); // intermission
      skipBreak(room);
      expect(view(room, a!).thief!.stars).toEqual(st(room).stars);
      expect([...view(room, a!).corruptIds!].sort()).toEqual([...s.corrupt].sort());
      for (const id of st(room).thieves) room.act(id, { type: 'move', path: [] });
      expect(view(room, a!).thief!.stars).toBeNull();
      const d = room.dealerView() as BoardView;
      expect(d.kind).toBe('board');
      expect(d.stars).toEqual(st(room).stars);
      expect(d.thieves.map((t) => t.pos)).toEqual(s.thieves.map((id) => st(room).pos[id]));
      expect([...d.corruptIds].sort()).toEqual([...s.corrupt].sort());
    });

    it('after the briefing nobody can queue for the Dealer', () => {
      const room = newRoom();
      for (const id of room.ids) expect(room.playerFrame(id)!.platform.canRequestDealer).toBe(false);
    });

    it('reveals corrupt cops and thieves at the end', () => {
      const room = newRoom(10, { maxRounds: '10' });
      placeAll(room);
      for (let r = 0; r < 10; r++) playRound(room);
      room.advance(180_000);
      const s = st(room);
      expect(pub(room).result!.corrupt).toEqual(s.corrupt);
      expect(Object.keys(pub(room).result!.thievesPos)).toEqual(s.thieves);
    });
  });

  describe('briefing', () => {
    it('opens the match: each phone gets its own role card, the TV only the public teams', () => {
      const room = newRoom(10, {}, 7, true);
      expect(pub(room).phase).toBe('briefing');
      expect(pub(room).briefing).toEqual({ mode: 'phone', ready: [] });
      expect(pub(room).deadline).not.toBeNull();
      expect(room.publicJson()).not.toContain('"corrupt"');
      const s = st(room);
      const h = honest(s)[0]!;
      const hTeam = TEAMS.find((t) => s.teams[t].includes(h))!;
      expect(view(room, h).role).toEqual({
        side: hTeam,
        order: s.teams[hTeam].indexOf(h) + 1,
        corrupt: false,
        corruptIds: null,
        partner: null,
        teammates: s.teams[hTeam].filter((id) => id !== h),
        goal: 15,
      });
      const c = s.corrupt[0]!;
      expect(view(room, c).role).toMatchObject({ corrupt: true, corruptIds: s.corrupt });
      const [a, b] = s.thieves;
      expect(view(room, a!).role).toMatchObject({ side: 'thieves', order: 1, partner: b, corruptIds: s.corrupt });
      // Nothing of the thieves' board on the Dealer while anyone may walk in.
      expect(room.dealerView()).toBeNull();
    });

    it('phone mode: ends as soon as everyone taps ready; repeats and stray taps are ignored', () => {
      const room = newRoom(10, {}, 7, true);
      const [first, ...rest] = room.ids;
      room.act(first!, { type: 'ready' });
      const before = room.snapshot();
      room.act(first!, { type: 'ready' });
      room.act(first!, { type: 'place', node: 0 });
      expect(room.snapshot()).toBe(before);
      expect(view(room, first!).briefing).toEqual({ mode: 'phone', ready: true });
      for (const id of rest) room.act(id, { type: 'ready' });
      expect(pub(room).phase).toBe('placing');
      expect(pub(room).briefing).toBeNull();
    });

    it('ends by timer when someone never taps ready', () => {
      const room = newRoom(10, { briefingSeconds: 30 }, 7, true);
      room.act(room.ids[0]!, { type: 'ready' });
      room.advance(29_999);
      expect(pub(room).phase).toBe('briefing');
      room.advance(1);
      expect(pub(room).phase).toBe('placing');
    });

    it('a player who drops is not waited for', () => {
      const room = newRoom(10, {}, 7, true);
      const [gone, ...rest] = room.ids;
      for (const id of rest) room.act(id, { type: 'ready' });
      room.disconnect(gone!);
      room.advance(20_001);
      expect(pub(room).phase).toBe('placing');
    });

    it('dealer mode: everyone visits once, sees exactly their card, and then the Dealer closes', () => {
      const room = newRoom(10, { briefing: 'dealer' }, 7, true);
      const s = st(room);
      expect(pub(room).briefing).toEqual({ mode: 'dealer', ready: [] });
      for (const id of room.ids) expect(room.playerFrame(id)!.platform.canRequestDealer).toBe(true);
      const before = room.snapshot();
      room.act(room.ids[0]!, { type: 'ready' }); // phone "ready" is not how dealer mode works
      expect(room.snapshot()).toBe(before);
      const c = s.corrupt[0]!;
      const seen = room.visitDealer(c) as DealerView;
      expect(seen).toEqual({ kind: 'role', card: view(room, c).role });
      expect(room.playerFrame(c)!.platform.canRequestDealer).toBe(false);
      for (const id of room.ids.filter((x) => x !== c)) {
        expect(pub(room).phase).toBe('briefing');
        room.visitDealer(id);
      }
      expect(pub(room).phase).toBe('placing');
      for (const id of room.ids) expect(room.playerFrame(id)!.platform.canRequestDealer).toBe(false);
      expect((room.dealerView() as BoardView).kind).toBe('board');
    });

    it('dealer mode allows ~40 s per player before moving on', () => {
      const room = newRoom(10, { briefing: 'dealer', briefingSeconds: 60 }, 7, true);
      expect(pub(room).total).toBe(400_000);
      room.advance(400_000);
      expect(pub(room).phase).toBe('placing');
    });
  });

  describe('tutorial and rules', () => {
    const withTutorial = (config: Record<string, unknown> = {}) =>
      createTestRoom<State>(game, { players: 10, seed: 7, config: { map: 'm150', ...config } });

    it('opens with the tutorial, which only the Host advances, then the role briefing', () => {
      const room = withTutorial();
      expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length, tvRules: null });
      expect(room.dealerView()).toBeNull();
      expect(room.publicJson()).not.toContain('"corrupt"');
      room.act('p2', { type: 'intro', dir: 1 });
      expect(pub(room).slide).toBe(0);
      room.act('p1', { type: 'intro', dir: 1 });
      room.act('p1', { type: 'intro', dir: -1 });
      expect(pub(room).slide).toBe(0);
      for (let i = 0; i < SLIDES.length - 1; i++) room.act('p1', { type: 'intro', dir: 1 });
      expect(pub(room)).toMatchObject({ phase: 'intro', slide: SLIDES.length - 1 });
      room.act('p1', { type: 'intro', dir: 1 });
      expect(pub(room).phase).toBe('briefing');
    });

    it('lets the Host skip the tutorial', () => {
      const room = withTutorial();
      room.act('p1', { type: 'intro', dir: 'skip' });
      expect(pub(room).phase).toBe('briefing');
    });

    it('moves on without the Host if they leave, or after 5 minutes', () => {
      const left = withTutorial();
      left.disconnect('p1');
      left.advance(20_001);
      expect(pub(left).phase).toBe('briefing');
      const idle = withTutorial();
      idle.advance(5 * 60_000);
      expect(pub(idle).phase).toBe('briefing');
    });

    it('starts at the role briefing when the tutorial is off', () => {
      const room = withTutorial({ tutorial: false });
      expect(pub(room).phase).toBe('briefing');
      expect(pub(room).hint).toBeNull();
    });

    it('shows a rules page on the TV only when the Host asks, only real pages, in any phase', () => {
      const room = newRoom();
      placeAll(room);
      skipBreak(room);
      const before = room.snapshot();
      room.act('p2', { type: 'tvRules', page: 0 });
      room.act('p1', { type: 'tvRules', page: RULES.length });
      room.act('p1', { type: 'tvRules', page: -1 });
      room.act('p1', { type: 'tvRules', page: 1.5 });
      expect(room.snapshot()).toBe(before);
      room.act('p1', { type: 'tvRules', page: 3 });
      expect(pub(room).tvRules).toBe(3);
      expect(view(room, 'p5').tvRules).toBe(3);
      room.act('p1', { type: 'tvRules', page: null });
      expect(pub(room).tvRules).toBeNull();
    });

    it('gives first-round hints only while the tutorial option is on', () => {
      const room = withTutorial();
      room.act('p1', { type: 'intro', dir: 'skip' });
      expect(pub(room).hint).toBeNull(); // briefing
      for (const id of room.ids) room.act(id, { type: 'ready' });
      expect(pub(room).hint).toBe('placing');
      placeAll(room);
      expect(pub(room).hint).toBe('intermission');
      skipBreak(room);
      expect(pub(room).hint).toBe('thieves');
      for (const id of st(room).thieves) room.act(id, { type: 'move', path: [] });
      skipBreak(room);
      expect(pub(room).hint).toBe('cops');
      // Every cop passes until round 2 begins.
      for (let i = 0; i < 40 && pub(room).round < 2; i++) {
        const s = st(room);
        if (s.phase === 'cops') room.act(s.teams[s.groupSeq[s.groupIdx]!][s.memberIdx]!, { type: 'pass' });
        else skipBreak(room);
      }
      expect(pub(room).round).toBe(2);
      expect(pub(room).hint).toBeNull();
    });

    it('has the tutorial, every rules page and every hint in both languages', () => {
      const texts = [...SLIDES, ...RULES].flatMap((p) => [p.title, ...p.body]).concat(Object.values(HINTS));
      for (const text of texts) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
      expect(SLIDES.length).toBeGreaterThanOrEqual(3);
      expect(SLIDES.length).toBeLessThanOrEqual(6);
    });
  });

  describe('disconnects', () => {
    it('a cop who drops on their turn loses it', () => {
      const room = newRoom();
      placeAll(room);
      skipBreak(room);
      for (const id of st(room).thieves) room.act(id, { type: 'move', path: [] });
      skipBreak(room);
      const [c1, c2] = st(room).teams.red;
      room.disconnect(c1!);
      expect(room.publicPlatform().paused).toBeTruthy();
      room.advance(20_001);
      expect(pub(room).turn.actor).toBe(c2);
      expect(pub(room).log.at(-1)).toEqual({ r: 1, k: 'timeout', who: c1 });
    });

    it('a placer who drops is placed at random; a thief who drops stays put', () => {
      const room = newRoom();
      const s = st(room);
      const first = s.placeOrder[0]!;
      room.disconnect(first);
      room.advance(20_001);
      expect(st(room).pos[first]).not.toBeNull();
      expect(pub(room).turn.actor).toBe(s.placeOrder[1]);
      placeAll(room);
      skipBreak(room);
      const [a, b] = st(room).thieves;
      const at = st(room).pos[a!];
      room.disconnect(a!);
      room.advance(20_001);
      expect(st(room).pos[a!]).toBe(at);
      expect(pub(room).turn.actor).toBe(b);
    });
  });
});
