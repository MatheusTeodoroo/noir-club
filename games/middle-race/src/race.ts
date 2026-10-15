import {
  CLASS_IDS, DELETE, FAST, GRAVITY, JUMP, JUNTO, MIRROR, MOVE_LIMIT, NON_CONSECUTIVE, ONE, PUSH, RESET, SILENCE, UNION,
  startingHand,
} from './shared.ts';

// The race: turns, cards and the reaction system. Pure and plain JSON, no ctx: the logic module
// drives it (timers, random auto-play) and the tests drive it directly.
//
// Every movement opens a reaction system (a Frame) on a stack:
//   A  Special One — only after a "1" card discarded to move by a class other than One
//   B  Direct      — Reset moved backwards, Delete / Mirror moved by another class (class order)
//   C  Reactive    — scan classes 1→11; Shove, Together, Union; any movement restarts the scan
// A reaction that moves someone pushes a new Frame on top; when it finishes, the frame below
// carries on where it was (its C scan restarts from class 1). A player decision stops the pump
// with a Prompt; a movement stops it with a beat so the TV can show one step at a time.

export interface Runner {
  pos: number;
  /** SECRET (owner only): cards in hand. */
  hand: number[];
  /** Public: cards discarded since the last reset, in order. */
  discard: number[];
  /** Cards Delete took away until the next reset (count is public, values are not). */
  removed: number[];
  out: boolean;
  /** Has moved at least once (Shove only reacts on the start column after that). */
  moved: boolean;
  /** Class picked by the last activation (non-consecutive rule). */
  last: number | null;
}

export interface Mover { cls: number; from: number; to: number }

export interface MoveEvent {
  movers: Mover[];
  /** Class whose card or ability caused the movement. */
  cause: number;
  /** Moved by the cause's own movement card. */
  card: boolean;
  /** The card discarded for this movement showed "1". */
  cardOne: boolean;
  /** The card was the last one in hand. */
  lastCard: boolean;
}

export interface Frame {
  ev: MoveEvent;
  stage: 'A' | 'B' | 'C';
  bDone: number[];
  /** Next class the C scan checks. */
  cAt: number;
  juntoDone: boolean;
}

export type PromptKind = 'oneDir' | 'pushDir' | 'resetTarget' | 'deleteTarget' | 'deleteKeep' | 'mirrorTarget' | 'juntoTarget';

export interface Prompt {
  /** Class that must decide. */
  cls: number;
  kind: PromptKind;
  /** Directions (+1 / -1), target classes, or card values (deleteKeep). */
  options: number[];
  /** pushDir / deleteKeep: the class being acted on. */
  target?: number;
  /** mirrorTarget / juntoTarget: distance the target will move; mirror: signed direction in `dir`. */
  dist?: number;
  dir?: number;
}

export type LogKind =
  | 'card' | 'zero' | 'gravity' | 'push' | 'union' | 'junto' | 'mirror' | 'one' | 'reset' | 'delete'
  | 'silence' | 'finish' | 'loop' | 'lost' | 'leapReset' | 'refill';

/** Public narration. `a` acts, `b` is acted on; `v` a value (card, distance, place), `d` a direction. */
export interface LogEntry { n: number; k: LogKind; a: number; b?: number; v?: number; d?: number; x?: boolean }

export interface Race {
  cols: number;
  runners: Record<string, Runner>;
  /** Classes in the order they reached the finish. */
  finish: number[];
  turn: number;
  round: number;
  /** Class silenced until Silence's next turn. */
  silenced: number | null;
  /** SECRET (Swift only): Swift's backward card values. */
  fastBack: number[];
  stack: Frame[];
  prompt: Prompt | null;
  /** Waiting for the turn's player to choose their play. */
  awaitingTurn: boolean;
  moves: number;
  justMoved: boolean;
  log: LogEntry[];
  logSeq: number;
}

export interface TurnChoice {
  card: number;
  /** Swift: double the card's value. */
  double?: boolean;
  /** Gravity: discard without moving and pull this class. */
  gravity?: number | null;
  /** Silence: silence this class before playing. */
  silence?: number | null;
  /** Leap with 2 cards: reset the hand first. */
  leapReset?: boolean;
}

