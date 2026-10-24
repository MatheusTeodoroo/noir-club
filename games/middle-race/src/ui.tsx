import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps, type UIKit } from '@mp/game-sdk';
import type { PlayerView, PublicView, RaceView } from './logic.ts';
import type { LogEntry } from './race.ts';
import { CREDITS, HINTS, RULES, SLIDES, type SlideDemo as SlideDemoKind } from './texts.ts';
import {
  BOOL_KEYS, CLASSES, FAST, GRAVITY, JUMP, MIDDLE, SETUP_LIMITS, SILENCE, classInfo, gameRank, pointsFor,
  type NumKey, type Setup,
} from './shared.ts';

// Only `react`, `@mp/game-sdk` and the shared constants are imported here. Platform components
// come in through `kit`, text goes through `t()`, and styles are scoped with the `mrg-` prefix.

type T = (x: I18nText) => string;
type Names = (pid: string | null | undefined) => string;

const L = {
  game: { 'pt-BR': 'Middle Race', en: 'Middle Race' },
  tutorial: { 'pt-BR': 'Tutorial', en: 'Tutorial' },
  hostAdvances: { 'pt-BR': 'O Host avança pelo celular.', en: 'The Host moves on from their phone.' },
  followTv: { 'pt-BR': 'Acompanhe o tutorial na TV.', en: 'Follow the tutorial on the TV.' },
  toSetup: { 'pt-BR': 'Configurar partida', en: 'Set up the match' },
  skipTutorial: { 'pt-BR': 'Pular tutorial', en: 'Skip tutorial' },
  rules: { 'pt-BR': 'Regras', en: 'Rules' },
  prev: { 'pt-BR': 'Voltar', en: 'Back' },
  next: { 'pt-BR': 'Avançar', en: 'Next' },
  close: { 'pt-BR': 'Fechar', en: 'Close' },
  showOnTv: { 'pt-BR': 'Mostrar na TV', en: 'Show on TV' },
  hideFromTv: { 'pt-BR': 'Tirar da TV', en: 'Remove from TV' },
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
  raceStep: { 'pt-BR': 'Corrida', en: 'Race' },
  setupTitle: { 'pt-BR': 'Preparação', en: 'Setup' },
  setupSub: { 'pt-BR': 'O host está ajustando a partida. Leiam as classes!', en: 'The host is setting up the match. Read the classes!' },
  readTitle: { 'pt-BR': 'Regras e classes', en: 'Rules and classes' },
  readSub: { 'pt-BR': 'Leiam com calma. Toque em Pronto no celular quando terminar.', en: 'Take your time. Tap Ready on your phone when done.' },
  goal: {
    'pt-BR': 'Objetivo: cruzar a chegada o mais perto possível do 6º lugar. Quem chega em 6º vence.',
    en: 'Goal: cross the finish as close as possible to 6th place. Whoever finishes 6th wins.',
  },
  rule1: {
    'pt-BR': 'Na sua vez, descarte uma carta e ande esse número. Sem cartas, a mão volta inteira.',
    en: 'On your turn, discard a card and move that many spaces. Out of cards, your hand refills.',
  },
  rule2: {
    'pt-BR': 'Todo movimento dispara reações: primeiro o Um, depois Reset, Delete e Espelho, depois as demais (1→11).',
    en: 'Every move triggers reactions: One first, then Reset, Delete and Mirror, then the rest (1→11).',
  },
  rule3: {
    'pt-BR': 'Na largada ninguém reage, exceto o Um. Ninguém escolhe o mesmo alvo duas vezes seguidas.',
    en: 'Nobody but One reacts on the start column. Nobody picks the same target twice in a row.',
  },
  voteTitle: { 'pt-BR': 'Votação', en: 'Vote' },
  voteSub: { 'pt-BR': 'Quem receber MAIS votos escolhe a classe por ÚLTIMO.', en: 'Whoever gets the MOST votes picks a class LAST.' },
  voteSlots: { 'pt-BR': 'Disputando as posições {lo}–{hi}', en: 'Competing for positions {lo}–{hi}' },
  voted: { 'pt-BR': 'votaram', en: 'voted' },
  tieAgain: { 'pt-BR': 'Empate! Nova votação só entre os empatados.', en: 'Tie! A new vote among the tied players only.' },
  resultTitle: { 'pt-BR': 'Apuração', en: 'Tally' },
  votes: { 'pt-BR': 'votos', en: 'votes' },
  vote1: { 'pt-BR': 'voto', en: 'vote' },
  orderTitle: { 'pt-BR': 'Ordem de escolha', en: 'Picking order' },
  pickTitle: { 'pt-BR': 'Escolha de classes', en: 'Class pick' },
  pickSub: { 'pt-BR': 'Vez de {name} escolher.', en: '{name} is picking.' },
  stratTitle: { 'pt-BR': 'Estratégia', en: 'Strategy' },
  stratSub: { 'pt-BR': 'Conversem, façam alianças. A corrida começa pela Gravidade.', en: 'Talk, make deals. The race starts with Gravity.' },
  fastTitle: { 'pt-BR': 'Rápido se prepara', en: 'Swift gets ready' },
  fastSub: { 'pt-BR': 'Rápido escolhe em segredo duas cartas para trás.', en: 'Swift secretly picks two backward cards.' },
  fastWaiting: { 'pt-BR': 'Rápido ainda escolhe suas cartas para trás…', en: 'Swift is still picking backward cards…' },
  ready: { 'pt-BR': 'prontos', en: 'ready' },
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  toPause: { 'pt-BR': 'rodadas até a pausa', en: 'rounds to the break' },
  toPause1: { 'pt-BR': 'pausa após esta rodada', en: 'break after this round' },
  start: { 'pt-BR': 'Largada', en: 'Start' },
  finishCol: { 'pt-BR': 'Chegada', en: 'Finish' },
  turnOf: { 'pt-BR': 'Vez de', en: 'Turn' },
  decides: { 'pt-BR': '{cls} decide…', en: '{cls} is deciding…' },
  pauseTitle: { 'pt-BR': 'Pausa', en: 'Break' },
  pauseSub: { 'pt-BR': 'Respirem. Toque em Pronto para voltar antes.', en: 'Take a breath. Tap Ready to resume early.' },
  finalTitle: { 'pt-BR': 'Chegada', en: 'Finish' },
  finalSub: { 'pt-BR': 'Quem chegou em 6º vence.', en: 'Whoever finished 6th wins.' },
  ranking: { 'pt-BR': 'Classificação', en: 'Standings' },
  pts: { 'pt-BR': 'pts', en: 'pts' },
  inGame: { 'pt-BR': 'no jogo', en: 'in the game' },
  // phone
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  readyBtn: { 'pt-BR': 'Pronto', en: 'Ready' },
  readyDone: { 'pt-BR': 'Pronto! Aguardando os outros.', en: 'Ready! Waiting for the others.' },
  start_: { 'pt-BR': 'Iniciar', en: 'Start' },
  hostWait: { 'pt-BR': 'O host está ajustando a partida.', en: 'The host is setting up the match.' },
  voteFor: { 'pt-BR': 'Vote em quem deve escolher por último', en: 'Vote for who should pick last' },
  voteSent: { 'pt-BR': 'Voto registrado.', en: 'Vote cast.' },
  yourPick: { 'pt-BR': 'Sua vez: escolha sua classe', en: 'Your turn: pick your class' },
  waitPick: { 'pt-BR': 'Vez de {name} escolher.', en: '{name} is picking.' },
  yourClass: { 'pt-BR': 'Sua classe', en: 'Your class' },
  fastPick: { 'pt-BR': 'Escolha 2 cartas que andam para TRÁS', en: 'Pick 2 cards that move BACKWARDS' },
  confirm: { 'pt-BR': 'Confirmar', en: 'Confirm' },
  backCards: { 'pt-BR': 'Para trás', en: 'Backwards' },
  yourTurn: { 'pt-BR': 'Sua vez! Toque numa carta.', en: 'Your turn! Tap a card.' },
  hand: { 'pt-BR': 'Sua mão', en: 'Your hand' },
  discarded: { 'pt-BR': 'Descartadas', en: 'Discarded' },
  removed: { 'pt-BR': 'Removidas pelo Delete', en: 'Removed by Delete' },
  double: { 'pt-BR': 'Dobrar o valor', en: 'Double the value' },
  leapReset: { 'pt-BR': 'Resetar a mão antes', en: 'Reset my hand first' },
  silencePick: { 'pt-BR': 'Calar alguém antes (opcional)', en: 'Silence someone first (optional)' },
  nobody: { 'pt-BR': 'Ninguém', en: 'Nobody' },
  moveMode: { 'pt-BR': 'Andar', en: 'Move' },
  gravityMode: { 'pt-BR': 'Usar Gravidade', en: 'Use Gravity' },
  gravityPick: { 'pt-BR': 'Quem puxar? Depois toque na carta a descartar.', en: 'Who to pull? Then tap the card to discard.' },
  silenced: { 'pt-BR': 'Você está calado: sem habilidade até o próximo turno do Silêncio.', en: 'You are silenced: no ability until Silence\'s next turn.' },
  waitTurn: { 'pt-BR': 'Vez de {name}.', en: '{name}\'s turn.' },
  arrived: { 'pt-BR': 'Você chegou em {n}º lugar.', en: 'You finished {n}th.' },
  oneDir: { 'pt-BR': 'Alguém jogou um "1": ande 1 espaço', en: 'Someone played a "1": move 1 space' },
  pushDir: { 'pt-BR': 'Empurre {name}', en: 'Shove {name}' },
  resetTarget: { 'pt-BR': 'Você voltou: devolva as cartas descartadas de alguém', en: 'You moved back: return someone\'s discarded cards' },
  deleteTarget: { 'pt-BR': 'Você foi movido: escolha quem perde cartas', en: 'You were moved: pick who loses cards' },
  deleteKeep: { 'pt-BR': 'Mão de {name}: escolha a carta que ele mantém', en: '{name}\'s hand: pick the card they keep' },
  mirrorTarget: { 'pt-BR': 'Você foi movido: mova alguém {n} para {dir}', en: 'You were moved: move someone {n} {dir}' },
  juntoTarget: { 'pt-BR': 'Última carta: leve alguém {n} para frente', en: 'Last card: take someone {n} forward' },
  fwd: { 'pt-BR': 'frente', en: 'forward' },
  back: { 'pt-BR': 'trás', en: 'back' },
  fwdBtn: { 'pt-BR': 'Frente ▶', en: 'Forward ▶' },
  backBtn: { 'pt-BR': '◀ Trás', en: '◀ Back' },
  guide: { 'pt-BR': 'Guia das classes', en: 'Class guide' },
  // setup
  sColumns: { 'pt-BR': 'Colunas do tabuleiro', en: 'Board columns' },
  sReadOn: { 'pt-BR': 'Tempo de leitura', en: 'Reading time' },
  sReadSec: { 'pt-BR': 'Leitura (s)', en: 'Reading (s)' },
  sVoteSec: { 'pt-BR': 'Votação (s)', en: 'Vote (s)' },
  sPickSec: { 'pt-BR': 'Escolha de classe (s)', en: 'Class pick (s)' },
  sStratOn: { 'pt-BR': 'Tempo de estratégia', en: 'Strategy time' },
  sStratSec: { 'pt-BR': 'Estratégia (s)', en: 'Strategy (s)' },
  sTurnSec: { 'pt-BR': 'Turno (s)', en: 'Turn (s)' },
  sReactSec: { 'pt-BR': 'Reação (s)', en: 'Reaction (s)' },
  sPauseOn: { 'pt-BR': 'Pausa entre rodadas', en: 'Break between rounds' },
  sPauseEvery: { 'pt-BR': 'Pausar a cada (rodadas)', en: 'Break every (rounds)' },
  sPauseSec: { 'pt-BR': 'Duração da pausa (s)', en: 'Break length (s)' },
  on: { 'pt-BR': 'Ligado', en: 'On' },
  off: { 'pt-BR': 'Desligado', en: 'Off' },
} satisfies Record<string, I18nText>;

