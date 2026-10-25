/**
 * Polyfills for older embedded Chromium builds (e.g. CEF 86 inside Garry's Mod browser mods).
 * Imported first by the page and the engine worker, so game bundles can use these too.
 * Each one is installed only when missing; current browsers keep their native versions.
 */

function define(target: object, name: string, value: unknown) {
  if (!(name in target)) Object.defineProperty(target, name, { value, writable: true, configurable: true });
}

function at<T>(this: ArrayLike<T>, index: number): T | undefined {
  const i = Math.trunc(index) || 0;
  const k = i < 0 ? this.length + i : i;
  return k >= 0 && k < this.length ? this[k] : undefined;
}

define(Array.prototype, 'at', at);
define(String.prototype, 'at', at);
define(Array.prototype, 'findLast', function <T>(this: T[], fn: (v: T, i: number, a: T[]) => unknown, self?: unknown) {
  for (let i = this.length - 1; i >= 0; i--) if (fn.call(self, this[i]!, i, this)) return this[i];
  return undefined;
});
define(Array.prototype, 'findLastIndex', function <T>(this: T[], fn: (v: T, i: number, a: T[]) => unknown, self?: unknown) {
  for (let i = this.length - 1; i >= 0; i--) if (fn.call(self, this[i]!, i, this)) return i;
  return -1;
});
define(Object, 'hasOwn', (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k));
// Engine state is plain JSON by contract, so a JSON round trip is an exact clone.
define(globalThis, 'structuredClone', <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value))));

/** `inset` (Chromium 87+) as top/right/bottom/left, for inline styles and games' <style> text. */
function insetLonghands(value: string) {
  const v = value.trim().split(/\s+/);
  const [top, right = top, bottom = top, left = right] = v;
  return { top: top!, right: right!, bottom: bottom!, left: left! };
}

if (typeof document !== 'undefined' && typeof CSS !== 'undefined' && !CSS.supports('inset', '0')) {
  Object.defineProperty(CSSStyleDeclaration.prototype, 'inset', {
    configurable: true,
    get(this: CSSStyleDeclaration) {
      return this.top;
    },
    set(this: CSSStyleDeclaration, value: string | number) {
      const l = insetLonghands(String(value === 0 ? '0' : value));
      Object.assign(this, l);
    },
  });

  const rule = /(^|[;{\s])inset\s*:\s*([^;}!]+)(!important)?/g;
  const rewrite = (style: HTMLStyleElement) => {
    const css = style.textContent ?? '';
    if (!/inset\s*:/.test(css)) return;
    style.textContent = css.replace(rule, (_, pre: string, value: string, imp = '') => {
      const l = insetLonghands(value);
      return `${pre}top:${l.top}${imp};right:${l.right}${imp};bottom:${l.bottom}${imp};left:${l.left}${imp}`;
    });
  };
  new MutationObserver((records) => {
    for (const r of records) {
      const target = r.target instanceof HTMLStyleElement ? r.target : r.target.parentElement;
      if (target instanceof HTMLStyleElement) rewrite(target);
      r.addedNodes.forEach((n) => {
        if (n instanceof HTMLStyleElement) rewrite(n);
        else if (n instanceof Element) n.querySelectorAll('style').forEach(rewrite);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
