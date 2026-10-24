import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import {
  BIG_TABLE,
  CATALOG,
  PRESETS,
  UNITS,
  UNIT_BY_ID,
  hostageTable,
  roundMinutes,
  type CharId,
  type PowerKind,
  type Room,
  type Team,
  type CondKind,
  PSYCH,
  SPOKEN_POWERS,
} from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Ficha Explosiva: two halls, two families. Players are dealt hidden cards and split between hall
// A and hall B; each hall elects a leader, and at the end of every timed round the leaders swap
// hostages. At the end everyone in the Hitman's hall goes down: the Crimson family wins if the
// Boss is among them, the Gold family if he is not. Grey cards have goals of their own.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  preset: string;
  rounds: string;
  timing: string;
  briefing: string;
  buryEven: boolean;
  prematureLoss: boolean;
  exchangeSeconds: number;
  briefingSeconds: number;
}

export type Phase = 'intro' | 'mesa' | 'briefing' | 'round' | 'exchange' | 'pause' | 'reveal';
export type ShareKind = 'card' | 'color';
export type Condition = { k: 'love' | 'hate'; with: string } | { k: Exclude<CondKind, 'love' | 'hate'> };

/** Something a player learned about another player's card. */
export interface Seen {
  who: string;
  /** The card, when the whole card was seen. */
  card: CharId | null;
  /** The colour the card shows. */
  look: Team;
  how: 'cardShare' | 'colorShare' | 'shown' | 'colorShown' | 'public' | 'power';
  round: number;
}

export interface Notice {
  n: number;
  k:
    | 'declined' // who declined your offer
    | 'expired' // who did not answer in time
    | 'forced' // a Federal (who) forced a card share on you
    | 'enforced' // a Cobrador (who) made you card share with who2
    | 'love' // a Casamenteira (who) made you love who2
    | 'hate' // an Intrigante (who) made you hate who2
    | 'cancelled' // love and hate cancelled each other (who = power user, who2 = the other target)
    | 'bounced' // a Leão-de-chácara (who) sent you to room
    | 'swapped' // you swapped cards with who (Ficha Quente)
    | 'cured' // a Boticário (who) cleared your conditions
    | 'leader' // you are now the leader
    | 'lostLead' // you are no longer the leader
    | 'condition' // a card share with who gave you cond (or cancelled it out, when cancelled is set)
    | 'healed' // the Terapeuta (who) cured your psych conditions
    | 'sober'; // the Bêbado sobered up: you now hold the set-aside card
  who?: string;
  who2?: string;
  room?: Room;
  cond?: CondKind;
  cancelled?: boolean;
}

interface Request {
  id: string;
  from: string;
  to: string;
  kind: ShareKind;
  /** The Terapeuta's offer: a card share that cures, open even to shy/coy/paranoid players. */
  psych?: boolean;
}

interface ShareRecord {
  a: string;
  b: string;
  kind: ShareKind;
  aCard: CharId;
  bCard: CharId;
  round: number;
}

export type Verdict = 'ouro' | 'carmim' | 'nenhum';

export interface Result {
  cards: Record<string, CharId>;
  rooms: Record<string, Room | null>;
  buried: CharId | null;
  dead: string[];
  winners: string[];
  verdict: Verdict;
  bossId: string | null;
  hitmanId: string | null;
  /** Médico / Armeiro requirement: null when not in play. */
  doctorOk: boolean | null;
  engineerOk: boolean | null;
  boom: State['boom'];
  tyrant: boolean;
  /** The infected won (everyone still standing was infected). */
  zombies: boolean;
}

export interface Announcement {
  who: string;
  step: 5 | 10 | 15;
  /** Card id (Investigador), verdict (Apostador) or player id (Atirador); null = stayed silent. */
  value: string | null;
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  round: number;
  rounds: 3 | 5;
  hostages: number[];
  minutes: number[];
  /** Players counted for the table (everyone but the Envoys). */
  effective: number;
  big: boolean;

  // mesa
  units: string[];
  bury: boolean;

  // the deal — SECRET
  card: Record<string, CharId>;
  buried: CharId | null;
  /** Deck composition (dealt + buried), sorted: public, like a physical deck list. */
  deck: CharId[];

  room: Record<string, Room | null>;
  leftRoom: Record<string, boolean>;
  leader: Record<Room, string | null>;
  /** The leader took the chair with the Usurpador power this round: can't be toppled. */
  shielded: Record<Room, boolean>;
  /** Who handed the leadership over this round (can't get it back until next round). */
  noReturn: Record<Room, string | null>;
  offer: Record<Room, { from: string; to: string } | null>;
  ledRooms: Record<string, Room[]>;
  points: Record<string, string | null>;
  picks: Record<Room, string[]>;
  locked: Record<Room, boolean>;
  /** What the TV shows: a hall locked this round (never turns back off, so an unlock leaks nothing). */
  shownLocked: Record<Room, boolean>;
  tackled: string[];
  exchange: Record<Room, string[]> | null;
  arrived: string[];
  hostageCount: Record<string, number>;
  anarchy: Record<string, number[]>;
  minionFail: Record<string, boolean>;

  conditions: Record<string, Condition[]>;
  usedRound: Record<string, number>;
  usedOnce: Record<string, boolean>;
  /** Permanent public reveals (card at the moment of the reveal). */
  revealed: Record<string, CharId>;
  mayors: string[];
  seen: Record<string, Seen[]>;
  shares: ShareRecord[];
  firstShare: Record<string, string>;
  requests: Request[];
  seq: number;
  notices: Record<string, Notice[]>;

  ready: string[];
  visited: string[];

  pauseStep: 5 | 10 | 15 | null;
  pauseChoices: Record<string, string>;
  announcements: Announcement[];
  gamblerAlt: string[];
  /** Voluntary card shares made while paranoid (the condition allows one). */
  paranoidUsed: Record<string, number>;
  /** Everyone who has held the Trevo (nobody may hold it twice). */
  everClover: string[];
  /** The card set aside for the Bêbado until the last round — SECRET. */
  sober: CharId | null;

  boom: null | { kind: 'dinamite' | 'guardaCostas'; room: Room; by: string };
  result: Result | null;

