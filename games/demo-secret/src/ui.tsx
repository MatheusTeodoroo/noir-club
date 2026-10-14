import { useEffect, useState } from 'react';
import { defineGameUI, type DealerProps, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { DealerView, PlayerView, PublicView } from './logic.ts';

// Game UI only shares `react` with the platform; the design system arrives through `kit`.
// Styles are scoped with the `ds-` prefix and injected by the components themselves.

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  visitTitle: { 'pt-BR': 'Visitem o Dealer', en: 'Visit the Dealer' },
  visitSub: {
    'pt-BR': 'Cada um descobre seu número secreto, sozinho.',
    en: 'Each of you learns your secret number, alone.',
  },
  discussTitle: { 'pt-BR': 'Discutam', en: 'Discuss' },
  discussSub: {
    'pt-BR': 'Quem guarda o maior número? Blefe à vontade.',
    en: 'Who holds the highest number? Bluff freely.',
  },
  voteTitle: { 'pt-BR': 'Votem', en: 'Vote' },
  voteSub: { 'pt-BR': 'Em quem você aposta?', en: 'Who are you betting on?' },
  revealTitle: { 'pt-BR': 'A revelação', en: 'The reveal' },
  highest: { 'pt-BR': 'Maior número', en: 'Highest number' },
  goDealer: { 'pt-BR': 'Vá ao Dealer para descobrir seu número.', en: 'Go to the Dealer to learn your number.' },
  known: { 'pt-BR': 'Você já conhece seu número. Guarde segredo.', en: 'You know your number. Keep it secret.' },
  missed: { 'pt-BR': 'Você não visitou o Dealer. Jogue no escuro.', en: 'You missed the Dealer. Play blind.' },
  talk: { 'pt-BR': 'Converse. Minta. Observe.', en: 'Talk. Lie. Watch.' },
  pick: { 'pt-BR': 'Escolha quem tem o maior número', en: 'Pick who holds the highest number' },
  voted: { 'pt-BR': 'Voto registrado. Pode mudar até o fim.', en: 'Vote cast. You can change it until time runs out.' },
  yourNumber: { 'pt-BR': 'Seu número era', en: 'Your number was' },
  memorize: { 'pt-BR': 'Memorize. Não conte a ninguém.', en: 'Memorize it. Tell no one.' },
  yourSecret: { 'pt-BR': 'Seu número secreto', en: 'Your secret number' },
} satisfies Record<string, I18nText>;

