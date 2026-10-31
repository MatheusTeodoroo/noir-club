import { useEffect, useState } from 'react';
import { openPairing } from '@mp/net';
import { deviceIdentity, storageKey } from '../identity.ts';
import { Button, Stage } from '@mp/ui';
import { unlockAudio } from '../audio.ts';
import { useT } from '../i18n.ts';
import { LangSwitch } from '../room/siteLinks.tsx';
import { Logo } from '../room/common.tsx';
import { Session } from '../room/session.ts';
import { DisplayScreen } from './DisplayScreen.tsx';
import { DealerScreen } from './DealerScreen.tsx';

interface Pairing {
  room: string;
  role: 'display' | 'dealer';
  grant: string;
}

const KEY = storageKey('mp.tv');

function loadPairing(): Pairing | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Pairing | null;
  } catch {
    return null;
  }
}

/**
 * The TV entry point. One tap (to unlock audio), then it shows a pairing code and waits for the
 * Host to claim it. After that it never needs input again and reconnects on its own.
 * At /display or /dealer the screen's role is fixed by the link; at /tv the Host picks it.
 */
export function TvRoute({ role }: { role?: Pairing['role'] }) {
  // A saved pairing for the other role (same browser, other link) doesn't apply here.
  const [pairing, setPairing] = useState<Pairing | null>(() => {
    const saved = loadPairing();
    return saved && (!role || saved.role === role) ? saved : null;
  });
  // Already-paired TVs come back on their own after a reload/power cycle: no tap required.
  const [armed, setArmed] = useState(() => pairing !== null);
  useEffect(() => {
    const unlock = () => unlockAudio();
    unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (!armed) return <TapToStart onStart={() => (unlockAudio(), setArmed(true))} />;
  if (!pairing) {
    return (
      <PairingScreen
        role={role}
        onPaired={(p) => {
          localStorage.setItem(KEY, JSON.stringify(p));
          setPairing(p);
        }}
      />
    );
  }
  return (
    <PairedTv
      pairing={pairing}
      onReset={() => {
        localStorage.removeItem(KEY);
        setPairing(null);
      }}
    />
  );
}

function TapToStart({ onStart }: { onStart(): void }) {
  const { t } = useT();
  useEffect(() => {
    // Remote controls send Enter; keyboards too.
    const onKey = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onStart();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <Stage className="tv">
      {/* Outside the tap-anywhere area, so choosing a language doesn't start the TV. */}
      <div className="corner-tools">
        <LangSwitch />
      </div>
      <div className="screen-center" style={{ cursor: 'pointer' }} onClick={onStart}>
        <div className="stack" style={{ justifyItems: 'center', gap: '2em' }}>
          <Logo size={1.4} />
          <Button autoFocus onClick={onStart}>
            🔊 {t('tv.tapSound')}
          </Button>
        </div>
      </div>
    </Stage>
  );
}

function PairingScreen({ role, onPaired }: { role?: Pairing['role']; onPaired(p: Pairing): void }) {
  const { t } = useT();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => openPairing(setCode, (p) => onPaired({ room: p.room, role: p.role, grant: p.grant }), role), [role]);
  return (
    <Stage className="tv">
      <div className="screen-center">
        <div className="stack mp-enter" style={{ justifyItems: 'center', gap: '2.4em', textAlign: 'center' }}>
          <Logo size={1.1} />
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(role === 'display' ? 'tv.pairTitleDisplay' : role === 'dealer' ? 'tv.pairTitleDealer' : 'tv.pairTitle')}
          </span>
          <p className="mp-subtitle" style={{ fontSize: '1.8em' }}>
            {t('tv.pairHint')}
          </p>
          {code ? <div className="tv-code mp-title">{code}</div> : <div className="mp-spinner" />}
        </div>
      </div>
    </Stage>
  );
}

function PairedTv({ pairing, onReset }: { pairing: Pairing; onReset(): void }) {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const identity = deviceIdentity('tv');
    const s = new Session({
      code: pairing.room,
      identity,
      grant: pairing.grant,
      playsSound: pairing.role === 'display',
    });
    const off = s.client.on('error', (code) => {
      if (code === 'bad_grant' || code === 'no_room' || code === 'kicked') onReset();
    });
    // Room closed by the Host or for being idle: this screen is free for the next room.
    const offClosed = s.client.on('roomClosed', () => onReset());
    setSession(s);
    return () => {
      off();
      offClosed();
      s.close();
    };
  }, [pairing.grant]);

  if (!session) return null;
  return pairing.role === 'display' ? (
    <DisplayScreen session={session} code={pairing.room} onLeave={onReset} />
  ) : (
    <DealerScreen session={session} onLeave={onReset} />
  );
}
