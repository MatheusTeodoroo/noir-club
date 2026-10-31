import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GameRef, PublicFrame } from '@mp/protocol';
import type { GameUI, UIKit } from '@mp/game-sdk';
import { Avatar, Button, Countdown, Panel, RiveView, TextInput, useRoomNow } from '@mp/ui';
import { loadGameUI } from '../games/loader.ts';
import { playSound } from '../audio.ts';
import { useT } from '../i18n.ts';
import type { Session, SessionState } from './session.ts';

export const AVATARS = ['🎩', '🃏', '🎲', '🍷', '💎', '👑', '🌙', '🦊', '🦉', '🐺', '🎭', '🗝️', '⚜️', '🕯️', '🌹', '♠️'];

export const kit: UIKit = { Button, TextInput, Avatar, Countdown, Panel, RiveView, useRoomNow, playSound };

/**
 * Loads the selected game's UI bundle on demand and tells the engine this device is ready.
 * Every role (player, display, dealer) acks, so the match starts once all screens can render it.
 */
export function useGameUI(session: Session, frame: PublicFrame | null): GameUI | null {
  const ref = frame?.platform.game ?? null;
  const phase = frame?.platform.phase;
  const key = ref ? `${ref.id}@${ref.version}` : null;
  const [ui, setUi] = useState<{ key: string; ui: GameUI } | null>(null);

  useEffect(() => {
    if (!ref || !key || phase === 'lobby') return;
    let alive = true;
    loadGameUI(ref)
      .then((loaded) => {
        if (!alive) return;
        setUi({ key, ui: loaded });
      })
      .catch((err) => console.error('game ui load failed', err));
    return () => {
      alive = false;
    };
  }, [key, phase === 'lobby']);

  const loaded = ui && ui.key === key ? ui.ui : null;

  useEffect(() => {
    if (loaded && ref && phase === 'loading') session.send({ type: 'ready', game: ref satisfies GameRef });
  }, [loaded, phase, key]);

  return loaded;
}

/**
 * Connection and pause states over any screen. `onLeave` (TVs) adds a button to drop this room
 * while it can't be reached, back to the pairing screen.
 */
