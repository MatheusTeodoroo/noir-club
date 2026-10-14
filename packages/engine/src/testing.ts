import type { ClientInfo, DealerFrame, PlayerFrame, PublicPlatformView } from '@mp/protocol';
import type { GameLogic } from '@mp/game-sdk';
import { Engine, initialState } from './engine.ts';

/**
 * Drives a whole room through the real platform engine, for game unit tests: lobby, loading,
 * dealer queue and codes, timers, disconnects and views — no network, no browser, no real time.
 *
 *   const room = createTestRoom(game, { players: 4 });
 *   room.act('p2', { type: 'vote', target: 'p3' });
 *   room.advance(30_000);
 *   expect(room.publicView()).toMatchObject({ phase: 'reveal' });
 */

export interface TestRoomOptions {
  /** Number of players (ids p1..pN; p1 is the Host/admin). Default: the game's minPlayers. */
  players?: number;
  /** Config overrides on top of the manifest defaults. */
  config?: Record<string, unknown>;
  /** Player ids that play remotely (they see the dealer view on their own phone). */
  remote?: string[];
  /** RNG seed for reproducible secrets. */
  seed?: number;
  /** Start the match right away (default true). */
  start?: boolean;
}

export const PLAYER_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Eva',
  'Felipe',
  'Gabi',
  'Heitor',
  'Isa',
  'João',
  'Lara',
  'Miguel',
];
const AVATARS = ['🎩', '🃏', '🎲', '🍷', '💎', '👑', '🌙', '🦊', '🦉', '🐺', '🎭', '🗝️'];

