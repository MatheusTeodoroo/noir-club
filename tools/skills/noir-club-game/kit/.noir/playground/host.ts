import { Engine, initialState } from '@mp/engine';
import { PLAYER_NAMES } from '@mp/engine/testing';
import { configDefaults, type GameLogic } from '@mp/game-sdk';
import type { ClientInfo, Lang, ScheduledEvent } from '@mp/protocol';

/**
 * Runs the real platform engine in the control-room page and mirrors it to every device iframe
 * over a BroadcastChannel — the same frames the relay would deliver, minus the network.
 */

export const CHANNEL = 'noir-playground';

export type HostMessage = {
  t: 'state';
  /** Which control room sent it: the newest one in the browser wins, older ones retire. */
  host: { id: string; born: number };
  /** Room clock = Date.now() + offset, or exactly `frozen` while the clock is paused. */
  offset: number;
  frozen: number | null;
  public: { platform: any; game: unknown };
  privates: Record<string, any>;
  events: ScheduledEvent[];
};
export type DeviceMessage = { t: 'hello' } | { t: 'action'; from: string; payload: unknown };

export interface LogEntry {
  at: number;
  text: string;
}

const AVATARS = ['🎩', '🃏', '🎲', '🍷', '💎', '👑', '🌙', '🦊', '🦉', '🐺', '🎭', '🗝️', '⚜️', '🕯️', '🌹', '♠️'];

export interface HostSettings {
  players: number;
  config: Record<string, unknown>;
  lang: Lang;
}

export class PlaygroundHost {
  engine!: Engine;
  readonly id = Math.random().toString(36).slice(2);
  readonly born = Date.now();
  /** Another control room (a second tab, or a hot reload of this page) took over. */
  retired = false;
  clients: ClientInfo[] = [];
  remote = new Set<string>();
  offset = 0;
  frozenAt: number | null = null;
  log: LogEntry[] = [];
  private channel = new BroadcastChannel(CHANNEL);
  private ticker: ReturnType<typeof setInterval>;
  private lastJson = '';
  private listeners = new Set<() => void>();
  private pendingEvents: ScheduledEvent[] = [];

  constructor(
    private logic: GameLogic,
    public settings: HostSettings,
  ) {
    this.channel.onmessage = (ev: MessageEvent<DeviceMessage | HostMessage>) => {
      if (ev.data.t === 'state') {
        if (this.isOlderThan(ev.data.host)) this.retire();
        return;
      }
      if (this.retired) return;
      if (ev.data.t === 'hello') this.publish(true);
      else if (ev.data.t === 'action') this.deviceAction(ev.data.from, ev.data.payload);
    };
    this.ticker = setInterval(() => this.step(this.engine.tick(this.now())), 100);
    this.restart(settings);
  }

  now = () => (this.frozenAt ?? Date.now()) + this.offset;

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  restart(settings: HostSettings) {
    this.settings = settings;
    this.offset = 0;
    this.frozenAt = null;
    this.log = [];
    this.remote.clear();
    const m = this.logic.manifest;
    const game = { id: m.id, version: m.version };
    this.engine = new Engine(initialState((Math.random() * 2 ** 32) >>> 0));
    this.clients = [
      ...Array.from({ length: settings.players }, (_, i) => ({
        id: `p${i + 1}`,
        role: 'player' as const,
        name: PLAYER_NAMES[i % PLAYER_NAMES.length]!,
        avatar: AVATARS[i % AVATARS.length]!,
        connected: true,
        isAdmin: i === 0,
      })),
      { id: 'tv', role: 'display', name: 'Display', avatar: '📺', connected: true, isAdmin: false },
      { id: 'dealer', role: 'dealer', name: 'Dealer', avatar: '🃏', connected: true, isAdmin: false },
    ];
    const now = this.now();
    this.engine.presence(this.clients, now);
    this.engine.action('p1', { type: 'setSettings', lang: settings.lang }, now);
    this.engine.action('p1', { type: 'selectGame', game }, now);
    this.engine.setLogic(this.logic, now);
    this.engine.action('p1', { type: 'setConfig', config: { ...configDefaults(m), ...settings.config } }, now);
    this.engine.action('p1', { type: 'start' }, now);
    for (const c of this.clients) this.engine.action(c.id, { type: 'ready', game }, now);
    this.note(
      this.engine.state.phase === 'playing'
        ? `partida iniciada com ${settings.players} jogadores`
        : `a partida não começou (fase ${this.engine.state.phase}) — confira minPlayers/maxPlayers`,
    );
    this.publish(true);
  }