  /** Tutorial slide on screen during the intro. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
}

/** First-round hint on the TV while the tutorial option is on. */
export type Hint = 'nominate' | 'share' | 'lock' | null;

export type MesaError = 'tooMany' | 'needBury' | 'fewPlayers' | 'zombieImmune';

export interface MesaView {
  units: string[];
  bury: boolean;
  canBury: boolean;
  /** The deck as it would be dealt now. */
  preview: CharId[];
  errors: MesaError[];
  /** Units whose cards are recommended for more players than are here. */
  warnings: string[];
  players: number;
  hostId: string;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  round: number;
  rounds: number;
  deadline: number | null;
  total: number | null;
  hostages: number[];
  minutes: number[];
  big: boolean;
  timed: boolean;
  rooms: Record<Room, string[]>;
  envoys: string[];
  leaders: Record<Room, string | null>;
  locked: Record<Room, boolean>;
  revealed: Record<string, CharId>;
  tackled: string[];
  mesa: MesaView | null;
  deck: CharId[];
  briefing: { mode: 'phone' | 'dealer'; done: string[] } | null;
  exchange: Record<Room, string[]> | null;
  arrived: string[];
  pause: { step: 5 | 10 | 15; choosers: string[]; chosen: string[] } | null;
  announcements: Announcement[];
  /** The match ended early (a power fired); the details wait for the reveal. */
  suddenEnd: boolean;
  result: Result | null;
  slide: number;
  slides: number;
  tvRules: number | null;
  hint: Hint;
}

export interface PowerView {
  kind: PowerKind;
  /** Can be used right now. */
  ready: boolean;
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  round: number;
  rounds: number;
  deadline: number | null;
  total: number | null;
  isHost: boolean;
  big: boolean;
  /** Null until the player may look (Dealer briefing not visited yet). */
  card: CharId | null;
  room: Room | null;
  envoy: boolean;
  conditions: Condition[];
  /** People this player may interact with right now (same hall; everyone for an Envoy). */
  reachable: string[];
  roomMates: string[];
  leader: string | null;
  isLeader: boolean;
  points: Record<string, string | null>;
  offer: { from: string; to: string } | null;
  noReturn: string | null;
  picks: string[];
  locked: boolean;
  need: number;
  eligible: string[];
  tackled: string[];
  requestsIn: { id: string; from: string; kind: ShareKind; psych: boolean; canAccept: boolean }[];
  /** What this player's own conditions let them do right now. */
  allowed: { cardShare: boolean; colorShare: boolean; show: boolean };
  requestOut: { id: string; to: string; kind: ShareKind } | null;
  seen: Seen[];
  notices: Notice[];
  power: PowerView | null;
  ready: boolean;
  mesa: MesaView | null;
  briefingMode: 'phone' | 'dealer';
  /** During the exchange: the room this hostage must walk to. */
  hostage: Room | null;
  arrived: boolean;
  pause: null | { step: 5 | 10 | 15; mine: boolean; choice: string | null; options: string[] };
  deck: CharId[];
  result: Result | null;
  slide: number;
  slides: number;
  tvRules: number | null;
}

export interface DealerView {
  card: CharId | null;
  room: Room | null;
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null }
  | { type: 'toggleUnit'; unit: string }
  | { type: 'setBury'; on: boolean }
  | { type: 'preset'; id: string }
  | { type: 'deal' }
  | { type: 'ready' }
  | { type: 'nominate'; target: string }
  | { type: 'point'; target: string | null }
  | { type: 'offerLead'; target: string }
  | { type: 'answerLead'; accept: boolean }
  | { type: 'toggleHostage'; target: string }
  | { type: 'lockHostages' }
  | { type: 'request'; to: string; kind: ShareKind }
  | { type: 'answer'; id: string; accept: boolean }
  | { type: 'cancel' }
  | { type: 'show'; to: string; kind: ShareKind }
  | { type: 'showRoom' }
  | { type: 'power'; targets: string[] }
  | { type: 'arrived' }
  | { type: 'pauseChoice'; value: string };

type Ctx = GameCtx<Config>;

const REQUEST_MS = 30_000;
const PAUSE_MS = 40_000;
const REVEAL_MS = 22_000;
const MAX_NOTICES = 6;
const MAX_SEEN = 40;
const ROOMS: Room[] = ['A', 'B'];
const other = (r: Room): Room => (r === 'A' ? 'B' : 'A');
const isEnvoyCard = (c: CharId | undefined) => c === 'embaixadorOuro' || c === 'embaixadorCarmim';
const majority = (rounds: number) => Math.floor(rounds / 2) + 1;
const pairs = <T>(a: T, b: T): [T, T][] => [
  [a, b],
  [b, a],
];

/** Safety net: if the Host never advances the tutorial (left the room), deck building starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;
const isRoomHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);

function endIntro(s: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  s.tvRules = null;
  s.phase = 'mesa';
  ctx.emit('sound', 'phase');
}

/** The TV's first-round hint: derived from what the halls can do right now. */
function hint(s: State, ctx: Ctx): Hint {
  if (!ctx.config.tutorial || s.phase !== 'round' || s.round !== 1) return null;
  if (ROOMS.some((r) => members(s, r).length && !s.leader[r])) return 'nominate';
  const deadline = ctx.timerDeadline('phase');
  const late = deadline !== null && deadline - ctx.now < 60_000;
  if (late && ROOMS.some((r) => !s.shownLocked[r])) return 'lock';
  return 'share';
}

/** The Host: p1 while connected, else the first connected participant. */
function hostId(ctx: Ctx): string {
  return (
    (ctx.players.find((p) => p.id === 'p1' && p.connected) ?? ctx.players.find((p) => p.connected) ?? ctx.players[0])
      ?.id ?? 'p1'
  );
}

const isPlayer = (ctx: Ctx, id: unknown): id is string => typeof id === 'string' && ctx.players.some((p) => p.id === id);
const connected = (ctx: Ctx, id: string) => ctx.players.find((p) => p.id === id)?.connected ?? false;

// ---------------------------------------------------------------- mesa (deck building)

function unitCards(units: string[]): CharId[] {
  return UNITS.filter((u) => units.includes(u.id)).flatMap((u) => u.cards);
}

function canBury(ctx: Ctx): boolean {
  return ctx.players.length % 2 === 1 || ctx.config.buryEven;
}

/** The cards the Host picked, plus what the rules add on their own (backups when burying). */
function specials(s: State): CharId[] {
  return unitCards(s.bury && !s.units.includes('reservas') ? [...s.units, 'reservas'] : s.units);
}

/** Cards in the deck: one per player, plus the buried card, plus the Bêbado's set-aside card. */
function deckSize(s: State, ctx: Ctx): number {
  return ctx.players.length + (s.bury ? 1 : 0) + (s.units.includes('bebado') ? 1 : 0);
}

function mesaErrors(s: State, ctx: Ctx): MesaError[] {
  const errors: MesaError[] = [];
  const cards = specials(s);
  if (cards.length + 2 > deckSize(s, ctx)) errors.push('tooMany');
  if (s.units.includes('investigador') && !s.bury) errors.push('needBury');
  if (ctx.players.length - cards.filter(isEnvoyCard).length < 6) errors.push('fewPlayers');
  // The guide: the Contagiado cannot be played with the Intocável.
  if (s.units.includes('contagiado') && s.units.includes('intocavel')) errors.push('zombieImmune');
  return errors;
}

function mesaWarnings(s: State, ctx: Ctx): string[] {
  return s.units.filter((u) =>
    (UNIT_BY_ID[u]?.cards ?? []).some((c) => (CATALOG[c].minPlayers ?? 0) > ctx.players.length),
  );
}

/** Fills the deck with family soldiers so both families have the same size; a lone slot gets the Apostador. */
function fillDeck(cards: CharId[], size: number, coin: () => boolean): CharId[] {
  const deck = [...cards];
  const count = (t: Team) => deck.filter((c) => CATALOG[c].team === t).length;
  while (deck.length < size) {
    const left = size - deck.length;
    const ouro = count('ouro');
    const carmim = count('carmim');
    if (ouro < carmim) deck.push('soldadoOuro');
    else if (carmim < ouro) deck.push('soldadoCarmim');
    else if (left >= 2) deck.push('soldadoOuro', 'soldadoCarmim');
    else if (!deck.includes('apostador')) deck.push('apostador');
    else deck.push(coin() ? 'soldadoOuro' : 'soldadoCarmim');
  }
  return deck;
}

function sortDeck(deck: CharId[]): CharId[] {
  const order = (c: CharId) => (CATALOG[c].team === 'ouro' ? 0 : CATALOG[c].team === 'carmim' ? 1 : 2);
  return [...deck].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}

function mesaView(s: State, ctx: Ctx): MesaView {
  const size = deckSize(s, ctx);
  const cards: CharId[] = ['chefao', 'assassino', ...specials(s)];
  return {
    units: s.units,
    bury: s.bury,
    canBury: canBury(ctx),
    preview: sortDeck(cards.length <= size ? fillDeck(cards, size, () => true) : cards),
    errors: mesaErrors(s, ctx),
    warnings: mesaWarnings(s, ctx),
    players: ctx.players.length,
    hostId: hostId(ctx),
  };
}

/** Adds the preset's units, in order, while they fit the table. */
function applyPreset(s: State, ctx: Ctx, id: string) {
  s.units = [];
  for (const u of PRESETS[id] ?? []) {
    const unit = UNIT_BY_ID[u];
    if (!unit || u === 'investigador') continue;
    if (unit.cards.some((c) => (CATALOG[c].minPlayers ?? 0) > ctx.players.length)) continue;
    const before = s.units;
    s.units = [...before, u];
    if (mesaErrors(s, ctx).length) s.units = before;
  }
}

function deal(s: State, ctx: Ctx) {
  const ids = ctx.players.map((p) => p.id);
  const size = deckSize(s, ctx);
  if (s.bury && !s.units.includes('reservas')) s.units = [...s.units, 'reservas'];
  let deck = fillDeck(['chefao', 'assassino', ...specials(s)], size, () => ctx.rng.next() < 0.5);
  s.deck = sortDeck(deck);
  // Linked cards, Envoys and the Bêbado are never set aside or buried.
  const loose = () => deck.filter((c) => !CATALOG[c].linked && !isEnvoyCard(c) && c !== 'bebado');
  s.sober = null;
  if (deck.includes('bebado')) {
    const pick = ctx.rng.pick(loose());
    s.sober = pick;
    deck.splice(deck.indexOf(pick), 1);
  }
  s.buried = null;
  if (s.bury) {
    const pick = ctx.rng.pick(loose());
    s.buried = pick;
    deck.splice(deck.indexOf(pick), 1);
  }
  deck = ctx.rng.shuffle(deck);
  ids.forEach((id, i) => {
    s.card[id] = deck[i]!;
    s.conditions[id] = cleanConditions(deck[i]!);
    if (deck[i] === 'trevo') s.everClover.push(id);
    s.seen[id] = [];
    s.notices[id] = [];
    s.hostageCount[id] = 0;
    s.ledRooms[id] = [];
    s.points[id] = null;
  });

  // Halls: Envoys stand outside both; everyone else is split as evenly as possible.
  const envoys = ids.filter((id) => isEnvoyCard(s.card[id]));
  const others = ctx.rng.shuffle(ids.filter((id) => !envoys.includes(id)));
  const inA = Math.floor(others.length / 2) + (others.length % 2 === 1 && ctx.rng.next() < 0.5 ? 1 : 0);
  others.forEach((id, i) => (s.room[id] = i < inA ? 'A' : 'B'));
  for (const id of envoys) {
    s.room[id] = null;
    s.revealed[id] = s.card[id]!;
  }

  s.effective = others.length;
  s.big = s.effective >= BIG_TABLE;
  s.rounds = ctx.config.rounds === '5' && s.big ? 5 : 3;
  s.hostages = hostageTable(s.effective, s.rounds);
  s.minutes = roundMinutes(s.rounds, ctx.config.timing);

  s.phase = 'briefing';
  ctx.setTimer('phase', ctx.config.briefingSeconds * 1000);
  ctx.emit('sound', 'phase');
}

// ---------------------------------------------------------------- helpers

const members = (s: State, r: Room) => Object.keys(s.room).filter((id) => s.room[id] === r);
const isEnvoy = (s: State, id: string) => s.room[id] === null;
/** Envoys and the Intocável: no power or condition touches them. */
const immune = (s: State, id: string) => !!s.card[id] && !!CATALOG[s.card[id]!].immune;

function holderOf(s: State, card: CharId): string | null {
  return Object.keys(s.card).find((id) => s.card[id] === card) ?? null;
}
/** The card that plays the Boss: the Chefão, or the Herdeiro when the Chefão is buried. */
const bossCard = (s: State): CharId => (s.buried === 'chefao' ? 'herdeiro' : 'chefao');
const hitmanCard = (s: State): CharId => (s.buried === 'assassino' ? 'bracoDireito' : 'assassino');
function doctorCard(s: State): CharId | null {
  if (s.buried === 'medico') return s.deck.includes('enfermeira') ? 'enfermeira' : null;
  return s.deck.includes('medico') ? 'medico' : null;
}
function engineerCard(s: State): CharId | null {
  if (s.buried === 'armeiro') return s.deck.includes('aprendiz') ? 'aprendiz' : null;
  return s.deck.includes('armeiro') ? 'armeiro' : null;
}

/** Could `a` and `b` talk face to face right now? */
function reachable(s: State, a: string, b: string): boolean {
  if (a === b || s.card[a] === undefined || s.card[b] === undefined) return false;
  if (isEnvoy(s, a) || isEnvoy(s, b)) return true;
  return s.room[a] === s.room[b];
}

function notify(s: State, id: string, notice: Omit<Notice, 'n'>) {
  s.seq += 1;
  s.notices[id] = [...(s.notices[id] ?? []), { n: s.seq, ...notice }].slice(-MAX_NOTICES);
}

function learn(s: State, viewer: string, who: string, how: Seen['how'], whole: boolean) {
  const card = s.card[who]!;
  const entry: Seen = { who, card: whole ? card : null, look: CATALOG[card].look, how, round: s.round };
  s.seen[viewer] = [...(s.seen[viewer] ?? []), entry].slice(-MAX_SEEN);
}

function hasCondition(s: State, id: string, k: Condition['k']) {
  return (s.conditions[id] ?? []).some((c) => c.k === k);
}

function dropRequest(s: State, ctx: Ctx, id: string) {
  s.requests = s.requests.filter((r) => r.id !== id);
  ctx.clearTimer(`req:${id}`);
}

function dropRequestsOf(s: State, ctx: Ctx, player: string) {
  for (const r of s.requests.filter((r) => r.from === player || r.to === player)) dropRequest(s, ctx, r.id);
}

function dropAllRequests(s: State, ctx: Ctx) {
  for (const r of [...s.requests]) dropRequest(s, ctx, r.id);
}

// ---------------------------------------------------------------- leadership

function setLeader(s: State, r: Room, id: string | null) {
  const previous = s.leader[r];
  if (previous === id) return;
  if (previous && s.room[previous] === r) notify(s, previous, { k: 'lostLead' });
  s.leader[r] = id;
  s.offer[r] = null;
  for (const m of members(s, r)) s.points[m] = null;
  if (!id) return;
  notify(s, id, { k: 'leader' });
  if (!s.ledRooms[id]!.includes(r)) s.ledRooms[id]!.push(r);
  if (s.picks[r].includes(id)) {
    s.picks[r] = s.picks[r].filter((p) => p !== id);
    s.locked[r] = false;
  }
}

/** A leader was toppled in room r (usurp vote or Usurpador): the Lacaios there fail. */
function toppled(s: State, r: Room) {
  for (const m of members(s, r)) if (s.card[m] === 'lacaio') s.minionFail[m] = true;
}

function voteWeight(s: State, id: string, r: Room): number {
  if (members(s, r).length % 2 !== 0 || !s.mayors.includes(id)) return 1;
  return s.mayors.some((m) => m !== id) ? 1 : 2;
}

function checkUsurp(s: State, r: Room) {
  const current = s.leader[r];
  if (!current || s.shielded[r]) return;
  const room = members(s, r);
  const tally: Record<string, number> = {};
  for (const m of room) {
    const t = s.points[m];
    if (t && s.room[t] === r) tally[t] = (tally[t] ?? 0) + voteWeight(s, m, r);
  }
  const winner = Object.keys(tally).find((t) => t !== current && tally[t]! * 2 > room.length);
  if (!winner) return;
  for (const m of room) {
    if (s.points[m] === winner && s.card[m] === 'anarquista') {
      const rounds = s.anarchy[m] ?? [];
      if (!rounds.includes(s.round)) s.anarchy[m] = [...rounds, s.round];
    }
  }
  toppled(s, r);
  setLeader(s, r, winner);
}

// ---------------------------------------------------------------- hostages

function eligible(s: State, r: Room): string[] {
  return members(s, r).filter((m) => m !== s.leader[r] && !s.tackled.includes(m));
}

function need(s: State, r: Room): number {
  return Math.min(s.hostages[s.round - 1] ?? 1, eligible(s, r).length);
}

/** A player is thrown out of room r mid-round: undo what tied them to it. */
function leaveRoom(s: State, ctx: Ctx, id: string, r: Room) {
  if (s.leader[r] === id) setLeader(s, r, null);
  if (s.picks[r].includes(id)) {
    s.picks[r] = s.picks[r].filter((p) => p !== id);
    s.locked[r] = false;
  }
  if (s.offer[r]?.to === id) s.offer[r] = null;
  s.points[id] = null;
  for (const m of members(s, r)) if (s.points[m] === id) s.points[m] = null;
  dropRequestsOf(s, ctx, id);
  s.room[id] = other(r);
  s.leftRoom[id] = true;
}

// ---------------------------------------------------------------- sharing

/** The conditions a card starts with; a card that changes hands comes back clean, with these. */
function cleanConditions(c: CharId): Condition[] {
  return (CATALOG[c].starts ?? []).map((k) => ({ k }) as Condition);
}

/** Conditions that cancel each other out: whoever has one and gets the other ends with neither. */
const OPPOSITES: [CondKind, CondKind][] = [
  ['honest', 'liar'],
  ['foolish', 'shy'],
  ['foolish', 'coy'],
  ['foolish', 'paranoid'],
];

/** Gives condition k (not love/hate) unless the player is immune; returns whether it cancelled out. */
function addCondition(s: State, id: string, k: Exclude<CondKind, 'love' | 'hate'>): boolean {
  if (immune(s, id) || hasCondition(s, id, k)) return false;
  const opposite = OPPOSITES.find(([x, y]) => x === k || y === k);
  const other = opposite && (opposite[0] === k ? opposite[1] : opposite[0]);
  if (other && hasCondition(s, id, other)) {
    s.conditions[id] = s.conditions[id]!.filter((c) => c.k !== other);
    return true;
  }
  s.conditions[id] = [...(s.conditions[id] ?? []), { k }];
  return false;
}

// What a player's conditions let them do with their own card, by choice (powers that force a share
// ignore all of this).
function mayCardShare(s: State, id: string): boolean {
  if (hasCondition(s, id, 'shy') || hasCondition(s, id, 'coy')) return false;
  return !hasCondition(s, id, 'paranoid') || (s.paranoidUsed[id] ?? 0) < 1;
}
function mayColorShare(s: State, id: string): boolean {
  return !['shy', 'paranoid', 'savvy'].some((k) => hasCondition(s, id, k as CondKind));
}
function mayShowCard(s: State, id: string): boolean {
  return !['shy', 'coy', 'paranoid', 'savvy'].some((k) => hasCondition(s, id, k as CondKind));
}
const mayShare = (s: State, id: string, kind: ShareKind) =>
  kind === 'card' ? mayCardShare(s, id) : mayColorShare(s, id);

function swapCards(s: State, a: string, b: string) {
  const ca = s.card[a]!;
  s.card[a] = s.card[b]!;
  s.card[b] = ca;
  // A new card is a clean card.
  s.conditions[a] = cleanConditions(s.card[a]);
  s.conditions[b] = cleanConditions(s.card[b]);
  for (const id of [a, b]) if (s.card[id] === 'trevo' && !s.everClover.includes(id)) s.everClover.push(id);
  notify(s, a, { k: 'swapped', who: b });
  notify(s, b, { k: 'swapped', who: a });
}

/**
 * A share between a and b. `forced`: a power made it happen (it ignores conditions and does not use
 * up the paranoid's one share).
 */
function share(s: State, ctx: Ctx, a: string, b: string, kind: ShareKind, how?: Seen['how'], forced = false) {
  // Golpista: an accepted colour share turns into two private reveals of the whole card.
  if (kind === 'color' && pairs(a, b).some(([x, y]) => s.card[x]?.startsWith('golpista') && !immune(s, y))) {
    learn(s, a, b, 'shown', true);
    learn(s, b, a, 'shown', true);
    return;
  }
  const whole = kind === 'card';
  learn(s, a, b, how ?? (whole ? 'cardShare' : 'colorShare'), whole);
  learn(s, b, a, how ?? (whole ? 'cardShare' : 'colorShare'), whole);
  s.shares.push({ a, b, kind, aCard: s.card[a]!, bCard: s.card[b]!, round: s.round });
  for (const [x, y] of pairs(a, b)) {
    if ((s.card[x] === 'sombra' || s.card[x] === 'sabotador') && s.firstShare[x] === undefined) s.firstShare[x] = y;
    if (whole && !forced && hasCondition(s, x, 'paranoid')) s.paranoidUsed[x] = (s.paranoidUsed[x] ?? 0) + 1;
  }

  if (whole) {
    for (const [x, y] of pairs(a, b)) {
      if ((s.card[x] === 'boticarioOuro' || s.card[x] === 'boticarioCarmim') && !immune(s, y)) {
        if ((s.conditions[y] ?? []).length) notify(s, y, { k: 'cured', who: x });
        s.conditions[y] = [];
      }
    }
    // Chantagista, Trapaceiro, Capanga, Mordaça: a card share leaves a condition behind.
    for (const [x, y] of pairs(a, b)) {
      const gives = CATALOG[s.card[x]!].gives;
      if (!gives || gives === 'love' || gives === 'hate' || immune(s, y) || hasCondition(s, y, gives)) continue;
      const cancelled = addCondition(s, y, gives);
      notify(s, y, { k: 'condition', who: x, cond: gives, cancelled });
    }
    for (const [x, y] of pairs(a, b)) {
      const r = s.room[x];
      if (!r) continue;
      if (s.card[x] === 'dinamite' && s.card[y] === 'chefao') return boom(s, ctx, 'dinamite', r, x);
      if (s.card[x] === 'guardaCostas' && s.card[y] === 'assassino') return boom(s, ctx, 'guardaCostas', r, x);
    }
  }

  // The infection spreads through any share, card or colour.
  for (const [x, y] of pairs(a, b)) {
    if (hasCondition(s, x, 'zombie') && !hasCondition(s, y, 'zombie') && !immune(s, y)) {
      addCondition(s, y, 'zombie');
      notify(s, y, { k: 'condition', who: x, cond: 'zombie' });
    }
  }

  for (const [x, y] of pairs(a, b)) {
    if (immune(s, y)) continue;
    if (s.card[x] === 'fichaQuente' || (s.card[x] === 'trevo' && !s.everClover.includes(y))) {
      swapCards(s, x, y);
      break;
    }
  }

  // An offer its sender may no longer make (a paranoid's share used up, a new condition) is
  // withdrawn — to the target it looks like any withdrawal.
  for (const q of s.requests.filter((q) => !q.psych && (q.from === a || q.from === b) && !mayShare(s, q.from, q.kind))) {
    dropRequest(s, ctx, q.id);
  }
}

function boom(s: State, ctx: Ctx, kind: 'dinamite' | 'guardaCostas', room: Room, by: string) {
  s.boom = { kind, room, by };
  ctx.emit('sound', 'reveal');
  ctx.emit('fx', 'boom');
  dropAllRequests(s, ctx);
  startPause(s, ctx);
}

// ---------------------------------------------------------------- powers

function powerOf(s: State, id: string): PowerKind | null {
  const c = s.card[id];
  return c ? (CATALOG[c].power ?? null) : null;
}

function powerReady(s: State, id: string): boolean {
  const kind = powerOf(s, id);
  const r = s.room[id];
  if (!kind || s.phase !== 'round' || !r) return false;
  if (SPOKEN_POWERS.includes(kind) && hasCondition(s, id, 'cursed')) return false;
  switch (kind) {
    case 'terapeuta':
      return true;
    case 'federal':
    case 'cobrador':
      return s.usedRound[id] !== s.round;
    case 'casamenteira':
    case 'intrigante':
    case 'guarda':
      return !s.usedOnce[id];
    case 'usurpador':
      return !s.usedOnce[id] && s.round < s.rounds && s.leader[r] !== id;
    case 'vereador':
      return !s.mayors.includes(id) && members(s, r).length % 2 === 0;
    case 'leao':
      return s.round < s.rounds && members(s, r).length > members(s, other(r)).length;
  }
}

function usePower(s: State, ctx: Ctx, id: string, targets: string[]) {
  if (!powerReady(s, id) || new Set(targets).size !== targets.length) return;
  const kind = powerOf(s, id)!;
  const r = s.room[id]!;
  const valid = (t: string | undefined): t is string =>
    isPlayer(ctx, t) && t !== id && s.room[t] === r && !immune(s, t);
  const [t1, t2] = targets;

  switch (kind) {
    case 'federal': {
      if (targets.length !== 1 || !valid(t1)) return;
      s.usedRound[id] = s.round;
      notify(s, t1, { k: 'forced', who: id });
      share(s, ctx, id, t1, 'card', 'power', true);
      return;
    }
    case 'terapeuta': {
      if (targets.length !== 1 || !valid(t1)) return;
      learn(s, t1, id, 'power', true);
      // Only someone with a psych condition gets the offer; anyone else just saw the card.
      if (!PSYCH.some((k) => hasCondition(s, t1, k))) return;
      for (const q of s.requests.filter((q) => q.psych && q.to === t1)) dropRequest(s, ctx, q.id);
      s.seq += 1;
      const rid = `r${s.seq}`;
      s.requests.push({ id: rid, from: id, to: t1, kind: 'card', psych: true });
      ctx.setTimer(`req:${rid}`, REQUEST_MS);
      return;
    }
    case 'cobrador': {
      if (targets.length !== 2 || !valid(t1) || !valid(t2)) return;
      s.usedRound[id] = s.round;
      learn(s, t1, id, 'power', true);
      learn(s, t2, id, 'power', true);
      notify(s, t1, { k: 'enforced', who: id, who2: t2 });
      notify(s, t2, { k: 'enforced', who: id, who2: t1 });
      share(s, ctx, t1, t2, 'card', undefined, true);
      return;
    }
    case 'casamenteira':
    case 'intrigante': {
      if (targets.length !== 2 || !valid(t1) || !valid(t2)) return;
      s.usedOnce[id] = true;
      const k = kind === 'casamenteira' ? 'love' : 'hate';
      const opposite = k === 'love' ? 'hate' : 'love';
      for (const [x, y] of pairs(t1, t2)) {
        learn(s, x, id, 'power', true);
        if (hasCondition(s, x, opposite)) {
          s.conditions[x] = s.conditions[x]!.filter((c) => c.k !== opposite);
          notify(s, x, { k: 'cancelled', who: id, who2: y });
        } else {
          s.conditions[x] = [...s.conditions[x]!.filter((c) => c.k !== k), { k, with: y }];
          notify(s, x, { k, who: id, who2: y });
        }
      }
      return;
    }
    case 'usurpador': {
      if (targets.length !== 0) return;
      s.usedOnce[id] = true;
      s.revealed[id] = s.card[id]!;
      if (s.leader[r]) toppled(s, r);
      setLeader(s, r, id);
      s.shielded[r] = true;
      ctx.emit('sound', 'phase');
      return;
    }
    case 'guarda': {
      if (targets.length !== 1 || !valid(t1)) return;
      if (s.locked[r] && s.picks[r].includes(t1)) return;
      s.usedOnce[id] = true;
      s.revealed[id] = s.card[id]!;
      s.tackled.push(t1);
      s.picks[r] = s.picks[r].filter((p) => p !== t1);
      ctx.emit('sound', 'tick');
      return;
    }
    case 'vereador': {
      if (targets.length !== 0) return;
      s.mayors.push(id);
      s.revealed[id] = s.card[id]!;
      checkUsurp(s, r);
      return;
    }
    case 'leao': {
      if (targets.length !== 1 || !valid(t1)) return;
      learn(s, t1, id, 'power', true);
      leaveRoom(s, ctx, t1, r);
      notify(s, t1, { k: 'bounced', who: id, room: other(r) });
      ctx.emit('sound', 'tick');
      return;
    }
  }
}

// ---------------------------------------------------------------- phase flow

function startRound(s: State, ctx: Ctx) {
  s.phase = 'round';
  s.picks = { A: [], B: [] };
  s.locked = { A: false, B: false };
  s.shownLocked = { A: false, B: false };
  s.tackled = [];
  s.shielded = { A: false, B: false };
  s.noReturn = { A: null, B: null };
  s.offer = { A: null, B: null };
  s.exchange = null;
  s.arrived = [];
  for (const id of Object.keys(s.points)) s.points[id] = null;
  if (s.round === s.rounds && s.sober) soberUp(s);
  if (s.round === s.rounds && ctx.config.prematureLoss) markPrematureLosers(s);
  if (ctx.config.timing === 'sem') ctx.clearTimer('phase');
  else ctx.setTimer('phase', (s.minutes[s.round - 1] ?? 1) * 60_000);
  ctx.emit('sound', 'round');
}

/** Start of the last round: whoever holds the Bêbado trades it for the set-aside card, clean. */
function soberUp(s: State) {
  const drunk = holderOf(s, 'bebado');
  if (drunk) {
    s.card[drunk] = s.sober!;
    s.conditions[drunk] = cleanConditions(s.sober!);
    if (s.sober === 'trevo') s.everClover.push(drunk);
    notify(s, drunk, { k: 'sober' });
  }
  s.sober = null;
}

/** Variant: grey players whose goal is already out of reach play the last round as Apostadores. */
function markPrematureLosers(s: State) {
  const goal = majority(s.rounds);
  for (const id of Object.keys(s.card)) {
    const c = s.card[id];
    const lost =
      (c === 'habitue' && s.leftRoom[id]) ||
      (c === 'lacaio' && s.minionFail[id]) ||
      (c === 'turista' && (s.hostageCount[id] ?? 0) + 1 < goal) ||
      (c === 'anarquista' && (s.anarchy[id] ?? []).length + 1 < goal);
    if (lost && !s.gamblerAlt.includes(id)) s.gamblerAlt.push(id);
  }
}

function endRound(s: State, ctx: Ctx) {
  dropAllRequests(s, ctx);
  for (const r of ROOMS) {
    const room = members(s, r);
    if (!room.length) continue;
    if (!s.leader[r] || s.room[s.leader[r]!] !== r) {
      const pool = room.filter((m) => connected(ctx, m));
      setLeader(s, r, ctx.rng.pick(pool.length ? pool : room));
    }
    const count = need(s, r);
    if (s.picks[r].length < count) {
      const rest = ctx.rng.shuffle(eligible(s, r).filter((m) => !s.picks[r].includes(m)));
      s.picks[r] = [...s.picks[r], ...rest.slice(0, count - s.picks[r].length)];
    }
    s.locked[r] = true;
    s.shownLocked[r] = true;
  }
  s.exchange = { A: [...s.picks.A], B: [...s.picks.B] };
  for (const r of ROOMS) {
    for (const id of s.exchange[r]) {
      s.room[id] = other(r);
      s.leftRoom[id] = true;
      s.hostageCount[id] = (s.hostageCount[id] ?? 0) + 1;
    }
  }
  s.offer = { A: null, B: null };
  for (const id of Object.keys(s.points)) s.points[id] = null;
  s.arrived = [];
  s.phase = 'exchange';
  ctx.setTimer('phase', ctx.config.exchangeSeconds * 1000);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'exchange', 2300);
}