const SETUP_LABELS: Record<keyof Setup, I18nText> = {
  columns: L.sColumns, readOn: L.sReadOn, readSec: L.sReadSec, voteSec: L.sVoteSec, pickSec: L.sPickSec,
  stratOn: L.sStratOn, stratSec: L.sStratSec, turnSec: L.sTurnSec, reactSec: L.sReactSec,
  pauseOn: L.sPauseOn, pauseEvery: L.sPauseEvery, pauseSec: L.sPauseSec,
};
const SETUP_ORDER: (keyof Setup)[] = [
  'columns', 'readOn', 'readSec', 'voteSec', 'pickSec', 'stratOn', 'stratSec', 'turnSec', 'reactSec', 'pauseOn', 'pauseEvery', 'pauseSec',
];
/** Fields hidden while their switch is off. */
const SETUP_DEPENDS: Partial<Record<keyof Setup, keyof Setup>> = { readSec: 'readOn', stratSec: 'stratOn', pauseEvery: 'pauseOn', pauseSec: 'pauseOn' };

const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

// Narration: the actor by class, the target by player name.
const NARR: Record<LogEntry['k'], I18nText> = {
  card: { 'pt-BR': '{a} jogou {v} e andou para {d}', en: '{a} played {v} and moved {d}' },
  zero: { 'pt-BR': '{a} jogou 0 e ficou parado', en: '{a} played 0 and stayed put' },
  gravity: { 'pt-BR': 'Gravidade puxou {b}', en: 'Gravity pulled {b}' },
  push: { 'pt-BR': 'Empurrão empurrou {b} para {d}', en: 'Shove shoved {b} {d}' },
  union: { 'pt-BR': 'União puxou {b}', en: 'Union pulled {b}' },
  junto: { 'pt-BR': 'Junto levou {b} {v} para frente', en: 'Together took {b} {v} forward' },
  mirror: { 'pt-BR': 'Espelho moveu {b} {v} para {d}', en: 'Mirror moved {b} {v} {d}' },
  one: { 'pt-BR': 'Um andou 1 para {d}', en: 'One moved 1 {d}' },
  reset: { 'pt-BR': 'Reset devolveu as cartas de {b}', en: 'Reset returned {b}\'s cards' },
  delete: { 'pt-BR': 'Delete limpou a mão de {b}', en: 'Delete wiped {b}\'s hand' },
  silence: { 'pt-BR': 'Silêncio calou {b}', en: 'Silence silenced {b}' },
  finish: { 'pt-BR': '{a} cruzou a chegada em {v}º', en: '{a} crossed the finish {v}th' },
  loop: { 'pt-BR': 'Ciclo interrompido: reações encerradas', en: 'Loop cut: reactions stopped' },
  lost: { 'pt-BR': '{a} ficou sem alvo e perdeu a ativação', en: '{a} had no target and lost the activation' },
  leapReset: { 'pt-BR': 'Pulo resetou a mão', en: 'Leap reset its hand' },
  refill: { 'pt-BR': '{a} recuperou todas as cartas', en: '{a} got all cards back' },
};

function narrate(e: LogEntry, t: T, nameOfCls: (c: number) => string): string {
  const dir = e.d === -1 ? L.back : L.fwd;
  const v = e.k === 'card' && e.x ? `${e.v}×2` : (e.v ?? '');
  return fill(t(NARR[e.k]), {
    a: e.k === 'finish' ? nameOfCls(e.a) : t(classInfo(e.a).name),
    b: e.b ? nameOfCls(e.b) : '',
    v,
    d: t(dir),
  });
}

