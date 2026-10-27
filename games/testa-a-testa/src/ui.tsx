import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { LogEntry, PlayerView, PublicView, RoundResult } from './logic.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts) may be imported here.
// Platform components come in through `kit`, text goes through `t()`, and styles are scoped with
// the `tatg-` prefix.

type T = (text: I18nText) => string;
type Players = DisplayProps['platform']['players'];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  suddenDeath: { 'pt-BR': 'Morte súbita', en: 'Sudden death' },
  betTitle: { 'pt-BR': 'Apostas', en: 'Betting' },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  turnOf: { 'pt-BR': 'Vez de', en: 'Turn:' },
  turnHint: { 'pt-BR': 'Pagar, Aumentar ou Desistir', en: 'Call, Raise or Fold' },
  reshuffled: {
    'pt-BR': 'O baralho acabou e foi reembaralhado.',
    en: 'The deck ran out and was reshuffled.',
  },
  suddenSub: {
    'pt-BR': 'As rodadas acabaram empatadas — joga-se até alguém vencer.',
    en: 'The rounds ended level — play on until someone wins.',
  },
  chips: { 'pt-BR': 'fichas', en: 'chips' },
  bet: { 'pt-BR': 'Aposta', en: 'Bet' },
  pot: { 'pt-BR': 'Pote', en: 'Pot' },
  carried: { 'pt-BR': 'acumulado', en: 'carried' },
  used: { 'pt-BR': 'Cartas usadas', en: 'Used cards' },
  deckLeft: { 'pt-BR': 'no baralho', en: 'left in the deck' },
  raised: { 'pt-BR': 'aumentou para', en: 'raised to' },
  called: { 'pt-BR': 'pagou', en: 'called' },
  folded: { 'pt-BR': 'desistiu', en: 'folded' },
  timeUp: { 'pt-BR': 'tempo esgotado', en: 'time up' },
  takes: { 'pt-BR': 'leva', en: 'takes' },
  tie: { 'pt-BR': 'Empate!', en: 'Tie!' },
  tieCarry: { 'pt-BR': 'fichas acumulam para a próxima rodada', en: 'chips carry over to the next round' },
  tieRefund: {
    'pt-BR': 'Alguém ficou sem fichas: o pote volta meio a meio.',
    en: 'Someone ran out of chips: the pot goes back half and half.',
  },
  penalty: { 'pt-BR': 'Multa do 10', en: '10 penalty' },
  foldedWith: { 'pt-BR': 'desistiu com um 10 e paga', en: 'folded with a 10 and pays' },
  // Phone
  rivalCard: { 'pt-BR': 'Carta de {n}', en: '{n}’s card' },
  yourCard: { 'pt-BR': 'Sua carta', en: 'Your card' },
  onYourBrow: { 'pt-BR': 'A sua está na testa — só o rival vê.', en: 'Yours is on your brow — only your rival sees it.' },
  you: { 'pt-BR': 'Você', en: 'You' },
  yourTurn: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  waiting: { 'pt-BR': 'Vez de', en: 'Waiting for' },
  call: { 'pt-BR': 'Pagar', en: 'Call' },
  callReveal: { 'pt-BR': 'revela as cartas', en: 'reveals the cards' },
  raise: { 'pt-BR': 'Aumentar', en: 'Raise' },
  fold: { 'pt-BR': 'Desistir', en: 'Fold' },
  noRaise: { 'pt-BR': 'Sem fichas para aumentar.', en: 'No chips left to raise.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  youWin: { 'pt-BR': 'Você leva o pote!', en: 'You take the pot!' },
  youLose: { 'pt-BR': 'O rival leva o pote.', en: 'Your rival takes the pot.' },
  less: { 'pt-BR': 'Menos', en: 'Less' },
  more: { 'pt-BR': 'Mais', en: 'More' },
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
  demoRival: { 'pt-BR': 'Rival', en: 'Rival' },
} satisfies Record<string, I18nText>;

