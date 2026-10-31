import { useState } from 'react';
import type { PlayerFrame, PublicFrame } from '@mp/protocol';
import type { GameUI } from '@mp/game-sdk';
import { Avatar, Button, Countdown, Panel, RoomTimeContext, Stage, Toggle } from '@mp/ui';
import { useT } from '../i18n.ts';
import { LangSwitch, SiteLinks } from '../room/siteLinks.tsx';
import { GameBoundary, kit, Scoreboard, StatusOverlay, useGameUI } from '../room/common.tsx';
import { useSession, type Session } from '../room/session.ts';
import { AdminPanel, TvPairing } from './AdminPanel.tsx';
import { DEALER_VISIT_MS_HINT } from './constants.ts';
import { MyScreen, SpaceNotice } from './MyScreen.tsx';

export function PlayerScreen({ session, code }: { session: Session; code: string }) {
  const state = useSession(session);
  const { t } = useT();
  const frame = state.public;
  const me = state.player;
  const gameUI = useGameUI(session, frame);
  const pub = frame?.platform;
  const self = pub?.players.find((p) => p.id === state.you?.id);

  if (state.error && !state.you) {
    return (
      <Stage>
        <div className="screen-center">
          <Panel>
            <p className="mp-subtitle" style={{ fontSize: '1.3rem' }}>
              {state.error.message}
            </p>
            <Button variant="ghost" onClick={() => (location.href = '/')}>
              ←
            </Button>
          </Panel>
        </div>
      </Stage>
    );
  }

  return (
    <RoomTimeContext.Provider value={session.roomNow}>
      <Stage particles={pub?.phase !== 'playing'}>
        <div className="phone">
          <header className="phone-header">
            <Avatar emoji={self?.avatar ?? state.you?.avatar ?? '🎩'} size={44} active={!!me?.platform.isAdmin} />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{self?.name ?? state.you?.name}</div>
              <div style={{ color: 'var(--text-mute)', fontSize: '0.8rem' }}>
                {self ? `${self.score} ${t('results.points')}` : ''}
              </div>
            </div>
            <span className="mp-chip">{code}</span>
          </header>

          {state.hostingEngine && pub?.phase !== 'lobby' && (
            <div className="mp-chip mp-chip--crimson" style={{ justifySelf: 'center' }}>
              ⚠ {t('admin.engineHere')}
            </div>
          )}

          {me?.platform.space && <SpaceNotice space={me.platform.space} />}

          {!frame || !me ? (
            <div className="screen-center" style={{ minHeight: '50dvh' }}>
              <div className="mp-spinner" />
            </div>
          ) : pub!.phase === 'lobby' ? (
            <Lobby session={session} frame={frame} me={me} />
          ) : me.platform.spectator ? (
            <Panel>
              <p className="mp-subtitle" style={{ fontSize: '1.2rem', textAlign: 'center' }}>
                {t('player.spectator')}
              </p>
            </Panel>
          ) : pub!.phase === 'loading' || !gameUI || (pub!.phase === 'playing' && me.game == null) ? (
            <div className="stack" style={{ justifyItems: 'center', paddingTop: 80 }}>
              <div className="mp-spinner" />
              <p className="mp-subtitle">{t('player.loading')}</p>
            </div>
          ) : pub!.phase === 'results' ? (
            <Results session={session} frame={frame} me={me} />
          ) : (
            <Playing session={session} frame={frame} me={me} ui={gameUI} />
          )}

          {pub?.remoteScreens && me && !me.platform.spectator && (
            <MyScreen session={session} teamDealer={me.platform.teamDealer} />
          )}

          {me?.platform.isAdmin && frame && pub && pub.phase !== 'lobby' && (
            <details className="stack">
              <summary className="section-title" style={{ cursor: 'pointer' }}>
                {t('admin.title')}
              </summary>
              <TvPairing session={session} frame={frame} />
              {pub.phase !== 'results' && (
                <Button variant="ghost" small onClick={() => session.send({ type: 'backToLobby' })}>
                  {t('admin.backToLobby')}
                </Button>
              )}
            </details>
          )}
        </div>
        <StatusOverlay state={state} />
      </Stage>
    </RoomTimeContext.Provider>
  );
}

function Lobby({ session, frame, me }: { session: Session; frame: PublicFrame; me: PlayerFrame }) {
  const { t } = useT();
  const pub = frame.platform;
  return (
    <div className="stack mp-enter" style={{ gap: 16 }}>
      {me.platform.isAdmin ? (
        <AdminPanel session={session} frame={frame} />
      ) : (
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center', gap: 14 }}>
          <div className="mp-spinner" />
          <p className="mp-subtitle" style={{ fontSize: '1.15rem' }}>
            {t('lobby.waiting')}
          </p>
        </Panel>
      )}
      <Panel>
        <h3 className="section-title">
          {t('lobby.players')} · {pub.players.length}
        </h3>
        {pub.players.map((p) => (
          <div className="player-row" key={p.id}>
            <Avatar
              emoji={p.avatar}
              size={36}
              offline={!p.connected}
              badge={p.isAdmin ? '♛' : p.remote ? '🌐' : undefined}
            />
            <span className="name">{p.name}</span>
            <span style={{ color: 'var(--text-mute)', fontSize: '0.85rem' }}>{p.score}</span>
          </div>
        ))}
        <Toggle
          label={t('join.remote')}
          checked={me.platform.remote}
          onChange={(remote) => session.send({ type: 'setRemote', remote })}
        />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>{t('lang.label')}</span>
          <LangSwitch />
        </div>
      </Panel>
      <SiteLinks />
    </div>
  );
}

function Playing({ session, frame, me, ui }: { session: Session; frame: PublicFrame; me: PlayerFrame; ui: GameUI }) {
  const { t, tg, lang } = useT();
  const Player = ui.Player;
  const Dealer = ui.Dealer;
  const dealer = me.platform.dealer;
  return (
    <div className="stack" style={{ gap: 16 }}>
      {dealer.status === 'inside' && me.platform.remote && Dealer && me.dealerGame ? (
        <Panel className="stack">
          <span className="mp-eyebrow">{t('dealer.inside')}</span>
          <Dealer kit={kit} lang={lang} t={tg} platform={frame.platform} view={me.dealerGame} playerName="" />
        </Panel>
      ) : null}
      <DealerBar session={session} me={me} />
      <GameBoundary resetKey={me.seq}>
        <Player
          kit={kit}
          lang={lang}
          t={tg}
          platform={frame.platform}
          view={me.game}
          you={me.platform}
          send={(a: unknown) => session.sendGame(a)}
        />
      </GameBoundary>
    </div>
  );
}

function DealerBar({ session, me }: { session: Session; me: PlayerFrame }) {
  const { t } = useT();
  const [code, setCode] = useState('');
  const d = me.platform.dealer;

  if (d.status === 'none') {
    if (!me.platform.canRequestDealer) return null;
    return (
      <Button block variant="crimson" onClick={() => session.send({ type: 'dealerRequest' })}>
        🃏 {t('dealer.request')}
      </Button>
    );
  }
  if (d.status === 'queued') {
    return (
      <Panel className="row" style={{ justifyContent: 'space-between' }}>
        <span>{t('dealer.queued', { n: d.position })}</span>
        <Button small variant="ghost" onClick={() => session.send({ type: 'dealerCancel' })}>
          {t('dealer.cancel')}
        </Button>
      </Panel>
    );
  }
  if (d.status === 'called') {
    const submit = () => {
      if (code.length !== 3) return;
      session.send({ type: 'dealerCode', code });
      setCode('');
    };
    return (
      <Panel
        className="stack"
        style={{ gap: 14, boxShadow: '0 0 0 2px var(--crimson), 0 20px 60px -20px var(--crimson)' }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>{t('dealer.called')}</p>
        <input
          className="mp-input mp-input--code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={code}
          placeholder="···"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          aria-label="code"
        />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-mute)', fontSize: '0.85rem' }}>
            {t('dealer.attempts', { n: d.attemptsLeft })}
          </span>
          <Button small onClick={submit} disabled={code.length !== 3}>
            {t('dealer.confirm')}
          </Button>
        </div>
      </Panel>
    );
  }
  return (
    <Panel className="row" style={{ justifyContent: 'space-between' }}>
      <Countdown deadline={d.deadline} total={DEALER_VISIT_MS_HINT} size={52} />
      <span style={{ flex: 1 }}>{t('dealer.inside')}</span>
      <Button small variant="ghost" onClick={() => session.send({ type: 'dealerLeave' })}>
        {t('dealer.leave')}
      </Button>
    </Panel>
  );
}

function Results({ session, frame, me }: { session: Session; frame: PublicFrame; me: PlayerFrame }) {
  const { t } = useT();
  return (
    <div className="stack mp-enter" style={{ gap: 16 }}>
      <h2 className="mp-title" style={{ textAlign: 'center', fontSize: '1.8rem' }}>
        {t('player.results')}
      </h2>
      <Panel>
        <Scoreboard frame={frame} />
      </Panel>
      {me.platform.isAdmin && (
        <Button block onClick={() => session.send({ type: 'backToLobby' })}>
          {t('admin.backToLobby')}
        </Button>
      )}
      <SiteLinks lead={t('results.feedback')} />
    </div>
  );
}
