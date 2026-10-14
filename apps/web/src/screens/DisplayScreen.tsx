import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { PublicFrame } from '@mp/protocol';
import { Avatar, RoomTimeContext, Stage } from '@mp/ui';
import { LangContext, makeT, useT } from '../i18n.ts';
import { listGames, type RegistryEntry } from '../games/loader.ts';
import { GameBoundary, kit, Logo, Scoreboard, StatusOverlay, useGameUI } from '../room/common.tsx';
import { useSession, type Session } from '../room/session.ts';

/**
 * The public board. No input: everything follows public frames, which are applied on the shared
 * room clock so every Display in every room of the house changes at the same instant.
 */
export function DisplayScreen({ session, code }: { session: Session; code: string }) {
  const state = useSession(session);
  const frame = state.public;
  const gameUI = useGameUI(session, frame);
  const lang = frame?.platform.lang ?? 'pt-BR';

  return (
    <LangContext.Provider value={lang}>
      <RoomTimeContext.Provider value={session.roomNow}>
        <Stage className="tv" particles={frame?.platform.phase !== 'playing'}>
          {!frame ? (
            <div className="screen-center">
              <Logo size={1.2} />
            </div>
          ) : frame.platform.phase === 'lobby' ? (
            <Lobby frame={frame} code={code} />
          ) : frame.platform.phase === 'loading' || !gameUI || frame.game == null ? (
            <div className="screen-center">
              <div className="stack" style={{ justifyItems: 'center', gap: '2em' }}>
                <Logo size={1.3} />
                <div className="mp-spinner" />
              </div>
            </div>
          ) : frame.platform.phase === 'results' ? (
            <div className="screen-center">
              <div style={{ width: 'min(70em, 90vw)' }}>
                <Scoreboard frame={frame} large />
              </div>
            </div>
          ) : (
            <>
              <GameBoundary resetKey={frame.seq}>
                <gameUI.Display
                  kit={kit}
                  lang={lang}
                  t={(x: { 'pt-BR': string; en: string }) => x[lang]}
                  platform={frame.platform}
                  view={frame.game}
                />
              </GameBoundary>
              <DealerStrip frame={frame} />
              <div className="tv-corner tv-corner--tr">
                <span className="mp-eyebrow">{code}</span>
              </div>
            </>
          )}
          <StatusOverlay state={state} />
          {state.fx && <FxFlash key={state.fx.nonce} />}
        </Stage>
      </RoomTimeContext.Provider>
    </LangContext.Provider>
  );
}

function Lobby({ frame, code }: { frame: PublicFrame; code: string }) {
  const { tg } = useT();
  const t = makeT(frame.platform.lang);
  const joinUrl = `${location.origin}/r/${code}`;
  const [qr, setQr] = useState('');
  const [games, setGames] = useState<RegistryEntry[]>([]);
  useEffect(() => {
    void QRCode.toString(joinUrl, { type: 'svg', margin: 0, color: { dark: '#0c0810', light: '#f3e9dc' } }).then(setQr);
    void listGames().then(setGames);
  }, [joinUrl]);
  const game = useMemo(() => games.find((g) => g.manifest.id === frame.platform.game?.id)?.manifest, [games, frame]);
  const players = frame.platform.players;

  return (
    <div className="tv-lobby">
      <div className="tv-join mp-enter">
        <Logo size={1.15} />
        <div className="tv-url">
          {t('lobby.join')} <b>{location.host}</b> {t('lobby.withCode')}
        </div>
        <div className="tv-code mp-title">{code}</div>
        <div className="row" style={{ gap: '1.4em' }}>
          <span className="tv-url">{t('lobby.scan')}</span>
          <div className="tv-qr" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </div>

      <div className="stack" style={{ gap: '2em', alignContent: 'center' }}>
        {game && (
          <div
            className="mp-panel mp-enter"
            key={game.id}
            style={{ boxShadow: `0 0 0 1px ${game.accent}, 0 30px 80px -30px ${game.accent}` }}
          >
            <span className="mp-eyebrow">{t('lobby.chosen')}</span>
            <h2 className="mp-title" style={{ fontSize: '3em', margin: '0.2em 0' }}>
              {tg(game.name)}
            </h2>
            <p className="mp-subtitle" style={{ fontSize: '1.4em' }}>
              {tg(game.description)}
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '1.1em' }}>
              {t('lobby.need', { min: game.minPlayers, max: game.maxPlayers })}
            </p>
          </div>
        )}
        <div>
          <h3 className="section-title" style={{ fontSize: '1.1em' }}>
            {t('lobby.players')} · {players.length}
          </h3>
          <div className="tv-players">
            {players.map((p, i) => (
              <div className="tv-player mp-enter" key={p.id} style={{ animationDelay: `${i * 60}ms` }}>
                <Avatar
                  emoji={p.avatar}
                  size={96}
                  offline={!p.connected}
                  active={p.isAdmin}
                  badge={p.isAdmin ? '♛' : p.remote ? '🌐' : undefined}
                />
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Platform-level dealer status shown over any game that uses the Dealer. */
function DealerStrip({ frame }: { frame: PublicFrame }) {
  const t = makeT(frame.platform.lang);
  const d = frame.platform.dealer;
  if (!d.current && d.queue.length === 0) return null;
  const byId = (id: string) => frame.platform.players.find((p) => p.id === id);
  const cur = d.current ? byId(d.current) : null;
  return (
    <div className="tv-corner tv-corner--bl mp-enter">
      <span className="mp-eyebrow">🃏 Dealer</span>
      {cur && (
        <span className="row" style={{ gap: '0.5em' }}>
          <Avatar emoji={cur.avatar} size={36} crimson={!d.verified} active={d.verified} />
          <b>{cur.name}</b>
          {!d.verified && <span className="mp-chip mp-chip--crimson">{t('dealer.goTo')}</span>}
        </span>
      )}
      {d.queue.length > 0 && (
        <span className="row" style={{ gap: '0.3em', color: 'var(--text-dim)' }}>
          {t('dealer.queue')}:
          {d.queue.map((id) => (
            <Avatar key={id} emoji={byId(id)?.avatar ?? '?'} size={28} />
          ))}
        </span>
      )}
    </div>
  );
}

function FxFlash() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'none',
        background:
          'radial-gradient(circle at 50% 50%, rgba(246,220,138,0.55), rgba(200,16,46,0.25) 40%, transparent 70%)',
        animation: 'mp-flash 1200ms ease-out forwards',
      }}
    />
  );
}
