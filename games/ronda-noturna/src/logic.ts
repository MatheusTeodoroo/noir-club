import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { adjacency, FIXED_BOARDS, generateBoard } from './board.ts';
import { RULES, SLIDES, SPACES } from './texts.ts';
import { ACTIONS_PER_COP, groupOrder, POINTS_PER_WINNER, TEAMS, THIEF_STEPS, type Side, type Team } from './shared.ts';

// Ronda Noturna: two hidden thieves steal stars across a metro-map city; three police teams
// (two of them hiding a corrupt cop) hunt them. Thieves move first each round, then each police
// team in a rotating order; every team plays from its own room. See DESIGN.md.

export const manifest = manifestJson as GameManifest;

export interface Config {
  /** Tutorial slides on the TV before the role briefing, plus first-round hints. */
  tutorial: boolean;
  /** '0' = no round cap (and so no final vote). */
  maxRounds: string;
  thiefMinutes: number;
  copMinutes: number;
  totalStars: number;
  starGoal: number;
  revealEvery: number;
  /** 'random' (one of the fixed maps), a fixed map id, or 'generated'. */
  map: string;
  genSize: number;
  /** Where each player first learns their role: 'phone' or 'dealer'. */
  briefing: string;
  briefingSeconds: number;
}

type Ctx = GameCtx<Config>;

export type Phase = 'intro' | 'briefing' | 'placing' | 'intermission' | 'thieves' | 'cops' | 'vote' | 'over';

/**
 * Who may read a log line: everyone, the corrupt cops only (where each thief is — never the path
 * or the stars), or the thieves only (their own precise lines).
 */
type Vis = 'all' | 'crooked' | 'thieves';

export type LogEntry = { r: number } & (
  | { k: 'copPlaced'; who: string; node: number }
  | { k: 'thiefPlaced'; who: string }
  /** thieves only */
  | { k: 'thiefPlacedAt'; who: string; node: number }
  | { k: 'thiefPlayed'; who: string }
  /** thieves only: the whole path, starting node first (one node = stayed put) */
  | { k: 'thiefPath'; who: string; path: number[] }
  /** corrupt cops only: where a thief starts, moved to, or stayed — the stop, never the path */
  | { k: 'thiefAt'; who: string; node: number; how: 'start' | 'move' | 'stay' }
  /** thieves only */
  | { k: 'star'; who: string; node: number; total: number }
  | { k: 'copMove'; who: string; from: number; to: number }
  | { k: 'investigate'; who: string; node: number }
  | { k: 'arrest'; who: string; node: number; caught: string[] }
  /** public; `n` (how many stars went back) only for the thieves */
  | { k: 'starsReturned'; who: string; n: number | null }
  | { k: 'pass'; who: string }
  | { k: 'timeout'; who: string }
  | { k: 'reveal'; n: number }
);

export interface Investigation {
  r: number;
  node: number;
  /** A thief has stepped on this node at some point (start, passing, stopping, or there now). */
  hit: boolean;
}

export interface GroupVerdict {
  team: Team;
  /** The group's decision: a member id, 'none', or null (tie / no valid decision). */
  decision: string | null;
  corrupt: string | null;
  correct: boolean;
}

export interface Result {
  winner: 'thieves' | 'cops';
  reason: 'stars' | 'arrests' | 'vote';
  corrupt: string[];
  thievesPos: Record<string, number | null>;
  stars: number;
  verdicts: GroupVerdict[] | null;
}

