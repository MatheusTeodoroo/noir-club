import type { QualityTier } from '@mp/ui';

/**
 * Picks a rendering tier for the device. TV browsers (Tizen, webOS, Fire TV, Chromecast) and
 * low-memory devices get cheaper visuals. `?quality=low|medium|high` overrides for testing.
 */
export function detectQuality(): QualityTier {
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced;

  const ua = navigator.userAgent;
  const isTv = /Tizen|Web0S|webOS|SMART-TV|SmartTV|AFT[A-Z]|CrKey|BRAVIA|NetCast|HbbTV|Android TV/i.test(ua);
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (isTv && (memory <= 2 || cores <= 4)) return 'low';
  if (isTv || memory <= 2 || cores <= 2) return 'medium';
  return 'high';
}
