import { defineGame, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { alchemyStep, resolveNight } from './night.ts';
import { RULES, SLIDES, type Hint } from './texts.ts';
import {
  DAWN_REVEAL,
  FIXED,
  dawnRevealMs,
  MAX_NEUTRALS,
  PICKABLE,
  POTIONS,
  ROLE_IDS,
  TIME_LIMITS,
  role,
  setupErrors,
  suggested,
  type AbilitySpec,
  type NightEvent,
  type Potion,
  type RolePick,
  type RoleId,
  type Setup,
  type SetupError,
  type Team,
} from './shared.ts';
import {
  apparentRole,
  currentWin,
  declareNeutralWin,
  emptyNight,
  emptyPerks,
  killPlayer,
  knownMates,
  living,
  roleOf,
  spend,
  teamOf,
  usesLeft,
  type Announcement,
  type Config,
  type Ctx,
  type Death,
  type EndResult,
  type LiveEvent,
  type LogEntry,
  type Outcome,
  type Phase,
  type Report,
  type Revealed,
  type State,
  type Submission,
  type Win,
} from './state.ts';

export type { Config, Phase, Report, State, Death, Revealed, Announcement, LiveEvent, Outcome, EndResult, LogEntry };

export const manifest = manifestJson as GameManifest;

// ---------------------------------------------------------------- Views

type Rules = Pick<Setup, 'killMode' | 'abilityMode' | 'spectator' | 'oratorVotes' | 'revealDead'>;

export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  tvClass: RoleId | null;
  /** First night and day with the tutorial on: a one-line tip for the TV. */
  hint: Hint | null;
  day: number;
  night: number;
  deadline: number | null;
  total: number | null;
  hostId: string;
  /** During setup: what the Host is building (counts only — never forced/banned classes). */
  setup: null | { players: number; impostors: number; neutrals: number; innocents: number; ready: boolean };
  rules: Rules;
  times: Setup['times'];
  comp: State['comp'];
  seats: string[];
  alive: string[];
  deaths: Death[];
  revealed: Record<string, Revealed>;
  /** Who already acted in this phase (never what; empty at night). */
  acted: string[];
  /** Discussion skip requests: how many of how many. */
  skips: null | { count: number; of: number };
  dawn: null | { deaths: string[]; suspect: string | null; poisoned: boolean };
  news: Announcement[];
  live: LiveEvent[];
  tally: Record<string, number> | null;
  condemned: string | null;
  outcome: Outcome | null;
  result: EndResult | null;
}

export interface NightPanel {
  done: boolean;
  entangled: boolean;
  acked: boolean;
  /** The class's own night ability; null when it has none (or no uses left). */
  ability: null | { role: RoleId; spec: AbilitySpec; slots: string[][]; usesLeft: number | null };
  /** Players without a night ability make a decoy pick. */
  decoy: string[] | null;
  mine: { targets: string[]; guess?: RoleId; potion?: Potion } | null;
  kill: null | {
    mode: Setup['killMode'];
    candidates: string[];
    /** undefined = not chosen yet, null = chose no kill. */
    mine: string | null | undefined;
    /** Fellow Impostors' current picks. */
    mates: Record<string, string | null>;
    /** Killing replaces the ability tonight (and vice versa). */
    exclusive: boolean;
  };
  kill2: null | { candidates: string[]; mine: string | null | undefined };
  /** Alchemist brewing tonight (choose a potion instead of a target). */
  brew: boolean;
  /** A potion the player can use tonight. */
  potion: null | { kind: Potion; candidates: string[]; mine: string | null | undefined };
}

export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  tvClass: RoleId | null;
  day: number;
  deadline: number | null;
  total: number | null;
  isHost: boolean;
  seat: boolean;
  alive: boolean;
  role: RoleId | null;
  team: Team | null;
  usesLeft: number | null;
  mates: { id: string; role: RoleId; alive: boolean }[];
  twin: string | null;
  bounty: RoleId | null;
  journalistHits: number | null;
  prophecy: string | null;
  /** Telepath link partner. */
  link: string | null;
  /** A potion held (usable from the night after it was handed over). */
  potion: null | { kind: Potion; usable: boolean };
  /** Alchemist's brewed potion and whether it was handed over. */
  alchemy: null | { potion: Potion; given: boolean };
  /** Parasite's host and votes stolen so far. */
  parasite: null | { host: string | null; leeched: number };
  /** Thief who already stole (role/team show the stolen class). */
  stole: boolean;
  /** Phantom struck tonight or earlier: dies at the end of this/next night. */
  lingering: boolean;
  /** Pacifist Tracker doomed by an expulsion. */
  doomed: boolean;
  setup: null | { setup: Setup; errors: SetupError[]; players: number; suggested: { impostors: number; neutrals: number } };
  acked: boolean;
  night: NightPanel | null;
  report: Report[];
  psych: boolean | null;
  spokes: null | { offer: NightEvent[]; done: boolean };
  hist: null | { offer: NightEvent[] | null; stored: NightEvent[]; canReveal: boolean };
  autopsy: null | { candidates: string[]; results: { target: string; team: Team }[]; canUse: boolean };
  vote: null | { mine: string | null; candidates: string[]; special: 'sniper' | 'exorcist' | 'shapeshifter' | null };
  appeal: null | { appealed: boolean };
  /** Discussion: this player's skip request and the tally. */
  skip: null | { mine: boolean; count: number; of: number };
  omni: null | { roles: Record<string, RoleId>; log: LogEntry[] };
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null }
  | { type: 'tvClass'; role: RoleId | null }
  | { type: 'setup'; patch: Partial<Setup> }
  | { type: 'start' }
  | { type: 'ack' }
  | { type: 'ability'; targets: string[]; guess?: RoleId; potion?: Potion }
  | { type: 'kill'; target: string | null }
  | { type: 'kill2'; target: string | null }
  | { type: 'potion'; target: string | null }
  | { type: 'shift'; target: string }
  | { type: 'spokes'; index: number | null; signed?: boolean }
  | { type: 'histStore'; index: number | null; replace?: number }
  | { type: 'histReveal'; index: number }
  | { type: 'autopsy'; target: string }
  | { type: 'skip' }
  | { type: 'vote'; target: string }
  | { type: 'snipe'; target: string; guess: RoleId }
  | { type: 'exorcise'; target: string }
  | { type: 'appeal' }
  | { type: 'again' }
  | { type: 'finish' };