/** Engine-side state. */
export interface State {
  board: { seed: number; size: number };
  adj: number[][];
  round: number;
  phase: Phase;
  teams: Record<Team, string[]>;
  /** Thieves in their drawn order. */
  thieves: string[];
  /** SECRET: the corrupt cops (known to themselves and to the thieves). */
  corrupt: string[];
  /** Cops are public; thieves' entries are SECRET until arrested or the end. */
  pos: Record<string, number | null>;
  /** SECRET: nodes holding a star. */
  stars: number[];
  /** SECRET: stars each thief carries. */
  held: Record<string, number>;
  arrested: Record<string, boolean>;
  /** SECRET: nodes a thief has ever stepped on. */
  trail: boolean[];
  placeOrder: string[];
  placeIdx: number;
  /** Next turn after the intermission. */
  next: Side | null;
  groupSeq: Team[];
  groupIdx: number;
  thiefIdx: number;
  memberIdx: number;
  actionsLeft: number;
  log: (LogEntry & { vis: Vis })[];
  /** SECRET: each cop's own investigation results. */
  inv: Record<string, Investigation[]>;
  reveals: { round: number; n: number }[];
  /** SECRET until the end: who each cop voted for. */
  votes: Record<string, string>;
  result: Result | null;
  /** Briefing: who has seen their role (tapped "ready" on the phone, or visited the Dealer). */
  ready: Record<string, boolean>;
  /** Tutorial slide on screen during the intro. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
}

/** What a player learns about themselves at the briefing (phone or Dealer). */
export interface RoleCard {
  side: Side;
  /** 1-based position in their team's drawn order. */
  order: number;
  corrupt: boolean;
  /** The corrupt cops — only for the corrupt and the thieves. */
  corruptIds: string[] | null;
  partner: string | null;
  teammates: string[];
  goal: number;
}

export interface Turn {
  side: Side | null;
  actor: string | null;
  actionsLeft: number;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  round: number;
  maxRounds: number;
  goal: number;
  totalStars: number;
  board: { seed: number; size: number };
  teams: Record<Team, string[]>;
  thieves: string[];
  /** Cop positions (public). */
  cops: Record<string, number | null>;
  /** Arrested thieves and where they were caught. */
  arrested: Record<string, number>;
  turn: Turn;
  next: Side | null;
  groupSeq: Team[];
  deadline: number | null;
  total: number | null;
  log: LogEntry[];
  reveals: { round: number; n: number }[];
  /** Set during the intermission right after a reveal. */
  banner: { round: number; n: number } | null;
  voted: string[];
  result: Result | null;
  briefing: null | { mode: 'phone' | 'dealer'; ready: string[] };
  slide: number;
  slides: number;
  tvRules: number | null;
  /** First-round "what to do now" line while the tutorial option is on. */
  hint: 'placing' | 'intermission' | 'thieves' | 'cops' | null;
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  round: number;
  /** Public parts the phone's map and status need. */
  board: { seed: number; size: number };
  teams: Record<Team, string[]>;
  cops: Record<string, number | null>;
  arrested: Record<string, number>;
  next: Side | null;
  side: Side;
  /** For cops: am I corrupt (hold-to-reveal on the phone). */
  corrupt: boolean;
  /** The corrupt cops — only for the corrupt and the thieves. */
  corruptIds: string[] | null;
  myPos: number | null;
  turn: Turn;
  myTurn: boolean;
  deadline: number | null;
  total: number | null;
  /** Thieves only. */
  thief: null | {
    arrested: boolean;
    partner: { id: string; pos: number | null; arrested: boolean } | null;
    held: number;
    /** Only during the thieves' turn (placing or moving). */
    stars: number[] | null;
  };
  inv: Investigation[];
  log: LogEntry[];
  vote: null | { candidates: string[]; mine: string | null };
  role: RoleCard;
  goal: number;
  /** During the briefing: where to look, and whether I'm done. */
  briefing: null | { mode: 'phone' | 'dealer'; ready: boolean };
  slide: number;
  slides: number;
  tvRules: number | null;
}

/** The Dealer screen: a role card during a briefing visit, else the thieves' board. */
export type DealerView = { kind: 'role'; card: RoleCard } | BoardView;

/** The thieves' board, standing in their room the whole match. */
export interface BoardView {
  kind: 'board';
  phase: Phase;
  round: number;
  maxRounds: number;
  board: { seed: number; size: number };
  teams: Record<Team, string[]>;
  stars: number[];
  goal: number;
  held: number;
  thieves: { id: string; pos: number | null; arrested: boolean; held: number }[];
  cops: Record<string, number | null>;
  corruptIds: string[];
  turn: Turn;
  next: Side | null;
  deadline: number | null;
  total: number | null;
  log: LogEntry[];
}

export type Action =
  | { type: 'place'; node: number }
  | { type: 'move'; path: number[] }
  | { type: 'act'; kind: 'investigate' | 'arrest'; node: number }
  | { type: 'pass' }
  | { type: 'vote'; target: string }
  | { type: 'ready' }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

const INTERMISSION_MS = 10_000;
/** Safety net: if the Host never advances the tutorial (left the room), the game moves on. */
const INTRO_MAX_MS = 5 * 60_000;
/** Dealer briefing: time allowed per player for the walk and the read. */
const DEALER_BRIEF_PER_PLAYER_MS = 40_000;
const REVEAL_INTERMISSION_MS = 14_000;
const VOTE_MS = 180_000;
const END_MS = 16_000;
const LOG_TAIL = 60;
/** Public lines that have a more precise private twin for the thieves. */
const THIEF_PUBLIC_TWINS = new Set<string>(['thiefPlaced', 'thiefPlayed', 'starsReturned']);

// ---------------------------------------------------------------------------
// Helpers

function maxRounds(ctx: Ctx) {
  return Number.parseInt(ctx.config.maxRounds, 10) || 0;
}
function goal(ctx: Ctx) {
  return Math.min(ctx.config.starGoal, ctx.config.totalStars);
}
function sideOf(state: State, id: string): Side | null {
  if (state.thieves.includes(id)) return 'thieves';
  return TEAMS.find((t) => state.teams[t].includes(id)) ?? null;
}
const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);

