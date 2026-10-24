import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { CODE_MISSES, REQUEST_MS } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Surto: a few players start infected. Touches happen in person and are confirmed by a crossed
// 2-digit code on both phones; nobody learns what a touch did. Humans score per human touch,
// a cure undoes a fresh infection, and the counts are the only thing revealed between rounds.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  rounds: number;
  roundMin: number;
  cureWindowMin: number;
  intervalSec: number;
  zombies: 'auto' | '1' | '2' | '3';
  roleReveal: 'dealer' | 'phone';
}

export type Phase = 'intro' | 'roles' | 'round' | 'interval' | 'final';
/** First-round coaching line on the TV while the tutorial option is on. */
export type Hint = 'touch' | 'idle' | 'cure' | null;
export type Role = 'zombie' | 'human';

/** A touch in progress between two phones. */
export interface Request {
  id: number;
  from: string;
  to: string;
  accepted: boolean;
  /** SECRET to each other until shown: each player's own code is on their own phone only. */
  codes: Record<string, number>;
  confirmed: Record<string, boolean>;
  misses: Record<string, number>;
}

export interface Infection {
  id: string;
  /** Who passed it on; null when it came from not touching anyone. */
  by: string | null;
  round: number;
  at: number;
  cause: 'touch' | 'idle';
  curedAt: number | null;
}

export interface Gift {
  from: string;
  to: string;
  round: number;
}

export type NoticeKind = 'touched' | 'declined' | 'expired' | 'failed' | 'cured' | 'gave' | 'gift';

export interface Notice {
  kind: NoticeKind;
  other: string | null;
  at: number;
}

export interface FinalResult {
  scenario: 'zombies' | 'survivors' | 'tie';
  initial: string[];
  infections: Infection[];
  gifts: Gift[];
  points: Record<string, number>;
  survivors: string[];
  scores: Record<string, number>;
}

export interface State {
  phase: Phase;
  /** Tutorial slide on screen during the intro. */
  slide: number;
  /** Rules page the Host is showing on the TV, or null. */
  tvRules: number | null;
  round: number;
  /** SECRET: the starting zombies. */
  initial: string[];
  /** SECRET: who is a zombie right now. */
  zombie: Record<string, boolean>;
  /** SECRET: touch points of each player. */
  points: Record<string, number>;
  /** SECRET: cures each player holds (known only to that player). */
  cures: Record<string, number>;
  seen: string[];
  /** Partners each player touched this round (public pairs, private outcomes). */
  touched: Record<string, string[]>;
  touchCount: number;
  recent: { a: string; b: string; at: number }[];
  requests: Request[];
  nextRequest: number;
  /** SECRET until the final. */
  infections: Infection[];
  /** SECRET until the final (the receiver learns their own). */
  gifts: Gift[];
  notices: Record<string, Notice>;
  history: { round: number; zombies: number; humans: number }[];
  final: FinalResult | null;
}

/** Tutorial and rules state, the same on the TV and every phone. */
export interface GuideView {
  slide: number;
  slides: number;
  tvRules: number | null;
}

export interface PublicView extends GuideView {
  phase: Phase;
  hint: Hint;
  round: number;
  rounds: number;
  mode: Config['roleReveal'];
  deadline: number | null;
  total: number | null;
  seen: string[];
  recent: { a: string; b: string; at: number }[];
  history: State['history'];
  final: FinalResult | null;
}

export interface RequestView {
  id: number;
  partner: string;
  outgoing: boolean;
  accepted: boolean;
  /** This player's own code, to show the partner. */
  myCode: number | null;
  iConfirmed: boolean;
  partnerConfirmed: boolean;
  missesLeft: number;
  deadline: number | null;
  total: number | null;
}

export interface PlayerView extends GuideView {
  phase: Phase;
  round: number;
  mode: Config['roleReveal'];
  deadline: number | null;
  total: number | null;
  /** Only in the roles phase of phone mode; never afterwards. */
  role: Role | null;
  seen: boolean;
  targets: { id: string; touched: boolean; busy: boolean }[];
  request: RequestView | null;
  cures: number;
  giftsFrom: string[];
  notice: Notice | null;
}

export interface DealerView {
  role: Role;
}

export type Action =
  | { type: 'seen' }
  | { type: 'touch'; target: string }
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'cancel' }
  | { type: 'code'; value: number }
  | { type: 'cure' }
  | { type: 'give'; target: string }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const FINAL_MS = 25_000;
