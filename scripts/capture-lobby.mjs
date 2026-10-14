// Captures the Display lobby at TV resolutions into .shots/ (needs `npm run dev:relay` and `npm run dev:web`).
// Usage: node scripts/capture-lobby.mjs [1920x1080,1280x720,...] [players=6] [nogame]
import { chromium } from '@playwright/test';
const sizes = (process.argv[2] ?? '1920x1080,1280x720,1024x768').split(',').map((s) => s.split('x').map(Number));
const players = Number(process.argv[3] ?? 6);
const b = await chromium.launch();
const ctx = (vp = { width: 400, height: 800 }) =>
  b.newContext({ viewport: vp, locale: 'pt-BR' }).then((c) => c.newPage());
const host = await ctx();
await host.goto('http://localhost:5173/');
await host.getByRole('button', { name: /Criar sala/ }).click();
await host.waitForURL(/\/r\/[A-Z]{4}/);
const code = host.url().match(/\/r\/([A-Z]{4})/)[1];
const names = [
  'Mestre',
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Eduarda',
  'Felipe',
  'Gabi',
  'Heitor',
  'Isa',
  'João',
  'Lara',
  'Marina',
  'Nicolas',
  'Olívia',
  'Pedro',
  'Rafaela',
  'Samuel',
  'Tânia',
  'Vitor',
];
await host.locator('input.mp-input').first().fill(names[0]);
await host.getByRole('button', { name: /Sentar/ }).click();
for (let i = 1; i < players; i++) {
  const p = await ctx();
  await p.goto(`http://localhost:5173/r/${code}`);
  await p
    .locator('input.mp-input')
    .first()
    .fill(names[i] ?? 'Jogador ' + i);
  await p
    .locator('.avatar-pick')
    .nth(i % 16)
    .click();
  await p.getByRole('button', { name: /Sentar/ }).click();
}
const tv = await ctx({ width: sizes[0][0], height: sizes[0][1] });
await tv.goto('http://localhost:5173/tv');
await tv.keyboard.press('Enter');
const pc = (await tv.locator('.tv-code').textContent()).trim();
await host.getByPlaceholder('····').fill(pc);
await host.getByRole('button', { name: '📺 Display', exact: true }).click();
await tv.waitForSelector('.tv-lobby');
if (process.argv[4] !== 'nogame') await host.locator('.game-card').first().click();
await tv.waitForTimeout(2500);
for (const [w, h] of sizes) {
  await tv.setViewportSize({ width: w, height: h });
  await tv.waitForTimeout(800);
  await tv.screenshot({ path: `.shots/lobby-${players}p-${w}x${h}.png` });
}
console.log('room', code);
await b.close();
