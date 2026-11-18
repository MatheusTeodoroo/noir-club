// Exports the video-kit characters as site avatars: a square bust crop of every state
// (base, gold, crimson, red, blue, green, out, shadow) -> apps/web/public/avatars/<id>-<state>.webp
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'media/video-kit/png/players');
const out = join(root, 'apps/web/public/avatars');
mkdirSync(out, { recursive: true });

const SIZE = 192;
let n = 0;
for (const id of readdirSync(src)) {
  const dir = join(src, id);
  for (const file of readdirSync(dir)) {
    const m = file.match(/^(.+)-(base|gold|crimson|red|blue|green|out|shadow)\.png$/);
    if (!m) continue;
    const input = join(dir, file);
    if (!existsSync(input)) continue;
    // Sprites are 720x880 with the head on top: keep the top square (head, hat and shoulders).
    await sharp(input)
      .extract({ left: 0, top: 0, width: 720, height: 720 })
      .resize(SIZE, SIZE)
      .webp({ quality: 88, alphaQuality: 90 })
      .toFile(join(out, `${m[1]}-${m[2]}.webp`));
    n++;
  }
}
console.log(`${n} avatars -> ${out}`);