const MIN_INTERVAL_MS = 8_000;
/** Safety net: if the Host never advances the tutorial, the roles phase starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;

const isHost = (ctx: Ctx, id: string) => ctx.players.some((p) => p.id === id && p.isHost);

const isPlayer = (ctx: Ctx, id: unknown): id is string =>
  typeof id === 'string' && ctx.players.some((p) => p.id === id);

function zombieCount(ctx: Ctx) {
  const n = ctx.players.length;
  const wanted = ctx.config.zombies === 'auto' ? (n < 7 ? 1 : 2) : Number(ctx.config.zombies);
  return Math.max(1, Math.min(n - 1, wanted || 1));
}

function rolesMs(ctx: Ctx) {
  return ctx.config.roleReveal === 'dealer' ? 30_000 + 20_000 * ctx.players.length : 45_000;
}

function startRoles(state: State, ctx: Ctx) {
  ctx.clearTimer('intro');
  state.phase = 'roles';
  state.tvRules = null;
  ctx.setTimer('phase', rolesMs(ctx));
  ctx.emit('sound', 'phase');
}

/** Derived from state, never scripted: what the room should be doing right now in round 1. */
function hint(state: State, ctx: Ctx): Hint {
  if (!ctx.config.tutorial || state.round !== 1 || state.phase !== 'round') return null;
  if (state.touchCount === 0) return 'touch';
  return state.touchCount < 3 ? 'idle' : 'cure';
}

const guide = (state: State): GuideView => ({ slide: state.slide, slides: SLIDES.length, tvRules: state.tvRules });

function counts(state: State) {
  const zombies = Object.values(state.zombie).filter(Boolean).length;
  return { zombies, humans: Object.keys(state.zombie).length - zombies };
}

function openRequest(state: State, id: string) {
  return state.requests.find((r) => r.from === id || r.to === id) ?? null;
}

function notify(state: State, ctx: Ctx, id: string, kind: NoticeKind, other: string | null = null) {
  state.notices[id] = { kind, other, at: ctx.now };
}

function dropRequest(state: State, ctx: Ctx, req: Request, kind: NoticeKind | null) {
  state.requests = state.requests.filter((r) => r.id !== req.id);
  ctx.clearTimer(`req:${req.id}`);
  if (kind) {
    notify(state, ctx, req.from, kind, req.to);
    notify(state, ctx, req.to, kind, req.from);
  }
}

function infect(state: State, ctx: Ctx, id: string, by: string | null, cause: Infection['cause']) {
  state.zombie[id] = true;
  state.infections.push({ id, by, round: state.round, at: ctx.now, cause, curedAt: null });
}

function resolveTouch(state: State, ctx: Ctx, req: Request) {
  const { from: a, to: b } = req;
  dropRequest(state, ctx, req, null);
  state.touched[a]!.push(b);
  state.touched[b]!.push(a);
  state.touchCount += 1;
  state.recent = [{ a, b, at: ctx.now }, ...state.recent].slice(0, 3);
  const za = state.zombie[a];
  const zb = state.zombie[b];
  if (!za && !zb) {
    state.points[a] = (state.points[a] ?? 0) + 1;
    state.points[b] = (state.points[b] ?? 0) + 1;
  } else if (za && !zb) {
    infect(state, ctx, b, a, 'touch');
  } else if (zb && !za) {
    infect(state, ctx, a, b, 'touch');
  }
  notify(state, ctx, a, 'touched', b);
  notify(state, ctx, b, 'touched', a);
  ctx.emit('sound', 'tick');
}

function startRound(state: State, ctx: Ctx) {
  state.phase = 'round';
  state.touched = Object.fromEntries(ctx.players.map((p) => [p.id, []]));
  state.touchCount = 0;
  state.recent = [];
  ctx.releaseDealer();
  ctx.setTimer('phase', ctx.config.roundMin * 60_000);
  ctx.emit('sound', 'round');
}

function endRound(state: State, ctx: Ctx) {
  for (const req of [...state.requests]) dropRequest(state, ctx, req, 'expired');
  for (const p of ctx.players) {
    if (!state.zombie[p.id] && state.touched[p.id]!.length === 0) infect(state, ctx, p.id, null, 'idle');
  }
  const c = counts(state);
  state.history.push({ round: state.round, ...c });
  if (c.humans === 0 || state.round >= ctx.config.rounds) {
    toFinal(state, ctx);
    return;
  }
  state.phase = 'interval';
  ctx.setTimer('phase', Math.max(MIN_INTERVAL_MS, ctx.config.intervalSec * 1000));
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
}

export function scoreMatch(state: Pick<State, 'zombie' | 'initial' | 'points' | 'infections'>, ids: string[]) {
  const survivors = ids.filter((id) => !state.zombie[id]);
  // Zombies never score, starting or infected: at most they win the game (scenario 'zombies').
  const scores: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let scenario: FinalResult['scenario'];
  if (survivors.length === 0) {
    scenario = 'zombies';
  } else {
    const best = Math.max(...survivors.map((id) => state.points[id] ?? 0));
    const tie = survivors.length > 1 && survivors.every((id) => (state.points[id] ?? 0) === best);
    scenario = tie ? 'tie' : 'survivors';
    for (const id of survivors) scores[id] = (state.points[id] ?? 0) + ((state.points[id] ?? 0) === best ? 3 : 0);
  }
  return { scenario, survivors, scores };
}

