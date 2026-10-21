import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DealerFrame, Lang, PlayerFrame, PublicPlatformView } from '@mp/protocol';
import type { GameManifest, GameUI, I18nText, UIKit } from '@mp/game-sdk';
import { Avatar, Button, Countdown, Panel, RiveView, RoomTimeContext, Stage, TextInput, useRoomNow } from '@mp/ui';
import ui from '@game/src/ui.tsx';
import manifestJson from '@game/manifest.json';
import { CHANNEL, type DeviceMessage, type HostMessage } from './host.ts';

/**
 * Device screens of the playground. Each one runs in its own iframe sized like the real device,
 * so `vw`/`vh` and the TV stage unit behave exactly as on a TV or a phone. The platform parts
 * (Dealer controls, pause, scoreboard) mirror the real app; `data-pg` attributes are hooks for
 * the `window.pg` helpers.
 */

const game = ui as GameUI;
const manifest = manifestJson as GameManifest;
const kit: UIKit = { Button, TextInput, Avatar, Countdown, Panel, RiveView, useRoomNow, playSound: () => {} };
const DEALER_CALL_MS = 60_000;
const DEALER_VISIT_MS = 90_000;

/** Platform strings, in both room languages like the real app. */
const STRINGS = {
  'pt-BR': {
    preparing: 'Preparando a mesa…',
    scoreboard: 'Placar',
    paused: (name: string) => `${name} desconectou. Aguardando…`,
    remote: 'remoto',
    disconnected: 'Desconectado',
    remoteDealer: 'Com o Dealer (remoto)',
    goDealer: 'Ir ao Dealer',
    queued: (n: number) => `Fila do Dealer — posição ${n}`,
    leaveQueue: 'Sair da fila',
    yourTurn: 'Sua vez! Digite o código da tela do Dealer.',
    confirm: (n: number) => `Confirmar · ${n} tentativas`,
    inside: 'Com o Dealer',
    leaveDealer: 'Sair do Dealer',
    dealerWaits: 'O Dealer aguarda…',
    queue: 'Fila',
    remoteVisit: 'Visita remota em andamento',
    noDealerUi: 'Este jogo não tem tela de Dealer (ui.Dealer)',
    backToLobby: 'Voltar ao lobby',
    newMatch: 'Começar nova partida',
    waitingHost: 'Aguardando o Host começar…',
    lobby: 'Lobby',
    players: 'Jogadores',
  },
  en: {
    preparing: 'Setting the table…',
    scoreboard: 'Scoreboard',
    paused: (name: string) => `${name} disconnected. Waiting…`,
    remote: 'remote',
    disconnected: 'Disconnected',
    remoteDealer: 'With the Dealer (remote)',
    goDealer: 'Go to the Dealer',
    queued: (n: number) => `Dealer queue — position ${n}`,
    leaveQueue: 'Leave queue',
    yourTurn: 'Your turn! Type the code shown on the Dealer.',
    confirm: (n: number) => `Confirm · ${n} attempts`,
    inside: 'With the Dealer',
    leaveDealer: 'Leave the Dealer',
    dealerWaits: 'The Dealer awaits…',
    queue: 'Queue',
    remoteVisit: 'Remote visit in progress',
    noDealerUi: 'This game has no Dealer screen (ui.Dealer)',
    backToLobby: 'Back to lobby',
    newMatch: 'Start a new match',
    waitingHost: 'Waiting for the Host to start…',
    lobby: 'Lobby',
    players: 'Players',
  },
} as const;
const strings = (lang: Lang) => STRINGS[lang] ?? STRINGS['pt-BR'];

