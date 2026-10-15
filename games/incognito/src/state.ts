import type { GameCtx } from '@mp/game-sdk';
import { role, type ActionKind, type NightEvent, type Potion, type RoleId, type Setup, type Team } from './shared.ts';

// Engine-side state and the rules shared by the day and the night: deaths, wins, uses.
// Everything here is private; only the views in logic.ts decide what leaves the engine.

export type Ctx = GameCtx<Record<string, never>>;

export type Phase =
  | 'setup' // Host builds the match, everyone reads the guide
  | 'reveal' // everyone checks their class
  | 'night'
  | 'report' // night results on every phone
  | 'dawn' // Manhã Cedo: deaths, morning abilities
  | 'day' // Manhã: discussion
  | 'vote' // Tarde
  | 'verdict' // tally + appeal window
  | 'dusk' // outcome of the vote
  | 'end';

/** night = died during a night; vote = expelled; day = Sniper/Exorcist; left = disconnected. */
export type DeathCause = 'night' | 'vote' | 'day' | 'left';

export interface Death {
  id: string;
  cause: DeathCause;
  day: number;
}

/** What became public about a player (Sniper, Exorcist). */
export interface Revealed {
  role?: RoleId;
  team?: Team;
}

/** A private result shown in a player's night report. */
export type Report =
  | { k: 'investigator'; a: string; b: string; same: boolean }
  | { k: 'tracker'; target: string; kind: ActionKind }
  | { k: 'cartographer'; target: string; count: number }
  | { k: 'curator'; target: string; team: Team }
  | { k: 'curatorCured'; target: string }
  | { k: 'journalist'; target: string; guess: RoleId; correct: boolean; hits: number }
  | { k: 'trap'; target: string; triggered: boolean }
  | { k: 'cured' }
  | { k: 'barricaded' }
  | { k: 'entangled' }
  | { k: 'linked'; other: string }
  | { k: 'potion'; kind: Potion }
  | { k: 'potionInsight'; target: string; team: Team }
  | { k: 'stole'; role: RoleId };

export interface Submission {
  targets: string[];
  guess?: RoleId;
  /** Alchemist brewing. */
  potion?: Potion;
  seq: number;
}

export interface NightInput {
  seq: number;
  /** Ability picks — and the decoy picks of players without a night ability. */
  ability: Record<string, Submission>;
  /** Impostor kill picks (null = no kill). */
  kill: Record<string, { target: string | null; seq: number }>;
  /** Twin's extra kill. */
  kill2: Record<string, { target: string | null; seq: number }>;
  /** Potion holders: use it on someone (or null = keep it). */
  potion: Record<string, { target: string | null; seq: number }>;
  /** Entangled players confirm they saw it. */
  ack: Record<string, boolean>;
}

/** One action of the last night, for omniscient spectators. */
export interface LogEntry {
  actor: string;
  role: RoleId | 'kill' | 'potion';
  targets: string[];
  guess?: RoleId;
  effective: boolean;
}

export interface Perks {
  twinOf: Record<string, string>;
  bounty: Record<string, RoleId | null>;
  journalist: Record<string, RoleId[]>;
  prophecy: Record<string, { target: string; night: number } | null>;
  votesCast: Record<string, number>;
  /** Cultist → the 3 players picked for the next vote. */
  cultist: Record<string, string[]>;
  /** Player → night number in which they cannot act. */
  entangled: Record<string, number>;
  /** Player → night number at whose end the poison kills. */
  poisoned: Record<string, number>;
  /** Twin → night number with an extra kill. */
  extraKill: Record<string, number>;
  maestro: { controlled: string; target: string } | null;
  trickster: string[];
  historian: Record<string, NightEvent[]>;
  /** Telepath links, both directions. */
  link: Record<string, string>;
  alchemy: Record<string, { potion: Potion; night: number; given: boolean }>;
  /** Potion holder → potion and first night it can be used. */
  potion: Record<string, { kind: Potion; from: number }>;
  /** Nomad → swap partner and the night it applies. */
  swap: Record<string, { with: string; night: number }>;
  /** Parasite → host, and votes stolen so far. */
  host: Record<string, string>;
  leeched: Record<string, number>;
  /** Phantom → night at whose end it finally dies. */
  phantom: Record<string, number>;
  /** Pacifist Tracker → night at whose end the penalty kills. */
  doomed: Record<string, number>;
  /** Shapeshifter's imitation for the current vote. */
  shift: { shifter: string; target: string } | null;
  /** Thieves who already stole a class. */
  stolen: Record<string, boolean>;
}

export interface Dawn {
  deaths: string[];
  suspect: string | null;
  poisoned: boolean;
  psych: Record<string, boolean>;
  spokes: Record<string, NightEvent[]>;
  spokesDone: Record<string, boolean>;
  hist: Record<string, NightEvent[]>;
  histDone: Record<string, boolean>;
}

export interface Announcement {
  by: 'spokesperson' | 'historian';
  /** The Spokesperson's id when they signed it. */
  signer: string | null;
  event: NightEvent;
}

export type LiveEvent =
  | { k: 'snipe'; target: string; role: RoleId }
  | { k: 'snipeFail'; sniper: string }
  | { k: 'exorcise'; exorcist: string; target: string }
  | { k: 'exorciseFail'; ids: string[] }
  | { k: 'shifted'; shifter: string };

export interface Outcome {
  k: 'expelled' | 'annulled' | 'none';
  target: string | null;
}

export type Side = 'innocent' | 'impostor' | 'neutral' | 'draw';

export interface Win {
  side: Side;
  neutral?: string;
}