function toFinal(state: State, ctx: Ctx) {
  const { scenario, survivors, scores } = scoreMatch(
    state,
    ctx.players.map((p) => p.id),
  );
  state.final = {
    scenario,
    initial: [...state.initial],
    infections: state.infections.map((i) => ({ ...i })),
    gifts: state.gifts.map((g) => ({ ...g })),
    points: { ...state.points },
    survivors,
    scores,
  };
  state.phase = 'final';
  ctx.setTimer('phase', FINAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2300);
  ctx.emit('fx', 'reveal', 2300);
}

function markSeen(state: State, ctx: Ctx, id: string) {
  if (!state.seen.includes(id)) state.seen.push(id);
  if (state.phase === 'roles' && ctx.players.every((p) => state.seen.includes(p.id))) startRound(state, ctx);
}

function tryCure(state: State, ctx: Ctx, id: string) {
  state.cures[id] = (state.cures[id] ?? 0) - 1;
  notify(state, ctx, id, 'cured');
  if (!state.zombie[id] || state.initial.includes(id)) return;
  const last = [...state.infections].reverse().find((i) => i.id === id && i.curedAt === null);
  if (!last || last.cause !== 'touch' || last.round !== state.round) return;
  if (ctx.now - last.at > ctx.config.cureWindowMin * 60_000) return;
  last.curedAt = ctx.now;
  state.zombie[id] = false;
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const ids = ctx.players.map((p) => p.id);
    const initial = ctx.rng.shuffle([...ids]).slice(0, zombieCount(ctx));
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      round: 1,
      initial,
      zombie: Object.fromEntries(ids.map((id) => [id, initial.includes(id)])),
      points: Object.fromEntries(ids.map((id) => [id, 0])),
      cures: Object.fromEntries(ids.map((id) => [id, 1])),
      seen: [],
      touched: Object.fromEntries(ids.map((id) => [id, []])),
      touchCount: 0,
      recent: [],
      requests: [],
      nextRequest: 1,
      infections: [],
      gifts: [],
      notices: {},
      history: [],
      final: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else startRoles(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action | null;
    if (!action || typeof action !== 'object') return;
    const mine = openRequest(state, playerId);

    switch (action.type) {
      // Shared screens (tutorial slides, rules on the TV) follow the Host only.
      case 'tvRules': {
        const page = action.page;
        const ok = page === null || (Number.isInteger(page) && page >= 0 && page < RULES.length);
        if (ok && isHost(ctx, playerId)) state.tvRules = page;
        return;
      }

      case 'intro': {
        if (state.phase !== 'intro' || !isHost(ctx, playerId)) return;
        const last = state.slide === SLIDES.length - 1;
        if (action.dir === 'skip' || (action.dir === 1 && last)) startRoles(state, ctx);
        else if (action.dir === 1) state.slide += 1;
        else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
        return;
      }

      case 'seen':
        if (state.phase === 'roles' && ctx.config.roleReveal === 'phone') markSeen(state, ctx, playerId);
        return;

      case 'touch': {
        const target = action.target;
        if (state.phase !== 'round' || !isPlayer(ctx, target) || target === playerId) return;
        if (mine || openRequest(state, target)) return;
        if (state.touched[playerId]!.includes(target)) return;
        const id = state.nextRequest++;
        state.requests.push({
          id,
          from: playerId,
          to: target,
          accepted: false,
          codes: {},
          confirmed: { [playerId]: false, [target]: false },
          misses: { [playerId]: 0, [target]: 0 },
        });
        ctx.setTimer(`req:${id}`, REQUEST_MS);
        return;
      }

      case 'accept': {
        if (!mine || mine.to !== playerId || mine.accepted) return;
        mine.accepted = true;
        const a = ctx.rng.int(10, 99);
        let b = ctx.rng.int(10, 98);
        if (b >= a) b += 1;
        mine.codes = { [mine.from]: a, [mine.to]: b };
        ctx.setTimer(`req:${mine.id}`, REQUEST_MS);
        return;
      }

      case 'decline':
        if (mine && mine.to === playerId && !mine.accepted) dropRequest(state, ctx, mine, 'declined');
        return;

      case 'cancel':
        if (mine) dropRequest(state, ctx, mine, 'declined');
        return;

      case 'code': {
        if (!mine || !mine.accepted || mine.confirmed[playerId]) return;
        if (!Number.isInteger(action.value) || action.value < 10 || action.value > 99) return;
        const partner = mine.from === playerId ? mine.to : mine.from;
        if (action.value === mine.codes[partner]) {
          mine.confirmed[playerId] = true;
          if (mine.confirmed[partner]) resolveTouch(state, ctx, mine);
        } else {
          mine.misses[playerId] = (mine.misses[playerId] ?? 0) + 1;
          if (mine.misses[playerId]! >= CODE_MISSES) dropRequest(state, ctx, mine, 'failed');
        }
        return;
      }

      case 'cure':
        if (state.phase === 'round' && (state.cures[playerId] ?? 0) > 0) tryCure(state, ctx, playerId);
        return;

      case 'give': {
        const target = action.target;
        if (state.phase !== 'round' && state.phase !== 'interval') return;
        if (!isPlayer(ctx, target) || target === playerId || (state.cures[playerId] ?? 0) < 1) return;
        state.cures[playerId]! -= 1;
        state.cures[target] = (state.cures[target] ?? 0) + 1;
        state.gifts.push({ from: playerId, to: target, round: state.round });
        notify(state, ctx, playerId, 'gave', target);
        notify(state, ctx, target, 'gift', playerId);
        return;
      }
    }
  },

  onTimer(state, key, ctx) {
    if (key.startsWith('req:')) {
      const req = state.requests.find((r) => `req:${r.id}` === key);
      if (req) dropRequest(state, ctx, req, 'expired');
      return;
    }
    if (key === 'intro') {
      if (state.phase === 'intro') startRoles(state, ctx);
      return;
    }
    if (key !== 'phase') return;
    switch (state.phase) {
      case 'roles':
        startRound(state, ctx);
        break;
      case 'round':
        endRound(state, ctx);
        break;
      case 'interval':
        state.round += 1;
        startRound(state, ctx);
        break;
      case 'final':
        ctx.end({ scores: state.final!.scores });
        break;
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    const req = openRequest(state, playerId);
    if (req) dropRequest(state, ctx, req, 'expired');
    if (state.phase === 'intro' && isHost(ctx, playerId)) startRoles(state, ctx);
    if (state.phase === 'roles') markSeen(state, ctx, playerId);
  },

  canVisitDealer(state, playerId, ctx) {
    return state.phase === 'roles' && ctx.config.roleReveal === 'dealer' && !state.seen.includes(playerId);
  },

  onDealerEnter(state, playerId) {
    if (!state.seen.includes(playerId)) state.seen.push(playerId);
  },

  onDealerLeave(state, _playerId, ctx) {
    if (state.phase === 'roles' && ctx.players.every((p) => state.seen.includes(p.id))) startRound(state, ctx);
  },

  publicView(state, ctx): PublicView {
    return {
      ...guide(state),
      phase: state.phase,
      hint: hint(state, ctx),
      round: state.round,
      rounds: ctx.config.rounds,
      mode: ctx.config.roleReveal,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      seen: state.seen,
      recent: state.recent,
      history: state.history,
      final: state.phase === 'final' ? state.final : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const req = openRequest(state, playerId);
    let request: RequestView | null = null;
    if (req) {
      const partner = req.from === playerId ? req.to : req.from;
      const key = `req:${req.id}`;
      request = {
        id: req.id,
        partner,
        outgoing: req.from === playerId,
        accepted: req.accepted,
        myCode: req.accepted ? (req.codes[playerId] ?? null) : null,
        iConfirmed: !!req.confirmed[playerId],
        partnerConfirmed: !!req.confirmed[partner],
        missesLeft: CODE_MISSES - (req.misses[playerId] ?? 0),
        deadline: ctx.timerDeadline(key),
        total: ctx.timerTotal(key),
      };
    }
    const showRole = state.phase === 'roles' && ctx.config.roleReveal === 'phone';
    return {
      ...guide(state),
      phase: state.phase,
      round: state.round,
      mode: ctx.config.roleReveal,
      deadline: ctx.timerDeadline(state.phase === 'intro' ? 'intro' : 'phase'),
      total: ctx.timerTotal(state.phase === 'intro' ? 'intro' : 'phase'),
      role: showRole ? (state.initial.includes(playerId) ? 'zombie' : 'human') : null,
      seen: state.seen.includes(playerId),
      targets: ctx.players
        .filter((p) => p.id !== playerId)
        .map((p) => ({
          id: p.id,
          touched: (state.touched[playerId] ?? []).includes(p.id),
          busy: !!openRequest(state, p.id),
        })),
      request,
      cures: state.cures[playerId] ?? 0,
      giftsFrom: state.gifts.filter((g) => g.to === playerId).map((g) => g.from),
      notice: state.notices[playerId] ?? null,
    };
  },

  dealerView(state, playerId): DealerView {
    return { role: state.initial.includes(playerId) ? 'zombie' : 'human' };
  },
});
