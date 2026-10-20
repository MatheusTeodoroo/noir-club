/// <reference lib="webworker" />
import { EngineRuntime, type EngineState, type RuntimeOut } from '@mp/engine';
import type { GameLogic } from '@mp/game-sdk';
import type { ClientId, ClientInfo, GameRef } from '@mp/protocol';

/** Messages from the page to the engine worker. */
export type ToWorker =
  | { t: 'init'; snapshot: EngineState | null; offset: number }
  | { t: 'clock'; offset: number }
  | { t: 'presence'; clients: ClientInfo[] }
  | { t: 'action'; from: ClientId; payload: unknown }
  | { t: 'resend' }
  | { t: 'yield' };

const devLogic = {
  ...import.meta.glob<{ default: GameLogic }>('@games/*/src/logic.ts'),
  // Reference games for tests only (see games/loader.ts).
  ...(import.meta.env.DEV && import.meta.env.VITE_INCLUDE_EXAMPLES === '1'
    ? import.meta.glob<{ default: GameLogic }>('@examples/*/src/logic.ts')
    : {}),
};

async function loadLogic(ref: GameRef): Promise<GameLogic> {
  if (import.meta.env.DEV) {
    const entry = Object.entries(devLogic).find(([path]) => path.includes(`/${ref.id}/src/`));
    if (!entry) throw new Error(`unknown game ${ref.id}`);
    return (await entry[1]()).default;
  }
  const registry = (await fetch('/games/registry.json').then((r) => r.json())) as {
    manifest: { id: string; version: string };
    logic: string;
  }[];
  const game = registry.find((g) => g.manifest.id === ref.id && g.manifest.version === ref.version);
  if (!game) throw new Error(`unknown game ${ref.id}@${ref.version}`);
  return ((await import(/* @vite-ignore */ new URL(game.logic, self.location.origin).href)) as { default: GameLogic })
    .default;
}

let offset = 0;
let runtime: EngineRuntime | null = null;
const now = () => performance.timeOrigin + performance.now() + offset;
const out = (msg: RuntimeOut) => postMessage(msg);

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const msg = ev.data;
  switch (msg.t) {
    case 'init':
      offset = msg.offset;
      runtime?.dispose();
      runtime = new EngineRuntime({ snapshot: msg.snapshot, loadLogic, now, out });
      break;
    case 'clock':
      offset = msg.offset;
      break;
    case 'presence':
      runtime?.presence(msg.clients);
      break;
    case 'action':
      runtime?.action(msg.from, msg.payload);
      break;
    case 'resend':
      runtime?.resendAll();
      break;
    case 'yield':
      runtime?.yieldEngine();
      runtime = null;
      break;
  }
};
