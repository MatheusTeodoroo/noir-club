import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { PlayerView, Prompt, PublicView, Result, Side } from './logic.ts';
import { ANSWER_MAX, QUESTION_MAX, normalize } from './shared.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`, text goes through `t()`, and styles
// are scoped with the `mamg-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];
type Seat = DisplayProps['platform']['players'][number];

const L = {
  turn: { 'pt-BR': 'Rodada', en: 'Round' },
  author: { 'pt-BR': 'Autor', en: 'Author' },
  writingTitle: { 'pt-BR': 'Escrevendo', en: 'Writing' },
  writingSub: { 'pt-BR': 'está criando um dilema para rachar a sala.', en: 'is crafting a dilemma to split the room.' },
  writingWait: { 'pt-BR': 'Prepare-se para escolher um lado.', en: 'Get ready to pick a side.' },
  votingTitle: { 'pt-BR': 'Escolha um lado', en: 'Pick a side' },
  votingSub: {
    'pt-BR': 'Vote no celular, em segredo. O Autor quer a sala rachada ao meio.',
    en: 'Vote on your phone, in secret. The Author wants the room split in half.',
  },
  auto: { 'pt-BR': 'O tempo acabou — a casa escolheu a pergunta.', en: 'Time ran out — the house picked the question.' },
  voted: { 'pt-BR': 'votaram', en: 'voted' },
  of: { 'pt-BR': 'de', en: 'of' },
  revealTitle: { 'pt-BR': 'A balança', en: 'The scale' },
  revealSub: {
    'pt-BR': 'Quanto mais nivelada, mais pontos para o Autor.',
    en: 'The more level it is, the more the Author scores.',
  },
  perfect: { 'pt-BR': 'Divisão perfeita!', en: 'Perfect split!' },
  nobodyVoted: { 'pt-BR': 'Ninguém votou.', en: 'Nobody voted.' },
  points: { 'pt-BR': 'pontos', en: 'points' },
  order: { 'pt-BR': 'Ordem dos Autores', en: 'Authors in order' },
  // phone
  youAuthor: { 'pt-BR': 'Você é o Autor!', en: 'You are the Author!' },
  youAuthorSub: {
    'pt-BR': 'Escreva um dilema que divida a sala exatamente ao meio.',
    en: 'Write a dilemma that splits the room exactly in half.',
  },
  question: { 'pt-BR': 'Pergunta ou situação', en: 'Question or situation' },
  questionPh: { 'pt-BR': 'Ex.: Morar na praia ou na montanha?', en: 'E.g.: Live by the beach or in the mountains?' },
  answerA: { 'pt-BR': 'Resposta A', en: 'Answer A' },
  answerB: { 'pt-BR': 'Resposta B', en: 'Answer B' },
  answerAPh: { 'pt-BR': 'Ex.: Praia', en: 'E.g.: Beach' },
  answerBPh: { 'pt-BR': 'Ex.: Montanha', en: 'E.g.: Mountains' },
  differ: { 'pt-BR': 'As duas respostas precisam ser diferentes.', en: 'The two answers must be different.' },
  suggest: { 'pt-BR': 'Sugerir', en: 'Suggest' },
  send: { 'pt-BR': 'Enviar', en: 'Send' },
  sending: { 'pt-BR': 'Enviando…', en: 'Sending…' },
  autoNote: {
    'pt-BR': 'Se o tempo acabar, a casa usa sua última sugestão.',
    en: 'If time runs out, the house uses your last suggestion.',
  },
  isWriting: { 'pt-BR': 'está escrevendo…', en: 'is writing…' },
  pickSide: { 'pt-BR': 'Escolha seu lado', en: 'Pick your side' },
  locked: {
    'pt-BR': 'Voto registrado. Pode trocar até a votação fechar.',
    en: 'Vote locked in. You can switch until voting closes.',
  },
  honest: {
    'pt-BR': 'Só o Autor pontua — responda com sinceridade.',
    en: 'Only the Author scores — answer honestly.',
  },
  live: { 'pt-BR': 'Sua pergunta está no ar', en: 'Your question is live' },
  cheer: { 'pt-BR': 'Torça pelo empate!', en: 'Root for a tie!' },
  youScored: { 'pt-BR': 'Você fez', en: 'You scored' },
  youVoted: { 'pt-BR': 'Você votou', en: 'You voted' },
  youAbstained: { 'pt-BR': 'Você não votou nesta rodada.', en: 'You didn’t vote this round.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  // tutorial and rules
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
  demoQ: { 'pt-BR': 'Café ou chá para o resto da vida?', en: 'Coffee or tea for the rest of your life?' },
  demoA: { 'pt-BR': 'Café', en: 'Coffee' },
  demoB: { 'pt-BR': 'Chá', en: 'Tea' },
} satisfies Record<string, I18nText>;

/** Reveal animations wait for the drumroll, in step with the `reveal` cue the logic emits. */
const REVEAL_DELAY = 2300;

const CSS = `
.mamg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr;padding:2.6em 4em 3.4em;gap:1.4em;box-sizing:border-box}
.mamg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.mamg-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.mamg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.2em 0 0}
.mamg-body{display:grid;align-content:center;gap:1.6em;min-height:0}
.mamg-q{font-family:var(--font-serif);font-style:italic;font-weight:600;color:var(--text);text-align:center;line-height:1.2;margin:0 auto;max-width:30em}
.mamg-duel{display:grid;grid-template-columns:1fr 16em 1fr;align-items:center;gap:2em}
.mamg-card{position:relative;border-radius:var(--radius-lg);padding:1.4em 1.6em;min-height:9em;display:grid;align-content:start;gap:.6em;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));box-shadow:0 0 0 1px var(--line-strong) inset}
.mamg-card[data-side=a]{box-shadow:0 0 0 2px var(--gold-lo) inset,0 0 3em -1em var(--gold-lo)}
.mamg-card[data-side=b]{box-shadow:0 0 0 2px var(--crimson-lo) inset,0 0 3em -1em var(--crimson-lo)}
.mamg-card[data-win=true]{transform:translateY(.4em)}
.mamg-cardtop{display:flex;align-items:center;gap:.8em}
.mamg-ans{flex:1;min-width:0;font-family:var(--font-display);font-weight:700;font-size:2em;line-height:1.15;color:var(--text);overflow-wrap:anywhere}
.mamg-count{margin-left:auto;font-family:var(--font-display);font-weight:900;font-size:4.2em;line-height:1;animation:mamg-pop .6s cubic-bezier(.16,1,.3,1) backwards}
.mamg-card[data-side=a] .mamg-count{color:var(--gold-hi)}
.mamg-card[data-side=b] .mamg-count{color:var(--crimson-hi)}
.mamg-names{display:flex;flex-wrap:wrap;gap:.5em .9em}
.mamg-name{display:flex;align-items:center;gap:.35em;font-size:1.15em;font-weight:600;animation:mamg-rise .5s var(--ease-out) backwards}
.mamg-badge{display:inline-grid;place-items:center;width:1.6em;height:1.6em;border-radius:50%;font-family:var(--font-display);font-weight:900;font-size:1.5em;flex:none;color:#160c04}
.mamg-badge[data-side=a]{background:linear-gradient(180deg,var(--gold-hi),var(--gold) 55%,var(--gold-lo))}
.mamg-badge[data-side=b]{background:linear-gradient(180deg,var(--crimson-hi),var(--crimson) 55%,var(--crimson-lo));color:#fff3ec}
.mamg-scale{width:100%;overflow:visible}
.mamg-beam,.mamg-pan{transition:transform 1.4s cubic-bezier(.34,1.4,.5,1)}
.mamg-sway{animation:mamg-sway 3.2s ease-in-out infinite}
@keyframes mamg-sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
.mamg-verdict{display:flex;align-items:center;justify-content:center;gap:.8em;flex-wrap:wrap;animation:mamg-pop .7s cubic-bezier(.16,1,.3,1) backwards}
.mamg-pts{font-family:var(--font-display);font-weight:900;font-size:4.6em;line-height:1;color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.45)}
.mamg-perfect{font-family:var(--font-display);font-size:1.7em;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-hi)}
.mamg-tally{display:flex;align-items:center;justify-content:center;gap:1.4em;flex-wrap:wrap}
.mamg-tally b{font-family:var(--font-display);font-size:2.2em;color:var(--gold-hi)}
.mamg-tally span{font-size:1.4em;color:var(--text-dim)}
.mamg-seats{display:flex;flex-wrap:wrap;gap:1.1em;justify-content:center}
.mamg-stage{display:grid;justify-items:center;gap:.8em;text-align:center}
.mamg-stage strong{font-family:var(--font-display);font-size:2.6em;color:var(--text)}
.mamg-dots::after{content:'';display:inline-block;width:1.2em;text-align:left;animation:mamg-dots 1.6s steps(4) infinite}
@keyframes mamg-dots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
.mamg-order{display:grid;gap:.8em;justify-items:center}
.mamg-turns{display:flex;flex-wrap:wrap;justify-content:center;gap:.6em .4em;max-width:78em}
.mamg-turnseat{display:grid;justify-items:center;gap:.25em;width:4.4em;font-size:1em}
.mamg-turnseat small{font-size:1.1em;color:var(--text-dim);max-width:4em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mamg-turnseat b{font-family:var(--font-display);font-size:1.1em;color:var(--gold-hi);min-height:1.2em}
.mamg-turnseat[data-state=next]{opacity:.55}
@keyframes mamg-pop{from{opacity:0;transform:scale(.4)}}
@keyframes mamg-rise{from{opacity:0;transform:translateY(.6em)}}
/* Phone */
.mamg-note{font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:var(--text-dim);text-align:center;margin:0}
.mamg-pq{font-family:var(--font-serif);font-style:italic;font-weight:600;font-size:1.35rem;line-height:1.3;text-align:center;margin:0;color:var(--text)}
.mamg-field{display:grid;gap:6px}
.mamg-field label{display:flex;justify-content:space-between;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-mute)}
.mamg-input{width:100%;box-sizing:border-box;border-radius:12px;background:var(--ink-2);color:var(--text);border:1px solid var(--line-strong);
  padding:12px;font:500 16px/1.35 var(--font-ui);resize:none}
.mamg-input:focus{outline:none;border-color:var(--gold)}
.mamg-input[data-side=a]{border-left:4px solid var(--gold)}
.mamg-input[data-side=b]{border-left:4px solid var(--crimson)}
.mamg-warn{color:var(--crimson-hi);font-size:.9rem;text-align:center;margin:0}
.mamg-sides{display:grid;gap:12px}
.mamg-side{display:flex;align-items:center;gap:14px;min-height:76px;padding:12px 16px;border-radius:16px;border:0;cursor:pointer;text-align:left;
  font:700 1.25rem/1.25 var(--font-ui);color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line-strong) inset;
  transition:transform .15s,box-shadow .2s,background .2s;-webkit-tap-highlight-color:transparent;overflow-wrap:anywhere}
.mamg-side:active{transform:scale(.97)}
.mamg-side .mamg-badge{font-size:1.4rem}
.mamg-pq .mamg-badge{font-size:1.05rem}
.mamg-side[data-side=a][aria-pressed=true]{background:rgba(212,175,55,.16);box-shadow:0 0 0 2px var(--gold) inset}
.mamg-side[data-side=b][aria-pressed=true]{background:rgba(160,30,40,.2);box-shadow:0 0 0 2px var(--crimson-hi) inset}
.mamg-big{font-family:var(--font-display);font-weight:900;font-size:3.4rem;line-height:1;color:var(--gold-hi);text-align:center;margin:0}
.mamg-row{display:flex;gap:8px}
.mamg-row > *{flex:1}
/* Tutorial slide (TV) */
.mamg-slide{height:100vh;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:4em;padding:4em 5em;box-sizing:border-box}
.mamg-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.mamg-slide b,.mamg-rules b,.mamg-tvrules b{color:var(--gold-hi);font-weight:600}
.mamg-slide .mamg-badge,.mamg-tvrules .mamg-badge{font-size:.8em;vertical-align:.1em}
.mamg-rules .mamg-badge{font-size:.85rem;vertical-align:.05em}
.mamg-pdots{display:flex;gap:.6em;margin-top:1.5em}
.mamg-pdots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.mamg-pdots span[data-on='true']{background:var(--gold)}
.mamg-demo{display:grid;gap:1.4em;justify-items:center;font-size:1em}
.mamg-mock{width:22em;border-radius:1.6em;padding:1.4em;display:grid;gap:.8em;background:var(--ink-1);box-shadow:0 0 0 1px var(--line-strong) inset,0 1.5em 3em -1em rgba(0,0,0,.6)}
.mamg-mock div{border-radius:.7em;background:var(--ink-2);padding:.7em .9em;font-size:1.2em;box-shadow:0 0 0 1px var(--line) inset}
.mamg-mock div[data-side=a]{border-left:.3em solid var(--gold)}
.mamg-mock div[data-side=b]{border-left:.3em solid var(--crimson)}
.mamg-ptable{display:grid;grid-template-columns:auto auto;gap:.5em 2.4em;font-size:1.8em;align-items:center}
.mamg-ptable span{font-family:var(--font-display);color:var(--text)}
.mamg-ptable b{font-family:var(--font-display);color:var(--gold-hi);text-align:right}
/* Rules overlay (TV) and reader (phone) */
.mamg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.mamg-tvrules .mp-panel{width:min(60em,90vw);padding:2.4em 3em}
.mamg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.mamg-tvrules p{font-size:1.5em;line-height:1.45;margin:0 0 .6em}
.mamg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.mamg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.mamg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.mamg-rules p{margin:0;line-height:1.5}
`;

const Styles = () => <style>{CSS}</style>;

const Badge = ({ side }: { side: Side }) => (
  <span className="mamg-badge" data-side={side} aria-hidden>
    {side.toUpperCase()}
  </span>
);

/** Renders **bold** and the {a} / {b} answer badges inside a translated string. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{[ab]\})/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part === '{a}' || part === '{b}') return <Badge key={i} side={part[1] as Side} />;
    return part;
  });
}

/** Question type size that keeps long questions on the TV without clipping. */
const questionSize = (q: string) => (q.length <= 50 ? '3.4em' : q.length <= 95 ? '2.8em' : '2.3em');

// ---------------------------------------------------------------------------
// The scale
// ---------------------------------------------------------------------------

/** A golden balance: A's pan on the left, B's on the right; the heavier side sinks. Level and swaying while undecided. */
function Scale({ a, b, delay = 0 }: { a: number | null; b: number | null; delay?: number }) {
  const decided = a !== null && b !== null;
  const total = (a ?? 0) + (b ?? 0);
  const deg = decided && total > 0 ? Math.max(-22, Math.min(22, ((b! - a!) / total) * 30)) : 0;
  // Pans hang from the beam ends (±80 units from the pivot) and stay upright.
  const drop = Math.sin((deg * Math.PI) / 180) * 80;
  const t = { transitionDelay: `${delay}ms` };
  return (
    <svg className="mamg-scale" viewBox="0 0 200 150" aria-hidden>
      <defs>
        <linearGradient id="mamg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3dc8a" />
          <stop offset=".55" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6a1c" />
        </linearGradient>
      </defs>
      <rect x="97.5" y="32" width="5" height="100" fill="url(#mamg-gold)" />
      <path d="M70 140 Q100 124 130 140 Z" fill="url(#mamg-gold)" />
      <g className={decided ? undefined : 'mamg-sway'} style={{ transformOrigin: '100px 32px' }}>
        <g className="mamg-beam" style={{ transform: `rotate(${deg}deg)`, transformOrigin: '100px 32px', ...t }}>
          <rect x="18" y="29" width="164" height="6" rx="3" fill="url(#mamg-gold)" />
        </g>
        {([
          [20, -drop, '#d4af37'],
          [180, drop, '#a8283a'],
        ] as const).map(([x, dy, rim]) => (
          <g key={x} className="mamg-pan" style={{ transform: `translateY(${dy}px)`, ...t }}>
            <path d={`M${x} 34 L${x - 16} 74 M${x} 34 L${x + 16} 74`} stroke="#c9a640" strokeWidth="1.2" />
            <path d={`M${x - 22} 74 Q${x} 92 ${x + 22} 74 Z`} fill="url(#mamg-gold)" stroke={rim} strokeWidth="1.5" />
          </g>
        ))}
      </g>
      <circle cx="100" cy="32" r="6" fill="url(#mamg-gold)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules (every game has both)
// ---------------------------------------------------------------------------

/** Small live illustrations next to each slide, drawn with the game's real pieces. */
function SlideDemo({ demo, kit, t }: { demo: (typeof SLIDES)[number]['demo']; kit: Kit; t: T }) {
  const { Avatar } = kit;
  if (demo === 'write') {
    return (
      <div className="mamg-demo">
        <div className="mamg-mock">
          <span className="mp-eyebrow">{t(L.youAuthor)}</span>
          <div>{t(L.demoQ)}</div>
          <div data-side="a">{t(L.demoA)}</div>
          <div data-side="b">{t(L.demoB)}</div>
        </div>
      </div>
    );
  }
  if (demo === 'vote') {
    const seats = ['🎩', '🦊', '🌙', '🦉'];
    return (
      <div className="mamg-demo">
        <p className="mamg-q" style={{ fontSize: '2.2em' }}>
          {t(L.demoQ)}
        </p>
        <div className="mamg-seats">
          {seats.map((e, i) => (
            <Avatar key={e} emoji={e} size="5em" active={i !== 2} badge={i !== 2 ? '✓' : undefined} />
          ))}
        </div>
        <div className="mamg-tally">
          <b>3</b>
          <span>
            {t(L.of)} 4 {t(L.voted)}
          </span>
        </div>
      </div>
    );
  }
  if (demo === 'scale') {
    return (
      <div className="mamg-demo" style={{ width: '100%' }}>
        <div style={{ width: '18em' }}>
          <Scale a={4} b={3} delay={400} />
        </div>
        <div className="mamg-row" style={{ width: '100%', gap: '1.4em' }}>
          <DemoCard side="a" label={t(L.demoA)} count={4} />
          <DemoCard side="b" label={t(L.demoB)} count={3} />
        </div>
      </div>
    );
  }
  return (
    <div className="mamg-demo">
      <div className="mamg-ptable">
        {(
          [
            ['4 × 4', 100],
            ['4 × 3', 75],
            ['6 × 1', 17],
            ['7 × 0', 0],
          ] as const
        ).map(([split, pts]) => (
          <PointsRow key={split} split={split} pts={pts} />
        ))}
      </div>
    </div>
  );
}

const PointsRow = ({ split, pts }: { split: string; pts: number }) => (
  <>
    <span>{split}</span>
    <b>{pts}</b>
  </>
);

const DemoCard = ({ side, label, count }: { side: Side; label: string; count: number }) => (
  <div className="mamg-card" data-side={side} style={{ minHeight: 0 }}>
    <div className="mamg-cardtop">
      <Badge side={side} />
      <span className="mamg-ans">{label}</span>
      <span className="mamg-count" style={{ animationDelay: '400ms' }}>
        {count}
      </span>
    </div>
  </div>
);

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: Kit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="mamg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="mamg-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="mamg-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="mamg-pdots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="mamg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: Kit; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="mamg-tvrules">
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
    <div className="mamg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="mamg-rules">
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
        <div className="mamg-row">
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

/** One answer on the TV: its badge and text, and at the reveal its count and who picked it. */
function AnswerCard({
  side,
  prompt,
  result,
  seats,
  kit,
  t,
}: {
  side: Side;
  prompt: Prompt;
  result: Result | null;
  seats: Seat[];
  kit: Kit;
  t: T;
}) {
  const ids = result?.[side] ?? null;
  const other = result?.[side === 'a' ? 'b' : 'a'].length ?? 0;
  return (
    <div className="mamg-card mp-enter" data-side={side} data-win={!!ids && ids.length > other}>
      <div className="mamg-cardtop">
        <Badge side={side} />
        <span className="mamg-ans">{t(prompt[side])}</span>
        {ids && (
          <span className="mamg-count" style={{ animationDelay: `${REVEAL_DELAY}ms` }}>
            {ids.length}
          </span>
        )}
      </div>
      {ids && (
        <div className="mamg-names">
          {ids.map((id, i) => {
            const p = seats.find((s) => s.id === id);
            return (
              p && (
                <span key={id} className="mamg-name" style={{ animationDelay: `${REVEAL_DELAY + 400 + i * 120}ms` }}>
                  <kit.Avatar emoji={p.avatar} size="1.7em" />
                  {p.name}
                </span>
              )
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Every player in Author order: past Authors with their points, the current one glowing. */
function AuthorOrder({ view, seats, kit, t }: { view: PublicView; seats: Seat[]; kit: Kit; t: T }) {
  return (
    <div className="mamg-order">
      <span className="mp-eyebrow">{t(L.order)}</span>
      <div className="mamg-turns">
        {view.order.map((id, i) => {
          const p = seats.find((s) => s.id === id);
          if (!p) return null;
          const state = i + 1 < view.turn ? 'done' : i + 1 === view.turn ? 'now' : 'next';
          return (
            <div key={id} className="mamg-turnseat" data-state={state}>
              <kit.Avatar emoji={p.avatar} size="3em" active={state === 'now'} offline={!p.connected} />
              <small>{p.name}</small>
              <b>{state === 'done' ? view.scores[id] : ''}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const seats = platform.players.filter((p) => !p.spectator);
  const author = seats.find((p) => p.id === view.authorId);
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

  const result = view.phase === 'reveal' ? view.result : null;
  const title = view.phase === 'writing' ? L.writingTitle : view.phase === 'voting' ? L.votingTitle : L.revealTitle;
  const sub =
    view.phase === 'writing'
      ? `${author?.name ?? ''} ${t(L.writingSub)}`
      : view.phase === 'voting'
        ? t(view.auto ? L.auto : L.votingSub)
        : t(L.revealSub);

  return (
    <div className="mamg-wrap">
      <Styles />
      <header className="mamg-head mp-enter" key={`${view.phase}-${view.turn}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(L.turn)} {view.turn}/{view.turns} · {t(L.author)}: {author?.name}
          </span>
          <h1 className="mamg-h1">{t(title)}</h1>
          <p className="mamg-sub">{sub}</p>
        </div>
        {view.phase !== 'reveal' && (
          <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />
        )}
      </header>

      {view.phase === 'writing' && (
        <div className="mamg-body">
          <div className="mamg-stage mp-enter" key={view.authorId}>
            {author && <Avatar emoji={author.avatar} size="7em" active offline={!author.connected} badge="✎" />}
            <strong>
              {author?.name}
              <span className="mamg-dots" />
            </strong>
            <p className="mamg-sub" style={{ margin: 0 }}>
              {t(L.writingWait)}
            </p>
          </div>
          <AuthorOrder view={view} seats={seats} kit={kit} t={t} />
        </div>
      )}

      {view.prompt && (
        <div className="mamg-body">
          <p className="mamg-q mp-enter" style={{ fontSize: questionSize(t(view.prompt.q)) }}>
            {t(view.prompt.q)}
          </p>
          <div className="mamg-duel">
            <AnswerCard side="a" prompt={view.prompt} result={result} seats={seats} kit={kit} t={t} />
            <div className="mamg-stage">
              <Scale
                a={result ? result.a.length : null}
                b={result ? result.b.length : null}
                delay={result ? REVEAL_DELAY : 0}
              />
            </div>
            <AnswerCard side="b" prompt={view.prompt} result={result} seats={seats} kit={kit} t={t} />
          </div>
          {result && (
            <div className="mamg-verdict" key={view.turn} style={{ animationDelay: `${REVEAL_DELAY + 900}ms` }}>
              {author && <Avatar emoji={author.avatar} size="4em" active />}
              <span className="mamg-pts">+{result.points}</span>
              <span className="mamg-sub" style={{ margin: 0 }}>
                {result.a.length + result.b.length === 0 ? t(L.nobodyVoted) : `${author?.name ?? ''} · ${t(L.points)}`}
              </span>
              {result.points === 100 && <span className="mamg-perfect">{t(L.perfect)}</span>}
            </div>
          )}
          {view.phase === 'voting' && (
            <>
              <div className="mamg-seats">
                {view.voters.map((id) => {
                  const p = seats.find((s) => s.id === id);
                  const done = view.voted.includes(id);
                  return (
                    p && (
                      <Avatar
                        key={id}
                        emoji={p.avatar}
                        size="3.6em"
                        title={p.name}
                        active={done}
                        offline={!p.connected}
                        badge={done ? '✓' : undefined}
                      />
                    )
                  );
                })}
              </div>
              <div className="mamg-tally">
                <b>{view.voted.length}</b>
                <span>
                  {t(L.of)} {view.voters.length} {t(L.voted)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/** The Author's form: a question and two answers, filled by "Suggest" or typed freely. */
function AuthorForm({ view, kit, t, send }: { view: PlayerView; kit: PlayerProps['kit']; t: T; send(a: unknown): void }) {
  const { Button } = kit;
  const [question, setQuestion] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!view.suggestion) return;
    setQuestion(t(view.suggestion.q));
    setA(t(view.suggestion.a));
    setB(t(view.suggestion.b));
  }, [view.suggestions]);
  const same = a.trim() !== '' && normalize(a) === normalize(b);
  const ready = question.trim() !== '' && a.trim() !== '' && b.trim() !== '' && !same;
  return (
    <div className="stack">
      <div className="mamg-field">
        <label>
          <span>{t(L.question)}</span>
          <span>
            {question.length}/{QUESTION_MAX}
          </span>
        </label>
        <textarea
          className="mamg-input"
          rows={3}
          value={question}
          maxLength={QUESTION_MAX}
          placeholder={t(L.questionPh)}
          onChange={(e) => setQuestion(e.target.value.replace(/\n/g, ' '))}
        />
      </div>
      {(
        [
          ['a', a, setA, L.answerA, L.answerAPh],
          ['b', b, setB, L.answerB, L.answerBPh],
        ] as const
      ).map(([side, value, set, label, ph]) => (
        <div className="mamg-field" key={side}>
          <label>
            <span>{t(label)}</span>
            <span>
              {value.length}/{ANSWER_MAX}
            </span>
          </label>
          <input
            className="mamg-input"
            data-side={side}
            value={value}
            maxLength={ANSWER_MAX}
            placeholder={t(ph)}
            autoComplete="off"
            onChange={(e) => set(e.target.value)}
          />
        </div>
      ))}
      {same && <p className="mamg-warn">{t(L.differ)}</p>}
      <div className="mamg-row">
        <Button variant="ghost" onClick={() => send({ type: 'suggest' })}>
          🎲 {t(L.suggest)}
        </Button>
        <Button
          disabled={!ready || sent}
          onClick={() => {
            setSent(true);
            send({ type: 'submit', question, a, b });
          }}
        >
          {t(sent ? L.sending : L.send)}
        </Button>
      </div>
      <p className="mamg-note" style={{ fontSize: '1rem' }}>
        {t(L.autoNote)}
      </p>
    </div>
  );
}

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Avatar, Button, Countdown, Panel } = kit;
  // Optimistic highlight so the tap feels instant; the engine's view wins on the next frame.
  const [optimistic, setOptimistic] = useState<Side | null>(null);
  const [rules, setRules] = useState(false);
  useEffect(() => setOptimistic(null), [view?.myVote, view?.phase]);
  if (!view) return null;
  const isHost = you.isAdmin;
  const author = platform.players.find((p) => p.id === view.authorId);

  // The rules are one tap away in every phase.
  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );
  const countdown = (
    <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
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
          {!isHost && <p className="mamg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="mamg-row">
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

  let body: ReactNode;
  if (view.phase === 'writing' && view.isAuthor) {
    body = (
      <>
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          {countdown}
          <span className="mp-eyebrow">{t(L.youAuthor)}</span>
          <p className="mamg-note">{t(L.youAuthorSub)}</p>
        </Panel>
        <AuthorForm view={view} kit={kit} t={t} send={send} />
      </>
    );
  } else if (view.phase === 'writing') {
    body = (
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {countdown}
        {author && <Avatar emoji={author.avatar} size={64} active />}
        <p className="mamg-pq" style={{ fontStyle: 'normal' }}>
          {author?.name} {t(L.isWriting)}
        </p>
        <p className="mamg-note">{t(L.writingWait)}</p>
      </Panel>
    );
  } else if (view.phase === 'voting' && view.prompt && view.isAuthor) {
    body = (
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {countdown}
        <span className="mp-eyebrow">{t(L.live)}</span>
        <p className="mamg-pq">{t(view.prompt.q)}</p>
        <p className="mamg-big" style={{ fontSize: '2.4rem' }}>
          {view.votedCount}/{view.voterCount}
        </p>
        <p className="mamg-note">
          {t(L.voted)} · {t(L.cheer)}
        </p>
      </Panel>
    );
  } else if (view.phase === 'voting' && view.prompt) {
    const mine = optimistic ?? view.myVote;
    const prompt = view.prompt;
    body = (
      <>
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          {countdown}
          <p className="mamg-pq">{t(prompt.q)}</p>
        </Panel>
        <div className="mamg-sides" role="group" aria-label={t(L.pickSide)}>
          {(['a', 'b'] as const).map((side) => (
            <button
              key={side}
              type="button"
              className="mamg-side"
              data-side={side}
              aria-pressed={mine === side}
              onClick={() => {
                setOptimistic(side);
                send({ type: 'vote', side });
              }}
            >
              <Badge side={side} />
              {t(prompt[side])}
            </button>
          ))}
        </div>
        <p className="mamg-note">{t(mine ? L.locked : L.honest)}</p>
      </>
    );
  } else if (view.phase === 'reveal' && view.result && view.prompt) {
    const r = view.result;
    const score = `${r.a.length} × ${r.b.length}`;
    body = (
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {view.isAuthor ? (
          <>
            <span className="mp-eyebrow">{t(L.youScored)}</span>
            <p className="mamg-big">+{r.points}</p>
            <p className="mamg-note">
              {score}
              {r.points === 100 ? ` · ${t(L.perfect)}` : ''}
            </p>
          </>
        ) : view.myVote ? (
          <>
            <span className="mp-eyebrow">{t(L.youVoted)}</span>
            <p className="mamg-pq" style={{ fontStyle: 'normal', display: 'flex', gap: 10, alignItems: 'center' }}>
              <Badge side={view.myVote} /> {t(view.prompt[view.myVote])}
            </p>
            <p className="mamg-note">{score}</p>
          </>
        ) : (
          <p className="mamg-note">{t(L.youAbstained)}</p>
        )}
        <p className="mamg-note">{t(L.watch)}</p>
      </Panel>
    );
  } else {
    body = (
      <Panel>
        <p className="mamg-note">{t(L.watch)}</p>
      </Panel>
    );
  }

  return (
    <div className="stack">
      <Styles />
      {body}
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
