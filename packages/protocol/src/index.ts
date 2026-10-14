import { z } from 'zod';

/**
 * Wire protocol shared by the relay (Durable Object), the engine host and every client.
 *
 * Topology:
 *  - Every device keeps one WebSocket to the room's Durable Object (the "relay").
 *  - Exactly one device runs the engine (host phone, or a display in shared-host mode).
 *  - Public frames: engine -> relay once -> relay fans out to every socket.
 *  - Private frames and actions: WebRTC DataChannel between engine and client when open,
 *    otherwise through the relay (`e:private` / `action`).
 */

export const PROTOCOL_VERSION = 1;

export type ClientId = string;
export type Role = 'player' | 'display' | 'dealer';
export type Lang = 'pt-BR' | 'en';

export interface ClientInfo {
  id: ClientId;
  role: Role;
  name: string;
  avatar: string;
  connected: boolean;
  isAdmin: boolean;
}

/** Scheduled effect that every display plays at the same room-clock instant. */
export interface ScheduledEvent {
  kind: 'sound' | 'fx';
  name: string;
  at: number;
}

// ---------------------------------------------------------------------------
// Frames produced by the engine
// ---------------------------------------------------------------------------

export type RoomPhase = 'lobby' | 'loading' | 'playing' | 'results';

export interface GameRef {
  id: string;
  version: string;
}

export interface PublicPlayer {
  id: ClientId;
  name: string;
  avatar: string;
  connected: boolean;
  isAdmin: boolean;
  spectator: boolean;
  remote: boolean;
  score: number;
}

export interface PauseInfo {
  reason: 'player' | 'engine';
  playerId?: ClientId;
  /** Room-clock time when the pause resolves on its own. */
  until?: number;
}

export interface DealerPublic {
  queue: ClientId[];
  current: ClientId | null;
  verified: boolean;
}

export interface PublicPlatformView {
  phase: RoomPhase;
  lang: Lang;
  sharedHost: boolean;
  players: PublicPlayer[];
  game: GameRef | null;
  gameConfig: Record<string, unknown>;
  displays: number;
  dealers: number;
  paused: PauseInfo | null;
  dealer: DealerPublic;
  results: { playerId: ClientId; score: number }[] | null;
}

export interface PublicFrame {
  seq: number;
  /** Room-clock time at which displays apply this frame (keeps every TV in lockstep). */
  at: number;
  platform: PublicPlatformView;
  game: unknown;
  events: ScheduledEvent[];
}

export interface PlayerPlatformView {
  you: ClientId;
  isAdmin: boolean;
  spectator: boolean;
  remote: boolean;
  /** Dealer state seen from this player's phone. */
  dealer:
    | { status: 'none' }
    | { status: 'queued'; position: number }
    | { status: 'called'; attemptsLeft: number }
    | { status: 'inside'; deadline: number };
  canRequestDealer: boolean;
}

export interface PlayerFrame {
  kind: 'player';
  seq: number;
  platform: PlayerPlatformView;
  game: unknown;
  /** Remote players see their dealer view on their own phone. */
  dealerGame: unknown;
}

export interface DealerFrame {
  kind: 'dealer';
  seq: number;
  at: number;
  current: null | {
    playerId: ClientId;
    name: string;
    avatar: string;
    verified: boolean;
    code: string | null;
    deadline: number | null;
  };
  queue: { id: ClientId; name: string; avatar: string }[];
  game: unknown;
}

export type PrivateFrame = PlayerFrame | DealerFrame;

// ---------------------------------------------------------------------------
// Platform actions (client -> engine). Game actions are wrapped in `game`.
// ---------------------------------------------------------------------------