const CSS = `
.mrg-tv{height:100vh;box-sizing:border-box;padding:1.6em 2.6em 1.2em;display:grid;grid-template-rows:auto 1fr;gap:1em;overflow:hidden}
.mrg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.mrg-head.small .mrg-h1{font-size:3em}
.mrg-head.small .mrg-sub{font-size:1.5em}
.mrg-h1{font-family:var(--font-display);font-weight:900;font-size:4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.mrg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.15em 0 0}
.mrg-body{display:grid;min-height:0;gap:1.2em}
.mrg-rise{animation:mrg-rise .7s var(--ease-out) both}
@keyframes mrg-rise{from{opacity:0;transform:translateY(.6em)}}
@keyframes mrg-glow{0%,100%{box-shadow:0 0 0 1px var(--gold) inset,0 0 .6em rgba(212,175,55,.25)}50%{box-shadow:0 0 0 1px var(--gold-hi) inset,0 0 1.4em rgba(212,175,55,.5)}}
.mrg-classes{display:grid;grid-template-columns:repeat(4,1fr);gap:.55em;align-content:start;min-height:0}
.mrg-cls{display:grid;grid-template-columns:auto 1fr;align-content:start;gap:.1em .6em;padding:.5em .75em;border-radius:var(--radius);background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--line) inset;animation:mrg-rise .6s var(--ease-out) both}
.mrg-cls i{font-style:normal;font-size:1.5em;align-self:center;color:var(--gold-hi);width:1.3em;text-align:center;line-height:1.2}
.mrg-cls b{font-family:var(--font-display);font-size:1.15em;letter-spacing:.04em;align-self:center}
.mrg-cls b small{display:block;font-family:var(--font-ui);font-size:.6em;letter-spacing:.12em;text-transform:uppercase;color:var(--text-mute);line-height:1.2}
.mrg-cls p{grid-column:1/-1;margin:.1em 0 0;font-size:.92em;line-height:1.28;color:var(--text-dim)}
.mrg-classes.compact{gap:.8em;align-content:center}
.mrg-classes.compact .mrg-cls{padding:.9em 1em}
.mrg-classes.compact .mrg-cls b{font-size:1.5em}
.mrg-classes.compact .mrg-owner{font-size:1.5em}
.mrg-cls.taken{box-shadow:0 0 0 1px var(--gold-lo) inset}
.mrg-cls .mrg-owner{grid-column:1/-1;display:flex;align-items:center;gap:.5em;font-size:1.2em;font-weight:600;color:var(--gold-hi);margin-top:.3em}
.mrg-cls.free .mrg-owner{color:var(--text-mute);font-weight:400;font-style:italic}
.mrg-rules{display:grid;gap:.2em;font-size:1.1em;color:var(--text-dim);margin:0;padding:0;list-style:none}
.mrg-rules li::before{content:'♦ ';color:var(--gold)}
.mrg-rules li:first-child{color:var(--gold-hi);font-weight:600}
.mrg-count{font-family:var(--font-display);font-size:1.6em;color:var(--gold-hi);text-align:right}
.mrg-cands{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:1.6em 1.4em}
.mrg-cand{display:grid;justify-items:center;gap:.4em;width:8.4em;text-align:center;animation:mrg-rise .6s var(--ease-out) both}
.mrg-cand b{font-size:1.3em;max-width:7em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrg-cand .mrg-votes{font-family:var(--font-display);font-size:2.4em;color:var(--gold-hi);line-height:1}
.mrg-cand .mrg-votes small{font-family:var(--font-ui);font-size:.4em;color:var(--text-mute);display:block}
.mrg-cand .mrg-slot{font-size:1.1em;color:var(--gold);font-weight:700}
.mrg-order{display:grid;grid-template-columns:repeat(11,1fr);gap:.5em;margin:0 6em}
.mrg-order h3{grid-column:1/-1;margin:0;font-family:var(--font-display);letter-spacing:.14em;text-transform:uppercase;font-size:1.1em;color:var(--gold);text-align:center}
.mrg-oslot{display:grid;justify-items:center;gap:.25em;padding:.45em .2em;border-radius:var(--radius);background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset;min-width:0}
.mrg-oslot em{font-style:normal;font-family:var(--font-display);font-size:1.1em;color:var(--text-mute)}
.mrg-oslot span{font-size:.95em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrg-oslot.on{box-shadow:0 0 0 1px var(--gold-lo) inset}
.mrg-oslot.on em{color:var(--gold-hi)}
.mrg-oslot.now{animation:mrg-glow 1.6s ease-in-out infinite}
.mrg-oslot.contest{box-shadow:0 0 0 1px var(--crimson) inset}
/* race */
.mrg-race{height:100vh;box-sizing:border-box;padding:1em 2em .9em;display:grid;grid-template-rows:auto 1fr auto auto;gap:.6em;overflow:hidden}
.mrg-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}
.mrg-top .mrg-brand{display:grid;gap:.1em}
.mrg-top .mrg-brand b{font-family:var(--font-display);font-size:1.8em;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-hi);line-height:1.15;padding-top:.05em}
.mrg-top .mrg-brand span{font-size:1.2em;color:var(--text-dim)}
.mrg-top .mrg-brand span strong{font-family:var(--font-display);color:var(--gold-hi)}
.mrg-roundno{text-align:center}
.mrg-roundno small{display:block;font-size:1em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute)}
.mrg-roundno strong{font-family:var(--font-display);font-size:3em;line-height:1;color:var(--gold-hi)}
.mrg-top .mrg-timer{justify-self:end;display:flex;align-items:center;gap:.8em}
.mrg-top .mrg-timer span{font-size:1.25em;color:var(--text-dim);text-align:right;max-width:14em}
.mrg-board{display:grid;grid-template-rows:auto repeat(11,1fr);min-height:0;gap:.18em}
.mrg-row{display:grid;grid-template-columns:14.5em 1fr;align-items:center;gap:.6em;min-height:0}
.mrg-lab{display:flex;align-items:center;gap:.45em;min-width:0;padding:.1em .5em;border-radius:6px;height:100%;box-sizing:border-box}
.mrg-lab i{font-style:normal;color:var(--gold);width:1.2em;text-align:center;font-size:1.15em}
.mrg-lab b{font-size:1em;white-space:nowrap}
.mrg-lab span{font-size:.95em;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.mrg-lab small{font-size:.8em;color:var(--text-mute);white-space:nowrap;font-family:var(--font-display)}
.mrg-row.turn .mrg-lab{background:rgba(212,175,55,.14);box-shadow:0 0 0 1px var(--gold-lo) inset}
.mrg-row.deciding .mrg-lab{background:rgba(160,30,50,.18);box-shadow:0 0 0 1px var(--crimson) inset}
.mrg-row.out .mrg-lab{opacity:.55}
.mrg-row .mute{color:var(--crimson-hi);font-weight:700}
.mrg-track{position:relative;height:100%;border-radius:6px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 calc(100%/var(--cols) - 1px),rgba(255,255,255,.09) calc(100%/var(--cols) - 1px) calc(100%/var(--cols)))}
.mrg-track::before,.mrg-track::after{content:'';position:absolute;top:0;bottom:0;width:calc(100%/var(--cols))}
.mrg-track::before{left:0;background:rgba(212,175,55,.12)}
.mrg-track::after{right:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.18) 0 .25em,rgba(0,0,0,.2) .25em .5em)}
.mrg-row.turn .mrg-track{box-shadow:0 0 0 1px var(--gold-lo) inset}
.mrg-tok{position:absolute;top:50%;width:calc(100%/var(--cols));display:grid;place-items:center;transform:translateY(-50%);transition:left .85s cubic-bezier(.3,1.2,.4,1);z-index:1}
.mrg-tok span{display:grid;place-items:center;width:1.7em;height:1.7em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a3020,#15110a);box-shadow:0 0 0 2px var(--gold) ,0 .2em .5em rgba(0,0,0,.6);font-size:1em}
.mrg-row.turn .mrg-tok span{box-shadow:0 0 0 2px var(--gold-hi),0 0 1em rgba(212,175,55,.7)}
.mrg-row.deciding .mrg-tok span{box-shadow:0 0 0 2px var(--crimson-hi),0 0 1em rgba(200,40,60,.6)}
.mrg-row.out .mrg-tok span{box-shadow:0 0 0 2px var(--text-mute)}
.mrg-cols{display:grid;grid-template-columns:14.5em 1fr;gap:.6em;font-size:.8em;color:var(--text-mute)}
.mrg-cols div{display:flex;justify-content:space-between;letter-spacing:.14em;text-transform:uppercase}
.mrg-cols div b{color:var(--gold);font-weight:600}
.mrg-feed{display:grid;gap:.15em;min-height:3.4em;align-content:end;text-align:center}
.mrg-feed p{margin:0;font-size:1.05em;color:var(--text-mute)}
.mrg-feed p.last{font-family:var(--font-serif);font-style:italic;font-size:1.65em;color:var(--gold-hi);animation:mrg-rise .5s var(--ease-out) both}
.mrg-rank{display:grid;grid-template-columns:repeat(11,1fr);gap:.4em;margin:0 7.5em}
.mrg-rk{display:grid;justify-items:center;gap:.1em;padding:.3em .15em;border-radius:var(--radius);background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset;min-width:0;transition:transform .4s}
.mrg-rk em{font-style:normal;font-family:var(--font-display);font-size:1.15em;color:var(--text-mute);line-height:1}
.mrg-rk span{font-size:.9em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrg-rk.mid{box-shadow:0 0 0 1px var(--gold) inset;background:rgba(212,175,55,.1)}
.mrg-rk.mid em{color:var(--gold-hi)}
.mrg-rk.done em{color:var(--text)}
.mrg-rk small{font-size:.75em;color:var(--gold)}
.mrg-final{display:grid;grid-template-columns:repeat(11,1fr);gap:.6em;align-content:center}
.mrg-final .mrg-rk{padding:1em .3em;gap:.4em;animation:mrg-rise .8s var(--ease-out) both}
.mrg-final .mrg-rk em{font-size:2.2em}
.mrg-final .mrg-rk span{font-size:1.1em}
.mrg-final .mrg-rk small{font-size:1.2em}
.mrg-final .mrg-rk.mid{transform:scale(1.12)}

/* tutorial and rules */
.mrg-slide{height:100vh;box-sizing:border-box;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:3.5em;padding:3em 4.5em 5em}
.mrg-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.mrg-slide b,.mrg-tvrules b,.mrg-reader b{color:var(--gold-hi);font-weight:600}
.mrg-dots{display:flex;gap:.6em;margin-top:1.2em}
.mrg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.mrg-dots span[data-on=true]{background:var(--gold)}
.mrg-demo-rank{grid-template-columns:repeat(6,1fr)}
.mrg-demo-rank .mrg-rk{padding:.6em .2em}
.mrg-demo-rank .mrg-rk em{font-size:1.5em}
.mrg-demo-board{height:16em;grid-template-rows:auto repeat(4,1fr)}
.mrg-demo-board .mrg-row,.mrg-demo-board .mrg-cols{grid-template-columns:10em 1fr}
.mrg-demo-phone{display:grid;gap:1em;width:20em;justify-self:center;padding:1.4em;border-radius:1.6em;background:var(--ink-1);box-shadow:0 0 0 1px var(--line-strong) inset;font-size:1.3em}
.mrg-demo-phone .mrg-card{font-size:2em;display:grid;place-items:center}
.mrg-demo-phone .mrg-mini{font-size:.8em}
.mrg-demo-flow{display:grid;gap:1em}
.mrg-flow{display:flex;align-items:center;flex-wrap:wrap;gap:.6em 1em;padding:.8em 1.2em;border-radius:var(--radius);background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--line) inset;font-size:1.4em}
.mrg-flow em{font-style:normal;font-family:var(--font-display);font-size:1.6em;color:var(--gold-hi);width:1.4em;text-align:center}
.mrg-flow i{font-style:normal;color:var(--gold)}
.mrg-hint{font-family:var(--font-serif);font-style:italic;font-size:1.3em;color:var(--gold);margin:0}
.mrg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.mrg-tvrules .mp-panel{width:min(62em,90vw);padding:2.2em 3em}
.mrg-tvrules h2{font-family:var(--font-display);font-size:2.5em;margin:.2em 0 .6em;color:var(--gold-hi)}
.mrg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.mrg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.mrg-reader{max-width:480px;margin:0 auto;display:grid;gap:12px}
.mrg-reader h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.mrg-reader p{margin:0;line-height:1.5}
.mrg-row2{display:flex;gap:8px}
.mrg-row2 > *{flex:1}

/* phone */
.mrg-ph{display:grid;gap:14px}
.mrg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.mrg-h4{margin:0;font:600 13px var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.mrg-list{display:grid;gap:8px}
.mrg-opt{display:flex;align-items:center;gap:10px;min-height:52px;padding:8px 12px;border:0;border-radius:12px;cursor:pointer;text-align:left;
  font:600 16px var(--font-ui);color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;transition:transform .12s}
.mrg-opt:active{transform:scale(.97)}
.mrg-opt[aria-pressed=true]{background:linear-gradient(180deg,rgba(226,195,90,.25),rgba(168,133,32,.18));box-shadow:0 0 0 2px var(--gold) inset}
.mrg-opt:disabled{opacity:.4;cursor:default}
.mrg-opt small{display:block;font-weight:400;font-size:13px;color:var(--text-dim)}
.mrg-opt i{font-style:normal;color:var(--gold-hi);font-size:22px;width:26px;text-align:center}
.mrg-pcls{display:grid;gap:4px;padding:12px 14px;border-radius:14px;background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--gold-lo) inset}
.mrg-pcls b{font-family:var(--font-display);font-size:22px;color:var(--gold-hi)}
.mrg-pcls b i{font-style:normal;margin-right:8px}
.mrg-pcls p{margin:0;font-size:14px;line-height:1.35;color:var(--text-dim)}
.mrg-pcls small{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-mute)}
.mrg-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.mrg-card{position:relative;aspect-ratio:2/3;border:0;border-radius:12px;cursor:pointer;font-family:var(--font-display);font-size:2.1rem;font-weight:900;color:#1a0f05;
  background:linear-gradient(180deg,#f3e6c0,#e2c35a 55%,#a88520);box-shadow:0 2px 8px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.3) inset;transition:transform .12s}
.mrg-card:active{transform:scale(.94)}
.mrg-card:disabled{filter:grayscale(.8) brightness(.55);cursor:default}
.mrg-card.back{background:linear-gradient(180deg,#f0c8cf,#b8384c 55%,#7a1626);color:#fff}
.mrg-card small{position:absolute;bottom:4px;left:0;right:0;font:700 10px var(--font-ui);letter-spacing:.08em;text-transform:uppercase}
.mrg-card[aria-pressed=true]{box-shadow:0 0 0 3px var(--gold-hi),0 0 18px rgba(212,175,55,.7)}
.mrg-mini{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:14px;color:var(--text-dim)}
.mrg-mini span{display:inline-grid;place-items:center;min-width:26px;height:32px;border-radius:6px;background:rgba(255,255,255,.06);font-family:var(--font-display);color:var(--text)}
.mrg-toggle{display:flex;gap:8px}
.mrg-toggle .mrg-opt{flex:1;justify-content:center}
.mrg-dirs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mrg-set{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.mrg-set label{font-size:15px}
.mrg-step{display:flex;align-items:center;gap:6px}
.mrg-step button{width:44px;height:44px;border:0;border-radius:10px;background:rgba(255,255,255,.06);color:var(--gold-hi);font:700 20px var(--font-ui);cursor:pointer}
.mrg-step b{min-width:46px;text-align:center;font-family:var(--font-display);font-size:18px}
.mrg-sw{min-width:108px;height:44px;border:0;border-radius:10px;cursor:pointer;font:600 14px var(--font-ui);background:rgba(255,255,255,.06);color:var(--text-dim)}
.mrg-sw[aria-pressed=true]{background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520);color:#1a0f05}
.mrg-guide{display:grid;gap:8px}
.mrg-guide summary{cursor:pointer;font:600 15px var(--font-ui);color:var(--gold);padding:8px 0}
`;

