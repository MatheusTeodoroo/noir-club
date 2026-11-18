import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { Hand, PlayerView, PublicView, StackEvent } from './logic.ts';
import { CARDS, LIMIT, PILES, type Color, type Pile } from './shared.ts';
import { CREDITS, RULES, SLIDES, type Demo } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Styles are scoped with the `sg-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  hand: { 'pt-BR': 'Mão', en: 'Hand' },
  submitTitle: { 'pt-BR': 'Enviem', en: 'Send' },
  submitSub: {
    'pt-BR': 'Cada um escolhe em segredo uma carta e uma cor no celular.',
    en: 'Everyone secretly picks a card and a colour on their phone.',
  },
  newHand: {
    'pt-BR': 'Mão nova! Todos recebem de volta as cartas 0–6 e as sete cores. As pilhas continuam.',
    en: 'New hand! Everyone gets cards 0–6 and all seven colours back. The stacks stay.',
  },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  revealSub: {
    'pt-BR': 'Arco-íris primeiro, depois a carta maior. Empate: ★ e sentido horário.',
    en: 'Rainbow first, then the higher card. Ties: ★ then clockwise.',
  },
  placeTitle: { 'pt-BR': 'Empilhem', en: 'Stack' },
  turnOf: { 'pt-BR': 'Vez de', en: 'Up now:' },
  wait: { 'pt-BR': 'Próximo…', en: 'Next…' },
  queue: { 'pt-BR': 'Fila', en: 'Queue' },
  passedTag: { 'pt-BR': 'passou', en: 'passed' },
  autoTag: { 'pt-BR': 'auto', en: 'auto' },
  roundEndTitle: { 'pt-BR': 'Fim da rodada', en: 'Round over' },
  finalTitle: { 'pt-BR': 'Fim de jogo', en: 'Game over' },
  leader: { 'pt-BR': 'Menos penalidades:', en: 'Fewest penalties:' },
  noTopple: { 'pt-BR': 'Nada desabou. O ★ passa para', en: 'Nothing toppled. The ★ moves to' },
  markerTo: { 'pt-BR': 'O ★ fica com', en: 'The ★ goes to' },
  toppled: { 'pt-BR': 'Desabou!', en: 'Toppled!' },
  takes: { 'pt-BR': 'leva', en: 'takes' },
  penalties: { 'pt-BR': 'Penalidades', en: 'Penalties' },
  standing: { 'pt-BR': 'Classificação', en: 'Standings' },
  thisRound: { 'pt-BR': 'Nesta rodada', en: 'This round' },
  limit: { 'pt-BR': 'limite', en: 'limit' },
  // phone
  pickCard: { 'pt-BR': 'Carta (valor da ficha)', en: 'Card (chip value)' },
  pickColor: { 'pt-BR': 'Cor (qual pilha)', en: 'Colour (which stack)' },
  send: { 'pt-BR': 'Enviar', en: 'Send' },
  resend: { 'pt-BR': 'Trocar envio', en: 'Change' },
  sent: { 'pt-BR': 'Enviado. Pode trocar até todos enviarem.', en: 'Sent. You can change it until everyone has sent.' },
  chooseBoth: { 'pt-BR': 'Escolha uma carta e uma cor.', en: 'Pick a card and a colour.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  yourPlay: { 'pt-BR': 'Sua ficha', en: 'Your chip' },
  position: { 'pt-BR': 'Você é o nº', en: 'You are no.' },
  inQueue: { 'pt-BR': 'na fila', en: 'in the queue' },
  yourTurn: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  stack: { 'pt-BR': 'Empilhar', en: 'Stack' },
  pass: { 'pt-BR': 'Passar (ir para o fim)', en: 'Pass (go to the back)' },
  choosePile: { 'pt-BR': 'Arco-íris: escolha a pilha', en: 'Rainbow: choose the stack' },
  topples: { 'pt-BR': 'desaba', en: 'topples' },
  holds: { 'pt-BR': 'segura', en: 'holds' },
  done: { 'pt-BR': 'Você já empilhou nesta rodada.', en: 'You have stacked this round.' },
  marker: { 'pt-BR': 'Você tem o marcador ★', en: 'You hold the ★ marker' },
  // tutorial / rules
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

const PILE_NAME: Record<Color, I18nText> = {
  r: { 'pt-BR': 'Vermelha', en: 'Red' },
  g: { 'pt-BR': 'Verde', en: 'Green' },
  b: { 'pt-BR': 'Azul', en: 'Blue' },
  w: { 'pt-BR': 'Arco-íris', en: 'Rainbow' },
};

const CSS = `
.sg-chip{--c:#b3202f;display:inline-grid;place-items:center;width:1.2em;height:1.2em;border-radius:50%;vertical-align:-.2em;
  background:radial-gradient(circle,var(--c) 0 38%,#f3ead2 39% 44%,var(--c) 45%);
  box-shadow:0 0 0 .1em rgba(0,0,0,.5),inset 0 0 0 .14em rgba(255,255,255,.0);position:relative}
.sg-chip::after{content:'';position:absolute;inset:0;border-radius:50%;border:.14em dashed rgba(255,255,255,.75)}
.sg-chip[data-c=r]{--c:#b3202f}.sg-chip[data-c=g]{--c:#17784b}.sg-chip[data-c=b]{--c:#1f4fa8}
.sg-chip[data-c=w]{background:conic-gradient(#d23a3a,#e0b33a,#2f9b5e,#2f6fd0,#8a4ad0,#d23a3a)}
.sg-chip[data-c=w]::before{content:'';position:absolute;inset:32%;border-radius:50%;background:#f3ead2;opacity:.9}
/* TV */
.sg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.2em 3.5em 4em;gap:1.2em;
  background:radial-gradient(ellipse at 50% 45%,rgba(23,120,75,.22),transparent 65%)}
.sg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.sg-h1{font-family:var(--font-display);font-weight:900;font-size:4.2em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.sg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.2em 0 0}
.sg-sub b{color:var(--gold-hi);font-style:normal;font-family:var(--font-ui);font-weight:600}
.sg-main{display:grid;grid-template-columns:1fr auto;gap:2em;min-height:0;align-items:end}
.sg-table{position:relative;display:flex;justify-content:center;align-items:flex-end;gap:4em;height:100%;min-height:0;
  padding:0 2em 1em;border-bottom:.25em solid #5a4520;
  background:radial-gradient(ellipse at 50% 100%,rgba(23,120,75,.45),rgba(10,40,26,.0) 70%);border-radius:0 0 1em 1em}
.sg-pile{display:grid;justify-items:center;gap:.5em;height:100%;grid-template-rows:1fr auto auto;transition:filter .3s}
.sg-pile[data-hot=true]{filter:drop-shadow(0 0 .9em rgba(230,190,90,.65))}
.sg-tower{display:flex;flex-direction:column-reverse;align-items:center;justify-content:flex-start;height:100%;min-height:0;width:10em;
  overflow:hidden;padding-top:.4em}
/* Chips shrink together when a stack is taller than the space the screen leaves for it. */
.sg-disc{--c:#b3202f;width:9em;flex:0 1 1.9em;height:1.9em;min-height:.4em;overflow:hidden;border-radius:.6em/.5em;display:grid;place-items:center;margin-top:-.12em;
  background:linear-gradient(180deg,rgba(255,255,255,.25),transparent 30%,rgba(0,0,0,.35)),
    repeating-linear-gradient(90deg,var(--c) 0 1.1em,#f3ead2 1.1em 1.6em);
  box-shadow:0 .15em 0 rgba(0,0,0,.55),inset 0 0 0 .08em rgba(0,0,0,.35)}
.sg-disc span{font-family:var(--font-display);font-weight:900;color:#1a0f05;background:#f3ead2;border-radius:999px;
  padding:0 .55em;font-size:.9em;line-height:1.1;box-shadow:0 0 0 .08em rgba(0,0,0,.4)}
.sg-disc[data-c=r]{--c:#b3202f}.sg-disc[data-c=g]{--c:#17784b}.sg-disc[data-c=b]{--c:#1f4fa8}
.sg-disc[data-new=true]{animation:sg-drop .55s cubic-bezier(.2,1.4,.4,1) backwards}
@keyframes sg-drop{from{transform:translateY(-6em);opacity:0}}
.sg-sum{font-family:var(--font-display);font-weight:900;font-size:2.6em;line-height:1;color:var(--gold-hi)}
.sg-sum small{font-size:.4em;color:var(--text-mute);font-family:var(--font-ui);font-weight:500;margin-left:.3em}
.sg-sum[data-danger=true]{color:var(--crimson-hi)}
.sg-pname{font-size:1.2em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-dim);display:flex;gap:.4em;align-items:center}
.sg-boom{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;
  animation:sg-boom 3s ease forwards}
.sg-boom div{text-align:center;padding:1em 2.4em;border-radius:var(--radius-lg);background:rgba(40,6,10,.88);box-shadow:0 0 0 .1em var(--crimson),0 0 3em rgba(200,30,50,.5)}
.sg-boom strong{display:block;font-family:var(--font-display);font-size:4em;color:var(--crimson-hi);letter-spacing:.08em;text-transform:uppercase}
.sg-boom span{font-size:1.8em}
@keyframes sg-boom{0%{opacity:0;transform:scale(.7)}10%{opacity:1;transform:scale(1.05)}18%{transform:scale(1)}80%{opacity:1}100%{opacity:0}}
.sg-side{width:19em;align-self:stretch;display:grid;align-content:start;gap:.5em;min-height:0;overflow:hidden;
  -webkit-mask-image:linear-gradient(#000 82%,transparent);mask-image:linear-gradient(#000 82%,transparent)}
.sg-side h3{margin:0 0 .2em;font-family:var(--font-display);color:var(--gold);font-size:1.3em;letter-spacing:.15em;text-transform:uppercase}
.sg-qrow{display:flex;align-items:center;gap:.6em;font-size:1.15em;padding:.25em .5em;border-radius:.5em}
.sg-qrow[data-now=true]{background:rgba(212,175,55,.18);box-shadow:0 0 0 .08em var(--gold) inset}
.sg-qrow b{font-family:var(--font-display);color:var(--gold-hi);min-width:1.4em}
.sg-qrow em{margin-left:auto;font-style:normal;color:var(--text-mute);font-size:.8em}
/* Seats: at most two rows; Display sets --per (seats per row), --w (seat width) and --fs (seat
   type scale) from the player count, so 2 and 16 players both fill the strip without wrapping. */
.sg-seats{display:grid;grid-template-columns:repeat(var(--per),var(--w));justify-content:center;gap:.5em .6em}
.sg-seat{position:relative;font-size:var(--fs);display:grid;grid-template-columns:auto minmax(0,1fr) auto;
  grid-template-areas:"av name name" "av play pen" "sp sp sp";align-items:center;column-gap:.45em;row-gap:.1em;
  padding:.5em .5em .45em .9em;border-radius:var(--radius);min-width:0;
  background:rgba(255,255,255,.035);box-shadow:0 0 0 .06em var(--line) inset;transition:box-shadow .3s,background .3s}
.sg-av{grid-area:av}.sg-seat .sg-name{grid-area:name;padding-right:1.3em}
.sg-seat .sg-play{grid-area:play;font-size:1.1em;gap:.25em}
.sg-seat .sg-pen{grid-area:pen;justify-self:end;font-size:1.1em}
.sg-seat .sg-spent{grid-area:sp;justify-content:flex-start}
.sg-seat[data-turn=true]{background:rgba(212,175,55,.16);box-shadow:0 0 0 .12em var(--gold) inset,0 0 1.4em rgba(212,175,55,.35)}
.sg-seat[data-done=true]{opacity:.62}
.sg-seat .sg-name{font-weight:600;font-size:1.05em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sg-pen{font-family:var(--font-display);font-weight:900;font-size:1.25em;color:var(--crimson-hi)}
.sg-pen[data-zero=true]{color:var(--text-mute)}
.sg-star{position:absolute;top:.1em;left:.2em;color:var(--gold-hi);font-size:1.1em;text-shadow:0 0 .4em rgba(212,175,55,.8)}
.sg-ord{position:absolute;top:.2em;right:.4em;font-family:var(--font-display);font-weight:900;color:var(--gold-hi);font-size:.95em}
.sg-play{display:flex;align-items:center;gap:.35em;min-height:1.6em}
.sg-card{display:inline-grid;place-items:center;width:1.25em;height:1.65em;border-radius:.18em;font-family:var(--font-display);font-weight:900;
  background:linear-gradient(160deg,#f6eed8,#d9cba5);color:#1a0f05;box-shadow:0 .08em .2em rgba(0,0,0,.5);font-size:.9em}
.sg-in1{animation:sg-pop .5s cubic-bezier(.16,1,.3,1) backwards}
@keyframes sg-pop{from{opacity:0;transform:scale(.3)}}
.sg-spent{display:flex;flex-wrap:wrap;justify-content:center;gap:.15em;font-size:.72em;color:var(--text-mute);min-height:1.1em}
.sg-spent .sg-chip{width:.9em;height:.9em}
.sg-spent i{font-style:normal;text-decoration:line-through;font-family:var(--font-display)}
.sg-tag{font-size:.75em;color:var(--text-mute);text-transform:uppercase;letter-spacing:.12em}
.sg-play .sg-tag{font-size:.55em}
.sg-stand{display:grid;gap:.3em}
.sg-stand div{display:flex;gap:.6em;align-items:center;font-size:1.15em}
.sg-stand b{font-family:var(--font-display);color:var(--gold-hi);min-width:1.5em}
.sg-stand em{margin-left:auto;font-style:normal;font-family:var(--font-display);color:var(--crimson-hi)}
/* Tutorial slide (TV) */
.sg-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:3.5em;padding:3em 5em}
.sg-slide p{font-size:1.4em;line-height:1.4;margin:0 0 .6em;color:var(--text)}
.sg-slide b,.sg-rules b,.sg-tvrules b{color:var(--gold-hi);font-weight:600}
.sg-dots{display:flex;gap:.6em;margin-top:1.5em}
.sg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.sg-dots span[data-on='true']{background:var(--gold)}
.sg-demo{display:grid;justify-items:center;gap:1.2em;font-size:1.3em}
.sg-demo .sg-table{height:16em;width:100%;gap:2.2em}
.sg-demo .sg-tower{width:7em}.sg-demo .sg-disc{width:6.5em}
.sg-dhand{display:flex;gap:.4em;font-size:2em}
.sg-dline{display:flex;gap:.8em;align-items:center;font-size:1.4em}
.sg-arrow{color:var(--gold);font-size:1.4em}
/* Rules overlay (TV) and reader (phone) */
.sg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.sg-tvrules .mp-panel{width:min(62em,90vw);padding:2.2em 3em}
.sg-tvrules h2{font-family:var(--font-display);font-size:2.4em;margin:.2em 0 .5em;color:var(--gold-hi)}
.sg-tvrules p{font-size:1.4em;line-height:1.45;margin:0 0 .55em}
.sg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.sg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.sg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.sg-rules p{margin:0;line-height:1.5}
.sg-row{display:flex;gap:8px}
.sg-row > *{flex:1}
/* Phone */
.sg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.sg-label{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute);margin:4px 0 -2px}
.sg-cards{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.sg-pc{aspect-ratio:.72;border-radius:10px;border:0;cursor:pointer;font-family:var(--font-display);font-size:1.6rem;font-weight:900;
  color:#1a0f05;background:linear-gradient(160deg,#f6eed8,#d9cba5);box-shadow:0 2px 6px rgba(0,0,0,.5);transition:transform .12s}
.sg-pc:disabled{opacity:.18;cursor:default}
.sg-pc[aria-pressed=true]{transform:translateY(-6px);box-shadow:0 0 0 3px var(--gold),0 6px 14px rgba(212,175,55,.5)}
.sg-colors{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.sg-pcol{min-height:72px;border-radius:14px;border:0;cursor:pointer;display:grid;place-items:center;gap:2px;padding:8px 0;
  background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;color:var(--text);font-size:.8rem}
.sg-pcol .sg-chip{font-size:30px}
.sg-pcol:disabled{opacity:.2;cursor:default}
.sg-pcol[aria-pressed=true]{background:rgba(212,175,55,.18);box-shadow:0 0 0 2px var(--gold) inset}
.sg-big{display:flex;align-items:center;justify-content:center;gap:12px;font-size:2.6rem}
.sg-piles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sg-pbtn{min-height:96px;border-radius:14px;border:0;cursor:pointer;display:grid;place-items:center;gap:4px;padding:8px 0;color:var(--text);
  background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line-strong) inset;font-size:.95rem}
.sg-pbtn .sg-chip{font-size:28px}
.sg-pbtn b{font-family:var(--font-display);font-size:1.1rem}
.sg-pbtn[data-boom=true] b{color:var(--crimson-hi)}
.sg-forecast{text-align:center;font-size:1.05rem;margin:0}
.sg-forecast b{font-family:var(--font-display)}
.sg-forecast[data-boom=true] b{color:var(--crimson-hi)}
.sg-me{display:flex;justify-content:space-between;align-items:center;font-size:.95rem;color:var(--text-dim)}
.sg-me b{font-family:var(--font-display);color:var(--crimson-hi);font-size:1.2rem}
`;

const Styles = () => <style>{CSS}</style>;

const Chip = ({ c, style }: { c: Color; style?: CSSProperties }) => <i className="sg-chip" data-c={c} style={style} />;
const Card = ({ n, style, className }: { n: number; style?: CSSProperties; className?: string }) => (
  <span className={`sg-card ${className ?? ''}`} style={style}>
    {n}
  </span>
);
const fmtPen = (n: number) => (n === 0 ? '0' : `−${String(n).padStart(2, '0')}`);
const sumOf = (list: number[]) => list.reduce((a, b) => a + b, 0);

/** Renders **bold** and {r}/{g}/{b}/{w} chip tokens inside a translated string. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{[rgbw]\})/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{rich(part.slice(2, -2))}</b>;
    const m = /^\{([rgbw])\}$/.exec(part);
    if (m) return <Chip key={i} c={m[1] as Color} />;
    return part;
  });
}

// ---------------------------------------------------------------------------
// Board pieces
// ---------------------------------------------------------------------------

function Tower({ pile, chips, newId }: { pile: Pile; chips: number[]; newId?: boolean }) {
  // The chips shrink in CSS (flex-shrink) when the stack is taller than the space it has.
  return (
    <div className="sg-tower">
      {chips.map((v, i) => (
        <div key={`${i}-${v}`} className="sg-disc" data-c={pile} data-new={!!newId && i === chips.length - 1}>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Table({
  stacks,
  t,
  hot,
  last,
}: {
  stacks: Record<Pile, number[]>;
  t: T;
  hot?: Pile[];
  last?: StackEvent | null;
}) {
  return (
    <div className="sg-table">
      {PILES.map((p) => {
        const total = sumOf(stacks[p]);
        return (
          <div key={p} className="sg-pile" data-hot={!!hot?.includes(p)}>
            <Tower key={last?.pile === p ? `e${last.id}` : p} pile={p} chips={stacks[p]} newId={last?.pile === p} />
            <div className="sg-sum" data-danger={total >= LIMIT - 4}>
              {total}
              <small>/ {LIMIT}</small>
            </div>
            <div className="sg-pname">
              <Chip c={p} /> {t(PILE_NAME[p])}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

function SlideDemo({ demo, t }: { demo: Demo; t: T }) {
  if (demo === 'stacks') return <div className="sg-demo"><Table stacks={{ r: [3, 4], g: [6], b: [5, 2, 1] }} t={t} /></div>;
  if (demo === 'hand') {
    return (
      <div className="sg-demo">
        <div className="sg-dhand">
          {CARDS.map((n, i) => (
            <Card key={n} n={n} className="sg-in1" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <div className="sg-dhand">
          {(['r', 'r', 'g', 'g', 'b', 'b', 'w'] as Color[]).map((c, i) => (
            <Chip key={i} c={c} style={{ animation: `sg-pop .5s ${900 + i * 120}ms backwards` }} />
          ))}
        </div>
      </div>
    );
  }
  if (demo === 'order') {
    const rows: [string, number, Color, string][] = [
      ['🦊', 2, 'w', '1'],
      ['🎩', 6, 'r', '2'],
      ['🌙 ★', 4, 'g', '3'],
      ['🐍', 4, 'b', '4'],
    ];
    return (
      <div className="sg-demo" style={{ justifyItems: 'stretch' }}>
        {rows.map(([who, n, c, pos], i) => (
          <div key={i} className="sg-dline sg-in1" style={{ animationDelay: `${i * 400}ms` }}>
            <b style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-hi)', width: '1.2em' }}>{pos}</b>
            <span style={{ width: '3.4em' }}>{who}</span>
            <Card n={n} />
            <Chip c={c} />
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'pass') {
    return (
      <div className="sg-demo">
        <div className="sg-dline">
          {['🎩', '🦊', '🌙', '🐍'].map((a, i) => (
            <span key={i} style={{ opacity: i === 1 ? 0.35 : 1 }}>
              {a}
            </span>
          ))}
        </div>
        <span className="sg-arrow">↓ 🦊 {t(L.passedTag)}</span>
        <div className="sg-dline">
          {['🎩', '🌙', '🐍', '🦊'].map((a, i) => (
            <span key={i} className={i === 3 ? 'sg-in1' : undefined} style={{ animationDelay: '600ms' }}>
              {a}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="sg-demo">
      <div className="sg-dline">
        <Card n={6} /> + <Card n={5} /> + <Card n={2} /> = <b style={{ color: 'var(--crimson-hi)' }}>13</b>
      </div>
      <div className="sg-table" style={{ height: '10em', position: 'relative' }}>
        <div className="sg-pile">
          <Tower pile="g" chips={[2]} newId />
          <div className="sg-sum">2<small>/ {LIMIT}</small></div>
        </div>
        <div className="sg-boom" style={{ position: 'static', fontSize: '.55em', animation: 'sg-pop .6s 1s backwards' }}>
          <div>
            <strong>{t(L.toppled)}</strong>
            <span>−02</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TutorialSlide({ view, t }: { view: PublicView; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="sg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="sg-h1" style={{ fontSize: '3em', margin: '.2em 0 .4em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="sg-sub" style={{ fontSize: '1.1em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="sg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="sg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} t={t} />
    </div>
  );
}

function TvRules({ page, kit, t }: { page: number; kit: Kit; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  const last = page === RULES.length - 1;
  return (
    <div className="sg-tvrules">
      <Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {last && CREDITS && (
          <p>
            <b>{t(L.credits)}</b> — {t(CREDITS)}
          </p>
        )}
      </Panel>
    </div>
  );
}

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
    <div className="sg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="sg-rules">
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
        <div className="sg-row">
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

function Spent({ hand }: { hand: Hand }) {
  return (
    <div className="sg-spent">
      {hand.cards.map((n, i) => (
        <i key={`c${i}`}>{n}</i>
      ))}
      {hand.colors.map((c, i) => (
        <Chip key={`k${i}`} c={c} />
      ))}
    </div>
  );
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const players = platform.players.filter((p) => !p.spectator);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const name = (id: string | null | undefined) => (id ? (byId[id]?.name ?? '?') : '');
  const rulesOverlay = view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />;

  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} t={t} />
        {rulesOverlay}
      </>
    );
  }

  const isLast = view.round >= view.rounds;
  // Seat strip: one row up to 8 players, two rows beyond; seats share the 73em the stage leaves
  // and their type scales with their width.
  const n = view.seats.length;
  const per = n <= 8 ? n : Math.ceil(n / 2);
  const seatW = Math.min(13, (73 - (per - 1) * 0.6) / per);
  const seatVars = {
    '--per': per,
    '--w': `${seatW}em`,
    '--fs': `${Math.min(1.15, seatW / 11)}em`,
  } as CSSProperties;
  const last = view.events.at(-1) ?? null;
  const turnPlay = view.turn && view.plays ? view.plays[view.turn] : null;
  const hot: Pile[] = turnPlay ? (turnPlay.color === 'w' ? PILES : [turnPlay.color]) : [];
  const toppled = view.events.filter((e) => e.penalty > 0);

  let title = L.submitTitle;
  let sub: ReactNode = view.newHand ? t(L.newHand) : t(L.submitSub);
  if (view.phase === 'reveal') {
    title = L.revealTitle;
    sub = t(L.revealSub);
  } else if (view.phase === 'place') {
    title = L.placeTitle;
    sub = view.turn ? (
      <>
        {t(L.turnOf)} <b>{name(view.turn)}</b>
        {turnPlay && (
          <>
            {' '}
            · <Card n={turnPlay.card} /> <Chip c={turnPlay.color} />
          </>
        )}
      </>
    ) : (
      t(L.wait)
    );
  } else if (view.phase === 'roundEnd') {
    title = isLast ? L.finalTitle : L.roundEndTitle;
    sub = isLast ? (
      <>
        {t(L.leader)} <b>{name(view.standing[0])}</b>
      </>
    ) : toppled.length ? (
      <>
        {t(L.markerTo)} <b>{name(view.marker)}</b>
      </>
    ) : (
      <>
        {t(L.noTopple)} <b>{name(view.marker)}</b>
      </>
    );
  }

  const showCountdown = view.phase === 'submit' || (view.phase === 'place' && !!view.turn);
  const revealed = !!view.plays;
  const orderPos = (id: string) => (view.phase === 'reveal' || view.phase === 'place' ? view.order.indexOf(id) : -1);

  return (
    <div className="sg-wrap">
      <Styles />
      <header className="sg-head mp-enter" key={`${view.phase}-${view.round}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.15em' }}>
            {t(L.round)} {view.round}/{view.rounds} · {t(L.hand)} {Math.ceil(view.round / 7)} ({view.handRound}/7)
          </span>
          <h1 className="sg-h1">{t(title)}</h1>
          <p className="sg-sub">{sub}</p>
        </div>
        {showCountdown && (
          <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />
        )}
      </header>

      <div className="sg-main">
        <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
          <Table stacks={view.stacks} t={t} hot={hot} last={view.phase === 'place' ? last : null} />
          {view.phase === 'place' && last && last.penalty > 0 && (
            <div className="sg-boom" key={last.id}>
              <div>
                <strong>{t(L.toppled)}</strong>
                <span>
                  {name(last.playerId)} {t(L.takes)} <b style={{ color: 'var(--crimson-hi)' }}>{fmtPen(last.penalty)}</b>
                </span>
              </div>
            </div>
          )}
        </div>
        <aside className="sg-side">
          {view.phase === 'place' || view.phase === 'reveal' ? (
            <>
              <h3>{t(L.queue)}</h3>
              {view.order.slice(0, 10).map((id, i) => {
                const play = view.plays?.[id];
                return (
                  <div
                    key={id}
                    className="sg-qrow sg-in1"
                    data-now={id === view.turn}
                    style={{ animationDelay: view.phase === 'reveal' ? `${2600 + i * 150}ms` : undefined }}
                  >
                    <b>{i + 1}</b>
                    <span><kit.Avatar emoji={byId[id]?.avatar ?? "?"} size="1.3em" inline /></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '6.5em' }}>
                      {name(id)}
                    </span>
                    {play && (
                      <>
                        <Card n={play.card} />
                        <Chip c={play.color} />
                      </>
                    )}
                    {view.passed.includes(id) ? <em>{t(L.passedTag)}</em> : play?.auto ? <em>{t(L.autoTag)}</em> : null}
                  </div>
                );
              })}
              {view.order.length > 10 && <span className="sg-tag">+{view.order.length - 10}</span>}
            </>
          ) : view.phase === 'roundEnd' ? (
            <>
              <h3>{t(isLast ? L.standing : L.thisRound)}</h3>
              {isLast ? (
                <div className="sg-stand">
                  {view.standing.slice(0, 10).map((id, i) => (
                    <div key={id} className="sg-in1" style={{ animationDelay: `${i * 150}ms` }}>
                      <b>{i + 1}</b> <kit.Avatar emoji={byId[id]?.avatar ?? "?"} size="1.2em" inline /> {name(id)}
                      <em>{fmtPen(view.penalties[id] ?? 0)}</em>
                    </div>
                  ))}
                </div>
              ) : toppled.length ? (
                <div className="sg-stand">
                  {toppled.map((e) => (
                    <div key={e.id}>
                      <Chip c={e.pile} /> {name(e.playerId)}
                      <em>{fmtPen(e.penalty)}</em>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="sg-tag">—</span>
              )}
            </>
          ) : (
            <>
              <h3>{t(L.standing)}</h3>
              <div className="sg-stand">
                {view.standing.slice(0, 6).map((id, i) => (
                  <div key={id}>
                    <b>{i + 1}</b> <kit.Avatar emoji={byId[id]?.avatar ?? "?"} size="1.2em" inline /> {name(id)}
                    <em>{fmtPen(view.penalties[id] ?? 0)}</em>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <div className="sg-seats" style={seatVars}>
        {view.seats.map((id) => {
          const p = byId[id];
          const play = view.plays?.[id];
          const pos = orderPos(id);
          const sent = view.submitted.includes(id);
          return (
            <div
              key={id}
              className="sg-seat"
              data-turn={view.turn === id}
              data-done={view.phase === 'place' && view.placed.includes(id)}
            >
              {view.marker === id && <span className="sg-star">★</span>}
              {pos >= 0 && (
                <span className="sg-ord sg-in1" style={{ animationDelay: view.phase === 'reveal' ? '2600ms' : undefined }}>
                  {pos + 1}
                </span>
              )}
              <div className="sg-av">
                <Avatar
                  emoji={p?.avatar ?? '?'}
                  size="2.4em"
                  offline={p ? !p.connected : true}
                  active={view.phase === 'submit' ? sent : view.turn === id}
                  badge={view.phase === 'submit' && sent ? '✓' : undefined}
                />
              </div>
              <span className="sg-name">{p?.name ?? id}</span>
              <div className="sg-play" key={`${view.round}-${revealed}`}>
                {play ? (
                  <>
                    <span className="sg-in1" style={{ animationDelay: view.phase === 'reveal' ? '300ms' : undefined }}>
                      <Chip c={play.color} />
                    </span>
                    <span className="sg-in1" style={{ animationDelay: view.phase === 'reveal' ? '2300ms' : undefined }}>
                      <Card n={play.card} />
                    </span>
                  </>
                ) : view.autos.includes(id) ? (
                  <span className="sg-tag">{t(L.autoTag)}</span>
                ) : null}
              </div>
              <span className="sg-pen" data-zero={(view.penalties[id] ?? 0) === 0}>
                {fmtPen(view.penalties[id] ?? 0)}
              </span>
              {view.spent && <Spent hand={view.spent[id] ?? { cards: [], colors: [] }} />}
            </div>
          );
        })}
      </div>
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

const countColors = (colors: Color[]) =>
  colors.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c]: (acc[c] ?? 0) + 1 }), {});

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel } = kit;
  const [card, setCard] = useState<number | null>(null);
  const [color, setColor] = useState<Color | null>(null);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  // Selection follows what the engine holds; reset each round.
  useEffect(() => {
    setCard(view?.mySub?.card ?? null);
    setColor(view?.mySub?.color ?? null);
  }, [view?.round, view?.mySub?.card, view?.mySub?.color]);
  useEffect(() => setBusy(false), [view?.myTurn, view?.phase]);
  if (!view) return null;
  const isHost = you.isAdmin;

  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );
  const me = (
    <div className="sg-me">
      <span>{view.hasMarker ? t(L.marker) : `${t(L.round)} ${view.round}/${view.rounds}`}</span>
      <span>
        {t(L.penalties)} <b>{fmtPen(view.penalties)}</b>
      </span>
    </div>
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
          {!isHost && <p className="sg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="sg-row">
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

  if (view.phase === 'submit') {
    const counts = countColors(view.hand.colors);
    const changed = !view.mySub || view.mySub.card !== card || view.mySub.color !== color;
    return (
      <div className="stack">
        <Styles />
        {me}
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
          <p className="sg-note">{view.mySub && !changed ? t(L.sent) : t(L.chooseBoth)}</p>
        </Panel>
        <p className="sg-label">{t(L.pickCard)}</p>
        <div className="sg-cards">
          {CARDS.map((n) => (
            <button
              key={n}
              type="button"
              className="sg-pc"
              disabled={!view.hand.cards.includes(n)}
              aria-pressed={card === n}
              onClick={() => setCard(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="sg-label">{t(L.pickColor)}</p>
        <div className="sg-colors">
          {(['r', 'g', 'b', 'w'] as Color[]).map((c) => (
            <button
              key={c}
              type="button"
              className="sg-pcol"
              disabled={!counts[c]}
              aria-pressed={color === c}
              aria-label={t(PILE_NAME[c])}
              onClick={() => setColor(c)}
            >
              <Chip c={c} />
              <span>
                {t(PILE_NAME[c])} ×{counts[c] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <Button
          block
          disabled={card === null || color === null || !changed}
          onClick={() => card !== null && color && send({ type: 'submit', card, color })}
        >
          {view.mySub ? t(L.resend) : t(L.send)}
        </Button>
        {rulesButton}
        {reader}
      </div>
    );
  }

  const play = view.myPlay;
  const playLine = play && (
    <div className="sg-big">
      <Card n={play.card} />
      <Chip c={play.color} />
    </div>
  );

  if (view.phase === 'place' && view.myTurn && play) {
    const forecast = (p: Pile) => {
      const after = view.sums[p] + play.card;
      return { after, boom: after >= view.limit };
    };
    const act = (a: unknown) => {
      setBusy(true);
      send(a);
    };
    return (
      <div className="stack">
        <Styles />
        {me}
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <span className="mp-eyebrow">{t(L.yourTurn)}</span>
          {playLine}
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={64} paused={!!platform.paused} />
        </Panel>
        {play.color === 'w' ? (
          <>
            <p className="sg-label">{t(L.choosePile)}</p>
            <div className="sg-piles">
              {PILES.map((p) => {
                const f = forecast(p);
                return (
                  <button
                    key={p}
                    type="button"
                    className="sg-pbtn"
                    data-boom={f.boom}
                    disabled={busy}
                    aria-label={t(PILE_NAME[p])}
                    onClick={() => act({ type: 'place', pile: p })}
                  >
                    <Chip c={p} />
                    <span>{t(PILE_NAME[p])}</span>
                    <b>
                      {view.sums[p]} → {f.after}
                    </b>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="sg-forecast" data-boom={forecast(play.color).boom}>
              <Chip c={play.color} /> {view.sums[play.color]} + {play.card} → <b>{forecast(play.color).after}</b>{' '}
              ({t(forecast(play.color).boom ? L.topples : L.holds)})
            </p>
            <Button block disabled={busy} onClick={() => act({ type: 'place' })}>
              {t(L.stack)}
            </Button>
          </>
        )}
        {view.canPass && (
          <Button block variant="ghost" disabled={busy} onClick={() => act({ type: 'pass' })}>
            {t(L.pass)}
          </Button>
        )}
        {rulesButton}
        {reader}
      </div>
    );
  }

  return (
    <div className="stack">
      <Styles />
      {me}
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {play && <span className="mp-eyebrow">{t(L.yourPlay)}</span>}
        {playLine}
        {view.position !== null && view.phase !== 'roundEnd' ? (
          <p className="sg-note">
            {t(L.position)} {view.position} {t(L.inQueue)}
          </p>
        ) : view.phase === 'place' ? (
          <p className="sg-note">{t(L.done)}</p>
        ) : null}
        <p className="sg-note">{t(L.watch)}</p>
      </Panel>
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