const CSS = `
.ds-wrap{position:relative;height:100vh;display:grid;grid-template-rows:auto 1fr;padding:3em 4em;gap:2em}
.ds-head{display:flex;align-items:flex-end;justify-content:space-between;gap:2em}
.ds-h1{font-family:var(--font-display);font-weight:900;font-size:5em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.ds-sub{font-family:var(--font-serif);font-style:italic;font-size:2em;color:var(--text-dim);margin:.3em 0 0}
.ds-grid{display:flex;flex-wrap:wrap;gap:2.4em;justify-content:center;align-content:center}
.ds-seat{display:grid;justify-items:center;gap:.7em;font-weight:600;font-size:1.3em;transition:opacity .4s}
.ds-seat--dim{opacity:.45}
.ds-mark{font-size:.8em;color:var(--gold)}
.ds-cards{display:flex;flex-wrap:wrap;gap:1.6em;justify-content:center;align-content:center;perspective:1600px}
.ds-card{width:9em;height:13em;position:relative;transform-style:preserve-3d;animation:ds-flip 900ms cubic-bezier(.2,.8,.2,1) both}
.ds-face{position:absolute;inset:0;border-radius:1em;backface-visibility:hidden;display:grid;place-items:center;align-content:center;gap:.4em;padding:.8em}
.ds-back{background:repeating-linear-gradient(45deg,#2a0a12 0 10px,#1a0509 10px 20px);box-shadow:0 0 0 2px var(--gold-lo) inset,0 20px 50px -20px #000}
.ds-back::after{content:'♠';font-size:3.4em;color:var(--gold);opacity:.8}
.ds-front{transform:rotateY(180deg);background:linear-gradient(160deg,#f6ead2,#d9c39a);color:#1a0f05;box-shadow:0 0 0 2px var(--gold) inset,0 24px 60px -20px #000}
.ds-card--win .ds-front{background:linear-gradient(160deg,#ffe28a,#d4af37);box-shadow:0 0 0 3px #fff6 inset,0 0 60px rgba(246,220,138,.8)}
.ds-num{font-family:var(--font-display);font-weight:900;font-size:4.2em;line-height:1}
.ds-name{font-weight:700;font-size:1.05em;text-align:center}
.ds-votes{display:flex;gap:.2em;flex-wrap:wrap;justify-content:center;min-height:1.6em;font-size:1.1em}
.ds-gain{font-family:var(--font-display);font-weight:700;color:#7a0a1c}
.ds-crown{position:absolute;top:-.9em;left:50%;transform:translateX(-50%) rotateY(180deg);font-size:2.4em;filter:drop-shadow(0 0 12px #f6dc8a)}
@keyframes ds-flip{from{transform:rotateY(0)}to{transform:rotateY(180deg)}}
.ds-big{font-family:var(--font-display);font-weight:900;font-size:18em;line-height:1;margin:0;
  background:linear-gradient(180deg,#fff3c4,var(--gold) 55%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 40px rgba(212,175,55,.45));animation:ds-rise 900ms cubic-bezier(.16,1,.3,1) both}
@keyframes ds-rise{from{opacity:0;transform:scale(.6) translateY(.2em);filter:blur(12px)}}
.ds-phone{display:grid;gap:14px}
.ds-cand{display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;border-radius:16px;border:0;cursor:pointer;color:var(--text);
  background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset;font:inherit;font-weight:600;text-align:left;transition:box-shadow .2s,background .2s}
.ds-cand[aria-pressed=true]{background:rgba(200,16,46,.18);box-shadow:0 0 0 2px var(--crimson) inset}
.ds-note{font-family:var(--font-serif);font-style:italic;font-size:1.25rem;color:var(--text-dim);text-align:center;margin:0}
`;

function Styles() {
  return <style>{CSS}</style>;
}

function phaseTotalMs(view: { phase: PublicView['phase'] }, config: Record<string, unknown>) {
  const s = (k: string, d: number) => (Number(config[k]) || d) * 1000;
  switch (view.phase) {
    case 'visit':
      return s('visitSeconds', 180);
    case 'discuss':
      return s('discussSeconds', 60);
    case 'vote':
      return s('voteSeconds', 30);
    default:
      return 12_000;
  }
}

