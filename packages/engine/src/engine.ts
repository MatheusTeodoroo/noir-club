import {
  PlatformAction,
  TIMING,
  type ClientId,
  type ClientInfo,
  type DealerFrame,
  type GameRef,
  type Lang,
  type PauseInfo,
  type PlayerFrame,
  type PlayerPlatformView,
  type PublicPlatformView,
  type RoomPhase,
  type ScheduledEvent,
} from '@mp/protocol';
import {
  configDefaults,
  createRng,
  fitsPlayerCount,
  sanitizeConfig,
  type GameCtx,
  type GameLogic,
  type GameResult,
  type PlayerInfo,
} from '@mp/game-sdk';

/** How long a called player has to reach the dealer and type the code. */
export const DEALER_CALL_MS = 60_000;
/** How long a verified player may stay at the dealer. */
export const DEALER_VISIT_MS = 90_000;

interface PlayerRecord {
  id: ClientId;
  name: string;
  avatar: string;
  spectator: boolean;
  remote: boolean;
  score: number;
}

interface Timer {
  key: string;
  scope: 'game' | 'platform';
  at: number;
  /** Duration it was set with (game timers), for countdown rings. */
  ms?: number;
}

interface DealerCurrent {
  playerId: ClientId;
  code: string;
  attemptsLeft: number;
  verified: boolean;
  /** Call deadline before verification, visit deadline after. */
  deadline: number;
}

/** Everything the engine knows. Plain JSON: this is exactly what gets snapshotted to the relay. */
export interface EngineState {
  v: 1;
  rng: number;
  lang: Lang;
  sharedHost: boolean;
  phase: RoomPhase;
  clients: Record<ClientId, ClientInfo>;
  players: Record<ClientId, PlayerRecord>;
  order: ClientId[];
  game: GameRef | null;
  config: Record<string, unknown>;
  loading: { ready: ClientId[]; logicReady: boolean } | null;
  match: { participants: ClientId[]; state: unknown } | null;
  timers: Timer[];
  pausedAt: number | null;
  dropped: Record<ClientId, number>;
  dealer: { queue: ClientId[]; current: DealerCurrent | null };
  results: { playerId: ClientId; score: number }[] | null;
}

export type RelayEffect = { t: 'e:kick'; clientId: ClientId } | { t: 'e:mode'; sharedHost: boolean };

export interface StepEffects {
  events: ScheduledEvent[];
  relay: RelayEffect[];
  /** True when something worth snapshotting changed (phase change etc.). */
  snapshot: boolean;
}

export interface Frames {
  public: { platform: PublicPlatformView; game: unknown };
  privates: Map<ClientId, Omit<PlayerFrame, 'seq'> | Omit<DealerFrame, 'seq' | 'at'>>;
}

export function initialState(seed: number): EngineState {
  return {
    v: 1,
    rng: seed >>> 0,
    lang: 'pt-BR',
    sharedHost: false,
    phase: 'lobby',
    clients: {},
    players: {},
    order: [],
    game: null,
    config: {},
    loading: null,
    match: null,
    timers: [],
    pausedAt: null,
    dropped: {},
    dealer: { queue: [], current: null },
    results: null,
  };
}

/**
 * The room's authoritative state machine. Device-agnostic: the same class runs on the host
 * phone or on a display (shared-host / migration). Time always comes in from the caller.
 */
export class Engine {
  state: EngineState;
  private logic: GameLogic | null = null;
  private fx: StepEffects = { events: [], relay: [], snapshot: false };

  constructor(state: EngineState) {
    this.state = state;
  }

  // -------------------------------------------------------------------------
  // Game logic loading (async, done by the runtime)
  // -------------------------------------------------------------------------

  /** Game the runtime must load before the match can (re)start, if not loaded yet. */
  neededLogic(): GameRef | null {
    const g = this.state.game;
    if (!g) return null;
    if (this.logic && this.logic.manifest.id === g.id && this.logic.manifest.version === g.version) return null;
    return g;
  }

  /** A match is running (or finished) but its game logic isn't loaded yet: views would be incomplete. */
  awaitingLogic(): boolean {
    return this.state.match !== null && this.neededLogic() !== null;
  }

  setLogic(logic: GameLogic, now: number): StepEffects {
    this.logic = logic;
    const s = this.state;
    if (s.game && Object.keys(s.config).length === 0) s.config = configDefaults(logic.manifest);
    if (s.loading) {
      s.loading.logicReady = true;
      this.maybeBeginMatch(now);
    }
    return this.flush();
  }

  get manifest() {
    return this.logic?.manifest ?? null;
  }

  // -------------------------------------------------------------------------
  // Inputs
  // -------------------------------------------------------------------------

  presence(clients: ClientInfo[], now: number): StepEffects {
    const s = this.state;
    const before = s.clients;
    s.clients = Object.fromEntries(clients.map((c) => [c.id, c]));

    for (const c of clients) {
      if (c.role !== 'player') continue;
      let p = s.players[c.id];
      if (!p) {
        p = { id: c.id, name: c.name, avatar: c.avatar, spectator: s.phase !== 'lobby', remote: false, score: 0 };
        s.players[c.id] = p;
        s.order.push(c.id);
        this.fx.snapshot = true;
      }
      const was = before[c.id]?.connected ?? false;
      if (was !== c.connected) this.onConnectivity(c.id, c.connected, now);
    }
    // Clients that vanished from the relay list entirely (kicked) count as disconnected.
    for (const id of Object.keys(before)) {
      if (!s.clients[id] && before[id]!.connected) this.onConnectivity(id, false, now);
    }
    if (s.loading) this.maybeBeginMatch(now);
    return this.flush();
  }

  action(from: ClientId, payload: unknown, now: number): StepEffects {
    const parsed = PlatformAction.safeParse(payload);
    if (!parsed.success) return this.flush();
    const a = parsed.data;
    const s = this.state;
    const client = s.clients[from];
    if (!client) return this.flush();
    const admin = client.isAdmin;
    const player = s.players[from];

    switch (a.type) {
      case 'profile':
        if (player) {
          player.name = a.name.trim().slice(0, 20) || player.name;
          player.avatar = a.avatar || player.avatar;
        }
        break;
      case 'setRemote':
        if (player) player.remote = a.remote;
        break;
      case 'selectGame':
        if (admin && s.phase === 'lobby') {
          s.game = a.game;
          s.config = {};
          if (this.logic && a.game && this.logic.manifest.id === a.game.id)
            s.config = configDefaults(this.logic.manifest);
          this.fx.snapshot = true;
        }
        break;
      case 'setConfig':
        if (admin && s.phase === 'lobby' && this.logic && s.game) {
          s.config = sanitizeConfig(this.logic.manifest, { ...s.config, ...a.config });
        }
        break;
      case 'setSettings':
        if (admin) {
          if (a.lang) s.lang = a.lang;
          if (a.sharedHost !== undefined && a.sharedHost !== s.sharedHost) {
            s.sharedHost = a.sharedHost;
            this.fx.relay.push({ t: 'e:mode', sharedHost: a.sharedHost });
            this.fx.snapshot = true;
          }
        }
        break;
      case 'start':
        if (admin) this.start(now);
        break;
      case 'backToLobby':
        if (admin && s.phase !== 'lobby') this.toLobby();
        break;
      case 'kick':
        if (admin && a.playerId !== from) {
          this.removePlayer(a.playerId, now);
          this.fx.relay.push({ t: 'e:kick', clientId: a.playerId });
        }
        break;
      case 'ready':
        if (s.loading && s.game && a.game.id === s.game.id && a.game.version === s.game.version) {
          if (!s.loading.ready.includes(from)) s.loading.ready.push(from);
          this.maybeBeginMatch(now);
        }
        break;
      case 'dealerRequest':
        this.dealerRequest(from, now);
        break;
      case 'dealerCancel':
        this.dealerCancel(from, now);
        break;
      case 'dealerCode':
        this.dealerCode(from, a.code, now);
        break;
      case 'dealerLeave':
        if (s.dealer.current?.playerId === from && s.dealer.current.verified) this.dealerRelease(now);
        break;
      case 'game':
        if (s.phase === 'playing' && s.match?.participants.includes(from) && !this.isGamePaused()) {
          this.runGame(now, (st, ctx) => this.logic!.onAction(st, from, a.action, ctx));
        }
        break;
    }
    return this.flush();
  }

  /** Fire every due timer. The runtime calls this when `nextTimerAt()` elapses. */
  tick(now: number): StepEffects {
    const s = this.state;
    for (let guard = 0; guard < 100; guard++) {
      const due = s.timers
        .filter((t) => t.at <= now && !(t.scope === 'game' && this.isGamePaused()))
        .sort((x, y) => x.at - y.at)[0];
      if (!due) break;
      s.timers = s.timers.filter((t) => t !== due);
      if (due.scope === 'game') {
        if (s.phase === 'playing' && this.logic?.onTimer) {
          this.runGame(now, (st, ctx) => this.logic!.onTimer!(st, due.key, ctx));
        }
      } else {
        this.onPlatformTimer(due.key, now);
      }
    }
    return this.flush();
  }

