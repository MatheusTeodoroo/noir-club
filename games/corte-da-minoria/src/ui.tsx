import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  defineGameUI,
  type DealerProps,
  type DisplayProps,
  type I18nText,
  type PlayerProps,
} from '@mp/game-sdk';
import type { CrownReason, DealerView, Phase, PlayerView, PublicView, RoundRecord } from './logic.ts';
import { MIN_PER_SPACE, SPACES, type Color, type Space } from './shared.ts';
import { CREDITS, RULES, SLIDES, type DemoKind } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`, text goes through `t()`, and styles
// are scoped with the `cdmg-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];
type PublicPlatformView = DisplayProps['platform'];
type Seat = PublicPlatformView['players'][number];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  king: { 'pt-BR': 'Rei', en: 'King' },
  hall: { 'pt-BR': 'Salão', en: 'Hall' },
  court: { 'pt-BR': 'Corte', en: 'Court' },
  blue: { 'pt-BR': 'Azul', en: 'Blue' },
  green: { 'pt-BR': 'Verde', en: 'Green' },
  pass: { 'pt-BR': 'Passe Real', en: 'Royal Pass' },
  points: { 'pt-BR': 'pontos', en: 'points' },
  // TV titles and instruction lines
  electionTitle: { 'pt-BR': 'Eleição', en: 'Election' },
  electionSub: {
    'pt-BR': 'Votem em segredo no celular para eleger o primeiro rei.',
    en: 'Vote in secret on your phone to elect the first king.',
  },
  runoffTitle: { 'pt-BR': 'Desempate', en: 'Runoff' },
  runoffSub: {
    'pt-BR': 'Empate! Nova votação só entre os mais votados.',
    en: 'A tie! A new vote among the most voted only.',
  },
  crownTitle: { 'pt-BR': 'Vida longa ao rei', en: 'Long live the king' },
  byVote: { 'pt-BR': 'Eleito pela corte.', en: 'Elected by the court.' },
  byDraw: { 'pt-BR': 'Novo empate — coroado por sorteio.', en: 'Tied again — crowned by a draw.' },
  byHeir: { 'pt-BR': 'Nomeado sucessor por', en: 'Named heir by' },
  byRandom: { 'pt-BR': 'O trono não esperou — coroado por sorteio.', en: 'The throne didn’t wait — crowned by a draw.' },
  colorTitle: { 'pt-BR': 'Cores', en: 'Colours' },
  colorFirst: {
    'pt-BR': 'Escolham Azul ou Verde em segredo.',
    en: 'Pick Blue or Green in secret.',
  },
  colorAgain: {
    'pt-BR': 'Mantenham ou troquem a cor, em segredo.',
    en: 'Keep or switch your colour, in secret.',
  },
  colorDealer: { 'pt-BR': 'Todos ao Dealer, um de cada vez.', en: 'Everyone to the Dealer, one at a time.' },
  divideTitle: { 'pt-BR': 'A divisão', en: 'The split' },
  divideSub: {
    'pt-BR': 'divide a corte — pelo menos 2 em cada salão.',
    en: 'splits the court — at least 2 in each hall.',
  },
  passTitle: { 'pt-BR': 'Passe Real', en: 'Royal Pass' },
  passSub: {
    'pt-BR': 'Quem quiser trocar de salão, use agora o seu Passe Real.',
    en: 'Anyone who wants to switch halls: use your Royal Pass now.',
  },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  revealSub: { 'pt-BR': 'Quem estava em minoria?', en: 'Who was in the minority?' },
  minorityScores: { 'pt-BR': 'pontua', en: 'scores' },
  nobodyScores: { 'pt-BR': 'Ninguém pontua', en: 'Nobody scores' },
  successorTitle: { 'pt-BR': 'Sucessão', en: 'Succession' },
  successorSub: {
    'pt-BR': 'escolhe quem herda o trono.',
    en: 'picks who inherits the throne.',
  },
  finalTitle: { 'pt-BR': 'A corte revelada', en: 'The court revealed' },
  finalSub: {
    'pt-BR': 'Cada cor, cada salão, cada ponto.',
    en: 'Every colour, every hall, every point.',
  },
  usedPass: { 'pt-BR': 'usou o Passe', en: 'used the Pass' },
  thrones: { 'pt-BR': 'Tronos', en: 'Thrones' },
  total: { 'pt-BR': 'Total', en: 'Total' },
  // Phone
  yourColor: { 'pt-BR': 'Sua cor', en: 'Your colour' },
  holdToSee: { 'pt-BR': 'Segure para ver', en: 'Hold to see' },
  noColor: { 'pt-BR': 'sem cor ainda', en: 'no colour yet' },
  passReady: { 'pt-BR': 'Passe disponível', en: 'Pass available' },
  passSpent: { 'pt-BR': 'Passe usado', en: 'Pass used' },
  myPoints: { 'pt-BR': 'Seus pontos', en: 'Your points' },
  voteFor: { 'pt-BR': 'Vote no primeiro rei', en: 'Vote for the first king' },
  voteNote: {
    'pt-BR': 'Voto secreto. Pode votar em si e trocar até o tempo acabar.',
    en: 'Secret vote. You may vote for yourself and change it until time runs out.',
  },
  youAreKing: { 'pt-BR': 'Você é o rei!', en: 'You are the king!' },
  reigns: { 'pt-BR': 'reina nesta rodada', en: 'reigns this round' },
  pickColor: { 'pt-BR': 'Escolha sua cor em segredo', en: 'Pick your colour in secret' },
  keepOrSwitch: { 'pt-BR': 'Manter ou trocar?', en: 'Keep or switch?' },
  keep: { 'pt-BR': 'Manter', en: 'Keep' },
  switch: { 'pt-BR': 'Trocar', en: 'Switch' },
  chosen: {
    'pt-BR': 'Escolha registrada. Pode mudar até o tempo acabar.',
    en: 'Locked in. You can change it until time runs out.',
  },
  goDealer: { 'pt-BR': 'Vá ao Dealer escolher sua cor (botão acima).', en: 'Go to the Dealer to choose your colour (button above).' },
  atDealer: {
    'pt-BR': 'A tela do Dealer mostra sua cor atual. Escolha:',
    en: 'The Dealer screen shows your current colour. Choose:',
  },
  dealerDone: { 'pt-BR': 'Feito. Aguarde os outros.', en: 'Done. Wait for the others.' },
  splitHelp: { 'pt-BR': 'Coloque cada um em A ou B', en: 'Put everyone in A or B' },
  confirm: { 'pt-BR': 'Confirmar divisão', en: 'Confirm split' },
  splitNeed: { 'pt-BR': 'Todos posicionados, 2+ em cada salão', en: 'Everyone placed, 2+ in each hall' },
  kingSplitting: { 'pt-BR': 'O rei está dividindo a corte.', en: 'The king is splitting the court.' },
  youAreIn: { 'pt-BR': 'Você está no', en: 'You are in' },
  notPlaced: { 'pt-BR': 'Você ainda não foi posicionado.', en: 'You haven’t been placed yet.' },
  usePass: { 'pt-BR': 'Usar Passe Real → Salão', en: 'Use Royal Pass → Hall' },
  ready: { 'pt-BR': 'Pronto', en: 'Ready' },
  waitingOthers: { 'pt-BR': 'Aguardando os outros…', en: 'Waiting for the others…' },
  passGone: { 'pt-BR': 'Seu Passe Real já foi usado.', en: 'Your Royal Pass is already spent.' },
  scored: { 'pt-BR': 'Você pontuou! +1', en: 'You scored! +1' },
  notScored: { 'pt-BR': 'Sem ponto nesta rodada.', en: 'No point this round.' },
  pickHeir: { 'pt-BR': 'Escolha o próximo rei', en: 'Pick the next king' },
  kingPicking: { 'pt-BR': 'O rei escolhe o sucessor.', en: 'The king is picking the heir.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  left: { 'pt-BR': 'Você saiu desta partida.', en: 'You left this match.' },
  dealerCurrent: { 'pt-BR': 'Sua cor atual', en: 'Your current colour' },
  dealerNone: { 'pt-BR': 'Você ainda não tem cor', en: 'You have no colour yet' },
  dealerHint: {
    'pt-BR': 'Escolha no celular: Azul ou Verde. Não conte a ninguém.',
    en: 'Choose on your phone: Blue or Green. Tell no one.',
  },
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
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
} satisfies Record<string, I18nText>;