function connected(ctx: Ctx, id: string) {
  return !!ctx.players.find((p) => p.id === id)?.connected;
}
function teamStars(state: State) {
  return state.thieves.reduce((n, id) => n + (state.arrested[id] ? 0 : state.held[id]!), 0);
}
function log(state: State, vis: Vis, entry: LogEntry) {
  state.log.push({ ...entry, vis });
}
function readable(vis: Vis, reader: 'cop' | 'corrupt' | 'thief') {
  return vis === 'all' || (vis === 'crooked' && reader === 'corrupt') || (vis === 'thieves' && reader === 'thief');
}
function logFor(state: State, reader: 'cop' | 'corrupt' | 'thief', limit = LOG_TAIL): LogEntry[] {
  const out: LogEntry[] = [];
  for (let i = state.log.length - 1; i >= 0 && out.length < limit; i--) {
    const { vis, ...entry } = state.log[i]!;
    // The thieves read the precise lines (where, how many) instead of the public ones.
    if (reader === 'thief' && vis === 'all' && THIEF_PUBLIC_TWINS.has(entry.k)) continue;
    if (readable(vis, reader)) out.push(entry as LogEntry);
  }
  return out.reverse();
}

function copPositions(state: State) {
  return Object.fromEntries(TEAMS.flatMap((t) => state.teams[t]).map((id) => [id, state.pos[id] ?? null]));
}
function arrestedAt(state: State) {
  return Object.fromEntries(state.thieves.filter((id) => state.arrested[id]).map((id) => [id, state.pos[id]!]));
}

function currentTurn(state: State): Turn {
  switch (state.phase) {
    case 'placing': {
      const actor = state.placeOrder[state.placeIdx] ?? null;
      return { side: actor ? sideOf(state, actor) : null, actor, actionsLeft: 1 };
    }
    case 'thieves':
      return { side: 'thieves', actor: state.thieves[state.thiefIdx] ?? null, actionsLeft: 1 };
    case 'cops': {
      const team = state.groupSeq[state.groupIdx]!;
      return { side: team, actor: state.teams[team][state.memberIdx] ?? null, actionsLeft: state.actionsLeft };
    }
    default:
      return { side: null, actor: null, actionsLeft: 0 };
  }
}

// ---------------------------------------------------------------------------
// Flow

function endIntro(state: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  state.tvRules = null;
  startBriefing(state, ctx);
}

function briefingMode(ctx: Ctx): 'phone' | 'dealer' {
  return ctx.config.briefing === 'dealer' ? 'dealer' : 'phone';
}

function startBriefing(state: State, ctx: Ctx) {
  state.phase = 'briefing';
  const ms =
    briefingMode(ctx) === 'dealer'
      ? Math.max(ctx.config.briefingSeconds * 1000, DEALER_BRIEF_PER_PLAYER_MS * ctx.players.length)
      : ctx.config.briefingSeconds * 1000;
  ctx.setTimer('turn', ms);
  ctx.emit('sound', 'round');
}

/** Ends the briefing once every connected player has seen their role. */
function checkBriefing(state: State, ctx: Ctx) {
  if (state.phase !== 'briefing') return;
  if (ctx.players.filter((p) => p.connected).every((p) => state.ready[p.id])) endBriefing(state, ctx);
}

function endBriefing(state: State, ctx: Ctx) {
  ctx.clearTimer('turn');
  if (ctx.atDealer) ctx.releaseDealer();
  state.phase = 'placing';
  ctx.emit('sound', 'phase');
  advancePlacing(state, ctx);
}

function hintFor(state: State): PublicView['hint'] {
  switch (state.phase) {
    case 'placing':
    case 'intermission':
    case 'thieves':
    case 'cops':
      return state.phase;
    default:
      return null;
  }
}

function roleCard(state: State, ctx: Ctx, id: string): RoleCard {
  const side = sideOf(state, id) ?? 'red';
  const isThief = side === 'thieves';
  const corrupt = state.corrupt.includes(id);
  const members = isThief ? state.thieves : state.teams[side];
  return {
    side,
    order: members.indexOf(id) + 1,
    corrupt,
    corruptIds: isThief || corrupt ? [...state.corrupt] : null,
    partner: isThief ? (state.thieves.find((o) => o !== id) ?? null) : null,
    teammates: members.filter((o) => o !== id),
    goal: goal(ctx),
  };
}