// ---------------------------------------------------------------------------
// Display (public board)
// ---------------------------------------------------------------------------

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const players = platform.players.filter((p) => !p.spectator);
  const paused = !!platform.paused;
  const titles = {
    visit: [L.visitTitle, L.visitSub],
    discuss: [L.discussTitle, L.discussSub],
    vote: [L.voteTitle, L.voteSub],
    reveal: [L.revealTitle, L.highest],
  } as const;
  const [title, sub] = titles[view.phase];

  return (
    <div className="ds-wrap">
      <Styles />
      <header className="ds-head mp-enter" key={view.phase + view.round}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(L.round)} {view.round}/{view.rounds}
          </span>
          <h1 className="ds-h1">{t(title)}</h1>
          <p className="ds-sub">{t(sub)}</p>
        </div>
        {view.phase !== 'reveal' && (
          <Countdown
            deadline={view.deadline}
            total={phaseTotalMs(view, platform.gameConfig)}
            size={180}
            paused={paused}
          />
        )}
      </header>

      {view.phase === 'reveal' && view.reveal ? (
        <Reveal view={view} players={players} />
      ) : (
        <div className="ds-grid">
          {players.map((p) => {
            const atDealer = view.atDealer === p.id;
            const visited = view.visited.includes(p.id);
            const voted = view.voted.includes(p.id);
            const done = view.phase === 'visit' ? visited && !atDealer : view.phase === 'vote' ? voted : true;
            return (
              <div key={p.id} className={`ds-seat ${done ? '' : 'ds-seat--dim'}`}>
                <Avatar
                  emoji={p.avatar}
                  size={120}
                  active={view.phase === 'vote' && voted}
                  crimson={atDealer}
                  offline={!p.connected}
                  badge={
                    view.phase === 'visit'
                      ? atDealer
                        ? '🃏'
                        : visited
                          ? '✓'
                          : '…'
                      : view.phase === 'vote'
                        ? voted
                          ? '✉'
                          : '…'
                        : undefined
                  }
                />
                <span>{p.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Reveal({ view, players }: { view: PublicView; players: DisplayProps['platform']['players'] }) {
  const reveal = view.reveal!;
  const order = [...players].sort((a, b) => (reveal.numbers[a.id] ?? 0) - (reveal.numbers[b.id] ?? 0));
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar ?? '?';
  // Cards start flipping right after the drumroll (2.5s, matching the synced `reveal` cue).
  return (
    <div className="ds-cards">
      {order.map((p, i) => {
        const win = p.id === reveal.winnerId;
        const voters = Object.entries(reveal.votes)
          .filter(([, target]) => target === p.id)
          .map(([voter]) => voter);
        return (
          <div
            key={p.id}
            className={`ds-card ${win ? 'ds-card--win' : ''}`}
            style={{ animationDelay: `${2500 + i * 450}ms` }}
          >
            <div className="ds-face ds-back" />
            <div className="ds-face ds-front">
              {win && <span className="ds-crown">👑</span>}
              <span style={{ fontSize: '2em' }}>{p.avatar}</span>
              <span className="ds-num">{reveal.numbers[p.id] ?? '—'}</span>
              <span className="ds-name">{p.name}</span>
              <span className="ds-votes">
                {voters.map((v) => (
                  <span key={v}>{avatarOf(v)}</span>
                ))}
              </span>
              {(reveal.gained[p.id] ?? 0) > 0 && <span className="ds-gain">+{reveal.gained[p.id]}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player phone (controls only)
// ---------------------------------------------------------------------------

function Player({ view, kit, t, send, platform }: PlayerProps<PlayerView>) {
  const { Avatar, Countdown, Panel } = kit;
  const [optimistic, setOptimistic] = useState<string | null>(null);
  useEffect(() => setOptimistic(null), [view?.myVote, view?.phase]);
  if (!view) return null;
  const myVote = optimistic ?? view.myVote;

  return (
    <div className="ds-phone">
      <Styles />
      <Panel className="stack" style={{ justifyItems: 'center', gap: 12, textAlign: 'center' }}>
        {view.phase !== 'reveal' && (
          <Countdown
            deadline={view.deadline}
            total={phaseTotalMs(view, platform.gameConfig)}
            size={84}
            paused={!!platform.paused}
          />
        )}
        {view.phase === 'visit' && <p className="ds-note">{t(view.visited ? L.known : L.goDealer)}</p>}
        {view.phase === 'discuss' && <p className="ds-note">{t(view.visited ? L.talk : L.missed)}</p>}
        {view.phase === 'vote' && <p className="ds-note">{t(myVote ? L.voted : L.pick)}</p>}
        {view.phase === 'reveal' && (
          <>
            <span className="mp-eyebrow">{t(L.yourNumber)}</span>
            <p className="ds-big" style={{ fontSize: '7rem' }}>
              {view.revealedNumber ?? '—'}
            </p>
          </>
        )}
      </Panel>

      {view.phase === 'vote' &&
        view.candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            className="ds-cand"
            aria-pressed={myVote === c.id}
            onClick={() => {
              setOptimistic(c.id);
              send({ type: 'vote', target: c.id });
            }}
          >
            <Avatar emoji={c.avatar} size={40} crimson={myVote === c.id} />
            <span style={{ flex: 1 }}>{c.name}</span>
            {myVote === c.id && <span>✦</span>}
          </button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dealer (isolated room)
// ---------------------------------------------------------------------------

function Dealer({ view, t, playerName }: DealerProps<DealerView>) {
  return (
    <div className="screen-center" style={{ textAlign: 'center' }}>
      <Styles />
      <div style={{ display: 'grid', gap: '1em', justifyItems: 'center' }}>
        <span className="mp-eyebrow" style={{ fontSize: '1.4em' }}>
          {t(L.yourSecret)}
          {playerName ? ` · ${playerName}` : ''}
        </span>
        <p className="ds-big" data-testid="secret-number">
          {view.number}
        </p>
        <p className="ds-sub">{t(L.memorize)}</p>
      </div>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });
