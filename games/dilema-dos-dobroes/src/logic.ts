import { defineGame, type GameCtx, type GameManifest } from '@mp/game-sdk';
import manifestJson from '../manifest.json';
import { MAX_ROUNDS, MAX_TIES, START_COINS, WINS_NEEDED, TEAMS, type Team } from './shared.ts';
import { RULES, SLIDES } from './texts.ts';

// Two teams; each player holds 10 doubloons for the whole match. Every round each player visits the
// Dealer once and drops 0..balance into a pot that burns them. The team with the larger total wins
// the round (the loser's total is announced, the winner's stays hidden); first to 3 wins takes the
// match — but the ranking inside each team goes by the doubloons each player kept.

export const manifest = manifestJson as GameManifest;

export interface Config {
  tutorial: boolean;
  roundMinutes: number;
  visitSeconds: number;
}

type Phase = 'intro' | 'teams' | 'deposit' | 'reveal' | 'final';

export interface RoundResult {
  round: number;
  /** null: tie (deposits refunded, round replayed). */
  winner: Team | null;
  /** SECRET until the final reveal (the loser's side is public at the round's reveal). */
  totals: Record<Team, number>;
}

export interface Placement {
  playerId: string;
  team: Team;
  place: number;
  points: number;
}

export interface FinalResult {
  /** null: draw (both teams broke, or ties piled up, with the same number of wins). */
  winner: Team | null;
  reason: 'wins' | 'broke' | 'ties';
  balances: Record<string, number>;
  placements: Placement[];
}

/** Engine-side state. Everything here is private until a view exposes it. */
export interface State {
  phase: Phase;
  slide: number;
  tvRules: number | null;
  teams: Record<string, Team>;
  /** SECRET: each player's doubloons. */
  balances: Record<string, number>;
  /** Counted round being played (ties replay the same number). */
  round: number;
  /** Ties in a row on this round. */
  ties: number;
  wins: Record<Team, number>;
  /** SECRET: confirmed deposits this round. */
  deposits: Record<string, number>;
  /** Who has used their turn this round (confirmed, timed out, left or missing) — public. */
  done: string[];
  /** SECRET: amount the visitor is choosing on their phone (Dealer screen only). */
  draft: number;
  /** Every round played, ties included. */
  history: RoundResult[];
  final: FinalResult | null;
}

/** Public history entry: the winner's total is hidden until the final reveal. */
export interface PublicRound {
  round: number;
  winner: Team | null;
  loserTotal: number | null;
  winnerTotal: number | null;
}

/** What every TV shows. */
export interface PublicView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  round: number;
  ties: number;
  maxRounds: number;
  winsNeeded: number;
  deadline: number | null;
  total: number | null;
  teams: Record<string, Team>;
  wins: Record<Team, number>;
  done: string[];
  atDealer: string | null;
  history: PublicRound[];
  /** The round just revealed (reveal phase only). */
  reveal: PublicRound | null;
  final: FinalResult | null;
}

/** What one phone shows. */
export interface PlayerView {
  phase: Phase;
  slide: number;
  slides: number;
  tvRules: number | null;
  round: number;
  deadline: number | null;
  total: number | null;
  team: Team | null;
  done: boolean;
  /** Only while this player is inside the Dealer and hasn't confirmed: the stepper's limit. */
  visit: null | { max: number; draft: number; deadline: number | null; total: number | null };
  /** Only after the final reveal. */
  placement: Placement | null;
  myBalance: number | null;
}

/** What the Dealer screen shows the visitor. */
export interface DealerView {
  team: Team | null;
  round: number;
  balance: number;
  draft: number;
  deadline: number | null;
  total: number | null;
}

export type Action =
  | { type: 'draft'; amount: number }
  | { type: 'deposit'; amount: number }
  | { type: 'intro'; dir: 1 | -1 | 'skip' }
  | { type: 'tvRules'; page: number | null };

type Ctx = GameCtx<Config>;

const TEAMS_MS = 10_000;
const REVEAL_MS = 12_000;
const FINAL_MS = 25_000;
/** Safety net: if the Host never advances the tutorial (left the room), the game starts anyway. */
const INTRO_MAX_MS = 5 * 60_000;
/** Drumroll before the reveal lands. */
const REVEAL_DELAY_MS = 2_500;

const isHost = (ctx: Ctx, playerId: string) => ctx.players.some((p) => p.id === playerId && p.isHost);
const other = (team: Team): Team => (team === 'gold' ? 'crimson' : 'gold');

const teamCoins = (state: State, team: Team) =>
  Object.entries(state.balances).reduce((sum, [id, c]) => (state.teams[id] === team ? sum + c : sum), 0);

function toTeams(state: State, ctx: Ctx) {
  state.phase = 'teams';
  state.tvRules = null;
  ctx.setTimer('phase', TEAMS_MS);
  ctx.emit('sound', 'phase');
}