function finish(
  state: State,
  ctx: Ctx,
  winner: Result['winner'],
  reason: Result['reason'],
  verdicts: GroupVerdict[] | null,
) {
  state.phase = 'over';
  state.result = {
    winner,
    reason,
    corrupt: [...state.corrupt],
    thievesPos: Object.fromEntries(state.thieves.map((id) => [id, state.pos[id] ?? null])),
    stars: teamStars(state),
    verdicts,
  };
  ctx.clearTimer('turn');
  ctx.setTimer('end', END_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'reveal', 2300);
}

/** Moves the placement pointer on, auto-placing anyone who is offline. */
function advancePlacing(state: State, ctx: Ctx) {
  while (state.placeIdx < state.placeOrder.length) {
    const id = state.placeOrder[state.placeIdx]!;
    if (connected(ctx, id)) return;
    place(state, ctx, id, randomPlacement(state, ctx, id));
  }
  state.round = 1;
  state.groupSeq = groupOrder(1);
  intermission(state, ctx, 'thieves');
}

/** Cops place by rank across the squads: Red 1, Blue 1, Green 1, Red 2, Blue 2, Green 2… */
function placementOrder(teams: Record<Team, string[]>): string[] {
  const order: string[] = [];
  const longest = Math.max(...TEAMS.map((t) => teams[t].length));
  for (let i = 0; i < longest; i++) for (const t of TEAMS) if (teams[t][i]) order.push(teams[t][i]!);
  return order;
}

function randomPlacement(state: State, ctx: Ctx, id: string) {
  const all = state.adj.map((_, i) => i);
  const ok = sideOf(state, id) === 'thieves' ? all.filter((n) => !state.stars.includes(n)) : all;
  return ctx.rng.pick(ok);
}

function place(state: State, ctx: Ctx, id: string, node: number) {
  state.pos[id] = node;
  if (sideOf(state, id) === 'thieves') {
    state.trail[node] = true;
    log(state, 'all', { r: 0, k: 'thiefPlaced', who: id });
    log(state, 'thieves', { r: 0, k: 'thiefPlacedAt', who: id, node });
    log(state, 'crooked', { r: 0, k: 'thiefAt', who: id, node, how: 'start' });
  } else {
    log(state, 'all', { r: 0, k: 'copPlaced', who: id, node });
  }
  ctx.emit('sound', 'tick');
  state.placeIdx += 1;
}

function intermission(state: State, ctx: Ctx, next: Side, ms = INTERMISSION_MS) {
  state.phase = 'intermission';
  state.next = next;
  ctx.setTimer('turn', ms);
  ctx.emit('sound', 'phase');
}

function startTurn(state: State, ctx: Ctx) {
  const next = state.next!;
  state.next = null;
  if (next === 'thieves') {
    state.phase = 'thieves';
    state.thiefIdx = -1;
    ctx.setTimer('turn', ctx.config.thiefMinutes * 60_000);
    ctx.emit('sound', 'round');
    nextThief(state, ctx);
  } else {
    state.phase = 'cops';
    state.groupIdx = state.groupSeq.indexOf(next);
    state.memberIdx = -1;
    ctx.setTimer('turn', ctx.config.copMinutes * 60_000);
    nextMember(state, ctx);
  }
}

/** Next free, connected thief; the offline ones stay put. */
function nextThief(state: State, ctx: Ctx) {
  for (state.thiefIdx += 1; state.thiefIdx < state.thieves.length; state.thiefIdx++) {
    const id = state.thieves[state.thiefIdx]!;
    if (state.arrested[id]) continue;
    if (connected(ctx, id)) return;
    stay(state, id);
  }
  endThieves(state, ctx);
}

function stay(state: State, id: string) {
  log(state, 'all', { r: state.round, k: 'thiefPlayed', who: id });
  log(state, 'thieves', { r: state.round, k: 'thiefPath', who: id, path: [state.pos[id]!] });
  log(state, 'crooked', { r: state.round, k: 'thiefAt', who: id, node: state.pos[id]!, how: 'stay' });
}

function endThieves(state: State, ctx: Ctx) {
  state.groupIdx = 0;
  intermission(state, ctx, state.groupSeq[0]!);
}

function nextMember(state: State, ctx: Ctx) {
  const team = state.groupSeq[state.groupIdx]!;
  for (state.memberIdx += 1; state.memberIdx < state.teams[team].length; state.memberIdx++) {
    if (connected(ctx, state.teams[team][state.memberIdx]!)) {
      state.actionsLeft = ACTIONS_PER_COP;
      return;
    }
  }
  endGroup(state, ctx);
}

