import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { AutoBid, DuelReveal, PlayerView, PublicRound, PublicView } from './logic.ts';
import { LAMP_STAGES, REVEAL_AT, REVEAL_STEP_MS, lampsOf, stoneOf, type Stone } from './shared.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`, text goes through `t()`, and styles
// are scoped with the `omig-` prefix.

type T = (text: I18nText) => string;
type Players = DisplayProps['platform']['players'];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  tiebreak: { 'pt-BR': 'Desempate', en: 'Tiebreak' },
  leadTitle: { 'pt-BR': 'Abertura', en: 'Lead' },
  answerTitle: { 'pt-BR': 'Resposta', en: 'Answer' },
  tieTitle: { 'pt-BR': 'Empate', en: 'Tie' },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  leadSub: { 'pt-BR': '{n} faz a aposta', en: '{n} places a bid' },
  answerSub: { 'pt-BR': '{a} apostou {s} — {b} responde', en: '{a} bid {s} — {b} answers' },
  wonRound: { 'pt-BR': 'vence a rodada', en: 'wins the round' },
  tieSub: { 'pt-BR': 'Apostas iguais — ninguém vence.', en: 'Equal bids — nobody wins.' },
  numbersSecret: { 'pt-BR': 'Os valores continuam em segredo.', en: 'The amounts stay secret.' },
  tiebreakSub: {
    'pt-BR': 'O duelo terminou empatado — 99 pontos de novo, vitórias zeradas.',
    en: 'The duel ended level — 99 points again, wins back to zero.',
  },
  revealSub: { 'pt-BR': 'Todas as apostas do duelo, rodada a rodada.', en: 'Every bid of the duel, round by round.' },
  winsDuel: { 'pt-BR': '{n} vence o duelo', en: '{n} wins the duel' },
  duelTied: { 'pt-BR': 'Empate — vem aí um duelo de desempate!', en: 'Level — a tiebreak duel is coming!' },
  autoTime: { 'pt-BR': 'tempo esgotado: aposta 0', en: 'time up: bid 0' },
  autoEmpty: { 'pt-BR': 'sem pontos: aposta 0', en: 'out of points: bid 0' },
  onyx: { 'pt-BR': 'ônix', en: 'onyx' },
  ivory: { 'pt-BR': 'marfim', en: 'ivory' },
  oneDigit: { 'pt-BR': 'um dígito · 0–9', en: 'one digit · 0–9' },
  twoDigits: { 'pt-BR': 'dois dígitos · 10–99', en: 'two digits · 10–99' },
  wins: { 'pt-BR': 'vitórias', en: 'wins' },
  toWin: { 'pt-BR': '{n} vitórias vencem', en: '{n} wins take it' },
  lamp: { 'pt-BR': 'Lâmpada', en: 'Lamp' },
  left: { 'pt-BR': 'sobraram {n}', en: '{n} left' },
  history: { 'pt-BR': 'Rodadas', en: 'Rounds' },
  // Phone
  you: { 'pt-BR': 'Você', en: 'You' },
  yourTurn: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  yourPoints: { 'pt-BR': 'Seus pontos', en: 'Your points' },
  all: { 'pt-BR': 'Tudo', en: 'All' },
  bid: { 'pt-BR': 'Apostar {n}', en: 'Bid {n}' },
  lampAfter: { 'pt-BR': 'Sua lâmpada depois', en: 'Your lamp after' },
  rivalShowed: { 'pt-BR': '{n} apostou', en: '{n} bid' },
  youShowed: { 'pt-BR': 'Você apostou', en: 'You bid' },
  waiting: { 'pt-BR': 'Vez de {n}…', en: 'Waiting for {n}…' },
  youWon: { 'pt-BR': 'Você venceu a rodada!', en: 'You won the round!' },
  rivalWon: { 'pt-BR': '{n} venceu a rodada.', en: '{n} won the round.' },
  youWinDuel: { 'pt-BR': 'Você venceu o duelo!', en: 'You won the duel!' },
  youLoseDuel: { 'pt-BR': '{n} venceu o duelo.', en: '{n} won the duel.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
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
} satisfies Record<string, I18nText>;