function afterExchange(s: State, ctx: Ctx) {
  if (s.round >= s.rounds) return startPause(s, ctx);
  s.round += 1;
  startRound(s, ctx);
}

function choosers(s: State, step: 5 | 10 | 15): string[] {
  const ids = Object.keys(s.card);
  if (step === 5) return s.buried ? ids.filter((id) => s.card[id] === 'investigador') : [];
  if (step === 10) return ids.filter((id) => s.card[id] === 'apostador' || s.gamblerAlt.includes(id));
  return ids.filter((id) => s.card[id] === 'atirador');
}

/** A step runs when its card is in the deck (even if buried, so skipping it reveals nothing). */
function stepInPlay(s: State, step: 5 | 10 | 15): boolean {
  if (step === 5) return s.deck.includes('investigador');
  if (step === 10) return s.deck.includes('apostador') || s.gamblerAlt.length > 0;
  return s.deck.includes('atirador');
}

/** Moves to the next pause step after `after` that has someone to announce, or to the reveal. */
function startPause(s: State, ctx: Ctx, after: 0 | 5 | 10 | 15 = 0) {
  s.phase = 'pause';
  s.pauseChoices = {};
  for (const step of [5, 10, 15] as const) {
    if (step <= after || !stepInPlay(s, step)) continue;
    s.pauseStep = step;
    ctx.setTimer('phase', PAUSE_MS);
    ctx.emit('sound', 'phase');
    return;
  }
  reveal(s, ctx);
}

