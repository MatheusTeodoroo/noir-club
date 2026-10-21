import type { PlaygroundHost } from './host.ts';

/**
 * `window.pg` — drives the device iframes from the control room's console or a browser tool's
 * JavaScript runner (accessibility snapshots don't enter iframes). Devices: 'p1'…'pN', 'display',
 * 'dealer'. Every call returns a short description of what happened.
 *
 *   await pg.click('p2', 'Votar')        // first button whose text or aria-label contains it
 *   await pg.type('p3', 'pintor', true)  // fill the phone's text field, then submit
 *   await pg.visit('p2')                 // whole Dealer flow: queue, read code on the Dealer, type it
 *   await pg.leave('p2')                 // "leave the Dealer"
 *   pg.text('display')                   // what a screen says
 *   pg.next(); pg.advance(30_000)        // clock controls
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function doc(device: string): Document {
  const sel = /^p\d+$/.test(device) ? `iframe[src*="id=${device}"]` : `iframe[src*="device=${device}"]`;
  const d = document.querySelector<HTMLIFrameElement>(sel)?.contentDocument;
  if (!d) throw new Error(`no device "${device}" (use p1…pN, display, dealer)`);
  return d;
}

async function waitFor<T>(fn: () => T | null | undefined, what: string, ms = 4000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
}

function findButton(d: Document, text: string) {
  const want = text.toLowerCase();
  const buttons = [...d.querySelectorAll<HTMLElement>('button, [role="button"]')].filter(
    (b) => !(b as HTMLButtonElement).disabled,
  );
  const label = (b: HTMLElement) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().toLowerCase();
  return buttons.find((b) => label(b) === want) ?? buttons.find((b) => label(b).includes(want));
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function installAgentHelpers(host: PlaygroundHost) {
  const pg = {
    async click(device: string, text: string) {
      const b = await waitFor(() => findButton(doc(device), text), `button "${text}" on ${device}`);
      // Read the label first: React may reuse the same element for the next screen's button.
      const label = (b.getAttribute('aria-label') ?? b.textContent ?? '').trim();
      // SVG elements (e.g. a tappable map node with role=button) have no .click().
      if (typeof b.click === 'function') b.click();
      else b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await sleep(150);
      return `clicked "${label}" on ${device}`;
    },
    async type(device: string, text: string, submit = false) {
      const input = await waitFor(
        () => doc(device).querySelector<HTMLInputElement>('input:not([type=checkbox]):not([disabled])'),
        `a text field on ${device}`,
      );
      setInput(input, text);
      await sleep(50);
      if (submit) {
        const form = input.closest('form');
        if (form) form.requestSubmit();
        else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await sleep(150);
      }
      return `typed "${text}" on ${device}${submit ? ' and submitted' : ''}`;
    },
    async visit(device: string) {
      (
        await waitFor(
          () => doc(device).querySelector<HTMLElement>('[data-pg="dealer-request"]'),
          `${device}'s Dealer button (can they visit now?)`,
        )
      ).click();
      await waitFor(
        () => host.engine.state.dealer.current?.playerId === device || null,
        `${device} to be called (others in the queue?)`,
        10_000,
      );
      const remote = host.remote.has(device);
      if (!remote) {
        const code = await waitFor(
          () => doc('dealer').querySelector('.tv-dealer-code')?.textContent?.trim(),
          'the code on the Dealer',
        );
        const input = await waitFor(
          () => doc(device).querySelector<HTMLInputElement>('[data-pg="dealer-code"]'),
          'the code field',
        );
        setInput(input, code);
        await sleep(50);
        (
          await waitFor(
            () => doc(device).querySelector<HTMLButtonElement>('[data-pg="dealer-confirm"]:not([disabled])'),
            'confirm',
          )
        ).click();
      }
      await waitFor(() => host.engine.state.dealer.current?.verified || null, `${device} to be verified`);
      await sleep(300);
      return `${device} is at the Dealer — it shows: ${pg.text(remote ? device : 'dealer')}`;
    },
    async leave(device: string) {
      (
        await waitFor(
          () => doc(device).querySelector<HTMLElement>('[data-pg="dealer-leave"]'),
          `${device}'s leave button`,
        )
      ).click();
      await sleep(150);
      return `${device} left the Dealer`;
    },
    text(device: string) {
      return (doc(device).body.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
    },
    next() {
      host.skipToNextTimer();
      return `phase ${host.engine.state.phase}`;
    },
    advance(ms: number) {
      host.advance(ms);
      return `phase ${host.engine.state.phase}`;
    },
    /** The game's private state (debugging only). */
    state() {
      return host.engine.state.match?.state;
    },
  };
  (window as unknown as { pg: typeof pg }).pg = pg;
}
