// Builds every game as an independent, versioned bundle:
//   apps/web/public/games/<id>@<version>/logic.js  (engine worker side, no React)
//   apps/web/public/games/<id>@<version>/ui.js     (React views; React comes from the platform)
// and writes apps/web/public/games/registry.json.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const outRoot = join(root, 'apps/web/public/games');
const shimDir = join(root, 'node_modules/.mp-shims');
const require = createRequire(join(root, 'apps/web/package.json'));

// Games must use the platform's React instance (hooks break with two copies), so `react` and
// `react/jsx-runtime` resolve to shims that read what the shell put on globalThis.__MP_SHARED__.
function writeShim(file, globalKey, mod) {
  const names = Object.keys(require(mod)).filter((k) => k !== 'default' && /^[A-Za-z_$][\w$]*$/.test(k));
  const body = [
    `const m = globalThis.__MP_SHARED__[${JSON.stringify(globalKey)}];`,
    'export default m;',
    ...names.map((n) => `export const ${n} = m.${n};`),
  ].join('\n');
  writeFileSync(join(shimDir, file), body);
  return join(shimDir, file);
}
mkdirSync(shimDir, { recursive: true });
const reactShim = writeShim('react.js', 'react', 'react');
const jsxShim = writeShim('jsx-runtime.js', 'jsx', 'react/jsx-runtime');

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });
const registry = [];

for (const id of readdirSync(join(root, 'games'))) {
  const dir = join(root, 'games', id);
  if (!existsSync(join(dir, 'manifest.json'))) continue;
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const base = `/games/${manifest.id}@${manifest.version}/`;
  const outDir = join(outRoot, `${manifest.id}@${manifest.version}`);

  for (const [entry, external] of [
    ['logic', false],
    ['ui', true],
  ]) {
    await build({
      configFile: false,
      logLevel: 'warn',
      base,
      plugins: external ? [react()] : [],
      resolve: external
        ? {
            alias: [
              { find: /^react\/jsx-runtime$/, replacement: jsxShim },
              { find: /^react$/, replacement: reactShim },
            ],
          }
        : {},
      build: {
        outDir,
        emptyOutDir: false,
        target: 'es2020',
        assetsDir: 'assets',
        lib: {
          entry: join(dir, 'src', entry === 'ui' ? 'ui.tsx' : 'logic.ts'),
          formats: ['es'],
          fileName: () => `${entry}.js`,
        },
      },
    });
  }
  registry.push({ manifest, ui: `${base}ui.js`, logic: `${base}logic.js` });
  console.log(`game: ${manifest.id}@${manifest.version}`);
}

writeFileSync(join(outRoot, 'registry.json'), JSON.stringify(registry, null, 2));
