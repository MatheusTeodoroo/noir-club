// `npm run build`: bundles this game the way the platform ships games —
//   dist/<id>@<version>/logic.js  engine side (runs in a Web Worker, no React, no DOM)
//   dist/<id>@<version>/ui.js     React views; `react` comes from the platform at runtime
// and checks that ui.js has no bare imports left.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aliases } from './aliases.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const outDir = join(root, 'dist', `${manifest.id}@${manifest.version}`);
const base = `/games/${manifest.id}@${manifest.version}/`;
const require = createRequire(join(root, 'package.json'));

// `react` and `react/jsx-runtime` resolve to shims reading the platform's shared instance.
const shimDir = join(root, 'node_modules', '.noir-shims');
mkdirSync(shimDir, { recursive: true });
function shim(file, key, mod) {
  const names = Object.keys(require(mod)).filter((k) => k !== 'default' && /^[A-Za-z_$][\w$]*$/.test(k));
  writeFileSync(
    join(shimDir, file),
    [
      `const m = globalThis.__MP_SHARED__[${JSON.stringify(key)}];`,
      'export default m;',
      ...names.map((n) => `export const ${n} = m.${n};`),
    ].join('\n'),
  );
  return join(shimDir, file);
}
const reactShim = shim('react.js', 'react', 'react');
const jsxShim = shim('jsx-runtime.js', 'jsx', 'react/jsx-runtime');

rmSync(outDir, { recursive: true, force: true });
for (const [entry, file, isUi] of [
  ['logic', 'src/logic.ts', false],
  ['ui', 'src/ui.tsx', true],
]) {
  await build({
    configFile: false,
    logLevel: 'warn',
    base,
    plugins: isUi ? [react()] : [],
    resolve: {
      alias: isUi
        ? [
            { find: /^react\/jsx-runtime$/, replacement: jsxShim },
            { find: /^react$/, replacement: reactShim },
            ...aliases,
          ]
        : aliases,
    },
    build: {
      outDir,
      emptyOutDir: false,
      target: 'es2020',
      assetsDir: 'assets',
      lib: { entry: join(root, file), formats: ['es'], fileName: () => `${entry}.js` },
    },
  });
}

for (const entry of ['logic.js', 'ui.js']) {
  const code = readFileSync(join(outDir, entry), 'utf8');
  const bare = [...code.matchAll(/(?:^|[;\n])\s*import\s[^'"]*['"]([^'"./][^'"]*)['"]/g)].map((m) => m[1]);
  if (bare.length) {
    console.error(`${entry} still imports ${bare.join(', ')} — games may only import react and @mp/game-sdk.`);
    process.exit(1);
  }
}
const uiSource = readFileSync(join(root, 'src/ui.tsx'), 'utf8');
if (/@mp\/ui|@mp\/engine|@mp\/protocol/.test(uiSource)) {
  console.error('src/ui.tsx imports platform internals; use the `kit` prop instead.');
  process.exit(1);
}
// Any non-`import type` from the logic would ship the rules (and their secrets, e.g. word banks)
// to every phone and TV. Shared constants belong in a secret-free src/shared.ts.
const valueImport = uiSource.split('\n').find((l) => /^\s*import\s+(?!type\s)[^;]*['"]\.\/logic(\.ts)?['"]/.test(l));
if (valueImport || /\bpublicView\b|\bonAction\b/.test(readFileSync(join(outDir, 'ui.js'), 'utf8'))) {
  console.error(
    `src/ui.tsx pulls the game logic into ui.js${valueImport ? `: ${valueImport.trim()}` : ''}\n` +
      "Use `import type { … } from './logic.ts'` for types and move shared constants to src/shared.ts.",
  );
  process.exit(1);
}
console.log(`built ${outDir}`);
