import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { FlashView, LogEntry, Note, PlayerView, PublicView, Shot } from './logic.ts';
import { COST, LABELS, MAX_CHARGE, aimSeat, pairLabel, pairOf } from './shared.ts';
import { CREDITS, RULES, SLIDES, type Demo } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`; styles use the `rrg-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];
type Pl = DisplayProps['platform']['players'][number];

/** Must match SHOT_REVEAL_MS in logic.ts (the TV shows the result as the cue lands). */
const SHOT_REVEAL_MS = 2_300;

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  turnN: { 'pt-BR': 'Jogada', en: 'Turn' },
  turnOf: { 'pt-BR': 'Vez de', en: 'Turn of' },
  playSub: {
    'pt-BR': 'Investigue, gire ou manipule pelo celular. Não esteja na mira de uma bala.',
    en: 'Investigate, spin or manipulate from your phone. Don’t be in front of a bullet.',
  },
  trigger: { 'pt-BR': 'O disparo começa quando {k} de {n} estiverem sem créditos.', en: 'The firing starts when {k} of {n} are out of credits.' },
  bullets: { 'pt-BR': '{b} balas no tambor', en: '{b} bullets in the cylinder' },
  bullet1: { 'pt-BR': '1 bala no tambor', en: '1 bullet in the cylinder' },
  inSights: { 'pt-BR': 'Na mira', en: 'In its sights' },
  history: { 'pt-BR': 'Últimas jogadas', en: 'Recent turns' },
  noHistory: { 'pt-BR': 'Nenhuma jogada ainda.', en: 'No turns yet.' },
  private: { 'pt-BR': 'ação privada', en: 'private action' },
  pubInv: { 'pt-BR': 'investigação pública', en: 'public investigation' },
  spin1: { 'pt-BR': 'giro simples', en: 'single spin' },
  spin2: { 'pt-BR': 'giro duplo', en: 'double spin' },
  bullet: { 'pt-BR': 'bala', en: 'bullet' },
  empty: { 'pt-BR': 'vazia', en: 'empty' },
  fireTitle: { 'pt-BR': 'O disparo', en: 'The firing' },
  fireSub: {
    'pt-BR': 'Começa em quem está na mira e segue no sentido horário.',
    en: 'It starts with whoever is in its sights and goes clockwise.',
  },
  aimingAt: { 'pt-BR': 'Câmara {c} contra', en: 'Chamber {c} at' },
  click: { 'pt-BR': 'clique', en: 'click' },
  bang: { 'pt-BR': 'bang!', en: 'bang!' },
  endTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  hitList: { 'pt-BR': 'Atingidos', en: 'Hit' },
  survivors: { 'pt-BR': 'Sobreviventes ganham 1 ponto.', en: 'Survivors score 1 point.' },
  pubOnPhones: { 'pt-BR': 'resultado nos celulares', en: 'result on the phones' },
  flashPub: { 'pt-BR': 'Investigação pública de {name}', en: 'Public investigation by {name}' },
  flashPriv: { 'pt-BR': 'Sua investigação particular', en: 'Your private investigation' },
  flashHint: { 'pt-BR': 'Memorize — some em instantes.', en: 'Memorize it — it fades in a moment.' },
  // Phone
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
  charge: { 'pt-BR': 'Carga da manipulação', en: 'Manipulation charge' },
  secretNote: { 'pt-BR': 'Só você vê isto.', en: 'Only you can see this.' },
  yourTurn: { 'pt-BR': 'Sua vez', en: 'Your turn' },
  waitTurn: { 'pt-BR': 'Vez de {name}. Olhe para a TV.', en: '{name}’s turn. Look at the TV.' },
  mustSpend: { 'pt-BR': 'Escolha uma ação — gastar é obrigatório.', en: 'Pick an action — you must spend.' },
  broke: { 'pt-BR': 'Você está sem créditos. Passe a vez — na TV aparece só “ação privada”.', en: 'You are out of credits. Pass — the TV only shows “private action”.' },
  pass: { 'pt-BR': 'Passar', en: 'Pass' },
  aPub: { 'pt-BR': 'Investigação pública', en: 'Public investigation' },
  aPubD: { 'pt-BR': '2 câmaras vizinhas · resultado na TV', en: '2 neighbouring chambers · result on the TV' },
  aPriv: { 'pt-BR': 'Investigação particular', en: 'Private investigation' },
  aPrivD: { 'pt-BR': '2 câmaras vizinhas · só você vê', en: '2 neighbouring chambers · only you see' },
  aSpin1: { 'pt-BR': 'Giro simples', en: 'Single spin' },
  aSpin1D: { 'pt-BR': '1 posição no sentido horário · público', en: '1 position clockwise · public' },
  aSpin2: { 'pt-BR': 'Giro duplo', en: 'Double spin' },
  aSpin2D: { 'pt-BR': '2 posições no sentido horário · público', en: '2 positions clockwise · public' },
  aMan: { 'pt-BR': 'Carregar manipulação', en: 'Load manipulation' },
  aManD: { 'pt-BR': 'até 3 por vez · em 6, troca 2 câmaras em segredo', en: 'up to 3 per turn · at 6, secretly swap 2 chambers' },
  pickPair: { 'pt-BR': 'Escolha duas câmaras vizinhas', en: 'Pick two neighbouring chambers' },
  pickSwap: { 'pt-BR': 'Carga completa! Escolha as duas câmaras para trocar', en: 'Charge complete! Pick the two chambers to swap' },
  swapHint: {
    'pt-BR': 'O conteúdo das duas troca de lugar. Ninguém vê qual par você escolheu.',
    en: 'Their contents swap places. Nobody sees which pair you picked.',
  },
  pointsAt: { 'pt-BR': 'miram', en: 'aim at' },
  loadHow: { 'pt-BR': 'Quanto carregar agora?', en: 'How much to load now?' },
  loadTo: { 'pt-BR': 'carga {t}/6', en: 'charge {t}/6' },
  loadSwap: { 'pt-BR': 'completa — troca agora', en: 'complete — swap now' },
  loadBust: { 'pt-BR': 'estoura — perde tudo', en: 'bust — lose it all' },
  back: { 'pt-BR': '‹ Voltar', en: '‹ Back' },
  notebook: { 'pt-BR': 'Seu caderno secreto', en: 'Your secret notebook' },
  noNotes: { 'pt-BR': 'Nada anotado ainda.', en: 'Nothing noted yet.' },
  nPeek: { 'pt-BR': 'Investigação particular', en: 'Private investigation' },
  nCharge: { 'pt-BR': 'Carregou {a} (carga {t}/6)', en: 'Loaded {a} (charge {t}/6)' },
  nBust: { 'pt-BR': 'Carregou {a} — passou de 6, perdeu a carga', en: 'Loaded {a} — went past 6, charge lost' },
  nSwap: { 'pt-BR': 'Manipulou {p}', en: 'Manipulated {p}' },
  nPass: { 'pt-BR': 'Passou a vez', en: 'Passed' },
  outNote: { 'pt-BR': 'Você saiu da partida: suas vezes passam sozinhas.', en: 'You left the match: your turns pass on their own.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  survived: { 'pt-BR': 'Você sobreviveu', en: 'You survived' },
  wasHit: { 'pt-BR': 'Você foi atingido', en: 'You were hit' },
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

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

const CSS = `
.rrg-tv{height:100vh;display:grid;grid-template-columns:27em 1fr;gap:2em;padding:2.4em 3em 3.6em;box-sizing:border-box;
  background:radial-gradient(ellipse at 66% 50%,rgba(143,29,44,.16),transparent 60%)}
.rrg-side{display:flex;flex-direction:column;gap:1.2em;min-height:0}
.rrg-h1{font-family:var(--font-display);font-weight:900;font-size:4em;letter-spacing:.05em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.rrg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.6em;color:var(--text-dim);margin:0;line-height:1.3}
.rrg-facts{display:grid;gap:.4em;font-size:1.2em;color:var(--text-dim)}
.rrg-facts b{color:var(--gold-hi);font-weight:600}
.rrg-sight{display:flex;align-items:center;gap:.6em;font-size:1.3em}
.rrg-log{display:grid;gap:.45em;align-content:start;overflow:hidden;min-height:0;flex:1}
.rrg-log h3{margin:0 0 .2em;font-family:var(--font-display);font-size:1.1em;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.rrg-li{display:flex;align-items:center;gap:.5em;font-size:1.2em;padding:.35em .6em;border-radius:.5em;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.rrg-li:last-child{box-shadow:0 0 0 1px var(--gold-lo) inset;background:rgba(212,175,55,.07)}
.rrg-li small{color:var(--text-mute);font-size:.8em;min-width:2.2em}
.rrg-li .rrg-priv{font-style:italic;color:var(--text-mute)}
/* Table */
.rrg-tablewrap{display:grid;place-items:center;min-height:0}
.rrg-table{position:relative;width:40em;height:40em}
.rrg-felt{position:absolute;inset:6.5em;border-radius:50%;
  background:radial-gradient(circle,#2a0f16 0%,#170910 62%,#0b0508 100%);box-shadow:0 0 0 .25em #1d1013,0 0 0 .4em var(--gold-lo),0 1.5em 4em rgba(0,0,0,.6)}
.rrg-gun{position:absolute;left:50%;top:50%;width:23em;height:23em;transform:translate(-50%,-50%)}
.rrg-seat{position:absolute;width:8.5em;display:grid;justify-items:center;gap:.25em;transform:translate(-50%,-50%);text-align:center}
.rrg-seat-name{font-size:1.15em;font-weight:600;max-width:8em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rrg-seat-tag{font-family:var(--font-display);font-size:.9em;color:var(--text-mute);letter-spacing:.1em}
.rrg-seat[data-turn=true] .rrg-seat-name{color:var(--gold-hi)}
.rrg-seat[data-turn=true]::before{content:'';position:absolute;inset:-.6em -.2em;border-radius:1em;box-shadow:0 0 0 2px var(--gold) inset,0 0 2em rgba(212,175,55,.35);animation:rrg-pulse 1.8s ease-in-out infinite}
@keyframes rrg-pulse{50%{opacity:.45}}
.rrg-shot{font-family:var(--font-display);font-weight:900;font-size:1.3em;letter-spacing:.08em;text-transform:uppercase;
  animation:rrg-pop .5s cubic-bezier(.16,1,.3,1) backwards}
.rrg-shot[data-hit=true]{color:var(--crimson-hi);text-shadow:0 0 .6em rgba(220,40,60,.8)}
.rrg-shot[data-hit=false]{color:var(--text-dim)}
@keyframes rrg-pop{from{opacity:0;transform:scale(.3)}}
.rrg-flash{position:absolute;inset:-1em;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(230,40,60,.7),transparent 65%);opacity:0;animation:rrg-flash 1.1s ease-out backwards}
@keyframes rrg-flash{0%{opacity:0}10%{opacity:1}100%{opacity:0}}
.rrg-aim{animation:rrg-aim .6s ease-in-out infinite alternate}
@keyframes rrg-aim{to{opacity:.35}}
.rrg-cyl{transition:transform 1.3s cubic-bezier(.65,0,.35,1);transform-box:view-box;transform-origin:0 0}
.rrg-up{transition:transform 1.3s cubic-bezier(.65,0,.35,1);transform-box:fill-box;transform-origin:center}
.rrg-cylsvg text{font-family:var(--font-display);font-weight:900}
/* Tutorial */
.rrg-slide{height:100vh;display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:3em;padding:3.5em 5em 4em;box-sizing:border-box}
.rrg-slide p{font-size:1.5em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.rrg-slide b,.rrg-rules b,.rrg-tvrules b{color:var(--gold-hi);font-weight:600}
.rrg-dots{display:flex;gap:.6em;margin-top:1.2em}
.rrg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.rrg-dots span[data-on='true']{background:var(--gold)}
.rrg-demo{display:grid;justify-items:center;gap:1.4em}
.rrg-demophone{display:grid;grid-template-columns:1fr 1fr;gap:.8em;width:16em;padding:.9em;border-radius:1.4em;font-size:1.2em;
  background:#120c10;box-shadow:0 0 0 .15em var(--line-strong) inset;transition:opacity .5s}
.rrg-demophone[data-on=false]{opacity:.12}
.rrg-demophone .rrg-flashcell b{font-size:2em}
.rrg-demophone .rrg-flashcell span{font-size:.7em}
.rrg-demo-cap{font-size:1.3em;color:var(--text-dim);text-align:center;min-height:1.5em}
.rrg-meter{display:flex;gap:.35em}
.rrg-meter i{width:2.6em;height:2.6em;border-radius:50%;box-shadow:0 0 0 2px var(--line-strong) inset}
.rrg-meter i[data-on=true]{background:radial-gradient(circle at 35% 30%,var(--gold-hi),var(--gold) 50%,var(--gold-lo));box-shadow:0 0 0 2px #6b5214 inset}
.rrg-meter i[data-bust=true]{background:radial-gradient(circle at 35% 30%,#f06a7a,var(--crimson) 55%,var(--crimson-lo))}
.rrg-cr{display:inline-block;width:.95em;height:.95em;border-radius:50%;vertical-align:-.12em;margin:0 .05em;
  background:radial-gradient(circle at 35% 30%,var(--gold-hi),var(--gold) 50%,var(--gold-lo));box-shadow:0 0 0 .12em rgba(0,0,0,.35) inset}
/* Rules overlay (TV) and reader (phone) */
.rrg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.rrg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.rrg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.rrg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.rrg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.rrg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.rrg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.rrg-rules p{margin:0;line-height:1.5}
/* Phone */
.rrg-row{display:flex;gap:8px}
.rrg-row > *{flex:1}
.rrg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.rrg-wallet{display:flex;align-items:center;justify-content:space-between;gap:12px}
.rrg-big{font-family:var(--font-display);font-weight:900;font-size:2.6rem;line-height:1;color:var(--gold-hi)}
.rrg-lbl{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute)}
.rrg-pm{display:flex;gap:4px;margin-top:6px}
.rrg-pm i{width:18px;height:18px;border-radius:50%;box-shadow:0 0 0 1.5px var(--line-strong) inset}
.rrg-pm i[data-on=true]{background:radial-gradient(circle at 35% 30%,var(--gold-hi),var(--gold) 50%,var(--gold-lo));box-shadow:none}
.rrg-acts{display:grid;gap:8px}
.rrg-act{display:grid;grid-template-columns:1fr auto;align-items:center;gap:4px 12px;text-align:left;min-height:60px;padding:10px 14px;border:0;border-radius:14px;cursor:pointer;
  color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;font:inherit;transition:transform .12s}
.rrg-act:active{transform:scale(.98)}
.rrg-act:disabled{opacity:.35;cursor:default}
.rrg-act b{font-weight:600;font-size:1.05rem}
.rrg-act small{grid-column:1;color:var(--text-mute);font-size:.8rem}
.rrg-act .rrg-cost{grid-row:1 / span 2;grid-column:2;font-family:var(--font-display);font-weight:900;font-size:1.5rem;color:var(--gold-hi);display:flex;align-items:center;gap:4px}
.rrg-pairs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rrg-pair{min-height:64px;border:0;border-radius:14px;cursor:pointer;font:inherit;color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;padding:8px}
.rrg-pair b{display:block;font-family:var(--font-display);font-size:1.5rem;color:var(--gold-hi)}
.rrg-pair small{display:block;color:var(--text-mute);font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rrg-pair[aria-pressed=true],.rrg-act[aria-pressed=true]{box-shadow:0 0 0 2px var(--gold) inset;background:rgba(212,175,55,.12)}
.rrg-loads{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rrg-load{min-height:84px;border:0;border-radius:14px;cursor:pointer;font:inherit;color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;display:grid;place-content:center;gap:2px}
.rrg-load:disabled{opacity:.35}
.rrg-load b{font-family:var(--font-display);font-size:1.9rem;color:var(--gold-hi)}
.rrg-load small{font-size:.72rem;color:var(--text-mute)}
.rrg-load[data-kind=swap] small{color:var(--ok)}
.rrg-load[data-kind=bust] small{color:var(--crimson-hi)}
.rrg-notes{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.rrg-notes li{display:flex;gap:8px;align-items:baseline;font-size:.92rem;line-height:1.35}
.rrg-notes li small{color:var(--text-mute);min-width:2.4em}
.rrg-notes li:first-child{color:var(--gold-hi)}
.rrg-flashcard{display:grid;gap:10px;padding:14px;border-radius:16px;background:linear-gradient(180deg,rgba(212,175,55,.16),rgba(212,175,55,.05));box-shadow:0 0 0 1.5px var(--gold) inset,0 8px 30px rgba(0,0,0,.4)}
.rrg-flashhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rrg-flashrow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rrg-flashcell{display:grid;justify-items:center;gap:2px;padding:12px 6px;border-radius:12px;box-shadow:0 0 0 1px var(--line-strong) inset}
.rrg-flashcell b{font-family:var(--font-display);font-size:2.2rem;line-height:1;color:var(--gold-hi)}
.rrg-flashcell span{font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:.85rem;color:var(--text-dim)}
.rrg-flashcell[data-b=true]{background:var(--crimson);box-shadow:none}
.rrg-flashcell[data-b=true] b,.rrg-flashcell[data-b=true] span{color:#fff}
.rrg-fate{font-family:var(--font-display);font-weight:900;font-size:2rem;text-align:center;margin:0}
`;

const Styles = () => <style>{CSS}</style>;

function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{cr\})/g).map((part, i) => {
    if (part === '{cr}') return <i key={i} className="rrg-cr" aria-label="crédito" />;
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    return part;
  });
}