const CSS = `
.omig-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.6em 4em 4.6em;gap:1em;overflow:hidden}
.omig-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.omig-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.omig-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.2em 0 0}
.omig-sub b{color:var(--gold-hi);font-style:normal;font-family:var(--font-ui);font-weight:600}
/* Stones (a bid's colour, and its number when the viewer may see it) */
.omig-stone{width:4em;height:4em;border-radius:50%;display:grid;place-items:center;flex:none;position:relative;
  font-family:var(--font-display);font-weight:900;line-height:1}
.omig-stone[data-s='onyx']{background:radial-gradient(circle at 35% 30%,#4a4650,#16141a 55%,#050406);color:var(--gold-hi);
  box-shadow:0 .25em .7em rgba(0,0,0,.6),0 0 0 .12em var(--gold-lo) inset,inset 0 .3em .6em rgba(255,255,255,.08)}
.omig-stone[data-s='ivory']{background:radial-gradient(circle at 35% 30%,#fffdf6,#efe4c8 55%,#c9b88a);color:#2a1d0c;
  box-shadow:0 .25em .7em rgba(0,0,0,.55),0 0 0 .12em var(--gold) inset,inset 0 -.3em .6em rgba(120,90,40,.25)}
.omig-stone[data-s='empty']{background:transparent;box-shadow:0 0 0 .1em var(--line-strong) inset}
.omig-stone[data-s='empty']::after{content:'?';font-size:1.6em;color:var(--text-mute)}
.omig-stone[data-s='empty'][data-blank='true']::after{content:none}
.omig-stone span{font-size:2em}
.omig-stone span[data-len='2']{font-size:1.55em}
.omig-win{box-shadow:0 0 0 .16em var(--gold-hi) inset,0 0 1.6em rgba(212,175,55,.7)!important}
.omig-lose{opacity:.45;filter:saturate(.6)}
.omig-flip{animation:omig-flip .7s cubic-bezier(.16,1,.3,1) backwards}
@keyframes omig-flip{from{transform:rotateY(90deg) scale(.85);opacity:0}}
.omig-late{animation:omig-rise .6s cubic-bezier(.16,1,.3,1) backwards}
@keyframes omig-rise{from{opacity:0;transform:translateY(.6em)}}
.omig-drop{animation:omig-drop .5s cubic-bezier(.16,1,.3,1) backwards}
@keyframes omig-drop{from{opacity:0;transform:translateY(-1.2em) scale(1.15)}}
/* Lamp: five bulbs, one goes out every 20 points spent */
.omig-lamp{display:flex;gap:.35em;align-items:flex-end;padding:.45em .6em;border-radius:.8em;background:linear-gradient(180deg,#141017,#0a080c);
  box-shadow:0 0 0 .08em var(--gold-lo) inset,0 .3em .8em rgba(0,0,0,.5)}
.omig-bulb{width:1em;height:1.7em;border-radius:.5em .5em .3em .3em;background:radial-gradient(circle at 50% 35%,#2a2520,#141114);
  box-shadow:0 0 0 .06em rgba(255,255,255,.06) inset;transition:background .6s,box-shadow .6s}
.omig-bulb[data-on='true']{background:radial-gradient(circle at 50% 35%,#fff6d0,var(--gold-hi) 45%,var(--gold) 80%);
  box-shadow:0 0 .9em rgba(212,175,55,.75),0 0 .2em rgba(255,240,200,.9) inset}
.omig-bulb[data-out='true']{animation:omig-out 1.1s steps(1) backwards}
@keyframes omig-out{0%,30%,60%{background:radial-gradient(circle at 50% 35%,#fff6d0,var(--gold-hi) 45%,var(--gold) 80%);box-shadow:0 0 .9em rgba(212,175,55,.75)}
  15%,45%,100%{background:radial-gradient(circle at 50% 35%,#2a2520,#141114);box-shadow:none}}
/* Board */
.omig-board{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:2.5em;min-height:0}
.omig-seat{display:grid;justify-items:center;gap:.6em;text-align:center}
.omig-stat{display:flex;align-items:center;gap:1.4em}
.omig-lampcell{display:grid;justify-items:center;gap:.5em}
.omig-lampcell small{font-size:1em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute)}
.omig-name{font-weight:600;font-size:1.6em}
.omig-score{font-family:var(--font-display);font-weight:900;font-size:4.5em;color:var(--gold-hi);line-height:1;text-shadow:0 0 .4em rgba(212,175,55,.3)}
.omig-score small{display:block;font-family:var(--font-ui);font-weight:500;font-size:.24em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute);margin-top:.35em;text-shadow:none}
.omig-cap{font-size:1em;letter-spacing:.18em;text-transform:uppercase;color:var(--text-mute)}
.omig-duel{display:flex;align-items:center;gap:2.2em}
.omig-vs{font-family:var(--font-serif);font-style:italic;font-size:2.2em;color:var(--text-mute)}
.omig-slot{display:grid;justify-items:center;gap:.6em}
.omig-autotag{font-size:1em;color:var(--warn);min-height:1.3em}
/* History strip */
.omig-hist{justify-self:center;display:flex;align-items:center;gap:1.4em;padding:.8em 1.6em;border-radius:var(--radius-lg);background:rgba(255,255,255,.025);box-shadow:0 0 0 1px var(--line) inset}
.omig-hist .mp-eyebrow{font-size:1em;white-space:nowrap}
.omig-cols{display:flex;gap:1em}
.omig-col{display:grid;justify-items:center;gap:.35em}
.omig-col b{font-family:var(--font-display);font-size:1em;color:var(--text-mute)}
.omig-col[data-now='true'] b{color:var(--gold-hi)}
.omig-names{display:grid;gap:.35em;font-size:1em;color:var(--text-dim);text-align:right}
.omig-names span{height:2.4em;display:flex;align-items:center;justify-content:flex-end;gap:.4em}
/* Reveal */
.omig-reveal{display:grid;justify-items:center;gap:1.6em}
.omig-rcols{display:flex;gap:1.3em}
.omig-rcol{display:grid;justify-items:center;gap:.6em}
.omig-rcol b{font-family:var(--font-display);font-size:1.1em;color:var(--text-mute)}
.omig-rnames{display:grid;gap:.6em;font-weight:600;text-align:right}
.omig-rnames span{display:flex;flex-direction:column;align-items:flex-end;justify-content:center}
.omig-rnames b{font-size:1.4em}
.omig-rnames small{font-weight:400;color:var(--text-mute);font-size:1em}
.omig-banner{font-family:var(--font-display);font-size:2.6em;color:var(--gold-hi);margin:0;text-align:center}
/* Phone */
.omig-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.omig-big{font-size:1.15rem}
.omig-row{display:flex;gap:8px}
.omig-row > *{flex:1}
.omig-scoreline{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;text-align:center;justify-items:center}
.omig-scoreline b{display:block;font-family:var(--font-display);font-size:2rem;color:var(--gold-hi);line-height:1.1}
.omig-scoreline span{font-size:.8rem;color:var(--text-mute);text-transform:uppercase;letter-spacing:.08em}
.omig-purse{display:flex;align-items:center;justify-content:space-between;gap:12px}
.omig-purse b{font-family:var(--font-display);font-size:1.8rem;color:var(--gold-hi)}
.omig-amount{display:flex;align-items:center;justify-content:center;gap:16px}
.omig-amount output{font-family:var(--font-display);font-weight:900;font-size:3.6rem;line-height:1;min-width:2ch;text-align:center;color:var(--gold-hi)}
.omig-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.omig-shown{display:flex;align-items:center;justify-content:center;gap:14px}
.omig-mine{display:grid;gap:6px}
.omig-mrow{display:grid;grid-template-columns:3.2em auto auto 1fr;align-items:center;gap:10px;font-size:.95rem;padding:4px 8px;border-radius:10px;background:rgba(255,255,255,.03)}
.omig-mrow em{font-style:normal;color:var(--text-mute)}
.omig-mrow i{font-style:normal;text-align:right;font-weight:600}
.omig-mrow i[data-r='w']{color:var(--ok)}
.omig-mrow i[data-r='l']{color:var(--crimson-hi)}
.omig-mrow i[data-r='t']{color:var(--text-mute)}
.omig-preveal{display:grid;gap:6px 4px;align-items:center;justify-items:center;font-size:.8rem}
/* Tutorial slide (TV) */
.omig-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em}
.omig-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.omig-slide b,.omig-rules b,.omig-tvrules b{color:var(--gold-hi);font-weight:600}
.omig-dots{display:flex;gap:.6em;margin-top:1.5em}
.omig-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.omig-dots span[data-on='true']{background:var(--gold)}
.omig-demo{display:grid;justify-items:center;gap:1.4em}
.omig-demorow{display:flex;gap:1em;align-items:center;justify-content:center}
/* Rules overlay (TV) and reader (phone) */
.omig-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.omig-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.omig-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.omig-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.omig-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.omig-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.omig-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.omig-rules p{margin:0;line-height:1.5}
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
const autoText = (a: AutoBid | undefined, t: T) => (a === 'time' ? t(L.autoTime) : a === 'empty' ? t(L.autoEmpty) : '');

// ---------------------------------------------------------------------------
// Pieces shared by the TV, the phone and the tutorial demos
// ---------------------------------------------------------------------------

/**
 * A bid's stone: `stone` null draws an empty slot; `n` shows its number (only ever the player's
 * own, or after the duel reveal). `size` is the font-size; the stone is 4× that across.
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
  const shown = n !== undefined && n !== null;
  return (
    <div
      className={`omig-stone ${className} ${win ? 'omig-win' : ''} ${lose ? 'omig-lose' : ''}`}
      data-s={stone ?? 'empty'}
      data-blank={blank}
      style={style}
      aria-label={shown ? String(n) : (stone ?? '?')}
    >
      {shown && <span data-len={String(n).length}>{n}</span>}
    </div>
  );
}

/**
 * A five-bulb lamp with `lit` bulbs on. A bulb that goes out while mounted flickers first.
 */
function Lamp({ lit, size, label }: { lit: number; size: string | number; label?: string }) {
  const [prev, setPrev] = useState(lit);
  const [out, setOut] = useState<number[]>([]);
  useEffect(() => {
    if (lit < prev) setOut(Array.from({ length: prev - lit }, (_, i) => lit + i));
    setPrev(lit);
  }, [lit]);
  return (
    <div className="omig-lamp" style={{ fontSize: size }} role="img" aria-label={label ?? `${lit}/${LAMP_STAGES}`}>
      {Array.from({ length: LAMP_STAGES }, (_, i) => (
        <span
          key={out.includes(i) ? `out-${i}-${lit}` : i}
          className="omig-bulb"
          data-on={i < lit}
          data-out={out.includes(i) && i >= lit}
        />
      ))}
    </div>
  );
}

/** The two-row strip of finished rounds: colours only, the winner's stone glowing. */
function HistoryStrip({ view, players, t, size = '.6em' }: { view: PublicView; players: Players; t: T; size?: string }) {
  return (
    <div className="omig-hist">
      <span className="mp-eyebrow">{t(L.history)}</span>
      <div className="omig-names">
        {view.order.map((id) => (
          <span key={id}>{nameOf(players, id)}</span>
        ))}
      </div>
      <div className="omig-cols">
        {Array.from({ length: view.rounds }, (_, i) => {
          const r: PublicRound | undefined = view.history[i];
          return (
            <div key={i} className="omig-col" data-now={i + 1 === view.round && !r}>
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

/** Every round of a finished duel, bids flipping in one after another. */
function RevealGrid({
  reveal,
  order,
  players,
  size,
  t,
}: {
  reveal: DuelReveal;
  order: string[];
  players: Players;
  size: string;
  t: T;
}) {
  return (
    <div className="omig-demorow" style={{ gap: '1.4em', alignItems: 'flex-start' }}>
      <div className="omig-rnames">
        {order.map((id) => (
          <span key={id} style={{ height: `calc(4 * ${size})` }}>
            <b>{nameOf(players, id)}</b>
            <small className="omig-late" style={{ animationDelay: `${REVEAL_AT + reveal.rounds.length * REVEAL_STEP_MS}ms` }}>
              {fill(t(L.left), { n: String(reveal.left[id] ?? 0) })}
            </small>
          </span>
        ))}
      </div>
      <div className="omig-rcols">
        {reveal.rounds.map((r, i) => (
          <div key={i} className="omig-rcol">
            {order.map((id) => {
              const n = r.bids[id]!;
              return (
                <StoneDisc
                  key={id}
                  stone={stoneOf(n)}
                  n={n}
                  size={size}
                  className="omig-flip"
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

/** Counts a demo lamp down 99 → 79 → 59 → … → 0 and starts over, so the bulbs go out one by one. */
function LampDemo({ t }: { t: T }) {
  const steps = [99, 85, 79, 52, 37, 12, 0];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % steps.length), 1500);
    return () => clearInterval(id);
  }, []);
  const points = steps[i]!;
  return (
    <div className="omig-demo">
      <Lamp lit={lampsOf(points)} size="3em" />
      <p className="omig-banner" style={{ fontSize: '3em' }}>
        {points}
      </p>
      <span className="omig-cap">{t(L.lamp)}</span>
    </div>
  );
}

function SlideDemo({ demo, kit, t }: { demo: (typeof SLIDES)[number]['demo']; kit: DisplayProps['kit']; t: T }) {
  const { Avatar } = kit;
  if (demo === 'colours') {
    return (
      <div className="omig-demo">
        <div className="omig-demorow">
          {[0, 4, 9].map((n, i) => (
            <StoneDisc key={n} stone="onyx" n={n} size="1.15em" className="omig-drop" delay={200 + i * 140} />
          ))}
        </div>
        <span className="omig-cap">
          {t(L.onyx)} · {t(L.oneDigit)}
        </span>
        <div className="omig-demorow">
          {[10, 42, 99].map((n, i) => (
            <StoneDisc key={n} stone="ivory" n={n} size="1.15em" className="omig-drop" delay={900 + i * 140} />
          ))}
        </div>
        <span className="omig-cap">
          {t(L.ivory)} · {t(L.twoDigits)}
        </span>
      </div>
    );
  }
  if (demo === 'round') {
    // The lead shows only its colour; the answer comes; the higher one (hidden) glows.
    return (
      <div className="omig-demo">
        <div className="omig-duel">
          <div className="omig-slot">
            <Avatar emoji="🎩" size="4.5em" />
            <StoneDisc stone="onyx" size="1.5em" className="omig-drop" delay={400} />
          </div>
          <span className="omig-vs">vs</span>
          <div className="omig-slot">
            <Avatar emoji="🦊" size="4.5em" active />
            <StoneDisc stone="ivory" size="1.5em" className="omig-drop omig-win" delay={1300} />
          </div>
        </div>
        <p className="omig-banner omig-late" style={{ animationDelay: '2100ms', fontSize: '1.8em' }}>
          🦊 {t(L.wonRound)}
        </p>
        <span className="omig-cap omig-late" style={{ animationDelay: '2400ms' }}>
          {t(L.numbersSecret)}
        </span>
      </div>
    );
  }
  if (demo === 'lamp') return <LampDemo t={t} />;
  const demoReveal: DuelReveal = {
    rounds: [
      [30, 12],
      [5, 9],
      [20, 20],
    ].map(([x, y]) => ({
      starter: 'a',
      bids: { a: x!, b: y! },
      winnerId: x === y ? null : x! > y! ? 'a' : 'b',
      auto: {},
    })),
    wins: { a: 1, b: 1 },
    left: { a: 44, b: 58 },
    winnerId: null,
  };
  const fake = [
    { id: 'a', name: '🎩' },
    { id: 'b', name: '🦊' },
  ] as unknown as Players;
  return (
    <div className="omig-demo">
      <RevealGrid reveal={demoReveal} order={['a', 'b']} players={fake} size=".9em" t={t} />
      <p className="omig-banner omig-late" style={{ animationDelay: `${REVEAL_AT + 3 * REVEAL_STEP_MS}ms`, fontSize: '1.6em' }}>
        {t(L.duelTied)}
      </p>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="omig-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="omig-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="omig-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="omig-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="omig-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
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
    <div className="omig-tvrules">
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
    <div className="omig-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="omig-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="omig-row">
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
      <div className="omig-wrap">
        <Styles />
        <header className="omig-head">
          <div className="mp-enter">
            <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
              {view.duel > 1 ? `${t(L.tiebreak)} ${view.duel - 1}` : `${r.rounds.length} ${t(L.history).toLowerCase()}`}
            </span>
            <h1 className="omig-h1">{t(L.revealTitle)}</h1>
            <p className="omig-sub">{t(L.revealSub)}</p>
          </div>
        </header>
        <div className="omig-reveal">
          <RevealGrid reveal={r} order={view.order} players={players} size=".78em" t={t} />
          <div className="omig-late" style={{ animationDelay: `${doneAt}ms` }}>
            <p className="omig-banner" style={{ fontSize: '4em' }}>
              {r.wins[a]} × {r.wins[b]}
            </p>
            <p className="omig-banner">
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
    sub = (
      <>
        {view.duel > 1 && view.round === 1 && `${t(L.tiebreakSub)} `}
        {rich(fill(t(L.leadSub), { n: `**${nameOf(players, view.starter)}**` }))}
      </>
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
    <div className="omig-wrap">
      <Styles />
      <header className="omig-head">
        <div className="mp-enter" key={`${view.duel}-${view.round}-${view.phase}-${!!leadStone}`}>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {eyebrow(view, t)} · {fill(t(L.toWin), { n: String(view.winTarget) })}
          </span>
          <h1 className="omig-h1">{title}</h1>
          <p className="omig-sub">{sub}</p>
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

      <div className="omig-board">
        {view.order.map((id, i) => {
          const p = players.find((x) => x.id === id);
          const won = !!result && result.winnerId === id;
          return (
            <div key={id} className="omig-seat" style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1 }}>
              <Avatar
                emoji={p?.avatar ?? '🎴'}
                size="4.8em"
                active={view.turn === id || won}
                offline={p ? !p.connected : false}
              />
              <span className="omig-name">{p?.name ?? '—'}</span>
              <div className="omig-stat">
                <div className="omig-score">
                  <span className="mp-enter" key={view.wins[id]}>
                    {view.wins[id] ?? 0}
                  </span>
                  <small>{t(L.wins)}</small>
                </div>
                <div className="omig-lampcell">
                  <Lamp key={`${view.duel}-${id}`} lit={view.lamps[id] ?? 0} size="1.35em" />
                  <small>{t(L.lamp)}</small>
                </div>
              </div>
            </div>
          );
        })}
        <div className="omig-duel" style={{ gridColumn: 2, gridRow: 1 }}>
          {[view.starter, responder].map((id, i) => {
            const s = view.current[id] ?? null;
            const slot = (
              <div key={`${view.round}-${i}`} className="omig-slot">
                <span className="omig-cap">{nameOf(players, id)}</span>
                <StoneDisc
                  stone={s}
                  size="2em"
                  className={s ? 'omig-drop' : ''}
                  win={!!result && result.winnerId === id}
                  lose={!!result && result.winnerId !== null && result.winnerId !== id}
                />
                <span className="omig-cap">{s ? stoneName(s, t) : ''}</span>
                <span className="omig-autotag">{autoText(view.auto[id], t)}</span>
              </div>
            );
            return i === 0 ? slot : [<span key="vs" className="omig-vs">vs</span>, slot];
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
  // The amount being set (not yet bid) and whether it was sent; a new turn resets both.
  const turnKey = view ? `${view.duel}-${view.round}-${view.phase}-${view.turn}` : '';
  const [amount, setAmount] = useState(0);
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    setAmount(0);
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
          {!isHost && <p className="omig-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="omig-row">
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
          <p className="omig-note">{t(L.watch)}</p>
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
    <div className="omig-scoreline">
      <div>
        <b>{view.wins[me] ?? 0}</b>
        <span>{t(L.you)}</span>
      </div>
      <span className="mp-eyebrow">{eyebrow(view, t)}</span>
      <div>
        <b>{view.wins[rival] ?? 0}</b>
        <span>{rivalName}</span>
      </div>
      <Lamp lit={view.lamps[me] ?? 0} size={10} />
      <span />
      <Lamp lit={view.lamps[rival] ?? 0} size={10} />
    </div>
  );

  const purse = (
    <div className="omig-purse">
      <span className="mp-eyebrow">{t(L.yourPoints)}</span>
      <b>{view.myPoints}</b>
    </div>
  );

  const myRounds = view.history.length > 0 && (
    <Panel className="stack">
      <span className="mp-eyebrow">{t(L.myRounds)}</span>
      <div className="omig-mine">
        {view.history.map((r, i) => {
          const res = r.winnerId === null ? 't' : r.winnerId === me ? 'w' : 'l';
          return (
            <div key={i} className="omig-mrow">
              <em>
                {t(L.round)} {i + 1}
              </em>
              <StoneDisc stone={stoneOf(view.myBids[i]!)} n={view.myBids[i]} size={8} />
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
          <div className="omig-preveal" style={{ gridTemplateColumns: `auto repeat(${r.rounds.length}, 1fr)` }}>
            {[me, rival].map((id) => (
              <div key={id} style={{ display: 'contents' }}>
                <span style={{ justifySelf: 'end', fontWeight: 600 }}>{id === me ? t(L.you) : rivalName}</span>
                {r.rounds.map((round, i) => {
                  const n = round.bids[id]!;
                  return (
                    <StoneDisc
                      key={i}
                      stone={stoneOf(n)}
                      n={n}
                      size={7}
                      className="omig-flip"
                      delay={REVEAL_AT + i * REVEAL_STEP_MS}
                      win={round.winnerId === id}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="omig-note omig-late" style={{ animationDelay: `${doneAt}ms` }}>
            {r.wins[me]} × {r.wins[rival]} —{' '}
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
    <div className="omig-shown">
      {view.mine !== null && (
        <div className="stack" style={{ justifyItems: 'center', gap: 6 }}>
          <span className="mp-eyebrow">{t(L.youShowed)}</span>
          <StoneDisc stone={stoneOf(view.mine)} n={view.mine} size={14} win={view.result?.winnerId === me} />
        </div>
      )}
      {rivalStone && (
        <div className="stack" style={{ justifyItems: 'center', gap: 6 }}>
          <span className="mp-eyebrow">{fill(t(L.rivalShowed), { n: rivalName })}</span>
          <StoneDisc stone={rivalStone} size={14} className="omig-drop" win={view.result?.winnerId === rival} />
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
          <strong className="omig-big">
            {w === null ? t(L.tieSub) : w === me ? t(L.youWon) : fill(t(L.rivalWon), { n: rivalName })}
          </strong>
        </Panel>
        <Panel>{purse}</Panel>
        {myRounds}
        {rulesButton}
        {reader}
      </div>
    );
  }

  const locked = sent === turnKey;
  const max = view.myPoints;
  const value = Math.min(amount, max);
  const step = (d: number) => setAmount(Math.max(0, Math.min(max, value + d)));

  return (
    <div className="stack">
      <Styles />
      {scoreline}
      {(view.mine !== null || rivalStone) && <Panel className="stack">{shown}</Panel>}
      {view.myTurn ? (
        <Panel className="stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong className="omig-big">{t(L.yourTurn)}</strong>
            <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          </div>
          {purse}
          <div className="omig-amount">
            <StoneDisc stone={stoneOf(value)} size={11} />
            <output aria-live="polite">{value}</output>
          </div>
          <div className="omig-steps">
            {[-10, -1, 1, 10].map((d) => (
              <Button
                key={d}
                small
                variant="ghost"
                disabled={locked || (d < 0 ? value === 0 : value === max)}
                onClick={() => step(d)}
              >
                {d > 0 ? `+${d}` : `−${-d}`}
              </Button>
            ))}
          </div>
          <div className="omig-row">
            <Button small variant="ghost" disabled={locked || value === 0} onClick={() => setAmount(0)}>
              0
            </Button>
            <Button small variant="ghost" disabled={locked || value === 9 || max < 9} onClick={() => setAmount(9)}>
              9
            </Button>
            <Button small variant="ghost" disabled={locked || value === 10 || max < 10} onClick={() => setAmount(10)}>
              10
            </Button>
            <Button small variant="ghost" disabled={locked || value === max} onClick={() => setAmount(max)}>
              {t(L.all)}
            </Button>
          </div>
          <div className="omig-purse">
            <span className="mp-eyebrow">{t(L.lampAfter)}</span>
            <Lamp lit={lampsOf(max - value)} size={12} />
          </div>
          <Button
            block
            disabled={locked}
            onClick={() => {
              setSent(turnKey);
              send({ type: 'bid', amount: value });
            }}
          >
            {fill(t(L.bid), { n: String(value) })}
          </Button>
        </Panel>
      ) : (
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />
          <p className="omig-note">{fill(t(L.waiting), { n: rivalName })}</p>
          {purse}
        </Panel>
      )}
      {myRounds}
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
