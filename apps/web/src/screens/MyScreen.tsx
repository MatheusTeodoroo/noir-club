import { useEffect, useState } from 'react';
import { normalizeRoomCode } from '@mp/protocol';
import { pairCodeRole } from '@mp/net';
import { Button } from '@mp/ui';
import { useT } from '../i18n.ts';
import { useSession, type Session } from '../room/session.ts';

/**
 * Remote screens (a Host option): a player pairs a screen of their own — the room TV on their
 * computer, or their team's Dealer board when the game allows it — instead of watching a stream.
 * The screen opens /display or /dealer and shows a code, exactly like a room TV.
 */
export function MyScreen({ session, teamDealer }: { session: Session; teamDealer: boolean }) {
  const { t } = useT();
  const state = useSession(session);
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'display' | 'dealer' | null>(null);
  useEffect(() => {
    setRole(null);
    if (code.length !== 4) return;
    let alive = true;
    void pairCodeRole(code)
      .then((r) => alive && setRole(r ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [code]);
  const mine = state.clients.filter((c) => c.role === 'viewer' && c.owner === state.you?.id && c.connected);
  const claim = (as: 'display' | 'dealer') => {
    session.client.claimTv(code, as, true);
    setCode('');
  };

  return (
    <details className="stack my-screen">
      <summary className="section-title" style={{ cursor: 'pointer' }}>
        🖥️ {t('remote.myScreen')}
        {mine.length > 0 && <span className="mp-chip mp-chip--ok my-screen-count">{mine.length}</span>}
      </summary>
      <p className="my-screen-hint">
        {t('remote.howTo', { display: `${location.host}/display` })}
        {teamDealer && <> {t('remote.howToDealer', { dealer: `${location.host}/dealer` })}</>}
      </p>
      <input
        className="mp-input mp-input--code"
        value={code}
        maxLength={4}
        placeholder="····"
        aria-label={t('admin.tvCode')}
        autoCapitalize="characters"
        onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
      />
      <div className="row">
        {role !== 'dealer' && (
          <Button block small disabled={code.length !== 4} onClick={() => claim('display')}>
            📺 {t('remote.connectTv')}
          </Button>
        )}
        {role !== 'display' && (teamDealer || role === 'dealer') && (
          <Button block small variant="crimson" disabled={code.length !== 4} onClick={() => claim('dealer')}>
            🃏 {t('remote.connectDealer')}
          </Button>
        )}
      </div>
      {state.error?.code === 'pair_not_found' && <span style={{ color: 'var(--crimson-hi)' }}>{state.error.message}</span>}
    </details>
  );
}

/** Remote screens: which room (call) this player should be in now, as the game says. */
export function SpaceNotice({ space }: { space: { 'pt-BR': string; en: string } }) {
  const { t, tg } = useT();
  return (
    <div className="space-notice mp-enter" role="status" key={space['pt-BR']}>
      <span className="space-notice-icon" aria-hidden>
        🎧
      </span>
      <span>
        {t('remote.goTo')} <b>{tg(space)}</b>
      </span>
    </div>
  );
}