const Styles = () => <style>{CSS}</style>;

function namesFrom(platform: DisplayProps['platform']): Names {
  return (pid) => platform.players.find((p) => p.id === pid)?.name ?? '—';
}
function avatarFrom(platform: DisplayProps['platform']) {
  return (pid: string | null | undefined) => platform.players.find((p) => p.id === pid)?.avatar ?? '·';
}

// ---------------------------------------------------------------------------
// TV
// ---------------------------------------------------------------------------

function ClassGrid({ t, owner, names, avatar, kit, compact }: { t: T; owner?: Record<string, string>; names: Names; avatar: (p: string) => string; kit: UIKit; compact?: boolean }) {
  return (
    <div className={`mrg-classes ${compact ? "compact" : ""}`}>
      {CLASSES.map((c, i) => {
        const pid = owner?.[c.id];
        return (
          <div key={c.id} className={`mrg-cls ${owner ? (pid ? 'taken' : 'free') : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
            <i>{c.icon}</i>
            <b>
              {c.id}. {t(c.name)}
              <small>{t(c.kind)}</small>
            </b>
            {!compact && <p>{t(c.text)}</p>}
            {owner && (
              <div className="mrg-owner">
                {pid ? (
                  <>
                    <kit.Avatar emoji={avatar(pid)} size="1.6em" /> {names(pid)}
                  </>
                ) : (
                  '—'
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Rules({ t }: { t: T }) {
  return (
    <ul className="mrg-rules">
      <li>{t(L.goal)}</li>
      <li>{t(L.rule1)}</li>
      <li>{t(L.rule2)}</li>
      <li>{t(L.rule3)}</li>
    </ul>
  );
}

function OrderStrip({ order, t, names, now, contest }: { order: (string | null)[]; t: T; names: Names; now?: number; contest?: [number, number] }) {
  return (
    <div className="mrg-order">
      <h3>{t(L.orderTitle)}</h3>
      {order.map((pid, i) => {
        const slot = i + 1;
        const inContest = contest && slot >= contest[0] && slot <= contest[1];
        return (
          <div key={i} className={`mrg-oslot ${pid ? 'on' : ''} ${now === i ? 'now' : ''} ${inContest ? 'contest' : ''}`}>
            <em>{slot}º</em>
            <span>{pid ? names(pid) : '·'}</span>
          </div>
        );
      })}
    </div>
  );
}

function Header({ title, sub, view, kit, platform, extra, small }: { title: string; sub: ReactNode; view: PublicView; kit: UIKit; platform: DisplayProps['platform']; extra?: ReactNode; small?: boolean }) {
  return (
    <header className={`mrg-head mrg-rise ${small ? "small" : ""}`} key={`${view.phase}-${title}`}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.1em' }}>Middle Race</span>
        <h1 className="mrg-h1">{title}</h1>
        <p className="mrg-sub">{sub}</p>
      </div>
      <div style={{ display: 'grid', justifyItems: 'end', gap: '.5em' }}>
        {view.deadline && <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size="6em" paused={!!platform.paused} />}
        {extra}
      </div>
    </header>
  );
}

function Display(props: DisplayProps<PublicView>) {
  const { view, kit, t } = props;
  if (!view) return null;
  return (
    <>
      {view.phase === 'intro' ? (
        <>
          <Styles />
          <TutorialSlide view={view} kit={kit} t={t} />
        </>
      ) : (
        <Screen {...props} />
      )}
      {view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />}
    </>
  );
}

function Screen({ view, kit, t, platform, lang }: DisplayProps<PublicView>) {
  if (!view) return null;
  const names = namesFrom(platform);
  const avatar = avatarFrom(platform);
  const total = platform.players.filter((p) => !p.spectator).length;
  const readyCount = <div className="mrg-count">{view.ready.length}/{total} {t(L.ready)}</div>;

  if (view.phase === 'race' || view.phase === 'final' || view.phase === 'pause') {
    return <RaceScreen view={view} kit={kit} t={t} platform={platform} lang={lang} />;
  }

  let content: ReactNode = null;
  if (view.phase === 'setup' || view.phase === 'read') {
    content = (
      <>
        <Header
          view={view} kit={kit} platform={platform}
          small title={t(view.phase === 'setup' ? L.setupTitle : L.readTitle)}
          sub={t(view.phase === 'setup' ? L.setupSub : L.readSub)}
          extra={view.phase === 'read' ? readyCount : null}
        />
        <div className="mrg-body" style={{ gridTemplateRows: 'auto 1fr' }}>
          <Rules t={t} />
          <ClassGrid t={t} names={names} avatar={avatar} kit={kit} />
        </div>
      </>
    );
  } else if (view.phase === 'vote' || view.phase === 'voteResult') {
    const v = view.vote!;
    const result = v.result;
    const placedSlot = (pid: string) => {
      const e = Object.entries(result?.placed ?? {}).find(([, p]) => p === pid);
      return e ? Number(e[0]) : null;
    };
    const tied = result ? v.cands.filter((c) => placedSlot(c) === null) : [];
    const cands = result ? [...v.cands].sort((a, b) => (result.counts[b] ?? 0) - (result.counts[a] ?? 0)) : v.cands;
    content = (
      <>
        <Header
          view={view} kit={kit} platform={platform}
          title={`${t(result ? L.resultTitle : L.voteTitle)} ${v.no}`}
          sub={result ? (tied.length ? t(L.tieAgain) : t(L.voteSub)) : `${t(L.voteSub)} ${fill(t(L.voteSlots), { lo: v.lo, hi: v.hi })}`}
          extra={!result ? <div className="mrg-count">{v.voted.length}/{total} {t(L.voted)}</div> : null}
        />
        <div className="mrg-body" style={{ gridTemplateRows: '1fr auto' }}>
          <div className="mrg-cands">
            {cands.map((pid, i) => {
              const slot = placedSlot(pid);
              return (
                <div key={pid} className="mrg-cand" style={{ animationDelay: `${i * 60}ms` }}>
                  <kit.Avatar emoji={avatar(pid)} size="5em" active={!result && v.voted.includes(pid)} crimson={!!result && slot === null} badge={!result && v.voted.includes(pid) ? '✓' : undefined} />
                  <b>{names(pid)}</b>
                  {result && (
                    <>
                      <div className="mrg-votes">
                        {result.counts[pid] ?? 0}
                        <small>{t((result.counts[pid] ?? 0) === 1 ? L.vote1 : L.votes)}</small>
                      </div>
                      <div className="mrg-slot">{slot ? `${slot}º` : '?'}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <OrderStrip order={v.order} t={t} names={names} contest={result ? undefined : [v.lo, v.hi]} />
        </div>
      </>
    );
  } else if (view.phase === 'pick') {
    const p = view.pick!;
    const nowIdx = p.order.findIndex((x) => x === p.chooser);
    content = (
      <>
        <Header small view={view} kit={kit} platform={platform} title={t(L.pickTitle)} sub={fill(t(L.pickSub), { name: names(p.chooser) })} />
        <div className="mrg-body" style={{ gridTemplateRows: '1fr auto' }}>
          <ClassGrid compact t={t} owner={view.owner} names={names} avatar={avatar} kit={kit} />
          <OrderStrip order={p.order} t={t} names={names} now={nowIdx} />
        </div>
      </>
    );
  } else if (view.phase === 'strategy' || view.phase === 'fast') {
    content = (
      <>
        <Header
          view={view} kit={kit} platform={platform}
          small title={t(view.phase === 'fast' ? L.fastTitle : L.stratTitle)}
          sub={view.phase === 'fast' ? t(L.fastSub) : view.fastChosen ? t(L.stratSub) : t(L.fastWaiting)}
          extra={view.phase === 'strategy' ? readyCount : null}
        />
        <div className="mrg-body">
          <ClassGrid compact t={t} owner={view.owner} names={names} avatar={avatar} kit={kit} />
        </div>
      </>
    );
  }

  return (
    <div className="mrg-tv">
      <Styles />
      {content}
    </div>
  );
}

function RaceScreen({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const race = view.race!;
  const names = namesFrom(platform);
  const avatar = avatarFrom(platform);
  const pidOf = (cls: number) => race.rows[cls - 1]?.pid ?? '';
  const nameOfCls = (cls: number) => names(pidOf(cls));
  const final = view.phase === 'final';
  const paused = view.phase === 'pause';
  const latest = race.log.slice(-3);
  const decidingLine = race.deciding ? fill(t(L.decides), { cls: t(classInfo(race.deciding.cls).name) }) : null;
  const turnLine = `${t(L.turnOf)} ${t(classInfo(race.turn).name)} · ${nameOfCls(race.turn)}`;

  return (
    <div className="mrg-race">
      <Styles />
      <div className="mrg-top">
        <div className="mrg-brand">
          <b>{t(L.game)}</b>
          {race.roundsToPause !== null && !paused && !final && (
            <span>
              {race.roundsToPause === 1 ? (
                t(L.toPause1)
              ) : (
                <>
                  <strong>{race.roundsToPause}</strong> {t(L.toPause)}
                </>
              )}
            </span>
          )}
        </div>
        <div className="mrg-roundno">
          <small>{final ? t(L.finalTitle) : paused ? `${t(L.pauseTitle)} · ${t(L.round)}` : t(L.round)}</small>
          <strong>{final ? '🏁' : race.round}</strong>
        </div>
        <div className="mrg-timer">
          <span>{final ? t(L.finalSub) : paused ? t(L.pauseSub) : decidingLine ?? turnLine}</span>
          {view.deadline ? <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size="4.4em" paused={!!platform.paused} /> : <div style={{ width: '4.4em' }} />}
        </div>
      </div>

      {final || paused ? (
        <FinalRanking race={race} t={t} names={nameOfCls} avatar={(c) => avatar(pidOf(c))} kit={kit} final={final} />
      ) : (
        <Board race={race} t={t} names={nameOfCls} avatar={(c) => avatar(pidOf(c))} />
      )}

      <div className="mrg-feed">
        {view.hint && <p className="mrg-hint">{t(HINTS[view.hint])}</p>}
        {!final && !paused &&
          latest.map((e, i) => (
            <p key={e.n} className={i === latest.length - 1 ? 'last' : ''}>
              {narrate(e, t, nameOfCls)}
            </p>
          ))}
      </div>

      {!final && !paused && <LiveRanking race={race} names={nameOfCls} />}
    </div>
  );
}

function Board({ race, t, names, avatar }: { race: RaceView; t: T; names: (c: number) => string; avatar: (c: number) => string }) {
  // Several runners on one column: offset them a little so all stay visible (rows differ anyway).
  return (
    <div className="mrg-board" style={{ ['--cols' as string]: race.cols }}>
      <div className="mrg-cols">
        <div />
        <div>
          <b>{t(L.start)}</b>
          <b>{t(L.finishCol)} · {race.cols}</b>
        </div>
      </div>
      {race.rows.map((r) => {
        const info = classInfo(r.cls);
        const cls = [
          'mrg-row',
          race.turn === r.cls && race.awaitingTurn ? 'turn' : '',
          race.deciding?.cls === r.cls ? 'deciding' : '',
          r.out ? 'out' : '',
        ].join(' ');
        return (
          <div key={r.cls} className={cls}>
            <div className="mrg-lab">
              <i>{info.icon}</i>
              <b>{t(info.name)}</b>
              <span>{names(r.cls)}</span>
              {r.silenced && <small className="mute">✕</small>}
              <small>{r.out ? `${r.place}º` : r.discard.join(' ')}</small>
            </div>
            <div className="mrg-track">
              <div className="mrg-tok" style={{ left: `calc(${r.pos - 1} * 100% / var(--cols))` }}>
                <span>{avatar(r.cls)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveRanking({ race, names }: { race: RaceView; names: (c: number) => string }) {
  return (
    <div className="mrg-rank">
      {race.standings.map((cls, i) => {
        const row = race.rows[cls - 1]!;
        return (
          <div key={cls} className={`mrg-rk ${i + 1 === MIDDLE ? 'mid' : ''} ${row.out ? 'done' : ''}`}>
            <em>{i + 1}º</em>
            <span>{names(cls)}</span>
          </div>
        );
      })}
    </div>
  );
}

function FinalRanking({ race, t, names, avatar, kit, final }: { race: RaceView; t: T; names: (c: number) => string; avatar: (c: number) => string; kit: UIKit; final: boolean }) {
  return (
    <div style={{ display: 'grid', gap: '1.2em', alignContent: 'center' }}>
      <h2 className="mrg-h1" style={{ textAlign: 'center', fontSize: '3.2em' }}>{t(final ? L.finalTitle : L.ranking)}</h2>
      <div className="mrg-final">
        {race.standings.map((cls, i) => (
          <div key={cls} className={`mrg-rk ${i + 1 === MIDDLE ? 'mid' : ''}`} style={{ animationDelay: final ? `${2300 + i * 120}ms` : `${i * 60}ms` }}>
            <em>{i + 1}º</em>
            <kit.Avatar emoji={avatar(cls)} size="3.2em" active={final && i + 1 === MIDDLE} badge={final && i + 1 === MIDDLE ? '♛' : undefined} />
            <span>{names(cls)}</span>
            <span style={{ color: 'var(--text-mute)' }}>{t(classInfo(cls).name)}</span>
            {final && <small>{gameRank(i + 1)}º {t(L.inGame)} · +{pointsFor(i + 1)} {t(L.pts)}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

function ClassCard({ cls, t }: { cls: number; t: T }) {
  const c = classInfo(cls);
  return (
    <div className="mrg-pcls">
      <small>{t(L.yourClass)} · {t(c.kind)}</small>
      <b>
        <i>{c.icon}</i>
        {t(c.name)}
      </b>
      <p>{t(c.text)}</p>
    </div>
  );
}

function Guide({ t, open }: { t: T; open?: boolean }) {
  return (
    <details className="mrg-guide" open={open}>
      <summary>{t(L.guide)}</summary>
      <Rules t={t} />
      {CLASSES.map((c) => (
        <div key={c.id} className="mrg-pcls">
          <small>{t(c.kind)}</small>
          <b>
            <i>{c.icon}</i>
            {c.id}. {t(c.name)}
          </b>
          <p>{t(c.text)}</p>
        </div>
      ))}
    </details>
  );
}

function SetupForm({ view, t, send, kit }: { view: PlayerView; t: T; send: (a: unknown) => void; kit: UIKit }) {
  const s = view.setup;
  return (
    <div className="mrg-ph">
      <h4 className="mrg-h4">{t(L.setupTitle)}</h4>
      {SETUP_ORDER.map((k) => {
        const dep = SETUP_DEPENDS[k];
        if (dep && !s[dep]) return null;
        if ((BOOL_KEYS as string[]).includes(k)) {
          const on = s[k] as boolean;
          return (
            <div key={k} className="mrg-set">
              <label>{t(SETUP_LABELS[k])}</label>
              <button type="button" className="mrg-sw" aria-pressed={on} onClick={() => send({ type: 'setup', patch: { [k]: !on } })}>
                {t(on ? L.on : L.off)}
              </button>
            </div>
          );
        }
        const lim = SETUP_LIMITS[k as NumKey];
        const v = s[k] as number;
        return (
          <div key={k} className="mrg-set">
            <label>{t(SETUP_LABELS[k])}</label>
            <div className="mrg-step">
              <button type="button" aria-label="−" disabled={v <= lim.min} onClick={() => send({ type: 'setup', patch: { [k]: v - lim.step } })}>−</button>
              <b>{v}</b>
              <button type="button" aria-label="+" disabled={v >= lim.max} onClick={() => send({ type: 'setup', patch: { [k]: v + lim.step } })}>+</button>
            </div>
          </div>
        );
      })}
      <kit.Button block onClick={() => send({ type: 'start' })}>{t(L.start_)}</kit.Button>
      <Guide t={t} />
    </div>
  );
}

function ReadyButton({ view, t, send, kit }: { view: PlayerView; t: T; send: (a: unknown) => void; kit: UIKit }) {
  return view.ready ? <p className="mrg-note">{t(L.readyDone)}</p> : <kit.Button block onClick={() => send({ type: 'ready' })}>{t(L.readyBtn)}</kit.Button>;
}

function FastPicker({ t, send, kit }: { t: T; send: (a: unknown) => void; kit: UIKit }) {
  const [sel, setSel] = useState<number[]>([]);
  const toggle = (n: number) => setSel((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : cur.length < 2 ? [...cur, n] : cur));
  return (
    <div className="mrg-ph">
      <h4 className="mrg-h4">{t(L.fastPick)}</h4>
      <div className="mrg-cards" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" className={`mrg-card ${sel.includes(n) ? 'back' : ''}`} aria-pressed={sel.includes(n)} onClick={() => toggle(n)}>
            {n}
            {sel.includes(n) && <small>{t(L.backCards)}</small>}
          </button>
        ))}
      </div>
      <kit.Button block disabled={sel.length !== 2} onClick={() => send({ type: 'fastBack', cards: sel })}>{t(L.confirm)}</kit.Button>
    </div>
  );
}

function Hand({ view, t }: { view: PlayerView; t: T }) {
  const r = view.race!;
  const back = view.fastBack ?? [];
  return (
    <div className="mrg-ph" style={{ gap: 8 }}>
      <div className="mrg-mini">
        {t(L.hand)}:{' '}
        {r.hand.map((c, i) => (
          <span key={i} style={back.includes(c) ? { color: 'var(--crimson-hi)' } : undefined}>{c}</span>
        ))}
      </div>
      {r.discard.length > 0 && (
        <div className="mrg-mini">
          {t(L.discarded)}: {r.discard.map((c, i) => <span key={i}>{c}</span>)}
        </div>
      )}
      {r.removed.length > 0 && (
        <div className="mrg-mini">
          {t(L.removed)}: {r.removed.map((c, i) => <span key={i}>{c}</span>)}
        </div>
      )}
    </div>
  );
}

function TurnPanel({ view, t, send, names }: { view: PlayerView; t: T; send: (a: unknown) => void; names: (c: number) => string }) {
  const o = view.race!.turn!;
  const [double, setDouble] = useState(false);
  const [leapReset, setLeapReset] = useState(false);
  const [silence, setSilence] = useState<number | null>(null);
  const [gravity, setGravity] = useState<number | null>(null);
  const [mode, setMode] = useState<'move' | 'gravity'>('move');
  const cards = leapReset && o.resetCards ? o.resetCards : o.cards;
  const gravityReady = mode === 'move' || gravity !== null;

  const play = (card: number) => {
    const a: Record<string, unknown> = { type: 'turn', card };
    if (o.canDouble && double) a.double = true;
    if (leapReset) a.leapReset = true;
    if (silence !== null) a.silence = silence;
    if (mode === 'gravity' && gravity !== null) a.gravity = gravity;
    send(a);
  };

  return (
    <div className="mrg-ph">
      <h4 className="mrg-h4">{t(L.yourTurn)}</h4>
      {o.cls === SILENCE && o.silenceTargets.length > 0 && (
        <>
          <p className="mrg-note" style={{ fontSize: '1rem' }}>{t(L.silencePick)}</p>
          <div className="mrg-list">
            <button type="button" className="mrg-opt" aria-pressed={silence === null} onClick={() => setSilence(null)}>{t(L.nobody)}</button>
            {o.silenceTargets.map((c) => (
              <button key={c} type="button" className="mrg-opt" aria-pressed={silence === c} onClick={() => setSilence(c)}>
                <i>{classInfo(c).icon}</i>
                <span>
                  {names(c)}
                  <small>{t(classInfo(c).name)}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {o.cls === GRAVITY && o.gravityTargets.length > 0 && (
        <>
          <div className="mrg-toggle">
            <button type="button" className="mrg-opt" aria-pressed={mode === 'move'} onClick={() => setMode('move')}>{t(L.moveMode)}</button>
            <button type="button" className="mrg-opt" aria-pressed={mode === 'gravity'} onClick={() => setMode('gravity')}>{t(L.gravityMode)}</button>
          </div>
          {mode === 'gravity' && (
            <>
              <p className="mrg-note" style={{ fontSize: '1rem' }}>{t(L.gravityPick)}</p>
              <div className="mrg-list">
                {o.gravityTargets.map((c) => (
                  <button key={c} type="button" className="mrg-opt" aria-pressed={gravity === c} onClick={() => setGravity(c)}>
                    <i>{classInfo(c).icon}</i>
                    <span>
                      {names(c)}
                      <small>{t(classInfo(c).name)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {o.cls === JUMP && o.resetCards && (
        <button type="button" className="mrg-opt" aria-pressed={leapReset} onClick={() => setLeapReset((x) => !x)}>
          <i>↺</i>
          {t(L.leapReset)}
        </button>
      )}
      {o.cls === FAST && o.canDouble && (
        <button type="button" className="mrg-opt" aria-pressed={double} onClick={() => setDouble((x) => !x)}>
          <i>×2</i>
          {t(L.double)}
        </button>
      )}
      <div className="mrg-cards" style={{ gridTemplateColumns: `repeat(${Math.max(4, cards.length)},1fr)` }}>
        {cards.map((c) => {
          const back = o.backCards.includes(c);
          return (
            <button key={c} type="button" className={`mrg-card ${back ? 'back' : ''}`} disabled={!gravityReady} onClick={() => play(c)}>
              {c}
              {o.cls === FAST && <small>{back ? `◀ ${t(L.back)}` : `${t(L.fwd)} ▶`}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PromptPanel({ view, t, send, names }: { view: PlayerView; t: T; send: (a: unknown) => void; names: (c: number) => string }) {
  const p = view.race!.prompt!;
  const target = (c: number) => (
    <button key={c} type="button" className="mrg-opt" onClick={() => send({ type: 'answer', value: c })}>
      <i>{classInfo(c).icon}</i>
      <span>
        {names(c)}
        <small>{t(classInfo(c).name)}</small>
      </span>
    </button>
  );
  const dirs = (
    <div className="mrg-dirs">
      {[-1, 1].map((d) => (
        <button key={d} type="button" className="mrg-opt" style={{ justifyContent: 'center' }} disabled={!p.options.includes(d)} onClick={() => send({ type: 'answer', value: d })}>
          {t(d === 1 ? L.fwdBtn : L.backBtn)}
        </button>
      ))}
    </div>
  );
  let title = '';
  let body: ReactNode = null;
  switch (p.kind) {
    case 'oneDir':
      title = t(L.oneDir);
      body = dirs;
      break;
    case 'pushDir':
      title = fill(t(L.pushDir), { name: names(p.target!) });
      body = dirs;
      break;
    case 'resetTarget':
      title = t(L.resetTarget);
      body = <div className="mrg-list">{p.options.map(target)}</div>;
      break;
    case 'deleteTarget':
      title = t(L.deleteTarget);
      body = <div className="mrg-list">{p.options.map(target)}</div>;
      break;
    case 'deleteKeep':
      title = fill(t(L.deleteKeep), { name: names(p.target!) });
      body = (
        <div className="mrg-cards" style={{ gridTemplateColumns: `repeat(${Math.max(4, p.options.length)},1fr)` }}>
          {p.options.map((c) => (
            <button key={c} type="button" className="mrg-card" onClick={() => send({ type: 'answer', value: c })}>{c}</button>
          ))}
        </div>
      );
      break;
    case 'mirrorTarget':
      title = fill(t(L.mirrorTarget), { n: p.dist ?? 0, dir: t(p.dir === 1 ? L.back : L.fwd) });
      body = <div className="mrg-list">{p.options.map(target)}</div>;
      break;
    case 'juntoTarget':
      title = fill(t(L.juntoTarget), { n: p.dist ?? 0 });
      body = <div className="mrg-list">{p.options.map(target)}</div>;
      break;
  }
  return (
    <div className="mrg-ph">
      <h4 className="mrg-h4">{title}</h4>
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

const DEMO_AVATARS = ['🎩', '🃏', '🎲', '🍷', '💎', '👑', '🌙', '🦊', '🦉', '🐺', '🎭'];

/** Live illustrations next to each slide, drawn with the game's real pieces. */
function SlideDemo({ demo, kit, t }: { demo: SlideDemoKind; kit: UIKit; t: T }) {
  if (demo === 'goal') {
    return (
      <div className="mrg-final mrg-demo-rank">
        {DEMO_AVATARS.map((a, i) => (
          <div key={i} className={`mrg-rk ${i + 1 === MIDDLE ? 'mid' : ''}`} style={{ animationDelay: `${300 + i * 90}ms` }}>
            <em>{i + 1}º</em>
            <kit.Avatar emoji={a} size="2.4em" active={i + 1 === MIDDLE} badge={i + 1 === MIDDLE ? '♛' : undefined} />
            <small>+{pointsFor(i + 1)}</small>
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'board') {
    const rows = [
      { cls: 1, pos: 6, discard: [1, 4] },
      { cls: 6, pos: 9, discard: [3] },
      { cls: 9, pos: 13, discard: [0, 2, 4] },
      { cls: 11, pos: 4, discard: [] as number[] },
    ];
    return (
      <div className="mrg-board mrg-demo-board" style={{ ['--cols' as string]: 16 }}>
        <div className="mrg-cols">
          <div />
          <div>
            <b>{t(L.start)}</b>
            <b>{t(L.finishCol)}</b>
          </div>
        </div>
        {rows.map((r, i) => (
          <div key={r.cls} className={`mrg-row ${i === 0 ? 'turn' : ''}`}>
            <div className="mrg-lab">
              <i>{classInfo(r.cls).icon}</i>
              <b>{t(classInfo(r.cls).name)}</b>
              <span />
              <small>{r.discard.join(' ')}</small>
            </div>
            <div className="mrg-track">
              <div className="mrg-tok" style={{ left: `calc(${r.pos - 1} * 100% / var(--cols))` }}>
                <span>{DEMO_AVATARS[i]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'turn') {
    return (
      <div className="mrg-demo-phone">
        <span className="mrg-h4">{t(L.yourTurn)}</span>
        <div className="mrg-cards" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[2, 3].map((c) => (
            <div key={c} className="mrg-card" aria-pressed={c === 3}>
              {c}
            </div>
          ))}
        </div>
        <div className="mrg-mini">
          {t(L.discarded)}: <span>1</span> <span>4</span>
        </div>
      </div>
    );
  }
  if (demo === 'reactions') {
    const flows: [string, number[]][] = [
      ['A', [7]],
      ['B', [2, 4, 8]],
      ['C', [3, 5, 6]],
    ];
    return (
      <div className="mrg-demo-flow">
        {flows.map(([f, classes], i) => (
          <div key={f} className="mrg-flow mrg-rise" style={{ animationDelay: `${300 + i * 350}ms` }}>
            <em>{f}</em>
            {classes.map((c) => (
              <span key={c}>
                <i>{classInfo(c).icon}</i> {t(classInfo(c).name)}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  const steps = [L.voteTitle, L.pickTitle, L.stratTitle, L.raceStep];
  return (
    <div className="mrg-demo-flow">
      {steps.map((s, i) => (
        <div key={i} className="mrg-flow mrg-rise" style={{ animationDelay: `${300 + i * 250}ms` }}>
          <em>{i + 1}</em>
          <span>{t(s)}</span>
        </div>
      ))}
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: UIKit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="mrg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="mrg-h1" style={{ fontSize: '3.6em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && <p className="mrg-sub">{t(CREDITS)}</p>}
        <div className="mrg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="mrg-sub" style={{ fontSize: '1.2em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: UIKit; t: T }) {
  const r = RULES[page]!;
  return (
    <div className="mrg-tvrules">
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

/** Full rules on the phone, paged; the Host can mirror a page on the TV. */
function RulesReader({ view, kit, t, send, onClose }: { view: PlayerView; kit: UIKit; t: T; send(a: unknown): void; onClose(): void }) {
  const { Button, Panel } = kit;
  const [page, setPage] = useState(view.tvRules ?? 0);
  const onTv = view.isHost && view.tvRules !== null;
  useEffect(() => {
    if (onTv) send({ type: 'tvRules', page });
  }, [page]);
  const r = RULES[page]!;
  const last = page === RULES.length - 1;
  return (
    <div className="mrg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="mrg-reader">
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
        <div className="mrg-row2">
          <Button small variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹ {t(L.prev)}
          </Button>
          <Button small variant="ghost" disabled={last} onClick={() => setPage(page + 1)}>
            {t(L.next)} ›
          </Button>
        </div>
        {view.isHost && (
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

/** The Host drives the tutorial from their phone; everyone else follows the TV. */
function IntroPane({ view, kit, t, send }: { view: PlayerView; kit: UIKit; t: T; send(a: unknown): void }) {
  const { Panel, Button } = kit;
  const last = view.slide === view.slides - 1;
  return (
    <div className="mrg-ph">
      <Panel className="stack" style={{ textAlign: 'center' }}>
        <span className="mp-eyebrow">
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
        {!view.isHost && <p className="mrg-note">{t(L.followTv)}</p>}
      </Panel>
      {view.isHost && (
        <>
          <div className="mrg-row2">
            <Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
              ‹ {t(L.prev)}
            </Button>
            <Button onClick={() => send({ type: 'intro', dir: 1 })}>{last ? t(L.toSetup) : `${t(L.next)} ›`}</Button>
          </div>
          {!last && (
            <Button block small variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
              {t(L.skipTutorial)}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function Player({ view, kit, t, send, platform }: PlayerProps<PlayerView>) {
  const [sent, setSent] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  useEffect(() => setSent(null), [view?.phase, view?.vote?.myVote, view?.pick?.chooser]);
  if (!view) return null;
  const names = namesFrom(platform);
  const avatar = avatarFrom(platform);
  const nameOfCls = (c: number) => names(view.owner[c]);
  const timer = view.deadline ? (
    <div style={{ display: 'grid', justifyItems: 'center' }}>
      <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size={64} paused={!!platform.paused} />
    </div>
  ) : null;
  // The rules are one tap away in every phase.
  const wrap = (children: ReactNode) => (
    <div className="mrg-ph">
      <Styles />
      {children}
      <kit.Button block small variant="ghost" onClick={() => setRules(true)}>
        📖 {t(L.rules)}
      </kit.Button>
      {rules && <RulesReader view={view} kit={kit} t={t} send={send} onClose={() => setRules(false)} />}
    </div>
  );

  switch (view.phase) {
    case 'intro':
      return wrap(<IntroPane view={view} kit={kit} t={t} send={send} />);
    case 'setup':
      return wrap(view.isHost ? <SetupForm view={view} t={t} send={send} kit={kit} /> : (
        <>
          <p className="mrg-note">{t(L.hostWait)}</p>
          <Guide t={t} open />
        </>
      ));
    case 'read':
      return wrap(
        <>
          {timer}
          <ReadyButton view={view} t={t} send={send} kit={kit} />
          <Guide t={t} open />
        </>,
      );
    case 'vote': {
      const v = view.vote!;
      const mine = sent ?? v.myVote;
      return wrap(
        <>
          {timer}
          <h4 className="mrg-h4">{t(L.voteFor)}</h4>
          {mine && <p className="mrg-note">{t(L.voteSent)}</p>}
          <div className="mrg-list">
            {v.cands.map((pid) => (
              <button
                key={pid} type="button" className="mrg-opt" aria-label={names(pid)} aria-pressed={mine === pid} disabled={!!v.myVote && v.myVote !== pid}
                onClick={() => {
                  if (v.myVote) return;
                  setSent(pid);
                  send({ type: 'vote', target: pid });
                }}
              >
                <kit.Avatar emoji={avatar(pid)} size={34} />
                {names(pid)}
              </button>
            ))}
          </div>
        </>,
      );
    }
    case 'pick': {
      const p = view.pick!;
      if (!p.myTurn) {
        return wrap(
          <>
            {timer}
            <p className="mrg-note">{fill(t(L.waitPick), { name: names(p.chooser) })}</p>
            {view.myClass ? <ClassCard cls={view.myClass} t={t} /> : null}
          </>,
        );
      }
      return wrap(
        <>
          {timer}
          <h4 className="mrg-h4">{t(L.yourPick)}</h4>
          <div className="mrg-list">
            {p.free.map((c) => (
              <button key={c} type="button" className="mrg-opt" aria-label={t(classInfo(c).name)} onClick={() => send({ type: 'pick', cls: c })}>
                <i>{classInfo(c).icon}</i>
                <span>
                  {c}. {t(classInfo(c).name)}
                  <small>{t(classInfo(c).text)}</small>
                </span>
              </button>
            ))}
          </div>
        </>,
      );
    }
    case 'strategy':
    case 'fast':
      return wrap(
        <>
          {timer}
          {view.myClass && <ClassCard cls={view.myClass} t={t} />}
          {view.mustChooseFast && <FastPicker t={t} send={send} kit={kit} />}
          {view.fastBack && (
            <div className="mrg-mini">
              {t(L.backCards)}: {view.fastBack.map((c) => <span key={c} style={{ color: 'var(--crimson-hi)' }}>{c}</span>)}
            </div>
          )}
          {view.phase === 'strategy' && !view.mustChooseFast && <ReadyButton view={view} t={t} send={send} kit={kit} />}
          {view.phase === 'fast' && !view.mustChooseFast && <p className="mrg-note">{t(L.watch)}</p>}
        </>,
      );
    case 'race': {
      const r = view.race;
      if (!r || !view.myClass) return wrap(<p className="mrg-note">{t(L.watch)}</p>);
      return wrap(
        <>
          {(r.turn || r.prompt) && timer}
          {r.out ? (
            <p className="mrg-note">{fill(t(L.arrived), { n: r.place ?? 0 })}</p>
          ) : r.prompt ? (
            <PromptPanel view={view} t={t} send={send} names={nameOfCls} />
          ) : r.turn ? (
            <TurnPanel key={`${r.turnCls}-${r.hand.join('')}-${r.discard.length}`} view={view} t={t} send={send} names={nameOfCls} />
          ) : (
            <p className="mrg-note">
              {r.deciding ? fill(t(L.decides), { cls: t(classInfo(r.deciding).name) }) : fill(t(L.waitTurn), { name: nameOfCls(r.turnCls) })}
            </p>
          )}
          {r.silenced && <p className="mrg-note">{t(L.silenced)}</p>}
          {!r.out && <Hand view={view} t={t} />}
          <ClassCard cls={view.myClass} t={t} />
        </>,
      );
    }
    case 'pause':
      return wrap(
        <>
          {timer}
          <ReadyButton view={view} t={t} send={send} kit={kit} />
        </>,
      );
    default:
      return wrap(<p className="mrg-note">{t(L.watch)}</p>);
  }
}

export default defineGameUI({ Display, Player });