function endPauseStep(s: State, ctx: Ctx) {
  const step = s.pauseStep;
  if (!step) return reveal(s, ctx);
  for (const who of choosers(s, step)) s.announcements.push({ who, step, value: s.pauseChoices[who] ?? null });
  startPause(s, ctx, step);
}

function pauseOptions(s: State, id: string, step: 5 | 10 | 15): string[] {
  if (step === 5) return [...new Set(s.deck)];
  if (step === 10) return ['ouro', 'carmim', 'nenhum'];
  return Object.keys(s.card).filter((p) => p !== id);
}

function reveal(s: State, ctx: Ctx) {
  s.phase = 'reveal';
  s.pauseStep = null;
  s.result = resolve(s);
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'boom', 2300);
}

// ---------------------------------------------------------------- the end

/** Did player x, holding xCard, card share with whoever held yCard at that moment? */
function cardShared(s: State, x: string | null, xCard: CharId, yCard: CharId | null): boolean {
  if (!x || !yCard) return false;
  return s.shares.some(
    (sh) =>
      sh.kind === 'card' &&
      ((sh.a === x && sh.aCard === xCard && sh.bCard === yCard) ||
        (sh.b === x && sh.bCard === xCard && sh.aCard === yCard)),
  );
}

/** Did `me` card share with `them` while they held `theirCard`? */
function sharedWith(s: State, me: string, them: string | null, theirCard: CharId): boolean {
  if (!them) return false;
  return s.shares.some(
    (sh) =>
      sh.kind === 'card' &&
      ((sh.a === me && sh.b === them && sh.bCard === theirCard) ||
        (sh.b === me && sh.a === them && sh.aCard === theirCard)),
  );
}

