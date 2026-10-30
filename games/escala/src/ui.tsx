import { useEffect, useRef, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { PlayerView, PublicCard, PublicView, RoundResult, Theme, VersusPoints } from './logic.ts';
import { CLUE_MAX, EXTREME_MAX, THEME_MAX } from './shared.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and the secret-free `shared.ts` / `texts.ts` are imported here. Platform
// components come in through `kit`, text goes through `t()`, and styles use the `eg-` prefix.

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  coop: { 'pt-BR': 'Cooperativo', en: 'Cooperative' },
  versus: { 'pt-BR': 'Competitivo', en: 'Competitive' },
  themeTitle: { 'pt-BR': 'O Tema', en: 'The Theme' },
  themeDraw: { 'pt-BR': '{name} escolhe o tema da rodada', en: '{name} picks the round theme' },
  themeWrite: { 'pt-BR': '{name} está escrevendo o tema da rodada', en: '{name} is writing the round theme' },
  cluesTitle: { 'pt-BR': 'As Dicas', en: 'The Clues' },
  cluesSub: {
    'pt-BR': 'Cada um descreve suas cartas na escala do tema — sem dizer números!',
    en: 'Describe your cards on the theme’s scale — no numbers!',
  },
  cluesHurry: { 'pt-BR': 'Metade já terminou — o relógio está correndo.', en: 'Half are done — the clock is running.' },
  cut: {
    'pt-BR': 'O baralho tem 100 cartas: {n} por jogador nesta mesa.',
    en: 'The deck has 100 cards: {n} per player at this table.',
  },
  sortTitle: { 'pt-BR': 'Em Ordem', en: 'In Order' },
  sortCoop: {
    'pt-BR': 'Discutam e ordenem juntos pelo celular. Qualquer um pode mover qualquer carta.',
    en: 'Argue it out and sort together on your phones. Anyone can move any card.',
  },
  sortVersus: {
    'pt-BR': 'Cada um monta a própria ordem em segredo. Ouça as dicas — e blefe se quiser.',
    en: 'Everyone builds their own order in secret. Listen to the clues.',
  },
  ready: { 'pt-BR': 'prontos', en: 'ready' },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  revealSub: { 'pt-BR': 'Do menor para o maior…', en: 'From lowest to highest…' },
  accuracy: { 'pt-BR': 'de precisão', en: 'accuracy' },
  hits: { 'pt-BR': '{h} de {n} cartas no lugar certo', en: '{h} of {n} cards in the right place' },
  perfect: { 'pt-BR': 'Ordem perfeita!', en: 'Perfect order!' },
  correctRow: { 'pt-BR': 'Ordem correta', en: 'Correct order' },
  pts: { 'pt-BR': 'pts', en: 'pts' },
  total: { 'pt-BR': 'Total', en: 'Total' },
  average: { 'pt-BR': 'Média do grupo', en: 'Team average' },
  noClue: { 'pt-BR': '—', en: '—' },
  // phone
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  youMaster: { 'pt-BR': 'Você é o mestre do tema', en: 'You are the theme master' },
  pickOne: { 'pt-BR': 'Escolha um dos temas', en: 'Pick one theme' },
  writeOne: { 'pt-BR': 'Escreva o tema da rodada', en: 'Write the round theme' },
  themePh: { 'pt-BR': 'Ex.: Tamanho de animais', en: 'E.g. Animal size' },
  lowPh: { 'pt-BR': '1 = … (opcional)', en: '1 = … (optional)' },
  highPh: { 'pt-BR': '100 = … (opcional)', en: '100 = … (optional)' },
  confirm: { 'pt-BR': 'Confirmar tema', en: 'Confirm theme' },
  waitMaster: { 'pt-BR': '{name} está escolhendo o tema…', en: '{name} is choosing the theme…' },
  yourCards: { 'pt-BR': 'Suas cartas', en: 'Your cards' },
  cluePh: { 'pt-BR': 'Sua dica para {n}', en: 'Your clue for {n}' },
  send: { 'pt-BR': 'Enviar', en: 'Send' },
  edit: { 'pt-BR': 'Trocar', en: 'Change' },
  missing: { 'pt-BR': 'Faltam {n} dica(s).', en: '{n} clue(s) to go.' },
  allSent: {
    'pt-BR': 'Tudo enviado. Pode trocar até o fim da fase.',
    en: 'All sent. You can change them until the phase ends.',
  },
  sortHelp: {
    'pt-BR': 'Toque numa carta e depois no lugar dela, use as setas ou arraste pela alça ⠿.',
    en: 'Tap a card then its place, use the arrows, or drag the ⠿ handle.',
  },
  sortCoopNote: { 'pt-BR': 'Mexer desmarca o "Pronto" de todos.', en: 'Any move clears everyone’s “Ready”.' },
  low: { 'pt-BR': 'menor', en: 'lowest' },
  high: { 'pt-BR': 'maior', en: 'highest' },
  imReady: { 'pt-BR': 'Pronto!', en: 'Ready!' },
  notReady: { 'pt-BR': 'Ainda não', en: 'Not yet' },
  readyCount: { 'pt-BR': '{r} de {n} prontos', en: '{r} of {n} ready' },
  yours: { 'pt-BR': 'sua', en: 'yours' },
  up: { 'pt-BR': 'Subir', en: 'Move up' },
  down: { 'pt-BR': 'Descer', en: 'Move down' },
  youExact: { 'pt-BR': 'Posições certas', en: 'Right positions' },
  youPerfect: { 'pt-BR': 'Bônus ordem perfeita', en: 'Perfect order bonus' },
  youBonus: { 'pt-BR': 'Bônus pelas suas dicas', en: 'Bonus for your clues' },
  teamAcc: { 'pt-BR': 'Precisão do grupo', en: 'Team accuracy' },
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
  onlyYou: { 'pt-BR': 'só você vê', en: 'only you see' },
  demoTheme: { 'pt-BR': 'Tamanho de animais', en: 'Animal size' },
  demoLow: { 'pt-BR': 'minúsculo', en: 'tiny' },
  demoHigh: { 'pt-BR': 'gigante', en: 'huge' },
  demoOpt2: { 'pt-BR': 'Coisas que dão medo', en: 'Scary things' },
  demoOpt3: { 'pt-BR': 'Preço de coisas', en: 'Price of things' },
  demoSpider: { 'pt-BR': 'aranha', en: 'spider' },
  demoDog: { 'pt-BR': 'cachorro', en: 'dog' },
  demoWhale: { 'pt-BR': 'baleia', en: 'whale' },
  hint_theme: {
    'pt-BR': 'Mestre: escolha o tema no celular. Os outros aguardam.',
    en: 'Master: pick the theme on your phone. Everyone else waits.',
  },
  hint_clues: {
    'pt-BR': 'No celular, escreva uma dica para cada carta, sem números.',
    en: 'On your phone, write one clue per card, no numbers.',
  },
  hint_hurry: {
    'pt-BR': 'Metade já terminou: escrevam antes que o relógio acabe.',
    en: 'Half are done: finish before the clock runs out.',
  },
  hint_sortCoop: {
    'pt-BR': 'Conversem e movam as cartas: cada um defende onde a sua deve ficar.',
    en: 'Talk and move the cards: everyone argues where theirs belongs.',
  },
  hint_sortVersus: {
    'pt-BR': 'Monte a sua fila no celular. Pergunte sobre as dicas em voz alta!',
    en: 'Build your row on your phone. Ask about the clues out loud!',
  },
  hint_ready: {
    'pt-BR': 'Concorda com a fila? Toque Pronto! no celular.',
    en: 'Happy with the row? Tap Ready! on your phone.',
  },
} satisfies Record<string, I18nText>;

