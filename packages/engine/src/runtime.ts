import {
  TIMING,
  type ClientId,
  type ClientInfo,
  type GameRef,
  type PrivateFrame,
  type PublicFrame,
} from '@mp/protocol';
import type { GameLogic } from '@mp/game-sdk';
import { Engine, initialState, type EngineState, type RelayEffect, type StepEffects } from './engine.ts';

const SNAPSHOT_DEBOUNCE_MS = 250;

export type RuntimeOut =
  | { t: 'public'; frame: PublicFrame }
  | { t: 'private'; to: ClientId; frame: PrivateFrame }
  | { t: 'snapshot'; snapshot: EngineState; final?: boolean }
  | { t: 'relay'; effect: RelayEffect }
  | { t: 'log'; message: string };

export interface RuntimeOptions {
  snapshot: EngineState | null;
  loadLogic(ref: GameRef): Promise<GameLogic>;
  /** Room clock (relay time). */
  now(): number;
  out(msg: RuntimeOut): void;
}

/**
 * Drives an Engine: arms timers, loads game logic, turns state into frames, and sends only
 * the frames that changed. Lives in a Web Worker so game logic never touches the page.
 */
export class EngineRuntime {
  private engine: Engine;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private lastPublic = '';
  private lastPrivate = new Map<ClientId, string>();
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSnapshot = '';
  private loadingRef: string | null = null;
  private disposed = false;

  constructor(private opts: RuntimeOptions) {
    const seed = (Math.random() * 2 ** 32) >>> 0;
    this.engine = new Engine(opts.snapshot ?? initialState(seed));
    this.after({ events: [], relay: [], snapshot: true });
  }

  get state() {
    return this.engine.state;
  }

  presence(clients: ClientInfo[]) {
    this.after(this.engine.presence(clients, this.opts.now()));
  }

  action(from: ClientId, payload: unknown) {
    this.after(this.engine.action(from, payload, this.opts.now()));
  }

  /** Stop and hand back a final snapshot (engine moving to another device). */
  yieldEngine() {
    this.opts.out({ t: 'snapshot', snapshot: structuredClone(this.engine.state), final: true });
    this.dispose();
  }

  /** Force every frame to be resent (e.g. after reconnecting to the relay). */
  resendAll() {
    this.lastPublic = '';
    this.lastPrivate.clear();
    this.publish([]);
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
  }

  private after(fx: StepEffects) {
    if (this.disposed) return;
    for (const effect of fx.relay) this.opts.out({ t: 'relay', effect });
    this.ensureLogic();
    // A match in progress can't be rendered until its logic is loaded (e.g. right after a migration).
    if (!this.engine.awaitingLogic()) this.publish(fx.events);
    if (fx.snapshot) this.snapshotNow();
    else this.scheduleSnapshot();
    this.arm();
  }

  /** Any state change is snapshotted within SNAPSHOT_DEBOUNCE_MS so a migrated engine resumes where this one stopped. */
  private scheduleSnapshot() {
    if (this.snapshotTimer) return;
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      if (!this.disposed) this.snapshotNow();
    }, SNAPSHOT_DEBOUNCE_MS);
  }

  private snapshotNow() {
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    this.snapshotTimer = null;
    const json = JSON.stringify(this.engine.state);
    if (json === this.lastSnapshot) return;
    this.lastSnapshot = json;
    this.opts.out({ t: 'snapshot', snapshot: JSON.parse(json) as EngineState });
  }

  private ensureLogic() {
    const need = this.engine.neededLogic();
    if (!need) return;
    const key = `${need.id}@${need.version}`;
    if (this.loadingRef === key) return;
    this.loadingRef = key;
    this.opts
      .loadLogic(need)
      .then((logic) => {
        if (this.disposed || this.loadingRef !== key) return;
        this.loadingRef = null;
        this.after(this.engine.setLogic(logic, this.opts.now()));
      })
      .catch((err) => {
        this.loadingRef = null;
        this.opts.out({ t: 'log', message: `failed to load ${key}: ${String(err)}` });
      });
  }

  private arm() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const at = this.engine.nextTimerAt();
    if (at === null) return;
    const delay = Math.max(0, Math.min(at - this.opts.now(), 2 ** 31 - 1));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.after(this.engine.tick(this.opts.now()));
    }, delay);
  }

  private nextSeq(now: number) {
    this.seq = Math.max(this.seq + 1, Math.floor(now));
    return this.seq;
  }

  private publish(events: StepEffects['events']) {
    const now = this.opts.now();
    const frames = this.engine.frames(now);

    const pubJson = JSON.stringify(frames.public);
    if (pubJson !== this.lastPublic || events.length > 0) {
      this.lastPublic = pubJson;
      this.opts.out({
        t: 'public',
        frame: {
          seq: this.nextSeq(now),
          at: now + TIMING.publicLeadMs,
          platform: frames.public.platform,
          game: frames.public.game,
          events,
        },
      });
    }

    for (const [id, frame] of frames.privates) {
      const json = JSON.stringify(frame);
      if (this.lastPrivate.get(id) === json) continue;
      this.lastPrivate.set(id, json);
      const seq = this.nextSeq(now);
      const full: PrivateFrame =
        frame.kind === 'dealer' ? { ...frame, seq, at: now + TIMING.publicLeadMs } : { ...frame, seq };
      this.opts.out({ t: 'private', to: id, frame: full });
    }
    for (const id of [...this.lastPrivate.keys()]) if (!frames.privates.has(id)) this.lastPrivate.delete(id);
  }
}
