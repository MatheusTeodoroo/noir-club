import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import {
  BEAT_MS, BOOL_KEYS, CLASS_IDS, DEFAULT_SETUP, FAST, PLAYERS, SETUP_LIMITS, VOTE_RESULT_MS, pointsFor,
  type NumKey, type Setup,
} from './shared.ts';
import { sortGroups, tally, type VoteGroup } from './vote.ts';
import {
  answer, beginTurn, newRace, nextTurn, playTurn, pump, randomTurn, runner, standings, turnOptions, validAnswer,
  validTurn, type LogEntry, type Prompt, type PromptKind, type Race, type TurnChoice, type TurnOptions,
} from './race.ts';
import { RULES, SLIDES, type Hint } from './texts.ts';

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
}
type Ctx = GameCtx<Config>;

export type Phase =
  | 'intro' // tutorial slides on the TV, advanced by the Host
  | 'setup' // Host sets timers and the board, everyone reads the guide
  | 'read' // timed reading of rules and classes
  | 'vote' // inverted vote for the picking order (one group at a time)
  | 'voteResult' // tally of the last vote
  | 'pick' // one player at a time picks a class
  | 'strategy' // timed talk; Swift secretly picks backward cards
  | 'fast' // Swift picks backward cards (strategy off)
  | 'race'
  | 'pause' // break every N rounds
  | 'final'; // the finished board before the results

const FINAL_MS = 8000;

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  setup: Setup;
  ready: string[];
  groups: VoteGroup[];
  group: VoteGroup | null;
  /** SECRET: voter → candidate. Only totals ever leave the engine. */
  ballots: Record<string, string>;
  voteNo: number;
  /** Picking slot (index 0 picks first) → player. */
  order: (string | null)[];
  lastTally: null | { cands: string[]; counts: Record<string, number>; placed: Record<number, string> };
  pickAt: number;
  /** class → player id */
  owner: Record<string, string>;
  /** SECRET (Swift only). */
  fastBack: number[] | null;
  race: Race | null;
  /** Tutorial slide shown on the TV. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface RowView {
  cls: number;
  pid: string;
  pos: number;
  out: boolean;
  discard: number[];
  handCount: number;
  removedCount: number;
  silenced: boolean;
  place: number | null;
}

export interface RaceView {
  cols: number;
  round: number;
  turn: number;
  awaitingTurn: boolean;
  rows: RowView[];
  /** Classes in current race order. */
  standings: number[];
  log: LogEntry[];
  /** Who is deciding a reaction right now (never the options). */
  deciding: null | { cls: number; kind: PromptKind; target?: number };
  /** Rounds left before the next break (counting the current one); null when breaks are off. */
  roundsToPause: number | null;
}

export interface PublicView {
  phase: Phase;
  deadline: number | null;
  total: number | null;
  setup: Setup;
  host: string;
  ready: string[];
  vote: null | {
    no: number;
    cands: string[];
    lo: number;
    hi: number;
    voted: string[];
    order: (string | null)[];
    result: State['lastTally'];
  };
  pick: null | { order: (string | null)[]; chooser: string | null };
  owner: Record<string, string>;
  fastChosen: boolean;
  race: RaceView | null;
  slide: number;
  slides: number;
  tvRules: number | null;
  /** First round with the tutorial on: a one-line tip for the TV. */
  hint: Hint | null;
}