  /** Earliest timer that can fire right now (game timers are frozen while paused). */
  nextTimerAt(): number | null {
    const paused = this.isGamePaused();
    let min: number | null = null;
    for (const t of this.state.timers) {
      if (t.scope === 'game' && paused) continue;
      if (min === null || t.at < min) min = t.at;
    }
    return min;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  private activePlayers(): PlayerRecord[] {
    const s = this.state;
    return s.order.map((id) => s.players[id]!).filter((p) => p && !p.spectator && s.clients[p.id]?.connected);
  }

  private start(now: number) {
    const s = this.state;
    if (s.phase !== 'lobby' || !s.game) return;
    const count = this.activePlayers().length;
    const m = this.logic?.manifest;
    if (m && !fitsPlayerCount(m, count)) return;
    s.phase = 'loading';
    s.results = null;
    s.loading = { ready: [], logicReady: !!m && m.id === s.game.id };
    this.setPlatformTimer('load', now + TIMING.loadTimeoutMs);
    this.fx.snapshot = true;
    this.maybeBeginMatch(now);
  }

  private maybeBeginMatch(now: number, force = false) {
    const s = this.state;
    if (s.phase !== 'loading' || !s.loading || !s.loading.logicReady || !this.logic || !s.game) return;
    const required = Object.values(s.clients).filter(
      (c) => c.connected && (c.role !== 'player' || !s.players[c.id]?.spectator),
    );
    const allReady = required.every((c) => s.loading!.ready.includes(c.id));
    if (!allReady && !force) return;

    const participants = this.activePlayers().map((p) => p.id);
    const m = this.logic.manifest;
    if (!fitsPlayerCount(m, participants.length)) {
      // Someone left during loading; abort back to lobby rather than start an invalid match.
      this.toLobby();
      return;
    }
    this.clearPlatformTimer('load');
    s.loading = null;
    s.phase = 'playing';
    s.match = { participants, state: null };
    s.dealer = { queue: [], current: null };
    s.config = sanitizeConfig(m, s.config);
    this.runGame(now, (_st, ctx) => this.logic!.setup(ctx), true);
    this.emit('sound', 'start', 0, now);
    this.fx.snapshot = true;
  }

  private toLobby() {
    const s = this.state;
    s.phase = 'lobby';
    s.loading = null;
    s.match = null;
    s.timers = [];
    s.pausedAt = null;
    s.dropped = {};
    s.dealer = { queue: [], current: null };
    for (const p of Object.values(s.players)) p.spectator = false;
    this.fx.snapshot = true;
  }

  private finish(result: GameResult) {
    const s = this.state;
    for (const [id, pts] of Object.entries(result.scores)) {
      const p = s.players[id];
      if (p && Number.isFinite(pts)) p.score += pts;
    }
    s.phase = 'results';
    s.results = Object.entries(result.scores)
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => b.score - a.score);
    s.timers = s.timers.filter((t) => t.scope === 'platform' && !t.key.startsWith('dealer'));
    s.dealer = { queue: [], current: null };
    s.pausedAt = null;
    s.dropped = {};
    this.fx.snapshot = true;
  }

  private removePlayer(id: ClientId, now: number) {
    const s = this.state;
    delete s.players[id];
    s.order = s.order.filter((x) => x !== id);
    s.dealer.queue = s.dealer.queue.filter((x) => x !== id);
    if (s.dealer.current?.playerId === id) this.dealerRelease(now);
    if (s.dropped[id] !== undefined) this.resolveDrop(id, now, false);
    this.fx.snapshot = true;
  }

  // -------------------------------------------------------------------------
  // Disconnects & pause
  // -------------------------------------------------------------------------

  isGamePaused(): boolean {
    return this.state.pausedAt !== null;
  }

  private onConnectivity(id: ClientId, connected: boolean, now: number) {
    const s = this.state;
    const inMatch = s.phase === 'playing' && s.match?.participants.includes(id);
    if (!inMatch) return;
    if (!connected) {
      if (s.dropped[id] === undefined) {
        s.dropped[id] = now + TIMING.playerGraceMs;
        this.setPlatformTimer(`grace:${id}`, now + TIMING.playerGraceMs);
        if (s.pausedAt === null) s.pausedAt = now;
        this.fx.snapshot = true;
      }
    } else if (s.dropped[id] !== undefined) {
      this.resolveDrop(id, now, false);
    }
  }

