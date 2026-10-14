import { useEffect, useState } from 'react';
import type { PublicFrame } from '@mp/protocol';
import { normalizeRoomCode } from '@mp/protocol';
import { configDefaults, type ConfigField } from '@mp/game-sdk';
import { Avatar, Button, Panel, Stepper, Toggle } from '@mp/ui';
import { useT } from '../i18n.ts';
import { listGames, type RegistryEntry } from '../games/loader.ts';
import { useSession, type Session } from '../room/session.ts';

/** The Host's controls: pick and configure a game, pair TVs, manage players and room mode. */
export function AdminPanel({ session, frame }: { session: Session; frame: PublicFrame }) {
  const { t, tg } = useT();
  const state = useSession(session);
  const pub = frame.platform;
  const [games, setGames] = useState<RegistryEntry[]>([]);
  useEffect(() => {
    void listGames().then(setGames);
  }, []);

  const selected = games.find((g) => g.manifest.id === pub.game?.id)?.manifest ?? null;
  const active = pub.players.filter((p) => p.connected && !p.spectator).length;
  const inRange = !!selected && active >= selected.minPlayers && active <= selected.maxPlayers;
  const config = selected ? { ...configDefaults(selected), ...pub.gameConfig } : {};

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h2 className="mp-title" style={{ fontSize: '1.4rem', textAlign: 'center' }}>
        {t('admin.title')}
      </h2>

      <Panel className="stack">
        <h3 className="section-title">{t('admin.games')}</h3>
        {games.map(({ manifest: m }) => (
          <button
            key={m.id}
            type="button"
            className="game-card"
            aria-pressed={pub.game?.id === m.id}
            style={{ ['--accent' as string]: m.accent }}
            onClick={() =>
              session.send({
                type: 'selectGame',
                game: pub.game?.id === m.id ? null : { id: m.id, version: m.version },
              })
            }
          >
            <h3>{tg(m.name)}</h3>
            <p>{tg(m.description)}</p>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="mp-chip">
                👥 {m.minPlayers}–{m.maxPlayers}
              </span>
              <span className="mp-chip">⏱ ~{m.estimatedMinutes} min</span>
              {m.usesDealer && <span className="mp-chip mp-chip--crimson">🃏 Dealer</span>}
            </div>
          </button>
        ))}
      </Panel>

      {selected && (
        <Panel className="stack mp-enter">
          <h3 className="section-title">{t('admin.config')}</h3>
          {selected.config.map((f) => (
            <ConfigInput
              key={f.key}
              field={f}
              value={config[f.key]}
              onChange={(v) => session.send({ type: 'setConfig', config: { [f.key]: v } })}
            />
          ))}
        </Panel>
      )}

      <TvPairing session={session} frame={frame} />

      <Panel className="stack">
        <h3 className="section-title">{t('admin.settings')}</h3>
        <Toggle
          label={t('admin.sharedHost')}
          checked={pub.sharedHost}
          onChange={(sharedHost) => session.send({ type: 'setSettings', sharedHost })}
        />
        {pub.sharedHost && pub.displays === 0 && (
          <span className="mp-chip mp-chip--crimson" style={{ justifySelf: 'start' }}>
            {t('admin.noDisplay')}
          </span>
        )}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>{t('admin.lang')}</span>
          <div className="row" style={{ gap: 6 }}>
            {(['pt-BR', 'en'] as const).map((l) => (
              <Button
                key={l}
                small
                variant={pub.lang === l ? 'gold' : 'ghost'}
                onClick={() => session.send({ type: 'setSettings', lang: l })}
              >
                {l === 'pt-BR' ? 'PT' : 'EN'}
              </Button>
            ))}
          </div>
        </div>
        {pub.players
          .filter((p) => p.id !== state.you?.id)
          .map((p) => (
            <div className="player-row" key={p.id}>
              <Avatar emoji={p.avatar} size={32} offline={!p.connected} />
              <span className="name">{p.name}</span>
              <Button small variant="ghost" onClick={() => session.send({ type: 'kick', playerId: p.id })}>
                {t('admin.kick')}
              </Button>
            </div>
          ))}
      </Panel>

      <div className="sticky-bottom stack" style={{ gap: 6 }}>
        {selected && !inRange && (
          <span style={{ textAlign: 'center', color: 'var(--crimson-hi)', fontSize: '0.85rem' }}>
            {t('lobby.need', { min: selected.minPlayers, max: selected.maxPlayers })}
          </span>
        )}
        <Button block variant="crimson" disabled={!inRange} onClick={() => session.send({ type: 'start' })}>
          {t('admin.start')} {selected ? `· ${tg(selected.name)}` : ''}
        </Button>
      </div>
    </div>
  );
}

function ConfigInput({ field, value, onChange }: { field: ConfigField; value: unknown; onChange(v: unknown): void }) {
  const { tg } = useT();
  if (field.type === 'boolean') {
    return <Toggle label={tg(field.label)} checked={Boolean(value)} onChange={onChange} />;
  }
  if (field.type === 'number') {
    return (
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ flex: 1 }}>{tg(field.label)}</span>
        <Stepper value={Number(value)} min={field.min} max={field.max} step={field.step} onChange={onChange} />
      </div>
    );
  }
  return (
    <label className="mp-field">
      <span>{tg(field.label)}</span>
      <select className="mp-input" value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {tg(o.label)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TvPairing({ session, frame }: { session: Session; frame: PublicFrame }) {
  const { t } = useT();
  const state = useSession(session);
  const [code, setCode] = useState('');
  const pub = frame.platform;
  const claim = (role: 'display' | 'dealer') => {
    if (code.length !== 4) return;
    session.client.claimTv(code, role);
    setCode('');
  };
  return (
    <Panel className="stack">
      <h3 className="section-title">{t('admin.tvs')}</h3>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="mp-chip">📺 {pub.displays}</span>
        <span className="mp-chip mp-chip--crimson">🃏 {pub.dealers}</span>
      </div>
      <label className="mp-field">
        <span>{t('admin.tvCode')}</span>
        <input
          className="mp-input mp-input--code"
          value={code}
          maxLength={4}
          placeholder="····"
          autoCapitalize="characters"
          onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
        />
      </label>
      <div className="row">
        <Button block small disabled={code.length !== 4} onClick={() => claim('display')}>
          📺 {t('admin.asDisplay')}
        </Button>
        <Button block small variant="crimson" disabled={code.length !== 4} onClick={() => claim('dealer')}>
          🃏 {t('admin.asDealer')}
        </Button>
      </div>
      {state.error?.code === 'pair_not_found' && (
        <span style={{ color: 'var(--crimson-hi)' }}>{state.error.message}</span>
      )}
    </Panel>
  );
}
