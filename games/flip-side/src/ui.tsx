import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { LogEntry, Move, PlayerView, PublicView, RoundResult, Side } from './logic.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts) may be imported here.
// Platform components come in through `kit`, text goes through `t()`, and styles are scoped with
// the `fsg-` prefix.

type T = (text: I18nText) => string;
type Players = DisplayProps['platform']['players'];
type Face = 'front' | 'back';

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  suddenDeath: { 'pt-BR': 'Morte súbita', en: 'Sudden death' },
  betTitle: { 'pt-BR': 'Apostas', en: 'Betting' },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  turnOf: { 'pt-BR': 'Vez de', en: 'Turn:' },
  turnHintPick: { 'pt-BR': 'escolher o lado e apostar', en: 'pick a side and bet' },
  turnHint: { 'pt-BR': 'Pagar, Aumentar ou Desistir', en: 'Call, Raise or Fold' },
  reshuffled: {
    'pt-BR': 'O sapato acabou e foi reembaralhado.',
    en: 'The shoe ran out and was reshuffled.',
  },
  suddenSub: {
    'pt-BR': 'As rodadas acabaram empatadas — joga-se até alguém vencer.',
    en: 'The rounds ended level — play on until someone wins.',
  },
  front: { 'pt-BR': 'Frente', en: 'Front' },
  back: { 'pt-BR': 'Verso', en: 'Back' },
  both: { 'pt-BR': 'Ambos', en: 'Both' },
  noSide: { 'pt-BR': 'lado ?', en: 'side ?' },
  chips: { 'pt-BR': 'fichas', en: 'chips' },
  pot: { 'pt-BR': 'Pote', en: 'Pot' },
  carried: { 'pt-BR': 'acumulado', en: 'carried' },
  perSide: { 'pt-BR': 'por lado', en: 'per side' },
  shoeLeft: { 'pt-BR': 'cartas no sapato', en: 'cards in the shoe' },
  picks: { 'pt-BR': 'aposta em', en: 'bets on' },
  checked: { 'pt-BR': 'passou', en: 'checked' },
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
  bonus: { 'pt-BR': 'Aposta dupla', en: 'Both sides' },
  bonusPays: { 'pt-BR': 'paga um bônus de', en: 'pays a bonus of' },
  bothMissed: { 'pt-BR': 'A aposta dupla falhou: um lado não venceu.', en: 'The both-sides bet failed: one side did not win.' },
  // Phone
  yourCard: { 'pt-BR': 'Sua carta', en: 'Your card' },
  rivalCard: { 'pt-BR': 'Carta de {n}', en: '{n}’s card' },
  backSecret: { 'pt-BR': 'O verso só você vê.', en: 'Only you see your back.' },
  you: { 'pt-BR': 'Você', en: 'You' },
  yourTurn: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  pickSide: { 'pt-BR': 'Em qual lado você aposta?', en: 'Which side do you bet on?' },
  rivalOnBoth: { 'pt-BR': 'O rival já está em Ambos.', en: 'Your rival is already on Both.' },
  noBoth: { 'pt-BR': 'Sem fichas para Ambos (o dobro).', en: 'Not enough chips for Both (double).' },
  yourSide: { 'pt-BR': 'Seu lado', en: 'Your side' },
  waiting: { 'pt-BR': 'Vez de', en: 'Waiting for' },
  check: { 'pt-BR': 'Passar', en: 'Check' },
  call: { 'pt-BR': 'Pagar', en: 'Call' },
  callReveal: { 'pt-BR': 'revela as cartas', en: 'reveals the cards' },
  raise: { 'pt-BR': 'Aumentar', en: 'Raise' },
  fold: { 'pt-BR': 'Desistir', en: 'Fold' },
  noRaise: { 'pt-BR': 'Sem fichas para aumentar.', en: 'No chips left to raise.' },
  timeoutFolds: { 'pt-BR': 'Se o tempo acabar, você desiste.', en: 'If time runs out, you fold.' },
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
  everyone: { 'pt-BR': 'Todos veem', en: 'Everyone sees' },
  onlyYou: { 'pt-BR': 'Só você vê', en: 'Only you see' },
} satisfies Record<string, I18nText>;

const SIDE_LABEL: Record<Side, I18nText> = { front: L.front, back: L.back, both: L.both };