  private resolveDrop(id: ClientId, now: number, timedOut: boolean) {
    const s = this.state;
    delete s.dropped[id];
    this.clearPlatformTimer(`grace:${id}`);
    if (Object.keys(s.dropped).length === 0 && s.pausedAt !== null) {
      const shift = now - s.pausedAt;
      for (const t of s.timers) if (t.scope === 'game') t.at += shift;
      if (s.dealer.current) s.dealer.current.deadline += shift;
      for (const t of s.timers) if (t.key.startsWith('dealer')) t.at += shift;
      s.pausedAt = null;
    }
    if (timedOut && s.phase === 'playing' && this.logic?.onPlayerTimeout) {
      this.runGame(now, (st, ctx) => this.logic!.onPlayerTimeout!(st, id, ctx));
    }
  }

  // -------------------------------------------------------------------------
  // Dealer queue
  // -------------------------------------------------------------------------

  private dealerRequest(from: ClientId, now: number) {
    const s = this.state;
    if (s.phase !== 'playing' || !this.logic?.manifest.usesDealer || this.isGamePaused()) return;
    if (!s.match?.participants.includes(from)) return;
    if (s.dealer.queue.includes(from) || s.dealer.current?.playerId === from) return;
    if (!this.canVisitDealer(from, now)) return;
    s.dealer.queue.push(from);
    this.dealerAdvance(now);
  }

  private canVisitDealer(id: ClientId, now: number): boolean {
    const fn = this.logic?.canVisitDealer;
    if (!fn || !this.state.match) return true;
    return fn(this.state.match.state, id, this.ctxReadOnly(now));
  }

  private dealerCancel(from: ClientId, now: number) {
    const s = this.state;
    s.dealer.queue = s.dealer.queue.filter((x) => x !== from);
    if (s.dealer.current?.playerId === from && !s.dealer.current.verified) {
      s.dealer.current = null;
      this.clearPlatformTimer('dealer');
      this.dealerAdvance(now);
    }
  }

  private dealerAdvance(now: number) {
    const s = this.state;
    if (s.dealer.current || s.phase !== 'playing') return;
    const next = s.dealer.queue.shift();
    if (!next) return;
    s.dealer.current = {
      playerId: next,
      code: this.newCode(),
      attemptsLeft: TIMING.dealerCodeAttempts,
      verified: false,
      deadline: now + DEALER_CALL_MS,
    };
    this.setPlatformTimer('dealer', now + DEALER_CALL_MS);
    this.emit('sound', 'dealerCall', 0, now);
    // Remote players are not in the physical room: they skip the code and see the dealer view on their phone.
    if (s.players[next]?.remote) this.dealerEnter(now);
  }

  private dealerCode(from: ClientId, code: string, now: number) {
    const cur = this.state.dealer.current;
    if (!cur || cur.playerId !== from || cur.verified) return;
    if (code.trim() === cur.code) {
      this.dealerEnter(now);
      return;
    }
    cur.attemptsLeft -= 1;
    if (cur.attemptsLeft <= 0) {
      // Burned code: rotate it so guessing never converges.
      cur.code = this.newCode();
      cur.attemptsLeft = TIMING.dealerCodeAttempts;
    }
  }

  private dealerEnter(now: number) {
    const cur = this.state.dealer.current!;
    cur.verified = true;
    cur.code = '';
    cur.deadline = now + DEALER_VISIT_MS;
    this.setPlatformTimer('dealer', cur.deadline);
    if (this.logic?.onDealerEnter) {
      const id = cur.playerId;
      this.runGame(now, (st, ctx) => this.logic!.onDealerEnter!(st, id, ctx));
    }
  }

  private dealerRelease(now: number) {
    const s = this.state;
    const cur = s.dealer.current;
    if (!cur) return;
    s.dealer.current = null;
    this.clearPlatformTimer('dealer');
    if (cur.verified && this.logic?.onDealerLeave && s.phase === 'playing') {
      this.runGame(now, (st, ctx) => this.logic!.onDealerLeave!(st, cur.playerId, ctx));
    }
    this.dealerAdvance(now);
  }

  private newCode(): string {
    const rng = this.rng();
    return String(rng.int(0, 999)).padStart(3, '0');
  }

  // -------------------------------------------------------------------------
  // Timers
  // -------------------------------------------------------------------------