const CSS = `
.tatg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.6em 4em 4.4em;gap:1.2em;overflow:hidden}
.tatg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.tatg-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.tatg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.2em 0 0}
.tatg-sub b{color:var(--gold-hi);font-style:normal;font-family:var(--font-ui);font-weight:600}
.tatg-log{font-size:1.4em;color:var(--text);margin:.4em 0 0;min-height:1.4em}
.tatg-log .tatg-dim{color:var(--text-mute)}
/* Board */
.tatg-board{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:3em;min-height:0}
.tatg-seat{display:grid;grid-template-columns:auto auto;align-items:center;justify-content:center;gap:2.4em}
.tatg-seat[data-side='r']{direction:rtl}
.tatg-seat[data-side='r'] > *{direction:ltr}
.tatg-who{display:grid;justify-items:center;gap:.5em;text-align:center}
.tatg-name{font-weight:600;font-size:1.6em}
.tatg-stack{font-family:var(--font-display);font-weight:900;font-size:3em;color:var(--gold-hi);line-height:1}
.tatg-stack small{display:block;font-family:var(--font-ui);font-weight:500;font-size:.32em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute);margin-top:.3em}
.tatg-betchip{display:inline-flex;align-items:center;gap:.5em;font-size:1.4em;padding:.25em .9em;border-radius:99em;background:rgba(212,175,55,.08);box-shadow:0 0 0 1px var(--line-strong) inset}
.tatg-betchip b{font-family:var(--font-display);color:var(--gold-hi);font-size:1.3em}
.tatg-turn{box-shadow:0 0 0 2px var(--gold) inset,0 0 1.5em rgba(212,175,55,.35)}
.tatg-pot{display:grid;justify-items:center;gap:.4em;text-align:center}
.tatg-pot .tatg-potnum{font-family:var(--font-display);font-weight:900;font-size:6em;line-height:1;color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.35)}
.tatg-chipdisc{width:5em;height:5em;border-radius:50%;display:grid;place-items:center;
  background:repeating-conic-gradient(var(--crimson) 0 15deg,#f1e6c8 15deg 30deg);box-shadow:0 .3em .8em rgba(0,0,0,.5)}
.tatg-chipdisc::after{content:'';width:3.4em;height:3.4em;border-radius:50%;background:radial-gradient(circle,var(--crimson-hi),var(--crimson-lo));box-shadow:0 0 0 .18em var(--gold) inset}
/* Cards */
.tatg-card{width:8em;height:11.2em;border-radius:.7em;position:relative;flex:none}
.tatg-card[data-face='up']{background:linear-gradient(160deg,#fbf3df,#e8d9b3);box-shadow:0 .4em 1.2em rgba(0,0,0,.55),0 0 0 .12em var(--gold) inset;color:#1c140a}
.tatg-card[data-face='down']{background:
  repeating-linear-gradient(45deg,rgba(212,175,55,.22) 0 .12em,transparent .12em .9em),
  repeating-linear-gradient(-45deg,rgba(212,175,55,.22) 0 .12em,transparent .12em .9em),
  linear-gradient(160deg,var(--crimson),var(--crimson-lo));
  box-shadow:0 .4em 1.2em rgba(0,0,0,.55),0 0 0 .14em var(--gold) inset,0 0 0 .5em var(--crimson-lo) inset,0 0 0 .58em rgba(212,175,55,.6) inset}
.tatg-card[data-face='down']::after{content:'?';position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-size:4em;color:var(--gold-hi);opacity:.85}
.tatg-rank{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-weight:900;font-size:5em;line-height:1}
.tatg-card[data-ten='true'] .tatg-rank{color:var(--crimson)}
.tatg-corner{position:absolute;font-family:var(--font-display);font-weight:700;font-size:1.3em;line-height:1;text-align:center}
.tatg-corner span{display:block;font-size:.8em}
.tatg-corner.tl{top:.4em;left:.45em}
.tatg-corner.br{bottom:.4em;right:.45em}
.tatg-corner.br span{display:inline;margin-right:.15em}
.tatg-flip{animation:tatg-flip .7s cubic-bezier(.16,1,.3,1) backwards}
@keyframes tatg-flip{from{transform:rotateY(90deg) scale(.9);opacity:0}}
.tatg-late{animation:tatg-rise .6s cubic-bezier(.16,1,.3,1) backwards}
@keyframes tatg-rise{from{opacity:0;transform:translateY(.6em)}}
.tatg-swap{display:inline-grid}
.tatg-swap > *{grid-area:1/1}
.tatg-out{animation:tatg-out .3s forwards}
@keyframes tatg-out{to{opacity:0}}
.tatg-win{box-shadow:0 0 0 .18em var(--gold-hi) inset,0 0 2.2em rgba(212,175,55,.65)!important}
/* Used cards strip */
.tatg-used{justify-self:center;display:flex;align-items:center;gap:1.6em;padding:.8em 1.6em;border-radius:var(--radius-lg);background:rgba(255,255,255,.025);box-shadow:0 0 0 1px var(--line) inset;max-width:56em}
.tatg-used .mp-eyebrow{font-size:1em;white-space:nowrap}
.tatg-ranks{display:flex;gap:.9em}
.tatg-ur{display:grid;justify-items:center;gap:.25em}
.tatg-ur b{font-family:var(--font-display);font-size:1.6em;color:var(--text)}
.tatg-ur[data-gone='2'] b{color:var(--text-mute);text-decoration:line-through}
.tatg-pips{display:flex;gap:.25em}
.tatg-pips i{width:.6em;height:.6em;border-radius:50%;background:transparent;box-shadow:0 0 0 1px var(--line-strong) inset}
.tatg-pips i[data-used='true']{background:var(--crimson-hi);box-shadow:none}
.tatg-left{font-size:1.1em;color:var(--text-mute);white-space:nowrap}
/* Reveal banner */
.tatg-banner{font-family:var(--font-display);font-size:2.4em;color:var(--gold-hi);margin:.3em 0 0}
.tatg-penalty{display:inline-block;margin-top:.4em;font-size:1.5em;padding:.2em .8em;border-radius:99em;background:var(--crimson-lo);color:#fff;box-shadow:0 0 0 1px var(--crimson-hi) inset}
/* Phone */
.tatg-pcards{display:flex;gap:18px;justify-content:center;align-items:flex-end}
.tatg-pcard{display:grid;justify-items:center;gap:8px;text-align:center}
.tatg-cap{font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute)}
.tatg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.tatg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.tatg-stats div{padding:8px 4px;border-radius:12px;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.tatg-stats b{display:block;font-family:var(--font-display);font-size:1.5rem;color:var(--gold-hi)}
.tatg-stats span{font-size:.75rem;color:var(--text-mute);text-transform:uppercase;letter-spacing:.08em}
.tatg-stepper{display:grid;grid-template-columns:56px 1fr 56px;gap:8px;align-items:center}
.tatg-stepper output{font-family:var(--font-display);font-size:2rem;text-align:center;color:var(--gold-hi)}
.tatg-big{font-size:1.15rem}
.tatg-row{display:flex;gap:8px}
.tatg-row > *{flex:1}
/* Tutorial slide (TV) */
.tatg-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em}
.tatg-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.tatg-slide b,.tatg-rules b,.tatg-tvrules b{color:var(--gold-hi);font-weight:600}
.tatg-dots{display:flex;gap:.6em;margin-top:1.5em}
.tatg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.tatg-dots span[data-on='true']{background:var(--gold)}
.tatg-demo{display:grid;justify-items:center;gap:1.6em}
.tatg-phone{width:11em;padding:1.2em 1em;border-radius:1.6em;background:var(--ink-2);box-shadow:0 0 0 .15em var(--line-strong) inset,0 .6em 2em rgba(0,0,0,.5);display:grid;justify-items:center;gap:.6em;font-size:1em}
.tatg-phone .tatg-cap{font-size:.9em}
.tatg-demobtns{display:grid;gap:.8em;width:20em}
.tatg-demobtn{padding:.8em 1em;border-radius:var(--radius);font-weight:600;font-size:1.3em;text-align:center}
.tatg-demobtn.g{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.tatg-demobtn.o{color:var(--gold-hi);box-shadow:0 0 0 1px var(--line-strong) inset}
.tatg-demobtn.c{color:#fff;background:linear-gradient(180deg,var(--crimson-hi),var(--crimson-lo))}
/* Rules overlay (TV) and reader (phone) */
.tatg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.tatg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.tatg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.tatg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.tatg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.tatg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.tatg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.tatg-rules p{margin:0;line-height:1.5}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

const nameOf = (players: Players, id: string | null | undefined) => players.find((p) => p.id === id)?.name ?? '—';

// ---------------------------------------------------------------------------
// Pieces shared by the TV, the phone and the tutorial demos
// ---------------------------------------------------------------------------

/** A playing card: `value` null draws its back. `size` sets the font-size (the card is 8×11.2 of it). */
function Card({
  value,
  size,
  className = '',
  delay,
  win,
}: {
  value: number | null;
  size: string | number;
  className?: string;
  delay?: number;
  win?: boolean;
}) {
  const style = { fontSize: size, animationDelay: delay === undefined ? undefined : `${delay}ms` };
  if (value === null) return <div className={`tatg-card ${className}`} data-face="down" style={style} aria-label="?" />;
  return (
    <div
      className={`tatg-card ${className} ${win ? 'tatg-win' : ''}`}
      data-face="up"
      data-ten={value === 10}
      style={style}
      aria-label={String(value)}
    >
      <span className="tatg-corner tl">
        {value}
        <span>♠</span>
      </span>
      <span className="tatg-rank">{value}</span>
      <span className="tatg-corner br">
        {value}
        <span>♠</span>
      </span>
    </div>
  );
}

/** One line for a betting move, as the TV and the phones say it. */
function logLine(e: LogEntry, players: Players, t: T): string {
  const who = nameOf(players, e.by);
  if (e.kind === 'raise') return `${who} ${t(L.raised)} ${e.to}`;
  if (e.kind === 'fold') return `${who} ${t(L.folded)}`;
  return `${e.auto ? `${t(L.timeUp)} — ` : ''}${who} ${t(L.called)}`;
}

/** The outcome of a revealed round, in one sentence. */
function outcome(r: RoundResult, players: Players, t: T): string {
  if (r.winnerId === null) return r.refunded ? `${t(L.tie)} ${t(L.tieRefund)}` : `${t(L.tie)} ${r.pot} ${t(L.tieCarry)}`;
  const base = `${nameOf(players, r.winnerId)} ${t(L.takes)} ${r.pot} ${t(L.chips)}`;
  return r.kind === 'fold' ? `${nameOf(players, r.folderId)} ${t(L.folded)} — ${base}` : base;
}

/** A number that changes when the cards flip, so the payout never spoils the reveal. */
function Swap({ from, to }: { from: number; to: number }) {
  if (from === to) return <>{to}</>;
  return (
    <span className="tatg-swap">
      <span className="tatg-out" style={{ animationDelay: `${REVEAL_AT}ms` }}>
        {from}
      </span>
      <span className="tatg-late" style={{ animationDelay: `${REVEAL_AT + 300}ms` }}>
        {to}
      </span>
    </span>
  );
}

function UsedStrip({ used, deckLeft, t }: { used: number[]; deckLeft: number; t: T }) {
  return (
    <div className="tatg-used">
      <span className="mp-eyebrow">{t(L.used)}</span>
      <div className="tatg-ranks">
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const gone = used.filter((u) => u === n).length;
          return (
            <div key={n} className="tatg-ur" data-gone={gone}>
              <b>{n}</b>
              <div className="tatg-pips">
                <i data-used={gone >= 1} />
                <i data-used={gone >= 2} />
              </div>
            </div>
          );
        })}
      </div>
      <span className="tatg-left">
        {deckLeft} {t(L.deckLeft)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

function SlideDemo({ demo, kit, t }: { demo: (typeof SLIDES)[number]['demo']; kit: DisplayProps['kit']; t: T }) {
  const { Avatar } = kit;
  if (demo === 'duel') {
    // Two phones: each shows the other player's card, never its own.
    return (
      <div className="tatg-row" style={{ gap: '3em', alignItems: 'center' }}>
        {[
          { emoji: '🎩', sees: 7, rival: '🦊' },
          { emoji: '🦊', sees: 3, rival: '🎩' },
        ].map((p, i) => (
          <div key={i} className="tatg-demo">
            <Avatar emoji={p.emoji} size="5em" />
            <div className="tatg-phone">
              <span className="tatg-cap">
                {t(L.rivalCard).replace('{n}', p.rival)}
              </span>
              <Card value={p.sees} size="1em" className="tatg-flip" delay={300 + i * 300} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'board') {
    return (
      <div className="tatg-demo" style={{ fontSize: '.9em' }}>
        <div className="tatg-row" style={{ gap: '3em', alignItems: 'center' }}>
          <div className="tatg-who">
            <Avatar emoji="🎩" size="4.5em" active />
            <div className="tatg-stack">
              15<small>{t(L.chips)}</small>
            </div>
          </div>
          <div className="tatg-pot">
            <div className="tatg-chipdisc" />
            <div className="tatg-potnum">8</div>
            <span className="mp-eyebrow">{t(L.pot)}</span>
          </div>
          <div className="tatg-who">
            <Avatar emoji="🦊" size="4.5em" />
            <div className="tatg-stack">
              17<small>{t(L.chips)}</small>
            </div>
          </div>
        </div>
        <UsedStrip used={[10, 4, 7, 7, 2, 9]} deckLeft={14} t={t} />
      </div>
    );
  }
  if (demo === 'actions') {
    return (
      <div className="tatg-demobtns">
        <div className="tatg-pcard" style={{ fontSize: '1.2em' }}>
          <span className="tatg-cap">
            {t(L.rivalCard).replace('{n}', '🦊')}
          </span>
          <Card value={9} size=".9em" />
        </div>
        <div className="tatg-demobtn g tatg-late" style={{ animationDelay: '200ms' }}>
          {t(L.call)} +4
        </div>
        <div className="tatg-demobtn o tatg-late" style={{ animationDelay: '500ms' }}>
          {t(L.raise)} +3
        </div>
        <div className="tatg-demobtn c tatg-late" style={{ animationDelay: '800ms' }}>
          {t(L.fold)}
        </div>
      </div>
    );
  }
  return (
    <div className="tatg-demo">
      <div className="tatg-row" style={{ gap: '2.4em', alignItems: 'center' }}>
        <Card value={6} size="1.1em" className="tatg-flip" delay={300} />
        <div className="tatg-pot">
          <div className="tatg-potnum" style={{ fontSize: '4em' }}>
            6
          </div>
          <span className="mp-eyebrow">
            {t(L.pot)} · {t(L.carried)}
          </span>
        </div>
        <Card value={6} size="1.1em" className="tatg-flip" delay={600} />
      </div>
      <p className="tatg-banner tatg-late" style={{ animationDelay: '1100ms', fontSize: '1.8em' }}>
        {t(L.tie)}
      </p>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="tatg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="tatg-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="tatg-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="tatg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="tatg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
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
    <div className="tatg-tvrules">
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
    <div className="tatg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="tatg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="tatg-row">
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

const REVEAL_AT = 2000;

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

  const reveal = view.reveal;
  const lastMove = view.log.at(-1);
  const sub = reveal ? null : view.reshuffled && view.log.length === 0 ? (
    t(L.reshuffled)
  ) : view.suddenDeath && view.log.length === 0 ? (
    t(L.suddenSub)
  ) : (
    <>
      {t(L.turnOf)} <b>{nameOf(players, view.turn)}</b> — {t(L.turnHint)}
    </>
  );
  const pot = reveal ? reveal.pot : view.carry + (view.bets[view.order[0]] ?? 0) + (view.bets[view.order[1]] ?? 0);

  return (
    <div className="tatg-wrap">
      <Styles />
      <header className="tatg-head">
        <div className="mp-enter" key={`${view.phase}-${view.round}`}>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em', color: view.suddenDeath ? 'var(--crimson-hi)' : undefined }}>
            {view.suddenDeath ? `${t(L.suddenDeath)} · ${t(L.round)} ${view.round}` : `${t(L.round)} ${view.round}/${view.rounds}`}
          </span>
          <h1 className="tatg-h1">{t(reveal ? L.revealTitle : L.betTitle)}</h1>
          {sub && <p className="tatg-sub">{sub}</p>}
          {reveal ? (
            <div className="tatg-late" style={{ animationDelay: `${REVEAL_AT + 300}ms` }}>
              <p className="tatg-banner">{outcome(reveal, players, t)}</p>
              {reveal.penalty > 0 && (
                <span className="tatg-penalty">
                  {t(L.penalty)}: {nameOf(players, reveal.folderId)} {t(L.foldedWith)} {reveal.penalty}
                </span>
              )}
            </div>
          ) : (
            <p className="tatg-log" key={view.log.length}>
              {lastMove && <span className="mp-enter">{logLine(lastMove, players, t)}</span>}
            </p>
          )}
        </div>
        {!reveal && (
          <Countdown
            key={`${view.round}-${view.log.length}`}
            deadline={view.deadline}
            total={view.total ?? 0}
            size="7em"
            paused={!!platform.paused}
          />
        )}
      </header>

      <div className="tatg-board">
        {view.order.map((id, i) => {
          const p = players.find((x) => x.id === id);
          const turn = view.turn === id;
          const card = reveal ? (reveal.cards[id] ?? null) : null;
          const won = !!reveal && reveal.winnerId === id;
          const seat = (
            <div key={id} className="tatg-seat" data-side={i === 0 ? 'l' : 'r'} style={{ gridColumn: i === 0 ? 1 : 3 }}>
              <div className="tatg-who">
                <Avatar emoji={p?.avatar ?? '🎴'} size="5.5em" active={turn || won} offline={p ? !p.connected : false} />
                <span className="tatg-name">{p?.name ?? '—'}</span>
                <div className="tatg-stack">
                  {reveal ? <Swap from={reveal.before[id] ?? 0} to={view.chips[id] ?? 0} /> : (view.chips[id] ?? 0)}
                  <small>{t(L.chips)}</small>
                </div>
                {!reveal && (
                  <span className={`tatg-betchip ${turn ? 'tatg-turn' : ''}`}>
                    {t(L.bet)} <b>{view.bets[id] ?? 0}</b>
                  </span>
                )}
              </div>
              {card === null ? (
                <Card value={null} size="1.5em" />
              ) : (
                <Card value={card} size="1.5em" className="tatg-flip" delay={REVEAL_AT + i * 200} win={won} />
              )}
            </div>
          );
          return seat;
        })}
        <div className="tatg-pot" style={{ gridColumn: 2, gridRow: 1 }}>
          <div className="tatg-chipdisc" />
          <div className="tatg-potnum" key={pot}>
            <span className="mp-enter">{pot}</span>
          </div>
          <span className="mp-eyebrow" style={{ fontSize: '1.1em' }}>
            {t(L.pot)}
          </span>
          {!reveal && view.carry > 0 && (
            <span className="mp-chip mp-chip--crimson" style={{ fontSize: '1.1em' }}>
              +{view.carry} {t(L.carried)}
            </span>
          )}
        </div>
      </div>

      <UsedStrip used={view.used} deckLeft={view.deckLeft} t={t} />
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
  const [raise, setRaise] = useState(1);
  // A new turn (or a new round) resets the raise stepper and unlocks the buttons.
  const turnKey = view ? `${view.round}-${view.log.length}-${view.phase}` : '';
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    setRaise(1);
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
          {!isHost && <p className="tatg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="tatg-row">
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
          <p className="tatg-note">{t(L.watch)}</p>
        </Panel>
        {rulesButton}
        {reader}
      </div>
    );
  }

  const rivalName = nameOf(players, view.rivalId);
  const me = you.you;
  const stats = (
    <div className="tatg-stats">
      <div>
        <b>{view.reveal ? <Swap from={view.reveal.before[me] ?? 0} to={view.chips[me] ?? 0} /> : (view.chips[me] ?? 0)}</b>
        <span>{t(L.you)}</span>
      </div>
      <div>
        <b>{view.reveal ? view.reveal.pot : view.carry + (view.bets[me] ?? 0) + (view.bets[view.rivalId] ?? 0)}</b>
        <span>{t(L.pot)}</span>
      </div>
      <div>
        <b>
          {view.reveal ? (
            <Swap from={view.reveal.before[view.rivalId] ?? 0} to={view.chips[view.rivalId] ?? 0} />
          ) : (
            (view.chips[view.rivalId] ?? 0)
          )}
        </b>
        <span>{rivalName}</span>
      </div>
    </div>
  );

  if (view.phase === 'reveal' && view.reveal) {
    const r = view.reveal;
    return (
      <div className="stack">
        <Styles />
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <div className="tatg-pcards">
            <div className="tatg-pcard">
              <span className="tatg-cap">{t(L.yourCard)}</span>
              <Card
                value={view.myCard}
                size={13}
                className="tatg-flip"
                delay={REVEAL_AT}
                win={r.winnerId === me}
              />
            </div>
            <div className="tatg-pcard">
              <span className="tatg-cap">{rivalName}</span>
              <Card value={view.rivalCard} size={13} win={r.winnerId === view.rivalId} />
            </div>
          </div>
          <p className="tatg-note tatg-late" style={{ animationDelay: `${REVEAL_AT + 300}ms` }}>
            {r.winnerId === null ? outcome(r, players, t) : r.winnerId === me ? t(L.youWin) : t(L.youLose)}
          </p>
        </Panel>
        {stats}
        {rulesButton}
        {reader}
      </div>
    );
  }

  const act = (action: unknown) => {
    setSent(turnKey);
    send(action);
  };
  const locked = sent === turnKey;
  const lastMove = view.log.at(-1);

  return (
    <div className="stack">
      <Styles />
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <span className="mp-eyebrow">
          {view.suddenDeath ? `${t(L.suddenDeath)} · ${t(L.round)} ${view.round}` : `${t(L.round)} ${view.round}/${view.rounds}`}
        </span>
        <div className="tatg-pcard">
          <span className="tatg-cap">
            {t(L.rivalCard).replace('{n}', rivalName)}
          </span>
          <Card value={view.rivalCard} size={15} />
        </div>
        <p className="tatg-note" style={{ fontSize: '1rem' }}>
          {t(L.onYourBrow)}
        </p>
      </Panel>
      {stats}
      {lastMove && <p className="tatg-note">{logLine(lastMove, players, t)}</p>}
      {view.myTurn ? (
        <Panel className="stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong className="tatg-big">{t(L.yourTurn)}</strong>
            <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          </div>
          <Button block disabled={locked} onClick={() => act({ type: 'call' })}>
            {t(L.call)} {view.toCall > 0 ? `+${view.toCall}` : `· ${t(L.callReveal)}`}
          </Button>
          {view.maxRaise > 0 ? (
            <>
              <div className="tatg-stepper">
                <Button variant="ghost" disabled={raise <= 1} onClick={() => setRaise(Math.max(1, raise - 1))}>
                  <span aria-label={t(L.less)}>−</span>
                </Button>
                <output aria-live="polite">+{Math.min(raise, view.maxRaise)}</output>
                <Button
                  variant="ghost"
                  disabled={raise >= view.maxRaise}
                  onClick={() => setRaise(Math.min(view.maxRaise, raise + 1))}
                >
                  <span aria-label={t(L.more)}>+</span>
                </Button>
              </div>
              <div className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
                {[2, 5, 10]
                  .filter((n) => n <= view.maxRaise)
                  .concat(view.maxRaise > 1 ? [view.maxRaise] : [])
                  .filter((n, i, a) => a.indexOf(n) === i)
                  .map((n) => (
                    <Button key={n} small variant="ghost" onClick={() => setRaise(n)}>
                      {n === view.maxRaise ? `All-in +${n}` : `+${n}`}
                    </Button>
                  ))}
              </div>
              <Button
                block
                variant="ghost"
                disabled={locked}
                onClick={() => act({ type: 'raise', by: Math.min(raise, view.maxRaise) })}
              >
                {t(L.raise)} +{Math.min(raise, view.maxRaise)}
              </Button>
            </>
          ) : (
            <p className="tatg-note" style={{ fontSize: '1rem' }}>
              {t(L.noRaise)}
            </p>
          )}
          <Button block variant="crimson" disabled={locked} onClick={() => act({ type: 'fold' })}>
            {t(L.fold)}
          </Button>
        </Panel>
      ) : (
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          <p className="tatg-note">
            {t(L.waiting)} {rivalName}…
          </p>
        </Panel>
      )}
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
