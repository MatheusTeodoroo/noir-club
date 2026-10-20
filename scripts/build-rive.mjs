// Compiles every Rive project (rive/<name>/) to apps/web/public/rive/<name>.riv.
// The compiled .riv files are committed, so machines without the Rive CLI (CI) reuse them.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = join(root, 'apps/web/public/rive');
mkdirSync(out, { recursive: true });

function hasRiveCli() {
  try {
    execFileSync('rive', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const cli = hasRiveCli();
for (const name of readdirSync(join(root, 'rive'))) {
  const dir = join(root, 'rive', name);
  if (!existsSync(join(dir, 'rive.yaml'))) continue;
  const target = join(out, `${name}.riv`);
  if (!cli) {
    if (!existsSync(target)) throw new Error(`Rive CLI not found and ${target} is not committed`);
    console.log(`rive: CLI not found, using committed ${name}.riv`);
    continue;
  }
  execFileSync('rive', [dir, '--once'], { stdio: 'inherit' });
  copyFileSync(join(dir, 'build', `${name}.riv`), target);
  console.log(`rive: ${name}.riv`);
}
