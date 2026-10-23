import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import {
  ALARM_MAX,
  BASE_DRAW,
  BASE_OBSTACLES,
  CARDS,
  LINE_SIZE,
  MISSIONS,
  RULE_PAGES,
  STARTING_DECK,
  TUTORIAL_SLIDES,
  type CardDef,
  type CostKind,
  type ObType,
} from './shared.ts';

// Agent Decker — solo deckbuilding game by Manuel Correia (gamesbymanuel.com), CC BY-NC 4.0.
// One agent (p1) plays the whole campaign. Every rule here follows the printed rulebook and cards;
// the choices the rulebook leaves open are listed in DESIGN.md.

export const manifest = manifestJson as GameManifest;

export interface Config {
  missions: number;
  tutorial: boolean;
  turnSeconds: number;
}

export interface Card {
  uid: string;
  def: string;
}

export interface Slot extends Card {
  /** Knocked out: face down, type and effect ignored, no alarm when it leaves. */
  down: boolean;
}

export type PendingKind =
  | 'bin'
  | 'burn'
  | 'recall'
  | 'distraction'
  | 'saveBullets'
  | 'misdirect'
  | 'justTheThing'
  | 'planAhead'
  | 'foresight';

export interface Pending {
  kind: PendingKind;
  /** Plan Ahead / Foresight: the cards taken off the top of the deck, top first. SECRET. */
  cards?: Card[];
}

export type Phase = 'intro' | 'play' | 'mission' | 'over';

export type LogEvent =
  | { k: 'leave'; def: string; n: number }
  | { k: 'leaveDown'; def: string }
  | { k: 'siren'; n: number }
  | { k: 'flip'; def: string }
  | { k: 'disarm'; def: string }
  | { k: 'knock'; def: string }
  | { k: 'equip'; def: string }
  | { k: 'item'; def: string; target: string }
  | { k: 'obShuffle' }
  | { k: 'deckShuffle' };

export interface State {
  phase: Phase;
  slide: number;
  mission: number;
  turn: number;
  alarm: number;
  line: (Slot | null)[];
  /** Top of every pile is index 0. SECRET order. */
  obDeck: Card[];
  obDiscard: Card[];
  /** SECRET order. */
  deck: Card[];
  hand: Card[];
  play: Card[];
  discard: Card[];
  equip: Card[];
  removed: Card[];
  pool: { stealth: number; fight: number };
  interactions: number;
  pending: Pending | null;
  saved: string | null;
  undo: { uid: string; stealth: number; fight: number; from: 'play' | 'obDiscard' }[];
  /** Alarm at the moment each completed mission was completed. */
  results: number[];
  outcome: null | { won: boolean; reason: 'done' | 'alarm' | 'time' | 'left' };
  log: { id: number; e: LogEvent }[];
  seq: number;
  tvRules: number | null;
  /** Bumps on every Line Scroll so the TV can replay its slide animation. */
  scrolls: number;
}

export interface SlotView extends Slot {
  /** Cost after Watchtower; null for face-down cards. */
  cost: { kind: CostKind; n: number } | null;
  /** Why the agent can't interact with it right now (rule-based, not resource-based). */
  blocked: null | 'hawk' | 'sniper';
  affordable: boolean;
  /** Equipped items that can pay for it. */
  items: string[];
}

export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tutorial: boolean;
  mission: number;
  missions: number;
  turn: number;
  alarm: number;
  line: (SlotView | null)[];
  obDeck: number;
  obDiscard: number;
  deck: number;
  hand: Card[];
  play: Card[];
  discard: Card[];
  equip: Card[];
  removed: number;
  pool: { stealth: number; fight: number };
  interactions: number;
  maxInteractions: number;
  draw: number;
  pendingKind: PendingKind | null;
  saved: string | null;
  canUndo: boolean;
  goalMet: boolean;
  results: number[];
  outcome: State['outcome'];
  score: number;
  log: State['log'];
  tvRules: number | null;
  scrolls: number;
  hint: null | 'play' | 'interact' | 'goal' | 'end';
  deadline: number | null;
  total: number | null;
}

