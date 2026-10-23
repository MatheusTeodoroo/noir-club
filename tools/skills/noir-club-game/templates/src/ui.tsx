import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { PlayerView, PublicView } from './logic.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`, text goes through `t()`, and styles
// are scoped with the `__P__-` prefix.

type T = (text: I18nText) => string;

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
  tutorial: { 'pt-BR': 'Tutorial', en: 'Tutorial' },
  hostAdvances: { 'pt-BR': 'O Host avança pelo celular', en: 'The Host moves on from their phone' },
  followTv: { 'pt-BR': 'Acompanhe o tutorial na TV.', en: 'Follow the tutorial on the TV.' },
  prev: { 'pt-BR': 'Anterior', en: 'Back' },
  next: { 'pt-BR': 'Próximo', en: 'Next' },
  start: { 'pt-BR': 'Começar', en: 'Start' },
  skip: { 'pt-BR': 'Pular tutorial', en: 'Skip tutorial' },
  rules: { 'pt-BR': 'Regras', en: 'Rules' },
  showOnTv: { 'pt-BR': 'Mostrar na TV', en: 'Show on TV' },
  hideFromTv: { 'pt-BR': 'Tirar da TV', en: 'Hide from TV' },
  close: { 'pt-BR': 'Fechar', en: 'Close' },
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
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
/* Tutorial slide (TV) */
.__P__-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em}
.__P__-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.__P__-slide b,.__P__-rules b{color:var(--gold-hi);font-weight:600}
.__P__-dots{display:flex;gap:.6em;margin-top:1.5em}
.__P__-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.__P__-dots span[data-on='true']{background:var(--gold)}
.__P__-demo{display:flex;flex-wrap:wrap;gap:1em;justify-content:center;font-size:1.4em}
/* Rules overlay (TV) and reader (phone) */
.__P__-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.__P__-tvrules .mp-panel{width:min(60em,90vw);padding:2.4em 3em}
.__P__-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.__P__-tvrules p{font-size:1.5em;line-height:1.45;margin:0 0 .6em}
.__P__-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.__P__-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.__P__-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.__P__-rules p{margin:0;line-height:1.5}
.__P__-row{display:flex;gap:8px}
.__P__-row > *{flex:1}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** (and, in richer games, {icon} tokens) inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

// ---------------------------------------------------------------------------
// Tutorial and rules (every game has both)
// ---------------------------------------------------------------------------

/** Small live illustrations next to each slide, drawn with the game's real pieces. */
function SlideDemo({ demo, kit }: { demo: (typeof SLIDES)[number]['demo']; kit: DisplayProps['kit'] }) {
  const { Avatar } = kit;
  if (demo === 'pick') {
    return (
      <div className="__P__-demo">
        <Avatar emoji="🎩" size="6em" active badge="✓" />
        <Avatar emoji="🦊" size="6em" badge="…" />
        <Avatar emoji="🌙" size="6em" active badge="✓" />
      </div>
    );
  }
  return (
    <div className="__P__-demo">
      {[5, 5, 3, 2].map((n, i) => (
        <span key={i} className="__P__-num" style={{ animationDelay: `${i * 250}ms`, opacity: n === 5 ? 0.35 : 1 }}>
          {n}
        </span>
      ))}
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="__P__-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="__P__-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="__P__-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="__P__-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="__P__-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: DisplayProps['kit']; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="__P__-tvrules">
      <Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
      </Panel>
    </div>
  );
}

/** Full rules on the phone: anyone can read them; the Host can mirror the page on the TV. */
function RulesReader({
  view,
  kit,
  t,
  send,
  isHost,
  onClose,
}: {
  view: PlayerView;
  kit: PlayerProps['kit'];
  t: T;
  send(a: unknown): void;
  isHost: boolean;
  onClose(): void;
}) {
  const { Button, Panel } = kit;
  const [page, setPage] = useState(view.tvRules ?? 0);
  const onTv = isHost && view.tvRules !== null;
  useEffect(() => {
    if (onTv) send({ type: 'tvRules', page });
  }, [page]);
  const r = RULES[page]!;
  const last = page === RULES.length - 1;
  return (
    <div className="__P__-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="__P__-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {last && CREDITS && (
          <p>
            <b>{t(L.credits)}</b> — {t(CREDITS)}
          </p>
        )}
        <div className="__P__-row">
          <Button small variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹ {t(L.prev)}
          </Button>
          <Button small variant="ghost" disabled={last} onClick={() => setPage(page + 1)}>
            {t(L.next)} ›
          </Button>
        </div>
        {isHost && (
          <Button small onClick={() => send({ type: 'tvRules', page: onTv ? null : page })}>
            📺 {t(onTv ? L.hideFromTv : L.showOnTv)}
          </Button>
        )}
        <Button
          small
          variant="ghost"
          onClick={() => {
            if (onTv) send({ type: 'tvRules', page: null });
            onClose();
          }}
        >
          {t(L.close)}
        </Button>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TV
// ---------------------------------------------------------------------------

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const players = platform.players.filter((p) => !p.spectator);
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const winner = reveal?.winnerId ? players.find((p) => p.id === reveal.winnerId) : null;
  const rulesOverlay = view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />;

  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} kit={kit} t={t} />
        {rulesOverlay}
      </>
    );
  }

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
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel } = kit;
  // Optimistic highlight so the tap feels instant; the engine's view wins on the next frame.
  const [optimistic, setOptimistic] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  useEffect(() => setOptimistic(null), [view?.myPick, view?.phase]);
  if (!view) return null;
  const mine = optimistic ?? view.myPick;
  const isHost = you.isAdmin;

  // The rules are one tap away in every phase.
  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return (
      <div className="stack">
        <Styles />
        <Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
          {!isHost && <p className="__P__-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="__P__-row">
              <Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
                ‹ {t(L.prev)}
              </Button>
              <Button onClick={() => send({ type: 'intro', dir: 1 })}>{last ? t(L.start) : `${t(L.next)} ›`}</Button>
            </div>
            {!last && (
              <Button block small variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
                {t(L.skip)}
              </Button>
            )}
          </>
        )}
        {rulesButton}
        {reader}
      </div>
    );
  }

  if (view.phase === 'reveal') {
    return (
      <div className="stack">
        <Styles />
        <Panel>
          <p className="__P__-note">{t(L.watch)}</p>
        </Panel>
        {rulesButton}
        {reader}
      </div>
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
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
