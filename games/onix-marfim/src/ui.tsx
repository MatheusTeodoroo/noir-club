import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { DuelReveal, PlayerView, PublicRound, PublicView } from './logic.ts';
import { REVEAL_AT, REVEAL_STEP_MS, ROUNDS, STONES, stoneOf, type Stone } from './shared.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`, text goes through `t()`, and styles
// are scoped with the `omg-` prefix.

type T = (text: I18nText) => string;
type Players = DisplayProps['platform']['players'];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  tiebreak: { 'pt-BR': 'Desempate', en: 'Tiebreak' },
  leadTitle: { 'pt-BR': 'Abertura', en: 'Lead' },
  answerTitle: { 'pt-BR': 'Resposta', en: 'Answer' },
  tieTitle: { 'pt-BR': 'Empate', en: 'Tie' },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  leadSub: { 'pt-BR': '{n} apresenta uma pedra', en: '{n} presents a stone' },
  answerSub: { 'pt-BR': '{a} apresentou {s} — {b} responde', en: '{a} presented {s} — {b} answers' },
  wonRound: { 'pt-BR': 'vence a rodada', en: 'wins the round' },
  tieSub: { 'pt-BR': 'Números iguais — ninguém pontua.', en: 'Equal numbers — nobody scores.' },
  numbersSecret: { 'pt-BR': 'Os números continuam em segredo.', en: 'The numbers stay secret.' },
  tiebreakSub: {
    'pt-BR': 'O duelo terminou empatado — pedras novas, placar zerado.',
    en: 'The duel ended level — fresh stones, score back to zero.',
  },
  revealSub: { 'pt-BR': 'Todos os números do duelo, rodada a rodada.', en: 'Every number of the duel, round by round.' },
  winsDuel: { 'pt-BR': '{n} vence o duelo', en: '{n} wins the duel' },
  duelTied: { 'pt-BR': 'Empate — vem aí um duelo de desempate!', en: 'Level — a tiebreak duel is coming!' },
  auto: { 'pt-BR': 'tempo esgotado: menor pedra', en: 'time up: lowest stone' },
  onyx: { 'pt-BR': 'ônix', en: 'onyx' },
  ivory: { 'pt-BR': 'marfim', en: 'ivory' },
  points: { 'pt-BR': 'pontos', en: 'points' },
  left: { 'pt-BR': 'Pedras restantes', en: 'Stones left' },
  history: { 'pt-BR': 'Rodadas', en: 'Rounds' },
  // Phone
  you: { 'pt-BR': 'Você', en: 'You' },
  yourTurn: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  pick: { 'pt-BR': 'Escolha uma pedra', en: 'Pick a stone' },
  present: { 'pt-BR': 'Apresentar o {n}', en: 'Present the {n}' },
  rivalShowed: { 'pt-BR': '{n} apresentou', en: '{n} presented' },
  youShowed: { 'pt-BR': 'Você apresentou', en: 'You presented' },
  waiting: { 'pt-BR': 'Vez de {n}…', en: 'Waiting for {n}…' },
  youWon: { 'pt-BR': 'Você venceu a rodada!', en: 'You won the round!' },
  rivalWon: { 'pt-BR': '{n} venceu a rodada.', en: '{n} won the round.' },
  youWinDuel: { 'pt-BR': 'Você venceu o duelo!', en: 'You won the duel!' },
  youLoseDuel: { 'pt-BR': '{n} venceu o duelo.', en: '{n} won the duel.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  yourStones: { 'pt-BR': 'Suas pedras', en: 'Your stones' },
  myRounds: { 'pt-BR': 'Suas rodadas', en: 'Your rounds' },
  // Tutorial and rules
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
  even: { 'pt-BR': 'pares', en: 'even' },
  odd: { 'pt-BR': 'ímpares', en: 'odd' },
} satisfies Record<string, I18nText>;