const COLOR_NAME: Record<Color, I18nText> = { blue: L.blue, green: L.green };
const other = (c: Color): Color => (c === 'blue' ? 'green' : 'blue');

const CSS = `
.cdmg-wrap,.cdmg-p,.cdmg-dealer,.cdmg-slide{--cdmg-blue:#3d7be0;--cdmg-blue-lo:#1d3f7a;--cdmg-green:#27a56f;--cdmg-green-lo:#11553a}
.cdmg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.4em 3.4em 1.4em;gap:1.2em;box-sizing:border-box}
.cdmg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.cdmg-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.cdmg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.2em 0 0}
.cdmg-sub b{color:var(--gold-hi);font-style:normal;font-family:var(--font-ui);font-weight:600}
.cdmg-board{min-height:0;display:grid;align-content:center}
.cdmg-seats{display:flex;flex-wrap:wrap;gap:1.6em 2.2em;justify-content:center;align-content:center}
.cdmg-seat{display:grid;justify-items:center;gap:.4em;font-weight:600;font-size:1.2em;width:6.4em;text-align:center}
.cdmg-seat > span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cdmg-seat--dim{opacity:.4}
.cdmg-tally{font-family:var(--font-display);font-weight:900;font-size:2.2em;color:var(--gold-hi);line-height:1}
.cdmg-halls{display:grid;grid-template-columns:1fr auto 1fr;gap:1.6em;align-items:stretch;min-height:0;height:100%}
.cdmg-hall{border-radius:var(--radius-lg);padding:1.2em;display:grid;grid-template-rows:auto 1fr auto;gap:.8em;min-height:0;
  background:radial-gradient(120% 90% at 50% 0%,rgba(212,175,55,.08),transparent 60%),var(--ink-1);box-shadow:0 0 0 1px var(--line-strong) inset}
.cdmg-hall h2{margin:0;text-align:center;font-family:var(--font-display);font-size:2.4em;letter-spacing:.12em;color:var(--gold-hi)}
.cdmg-hall h2 small{font-size:.55em;color:var(--text-dim);margin-left:.5em;letter-spacing:.05em}
.cdmg-hall .cdmg-seats{gap:1em 1.2em;align-content:flex-start}
.cdmg-hall .cdmg-seat{font-size:1em;width:5.6em}
.cdmg-pool{width:13em;display:grid;align-content:center;justify-items:center;gap:1em}
.cdmg-pool .cdmg-seats{gap:.5em .4em}
.cdmg-pool .cdmg-seat{font-size:.8em;width:5em}
.cdmg-count{display:flex;justify-content:center;gap:1.4em;font-family:var(--font-display);font-size:2.6em;font-weight:900}
.cdmg-count span{display:flex;align-items:center;gap:.3em;animation:cdmg-pop .7s cubic-bezier(.16,1,.3,1) both;animation-delay:2.5s}
.cdmg-verdict{text-align:center;font-size:1.8em;font-weight:600;color:var(--gold-hi);animation:cdmg-pop .7s cubic-bezier(.16,1,.3,1) both;animation-delay:3s}
.cdmg-verdict--none{color:var(--text-dim);font-weight:400;font-style:italic;font-family:var(--font-serif);font-size:1.7em}
.cdmg-dot{display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:-.08em;box-shadow:0 0 0 2px rgba(255,255,255,.12)}
.cdmg-dot--blue{background:radial-gradient(circle at 35% 30%,#9cc0ff,var(--cdmg-blue) 55%,var(--cdmg-blue-lo))}
.cdmg-dot--green{background:radial-gradient(circle at 35% 30%,#9ff0c9,var(--cdmg-green) 55%,var(--cdmg-green-lo))}
.cdmg-seal{display:inline-grid;place-items:center;width:1.1em;height:1.1em;border-radius:50%;font-size:.85em;vertical-align:-.1em;
  color:#1a0f05;background:linear-gradient(180deg,#f0d77a,var(--gold) 55%,#8c6c14)}
.cdmg-crown{color:var(--gold-hi)}
.cdmg-throne{display:flex;justify-content:center;align-items:center;gap:.7em;margin:0 14em;min-height:3em}
.cdmg-throne .mp-eyebrow{font-size:1em;margin-right:.6em}
.cdmg-king{display:grid;justify-items:center;gap:.8em;text-align:center}
.cdmg-king strong{font-family:var(--font-display);font-size:3.4em;color:var(--gold-hi);animation:cdmg-pop .8s cubic-bezier(.16,1,.3,1) both}
.cdmg-crownmark{font-size:5em;line-height:1;color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.6);animation:cdmg-drop 1s cubic-bezier(.16,1,.3,1) both}
@keyframes cdmg-pop{from{opacity:0;transform:scale(.5)}}
@keyframes cdmg-drop{from{opacity:0;transform:translateY(-1em)}}
.cdmg-moved{animation:cdmg-pop .6s cubic-bezier(.16,1,.3,1) both}
/* Final grid */
.cdmg-grid{display:grid;align-content:center;gap:.25em;font-size:var(--cdmg-fs,1em)}
.cdmg-grid-row{display:grid;grid-template-columns:11em repeat(var(--cdmg-cols),minmax(0,1fr)) 4em;align-items:center;gap:.3em}
.cdmg-grid-row > :first-child{display:flex;align-items:center;gap:.5em;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cdmg-cell{display:flex;align-items:center;justify-content:center;gap:.2em;height:1.8em;border-radius:.4em;font-size:.95em;font-weight:700;color:var(--text);background:rgba(255,255,255,.03)}
.cdmg-cell--blue{background:linear-gradient(180deg,rgba(61,123,224,.55),rgba(29,63,122,.55))}
.cdmg-cell--green{background:linear-gradient(180deg,rgba(39,165,111,.55),rgba(17,85,58,.55))}
.cdmg-cell--scored{box-shadow:0 0 0 2px var(--gold) inset;color:var(--gold-hi)}
.cdmg-grid-head{color:var(--text-mute);font-size:.85em;text-align:center}
.cdmg-total{font-family:var(--font-display);font-weight:900;font-size:1.4em;color:var(--gold-hi);text-align:center}
.cdmg-final-row{animation:cdmg-drop .6s cubic-bezier(.16,1,.3,1) backwards}
/* Phone */
.cdmg-p{display:grid;gap:12px}
.cdmg-status{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.cdmg-status .mp-chip{font-size:.85rem}
.cdmg-hold{border:0;border-radius:14px;min-height:56px;padding:10px 14px;font:inherit;font-weight:600;color:var(--text);cursor:pointer;
  background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;user-select:none;-webkit-user-select:none;touch-action:none;
  display:flex;align-items:center;justify-content:center;gap:10px}
.cdmg-hold .cdmg-dot{width:22px;height:22px}
.cdmg-colors{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.cdmg-colorbtn{border:0;border-radius:16px;min-height:96px;cursor:pointer;font-family:var(--font-display);font-size:1.4rem;font-weight:900;letter-spacing:.06em;color:#fff;
  text-transform:uppercase;transition:transform .15s}
.cdmg-colorbtn:active{transform:scale(.96)}
.cdmg-colorbtn--blue{background:linear-gradient(180deg,var(--cdmg-blue),var(--cdmg-blue-lo))}
.cdmg-colorbtn--green{background:linear-gradient(180deg,var(--cdmg-green),var(--cdmg-green-lo))}
.cdmg-list{display:grid;gap:8px}
.cdmg-pick{display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 12px;border:0;border-radius:14px;cursor:pointer;font:inherit;font-weight:600;
  color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;text-align:left}
.cdmg-pick[aria-pressed=true]{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.cdmg-place{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:4px 4px 4px 10px;border-radius:14px;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.cdmg-place > div:first-child{display:flex;align-items:center;gap:10px;font-weight:600;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cdmg-seg{display:flex;gap:4px}
.cdmg-seg button{width:52px;height:48px;border:0;border-radius:12px;cursor:pointer;font-family:var(--font-display);font-size:1.2rem;font-weight:900;
  color:var(--gold-hi);background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line) inset}
.cdmg-seg button[aria-pressed=true]{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.cdmg-big{font-family:var(--font-display);font-size:2rem;font-weight:900;text-align:center;margin:0;color:var(--gold-hi)}
.cdmg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.cdmg-counts{display:flex;justify-content:center;gap:18px;font-family:var(--font-display);font-weight:900;font-size:1.1rem;color:var(--gold-hi)}
/* Dealer */
.cdmg-dealer{container-type:inline-size;display:grid;place-items:center;align-content:center;gap:1em;text-align:center;padding:2em}
.tv .cdmg-dealer{min-height:100vh}
.cdmg-dealer .cdmg-orb{width:min(14em,40cqw);height:min(14em,40cqw);border-radius:50%;animation:cdmg-pop .8s cubic-bezier(.16,1,.3,1) both}
.cdmg-dealer strong{font-family:var(--font-display);font-size:min(5em,14cqw);letter-spacing:.08em;text-transform:uppercase}
.cdmg-dealer p{font-family:var(--font-serif);font-style:italic;font-size:min(1.8em,6cqw);color:var(--text-dim);margin:0}
/* Tutorial slide (TV) */
.cdmg-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em;box-sizing:border-box}
.cdmg-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.cdmg-slide b,.cdmg-rules b,.cdmg-tvrules b{color:var(--gold-hi);font-weight:600}
.cdmg-dots{display:flex;gap:.6em;margin-top:1.5em}
.cdmg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.cdmg-dots span[data-on='true']{background:var(--gold)}
.cdmg-demo{display:grid;gap:1.2em;justify-items:center;font-size:1.1em;width:100%}
.cdmg-demo .cdmg-hall h2{font-size:1.9em;white-space:nowrap}
.cdmg-demo .cdmg-halls{height:auto;grid-template-columns:1fr 1fr;width:100%}
.cdmg-demo .cdmg-hall{grid-template-rows:auto auto auto}
.cdmg-demo-orbs{display:flex;gap:3em}
.cdmg-demo-orbs > div{display:grid;justify-items:center;gap:.6em;font-family:var(--font-display);font-size:1.8em;font-weight:900}
.cdmg-demo-orbs .cdmg-dot{width:4em;height:4em}
/* Rules overlay (TV) and reader (phone) */
.cdmg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.cdmg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.cdmg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.cdmg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.cdmg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.cdmg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.cdmg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.cdmg-rules p{margin:0;line-height:1.5}
.cdmg-row{display:flex;gap:8px;width:100%}
.cdmg-row > *{flex:1}
`;