function endGroup(state: State, ctx: Ctx) {
  state.groupIdx += 1;
  if (state.groupIdx < state.groupSeq.length) intermission(state, ctx, state.groupSeq[state.groupIdx]!);
  else endRound(state, ctx);
}

function endRound(state: State, ctx: Ctx) {
  let revealed = false;
  if (state.round % ctx.config.revealEvery === 0) {
    const n = teamStars(state);
    state.reveals.push({ round: state.round, n });
    log(state, 'all', { r: state.round, k: 'reveal', n });
    ctx.emit('sound', 'drumroll');
    ctx.emit('sound', 'reveal', 2300);
    revealed = true;
  }
  const cap = maxRounds(ctx);
  if (cap && state.round >= cap) {
    startVote(state, ctx);
    return;
  }
  state.round += 1;
  state.groupSeq = groupOrder(state.round);
  intermission(state, ctx, 'thieves', revealed ? REVEAL_INTERMISSION_MS : INTERMISSION_MS);
}

function startVote(state: State, ctx: Ctx) {
  state.phase = 'vote';
  state.votes = {};
  ctx.setTimer('turn', VOTE_MS);
  ctx.emit('sound', 'phase');
}

function copsVoting(state: State, ctx: Ctx) {
  return TEAMS.flatMap((t) => state.teams[t]).filter((id) => connected(ctx, id));
}

