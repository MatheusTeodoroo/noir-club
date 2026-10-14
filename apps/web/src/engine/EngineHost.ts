import type { RoomClient } from '@mp/net';
import type { RuntimeOut } from '@mp/engine';
import type { ClientId, ClientInfo } from '@mp/protocol';
import type { ToWorker } from './engine.worker.ts';

/**
 * Page-side bridge for the engine Web Worker: feeds it relay input and routes its frames out —
 * public frames to the relay (plus this device), private frames P2P or through the relay.
 */
export class EngineHost {
  private worker: Worker;
  private clockTimer: ReturnType<typeof setInterval>;
  private disposed = false;

  constructor(
    private client: RoomClient,
    snapshot: unknown,
  ) {
    this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module', name: 'engine' });
    this.worker.onmessage = (ev: MessageEvent<RuntimeOut>) => this.onOut(ev.data);
    this.post({ t: 'init', snapshot: (snapshot as never) ?? null, offset: client.clock.offset });
    this.post({ t: 'presence', clients: client.clients });
    this.clockTimer = setInterval(() => this.post({ t: 'clock', offset: client.clock.offset }), 5_000);
  }

  presence(clients: ClientInfo[]) {
    this.post({ t: 'presence', clients });
  }

  action(from: ClientId, payload: unknown) {
    this.post({ t: 'action', from, payload });
  }

  resend() {
    this.post({ t: 'presence', clients: this.client.clients });
    this.post({ t: 'resend' });
  }

  /** Hand the engine to another device: worker emits a final snapshot, then we stop. */
  yieldEngine() {
    this.post({ t: 'yield' });
    clearInterval(this.clockTimer);
    setTimeout(() => this.dispose(), 2_000);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearInterval(this.clockTimer);
    this.worker.terminate();
  }

  private post(msg: ToWorker) {
    if (!this.disposed) this.worker.postMessage(msg);
  }

  private onOut(msg: RuntimeOut) {
    const c = this.client;
    switch (msg.t) {
      case 'public':
        c.enginePublic(msg.frame);
        c.acceptPublic(msg.frame);
        break;
      case 'private':
        if (msg.to === c.you?.id) c.acceptPrivate(msg.frame);
        else c.enginePrivate(msg.to, msg.frame);
        break;
      case 'snapshot':
        c.engineSnapshot(msg.snapshot, msg.final);
        break;
      case 'relay':
        c.engineRelay(msg.effect);
        break;
      case 'log':
        console.warn('[engine]', msg.message);
        break;
    }
  }
}
