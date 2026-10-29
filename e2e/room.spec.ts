import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Full room on one machine: host phone, a second phone, two Displays and a Dealer, each in its own
 * browser context (= its own device). Covers pairing, on-demand game loading, the dealer code,
 * secrecy of the public board, display sync, and engine migration when the host phone dies.
 */

async function device(browser: Browser, path: string) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  await page.goto(path);
  return { ctx, page };
}

async function joinAs(page: Page, name: string) {
  // The room screen is a lazy chunk: until it arrives the previous screen stays up.
  await page.getByLabel('Apelido').fill(name);
  await page.getByRole('button', { name: /Sentar/ }).click();
}

async function pairTv(host: Page, tv: Page, role: 'Display' | 'Dealer') {
  await tv.keyboard.press('Enter');
  const code = (await tv.locator('.tv-code').textContent({ timeout: 10_000 }))!.trim();
  await host.getByPlaceholder('····').fill(code);
  await host.getByRole('button', { name: `${role === 'Display' ? '📺' : '🃏'} ${role}`, exact: true }).click();
  await expect(tv.locator('.tv-code')).toHaveCount(0, { timeout: 10_000 });
}

/** Records the local time at which the phase title first matches `re`. */
async function watchTitle(page: Page, re: string) {
  await page.evaluate((src) => {
    const w = window as unknown as { __hit?: number };
    w.__hit = undefined;
    new MutationObserver(() => {
      const h = document.querySelector('.ds-h1');
      if (h && new RegExp(src, 'i').test(h.textContent ?? '') && w.__hit === undefined) {
        w.__hit = performance.timeOrigin + performance.now();
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  }, re);
}

async function visitDealer(phone: Page, dealer: Page) {
  await phone.getByRole('button', { name: /Ir ao Dealer/ }).click();
  const code = (await dealer.getByTestId('dealer-code').textContent({ timeout: 10_000 }))!.trim();
  await phone.getByLabel('code').fill(code);
  await phone.getByRole('button', { name: /Confirmar/ }).click();
  const secret = (await dealer.getByTestId('secret-number').textContent({ timeout: 10_000 }))!.trim();
  await phone.getByRole('button', { name: /Sair do Dealer/ }).click();
  return secret;
}

test('host, players, two displays and a dealer play a round; engine survives the host dropping', async ({
  browser,
}) => {
  const host = await device(browser, '/');
  await host.page.getByRole('button', { name: /Criar sala/ }).click();
  await host.page.waitForURL(/\/r\/[A-Z]{4}/);
  const code = host.page.url().match(/\/r\/([A-Z]{4})/)![1]!;
  await joinAs(host.page, 'Host');

  const ana = await device(browser, `/r/${code}`);
  await joinAs(ana.page, 'Ana');

  const tv1 = await device(browser, '/tv');
  const tv2 = await device(browser, '/tv');
  const dealer = await device(browser, '/tv');
  await pairTv(host.page, tv1.page, 'Display');
  await pairTv(host.page, tv2.page, 'Display');
  await pairTv(host.page, dealer.page, 'Dealer');

  // Pick the game; its bundle must not be loaded before that.
  // The Dealer demo lives in examples/ and is only listed by the e2e server (VITE_INCLUDE_EXAMPLES).
  await host.page.getByRole('button', { name: /Escolher jogo/ }).click();
  await host.page.getByRole('searchbox').fill('Número Secreto');
  await host.page.locator('.picker .game-tile').first().click();
  await host.page.getByRole('button', { name: 'Escolher este jogo' }).click();
  await expect(tv1.page.getByText('Número Secreto').first()).toBeVisible();
  // Shorter discussion (60 → 15 s) and vote (30 → 10 s).
  const minus = host.page.getByRole('button', { name: '-' });
  for (let i = 0; i < 3; i++) await minus.nth(2).click();
  for (let i = 0; i < 4; i++) await minus.nth(3).click();
  await host.page.getByRole('button', { name: /Começar/ }).click();

  await expect(tv1.page.locator('.ds-h1')).toHaveText(/Visitem/i, { timeout: 20_000 });

  const anaSecret = await visitDealer(ana.page, dealer.page);
  const hostSecret = await visitDealer(host.page, dealer.page);

  // Secrets never reach the public board or the other phone.
  for (const tv of [tv1.page, tv2.page]) {
    await expect(tv.locator('.ds-h1')).toHaveText(/Discutam/i);
    expect(await tv.locator('.ds-grid').innerText()).not.toMatch(new RegExp(`\\b(${anaSecret}|${hostSecret})\\b`));
  }

  // Engine migration: kill the host phone mid-game; after ~30 s a Display takes over.
  await host.ctx.close();
  await expect(tv1.page.getByText(/O Host caiu/)).toBeVisible({ timeout: 10_000 });
  await expect(tv1.page.getByText(/O Host caiu/)).toHaveCount(0, { timeout: 45_000 });

  // Ana votes; the host never comes back, so after its grace period the game decides.
  await expect(ana.page.getByRole('button', { name: /Host/ })).toBeVisible({ timeout: 60_000 });
  await watchTitle(tv1.page, 'revela');
  await watchTitle(tv2.page, 'revela');
  await ana.page.getByRole('button', { name: /Host/ }).click();

  await expect(tv1.page.locator('.ds-h1')).toHaveText(/revela/i, { timeout: 30_000 });
  await expect(tv2.page.locator('.ds-h1')).toHaveText(/revela/i);
  const [t1, t2] = await Promise.all(
    [tv1.page, tv2.page].map((p) => p.evaluate(() => (window as unknown as { __hit: number }).__hit)),
  );
  expect(Math.abs(t1 - t2)).toBeLessThan(50);

  // The reveal shows the secrets on the board now.
  await expect(tv1.page.locator('.ds-num').filter({ hasText: anaSecret })).toHaveCount(1);
});