export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  isHost: boolean;
  setup: Setup;
  ready: boolean;
  myClass: number | null;
  /** class → player id (public after picking). */
  owner: Record<string, string>;
  vote: null | { cands: string[]; myVote: string | null };
  pick: null | { myTurn: boolean; free: number[]; chooser: string | null };
  /** Swift only: backward cards once chosen. */
  fastBack: number[] | null;
  mustChooseFast: boolean;
  race: null | {
    hand: number[];
    discard: number[];
    removed: number[];
    turn: TurnOptions | null;
    prompt: Prompt | null;
    out: boolean;
    place: number | null;
    silenced: boolean;
    /** Class whose turn it is, and who is deciding a reaction (public facts). */
    turnCls: number;
    deciding: number | null;
  };
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null }
  | { type: 'setup'; patch: Partial<Setup> }
  | { type: 'start' }
  | { type: 'ready' }
  | { type: 'vote'; target: string }
  | { type: 'pick'; cls: number }
  | { type: 'fastBack'; cards: number[] }
  | ({ type: 'turn' } & TurnChoice)
  | { type: 'answer'; value: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The Host: p1 while connected, else the first connected participant. */
function hostId(ctx: Ctx): string {
  return (ctx.players.find((p) => p.id === 'p1' && p.connected) ?? ctx.players.find((p) => p.connected) ?? ctx.players[0])?.id ?? 'p1';
}

const connected = (ctx: Ctx) => ctx.players.filter((p) => p.connected).map((p) => p.id);
const isConnected = (ctx: Ctx, id: string | undefined) => !!id && !!ctx.players.find((p) => p.id === id)?.connected;
const sec = (n: number) => n * 1000;

function classOf(s: State, pid: string): number | null {
  const e = Object.entries(s.owner).find(([, p]) => p === pid);
  return e ? Number(e[0]) : null;
}

function patchSetup(cur: Setup, patch: unknown): Setup | null {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return null;
  const out: Setup = { ...cur };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (k in SETUP_LIMITS) {
      if (typeof v !== 'number' || !Number.isFinite(v)) return null;
      const lim = SETUP_LIMITS[k as NumKey];
      out[k as NumKey] = Math.min(lim.max, Math.max(lim.min, Math.round(v / lim.step) * lim.step));
    } else if ((BOOL_KEYS as string[]).includes(k)) {
      if (typeof v !== 'boolean') return null;
      out[k as (typeof BOOL_KEYS)[number]] = v;
    } else return null;
  }
  return out;
}

function setPhase(s: State, ctx: Ctx, phase: Phase, ms: number | null) {
  s.phase = phase;
  s.ready = [];
  ctx.clearTimer('phase');
  if (ms !== null) ctx.setTimer('phase', ms);
  ctx.emit('sound', 'phase');
}

const allReady = (s: State, ctx: Ctx) => connected(ctx).every((id) => s.ready.includes(id));

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

function startRead(s: State, ctx: Ctx) {
  if (s.setup.readOn) setPhase(s, ctx, 'read', sec(s.setup.readSec));
  else startVote(s, ctx);
}

function startVote(s: State, ctx: Ctx) {
  s.order = Array(PLAYERS).fill(null);
  s.groups = [{ cands: ctx.players.map((p) => p.id), lo: 1, hi: PLAYERS }];
  s.voteNo = 0;
  nextVote(s, ctx);
}

function nextVote(s: State, ctx: Ctx) {
  s.groups = sortGroups(s.groups);
  s.group = s.groups.shift() ?? null;
  s.ballots = {};
  s.voteNo += 1;
  s.lastTally = null;
  setPhase(s, ctx, 'vote', sec(s.setup.voteSec));
}

function closeVote(s: State, ctx: Ctx) {
  const g = s.group!;
  const r = tally(g, s.ballots);
  for (const [slot, pid] of Object.entries(r.placed)) s.order[Number(slot) - 1] = pid;
  s.groups.push(...r.groups);
  s.lastTally = { cands: g.cands, counts: r.counts, placed: r.placed };
  s.ballots = {};
  setPhase(s, ctx, 'voteResult', VOTE_RESULT_MS);
  ctx.emit('sound', 'reveal');
}

function startPick(s: State, ctx: Ctx) {
  s.group = null;
  s.pickAt = 0;
  setPhase(s, ctx, 'pick', sec(s.setup.pickSec));
}

const freeClasses = (s: State) => CLASS_IDS.filter((c) => !(c in s.owner));

function pickClass(s: State, ctx: Ctx, cls: number) {
  s.owner[cls] = s.order[s.pickAt]!;
  s.pickAt += 1;
  ctx.emit('sound', 'tick');
  if (s.pickAt === PLAYERS - 1) {
    s.owner[freeClasses(s)[0]!] = s.order[s.pickAt]!;
    s.pickAt = PLAYERS;
    afterPick(s, ctx);
  } else {
    setPhase(s, ctx, 'pick', sec(s.setup.pickSec));
  }
}

const randomFast = (ctx: Ctx) => ctx.rng.shuffle([1, 2, 3, 4]).slice(0, 2).sort();

function afterPick(s: State, ctx: Ctx) {
  if (s.setup.stratOn) setPhase(s, ctx, 'strategy', sec(s.setup.stratSec));
  else if (!isConnected(ctx, s.owner[FAST])) startRace(s, ctx);
  else setPhase(s, ctx, 'fast', sec(s.setup.pickSec));
}

function startRace(s: State, ctx: Ctx) {
  s.fastBack ??= randomFast(ctx);
  s.race = newRace(s.setup.columns, s.fastBack);
  beginTurn(s.race);
  setPhase(s, ctx, 'race', null);
  ctx.emit('sound', 'round');
  drive(s, ctx);
}

function resumeRace(s: State, ctx: Ctx) {
  setPhase(s, ctx, 'race', null);
  drive(s, ctx);
}

function roundsToPause(s: State): number | null {
  if (!s.setup.pauseOn || !s.race) return null;
  const e = s.setup.pauseEvery;
  return e - ((s.race.round - 1) % e);
}

/** Runs the race until it needs a beat, a player, a break or the end. */
function drive(s: State, ctx: Ctx) {
  const race = s.race!;
  for (let guard = 0; guard < 10_000; guard++) {
    const r = pump(race);
    if (r === 'beat') {
      ctx.setTimer('beat', BEAT_MS);
      return;
    }
    if (r === 'prompt') {
      if (!isConnected(ctx, s.owner[race.prompt!.cls])) {
        answer(race, ctx.rng.pick(race.prompt!.options));
        continue;
      }
      ctx.setTimer('react', sec(s.setup.reactSec));
      return;
    }
    if (r === 'turn') {
      if (!isConnected(ctx, s.owner[race.turn])) {
        playTurn(race, randomTurn(race, ctx.rng.pick));
        continue;
      }
      ctx.setTimer('turn', sec(s.setup.turnSec));
      return;
    }
    // 'done': the turn is over.
    ctx.clearTimer('react');
    ctx.clearTimer('turn');
    const { newRound, over } = nextTurn(race);
    if (over) {
      setPhase(s, ctx, 'final', FINAL_MS);
      ctx.emit('sound', 'drumroll');
      ctx.emit('sound', 'reveal', 2300);
      ctx.emit('fx', 'finish', 2300);
      return;
    }
    if (newRound) {
      ctx.emit('sound', 'round');
      if (s.setup.pauseOn && (race.round - 1) % s.setup.pauseEvery === 0) {
        setPhase(s, ctx, 'pause', sec(s.setup.pauseSec));
        return;
      }
    }
  }
}

function finish(s: State, ctx: Ctx) {
  const scores: Record<string, number> = Object.fromEntries(ctx.players.map((p) => [p.id, 0]));
  standings(s.race!).forEach((cls, i) => {
    const pid = s.owner[cls];
    if (pid) scores[pid] = pointsFor(i + 1);
  });
  ctx.end({ scores });
}

function checkEarly(s: State, ctx: Ctx) {
  switch (s.phase) {
    case 'read':
      if (allReady(s, ctx)) startVote(s, ctx);
      return;
    case 'vote':
      if (connected(ctx).every((id) => id in s.ballots)) closeVote(s, ctx);
      return;
    case 'strategy':
      if (allReady(s, ctx) && s.fastBack) startRace(s, ctx);
      return;
    case 'pause':
      if (allReady(s, ctx)) resumeRace(s, ctx);
      return;
  }
}

