import { useEffect, useState } from 'react';
import { openPairing } from '@mp/net';
import { deviceIdentity, storageKey } from '../identity.ts';
import { Button, Stage } from '@mp/ui';
import { unlockAudio } from '../audio.ts';
import { useT } from '../i18n.ts';
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
 */
export function TvRoute() {
  const [pairing, setPairing] = useState<Pairing | null>(loadPairing);
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

function PairingScreen({ onPaired }: { onPaired(p: Pairing): void }) {
  const { t } = useT();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => openPairing(setCode, (p) => onPaired({ room: p.room, role: p.role, grant: p.grant })), []);
  return (
    <Stage className="tv">
      <div className="screen-center">
        <div className="stack mp-enter" style={{ justifyItems: 'center', gap: '2.4em', textAlign: 'center' }}>
          <Logo size={1.1} />
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t('tv.pairTitle')}
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
    setSession(s);
    return () => {
      off();
      s.close();
    };
  }, [pairing.grant]);

  if (!session) return null;
  return pairing.role === 'display' ? (
    <DisplayScreen session={session} code={pairing.room} />
  ) : (
    <DealerScreen session={session} />
  );
}