export function createTestRoom<S = any>(logic: GameLogic<S, any>, opts: TestRoomOptions = {}) {
  const count = opts.players ?? logic.manifest.minPlayers;
  let now = 1_700_000_000_000;
  const engine = new Engine(initialState(opts.seed ?? 42));
  const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
  const game = { id: logic.manifest.id, version: logic.manifest.version };

  let clients: ClientInfo[] = [
    ...ids.map((id, i) => ({
      id,
      role: 'player' as const,
      name: PLAYER_NAMES[i % PLAYER_NAMES.length]!,
      avatar: AVATARS[i % AVATARS.length]!,
      connected: true,
      isAdmin: i === 0,
    })),
    { id: 'tv', role: 'display', name: 'Display', avatar: '📺', connected: true, isAdmin: false },
    { id: 'dealer', role: 'dealer', name: 'Dealer', avatar: '🃏', connected: true, isAdmin: false },
  ];

  const platform = (from: string, payload: unknown) => engine.action(from, payload, now);
  const frames = () => engine.frames(now);

  engine.presence(clients, now);
  for (const id of opts.remote ?? []) platform(id, { type: 'setRemote', remote: true });
  platform('p1', { type: 'selectGame', game });
  engine.setLogic(logic, now);
  if (opts.config) platform('p1', { type: 'setConfig', config: opts.config });

  const room = {
    engine,
    /** Player ids, p1 first (p1 is the Host). */
    ids,
    get now() {
      return now;
    },

    /** Starts the match (all devices report the game loaded). */
    start() {
      platform('p1', { type: 'start' });
      for (const c of clients) if (c.connected) platform(c.id, { type: 'ready', game });
      if (engine.state.phase !== 'playing') {
        throw new Error(`match did not start (phase ${engine.state.phase}); check min/max players`);
      }
    },

    /** Sends a game action from a player's phone. */
    act(id: string, action: unknown) {
      platform(id, { type: 'game', action });
    },

    /** Sends a raw platform action (dealerRequest, setRemote, kick, backToLobby...). */
    platform,

    /** Moves the room clock forward, firing every timer that falls due on the way. */
    advance(ms: number) {
      const target = now + ms;
      for (let guard = 0; guard < 10_000; guard++) {
        const next = engine.nextTimerAt();
        if (next === null || next > target) break;
        now = Math.max(now, next);
        engine.tick(now);
      }
      now = target;
      engine.tick(now);
    },

    /** Runs the full dealer flow for a player: queue, type the code shown on the Dealer, enter. */
    enterDealer(id: string) {
      platform(id, { type: 'dealerRequest' });
      const cur = engine.state.dealer.current;
      if (!cur || cur.playerId !== id) {
        throw new Error(`${id} is not at the front of the dealer queue (can the game let them visit now?)`);
      }
      if (!cur.verified) platform(id, { type: 'dealerCode', code: cur.code });
      return room.dealerView(id);
    },

    /** Leaves the dealer (the phone's "Sair do Dealer"). */
    leaveDealer(id: string) {
      platform(id, { type: 'dealerLeave' });
    },

    /** enterDealer + leaveDealer; returns what the Dealer screen showed. */
    visitDealer(id: string) {
      const seen = room.enterDealer(id);
      room.leaveDealer(id);
      return seen;
    },

    disconnect(id: string) {
      clients = clients.map((c) => (c.id === id ? { ...c, connected: false } : c));
      engine.presence(clients, now);
    },

    reconnect(id: string) {
      clients = clients.map((c) => (c.id === id ? { ...c, connected: true } : c));
      engine.presence(clients, now);
    },

    // ---- What each device sees -------------------------------------------------

    /** The game's public view, exactly as every TV receives it. */
    publicView(): any {
      return frames().public.game;
    },
    /** Platform part of the public frame (phase, players, scores, dealer queue, pause). */
    publicPlatform(): PublicPlatformView {
      return frames().public.platform;
    },
    /** The whole public frame serialized — handy for `not.toContain(secret)` checks. */
    publicJson(): string {
      return JSON.stringify(frames().public);
    },
    /** Game view on this player's phone. */
    playerView(id: string): any {
      return (frames().privates.get(id) as PlayerFrame | undefined)?.game ?? null;
    },
    /** Full phone frame (platform status: dealer queue position, isAdmin, remote...). */
    playerFrame(id: string): Omit<PlayerFrame, 'seq'> | null {
      return (frames().privates.get(id) as PlayerFrame | undefined) ?? null;
    },
    /** Game view on the Dealer screen right now (null unless someone is verified inside). */
    dealerView(id?: string): any {
      // Remote players see it on their own phone instead of the Dealer screen.
      const phone = id ? (frames().privates.get(id) as PlayerFrame | undefined) : undefined;
      if (phone?.dealerGame != null) return phone.dealerGame;
      const f = frames().privates.get('dealer') as DealerFrame | undefined;
      if (!f || (id && f.current?.playerId !== id)) return null;
      return f.game;
    },
    /** Full Dealer screen frame (current player, code, queue). */
    dealerFrame(): Omit<DealerFrame, 'seq' | 'at'> | null {
      return (frames().privates.get('dealer') as DealerFrame | undefined) ?? null;
    },

    /**
     * Everything observable at once — private state plus every device's view — as one string.
     * Compare two snapshots to assert an action changed nothing:
     *   const before = room.snapshot(); room.act('p1', bad); expect(room.snapshot()).toBe(before);
     */
    snapshot(): string {
      const f = frames();
      return JSON.stringify({
        state: engine.state.match?.state ?? null,
        public: f.public,
        privates: Object.fromEntries([...f.privates].sort(([a], [b]) => a.localeCompare(b))),
      });
    },

    /** The game's private state (for assertions only — never what a device sees). */
    state(): S {
      return engine.state.match?.state as S;
    },
    /** lobby | loading | playing | results */
    phase() {
      return engine.state.phase;
    },
    /** Final ranking once the game called ctx.end(). */
    results() {
      return engine.state.results;
    },
  };

  if (opts.start ?? true) room.start();
  return room;
}

export type TestRoom = ReturnType<typeof createTestRoom>;
