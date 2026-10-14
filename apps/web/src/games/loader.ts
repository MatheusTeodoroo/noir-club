import type { GameRef } from '@mp/protocol';
import type { GameManifest, GameUI } from '@mp/game-sdk';

/**
 * Games are separate packages. In dev they are lazy chunks straight from `games/<id>/src`;
 * in production each one is a versioned bundle at `/games/<id>@<version>/` listed in
 * `/games/registry.json` (built by scripts/build-games.mjs). Only manifests load up front.
 */

export interface RegistryEntry {
  manifest: GameManifest;
  ui: string;
  logic: string;
}

const devManifests = import.meta.glob<GameManifest>('@games/*/manifest.json', { eager: true, import: 'default' });
const devUi = import.meta.glob<{ default: GameUI }>('@games/*/src/ui.tsx');

let registry: Promise<RegistryEntry[]> | null = null;

export function listGames(): Promise<RegistryEntry[]> {
  registry ??= import.meta.env.DEV
    ? Promise.resolve(
        Object.values(devManifests).map((manifest) => ({
          manifest,
          ui: `dev:${manifest.id}`,
          logic: `dev:${manifest.id}`,
        })),
      )
    : fetch('/games/registry.json').then((r) => r.json() as Promise<RegistryEntry[]>);
  return registry;
}

const uiCache = new Map<string, Promise<GameUI>>();

export function loadGameUI(ref: GameRef): Promise<GameUI> {
  const key = `${ref.id}@${ref.version}`;
  let p = uiCache.get(key);
  if (!p) {
    p = (async () => {
      if (import.meta.env.DEV) {
        const entry = Object.entries(devUi).find(([path]) => path.includes(`/${ref.id}/src/`));
        if (!entry) throw new Error(`unknown game ${ref.id}`);
        return (await entry[1]()).default;
      }
      const games = await listGames();
      const game = games.find((g) => g.manifest.id === ref.id && g.manifest.version === ref.version);
      if (!game) throw new Error(`unknown game ${key}`);
      return ((await import(/* @vite-ignore */ game.ui)) as { default: GameUI }).default;
    })();
    uiCache.set(key, p);
    p.catch(() => uiCache.delete(key));
  }
  return p;
}