type T = (text: I18nText) => string;
const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const CSS = `
.eg-tv{height:100vh;box-sizing:border-box;padding:2.2em 3.2em 5.5em;display:grid;grid-template-rows:auto auto 1fr;gap:1.2em;overflow:hidden}
.eg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.eg-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.eg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.2em 0 0}
.eg-tv.dense{gap:.6em;padding-top:1.4em}
.eg-tv.dense .eg-h1{font-size:2.6em}
.eg-tv.dense .eg-sub{font-size:1.3em}
.eg-tv.dense .eg-theme,.eg-theme.slim{padding:.4em 1.2em;gap:.2em}
.eg-theme.slim h2{font-size:1.8em}
.eg-tv.dense .eg-theme h2{font-size:1.6em}
.eg-tv.dense .eg-scale{font-size:1em}
.eg-warn{font-size:1.2em;color:var(--crimson-hi);margin:.4em 0 0}
.eg-theme{display:grid;gap:.5em;padding:1em 1.6em;border-radius:var(--radius-lg);background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--line) inset}
.eg-theme h2{margin:0;font-family:var(--font-display);font-size:2.4em;line-height:1.15;padding-top:.05em;color:var(--gold-hi);text-align:center}
.eg-scale{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1em;font-size:1.3em}
.eg-scale i{display:block;height:.35em;border-radius:999px;background:linear-gradient(90deg,var(--ink-3),var(--gold-lo) 40%,var(--gold-hi))}
.eg-end{display:flex;align-items:baseline;gap:.5em;color:var(--text-dim)}
.eg-end b{font-family:var(--font-display);color:var(--gold);font-size:1.3em}
.eg-center{display:grid;place-items:center;align-content:center;gap:1.6em;text-align:center;min-height:0}
.eg-opts{display:flex;gap:1.6em;justify-content:center;flex-wrap:wrap}
.eg-opt{width:20em;display:grid;gap:.6em;padding:1.4em;border-radius:var(--radius-lg);background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line-strong) inset;animation:eg-rise .6s var(--ease-out) both}
.eg-opt b{font-family:var(--font-display);font-size:1.6em;line-height:1.2;color:var(--gold-hi)}
.eg-opt span{font-size:1.1em;color:var(--text-dim)}
.eg-seats{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:1.6em 1.4em;max-width:72em;margin:0 auto}
.eg-seat{display:grid;justify-items:center;gap:.35em;text-align:center;width:8.4em}
.eg-seats.many{gap:1em .8em}
.eg-seats.many .eg-seat{width:7.6em}
.eg-seat b{font-size:1.25em;font-weight:600;max-width:7em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eg-seat small{font-family:var(--font-display);font-size:1.2em;color:var(--gold)}
.eg-board{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:.7em;min-height:0;overflow:hidden}
.eg-board.top{grid-template-rows:auto minmax(0,1fr)}
.eg-row{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:.5em;min-height:0;overflow:hidden}
.eg-row>.eg-card{width:calc(var(--cw) / var(--fs) * 1em);height:7.4em;box-sizing:border-box;font-size:calc(var(--fs) * 1em)}
.eg-card{position:relative;display:grid;grid-template-rows:auto 1fr auto;gap:.25em;padding:.55em .6em .5em;min-height:5em;border-radius:.6em;
  background:linear-gradient(170deg,#1d1710,#0e0b08);box-shadow:0 0 0 1px var(--line-strong) inset,0 .3em .8em rgba(0,0,0,.4);animation:eg-rise .5s var(--ease-out) both}
.eg-card .eg-pos{font-family:var(--font-display);font-size:.8em;color:var(--text-mute)}
.eg-card .eg-clue{font-family:var(--font-serif);font-style:italic;font-size:1.15em;line-height:1.15;color:var(--text);overflow-wrap:anywhere;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.eg-card .eg-own span{overflow:hidden;text-overflow:ellipsis}
.eg-card .eg-own{display:flex;align-items:center;gap:.3em;font-size:.8em;color:var(--text-dim);white-space:nowrap;overflow:hidden}
.eg-val{position:absolute;top:.35em;right:.45em;font-family:var(--font-display);font-weight:900;font-size:1.6em;color:var(--gold-hi);animation:eg-flip .5s var(--ease-out) both}
.eg-card.hit{box-shadow:0 0 0 .14em var(--ok) inset,0 0 1.2em rgba(90,200,120,.25);transition:box-shadow .4s}
.eg-card.miss{box-shadow:0 0 0 .14em var(--crimson) inset;transition:box-shadow .4s}
@keyframes eg-flip{from{opacity:0;transform:rotateY(90deg) scale(.6)}}
@keyframes eg-rise{from{opacity:0;transform:translateY(.6em)}}
.eg-big{font-family:var(--font-display);font-size:4.4em;font-weight:900;color:var(--gold-hi);margin:0;line-height:1}
.eg-score{display:flex;align-items:baseline;justify-content:center;gap:.6em;animation:eg-rise .7s var(--ease-out) both}
.eg-score{align-items:center;gap:1em}
.eg-scoretext{display:grid;gap:.1em;text-align:left}
.eg-scoretext span{font-size:1.6em;color:var(--text-dim)}
.eg-scoretext em{font-family:var(--font-serif);font-size:1.5em;color:var(--text-dim)}
.eg-vs{display:grid;gap:.45em;align-content:start}
.eg-vrow{display:grid;grid-template-columns:11em 1fr 5em;align-items:center;gap:.8em;font-size:1.05em;animation:eg-rise .5s var(--ease-out) both}
.eg-vrow .eg-who{display:flex;align-items:center;gap:.4em;overflow:hidden;white-space:nowrap}
.eg-vrow .eg-who b{overflow:hidden;text-overflow:ellipsis;font-weight:600}
.eg-vrow .eg-pts{font-family:var(--font-display);font-size:1.4em;color:var(--gold-hi);text-align:right}
.eg-strip{display:flex;gap:.18em;min-width:0}
.eg-chip{flex:1;min-width:0;height:1.7em;display:grid;place-items:center;border-radius:.3em;font-family:var(--font-display);font-size:.95em;
  background:rgba(255,255,255,.05);color:var(--text-mute)}
.eg-chip.hit{background:rgba(90,200,120,.25);color:var(--text)}
.eg-chip.slim{height:1.2em}
.eg-label{font-family:var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-size:1.1em;margin:0}

.eg-hint{display:inline-block;margin:.6em 0 0;padding:.3em .9em;border-radius:999px;font-size:1.25em;color:var(--gold-hi);
  background:rgba(212,175,55,.1);box-shadow:0 0 0 1px var(--line-strong) inset}
/* tutorial slide (TV) */
.eg-slide{height:100vh;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:3.5em;padding:3.5em 4.5em 5.5em}
.eg-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.eg-slide b,.eg-rules b,.eg-tvrules b{color:var(--gold-hi);font-weight:600}
.eg-dots{display:flex;gap:.6em;margin-top:1.4em}
.eg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.eg-dots span[data-on=true]{background:var(--gold)}
.eg-demo{display:grid;gap:1.2em;align-content:center;justify-items:center}
.eg-demo .eg-opts{gap:1em}
.eg-demo .eg-opt{width:12em;padding:1em}
.eg-demo .eg-opt b{font-size:1.2em}
.eg-dnum{display:grid;justify-items:center;gap:.4em}
.eg-dnum b{display:grid;place-items:center;width:3.4em;height:4.4em;border-radius:.5em;font-family:var(--font-display);font-weight:900;font-size:1.8em;color:#1a0f05;
  background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520);animation:eg-rise .6s var(--ease-out) both}
.eg-dnum span{font-size:1em;color:var(--text-mute);letter-spacing:.1em;text-transform:uppercase}
/* rules overlay (TV) and reader (phone) */
.eg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.eg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.eg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.eg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.eg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.eg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.eg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.eg-rules p{margin:0;line-height:1.5}
.eg-btns{display:flex;gap:8px}
.eg-btns > *{flex:1}

/* phone */
.eg-ph{display:grid;gap:14px}
.eg-pth{display:grid;gap:4px;text-align:center}
.eg-pth b{font-family:var(--font-display);font-size:20px;color:var(--gold-hi);line-height:1.25}
.eg-pth span{font-size:13px;color:var(--text-dim)}
.eg-note{font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:var(--text-dim);text-align:center;margin:0}
.eg-sec{display:grid;gap:10px}
.eg-sec h4{margin:0;font:600 13px var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.eg-popt{min-height:64px;text-align:left;border:0;border-radius:14px;padding:12px 14px;cursor:pointer;background:rgba(255,255,255,.04);
  box-shadow:0 0 0 1px var(--line) inset;color:var(--text);display:grid;gap:4px}
.eg-popt b{font-family:var(--font-display);font-size:17px;color:var(--gold-hi)}
.eg-popt span{font-size:13px;color:var(--text-dim)}
.eg-popt[aria-pressed=true]{box-shadow:0 0 0 2px var(--gold) inset}
.eg-input{min-height:46px;border-radius:12px;background:var(--ink-2);color:var(--text);border:1px solid var(--line-strong);padding:0 12px;font:500 15px var(--font-ui);width:100%;box-sizing:border-box}
.eg-my{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:start;padding:10px;border-radius:14px;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.eg-num{display:grid;place-items:center;height:64px;border-radius:10px;font-family:var(--font-display);font-weight:900;font-size:28px;color:#1a0f05;
  background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.eg-sent{font-family:var(--font-serif);font-style:italic;font-size:17px;color:var(--gold-hi);margin:0 0 6px}
.eg-list{display:grid;gap:6px;user-select:none;-webkit-user-select:none}
.eg-item{display:grid;grid-template-columns:26px 1fr auto auto;align-items:center;gap:6px;padding:6px 6px 6px 8px;border-radius:12px;min-height:52px;
  background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;cursor:pointer;transition:box-shadow .15s,background .15s}
.eg-item.sel{box-shadow:0 0 0 2px var(--gold) inset;background:rgba(212,175,55,.12)}
.eg-item.drag{opacity:.55;box-shadow:0 0 0 2px var(--gold-hi) inset}
.eg-item.mine{background:linear-gradient(90deg,rgba(212,175,55,.14),rgba(255,255,255,.03))}
.eg-item .eg-i{font-family:var(--font-display);font-size:13px;color:var(--text-mute);text-align:center}
.eg-item .eg-t{display:grid;gap:2px;min-width:0}
.eg-item .eg-t b{font:500 15px var(--font-ui);line-height:1.25;overflow-wrap:anywhere}
.eg-item .eg-t span{font-size:12px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eg-item .eg-mv{font-family:var(--font-display);font-weight:900;font-size:16px;color:var(--gold-hi);padding:0 4px}
.eg-arrows{display:grid;grid-auto-flow:column;gap:4px;align-items:center}
.eg-arrows button{width:34px;height:40px;border:0;border-radius:9px;background:var(--ink-3);color:var(--gold-hi);font:700 16px var(--font-ui);cursor:pointer;padding:0}
.eg-arrows button:disabled{opacity:.3}
.eg-arrows .eg-handle{touch-action:none;cursor:grab;background:transparent;color:var(--text-mute);font-size:20px}
.eg-endcap{display:flex;justify-content:space-between;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-mute)}
.eg-res{display:grid;gap:6px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.04)}
.eg-res div{display:flex;justify-content:space-between;font-size:15px}
.eg-res div b{font-family:var(--font-display);color:var(--gold-hi)}
.eg-res .tot{border-top:1px solid var(--line);padding-top:6px;font-size:17px}
.eg-sticky{position:sticky;bottom:8px;display:grid;gap:6px;padding-top:4px}
`;