const CSS = `
.fsg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.4em 4em 4.4em;gap:1em;overflow:hidden}
.fsg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.fsg-h1{font-family:var(--font-display);font-weight:900;font-size:4.2em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.fsg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.2em 0 0}
.fsg-sub b{color:var(--gold-hi);font-style:normal;font-family:var(--font-ui);font-weight:600}
.fsg-log{font-size:1.4em;color:var(--text);margin:.4em 0 0;min-height:1.4em}
/* Board */
.fsg-board{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:2.4em;min-height:0}
.fsg-seat{display:grid;justify-items:center;gap:.8em;text-align:center}
.fsg-who{justify-self:stretch;display:flex;align-items:center;gap:1em}
.fsg-who > div{display:grid;justify-items:start;text-align:left}
.fsg-name{font-weight:600;font-size:1.5em}
.fsg-stack{font-family:var(--font-display);font-weight:900;font-size:2.6em;color:var(--gold-hi);line-height:1}
.fsg-stack small{font-family:var(--font-ui);font-weight:500;font-size:.36em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute);margin-left:.4em}
.fsg-pair{display:flex;gap:1em}
.fsg-seat .fsg-pair{padding-bottom:1.6em}
.fsg-turn{box-shadow:0 0 0 2px var(--gold) inset,0 0 1.5em rgba(212,175,55,.35)}
/* Table with FRONT / BACK zones */
.fsg-table{display:grid;grid-template-columns:9.5em 9em 9.5em;grid-template-rows:7.4em 7.4em;gap:.5em;padding:.8em;border-radius:1em;
  background:radial-gradient(ellipse at center,rgba(179,38,58,.16),rgba(0,0,0,.25));box-shadow:0 0 0 .14em var(--gold-lo) inset,0 0 0 .5em rgba(0,0,0,.25) inset}
.fsg-zone{position:relative;display:grid;place-items:center;border-radius:.6em;box-shadow:0 0 0 1px var(--line-strong) inset;background:rgba(255,255,255,.02);transition:background .4s}
.fsg-zone > .fsg-zlabel{position:absolute;top:.45em;left:0;right:0;text-align:center;font-family:var(--font-display);font-size:.95em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute)}
.fsg-zone[data-on='true']{background:rgba(212,175,55,.1);box-shadow:0 0 0 .1em var(--gold) inset}
.fsg-zone[data-on='true'] > .fsg-zlabel{color:var(--gold-hi)}
.fsg-zone[data-lost='true']{opacity:.45}
.fsg-zchips{display:flex;align-items:center;gap:.4em;margin-top:.9em}
.fsg-zchips b{font-family:var(--font-display);font-size:2.2em;color:var(--gold-hi);line-height:1}
.fsg-zface{position:absolute;bottom:.35em;right:.5em;font-family:var(--font-display);font-weight:900;font-size:1.6em;color:var(--text)}
.fsg-center{display:grid;place-items:center;align-content:center;gap:.2em;text-align:center}
.fsg-potnum{font-family:var(--font-display);font-weight:900;font-size:3.6em;line-height:1;color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.35)}
.fsg-chip{width:1.5em;height:1.5em;border-radius:50%;flex:none;display:inline-block;
  background:radial-gradient(circle,var(--crimson-hi) 0 38%,transparent 40%),repeating-conic-gradient(var(--crimson) 0 30deg,#f1e6c8 30deg 60deg);
  box-shadow:0 .15em .35em rgba(0,0,0,.5),0 0 0 .08em var(--gold) inset}
.fsg-undecided{font-size:1.2em;padding:.2em .8em;border-radius:99em;color:var(--text-dim);box-shadow:0 0 0 1px var(--line-strong) inset}
/* Cards: cream front, black-and-gold back */
.fsg-card{width:8em;height:11.2em;border-radius:.7em;position:relative;flex:none}
.fsg-card[data-face='front']{background:linear-gradient(160deg,#fbf3df,#e8d9b3);box-shadow:0 .4em 1.2em rgba(0,0,0,.55),0 0 0 .12em var(--gold) inset;color:#1c140a}
.fsg-card[data-face='back']{background:linear-gradient(160deg,#1d1a20,#09080b);box-shadow:0 .4em 1.2em rgba(0,0,0,.55),0 0 0 .12em var(--gold) inset,0 0 0 .45em #09080b inset,0 0 0 .52em rgba(212,175,55,.45) inset;color:var(--gold-hi)}
.fsg-card[data-hidden='true']{background:
  repeating-linear-gradient(45deg,rgba(212,175,55,.2) 0 .12em,transparent .12em .9em),
  repeating-linear-gradient(-45deg,rgba(212,175,55,.2) 0 .12em,transparent .12em .9em),
  linear-gradient(160deg,#1d1a20,#09080b)}
.fsg-card[data-hidden='true']::after{content:'?';position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-size:4em;color:var(--gold-hi);opacity:.85}
.fsg-rank{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-weight:900;font-size:5em;line-height:1}
.fsg-corner{position:absolute;font-family:var(--font-display);font-weight:700;font-size:1.3em;line-height:1}
.fsg-corner.tl{top:.4em;left:.45em}
.fsg-corner.br{bottom:.4em;right:.45em}
.fsg-tag{position:absolute;left:0;right:0;bottom:-1.7em;text-align:center;font-size:.95em;letter-spacing:.18em;text-transform:uppercase;color:var(--text-mute)}
.fsg-card[data-chosen='true']{outline:.16em solid var(--gold-hi);outline-offset:.2em}
.fsg-flip{animation:fsg-flip .7s cubic-bezier(.16,1,.3,1) backwards}
@keyframes fsg-flip{from{transform:rotateY(90deg) scale(.9);opacity:0}}
.fsg-late{animation:fsg-rise .6s cubic-bezier(.16,1,.3,1) backwards}
@keyframes fsg-rise{from{opacity:0;transform:translateY(.6em)}}
.fsg-swap{display:inline-grid}
.fsg-swap > *{grid-area:1/1}
.fsg-out{animation:fsg-out .3s forwards}
@keyframes fsg-out{to{opacity:0}}
.fsg-win{box-shadow:0 0 0 .18em var(--gold-hi) inset,0 0 2.2em rgba(212,175,55,.65)!important}
.fsg-foot{justify-self:center;font-size:1.1em;color:var(--text-mute)}
/* Reveal banner */
.fsg-banner{font-family:var(--font-display);font-size:2.3em;color:var(--gold-hi);margin:.3em 0 0}
.fsg-bonus{display:inline-block;margin-top:.4em;font-size:1.5em;padding:.2em .8em;border-radius:99em;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520);color:#1a0f05;font-weight:600}
.fsg-miss{display:inline-block;margin-top:.4em;font-size:1.4em;padding:.2em .8em;border-radius:99em;background:var(--crimson-lo);color:#fff;box-shadow:0 0 0 1px var(--crimson-hi) inset}
/* Phone */
.fsg-duo{display:flex;gap:22px;justify-content:center;align-items:flex-start}
.fsg-group{display:grid;justify-items:center;gap:6px}
.fsg-group + .fsg-group{padding-left:22px;box-shadow:-1px 0 0 var(--line)}
.fsg-prow{display:flex;gap:8px;justify-content:center;align-items:flex-start;padding-bottom:16px}
.fsg-cap{font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute)}
.fsg-note{font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:var(--text-dim);text-align:center;margin:0}
.fsg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.fsg-stats div{padding:8px 4px;border-radius:12px;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.fsg-stats b{display:block;font-family:var(--font-display);font-size:1.5rem;color:var(--gold-hi)}
.fsg-stats span{font-size:.75rem;color:var(--text-mute);text-transform:uppercase;letter-spacing:.08em}
.fsg-stats em{display:block;font-style:normal;font-size:.75rem;color:var(--text-dim);margin-top:2px}
.fsg-sides{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fsg-sidebtn{min-height:56px;border-radius:var(--radius);border:0;font:600 1rem var(--font-ui);color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line-strong) inset;cursor:pointer}
.fsg-sidebtn small{display:block;font-weight:400;font-size:.75rem;color:var(--text-mute)}
.fsg-sidebtn[aria-pressed='true']{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520);box-shadow:none}
.fsg-sidebtn[aria-pressed='true'] small{color:#3a2a10}
.fsg-sidebtn:disabled{opacity:.35;cursor:default}
.fsg-stepper{display:grid;grid-template-columns:56px 1fr 56px;gap:8px;align-items:center}
.fsg-stepper output{font-family:var(--font-display);font-size:2rem;text-align:center;color:var(--gold-hi)}
.fsg-big{font-size:1.15rem}
.fsg-row{display:flex;gap:8px}
.fsg-row > *{flex:1}
/* Tutorial slide (TV) */
.fsg-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em}
.fsg-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.fsg-slide b,.fsg-rules b,.fsg-tvrules b{color:var(--gold-hi);font-weight:600}
.fsg-dots{display:flex;gap:.6em;margin-top:1.5em}
.fsg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.fsg-dots span[data-on='true']{background:var(--gold)}
.fsg-demo{display:grid;justify-items:center;gap:1.6em}
.fsg-phone{padding:1.2em 1.4em 2.6em;border-radius:1.6em;background:var(--ink-2);box-shadow:0 0 0 .15em var(--line-strong) inset,0 .6em 2em rgba(0,0,0,.5);display:grid;justify-items:center;gap:.6em}
.fsg-phone .fsg-cap{font-size:.9em}
.fsg-demobtns{display:grid;gap:.8em;width:20em}
.fsg-demobtn{padding:.8em 1em;border-radius:var(--radius);font-weight:600;font-size:1.3em;text-align:center}
.fsg-demobtn.g{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.fsg-demobtn.o{color:var(--gold-hi);box-shadow:0 0 0 1px var(--line-strong) inset}
.fsg-demobtn.c{color:#fff;background:linear-gradient(180deg,var(--crimson-hi),var(--crimson-lo))}
.fsg-vs{font-family:var(--font-display);font-size:2em;color:var(--text-mute)}
/* Rules overlay (TV) and reader (phone) */
.fsg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.fsg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.fsg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.fsg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.fsg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.fsg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.fsg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.fsg-rules p{margin:0;line-height:1.5}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

const nameOf = (players: Players, id: string | null | undefined) => players.find((p) => p.id === id)?.name ?? '—';
const onZone = (side: Side | null | undefined, face: Face) => side === 'both' || side === face;

// ---------------------------------------------------------------------------
// Pieces shared by the TV, the phone and the tutorial demos
// ---------------------------------------------------------------------------

/**
 * One face of a two-faced card: a cream front or a black-and-gold back. `value` null draws a
 * hidden back. `size` sets the font-size (the card is 8×11.2 of it).
 */
function Card({
  face,
  value,
  size,
  tag,
  className = '',
  delay,
  win,
  chosen,
}: {
  face: Face;
  value: number | null;
  size: string | number;
  tag?: string;
  className?: string;
  delay?: number;
  win?: boolean;
  chosen?: boolean;
}) {
  const style = { fontSize: size, animationDelay: delay === undefined ? undefined : `${delay}ms` };
  return (
    <div
      className={`fsg-card ${className} ${win ? 'fsg-win' : ''}`}
      data-face={face}
      data-hidden={value === null}
      data-chosen={!!chosen}
      style={style}
      aria-label={`${tag ?? ''} ${value ?? '?'}`.trim()}
    >
      {value !== null && (
        <>
          <span className="fsg-corner tl">{value}</span>
          <span className="fsg-rank">{value}</span>
          <span className="fsg-corner br">{value}</span>
        </>
      )}
      {tag && <span className="fsg-tag">{tag}</span>}
    </div>
  );
}

/** One line for a betting move, as the TV and the phones say it. */
function logLine(e: LogEntry, players: Players, t: T): string {
  const who = nameOf(players, e.by);
  const side = e.side ? ` · ${t(L.picks)} ${t(SIDE_LABEL[e.side]).toUpperCase()}` : '';
  if (e.kind === 'raise') return `${who} ${t(L.raised)} ${e.level} ${t(L.perSide)}${side}`;
  if (e.kind === 'fold') return `${e.auto ? `${t(L.timeUp)} — ` : ''}${who} ${t(L.folded)}`;
  return `${who} ${t(e.kind === 'check' ? L.checked : L.called)}${side}`;
}

/** The outcome of a revealed round, in one sentence. */
function outcome(r: RoundResult, players: Players, t: T): string {
  if (r.winnerId === null) return r.refunded ? `${t(L.tie)} ${t(L.tieRefund)}` : `${t(L.tie)} ${r.pot} ${t(L.tieCarry)}`;
  const base = `${nameOf(players, r.winnerId)} ${t(L.takes)} ${r.pot} ${t(L.chips)}`;
  return r.kind === 'fold' ? `${nameOf(players, r.folderId)} ${t(L.folded)} — ${base}` : base;
}

/** The both-sides player lost the showdown. */
const bothMissed = (r: RoundResult) =>
  r.kind === 'showdown' && r.winnerId !== null && Object.entries(r.sides).some(([id, s]) => s === 'both' && id !== r.winnerId);

/** A number that changes when the cards flip, so the payout never spoils the reveal. */
function Swap({ from, to }: { from: number; to: number }) {
  if (from === to) return <>{to}</>;
  return (
    <span className="fsg-swap">
      <span className="fsg-out" style={{ animationDelay: `${REVEAL_AT}ms` }}>
        {from}
      </span>
      <span className="fsg-late" style={{ animationDelay: `${REVEAL_AT + 300}ms` }}>
        {to}
      </span>
    </span>
  );
}

/** A betting zone on the table: one player's FRONT or BACK, with the chips staked on it. */
function Zone({
  face,
  side,
  level,
  value,
  lost,
  t,
}: {
  face: Face;
  side: Side | null;
  level: number;
  value?: number | null;
  lost?: boolean;
  t: T;
}) {
  const on = onZone(side, face);
  return (
    <div className="fsg-zone" data-on={on} data-lost={!!lost}>
      <span className="fsg-zlabel">{t(face === 'front' ? L.front : L.back)}</span>
      {on && level > 0 && (
        <span className="fsg-zchips mp-enter" key={level}>
          <i className="fsg-chip" />
          <b>{level}</b>
        </span>
      )}
      {on && value != null && (
        <span className="fsg-zface fsg-late" style={{ animationDelay: `${REVEAL_AT + 200}ms` }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

function SlideDemo({ demo, kit, t }: { demo: (typeof SLIDES)[number]['demo']; kit: DisplayProps['kit']; t: T }) {
  const { Avatar } = kit;
  if (demo === 'faces') {
    // The TV sees the front; the owner's phone also shows the back.
    return (
      <div className="fsg-row" style={{ gap: '3em', alignItems: 'center' }}>
        <div className="fsg-demo">
          <span className="mp-eyebrow">📺 {t(L.everyone)}</span>
          <div className="fsg-pair">
            <Card face="front" value={7} size="1.1em" tag={t(L.front)} className="fsg-flip" delay={300} />
            <Card face="back" value={null} size="1.1em" tag={t(L.back)} />
          </div>
        </div>
        <div className="fsg-demo">
          <span className="mp-eyebrow">📱 {t(L.onlyYou)}</span>
          <div className="fsg-phone">
            <span className="fsg-cap">{t(L.yourCard)}</span>
            <div className="fsg-pair" style={{ gap: '.6em' }}>
              <Card face="front" value={7} size=".8em" />
              <Card face="back" value={3} size=".8em" className="fsg-flip" delay={900} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (demo === 'table') {
    return (
      <div className="fsg-demo">
        <div className="fsg-row" style={{ gap: '2em', alignItems: 'center' }}>
          <Avatar emoji="🎩" size="4em" active />
          <div className="fsg-table" style={{ fontSize: '.9em' }}>
            <Zone face="front" side={null} level={0} t={t} />
            <div className="fsg-center">
              <div className="fsg-potnum">6</div>
              <span className="mp-eyebrow">{t(L.pot)}</span>
            </div>
            <Zone face="front" side="front" level={2} t={t} />
            <Zone face="back" side="back" level={4} t={t} />
            <div />
            <Zone face="back" side="front" level={2} t={t} />
          </div>
          <Avatar emoji="🦊" size="4em" />
        </div>
        <p className="fsg-sub" style={{ fontSize: '1.3em' }}>
          🎩 {t(L.back)} · 🦊 {t(L.front)}
        </p>
      </div>
    );
  }
  if (demo === 'actions') {
    return (
      <div className="fsg-demobtns">
        <div className="fsg-sides" style={{ fontSize: '1.2em' }}>
          {(['front', 'back', 'both'] as Side[]).map((s, i) => (
            <div key={s} className={`fsg-demobtn ${i === 1 ? 'g' : 'o'}`} style={{ fontSize: '1em', padding: '.6em .2em' }}>
              {t(SIDE_LABEL[s])}
            </div>
          ))}
        </div>
        <div className="fsg-demobtn g fsg-late" style={{ animationDelay: '200ms' }}>
          {t(L.call)} +3
        </div>
        <div className="fsg-demobtn o fsg-late" style={{ animationDelay: '500ms' }}>
          {t(L.raise)} +2
        </div>
        <div className="fsg-demobtn c fsg-late" style={{ animationDelay: '800ms' }}>
          {t(L.fold)}
        </div>
      </div>
    );
  }
  if (demo === 'both') {
    // 8 and 9 both beat the rival's front 5: a both-sides win with the bonus.
    return (
      <div className="fsg-demo">
        <div className="fsg-row" style={{ gap: '2em', alignItems: 'center' }}>
          <div className="fsg-pair">
            <Card face="front" value={8} size=".95em" chosen win />
            <Card face="back" value={9} size=".95em" chosen win className="fsg-flip" delay={600} />
          </div>
          <span className="fsg-vs">&gt;</span>
          <Card face="front" value={5} size=".95em" chosen />
        </div>
        <span className="fsg-bonus fsg-late" style={{ animationDelay: '1200ms', marginTop: '1em' }}>
          {t(L.bonus)} · +10 {t(L.chips)}
        </span>
      </div>
    );
  }
  return (
    <div className="fsg-demo">
      <div className="fsg-row" style={{ gap: '2.4em', alignItems: 'center' }}>
        <Card face="back" value={6} size="1.1em" className="fsg-flip" delay={300} chosen />
        <div className="fsg-center">
          <div className="fsg-potnum">6</div>
          <span className="mp-eyebrow">
            {t(L.pot)} · {t(L.carried)}
          </span>
        </div>
        <Card face="front" value={6} size="1.1em" chosen />
      </div>
      <p className="fsg-banner fsg-late" style={{ animationDelay: '1100ms', fontSize: '1.8em' }}>
        {t(L.tie)}
      </p>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="fsg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="fsg-h1" style={{ fontSize: '3.4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="fsg-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="fsg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="fsg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
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
    <div className="fsg-tvrules">
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
    <div className="fsg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="fsg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="fsg-row">
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

  if (view.phase === 'intro' || !view.fronts) {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} kit={kit} t={t} />
        {rulesOverlay}
      </>
    );
  }

  const reveal = view.reveal;
  const sides = reveal ? reveal.sides : view.sides;
  const lastMove = view.log.at(-1);
  const turnSide = view.turn ? view.sides[view.turn] : null;
  const sub = reveal ? null : view.reshuffled && view.log.length === 0 ? (
    t(L.reshuffled)
  ) : view.suddenDeath && view.log.length === 0 ? (
    t(L.suddenSub)
  ) : (
    <>
      {t(L.turnOf)} <b>{nameOf(players, view.turn)}</b> — {t(turnSide ? L.turnHint : L.turnHintPick)}
    </>
  );
  const pot = reveal
    ? reveal.pot
    : view.carry + (view.bets[view.order[0]] ?? 0) + (view.bets[view.order[1]] ?? 0);
  const [left, right] = view.order;
  const levelOf = (id: string) => (reveal ? (reveal.bets[id] ?? 0) / (sides[id] === 'both' ? 2 : 1) : (view.levels[id] ?? 0));
  const zoneValue = (id: string, face: Face) => (reveal ? (reveal.cards[id]?.[face] ?? null) : null);
  const lost = (id: string) => !!reveal && reveal.winnerId !== null && reveal.winnerId !== id;

  const seat = (id: string, i: number) => {
    const p = players.find((x) => x.id === id);
    const turn = view.turn === id;
    const won = !!reveal && reveal.winnerId === id;
    const card = reveal?.cards[id];
    const side = sides[id];
    return (
      <div key={id} className="fsg-seat" style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1 }}>
        <div className="fsg-who">
          <Avatar emoji={p?.avatar ?? '🎴'} size="4.5em" active={turn || won} offline={p ? !p.connected : false} />
          <div>
            <span className="fsg-name">{p?.name ?? '—'}</span>
            <div className="fsg-stack">
              {reveal ? <Swap from={reveal.before[id] ?? 0} to={view.chips[id] ?? 0} /> : (view.chips[id] ?? 0)}
              <small>{t(L.chips)}</small>
            </div>
          </div>
        </div>
        <div className="fsg-pair">
          <Card
            face="front"
            value={view.fronts![id] ?? null}
            size="1.05em"
            tag={t(L.front)}
            chosen={onZone(side, 'front')}
            win={won && onZone(side, 'front')}
          />
          {card ? (
            <Card
              face="back"
              value={card.back}
              size="1.05em"
              tag={t(L.back)}
              className="fsg-flip"
              delay={REVEAL_AT + i * 250}
              chosen={onZone(side, 'back')}
              win={won && onZone(side, 'back')}
            />
          ) : (
            <Card face="back" value={null} size="1.05em" tag={t(L.back)} chosen={onZone(side, 'back')} />
          )}
        </div>
        {!reveal && !side && <span className={`fsg-undecided ${turn ? 'fsg-turn' : ''}`}>{t(L.noSide)}</span>}
        {side && (
          <span className={`mp-chip ${side === 'both' ? 'mp-chip--crimson' : ''}`} style={{ fontSize: '1.1em' }}>
            {t(SIDE_LABEL[side])}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fsg-wrap">
      <Styles />
      <header className="fsg-head">
        <div className="mp-enter" key={`${view.phase}-${view.round}`}>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em', color: view.suddenDeath ? 'var(--crimson-hi)' : undefined }}>
            {view.suddenDeath ? `${t(L.suddenDeath)} · ${t(L.round)} ${view.round}` : `${t(L.round)} ${view.round}/${view.rounds}`}
          </span>
          <h1 className="fsg-h1">{t(reveal ? L.revealTitle : L.betTitle)}</h1>
          {sub && <p className="fsg-sub">{sub}</p>}
          {reveal ? (
            <div className="fsg-late" style={{ animationDelay: `${REVEAL_AT + 300}ms` }}>
              <p className="fsg-banner">{outcome(reveal, players, t)}</p>
              {reveal.bonus > 0 && (
                <span className="fsg-bonus">
                  {t(L.bonus)}: {nameOf(players, reveal.winnerId === view.order[0] ? view.order[1] : view.order[0])}{' '}
                  {t(L.bonusPays)} {reveal.bonus}
                </span>
              )}
              {bothMissed(reveal) && <span className="fsg-miss">{t(L.bothMissed)}</span>}
            </div>
          ) : (
            <p className="fsg-log" key={view.log.length}>
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

      <div className="fsg-board">
        {seat(left, 0)}
        <div className="fsg-table" style={{ gridColumn: 2, gridRow: 1 }}>
          <Zone face="front" side={sides[left] ?? null} level={levelOf(left)} value={zoneValue(left, 'front')} lost={lost(left)} t={t} />
          <div className="fsg-center">
            <div className="fsg-potnum" key={pot}>
              <span className="mp-enter">{pot}</span>
            </div>
            <span className="mp-eyebrow">{t(L.pot)}</span>
          </div>
          <Zone face="front" side={sides[right] ?? null} level={levelOf(right)} value={zoneValue(right, 'front')} lost={lost(right)} t={t} />
          <Zone face="back" side={sides[left] ?? null} level={levelOf(left)} value={zoneValue(left, 'back')} lost={lost(left)} t={t} />
          <div className="fsg-center">
            {!reveal && view.carry > 0 && (
              <span className="mp-chip mp-chip--crimson" style={{ fontSize: '1.05em' }}>
                +{view.carry} {t(L.carried)}
              </span>
            )}
          </div>
          <Zone face="back" side={sides[right] ?? null} level={levelOf(right)} value={zoneValue(right, 'back')} lost={lost(right)} t={t} />
        </div>
        {seat(right, 1)}
      </div>

      <span className="fsg-foot">
        {view.shoeLeft} {t(L.shoeLeft)}
      </span>
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
  const [pick, setPick] = useState<Side | null>(null);
  // A new turn (or a new round) resets the side pick and the raise stepper and unlocks the buttons.
  const turnKey = view ? `${view.round}-${view.log.length}-${view.phase}` : '';
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    setRaise(1);
    setPick(null);
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
          {!isHost && <p className="fsg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="fsg-row">
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
  if (!view.rivalId || !view.myCard) {
    return (
      <div className="stack">
        <Styles />
        <Panel>
          <p className="fsg-note">{t(L.watch)}</p>
        </Panel>
        {rulesButton}
        {reader}
      </div>
    );
  }

  const rivalId = view.rivalId;
  const rivalName = nameOf(players, rivalId);
  const me = you.you;
  const r = view.reveal;
  const sides = r ? r.sides : view.sides;
  const mySide = sides[me] ?? null;
  const rivalSide = sides[rivalId] ?? null;
  const sideNote = (side: Side | null) => (side ? t(SIDE_LABEL[side]) : t(L.noSide));

  const stats = (
    <div className="fsg-stats">
      <div>
        <b>{r ? <Swap from={r.before[me] ?? 0} to={view.chips[me] ?? 0} /> : (view.chips[me] ?? 0)}</b>
        <span>{t(L.you)}</span>
        <em>{sideNote(mySide)}</em>
      </div>
      <div>
        <b>{r ? r.pot : view.carry + (view.bets[me] ?? 0) + (view.bets[rivalId] ?? 0)}</b>
        <span>{t(L.pot)}</span>
        {!r && view.carry > 0 && (
          <em>
            +{view.carry} {t(L.carried)}
          </em>
        )}
      </div>
      <div>
        <b>{r ? <Swap from={r.before[rivalId] ?? 0} to={view.chips[rivalId] ?? 0} /> : (view.chips[rivalId] ?? 0)}</b>
        <span>{rivalName}</span>
        <em>{sideNote(rivalSide)}</em>
      </div>
    </div>
  );

  const rivalBack = r ? (r.cards[rivalId]?.back ?? null) : null;
  const cards = (
    <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
      <span className="mp-eyebrow">
        {view.suddenDeath ? `${t(L.suddenDeath)} · ${t(L.round)} ${view.round}` : `${t(L.round)} ${view.round}/${view.rounds}`}
      </span>
      <div className="fsg-duo">
        <div className="fsg-group">
          <span className="fsg-cap">{t(L.yourCard)}</span>
          <div className="fsg-prow">
            {(['front', 'back'] as Face[]).map((face) => (
              <Card
                key={face}
                face={face}
                value={view.myCard![face]}
                size={8}
                tag={t(face === 'front' ? L.front : L.back)}
                chosen={onZone(mySide ?? pick, face)}
                win={!!r && r.winnerId === me && onZone(mySide, face)}
              />
            ))}
          </div>
        </div>
        <div className="fsg-group">
          <span className="fsg-cap">{rivalName}</span>
          <div className="fsg-prow">
            <Card
              face="front"
              value={view.rivalFront}
              size={8}
              tag={t(L.front)}
              chosen={onZone(rivalSide, 'front')}
              win={!!r && r.winnerId === rivalId && onZone(rivalSide, 'front')}
            />
            <Card
              face="back"
              value={rivalBack}
              size={8}
              tag={t(L.back)}
              className={rivalBack !== null ? 'fsg-flip' : ''}
              delay={REVEAL_AT}
              chosen={onZone(rivalSide, 'back')}
              win={!!r && r.winnerId === rivalId && onZone(rivalSide, 'back')}
            />
          </div>
        </div>
      </div>
      {!r && (
        <p className="fsg-note" style={{ fontSize: '.95rem' }}>
          {t(L.backSecret)}
        </p>
      )}
    </Panel>
  );

  if (view.phase === 'reveal' && r) {
    return (
      <div className="stack">
        <Styles />
        {cards}
        <p className="fsg-note fsg-late" style={{ animationDelay: `${REVEAL_AT + 300}ms` }}>
          {r.winnerId === null ? outcome(r, players, t) : r.winnerId === me ? t(L.youWin) : t(L.youLose)}
          {r.bonus > 0 && ` · ${t(L.bonus)} +${r.bonus}`}
        </p>
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
  const choosing = view.myTurn && !view.sides[me];
  // The side this move is for: locked in, or the one tapped on the picker.
  const move: Move | undefined = view.moves.find((m) => m.side === (view.sides[me] ?? pick));
  const sideField = choosing ? { side: pick } : {};
  const maxRaise = move?.maxRaise ?? 0;
  const by = Math.min(raise, Math.max(1, maxRaise));
  const canBoth = view.moves.some((m) => m.side === 'both');

  return (
    <div className="stack">
      <Styles />
      {cards}
      {stats}
      {lastMove && <p className="fsg-note">{logLine(lastMove, players, t)}</p>}
      {view.myTurn ? (
        <Panel className="stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong className="fsg-big">{t(L.yourTurn)}</strong>
            <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          </div>
          {choosing ? (
            <>
              <span className="fsg-cap">{t(L.pickSide)}</span>
              <div className="fsg-sides">
                {(['front', 'back', 'both'] as Side[]).map((s) => {
                  const m = view.moves.find((x) => x.side === s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className="fsg-sidebtn"
                      aria-pressed={pick === s}
                      disabled={!m}
                      onClick={() => {
                        setPick(s);
                        setRaise(1);
                      }}
                    >
                      {t(SIDE_LABEL[s])}
                      {s === 'both' && <small>×2 · +10</small>}
                    </button>
                  );
                })}
              </div>
              {!canBoth && (
                <p className="fsg-note" style={{ fontSize: '.95rem' }}>
                  {t(rivalSide === 'both' ? L.rivalOnBoth : L.noBoth)}
                </p>
              )}
            </>
          ) : (
            <span className="fsg-cap">
              {t(L.yourSide)}: <b style={{ color: 'var(--gold-hi)' }}>{sideNote(view.sides[me] ?? null)}</b>
            </span>
          )}
          {move && (
            <>
              <Button block disabled={locked} onClick={() => act({ type: 'call', ...sideField })}>
                {view.checks
                  ? `${t(L.check)}${move.call > 0 ? ` +${move.call}` : ''}`
                  : `${t(L.call)} ${move.call > 0 ? `+${move.call}` : ''} · ${t(L.callReveal)}`}
              </Button>
              {maxRaise > 0 ? (
                <>
                  <div className="fsg-stepper">
                    <Button variant="ghost" disabled={by <= 1} onClick={() => setRaise(Math.max(1, by - 1))}>
                      <span aria-label={t(L.less)}>−</span>
                    </Button>
                    <output aria-live="polite">+{by}</output>
                    <Button variant="ghost" disabled={by >= maxRaise} onClick={() => setRaise(Math.min(maxRaise, by + 1))}>
                      <span aria-label={t(L.more)}>+</span>
                    </Button>
                  </div>
                  <div className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
                    {[2, 5, 10]
                      .filter((n) => n <= maxRaise)
                      .concat(maxRaise > 1 ? [maxRaise] : [])
                      .filter((n, i, a) => a.indexOf(n) === i)
                      .map((n) => (
                        <Button key={n} small variant="ghost" onClick={() => setRaise(n)}>
                          {n === maxRaise ? `All-in +${n}` : `+${n}`}
                        </Button>
                      ))}
                  </div>
                  <Button block variant="ghost" disabled={locked} onClick={() => act({ type: 'raise', by, ...sideField })}>
                    {t(L.raise)} +{by} {t(L.perSide)}
                    {move.side === 'both' ? ' (×2)' : ''}
                  </Button>
                </>
              ) : (
                <p className="fsg-note" style={{ fontSize: '1rem' }}>
                  {t(L.noRaise)}
                </p>
              )}
            </>
          )}
          <Button block variant="crimson" disabled={locked} onClick={() => act({ type: 'fold' })}>
            {t(L.fold)}
          </Button>
          <p className="fsg-note" style={{ fontSize: '.9rem' }}>
            {t(L.timeoutFolds)}
          </p>
        </Panel>
      ) : (
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          <p className="fsg-note">
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