function autoTurn(s: State, ctx: Ctx) {
  const race = s.race!;
  ctx.clearTimer('turn');
  playTurn(race, randomTurn(race, ctx.rng.pick));
  drive(s, ctx);
}

function autoAnswer(s: State, ctx: Ctx) {
  const race = s.race!;
  ctx.clearTimer('react');
  answer(race, ctx.rng.pick(race.prompt!.options));
  drive(s, ctx);
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

export default defineGame<State, Config>({
  manifest,

  setup(ctx): State {
    const s: State = {
      phase: 'setup',
      setup: { ...DEFAULT_SETUP },
      ready: [],
      groups: [],
      group: null,
      ballots: {},
      voteNo: 0,
      order: Array(PLAYERS).fill(null),
      lastTally: null,
      pickAt: 0,
      owner: {},
      fastBack: null,
      race: null,
      slide: 0,
      tvRules: null,
    };
    if (ctx.config.tutorial) {
      s.phase = 'intro';
      ctx.setTimer('intro', INTRO_MAX_MS);
    }
    return s;
  },

  onAction(s, pid, raw, ctx) {
    const a = raw as Action;
    if (!a || typeof a !== 'object' || typeof a.type !== 'string') return;
    const isHost = pid === hostId(ctx);

    switch (a.type) {
      case 'intro': {
        if (s.phase !== 'intro' || !isHost) return;
        const last = s.slide === SLIDES.length - 1;
        if (a.dir === 'skip' || (a.dir === 1 && last)) endIntro(s, ctx);
        else if (a.dir === 1) s.slide += 1;
        else if (a.dir === -1 && s.slide > 0) s.slide -= 1;
        return;
      }
      case 'tvRules': {
        // Shared screens follow the Host only.
        const p = a.page;
        if (!isHost || !(p === null || (Number.isInteger(p) && p >= 0 && p < RULES.length))) return;
        s.tvRules = p;
        return;
      }
      case 'setup': {
        if (s.phase !== 'setup' || !isHost) return;
        const next = patchSetup(s.setup, a.patch);
        if (next) s.setup = next;
        return;
      }
      case 'start': {
        if (s.phase !== 'setup' || !isHost) return;
        startRead(s, ctx);
        return;
      }
      case 'ready': {
        if (!['read', 'strategy', 'pause'].includes(s.phase) || s.ready.includes(pid)) return;
        if (s.phase === 'strategy' && s.owner[FAST] === pid && !s.fastBack) return;
        s.ready.push(pid);
        checkEarly(s, ctx);
        return;
      }
      case 'vote': {
        if (s.phase !== 'vote' || !s.group || pid in s.ballots) return;
        if (typeof a.target !== 'string' || !s.group.cands.includes(a.target)) return;
        s.ballots[pid] = a.target;
        ctx.emit('sound', 'tick');
        checkEarly(s, ctx);
        return;
      }
      case 'pick': {
        if (s.phase !== 'pick' || s.order[s.pickAt] !== pid) return;
        if (typeof a.cls !== 'number' || !freeClasses(s).includes(a.cls as never)) return;
        pickClass(s, ctx, a.cls);
        return;
      }
      case 'fastBack': {
        if ((s.phase !== 'strategy' && s.phase !== 'fast') || s.owner[FAST] !== pid || s.fastBack) return;
        const c = a.cards;
        if (!Array.isArray(c) || c.length !== 2 || new Set(c).size !== 2) return;
        if (!c.every((v) => [1, 2, 3, 4].includes(v))) return;
        s.fastBack = [...c].sort();
        if (s.phase === 'fast') startRace(s, ctx);
        else checkEarly(s, ctx);
        return;
      }
      case 'turn': {
        const race = s.race;
        if (s.phase !== 'race' || !race || s.owner[race.turn] !== pid) return;
        const choice: TurnChoice = { card: a.card };
        if (a.double !== undefined) choice.double = a.double;
        if (a.gravity !== undefined) choice.gravity = a.gravity;
        if (a.silence !== undefined) choice.silence = a.silence;
        if (a.leapReset !== undefined) choice.leapReset = a.leapReset;
        if (!validTurn(race, choice)) return;
        ctx.clearTimer('turn');
        playTurn(race, choice);
        drive(s, ctx);
        return;
      }
      case 'answer': {
        const race = s.race;
        if (s.phase !== 'race' || !race?.prompt || s.owner[race.prompt.cls] !== pid) return;
        if (!validAnswer(race, race.prompt.cls, a.value)) return;
        ctx.clearTimer('react');
        answer(race, a.value);
        drive(s, ctx);
        return;
      }
    }
  },

  onTimer(s, key, ctx) {
    const race = s.race;
    if (key === 'intro') {
      if (s.phase === 'intro') endIntro(s, ctx);
      return;
    }
    if (key === 'beat') {
      if (s.phase === 'race' && race) drive(s, ctx);
      return;
    }
    if (key === 'turn') {
      if (s.phase === 'race' && race?.awaitingTurn) autoTurn(s, ctx);
      return;
    }
    if (key === 'react') {
      if (s.phase === 'race' && race?.prompt) autoAnswer(s, ctx);
      return;
    }
    if (key !== 'phase') return;
    switch (s.phase) {
      case 'read':
        startVote(s, ctx);
        return;
      case 'vote':
        closeVote(s, ctx);
        return;
      case 'voteResult':
        if (s.groups.length) nextVote(s, ctx);
        else startPick(s, ctx);
        return;
      case 'pick':
        pickClass(s, ctx, ctx.rng.pick(freeClasses(s)));
        return;
      case 'strategy':
      case 'fast':
        startRace(s, ctx);
        return;
      case 'pause':
        resumeRace(s, ctx);
        return;
      case 'final':
        finish(s, ctx);
        return;
    }
  },

  onPlayerTimeout(s, pid, ctx) {
    const race = s.race;
    // The Host left during the tutorial: nobody else can advance it.
    if (s.phase === 'intro') {
      if (!ctx.players.some((p) => p.isHost && p.connected)) endIntro(s, ctx);
      return;
    }
    switch (s.phase) {
      case 'pick':
        if (s.order[s.pickAt] === pid) pickClass(s, ctx, ctx.rng.pick(freeClasses(s)));
        return;
      case 'fast':
        if (s.owner[FAST] === pid) startRace(s, ctx);
        return;
      case 'strategy':
        if (s.owner[FAST] === pid && !s.fastBack) s.fastBack = randomFast(ctx);
        checkEarly(s, ctx);
        return;
      case 'race':
        if (!race) return;
        if (race.awaitingTurn && s.owner[race.turn] === pid) autoTurn(s, ctx);
        else if (race.prompt && s.owner[race.prompt.cls] === pid) autoAnswer(s, ctx);
        return;
      default:
        checkEarly(s, ctx);
    }
  },

  publicView(s, ctx): PublicView {
    const key = timerKey(s);
    return {
      phase: s.phase,
      deadline: key ? ctx.timerDeadline(key) : null,
      total: key ? ctx.timerTotal(key) : null,
      setup: s.setup,
      host: hostId(ctx),
      ready: s.ready,
      vote:
        s.phase === 'vote' || s.phase === 'voteResult'
          ? {
              no: s.voteNo,
              cands: s.group?.cands ?? [],
              lo: s.group?.lo ?? 1,
              hi: s.group?.hi ?? PLAYERS,
              voted: Object.keys(s.ballots),
              order: s.order,
              result: s.phase === 'voteResult' ? s.lastTally : null,
            }
          : null,
      pick: s.phase === 'pick' ? { order: s.order, chooser: s.order[s.pickAt] ?? null } : null,
      owner: s.owner,
      fastChosen: !!s.fastBack,
      race: s.race ? raceView(s, s.race) : null,
      slide: s.slide,
      slides: SLIDES.length,
      tvRules: s.tvRules,
      hint: hintFor(s, ctx),
    };
  },

  playerView(s, pid, ctx): PlayerView {
    const key = timerKey(s);
    const race = s.race;
    const mine = classOf(s, pid);
    const r = race && mine ? runner(race, mine) : null;
    return {
      phase: s.phase,
      deadline: key ? ctx.timerDeadline(key) : null,
      total: key ? ctx.timerTotal(key) : null,
      slide: s.slide,
      slides: SLIDES.length,
      tvRules: s.tvRules,
      isHost: pid === hostId(ctx),
      setup: s.setup,
      ready: s.ready.includes(pid),
      myClass: mine,
      owner: s.owner,
      vote: s.phase === 'vote' && s.group ? { cands: s.group.cands, myVote: s.ballots[pid] ?? null } : null,
      pick:
        s.phase === 'pick'
          ? { myTurn: s.order[s.pickAt] === pid, free: freeClasses(s), chooser: s.order[s.pickAt] ?? null }
          : null,
      fastBack: mine === FAST ? s.fastBack : null,
      mustChooseFast: mine === FAST && !s.fastBack && (s.phase === 'strategy' || s.phase === 'fast'),
      race:
        race && r && mine
          ? {
              hand: r.hand,
              discard: r.discard,
              removed: r.removed,
              turn: s.phase === 'race' && race.awaitingTurn && race.turn === mine ? turnOptions(race) : null,
              prompt: s.phase === 'race' && race.prompt?.cls === mine ? race.prompt : null,
              out: r.out,
              place: r.out ? race.finish.indexOf(mine) + 1 : null,
              silenced: race.silenced === mine,
              turnCls: race.turn,
              deciding: race.prompt?.cls ?? null,
            }
          : null,
    };
  },
});

/** Safety net: a tutorial nobody advances (the Host left) gives way to the setup. */
const INTRO_MAX_MS = 5 * 60_000;

function endIntro(s: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  s.phase = 'setup';
  s.slide = 0;
}

/** Tips for the first round of the race, derived from what is happening right now. */
function hintFor(s: State, ctx: Ctx): Hint | null {
  const race = s.race;
  if (!ctx.config.tutorial || s.phase !== 'race' || !race || race.round > 1) return null;
  if (race.prompt) return 'react';
  if (race.awaitingTurn) return 'turn';
  return 'cascade';
}

function timerKey(s: State): string | null {
  if (s.phase !== 'race') return 'phase';
  const race = s.race;
  if (!race) return null;
  return race.prompt ? 'react' : race.awaitingTurn ? 'turn' : null;
}

function raceView(s: State, race: Race): RaceView {
  return {
    cols: race.cols,
    round: race.round,
    turn: race.turn,
    awaitingTurn: race.awaitingTurn,
    rows: CLASS_IDS.map((c) => {
      const r = runner(race, c);
      const fi = race.finish.indexOf(c);
      return {
        cls: c,
        pid: s.owner[c] ?? '',
        pos: r.pos,
        out: r.out,
        discard: r.discard,
        handCount: r.hand.length,
        removedCount: r.removed.length,
        silenced: race.silenced === c,
        place: fi >= 0 ? fi + 1 : null,
      };
    }),
    standings: standings(race),
    log: race.log,
    deciding: race.prompt
      ? { cls: race.prompt.cls, kind: race.prompt.kind, ...(race.prompt.kind === 'pushDir' ? { target: race.prompt.target! } : {}) }
      : null,
    roundsToPause: roundsToPause(s),
  };
}