function useHost() {
  const [msg, setMsg] = useState<HostMessage | null>(null);
  const clock = useRef({ offset: 0, frozen: null as number | null });
  const channel = useRef<BroadcastChannel | null>(null);
  const host = useRef<{ id: string; born: number } | null>(null);
  const [fx, setFx] = useState<{ name: string; nonce: number } | null>(null);

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = (ev: MessageEvent<HostMessage | DeviceMessage>) => {
      // Other devices share the channel; only the host's state messages matter here.
      if (ev.data.t !== 'state') return;
      const m = ev.data;
      // Several control rooms may briefly share the channel: follow only the newest one.
      const h = host.current;
      if (h && m.host && m.host.id !== h.id && (m.host.born < h.born || (m.host.born === h.born && m.host.id < h.id)))
        return;
      if (m.host) host.current = m.host;
      clock.current = { offset: m.offset, frozen: m.frozen };
      setMsg(m);
      for (const e of m.events) {
        if (e.kind !== 'fx') continue;
        const delay = Math.max(0, e.at - (m.frozen ?? Date.now() + m.offset));
        setTimeout(() => setFx({ name: e.name, nonce: Math.random() }), delay);
      }
    };
    ch.postMessage({ t: 'hello' } satisfies DeviceMessage);
    return () => ch.close();
  }, []);

  const roomNow = useRef(() => clock.current.frozen ?? Date.now() + clock.current.offset).current;
  const send = (from: string, payload: unknown) =>
    channel.current?.postMessage({ t: 'action', from, payload } satisfies DeviceMessage);
  return { msg, roomNow, send, fx };
}

const tFor = (lang: Lang) => (text: I18nText) => text[lang] ?? text['pt-BR'];

/** Shows game crashes in place (with the message) instead of a blank screen. */
class Boundary extends Component<{ children: ReactNode; resetKey: unknown }, { error: string | null; key: unknown }> {
  state = { error: null as string | null, key: this.props.resetKey };
  static getDerivedStateFromProps(p: { resetKey: unknown }, s: { key: unknown }) {
    return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null;
  }
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e) };
  }
  render() {
    if (this.state.error) return <pre className="pg-crash">{this.state.error}</pre>;
    return this.props.children;
  }
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="screen-center">
      <div className="stack" style={{ justifyItems: 'center', gap: '1em' }}>
        <div className="mp-spinner" />
        <p className="mp-subtitle" style={{ fontSize: '1.4em' }}>
          {text}
        </p>
      </div>
    </div>
  );
}

function Results({ platform, large }: { platform: PublicPlatformView; large?: boolean }) {
  const s = strings(platform.lang);
  const rows = (platform.results ?? []).map((r) => ({ ...r, p: platform.players.find((x) => x.id === r.playerId) }));
  return (
    <div className="stack" style={{ gap: large ? '1em' : 10, width: large ? '60em' : '100%' }}>
      <span className="mp-eyebrow" style={{ textAlign: 'center' }}>
        {s.scoreboard}
      </span>
      {rows.map((r, i) => (
        <div key={r.playerId} className="row" style={{ gap: large ? '1em' : 10, fontSize: large ? '1.5em' : '1em' }}>
          <b className="mp-title" style={{ width: '1.5em' }}>
            {i + 1}
          </b>
          <Avatar emoji={r.p?.avatar ?? '?'} size={large ? '2.4em' : 36} active={i === 0} />
          <span style={{ flex: 1 }}>{r.p?.name}</span>
          <b className="mp-title">+{r.score}</b>
        </div>
      ))}
    </div>
  );
}

