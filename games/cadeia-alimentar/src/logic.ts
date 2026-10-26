import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { RULES, SLIDES } from './texts.ts';
import { ANIMALS, ANIMAL_LIST, AREAS, MASSACRE, QUARTET_ANIMALS, ROUNDS, type Animal, type Area } from './shared.ts';

// Cadeia Alimentar: 13 players each draw one of 13 animals. Opening: see your animal (the Chameleon
// picks a disguise), peek at 1–2 players, guess a winner (only the Crow's guess counts). Then 4
// rounds of talk → secret move to an area → real-time hunt → dusk reveal of the dead. After round 4
// each player either met their animal's goal (1 point) or did not (0).

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  setupSeconds: number;
  talkSeconds: number;
  moveSeconds: number;
  attackSeconds: number;
}

export type Phase = 'intro' | 'role' | 'peek' | 'guess' | 'talk' | 'move' | 'hunt' | 'dusk' | 'final';

export interface Death {
  id: string;
  animal: Animal;
  round: number;
  area: Area;
  /** Public cause. Dying on the Snake reads as 'eaten', so the TV never points at the Snake. */
  cause: 'eaten' | 'starved';
}

/** A kill seen by the players in that area (attacker included). Never public. */
export interface Sighting {
  round: number;
  area: Area;
  /** 'snake': `victim` attacked the Snake `by` and died. */
  kind: 'eaten' | 'snake';
  victim: string;
  victimAnimal: Animal;
  by: string;
  witnesses: string[];
}

export interface Peek {
  target: string;
  /** What the peek showed — the Chameleon's disguise when the target is the Chameleon. */
  shown: Animal;
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  round: number;
  slide: number;
  tvRules: number | null;
  /** SECRET: each player's animal, public only in the final reveal (or at their death). */
  animals: Record<string, Animal>;
  /** SECRET: the Chameleon's disguise. */
  disguise: Animal | null;
  /** Role phase: who tapped Ready (the Chameleon by choosing a disguise). */
  ready: Record<string, boolean>;
  /** SECRET: what each player saw when peeking. */
  peeks: Record<string, Peek[]>;
  /** SECRET: everyone's winner guess; only the Crow's counts. */
  guesses: Record<string, string>;
  /** SECRET until the hunt: area choices of the current move phase. */
  moves: Record<string, Area>;
  /** Where each living player is this round (public from the hunt on). */
  area: Record<string, Area>;
  /** Spent last round outside the habitat → must return this round. */
  away: Record<string, boolean>;
  /** True life state. Deaths during the hunt reach the TV only at dusk. */
  alive: Record<string, boolean>;
  /** Living players when the hunt began: what the TV board shows during the hunt. */
  huntStart: string[];
  /** Ate this round. */
  fed: Record<string, boolean>;
  /** Consecutive rounds without eating. */
  hunger: Record<string, number>;
  /** Timed out: stays in the habitat and never attacks. */
  passive: Record<string, boolean>;
  /** Targets each player tried this hunt (their own view only). */
  attempts: Record<string, string[]>;
  sightings: Sighting[];
  deaths: Death[];
  /** How many of `deaths` the TV has revealed. */
  revealed: number;
  winners: string[] | null;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  round: number;
  rounds: number;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  /** Who already acted in the current step — never what they chose. */
  acted: string[];
  /** Players the TV shows as alive. */
  alive: string[];
  /** Who is in each area, from the hunt on (living players at the start of the hunt). */
  board: Record<Area, string[]> | null;
  /** Deaths revealed so far. */
  dead: Death[];
  final: null | {
    animals: Record<string, Animal>;
    winners: string[];
    crow: string | null;
    crowGuess: string | null;
    deadCount: number;
  };
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  round: number;
  slide: number;
  slides: number;
  tvRules: number | null;
  deadline: number | null;
  total: number | null;
  animal: Animal;
  alive: boolean;
  hunger: number;
  /** Chameleon only: the chosen disguise. */
  disguise: Animal | null;
  ready: boolean;
  peekCount: number;
  peeks: Peek[] | null;
  guess: string | null;
  moveOptions: Area[];
  myMove: Area | null;
  myArea: Area | null;
  /** Living players in my area that I can attack (hunt only). */
  targets: string[];
  attempts: string[];
  /** Kills I witnessed, newest last. */
  sightings: Omit<Sighting, 'witnesses'>[];
  /** Final reveal: whether I met my goal. */
  won: boolean | null;
}

export type Action =
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null }
  | { type: 'ready' }
  | { type: 'disguise'; animal: Animal }
  | { type: 'peek'; targets: string[] }
  | { type: 'guess'; target: string }
  | { type: 'move'; area: Area }
  | { type: 'attack'; target: string }
  | { type: 'finish' };