const Styles = () => <style>{CSS}</style>;

const Dot = ({ color }: { color: Color }) => <span className={`cdmg-dot cdmg-dot--${color}`} aria-hidden />;
const Seal = () => (
  <span className="cdmg-seal" aria-hidden>
    ✦
  </span>
);

/** Renders **bold** and the {blue} {green} {crown} {pass} icons inside a translated string. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{\w+\})/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part === '{blue}' || part === '{green}') return <Dot key={i} color={part.slice(1, -1) as Color} />;
    if (part === '{crown}')
      return (
        <span key={i} className="cdmg-crown">
          ♛
        </span>
      );
    if (part === '{pass}') return <Seal key={i} />;
    return part;
  });
}

const seatsOf = (platform: PublicPlatformView) => platform.players.filter((p) => !p.spectator);
const nameOf = (platform: PublicPlatformView, id: string | null) =>
  platform.players.find((p) => p.id === id)?.name ?? '—';

// ---------------------------------------------------------------------------
// Tutorial and rules (every game has both)
// ---------------------------------------------------------------------------

const DEMO_SEATS = ['🎩', '🦊', '🌙', '🃏', '🍷', '🎲', '💎'];

function DemoHall({
  kit,
  title,
  seats,
  footer,
}: {
  kit: Kit;
  title: string;
  seats: { emoji: string; badge?: ReactNode; active?: boolean; crimson?: boolean }[];
  footer?: ReactNode;
}) {
  const { Avatar } = kit;
  return (
    <div className="cdmg-hall">
      <h2>{title}</h2>
      <div className="cdmg-seats">
        {seats.map((s, i) => (
          <Avatar key={i} emoji={s.emoji} size="3.6em" badge={s.badge} active={s.active} crimson={s.crimson} />
        ))}
      </div>
      {footer ?? <span />}
    </div>
  );
}

/** Small live illustrations next to each slide, drawn with the game's real pieces. */
function SlideDemo({ demo, kit, t }: { demo: DemoKind; kit: Kit; t: T }) {
  const hall = (s: Space) => `${t(L.hall)} ${s}`;
  if (demo === 'colors') {
    return (
      <div className="cdmg-demo-orbs">
        {(['blue', 'green'] as Color[]).map((c) => (
          <div key={c}>
            <Dot color={c} />
            {t(COLOR_NAME[c])}
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'score') {
    const a: Color[] = ['blue', 'blue', 'blue', 'blue', 'green', 'green', 'green'];
    return (
      <div className="cdmg-demo">
        <DemoHall
          kit={kit}
          title={hall('A')}
          seats={a.map((c, i) => ({ emoji: DEMO_SEATS[i]!, badge: <Dot color={c} />, active: c === 'green' }))}
          footer={
            <div className="cdmg-verdict" style={{ animationDelay: '.4s' }}>
              4 <Dot color="blue" /> · 3 <Dot color="green" /> → <Dot color="green" /> +1
            </div>
          }
        />
      </div>
    );
  }
  const halls: Record<Space, { emoji: string; badge?: ReactNode; active?: boolean; crimson?: boolean }[]> =
    demo === 'court'
      ? {
          A: DEMO_SEATS.slice(0, 4).map((emoji) => ({ emoji, badge: '?' })),
          B: DEMO_SEATS.slice(4).map((emoji) => ({ emoji, badge: '?' })),
        }
      : demo === 'divide'
        ? {
            A: [{ emoji: '🎩', badge: '♛', active: true }, { emoji: '🦊' }, { emoji: '🌙' }],
            B: [{ emoji: '🃏' }, { emoji: '🍷' }],
          }
        : {
            A: [{ emoji: '🎩', badge: '♛' }, { emoji: '🦊' }],
            B: [{ emoji: '🃏' }, { emoji: '🍷' }, { emoji: '🌙', badge: <Seal />, crimson: true }],
          };
  return (
    <div className="cdmg-demo">
      <div className="cdmg-halls">
        <DemoHall kit={kit} title={hall('A')} seats={halls.A} />
        <DemoHall kit={kit} title={hall('B')} seats={halls.B} />
      </div>
      {demo === 'pass' && (
        <p className="cdmg-sub" style={{ fontSize: '1.4em' }}>
          🌙 A → B · {t(L.usedPass)}
        </p>
      )}
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: Kit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="cdmg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="cdmg-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="cdmg-sub" style={{ fontSize: '1.2em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="cdmg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="cdmg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
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
    <div className="cdmg-tvrules">
      <Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {page === RULES.length - 1 && CREDITS && (
          <p>
            <b>{t(L.credits)}</b> — {t(CREDITS)}
          </p>
        )}
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
    <div className="cdmg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="cdmg-rules">
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
        <div className="cdmg-row">
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

function crownLine(reason: CrownReason, platform: PublicPlatformView, view: PublicView, t: T) {
  if (reason === 'vote') return t(L.byVote);
  if (reason === 'draw') return t(L.byDraw);
  if (reason === 'random') return t(L.byRandom);
  const prev = view.reigned[view.reigned.length - 2] ?? null;
  return `${t(L.byHeir)} ${nameOf(platform, prev)}.`;
}

function SeatAvatar({
  kit,
  p,
  view,
  size,
  active,
  crimson,
  badge,
  dim,
  className,
}: {
  kit: Kit;
  p: Seat;
  view: PublicView;
  size: string;
  active?: boolean;
  crimson?: boolean;
  badge?: ReactNode;
  dim?: boolean;
  className?: string;
}) {
  const { Avatar } = kit;
  return (
    <div className={`cdmg-seat ${dim ? 'cdmg-seat--dim' : ''} ${className ?? ''}`}>
      <Avatar
        emoji={p.avatar}
        size={size}
        offline={!p.connected}
        active={active}
        crimson={crimson}
        badge={badge ?? (view.king === p.id ? '♛' : undefined)}
      />
      <span>{p.name}</span>
    </div>
  );
}

/** The two halls with the unplaced court between them (divide, pass and reveal). */
function Halls({ view, kit, t, seats }: { view: PublicView; kit: Kit; t: T; seats: Seat[] }) {
  const reveal = view.reveal;
  const inMatch = seats.filter((p) => view.active.includes(p.id));
  const pool = inMatch.filter((p) => !view.spaces[p.id]);
  const avatarSize = inMatch.length <= 8 ? '5.2em' : inMatch.length <= 11 ? '4.4em' : '3.8em';
  const passBadge = (id: string) =>
    view.passUsed[id] === undefined && view.phase === 'pass' ? <Seal /> : undefined;
  return (
    <div className="cdmg-halls">
      {SPACES.map((space, idx) => {
        const here = inMatch.filter((p) => view.spaces[p.id] === space);
        const counts = reveal?.counts[space];
        const minority = reveal?.minority[space];
        const hall = (
          <div className="cdmg-hall" key={space}>
            <h2>
              {t(L.hall)} {space}
              <small>{here.length}</small>
            </h2>
            <div className="cdmg-seats">
              {here.map((p) => {
                const moved = view.passUsed[p.id] === view.round;
                return (
                  <SeatAvatar
                    key={`${p.id}-${space}`}
                    kit={kit}
                    p={p}
                    view={view}
                    size={avatarSize}
                    crimson={moved}
                    active={view.ready.includes(p.id)}
                    badge={view.king === p.id ? '♛' : moved ? '↔' : passBadge(p.id)}
                    className={moved ? 'cdmg-moved' : undefined}
                  />
                );
              })}
            </div>
            {counts ? (
              <div style={{ display: 'grid', gap: '.4em' }}>
                <div className="cdmg-count">
                  <span>
                    {counts.blue} <Dot color="blue" />
                  </span>
                  <span>
                    {counts.green} <Dot color="green" />
                  </span>
                </div>
                {minority ? (
                  <div className="cdmg-verdict">
                    <Dot color={minority} /> {t(COLOR_NAME[minority])} {t(L.minorityScores)} +1
                  </div>
                ) : (
                  <div className="cdmg-verdict cdmg-verdict--none">{t(L.nobodyScores)}</div>
                )}
              </div>
            ) : (
              <span />
            )}
          </div>
        );
        if (idx === 0) {
          return [
            hall,
            <div className="cdmg-pool" key="pool">
              {pool.length > 0 && (
                <>
                  <span className="mp-eyebrow">{t(L.court)}</span>
                  <div className="cdmg-seats">
                    {pool.map((p) => (
                      <SeatAvatar key={p.id} kit={kit} p={p} view={view} size="3.2em" />
                    ))}
                  </div>
                </>
              )}
            </div>,
          ];
        }
        return hall;
      })}
    </div>
  );
}

/** Every player × every round: colour, hall and point, then the totals. */
function FinalGrid({ view, kit, t, seats }: { view: PublicView; kit: Kit; t: T; seats: Seat[] }) {
  const { Avatar } = kit;
  const final = view.final!;
  const rows = [...seats].sort((a, b) => (final.scores[b.id] ?? 0) - (final.scores[a.id] ?? 0));
  const best = Math.max(0, ...Object.values(final.scores));
  const fs = Math.min(1.25, 28 / ((rows.length + 1) * 2.1));
  const cols = final.history.length;
  const style = { '--cdmg-cols': cols, '--cdmg-fs': `${fs}em` } as CSSProperties;
  return (
    <div className="cdmg-grid" style={style}>
      <div className="cdmg-grid-row cdmg-grid-head">
        <span />
        {final.history.map((r) => (
          <span key={r.round}>
            {r.round} {seats.find((p) => p.id === r.king)?.avatar ?? ''}
          </span>
        ))}
        <span>{t(L.total)}</span>
      </div>
      {rows.map((p, i) => (
        <div className="cdmg-grid-row cdmg-final-row" key={p.id} style={{ animationDelay: `${2500 + i * 120}ms` }}>
          <span>
            <Avatar emoji={p.avatar} size="1.6em" active={(final.scores[p.id] ?? 0) === best && best > 0} />
            {p.name}
          </span>
          {final.history.map((r: RoundRecord) => {
            const color = r.colors[p.id];
            const space = r.spaces[p.id];
            const scored = r.scored.includes(p.id);
            return (
              <span
                key={r.round}
                className={`cdmg-cell ${color ? `cdmg-cell--${color}` : ''} ${scored ? 'cdmg-cell--scored' : ''}`}
              >
                {space ?? '—'}
                {r.king === p.id ? '♛' : ''}
                {r.passes.includes(p.id) ? '↔' : ''}
              </span>
            );
          })}
          <span className="cdmg-total">{final.scores[p.id] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

const TITLES: Record<Exclude<Phase, 'intro'>, I18nText> = {
  election: L.electionTitle,
  runoff: L.runoffTitle,
  crown: L.crownTitle,
  color: L.colorTitle,
  divide: L.divideTitle,
  pass: L.passTitle,
  reveal: L.revealTitle,
  successor: L.successorTitle,
  final: L.finalTitle,
};

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const seats = seatsOf(platform);
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

  const inMatch = seats.filter((p) => view.active.includes(p.id));
  const kingName = <b>♛ {nameOf(platform, view.king)}</b>;
  const sub: ReactNode = (() => {
    switch (view.phase) {
      case 'election':
        return t(L.electionSub);
      case 'runoff':
        return t(L.runoffSub);
      case 'crown':
        return view.crown ? crownLine(view.crown.reason, platform, view, t) : null;
      case 'color':
        return view.colorMode === 'dealer'
          ? t(L.colorDealer)
          : t(view.round === 1 ? L.colorFirst : L.colorAgain);
      case 'divide':
        return (
          <>
            {kingName} {t(L.divideSub)}
          </>
        );
      case 'pass':
        return t(L.passSub);
      case 'reveal':
        return t(L.revealSub);
      case 'successor':
        return (
          <>
            {kingName} {t(L.successorSub)}
          </>
        );
      case 'final':
        return t(L.finalSub);
    }
  })();

  let board: ReactNode = null;
  if (view.phase === 'election' || view.phase === 'runoff' || view.phase === 'color') {
    const voting = view.phase !== 'color';
    const list = view.phase === 'runoff' ? inMatch.filter((p) => view.candidates.includes(p.id)) : inMatch;
    board = (
      <div className="cdmg-board">
        <div className="cdmg-seats">
          {list.map((p) => {
            const done = voting ? view.voted.includes(p.id) : view.chosen.includes(p.id);
            return (
              <div key={p.id} className="cdmg-seat">
                <Avatar
                  emoji={p.avatar}
                  size={view.phase === 'runoff' ? '7em' : '5.2em'}
                  offline={!p.connected}
                  active={done}
                  crimson={view.atDealer === p.id}
                  badge={done ? '✓' : undefined}
                />
                <span>{p.name}</span>
                {view.phase === 'runoff' && view.tally && (
                  <span className="cdmg-tally">{view.tally[p.id] ?? 0}</span>
                )}
              </div>
            );
          })}
        </div>
        {view.phase === 'runoff' && (
          <p className="cdmg-sub" style={{ textAlign: 'center', marginTop: '1.4em', fontSize: '1.5em' }}>
            ✓ {view.voted.length}/{inMatch.length}
          </p>
        )}
      </div>
    );
  } else if (view.phase === 'crown' && view.crown) {
    const king = seats.find((p) => p.id === view.crown!.king);
    board = (
      <div className="cdmg-board">
        <div className="cdmg-king" key={view.crown.king}>
          <span className="cdmg-crownmark">♛</span>
          {king && <Avatar emoji={king.avatar} size="10em" active />}
          <strong>{king?.name}</strong>
          {view.tally && (
            <div className="cdmg-seats" style={{ marginTop: '1em' }}>
              {inMatch
                .filter((p) => (view.tally![p.id] ?? 0) > 0)
                .sort((a, b) => view.tally![b.id]! - view.tally![a.id]!)
                .map((p) => (
                  <div key={p.id} className="cdmg-seat" style={{ fontSize: '1em' }}>
                    <Avatar emoji={p.avatar} size="3em" />
                    <span className="cdmg-tally" style={{ fontSize: '1.6em' }}>
                      {view.tally![p.id]}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (view.phase === 'divide' || view.phase === 'pass' || view.phase === 'reveal') {
    board = <Halls view={view} kit={kit} t={t} seats={seats} />;
  } else if (view.phase === 'successor') {
    board = (
      <div className="cdmg-board">
        <div className="cdmg-seats">
          {inMatch.map((p) => (
            <SeatAvatar key={p.id} kit={kit} p={p} view={view} size="5.2em" dim={!view.heirs.includes(p.id)} />
          ))}
        </div>
      </div>
    );
  } else if (view.phase === 'final') {
    board = <FinalGrid view={view} kit={kit} t={t} seats={seats} />;
  }

  const showClock = view.phase !== 'crown' && view.phase !== 'reveal' && view.phase !== 'final';
  return (
    <div className="cdmg-wrap">
      <Styles />
      <header className="cdmg-head mp-enter" key={`${view.phase}-${view.round}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {view.round > 0 ? `${t(L.round)} ${view.round}/${view.rounds}` : t(L.electionTitle)}
          </span>
          <h1 className="cdmg-h1">{t(TITLES[view.phase])}</h1>
          <p className="cdmg-sub">{sub}</p>
        </div>
        {showClock && <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />}
      </header>
      {board}
      {view.phase !== 'final' && view.reigned.length > 0 ? (
        <footer className="cdmg-throne">
          <span className="mp-eyebrow">{t(L.thrones)}</span>
          {view.reigned.map((id) => {
            const p = seats.find((s) => s.id === id);
            return p ? <Avatar key={id} emoji={p.avatar} size="2.4em" active={id === view.king} badge="♛" /> : null;
          })}
          <span className="mp-eyebrow" style={{ marginLeft: '.6em' }}>
            {view.reigned.length}/{view.rounds}
          </span>
        </footer>
      ) : (
        <span />
      )}
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/** Your colour, hidden until you press and hold. */
function HoldColor({ color, t }: { color: Color | null; t: T }) {
  const [show, setShow] = useState(false);
  const on = () => setShow(true);
  const off = () => setShow(false);
  return (
    <button
      type="button"
      className="cdmg-hold"
      onPointerDown={on}
      onPointerUp={off}
      onPointerLeave={off}
      onPointerCancel={off}
      onContextMenu={(e) => e.preventDefault()}
    >
      {show ? (
        color ? (
          <>
            <Dot color={color} /> {t(COLOR_NAME[color])}
          </>
        ) : (
          t(L.noColor)
        )
      ) : (
        <>
          {t(L.yourColor)}: 👁 {t(L.holdToSee)}
        </>
      )}
    </button>
  );
}

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Avatar, Button, Countdown, Panel } = kit;
  const [rules, setRules] = useState(false);
  // Optimistic highlight so a tap feels instant; the engine's view wins on the next frame.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Space>>({});
  useEffect(() => setOptimistic(null), [view?.myVote, view?.phase, view?.chosen]);
  useEffect(() => setDraft({}), [view?.spaces, view?.phase]);
  if (!view) return null;
  const isHost = you.isAdmin;
  const seats = seatsOf(platform);
  const seat = (id: string) => seats.find((p) => p.id === id);

  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );
  const shell = (body: ReactNode) => (
    <div className="cdmg-p">
      <Styles />
      {body}
      {rulesButton}
      {reader}
    </div>
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return shell(
      <>
        <Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
          {!isHost && <p className="cdmg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="cdmg-row">
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
      </>,
    );
  }

  if (!view.active) {
    return shell(
      <Panel>
        <p className="cdmg-note">{t(L.left)}</p>
      </Panel>,
    );
  }

  const status = (
    <>
      <div className="cdmg-status">
        <span className="mp-chip">
          <Seal /> {t(view.passAvailable ? L.passReady : L.passSpent)}
        </span>
        <span className="mp-chip">
          {t(L.myPoints)}: {view.myScore}
        </span>
      </div>
      {view.colorMode === 'phone' && view.myColor && view.phase !== 'final' && <HoldColor color={view.myColor} t={t} />}
    </>
  );
  const clock = (
    <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
  );
  const people = (ids: string[], picked: string | null, onPick: (id: string) => void) => (
    <div className="cdmg-list">
      {ids.map((id) => {
        const p = seat(id);
        return (
          <button
            key={id}
            type="button"
            className="cdmg-pick"
            aria-label={p?.name ?? id}
            aria-pressed={picked === id}
            onClick={() => onPick(id)}
          >
            <Avatar emoji={p?.avatar ?? '?'} size={40} />
            {p?.name}
          </button>
        );
      })}
    </div>
  );

  switch (view.phase) {
    case 'election':
    case 'runoff': {
      const picked = optimistic ?? view.myVote;
      return shell(
        <>
          <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            {clock}
            <h3 style={{ margin: 0 }}>{t(view.phase === 'runoff' ? L.runoffTitle : L.voteFor)}</h3>
            <p className="cdmg-note">{t(L.voteNote)}</p>
          </Panel>
          {people(view.candidates, picked, (id) => {
            setOptimistic(id);
            send({ type: 'vote', target: id });
          })}
        </>,
      );
    }
    case 'crown':
      return shell(
        <>
          <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            <p className="cdmg-big">
              ♛ {view.isKing ? t(L.youAreKing) : nameOf(platform, view.king)}
            </p>
            {!view.isKing && <p className="cdmg-note">{t(L.reigns)}</p>}
          </Panel>
          {status}
        </>,
      );
    case 'color': {
      let body: ReactNode;
      if (view.colorMode === 'dealer') {
        body = view.visiting ? (
          <>
            <p className="cdmg-note">{t(L.atDealer)}</p>
            <div className="cdmg-colors">
              {(['blue', 'green'] as Color[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cdmg-colorbtn cdmg-colorbtn--${c}`}
                  onClick={() => send({ type: 'color', color: c })}
                >
                  {t(COLOR_NAME[c])}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="cdmg-note">{t(view.chosen ? L.dealerDone : L.goDealer)}</p>
        );
      } else if (!view.myColor) {
        body = (
          <>
            <p className="cdmg-note">{t(L.pickColor)}</p>
            <div className="cdmg-colors">
              {(['blue', 'green'] as Color[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cdmg-colorbtn cdmg-colorbtn--${c}`}
                  onClick={() => send({ type: 'color', color: c })}
                >
                  {t(COLOR_NAME[c])}
                </button>
              ))}
            </div>
          </>
        );
      } else {
        // Neutral words, so a glance over the shoulder says nothing about the colour.
        const mine = view.myColor;
        body = (
          <>
            <p className="cdmg-note">{t(view.chosen ? L.chosen : view.round === 1 ? L.pickColor : L.keepOrSwitch)}</p>
            {view.round === 1 ? (
              <div className="cdmg-colors">
                {(['blue', 'green'] as Color[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`cdmg-colorbtn cdmg-colorbtn--${c}`}
                    onClick={() => send({ type: 'color', color: c })}
                  >
                    {t(COLOR_NAME[c])}
                  </button>
                ))}
              </div>
            ) : (
              <div className="cdmg-row">
                <Button onClick={() => send({ type: 'color', color: mine })}>{t(L.keep)}</Button>
                <Button variant="crimson" onClick={() => send({ type: 'color', color: other(mine) })}>
                  {t(L.switch)}
                </Button>
              </div>
            )}
          </>
        );
      }
      return shell(
        <>
          <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            {clock}
            {body}
          </Panel>
          {status}
        </>,
      );
    }
    case 'divide': {
      if (view.isKing) {
        const spaces = { ...view.spaces, ...draft };
        const count = (s: Space) => view.players.filter((id) => spaces[id] === s).length;
        const valid =
          view.players.every((id) => spaces[id]) && SPACES.every((s) => count(s) >= MIN_PER_SPACE);
        const place = (id: string, s: Space) => {
          const next = spaces[id] === s ? null : s;
          setDraft((d) => {
            const copy = { ...d };
            if (next) copy[id] = next;
            else delete copy[id];
            return copy;
          });
          send({ type: 'place', target: id, space: next });
        };
        return shell(
          <>
            <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
              {clock}
              <h3 style={{ margin: 0 }}>{t(L.splitHelp)}</h3>
              <div className="cdmg-counts">
                <span>A · {count('A')}</span>
                <span>B · {count('B')}</span>
              </div>
            </Panel>
            <div className="cdmg-list">
              {view.players.map((id) => {
                const p = seat(id);
                return (
                  <div key={id} className="cdmg-place">
                    <div>
                      <Avatar emoji={p?.avatar ?? '?'} size={36} badge={id === you.you ? '♛' : undefined} />
                      {p?.name}
                    </div>
                    <div className="cdmg-seg">
                      {SPACES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-label={`${p?.name} → ${s}`}
                          aria-pressed={spaces[id] === s}
                          onClick={() => place(id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button block disabled={!valid} onClick={() => send({ type: 'confirm' })}>
              ♛ {t(L.confirm)}
            </Button>
            {!valid && <p className="cdmg-note">{t(L.splitNeed)}</p>}
            {status}
          </>,
        );
      }
      const mine = view.spaces[you.you];
      return shell(
        <>
          <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            {clock}
            <p className="cdmg-note">{t(L.kingSplitting)}</p>
            <p className="cdmg-big">{mine ? `${t(L.youAreIn)} ${t(L.hall)} ${mine}` : t(L.notPlaced)}</p>
          </Panel>
          {status}
        </>,
      );
    }
    case 'pass': {
      const mine = view.spaces[you.you]!;
      return shell(
        <>
          <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            {clock}
            <p className="cdmg-big">
              {t(L.youAreIn)} {t(L.hall)} {mine}
            </p>
          </Panel>
          {view.passAvailable ? (
            <>
              <Button block variant="crimson" onClick={() => send({ type: 'pass' })}>
                ✦ {t(L.usePass)} {mine === 'A' ? 'B' : 'A'}
              </Button>
              <Button block variant="ghost" disabled={view.ready} onClick={() => send({ type: 'ready' })}>
                {view.ready ? t(L.waitingOthers) : `✓ ${t(L.ready)}`}
              </Button>
            </>
          ) : (
            <p className="cdmg-note">{t(L.passGone)}</p>
          )}
          {status}
        </>,
      );
    }
    case 'reveal':
      return shell(
        <>
          <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            <p className="cdmg-big mp-enter" style={{ animationDelay: '2.5s', animationFillMode: 'backwards' }}>
              {view.scored ? t(L.scored) : t(L.notScored)}
            </p>
            <p className="cdmg-note">{t(L.watch)}</p>
          </Panel>
          {status}
        </>,
      );
    case 'successor':
      return shell(
        view.isKing ? (
          <>
            <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
              {clock}
              <h3 style={{ margin: 0 }}>{t(L.pickHeir)}</h3>
            </Panel>
            {people(view.heirs, optimistic, (id) => {
              setOptimistic(id);
              send({ type: 'heir', target: id });
            })}
          </>
        ) : (
          <>
            <Panel>
              <p className="cdmg-note">{t(L.kingPicking)}</p>
            </Panel>
            {status}
          </>
        ),
      );
    case 'final':
      return shell(
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <p className="cdmg-big">
            {view.myScore} {t(L.points)}
          </p>
          <p className="cdmg-note">{t(L.watch)}</p>
        </Panel>,
      );
  }
}

// ---------------------------------------------------------------------------
// Dealer
// ---------------------------------------------------------------------------

function Dealer({ view, t }: DealerProps<DealerView>) {
  if (!view) return null;
  return (
    <div className="cdmg-dealer">
      <Styles />
      <span className="mp-eyebrow">
        {t(L.round)} {view.round} · {t(view.current ? L.dealerCurrent : L.dealerNone)}
      </span>
      {view.current ? (
        <>
          <span className={`cdmg-orb cdmg-dot cdmg-dot--${view.current}`} />
          <strong>{t(COLOR_NAME[view.current])}</strong>
        </>
      ) : (
        <strong>?</strong>
      )}
      <p>{t(L.dealerHint)}</p>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });

