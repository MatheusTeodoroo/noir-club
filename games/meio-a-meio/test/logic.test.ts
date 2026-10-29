import { describe, expect, it } from 'vitest';
import { createTestRoom, type TestRoomOptions } from '@mp/engine/testing';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import { PROMPTS } from '../src/prompts.ts';
import { ANSWER_MAX, QUESTION_MAX, splitPoints } from '../src/shared.ts';
import { RULES, SLIDES } from '../src/texts.ts';

type Room = ReturnType<typeof createTestRoom<State>>;

const pub = (room: Room) => room.publicView() as PublicView;
const phone = (room: Room, id: string) => room.playerView(id) as PlayerView;

/** A room already past the tutorial (the gameplay tests start at round 1). */
const playing = (opts: TestRoomOptions = {}) =>
  createTestRoom<State>(game, { players: 5, ...opts, config: { tutorial: false, ...opts.config } });

const author = (room: Room) => pub(room).authorId;
const voters = (room: Room) => room.ids.filter((id) => id !== author(room));

const QUESTION = { type: 'submit', question: 'Praia ou montanha?', a: 'Praia', b: 'Montanha' };

/** The Author submits, then the voters split `aCount` on A and the rest on B. */
function playRound(room: Room, aCount: number) {
  room.act(author(room), QUESTION);
  voters(room).forEach((id, i) => room.act(id, { type: 'vote', side: i < aCount ? 'a' : 'b' }));
}

describe('scoring formula', () => {
  it('is 100 × minority ÷ majority, rounded, and 0 when nobody voted', () => {
    expect(splitPoints(4, 4)).toBe(100);
    expect(splitPoints(4, 3)).toBe(75);
    expect(splitPoints(1, 6)).toBe(17);
    expect(splitPoints(5, 2)).toBe(40);
    expect(splitPoints(7, 0)).toBe(0);
    expect(splitPoints(0, 0)).toBe(0);
  });
});