export interface PlayerView extends PublicView {
  /** Only on the agent's phone: what Plan Ahead / Foresight / Just the Thing let them see. */
  looking: Card[] | null;
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'play'; uid: string; opt?: 'fight' | 'draw' }
  | { type: 'equip'; uid: string }
  | {
      type: 'interact';
      slot: number;
      mode: 'disarm' | 'knock' | 'adjacent';
      target?: number;
      equip?: boolean;
      /** For {any} costs: how much of it is paid with stealth (the rest with fight). */
      stealth?: number;
      /** Pay with this equipped item instead of resources. */
      item?: string;
    }
  | { type: 'resolve'; uids?: string[]; slot?: number; keep?: string; order?: string[] }
  | { type: 'undo' }
  | { type: 'endTurn' }
  | { type: 'continue' }
  | { type: 'finish' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const END_MS = 60_000;
const HINT_TURNS = 3;

const def = (id: string): CardDef => CARDS[id]!;

// ---------------------------------------------------------------------------
// Piles
// ---------------------------------------------------------------------------

function make(state: State, ids: string[]): Card[] {
  return ids.map((d) => ({ uid: `c${state.seq++}`, def: d }));
}

function pushLog(state: State, e: LogEvent) {
  const id = (state.log[0]?.id ?? 0) + 1;
  state.log = [{ id, e }, ...state.log].slice(0, 6);
}

/** Draws up to n cards, reshuffling the discard into the deck when it runs out. */
function draw(state: State, n: number, ctx: Ctx) {
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) return;
      state.deck = ctx.rng.shuffle(state.discard);
      state.discard = [];
      pushLog(state, { k: 'deckShuffle' });
    }
    state.hand.push(state.deck.shift()!);
  }
}

function drawObstacle(state: State, ctx: Ctx): Card | null {
  if (state.obDeck.length === 0) {
    if (state.obDiscard.length === 0) return null;
    state.obDeck = ctx.rng.shuffle(state.obDiscard);
    state.obDiscard = [];
    pushLog(state, { k: 'obShuffle' });
  }
  return state.obDeck.shift()!;
}

function takeFrom(list: Card[], uid: string): Card | null {
  const i = list.findIndex((c) => c.uid === uid);
  return i < 0 ? null : list.splice(i, 1)[0]!;
}

// ---------------------------------------------------------------------------
// The line
// ---------------------------------------------------------------------------

const isPerson = (s: Slot | null) => !!s && !s.down && def(s.def).bottom?.type === 'person';
const passive = (s: Slot | null) => (s && !s.down ? def(s.def).bottom?.passive : undefined);
const faceUpHas = (state: State, p: string) => state.line.some((s) => passive(s) === p);

/** Reorders the cards among the occupied slots, keeping every gap where it was. */
function reorder(state: State, fn: (cards: Slot[]) => Slot[]) {
  const occ = state.line.flatMap((s, i) => (s ? [i] : []));
  const cards = fn(occ.map((i) => state.line[i]!));
  occ.forEach((slot, k) => (state.line[slot] = cards[k]!));
}

/** "When appears" effects (Guard Dog, Radio Tower). */
function appear(state: State, uid: string) {
  const p = passive(state.line.find((s) => s?.uid === uid) ?? null);
  if (p === 'guardDog') {
    reorder(state, (cards) => {
      const k = cards.findIndex((c) => c.uid === uid);
      const persons = cards.flatMap((c, i) => (isPerson(c) ? [i] : []));
      if (!persons.length) return cards;
      // Towards the nearest person, to the right first (the rulebook's example).
      const right = persons.find((i) => i > k);
      const left = [...persons].reverse().find((i) => i < k);
      const out = cards.filter((c) => c.uid !== uid);
      const dog = cards[k]!;
      if (right !== undefined) out.splice(right - 1, 0, dog);
      else out.splice(left! + 1, 0, dog);
      return out;
    });
  } else if (p === 'radioTower') {
    reorder(state, (cards) => {
      const k = cards.findIndex((c) => c.uid === uid);
      const before = cards.slice(0, k);
      const after = cards.slice(k + 1);
      return [
        ...before.filter((c) => !isPerson(c)),
        ...before.filter(isPerson),
        cards[k]!,
        ...after.filter(isPerson),
        ...after.filter((c) => !isPerson(c)),
      ];
    });
  }
}