  private setPlatformTimer(key: string, at: number) {
    this.clearPlatformTimer(key);
    this.state.timers.push({ key, scope: 'platform', at });
  }

  private clearPlatformTimer(key: string) {
    this.state.timers = this.state.timers.filter((t) => !(t.scope === 'platform' && t.key === key));
  }

  private onPlatformTimer(key: string, now: number) {
    const s = this.state;
    if (key === 'load') {
      this.maybeBeginMatch(now, true);
    } else if (key === 'dealer') {
      const cur = s.dealer.current;
      if (!cur) return;
      if (cur.verified) this.dealerRelease(now);
      else {
        s.dealer.current = null;
        this.dealerAdvance(now);
      }
    } else if (key.startsWith('grace:')) {
      const id = key.slice('grace:'.length);
      if (s.dropped[id] !== undefined) this.resolveDrop(id, now, true);
    }
  }

  // -------------------------------------------------------------------------
  // Game plumbing
  // -------------------------------------------------------------------------

  private rng() {
    return createRng(
      () => this.state.rng,
      (v) => {
        this.state.rng = v;
      },
    );
  }

  private emit(kind: 'sound' | 'fx', name: string, delayMs: number, now: number) {
    this.fx.events.push({ kind, name, at: now + TIMING.publicLeadMs + delayMs });
  }

