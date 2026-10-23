import { useState } from 'react';
import { useNavigate } from 'react-router';
import { normalizeRoomCode } from '@mp/protocol';
import { createRoom, roomExists } from '@mp/net';
import { deviceIdentity } from '../identity.ts';
import { Button, Panel, Stage } from '@mp/ui';
import { useT } from '../i18n.ts';
import { Logo } from '../room/common.tsx';
import { LangSwitch, SiteLinks } from '../room/siteLinks.tsx';

export function Home() {
  const { t } = useT();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(deviceIdentity('player'));
      nav(`/r/${room}${location.search}`);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  };

  const join = async () => {
    const c = normalizeRoomCode(code);
    if (c.length !== 4) return;
    setBusy(true);
    setError(null);
    if (await roomExists(c).catch(() => false)) nav(`/r/${c}${location.search}`);
    else {
      setError(t('home.notFound'));
      setBusy(false);
    }
  };

  return (
    <Stage>
      <div className="corner-tools">
        <LangSwitch />
      </div>
      <div className="screen-center">
        <div className="stack mp-enter" style={{ width: '100%', maxWidth: 420, gap: 28 }}>
          <Logo />
          <Panel className="stack" style={{ gap: 14 }}>
            <label className="mp-field">
              <span>{t('home.code')}</span>
              <input
                className="mp-input mp-input--code"
                value={code}
                maxLength={4}
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                placeholder="····"
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && join()}
              />
            </label>
            <Button block onClick={join} disabled={busy || code.length !== 4}>
              {t('home.join')}
            </Button>
            <div className="mp-divider">✦</div>
            <Button block variant="crimson" onClick={create} disabled={busy}>
              {t('home.create')}
            </Button>
            {error && <p style={{ color: 'var(--crimson-hi)', margin: 0, textAlign: 'center' }}>{error}</p>}
          </Panel>
          <div className="stack" style={{ justifyItems: 'center', gap: 6 }}>
            <Button variant="ghost" small onClick={() => nav('/tv')}>
              📺 {t('home.tv')}
            </Button>
            <span style={{ color: 'var(--text-mute)', fontSize: '0.8rem' }}>{t('home.tvHint')}</span>
          </div>
          <SiteLinks full />
        </div>
      </div>
    </Stage>
  );
}