describe(game.manifest.name['pt-BR'], () => {
  it('plays a full match at the minimum: every player is the Author once', () => {
    const room = playing({ players: 5 });
    const authors: string[] = [];
    for (let turn = 1; turn <= 5; turn++) {
      expect(pub(room)).toMatchObject({ phase: 'writing', turn, turns: 5 });
      authors.push(author(room));
      playRound(room, 2); // 4 voters → 2 × 2
      expect(pub(room)).toMatchObject({ phase: 'reveal', result: { points: 100 } });
      room.advance(10_000);
    }
    expect(new Set(authors).size).toBe(5);
    expect(room.phase()).toBe('results');
    expect(room.results()?.every((r) => r.score === 100)).toBe(true);
  });

  it('plays a full match at the maximum', () => {
    const room = playing({ players: 16 });
    for (let turn = 1; turn <= 16; turn++) {
      expect(pub(room).turn).toBe(turn);
      playRound(room, 8); // 15 voters → 8 × 7
      expect(pub(room).result?.points).toBe(88);
      room.advance(10_000);
    }
    expect(room.phase()).toBe('results');
  });

  it('scores only the Author, by how even the split was', () => {
    const room = playing({ players: 8 });
    const first = author(room);
    playRound(room, 4); // 7 voters → 4 × 3
    expect(pub(room).result).toMatchObject({ points: 75 });
    expect(pub(room).result?.a).toHaveLength(4);
    expect(pub(room).result?.b).toHaveLength(3);
    expect(pub(room).scores).toEqual(Object.fromEntries(room.ids.map((id) => [id, id === first ? 75 : 0])));
  });

  it('ties at the top share the win', () => {
    const room = playing({ players: 5 });
    for (let turn = 1; turn <= 5; turn++) {
      playRound(room, turn <= 2 ? 2 : 4); // two perfect splits, three 4 × 0
      room.advance(10_000);
    }
    const results = room.results()!;
    expect(results.filter((r) => r.score === 100)).toHaveLength(2);
    expect(results.filter((r) => r.score === 0)).toHaveLength(3);
  });

  it('keeps votes and the tally secret until the reveal, and shows names after', () => {
    const room = playing({ players: 5 });
    room.act(author(room), QUESTION);
    const [v1, v2] = voters(room);
    room.act(v1!, { type: 'vote', side: 'a' });
    room.act(v2!, { type: 'vote', side: 'b' });
    expect(pub(room).voted).toEqual([v1, v2]);
    expect(pub(room).result).toBeNull();
    expect(room.publicJson()).not.toContain('"votes"');
    expect(room.publicJson()).not.toMatch(/"side"|"myVote"/);
    expect(phone(room, v1!).myVote).toBe('a');
    expect(phone(room, v2!).myVote).toBe('b');
    for (const id of room.ids.filter((id) => id !== v1 && id !== v2)) expect(phone(room, id).myVote).toBeNull();
    expect(phone(room, v1!).result).toBeNull();
    room.advance(25_000);
    expect(pub(room).result).toMatchObject({ a: [v1], b: [v2], points: 100 });
  });

  it('keeps the question and suggestions on the Author’s phone until it is sent', () => {
    const room = playing({ players: 5 });
    const a = author(room);
    room.act(a, { type: 'suggest' });
    const s = phone(room, a).suggestion!;
    expect(s).not.toBeNull();
    expect(phone(room, a).suggestions).toBe(1);
    expect(room.publicJson()).not.toContain(s.q['pt-BR']);
    for (const id of voters(room)) {
      expect(phone(room, id).suggestion).toBeNull();
      expect(JSON.stringify(room.playerFrame(id))).not.toContain(s.q['pt-BR']);
    }
    expect(pub(room).prompt).toBeNull();
    room.act(a, QUESTION);
    expect(pub(room).prompt?.q['pt-BR']).toBe('Praia ou montanha?');
    expect(phone(room, a).suggestion).toBeNull();
  });

  it('keeps both languages when a suggestion is sent unedited', () => {
    const room = playing({ players: 5 });
    const a = author(room);
    room.act(a, { type: 'suggest' });
    const s = phone(room, a).suggestion!;
    room.act(a, { type: 'submit', question: s.q.en, a: s.a.en, b: s.b.en });
    expect(pub(room).prompt).toEqual(s);
  });

  it('never suggests the same prompt twice in a match', () => {
    const room = playing({ players: 5 });
    const a = author(room);
    const seen = new Set<string>();
    for (let i = 0; i < PROMPTS.length; i++) {
      room.act(a, { type: 'suggest' });
      seen.add(phone(room, a).suggestion!.q.en);
    }
    expect(seen.size).toBe(PROMPTS.length);
    room.act(a, { type: 'suggest' }); // the bank reshuffles instead of running dry
    expect(phone(room, a).suggestion).not.toBeNull();
  });

  it('lets a voter switch sides until voting closes', () => {
    const room = playing({ players: 5 });
    room.act(author(room), QUESTION);
    const v = voters(room)[0]!;
    room.act(v, { type: 'vote', side: 'a' });
    room.act(v, { type: 'vote', side: 'b' });
    expect(phone(room, v).myVote).toBe('b');
    room.advance(25_000);
    expect(pub(room).result).toMatchObject({ a: [], b: [v], points: 0 });
  });

  it('runs on timers alone: the house fills in the question and nobody scores', () => {
    const room = playing({ players: 5 });
    for (let turn = 1; turn <= 5; turn++) {
      expect(pub(room).phase).toBe('writing');
      room.advance(75_000);
      expect(pub(room)).toMatchObject({ phase: 'voting', auto: true });
      expect(PROMPTS).toContainEqual(pub(room).prompt);
      room.advance(25_000);
      expect(pub(room).result).toEqual({ a: [], b: [], points: 0 });
      room.advance(10_000);
    }
    expect(room.phase()).toBe('results');
  });

  it('plays the Author’s last suggestion when their time runs out', () => {
    const room = playing({ players: 5 });
    room.act(author(room), { type: 'suggest' });
    const s = phone(room, author(room)).suggestion;
    room.advance(75_000);
    expect(pub(room).prompt).toEqual(s);
  });

  it('ends writing and voting early when everyone has acted', () => {
    const room = playing({ players: 5 });
    room.act(author(room), QUESTION);
    expect(pub(room).phase).toBe('voting');
    for (const id of voters(room)) room.act(id, { type: 'vote', side: 'a' });
    expect(pub(room).phase).toBe('reveal');
  });

  it('leaves abstentions out of the count', () => {
    const room = playing({ players: 7 });
    room.act(author(room), QUESTION);
    const v = voters(room);
    v.slice(0, 2).forEach((id) => room.act(id, { type: 'vote', side: 'a' }));
    v.slice(2, 4).forEach((id) => room.act(id, { type: 'vote', side: 'b' }));
    room.advance(25_000); // two voters never voted
    expect(pub(room).result?.points).toBe(100);
  });

  it('ignores invalid actions', () => {
    const room = playing({ players: 5 });
    const a = author(room);
    const v = voters(room)[0]!;
    const before = room.snapshot();
    room.act(v, QUESTION); // not the Author
    room.act(v, { type: 'suggest' });
    room.act(v, { type: 'vote', side: 'a' }); // wrong phase
    room.act(a, { ...QUESTION, b: ' praia ' }); // same answers
    room.act(a, { ...QUESTION, question: '   ' });
    room.act(a, { ...QUESTION, question: 'x'.repeat(QUESTION_MAX + 1) });
    room.act(a, { ...QUESTION, a: 'x'.repeat(ANSWER_MAX + 1) });
    room.act(a, { ...QUESTION, a: 42 });
    room.act(a, { type: 'nonsense' });
    room.act(a, null);
    room.act(v, { type: 'intro', dir: 1 });
    expect(room.snapshot()).toBe(before);

    room.act(a, QUESTION);
    const voting = room.snapshot();
    room.act(a, { type: 'vote', side: 'a' }); // the Author doesn't vote
    room.act(v, { type: 'vote', side: 'c' });
    room.act(v, { type: 'vote' });
    room.act(a, QUESTION); // a second question
    room.act(a, { type: 'suggest' });
    expect(room.snapshot()).toBe(voting);
  });

  it('gives a dropped Author a question from the house', () => {
    const room = playing({ players: 5 });
    const a = author(room);
    room.disconnect(a);
    expect(room.publicPlatform().paused).toBeTruthy();
    room.advance(20_001);
    expect(pub(room)).toMatchObject({ phase: 'voting', auto: true, authorId: a });
    for (const id of voters(room)) room.act(id, { type: 'vote', side: 'a' });
    expect(pub(room).phase).toBe('reveal');
  });

  it('skips straight to voting when a gone player’s turn comes', () => {
    const room = playing({ players: 5 });
    const later = (room.state() as State).order[1]!;
    room.act(author(room), QUESTION);
    room.disconnect(later);
    room.advance(20_001);
    for (const id of voters(room)) room.act(id, { type: 'vote', side: 'a' });
    room.advance(10_000);
    expect(pub(room)).toMatchObject({ phase: 'voting', auto: true, authorId: later });
  });

  it('does not wait for a voter who dropped, and keeps their vote', () => {
    const room = playing({ players: 5 });
    room.act(author(room), QUESTION);
    const [v1, v2, v3, v4] = voters(room);
    room.act(v1!, { type: 'vote', side: 'a' });
    room.act(v2!, { type: 'vote', side: 'b' });
    room.act(v3!, { type: 'vote', side: 'b' });
    room.act(v4!, { type: 'vote', side: 'a' });
    expect(pub(room).phase).toBe('reveal');

    room.advance(10_000);
    room.act(author(room), QUESTION);
    const [w1, w2, w3, w4] = voters(room);
    room.act(w1!, { type: 'vote', side: 'a' });
    room.act(w2!, { type: 'vote', side: 'b' });
    room.act(w3!, { type: 'vote', side: 'a' });
    room.disconnect(w3!);
    room.disconnect(w4!);
    room.advance(20_001);
    expect(pub(room).phase).toBe('reveal');
    expect(pub(room).result).toMatchObject({ a: expect.arrayContaining([w1, w3]), b: [w2], points: 50 });
  });
});

