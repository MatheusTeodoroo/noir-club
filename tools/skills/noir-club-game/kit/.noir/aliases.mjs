// Same module names as the Noir Club monorepo, so game code moves into games/<id> unchanged.
import { fileURLToPath } from 'node:url';

const at = (p) => fileURLToPath(new URL(p, import.meta.url));

export const aliases = [
  { find: /^@mp\/engine\/testing$/, replacement: at('./sdk/engine/testing.ts') },
  { find: /^@mp\/engine$/, replacement: at('./sdk/engine/index.ts') },
  { find: /^@mp\/protocol$/, replacement: at('./sdk/protocol/index.ts') },
  { find: /^@mp\/game-sdk$/, replacement: at('./sdk/game-sdk/index.ts') },
  { find: /^@mp\/ui$/, replacement: at('./sdk/ui/index.ts') },
  { find: /^@game\//, replacement: at('../') },
];
