#!/usr/bin/env node
// Creates a new Noir Club game folder: the standalone kit (SDK, engine, design system,
// playground, bundler) plus a working starter game to reshape.
//
//   node <skill>/scripts/new-game.mjs <game-id> [--dir <parent>] [--pt "Nome"] [--en "Name"]
//
// <game-id>: lowercase kebab-case, e.g. "mentira-dourada". The folder is <parent>/<game-id>.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
const positionals = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) options[args[i].slice(2)] = args[++i];
  else positionals.push(args[i]);
}
const id = positionals[0];
const opt = (name) => options[name];

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error('usage: new-game.mjs <game-id (kebab-case)> [--dir <parent>] [--pt "Nome"] [--en "Name"]');
  process.exit(1);
}
const target = resolve(opt('dir') ?? process.cwd(), id);
if (existsSync(target) && readdirSync(target).length > 0) {
  console.error(`${target} already exists and is not empty.`);
  process.exit(1);
}
if (!existsSync(join(skill, 'kit', '.noir', 'sdk', 'game-sdk', 'index.ts'))) {
  console.error(
    'The skill kit is incomplete (kit/.noir/sdk missing). Reinstall the skill from the Noir Club repo: npm run skill:install',
  );
  process.exit(1);
}

const title = id
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(' ');
const prefix =
  id
    .split('-')
    .map((w) => w[0])
    .join('')
    .slice(0, 3) + 'g';
const replacements = {
  __ID__: id,
  __NAME_PT__: opt('pt') ?? title,
  __NAME_EN__: opt('en') ?? opt('pt') ?? title,
  __P__: prefix,
};

cpSync(join(skill, 'kit'), target, { recursive: true });
cpSync(join(skill, 'templates'), target, { recursive: true });

function fill(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules') continue;
    if (statSync(p).isDirectory()) fill(p);
    else if (/\.(json|ts|tsx|mjs|md|html|css)$/.test(name)) {
      let s = readFileSync(p, 'utf8');
      const before = s;
      for (const [k, v] of Object.entries(replacements)) s = s.split(k).join(v);
      if (s !== before) writeFileSync(p, s);
    }
  }
}
fill(target);

// Lets Claude Code's preview tooling start the playground by name ("play").
mkdirSync(join(target, '.claude'), { recursive: true });
writeFileSync(
  join(target, '.claude', 'launch.json'),
  JSON.stringify(
    {
      version: '0.0.1',
      configurations: [{ name: 'play', runtimeExecutable: 'npm', runtimeArgs: ['run', 'play'], port: 5180 }],
    },
    null,
    2,
  ) + '\n',
);

console.log(`Created ${target}
  CSS prefix: ${prefix}-
Next:
  cd "${target}"
  npm install
  npm test        # starter game tests must pass before you change anything
  npm run play    # playground: TV + Dealer + phones in the browser`);