// ---------------------------------------------------------------- Helpers

const sec = (n: number) => n * 1000;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isRole = (v: unknown): v is RoleId => isStr(v) && (ROLE_IDS as string[]).includes(v);
const isIndex = (v: unknown, list: readonly unknown[] | undefined): v is number =>
  typeof v === 'number' && Number.isInteger(v) && !!list && v >= 0 && v < list.length;

/** The Host: the room's Host while connected, else p1, else the first connected participant. */
function hostId(ctx: Ctx): string {
  return (
    ctx.players.find((p) => p.isHost && p.connected) ??
    ctx.players.find((p) => p.id === 'p1' && p.connected) ?? ctx.players.find((p) => p.connected) ?? ctx.players[0])?.id ?? 'p1';
}

const connectedIds = (ctx: Ctx) => ctx.players.filter((p) => p.connected).map((p) => p.id);
const isConnected = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.connected);

function defaultSetup(players: number): Setup {
  return {
    ...suggested(players),
    picks: {},
    killMode: 'team',
    abilityMode: 'or',
    spectator: 'blind',
    oratorVotes: 2,
    revealDead: false,
    times: {
      dawn: TIME_LIMITS.dawn.default,
      day: TIME_LIMITS.day.default,
      vote: TIME_LIMITS.vote.default,
      night: TIME_LIMITS.night.default,
    },
  };
}

function patchSetup(cur: Setup, patch: unknown): Setup | null {
  if (!patch || typeof patch !== 'object') return null;
  const p = patch as Record<string, unknown>;
  const out: Setup = JSON.parse(JSON.stringify(cur));
  const int = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) ? Math.min(max, Math.max(min, v)) : null;
  const imp = int(p.impostors, 1, 15);
  if (imp !== null) out.impostors = imp;
  const neu = int(p.neutrals, 0, MAX_NEUTRALS);
  if (neu !== null) out.neutrals = neu;
  if (p.picks && typeof p.picks === 'object') {
    for (const [k, v] of Object.entries(p.picks as Record<string, unknown>)) {
      if (!(PICKABLE as string[]).includes(k) || !['auto', 'force', 'ban'].includes(v as string)) continue;
      if (v === 'auto') delete out.picks[k as RoleId];
      else out.picks[k as RoleId] = v as RolePick;
    }
  }
  if (p.killMode === 'team' || p.killMode === 'each') out.killMode = p.killMode;
  if (p.abilityMode === 'or' || p.abilityMode === 'and') out.abilityMode = p.abilityMode;
  if (p.spectator === 'blind' || p.spectator === 'omniscient') out.spectator = p.spectator;
  if (p.oratorVotes === 2 || p.oratorVotes === 3) out.oratorVotes = p.oratorVotes;
  if (typeof p.revealDead === 'boolean') out.revealDead = p.revealDead;
  if (p.times && typeof p.times === 'object') {
    for (const [k, lim] of Object.entries(TIME_LIMITS)) {
      const v = (p.times as Record<string, unknown>)[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      out.times[k as keyof Setup['times']] = Math.min(lim.max, Math.max(lim.min, Math.round(v / lim.step) * lim.step));
    }
  }
  return out;
}

function freshState(setup: Setup): State {
  return {
    phase: 'setup',
    slide: 0,
    tvRules: null,
    tvClass: null,
    setup,
    day: 0,
    nightNo: 0,
    seats: [],
    roles: {},
    alive: {},
    comp: null,
    deaths: [],
    revealed: {},
    uses: {},
    perks: emptyPerks(),
    night: emptyNight(),
    reports: {},
    events: [],
    log: [],
    dawn: null,
    news: [],
    votes: {},
    voteUsed: {},
    live: [],
    tally: null,
    condemned: null,
    appealed: false,
    outcome: null,
    autopsies: {},
    acks: {},
    daySkips: {},
    dayTotal: 0,
    win: null,
    result: null,
  };
}