/** New obstacles come in from the left, read as they appear. False = out of time. */
function refill(state: State, ctx: Ctx): boolean {
  for (let i = LINE_SIZE - 1; i >= 0; i--) {
    if (state.line[i]) continue;
    const card = drawObstacle(state, ctx);
    if (!card) return false;
    state.line[i] = { ...card, down: false };
    appear(state, card.uid);
  }
  return true;
}

/** Slides cards right to close the gaps. Dormitory keeps face-down cards where they are. */
function compact(state: State) {
  const dorm = faceUpHas(state, 'dormitory');
  const fixed = state.line.map((s) => !!s && dorm && s.down);
  const moving = state.line.filter((s, i): s is Slot => !!s && !fixed[i]);
  const next: (Slot | null)[] = state.line.map((s, i) => (fixed[i] ? s : null));
  for (let i = LINE_SIZE - 1; i >= 0 && moving.length; i--) if (!fixed[i]) next[i] = moving.pop()!;
  state.line = next;
}

/** 3 - Line Scroll. Returns false when the alarm went off. */
function lineScroll(state: State, ctx: Ctx): boolean {
  // Inspector flips the last card face up before it leaves.
  if (faceUpHas(state, 'inspector')) {
    const last = [...state.line].reverse().find((s) => s);
    if (last?.down) {
      last.down = false;
      pushLog(state, { k: 'flip', def: last.def });
      appear(state, last.uid);
    }
  }
  const lastIdx = state.line.map((s) => !!s).lastIndexOf(true);
  if (lastIdx >= 0) {
    const leaving = state.line[lastIdx]!;
    state.line[lastIdx] = null;
    state.obDiscard.push({ uid: leaving.uid, def: leaving.def });
    if (leaving.down) {
      pushLog(state, { k: 'leaveDown', def: leaving.def });
    } else {
      const alarm = def(leaving.def).bottom!.alarm;
      state.alarm += alarm;
      if (def(leaving.def).bottom!.passive === 'siren') {
        for (let i = 0; i < LINE_SIZE; i++) {
          const s = state.line[i];
          if (s) state.obDiscard.push({ uid: s.uid, def: s.def });
          state.line[i] = null;
        }
        pushLog(state, { k: 'siren', n: alarm });
      } else {
        pushLog(state, { k: 'leave', def: leaving.def, n: alarm });
      }
    }
  }
  state.scrolls += 1;
  if (state.alarm >= ALARM_MAX) return false;
  compact(state);
  // Patrolling Guard slides forward one more position.
  for (let i = LINE_SIZE - 2; i >= 0; i--) {
    if (passive(state.line[i]!) === 'patrol' && state.line[i + 1]) {
      [state.line[i], state.line[i + 1]] = [state.line[i + 1]!, state.line[i]!];
    }
  }
  return true;
}

function effectiveCost(state: State, i: number): { kind: CostKind; n: number } | null {
  const s = state.line[i];
  if (!s || s.down) return null;
  const c = def(s.def).bottom!.cost;
  let extra = 0;
  for (const j of [i - 1, i + 1]) if (passive(state.line[j] ?? null) === 'watchtower') extra += 2;
  return { kind: c.kind, n: c.n + extra };
}