  /** Jump the room clock forward, firing timers on the way. */
  advance(ms: number) {
    const target = this.now() + ms;
    for (let guard = 0; guard < 1000; guard++) {
      const next = this.engine.nextTimerAt();
      if (next === null || next > target) break;
      this.offset += Math.max(0, next - this.now());
      this.step(this.engine.tick(this.now()));
    }
    this.offset += Math.max(0, target - this.now());
    this.step(this.engine.tick(this.now()));
    this.note(`relógio +${Math.round(ms / 1000)}s`);
  }

  /** Jump straight to the next timer the engine is waiting for. */
  skipToNextTimer() {
    const next = this.engine.nextTimerAt();
    if (next === null) return this.note('nenhum timer pendente');
    this.advance(Math.max(0, next - this.now()) + 1);
  }

  setFrozen(frozen: boolean) {
    if (frozen && this.frozenAt === null) this.frozenAt = Date.now();
    if (!frozen && this.frozenAt !== null) {
      this.offset -= Date.now() - this.frozenAt;
      this.frozenAt = null;
    }
    this.publish(true);
  }

  setConnected(id: string, connected: boolean) {
    this.clients = this.clients.map((c) => (c.id === id ? { ...c, connected } : c));
    this.note(`${this.nameOf(id)} ${connected ? 'reconectou' : 'desconectou'}`);
    this.step(this.engine.presence(this.clients, this.now()));
  }

  setRemote(id: string, remote: boolean) {
    if (remote) this.remote.add(id);
    else this.remote.delete(id);
    this.deviceAction(id, { type: 'setRemote', remote });
  }

  backToLobbyAndRestart() {
    this.restart(this.settings);
  }

  nameOf(id: string) {
    return this.clients.find((c) => c.id === id)?.name ?? id;
  }

  private deviceAction(from: string, payload: unknown) {
    const p = payload as { type?: string; action?: unknown };
    this.note(
      `${this.nameOf(from)} → ${p.type === 'game' ? `jogo ${JSON.stringify(p.action)}` : JSON.stringify(payload)}`,
    );
    this.step(this.engine.action(from, payload, this.now()));
  }

  private step(fx: { events: ScheduledEvent[] }) {
    // The Host started a new match from the lobby: every playground device has the game loaded
    // already, so acknowledge for all of them like the real devices would.
    if (this.engine.state.phase === 'loading') {
      const m = this.logic.manifest;
      const game = { id: m.id, version: m.version };
      for (const c of this.clients) if (c.connected) this.engine.action(c.id, { type: 'ready', game }, this.now());
      if ((this.engine.state.phase as string) === 'playing') this.note('nova partida iniciada pelo Host');
    }
    for (const e of fx.events) this.note(`${e.kind === 'sound' ? '🔊' : '✨'} ${e.name}`);
    this.pendingEvents.push(...fx.events);
    this.publish(false);
  }

  private note(text: string) {
    this.log = [{ at: this.now(), text }, ...this.log].slice(0, 200);
    for (const fn of this.listeners) fn();
  }

  private isOlderThan(other: { id: string; born: number } | undefined) {
    if (!other || other.id === this.id) return false;
    return other.born > this.born || (other.born === this.born && other.id > this.id);
  }

  /** Stops this engine so a newer control room is the only one driving the devices. */
  private retire() {
    if (this.retired) return;
    this.retired = true;
    this.dispose();
    this.note('outra sala de controle assumiu — use a aba mais recente');
  }

  private publish(force: boolean) {
    if (this.retired) return;
    const frames = this.engine.frames(this.now());
    const msg: HostMessage = {
      t: 'state',
      host: { id: this.id, born: this.born },
      offset: this.offset,
      frozen: this.frozenAt !== null ? this.now() : null,
      public: frames.public,
      privates: Object.fromEntries(frames.privates),
      events: this.pendingEvents,
    };
    const json = JSON.stringify({ ...msg, offset: 0, frozen: null });
    if (!force && json === this.lastJson) return;
    this.lastJson = json;
    this.pendingEvents = [];
    this.channel.postMessage(msg);
    for (const fn of this.listeners) fn();
  }

  dispose() {
    clearInterval(this.ticker);
    this.channel.close();
  }
}