function startRound(state: State, ctx: Ctx) {
  state.phase = 'deposit';
  state.deposits = {};
  state.done = [];
  state.draft = 0;
  // Players already gone sit this round out with a deposit of 0.
  for (const p of ctx.players) if (!p.connected) state.done.push(p.id);
  ctx.setTimer('phase', ctx.config.roundMinutes * 60_000);
  ctx.emit('sound', 'round');
}

function reveal(state: State, ctx: Ctx) {
  ctx.clearTimer('visit');
  for (const p of ctx.players) if (!state.done.includes(p.id)) state.done.push(p.id);
  const totals: Record<Team, number> = { gold: 0, crimson: 0 };
  for (const [id, amount] of Object.entries(state.deposits)) totals[state.teams[id]!] += amount;
  const winner: Team | null = totals.gold === totals.crimson ? null : totals.gold > totals.crimson ? 'gold' : 'crimson';
  state.history.push({ round: state.round, winner, totals });
  if (winner) {
    state.wins[winner] += 1;
    state.ties = 0;
  } else {
    // Tie: the pot goes back, the round is played again.
    for (const [id, amount] of Object.entries(state.deposits)) state.balances[id]! += amount;
    state.ties += 1;
  }
  state.phase = 'reveal';
  state.draft = 0;
  ctx.releaseDealer();
  ctx.setTimer('phase', REVEAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', REVEAL_DELAY_MS);
  ctx.emit('fx', 'reveal', REVEAL_DELAY_MS);
}

/** Competition ranking inside a team (1, 1, 3), offset by the places above it. */
function rankTeam(state: State, team: Team, offset: number, n: number, scoring: boolean): Placement[] {
  const ids = Object.keys(state.teams).filter((id) => state.teams[id] === team);
  ids.sort((a, b) => state.balances[b]! - state.balances[a]!);
  return ids.map((id) => {
    const place = offset + 1 + ids.filter((o) => state.balances[o]! > state.balances[id]!).length;
    return { playerId: id, team, place, points: scoring ? n - place + 1 : 0 };
  });
}

function toFinal(state: State, ctx: Ctx, reason: FinalResult['reason']) {
  const { gold, crimson } = state.wins;
  const winner: Team | null = gold === crimson ? null : gold > crimson ? 'gold' : 'crimson';
  const n = ctx.players.length;
  const first = winner ?? 'gold';
  // A draw ranks each team on its own (everyone scores 0 anyway).
  const placements = [
    ...rankTeam(state, first, 0, n, winner !== null),
    ...rankTeam(state, other(first), winner ? n / 2 : 0, n, winner !== null),
  ];
  state.final = { winner, reason, balances: { ...state.balances }, placements };
  state.phase = 'final';
  ctx.setTimer('phase', FINAL_MS);
  ctx.emit('sound', 'drumroll');
  ctx.emit('sound', 'reveal', REVEAL_DELAY_MS);
  ctx.emit('fx', 'final', REVEAL_DELAY_MS);
}

function afterReveal(state: State, ctx: Ctx) {
  if (TEAMS.some((t) => state.wins[t] >= WINS_NEEDED)) return toFinal(state, ctx, 'wins');
  if (TEAMS.every((t) => teamCoins(state, t) === 0)) return toFinal(state, ctx, 'broke');
  if (state.ties >= MAX_TIES) return toFinal(state, ctx, 'ties');
  if (state.history[state.history.length - 1]?.winner) state.round += 1;
  if (state.round > MAX_ROUNDS) return toFinal(state, ctx, 'wins');
  startRound(state, ctx);
}

/** A player's turn this round is over (0 unless they confirmed); ends the round when all are done. */
function finishTurn(state: State, playerId: string, ctx: Ctx) {
  if (state.phase !== 'deposit') return;
  if (!state.done.includes(playerId)) state.done.push(playerId);
  if (ctx.players.every((p) => state.done.includes(p.id))) reveal(state, ctx);
}

function validAmount(state: State, playerId: string, amount: unknown, ctx: Ctx): amount is number {
  return (
    state.phase === 'deposit' &&
    ctx.atDealer === playerId &&
    !state.done.includes(playerId) &&
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    amount >= 0 &&
    amount <= (state.balances[playerId] ?? 0)
  );
}

function publicRound(r: RoundResult, showWinner: boolean): PublicRound {
  return {
    round: r.round,
    winner: r.winner,
    loserTotal: r.winner ? r.totals[other(r.winner)] : null,
    winnerTotal: r.winner && showWinner ? r.totals[r.winner] : null,
  };
}

export default defineGame<State, Config>({
  manifest,

  setup(ctx) {
    const ids = ctx.rng.shuffle(ctx.players.map((p) => p.id));
    const half = ids.length / 2;
    const state: State = {
      phase: 'intro',
      slide: 0,
      tvRules: null,
      teams: Object.fromEntries(ctx.players.map((p) => [p.id, ids.indexOf(p.id) < half ? 'gold' : 'crimson'])),
      balances: Object.fromEntries(ctx.players.map((p) => [p.id, START_COINS])),
      round: 1,
      ties: 0,
      wins: { gold: 0, crimson: 0 },
      deposits: {},
      done: [],
      draft: 0,
      history: [],
      final: null,
    };
    if (ctx.config.tutorial) ctx.setTimer('intro', INTRO_MAX_MS);
    else toTeams(state, ctx);
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
        toTeams(state, ctx);
      } else if (action.dir === 1) state.slide += 1;
      else if (action.dir === -1 && state.slide > 0) state.slide -= 1;
      return;
    }
    if (action.type === 'draft') {
      if (validAmount(state, playerId, action.amount, ctx)) state.draft = action.amount;
      return;
    }
    if (action.type === 'deposit') {
      if (!validAmount(state, playerId, action.amount, ctx)) return;
      state.deposits[playerId] = action.amount;
      state.balances[playerId]! -= action.amount;
      state.done.push(playerId);
      ctx.emit('sound', 'tick');
      // The end-of-round check runs in onDealerLeave, once the visitor is out.
      ctx.releaseDealer();
    }
  },

  onTimer(state, key, ctx) {
    if (key === 'intro') {
      if (state.phase === 'intro') toTeams(state, ctx);
      return;
    }
    if (key === 'visit') {
      // Out of time at the Dealer: onDealerLeave closes the turn with a deposit of 0.
      if (state.phase === 'deposit' && ctx.atDealer) ctx.releaseDealer();
      return;
    }
    if (key !== 'phase') return;
    if (state.phase === 'teams') startRound(state, ctx);
    else if (state.phase === 'deposit') reveal(state, ctx);
    else if (state.phase === 'reveal') afterReveal(state, ctx);
    else if (state.phase === 'final' && state.final) {
      ctx.end({ scores: Object.fromEntries(state.final.placements.map((p) => [p.playerId, p.points])) });
    }
  },

  onPlayerTimeout(state, playerId, ctx) {
    // The Host left during the tutorial: nobody else can advance it, so start playing.
    if (state.phase === 'intro' && isHost(ctx, playerId)) {
      ctx.clearTimer('intro');
      toTeams(state, ctx);
      return;
    }
    // A missing player deposits 0 this round (one inside the Dealer is closed by onDealerLeave).
    if (state.phase === 'deposit' && ctx.atDealer !== playerId) finishTurn(state, playerId, ctx);
  },

  canVisitDealer(state, playerId) {
    return state.phase === 'deposit' && !state.done.includes(playerId);
  },

  onDealerEnter(state, _playerId, ctx) {
    state.draft = 0;
    ctx.setTimer('visit', ctx.config.visitSeconds * 1000);
  },

  onDealerLeave(state, playerId, ctx) {
    ctx.clearTimer('visit');
    state.draft = 0;
    finishTurn(state, playerId, ctx);
  },

  publicView(state, ctx): PublicView {
    const final = state.phase === 'final';
    const last = state.history[state.history.length - 1];
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      round: state.round,
      ties: state.ties,
      maxRounds: MAX_ROUNDS,
      winsNeeded: WINS_NEEDED,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      teams: state.teams,
      wins: state.wins,
      done: state.done,
      atDealer: ctx.atDealer,
      history: state.history.map((r) => publicRound(r, final)),
      reveal: state.phase === 'reveal' && last ? publicRound(last, false) : null,
      final: final ? state.final : null,
    };
  },

  playerView(state, playerId, ctx): PlayerView {
    const visiting = state.phase === 'deposit' && ctx.atDealer === playerId && !state.done.includes(playerId);
    const final = state.phase === 'final';
    return {
      phase: state.phase,
      slide: state.slide,
      slides: SLIDES.length,
      tvRules: state.tvRules,
      round: state.round,
      deadline: ctx.timerDeadline('phase'),
      total: ctx.timerTotal('phase'),
      team: state.teams[playerId] ?? null,
      done: state.done.includes(playerId),
      visit: visiting
        ? {
            max: state.balances[playerId] ?? 0,
            draft: state.draft,
            deadline: ctx.timerDeadline('visit'),
            total: ctx.timerTotal('visit'),
          }
        : null,
      placement: final ? (state.final?.placements.find((p) => p.playerId === playerId) ?? null) : null,
      myBalance: final ? (state.balances[playerId] ?? null) : null,
    };
  },

  dealerView(state, playerId, ctx): DealerView {
    return {
      team: state.teams[playerId] ?? null,
      round: state.round,
      balance: state.balances[playerId] ?? 0,
      draft: ctx.atDealer === playerId ? state.draft : 0,
      deadline: ctx.timerDeadline('visit'),
      total: ctx.timerTotal('visit'),
    };
  },
});