export function resolve(s: State): Result {
  const ids = Object.keys(s.card);
  const boss = holderOf(s, bossCard(s));
  const hitman = holderOf(s, hitmanCard(s));
  const roomOf = (id: string | null) => (id ? s.room[id] : null);

  let dead: string[] = [];
  if (s.boom?.kind === 'dinamite') dead = members(s, s.boom.room);
  else if (s.boom?.kind === 'guardaCostas') dead = members(s, s.boom.room).filter((m) => m !== boss);
  else if (hitman && roomOf(hitman)) dead = members(s, roomOf(hitman)!);
  const bossDead = boss !== null && dead.includes(boss);

  const doc = doctorCard(s);
  const eng = engineerCard(s);
  const doctorOk = doc ? cardShared(s, boss, bossCard(s), doc) : null;
  const engineerOk = eng ? cardShared(s, hitman, hitmanCard(s), eng) : null;
  const goldWins = !bossDead && doctorOk !== false;
  const crimsonWins = bossDead && engineerOk !== false;
  const verdict: Verdict = goldWins ? 'ouro' : crimsonWins ? 'carmim' : 'nenhum';

  const announced = (id: string, step: 5 | 10 | 15) =>
    s.announcements.find((a) => a.who === id && a.step === step)?.value ?? null;
  const shot = ids.filter((id) => s.card[id] === 'atirador').map((id) => announced(id, 15));
  const same = (a: string | null, b: string | null) => !!a && !!b && !!roomOf(a) && roomOf(a) === roomOf(b);
  const holder = (c: CharId) => holderOf(s, c);
  const goal = majority(s.rounds);
  // The infected win if everyone still standing (Envoys aside) is infected.
  const standing = ids.filter((id) => !dead.includes(id) && roomOf(id));
  const zombiesWin =
    ids.some((id) => hasCondition(s, id, 'zombie')) && standing.every((id) => hasCondition(s, id, 'zombie'));

  const wins: Record<string, boolean | undefined> = {};
  for (const id of ids) {
    const c = s.card[id]!;
    const team = CATALOG[c].team;
    let ok: boolean | undefined;
    if (s.gamblerAlt.includes(id)) ok = announced(id, 10) === verdict;
    else if (team === 'ouro') ok = goldWins;
    else if (team === 'carmim') ok = crimsonWins;
    else {
      switch (c) {
        case 'apostador':
          ok = announced(id, 10) === verdict;
          break;
        case 'investigador':
          ok = !!s.buried && announced(id, 5) === s.buried;
          break;
        case 'atirador': {
          const t = announced(id, 15);
          ok = !!t && s.card[t] === 'alvo';
          break;
        }
        case 'alvo':
          ok = !shot.includes(id);
          break;
        case 'isca':
          ok = shot.includes(id);
          break;
        case 'afilhado':
          ok = same(id, boss);
          break;
        case 'devedor':
          ok = same(id, hitman);
          break;
        case 'rival':
          ok = !same(id, boss);
          break;
        case 'sobrevivente':
          ok = !same(id, hitman);
          break;
        case 'duquesa':
          ok = !same(id, boss) && !same(id, hitman);
          break;
        case 'abutre':
          ok = same(id, hitman) && !same(boss, hitman);
          break;
        case 'mordomo':
          ok = same(id, holder('governanta')) && same(id, boss);
          break;
        case 'governanta':
          ok = same(id, holder('mordomo')) && same(id, boss);
          break;
        case 'bonnie':
          ok = same(id, holder('clyde')) && same(id, hitman);
          break;
        case 'clyde':
          ok = same(id, holder('bonnie')) && same(id, hitman);
          break;
        case 'esposa':
          ok = same(id, boss) && !same(id, holder('amante'));
          break;
        case 'amante':
          ok = same(id, boss) && !same(id, holder('esposa'));
          break;
        case 'credor':
          ok = same(holder('caloteiro'), hitman) && !same(id, hitman);
          break;
        case 'caloteiro':
          ok = same(holder('credor'), hitman) && !same(id, hitman);
          break;
        case 'habitue':
          ok = !s.leftRoom[id];
          break;
        case 'turista':
          ok = (s.hostageCount[id] ?? 0) >= goal;
          break;
        case 'fichaQuente':
          ok = false;
          break;
        case 'corregedor':
          ok = sharedWith(s, id, boss, bossCard(s)) && sharedWith(s, id, hitman, hitmanCard(s));
          break;
        case 'tirano':
          ok = !(sharedWith(s, id, boss, bossCard(s)) && sharedWith(s, id, hitman, hitmanCard(s)));
          break;
        case 'mandachuva': {
          const r = roomOf(id);
          ok = !!r && s.leader[r] === id && (s.ledRooms[id] ?? []).includes(other(r));
          break;
        }
        case 'anarquista':
          ok = (s.anarchy[id] ?? []).length >= goal;
          break;
        case 'lacaio':
          ok = !s.minionFail[id];
          break;
        case 'trevo':
          ok = true; // whoever holds it at the end
          break;
        case 'contagiado':
          ok = false; // the infection decides, below
          break;
        case 'bebado':
          ok = false; // the match ended before the last round: never sobered up
          break;
        default:
          ok = undefined; // Sombra / Sabotador: resolved below
      }
    }
    // Love and hate replace the goal.
    for (const cond of s.conditions[id] ?? []) {
      if (cond.k === 'love') ok = same(id, cond.with);
      if (cond.k === 'hate') ok = !!roomOf(id) && !!roomOf(cond.with) && !same(id, cond.with);
    }
    // So does the infection.
    if (hasCondition(s, id, 'zombie')) ok = zombiesWin;
    wins[id] = ok;
  }

  // Sombra wins with its first share, Sabotador against it; chains resolve, cycles lose.
  for (let pass = 0; pass < ids.length; pass++) {
    for (const id of ids) {
      if (wins[id] !== undefined) continue;
      const partner = s.firstShare[id];
      if (!partner) wins[id] = false;
      else if (wins[partner] !== undefined) wins[id] = s.card[id] === 'sombra' ? wins[partner] : !wins[partner];
    }
  }

  const tyrants = ids.filter((id) => s.card[id] === 'tirano' && wins[id] && !s.gamblerAlt.includes(id));
  const winners = tyrants.length ? tyrants : ids.filter((id) => wins[id] === true);

  return {
    cards: { ...s.card },
    rooms: { ...s.room },
    buried: s.buried,
    dead,
    winners,
    verdict,
    bossId: boss,
    hitmanId: hitman,
    doctorOk,
    engineerOk,
    boom: s.boom,
    tyrant: tyrants.length > 0,
    zombies: zombiesWin,
  };
}

