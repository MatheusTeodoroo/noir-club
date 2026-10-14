// Claude Code PostToolUse hook: after an edit, verify what was touched.
//   *.rml       → `rive <project> --verify`
//   *.ts/*.tsx  → typecheck of the app that includes it
// Exit code 2 sends the errors back to Claude so it fixes them right away.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const input = JSON.parse(await new Promise((r) => {
  let s = '';
  process.stdin.on('data', (c) => (s += c));
  process.stdin.on('end', () => r(s || '{}'));
}));
const file = input?.tool_input?.file_path;
if (!file) process.exit(0);
const root = process.cwd();
const TSC = join(root, 'node_modules/typescript/bin/tsc');

function run(cmd, args, cwd = root) {
  try {
    execFileSync(cmd, args, { cwd, stdio: 'pipe', encoding: 'utf8' });
  } catch (err) {
    process.stderr.write(`${cmd} ${args.join(' ')} failed:\n${err.stdout ?? ''}${err.stderr ?? ''}`.slice(0, 4000));
    process.exit(2);
  }
}

if (file.endsWith('.rml')) {
  let dir = dirname(file);
  while (!existsSync(join(dir, 'rive.yaml')) && dirname(dir) !== dir) dir = dirname(dir);
  if (existsSync(join(dir, 'rive.yaml'))) run('rive', ['.', '--verify'], dir);
} else if (/\.(ts|tsx)$/.test(file)) {
  const rel = relative(root, file).split('\\').join('/');
  if (rel.startsWith('apps/relay/') || rel.startsWith('packages/protocol/')) run(process.execPath, [TSC, '--noEmit', '-p', 'apps/relay']);
  if (!rel.startsWith('apps/relay/') && !rel.startsWith('e2e/')) run(process.execPath, [TSC, '--noEmit', '-p', 'apps/web']);
}
