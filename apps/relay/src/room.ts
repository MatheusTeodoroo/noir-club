import { DurableObject } from 'cloudflare:workers';
import {
  ClientToRelay,
  PROTOCOL_VERSION,
  TIMING,
  type ClientId,
  type ClientInfo,
  type PublicFrame,
  type RelayToClient,
  type Role,
} from '@mp/protocol';
import type { Env } from './index.ts';

interface StoredClient {
  id: ClientId;
  secret: string;
  role: Role;
  name: string;
  avatar: string;
  isAdmin: boolean;
  joinedAt: number;
}

interface Meta {
  code: string;
  createdAt: number;
  adminId: ClientId;
  sharedHost: boolean;
  engineId: ClientId | null;
  /** When the engine device went offline (null while online). */
  engineOfflineSince: number | null;
  /** Engine handoff in progress: waiting for the old engine's final snapshot. */
  transferTo: ClientId | null;
  clients: Record<ClientId, StoredClient>;
  /** TV grants handed out by claimTv: grant → role (+ id once used). */
  grants: Record<string, { role: 'display' | 'dealer'; id?: ClientId }>;
  kicked: ClientId[];
  lastSeen: number;
}

interface Attachment {
  id: ClientId;
}

const ROOM_IDLE_TTL_MS = 6 * 60 * 60 * 1000;
const TRANSFER_TIMEOUT_MS = 3_000;

/**
 * One room = one Durable Object. Holds connections, routes messages, fans public frames out to
 * every display, keeps the latest engine snapshot and moves the engine between devices.
 * It never runs game logic.
 */
