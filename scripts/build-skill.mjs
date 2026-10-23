// Assembles the `noir-club-game` Claude Code skill into dist/skills/noir-club-game:
// the hand-written parts in tools/skills/noir-club-game plus a snapshot of the platform code a
// game needs (protocol, SDK, engine, design system, platform CSS) and the demo game as example.
// `--install` also copies it to ~/.claude/skills so any Claude Code session can use it.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'tools/skills/noir-club-game');
const out = join(root, 'dist/skills/noir-club-game');
const sdk = join(out, 'kit/.noir/sdk');

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });

for (const pkg of ['protocol', 'game-sdk', 'engine', 'ui']) {
  cpSync(join(root, 'packages', pkg, 'src'), join(sdk, pkg), { recursive: true });
}
cpSync(join(root, 'apps/web/src/app.css'), join(sdk, 'platform.css'));

// Worked examples: the Dealer demo, and Agent Decker as the model for rules and tutorial.
const examples = [
  ['demo-secret', join(root, 'examples/demo-secret')],
  ['agent-decker', join(root, 'games/agent-decker')],
];
for (const [name, dir] of examples) {
  const example = join(out, 'examples', name);
  mkdirSync(example, { recursive: true });
  for (const part of ['manifest.json', 'DESIGN.md', 'CREDITS.md', 'src', 'test']) {
    const from = join(dir, part);
    if (existsSync(from)) cpSync(from, join(example, part), { recursive: true });
  }
}

console.log(`skill built: ${out}`);

if (process.argv.includes('--install')) {
  const dest = join(homedir(), '.claude', 'skills', 'noir-club-game');
  rmSync(dest, { recursive: true, force: true });
  cpSync(out, dest, { recursive: true });
  console.log(`skill installed: ${dest}`);
}