function blockedBy(state: State, i: number): SlotView['blocked'] {
  const s = state.line[i];
  if (!s || s.down) return null;
  const b = def(s.def).bottom!;
  if (b.cost.kind === 'stealth' && faceUpHas(state, 'hawk')) return 'hawk';
  if (b.passive === 'sniper' && state.line.some((o, j) => j !== i && isPerson(o))) return 'sniper';
  return null;
}

function canAfford(pool: State['pool'], cost: { kind: CostKind; n: number }) {
  if (cost.kind === 'stealth') return pool.stealth >= cost.n;
  if (cost.kind === 'fight') return pool.fight >= cost.n;
  return pool.stealth + pool.fight >= cost.n;
}

function itemsFor(state: State, type: ObType) {
  return state.equip.filter((c) => def(c.def).top.item === type).map((c) => c.uid);
}

// ---------------------------------------------------------------------------
// Turn structure
// ---------------------------------------------------------------------------

function maxInteractions(state: State) {
  return Math.max(1, ...state.equip.map((c) => def(c.def).top.rule?.interactions ?? 1));
}

function drawCount(state: State) {
  return Math.max(BASE_DRAW, ...state.equip.map((c) => def(c.def).top.rule?.draw ?? BASE_DRAW));
}

function setTurnTimer(ctx: Ctx) {
  if (ctx.config.turnSeconds > 0) ctx.setTimer('turn', ctx.config.turnSeconds * 1000);
  else ctx.clearTimer('turn');
}

function startTurn(state: State) {
  state.turn += 1;
  state.interactions = 0;
  state.pending = null;
  state.undo = [];
  state.pool = { stealth: 0, fight: 0 };
  // Equipped resources (Map, Guard Uniform, Prisoner) can be used once a turn.
  for (const c of state.equip) {
    const r = def(c.def).top.res;
    if (r && typeof r.n === 'number') state.pool[r.kind] += r.n;
  }
}

function goalMet(state: State): boolean {
  const g = MISSIONS[state.mission]!.goal;
  if (g.kind === 'hand') return state.hand.length >= g.n;
  if (g.kind === 'knockAll') return state.line.every((s) => s?.down);
  if (g.item && !state.equip.some((c) => c.def === g.item)) return false;
  return canAfford(state.pool, g.cost);
}

/** Drops an unresolved choice; looked-at cards go back on top in their order. */
function dropPending(state: State) {
  if (state.pending?.cards) state.deck.unshift(...state.pending.cards);
  state.pending = null;
}

function gameOver(state: State, ctx: Ctx, won: boolean, reason: NonNullable<State['outcome']>['reason']) {
  state.phase = 'over';
  state.outcome = { won, reason };
  ctx.clearTimer('turn');
  ctx.setTimer('end', END_MS);
  ctx.emit('sound', won ? 'reveal' : 'drumroll');
  if (won) ctx.emit('fx', 'victory');
}

/** Mission Progression, steps 1–6 of the rulebook. */
function completeMission(state: State, ctx: Ctx) {
  const m = MISSIONS[state.mission]!;
  state.results.push(state.alarm);
  state.equip.push(...make(state, [m.reward]));
  ctx.emit('sound', 'reveal');
  ctx.emit('fx', 'mission');
  if (state.results.length >= ctx.config.missions || state.mission === MISSIONS.length - 1) {
    gameOver(state, ctx, true, 'done');
    return;
  }
  state.obDiscard.push(...make(state, m.adds));
  const lineCards = state.line.flatMap((s) => (s ? [{ uid: s.uid, def: s.def }] : []));
  state.obDeck = ctx.rng.shuffle([...state.obDeck, ...state.obDiscard, ...lineCards]);
  state.obDiscard = [];
  state.line = Array(LINE_SIZE).fill(null);
  state.mission += 1;
  state.alarm = 0;
  state.deck = ctx.rng.shuffle([...state.deck, ...state.discard, ...state.play, ...state.hand]);
  state.discard = [];
  state.play = [];
  state.hand = [];
  state.saved = null;
  if (!refill(state, ctx)) {
    gameOver(state, ctx, false, 'time');
    return;
  }
  startTurn(state);
  draw(state, drawCount(state), ctx);
  state.phase = 'mission';
  ctx.clearTimer('turn');
}

function endTurn(state: State, ctx: Ctx) {
  dropPending(state);
  // 2 - Mission Check
  if (goalMet(state)) {
    completeMission(state, ctx);
    return;
  }
  // 3 - Line Scroll
  if (!lineScroll(state, ctx)) {
    gameOver(state, ctx, false, 'alarm');
    return;
  }
  // 4 - Card Refresh
  if (!refill(state, ctx)) {
    gameOver(state, ctx, false, 'time');
    return;
  }
  const keep = state.saved ? takeFrom(state.hand, state.saved) : null;
  state.discard.push(...state.hand, ...state.play);
  state.hand = keep ? [keep] : [];
  state.play = [];
  state.saved = null;
  startTurn(state);
  draw(state, drawCount(state), ctx);
  setTurnTimer(ctx);
  ctx.emit('sound', 'phase');
}

// ---------------------------------------------------------------------------
// 1 - Use Cards: cards from the hand
// ---------------------------------------------------------------------------

function playCard(state: State, uid: string, opt: unknown, ctx: Ctx) {
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return;
  const top = def(card.def).top;
  if (!top.res && !top.effect) return; // Keycard & co. are only equipped
  if (top.effect === 'rock' && opt !== 'fight' && opt !== 'draw') return;
  takeFrom(state.hand, uid);
  if (top.toObstacles) state.obDiscard.push(card);
  else state.play.push(card);

  let stealth = 0;
  let fight = 0;
  if (top.res && typeof top.res.n === 'number') {
    if (top.res.kind === 'stealth') stealth += top.res.n;
    else fight += top.res.n;
  }
  let undoable = true;
  switch (top.effect) {
    case 'flashy':
      fight += Math.floor(state.discard.length / 2);
      break;
    case 'rock':
      if (opt === 'fight') fight += 1;
      else {
        draw(state, 1, ctx);
        undoable = false;
      }
      break;
    case 'draw1':
    case 'draw2':
    case 'draw3':
      draw(state, Number(top.effect.slice(4)), ctx);
      undoable = false;
      break;
    case 'gearUp':
      draw(state, Math.min(3, state.equip.filter((c) => def(c.def).top.keep).length), ctx);
      undoable = false;
      break;
    case 'swap':
      [state.deck, state.discard] = [state.discard, state.deck];
      undoable = false;
      break;
    case 'retrace':
      state.obDeck = ctx.rng.shuffle([...state.obDeck, ...state.obDiscard]);
      state.obDiscard = [];
      undoable = false;
      break;
    case 'planAhead':
    case 'foresight': {
      const cards = state.deck.splice(0, top.effect === 'planAhead' ? 3 : 5);
      if (cards.length) state.pending = { kind: top.effect, cards };
      undoable = false;
      break;
    }
    case 'bin':
    case 'misdirect':
    case 'saveBullets':
      if (state.hand.length) state.pending = { kind: top.effect };
      undoable = false;
      break;
    case 'burn':
    case 'recall':
      if (state.discard.length) state.pending = { kind: top.effect };
      undoable = false;
      break;
    case 'justTheThing':
      if (state.deck.length) state.pending = { kind: 'justTheThing' };
      undoable = false;
      break;
    case 'distraction':
      if (state.line.some((s) => s)) state.pending = { kind: 'distraction' };
      undoable = false;
      break;
  }
  state.pool.stealth += stealth;
  state.pool.fight += fight;
  if (undoable) state.undo.push({ uid, stealth, fight, from: top.toObstacles ? 'obDiscard' : 'play' });
  else state.undo = [];
}

function resolve(state: State, a: Extract<Action, { type: 'resolve' }>, ctx: Ctx) {
  const p = state.pending!;
  const uids = Array.isArray(a.uids) ? a.uids : [];
  if (!uids.every((u) => typeof u === 'string') || new Set(uids).size !== uids.length) return;
  const inHand = uids.every((u) => state.hand.some((c) => c.uid === u));
  const inDiscard = uids.every((u) => state.discard.some((c) => c.uid === u));
  switch (p.kind) {
    case 'bin':
      if (!inHand) return;
      for (const u of uids) state.removed.push(takeFrom(state.hand, u)!);
      break;
    case 'misdirect':
      if (!inHand) return;
      for (const u of uids) state.play.push(takeFrom(state.hand, u)!);
      state.pool.stealth += 2 * uids.length;
      break;
    case 'burn':
      if (!inDiscard || uids.length > 2) return;
      for (const u of uids) state.removed.push(takeFrom(state.discard, u)!);
      break;
    case 'recall':
      if (!inDiscard || uids.length !== 1) return;
      state.hand.push(takeFrom(state.discard, uids[0]!)!);
      break;
    case 'saveBullets':
      if (!inHand || uids.length > 1) return;
      state.saved = uids[0] ?? null;
      break;
    case 'justTheThing': {
      if (uids.length !== 1 || !state.deck.some((c) => c.uid === uids[0])) return;
      const found = takeFrom(state.deck, uids[0]!)!;
      state.deck = [found, ...ctx.rng.shuffle(state.deck)];
      break;
    }
    case 'distraction': {
      const from = a.slot;
      if (typeof from !== 'number' || !Number.isInteger(from) || !state.line[from]) return;
      const card = state.line[from]!;
      state.line[from] = null;
      // Push the cards at the start of the line right until the gap it left is filled.
      let carry: Slot | null = card;
      for (let i = 0; i < LINE_SIZE && carry; i++) [state.line[i], carry] = [carry, state.line[i] ?? null];
      break;
    }
    case 'planAhead':
    case 'foresight': {
      const cards = p.cards!;
      const keep = p.kind === 'planAhead' ? cards.find((c) => c.uid === a.keep) : undefined;
      if (p.kind === 'planAhead' && !keep) return;
      const rest = cards.filter((c) => c !== keep);
      const order = Array.isArray(a.order) ? a.order : [];
      if (order.length !== rest.length || new Set(order).size !== order.length) return;
      if (!rest.every((c) => order.includes(c.uid))) return;
      if (keep) state.hand.push(keep);
      state.deck.unshift(...order.map((u) => rest.find((c) => c.uid === u)!));
      break;
    }
  }
  state.pending = null;
}

// ---------------------------------------------------------------------------
// 1 - Use Cards: interacting with the line
// ---------------------------------------------------------------------------