function tally(state: State, ctx: Ctx) {
  const verdicts = TEAMS.map((team): GroupVerdict => {
    const members = state.teams[team];
    const corrupt = members.find((id) => state.corrupt.includes(id)) ?? null;
    // The corrupt cop votes like everyone (nobody can tell), but the vote is not counted:
    // otherwise, in a two-cop team, they could always force a tie.
    const voters = members.filter((id) => id !== corrupt);
    const counts = new Map<string, number>();
    for (const id of voters) {
      const v = state.votes[id];
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    let decision: string | null = null;
    if (ranked.length && (ranked.length === 1 || ranked[0]![1] > ranked[1]![1])) decision = ranked[0]![0];
    // 'none' only stands when the whole group chose it.
    if (decision === 'none' && !voters.every((id) => state.votes[id] === 'none')) decision = null;
    const correct = decision !== null && decision === (corrupt ?? 'none');
    return { team, decision, corrupt, correct };
  });
  const copsWin = verdicts.every((v) => v.correct);
  finish(state, ctx, copsWin ? 'cops' : 'thieves', 'vote', verdicts);
}

// ---------------------------------------------------------------------------
// Actions

function thiefMove(state: State, ctx: Ctx, id: string, path: number[]) {
  let at = state.pos[id]!;
  const full = [at];
  for (const node of path) {
    if (!state.adj[at]!.includes(node)) return false;
    at = node;
    full.push(node);
  }
  for (const node of path) {
    state.trail[node] = true;
    const s = state.stars.indexOf(node);
    if (s >= 0) {
      state.stars.splice(s, 1);
      state.held[id]! += 1;
      log(state, 'thieves', { r: state.round, k: 'star', who: id, node, total: teamStars(state) });
      ctx.emit('sound', 'tick');
    }
  }
  state.pos[id] = at;
  log(state, 'all', { r: state.round, k: 'thiefPlayed', who: id });
  log(state, 'thieves', { r: state.round, k: 'thiefPath', who: id, path: full });
  log(state, 'crooked', { r: state.round, k: 'thiefAt', who: id, node: at, how: path.length ? 'move' : 'stay' });
  return true;
}

function copAct(state: State, ctx: Ctx, id: string, kind: 'investigate' | 'arrest', node: number) {
  const from = state.pos[id]!;
  if (node !== from && !state.adj[from]!.includes(node)) return false;
  if (node !== from) {
    state.pos[id] = node;
    log(state, 'all', { r: state.round, k: 'copMove', who: id, from, to: node });
  }
  if (kind === 'investigate') {
    (state.inv[id] ??= []).push({ r: state.round, node, hit: !!state.trail[node] });
    log(state, 'all', { r: state.round, k: 'investigate', who: id, node });
    ctx.emit('sound', 'tick');
    return true;
  }
  // A corrupt cop's arrest always comes up empty, exactly like a real miss.
  const caught = state.corrupt.includes(id)
    ? []
    : state.thieves.filter((t) => !state.arrested[t] && state.pos[t] === node);
  log(state, 'all', { r: state.round, k: 'arrest', who: id, node, caught });
  if (caught.length === 0) {
    ctx.emit('sound', 'tick');
    return true;
  }
  ctx.emit('sound', 'reveal');
  ctx.emit('fx', 'arrest');
  for (const t of caught) {
    state.arrested[t] = true;
    const n = state.held[t]!;
    state.held[t] = 0;
    // The arrested thief's stars go back to the city, away from stars and free thieves.
    const blocked = new Set([
      ...state.stars,
      ...state.thieves.filter((o) => !state.arrested[o]).map((o) => state.pos[o]!),
    ]);
    const free = ctx.rng.shuffle(state.adj.map((_, i) => i).filter((i) => !blocked.has(i)));
    state.stars.push(...free.slice(0, n));
    if (n > 0) {
      log(state, 'all', { r: state.round, k: 'starsReturned', who: t, n: null });
      log(state, 'thieves', { r: state.round, k: 'starsReturned', who: t, n });
    }
  }
  if (state.thieves.every((t) => state.arrested[t])) finish(state, ctx, 'cops', 'arrests', null);
  return true;
}

function isNode(state: State, n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < state.adj.length;
}

// ---------------------------------------------------------------------------

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const choice = ctx.config.map;
    const fixed = FIXED_BOARDS.find((b) => b.id === choice) ?? (choice === 'generated' ? null : ctx.rng.pick(FIXED_BOARDS));
    const built = fixed
      ? generateBoard(fixed.seed, fixed.size)
      : generateBoard(ctx.rng.int(1, 1_000_000), ctx.config.genSize);
    const adj = adjacency(built);

    const ids = ctx.rng.shuffle(ctx.players.map((p) => p.id));
    const thieves = ids.slice(0, 2);
    const cops = ids.slice(2);
    const teams: Record<Team, string[]> = { red: [], blue: [], green: [] };
    // As even as possible: the leftover seats go to random teams.
    const sizes = [0, 1, 2].map(() => Math.floor(cops.length / 3));
    for (const i of ctx.rng.shuffle([0, 1, 2]).slice(0, cops.length % 3)) sizes[i]! += 1;
    let k = 0;
    TEAMS.forEach((t, i) => {
      teams[t] = cops.slice(k, k + sizes[i]!);
      k += sizes[i]!;
    });
    const corrupt = ctx.rng
      .shuffle([...TEAMS])
      .slice(0, 2)
      .map((t) => ctx.rng.pick(teams[t]));

    const starCount = Math.min(ctx.config.totalStars, adj.length - 2);
    const stars = ctx.rng.shuffle(adj.map((_, i) => i)).slice(0, starCount);

    const state: State = {
      board: { seed: built.seed, size: built.size },
      adj,
      round: 0,
      phase: 'briefing',
      teams,
      thieves,
      corrupt,
      pos: Object.fromEntries(ids.map((id) => [id, null])),
      stars,
      held: Object.fromEntries(thieves.map((id) => [id, 0])),
      arrested: Object.fromEntries(thieves.map((id) => [id, false])),
      trail: adj.map(() => false),
      placeOrder: [...placementOrder(teams), ...thieves],
      placeIdx: 0,
      next: null,
      groupSeq: groupOrder(1),
      groupIdx: 0,
      thiefIdx: 0,
      memberIdx: 0,
      actionsLeft: 0,
      log: [],
      inv: {},
      reveals: [],
      votes: {},
      result: null,
      ready: {},
      slide: 0,
      tvRules: null,
    };
    if (ctx.config.tutorial) {
      state.phase = 'intro';
      ctx.setTimer('intro', INTRO_MAX_MS);
    } else startBriefing(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object') return;
    const turn = currentTurn(state);

    // Shared screens (tutorial slides, rules on the TV) follow the Host only.
    if (action.type === 'tvRules') {
      const ok =
        action.page === null || (Number.isInteger(action.page) && action.page >= 0 && action.page < RULES.length);
      if (ok && isHost(ctx, playerId)) state.tvRules = action.page;
      return;
    }
    if (action.type === 'intro') {
      if (state.phase !== 'intro' || !isHost(ctx, playerId)) return;
      const last = state.slide === SLIDES.length - 1;
      if (action.dir === 'skip' || (action.dir === 1 && last)) endIntro(state, ctx);
      else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (action.type === 'ready') {
      if (state.phase !== 'briefing' || briefingMode(ctx) !== 'phone' || state.ready[playerId]) return;
      state.ready[playerId] = true;
      ctx.emit('sound', 'tick');
      checkBriefing(state, ctx);
      return;
    }

    if (action.type === 'place') {
      if (state.phase !== 'placing' || turn.actor !== playerId || !isNode(state, action.node)) return;
      if (turn.side === 'thieves' && state.stars.includes(action.node)) return;
      place(state, ctx, playerId, action.node);
      advancePlacing(state, ctx);
      return;
    }

    if (action.type === 'move') {
      if (state.phase !== 'thieves' || turn.actor !== playerId) return;
      const path = action.path;
      if (!Array.isArray(path) || path.length > THIEF_STEPS || !path.every((n) => isNode(state, n))) return;
      if (!thiefMove(state, ctx, playerId, path)) return;
      if (teamStars(state) >= goal(ctx)) {
        finish(state, ctx, 'thieves', 'stars', null);
        return;
      }
      nextThief(state, ctx);
      return;
    }

    if (action.type === 'act') {
      if (state.phase !== 'cops' || turn.actor !== playerId || state.actionsLeft <= 0) return;
      if (action.kind !== 'investigate' && action.kind !== 'arrest') return;
      if (!isNode(state, action.node)) return;
      if (!copAct(state, ctx, playerId, action.kind, action.node)) return;
      if (state.phase !== 'cops') return; // the arrest ended the match
      state.actionsLeft -= 1;
      if (state.actionsLeft === 0) nextMember(state, ctx);
      return;
    }

    if (action.type === 'pass') {
      if (state.phase !== 'cops' || turn.actor !== playerId) return;
      log(state, 'all', { r: state.round, k: 'pass', who: playerId });
      nextMember(state, ctx);
      return;
    }

    if (action.type === 'vote') {
      if (state.phase !== 'vote') return;
      const side = sideOf(state, playerId);
      if (!side || side === 'thieves') return;
      const target = action.target;
      if (typeof target !== 'string') return;
      if (target !== 'none' && (target === playerId || !state.teams[side].includes(target))) return;
      state.votes[playerId] = target;
      ctx.emit('sound', 'tick');
      if (copsVoting(state, ctx).every((id) => state.votes[id])) tally(state, ctx);
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') endIntro(state, ctx);
      return;
    }
    if (key === 'end') {
      const r = state.result!;
      const winners =
        r.winner === 'thieves'
          ? [...state.thieves, ...state.corrupt]
          : TEAMS.flatMap((t) => state.teams[t]).filter((id) => !state.corrupt.includes(id));
      ctx.end({
        scores: Object.fromEntries(ctx.players.map((p) => [p.id, winners.includes(p.id) ? POINTS_PER_WINNER : 0])),
      });
      return;
    }
    if (key !== 'turn') return;
    if (state.phase === 'briefing') {
      endBriefing(state, ctx);
    } else if (state.phase === 'intermission') {
      startTurn(state, ctx);
    } else if (state.phase === 'thieves') {
      // Out of time: whoever hasn't moved stays where they are.
      for (let i = state.thiefIdx; i < state.thieves.length; i++) {
        const id = state.thieves[i]!;
        if (!state.arrested[id]) stay(state, id);
      }
      endThieves(state, ctx);
    } else if (state.phase === 'cops') {
      const team = state.groupSeq[state.groupIdx]!;
      for (let i = state.memberIdx; i < state.teams[team].length; i++) {
        log(state, 'all', { r: state.round, k: 'timeout', who: state.teams[team][i]! });
      }
      endGroup(state, ctx);
    } else if (state.phase === 'vote') {
      tally(state, ctx);
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    const turn = currentTurn(state);
    if (state.phase === 'intro') {
      // Only the Host can advance the tutorial: if they're gone, move on.
      if (isHost(ctx, playerId)) endIntro(state, ctx);
    } else if (state.phase === 'briefing') {
      checkBriefing(state, ctx);
    } else if (state.phase === 'placing' && turn.actor === playerId) {
      advancePlacing(state, ctx);
    } else if (state.phase === 'thieves' && turn.actor === playerId) {
      stay(state, playerId);
      nextThief(state, ctx);
    } else if (state.phase === 'cops' && turn.actor === playerId) {
      log(state, 'all', { r: state.round, k: 'timeout', who: playerId });
      nextMember(state, ctx);
    } else if (state.phase === 'vote' && copsVoting(state, ctx).every((id) => state.votes[id])) {
      tally(state, ctx);
    }
  },

  // Briefing at the Dealer: everyone visits once to read their role. After that the Dealer
  // stands in the thieves' room showing their board (dealerIdleView) and nobody visits.
  canVisitDealer: (state, playerId, ctx) =>
    state.phase === 'briefing' && briefingMode(ctx) === 'dealer' && !state.ready[playerId],

  onDealerEnter(state, playerId) {
    if (state.phase === 'briefing') state.ready[playerId] = true;
  },

  onDealerLeave(state, _playerId, ctx) {
    checkBriefing(state, ctx);
  },

  dealerView(state, playerId, ctx): DealerView {
    return { kind: 'role', card: roleCard(state, ctx, playerId) };
  },

  publicView(state, ctx): PublicView {
    const last = state.reveals[state.reveals.length - 1];
    return {
      phase: state.phase,
      round: state.round,
      maxRounds: maxRounds(ctx),
      goal: goal(ctx),
      totalStars: ctx.config.totalStars,
      board: state.board,
      teams: state.teams,
      thieves: state.thieves,
      cops: copPositions(state),
      arrested: arrestedAt(state),
      turn: currentTurn(state),
      next: state.next,
      groupSeq: state.groupSeq,
      deadline: ctx.timerDeadline('turn'),
      total: ctx.timerTotal('turn'),
      log: logFor(state, 'cop', 40),
      reveals: state.reveals,
      banner:
        state.phase === 'intermission' && state.next === 'thieves' && last && last.round === state.round - 1
          ? last
          : null,
      voted: state.phase === 'vote' ? Object.keys(state.votes) : [],
      result: state.result,
      briefing:
        state.phase === 'briefing'
          ? { mode: briefingMode(ctx), ready: Object.keys(state.ready).filter((id) => state.ready[id]) }
          : null,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      hint: ctx.config.tutorial && state.round <= 1 ? hintFor(state) : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const side = sideOf(state, playerId) ?? 'red';
    const isThief = side === 'thieves';
    const isCorrupt = state.corrupt.includes(playerId);
    const turn = currentTurn(state);
    const thievesTurn = state.phase === 'thieves' || (state.phase === 'placing' && turn.side === 'thieves');
    const partnerId = isThief ? (state.thieves.find((id) => id !== playerId) ?? null) : null;
    const team = side === 'thieves' ? null : side;
    return {
      phase: state.phase,
      round: state.round,
      board: state.board,
      teams: state.teams,
      cops: copPositions(state),
      arrested: arrestedAt(state),
      next: state.next,
      side,
      corrupt: isCorrupt,
      corruptIds: isThief || isCorrupt ? [...state.corrupt] : null,
      myPos: state.pos[playerId] ?? null,
      turn,
      myTurn: turn.actor === playerId,
      deadline: ctx.timerDeadline('turn'),
      total: ctx.timerTotal('turn'),
      thief: isThief
        ? {
            arrested: !!state.arrested[playerId],
            partner: partnerId
              ? { id: partnerId, pos: state.pos[partnerId] ?? null, arrested: !!state.arrested[partnerId] }
              : null,
            held: teamStars(state),
            stars: thievesTurn ? [...state.stars] : null,
          }
        : null,
      inv: state.inv[playerId] ?? [],
      log: logFor(state, isThief ? 'thief' : isCorrupt ? 'corrupt' : 'cop'),
      vote:
        state.phase === 'vote' && team
          ? { candidates: state.teams[team].filter((id) => id !== playerId), mine: state.votes[playerId] ?? null }
          : null,
      role: roleCard(state, ctx, playerId),
      goal: goal(ctx),
      briefing: state.phase === 'briefing' ? { mode: briefingMode(ctx), ready: !!state.ready[playerId] } : null,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
    };
  },

  dealerIdleView(state, ctx): DealerView | null {
    // Before the board exists (tutorial, briefing) anyone may walk in: show nothing yet.
    if (state.phase === 'intro' || state.phase === 'briefing') return null;
    return {
      kind: 'board',
      phase: state.phase,
      round: state.round,
      maxRounds: maxRounds(ctx),
      board: state.board,
      teams: state.teams,
      stars: [...state.stars],
      goal: goal(ctx),
      held: teamStars(state),
      thieves: state.thieves.map((id) => ({
        id,
        pos: state.pos[id] ?? null,
        arrested: !!state.arrested[id],
        held: state.held[id]!,
      })),
      cops: copPositions(state),
      corruptIds: [...state.corrupt],
      turn: currentTurn(state),
      next: state.next,
      deadline: ctx.timerDeadline('turn'),
      total: ctx.timerTotal('turn'),
      log: logFor(state, 'thief', 30),
    };
  },

  // Remote screens (Host option): the thieves may open their board (the standing Dealer) on their
  // own screen, and every phone says which room — which call, when playing remotely — to be in.
  dealerAudience: (state) => [...state.thieves],

  playerSpace(state, playerId) {
    const side = sideOf(state, playerId);
    if (!side) return null;
    const ownRoom = SPACES[side];
    switch (state.phase) {
      case 'vote':
        // Each squad votes in its room; the thieves wait in theirs.
        return ownRoom;
      case 'intermission':
        return state.next === side ? ownRoom : SPACES.hall;
      case 'placing':
      case 'thieves':
      case 'cops':
        return currentTurn(state).side === side ? ownRoom : SPACES.hall;
      default:
        return SPACES.hall;
    }
  },
});
