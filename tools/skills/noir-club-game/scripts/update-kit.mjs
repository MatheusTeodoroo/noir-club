#!/usr/bin/env node
// Refreshes the platform kit in existing game folders: replaces `.noir/` (SDK, engine, design
// system, playground, bundler) with this skill's copy. Game code (manifest.json, src/, test/,
// assets/, DESIGN.md) and package.json are left untouched.
//
//   node <skill>/scripts/update-kit.mjs <game-folder> [<game-folder> ...]
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folders = process.argv.slice(2);
if (folders.length === 0) {
  console.error('usage: update-kit.mjs <game-folder> [<game-folder> ...]');
  process.exit(1);
}

for (const folder of folders.map((f) => resolve(f))) {
  if (!existsSync(join(folder, 'manifest.json')) || !existsSync(join(folder, '.noir'))) {
    console.error(`skip ${folder}: not a Noir Club game folder (needs manifest.json and .noir/)`);
    continue;
  }
  rmSync(join(folder, '.noir'), { recursive: true, force: true });
  cpSync(join(skill, 'kit', '.noir'), join(folder, '.noir'), { recursive: true });
  const launch = join(folder, '.claude', 'launch.json');
  if (!existsSync(launch)) {
    mkdirSync(dirname(launch), { recursive: true });
    writeFileSync(
      launch,
      JSON.stringify(
        {
          version: '0.0.1',
          configurations: [{ name: 'play', runtimeExecutable: 'npm', runtimeArgs: ['run', 'play'], port: 5180 }],
        },
        null,
        2,
      ) + '\n',
    );
  }
  console.log(`updated ${folder}`);
}
