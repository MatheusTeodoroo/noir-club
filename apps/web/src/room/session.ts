import { useSyncExternalStore } from 'react';
import { RoomClient, type ConnectionStatus, type Identity } from '@mp/net';
import type { ClientId, ClientInfo, DealerFrame, PlayerFrame, PrivateFrame, PublicFrame } from '@mp/protocol';
import { EngineHost } from '../engine/EngineHost.ts';
import { playSound } from '../audio.ts';

export interface SessionState {
  status: ConnectionStatus;
  you: ClientInfo | null;
  clients: ClientInfo[];
  engineId: ClientId | null;
  engineOnline: boolean;
  /** This device currently runs the engine. */
  hostingEngine: boolean;
  public: PublicFrame | null;
  player: PlayerFrame | null;
  dealer: DealerFrame | null;
  fx: { name: string; nonce: number } | null;
  error: { code: string; message: string } | null;
  kicked: boolean;
}

export interface SessionOptions {
  code: string;
  identity: Identity;
  name?: string;
  avatar?: string;
  grant?: string;
  /** Displays play the room's synchronized sound cues. */
  playsSound?: boolean;
}

/**
 * One device's live view of a room: relay connection, the engine (when this device hosts it),
 * and public frames applied on the shared clock so every display changes at the same instant.
 */
export class Session {
  readonly client: RoomClient;
  private engine: EngineHost | null = null;
  private listeners = new Set<() => void>();
  private wakeLock: { release(): Promise<void> } | null = null;
  private appliedPublicSeq = 0;
  private fxNonce = 0;
  state: SessionState = {
    status: 'connecting',
    you: null,
    clients: [],
    engineId: null,
    engineOnline: false,
    hostingEngine: false,
    public: null,
    player: null,
    dealer: null,
    fx: null,
    error: null,
    kicked: false,
  };

  constructor(private opts: SessionOptions) {
    const p2p = new URLSearchParams(location.search).get('p2p') !== '0';
    const c = new RoomClient({ ...opts, p2p });
    this.client = c;

    c.on('status', (status) => this.set({ status }));
    c.on('welcome', (w) => {
      this.set({ you: w.you, clients: w.clients, engineId: w.engineId, engineOnline: w.engineOnline, error: null });
      if (w.engineId !== w.you.id) this.dropEngine();
      this.engine?.resend();
      this.updateWakeLock();
    });
    c.on('presence', (clients) => {
      this.set({ clients });
      this.engine?.presence(clients);
    });
    c.on('engine', (engineId, engineOnline) => {
      this.set({ engineId, engineOnline });
      if (engineId !== c.you?.id) this.dropEngine();
    });
    c.on('assumeEngine', (snapshot) => {
      if (this.engine) this.engine.resend();
      else this.engine = new EngineHost(c, snapshot);
      this.set({ hostingEngine: true, engineId: c.you?.id ?? null, engineOnline: true });
      this.updateWakeLock();
    });
    c.on('yieldEngine', () => {
      this.engine?.yieldEngine();
      this.engine = null;
      this.set({ hostingEngine: false });
    });
    c.on('action', (from, payload) => this.engine?.action(from, payload));
    c.on('publicFrame', (frame) => this.schedulePublic(frame));
    c.on('privateFrame', (frame) => this.applyPrivate(frame));
    c.on('error', (code, message) => this.set({ error: { code, message } }));
    c.on('kicked', () => this.set({ kicked: true }));
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = () => this.state;

  roomNow = () => this.client.clock.now();

  send(payload: unknown) {
    this.client.sendAction(payload);
  }

  sendGame(action: unknown) {
    this.client.sendAction({ type: 'game', action });
  }

  close() {
    this.dropEngine();
    this.client.close();
    void this.wakeLock?.release().catch(() => {});
  }

  private set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }

  private dropEngine() {
    if (!this.engine) return;
    this.engine.dispose();
    this.engine = null;
    this.set({ hostingEngine: false });
  }

  private schedulePublic(frame: PublicFrame) {
    const apply = () => {
      if (frame.seq <= this.appliedPublicSeq) return;
      this.appliedPublicSeq = frame.seq;
      this.set({ public: frame });
    };
    const delay = this.client.clock.delayUntil(frame.at);
    // Already late (e.g. welcome replay): show now rather than never.
    if (delay <= 0) apply();
    else setTimeout(apply, delay);

    for (const ev of frame.events) {
      const evDelay = Math.max(0, this.client.clock.delayUntil(ev.at));
      if (ev.kind === 'sound' && this.opts.playsSound) playSound(ev.name, evDelay);
      if (ev.kind === 'fx') setTimeout(() => this.set({ fx: { name: ev.name, nonce: ++this.fxNonce } }), evDelay);
    }
  }

  private applyPrivate(frame: PrivateFrame) {
    if (frame.kind === 'player') {
      this.set({ player: frame });
    } else {
      const delay = this.client.clock.delayUntil(frame.at);
      const apply = () => this.set({ dealer: frame });
      if (delay <= 0) apply();
      else setTimeout(apply, delay);
    }
  }

  /** Screens without input (and the engine host) must never sleep. */
  private async updateWakeLock() {
    const needs = this.state.hostingEngine || (this.state.you && this.state.you.role !== 'player');
    const wl = (navigator as { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } })
      .wakeLock;
    if (!needs || !wl || this.wakeLock) return;
    try {
      this.wakeLock = await wl.request('screen');
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState === 'visible') {
            this.wakeLock = null;
            void this.updateWakeLock();
          }
        },
        { once: true },
      );
    } catch {
      /* not allowed (no gesture yet); retried on next welcome */
    }
  }
}

export function useSession(session: Session): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState);
}
