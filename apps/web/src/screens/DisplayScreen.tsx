import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { PublicFrame } from '@mp/protocol';
import { Avatar, RiveView, RoomTimeContext, Stage } from '@mp/ui';
import { LangContext, makeT, playerRange, useT } from '../i18n.ts';
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
              {/* Platform overlays live in the bottom corners; the top of the screen belongs to the game. */}
              <div className="tv-corner tv-corner--br">
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

/** Rows x columns that fit the lobby stage at each avatar size (see .tv-players-- in app.css). */
const DENSITIES = [
  { name: 'roomy', max: 8 },
  { name: 'cozy', max: 15 },
  { name: 'packed', max: 28 },
  { name: 'crowded', max: 50 },
] as const;

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
  const active = players.filter((p) => p.connected && !p.spectator).length;
  // Avatars shrink as the room fills; each density is sized so its rows fit the stage exactly.
  const density = DENSITIES.find((d) => players.length <= d.max) ?? DENSITIES[DENSITIES.length - 1]!;
  const overflow = players.length > density.max;
  const visible = overflow ? players.slice(0, density.max - 1) : players;

  return (
    <div className="tv-lobby">
      <header className="tv-lobby-head mp-enter">
        <RiveView
          src="/rive/platform.riv"
          artboard="Logo"
          className="tv-lobby-logo"
          fallback={<img src="/favicon.svg" alt="" className="tv-lobby-logo" />}
        />
        <div>
          <h1 className="mp-title tv-lobby-brand">{t('brand.name')}</h1>
          <p className="mp-subtitle tv-lobby-tagline">{t('brand.tagline')}</p>
        </div>
        <div className="tv-lobby-stats">
          <span className="mp-chip">
            👥 {active} {t('lobby.players').toLowerCase()}
          </span>
          {frame.platform.displays > 1 && <span className="mp-chip">📺 {frame.platform.displays}</span>}
          {frame.platform.dealers > 0 && <span className="mp-chip mp-chip--crimson">🃏 Dealer</span>}
        </div>
      </header>

      <section className="tv-join mp-panel mp-enter">
        <span className="mp-eyebrow">
          {t('lobby.join')} <b className="tv-join-host">{location.host}</b>
        </span>
        <div className="tv-join-body">
          <div className="tv-join-code">
            <span className="tv-join-label">{t('lobby.withCode')}</span>
            <div className="tv-code mp-title">{code}</div>
          </div>
          <div className="tv-join-or">✦</div>
          <div className="tv-join-qr">
            <div className="tv-qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <span className="tv-join-label">{t('lobby.scan')}</span>
          </div>
        </div>
      </section>

      <section className="tv-room">
        {game ? (
          <div className="tv-game mp-enter" key={game.id} style={{ ['--accent' as string]: game.accent }}>
            <span className="mp-eyebrow">{t('lobby.chosen')}</span>
            <h2 className="mp-title tv-game-name">{tg(game.name)}</h2>
            <p className="mp-subtitle tv-game-desc">{tg(game.description)}</p>
            <div className="row wrap tv-game-meta">
              <span className="mp-chip">
                👥 {playerRange(game, t)}
              </span>
              <span className="mp-chip">⏱ ~{game.estimatedMinutes} min</span>
              {game.usesDealer && <span className="mp-chip mp-chip--crimson">🃏 Dealer</span>}
            </div>
          </div>
        ) : (
          <div className="tv-game tv-game--waiting mp-enter">
            <div className="mp-spinner" />
            <p className="mp-subtitle tv-game-desc">{t('lobby.waiting')}</p>
          </div>
        )}

        <div className={`tv-players tv-players--${density.name}`}>
          {visible.map((p, i) => (
            <div className="tv-player mp-enter" key={p.id} style={{ animationDelay: `${i * 60}ms` }}>
              <Avatar
                emoji={p.avatar}
                size="var(--tv-avatar)"
                offline={!p.connected}
                active={p.isAdmin}
                badge={p.isAdmin ? '♛' : p.remote ? '🌐' : undefined}
              />
              <span className="tv-player-name">{p.name}</span>
            </div>
          ))}
          {overflow && (
            <div className="tv-player">
              <div className="tv-player-more">+{players.length - visible.length}</div>
            </div>
          )}
        </div>
      </section>
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
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        pointerEvents: 'none',
        background:
          'radial-gradient(circle at 50% 50%, rgba(246,220,138,0.55), rgba(200,16,46,0.25) 40%, transparent 70%)',
        animation: 'mp-flash 1200ms ease-out forwards',
      }}
    />
  );
}