function interact(state: State, a: Extract<Action, { type: 'interact' }>) {
  const i = a.slot;
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= LINE_SIZE) return;
  const s = state.line[i];
  if (!s || s.down || blockedBy(state, i)) return;
  if (state.interactions >= maxInteractions(state)) return;
  const bottom = def(s.def).bottom!;
  if (a.mode !== 'disarm' && a.mode !== 'knock' && a.mode !== 'adjacent') return;
  let adjacent: number | null = null;
  if (a.mode === 'adjacent') {
    if (bottom.passive !== 'clumsy' || (a.target !== i - 1 && a.target !== i + 1)) return;
    const t = state.line[a.target];
    if (!t || t.down) return;
    adjacent = a.target;
  }
  const keepIt = a.mode === 'disarm' && a.equip === true;
  if (keepIt && !def(s.def).top.keep) return;

  // Pay: with an equipped item, or from the pool.
  if (a.item !== undefined) {
    if (!itemsFor(state, bottom.type).includes(a.item)) return;
    const item = takeFrom(state.equip, a.item)!;
    state.discard.push(item);
    pushLog(state, { k: 'item', def: item.def, target: s.def });
  } else {
    const cost = effectiveCost(state, i)!;
    if (!canAfford(state.pool, cost)) return;
    if (cost.kind === 'any') {
      const st = a.stealth ?? Math.max(0, cost.n - state.pool.fight);
      if (!Number.isInteger(st) || st < 0 || st > cost.n || st > state.pool.stealth || cost.n - st > state.pool.fight) return;
      state.pool.stealth -= st;
      state.pool.fight -= cost.n - st;
    } else {
      state.pool[cost.kind] -= cost.n;
    }
  }
  state.interactions += 1;
  state.undo = [];

  // Flammable Barrel knocks out its neighbours whatever you do to it.
  if (bottom.passive === 'barrel') {
    for (const j of [i - 1, i + 1]) {
      const n = state.line[j];
      if (n) n.down = true;
    }
  }
  if (adjacent !== null) {
    state.line[adjacent]!.down = true;
    pushLog(state, { k: 'knock', def: state.line[adjacent]!.def });
  } else if (a.mode === 'knock') {
    s.down = true;
    pushLog(state, { k: 'knock', def: s.def });
  } else {
    state.line[i] = null;
    const card = { uid: s.uid, def: s.def };
    if (keepIt) state.equip.push(card);
    else state.play.push(card);
    pushLog(state, { k: keepIt ? 'equip' : 'disarm', def: s.def });
  }
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function score(state: State) {
  return state.results.reduce((sum, a) => sum + (ALARM_MAX - a), 0);
}

function hint(state: State, ctx: Ctx): PublicView['hint'] {
  if (!ctx.config.tutorial || state.phase !== 'play' || state.mission > 0 || state.turn > HINT_TURNS) return null;
  if (state.pending) return null;
  if (goalMet(state)) return 'goal';
  const anyAffordable = state.line.some(
    (s, i) => !!s && !s.down && !blockedBy(state, i) && canAfford(state.pool, effectiveCost(state, i)!),
  );
  if (state.interactions < maxInteractions(state) && anyAffordable) return 'interact';
  if (state.hand.some((c) => def(c.def).top.res || def(c.def).top.effect)) return 'play';
  return 'end';
}

function slides(ctx: Ctx) {
  return ctx.config.tutorial ? TUTORIAL_SLIDES : 2;
}

function publicView(state: State, ctx: Ctx): PublicView {
  const timer = state.phase === 'over' ? 'end' : 'turn';
  return {
    phase: state.phase,
    slide: state.slide,
    slides: slides(ctx),
    tutorial: ctx.config.tutorial,
    mission: state.mission,
    missions: ctx.config.missions,
    turn: state.turn,
    alarm: state.alarm,
    line: state.line.map((s, i) => {
      if (!s) return null;
      const cost = effectiveCost(state, i);
      return {
        ...s,
        cost,
        blocked: blockedBy(state, i),
        affordable: !!cost && canAfford(state.pool, cost),
        items: s.down ? [] : itemsFor(state, def(s.def).bottom!.type),
      };
    }),
    obDeck: state.obDeck.length,
    obDiscard: state.obDiscard.length,
    deck: state.deck.length + (state.pending?.cards?.length ?? 0),
    hand: state.hand,
    play: state.play,
    discard: state.discard,
    equip: state.equip,
    removed: state.removed.length,
    pool: state.pool,
    interactions: state.interactions,
    maxInteractions: maxInteractions(state),
    draw: drawCount(state),
    pendingKind: state.pending?.kind ?? null,
    saved: state.saved,
    canUndo: state.undo.length > 0,
    goalMet: state.phase === 'play' && goalMet(state),
    results: state.results,
    outcome: state.outcome,
    score: score(state),
    log: state.log,
    tvRules: state.tvRules,
    scrolls: state.scrolls,
    hint: hint(state, ctx),
    deadline: ctx.timerDeadline(timer),
    total: ctx.timerTotal(timer),
  };
}

