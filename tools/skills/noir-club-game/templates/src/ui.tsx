import { useEffect, useState } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { PlayerView, PublicView } from './logic.ts';

// Only `react` and `@mp/game-sdk` may be imported here. Platform components come in through
// `kit`, text goes through `t()`, and styles are scoped with the `__P__-` prefix.

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  pickTitle: { 'pt-BR': 'Escolham', en: 'Pick' },
  pickSub: {
    'pt-BR': 'O maior número que ninguém repetir leva os pontos.',
    en: 'The highest number nobody repeats scores.',
  },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  nobody: { 'pt-BR': 'Todos empataram — ninguém pontua.', en: 'Everyone tied — nobody scores.' },
  wins: { 'pt-BR': 'leva', en: 'takes' },
  choose: { 'pt-BR': 'Escolha em segredo', en: 'Choose in secret' },
  locked: {
    'pt-BR': 'Escolha registrada. Pode trocar até o tempo acabar.',
    en: 'Locked in. You can change it until time runs out.',
  },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
} satisfies Record<string, I18nText>;

const CSS = `
.__P__-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr;padding:3em 4em;gap:2em}
.__P__-head{display:flex;align-items:flex-end;justify-content:space-between;gap:2em}
.__P__-h1{font-family:var(--font-display);font-weight:900;font-size:5em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.__P__-sub{font-family:var(--font-serif);font-style:italic;font-size:2em;color:var(--text-dim);margin:.3em 0 0}
.__P__-seats{display:flex;flex-wrap:wrap;gap:2.4em;justify-content:center;align-content:center}
.__P__-seat{display:grid;justify-items:center;gap:.6em;font-weight:600;font-size:1.3em}
.__P__-num{font-family:var(--font-display);font-weight:900;font-size:3em;color:var(--gold-hi);animation:__P__-pop .6s cubic-bezier(.16,1,.3,1) both}
@keyframes __P__-pop{from{opacity:0;transform:scale(.4)}}
.__P__-picks{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.__P__-pick{aspect-ratio:1;border-radius:16px;border:0;cursor:pointer;font-family:var(--font-display);font-size:2rem;font-weight:900;
  color:var(--gold-hi);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;transition:transform .15s}
.__P__-pick:active{transform:scale(.94)}
.__P__-pick[aria-pressed=true]{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.__P__-note{font-family:var(--font-serif);font-style:italic;font-size:1.25rem;color:var(--text-dim);text-align:center;margin:0}
`;

const Styles = () => <style>{CSS}</style>;

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const players = platform.players.filter((p) => !p.spectator);
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const winner = reveal?.winnerId ? players.find((p) => p.id === reveal.winnerId) : null;

  return (
    <div className="__P__-wrap">
      <Styles />
      <header className="__P__-head mp-enter" key={`${view.phase}-${view.round}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(L.round)} {view.round}/{view.rounds}
          </span>
          <h1 className="__P__-h1">{t(reveal ? L.revealTitle : L.pickTitle)}</h1>
          <p className="__P__-sub">
            {!reveal ? t(L.pickSub) : winner ? `${winner.name} ${t(L.wins)} +${reveal.points}` : t(L.nobody)}
          </p>
        </div>
        {!reveal && (
          <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />
        )}
      </header>
      <div className="__P__-seats">
        {players.map((p, i) => (
          <div key={p.id} className="__P__-seat">
            <Avatar
              emoji={p.avatar}
              size="6em"
              offline={!p.connected}
              active={reveal ? p.id === reveal.winnerId : view.picked.includes(p.id)}
              badge={!reveal && view.picked.includes(p.id) ? '✓' : undefined}
            />
            <span>{p.name}</span>
            {reveal && (
              <span className="__P__-num" style={{ animationDelay: `${2000 + i * 250}ms` }}>
                {reveal.picks[p.id] ?? '—'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Player({ view, kit, t, send, platform }: PlayerProps<PlayerView>) {
  const { Countdown, Panel } = kit;
  // Optimistic highlight so the tap feels instant; the engine's view wins on the next frame.
  const [optimistic, setOptimistic] = useState<number | null>(null);
  useEffect(() => setOptimistic(null), [view?.myPick, view?.phase]);
  if (!view) return null;
  const mine = optimistic ?? view.myPick;

  if (view.phase === 'reveal') {
    return (
      <Panel>
        <Styles />
        <p className="__P__-note">{t(L.watch)}</p>
      </Panel>
    );
  }
  return (
    <div className="stack">
      <Styles />
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <Countdown deadline={view.deadline} total={view.total ?? 0} size={84} paused={!!platform.paused} />
        <p className="__P__-note">{t(mine ? L.locked : L.choose)}</p>
      </Panel>
      <div className="__P__-picks">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="__P__-pick"
            aria-pressed={mine === n}
            onClick={() => {
              setOptimistic(n);
              send({ type: 'pick', value: n });
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default defineGameUI({ Display, Player });
