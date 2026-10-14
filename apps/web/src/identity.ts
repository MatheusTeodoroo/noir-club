import { getIdentity, type Identity } from '@mp/net';

/**
 * Stable per-browser identity. `?as=<label>` namespaces it so several "devices" can be simulated
 * in one browser while testing (each tab with a different label is a different person/screen).
 */
export function deviceIdentity(kind: 'player' | 'tv'): Identity {
  const label = new URLSearchParams(location.search).get('as');
  return getIdentity(`mp.identity.${kind}${label ? `.${label}` : ''}`);
}

export function storageKey(base: string): string {
  const label = new URLSearchParams(location.search).get('as');
  return label ? `${base}.${label}` : base;
}