function looking(state: State): Card[] | null {
  const p = state.pending;
  if (!p) return null;
  if (p.cards) return p.cards;
  // Just the Thing: the deck's contents, sorted so its order stays secret.
  if (p.kind === 'justTheThing') {
    return [...state.deck].sort((a, b) => a.def.localeCompare(b.def) || a.uid.localeCompare(b.uid));
  }
  return null;
}

// ---------------------------------------------------------------------------

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      phase: 'intro',
      slide: 0,
      mission: 0,
      turn: 1,
      alarm: 0,
      line: Array(LINE_SIZE).fill(null),
      obDeck: [],
      obDiscard: [],
      deck: [],
      hand: [],
      play: [],
      discard: [],
      equip: [],
      removed: [],
      pool: { stealth: 0, fight: 0 },
      interactions: 0,
      pending: null,
      saved: null,
      undo: [],
      results: [],
      outcome: null,
      log: [],
      seq: 1,
      tvRules: null,
      scrolls: 0,
    };
    state.deck = ctx.rng.shuffle(make(state, STARTING_DECK));
    state.obDeck = ctx.rng.shuffle(make(state, BASE_OBSTACLES));
    refill(state, ctx);
    draw(state, BASE_DRAW, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const a = raw as Action;
    if (!a || typeof a !== 'object' || typeof a.type !== 'string') return;
    if (playerId !== ctx.players[0]?.id) return;

    if (a.type === 'tvRules') {
      const ok = a.page === null || (Number.isInteger(a.page) && a.page >= 0 && a.page < RULE_PAGES);
      if (ok) state.tvRules = a.page;
      return;
    }

    if (state.phase === 'intro') {
      if (a.type !== 'intro') return;
      if (a.dir === 'skip' || (a.dir === 1 && state.slide === slides(ctx) - 1)) {
        state.phase = 'play';
        setTurnTimer(ctx);
        ctx.emit('sound', 'round');
      } else if (a.dir === 1) state.slide += 1;
      else if (a.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }

    if (state.phase === 'mission') {
      if (a.type !== 'continue') return;
      state.phase = 'play';
      setTurnTimer(ctx);
      ctx.emit('sound', 'round');
      return;
    }

    if (state.phase === 'over') {
      if (a.type === 'finish') ctx.end({ scores: { [playerId]: score(state) } });
      return;
    }

    if (state.pending) {
      if (a.type === 'resolve') resolve(state, a, ctx);
      return;
    }
    switch (a.type) {
      case 'play':
        if (typeof a.uid === 'string') playCard(state, a.uid, a.opt, ctx);
        return;
      case 'equip': {
        const c = state.hand.find((h) => h.uid === a.uid);
        if (!c || !def(c.def).top.keep) return;
        state.equip.push(takeFrom(state.hand, c.uid)!);
        pushLog(state, { k: 'equip', def: c.def });
        return;
      }
      case 'interact':
        interact(state, a);
        return;
      case 'undo': {
        const u = state.undo.pop();
        if (!u) return;
        state.hand.push(takeFrom(u.from === 'play' ? state.play : state.obDiscard, u.uid)!);
        state.pool.stealth -= u.stealth;
        state.pool.fight -= u.fight;
        return;
      }
      case 'endTurn':
        endTurn(state, ctx);
        return;
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'turn' && state.phase === 'play') endTurn(state, ctx);
    else if (key === 'end' && state.phase === 'over') ctx.end({ scores: { [ctx.players[0]!.id]: score(state) } });
  },

  onPlayerTimeout(state, playerId, ctx) {
    dropPending(state);
    if (state.phase !== 'over') gameOver(state, ctx, false, 'left');
    ctx.end({ scores: { [playerId]: score(state) } });
  },

  publicView,

  playerView(state, _playerId, ctx): PlayerView {
    return { ...publicView(state, ctx), looking: looking(state) };
  },
});
