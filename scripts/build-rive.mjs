// Compiles every Rive project (rive/<name>/) to apps/web/public/rive/<name>.riv.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = join(root, 'apps/web/public/rive');
mkdirSync(out, { recursive: true });

for (const name of readdirSync(join(root, 'rive'))) {
  const dir = join(root, 'rive', name);
  if (!existsSync(join(dir, 'rive.yaml'))) continue;
  execFileSync('rive', [dir, '--once'], { stdio: 'inherit' });
  copyFileSync(join(dir, 'build', `${name}.riv`), join(out, `${name}.riv`));
  console.log(`rive: ${name}.riv`);
}