const Cr = () => <i className="rrg-cr" aria-hidden />;

// ---------------------------------------------------------------------------
// The revolver (TV): barrel and cylinder are one piece, turned by `rot`; A fires first, at seat rot
// ---------------------------------------------------------------------------

/** The TV only ever shows bullets the firing has already revealed. */
type ChamberMark = 'unknown' | 'bullet' | 'empty';

function Cylinder({
  n,
  rot,
  marks,
  focus,
  focusHit,
  focusKey,
  highlight,
}: {
  n: number;
  rot: number;
  marks: ChamberMark[];
  /** Chamber being fired (pulses, then flashes if hit). */
  focus?: number | null;
  focusHit?: boolean;
  focusKey?: string | number;
  /** Chambers to outline (tutorial demos). */
  highlight?: number[];
}) {
  // Rotation accumulates so the cylinder always turns clockwise, even when rot wraps to 0.
  const [turns, setTurns] = useState({ rot, total: rot });
  useEffect(() => {
    if (rot === turns.rot) return;
    const delta = (((rot - turns.rot) % n) + n) % n;
    setTurns({ rot, total: turns.total + delta });
  }, [rot, n]);
  const deg = (turns.total * 360) / n;
  const rChamber = 44;
  const holeR = Math.min(15, (Math.PI * 2 * rChamber) / n / 2 - 3);
  const tagR = 84;
  return (
    <svg className="rrg-gun rrg-cylsvg" viewBox="-100 -100 200 200" aria-hidden>
      <defs>
        <radialGradient id="rrg-steel" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#6d6a72" />
          <stop offset=".55" stopColor="#3a3840" />
          <stop offset="1" stopColor="#1b1a1f" />
        </radialGradient>
        <radialGradient id="rrg-brass" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#fbe6a0" />
          <stop offset=".5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7a5c12" />
        </radialGradient>
        <radialGradient id="rrg-red" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#f07884" />
          <stop offset=".55" stopColor="#b3192f" />
          <stop offset="1" stopColor="#5a0a16" />
        </radialGradient>
      </defs>
      <g className="rrg-cyl" style={{ transform: `rotate(${deg}deg)` }}>
        {/* Barrel over chamber A: the whole gun turns, so it marks who is in its sights */}
        <rect x="-7" y="-99" width="14" height="40" rx="3" fill="url(#rrg-steel)" stroke="#8a7330" strokeWidth="1" />
        <rect x="-3" y="-99" width="6" height="4" rx="1" fill="#0a0a0c" />
        {/* Fluted cylinder body */}
        <circle r="66" fill="url(#rrg-steel)" stroke="#8a7330" strokeWidth="1.2" />
        {Array.from({ length: n }, (_, c) => {
          const a = ((c + 0.5) * 2 * Math.PI) / n;
          return (
            <circle key={`f${c}`} cx={Math.sin(a) * 70} cy={-Math.cos(a) * 70} r={Math.min(12, 70 / n + 3)} fill="#120f14" />
          );
        })}
        <circle r="14" fill="#2a282e" stroke="#0e0d10" strokeWidth="2" />
        {Array.from({ length: n }, (_, c) => {
          const a = (c * 2 * Math.PI) / n;
          const x = Math.sin(a) * rChamber;
          const y = -Math.cos(a) * rChamber;
          const tx = Math.sin(a) * tagR;
          const ty = -Math.cos(a) * tagR;
          const m = marks[c] ?? 'unknown';
          const isFocus = focus === c;
          const fillFor =
            m === 'bullet' ? 'url(#rrg-brass)' : '#08070a';
          return (
            <g key={c}>
              <circle cx={x} cy={y} r={holeR} fill={fillFor} stroke="#000" strokeWidth="1.5" />
              {m === 'bullet' && <circle cx={x} cy={y} r={holeR * 0.38} fill="#a07d22" stroke="#5c430b" strokeWidth=".8" />}
              {highlight?.includes(c) && (
                <circle cx={x} cy={y} r={holeR + 3} fill="none" stroke="#fbe6a0" strokeWidth="2.4" />
              )}
              {isFocus && (
                <g key={focusKey}>
                  <circle className="rrg-aim" cx={x} cy={y} r={holeR + 3} fill="none" stroke="#fbe6a0" strokeWidth="2.5" />
                  {focusHit && (
                    <circle cx={x} cy={y} r={holeR + 8} fill="#e0283c" opacity="0" style={{ animation: `rrg-flash 1.1s ease-out ${SHOT_REVEAL_MS}ms backwards` }} />
                  )}
                </g>
              )}
              <g transform={`translate(${tx} ${ty})`}>
                <g className="rrg-up" style={{ transform: `rotate(${-deg}deg)` }}>
                  <rect x="-9" y="-8" width="18" height="16" rx="2.5" fill="#e3c04c" stroke="#7a5c12" strokeWidth="1" />
                  <text x="0" y="5" textAnchor="middle" fontSize="13" fill="#1a1205">
                    {LABELS[c]}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Table({
  n,
  rot,
  seats,
  marks,
  players,
  kit,
  current,
  shots,
  phase,
  out,
  t,
}: {
  t: T;
  n: number;
  rot: number;
  seats: string[];
  marks: ChamberMark[];
  players: Pl[];
  kit: Kit;
  current: string | null;
  shots: Shot[];
  phase: PublicView['phase'];
  out: string[];
}) {
  const { Avatar } = kit;
  const R = 17;
  const last = shots.at(-1);
  const aim = aimSeat(rot, n);
  return (
    <div className="rrg-table">
      <div className="rrg-felt" />
      <Cylinder
        n={n}
        rot={rot}
        marks={marks}
        focus={phase === 'firing' ? (last?.chamber ?? null) : null}
        focusHit={last?.hit}
        focusKey={shots.length}
      />
      {seats.map((id, s) => {
        const p = players.find((x) => x.id === id);
        const a = (s * 2 * Math.PI) / n;
        const shot = shots.find((x) => x.seat === s);
        const isLast = shot && shot === last && phase === 'firing';
        const hit = !!shot?.hit;
        const variant = phase === 'end' ? (hit ? 'out' : 'gold') : shot ? (hit ? 'out' : undefined) : isLast ? 'crimson' : undefined;
        return (
          <div
            key={id}
            className="rrg-seat"
            data-turn={current === id}
            style={{ left: `calc(50% + ${Math.sin(a) * R}em)`, top: `calc(50% - ${Math.cos(a) * R}em)` }}
          >
            {isLast && hit && <div className="rrg-flash" style={{ animationDelay: `${SHOT_REVEAL_MS}ms` }} />}
            <Avatar
              emoji={p?.avatar ?? '?'}
              size="4.6em"
              variant={isLast ? undefined : variant}
              crimson={!!isLast}
              active={phase === 'end' && !hit}
              offline={p ? !p.connected || out.includes(id) : true}
              badge={s === aim ? '◎' : undefined}
            />
            <span className="rrg-seat-name">{p?.name ?? '—'}</span>
            {shot ? (
              <span
                key={`shot-${s}`}
                className="rrg-shot"
                data-hit={hit}
                style={{ animationDelay: isLast ? `${SHOT_REVEAL_MS}ms` : '0ms' }}
              >
                {hit ? t(L.bang) : t(L.click)}
              </span>
            ) : (
              <span className="rrg-seat-tag">{s + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function marksFrom(view: PublicView): ChamberMark[] {
  if (view.reveal) return view.reveal.map((b) => (b ? 'bullet' : 'empty'));
  // During play the TV shows no hint about the bullets: only the order and the aim.
  // The shot in progress shows its bullet only through its own delayed flash, never early.
  const done = view.phase === 'firing' ? view.shots.slice(0, -1) : view.shots;
  const fired = new Set(done.filter((s) => s.hit).map((s) => s.chamber));
  return Array.from({ length: view.n }, (_, c) => (fired.has(c) ? 'bullet' : 'unknown'));
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

function SlideDemo({ demo, kit, t }: { demo: Demo; kit: Kit; t: T }) {
  const now = kit.useRoomNow();
  const beat = Math.floor(now / 2200);
  const n = 6;
  if (demo === 'table') {
    return (
      <div className="rrg-demo">
        <div style={{ position: 'relative', width: '24em', height: '24em' }}>
          <Cylinder n={n} rot={0} marks={Array(n).fill('unknown')} />
        </div>
        <p className="rrg-demo-cap">
          {t({ 'pt-BR': 'O cano, na câmara A, mira a cadeira 1. Onde estão as balas?', en: 'The barrel, at chamber A, aims at seat 1. Where are the bullets?' })}
        </p>
      </div>
    );
  }
  if (demo === 'investigate') {
    const step = beat % 4;
    return (
      <div className="rrg-demo">
        <div style={{ position: 'relative', width: '17em', height: '17em' }}>
          <Cylinder n={n} rot={0} marks={Array(n).fill('unknown')} highlight={[1, 2]} />
        </div>
        <div className="rrg-demophone" data-on={step === 1 || step === 2}>
          <div className="rrg-flashcell" data-b="true">
            <b>B</b>
            <span>{t(L.bullet)}</span>
          </div>
          <div className="rrg-flashcell" data-b="false">
            <b>C</b>
            <span>{t(L.empty)}</span>
          </div>
        </div>
        <p className="rrg-demo-cap">
          {step === 0
            ? t({ 'pt-BR': 'Investigando B·C… a TV não mostra nada.', en: 'Investigating B·C… the TV shows nothing.' })
            : step < 3
              ? t({ 'pt-BR': 'O resultado aparece nos celulares…', en: 'The result shows on the phones…' })
              : t({ 'pt-BR': '…e some. Lembre-se!', en: '…and fades. Remember it!' })}
        </p>
      </div>
    );
  }
  if (demo === 'spin') {
    const rot = beat % n;
    const marks: ChamberMark[] = Array(n).fill('unknown');
    return (
      <div className="rrg-demo">
        <div style={{ position: 'relative', width: '24em', height: '24em' }}>
          <Cylinder n={n} rot={rot} marks={marks} />
        </div>
        <p className="rrg-demo-cap">
          {fill(t({ 'pt-BR': 'A arma gira inteira: agora mira a cadeira {s}', en: 'The whole gun turns: now aiming at seat {s}' }), { s: aimSeat(rot, n) + 1 })}
        </p>
      </div>
    );
  }
  if (demo === 'manipulate') {
    const step = beat % 4;
    const loaded = step === 0 ? 3 : 6;
    const marks: ChamberMark[] = Array(n).fill('unknown');
    marks[step === 3 ? 4 : 3] = 'bullet';
    return (
      <div className="rrg-demo">
        <div className="rrg-meter" style={{ fontSize: '1.2em' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} data-on={i < loaded} />
          ))}
        </div>
        <div style={{ position: 'relative', width: '20em', height: '20em' }}>
          <Cylinder n={n} rot={0} marks={marks} highlight={step >= 2 ? [3, 4] : []} />
        </div>
        <p className="rrg-demo-cap">
          {step === 0
            ? t({ 'pt-BR': 'Vez 1: carrega 3.', en: 'Turn 1: load 3.' })
            : step === 1
              ? t({ 'pt-BR': 'Vez 2: carrega mais 3 — completou 6!', en: 'Turn 2: load 3 more — 6 complete!' })
              : step === 2
                ? t({ 'pt-BR': 'Escolhe D·E em segredo…', en: 'Secretly picks D·E…' })
                : t({ 'pt-BR': 'A bala passou de D para E.', en: 'The bullet moved from D to E.' })}
        </p>
      </div>
    );
  }
  // firing
  const step = beat % (n + 2);
  const bullets = [false, false, true, false, false, true];
  const shotsN = Math.min(step, n);
  const marks: ChamberMark[] = bullets.map((b, c) => (c < shotsN ? (b ? 'bullet' : 'empty') : 'unknown'));
  return (
    <div className="rrg-demo">
      <div style={{ position: 'relative', width: '24em', height: '24em' }}>
        <Cylinder n={n} rot={0} marks={marks} focus={shotsN > 0 && step <= n ? shotsN - 1 : null} focusKey={step} />
      </div>
      <p className="rrg-demo-cap">
        {shotsN === 0
          ? t({ 'pt-BR': 'Metade zerou: a arma dispara.', en: 'Half are broke: the gun fires.' })
          : fill(t({ 'pt-BR': 'Cadeira {s}: {r}', en: 'Seat {s}: {r}' }), {
              s: shotsN,
              r: bullets[shotsN - 1] ? t(L.bang).toUpperCase() : t(L.click),
            })}
      </p>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: Kit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="rrg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="rrg-h1" style={{ fontSize: '3.8em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="rrg-sub" style={{ fontSize: '1.15em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="rrg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="rrg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

function TvRules({ page, kit, t }: { page: number; kit: Kit; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="rrg-tvrules">
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
    <div className="rrg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="rrg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="rrg-row">
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

function LogLine({ e, players, kit, t, n, seats }: { e: LogEntry; players: Pl[]; kit: Kit; t: T; n: number; seats: string[] }) {
  const p = players.find((x) => x.id === e.pid);
  let what: ReactNode;
  if (e.kind === 'private') what = <span className="rrg-priv">{t(L.private)}</span>;
  else if (e.kind === 'spin')
    what = (
      <span>
        {t(e.steps === 1 ? L.spin1 : L.spin2)} → ◎{' '}
        <b style={{ color: 'var(--gold-hi)' }}>{players.find((x) => x.id === seats[aimSeat(e.rot, n)])?.name ?? '—'}</b>
      </span>
    );
  else {
    what = (
      <span>
        {t(L.pubInv)} <b style={{ color: 'var(--gold-hi)' }}>{pairLabel(e.pair, n)}</b>{' '}
        <span className="rrg-priv">({t(L.pubOnPhones)})</span>
      </span>
    );
  }
  return (
    <div className="rrg-li">
      <small>#{e.turn}</small>
      <kit.Avatar emoji={p?.avatar ?? '?'} inline size="1.2em" />
      <b style={{ fontWeight: 600 }}>{p?.name ?? '—'}</b>
      <span style={{ color: 'var(--text-mute)' }}>·</span>
      {what}
    </div>
  );
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const players = platform.players.filter((p) => !p.spectator);
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
  const name = (id: string | null | undefined) => players.find((p) => p.id === id)?.name ?? '—';
  const sightSeat = view.seats[aimSeat(view.rot, view.n)];
  const last = view.shots.at(-1);
  const hits = view.shots.filter((s) => s.hit).map((s) => view.seats[s.seat]!);

  let eyebrow = `${t(L.round)} ${view.round} · ${t(L.turnN)} ${view.turn}`;
  let title: ReactNode = (
    <>
      <span style={{ fontSize: '.45em', display: 'block', letterSpacing: '.12em' }}>{t(L.turnOf)}</span>
      {name(view.current)}
    </>
  );
  let sub: ReactNode = t(L.playSub);
  if (view.phase === 'firing') {
    eyebrow = `${t(L.round)} ${view.round}`;
    title = t(L.fireTitle);
    sub = last ? (
      <span key={view.shots.length}>
        {fill(t(L.aimingAt), { c: LABELS[last.chamber]! })} <b style={{ color: 'var(--text)' }}>{name(view.seats[last.seat])}</b>…{' '}
        <span
          className="rrg-shot"
          data-hit={last.hit}
          style={{ animationDelay: `${SHOT_REVEAL_MS}ms`, fontSize: '1.1em', display: 'inline-block' }}
        >
          {last.hit ? t(L.bang) : t(L.click)}
        </span>
      </span>
    ) : (
      t(L.fireSub)
    );
  } else if (view.phase === 'end') {
    title = t(L.endTitle);
    sub = (
      <>
        {t(L.hitList)}: <b style={{ color: 'var(--crimson-hi)' }}>{hits.map(name).join(', ')}</b>. {t(L.survivors)}
      </>
    );
  }

  return (
    <div className="rrg-tv">
      <Styles />
      <div className="rrg-side">
        <div className="mp-enter" key={`${view.phase}-${view.turn}`}>
          <span className="mp-eyebrow" style={{ fontSize: '1.15em' }}>
            {eyebrow}
          </span>
          <h1 className="rrg-h1" style={{ fontSize: '3.4em' }}>
            {title}
          </h1>
        </div>
        <p className="rrg-sub">{sub}</p>
        <div className="rrg-facts">
          <span className="rrg-sight">
            ◎ {t(L.inSights)}: <kit.Avatar emoji={players.find((p) => p.id === sightSeat)?.avatar ?? '?'} inline size="1.1em" />
            <b>{name(sightSeat)}</b>
          </span>
          <span>{view.bulletCount === 1 ? t(L.bullet1) : fill(t(L.bullets), { b: view.bulletCount })}</span>
          {view.phase === 'play' && <span>{fill(t(L.trigger), { k: view.trigger, n: view.n })}</span>}
        </div>
        {view.phase === 'play' && (
          <div className="rrg-log">
            <h3>{t(L.history)}</h3>
            {view.log.length === 0 && <span style={{ color: 'var(--text-mute)', fontSize: '1.2em' }}>{t(L.noHistory)}</span>}
            {view.log.map((e) => (
              <LogLine key={e.turn} e={e} players={players} kit={kit} t={t} n={view.n} seats={view.seats} />
            ))}
          </div>
        )}
      </div>
      <div className="rrg-tablewrap">
        <Table
          n={view.n}
          rot={view.rot}
          seats={view.seats}
          marks={marksFrom(view)}
          players={players}
          kit={kit}
          current={view.current}
          shots={view.shots}
          phase={view.phase}
          out={view.out}
          t={t}
        />
      </div>
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

type Mode = null | 'pub' | 'priv' | 'charge';

function NoteLine({ note, n, t }: { note: Note; n: number; t: T }) {
  let body: ReactNode;
  if (note.kind === 'peek') {
    body = `${t(L.nPeek)} ${pairLabel(note.pair, n)}`;
  } else if (note.kind === 'charge')
    body = fill(t(note.lost ? L.nBust : L.nCharge), { a: note.amount, t: note.total });
  else if (note.kind === 'swap') body = fill(t(L.nSwap), { p: pairLabel(note.pair, n) });
  else body = t(L.nPass);
  return (
    <li>
      <small>#{note.turn}</small>
      {body}
    </li>
  );
}

/** A live investigation result: shown for a few seconds, then gone for good. */
function FlashCard({ f, n, kit, t, name, paused }: { f: FlashView; n: number; kit: PlayerProps['kit']; t: T; name: string; paused: boolean }) {
  const [a, b] = pairOf(f.pair, n);
  return (
    <div className="rrg-flashcard mp-enter" key={f.turn} role="status">
      <div className="rrg-flashhead">
        <span className="mp-eyebrow">
          {f.secret ? t(L.flashPriv) : fill(t(L.flashPub), { name })} · #{f.turn}
        </span>
        <kit.Countdown deadline={f.deadline} total={f.total ?? 0} size={40} paused={paused} />
      </div>
      <div className="rrg-flashrow">
        {[a, b].map((c, i) => (
          <div key={c} className="rrg-flashcell" data-b={f.result[i]}>
            <b>{LABELS[c]}</b>
            <span>{f.result[i] ? t(L.bullet) : t(L.empty)}</span>
          </div>
        ))}
      </div>
      <p className="rrg-note" style={{ fontSize: '.95rem' }}>
        {t(L.flashHint)}
      </p>
    </div>
  );
}

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Button, Panel } = kit;
  const [mode, setMode] = useState<Mode>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  useEffect(() => {
    setMode(null);
    setSent(null);
  }, [view?.turn, view?.phase, view?.swapPending, view?.credits]);
  if (!view) return null;
  const isHost = you.isAdmin;
  const players = platform.players;
  const name = (id: string | null | undefined) => players.find((p) => p.id === id)?.name ?? '—';

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
          {!isHost && <p className="rrg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="rrg-row">
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

  const wallet = (
    <Panel>
      <div className="rrg-wallet">
        <div>
          <div className="rrg-lbl">{t(L.credits)}</div>
          <div className="rrg-big">
            {view.credits} <Cr />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="rrg-lbl">{t(L.charge)}</div>
          <div className="rrg-pm" aria-label={`${view.charge}/6`}>
            {Array.from({ length: COST.manipulate }, (_, i) => (
              <i key={i} data-on={i < view.charge} />
            ))}
          </div>
        </div>
      </div>
      <p className="rrg-note" style={{ fontSize: '.95rem', marginTop: 8 }}>
        {t(L.secretNote)}
      </p>
    </Panel>
  );

  const notes = [...view.notes].reverse();
  const notebook = (
    <Panel className="stack">
      <span className="mp-eyebrow">{t(L.notebook)}</span>
      {notes.length === 0 ? (
        <p className="rrg-note" style={{ fontSize: '1rem' }}>
          {t(L.noNotes)}
        </p>
      ) : (
        <ul className="rrg-notes">
          {notes.map((note, i) => (
            <NoteLine key={i} note={note} n={view.n} t={t} />
          ))}
        </ul>
      )}
    </Panel>
  );

  if (view.phase === 'firing' || view.phase === 'end') {
    return (
      <div className="stack">
        <Styles />
        <Panel className="stack" style={{ textAlign: 'center' }}>
          {view.hit === null ? (
            <p className="rrg-fate" style={{ color: 'var(--gold-hi)' }}>
              {t(L.watch)}
            </p>
          ) : (
            <p className="rrg-fate" style={{ color: view.hit ? 'var(--crimson-hi)' : 'var(--gold-hi)' }}>
              {t(view.hit ? L.wasHit : L.survived)}
            </p>
          )}
        </Panel>
        {notebook}
        {rulesButton}
        {reader}
      </div>
    );
  }

  // Which seats a pair currently points at, to help the choice.
  const pairInfo = (k: number) =>
    pairOf(k, view.n)
      .map((c) => name(view.seats[(c + view.rot) % view.n]))
      .join(' · ');
  const pairGrid = (onPick: (k: number) => void) => (
    <div className="rrg-pairs">
      {Array.from({ length: view.n }, (_, k) => (
        <button
          key={k}
          type="button"
          className="rrg-pair"
          aria-pressed={sent === `p${k}`}
          aria-label={pairLabel(k, view.n)}
          disabled={sent !== null}
          onClick={() => {
            setSent(`p${k}`);
            onPick(k);
          }}
        >
          <b>{pairLabel(k, view.n)}</b>
          <small>
            {t(L.pointsAt)} {pairInfo(k)}
          </small>
        </button>
      ))}
    </div>
  );

  let controls: ReactNode;
  if (view.out) {
    controls = <p className="rrg-note">{t(L.outNote)}</p>;
  } else if (!view.myTurn) {
    controls = <p className="rrg-note">{fill(t(L.waitTurn), { name: name(view.current) })}</p>;
  } else if (view.swapPending) {
    controls = (
      <div className="stack">
        <h3 style={{ margin: 0, textAlign: 'center', color: 'var(--gold-hi)' }}>{t(L.pickSwap)}</h3>
        <p className="rrg-note" style={{ fontSize: '1rem' }}>
          {t(L.swapHint)}
        </p>
        {pairGrid((k) => send({ type: 'manipulate', pair: k }))}
      </div>
    );
  } else if (view.credits === 0) {
    controls = (
      <div className="stack">
        <p className="rrg-note">{t(L.broke)}</p>
        <Button
          block
          disabled={sent !== null}
          onClick={() => {
            setSent('pass');
            send({ type: 'pass' });
          }}
        >
          {t(L.pass)}
        </Button>
      </div>
    );
  } else if (mode === 'pub' || mode === 'priv') {
    controls = (
      <div className="stack">
        <h3 style={{ margin: 0, textAlign: 'center' }}>
          {t(mode === 'pub' ? L.aPub : L.aPriv)} · {mode === 'pub' ? COST.pubInvestigate : COST.privInvestigate} <Cr />
        </h3>
        <p className="rrg-note" style={{ fontSize: '1rem' }}>
          {t(L.pickPair)}
        </p>
        {pairGrid((k) => send({ type: 'investigate', pair: k, secret: mode === 'priv' }))}
        <Button block small variant="ghost" onClick={() => setMode(null)}>
          {t(L.back)}
        </Button>
      </div>
    );
  } else if (mode === 'charge') {
    controls = (
      <div className="stack">
        <h3 style={{ margin: 0, textAlign: 'center' }}>{t(L.loadHow)}</h3>
        <div className="rrg-loads">
          {Array.from({ length: MAX_CHARGE }, (_, i) => i + 1).map((a) => {
            const total = view.charge + a;
            const kind = total === COST.manipulate ? 'swap' : total > COST.manipulate ? 'bust' : 'ok';
            return (
              <button
                key={a}
                type="button"
                className="rrg-load"
                data-kind={kind}
                aria-label={String(a)}
                disabled={a > view.credits || sent !== null}
                onClick={() => {
                  setSent(`c${a}`);
                  send({ type: 'charge', amount: a });
                }}
              >
                <b>{a}</b>
                <small>
                  {kind === 'swap' ? t(L.loadSwap) : kind === 'bust' ? t(L.loadBust) : fill(t(L.loadTo), { t: total })}
                </small>
              </button>
            );
          })}
        </div>
        <Button block small variant="ghost" onClick={() => setMode(null)}>
          {t(L.back)}
        </Button>
      </div>
    );
  } else {
    const acts: { key: string; label: I18nText; desc: I18nText; cost: number; go(): void }[] = [
      { key: 'pub', label: L.aPub, desc: L.aPubD, cost: COST.pubInvestigate, go: () => setMode('pub') },
      { key: 'priv', label: L.aPriv, desc: L.aPrivD, cost: COST.privInvestigate, go: () => setMode('priv') },
      { key: 's1', label: L.aSpin1, desc: L.aSpin1D, cost: COST.spin1, go: () => send({ type: 'spin', steps: 1 }) },
      { key: 's2', label: L.aSpin2, desc: L.aSpin2D, cost: COST.spin2, go: () => send({ type: 'spin', steps: 2 }) },
      { key: 'man', label: L.aMan, desc: L.aManD, cost: 1, go: () => setMode('charge') },
    ];
    controls = (
      <div className="stack">
        <h3 style={{ margin: 0, textAlign: 'center', color: 'var(--gold-hi)' }}>{t(L.yourTurn)}</h3>
        <p className="rrg-note" style={{ fontSize: '1rem' }}>
          {t(L.mustSpend)}
        </p>
        <div className="rrg-acts">
          {acts.map((a) => (
            <button
              key={a.key}
              type="button"
              className="rrg-act"
              aria-label={t(a.label)}
              aria-pressed={sent === a.key}
              disabled={a.cost > view.credits || sent !== null}
              onClick={() => {
                if (a.key === 's1' || a.key === 's2') setSent(a.key);
                a.go();
              }}
            >
              <b>{t(a.label)}</b>
              <span className="rrg-cost">
                {a.key === 'man' ? `1–${MAX_CHARGE}` : a.cost} <Cr />
              </span>
              <small>{t(a.desc)}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <Styles />
      {view.flash && (
        <FlashCard f={view.flash} n={view.n} kit={kit} t={t} name={name(view.flash.pid)} paused={!!platform.paused} />
      )}
      {wallet}
      <Panel className="stack">{controls}</Panel>
      {notebook}
      {rulesButton}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