export type PumpResult = 'beat' | 'prompt' | 'turn' | 'done';

const LOG_KEEP = 12;

export function newRace(cols: number, fastBack: number[]): Race {
  const runners: Record<string, Runner> = {};
  for (const c of CLASS_IDS) {
    runners[c] = { pos: 1, hand: startingHand(c), discard: [], removed: [], out: false, moved: false, last: null };
  }
  return {
    cols, runners, finish: [], turn: GRAVITY, round: 1, silenced: null, fastBack: [...fastBack].sort(),
    stack: [], prompt: null, awaitingTurn: true, moves: 0, justMoved: false, log: [], logSeq: 0,
  };
}

export const runner = (race: Race, cls: number): Runner => race.runners[cls]!;
const inRace = (race: Race) => CLASS_IDS.filter((c) => !runner(race, c).out);

function log(race: Race, e: Omit<LogEntry, 'n'>) {
  race.logSeq += 1;
  race.log.push({ n: race.logSeq, ...e });
  if (race.log.length > LOG_KEEP) race.log.splice(0, race.log.length - LOG_KEEP);
}

/** Abilities on: in the race, not silenced, and not on the start column (Shove: once it has moved; One: always). */
export function canReact(race: Race, cls: number): boolean {
  const r = runner(race, cls);
  if (r.out || race.silenced === cls) return false;
  if (r.pos === 1 && cls !== ONE && !(cls === PUSH && r.moved)) return false;
  return true;
}

/** Other classes still racing that `cls` may pick now (non-consecutive rule applied). */
export function targetsFor(race: Race, cls: number, filter: (c: number) => boolean = () => true): number[] {
  const last = NON_CONSECUTIVE.includes(cls) ? runner(race, cls).last : null;
  return inRace(race).filter((c) => c !== cls && c !== last && filter(c));
}

/** Every other class still racing, ignoring the non-consecutive rule. */
const othersIn = (race: Race, cls: number, filter: (c: number) => boolean = () => true) =>
  inRace(race).filter((c) => c !== cls && filter(c));

function picked(race: Race, cls: number, target: number) {
  if (NON_CONSECUTIVE.includes(cls)) runner(race, cls).last = target;
}