const Styles = () => <style>{CSS}</style>;

type Who = { name: string; avatar: string };
function useWho(platform: DisplayProps['platform']) {
  return (id: string): Who => {
    const p = platform.players.find((x) => x.id === id);
    return { name: p?.name ?? '?', avatar: p?.avatar ?? '🂠' };
  };
}

/** Card width in its own em: wide enough for a full clue (CLUE_MAX) in three lines. */
const CARD_W = 13.5;
/** Card height in its own em (see .eg-row>.eg-card). */
const CARD_H = 7.4;
/** Card width (stage em) and text scale, largest first. */
const CARD_SIZES: [cw: number, fs: number][] = [1.5, 1.3, 1.15, 1, 0.9, 0.78, 0.68, 0.6, 0.52, 0.46, 0.4].map(
  (fs) => [CARD_W * fs, fs],
);
const CARD_GAP = 0.5;

/**
 * Picks the largest card size whose rows fit the space the board really has. TVs differ in
 * resolution, aspect ratio and overscan, so a size chosen by card count alone can clip.
 */
function useCardFit(n: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(CARD_SIZES[CARD_SIZES.length - 1]!);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const em = parseFloat(getComputedStyle(el).fontSize) || 16;
      const w = el.clientWidth / em;
      const h = el.clientHeight / em;
      const pick =
        CARD_SIZES.find(([cw, fs]) => {
          const cols = Math.max(1, Math.floor((w + CARD_GAP) / (cw + CARD_GAP)));
          const rows = Math.ceil(n / cols);
          return rows * (CARD_H * fs + CARD_GAP) - CARD_GAP <= h;
        }) ?? CARD_SIZES[CARD_SIZES.length - 1]!;
      setSize((prev) => (prev[0] === pick[0] ? prev : pick));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);
  return { ref, style: { ['--cw' as string]: size[0], ['--fs' as string]: size[1] } };
}