  private playerInfos(): PlayerInfo[] {
    const s = this.state;
    const ids = s.match?.participants ?? [];
    return ids
      .map((id) => s.players[id])
      .filter((p): p is PlayerRecord => !!p)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        remote: p.remote,
        connected: !!s.clients[p.id]?.connected,
        isHost: !!s.clients[p.id]?.isAdmin,
      }));
  }

  private buildCtx(now: number, onEnd: (r: GameResult) => void, onRelease: () => void): GameCtx {
    const s = this.state;
    const timers = s.timers;
    return {
      now,
      rng: this.rng(),
      players: this.playerInfos(),
      config: s.config,
      atDealer: s.dealer.current?.verified ? s.dealer.current.playerId : null,
      setTimer: (key, ms) => {
        s.timers = s.timers.filter((t) => !(t.scope === 'game' && t.key === key));
        s.timers.push({ key, scope: 'game', at: now + Math.max(0, ms), ms: Math.max(0, ms) });
      },
      clearTimer: (key) => {
        s.timers = s.timers.filter((t) => !(t.scope === 'game' && t.key === key));
      },
      timerDeadline: (key) => (s.timers ?? timers).find((t) => t.scope === 'game' && t.key === key)?.at ?? null,
      timerTotal: (key) => (s.timers ?? timers).find((t) => t.scope === 'game' && t.key === key)?.ms ?? null,
      emit: (kind, name, delayMs = 0) => this.emit(kind, name, delayMs, now),
      end: onEnd,
      releaseDealer: onRelease,
    };
  }

  /** Context for views: same shape, but mutations are ignored. */
  private ctxReadOnly(now: number): GameCtx {
    const ctx = this.buildCtx(
      now,
      () => {},
      () => {},
    );
    const rngState = this.state.rng;
    return {
      ...ctx,
      rng: createRng(
        () => rngState,
        () => {},
      ),
      setTimer: () => {},
      clearTimer: () => {},
      emit: () => {},
    };
  }

  private runGame(now: number, fn: (state: any, ctx: GameCtx) => unknown, isSetup = false) {
    const s = this.state;
    if (!this.logic || !s.match) return;
    let ended: GameResult | null = null;
    let release = false;
    const ctx = this.buildCtx(
      now,
      (r) => {
        ended = r;
      },
      () => {
        release = true;
      },
    );
    const draft = isSetup ? null : structuredClone(s.match.state);
    const out = fn(draft, ctx);
    s.match.state = out === undefined ? draft : out;
    if (release && s.dealer.current?.verified) this.dealerRelease(now);
    if (ended) {
      this.finish(ended);
      return;
    }
    if (!isSetup) this.pruneDealerQueue(now);
  }

  /** The game moved on: drop queued/called players who may no longer visit the dealer. */
  private pruneDealerQueue(now: number) {
    const s = this.state;
    s.dealer.queue = s.dealer.queue.filter((id) => this.canVisitDealer(id, now));
    const cur = s.dealer.current;
    if (cur && !cur.verified && !this.canVisitDealer(cur.playerId, now)) {
      s.dealer.current = null;
      this.clearPlatformTimer('dealer');
      this.dealerAdvance(now);
    }
  }

  // -------------------------------------------------------------------------
  // Views — the only data that leaves the engine
  // -------------------------------------------------------------------------

  frames(now: number): Frames {
    const s = this.state;
    const ctx = this.ctxReadOnly(now);
    const matchState = s.match?.state;
    const hasGame = (s.phase === 'playing' || s.phase === 'results') && this.logic && s.match;

    const firstDrop = Object.entries(s.dropped).sort((a, b) => a[1] - b[1])[0];
    const paused: PauseInfo | null = firstDrop
      ? { reason: 'player', playerId: firstDrop[0], until: firstDrop[1] }
      : null;

    const clients = Object.values(s.clients);
    const platform: PublicPlatformView = {
      phase: s.phase,
      lang: s.lang,
      sharedHost: s.sharedHost,
      players: s.order
        .map((id) => s.players[id])
        .filter((p): p is PlayerRecord => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          connected: !!s.clients[p.id]?.connected,
          isAdmin: !!s.clients[p.id]?.isAdmin,
          spectator: p.spectator,
          remote: p.remote,
          score: p.score,
        })),
      game: s.game,
      gameConfig: s.config,
      displays: clients.filter((c) => c.role === 'display' && c.connected).length,
      dealers: clients.filter((c) => c.role === 'dealer' && c.connected).length,
      paused,
      dealer: {
        queue: [...s.dealer.queue],
        current: s.dealer.current?.playerId ?? null,
        verified: !!s.dealer.current?.verified,
      },
      results: s.results,
    };

    const publicGame = hasGame ? this.logic!.publicView(matchState, ctx) : null;
    const privates: Frames['privates'] = new Map();

    for (const c of clients) {
      if (!c.connected) continue;
      if (c.role === 'player') {
        const p = s.players[c.id];
        if (!p) continue;
        const cur = s.dealer.current;
        const isCurrent = cur?.playerId === c.id;
        const inMatch = !!s.match?.participants.includes(c.id);
        let dealer: PlayerPlatformView['dealer'] = { status: 'none' };
        if (isCurrent && cur.verified) dealer = { status: 'inside', deadline: cur.deadline };
        else if (isCurrent) dealer = { status: 'called', attemptsLeft: cur.attemptsLeft };
        else if (s.dealer.queue.includes(c.id))
          dealer = { status: 'queued', position: s.dealer.queue.indexOf(c.id) + 1 };

        const canRequestDealer =
          s.phase === 'playing' &&
          inMatch &&
          !!this.logic?.manifest.usesDealer &&
          dealer.status === 'none' &&
          !this.isGamePaused() &&
          this.canVisitDealer(c.id, now);

        const dealerGame =
          p.remote && isCurrent && cur.verified && this.logic?.dealerView
            ? this.logic.dealerView(matchState, c.id, ctx)
            : null;

        privates.set(c.id, {
          kind: 'player',
          platform: {
            you: c.id,
            isAdmin: c.isAdmin,
            spectator: p.spectator,
            remote: p.remote,
            dealer,
            canRequestDealer,
          },
          game: hasGame && inMatch ? this.logic!.playerView(matchState, c.id, ctx) : null,
          dealerGame,
        });
      } else if (c.role === 'dealer') {
        const cur = s.dealer.current;
        const curPlayer = cur ? s.players[cur.playerId] : null;
        privates.set(c.id, {
          kind: 'dealer',
          current:
            cur && curPlayer
              ? {
                  playerId: cur.playerId,
                  name: curPlayer.name,
                  avatar: curPlayer.avatar,
                  verified: cur.verified,
                  // Remote visits happen on the player's phone, so the physical dealer never shows a code for them.
                  code: cur.verified || curPlayer.remote ? null : cur.code,
                  deadline: cur.deadline,
                }
              : null,
          queue: s.dealer.queue
            .map((id) => s.players[id])
            .filter((p): p is PlayerRecord => !!p)
            .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })),
          game:
            cur?.verified && curPlayer && !curPlayer.remote && this.logic?.dealerView
              ? this.logic.dealerView(matchState, cur.playerId, ctx)
              : !cur && s.phase === 'playing' && hasGame && this.logic?.dealerIdleView
                ? this.logic.dealerIdleView(matchState, ctx)
                : null,
        });
      }
    }

    return { public: { platform, game: publicGame }, privates };
  }

  private flush(): StepEffects {
    const out = this.fx;
    this.fx = { events: [], relay: [], snapshot: false };
    return out;
  }
}
