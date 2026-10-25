import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { normalizeRoomCode } from '@mp/protocol';
import { deviceIdentity, storageKey } from '../identity.ts';
import { Avatar, Button, Panel, Stage } from '@mp/ui';
import { useT } from '../i18n.ts';
import { LangSwitch } from '../room/siteLinks.tsx';
import { AVATARS } from '../room/common.tsx';
import { Session } from '../room/session.ts';
import { PlayerScreen } from './PlayerScreen.tsx';

interface Profile {
  name: string;
  avatar: string;
}

function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(storageKey('mp.profile')) ?? 'null') as Profile | null;
    return p?.name ? p : null;
  } catch {
    return null;
  }
}

export function PlayerRoute() {
  const code = normalizeRoomCode(useParams().code ?? '');
  const joinedKey = storageKey(`mp.joined.${code}`);
  const [profile, setProfile] = useState<Profile | null>(() =>
    sessionStorage.getItem(joinedKey) ? loadProfile() : null,
  );

  if (!profile) {
    return (
      <JoinForm
        onJoin={(p) => {
          localStorage.setItem(storageKey('mp.profile'), JSON.stringify(p));
          sessionStorage.setItem(joinedKey, '1');
          setProfile(p);
        }}
      />
    );
  }
  return <Connected code={code} profile={profile} />;
}

function Connected({ code, profile }: { code: string; profile: Profile }) {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const s = new Session({ code, identity: deviceIdentity('player'), name: profile.name, avatar: profile.avatar });
    setSession(s);
    return () => s.close();
  }, [code]);
  if (!session) return null;
  return <PlayerScreen session={session} code={code} />;
}

function JoinForm({ onJoin }: { onJoin(p: Profile): void }) {
  const { t } = useT();
  const saved = loadProfile();
  const [name, setName] = useState(saved?.name ?? '');
  const [avatar, setAvatar] = useState(saved?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!);
  const valid = name.trim().length > 0;

  return (
    <Stage>
      <div className="corner-tools">
        <LangSwitch />
      </div>
      <div className="screen-center">
        <Panel className="stack mp-enter" style={{ width: '100%', maxWidth: 420, gap: 18 }}>
          <div className="stack" style={{ justifyItems: 'center', gap: 10 }}>
            <Avatar emoji={avatar} size={96} active />
            <h2 className="mp-title" style={{ fontSize: '1.6rem' }}>
              {t('join.title')}
            </h2>
          </div>
          <label className="mp-field">
            <span>{t('join.name')}</span>
            <input
              className="mp-input"
              value={name}
              maxLength={20}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && valid && onJoin({ name: name.trim(), avatar })}
            />
          </label>
          <div className="mp-field">
            <span>{t('join.avatar')}</span>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <button key={a} type="button" className="avatar-pick" onClick={() => setAvatar(a)} aria-label={a}>
                  <Avatar emoji={a} size={48} active={a === avatar} />
                </button>
              ))}
            </div>
          </div>
          <Button block onClick={() => onJoin({ name: name.trim(), avatar })} disabled={!valid}>
            {t('join.enter')}
          </Button>
        </Panel>
      </div>
    </Stage>
  );
}