function deal(s: State, ctx: Ctx) {
  const seats = connectedIds(ctx);
  const { impostors, neutrals, picks } = s.setup;
  const innocents = seats.length - impostors - neutrals;
  const choose = (team: Team, count: number, common: RoleId | null) => {
    let pool = PICKABLE.filter((id) => role(id).team === team && picks[id] !== 'ban');
    if (team === 'impostor' && impostors < 2) pool = pool.filter((id) => id !== 'twin');
    const forced = ctx.rng.shuffle(pool.filter((id) => picks[id] === 'force'));
    const auto = ctx.rng.shuffle(pool.filter((id) => picks[id] !== 'force'));
    const out = [...forced, ...auto].slice(0, count);
    while (common && out.length < count) out.push(common);
    return out;
  };
  const roles = ctx.rng.shuffle([
    ...choose('impostor', impostors, 'impostor'),
    ...choose('neutral', neutrals, null),
    ...choose('innocent', innocents, 'innocent'),
  ]);
  const order = ctx.rng.shuffle(seats);
  Object.assign(s, freshState(s.setup));
  s.seats = seats;
  order.forEach((id, i) => {
    s.roles[id] = roles[i] ?? 'innocent';
    s.alive[id] = true;
  });
  s.comp = { impostors, neutrals, innocents };

  const imps = seats.filter((id) => teamOf(s, id) === 'impostor');
  for (const twin of imps.filter((id) => roleOf(s, id) === 'twin')) {
    const others = imps.filter((id) => id !== twin && !s.perks.twinOf[id]);
    if (!others.length) continue;
    const partner = ctx.rng.pick(others);
    s.perks.twinOf[twin] = partner;
    s.perks.twinOf[partner] = twin;
  }
  for (const hunter of seats.filter((id) => roleOf(s, id) === 'bountyHunter')) {
    s.perks.bounty[hunter] = imps.length ? roleOf(s, ctx.rng.pick(imps)) : null;
  }
}

// ---------------------------------------------------------------- Phases

function setPhase(s: State, ctx: Ctx, phase: Phase, ms: number | null) {
  s.phase = phase;
  s.acks = {};
  if (ms) ctx.setTimer('phase', ms);
  else ctx.clearTimer('phase');
}

function finish(s: State, ctx: Ctx, win: Win) {
  const winners =
    win.side === 'neutral' && win.neutral
      ? [win.neutral]
      : win.side === 'innocent' || win.side === 'impostor'
        ? s.seats.filter((id) => teamOf(s, id) === win.side)
        : [];
  // A living Nomad wins alongside whoever wins.
  for (const id of living(s)) if (roleOf(s, id) === 'nomad' && !winners.includes(id)) winners.push(id);
  s.result = {
    side: win.side,
    neutral: win.neutral ? { id: win.neutral, role: roleOf(s, win.neutral) } : null,
    winners,
    roles: { ...s.roles },
    thieves: Object.keys(s.perks.stolen),
  };
  setPhase(s, ctx, 'end', null);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'end', 2300);
}

/** Ends the match if someone has won; true when it did. */
function settle(s: State, ctx: Ctx): boolean {
  const win = currentWin(s);
  if (!win) return false;
  finish(s, ctx, win);
  return true;
}

function startNight(s: State, ctx: Ctx) {
  s.nightNo += 1;
  s.night = emptyNight();
  s.votes = {};
  s.live = [];
  s.tally = null;
  s.condemned = null;
  s.outcome = null;
  s.perks.shift = null;
  setPhase(s, ctx, 'night', sec(s.setup.times.night));
  ctx.emit('sound', 'phase');
}

function endNight(s: State, ctx: Ctx) {
  resolveNight(s, ctx);
  if (settle(s, ctx)) return;
  s.news = [];
  setPhase(s, ctx, 'report', FIXED.report);
  ctx.emit('sound', 'tick');
}

/** Early morning opens with the staged death reveal; the timer always leaves time after it. */
function startDawn(s: State, ctx: Ctx) {
  const deaths = s.dawn?.deaths.length ?? 0;
  setPhase(s, ctx, 'dawn', Math.max(sec(s.setup.times.dawn), dawnRevealMs(deaths) + 6000));
  for (let at = 0; at < DAWN_REVEAL.lead - 400; at += DAWN_REVEAL.heartbeat) ctx.emit('sound', 'tick', at);
  ctx.emit('sound', 'drumroll', DAWN_REVEAL.lead - 2300);
  if (deaths === 0) ctx.emit('sound', 'round', DAWN_REVEAL.lead);
  for (let i = 0; i < deaths; i++) {
    ctx.emit('sound', 'reveal', DAWN_REVEAL.lead + i * DAWN_REVEAL.step);
    ctx.emit('fx', 'death', DAWN_REVEAL.lead + i * DAWN_REVEAL.step);
  }
}

function startVote(s: State, ctx: Ctx) {
  s.votes = {};
  s.voteUsed = {};
  s.live = [];
  setPhase(s, ctx, 'vote', sec(s.setup.times.vote));
  ctx.emit('sound', 'phase');
}

function weight(s: State, id: string) {
  return roleOf(s, id) === 'orator' ? s.setup.oratorVotes : 1;
}

function endVote(s: State, ctx: Ctx) {
  const final: Record<string, string> = {};
  const maestro = s.perks.maestro;
  const shift = s.perks.shift && s.alive[s.perks.shift.shifter] && s.alive[s.perks.shift.target] ? s.perks.shift : null;
  for (const voter of living(s)) {
    if (shift && voter === shift.target) continue; // the imitated player's ballot is the Shapeshifter's
    let target = s.votes[voter];
    if (target !== undefined && maestro && maestro.controlled === voter && s.alive[maestro.target]) {
      target = maestro.target;
    } else if (target !== undefined && s.perks.trickster.includes(voter)) {
      const others = living(s).filter((id) => id !== voter && id !== target);
      if (others.length) target = ctx.rng.pick(others);
    }
    if (target !== undefined) final[voter] = target;
  }
  for (const voter of living(s)) {
    if (s.votes[voter] !== undefined) s.perks.votesCast[voter] = (s.perks.votesCast[voter] ?? 0) + 1;
  }

  for (const [cultist, picks] of Object.entries(s.perks.cultist)) {
    if (s.alive[cultist] && picks.length === 3 && picks.every((id) => final[id] === cultist)) declareNeutralWin(s, cultist);
  }
  s.perks.cultist = {};
  s.perks.maestro = null;
  s.perks.trickster = [];
  if (s.win && settle(s, ctx)) return;

  const counts: Record<string, number> = {};
  for (const [voter, target] of Object.entries(final)) {
    const w = weight(s, voter) + (shift && voter === shift.shifter ? weight(s, shift.target) : 0);
    counts[target] = (counts[target] ?? 0) + w;
  }
  if (shift) {
    const a = counts[shift.shifter] ?? 0;
    const b = counts[shift.target] ?? 0;
    setCount(counts, shift.shifter, b);
    setCount(counts, shift.target, a);
  }
  const leeches: { parasite: string; host: string; votes: number }[] = [];
  for (const [parasite, host] of Object.entries(s.perks.host)) {
    if (!s.alive[parasite] || !s.alive[host]) continue;
    const votes = Math.floor((counts[host] ?? 0) / 2);
    if (votes === 0) continue;
    setCount(counts, host, (counts[host] ?? 0) - votes);
    setCount(counts, parasite, (counts[parasite] ?? 0) + votes);
    leeches.push({ parasite, host, votes });
  }
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  s.tally = counts;
  s.condemned = max > 0 && top.length === 1 && top[0] !== 'skip' ? top[0]! : null;
  for (const l of leeches) {
    if (l.host === s.condemned) continue;
    const total = (s.perks.leeched[l.parasite] = (s.perks.leeched[l.parasite] ?? 0) + l.votes);
    if (total >= 5) declareNeutralWin(s, l.parasite);
  }
  if (s.win && settle(s, ctx)) return;
  s.appealed = false;
  setPhase(s, ctx, 'verdict', FIXED.verdict);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
}

function endVerdict(s: State, ctx: Ctx) {
  const target = s.condemned;
  if (target && s.alive[target] && !s.appealed) {
    killPlayer(s, target, 'vote', ctx);
    s.outcome = { k: 'expelled', target };
    // Pacifist Trackers who voted for an expelled Innocent die at the end of the next night.
    if (teamOf(s, target) === 'innocent') {
      for (const id of living(s)) if (roleOf(s, id) === 'pacifistTracker' && s.votes[id] === target) s.perks.doomed[id] = s.nightNo + 1;
    }
    const shift = s.perks.shift;
    if (shift && shift.target === target) {
      s.revealed[shift.shifter] = { ...s.revealed[shift.shifter], role: 'shapeshifter' };
      s.live.push({ k: 'shifted', shifter: shift.shifter });
    }
  } else {
    s.outcome = { k: target && s.appealed ? 'annulled' : 'none', target };
  }
  if (settle(s, ctx)) return;
  setPhase(s, ctx, 'dusk', FIXED.dusk);
  ctx.emit('sound', s.outcome.k === 'expelled' ? 'reveal' : 'tick');
}

function onPhaseTimer(s: State, ctx: Ctx) {
  switch (s.phase) {
    case 'reveal':
      return startNight(s, ctx);
    case 'night':
      return endNight(s, ctx);
    case 'report':
      return startDawn(s, ctx);
    case 'dawn':
      s.daySkips = {};
      s.dayTotal = sec(s.setup.times.day);
      setPhase(s, ctx, 'day', s.dayTotal);
      ctx.emit('sound', 'phase');
      return;
    case 'day':
      return startVote(s, ctx);
    case 'vote':
      return endVote(s, ctx);
    case 'verdict':
      return endVerdict(s, ctx);
    case 'dusk':
      return startNight(s, ctx);
    default:
      return;
  }
}

// ---------------------------------------------------------------- Night rules

function hasNightAbility(s: State, id: string) {
  const rid = roleOf(s, id);
  if (rid === 'alchemist') return alchemyStep(s, id) !== null;
  const spec = role(rid).ability;
  return !!spec && spec.when === 'night' && usesLeft(s, id) !== 0;
}

function slotsFor(s: State, id: string): string[][] {
  const rid = roleOf(s, id);
  const spec = role(rid).ability;
  if (!spec) return [];
  const pool = living(s).filter((x) => spec.self || x !== id);
  if (rid === 'maestro') return [pool.filter((x) => !knownMates(s, id).includes(x)), pool];
  return Array.from({ length: spec.targets }, () => pool);
}

/** Living players an Impostor may kill: everyone but themselves and the partners they know. */
function killCandidates(s: State, id: string) {
  const mates = knownMates(s, id);
  return living(s).filter((x) => x !== id && !mates.includes(x));
}

/** A potion the player holds and may use tonight. */
function usablePotion(s: State, id: string) {
  const p = s.perks.potion[id];
  return p && p.from <= s.nightNo ? p : null;
}

function nightDone(s: State, id: string) {
  if (s.perks.entangled[id] === s.nightNo) return !!s.night.ack[id];
  if (usablePotion(s, id) && !(id in s.night.potion)) return false;
  const ability = !!s.night.ability[id];
  if (teamOf(s, id) !== 'impostor') return ability;
  const kill = id in s.night.kill;
  const extra = s.perks.extraKill[id] === s.nightNo ? id in s.night.kill2 : true;
  if (!hasNightAbility(s, id)) return kill && extra;
  if (s.setup.killMode === 'each' && s.setup.abilityMode === 'or') return (kill || ability) && extra;
  return kill && ability && extra;
}

function exclusiveKill(s: State, id: string) {
  return s.setup.killMode === 'each' && s.setup.abilityMode === 'or' && hasNightAbility(s, id);
}

function validAbility(s: State, id: string, a: Record<string, unknown>): Omit<Submission, 'seq'> | null {
  if (!Array.isArray(a.targets) || !a.targets.every(isStr)) return null;
  const targets = a.targets as string[];
  if (new Set(targets).size !== targets.length) return null;
  if (!hasNightAbility(s, id)) {
    // A decoy pick (or "skip"): Impostors without an ability use the kill instead.
    if (teamOf(s, id) === 'impostor' || targets.length > 1) return null;
    if (targets.length === 0) return { targets };
    return s.alive[targets[0]!] && targets[0] !== id ? { targets } : null;
  }
  if (alchemyStep(s, id) === 'brew') {
    if (targets.length) return null;
    return POTIONS.includes(a.potion as Potion) ? { targets, potion: a.potion as Potion } : { targets };
  }
  if (targets.length === 0) return { targets };
  const spec = role(roleOf(s, id)).ability!;
  const slots = slotsFor(s, id);
  if (targets.length !== spec.targets || !targets.every((t, i) => slots[i]?.includes(t))) return null;
  if (spec.guess) return isRole(a.guess) ? { targets, guess: a.guess } : null;
  return { targets };
}

function setCount(counts: Record<string, number>, id: string, n: number) {
  if (n > 0) counts[id] = n;
  else delete counts[id];
}

function maybeEndNight(s: State, ctx: Ctx) {
  if (s.phase !== 'night') return;
  if (living(s).filter((id) => isConnected(ctx, id)).every((id) => nightDone(s, id))) endNight(s, ctx);
}

// ---------------------------------------------------------------- Day rules

function purgeVotes(s: State) {
  for (const [voter, target] of Object.entries(s.votes)) {
    // A vote on a player who just died becomes Skip (deleting it would clear the voter's check on the TV).
    if (!s.alive[voter]) delete s.votes[voter];
    else if (target !== 'skip' && !s.alive[target]) s.votes[voter] = 'skip';
  }
}

function maybeEndVote(s: State, ctx: Ctx) {
  if (s.phase !== 'vote') return;
  if (living(s).filter((id) => isConnected(ctx, id)).every((id) => s.votes[id] !== undefined)) endVote(s, ctx);
}

function afterLiveDeath(s: State, ctx: Ctx) {
  purgeVotes(s);
  ctx.emit('sound', 'reveal');
  ctx.emit('fx', 'shot');
  if (settle(s, ctx)) return;
  maybeEndVote(s, ctx);
}

function skipTally(s: State, ctx: Ctx) {
  const voters = living(s).filter((id) => isConnected(ctx, id) || s.daySkips[id]);
  return { count: voters.filter((id) => s.daySkips[id]).length, of: voters.length };
}

function allAcked(s: State, ctx: Ctx) {
  return s.seats.filter((id) => s.alive[id] && isConnected(ctx, id)).every((id) => s.acks[id]);
}

// ---------------------------------------------------------------- Game

/** Safety net: a tutorial nobody advances (the Host left) gives way to the setup. */
const INTRO_MAX_MS = 5 * 60_000;

function endIntro(s: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  s.phase = 'setup';
  s.slide = 0;
}

function hintFor(s: State, ctx: Ctx): Hint | null {
  if (!ctx.config.tutorial || s.nightNo !== 1 || s.day > 1) return null;
  const map: Partial<Record<Phase, Hint>> = { night: 'night', report: 'report', dawn: 'dawn', day: 'day', vote: 'vote', verdict: 'verdict' };
  return map[s.phase] ?? null;
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const s = freshState(defaultSetup(connectedIds(ctx).length));
    if (ctx.config.tutorial) {
      s.phase = 'intro';
      ctx.setTimer('intro', INTRO_MAX_MS);
    }
    return s;
  },

  onAction(s, pid, raw, ctx) {
    if (!raw || typeof raw !== 'object') return;
    const a = raw as Record<string, unknown>;
    const isHost = pid === hostId(ctx);
    const seat = s.seats.includes(pid);
    const alive = !!s.alive[pid];
    const rid = seat ? roleOf(s, pid) : null;

    // ---- Host and phase-flow actions
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
        // Shared screens follow the Host only; one overlay at a time.
        if (!isHost || !(a.page === null || isIndex(a.page, RULES))) return;
        s.tvRules = a.page as number | null;
        if (a.page !== null) s.tvClass = null;
        return;
      }
      case 'tvClass': {
        if (!isHost || !(a.role === null || isRole(a.role))) return;
        s.tvClass = a.role as RoleId | null;
        if (a.role !== null) s.tvRules = null;
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
        if (setupErrors(s.setup, connectedIds(ctx).length).length) return;
        deal(s, ctx);
        setPhase(s, ctx, 'reveal', FIXED.reveal);
        ctx.emit('sound', 'round');
        return;
      }
      case 'again': {
        if (s.phase !== 'end' || !isHost) return;
        Object.assign(s, freshState(s.setup));
        ctx.clearTimer('phase');
        return;
      }
      case 'finish': {
        if (s.phase !== 'end' || !isHost) return;
        ctx.end({ scores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])) });
        return;
      }
    }

    if (!seat || !alive || !rid) return;

    switch (a.type) {
      case 'ack': {
        if (s.phase === 'reveal' && !s.acks[pid]) {
          s.acks[pid] = true;
          if (allAcked(s, ctx)) startNight(s, ctx);
        } else if (s.phase === 'night' && s.perks.entangled[pid] === s.nightNo && !s.night.ack[pid]) {
          s.night.ack[pid] = true;
          maybeEndNight(s, ctx);
        }
        return;
      }
      case 'ability': {
        if (s.phase !== 'night' || s.perks.entangled[pid] === s.nightNo) return;
        const sub = validAbility(s, pid, a);
        if (!sub) return;
        s.night.ability[pid] = { ...sub, seq: ++s.night.seq };
        if (sub.targets.length && exclusiveKill(s, pid)) delete s.night.kill[pid];
        maybeEndNight(s, ctx);
        return;
      }
      case 'kill':
      case 'kill2': {
        if (s.phase !== 'night' || s.perks.entangled[pid] === s.nightNo || teamOf(s, pid) !== 'impostor') return;
        if (a.type === 'kill2' && s.perks.extraKill[pid] !== s.nightNo) return;
        const target = a.target;
        if (target !== null && !(isStr(target) && killCandidates(s, pid).includes(target))) return;
        const slot = a.type === 'kill' ? s.night.kill : s.night.kill2;
        slot[pid] = { target, seq: ++s.night.seq };
        if (a.type === 'kill' && target !== null && exclusiveKill(s, pid)) delete s.night.ability[pid];
        maybeEndNight(s, ctx);
        return;
      }
      case 'potion': {
        const held = usablePotion(s, pid);
        if (s.phase !== 'night' || !held || s.perks.entangled[pid] === s.nightNo) return;
        const target = a.target;
        if (target !== null && !(isStr(target) && s.alive[target] && !(held.kind === 'kill' && target === pid))) return;
        s.night.potion[pid] = { target, seq: ++s.night.seq };
        maybeEndNight(s, ctx);
        return;
      }
      case 'shift': {
        const target = a.target;
        if (s.phase !== 'vote' || rid !== 'shapeshifter' || s.perks.shift || !usesLeft(s, pid)) return;
        if (!isStr(target) || !s.alive[target] || target === pid) return;
        spend(s, pid);
        s.perks.shift = { shifter: pid, target };
        return;
      }
      case 'spokes': {
        const dawn = s.dawn;
        const offer = dawn?.spokes[pid];
        if (s.phase !== 'dawn' || !dawn || !offer || dawn.spokesDone[pid]) return;
        if (a.index !== null && !isIndex(a.index, offer)) return;
        dawn.spokesDone[pid] = true;
        if (a.index !== null) {
          s.news.push({ by: 'spokesperson', signer: a.signed === true ? pid : null, event: offer[a.index]! });
          ctx.emit('sound', 'reveal');
        }
        return;
      }
      case 'histStore': {
        const dawn = s.dawn;
        const offer = dawn?.hist[pid];
        if (s.phase !== 'dawn' || !dawn || !offer || dawn.histDone[pid]) return;
        const stored = s.perks.historian[pid] ?? [];
        if (a.index === null) {
          dawn.histDone[pid] = true;
          return;
        }
        if (!isIndex(a.index, offer)) return;
        if (stored.length >= 2) {
          if (!isIndex(a.replace, stored)) return;
          stored.splice(a.replace, 1);
        }
        stored.push(offer[a.index]!);
        s.perks.historian[pid] = stored;
        dawn.histDone[pid] = true;
        return;
      }
      case 'histReveal': {
        const stored = s.perks.historian[pid];
        if ((s.phase !== 'day' && s.phase !== 'vote') || rid !== 'historian' || !usesLeft(s, pid)) return;
        if (!isIndex(a.index, stored)) return;
        const [event] = stored!.splice(a.index, 1);
        spend(s, pid);
        s.news.push({ by: 'historian', signer: null, event: event! });
        ctx.emit('sound', 'reveal');
        return;
      }
      case 'autopsy': {
        if ((s.phase !== 'dawn' && s.phase !== 'day') || rid !== 'coroner' || !usesLeft(s, pid)) return;
        const target = a.target;
        const done = s.autopsies[pid] ?? [];
        if (!isStr(target) || !s.seats.includes(target) || s.alive[target] || done.some((x) => x.target === target)) return;
        spend(s, pid);
        s.autopsies[pid] = [...done, { target, team: teamOf(s, target) }];
        return;
      }
      case 'vote': {
        const target = a.target;
        if (s.phase !== 'vote' || !isStr(target)) return;
        if (target !== 'skip' && (!s.alive[target] || target === pid)) return;
        s.votes[pid] = target;
        maybeEndVote(s, ctx);
        return;
      }
      case 'snipe': {
        const target = a.target;
        if (s.phase !== 'vote' || rid !== 'sniper' || s.voteUsed[pid]) return;
        if (!isStr(target) || !s.alive[target] || target === pid || !isRole(a.guess)) return;
        s.voteUsed[pid] = true;
        if (apparentRole(s, target) === a.guess) {
          killPlayer(s, target, 'day', ctx);
          s.revealed[target] = { ...s.revealed[target], role: a.guess };
          s.live.push({ k: 'snipe', target, role: a.guess });
        } else {
          killPlayer(s, pid, 'day', ctx);
          s.revealed[pid] = { ...s.revealed[pid], role: 'sniper' };
          s.live.push({ k: 'snipeFail', sniper: pid });
        }
        afterLiveDeath(s, ctx);
        return;
      }
      case 'exorcise': {
        const target = a.target;
        if (s.phase !== 'vote' || rid !== 'exorcist' || s.voteUsed[pid]) return;
        if (!isStr(target) || !s.alive[target] || target === pid) return;
        s.voteUsed[pid] = true;
        if (teamOf(s, target) === 'impostor') {
          s.revealed[pid] = { ...s.revealed[pid], role: 'exorcist' };
          s.revealed[target] = { ...s.revealed[target], team: 'impostor' };
          s.live.push({ k: 'exorcise', exorcist: pid, target });
          ctx.emit('sound', 'reveal');
          ctx.emit('fx', 'exorcise');
        } else {
          killPlayer(s, pid, 'day', ctx);
          killPlayer(s, target, 'day', ctx);
          s.live.push({ k: 'exorciseFail', ids: [pid, target].sort() });
          afterLiveDeath(s, ctx);
        }
        return;
      }
      case 'skip': {
        // Each living player's request cuts the remaining discussion by an equal share; all of them end it.
        if (s.phase !== 'day' || s.daySkips[pid]) return;
        const pending = living(s).filter((id) => isConnected(ctx, id) && !s.daySkips[id]).length;
        s.daySkips[pid] = true;
        const deadline = ctx.timerDeadline('phase');
        const remaining = deadline === null ? 0 : Math.max(0, deadline - ctx.now);
        if (pending <= 1 || remaining === 0) startVote(s, ctx);
        else ctx.setTimer('phase', Math.round((remaining * (pending - 1)) / pending));
        return;
      }
      case 'appeal': {
        if (s.phase !== 'verdict' || rid !== 'lawyer' || !s.condemned || s.appealed || !usesLeft(s, pid)) return;
        spend(s, pid);
        s.appealed = true;
        return;
      }
    }
  },

  onTimer(s, key, ctx) {
    if (key === 'phase') onPhaseTimer(s, ctx);
    else if (key === 'intro' && s.phase === 'intro') endIntro(s, ctx);
  },

  onPlayerTimeout(s, pid, ctx) {
    // The Host left during the tutorial: nobody else can advance it.
    if (s.phase === 'intro') {
      if (!ctx.players.some((p) => p.isHost && p.connected)) endIntro(s, ctx);
      return;
    }
    if (s.phase === 'setup' || s.phase === 'end' || !s.alive[pid]) return;
    killPlayer(s, pid, 'left', ctx);
    purgeVotes(s);
    if (settle(s, ctx)) return;
    if (s.phase === 'reveal' && allAcked(s, ctx)) startNight(s, ctx);
    maybeEndNight(s, ctx);
    maybeEndVote(s, ctx);
  },

  publicView(s, ctx): PublicView {
    const players = connectedIds(ctx).length;
    const dayPhases: Phase[] = ['dawn', 'day', 'vote', 'verdict', 'dusk'];
    const verdictish = s.phase === 'verdict' || s.phase === 'dusk';
    const acted =
      s.phase === 'reveal'
        ? Object.keys(s.acks)
        : s.phase === 'day'
          ? Object.keys(s.daySkips)
          : s.phase === 'vote'
            ? Object.keys(s.votes)
            : [];
    const revealed: Record<string, Revealed> = { ...s.revealed };
    if (s.setup.revealDead) for (const d of s.deaths) revealed[d.id] = { ...revealed[d.id], role: apparentRole(s, d.id) };
    return {
      phase: s.phase,
      slide: s.slide,
      slides: SLIDES.length,
      tvRules: s.tvRules,
      tvClass: s.tvClass,
      hint: hintFor(s, ctx),
      day: s.day,
      night: s.nightNo,
      deadline: ctx.timerDeadline('phase'),
      total: s.phase === 'day' ? s.dayTotal : ctx.timerTotal('phase'),
      hostId: hostId(ctx),
      setup:
        s.phase === 'setup'
          ? {
              players,
              impostors: s.setup.impostors,
              neutrals: s.setup.neutrals,
              innocents: players - s.setup.impostors - s.setup.neutrals,
              ready: setupErrors(s.setup, players).length === 0,
            }
          : null,
      rules: {
        killMode: s.setup.killMode,
        abilityMode: s.setup.abilityMode,
        spectator: s.setup.spectator,
        oratorVotes: s.setup.oratorVotes,
        revealDead: s.setup.revealDead,
      },
      times: s.setup.times,
      comp: s.comp,
      seats: s.seats,
      alive: living(s),
      // Same-day deaths of one cause in id order: resolution order would hint at who acted.
      deaths: [...s.deaths].sort((a, b) => a.day - b.day || a.cause.localeCompare(b.cause) || a.id.localeCompare(b.id)),
      revealed,
      acted,
      skips: s.phase === 'day' ? skipTally(s, ctx) : null,
      dawn:
        s.dawn && dayPhases.includes(s.phase)
          ? { deaths: s.dawn.deaths, suspect: s.dawn.suspect, poisoned: s.dawn.poisoned }
          : null,
      news: dayPhases.includes(s.phase) ? s.news : [],
      live: s.phase === 'vote' || verdictish ? s.live : [],
      tally: verdictish ? s.tally : null,
      condemned: verdictish ? s.condemned : null,
      outcome: s.phase === 'dusk' ? s.outcome : null,
      result: s.phase === 'end' ? s.result : null,
    };
  },

  playerView(s, pid, ctx): PlayerView {
    const seat = s.seats.includes(pid) && s.phase !== 'setup';
    const rid = seat ? roleOf(s, pid) : null;
    const alive = seat && !!s.alive[pid];
    const team = rid ? role(rid).team : null;
    const isHost = pid === hostId(ctx);
    const players = connectedIds(ctx).length;
    const afterNight: Phase[] = ['report', 'dawn', 'day', 'vote', 'verdict', 'dusk'];
    const mateIds = seat ? knownMates(s, pid) : [];

    let night: NightPanel | null = null;
    if (s.phase === 'night' && alive && rid) {
      const entangled = s.perks.entangled[pid] === s.nightNo;
      const hasAbility = hasNightAbility(s, pid);
      const isImp = team === 'impostor';
      const mine = s.night.ability[pid];
      night = {
        done: nightDone(s, pid),
        entangled,
        acked: !!s.night.ack[pid],
        ability:
          hasAbility && !entangled
            ? { role: rid, spec: role(rid).ability!, slots: slotsFor(s, pid), usesLeft: usesLeft(s, pid) }
            : null,
        decoy: !hasAbility && !isImp && !entangled ? living(s).filter((id) => id !== pid) : null,
        mine: mine ? { targets: mine.targets, ...(mine.guess ? { guess: mine.guess } : {}), ...(mine.potion ? { potion: mine.potion } : {}) } : null,
        kill:
          isImp && !entangled
            ? {
                mode: s.setup.killMode,
                candidates: killCandidates(s, pid),
                mine: s.night.kill[pid]?.target,
                mates: Object.fromEntries(mateIds.filter((id) => id in s.night.kill).map((id) => [id, s.night.kill[id]!.target])),
                exclusive: exclusiveKill(s, pid),
              }
            : null,
        kill2:
          isImp && !entangled && s.perks.extraKill[pid] === s.nightNo
            ? { candidates: killCandidates(s, pid), mine: s.night.kill2[pid]?.target }
            : null,
        brew: !entangled && alchemyStep(s, pid) === 'brew',
        potion: (() => {
          const held = usablePotion(s, pid);
          if (!held || entangled) return null;
          return {
            kind: held.kind,
            candidates: living(s).filter((id) => !(held.kind === 'kill' && id === pid)),
            mine: s.night.potion[pid]?.target,
          };
        })(),
      };
    }

    const dawn = s.dawn;
    const histOffer = s.phase === 'dawn' && dawn?.hist[pid] && !dawn.histDone[pid] ? dawn.hist[pid]! : null;

    return {
      phase: s.phase,
      slide: s.slide,
      slides: SLIDES.length,
      tvRules: s.tvRules,
      tvClass: s.tvClass,
      day: s.day,
      deadline: ctx.timerDeadline('phase'),
      total: s.phase === 'day' ? s.dayTotal : ctx.timerTotal('phase'),
      isHost,
      seat,
      alive,
      role: rid,
      team,
      usesLeft: rid ? usesLeft(s, pid) : null,
      mates: mateIds.map((id) => ({ id, role: roleOf(s, id), alive: !!s.alive[id] })),
      twin: seat ? (s.perks.twinOf[pid] ?? null) : null,
      bounty: rid === 'bountyHunter' ? (s.perks.bounty[pid] ?? null) : null,
      journalistHits: rid === 'journalist' ? (s.perks.journalist[pid]?.length ?? 0) : null,
      prophecy: rid === 'prophet' ? (s.perks.prophecy[pid]?.target ?? null) : null,
      link: seat ? (s.perks.link[pid] ?? null) : null,
      potion: seat && s.perks.potion[pid] ? { kind: s.perks.potion[pid]!.kind, usable: s.perks.potion[pid]!.from <= s.nightNo + (s.phase === 'night' ? 0 : 1) } : null,
      alchemy: rid === 'alchemist' && s.perks.alchemy[pid] ? { potion: s.perks.alchemy[pid]!.potion, given: s.perks.alchemy[pid]!.given } : null,
      parasite: rid === 'parasite' ? { host: s.perks.host[pid] ?? null, leeched: s.perks.leeched[pid] ?? 0 } : null,
      stole: seat && !!s.perks.stolen[pid],
      lingering: seat && s.perks.phantom[pid] !== undefined,
      doomed: seat && s.perks.doomed[pid] !== undefined,
      setup:
        s.phase === 'setup' && isHost
          ? { setup: s.setup, errors: setupErrors(s.setup, players), players, suggested: suggested(players) }
          : null,
      acked: s.phase === 'reveal' && !!s.acks[pid],
      night,
      report: seat && afterNight.includes(s.phase) ? (s.reports[pid] ?? []) : [],
      psych:
        alive && dawn && s.phase !== 'report' && afterNight.includes(s.phase) && pid in dawn.psych ? dawn.psych[pid]! : null,
      spokes: alive && s.phase === 'dawn' && dawn?.spokes[pid] ? { offer: dawn.spokes[pid]!, done: !!dawn.spokesDone[pid] } : null,
      hist:
        rid === 'historian' && alive
          ? {
              offer: histOffer,
              stored: s.perks.historian[pid] ?? [],
              canReveal: (s.phase === 'day' || s.phase === 'vote') && !!usesLeft(s, pid),
            }
          : null,
      autopsy:
        rid === 'coroner' && alive
          ? {
              candidates: s.seats.filter((id) => !s.alive[id] && !(s.autopsies[pid] ?? []).some((x) => x.target === id)),
              results: s.autopsies[pid] ?? [],
              canUse: (s.phase === 'dawn' || s.phase === 'day') && !!usesLeft(s, pid),
            }
          : null,
      vote:
        s.phase === 'vote' && alive
          ? {
              mine: s.votes[pid] ?? null,
              candidates: living(s).filter((id) => id !== pid),
              special:
                (rid === 'sniper' || rid === 'exorcist') && !s.voteUsed[pid]
                  ? rid
                  : rid === 'shapeshifter' && !s.perks.shift && usesLeft(s, pid)
                    ? rid
                    : null,
            }
          : null,
      appeal:
        s.phase === 'verdict' && alive && rid === 'lawyer' && s.condemned && (s.appealed || !!usesLeft(s, pid))
          ? { appealed: s.appealed }
          : null,
      skip: s.phase === 'day' && alive ? { mine: !!s.daySkips[pid], ...skipTally(s, ctx) } : null,
      omni: seat && !alive && s.setup.spectator === 'omniscient' && s.phase !== 'end' ? { roles: s.roles, log: s.log } : null,
    };
  },
});