/** The only valid targets were blocked by the non-consecutive rule: the activation is lost. */
function lose(race: Race, cls: number) {
  runner(race, cls).last = null;
  log(race, { k: 'lost', a: cls });
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

function moveTo(race: Race, cls: number, to: number): Mover | null {
  const r = runner(race, cls);
  if (r.out) return null;
  const dest = Math.max(1, Math.min(race.cols, to));
  if (dest === r.pos) return null;
  const m = { cls, from: r.pos, to: dest };
  r.pos = dest;
  r.moved = true;
  race.moves += 1;
  race.justMoved = true;
  if (dest === race.cols) {
    r.out = true;
    race.finish.push(cls);
    log(race, { k: 'finish', a: cls, v: race.finish.length });
    if (race.silenced === cls) race.silenced = null;
    if (cls === SILENCE) race.silenced = null;
  }
  return m;
}

/** Opens a reaction system for the movement, unless nobody who moved is still racing. */
function react(race: Race, movers: (Mover | null)[], ev: Omit<MoveEvent, 'movers'>) {
  const live = movers.filter((m): m is Mover => !!m && !runner(race, m.cls).out);
  if (!live.length) return;
  race.stack.push({ ev: { ...ev, movers: live }, stage: 'A', bDone: [], cAt: 1, juntoDone: false });
}

/** Leap's path: players on a column do not count as a step (the finish always counts). */
export function leapTarget(race: Race, cls: number, steps: number): number {
  let c = runner(race, cls).pos;
  let left = steps;
  while (left > 0 && c < race.cols) {
    c += 1;
    const occupied = othersIn(race, cls, (o) => runner(race, o).pos === c).length > 0;
    if (!occupied || c === race.cols) left -= 1;
  }
  return c;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function refill(race: Race, cls: number) {
  const r = runner(race, cls);
  r.hand = startingHand(cls);
  r.discard = [];
  r.removed = [];
}

function discard(race: Race, cls: number, card: number) {
  const r = runner(race, cls);
  const i = r.hand.indexOf(card);
  if (i >= 0) r.hand.splice(i, 1);
  r.discard.push(card);
  if (r.hand.length === 0) {
    refill(race, cls);
    log(race, { k: 'refill', a: cls });
  }
}

// ---------------------------------------------------------------------------
// Turn
// ---------------------------------------------------------------------------

export interface TurnOptions {
  cls: number;
  cards: number[];
  /** Cards available after a Leap reset (Leap with 2 cards). */
  resetCards: number[] | null;
  canDouble: boolean;
  /** SECRET (Swift only). */
  backCards: number[];
  gravityTargets: number[];
  silenceTargets: number[];
}

export function turnOptions(race: Race): TurnOptions {
  const cls = race.turn;
  const r = runner(race, cls);
  const silenced = race.silenced === cls;
  const pos = r.pos;
  return {
    cls,
    cards: [...new Set(r.hand)].sort((a, b) => a - b),
    resetCards: cls === JUMP && r.hand.length === 2 ? startingHand(JUMP) : null,
    canDouble: cls === FAST && !silenced,
    backCards: cls === FAST ? race.fastBack : [],
    gravityTargets: cls === GRAVITY && !silenced ? targetsFor(race, cls, (c) => runner(race, c).pos !== pos) : [],
    silenceTargets: cls === SILENCE ? targetsFor(race, cls) : [],
  };
}

export function validTurn(race: Race, c: TurnChoice): boolean {
  if (!race.awaitingTurn || race.prompt || race.stack.length) return false;
  if (!c || typeof c !== 'object' || !Number.isInteger(c.card)) return false;
  const o = turnOptions(race);
  const leap = c.leapReset === true;
  if (c.leapReset !== undefined && typeof c.leapReset !== 'boolean') return false;
  if (leap && !o.resetCards) return false;
  if (!(leap ? o.resetCards! : o.cards).includes(c.card)) return false;
  if (c.double !== undefined && typeof c.double !== 'boolean') return false;
  if (c.double && !o.canDouble) return false;
  if (c.gravity != null && !o.gravityTargets.includes(c.gravity)) return false;
  if (c.silence != null && !o.silenceTargets.includes(c.silence)) return false;
  if (c.gravity != null && c.double) return false;
  return true;
}

/** Called when a class's turn begins. */
export function beginTurn(race: Race) {
  race.awaitingTurn = true;
  race.moves = 0;
  race.stack = [];
  race.prompt = null;
  if (race.turn === SILENCE) race.silenced = null;
}

/** Applies a validated turn choice. Follow with `pump`. */
export function playTurn(race: Race, c: TurnChoice) {
  const cls = race.turn;
  const r = runner(race, cls);
  race.awaitingTurn = false;

  if (c.silence != null) {
    race.silenced = c.silence;
    picked(race, cls, c.silence);
    log(race, { k: 'silence', a: cls, b: c.silence });
  }
  if (c.leapReset) {
    refill(race, cls);
    log(race, { k: 'leapReset', a: cls });
  }

  if (c.gravity != null) {
    const g = r.pos;
    const t = c.gravity;
    discard(race, cls, c.card);
    picked(race, cls, t);
    const dest = runner(race, t).pos > g ? g + 1 : g - 1;
    log(race, { k: 'gravity', a: cls, b: t, v: c.card });
    react(race, [moveTo(race, t, dest)], { cause: cls, card: false, cardOne: false, lastCard: false });
    return;
  }

  const lastCard = r.hand.length === 1;
  const silenced = race.silenced === cls;
  const back = cls === FAST && race.fastBack.includes(c.card);
  const dist = c.card * (c.double && cls === FAST && !silenced ? 2 : 1);
  discard(race, cls, c.card);
  if (dist === 0) {
    log(race, { k: 'zero', a: cls, v: 0 });
    return;
  }
  const dest = back ? r.pos - dist : cls === JUMP && !silenced ? leapTarget(race, cls, dist) : r.pos + dist;
  log(race, { k: 'card', a: cls, v: c.card, d: back ? -1 : 1, x: dist !== c.card });
  react(race, [moveTo(race, cls, dest)], { cause: cls, card: true, cardOne: c.card === 1, lastCard });
}

/** A random legal play (timeout or a missing player): a random card, nothing else. */
export function randomTurn(race: Race, pick: <T>(items: readonly T[]) => T): TurnChoice {
  return { card: pick(turnOptions(race).cards) };
}

// ---------------------------------------------------------------------------
// The reaction system
// ---------------------------------------------------------------------------

function bTriggers(m: Mover, ev: MoveEvent): boolean {
  if (m.cls === RESET) return m.to < m.from;
  if (m.cls === DELETE || m.cls === MIRROR) return ev.cause !== m.cls;
  return false;
}

function ask(race: Race, p: Prompt) {
  race.prompt = p;
}

/** Runs one step of the top frame. */
function step(race: Race) {
  const f = race.stack[race.stack.length - 1]!;
  const ev = f.ev;

  if (f.stage === 'A') {
    f.stage = 'B';
    if (ev.card && ev.cardOne && ev.cause !== ONE && canReact(race, ONE)) {
      const pos = runner(race, ONE).pos;
      const options = [1, -1].filter((d) => pos + d >= 1 && pos + d <= race.cols);
      if (options.length) ask(race, { cls: ONE, kind: 'oneDir', options });
    }
    return;
  }

  if (f.stage === 'B') {
    const m = [...ev.movers]
      .sort((a, b) => a.cls - b.cls)
      .find((x) => !f.bDone.includes(x.cls) && bTriggers(x, ev));
    if (!m) {
      f.stage = 'C';
      f.cAt = 1;
      return;
    }
    f.bDone.push(m.cls);
    if (!canReact(race, m.cls)) return;
    const kind: PromptKind = m.cls === RESET ? 'resetTarget' : m.cls === DELETE ? 'deleteTarget' : 'mirrorTarget';
    const options = targetsFor(race, m.cls);
    if (!options.length) {
      if (othersIn(race, m.cls).length) lose(race, m.cls);
      return;
    }
    const dist = Math.abs(m.to - m.from);
    ask(race, { cls: m.cls, kind, options, ...(kind === 'mirrorTarget' ? { dist, dir: m.to > m.from ? 1 : -1 } : {}) });
    return;
  }

  // C: scan from cAt.
  for (let cls = f.cAt; cls <= 11; cls++) {
    if (cls === PUSH && canReact(race, PUSH)) {
      const pos = runner(race, PUSH).pos;
      const here = othersIn(race, PUSH, (c) => runner(race, c).pos === pos);
      if (here.length) {
        const last = runner(race, PUSH).last;
        const t = here.find((c) => c !== last);
        if (t === undefined) {
          f.cAt = cls + 1;
          lose(race, PUSH);
          return;
        }
        f.cAt = cls + 1;
        const options = [1, -1].filter((d) => pos + d >= 1 && pos + d <= race.cols);
        ask(race, { cls: PUSH, kind: 'pushDir', options, target: t });
        return;
      }
    }
    if (cls === JUNTO && !f.juntoDone && ev.card && ev.cause === JUNTO && ev.lastCard && canReact(race, JUNTO)) {
      f.juntoDone = true;
      f.cAt = cls + 1;
      const m = ev.movers.find((x) => x.cls === JUNTO);
      const dist = m ? m.to - m.from : 0;
      if (dist <= 0) return;
      const options = targetsFor(race, JUNTO);
      if (!options.length) {
        if (othersIn(race, JUNTO).length) lose(race, JUNTO);
        return;
      }
      ask(race, { cls: JUNTO, kind: 'juntoTarget', options, dist });
      return;
    }
    if (cls === UNION && canReact(race, UNION)) {
      const pos = runner(race, UNION).pos;
      const ahead = othersIn(race, UNION, (c) => runner(race, c).pos === pos + 1);
      if (ahead.length) {
        f.cAt = 1;
        for (const c of ahead) log(race, { k: 'union', a: UNION, b: c });
        react(race, ahead.map((c) => moveTo(race, c, pos)), { cause: UNION, card: false, cardOne: false, lastCard: false });
        return;
      }
    }
  }
  race.stack.pop();
}

/**
 * Advances the race until something needs the room: a beat after a movement (TV shows it), a
 * prompt (a player decides), the end of the turn ('turn') or the end of the race ('done').
 */
export function pump(race: Race): PumpResult {
  for (;;) {
    if (race.justMoved) {
      race.justMoved = false;
      return 'beat';
    }
    if (race.prompt) return 'prompt';
    if (race.awaitingTurn) return 'turn';
    if (!race.stack.length) return 'done';
    if (race.moves >= MOVE_LIMIT) {
      race.stack = [];
      log(race, { k: 'loop', a: race.turn });
      return 'done';
    }
    step(race);
  }
}

export function validAnswer(race: Race, cls: number, value: unknown): value is number {
  return !!race.prompt && race.prompt.cls === cls && typeof value === 'number' && race.prompt.options.includes(value);
}

/** Resolves the open prompt with one of its options. Follow with `pump`. */
export function answer(race: Race, value: number) {
  const p = race.prompt;
  if (!p) return;
  race.prompt = null;
  const top = race.stack[race.stack.length - 1];
  const after = (movers: (Mover | null)[], cause: number) => {
    if (top && top.stage === 'C') top.cAt = 1;
    react(race, movers, { cause, card: false, cardOne: false, lastCard: false });
  };

  switch (p.kind) {
    case 'oneDir': {
      log(race, { k: 'one', a: ONE, d: value });
      after([moveTo(race, ONE, runner(race, ONE).pos + value)], ONE);
      return;
    }
    case 'pushDir': {
      const t = p.target!;
      picked(race, PUSH, t);
      log(race, { k: 'push', a: PUSH, b: t, d: value });
      after([moveTo(race, t, runner(race, t).pos + value)], PUSH);
      return;
    }
    case 'juntoTarget': {
      picked(race, JUNTO, value);
      log(race, { k: 'junto', a: JUNTO, b: value, v: p.dist });
      after([moveTo(race, value, runner(race, value).pos + p.dist!)], JUNTO);
      return;
    }
    case 'mirrorTarget': {
      picked(race, MIRROR, value);
      log(race, { k: 'mirror', a: MIRROR, b: value, v: p.dist, d: -p.dir! });
      after([moveTo(race, value, runner(race, value).pos - p.dir! * p.dist!)], MIRROR);
      return;
    }
    case 'resetTarget': {
      picked(race, RESET, value);
      const t = runner(race, value);
      t.hand = [...t.hand, ...t.discard].sort((a, b) => a - b);
      t.discard = [];
      log(race, { k: 'reset', a: RESET, b: value });
      return;
    }
    case 'deleteTarget': {
      picked(race, DELETE, value);
      const hand = runner(race, value).hand;
      if (hand.length <= 1) {
        log(race, { k: 'delete', a: DELETE, b: value, v: 0 });
        return;
      }
      ask(race, { cls: DELETE, kind: 'deleteKeep', options: [...new Set(hand)].sort((a, b) => a - b), target: value });
      return;
    }
    case 'deleteKeep': {
      const t = runner(race, p.target!);
      const i = t.hand.indexOf(value);
      const gone = t.hand.filter((_, j) => j !== i);
      t.removed.push(...gone);
      t.hand = [value];
      log(race, { k: 'delete', a: DELETE, b: p.target!, v: gone.length });
      return;
    }
  }
}

/**
 * Moves the turn to the next class still racing. Returns whether a new round began, and whether
 * the race is over (at most one runner left: they take the last place).
 */
export function nextTurn(race: Race): { newRound: boolean; over: boolean } {
  const left = inRace(race);
  if (left.length <= 1) {
    for (const c of left) {
      runner(race, c).out = true;
      race.finish.push(c);
    }
    race.awaitingTurn = false;
    return { newRound: false, over: true };
  }
  const after = left.find((c) => c > race.turn);
  const next = after ?? left[0]!;
  const newRound = after === undefined;
  if (newRound) race.round += 1;
  race.turn = next;
  beginTurn(race);
  return { newRound, over: false };
}

/** Live order: finished in arrival order, then by column (ahead first), ties by class. */
export function standings(race: Race): number[] {
  const racing = inRace(race).sort((a, b) => runner(race, b).pos - runner(race, a).pos || a - b);
  return [...race.finish, ...racing];
}
