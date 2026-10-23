import type {
  ClientId,
  ClientInfo,
  ClientToRelay,
  CreateRoomResponse,
  IceServer,
  IceServersResponse,
  P2PMessage,
  PairToTv,
  PrivateFrame,
  PublicFrame,
  RelayToClient,
} from '@mp/protocol';
import { RoomClock, localNow } from './clock.ts';
import { PeerMesh } from './p2p.ts';

export { RoomClock, localNow } from './clock.ts';

// ---------------------------------------------------------------------------
// Identity: one random id + secret per browser, reused across rooms so reconnects keep the seat.
// ---------------------------------------------------------------------------

export interface Identity {
  id: string;
  secret: string;
}

function randomToken(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getIdentity(storageKey = 'mp.identity'): Identity {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Identity;
      if (parsed.id && parsed.secret) return parsed;
    }
  } catch {
    /* storage unavailable */
  }
  const fresh = { id: randomToken(8), secret: randomToken(16) };
  try {
    localStorage.setItem(storageKey, JSON.stringify(fresh));
  } catch {
    /* ignore */
  }
  return fresh;
}

function wsBase() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}`;
}

export async function createRoom(identity: Identity): Promise<string> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(identity),
  });
  if (!res.ok) throw new Error(`create room failed: ${res.status}`);
  return ((await res.json()) as CreateRoomResponse).code;
}

export async function roomExists(code: string): Promise<boolean> {
  const res = await fetch(`/api/rooms/${code}`);
  return res.ok;
}

let iceCache: Promise<IceServer[]> | null = null;
function fetchIce(): Promise<IceServer[]> {
  iceCache ??= fetch('/api/ice')
    .then((r) => r.json() as Promise<IceServersResponse>)
    .then((r) => r.iceServers)
    .catch(() => []);
  return iceCache;
}

// ---------------------------------------------------------------------------
// TV pairing socket
// ---------------------------------------------------------------------------

export function openPairing(onCode: (code: string) => void, onPaired: (p: Extract<PairToTv, { t: 'paired' }>) => void) {
  let ws: WebSocket | null = null;
  let stopped = false;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let lastCode = '';
  const open = () => {
    ws = new WebSocket(`${wsBase()}/ws/pair${lastCode ? `?code=${lastCode}` : ''}`);
    ws.onmessage = (ev) => {
      if (ev.data === 'pong') return;
      const msg = JSON.parse(String(ev.data)) as PairToTv;
      if (msg.t === 'pairCode') {
        lastCode = msg.code;
        onCode(msg.code);
      }
      if (msg.t === 'paired') {
        stopped = true;
        onPaired(msg);
      }
    };
    ws.onclose = () => {
      if (keepalive) clearInterval(keepalive);
      if (!stopped) setTimeout(open, 2000);
    };
    keepalive = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('ping'), 20_000);
  };
  open();
  return () => {
    stopped = true;
    if (keepalive) clearInterval(keepalive);
    ws?.close();
  };
}

// ---------------------------------------------------------------------------
// Room connection
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RoomClientEvents {
  status(s: ConnectionStatus): void;
  welcome(msg: Extract<RelayToClient, { t: 'welcome' }>): void;
  presence(clients: ClientInfo[]): void;
  engine(engineId: ClientId | null, online: boolean): void;
  assumeEngine(snapshot: unknown | null): void;
  yieldEngine(): void;
  /** Engine only: an action from a client (via relay or P2P). */
  action(from: ClientId, payload: unknown): void;
  publicFrame(frame: PublicFrame): void;
  privateFrame(frame: PrivateFrame): void;
  error(code: string, message: string): void;
  kicked(): void;
}

export interface RoomClientOptions {
  code: string;
  identity: Identity;
  /** Player join fields. */
  name?: string;
  avatar?: string;
  /** TV join grant from pairing. */
  grant?: string;
  /** Use WebRTC DataChannels for private traffic (default true). */
  p2p?: boolean;
}

type Handlers = { [K in keyof RoomClientEvents]?: RoomClientEvents[K][] };

/**
 * One device's link to its room. Wraps the relay socket (auto-reconnect), the shared clock and
 * the P2P star, and hides which path a message took.
 */
export class RoomClient {
  readonly clock = new RoomClock();
  status: ConnectionStatus = 'connecting';
  you: ClientInfo | null = null;
  engineId: ClientId | null = null;
  engineOnline = false;
  clients: ClientInfo[] = [];

  private ws: WebSocket | null = null;
  private handlers: Handlers = {};
  private retry = 0;
  private replacedRetries = 0;
  private closed = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private mesh: PeerMesh;
  private lastPublicSeq = 0;
  private lastPrivateSeq = 0;
  private p2p: boolean;

  constructor(private opts: RoomClientOptions) {
    this.p2p = opts.p2p ?? true;
    this.mesh = new PeerMesh(
      fetchIce,
      (to, data) => this.raw({ t: 'signal', to, data }),
      (from, msg) => this.onP2P(from, msg),
    );
    this.connect();
  }

  get isEngine() {
    return !!this.you && this.engineId === this.you.id;
  }

  on<K extends keyof RoomClientEvents>(event: K, fn: RoomClientEvents[K]): () => void {
    const list = (this.handlers[event] ??= []) as RoomClientEvents[K][];
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  /** Send a platform action to the engine (P2P when possible). */
  sendAction(payload: unknown) {
    if (this.isEngine) {
      this.emit('action', this.you!.id, payload);
      return;
    }
    if (this.engineId && this.mesh.send(this.engineId, { t: 'action', payload })) return;
    this.raw({ t: 'action', payload });
  }

  claimTv(pairCode: string, role: 'display' | 'dealer') {
    this.raw({ t: 'claimTv', pairCode: pairCode.toUpperCase(), role });
  }

  // Engine-side outputs ------------------------------------------------------

  enginePublic(frame: PublicFrame) {
    this.raw({ t: 'e:public', frame });
  }

  enginePrivate(to: ClientId, frame: PrivateFrame) {
    if (this.mesh.send(to, { t: 'private', frame })) return;
    this.raw({ t: 'e:private', to, frame });
  }

  engineSnapshot(snapshot: unknown, final?: boolean) {
    this.raw({ t: 'e:snapshot', snapshot, final });
  }

  engineRelay(msg: Extract<ClientToRelay, { t: 'e:mode' | 'e:kick' }>) {
    this.raw(msg);
  }

  close() {
    this.closed = true;
    this.mesh.closeAll();
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.setStatus('closed');
  }

  // Internals ----------------------------------------------------------------

  private emit<K extends keyof RoomClientEvents>(event: K, ...args: Parameters<RoomClientEvents[K]>) {
    for (const fn of this.handlers[event] ?? []) (fn as (...a: unknown[]) => void)(...args);
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.emit('status', s);
  }

  private raw(msg: ClientToRelay) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private connect() {
    const { code, identity, name, avatar, grant } = this.opts;
    const q = new URLSearchParams({ id: identity.id, secret: identity.secret });
    if (name) q.set('name', name);
    if (avatar) q.set('avatar', avatar);
    if (grant) q.set('grant', grant);
    const ws = new WebSocket(`${wsBase()}/ws/room/${code}?${q}`);
    this.ws = ws;
    const startedAt = localNow();

    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      this.syncClock(6);
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.syncClock(1), 10_000);
    };
    ws.onmessage = (ev) => this.onRelay(JSON.parse(String(ev.data)) as RelayToClient);
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.mesh.closeAll();
      // 4001 = "replaced": this device opened a newer socket. Right after connecting it is usually a
      // race instead — a socket this page already discarded (reload, React StrictMode) reached the
      // relay after the live one and displaced it — so reconnect a few times before giving up.
      const raced = ev.code === 4001 && localNow() - startedAt < 5_000 && this.replacedRetries < 3;
      if (raced) {
        this.replacedRetries++;
        this.setStatus('reconnecting');
        setTimeout(() => !this.closed && this.connect(), 300);
        return;
      }
      if (this.closed || ev.code === 4000 || ev.code === 4003 || ev.code === 4001) {
        this.setStatus('closed');
        return;
      }
      this.setStatus('reconnecting');
      const delay = Math.min(10_000, 500 * 2 ** this.retry++) * (0.75 + Math.random() * 0.5);
      setTimeout(() => !this.closed && this.connect(), delay);
    };
  }

  private syncClock(count: number) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.raw({ t: 'ping', t0: localNow() }), i * 150);
    }
  }

  private onRelay(msg: RelayToClient) {
    switch (msg.t) {
      case 'welcome':
        this.replacedRetries = 0;
        this.you = msg.you;
        this.clients = msg.clients;
        this.engineId = msg.engineId;
        this.engineOnline = msg.engineOnline;
        this.clock.seed(msg.serverTime);
        this.lastPrivateSeq = 0;
        this.emit('welcome', msg);
        if (msg.lastPublic) this.acceptPublic(msg.lastPublic);
        this.maybeDial();
        break;
      case 'pong':
        this.clock.sample(msg.t0, msg.serverTime);
        break;
      case 'presence':
        this.clients = msg.clients;
        this.emit('presence', msg.clients);
        break;
      case 'engine': {
        const changed = msg.engineId !== this.engineId || (msg.online && !this.engineOnline);
        this.engineId = msg.engineId;
        this.engineOnline = msg.online;
        this.emit('engine', msg.engineId, msg.online);
        if (changed) {
          this.mesh.closeAll();
          this.lastPrivateSeq = 0;
          this.maybeDial();
        }
        break;
      }
      case 'assumeEngine':
        this.engineId = this.you?.id ?? null;
        this.engineOnline = true;
        this.mesh.closeAll();
        this.emit('assumeEngine', msg.snapshot);
        break;
      case 'yieldEngine':
        this.emit('yieldEngine');
        break;
      case 'signal':
        void this.mesh.handleSignal(msg.from, msg.data);
        break;
      case 'action':
        if (this.isEngine) this.emit('action', msg.from, msg.payload);
        break;
      case 'public':
        this.acceptPublic(msg.frame);
        break;
      case 'private':
        this.acceptPrivate(msg.frame);
        break;
      case 'kicked':
        this.closed = true;
        this.emit('kicked');
        break;
      case 'error':
        this.emit('error', msg.code, msg.message);
        break;
    }
  }

  private onP2P(from: ClientId, msg: P2PMessage) {
    if (msg.t === 'action' && this.isEngine) this.emit('action', from, msg.payload);
    if (msg.t === 'private' && from === this.engineId) this.acceptPrivate(msg.frame);
  }

  /** Engine publishes locally too (it never receives its own public frames from the relay). */
  acceptPublic(frame: PublicFrame) {
    if (frame.seq <= this.lastPublicSeq) return;
    this.lastPublicSeq = frame.seq;
    this.emit('publicFrame', frame);
  }

  acceptPrivate(frame: PrivateFrame) {
    if (frame.seq <= this.lastPrivateSeq) return;
    this.lastPrivateSeq = frame.seq;
    this.emit('privateFrame', frame);
  }

  private maybeDial() {
    if (!this.p2p || !this.you || this.isEngine || !this.engineId || !this.engineOnline) return;
    // Displays only consume public frames from the relay; phones and dealers get private frames.
    if (this.you.role === 'display') return;
    if (typeof RTCPeerConnection === 'undefined') return;
    void this.mesh.dial(this.engineId).catch(() => {});
  }
}