const CSS = `
.omg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.6em 4em 4.6em;gap:1em;overflow:hidden}
.omg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.omg-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.omg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.2em 0 0}
.omg-sub b{color:var(--gold-hi);font-style:normal;font-family:var(--font-ui);font-weight:600}
/* Stones */
.omg-stone{--d:1em;width:4em;height:4em;font-size:var(--d);border-radius:50%;display:grid;place-items:center;flex:none;position:relative;
  font-family:var(--font-display);font-weight:900;line-height:1}
.omg-stone[data-s='onyx']{background:radial-gradient(circle at 35% 30%,#4a4650,#16141a 55%,#050406);color:var(--gold-hi);
  box-shadow:0 .25em .7em rgba(0,0,0,.6),0 0 0 .12em var(--gold-lo) inset,inset 0 .3em .6em rgba(255,255,255,.08)}
.omg-stone[data-s='ivory']{background:radial-gradient(circle at 35% 30%,#fffdf6,#efe4c8 55%,#c9b88a);color:#2a1d0c;
  box-shadow:0 .25em .7em rgba(0,0,0,.55),0 0 0 .12em var(--gold) inset,inset 0 -.3em .6em rgba(120,90,40,.25)}
.omg-stone[data-s='empty']{background:transparent;box-shadow:0 0 0 .1em var(--line-strong) inset}
.omg-stone[data-s='empty']::after{content:'?';font-size:1.6em;color:var(--text-mute)}
.omg-stone[data-s='empty'][data-blank='true']::after{content:none}
.omg-stone span{font-size:2em}
.omg-win{box-shadow:0 0 0 .16em var(--gold-hi) inset,0 0 1.6em rgba(212,175,55,.7)!important}
.omg-lose{opacity:.45;filter:saturate(.6)}
.omg-flip{animation:omg-flip .7s cubic-bezier(.16,1,.3,1) backwards}
@keyframes omg-flip{from{transform:rotateY(90deg) scale(.85);opacity:0}}
.omg-late{animation:omg-rise .6s cubic-bezier(.16,1,.3,1) backwards}
@keyframes omg-rise{from{opacity:0;transform:translateY(.6em)}}
.omg-drop{animation:omg-drop .5s cubic-bezier(.16,1,.3,1) backwards}
@keyframes omg-drop{from{opacity:0;transform:translateY(-1.2em) scale(1.15)}}
/* Board */
.omg-board{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:2.5em;min-height:0}
.omg-seat{display:grid;justify-items:center;gap:.8em;text-align:center}
.omg-name{font-weight:600;font-size:1.6em}
.omg-score{font-family:var(--font-display);font-weight:900;font-size:4.5em;color:var(--gold-hi);line-height:1;text-shadow:0 0 .4em rgba(212,175,55,.3)}
.omg-score small{display:block;font-family:var(--font-ui);font-weight:500;font-size:.24em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute);margin-top:.35em;text-shadow:none}
.omg-left{display:flex;gap:.35em;justify-content:center;min-height:1.6em}
.omg-cap{font-size:1em;letter-spacing:.18em;text-transform:uppercase;color:var(--text-mute)}
.omg-duel{display:flex;align-items:center;gap:2.2em}
.omg-vs{font-family:var(--font-serif);font-style:italic;font-size:2.2em;color:var(--text-mute)}
.omg-slot{display:grid;justify-items:center;gap:.6em}
.omg-autotag{font-size:1em;color:var(--warn);min-height:1.3em}
/* History strip */
.omg-hist{justify-self:center;display:flex;align-items:center;gap:1.4em;padding:.8em 1.6em;border-radius:var(--radius-lg);background:rgba(255,255,255,.025);box-shadow:0 0 0 1px var(--line) inset}
.omg-hist .mp-eyebrow{font-size:1em;white-space:nowrap}
.omg-cols{display:flex;gap:1em}
.omg-col{display:grid;justify-items:center;gap:.35em}
.omg-col b{font-family:var(--font-display);font-size:1em;color:var(--text-mute)}
.omg-col[data-now='true'] b{color:var(--gold-hi)}
.omg-names{display:grid;gap:.35em;font-size:1em;color:var(--text-dim);text-align:right}
.omg-names span{height:2.4em;display:flex;align-items:center;justify-content:flex-end;gap:.4em}
/* Reveal */
.omg-reveal{display:grid;justify-items:center;gap:1.6em}
.omg-rcols{display:flex;gap:1.3em}
.omg-rcol{display:grid;justify-items:center;gap:.6em}
.omg-rcol b{font-family:var(--font-display);font-size:1.1em;color:var(--text-mute)}
.omg-rnames{display:grid;gap:.6em;font-weight:600;text-align:right}
.omg-rnames span{display:flex;align-items:center;justify-content:flex-end}
.omg-rnames b{font-size:1.4em}
.omg-banner{font-family:var(--font-display);font-size:2.6em;color:var(--gold-hi);margin:0;text-align:center}
/* Phone */
.omg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.omg-big{font-size:1.15rem}
.omg-row{display:flex;gap:8px}
.omg-row > *{flex:1}
.omg-scoreline{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;text-align:center}
.omg-scoreline b{display:block;font-family:var(--font-display);font-size:2rem;color:var(--gold-hi);line-height:1.1}
.omg-scoreline span{font-size:.8rem;color:var(--text-mute);text-transform:uppercase;letter-spacing:.08em}
.omg-hand{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;justify-items:center}
.omg-pick{appearance:none;border:0;padding:0;background:none;cursor:pointer;border-radius:50%;-webkit-tap-highlight-color:transparent;transition:transform .15s}
.omg-pick:disabled{cursor:default}
.omg-pick[data-gone='true'] .omg-stone{opacity:.12;filter:grayscale(1)}
.omg-pick[data-sel='true']{transform:translateY(-4px) scale(1.08)}
.omg-pick[data-sel='true'] .omg-stone{box-shadow:0 0 0 3px var(--gold-hi),0 0 18px rgba(212,175,55,.7)!important}
.omg-shown{display:flex;align-items:center;justify-content:center;gap:14px}
.omg-mine{display:grid;gap:6px}
.omg-mrow{display:grid;grid-template-columns:3.2em auto auto 1fr;align-items:center;gap:10px;font-size:.95rem;padding:4px 8px;border-radius:10px;background:rgba(255,255,255,.03)}
.omg-mrow em{font-style:normal;color:var(--text-mute)}
.omg-mrow i{font-style:normal;text-align:right;font-weight:600}
.omg-mrow i[data-r='w']{color:var(--ok)}
.omg-mrow i[data-r='l']{color:var(--crimson-hi)}
.omg-mrow i[data-r='t']{color:var(--text-mute)}
.omg-preveal{display:grid;grid-template-columns:auto repeat(9,1fr);gap:6px 4px;align-items:center;justify-items:center;font-size:.8rem}
/* Tutorial slide (TV) */
.omg-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em}
.omg-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.omg-slide b,.omg-rules b,.omg-tvrules b{color:var(--gold-hi);font-weight:600}
.omg-dots{display:flex;gap:.6em;margin-top:1.5em}
.omg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.omg-dots span[data-on='true']{background:var(--gold)}
.omg-demo{display:grid;justify-items:center;gap:1.4em}
.omg-demorow{display:flex;gap:1em;align-items:center;justify-content:center}
/* Rules overlay (TV) and reader (phone) */
.omg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.omg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.omg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.omg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.omg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.omg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.omg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.omg-rules p{margin:0;line-height:1.5}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

const nameOf = (players: Players, id: string | null | undefined) => players.find((p) => p.id === id)?.name ?? '—';
const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '');
const stoneName = (s: Stone, t: T) => t(s === 'onyx' ? L.onyx : L.ivory);

// ---------------------------------------------------------------------------
// Pieces shared by the TV, the phone and the tutorial demos
// ---------------------------------------------------------------------------

/**
 * A stone: `stone` null draws an empty slot; `n` shows its number (only ever the player's own, or
 * after the duel reveal). `size` is the font-size; the stone is 4× that across.
 */
function StoneDisc({
  stone,
  n,
  size,
  className = '',
  delay,
  win,
  lose,
  blank,
}: {
  stone: Stone | null;
  n?: number | null;
  size: string | number;
  className?: string;
  delay?: number;
  win?: boolean;
  lose?: boolean;
  /** An empty slot without the "?" mark. */
  blank?: boolean;
}) {
  const style = { fontSize: size, animationDelay: delay === undefined ? undefined : `${delay}ms` };
  return (
    <div
      className={`omg-stone ${className} ${win ? 'omg-win' : ''} ${lose ? 'omg-lose' : ''}`}
      data-s={stone ?? 'empty'}
      data-blank={blank}
      style={style}
      aria-label={n === undefined || n === null ? (stone ?? '?') : String(n)}
    >
      {n !== undefined && n !== null && <span>{n}</span>}
    </div>
  );
}

/** The two-row strip of finished rounds: colours only, the winner's stone glowing. */
function HistoryStrip({
  view,
  players,
  t,
  size = '.6em',
}: {
  view: PublicView;
  players: Players;
  t: T;
  size?: string;
}) {
  return (
    <div className="omg-hist">
      <span className="mp-eyebrow">{t(L.history)}</span>
      <div className="omg-names">
        {view.order.map((id) => (
          <span key={id}>{nameOf(players, id)}</span>
        ))}
      </div>
      <div className="omg-cols">
        {Array.from({ length: view.rounds }, (_, i) => {
          const r: PublicRound | undefined = view.history[i];
          return (
            <div key={i} className="omg-col" data-now={i + 1 === view.round && !r}>
              {view.order.map((id) => (
                <StoneDisc
                  key={id}
                  stone={r ? (r.stones[id] ?? null) : null}
                  size={size}
                  win={!!r && r.winnerId === id}
                  lose={!!r && r.winnerId !== null && r.winnerId !== id}
                  blank
                />
              ))}
              <b>{i + 1}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Every round of a finished duel, numbers flipping in one after another. */
function RevealGrid({ reveal, order, players, size }: { reveal: DuelReveal; order: string[]; players: Players; size: string }) {
  return (
    <div className="omg-demorow" style={{ gap: '1.4em', alignItems: 'flex-start' }}>
      <div className="omg-rnames">
        {order.map((id) => (
          <span key={id} style={{ height: `calc(4 * ${size})` }}>
            <b>{nameOf(players, id)}</b>
          </span>
        ))}
      </div>
      <div className="omg-rcols">
        {reveal.rounds.map((r, i) => (
          <div key={i} className="omg-rcol">
            {order.map((id) => {
              const n = r.tiles[id]!;
              return (
                <StoneDisc
                  key={id}
                  stone={stoneOf(n)}
                  n={n}
                  size={size}
                  className="omg-flip"
                  delay={REVEAL_AT + i * REVEAL_STEP_MS}
                  win={r.winnerId === id}
                />
              );
            })}
            <b>{i + 1}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

function SlideDemo({ demo, kit, t }: { demo: (typeof SLIDES)[number]['demo']; kit: DisplayProps['kit']; t: T }) {
  const { Avatar } = kit;
  if (demo === 'stones') {
    return (
      <div className="omg-demo">
        <div className="omg-demorow">
          {STONES.filter((n) => n % 2 === 0).map((n, i) => (
            <StoneDisc key={n} stone="onyx" n={n} size="1.05em" className="omg-drop" delay={200 + i * 120} />
          ))}
        </div>
        <span className="omg-cap">
          {t(L.onyx)} · {t(L.even)}
        </span>
        <div className="omg-demorow">
          {STONES.filter((n) => n % 2 === 1).map((n, i) => (
            <StoneDisc key={n} stone="ivory" n={n} size="1.05em" className="omg-drop" delay={900 + i * 120} />
          ))}
        </div>
        <span className="omg-cap">
          {t(L.ivory)} · {t(L.odd)}
        </span>
      </div>
    );
  }
  if (demo === 'round') {
    // The lead shows only its colour; the answer comes; the higher one (hidden) glows.
    return (
      <div className="omg-demo">
        <div className="omg-duel">
          <div className="omg-slot">
            <Avatar emoji="🎩" size="4.5em" />
            <StoneDisc stone="onyx" size="1.5em" className="omg-drop" delay={400} />
          </div>
          <span className="omg-vs">vs</span>
          <div className="omg-slot">
            <Avatar emoji="🦊" size="4.5em" active />
            <StoneDisc stone="ivory" size="1.5em" className="omg-drop omg-win" delay={1300} />
          </div>
        </div>
        <p className="omg-banner omg-late" style={{ animationDelay: '2100ms', fontSize: '1.8em' }}>
          🦊 {t(L.wonRound)}
        </p>
        <span className="omg-cap omg-late" style={{ animationDelay: '2400ms' }}>
          {t(L.numbersSecret)}
        </span>
      </div>
    );
  }
  if (demo === 'board') {
    const rows: Record<string, Stone[]> = {
      a: ['onyx', 'onyx', 'onyx', 'ivory', 'ivory', 'ivory'],
      b: ['onyx', 'onyx', 'onyx', 'onyx', 'ivory', 'ivory'],
    };
    return (
      <div className="omg-demo">
        <div className="omg-duel" style={{ gap: '4em' }}>
          {(['a', 'b'] as const).map((k, i) => (
            <div key={k} className="omg-seat">
              <Avatar emoji={i === 0 ? '🎩' : '🦊'} size="4em" />
              <div className="omg-score" style={{ fontSize: '3.4em' }}>
                {i === 0 ? 2 : 1}
                <small>{t(L.points)}</small>
              </div>
              <div className="omg-left">
                {rows[k]!.map((s, j) => (
                  <StoneDisc key={j} stone={s} size=".38em" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="omg-demorow" style={{ gap: '.8em' }}>
          {[
            ['ivory', 'onyx', 'a'],
            ['onyx', 'onyx', 'b'],
            ['onyx', 'ivory', 'a'],
          ].map(([x, y, w], i) => (
            <div key={i} className="omg-col">
              <StoneDisc stone={x as Stone} size=".55em" win={w === 'a'} lose={w !== 'a'} />
              <StoneDisc stone={y as Stone} size=".55em" win={w === 'b'} lose={w !== 'b'} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const demoReveal: DuelReveal = {
    rounds: [
      [6, 3],
      [1, 4],
      [8, 8],
    ].map(([x, y]) => ({
      starter: 'a',
      tiles: { a: x!, b: y! },
      winnerId: x === y ? null : x! > y! ? 'a' : 'b',
      auto: {},
    })),
    points: { a: 1, b: 1 },
    winnerId: null,
  };
  const fake = [
    { id: 'a', name: '🎩' },
    { id: 'b', name: '🦊' },
  ] as unknown as Players;
  return (
    <div className="omg-demo">
      <RevealGrid reveal={demoReveal} order={['a', 'b']} players={fake} size=".9em" />
      <p className="omg-banner omg-late" style={{ animationDelay: `${REVEAL_AT + 3 * REVEAL_STEP_MS}ms`, fontSize: '1.6em' }}>
        {t(L.duelTied)}
      </p>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="omg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="omg-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="omg-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="omg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="omg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: DisplayProps['kit']; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="omg-tvrules">
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
    <div className="omg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="omg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="omg-row">
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

function eyebrow(view: PublicView, t: T) {
  const round = `${t(L.round)} ${view.round}/${view.rounds}`;
  return view.duel > 1 ? `${t(L.tiebreak)} ${view.duel - 1} · ${round}` : round;
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const players = platform.players;
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

  if (view.phase === 'reveal' && view.reveal) {
    const r = view.reveal;
    const [a, b] = view.order;
    const doneAt = REVEAL_AT + r.rounds.length * REVEAL_STEP_MS;
    return (
      <div className="omg-wrap">
        <Styles />
        <header className="omg-head">
          <div className="mp-enter">
            <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
              {view.duel > 1 ? `${t(L.tiebreak)} ${view.duel - 1}` : `${ROUNDS} ${t(L.history).toLowerCase()}`}
            </span>
            <h1 className="omg-h1">{t(L.revealTitle)}</h1>
            <p className="omg-sub">{t(L.revealSub)}</p>
          </div>
        </header>
        <div className="omg-reveal">
          <RevealGrid reveal={r} order={view.order} players={players} size=".78em" />
          <div className="omg-late" style={{ animationDelay: `${doneAt}ms` }}>
            <p className="omg-banner" style={{ fontSize: '4em' }}>
              {r.points[a]} × {r.points[b]}
            </p>
            <p className="omg-banner">
              {r.winnerId ? fill(t(L.winsDuel), { n: nameOf(players, r.winnerId) }) : t(L.duelTied)}
            </p>
          </div>
        </div>
        <div />
        {rulesOverlay}
      </div>
    );
  }

  const result = view.result;
  const [a, b] = view.order;
  const responder = view.starter === a ? b : a;
  const leadStone = view.current[view.starter];
  let title: string;
  let sub: ReactNode;
  if (result) {
    title = result.winnerId ? nameOf(players, result.winnerId) : t(L.tieTitle);
    sub = result.winnerId ? `${t(L.wonRound)}. ${t(L.numbersSecret)}` : t(L.tieSub);
  } else if (!leadStone) {
    title = t(L.leadTitle);
    sub =
      view.duel > 1 && view.round === 1 ? (
        t(L.tiebreakSub)
      ) : (
        <>{rich(fill(t(L.leadSub), { n: `**${nameOf(players, view.starter)}**` }))}</>
      );
  } else {
    title = t(L.answerTitle);
    sub = (
      <>
        {rich(
          fill(t(L.answerSub), {
            a: `**${nameOf(players, view.starter)}**`,
            s: stoneName(leadStone, t),
            b: `**${nameOf(players, responder)}**`,
          }),
        )}
      </>
    );
  }

  return (
    <div className="omg-wrap">
      <Styles />
      <header className="omg-head">
        <div className="mp-enter" key={`${view.duel}-${view.round}-${view.phase}-${!!leadStone}`}>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {eyebrow(view, t)}
          </span>
          <h1 className="omg-h1">{title}</h1>
          <p className="omg-sub">{sub}</p>
        </div>
        {view.phase === 'play' && (
          <Countdown
            key={`${view.duel}-${view.round}-${view.turn}`}
            deadline={view.deadline}
            total={view.total ?? 0}
            size="7em"
            paused={!!platform.paused}
          />
        )}
      </header>

      <div className="omg-board">
        {view.order.map((id, i) => {
          const p = players.find((x) => x.id === id);
          const won = !!result && result.winnerId === id;
          return (
            <div key={id} className="omg-seat" style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1 }}>
              <Avatar
                emoji={p?.avatar ?? '🎴'}
                size="5.5em"
                active={view.turn === id || won}
                offline={p ? !p.connected : false}
              />
              <span className="omg-name">{p?.name ?? '—'}</span>
              <div className="omg-score">
                <span className="mp-enter" key={view.points[id]}>
                  {view.points[id] ?? 0}
                </span>
                <small>{t(L.points)}</small>
              </div>
              <span className="omg-cap">{t(L.left)}</span>
              <div className="omg-left">
                {(view.remaining[id] ?? []).map((s, j) => (
                  <StoneDisc key={`${j}-${s}`} stone={s} size=".42em" />
                ))}
              </div>
            </div>
          );
        })}
        <div className="omg-duel" style={{ gridColumn: 2, gridRow: 1 }}>
          {[view.starter, responder].map((id, i) => {
            const s = view.current[id] ?? null;
            const slot = (
              <div key={`${view.round}-${i}`} className="omg-slot">
                <span className="omg-cap">{nameOf(players, id)}</span>
                <StoneDisc
                  stone={s}
                  size="2em"
                  className={s ? 'omg-drop' : ''}
                  win={!!result && result.winnerId === id}
                  lose={!!result && result.winnerId !== null && result.winnerId !== id}
                />
                <span className="omg-autotag">{view.auto[id] ? t(L.auto) : ''}</span>
              </div>
            );
            return i === 0 ? slot : [<span key="vs" className="omg-vs">vs</span>, slot];
          })}
        </div>
      </div>

      <HistoryStrip view={view} players={players} t={t} />
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel } = kit;
  const [rules, setRules] = useState(false);
  // The stone chosen (not yet presented) and whether it was sent; a new turn resets both.
  const turnKey = view ? `${view.duel}-${view.round}-${view.phase}-${view.turn}` : '';
  const [sel, setSel] = useState<number | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    setSel(null);
    setSent(null);
  }, [turnKey]);
  if (!view) return null;
  const isHost = you.isAdmin;
  const players = platform.players;

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
          {!isHost && <p className="omg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="omg-row">
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

  // Spectators (not seated in the duel) only follow the TV.
  if (!view.rivalId) {
    return (
      <div className="stack">
        <Styles />
        <Panel>
          <p className="omg-note">{t(L.watch)}</p>
        </Panel>
        {rulesButton}
        {reader}
      </div>
    );
  }

  const me = you.you;
  const rival = view.rivalId;
  const rivalName = nameOf(players, rival);

  const scoreline = (
    <div className="omg-scoreline">
      <div>
        <b>{view.points[me] ?? 0}</b>
        <span>{t(L.you)}</span>
      </div>
      <span className="mp-eyebrow">{eyebrow(view, t)}</span>
      <div>
        <b>{view.points[rival] ?? 0}</b>
        <span>{rivalName}</span>
      </div>
    </div>
  );

  const myRounds = view.history.length > 0 && (
    <Panel className="stack">
      <span className="mp-eyebrow">{t(L.myRounds)}</span>
      <div className="omg-mine">
        {view.history.map((r, i) => {
          const res = r.winnerId === null ? 't' : r.winnerId === me ? 'w' : 'l';
          return (
            <div key={i} className="omg-mrow">
              <em>
                {t(L.round)} {i + 1}
              </em>
              <StoneDisc stone={stoneOf(view.myTiles[i]!)} n={view.myTiles[i]} size={8} />
              <StoneDisc stone={r.stones[rival] ?? null} size={8} />
              <i data-r={res}>{res === 'w' ? '✓' : res === 'l' ? '✗' : '='}</i>
            </div>
          );
        })}
      </div>
    </Panel>
  );

  if (view.phase === 'reveal' && view.reveal) {
    const r = view.reveal;
    const doneAt = REVEAL_AT + r.rounds.length * REVEAL_STEP_MS;
    return (
      <div className="stack">
        <Styles />
        <Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">{t(L.revealTitle)}</span>
          <div className="omg-preveal">
            {[me, rival].map((id) => (
              <div key={id} style={{ display: 'contents' }}>
                <span style={{ justifySelf: 'end', fontWeight: 600 }}>{id === me ? t(L.you) : rivalName}</span>
                {r.rounds.map((round, i) => {
                  const n = round.tiles[id]!;
                  return (
                    <StoneDisc
                      key={i}
                      stone={stoneOf(n)}
                      n={n}
                      size={7}
                      className="omg-flip"
                      delay={REVEAL_AT + i * REVEAL_STEP_MS}
                      win={round.winnerId === id}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="omg-note omg-late" style={{ animationDelay: `${doneAt}ms` }}>
            {r.points[me]} × {r.points[rival]} —{' '}
            {r.winnerId === null
              ? t(L.duelTied)
              : r.winnerId === me
                ? t(L.youWinDuel)
                : fill(t(L.youLoseDuel), { n: rivalName })}
          </p>
        </Panel>
        {rulesButton}
        {reader}
      </div>
    );
  }

  const rivalStone = view.current[rival] ?? null;
  const shown = (
    <div className="omg-shown">
      {view.mine !== null && (
        <div className="stack" style={{ justifyItems: 'center', gap: 6 }}>
          <span className="mp-eyebrow">{t(L.youShowed)}</span>
          <StoneDisc stone={stoneOf(view.mine)} n={view.mine} size={14} win={view.result?.winnerId === me} />
        </div>
      )}
      {rivalStone && (
        <div className="stack" style={{ justifyItems: 'center', gap: 6 }}>
          <span className="mp-eyebrow">{fill(t(L.rivalShowed), { n: rivalName })}</span>
          <StoneDisc stone={rivalStone} size={14} className="omg-drop" win={view.result?.winnerId === rival} />
          <span className="mp-eyebrow">{stoneName(rivalStone, t)}</span>
        </div>
      )}
    </div>
  );

  if (view.phase === 'result' && view.result) {
    const w = view.result.winnerId;
    return (
      <div className="stack">
        <Styles />
        {scoreline}
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          {shown}
          <strong className="omg-big">
            {w === null ? t(L.tieSub) : w === me ? t(L.youWon) : fill(t(L.rivalWon), { n: rivalName })}
          </strong>
        </Panel>
        {myRounds}
        {rulesButton}
        {reader}
      </div>
    );
  }

  const locked = sent === turnKey;
  const handSet = new Set(view.hand);

  return (
    <div className="stack">
      <Styles />
      {scoreline}
      {(view.mine !== null || rivalStone) && <Panel className="stack">{shown}</Panel>}
      {view.myTurn ? (
        <Panel className="stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong className="omg-big">{t(L.yourTurn)}</strong>
            <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          </div>
          <span className="mp-eyebrow" style={{ textAlign: 'center' }}>
            {t(L.pick)}
          </span>
          <div className="omg-hand">
            {STONES.map((n) => {
              const has = handSet.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  className="omg-pick"
                  data-gone={!has}
                  data-sel={sel === n}
                  disabled={!has || locked}
                  aria-label={String(n)}
                  onClick={() => setSel(n)}
                >
                  <StoneDisc stone={stoneOf(n)} n={n} size={15} />
                </button>
              );
            })}
          </div>
          <Button
            block
            disabled={sel === null || !handSet.has(sel) || locked}
            onClick={() => {
              if (sel === null) return;
              setSent(turnKey);
              send({ type: 'present', tile: sel });
            }}
          >
            {sel === null ? t(L.pick) : fill(t(L.present), { n: String(sel) })}
          </Button>
        </Panel>
      ) : (
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          <p className="omg-note">{fill(t(L.waiting), { n: rivalName })}</p>
          <span className="mp-eyebrow">{t(L.yourStones)}</span>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
            {view.hand.map((n) => (
              <StoneDisc key={n} stone={stoneOf(n)} n={n} size={8} />
            ))}
          </div>
        </Panel>
      )}
      {myRounds}
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