export interface EndResult {
  side: Side;
  neutral: { id: string; role: RoleId } | null;
  winners: string[];
  roles: Record<string, RoleId>;
  /** Thieves (shown as "Thief → stolen class"). */
  thieves: string[];
}

export interface State {
  phase: Phase;
  setup: Setup;
  /** Day number; night n is followed by day n. */
  day: number;
  nightNo: number;
  seats: string[];
  roles: Record<string, RoleId>;
  alive: Record<string, boolean>;
  comp: { impostors: number; neutrals: number; innocents: number } | null;
  deaths: Death[];
  revealed: Record<string, Revealed>;
  uses: Record<string, number>;
  perks: Perks;
  night: NightInput;
  reports: Record<string, Report[]>;
  events: NightEvent[];
  log: LogEntry[];
  dawn: Dawn | null;
  news: Announcement[];
  votes: Record<string, string>;
  voteUsed: Record<string, boolean>;
  live: LiveEvent[];
  tally: Record<string, number> | null;
  condemned: string | null;
  appealed: boolean;
  outcome: Outcome | null;
  autopsies: Record<string, { target: string; team: Team }[]>;
  acks: Record<string, boolean>;
  /** Players who asked to skip the discussion, and the discussion's full length (ms). */
  daySkips: Record<string, boolean>;
  dayTotal: number;
  win: Win | null;
  result: EndResult | null;
}

export const emptyNight = (): NightInput => ({ seq: 0, ability: {}, kill: {}, kill2: {}, potion: {}, ack: {} });

export const emptyPerks = (): Perks => ({
  twinOf: {},
  bounty: {},
  journalist: {},
  prophecy: {},
  votesCast: {},
  cultist: {},
  entangled: {},
  poisoned: {},
  extraKill: {},
  maestro: null,
  trickster: [],
  historian: {},
  link: {},
  alchemy: {},
  potion: {},
  swap: {},
  host: {},
  leeched: {},
  phantom: {},
  doomed: {},
  shift: null,
  stolen: {},
});

export const roleOf = (s: State, id: string): RoleId => s.roles[id] ?? 'innocent';
export const teamOf = (s: State, id: string): Team => role(roleOf(s, id)).team;
export const living = (s: State) => s.seats.filter((id) => s.alive[id]);
/** The class others guess against: a Thief stays "Thief" after stealing. */
export const apparentRole = (s: State, id: string): RoleId => (s.perks.stolen[id] ? 'thief' : roleOf(s, id));
/** Impostors a player knows about (a Thief who became an Impostor knows none, and nobody knows them). */
export function knownMates(s: State, id: string): string[] {
  if (teamOf(s, id) !== 'impostor' || s.perks.stolen[id]) return [];
  return s.seats.filter((x) => x !== id && teamOf(s, x) === 'impostor' && !s.perks.stolen[x]);
}

/** Remaining uses of the class's limited power, or null when unlimited. */
export function usesLeft(s: State, id: string): number | null {
  const limit = role(roleOf(s, id)).limit;
  return limit === undefined ? null : Math.max(0, limit - (s.uses[id] ?? 0));
}

export function spend(s: State, id: string) {
  s.uses[id] = (s.uses[id] ?? 0) + 1;
}

export function declareNeutralWin(s: State, id: string) {
  if (!s.win) s.win = { side: 'neutral', neutral: id };
}

/** Gives each Bounty Hunter whose target class is gone the class of another living Impostor. */
export function retargetBounties(s: State, ctx: Ctx) {
  for (const [hunter, want] of Object.entries(s.perks.bounty)) {
    if (!s.alive[hunter] || want === null) continue;
    if (living(s).some((id) => roleOf(s, id) === want)) continue;
    const imps = living(s).filter((id) => teamOf(s, id) === 'impostor');
    s.perks.bounty[hunter] = imps.length ? roleOf(s, ctx.rng.pick(imps)) : null;
  }
}

export function killPlayer(s: State, id: string, cause: DeathCause, ctx: Ctx) {
  if (!s.alive[id]) return;
  s.alive[id] = false;
  s.deaths.push({ id, cause, day: s.day });

  const partner = s.perks.twinOf[id];
  if (partner && s.alive[partner]) s.perks.extraKill[partner] = s.nightNo + 1;
  delete s.perks.extraKill[id];

  for (const [prophet, p] of Object.entries(s.perks.prophecy)) {
    if (!p || p.target !== id) continue;
    if (cause === 'left') s.perks.prophecy[prophet] = null; // nobody's credit: the prophecy is void
    else if (s.alive[prophet]) declareNeutralWin(s, prophet);
  }

  if (roleOf(s, id) === 'dramaAddict' && (cause === 'night' || cause === 'day') && (s.perks.votesCast[id] ?? 0) >= 4) {
    declareNeutralWin(s, id);
  }

  // Telepath link: death outside the vote carries over.
  const linked = s.perks.link[id];
  if (linked && (cause === 'night' || cause === 'day')) killPlayer(s, linked, cause, ctx);

  retargetBounties(s, ctx);
}

/** The match result if the game is over (a neutral win always comes first). */
export function currentWin(s: State): Win | null {
  if (s.win) return s.win;
  const alive = living(s);
  const count = (t: Team) => alive.filter((id) => teamOf(s, id) === t).length;
  const imp = count('impostor');
  const inn = count('innocent');
  const neu = count('neutral');
  if (imp === 0 && neu === 0) return { side: inn > 0 ? 'innocent' : 'draw' };
  if (imp > 0 && imp >= inn) return { side: 'impostor' };
  if (imp === 0 && inn === 0) return { side: 'draw' };
  return null;
}