describe('tutorial and rules', () => {
  it('opens with the tutorial, which only the Host advances', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    expect(pub(room)).toMatchObject({ phase: 'intro', slide: 0, slides: SLIDES.length });
    room.act('p2', { type: 'intro', dir: 1 });
    expect(pub(room).slide).toBe(0);
    for (let i = 0; i < SLIDES.length; i++) room.act('p1', { type: 'intro', dir: 1 });
    expect(pub(room)).toMatchObject({ phase: 'writing', turn: 1 });
  });

  it('lets the Host skip the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p1', { type: 'intro', dir: 'skip' });
    expect(pub(room).phase).toBe('writing');
  });

  it('starts without the Host if they leave during the tutorial', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.disconnect('p1');
    room.advance(20_001);
    expect(pub(room).phase).not.toBe('intro');
  });

  it('shows a rules page on the TV only when the Host asks, and only real pages', () => {
    const room = createTestRoom<State>(game, { players: 5 });
    room.act('p2', { type: 'tvRules', page: 0 });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: RULES.length });
    expect(pub(room).tvRules).toBeNull();
    room.act('p1', { type: 'tvRules', page: 1 });
    expect(pub(room).tvRules).toBe(1);
    room.act('p1', { type: 'tvRules', page: null });
    expect(pub(room).tvRules).toBeNull();
  });

  it('has the tutorial, every rules page and every prompt in both languages, within the limits', () => {
    for (const page of [...SLIDES, ...RULES]) {
      for (const text of [page.title, ...page.body]) {
        expect(text['pt-BR'].trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
    for (const p of PROMPTS) {
      for (const lang of ['pt-BR', 'en'] as const) {
        expect(p.q[lang].length).toBeLessThanOrEqual(QUESTION_MAX);
        expect(p.a[lang].length).toBeLessThanOrEqual(ANSWER_MAX);
        expect(p.b[lang].length).toBeLessThanOrEqual(ANSWER_MAX);
        expect(p.a[lang]).not.toBe(p.b[lang]);
      }
    }
  });
});