function PauseOverlay({ platform }: { platform: PublicPlatformView }) {
  if (!platform.paused?.playerId) return null;
  const name = platform.players.find((p) => p.id === platform.paused!.playerId)?.name ?? '?';
  return (
    <div className="mp-overlay">
      <div className="stack" style={{ justifyItems: 'center', gap: 16 }}>
        <Countdown deadline={platform.paused.until ?? null} total={20_000} size={110} />
        <p className="mp-subtitle" style={{ fontSize: '1.4rem' }}>
          {strings(platform.lang).paused(name)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TV
// ---------------------------------------------------------------------------

export function DisplayDevice() {
  const { msg, roomNow, fx } = useHost();
  if (!msg) return null;
  const { platform, game: view } = msg.public;
  const lang = platform.lang as Lang;
  return (
    <RoomTimeContext.Provider value={roomNow}>
      <Stage className="tv" particles={platform.phase !== 'playing'}>
        {platform.phase === 'results' ? (
          <div className="screen-center">
            <Results platform={platform} large />
          </div>
        ) : platform.phase === 'lobby' ? (
          <LobbyBoard platform={platform} />
        ) : platform.phase !== 'playing' || view == null ? (
          <Waiting text={strings(lang).preparing} />
        ) : (
          <Boundary resetKey={JSON.stringify(view)}>
            <game.Display kit={kit} lang={lang} t={tFor(lang)} platform={platform} view={view} />
          </Boundary>
        )}
        {platform.phase === 'playing' && (
          <>
            {/* The same overlays the real Display draws: keep the bottom corners free. */}
            <DealerStrip platform={platform} />
            <div className="tv-corner tv-corner--br">
              <span className="mp-eyebrow">ABCD</span>
            </div>
          </>
        )}
        <PauseOverlay platform={platform} />
        {fx && <div key={fx.nonce} className="pg-flash" title={fx.name} />}
      </Stage>
    </RoomTimeContext.Provider>
  );
}

/** Simplified version of the platform's TV lobby (the real one also shows the join code and QR). */
function LobbyBoard({ platform }: { platform: PublicPlatformView }) {
  const s = strings(platform.lang);
  return (
    <div className="screen-center">
      <div className="stack" style={{ justifyItems: 'center', gap: '2em', textAlign: 'center' }}>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {s.lobby} · {s.players} {platform.players.length}
        </span>
        <h1 className="mp-title" style={{ fontSize: '4em', lineHeight: 1.15 }}>
          {manifest.name[platform.lang] ?? manifest.name['pt-BR']}
        </h1>
        <div className="row wrap" style={{ gap: '1.6em', justifyContent: 'center' }}>
          {platform.players.map((p) => (
            <div key={p.id} className="stack" style={{ justifyItems: 'center', gap: '0.4em' }}>
              <Avatar
                emoji={p.avatar}
                size="5em"
                active={p.isAdmin}
                offline={!p.connected}
                badge={p.isAdmin ? '♛' : undefined}
              />
              <b>{p.name}</b>
            </div>
          ))}
        </div>
        <p className="mp-subtitle" style={{ fontSize: '1.5em' }}>
          {s.waitingHost}
        </p>
      </div>
    </div>
  );
}

/** What the platform shows the Host's phone outside the game: start, and a way back to the lobby. */
function HostControls({ platform, send }: { platform: PublicPlatformView; send(p: unknown): void }) {
  const s = strings(platform.lang);
  if (platform.phase === 'lobby') {
    return (
      <Button block data-pg="start" onClick={() => send({ type: 'start' })}>
        {s.newMatch}
      </Button>
    );
  }
  if (platform.phase === 'results') {
    return (
      <Button block data-pg="back-to-lobby" onClick={() => send({ type: 'backToLobby' })}>
        {s.backToLobby}
      </Button>
    );
  }
  return (
    <Button small variant="ghost" data-pg="back-to-lobby" onClick={() => send({ type: 'backToLobby' })}>
      {s.backToLobby}
    </Button>
  );
}

function DealerStrip({ platform }: { platform: PublicPlatformView }) {
  const d = platform.dealer;
  if (!d.current && d.queue.length === 0) return null;
  const by = (id: string) => platform.players.find((p) => p.id === id);
  const cur = d.current ? by(d.current) : null;
  return (
    <div className="tv-corner tv-corner--bl">
      <span className="mp-eyebrow">🃏 Dealer</span>
      {cur && (
        <span className="row" style={{ gap: '0.5em' }}>
          <Avatar emoji={cur.avatar} size="1.8em" crimson={!d.verified} active={d.verified} />
          <b>{cur.name}</b>
        </span>
      )}
      {d.queue.map((id) => (
        <Avatar key={id} emoji={by(id)?.avatar ?? '?'} size="1.4em" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

export function PlayerDevice({ id }: { id: string }) {
  const { msg, roomNow, send } = useHost();
  if (!msg) return null;
  const platform: PublicPlatformView = msg.public.platform;
  const lang = platform.lang as Lang;
  const s = strings(lang);
  const frame = msg.privates[id] as PlayerFrame | undefined;
  const me = platform.players.find((p) => p.id === id);
  return (
    <RoomTimeContext.Provider value={roomNow}>
      <Stage particles={false}>
        <div className="phone">
          <header className="phone-header">
            <Avatar emoji={me?.avatar ?? '?'} size={40} active={me?.isAdmin} />
            <div className="grow">
              <b>{me?.name}</b>
              <div style={{ color: 'var(--text-mute)', fontSize: '0.8rem' }}>
                {me?.score ?? 0} pts{me?.remote ? ` · 🌐 ${s.remote}` : ''}
              </div>
            </div>
          </header>
          {!frame ? (
            <p className="mp-subtitle">{s.disconnected}</p>
          ) : platform.phase === 'results' ? (
            <Panel>
              <Results platform={platform} />
            </Panel>
          ) : platform.phase === 'lobby' ? (
            <Panel>
              <p className="mp-subtitle" style={{ textAlign: 'center', margin: 0 }}>
                {me?.isAdmin ? (manifest.name[lang] ?? manifest.name['pt-BR']) : s.waitingHost}
              </p>
            </Panel>
          ) : platform.phase !== 'playing' || frame.game == null ? (
            <div className="mp-spinner" />
          ) : (
            <>
              {frame.platform.dealer.status === 'inside' && frame.dealerGame != null && game.Dealer && (
                <Panel className="stack">
                  <span className="mp-eyebrow">{s.remoteDealer}</span>
                  <Boundary resetKey={JSON.stringify(frame.dealerGame)}>
                    <game.Dealer
                      kit={kit}
                      lang={lang}
                      t={tFor(lang)}
                      platform={platform}
                      view={frame.dealerGame}
                      playerName=""
                    />
                  </Boundary>
                </Panel>
              )}
              <DealerBar frame={frame} lang={lang} send={(p) => send(id, p)} />
              <Boundary resetKey={JSON.stringify(frame.game)}>
                <game.Player
                  kit={kit}
                  lang={lang}
                  t={tFor(lang)}
                  platform={platform}
                  view={frame.game}
                  you={frame.platform}
                  send={(action: unknown) => send(id, { type: 'game', action })}
                />
              </Boundary>
            </>
          )}
          {frame?.platform.isAdmin && <HostControls platform={platform} send={(p) => send(id, p)} />}
        </div>
        <PauseOverlay platform={platform} />
      </Stage>
    </RoomTimeContext.Provider>
  );
}

/** The platform's dealer controls on the phone (the real app renders the same states). */
function DealerBar({ frame, lang, send }: { frame: PlayerFrame; lang: Lang; send(p: unknown): void }) {
  const [code, setCode] = useState('');
  const s = strings(lang);
  const d = frame.platform.dealer;
  if (d.status === 'none') {
    return frame.platform.canRequestDealer ? (
      <Button block variant="crimson" data-pg="dealer-request" onClick={() => send({ type: 'dealerRequest' })}>
        🃏 {s.goDealer}
      </Button>
    ) : null;
  }
  if (d.status === 'queued') {
    return (
      <Panel className="row" style={{ justifyContent: 'space-between' }}>
        <span>{s.queued(d.position)}</span>
        <Button small variant="ghost" onClick={() => send({ type: 'dealerCancel' })}>
          {s.leaveQueue}
        </Button>
      </Panel>
    );
  }
  if (d.status === 'called') {
    return (
      <Panel className="stack">
        <b>{s.yourTurn}</b>
        <input
          className="mp-input mp-input--code"
          data-pg="dealer-code"
          inputMode="numeric"
          maxLength={3}
          value={code}
          placeholder="···"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
        />
        <Button
          small
          data-pg="dealer-confirm"
          disabled={code.length !== 3}
          onClick={() => {
            send({ type: 'dealerCode', code });
            setCode('');
          }}
        >
          {s.confirm(d.attemptsLeft)}
        </Button>
      </Panel>
    );
  }
  return (
    <Panel className="row" style={{ justifyContent: 'space-between' }}>
      <Countdown deadline={d.deadline} total={DEALER_VISIT_MS} size={48} />
      <span style={{ flex: 1 }}>{s.inside}</span>
      <Button small variant="ghost" data-pg="dealer-leave" onClick={() => send({ type: 'dealerLeave' })}>
        {s.leaveDealer}
      </Button>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Dealer screen
// ---------------------------------------------------------------------------

export function DealerDevice() {
  const { msg, roomNow } = useHost();
  if (!msg) return null;
  const platform: PublicPlatformView = msg.public.platform;
  const lang = platform.lang as Lang;
  const s = strings(lang);
  const frame = msg.privates['dealer'] as DealerFrame | undefined;
  const cur = frame?.current ?? null;
  let body: ReactNode;
  if (!cur && game.Dealer && frame?.game != null) {
    // The game's standing view (dealerIdleView), shown while nobody visits.
    body = (
      <Boundary resetKey={JSON.stringify(frame.game)}>
        <game.Dealer kit={kit} lang={lang} t={tFor(lang)} platform={platform} view={frame.game} playerName="" />
      </Boundary>
    );
  } else if (!cur) {
    body = (
      <Waiting
        text={frame?.queue.length ? `${s.queue}: ${frame.queue.map((q) => q.name).join(', ')}` : s.dealerWaits}
      />
    );
  } else if (!cur.verified) {
    body = (
      <div className="screen-center">
        <div className="stack" style={{ justifyItems: 'center', gap: '1.2em', textAlign: 'center' }}>
          <Avatar emoji={cur.avatar} size="7em" crimson />
          <h2 className="mp-title" style={{ fontSize: '3.5em' }}>
            {cur.name}
          </h2>
          {cur.code ? (
            <div className="tv-dealer-code mp-title">{cur.code}</div>
          ) : (
            <p className="mp-subtitle">{s.remoteVisit}</p>
          )}
          <Countdown deadline={cur.deadline} total={DEALER_CALL_MS} size="5em" />
        </div>
      </div>
    );
  } else {
    body = (
      <>
        {/* The real Dealer screen draws these two top corners: keep them free in ui.Dealer. */}
        <div className="tv-corner tv-corner--tl">
          <Avatar emoji={cur.avatar} size="2em" active />
          <b>{cur.name}</b>
        </div>
        <div className="tv-corner tv-corner--tr">
          <Countdown deadline={cur.deadline} total={DEALER_VISIT_MS} size="3em" />
        </div>
        {game.Dealer && frame?.game != null ? (
          <Boundary resetKey={JSON.stringify(frame.game)}>
            <game.Dealer
              kit={kit}
              lang={lang}
              t={tFor(lang)}
              platform={platform}
              view={frame.game}
              playerName={cur.name}
            />
          </Boundary>
        ) : (
          <Waiting text={game.Dealer ? s.remoteVisit : s.noDealerUi} />
        )}
      </>
    );
  }
  return (
    <RoomTimeContext.Provider value={roomNow}>
      <Stage className="tv" particles={!cur?.verified}>
        {body}
      </Stage>
    </RoomTimeContext.Provider>
  );
}