type Ctx = GameCtx<Config>;

const DUSK_MS = 12_000;
const FINAL_MS = 40_000;
/** Safety net: if the Host never advances the tutorial (left the room), the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);
const isPlayer = (ctx: Ctx, id: unknown): id is string => ctx.players.some((p) => p.id === id);
const info = (state: State, id: string) => ANIMALS[state.animals[id]!];
const idOf = (state: State, animal: Animal) => Object.keys(state.animals).find((id) => state.animals[id] === animal);
/** Players whose input the current step waits for. */
const actors = (state: State, ctx: Ctx, living = false) =>
  ctx.players.filter((p) => p.connected && !state.passive[p.id] && (!living || state.alive[p.id]));

export function moveOptions(state: State, id: string): Area[] {
  const a = info(state, id);
  if (state.away[id] || state.passive[id]) return [a.habitat];
  return AREAS.filter((x) => !a.forbidden.includes(x));
}

/** The quartet can't be eaten while all its survivors (2 or more) share one area. */
function quartetSafe(state: State, id: string) {
  if (!QUARTET_ANIMALS.includes(state.animals[id]!)) return false;
  const living = QUARTET_ANIMALS.map((a) => idOf(state, a)).filter((p): p is string => !!p && !!state.alive[p]);
  return living.length >= 2 && living.every((p) => state.area[p] === state.area[id]);
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

function startRole(state: State, ctx: Ctx) {
  state.phase = 'role';
  state.tvRules = null;
  ctx.setTimer('phase', ctx.config.setupSeconds * 1000);
  ctx.emit('sound', 'round');
}

function endRole(state: State, ctx: Ctx) {
  const chameleon = idOf(state, 'chameleon')!;
  if (!state.disguise) state.disguise = ctx.rng.pick(ANIMAL_LIST.filter((a) => a !== 'chameleon'));
  state.ready[chameleon] = true;
  state.phase = 'peek';
  ctx.setTimer('phase', ctx.config.setupSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function endPeek(state: State, ctx: Ctx) {
  state.phase = 'guess';
  ctx.setTimer('phase', ctx.config.setupSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function startTalk(state: State, ctx: Ctx) {
  state.phase = 'talk';
  ctx.setTimer('phase', ctx.config.talkSeconds * 1000);
  ctx.emit('sound', 'round');
}

function startMove(state: State, ctx: Ctx) {
  state.phase = 'move';
  state.moves = {};
  ctx.setTimer('phase', ctx.config.moveSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function startHunt(state: State, ctx: Ctx) {
  state.area = {};
  for (const p of ctx.players) {
    if (!state.alive[p.id]) continue;
    const options = moveOptions(state, p.id);
    const chosen = state.moves[p.id];
    state.area[p.id] = chosen && options.includes(chosen) ? chosen : info(state, p.id).habitat;
  }
  state.huntStart = ctx.players.map((p) => p.id).filter((id) => state.alive[id]);
  state.moves = {};
  state.fed = {};
  state.attempts = {};
  state.phase = 'hunt';
  ctx.setTimer('phase', ctx.config.attackSeconds * 1000);
  ctx.emit('sound', 'phase');
  ctx.emit('fx', 'hunt');
}

function kill(state: State, id: string, round: number, cause: Death['cause']) {
  state.alive[id] = false;
  state.deaths.push({ id, animal: state.animals[id]!, round, area: state.area[id]!, cause });
}

function startDusk(state: State, ctx: Ctx) {
  for (const id of state.huntStart) {
    const a = info(state, id);
    if (!state.alive[id] || a.starve === null) continue;
    state.hunger[id] = state.fed[id] ? 0 : (state.hunger[id] ?? 0) + 1;
    if (state.hunger[id]! >= a.starve) kill(state, id, state.round, 'starved');
  }
  for (const id of state.huntStart) {
    if (state.alive[id]) state.away[id] = state.area[id] !== info(state, id).habitat;
  }
  // The TV lists this round's dead in seat order, so the order of the kills stays hidden.
  const seat = (id: string) => ctx.players.findIndex((p) => p.id === id);
  const fresh = state.deaths.slice(state.revealed).sort((x, y) => seat(x.id) - seat(y.id));
  state.deaths.splice(state.revealed, fresh.length, ...fresh);
  state.revealed = state.deaths.length;
  state.phase = 'dusk';
  ctx.setTimer('phase', DUSK_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  if (state.deaths.some((d) => d.round === state.round)) ctx.emit('fx', 'dusk', 2300);
}

export function winners(state: State): string[] {
  const ids = Object.keys(state.animals);
  const lion = idOf(state, 'lion')!;
  const croc = idOf(state, 'crocodile')!;
  const dead = ids.filter((id) => !state.alive[id]).length;
  const met = (id: string): boolean => {
    switch (info(state, id).goal) {
      case 'survive':
        return !!state.alive[id];
      case 'lionDies':
        return !state.alive[lion];
      case 'lionLives':
        return !!state.alive[lion];
      case 'crocLives':
        return !!state.alive[croc];
      case 'massacre':
        return dead >= MASSACRE;
      case 'guess':
        return false;
    }
  };
  const won = ids.filter(met);
  // The Crow is resolved last: its guess (never itself) must be among the other winners.
  const crow = idOf(state, 'crow')!;
  const guess = state.guesses[crow];
  if (guess && won.includes(guess)) won.push(crow);
  return ids.filter((id) => won.includes(id));
}

function startFinal(state: State, ctx: Ctx) {
  state.winners = winners(state);
  state.phase = 'final';
  ctx.setTimer('phase', FINAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'final', 2300);
}

function finish(state: State, ctx: Ctx) {
  const won = state.winners ?? winners(state);
  ctx.end({ scores: Object.fromEntries(ctx.players.map((p) => [p.id, won.includes(p.id) ? 1 : 0])) });
}

/** Ends the current step early once everyone it waits for has acted. */
function checkDone(state: State, ctx: Ctx) {
  if (state.phase === 'role') {
    if (actors(state, ctx).every((p) => state.ready[p.id])) endRole(state, ctx);
  } else if (state.phase === 'peek') {
    if (actors(state, ctx).every((p) => state.peeks[p.id])) endPeek(state, ctx);
  } else if (state.phase === 'guess') {
    if (actors(state, ctx).every((p) => state.guesses[p.id])) startTalk(state, ctx);
  } else if (state.phase === 'move') {
    if (actors(state, ctx, true).every((p) => state.moves[p.id])) startHunt(state, ctx);
  }
}

function attack(state: State, id: string, target: unknown, ctx: Ctx) {
  if (!isPlayer(ctx, target) || target === id) return;
  if (!state.alive[id] || !state.alive[target] || state.area[id] !== state.area[target]) return;
  const tried = (state.attempts[id] ??= []);
  if (!tried.includes(target)) tried.push(target);
  const area = state.area[id]!;
  const witnesses = state.huntStart.filter((p) => state.alive[p] && state.area[p] === area);
  const see = (kind: Sighting['kind'], victim: string, by: string) =>
    state.sightings.push({ round: state.round, area, kind, victim, victimAnimal: state.animals[victim]!, by, witnesses });
  if (state.animals[target] === 'snake') {
    kill(state, id, state.round, 'eaten');
    see('snake', id, target);
  } else if (info(state, target).level > info(state, id).level && !quartetSafe(state, target)) {
    kill(state, target, state.round, 'eaten');
    state.fed[id] = true;
    see('eaten', target, id);
  }
  // Same or higher level, or a protected quartet: nothing happens, and nobody is told.
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const ids = ctx.players.map((p) => p.id);
    const deck = ctx.rng.shuffle([...ANIMAL_LIST]);
    const state: State = {
      phase: 'intro',
      round: 1,
      slide: 0,
      tvRules: null,
      animals: Object.fromEntries(ids.map((id, i) => [id, deck[i % deck.length]!])),
      disguise: null,
      ready: {},
      peeks: {},
      guesses: {},
      moves: {},
      area: {},
      away: {},
      alive: Object.fromEntries(ids.map((id) => [id, true])),
      huntStart: [],
      fed: {},
      hunger: {},
      passive: {},
      attempts: {},
      sightings: [],
      deaths: [],
      revealed: 0,
      winners: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRole(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (!action || typeof action !== 'object') return;

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
      if (action.dir === 'skip' || (action.dir === 1 && last)) {
        ctx.clearTimer('intro');
        startRole(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }
    if (action.type === 'finish') {
      if (state.phase === 'final' && isHost(ctx, playerId)) finish(state, ctx);
      return;
    }

    if (!state.animals[playerId]) return;
    const me = state.animals[playerId]!;
    // A player who came back after timing out plays again.
    if (state.passive[playerId] && ['ready', 'disguise', 'peek', 'guess', 'move', 'attack'].includes(action.type)) {
      delete state.passive[playerId];
    }

    switch (action.type) {
      case 'ready':
        if (state.phase !== 'role' || me === 'chameleon') return;
        state.ready[playerId] = true;
        break;
      case 'disguise':
        if (state.phase !== 'role' || me !== 'chameleon') return;
        if (!ANIMAL_LIST.includes(action.animal) || action.animal === 'chameleon') return;
        state.disguise = action.animal;
        state.ready[playerId] = true;
        break;
      case 'peek': {
        if (state.phase !== 'peek' || state.peeks[playerId] || !Array.isArray(action.targets)) return;
        const targets = action.targets;
        if (targets.length !== ANIMALS[me].peeks || new Set(targets).size !== targets.length) return;
        if (!targets.every((t) => isPlayer(ctx, t) && t !== playerId)) return;
        state.peeks[playerId] = targets.map((target) => ({
          target,
          shown: state.animals[target] === 'chameleon' ? state.disguise! : state.animals[target]!,
        }));
        break;
      }
      case 'guess':
        if (state.phase !== 'guess' || !isPlayer(ctx, action.target) || action.target === playerId) return;
        state.guesses[playerId] = action.target;
        break;
      case 'move':
        if (state.phase !== 'move' || !state.alive[playerId]) return;
        if (!moveOptions(state, playerId).includes(action.area)) return;
        state.moves[playerId] = action.area;
        break;
      case 'attack':
        if (state.phase !== 'hunt') return;
        attack(state, playerId, action.target, ctx);
        return;
      default:
        return;
    }
    checkDone(state, ctx);
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') startRole(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    switch (state.phase) {
      case 'role':
        return endRole(state, ctx);
      case 'peek':
        return endPeek(state, ctx);
      case 'guess':
        return startTalk(state, ctx);
      case 'talk':
        return startMove(state, ctx);
      case 'move':
        return startHunt(state, ctx);
      case 'hunt':
        return startDusk(state, ctx);
      case 'dusk':
        if (state.round >= ROUNDS) return startFinal(state, ctx);
        state.round += 1;
        return startTalk(state, ctx);
      case 'final':
        return finish(state, ctx);
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro') {
      if (isHost(ctx, playerId)) {
        ctx.clearTimer('intro');
        startRole(state, ctx);
      }
      return;
    }
    // Missing players become passive animals: habitat every round, no attacks.
    if (state.animals[playerId]) state.passive[playerId] = true;
    checkDone(state, ctx);
  },

  publicView(state, ctx): PublicView {
    const dead = state.deaths.slice(0, state.revealed);
    const ids = ctx.players.map((p) => p.id);
    const acted =
      state.phase === 'role'
        ? ids.filter((id) => state.ready[id])
        : state.phase === 'peek'
          ? ids.filter((id) => state.peeks[id])
          : state.phase === 'guess'
            ? ids.filter((id) => state.guesses[id])
            : state.phase === 'move'
              ? ids.filter((id) => state.moves[id])
              : [];
    let board: PublicView['board'] = null;
    if (state.phase === 'hunt' || state.phase === 'dusk') {
      board = { river: [], sky: [], field: [], forest: [] };
      for (const id of state.huntStart) board[state.area[id]!].push(id);
    }
    const crow = idOf(state, 'crow') ?? null;
    return {
      phase: state.phase,
      round: state.round,
      rounds: ROUNDS,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      acted,
      alive: ids.filter((id) => !dead.some((d) => d.id === id)),
      board,
      dead,
      final:
        state.phase === 'final' && state.winners
          ? {
              animals: state.animals,
              winners: state.winners,
              crow,
              crowGuess: crow ? (state.guesses[crow] ?? null) : null,
              deadCount: state.deaths.length,
            }
          : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const animal = state.animals[playerId] ?? 'rabbit';
    const alive = !!state.alive[playerId];
    const hunting = state.phase === 'hunt' && alive;
    const myArea = (state.phase === 'hunt' || state.phase === 'dusk') && state.huntStart.includes(playerId)
      ? (state.area[playerId] ?? null)
      : null;
    return {
      phase: state.phase,
      round: state.round,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      animal,
      alive,
      hunger: state.hunger[playerId] ?? 0,
      disguise: animal === 'chameleon' ? state.disguise : null,
      ready: !!state.ready[playerId],
      peekCount: ANIMALS[animal].peeks,
      peeks: state.peeks[playerId] ?? null,
      guess: state.guesses[playerId] ?? null,
      moveOptions: state.phase === 'move' && alive && state.animals[playerId] ? moveOptions(state, playerId) : [],
      myMove: state.moves[playerId] ?? null,
      myArea,
      targets: hunting
        ? state.huntStart.filter((id) => id !== playerId && state.alive[id] && state.area[id] === myArea)
        : [],
      attempts: state.phase === 'hunt' ? (state.attempts[playerId] ?? []) : [],
      sightings: state.sightings
        .filter((s) => s.witnesses.includes(playerId))
        .map(({ witnesses: _w, ...s }) => s),
      won: state.phase === 'final' && state.winners ? state.winners.includes(playerId) : null,
    };
  },
});