export const PlatformAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), name: z.string().min(1).max(20), avatar: z.string().max(8) }),
  z.object({ type: z.literal('setRemote'), remote: z.boolean() }),
  z.object({ type: z.literal('selectGame'), game: z.object({ id: z.string(), version: z.string() }).nullable() }),
  z.object({ type: z.literal('setConfig'), config: z.record(z.string(), z.unknown()) }),
  z.object({
    type: z.literal('setSettings'),
    sharedHost: z.boolean().optional(),
    lang: z.enum(['pt-BR', 'en']).optional(),
  }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('backToLobby') }),
  z.object({ type: z.literal('kick'), playerId: z.string() }),
  z.object({ type: z.literal('ready'), game: z.object({ id: z.string(), version: z.string() }) }),
  z.object({ type: z.literal('dealerRequest') }),
  z.object({ type: z.literal('dealerCancel') }),
  z.object({ type: z.literal('dealerCode'), code: z.string().max(6) }),
  z.object({ type: z.literal('dealerLeave') }),
  z.object({ type: z.literal('game'), action: z.unknown() }),
]);
export type PlatformAction = z.infer<typeof PlatformAction>;

// ---------------------------------------------------------------------------
// Client -> relay
// ---------------------------------------------------------------------------

export const ClientToRelay = z.discriminatedUnion('t', [
  z.object({ t: z.literal('ping'), t0: z.number() }),
  z.object({ t: z.literal('signal'), to: z.string(), data: z.unknown() }),
  z.object({ t: z.literal('action'), payload: z.unknown() }),
  z.object({ t: z.literal('claimTv'), pairCode: z.string(), role: z.enum(['display', 'dealer']) }),
  // Engine-only messages (relay ignores them from non-engine sockets).
  z.object({ t: z.literal('e:public'), frame: z.unknown() }),
  z.object({ t: z.literal('e:private'), to: z.string(), frame: z.unknown() }),
  z.object({ t: z.literal('e:snapshot'), snapshot: z.unknown(), final: z.boolean().optional() }),
  z.object({ t: z.literal('e:mode'), sharedHost: z.boolean() }),
  z.object({ t: z.literal('e:kick'), clientId: z.string() }),
]);
export type ClientToRelay = z.infer<typeof ClientToRelay>;

// ---------------------------------------------------------------------------
// Relay -> client
// ---------------------------------------------------------------------------

export type RelayToClient =
  | {
      t: 'welcome';
      protocol: number;
      you: ClientInfo;
      code: string;
      serverTime: number;
      engineId: ClientId | null;
      engineOnline: boolean;
      clients: ClientInfo[];
      /** Last public frame, so a late display renders immediately. */
      lastPublic: PublicFrame | null;
    }
  | { t: 'pong'; t0: number; serverTime: number }
  | { t: 'presence'; clients: ClientInfo[] }
  | { t: 'engine'; engineId: ClientId | null; online: boolean }
  | { t: 'assumeEngine'; snapshot: unknown | null }
  | { t: 'yieldEngine' }
  | { t: 'signal'; from: ClientId; data: unknown }
  | { t: 'action'; from: ClientId; payload: unknown }
  | { t: 'public'; frame: PublicFrame }
  | { t: 'private'; frame: PrivateFrame }
  | { t: 'kicked' }
  | { t: 'error'; code: string; message: string };

/** Messages on the TV pairing socket (/ws/pair). */
export type PairToTv =
  { t: 'pairCode'; code: string } | { t: 'paired'; room: string; role: 'display' | 'dealer'; grant: string };

/** Messages on a WebRTC DataChannel between engine and a client. */
export type P2PMessage = { t: 'action'; payload: unknown } | { t: 'private'; frame: PrivateFrame };

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------

export interface CreateRoomResponse {
  code: string;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceServersResponse {
  iceServers: IceServer[];
}

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;

export function normalizeRoomCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

/** Tunables shared by the relay and engine. */
export const TIMING = {
  /** How far ahead public frames are scheduled so every display shows them together. */
  publicLeadMs: 250,
  /** Engine host offline this long → migrate engine to the primary display. */
  engineMigrateMs: 30_000,
  /** Player offline mid-game this long → game decides via onPlayerTimeout. */
  playerGraceMs: 20_000,
  /** Max time everyone has to load a game bundle. */
  loadTimeoutMs: 15_000,
  dealerCodeAttempts: 3,
} as const;