function ThemeBar({ theme, t, slim }: { theme: Theme; t: T; slim?: boolean }) {
  return (
    <div className={`eg-theme mp-enter ${slim ? 'slim' : ''}`}>
      <h2>{t(theme.title)}</h2>
      <div className="eg-scale">
        <span className="eg-end">
          <b>1</b> {theme.low ? t(theme.low) : t(L.low)}
        </span>
        <i />
        <span className="eg-end">
          {theme.high ? t(theme.high) : t(L.high)} <b>100</b>
        </span>
      </div>
    </div>
  );
}

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

// ---------------------------------------------------------------- Tutorial and rules

/** Live illustrations beside each slide, drawn with the game's real board pieces. */
function SlideDemo({ demo, t, kit }: { demo: (typeof SLIDES)[number]['demo']; t: T; kit: DisplayProps['kit'] }) {
  const theme: Theme = { title: L.demoTheme, low: L.demoLow, high: L.demoHigh };
  const ana: Who = { name: 'Ana', avatar: '🎩' };
  const bia: Who = { name: 'Bia', avatar: '🦊' };
  const caio: Who = { name: 'Caio', avatar: '🌙' };
  const spider = { card: { id: 'a', owner: 'a', clue: t(L.demoSpider) }, who: ana, value: 4 };
  const dog = { card: { id: 'b', owner: 'b', clue: t(L.demoDog) }, who: bia, value: 40 };
  const whale = { card: { id: 'c', owner: 'c', clue: t(L.demoWhale) }, who: caio, value: 97 };
  const row = (cards: (typeof spider)[], opts: { values?: boolean; states?: ('hit' | 'miss')[] } = {}) => (
    <div className="eg-row" style={{ ['--cw' as string]: 11, ['--fs' as string]: 1.3, width: '100%' }}>
      {cards.map((c, i) => (
        <TvCard
          key={c.card.id}
          card={c.card}
          pos={i + 1}
          who={c.who}
          value={opts.values ? c.value : undefined}
          state={opts.states?.[i]}
        />
      ))}
    </div>
  );

  if (demo === 'deal') {
    return (
      <div className="eg-demo">
        <ThemeBar theme={theme} t={t} />
        <div className="row" style={{ gap: '1.4em' }}>
          {[4, 40, 97].map((n, i) => (
            <div key={n} className="eg-dnum">
              <b style={{ animationDelay: `${i * 200}ms` }}>{n}</b>
              <span>{t(L.onlyYou)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (demo === 'round') {
    return (
      <div className="eg-demo">
        <kit.Avatar emoji={ana.avatar} size="5em" active />
        <div className="eg-opts">
          {[theme.title, L.demoOpt2, L.demoOpt3].map((title, i) => (
            <div key={i} className="eg-opt" style={{ animationDelay: `${i * 120}ms` }}>
              <b>{t(title)}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (demo === 'clue') {
    return (
      <div className="eg-demo">
        <ThemeBar theme={theme} t={t} />
        {row([spider, dog, whale], { values: true })}
      </div>
    );
  }
  if (demo === 'sort') {
    return (
      <div className="eg-demo">
        <ThemeBar theme={theme} t={t} />
        {row([whale, spider, dog])}
        <div className="row" style={{ gap: '.6em' }}>
          <kit.Avatar emoji={ana.avatar} size="2.6em" active badge="✓" />
          <kit.Avatar emoji={bia.avatar} size="2.6em" />
          <kit.Avatar emoji={caio.avatar} size="2.6em" active badge="✓" />
        </div>
      </div>
    );
  }
  return (
    <div className="eg-demo">
      <ThemeBar theme={theme} t={t} />
      {row([spider, whale, dog], { values: true, states: ['hit', 'miss', 'miss'] })}
      <div className="eg-score">
        <p className="eg-big">33%</p>
        <div className="eg-scoretext">
          <span>{t(L.accuracy)}</span>
        </div>
      </div>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="eg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="eg-h1" style={{ fontSize: '3.8em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="eg-sub" style={{ fontSize: '1.2em' }}>
            {rich(t(CREDITS))}
          </p>
        )}
        <div className="eg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="eg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} t={t} kit={kit} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: DisplayProps['kit']; t: T }) {
  const r = RULES[page]!;
  return (
    <div className="eg-tvrules">
      <kit.Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
      </kit.Panel>
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
    <div className="eg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="eg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="eg-btns">
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

// ---------------------------------------------------------------- Display

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const who = useWho(platform);
  if (!view) return null;
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
  const players = platform.players.filter((p) => !p.spectator);
  const master = who(view.master);
  const hint =
    view.hint === null
      ? null
      : view.hint === 'sort'
        ? view.mode === 'coop'
          ? L.hint_sortCoop
          : L.hint_sortVersus
        : L[`hint_${view.hint}`];
  const modeName = t(view.mode === 'coop' ? L.coop : L.versus);

  let title = t(L.themeTitle);
  let sub = fill(t(view.source === 'draw' ? L.themeDraw : L.themeWrite), { name: master.name });
  if (view.phase === 'clues') {
    title = t(L.cluesTitle);
    sub = view.deadline ? t(L.cluesHurry) : t(L.cluesSub);
  } else if (view.phase === 'sort') {
    title = t(L.sortTitle);
    sub = t(view.mode === 'coop' ? L.sortCoop : L.sortVersus);
  } else if (view.phase === 'reveal') {
    title = t(L.revealTitle);
    sub = t(L.revealSub);
  }

  return (
    <div className={`eg-tv ${view.cards.length > 40 ? 'dense' : ''}`}>
      <Styles />
      <header className="eg-head mp-enter" key={`${view.phase}-${view.round}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(L.round)} {view.round}/{view.rounds} · {modeName}
          </span>
          <h1 className="eg-h1">{title}</h1>
          <p className="eg-sub">{sub}</p>
          {hint && <p className="eg-hint">💡 {t(hint)}</p>}
          {view.cut && view.phase === 'clues' && <p className="eg-warn">{fill(t(L.cut), { n: view.cardsPer })}</p>}
        </div>
        {view.deadline !== null && view.phase !== 'reveal' && (
          <Countdown
            deadline={view.deadline}
            total={view.total ?? 0}
            size={view.cards.length > 40 ? '4.6em' : '7em'}
            paused={!!platform.paused}
          />
        )}
      </header>
      {view.theme ? (
        <ThemeBar theme={view.theme} t={t} slim={view.phase === 'sort' || view.phase === 'reveal'} />
      ) : (
        <div />
      )}

      {view.phase === 'theme' && (
        <div className="eg-center">
          <Avatar emoji={master.avatar} size="7em" active />
          <span className="mp-subtitle" style={{ fontSize: '2em' }}>
            {master.name}
          </span>
          {view.options.length > 0 && (
            <div className="eg-opts">
              {view.options.map((o, i) => (
                <div key={i} className="eg-opt" style={{ animationDelay: `${i * 120}ms` }}>
                  <b>{t(o.title)}</b>
                  <span>
                    1 {o.low ? t(o.low) : ''} → {o.high ? t(o.high) : ''} 100
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view.phase === 'clues' && (
        <div className={`eg-seats ${players.length > 8 ? 'many' : ''}`}>
          {players.map((p) => {
            const done = (view.progress[p.id] ?? 0) >= view.cardsPer;
            return (
              <div key={p.id} className="eg-seat">
                <Avatar
                  emoji={p.avatar}
                  size={players.length > 8 ? '3.8em' : '5.4em'}
                  offline={!p.connected}
                  active={done}
                  badge={done ? '✓' : undefined}
                />
                <b>{p.name}</b>
                <small>
                  {view.progress[p.id] ?? 0}/{view.cardsPer}
                </small>
              </div>
            );
          })}
        </div>
      )}

      {view.phase === 'sort' && <SortBoard view={view} t={t} kit={kit} platform={platform} />}
      {view.phase === 'reveal' && view.result && (
        <RevealBoard view={view} result={view.result} t={t} kit={kit} platform={platform} />
      )}
      {rulesOverlay}
    </div>
  );
}

function TvCard({
  card,
  pos,
  who,
  value,
  state,
  shown = true,
}: {
  card: PublicCard;
  pos?: number;
  who: Who;
  value?: number;
  state?: 'hit' | 'miss';
  shown?: boolean;
}) {
  return (
    <div className={`eg-card ${shown && state ? state : ''}`}>
      <span className="eg-pos">{pos !== undefined ? pos : ''}</span>
      <span className="eg-clue">{card.clue ?? '—'}</span>
      <span className="eg-own">
        {who.avatar} <span>{who.name}</span>
      </span>
      {value !== undefined && shown && <span className="eg-val">{value}</span>}
    </div>
  );
}

function SortBoard({ view, t, kit, platform }: Pick<DisplayProps<PublicView>, 'view' | 't' | 'kit' | 'platform'>) {
  const who = useWho(platform);
  const byId = Object.fromEntries(view.cards.map((c) => [c.id, c]));
  const players = platform.players.filter((p) => !p.spectator);
  // Versus: grouped by owner so each player's clues sit together (ids are random, so this leaks nothing).
  const seat = Object.fromEntries(players.map((p, i) => [p.id, i]));
  const list =
    view.mode === 'coop'
      ? view.order.map((id) => byId[id]!).filter(Boolean)
      : [...view.cards].sort((a, b) => (seat[a.owner] ?? 0) - (seat[b.owner] ?? 0));
  const fitted = useCardFit(list.length);
  return (
    <div className="eg-board">
      <div className="eg-row" ref={fitted.ref} style={fitted.style}>
        {list.map((c, i) => (
          <TvCard key={c.id} card={c} pos={view.mode === 'coop' ? i + 1 : undefined} who={who(c.owner)} />
        ))}
      </div>
      <div className="row wrap" style={{ gap: '.8em', justifyContent: 'center' }}>
        <span className="mp-eyebrow" style={{ fontSize: '1em' }}>
          {view.ready.length}/{players.filter((p) => p.connected).length} {t(L.ready)}
        </span>
        {players.map((p) => (
          <kit.Avatar
            key={p.id}
            emoji={p.avatar}
            size="2.6em"
            offline={!p.connected}
            active={view.ready.includes(p.id)}
            badge={view.ready.includes(p.id) ? '✓' : undefined}
            title={p.name}
          />
        ))}
      </div>
    </div>
  );
}

function RevealBoard({
  view,
  result,
  t,
  kit,
  platform,
}: Pick<DisplayProps<PublicView>, 'view' | 't' | 'kit' | 'platform'> & { result: RoundResult }) {
  const who = useWho(platform);
  const now = kit.useRoomNow();
  // Synced to the room clock, so a TV that joins mid-reveal shows the same frame.
  const elapsed = now - ((view.deadline ?? 0) - (view.total ?? 0));
  const byId = Object.fromEntries(view.cards.map((c) => [c.id, c]));
  const n = result.correct.length;
  const flips = result.leadMs + n * result.stepMs;
  const at = (ms: number) => elapsed >= ms;
  const flipped = (i: number) => at(result.leadMs + i * result.stepMs);
  const fitted = useCardFit(n);

  if (result.coop) {
    const coop = result.coop;
    return (
      <div className="eg-board">
        <div className="eg-row" ref={fitted.ref} style={fitted.style}>
          {coop.order.map((id, i) => (
            <TvCard
              key={id}
              card={byId[id]!}
              pos={i + 1}
              who={who(byId[id]!.owner)}
              value={result.values[id]}
              state={result.correct[i] === id ? 'hit' : 'miss'}
              shown={flipped(i)}
            />
          ))}
        </div>
        {/* Space for the score is kept from the start, so the cards don't resize when it appears. */}
        <div className="eg-score" style={{ visibility: at(flips) ? 'visible' : 'hidden' }}>
          <p className="eg-big">{coop.accuracy}%</p>
          <div className="eg-scoretext">
            <span>{t(L.accuracy)}</span>
            <em>
              {coop.hits === n ? t(L.perfect) : fill(t(L.hits), { h: coop.hits, n })}
              {view.accuracies.length > 1 &&
                ` · ${t(L.average)}: ${Math.round(view.accuracies.reduce((a, b) => a + b, 0) / view.accuracies.length)}%`}
            </em>
          </div>
        </div>
      </div>
    );
  }

  const versus = result.versus!;
  const players = platform.players.filter((p) => !p.spectator && versus.points[p.id]);
  const showNumbers = n <= 24;
  const ranked = [...players].sort((a, b) => (versus.points[b.id]?.total ?? 0) - (versus.points[a.id]?.total ?? 0));
  const rowsFit = players.length > 10 ? 'slim' : '';
  // While cards flip: the correct order with every clue and value. Then: everyone's rows.
  if (!at(flips)) {
    return (
      <div className="eg-board top">
        <p className="eg-label">{t(L.correctRow)}</p>
        <div className="eg-row" ref={fitted.ref} style={fitted.style}>
          {result.correct.map((id, i) => (
            <TvCard
              key={id}
              card={byId[id]!}
              pos={i + 1}
              who={who(byId[id]!.owner)}
              value={result.values[id]}
              shown={flipped(i)}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="eg-board" style={{ gap: '.9em' }}>
      {showNumbers && (
        <div className="eg-vs">
          <p className="eg-label">{t(L.correctRow)}</p>
          <div className="eg-vrow" style={{ gridTemplateColumns: '11em 1fr 5em' }}>
            <span />
            <div className="eg-strip">
              {result.correct.map((id) => (
                <span key={id} className={`eg-chip hit ${rowsFit}`}>
                  {result.values[id]}
                </span>
              ))}
            </div>
            <span />
          </div>
        </div>
      )}
      <div className="eg-vs">
        {ranked.map((p, row) => {
          const pts = versus.points[p.id]!;
          const order = versus.orders[p.id] ?? [];
          return (
            <div key={p.id} className="eg-vrow" style={{ animationDelay: `${row * 90}ms` }}>
              <span className="eg-who">
                <kit.Avatar emoji={p.avatar} size="1.8em" active={pts.perfect > 0} />
                <b>{p.name}</b>
              </span>
              <div className="eg-strip">
                {order.map((id, i) => (
                  <span key={id} className={`eg-chip ${rowsFit} ${result.correct[i] === id ? 'hit' : ''}`}>
                    {showNumbers ? result.values[id] : ''}
                  </span>
                ))}
              </div>
              <span className="eg-pts">
                +{pts.total}{' '}
                <small style={{ fontSize: '.55em', color: 'var(--text-mute)' }}>({view.scores[p.id] ?? 0})</small>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Player

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const who = useWho(platform);
  const [rules, setRules] = useState(false);
  if (!view) return null;
  const isHost = you.isAdmin;
  // The rules are one tap away in every phase.
  const rulesButton = (
    <kit.Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </kit.Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return (
      <div className="eg-ph">
        <Styles />
        <kit.Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
          {!isHost && <p className="eg-note">{t(L.followTv)}</p>}
        </kit.Panel>
        {isHost && (
          <>
            <div className="eg-btns">
              <kit.Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
                ‹ {t(L.prev)}
              </kit.Button>
              <kit.Button onClick={() => send({ type: 'intro', dir: 1 })}>
                {last ? t(L.start) : `${t(L.next)} ›`}
              </kit.Button>
            </div>
            {!last && (
              <kit.Button block small variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
                {t(L.skip)}
              </kit.Button>
            )}
          </>
        )}
        {rulesButton}
        {reader}
      </div>
    );
  }

  const header = view.theme && (
    <div className="eg-pth">
      <span className="mp-eyebrow">
        {t(L.round)} {view.round}/{view.rounds} · {t(view.mode === 'coop' ? L.coop : L.versus)}
      </span>
      <b>{t(view.theme.title)}</b>
      <span>
        1 = {view.theme.low ? t(view.theme.low) : t(L.low)} · 100 = {view.theme.high ? t(view.theme.high) : t(L.high)}
      </span>
    </div>
  );

  return (
    <div className="eg-ph">
      <Styles />
      {view.phase === 'theme' &&
        (view.isMaster ? (
          <MasterPanel view={view} t={t} send={send} kit={kit} />
        ) : (
          <kit.Panel>
            <p className="eg-note">{fill(t(L.waitMaster), { name: who(view.master).name })}</p>
          </kit.Panel>
        ))}
      {view.phase !== 'theme' && header}
      {view.phase === 'clues' && <CluePanel view={view} t={t} send={send} kit={kit} platform={platform} />}
      {view.phase === 'sort' && <SortPanel view={view} t={t} send={send} kit={kit} platform={platform} />}
      {view.phase === 'reveal' && <ResultPanel view={view} t={t} kit={kit} />}
      {rulesButton}
      {reader}
    </div>
  );
}

type PanelProps = Pick<PlayerProps<PlayerView>, 'view' | 't' | 'send' | 'kit'>;

function MasterPanel({ view, t, send, kit }: PanelProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  useEffect(() => setPicked(null), [view.round]);

  if (view.source === 'draw') {
    return (
      <div className="eg-sec">
        <h4>{t(L.youMaster)}</h4>
        <p className="eg-note">{t(L.pickOne)}</p>
        {view.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className="eg-popt"
            aria-pressed={picked === i}
            disabled={picked !== null}
            onClick={() => {
              setPicked(i);
              send({ type: 'pickTheme', index: i });
            }}
          >
            <b>{t(o.title)}</b>
            <span>
              1 = {o.low ? t(o.low) : '…'} · 100 = {o.high ? t(o.high) : '…'}
            </span>
          </button>
        ))}
      </div>
    );
  }
  const ok = title.trim().length > 0;
  return (
    <div className="eg-sec">
      <h4>{t(L.youMaster)}</h4>
      <p className="eg-note">{t(L.writeOne)}</p>
      <input
        className="eg-input"
        value={title}
        maxLength={THEME_MAX}
        placeholder={t(L.themePh)}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="eg-input"
        value={low}
        maxLength={EXTREME_MAX}
        placeholder={t(L.lowPh)}
        onChange={(e) => setLow(e.target.value)}
      />
      <input
        className="eg-input"
        value={high}
        maxLength={EXTREME_MAX}
        placeholder={t(L.highPh)}
        onChange={(e) => setHigh(e.target.value)}
      />
      <kit.Button block disabled={!ok} onClick={() => send({ type: 'writeTheme', title, low, high })}>
        {t(L.confirm)}
      </kit.Button>
    </div>
  );
}

function CluePanel({ view, t, send, kit, platform }: PanelProps & Pick<PlayerProps<PlayerView>, 'platform'>) {
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const missing = view.mine.filter((c) => !c.clue).length;
  return (
    <div className="eg-sec">
      {view.deadline !== null && (
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size={64} paused={!!platform.paused} />
        </div>
      )}
      <h4>{t(L.yourCards)}</h4>
      {view.mine.map((c) => (
        <div key={c.id} className="eg-my">
          <span className="eg-num">{c.value}</span>
          <div>
            {c.clue && !editing[c.id] ? (
              <>
                <p className="eg-sent">“{c.clue}”</p>
                <kit.Button small variant="ghost" onClick={() => setEditing({ ...editing, [c.id]: true })}>
                  {t(L.edit)}
                </kit.Button>
              </>
            ) : (
              <kit.TextInput
                maxLength={CLUE_MAX}
                placeholder={fill(t(L.cluePh), { n: c.value })}
                submitLabel={t(L.send)}
                onSubmit={(text) => {
                  if (!text) return;
                  send({ type: 'clue', cardId: c.id, text });
                  setEditing({ ...editing, [c.id]: false });
                }}
              />
            )}
          </div>
        </div>
      ))}
      <p className="eg-note">{missing ? fill(t(L.missing), { n: missing }) : t(L.allSent)}</p>
    </div>
  );
}

function SortPanel({ view, t, send, kit, platform }: PanelProps & Pick<PlayerProps<PlayerView>, 'platform'>) {
  const who = useWho(platform);
  const [order, setOrder] = useState(view.order);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null);
  const [ready, setReady] = useState(view.ready);
  const listRef = useRef<HTMLDivElement>(null);
  const orderKey = view.order.join(',');
  useEffect(() => setOrder(view.order), [orderKey]);
  useEffect(() => setReady(view.ready), [view.ready]);

  const byId = Object.fromEntries(view.cards.map((c) => [c.id, c]));
  const mineValue = Object.fromEntries(view.mine.map((c) => [c.id, c.value]));

  const move = (id: string, to: number) => {
    const from = order.indexOf(id);
    if (from < 0 || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    setOrder(next);
    setReady(false);
    send({ type: 'move', cardId: id, to });
  };

  const indexAt = (y: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [];
    let idx = 0;
    rows.forEach((row, i) => {
      const r = row.getBoundingClientRect();
      if (y > r.top + r.height / 2) idx = i;
    });
    return idx;
  };

  // While dragging, preview the card in its target slot.
  const shown = drag
    ? (() => {
        const rest = order.filter((id) => id !== drag.id);
        rest.splice(drag.over, 0, drag.id);
        return rest;
      })()
    : order;

  return (
    <div className="eg-sec">
      <div style={{ display: 'grid', justifyItems: 'center' }}>
        <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size={64} paused={!!platform.paused} />
      </div>
      <p className="eg-note" style={{ fontSize: '1rem' }}>
        {t(L.sortHelp)}
        {view.mode === 'coop' && <> {t(L.sortCoopNote)}</>}
      </p>
      <div className="eg-endcap">
        <span>1 · {view.theme?.low ? t(view.theme.low) : t(L.low)}</span>
      </div>
      <div className="eg-list" ref={listRef}>
        {shown.map((id, i) => {
          const c = byId[id];
          if (!c) return null;
          const owner = who(c.owner);
          const mine = mineValue[id] !== undefined;
          return (
            <div
              key={id}
              data-row
              className={`eg-item ${selected === id ? 'sel' : ''} ${drag?.id === id ? 'drag' : ''} ${mine ? 'mine' : ''}`}
              onClick={() => {
                if (selected === null) setSelected(id);
                else if (selected === id) setSelected(null);
                else {
                  move(selected, i);
                  setSelected(null);
                }
              }}
            >
              <span className="eg-i">{i + 1}</span>
              <span className="eg-t">
                <b>{c.clue ?? '—'}</b>
                <span>
                  {owner.avatar} {owner.name}
                  {mine ? ` · ${t(L.yours)}` : ''}
                </span>
              </span>
              {mine ? <span className="eg-mv">{mineValue[id]}</span> : <span />}
              <span className="eg-arrows" onClick={(e) => e.stopPropagation()}>
                <button type="button" aria-label={t(L.up)} disabled={i === 0} onClick={() => move(id, i - 1)}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={t(L.down)}
                  disabled={i === shown.length - 1}
                  onClick={() => move(id, i + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="eg-handle"
                  aria-hidden
                  tabIndex={-1}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelected(null);
                    setDrag({ id, over: order.indexOf(id) });
                  }}
                  onPointerMove={(e) => {
                    if (!drag) return;
                    const over = indexAt(e.clientY);
                    if (over !== drag.over) setDrag({ ...drag, over });
                  }}
                  onPointerUp={() => {
                    if (drag) move(drag.id, drag.over);
                    setDrag(null);
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  ⠿
                </button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="eg-endcap">
        <span />
        <span>{view.theme?.high ? t(view.theme.high) : t(L.high)} · 100</span>
      </div>
      <div className="eg-sticky">
        <kit.Button
          block
          variant={ready ? 'ghost' : 'gold'}
          onClick={() => {
            setReady(!ready);
            send({ type: 'ready', value: !ready });
          }}
        >
          {ready ? t(L.notReady) : t(L.imReady)}
        </kit.Button>
        <p className="eg-note" style={{ fontSize: '1rem' }}>
          {fill(t(L.readyCount), { r: view.readyCount, n: view.playing })}
        </p>
      </div>
    </div>
  );
}

function ResultPanel({ view, t, kit }: Pick<PlayerProps<PlayerView>, 'view' | 't' | 'kit'>) {
  const now = kit.useRoomNow();
  const r = view.myResult;
  if (!r || (view.showAt !== null && now < view.showAt)) {
    return (
      <kit.Panel>
        <p className="eg-note">{t(L.watch)}</p>
      </kit.Panel>
    );
  }
  if ('accuracy' in r) {
    return (
      <div className="eg-res mp-enter">
        <div className="tot">
          <span>{t(L.teamAcc)}</span>
          <b>{r.accuracy}%</b>
        </div>
      </div>
    );
  }
  const v = r as VersusPoints;
  return (
    <div className="eg-res mp-enter">
      <div>
        <span>{t(L.youExact)}</span>
        <b>+{v.exact}</b>
      </div>
      {v.perfect > 0 && (
        <div>
          <span>{t(L.youPerfect)}</span>
          <b>+{v.perfect}</b>
        </div>
      )}
      <div>
        <span>{t(L.youBonus)}</span>
        <b>+{v.bonus}</b>
      </div>
      <div className="tot">
        <span>{t(L.total)}</span>
        <b>+{v.total}</b>
      </div>
    </div>
  );
}

export default defineGameUI({ Display, Player });