export function StatusOverlay({ state, onLeave }: { state: SessionState; onLeave?(): void }) {
  const { t } = useT();
  const pub = state.public?.platform;
  if (state.closed) return <RoomClosed reason={state.closed} />;
  let message: string | null = null;
  let canLeave = false;
  if (state.kicked) message = t('status.kicked');
  else if (state.status === 'reconnecting' || state.status === 'connecting') {
    // A TV that never got in (relay down, room gone) still needs the way out.
    message = state.you || (onLeave && state.status === 'reconnecting') ? t('status.reconnecting') : null;
    canLeave = true;
  } else if (state.you?.role === 'viewer' && pub && !pub.remoteScreens) {
    // A player's own screen while the Host has remote screens off.
    message = t('remote.off');
    canLeave = true;
  } else if (state.engineId && !state.engineOnline) {
    message = t('status.engineOffline');
    canLeave = true;
  }
  else if (state.engineId && !state.engineOnline) message = t('status.engineOffline');
  else if (pub?.paused?.playerId) {
    const name = pub.players.find((p) => p.id === pub.paused!.playerId)?.name ?? '?';
    message = t('status.paused', { name });
  }
  if (!message) return null;
  const paused = pub?.paused;
  return (
    <div className="mp-overlay" role="status">
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center' }}>
        {paused?.until && !(state.engineId && !state.engineOnline) ? (
          <Countdown deadline={paused.until} total={20_000} size={120} />
        ) : (
          <div className="mp-spinner" />
        )}
        <p className="mp-subtitle" style={{ fontSize: '1.6rem', maxWidth: 520 }}>
          {message}
        </p>
        {onLeave && canLeave && (
          <Button small variant="ghost" onClick={onLeave}>
            {t('tv.reset')}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The room no longer exists. Phones go back home; TVs never see this (they return to pairing). */
function RoomClosed({ reason }: { reason: NonNullable<SessionState['closed']> }) {
  const { t } = useT();
  return (
    <div className="mp-overlay" role="status">
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center', padding: 16 }}>
        <h2 className="mp-title" style={{ fontSize: '1.8rem' }}>
          {t('status.closedTitle')}
        </h2>
        <p className="mp-subtitle" style={{ fontSize: '1.2rem', maxWidth: 520 }}>
          {t(reason === 'host' ? 'status.closedHost' : reason === 'idle' ? 'status.closedIdle' : 'status.closedGone')}
        </p>
        <Button onClick={() => location.assign('/')}>{t('status.backHome')}</Button>
      </div>
    </div>
  );
}

export function Scoreboard({ frame, large }: { frame: PublicFrame; large?: boolean }) {
  const { t } = useT();
  const players = frame.platform.players;
  const rows = useMemo(() => {
    const results = frame.platform.results ?? players.map((p) => ({ playerId: p.id, score: 0 }));
    return results.map((r) => ({ ...r, player: players.find((p) => p.id === r.playerId) })).filter((r) => r.player);
  }, [frame]);
  return (
    <div style={{ display: 'grid', gap: large ? 18 : 10 }}>
      <div className="mp-eyebrow" style={{ textAlign: 'center' }}>
        {t('results.title')}
      </div>
      {rows.map((r, i) => (
        <div
          key={r.playerId}
          className="mp-enter"
          style={{
            animationDelay: `${i * 120}ms`,
            display: 'flex',
            alignItems: 'center',
            gap: large ? 20 : 12,
            padding: large ? '14px 22px' : '8px 14px',
            borderRadius: 999,
            background:
              i === 0 ? 'linear-gradient(90deg, rgba(212,175,55,0.25), transparent)' : 'rgba(255,255,255,0.03)',
            boxShadow: i === 0 ? '0 0 0 1px var(--gold) inset' : '0 0 0 1px var(--line) inset',
          }}
        >
          <span className="mp-title" style={{ fontSize: large ? '2rem' : '1.1rem', width: large ? 48 : 28 }}>
            {i + 1}
          </span>
          <Avatar emoji={r.player!.avatar} size={large ? 64 : 40} active={i === 0} />
          <span style={{ flex: 1, fontSize: large ? '1.6rem' : '1rem', fontWeight: 600 }}>{r.player!.name}</span>
          <span className="mp-title" style={{ fontSize: large ? '2rem' : '1.2rem' }}>
            +{r.score}
          </span>
          <span
            style={{
              color: 'var(--text-mute)',
              fontSize: large ? '1.1rem' : '0.8rem',
              minWidth: large ? 90 : 60,
              textAlign: 'right',
            }}
          >
            Σ {r.player!.score} {t('results.points')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Logo({ size = 1 }: { size?: number }) {
  const { t } = useT();
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: `${0.5 * size}em` }}>
      <RiveView
        src="/rive/platform.riv"
        artboard="Logo"
        style={{ width: `${13 * size}em`, height: `${13 * size}em` }}
        fallback={<img src="/favicon.svg" alt="" style={{ width: `${7 * size}em`, height: `${7 * size}em` }} />}
      />
      <h1 className="mp-title" style={{ fontSize: `${2.6 * size}em`, textAlign: 'center' }}>
        {t('brand.name')}
      </h1>
      <p className="mp-subtitle" style={{ fontSize: `${1.2 * size}em` }}>
        {t('brand.tagline')}
      </p>
    </div>
  );
}

/** A game bug must never blank a TV: show a spinner and retry on the next frame instead. */
export class GameBoundary extends Component<
  { children: ReactNode; resetKey: unknown },
  { failed: boolean; key: unknown }
> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromProps(props: { resetKey: unknown }, state: { failed: boolean; key: unknown }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[game ui]', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="screen-center">
          <div className="mp-spinner" />
        </div>
      );
    }
    return this.props.children;
  }
}