// ---------------------------------------------------------------- the game

function everyone(ctx: Ctx, done: string[]) {
  return ctx.players.filter((p) => p.connected).every((p) => done.includes(p.id));
}

function maybeEndBriefing(s: State, ctx: Ctx) {
  if (s.phase !== 'briefing') return;
  if (everyone(ctx, ctx.config.briefing === 'dealer' ? s.visited : s.ready)) startRound(s, ctx);
}

function maybeEndExchange(s: State, ctx: Ctx) {
  if (s.phase !== 'exchange' || !s.exchange) return;
  const hostages = [...s.exchange.A, ...s.exchange.B];
  if (hostages.filter((id) => connected(ctx, id)).every((id) => s.arrived.includes(id))) afterExchange(s, ctx);
}

function maybeEndPause(s: State, ctx: Ctx) {
  if (s.phase !== 'pause' || !s.pauseStep) return;
  const list = choosers(s, s.pauseStep).filter((id) => connected(ctx, id));
  if (list.length && list.every((id) => s.pauseChoices[id] !== undefined)) endPauseStep(s, ctx);
}

function onRoundAction(s: State, ctx: Ctx, me: string, a: Action) {
  const r = s.room[me] ?? null;
  switch (a.type) {
    case 'nominate': {
      if (!r || s.leader[r] || !isPlayer(ctx, a.target) || a.target === me || s.room[a.target] !== r) return;
      setLeader(s, r, a.target);
      ctx.emit('sound', 'tick');
      return;
    }
    case 'point': {
      if (!r || !s.leader[r]) return;
      if (a.target !== null && (!isPlayer(ctx, a.target) || s.room[a.target] !== r)) return;
      s.points[me] = a.target;
      checkUsurp(s, r);
      return;
    }
    case 'offerLead': {
      if (!r || s.leader[r] !== me || !isPlayer(ctx, a.target) || a.target === me || s.room[a.target] !== r) return;
      if (s.noReturn[r] === a.target || (s.locked[r] && s.picks[r].includes(a.target))) return;
      s.offer[r] = { from: me, to: a.target };
      return;
    }
    case 'answerLead': {
      if (!r || s.offer[r]?.to !== me || typeof a.accept !== 'boolean') return;
      const from = s.offer[r]!.from;
      if (!a.accept || s.leader[r] !== from) {
        s.offer[r] = null;
        return;
      }
      setLeader(s, r, me);
      s.noReturn[r] = from;
      s.shielded[r] = false;
      return;
    }
    case 'toggleHostage': {
      if (!r || s.leader[r] !== me || s.locked[r] || !eligible(s, r).includes(a.target)) return;
      if (s.picks[r].includes(a.target)) s.picks[r] = s.picks[r].filter((p) => p !== a.target);
      else if (s.picks[r].length < need(s, r)) s.picks[r] = [...s.picks[r], a.target];
      return;
    }
    case 'lockHostages': {
      if (!r || s.leader[r] !== me || s.locked[r] || s.picks[r].length !== need(s, r)) return;
      s.locked[r] = true;
      s.shownLocked[r] = true;
      ctx.emit('sound', 'tick');
      if (ctx.config.timing === 'sem' && ROOMS.every((x) => s.locked[x] || !members(s, x).length)) endRound(s, ctx);
      return;
    }
    case 'request': {
      if (!isPlayer(ctx, a.to) || !reachable(s, me, a.to)) return;
      if ((a.kind !== 'card' && a.kind !== 'color') || (a.kind === 'color' && !s.big)) return;
      // A Terapeuta's cure offer is private to its target and never blocks the Terapeuta.
      if (s.requests.some((q) => !q.psych && (q.from === me || (q.from === a.to && q.to === me)))) return;
      // "Tolo": can never turn down a card share.
      if (!mayShare(s, me, a.kind)) return;
      // "Tolo": can never turn down a share their conditions allow.
      if (hasCondition(s, a.to, 'foolish') && mayShare(s, a.to, a.kind)) return share(s, ctx, me, a.to, a.kind);
      s.seq += 1;
      const id = `r${s.seq}`;
      s.requests.push({ id, from: me, to: a.to, kind: a.kind });
      ctx.setTimer(`req:${id}`, REQUEST_MS);
      return;
    }
    case 'answer': {
      const q = s.requests.find((x) => x.id === a.id && x.to === me);
      if (!q || typeof a.accept !== 'boolean') return;
      if (a.accept && !q.psych && !(mayShare(s, me, q.kind) && mayShare(s, q.from, q.kind))) return;
      dropRequest(s, ctx, q.id);
      if (!reachable(s, q.from, q.to)) return;
      if (!a.accept) return q.psych ? undefined : notify(s, q.from, { k: 'declined', who: me });
      if (!q.psych) return share(s, ctx, q.from, q.to, q.kind);
      // The Terapeuta's cure: a card share that sheds every psych condition.
      share(s, ctx, q.from, q.to, 'card', undefined, true);
      s.conditions[me] = (s.conditions[me] ?? []).filter((c) => !PSYCH.includes(c.k));
      notify(s, me, { k: 'healed', who: q.from });
      return;
    }
    case 'cancel': {
      const q = s.requests.find((x) => x.from === me && !x.psych);
      if (q) dropRequest(s, ctx, q.id);
      return;
    }
    case 'show': {
      if (!isPlayer(ctx, a.to) || !reachable(s, me, a.to)) return;
      if ((a.kind !== 'card' && a.kind !== 'color') || (a.kind === 'color' && !s.big)) return;
      if (!mayShowCard(s, me)) return;
      learn(s, a.to, me, a.kind === 'card' ? 'shown' : 'colorShown', a.kind === 'card');
      return;
    }
    case 'showRoom': {
      if (!r || !mayShowCard(s, me)) return;
      for (const m of members(s, r)) if (m !== me) learn(s, m, me, 'public', true);
      return;
    }
    case 'power': {
      if (!Array.isArray(a.targets) || a.targets.some((t) => typeof t !== 'string')) return;
      usePower(s, ctx, me, a.targets);
      return;
    }
  }
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const s: State = {
      phase: ctx.config.tutorial ? 'intro' : 'mesa',
      round: 1,
      rounds: 3,
      hostages: [],
      minutes: [],
      effective: ctx.players.length,
      big: false,
      units: [],
      bury: false,
      card: {},
      buried: null,
      deck: [],
      room: {},
      leftRoom: {},
      leader: { A: null, B: null },
      shielded: { A: false, B: false },
      noReturn: { A: null, B: null },
      offer: { A: null, B: null },
      ledRooms: {},
      points: {},
      picks: { A: [], B: [] },
      locked: { A: false, B: false },
      shownLocked: { A: false, B: false },
      tackled: [],
      exchange: null,
      arrived: [],
      hostageCount: {},
      anarchy: {},
      minionFail: {},
      conditions: {},
      usedRound: {},
      usedOnce: {},
      revealed: {},
      mayors: [],
      seen: {},
      shares: [],
      firstShare: {},
      requests: [],
      seq: 0,
      notices: {},
      ready: [],
      visited: [],
      pauseStep: null,
      pauseChoices: {},
      announcements: [],
      gamblerAlt: [],
      paranoidUsed: {},
      everClover: [],
      sober: null,
      boom: null,
      result: null,
      slide: 0,
      tvRules: null,
    };
    applyPreset(s, ctx, ctx.config.preset);
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    return s;
  },

  onAction(s, me, raw, ctx) {
    const a = raw as Action;
    if (!a || typeof a !== 'object' || typeof a.type !== 'string') return;

    // Shared screens (tutorial slides, rules on the TV) follow the room's Host only.
    if (a.type === 'tvRules') {
      const ok = a.page === null || (Number.isInteger(a.page) && a.page >= 0 && a.page < RULES.length);
      if (ok && isRoomHost(ctx, me)) s.tvRules = a.page;
      return;
    }
    if (a.type === 'intro') {
      if (s.phase !== 'intro' || !isRoomHost(ctx, me)) return;
      const last = s.slide === SLIDES.length - 1;
      if (a.dir === 'skip' || (a.dir === 1 && last)) endIntro(s, ctx);
      else if (a.dir === 1) s.slide += 1;
      else if (a.dir === -1 && s.slide > 0) s.slide -= 1;
      return;
    }

    if (s.phase === 'mesa') {
      if (me !== hostId(ctx)) return;
      if (a.type === 'toggleUnit') {
        if (typeof a.unit !== 'string' || !UNIT_BY_ID[a.unit]) return;
        s.units = s.units.includes(a.unit) ? s.units.filter((u) => u !== a.unit) : [...s.units, a.unit];
      } else if (a.type === 'setBury') {
        if (typeof a.on !== 'boolean' || (a.on && !canBury(ctx))) return;
        s.bury = a.on;
      } else if (a.type === 'preset') {
        if (typeof a.id !== 'string' || !PRESETS[a.id]) return;
        applyPreset(s, ctx, a.id);
      } else if (a.type === 'deal') {
        if (!mesaErrors(s, ctx).length) deal(s, ctx);
      }
      return;
    }

    if (s.phase === 'briefing') {
      if (a.type !== 'ready' || ctx.config.briefing === 'dealer' || s.ready.includes(me)) return;
      s.ready.push(me);
      maybeEndBriefing(s, ctx);
      return;
    }

    if (s.phase === 'round') return onRoundAction(s, ctx, me, a);

    if (s.phase === 'exchange') {
      if (a.type !== 'arrived' || !s.exchange || s.arrived.includes(me)) return;
      if (!s.exchange.A.includes(me) && !s.exchange.B.includes(me)) return;
      s.arrived.push(me);
      maybeEndExchange(s, ctx);
      return;
    }

    if (s.phase === 'pause') {
      if (a.type !== 'pauseChoice' || !s.pauseStep || typeof a.value !== 'string') return;
      if (!choosers(s, s.pauseStep).includes(me) || s.pauseChoices[me] !== undefined) return;
      if (!pauseOptions(s, me, s.pauseStep).includes(a.value)) return;
      s.pauseChoices[me] = a.value;
      maybeEndPause(s, ctx);
    }
  },

  onTimer(s, key, ctx) {
    if (key === 'intro') {
      if (s.phase === 'intro') endIntro(s, ctx);
      return;
    }
    if (key.startsWith('req:')) {
      const q = s.requests.find((x) => `req:${x.id}` === key);
      if (q) {
        s.requests = s.requests.filter((x) => x.id !== q.id);
        if (!q.psych) notify(s, q.from, { k: 'expired', who: q.to });
      }
      return;
    }
    if (key !== 'phase') return;
    if (s.phase === 'briefing') startRound(s, ctx);
    else if (s.phase === 'round') endRound(s, ctx);
    else if (s.phase === 'exchange') afterExchange(s, ctx);
    else if (s.phase === 'pause') endPauseStep(s, ctx);
    else if (s.phase === 'reveal') {
      const winners = s.result?.winners ?? [];
      ctx.end({ scores: Object.fromEntries(ctx.players.map((p) => [p.id, winners.includes(p.id) ? 1 : 0])) });
    }
  },

  onPlayerTimeout(s, id, ctx) {
    // The Host left during the tutorial: nobody else can advance it.
    if (s.phase === 'intro' && isRoomHost(ctx, id)) return endIntro(s, ctx);
    dropRequestsOf(s, ctx, id);
    for (const r of ROOMS) {
      if (s.offer[r]?.to === id || s.offer[r]?.from === id) s.offer[r] = null;
      if (s.phase === 'round' && s.leader[r] === id) setLeader(s, r, null);
    }
    maybeEndBriefing(s, ctx);
    maybeEndExchange(s, ctx);
    maybeEndPause(s, ctx);
  },

  canVisitDealer(s, id, ctx) {
    return s.phase === 'briefing' && ctx.config.briefing === 'dealer' && !s.visited.includes(id);
  },

  onDealerEnter(s, id) {
    if (!s.visited.includes(id)) s.visited.push(id);
  },

  onDealerLeave(s, _id, ctx) {
    maybeEndBriefing(s, ctx);
  },

  publicView(s, ctx): PublicView {
    const dealer = ctx.config.briefing === 'dealer';
    return {
      phase: s.phase,
      round: s.round,
      rounds: s.rounds,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      hostages: s.hostages,
      minutes: s.minutes,
      big: s.big,
      timed: ctx.config.timing !== 'sem',
      rooms: { A: members(s, 'A'), B: members(s, 'B') },
      envoys: Object.keys(s.room).filter((id) => s.room[id] === null),
      leaders: s.leader,
      locked: s.shownLocked,
      revealed: s.revealed,
      tackled: s.phase === 'round' ? s.tackled : [],
      mesa: s.phase === 'mesa' ? mesaView(s, ctx) : null,
      deck: s.deck,
      briefing: s.phase === 'briefing' ? { mode: dealer ? 'dealer' : 'phone', done: dealer ? s.visited : s.ready } : null,
      exchange: s.phase === 'exchange' ? s.exchange : null,
      arrived: s.arrived,
      pause:
        s.phase === 'pause' && s.pauseStep
          ? { step: s.pauseStep, choosers: choosers(s, s.pauseStep), chosen: Object.keys(s.pauseChoices) }
          : null,
      announcements: s.announcements,
      suddenEnd: s.boom !== null && s.phase === 'pause',
      result: s.phase === 'reveal' ? s.result : null,
      slide: s.slide,
      slides: SLIDES.length,
      tvRules: s.tvRules,
      hint: hint(s, ctx),
    };
  },

  playerView(s, id, ctx): PlayerView {
    const r = s.room[id] ?? null;
    const dealt = s.card[id] !== undefined;
    const mayLook = dealt && !(s.phase === 'briefing' && ctx.config.briefing === 'dealer' && !s.visited.includes(id));
    const isLeader = !!r && s.leader[r] === id;
    const out = s.requests.find((q) => q.from === id && !q.psych);
    const step = s.phase === 'pause' ? s.pauseStep : null;
    const kind = mayLook ? powerOf(s, id) : null;
    let hostage: Room | null = null;
    if (s.phase === 'exchange' && s.exchange) {
      if (s.exchange.A.includes(id)) hostage = 'B';
      if (s.exchange.B.includes(id)) hostage = 'A';
    }
    return {
      phase: s.phase,
      round: s.round,
      rounds: s.rounds,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      isHost: id === hostId(ctx),
      big: s.big,
      card: mayLook ? s.card[id]! : null,
      room: r,
      envoy: dealt && r === null,
      conditions: mayLook ? (s.conditions[id] ?? []) : [],
      reachable: s.phase === 'round' ? Object.keys(s.card).filter((o) => reachable(s, id, o)) : [],
      roomMates: r ? members(s, r) : [],
      leader: r ? s.leader[r] : null,
      isLeader,
      points: r ? Object.fromEntries(members(s, r).map((m) => [m, s.points[m] ?? null])) : {},
      offer: r ? s.offer[r] : null,
      noReturn: r ? s.noReturn[r] : null,
      picks: r ? s.picks[r] : [],
      locked: r ? s.locked[r] : false,
      need: r && s.phase === 'round' ? need(s, r) : 0,
      eligible: r && isLeader ? eligible(s, r) : [],
      tackled: s.phase === 'round' ? s.tackled : [],
      requestsIn: s.requests
        .filter((q) => q.to === id)
        .map((q) => ({ id: q.id, from: q.from, kind: q.kind, psych: !!q.psych, canAccept: !!q.psych || mayShare(s, id, q.kind) })),
      allowed: dealt
        ? { cardShare: mayCardShare(s, id), colorShare: s.big && mayColorShare(s, id), show: mayShowCard(s, id) }
        : { cardShare: false, colorShare: false, show: false },
      requestOut: out ? { id: out.id, to: out.to, kind: out.kind } : null,
      seen: s.seen[id] ?? [],
      notices: s.notices[id] ?? [],
      power: kind ? { kind, ready: powerReady(s, id) } : null,
      ready: s.ready.includes(id) || s.visited.includes(id),
      mesa: s.phase === 'mesa' ? mesaView(s, ctx) : null,
      briefingMode: ctx.config.briefing === 'dealer' ? 'dealer' : 'phone',
      hostage,
      arrived: s.arrived.includes(id),
      pause: step
        ? choosers(s, step).includes(id)
          ? { step, mine: true, choice: s.pauseChoices[id] ?? null, options: pauseOptions(s, id, step) }
          : { step, mine: false, choice: null, options: [] }
        : null,
      deck: s.deck,
      result: s.phase === 'reveal' ? s.result : null,
      slide: s.slide,
      slides: SLIDES.length,
      tvRules: s.tvRules,
    };
  },

  dealerView(s, id): DealerView {
    return { card: s.card[id] ?? null, room: s.room[id] ?? null };
  },
});
