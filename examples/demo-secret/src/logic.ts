import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';

export const manifest = manifestJson as GameManifest;

export interface Config {
  rounds: number;
  visitSeconds: number;
  discussSeconds: number;
  voteSeconds: number;
}

type Phase = 'visit' | 'discuss' | 'vote' | 'reveal';

export interface State {
  round: number;
  phase: Phase;
  /** SECRET: never sent to the display or other players' phones. */
  numbers: Record<string, number>;
  visited: string[];
  votes: Record<string, string>;
  totals: Record<string, number>;
  lastRound: null | {
    numbers: Record<string, number>;
    votes: Record<string, string>;
    winnerId: string;
    gained: Record<string, number>;
  };
}

export interface PublicView {
  round: number;
  rounds: number;
  phase: Phase;
  deadline: number | null;
  /** Full length of the running phase timer, for the countdown ring. */
  total: number | null;
  visited: string[];
  voted: string[];
  atDealer: string | null;
  reveal: State['lastRound'];
  totals: Record<string, number>;
}

export interface PlayerView {
  phase: Phase;
  deadline: number | null;
  /** Full length of the running phase timer, for the countdown ring. */
  total: number | null;
  visited: boolean;
  myVote: string | null;
  candidates: { id: string; name: string; avatar: string }[];
  /** Only filled after the reveal: by then the number is no longer secret. */
  revealedNumber: number | null;
}

export interface DealerView {
  number: number;
  round: number;
}

export type Action = { type: 'vote'; target: string };

type Ctx = GameCtx<Config>;

const REVEAL_MS = 12_000;

function startRound(state: State, ctx: Ctx) {
  state.phase = 'visit';
  state.visited = [];
  state.votes = {};
  const pool = ctx.rng.shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
  state.numbers = Object.fromEntries(ctx.players.map((p, i) => [p.id, pool[i]!]));
  ctx.setTimer('phase', ctx.config.visitSeconds * 1000);
  ctx.emit('sound', 'round');
}

function toDiscuss(state: State, ctx: Ctx) {
  state.phase = 'discuss';
  ctx.releaseDealer();
  ctx.setTimer('phase', ctx.config.discussSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function toVote(state: State, ctx: Ctx) {
  state.phase = 'vote';
  ctx.setTimer('phase', ctx.config.voteSeconds * 1000);
  ctx.emit('sound', 'phase');
}

function toReveal(state: State, ctx: Ctx) {
  const entries = Object.entries(state.numbers);
  const [winnerId] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  const gained: Record<string, number> = {};
  for (const p of ctx.players) gained[p.id] = 0;
  for (const [voter, target] of Object.entries(state.votes)) {
    if (target === winnerId) gained[voter] = (gained[voter] ?? 0) + 2;
    else gained[winnerId] = (gained[winnerId] ?? 0) + 1; // the holder profits from every wrong guess
  }
  for (const [id, pts] of Object.entries(gained)) state.totals[id] = (state.totals[id] ?? 0) + pts;
  state.lastRound = { numbers: { ...state.numbers }, votes: { ...state.votes }, winnerId, gained };
  state.phase = 'reveal';
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', 2500);
  ctx.emit('fx', 'reveal', 2500);
}

function everyoneVisited(state: State, ctx: Ctx) {
  return ctx.players.every((p) => state.visited.includes(p.id));
}

function everyoneVoted(state: State, ctx: Ctx) {
  return ctx.players.filter((p) => p.connected).every((p) => state.votes[p.id] !== undefined);
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const state: State = {
      round: 1,
      phase: 'visit',
      numbers: {},
      visited: [],
      votes: {},
      totals: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
      lastRound: null,
    };
    startRound(state, ctx);
    return state;
  },

  onAction(state, playerId, raw, ctx) {
    const action = raw as Action;
    if (action?.type === 'vote' && state.phase === 'vote') {
      if (action.target === playerId) return;
      if (!ctx.players.some((p) => p.id === action.target)) return;
      state.votes[playerId] = action.target;
      ctx.emit('sound', 'tick');
      if (everyoneVoted(state, ctx)) toReveal(state, ctx);
    }
  },

  onTimer(state, key, ctx) {
    if (key !== 'phase') return;
    switch (state.phase) {
      case 'visit':
        // Anyone who never showed up just plays blind this round.
        toDiscuss(state, ctx);
        break;
      case 'discuss':
        toVote(state, ctx);
        break;
      case 'vote':
        toReveal(state, ctx);
        break;
      case 'reveal':
        if (state.round >= ctx.config.rounds) {
          ctx.end({ scores: state.totals });
        } else {
          state.round += 1;
          startRound(state, ctx);
        }
        break;
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    if (state.phase === 'visit' && !state.visited.includes(playerId)) {
      state.visited.push(playerId);
      if (everyoneVisited(state, ctx)) toDiscuss(state, ctx);
    }
    if (state.phase === 'vote' && everyoneVoted(state, ctx)) toReveal(state, ctx);
  },

  canVisitDealer(state, playerId) {
    return state.phase === 'visit' && !state.visited.includes(playerId);
  },

  onDealerEnter(state, playerId) {
    if (!state.visited.includes(playerId)) state.visited.push(playerId);
  },

  onDealerLeave(state, _playerId, ctx) {
    if (state.phase === 'visit' && everyoneVisited(state, ctx)) toDiscuss(state, ctx);
  },

  publicView(state, ctx): PublicView {
    return {
      round: state.round,
      rounds: ctx.config.rounds,
      phase: state.phase,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      visited: state.visited,
      voted: Object.keys(state.votes),
      atDealer: ctx.atDealer,
      reveal: state.phase === 'reveal' ? state.lastRound : null,
      totals: state.totals,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    return {
      phase: state.phase,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      visited: state.visited.includes(playerId),
      myVote: state.votes[playerId] ?? null,
      candidates: ctx.players.filter((p) => p.id !== playerId).map(({ id, name, avatar }) => ({ id, name, avatar })),
      revealedNumber: state.phase === 'reveal' ? (state.numbers[playerId] ?? null) : null,
    };
  },

  dealerView(state, playerId): DealerView {
    return { number: state.numbers[playerId] ?? 0, round: state.round };
  },
});