export class RoomObject extends DurableObject<Env> {
  private meta: Meta | null = null;
  private snapshot: unknown = null;
  private lastPublic: PublicFrame | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.meta = (await ctx.storage.get<Meta>('meta')) ?? null;
      this.snapshot = (await ctx.storage.get('snapshot')) ?? null;
      this.lastPublic = (await ctx.storage.get<PublicFrame>('lastPublic')) ?? null;
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('keepalive', 'keepalive'));
  }

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/init') {
      if (this.meta) return new Response('taken', { status: 409 });
      const { code, adminId, adminSecret } = (await request.json()) as {
        code: string;
        adminId: string;
        adminSecret: string;
      };
      const now = Date.now();
      this.meta = {
        code,
        createdAt: now,
        adminId,
        sharedHost: false,
        engineId: null,
        engineOfflineSince: null,
        transferTo: null,
        clients: {
          [adminId]: {
            id: adminId,
            secret: adminSecret,
            role: 'player',
            name: '',
            avatar: '',
            isAdmin: true,
            joinedAt: now,
          },
        },
        grants: {},
        kicked: [],
        lastSeen: now,
      };
      await this.save();
      await this.scheduleAlarm();
      return new Response('created', { status: 201 });
    }

    if (url.pathname === '/info') {
      if (!this.meta) return Response.json({ exists: false }, { status: 404 });
      return Response.json({
        exists: true,
        code: this.meta.code,
        players: this.clientInfos().filter((c) => c.role === 'player').length,
      });
    }

    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    return this.acceptClient(url);
  }

  private acceptClient(url: URL): Response {
    const meta = this.meta;
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const reject = (code: string, message: string) => {
      server.accept();
      this.send(server, { t: 'error', code, message });
      server.close(4000, code);
      return new Response(null, { status: 101, webSocket: client });
    };

    if (!meta) return reject('no_room', 'Sala não encontrada');

    const id = url.searchParams.get('id') ?? '';
    const secret = url.searchParams.get('secret') ?? '';
    const grant = url.searchParams.get('grant');
    if (!/^[\w-]{8,64}$/.test(id) || secret.length < 16) return reject('bad_identity', 'Identidade inválida');
    if (meta.kicked.includes(id)) return reject('kicked', 'Você foi removido desta sala');

    let stored = meta.clients[id];
    if (stored && stored.secret !== secret) return reject('bad_identity', 'Identidade inválida');

    const now = Date.now();
    if (grant) {
      const g = meta.grants[grant];
      if (!g || (g.id && g.id !== id)) return reject('bad_grant', 'Pareamento expirado');
      g.id = id;
      stored = {
        id,
        secret,
        role: g.role,
        name: g.role === 'display' ? 'Display' : 'Dealer',
        avatar: g.role === 'display' ? '📺' : '🃏',
        isAdmin: false,
        joinedAt: stored?.joinedAt ?? now,
      };
    } else {
      const name = (url.searchParams.get('name') ?? '').trim().slice(0, 20);
      const avatar = (url.searchParams.get('avatar') ?? '').slice(0, 8);
      if (!stored) {
        if (!name) return reject('bad_name', 'Escolha um apelido');
        stored = { id, secret, role: 'player', name, avatar: avatar || '🎩', isAdmin: false, joinedAt: now };
      } else if (stored.role === 'player') {
        if (name) stored.name = name;
        if (avatar) stored.avatar = avatar;
      }
    }
    meta.clients[id] = stored;

    // A refreshed tab replaces its previous socket.
    for (const ws of this.ctx.getWebSockets()) {
      if (this.attachment(ws)?.id === id) {
        ws.serializeAttachment(null);
        ws.close(4001, 'replaced');
      }
    }

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id } satisfies Attachment);
    meta.lastSeen = now;

    this.send(server, {
      t: 'welcome',
      protocol: PROTOCOL_VERSION,
      you: this.info(stored, true),
      code: meta.code,
      serverTime: now,
      engineId: meta.engineId,
      engineOnline: this.engineOnline(),
      clients: this.clientInfos(),
      lastPublic: this.lastPublic,
    });

    // The engine device (re)connected — new tab, reload or replaced socket: hand it its state.
    if (meta.engineId === id && !meta.transferTo) {
      meta.engineOfflineSince = null;
      this.send(server, { t: 'assumeEngine', snapshot: this.snapshot });
    }

    this.onMembershipChange();
    void this.save();
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------------------------------------------------------------------------
  // WebSocket events (hibernation API)
  // ---------------------------------------------------------------------------

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const meta = this.meta;
    const att = this.attachment(ws);
    if (!meta || !att || typeof raw !== 'string') return;
    let parsed;
    try {
      parsed = ClientToRelay.safeParse(JSON.parse(raw));
    } catch {
      return;
    }
    if (!parsed.success) return;
    const msg = parsed.data;
    const from = att.id;
    const isEngine = from === meta.engineId;

    switch (msg.t) {
      case 'ping':
        this.send(ws, { t: 'pong', t0: msg.t0, serverTime: Date.now() });
        break;
      case 'signal':
        this.sendTo(msg.to, { t: 'signal', from, data: msg.data });
        break;
      case 'action':
        if (meta.engineId) this.sendTo(meta.engineId, { t: 'action', from, payload: msg.payload });
        break;
      case 'claimTv':
        await this.claimTv(from, ws, msg.pairCode, msg.role);
        break;
      case 'e:public':
        if (!isEngine) return;
        this.lastPublic = msg.frame as PublicFrame;
        this.broadcast({ t: 'public', frame: this.lastPublic }, from);
        await this.ctx.storage.put('lastPublic', this.lastPublic);
        break;
      case 'e:private':
        if (isEngine) this.sendTo(msg.to, { t: 'private', frame: msg.frame as never });
        break;
      case 'e:snapshot':
        if (!isEngine) return;
        this.snapshot = msg.snapshot;
        await this.ctx.storage.put('snapshot', this.snapshot);
        if (msg.final && meta.transferTo) this.completeTransfer();
        break;
      case 'e:mode':
        if (!isEngine) return;
        meta.sharedHost = msg.sharedHost;
        this.reassignEngine();
        await this.save();
        break;
      case 'e:kick':
        if (isEngine) await this.kick(msg.clientId);
        break;
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = this.attachment(ws);
    ws.serializeAttachment(null);
    if (!att || !this.meta) return;
    this.onMembershipChange();
    await this.save();
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  async alarm() {
    const meta = this.meta;
    if (!meta) return;
    const now = Date.now();
    if (this.ctx.getWebSockets().length === 0 && now - meta.lastSeen > ROOM_IDLE_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.meta = null;
      return;
    }
    if (meta.transferTo && meta.engineOfflineSince === null) {
      // Old engine never answered the yield: fall back to the stored snapshot.
      this.completeTransfer();
    }
    if (meta.engineOfflineSince !== null && now - meta.engineOfflineSince >= TIMING.engineMigrateMs) {
      this.reassignEngine(true);
    }
    await this.save();
    await this.scheduleAlarm();
  }

  // ---------------------------------------------------------------------------
  // Engine placement
  // ---------------------------------------------------------------------------

  /** Where the engine should live given the room mode and who is online. */
  private preferredEngine(allowFallback: boolean): ClientId | null {
    const meta = this.meta!;
    const online = this.onlineIds();
    const byJoin = Object.values(meta.clients)
      .filter((c) => online.has(c.id))
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const firstDisplay = byJoin.find((c) => c.role === 'display')?.id ?? null;
    const adminOnline = online.has(meta.adminId) ? meta.adminId : null;

    if (meta.sharedHost) return firstDisplay ?? adminOnline;
    if (!allowFallback) return adminOnline;
    // Host phone gone for good: primary display takes over, else any player.
    return firstDisplay ?? byJoin.find((c) => c.role === 'player')?.id ?? null;
  }

  private onMembershipChange() {
    const meta = this.meta!;
    const online = this.onlineIds();
    if (meta.engineId && online.has(meta.engineId)) {
      meta.engineOfflineSince = null;
    } else if (meta.engineId && meta.engineOfflineSince === null) {
      meta.engineOfflineSince = Date.now();
      void this.scheduleAlarm();
    }

    if (!meta.engineId) {
      this.reassignEngine();
    } else if (meta.sharedHost && meta.engineOfflineSince === null) {
      // Shared host prefers a display; move there as soon as one shows up.
      const want = this.preferredEngine(false);
      if (want && want !== meta.engineId && this.roleOf(meta.engineId) !== 'display') this.transferEngine(want);
    }

    this.broadcast({ t: 'presence', clients: this.clientInfos() });
    this.broadcast({ t: 'engine', engineId: meta.engineId, online: this.engineOnline() });
  }

  private reassignEngine(fallback = false) {
    const meta = this.meta!;
    const want = this.preferredEngine(fallback);
    if (!want || want === meta.engineId) return;
    if (meta.engineId && this.onlineIds().has(meta.engineId)) this.transferEngine(want);
    else this.assignEngine(want);
  }

  private transferEngine(to: ClientId) {
    const meta = this.meta!;
    if (meta.transferTo === to) return;
    meta.transferTo = to;
    this.sendTo(meta.engineId!, { t: 'yieldEngine' });
    void this.ctx.storage.setAlarm(Date.now() + TRANSFER_TIMEOUT_MS);
  }

  private completeTransfer() {
    const meta = this.meta!;
    const to = meta.transferTo;
    meta.transferTo = null;
    if (to && this.onlineIds().has(to)) this.assignEngine(to);
  }

  private assignEngine(id: ClientId) {
    const meta = this.meta!;
    meta.engineId = id;
    meta.engineOfflineSince = null;
    meta.transferTo = null;
    this.sendTo(id, { t: 'assumeEngine', snapshot: this.snapshot });
    this.broadcast({ t: 'engine', engineId: id, online: true });
  }

  // ---------------------------------------------------------------------------
  // Admin operations
  // ---------------------------------------------------------------------------

  private async claimTv(from: ClientId, ws: WebSocket, pairCode: string, role: 'display' | 'dealer') {
    const meta = this.meta!;
    if (!meta.clients[from]?.isAdmin) return;
    const grant = crypto.randomUUID();
    meta.grants[grant] = { role };
    const res = await this.env.PAIRING.get(this.env.PAIRING.idFromName('global')).fetch('https://pair/claim', {
      method: 'POST',
      body: JSON.stringify({ pairCode, room: meta.code, role, grant }),
    });
    if (!res.ok) {
      delete meta.grants[grant];
      this.send(ws, { t: 'error', code: 'pair_not_found', message: 'Código da TV não encontrado' });
    }
    await this.save();
  }

  private async kick(id: ClientId) {
    const meta = this.meta!;
    if (id === meta.adminId) return;
    meta.kicked.push(id);
    delete meta.clients[id];
    for (const ws of this.ctx.getWebSockets()) {
      if (this.attachment(ws)?.id === id) {
        this.send(ws, { t: 'kicked' });
        ws.serializeAttachment(null);
        ws.close(4003, 'kicked');
      }
    }
    this.onMembershipChange();
    await this.save();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private attachment(ws: WebSocket): Attachment | null {
    try {
      return (ws.deserializeAttachment() as Attachment | null) ?? null;
    } catch {
      return null;
    }
  }

  private onlineIds(): Set<ClientId> {
    const ids = new Set<ClientId>();
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachment(ws);
      if (att && ws.readyState === WebSocket.OPEN) ids.add(att.id);
    }
    return ids;
  }

  private engineOnline() {
    const id = this.meta?.engineId;
    return !!id && this.onlineIds().has(id);
  }

  private roleOf(id: ClientId): Role | null {
    return this.meta?.clients[id]?.role ?? null;
  }

  private info(c: StoredClient, connected: boolean): ClientInfo {
    return { id: c.id, role: c.role, name: c.name, avatar: c.avatar, connected, isAdmin: c.isAdmin };
  }

  private clientInfos(): ClientInfo[] {
    const online = this.onlineIds();
    return Object.values(this.meta?.clients ?? {})
      .filter((c) => c.name !== '' || online.has(c.id))
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((c) => this.info(c, online.has(c.id)));
  }

  private send(ws: WebSocket, msg: RelayToClient) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket closing */
    }
  }

  private sendTo(id: ClientId, msg: RelayToClient) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (this.attachment(ws)?.id === id) {
        try {
          ws.send(data);
        } catch {
          /* closing */
        }
      }
    }
  }

  private broadcast(msg: RelayToClient, except?: ClientId) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachment(ws);
      if (!att || att.id === except) continue;
      try {
        ws.send(data);
      } catch {
        /* closing */
      }
    }
  }

  private async save() {
    if (this.meta) await this.ctx.storage.put('meta', this.meta);
  }

  private async scheduleAlarm() {
    const meta = this.meta;
    if (!meta) return;
    const next =
      meta.engineOfflineSince !== null
        ? meta.engineOfflineSince + TIMING.engineMigrateMs
        : Date.now() + ROOM_IDLE_TTL_MS;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > next || current < Date.now()) await this.ctx.storage.setAlarm(next);
  }
}
