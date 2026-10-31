import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  defineGameUI,
  type DealerProps,
  type DisplayProps,
  type I18nText,
  type PlayerProps,
} from '@mp/game-sdk';
import type { BoardView, DealerView, LogEntry, PlayerView, PublicView, Result, RoleCard, Turn } from './logic.ts';
import { adjacency, generateBoard, LINE_COLORS, type Board } from './board.ts';
import { TEAM_COLORS, TEAMS, type Side, type Team } from './shared.ts';
import { CREDITS, HINTS, RULES, SLIDES } from './texts.ts';

// Only `react` and `@mp/game-sdk` may be imported from packages. Platform components come in
// through `kit`, text goes through `t()`, and styles are scoped with the `rng-` prefix.

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  of: { 'pt-BR': 'de', en: 'of' },
  noCap: { 'pt-BR': 'sem teto', en: 'no cap' },
  thieves: { 'pt-BR': 'Ladrões', en: 'Thieves' },
  thief: { 'pt-BR': 'Ladrão', en: 'Thief' },
  red: { 'pt-BR': 'Equipe Vermelha', en: 'Red Squad' },
  blue: { 'pt-BR': 'Equipe Azul', en: 'Blue Squad' },
  green: { 'pt-BR': 'Equipe Verde', en: 'Green Squad' },
  redShort: { 'pt-BR': 'Vermelha', en: 'Red' },
  blueShort: { 'pt-BR': 'Azul', en: 'Blue' },
  greenShort: { 'pt-BR': 'Verde', en: 'Green' },
  placingTitle: { 'pt-BR': 'Posicionamento', en: 'Deployment' },
  setup: { 'pt-BR': 'Antes da primeira rodada', en: 'Before the first round' },
  placingCop: { 'pt-BR': '{who} escolhe onde começar.', en: '{who} picks a starting stop.' },
  placingThief: {
    'pt-BR': 'Os ladrões se escondem — todos fora da sala dos ladrões.',
    en: 'The thieves hide — everyone out of the thieves’ room.',
  },
  nextUp: { 'pt-BR': 'A seguir', en: 'Up next' },
  goThieves: {
    'pt-BR': 'Ladrões, para o esconderijo. Os demais, fora das salas.',
    en: 'Thieves, to your hideout. Everyone else, out of the rooms.',
  },
  goTeam: {
    'pt-BR': '{team}, para a sua sala. Os demais, fora das salas.',
    en: '{team}, to your room. Everyone else, out of the rooms.',
  },
  thievesTurn: { 'pt-BR': 'Vez dos ladrões', en: 'The thieves move' },
  thievesSub: { 'pt-BR': '{who} está se movendo em segredo…', en: '{who} is moving in secret…' },
  copsSub: {
    'pt-BR': '{who} age — {n} ação(ões) restante(s).',
    en: '{who} acts — {n} action(s) left.',
  },
  voteTitle: { 'pt-BR': 'Quem é o corrupto?', en: 'Who is crooked?' },
  voteSub: {
    'pt-BR': 'Cada equipe vota em segredo na sua sala. “Ninguém” só vale se a equipe toda concordar.',
    en: 'Each squad votes in secret in its room. “Nobody” only counts if the whole squad agrees.',
  },
  thievesWin: { 'pt-BR': 'Os ladrões escaparam', en: 'The thieves got away' },
  copsWin: { 'pt-BR': 'A polícia venceu', en: 'The police win' },
  whyStars: { 'pt-BR': 'Os ladrões juntaram {n} estrelas.', en: 'The thieves gathered {n} stars.' },
  whyArrests: { 'pt-BR': 'Os dois ladrões estão presos.', en: 'Both thieves are behind bars.' },
  whyVoteCops: {
    'pt-BR': 'Todas as equipes desmascararam o corrupto.',
    en: 'Every squad unmasked its crooked cop.',
  },
  whyVoteThieves: {
    'pt-BR': 'Alguma equipe errou o corrupto — ladrões e corruptos vencem.',
    en: 'A squad missed its crooked cop — thieves and crooked cops win.',
  },
  corruptWere: { 'pt-BR': 'Os corruptos', en: 'The crooked cops' },
  verdict: { 'pt-BR': 'Veredito', en: 'Verdict' },
  nobody: { 'pt-BR': 'Ninguém', en: 'Nobody' },
  noDecision: { 'pt-BR': 'Sem decisão', en: 'No decision' },
  starsRevealed: { 'pt-BR': 'Os ladrões têm', en: 'The thieves hold' },
  stars: { 'pt-BR': 'estrelas', en: 'stars' },
  log: { 'pt-BR': 'Registro', en: 'Log' },
  logEmpty: { 'pt-BR': 'Nada aconteceu ainda.', en: 'Nothing has happened yet.' },
  goal: { 'pt-BR': 'Meta', en: 'Goal' },
  reveals: { 'pt-BR': 'Revelações', en: 'Reveals' },
  arrested: { 'pt-BR': 'preso', en: 'arrested' },
  // Log lines
  lCopPlaced: { 'pt-BR': '{who} começou na {a}', en: '{who} starts at {a}' },
  lThiefPlaced: { 'pt-BR': '{who} se escondeu', en: '{who} went into hiding' },
  lThiefPlacedAt: { 'pt-BR': '{who} começou na {a}', en: '{who} starts at {a}' },
  lThiefPlayed: { 'pt-BR': '{who} jogou', en: '{who} played' },
  lThiefStart: { 'pt-BR': '🦹 {who} começou na {a}', en: '🦹 {who} starts at {a}' },
  lThiefTo: { 'pt-BR': '🦹 {who} foi para a {a}', en: '🦹 {who} moved to {a}' },
  lThiefStay: { 'pt-BR': '{who} ficou na {a}', en: '{who} stayed at {a}' },
  lStar: { 'pt-BR': '⭐ {who} pegou a estrela da {a} ({n})', en: '⭐ {who} took the star at {a} ({n})' },
  lCopMove: { 'pt-BR': '{who}: {a} → {b}', en: '{who}: {a} → {b}' },
  lInvestigate: { 'pt-BR': '🔍 {who} investigou a {a}', en: '🔍 {who} investigated {a}' },
  lArrestMiss: { 'pt-BR': '🚔 {who} tentou prender na {a} — ninguém', en: '🚔 {who} raided {a} — nobody' },
  lArrestHit: { 'pt-BR': '🚔 {who} PRENDEU {b} na {a}!', en: '🚔 {who} ARRESTED {b} at {a}!' },
  lStarsBack: { 'pt-BR': 'As estrelas de {who} voltaram à cidade', en: '{who}’s stars went back to the city' },
  lStarsBackN: { 'pt-BR': '{n} estrela(s) de {who} voltaram à cidade', en: '{n} of {who}’s stars went back' },
  lPass: { 'pt-BR': '{who} passou a vez', en: '{who} passed' },
  lTimeout: { 'pt-BR': '{who} perdeu a vez', en: '{who} ran out of time' },
  lReveal: { 'pt-BR': '📣 Os ladrões têm {n} estrelas', en: '📣 The thieves hold {n} stars' },
  // Phone
  you: { 'pt-BR': 'Você', en: 'You' },
  yourStop: { 'pt-BR': 'Sua casa', en: 'Your stop' },
  hold: { 'pt-BR': 'Segure para ver seus segredos', en: 'Hold to see your secrets' },
  honest: { 'pt-BR': 'Policial honesto', en: 'Honest cop' },
  honestSub: {
    'pt-BR': 'Prenda os dois ladrões e desmascare o corrupto da sua equipe.',
    en: 'Arrest both thieves and unmask your squad’s crooked cop.',
  },
  crooked: { 'pt-BR': 'Policial CORRUPTO', en: 'CROOKED cop' },
  crookedSub: {
    'pt-BR': 'Ajude os ladrões sem ser descoberto. Suas prisões sempre falham.',
    en: 'Help the thieves without being caught. Your arrests always fail.',
  },
  thiefRole: { 'pt-BR': 'Ladrão', en: 'Thief' },
  thiefSub: { 'pt-BR': 'Juntem {n} estrelas sem serem presos.', en: 'Gather {n} stars without getting caught.' },
  partner: { 'pt-BR': 'Parceiro', en: 'Partner' },
  otherCrooked: { 'pt-BR': 'Os corruptos', en: 'Crooked cops' },
  teamStars: { 'pt-BR': 'Estrelas do bando', en: 'Gang’s stars' },
  invTitle: { 'pt-BR': 'Suas investigações', en: 'Your investigations' },
  invHit: { 'pt-BR': 'um ladrão JÁ passou', en: 'a thief HAS been here' },
  invMiss: { 'pt-BR': 'nenhum ladrão passou', en: 'no thief has been here' },
  privateLog: { 'pt-BR': 'Registro secreto', en: 'Secret log' },
  newResult: { 'pt-BR': 'Resultado pronto — segure para ver.', en: 'Result ready — hold to see.' },
  pickStart: { 'pt-BR': 'Toque na casa onde quer começar.', en: 'Tap the stop where you want to start.' },
  noStarStart: { 'pt-BR': 'Não pode começar numa casa com estrela.', en: 'You cannot start on a star.' },
  placeAt: { 'pt-BR': 'Começar na {a}', en: 'Start at {a}' },
  moveHint: {
    'pt-BR': 'Toque até 2 casas, uma de cada vez. Estrelas no caminho são suas.',
    en: 'Tap up to 2 stops, one at a time. Stars on the way are yours.',
  },
  goTo: { 'pt-BR': 'Ir para {a}', en: 'Go to {a}' },
  chooseStop: { 'pt-BR': 'Escolha no mapa', en: 'Pick on the map' },
  stay: { 'pt-BR': 'Ficar parado', en: 'Stay put' },
  undo: { 'pt-BR': 'Desfazer', en: 'Undo' },
  actHint: {
    'pt-BR': 'Escolha a casa (a sua ou uma vizinha) e depois a ação.',
    en: 'Pick a stop (yours or a neighbour), then the action.',
  },
  investigate: { 'pt-BR': '🔍 Investigar a {a}', en: '🔍 Investigate {a}' },
  arrest: { 'pt-BR': '🚔 Prender na {a}', en: '🚔 Arrest at {a}' },
  pass: { 'pt-BR': 'Passar a vez', en: 'Pass' },
  actionsLeft: { 'pt-BR': '{n} de 2 ações', en: '{n} of 2 actions' },
  waitTeam: {
    'pt-BR': 'Vez da sua equipe: {who} está agindo. Fique na sala.',
    en: 'Your squad’s turn: {who} is acting. Stay in the room.',
  },
  waitThieves: {
    'pt-BR': 'Vez do bando: {who} está se movendo. Fique no esconderijo.',
    en: 'The gang’s turn: {who} is moving. Stay in the hideout.',
  },
  waitOther: { 'pt-BR': 'Vez de {side}. Fique fora das salas.', en: '{side}’s turn. Stay out of the rooms.' },
  waitBreak: { 'pt-BR': 'A seguir: {side}.', en: 'Up next: {side}.' },
  yourGo: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  voteHint: { 'pt-BR': 'Quem da sua equipe é o corrupto?', en: 'Who in your squad is crooked?' },
  voted: { 'pt-BR': 'Voto registrado. Pode trocar até o tempo acabar.', en: 'Vote in. You can change it until time is up.' },
  thiefVote: {
    'pt-BR': 'A polícia está votando. Torça pelo erro deles.',
    en: 'The police are voting. Hope they get it wrong.',
  },
  arrestedYou: { 'pt-BR': 'Você foi preso. Seu parceiro segue sozinho.', en: 'You were arrested. Your partner carries on.' },
  watchTv: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  zoomIn: { 'pt-BR': 'Aproximar', en: 'Zoom in' },
  zoomOut: { 'pt-BR': 'Afastar', en: 'Zoom out' },
  recenter: { 'pt-BR': 'Centralizar', en: 'Recenter' },
  // Dealer
  hideout: { 'pt-BR': 'Esconderijo', en: 'Hideout' },
  hideoutSub: {
    'pt-BR': 'Só ladrões nesta sala. As estrelas e as posições do bando ficam aqui.',
    en: 'Thieves only in this room. The stars and the gang’s positions live here.',
  },
  dealerNext: { 'pt-BR': 'A seguir: {side}', en: 'Up next: {side}' },
  dealerNow: { 'pt-BR': 'Agora: {side}', en: 'Now: {side}' },
  starsLeft: { 'pt-BR': 'no mapa', en: 'on the map' },
  crookedTag: { 'pt-BR': 'corrupto', en: 'crooked' },
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
  hall: { 'pt-BR': 'Corredor', en: 'Hall' },
  demoUpTo2: { 'pt-BR': 'até 2 casas', en: 'up to 2 stops' },
  demo2Actions: { 'pt-BR': '2 ações cada', en: '2 actions each' },
  // Briefing
  briefTitle: { 'pt-BR': 'Conheçam seus papéis', en: 'Learn your roles' },
  briefPhone: {
    'pt-BR': 'Segure o botão no celular para ver seu papel em segredo, depois toque em Pronto.',
    en: 'Hold the button on your phone to see your role in secret, then tap Ready.',
  },
  briefDealer: {
    'pt-BR': 'Um por vez, vá ao Dealer na sala dos ladrões para ver seu papel.',
    en: 'One at a time, go to the Dealer in the thieves’ room to see your role.',
  },
  briefNote: {
    'pt-BR': 'Equipes e ordens são públicas. Dois policiais são corruptos — no máximo um por equipe.',
    en: 'Squads and turn orders are public. Two cops are crooked — at most one per squad.',
  },
  orderN: { 'pt-BR': '{n}º na ordem', en: '#{n} in turn order' },
  yourTeam: { 'pt-BR': 'Sua equipe', en: 'Your squad' },
  ready: { 'pt-BR': 'Pronto', en: 'Ready' },
  readyDone: {
    'pt-BR': 'Pronto! Esperando os outros — o tabuleiro aparece em seguida.',
    en: 'Ready! Waiting for the others — the board comes next.',
  },
  goDealerBrief: {
    'pt-BR': 'Toque em “Ir ao Dealer” acima e espere ser chamado.',
    en: 'Tap “Go to the Dealer” above and wait to be called.',
  },
  dealerSeen: { 'pt-BR': 'Papel visto. Aguarde os outros.', en: 'Role seen. Wait for the others.' },
  roleRemember: { 'pt-BR': 'Memorize. Não conte a ninguém.', en: 'Memorise it. Tell no one.' },
  dealerBriefWait: {
    'pt-BR': 'Cada jogador vem aqui uma vez para ver seu papel.',
    en: 'Every player comes here once to see their role.',
  },
} satisfies Record<string, I18nText>;

type T = (x: I18nText) => string;
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

const TEAM_NAME: Record<Team, I18nText> = { red: L.red, blue: L.blue, green: L.green };
const sideName = (t: T, side: Side | null) => (side === 'thieves' ? t(L.thieves) : side ? t(TEAM_NAME[side]) : '');

const CSS = `
.rng-tv{height:100vh;display:grid;grid-template-rows:auto 1fr;padding:2em 2.6em 3.4em;gap:1.2em}
.rng-head{display:flex;align-items:center;justify-content:space-between;gap:2em}
.rng-h1{font-family:var(--font-display);font-weight:900;font-size:3.6em;letter-spacing:.05em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.rng-sub{font-family:var(--font-serif);font-style:italic;font-size:1.7em;color:var(--text-dim);margin:.15em 0 0}
.rng-body{display:grid;grid-template-columns:1fr 19em;gap:1.4em;min-height:0}
.rng-mapbox{min-height:0;display:grid;place-items:center;border-radius:1em;background:radial-gradient(ellipse at 50% 40%,rgba(212,175,55,.06),transparent 70%),rgba(255,255,255,.015);box-shadow:0 0 0 1px var(--line) inset}
.rng-map{width:100%;height:100%;display:block}
.rng-map text{font-family:var(--font-ui);font-weight:700;pointer-events:none}
.rng-side{display:grid;grid-template-rows:auto 1fr;gap:.8em;min-height:0;overflow:hidden}
.rng-teams{display:grid;gap:.4em}
.rng-team{border-radius:.6em;padding:.3em .6em;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.rng-team[data-on=true]{box-shadow:0 0 0 2px var(--gold) inset,0 0 1.2em rgba(212,175,55,.25)}
.rng-team-h{display:flex;align-items:center;gap:.5em;font-family:var(--font-display);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.85em}
.rng-dot{width:.8em;height:.8em;border-radius:50%;flex:none;box-shadow:0 0 0 2px rgba(0,0,0,.4)}
.rng-mem{display:flex;align-items:center;gap:.45em;font-size:.92em;padding:.05em 0}
.rng-mem b{font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rng-mem[data-on=true] b{color:var(--gold-hi)}
.rng-mem[data-crooked=true] b{color:var(--crimson-hi)}
.rng-crookedtag{font-size:.62em;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:var(--crimson);border-radius:.4em;padding:.1em .45em;flex:none}
.rng-mem small{color:var(--text-mute);font-variant-numeric:tabular-nums}
.rng-ord{font-family:var(--font-display);color:var(--text-mute);width:1.1em;text-align:right}
.rng-log{min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:.2em;font-size:.95em;
  mask-image:linear-gradient(transparent,#000 3em)}
.rng-log div{color:var(--text-dim);line-height:1.3}
.rng-log div:last-child{color:var(--text)}
.rng-log i{font-style:normal;color:var(--text-mute);font-size:.85em;margin-right:.35em}
.rng-banner{display:grid;justify-items:center;gap:.4em;text-align:center}
.rng-big{font-family:var(--font-display);font-weight:900;font-size:9em;line-height:1;color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.35);animation:rng-pop .8s 2.3s cubic-bezier(.16,1,.3,1) both}
@keyframes rng-pop{from{opacity:0;transform:scale(.4)}}
.rng-over{display:grid;grid-template-columns:1fr 24em;gap:1.6em;min-height:0}
.rng-verdicts{display:grid;gap:.55em;align-content:start;padding-bottom:1.6em}
.rng-chipline{display:flex;flex-wrap:wrap;gap:.8em;align-items:center}
.rng-hl{animation:rng-glow 1.6s ease-in-out infinite alternate}
@keyframes rng-glow{from{opacity:.35}to{opacity:1}}
.rng-reveal{animation:rng-pop .8s 2.3s cubic-bezier(.16,1,.3,1) both}

/* phone */
.rng-ph{display:grid;gap:12px}
.rng-status{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.rng-status b{font-family:var(--font-ui);font-style:normal;color:var(--gold-hi)}
.rng-tag{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line) inset}
.rng-zoom{position:relative;height:min(58vh,440px);border-radius:14px;overflow:hidden;touch-action:none;background:rgba(255,255,255,.02);box-shadow:0 0 0 1px var(--line) inset}
.rng-zoom .rng-map{touch-action:none}
.rng-zbtns{position:absolute;right:8px;top:8px;display:grid;gap:6px}
.rng-zbtns button{width:40px;height:40px;border-radius:10px;border:0;font-size:1.3rem;font-weight:800;color:var(--gold-hi);background:rgba(10,10,12,.82);box-shadow:0 0 0 1px var(--line-strong) inset;cursor:pointer}
.rng-quick{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.rng-quick button{min-width:56px;height:48px;border-radius:12px;border:0;font-family:var(--font-display);font-size:1.15rem;font-weight:800;cursor:pointer;
  color:var(--gold-hi);background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line) inset}
.rng-quick button[aria-pressed=true]{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.rng-quick button[data-star=true]::after{content:'★';margin-left:3px;color:var(--gold)}
.rng-hold{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;width:100%;min-height:56px;border:0;border-radius:14px;cursor:pointer;
  font-weight:700;font-size:1rem;color:var(--text-dim);background:repeating-linear-gradient(135deg,rgba(255,255,255,.03) 0 10px,rgba(255,255,255,.06) 10px 20px);box-shadow:0 0 0 1px var(--line-strong) inset}
.rng-secret{display:grid;gap:10px}
.rng-secret h3{margin:0;font-family:var(--font-display);letter-spacing:.06em;text-transform:uppercase;font-size:1.2rem}
.rng-secret p{margin:0;color:var(--text-dim)}
.rng-crooked{color:var(--crimson-hi)}
.rng-plog{display:grid;gap:4px;font-size:.92rem;color:var(--text-dim);max-height:260px;overflow:auto}
.rng-logmenu{border-radius:14px;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset;overflow:hidden}
.rng-logbtn{width:100%;min-height:48px;display:flex;align-items:center;gap:10px;padding:0 14px;border:0;background:none;cursor:pointer;color:var(--gold-hi);font-family:var(--font-display);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.9rem}
.rng-logbtn>span:first-child{flex:1;text-align:left}
.rng-chev{color:var(--text-dim)}
.rng-fresh{font-family:var(--font-ui);letter-spacing:0;text-transform:none;font-size:.8rem;font-weight:800;color:#1a0f05;background:var(--gold);border-radius:999px;padding:2px 8px}
.rng-logbody{padding:0 14px 12px;max-height:240px}
.rng-logbody .stack{gap:4px}
.rng-plog i{font-style:normal;color:var(--text-mute);margin-right:6px}
.rng-inv{display:flex;justify-content:space-between;gap:8px;font-size:.95rem}
.rng-inv b{font-family:var(--font-display)}
.rng-hit{color:var(--crimson-hi);font-weight:700}
.rng-votes{display:grid;gap:8px}
.rng-votes button{display:flex;align-items:center;gap:10px;min-height:56px;padding:0 14px;border:0;border-radius:14px;cursor:pointer;font-size:1.05rem;font-weight:600;
  color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset}
.rng-votes button[aria-pressed=true]{background:rgba(212,175,55,.16);box-shadow:0 0 0 2px var(--gold) inset}
.rng-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}

/* dealer */
.rng-dealer{container-type:inline-size;display:grid;grid-template-rows:auto 1fr;gap:1em;padding:2em 2.4em}
.tv .rng-dealer{height:100vh}
.rng-dealer .rng-body{grid-template-columns:1fr 20em}
/* tutorial and rules */
.rng-slide{height:100vh;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:3.5em;padding:3.5em 4.5em}
.rng-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.rng-slide b,.rng-rules b,.rng-tvrules b{color:var(--gold-hi);font-weight:600}
.rng-dots{display:flex;gap:.6em;margin-top:1.4em}
.rng-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.rng-dots span[data-on=true]{background:var(--gold)}
.rng-demo{display:grid;gap:1.2em;justify-items:center;align-content:center}
.rng-demopawn{width:3.8em;height:3.8em;overflow:visible}
.rng-demopawn text{font-family:var(--font-ui)}
.rng-demoside{display:grid;justify-items:center;gap:.3em}
.rng-demoside .rng-team-h{font-size:1.1em}
.rng-plan{display:grid;grid-template-columns:1fr 1.2fr 1fr;grid-template-rows:auto auto;gap:.8em;font-size:1.3em}
.rng-room,.rng-hall{display:grid;place-items:center;gap:.3em;padding:1.1em .8em;border-radius:.6em;background:rgba(255,255,255,.03);box-shadow:0 0 0 2px var(--team,var(--line-strong)) inset;text-align:center}
.rng-hall{grid-row:1/3;grid-column:2;--team:var(--gold-lo)}
.rng-room b,.rng-hall b{font-family:var(--font-display);letter-spacing:.06em;text-transform:uppercase}
.rng-demomap{height:24em}
.rng-steps{display:grid;gap:.7em;font-size:1.3em}
.rng-step{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.7em;padding:.4em .8em;border-radius:.6em;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.rng-step span{font-family:var(--font-display);font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.rng-step small{color:var(--text-dim)}
.rng-step .rng-demopawn{width:2.2em;height:2.2em}
.rng-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.rng-tvrules .mp-panel{width:min(62em,90vw);padding:2.2em 3em}
.rng-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.rng-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.rng-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.rng-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.rng-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.rng-rules p{margin:0;line-height:1.5}
.rng-hint{margin:.4em 0 0;font-size:1.25em;color:var(--gold-hi)}
/* briefing */
.rng-brief{display:grid;align-content:center;gap:2em;min-height:0;padding-bottom:1em}
.rng-briefcols{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2em;align-items:start}
.rng-briefcol{padding:1em 1.1em;display:grid;gap:.5em}
.rng-briefcol .rng-team-h{font-size:1.2em;margin-bottom:.3em}
.rng-briefcol .rng-mem{font-size:1.25em}
.rng-card{display:grid;gap:8px;border-left:4px solid var(--team);padding-left:12px}
.rng-card h3{margin:0;font-family:var(--font-display);letter-spacing:.06em;text-transform:uppercase;font-size:1.25rem}
.rng-card p{margin:0;color:var(--text-dim)}
.rng-card b{color:var(--text)}
.rng-card--big{gap:.5em;border-left-width:.3em;padding-left:1em;max-width:46em}
.rng-card--big .mp-eyebrow{font-size:1.4em}
.rng-card--big h3{font-size:min(4.2em,9cqw);line-height:1.15;padding-top:.05em}
.rng-card--big p{font-size:1.6em}
.rng-dealer--role{grid-template-rows:none;place-content:center;justify-items:center;gap:2em}
.tv .rng-dealer--role{min-height:100vh}
.rng-count{font-family:var(--font-display);font-weight:900;font-size:2.6em;color:var(--gold-hi);line-height:1}
`;

const Styles = () => <style>{CSS}</style>;

// ---------------------------------------------------------------------------
// The city map

function useBoard(b: { seed: number; size: number } | undefined): Board | null {
  return useMemo(() => (b ? generateBoard(b.seed, b.size) : null), [b?.seed, b?.size]);
}

const NODE_R = 0.36;
const PAD = 0.7;
const STAR_PATH = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.62 : 0.3;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
})();

interface Pawn {
  id: string;
  color: string;
  kind: 'cop' | 'thief' | 'jailed';
  glow?: boolean;
}

interface MapProps {
  board: Board;
  pawns?: Record<number, Pawn[]>;
  stars?: number[];
  /** Nodes that can be tapped (highlighted). */
  choices?: number[];
  /** Chosen nodes (path), drawn in crimson. */
  chosen?: number[];
  /** Pulsing ring (e.g. "you are here"). */
  focus?: number | null;
  onTap?(node: number): void;
  viewBox?: string;
  /** Larger labels for the phone. */
  touch?: boolean;
  /** Player avatars by id, drawn inside each pawn so you can tell who is who. */
  avatars?: Record<string, string>;
}

function CityMap({ board, pawns = {}, stars = [], choices = [], chosen = [], focus = null, onTap, viewBox, touch, avatars = {} }: MapProps) {
  const starSet = new Set(stars);
  const choiceSet = new Set(choices);
  // When nearly every stop is allowed (placing), skip the rings: they would only be noise.
  const rings = choices.length <= 24;
  const vb = viewBox ?? `${-PAD} ${-PAD} ${board.cols - 1 + 2 * PAD} ${board.rows - 1 + 2 * PAD}`;
  return (
    <svg className="rng-map" viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img">
      {board.edges.map((e, i) => {
        const a = board.nodes[e.a]!;
        const b = board.nodes[e.b]!;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={e.dashed ? 'rgba(240,232,214,.55)' : LINE_COLORS[e.line]}
            strokeWidth={e.dashed ? 0.07 : 0.13}
            strokeDasharray={e.dashed ? '0.16 0.12' : undefined}
            strokeLinecap="round"
            opacity={e.dashed ? 1 : 0.92}
          />
        );
      })}
      {board.nodes.map((n, i) => {
        const star = starSet.has(i);
        const isChoice = choiceSet.has(i);
        const isChosen = chosen.includes(i);
        return (
          <g
            key={i}
            transform={`translate(${n.x} ${n.y})`}
            onClick={onTap && isChoice ? () => onTap(i) : undefined}
            style={onTap && isChoice ? { cursor: 'pointer' } : undefined}
            role={onTap && isChoice ? 'button' : undefined}
            aria-label={onTap && isChoice ? String(i + 1) : undefined}
            data-node={i + 1}
          >
            {star && <path d={STAR_PATH} fill="#d4af37" stroke="#f6e7a6" strokeWidth={0.03} />}
            {isChoice && rings && (
              <circle r={NODE_R + 0.14} fill="none" stroke="#f6e7a6" strokeWidth={0.07} className="rng-hl" />
            )}
            {focus === i && <circle r={NODE_R + 0.24} fill="none" stroke="#e44a5b" strokeWidth={0.06} className="rng-hl" />}
            <circle
              r={NODE_R}
              fill={isChosen ? '#b3263a' : star ? '#2a2210' : '#f1ead8'}
              stroke={isChoice ? '#f6e7a6' : '#1a1a1d'}
              strokeWidth={0.05}
            />
            <text
              y={0.12}
              textAnchor="middle"
              fontSize={touch ? 0.36 : i >= 99 ? 0.3 : 0.34}
              fill={isChosen || star ? '#f6e7a6' : '#16161a'}
            >
              {i + 1}
            </text>
            {/* Invisible, bigger hit area for thumbs. */}
            {onTap && isChoice && <circle r={0.55} fill="transparent" />}
          </g>
        );
      })}
      {Object.entries(pawns).map(([node, list]) => {
        const n = board.nodes[Number(node)];
        if (!n) return null;
        const shown = list.slice(0, 8);
        return shown.map((p, k) => {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / Math.max(shown.length, 4);
          const x = n.x + Math.cos(a) * (NODE_R + 0.17);
          const y = n.y + Math.sin(a) * (NODE_R + 0.17);
          const emoji = avatars[p.id];
          return (
            <g key={`${p.id}`} transform={`translate(${x} ${y})`}>
              {p.glow && <circle r={0.33} fill="none" stroke="#f6e7a6" strokeWidth={0.05} className="rng-hl" />}
              {p.kind === 'cop' ? (
                <circle r={0.27} fill={emoji ? '#0b0b0d' : p.color} stroke={p.color} strokeWidth={0.08} />
              ) : (
                <rect
                  x={-0.24}
                  y={-0.24}
                  width={0.48}
                  height={0.48}
                  rx={0.06}
                  transform="rotate(45)"
                  fill={p.kind === 'jailed' ? '#555' : '#0b0b0d'}
                  stroke={p.kind === 'jailed' ? '#999' : '#e44a5b'}
                  strokeWidth={0.06}
                />
              )}
              {emoji && (
                <text y={0.11} textAnchor="middle" fontSize={0.32}>
                  {emoji}
                </text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}

function avatarsOf(platform: DisplayProps['platform']): Record<string, string> {
  return Object.fromEntries(platform.players.map((p) => [p.id, p.avatar]));
}

function teamOf(teams: Record<Team, string[]>, id: string): Team | null {
  return TEAMS.find((t) => teams[t].includes(id)) ?? null;
}

function copPawns(
  pawns: Record<number, Pawn[]>,
  cops: Record<string, number | null>,
  teams: Record<Team, string[]>,
  actor: string | null,
) {
  for (const [id, node] of Object.entries(cops)) {
    if (node === null) continue;
    const team = teamOf(teams, id);
    (pawns[node] ??= []).push({ id, color: team ? TEAM_COLORS[team] : '#999', kind: 'cop', glow: id === actor });
  }
  return pawns;
}

// ---------------------------------------------------------------------------
// Log lines

const PRIVATE_KINDS = new Set(['thiefPath', 'thiefAt', 'star', 'thiefPlacedAt']);
const isPrivate = (e: LogEntry) => PRIVATE_KINDS.has(e.k) || (e.k === 'starsReturned' && e.n !== null);

function logLine(e: LogEntry, t: T, name: (id: string) => string): string {
  switch (e.k) {
    case 'copPlaced':
      return fill(t(L.lCopPlaced), { who: name(e.who), a: e.node + 1 });
    case 'thiefPlaced':
      return fill(t(L.lThiefPlaced), { who: name(e.who) });
    case 'thiefPlacedAt':
      return fill(t(L.lThiefPlacedAt), { who: name(e.who), a: e.node + 1 });
    case 'thiefPlayed':
      return fill(t(L.lThiefPlayed), { who: name(e.who) });
    case 'thiefPath':
      return e.path.length === 1
        ? fill(t(L.lThiefStay), { who: name(e.who), a: e.path[0]! + 1 })
        : `${name(e.who)}: ${e.path.map((n) => n + 1).join(' → ')}`;
    case 'thiefAt':
      return fill(t(e.how === 'start' ? L.lThiefStart : e.how === 'stay' ? L.lThiefStay : L.lThiefTo), {
        who: name(e.who),
        a: e.node + 1,
      });
    case 'star':
      return fill(t(L.lStar), { who: name(e.who), a: e.node + 1, n: e.total });
    case 'copMove':
      return fill(t(L.lCopMove), { who: name(e.who), a: e.from + 1, b: e.to + 1 });
    case 'investigate':
      return fill(t(L.lInvestigate), { who: name(e.who), a: e.node + 1 });
    case 'arrest':
      return e.caught.length
        ? fill(t(L.lArrestHit), { who: name(e.who), a: e.node + 1, b: e.caught.map(name).join(', ') })
        : fill(t(L.lArrestMiss), { who: name(e.who), a: e.node + 1 });
    case 'starsReturned':
      return e.n === null
        ? fill(t(L.lStarsBack), { who: name(e.who) })
        : fill(t(L.lStarsBackN), { who: name(e.who), n: e.n });
    case 'pass':
      return fill(t(L.lPass), { who: name(e.who) });
    case 'timeout':
      return fill(t(L.lTimeout), { who: name(e.who) });
    case 'reveal':
      return fill(t(L.lReveal), { n: e.n });
  }
}

function useNames(platform: DisplayProps['platform']) {
  return (id: string) => {
    const p = platform.players.find((x) => x.id === id);
    return p ? `${p.avatar} ${p.name}` : id;
  };
}

function LogList({ entries, t, name, className }: { entries: LogEntry[]; t: T; name: (id: string) => string; className: string }) {
  return (
    <div className={className}>
      {entries.map((e, i) => (
        <div key={i}>
          {e.r > 0 && <i>R{e.r}</i>}
          {logLine(e, t, name)}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TV

function TeamsPanel({
  view,
  platform,
  kit,
  t,
}: {
  view: Pick<PublicView, 'teams' | 'thieves' | 'cops' | 'turn' | 'arrested'> & {
    thiefPos?: Record<string, number | null>;
    /** During the vote: who has voted (shown instead of the stop). */
    voted?: string[] | null;
    /** Thieves' screen only: stars each thief carries. */
    thiefStars?: Record<string, number>;
    /** Thieves' screen only: the corrupt cops, marked in the list. */
    corrupt?: string[];
  };
  platform: DisplayProps['platform'];
  kit: DisplayProps['kit'];
  t: T;
}) {
  const player = (id: string) => platform.players.find((p) => p.id === id);
  const row = (id: string, i: number, where: string) => {
    const p = player(id);
    const crooked = !!view.corrupt?.includes(id);
    return (
      <div className="rng-mem" key={id} data-on={view.turn.actor === id} data-crooked={crooked}>
        <span className="rng-ord">{i + 1}</span>
        <kit.Avatar
          emoji={p?.avatar ?? '?'}
          size="1.2em"
          offline={p ? !p.connected : false}
          active={view.turn.actor === id}
          crimson={crooked}
        />
        <b>{p?.name ?? id}</b>
        {crooked && <span className="rng-crookedtag">{t(L.crookedTag)}</span>}
        <small>{where}</small>
      </div>
    );
  };
  return (
    <div className="rng-teams">
      <div className="rng-team" data-on={view.turn.side === 'thieves'}>
        <div className="rng-team-h">
          <span className="rng-dot" style={{ background: '#0b0b0d', boxShadow: '0 0 0 2px #e44a5b' }} />
          {t(L.thieves)}
        </div>
        {view.thieves.map((id, i) =>
          row(
            id,
            i,
            view.arrested[id] !== undefined
              ? `⛓ ${view.arrested[id]! + 1}`
              : view.thiefPos?.[id] != null
                ? `${view.thiefPos[id]! + 1}${view.thiefStars ? ` · ★${view.thiefStars[id] ?? 0}` : ''}`
                : '?',
          ),
        )}
      </div>
      {TEAMS.map((team) => (
        <div className="rng-team" key={team} data-on={view.turn.side === team}>
          <div className="rng-team-h">
            <span className="rng-dot" style={{ background: TEAM_COLORS[team] }} />
            {t(TEAM_NAME[team])}
          </div>
          {view.teams[team].map((id, i) =>
            row(id, i, view.voted ? (view.voted.includes(id) ? '✓' : '…') : view.cops[id] != null ? String(view.cops[id]! + 1) : '—'),
          )}
        </div>
      ))}
    </div>
  );
}

function headline(view: { phase: PublicView['phase']; turn: Turn; next: Side | null }, t: T, name: (id: string) => string) {
  const actor = view.turn.actor ? name(view.turn.actor) : '';
  switch (view.phase) {
    case 'placing':
      return {
        title: t(L.placingTitle),
        sub: view.turn.side === 'thieves' ? t(L.placingThief) : fill(t(L.placingCop), { who: actor }),
      };
    case 'intermission':
      return {
        title: `${t(L.nextUp)}: ${sideName(t, view.next)}`,
        sub: view.next === 'thieves' ? t(L.goThieves) : fill(t(L.goTeam), { team: sideName(t, view.next) }),
      };
    case 'thieves':
      return { title: t(L.thievesTurn), sub: fill(t(L.thievesSub), { who: actor }) };
    case 'cops':
      return {
        title: sideName(t, view.turn.side),
        sub: fill(t(L.copsSub), { who: actor, n: view.turn.actionsLeft }),
      };
    case 'vote':
      return { title: t(L.voteTitle), sub: t(L.voteSub) };
    default:
      return { title: '', sub: '' };
  }
}

function roundLabel(t: T, round: number, max: number) {
  if (round === 0) return t(L.setup);
  return max ? `${t(L.round)} ${round} ${t(L.of)} ${max}` : `${t(L.round)} ${round} · ${t(L.noCap)}`;
}

function OverPanel({ result, platform, kit, t, teams }: { result: Result; platform: DisplayProps['platform']; kit: DisplayProps['kit']; t: T; teams: Record<Team, string[]> }) {
  const player = (id: string) => platform.players.find((p) => p.id === id);
  return (
    <div className="rng-verdicts rng-reveal">
      <span className="mp-eyebrow" style={{ fontSize: '1.1em' }}>
        {t(L.thieves)} · ★{result.stars}
      </span>
      {Object.entries(result.thievesPos).map(([id, node]) => (
        <div key={id} className="rng-mem" style={{ fontSize: '1.15em' }}>
          <kit.Avatar emoji={player(id)?.avatar ?? '?'} size="1.8em" />
          <b>{player(id)?.name}</b>
          <small>📍 {node !== null ? node + 1 : '—'}</small>
        </div>
      ))}
      <span className="mp-eyebrow" style={{ fontSize: '1.1em', marginTop: '.6em' }}>
        {t(L.corruptWere)}
      </span>
      <div className="rng-chipline">
        {result.corrupt.map((id) => {
          const team = teamOf(teams, id);
          return (
            <div key={id} className="rng-mem" style={{ fontSize: '1.4em' }}>
              <kit.Avatar emoji={player(id)?.avatar ?? '?'} size="2.2em" crimson />
              <b>{player(id)?.name}</b>
              {team && <span className="rng-dot" style={{ background: TEAM_COLORS[team] }} />}
            </div>
          );
        })}
      </div>
      {result.verdicts && (
        <>
          <span className="mp-eyebrow" style={{ fontSize: '1.1em', marginTop: '.6em' }}>
            {t(L.verdict)}
          </span>
          {result.verdicts.map((v) => (
            <div key={v.team} className="rng-team">
              <div className="rng-team-h">
                <span className="rng-dot" style={{ background: TEAM_COLORS[v.team] }} />
                {t(TEAM_NAME[v.team])} {v.correct ? '✓' : '✗'}
              </div>
              <div className="rng-mem">
                <b>
                  {v.decision === null
                    ? t(L.noDecision)
                    : v.decision === 'none'
                      ? t(L.nobody)
                      : (player(v.decision)?.name ?? v.decision)}
                </b>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** A player's role: on the phone (inside "hold to see") and, large, on the Dealer. */
function RoleCardView({ card, t, name, big }: { card: RoleCard; t: T; name: (id: string) => string; big?: boolean }) {
  const isThief = card.side === 'thieves';
  const color = isThief ? '#e44a5b' : TEAM_COLORS[card.side as Team];
  return (
    <div className={big ? 'rng-card rng-card--big' : 'rng-card'} style={{ ['--team' as string]: color }}>
      <span className="mp-eyebrow">
        {sideName(t, card.side)} · {fill(t(L.orderN), { n: card.order })}
      </span>
      <h3 className={card.corrupt ? 'rng-crooked' : undefined}>
        {t(isThief ? L.thiefRole : card.corrupt ? L.crooked : L.honest)}
      </h3>
      <p>{isThief ? fill(t(L.thiefSub), { n: card.goal }) : t(card.corrupt ? L.crookedSub : L.honestSub)}</p>
      {card.partner && (
        <p>
          {t(L.partner)}: <b>{name(card.partner)}</b>
        </p>
      )}
      {card.corruptIds && (
        <p>
          {t(L.otherCrooked)}: <b className="rng-crooked">{card.corruptIds.map(name).join(', ')}</b>
        </p>
      )}
      {!isThief && card.teammates.length > 0 && (
        <p>
          {t(L.yourTeam)}: <b>{card.teammates.map(name).join(', ')}</b>
        </p>
      )}
    </div>
  );
}

/** Briefing on the TV: the public teams, their turn orders and who is done. */
function BriefingScreen({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const player = (id: string) => platform.players.find((p) => p.id === id);
  const ready = new Set(view.briefing?.ready ?? []);
  const column = (side: Side, ids: string[]) => (
    <div className="rng-team rng-briefcol" key={side}>
      <div className="rng-team-h">
        <span
          className="rng-dot"
          style={
            side === 'thieves'
              ? { background: '#0b0b0d', boxShadow: '0 0 0 2px #e44a5b' }
              : { background: TEAM_COLORS[side] }
          }
        />
        {sideName(t, side)}
      </div>
      {ids.map((id, i) => {
        const p = player(id);
        return (
          <div className="rng-mem" key={id}>
            <span className="rng-ord">{i + 1}</span>
            <kit.Avatar emoji={p?.avatar ?? '?'} size="2em" active={ready.has(id)} offline={p ? !p.connected : false} />
            <b>{p?.name ?? id}</b>
            <small>{ready.has(id) ? '✓' : ''}</small>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="rng-tv">
      <Styles />
      <header className="rng-head mp-enter">
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.1em' }}>
            {t(L.setup)}
          </span>
          <h1 className="rng-h1">{t(L.briefTitle)}</h1>
          <p className="rng-sub">{t(view.briefing?.mode === 'dealer' ? L.briefDealer : L.briefPhone)}</p>
        </div>
        <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size="6.5em" paused={!!platform.paused} />
      </header>
      <div className="rng-brief">
        <div className="rng-briefcols">
          {column('thieves', view.thieves)}
          {TEAMS.map((team) => column(team, view.teams[team]))}
        </div>
        <p className="rng-sub" style={{ textAlign: 'center' }}>
          {t(L.briefNote)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

/** A pawn drawn as on the map: avatar inside a ring in the squad's colour (or the thieves' diamond). */
function DemoPawn({ emoji, color, thief }: { emoji: string; color?: string; thief?: boolean }) {
  return (
    <svg viewBox="-0.4 -0.4 0.8 0.8" className="rng-demopawn" aria-hidden>
      {thief ? (
        <rect x={-0.24} y={-0.24} width={0.48} height={0.48} rx={0.06} transform="rotate(45)" fill="#0b0b0d" stroke="#e44a5b" strokeWidth={0.06} />
      ) : (
        <circle r={0.27} fill="#0b0b0d" stroke={color} strokeWidth={0.08} />
      )}
      <text y={0.11} textAnchor="middle" fontSize={0.32}>
        {emoji}
      </text>
    </svg>
  );
}

const DEMO_AVATARS = ['🎩', '🦊', '🌙', '🍷', '👑', '🦉', '🎲', '💎', '🐺', '🃏', '🎭', '🗝️'];
/** A fixed sample map for the tutorial (never the match's map, so nothing real is shown). */
const DEMO_BOARD = { seed: 9, size: 150 };
const DEMO_PAWNS: Record<number, Pawn[]> = {
  52: [{ id: 'd1', color: TEAM_COLORS.red, kind: 'cop' }],
  11: [
    { id: 'd2', color: TEAM_COLORS.blue, kind: 'cop' },
    { id: 'd3', color: TEAM_COLORS.green, kind: 'cop' },
  ],
};

function SlideDemo({ demo, t }: { demo: (typeof SLIDES)[number]['demo']; t: T }) {
  const demoBoard = useBoard(demo === 'map' ? DEMO_BOARD : undefined);
  if (demo === 'sides') {
    const column = (side: Side, n: number) => (
      <div className="rng-demoside" key={side}>
        <span className="rng-team-h">{sideName(t, side)}</span>
        <div className="row" style={{ gap: '.3em' }}>
          {Array.from({ length: n }, (_, i) => (
            <DemoPawn
              key={i}
              emoji={DEMO_AVATARS[(side.length * 3 + i) % DEMO_AVATARS.length]!}
              thief={side === 'thieves'}
              color={side === 'thieves' ? undefined : TEAM_COLORS[side as Team]}
            />
          ))}
        </div>
      </div>
    );
    return (
      <div className="rng-demo">
        {column('thieves', 2)}
        {TEAMS.map((team) => column(team, 3))}
        <p className="rng-sub" style={{ fontSize: '1.3em' }}>
          ★ × 15 · ⛓ × 2
        </p>
      </div>
    );
  }
  if (demo === 'rooms') {
    const room = (label: string, color: string, screen: string) => (
      <div className="rng-room" style={{ ['--team' as string]: color }}>
        <b>{label}</b>
        <span>{screen}</span>
      </div>
    );
    return (
      <div className="rng-plan">
        {room(t(L.thieves), '#e44a5b', '🃏 Dealer')}
        {room(t(L.redShort), TEAM_COLORS.red, '📺')}
        <div className="rng-hall">
          <b>{t(L.hall)}</b>
          <span>📺</span>
        </div>
        {room(t(L.blueShort), TEAM_COLORS.blue, '📺')}
        {room(t(L.greenShort), TEAM_COLORS.green, '📺')}
      </div>
    );
  }
  if (demo === 'map' && demoBoard) {
    const focus = demoBoard.nodes[22]!;
    const avatars = { d1: '🎩', d2: '🦊', d3: '🌙' };
    return (
      <div className="rng-mapbox rng-demomap">
        <CityMap
          board={demoBoard}
          pawns={DEMO_PAWNS}
          stars={[27]}
          avatars={avatars}
          viewBox={`${focus.x - 3.5} ${focus.y - 2.5} 7 5`}
        />
      </div>
    );
  }
  if (demo === 'round') {
    return (
      <div className="rng-steps">
        <div className="rng-step">
          <DemoPawn emoji="🦊" thief />
          <span>{t(L.thieves)}</span>
          <small>{t(L.demoUpTo2)}</small>
        </div>
        {TEAMS.map((team, i) => (
          <div className="rng-step" key={team}>
            <DemoPawn emoji={DEMO_AVATARS[i]!} color={TEAM_COLORS[team]} />
            <span>{sideName(t, team)}</span>
            <small>{t(L.demo2Actions)}</small>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rng-demo" style={{ fontSize: '1.5em' }}>
      <div className="rng-hold" style={{ fontSize: '1.2em', display: 'grid', placeItems: 'center' }}>
        🔒 {t(L.hold)}
      </div>
      <div className="rng-log" style={{ maskImage: 'none' }}>
        <div>{fill(t(L.lArrestMiss), { who: '👑 Felipe', a: 12 })}</div>
      </div>
      <div className="row" style={{ gap: '.6em' }}>
        {[TEAM_COLORS.red, TEAM_COLORS.blue, TEAM_COLORS.green].map((c, i) => (
          <span key={c} className="rng-tag" style={{ fontSize: '1em' }}>
            <span className="rng-dot" style={{ background: c }} />
            {i === 1 ? t(L.nobody) : `✓ ${DEMO_AVATARS[i + 4]}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function TutorialSlide({ view, t }: { view: PublicView; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="rng-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="rng-h1" style={{ fontSize: '3.6em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="rng-sub" style={{ fontSize: '1.2em' }}>
            {rich(t(CREDITS))}
          </p>
        )}
        <div className="rng-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="rng-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} t={t} />
    </div>
  );
}

/** A rules page over the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: DisplayProps['kit']; t: T }) {
  const r = RULES[page]!;
  return (
    <div className="rng-tvrules">
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

/** Full rules on the phone: anyone reads at their own pace; the Host can mirror the page on the TV. */
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
    <div className="rng-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="rng-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="rng-row2">
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

function Display(props: DisplayProps<PublicView>) {
  const { view, kit, t } = props;
  if (!view) return null;
  return (
    <>
      {view.phase === 'intro' ? (
        <>
          <Styles />
          <TutorialSlide view={view} t={t} />
        </>
      ) : view.phase === 'briefing' ? (
        <BriefingScreen {...props} />
      ) : (
        <Board {...props} />
      )}
      {view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />}
    </>
  );
}

function Board({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const board = useBoard(view?.board);
  const name = useNames(platform);
  if (!view || !board) return null;
  const { Countdown } = kit;
  const pawns = copPawns({}, view.cops, view.teams, view.turn.actor);
  for (const [id, node] of Object.entries(view.arrested)) (pawns[node] ??= []).push({ id, color: '#555', kind: 'jailed' });
  if (view.result) {
    for (const [id, node] of Object.entries(view.result.thievesPos)) {
      if (node !== null && view.arrested[id] === undefined) (pawns[node] ??= []).push({ id, color: '#000', kind: 'thief', glow: true });
    }
  }
  const over = view.phase === 'over' && view.result;
  const head = over
    ? {
        title: t(view.result!.winner === 'thieves' ? L.thievesWin : L.copsWin),
        sub:
          view.result!.reason === 'stars'
            ? fill(t(L.whyStars), { n: view.result!.stars })
            : view.result!.reason === 'arrests'
              ? t(L.whyArrests)
              : t(view.result!.winner === 'cops' ? L.whyVoteCops : L.whyVoteThieves),
      }
    : headline(view, t, name);

  const map = (
    <div className="rng-mapbox">
      <CityMap
        board={board}
        pawns={pawns}
        avatars={avatarsOf(platform)}
        focus={view.turn.actor ? (view.cops[view.turn.actor] ?? null) : null}
      />
    </div>
  );

  return (
    <div className="rng-tv">
      <Styles />
      <header className="rng-head mp-enter" key={`${view.phase}-${view.round}-${view.next}-${view.turn.side}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.1em' }}>
            {roundLabel(t, view.round, view.maxRounds)}
            {view.reveals.length > 0 &&
              ` · ${t(L.reveals)}: ${view.reveals.map((r) => `R${r.round} ★${r.n}`).join('  ')}`}
          </span>
          <h1 className="rng-h1" style={over ? undefined : { fontSize: '3.2em' }}>
            {head.title}
          </h1>
          <p className="rng-sub">{head.sub}</p>
          {view.hint && !over && <p className="rng-hint">💡 {t(HINTS[view.hint])}</p>}
        </div>
        {view.deadline !== null && !over && (
          <Countdown deadline={view.deadline} total={view.total ?? 0} size="6.5em" paused={!!platform.paused} />
        )}
      </header>

      {view.banner ? (
        <div className="rng-body">
          <div className="rng-mapbox rng-banner">
            <div>
              <p className="rng-sub" style={{ fontSize: '2.4em' }}>
                {t(L.starsRevealed)}
              </p>
              <div className="rng-big">{view.banner.n}</div>
              <p className="rng-sub" style={{ fontSize: '2em' }}>
                {t(L.stars)} · {t(L.goal)} {view.goal}
              </p>
            </div>
          </div>
          <TeamsPanel view={view} platform={platform} kit={kit} t={t} />
        </div>
      ) : over ? (
        <div className="rng-over">
          {map}
          <OverPanel result={view.result!} platform={platform} kit={kit} t={t} teams={view.teams} />
        </div>
      ) : (
        <div className="rng-body">
          {map}
          <div className="rng-side">
            <TeamsPanel
              view={{ ...view, voted: view.phase === 'vote' ? view.voted : null }}
              platform={platform}
              kit={kit}
              t={t}
            />
            {view.phase === 'vote' ? (
              <div />            ) : (
              <LogList entries={view.log.slice(-14)} t={t} name={name} className="rng-log" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone

/** Pan / pinch / button zoom over the map; taps still reach the nodes. */
function ZoomMap(props: MapProps & { center: number | null; t: T }) {
  const { board, center, t } = props;
  const full = { w: board.cols - 1 + 2 * PAD, h: board.rows - 1 + 2 * PAD };
  const start = () => {
    const c = center !== null ? board.nodes[center]! : { x: (board.cols - 1) / 2, y: (board.rows - 1) / 2 };
    return { cx: c.x, cy: c.y, z: center !== null ? 1.7 : 1 };
  };
  const [cam, setCam] = useState(start);
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<number | null>(null);

  useEffect(() => setCam(start()), [center, board.seed]);

  const aspect = () => {
    const el = box.current;
    return el ? el.clientWidth / Math.max(1, el.clientHeight) : 1;
  };
  // Viewport size in map units at zoom z: the whole map fits at z = 1.
  const vw = (z: number) => {
    const a = aspect();
    // z = 1 fills the box height (pan sideways); the smallest zoom shows the whole map.
    return (full.h * a) / z;
  };
  const w = vw(cam.z);
  const h = w / aspect();
  const viewBox = `${cam.cx - w / 2} ${cam.cy - h / 2} ${w} ${h}`;

  const minZoom = () => Math.min(1, (full.h * aspect()) / full.w);
  const zoom = (f: number) => setCam((c) => ({ ...c, z: Math.min(6, Math.max(minZoom(), c.z * f)) }));

  const onDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moved.current = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const el = box.current!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      zoom(d / pinch.current);
      pinch.current = d;
      moved.current += 10;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    const scale = w / el.clientWidth;
    setCam((c) => ({ ...c, cx: c.cx - dx * scale, cy: c.cy - dy * scale }));
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return (
    <div
      className="rng-zoom"
      ref={box}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      onWheel={(e) => zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2)}
    >
      <CityMap
        {...props}
        touch
        viewBox={viewBox}
        onTap={props.onTap ? (n) => moved.current < 12 && props.onTap!(n) : undefined}
      />
      <div className="rng-zbtns">
        <button type="button" aria-label={t(L.zoomIn)} onClick={() => zoom(1.5)}>
          +
        </button>
        <button type="button" aria-label={t(L.zoomOut)} onClick={() => zoom(1 / 1.5)}>
          −
        </button>
        <button type="button" aria-label={t(L.recenter)} onClick={() => setCam(start())}>
          ◎
        </button>
      </div>
    </div>
  );
}

/** Shows its children only while pressed, so nobody reads them over a shoulder. */
/** The public log as a small menu that opens and closes; counts what arrived while closed. */
function LogMenu({ entries, t, name }: { entries: LogEntry[]; t: T; name: (id: string) => string }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(entries.length);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setSeen(entries.length);
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [open, entries.length]);
  const fresh = Math.max(0, entries.length - seen);
  return (
    <div className="rng-logmenu" data-open={open}>
      <button type="button" className="rng-logbtn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>📜 {t(L.log)}</span>
        {!open && fresh > 0 && <span className="rng-fresh">+{fresh}</span>}
        <span className="rng-chev">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div ref={list} className="rng-plog rng-logbody">
          {entries.length ? (
            <LogList entries={entries} t={t} name={name} className="stack" />
          ) : (
            <span>{t(L.logEmpty)}</span>
          )}
        </div>
      )}
    </div>
  );
}

function HoldToSee({ label, children }: { label: string; children: any }) {
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  // Never leave a secret on screen: close when the page loses focus or after 15 s held.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(hide, 15_000);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', hide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [open]);
  return (
    <div
      onPointerDown={show}
      onPointerUp={hide}
      onPointerCancel={hide}
      onPointerLeave={hide}
      onContextMenu={(e) => e.preventDefault()}
      data-pg="hold"
    >
      {open ? (
        <div className="mp-panel rng-secret" style={{ padding: 16 }}>
          {children}
        </div>
      ) : (
        <button type="button" className="rng-hold">
          🔒 {label}
        </button>
      )}
    </div>
  );
}

/** The phone: the tutorial controls or the game screen, with the rules one tap away in every phase. */
function Player(props: PlayerProps<PlayerView>) {
  const { view, kit, t, send, you } = props;
  const [rules, setRules] = useState(false);
  if (!view) return null;
  const { Button, Panel } = kit;
  const host = you.isAdmin;
  let body: ReactNode;
  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    body = (
      <div className="rng-ph">
        <Styles />
        <Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
          {!host && <p className="rng-status">{t(L.followTv)}</p>}
        </Panel>
        {host && (
          <>
            <div className="rng-row2">
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
      </div>
    );
  } else {
    body = <PlayerScreen {...props} />;
  }
  return (
    <>
      {body}
      <div style={{ marginTop: 12 }}>
        <Button block small variant="ghost" onClick={() => setRules(true)}>
          📖 {t(L.rules)}
        </Button>
      </div>
      {rules && <RulesReader view={view} kit={kit} t={t} send={send} isHost={host} onClose={() => setRules(false)} />}
    </>
  );
}

function PlayerScreen({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const board = useBoard(view?.board);
  const adj = useMemo(() => (board ? adjacency(board) : []), [board]);
  const name = useNames(platform);
  const [sent, setSent] = useState<string | null>(null);
  // The selection belongs to one turn step: tagging it with the step's key drops it the moment
  // the step changes, without an effect that could race a tap.
  const turnKey = view ? `${view.phase}-${view.round}-${view.turn.actor}-${view.turn.actionsLeft}-${view.myPos}` : '';
  const [sel, setSel] = useState<{ key: string; path: number[]; target: number | null }>({
    key: '',
    path: [],
    target: null,
  });
  const path = sel.key === turnKey ? sel.path : [];
  const target = sel.key === turnKey ? sel.target : null;
  const setPath = (p: number[]) => setSel({ key: turnKey, path: p, target: null });
  const setTarget = (n: number) => setSel({ key: turnKey, path: [], target: n });
  useEffect(() => setSent(null), [view?.vote?.mine, view?.phase]);
  if (!view || !board) return null;
  const { Button, Countdown, Panel } = kit;
  const isThief = view.side === 'thieves';
  const team = isThief ? null : (view.side as Team);
  const actorName = view.turn.actor ? name(view.turn.actor) : '';
  const lastInv = view.inv[view.inv.length - 1];

  // Map content: cops are public; the thief sees the gang only during the gang's turn.
  const gangTurn = isThief && view.thief?.stars !== null;
  const pawns: Record<number, Pawn[]> = {};
  copPawns(pawns, view.cops, view.teams, view.turn.actor);
  for (const [id, node] of Object.entries(view.arrested)) (pawns[node] ??= []).push({ id, color: '#555', kind: 'jailed' });
  if (isThief && gangTurn) {
    if (view.myPos !== null && !view.thief!.arrested) (pawns[view.myPos] ??= []).push({ id: you.you, color: '#000', kind: 'thief', glow: true });
    const pt = view.thief!.partner;
    if (pt && pt.pos !== null && !pt.arrested) (pawns[pt.pos] ??= []).push({ id: pt.id, color: '#000', kind: 'thief' });
  }

  let choices: number[] = [];
  let controls: any = null;
  const status = (s: string) => <p className="rng-status">{s}</p>;

  if (view.myTurn && view.phase === 'placing') {
    const forbidden = new Set(isThief ? (view.thief?.stars ?? []) : []);
    choices = adj.map((_, i) => i).filter((i) => !forbidden.has(i));
    controls = (
      <>
        {isThief && status(t(L.noStarStart))}
        <Button
          block
          disabled={target === null}
          onClick={() => target !== null && send({ type: 'place', node: target })}
        >
          {target === null ? t(L.chooseStop) : fill(t(L.placeAt), { a: target + 1 })}
        </Button>
      </>
    );
  } else if (view.myTurn && view.phase === 'thieves' && view.myPos !== null) {
    const at = path.length ? path[path.length - 1]! : view.myPos;
    choices = path.length < 2 ? adj[at]! : [];
    controls = (
      <>
        {status(t(L.moveHint))}
        <div className="rng-row2">
          <Button variant="ghost" disabled={!path.length} onClick={() => setPath(path.slice(0, -1))}>
            {t(L.undo)}
          </Button>
          <Button variant="ghost" onClick={() => send({ type: 'move', path: [] })}>
            {t(L.stay)}
          </Button>
        </div>
        <Button block disabled={!path.length} onClick={() => send({ type: 'move', path })}>
          {path.length ? fill(t(L.goTo), { a: path.map((n) => n + 1).join(' → ') }) : t(L.chooseStop)}
        </Button>
      </>
    );
  } else if (view.myTurn && view.phase === 'cops' && view.myPos !== null) {
    choices = [view.myPos, ...adj[view.myPos]!];
    const node = target ?? view.myPos;
    controls = (
      <>
        {status(`${fill(t(L.actionsLeft), { n: view.turn.actionsLeft })} — ${t(L.actHint)}`)}
        <div className="rng-row2">
          <Button onClick={() => send({ type: 'act', kind: 'investigate', node })}>
            {fill(t(L.investigate), { a: node + 1 })}
          </Button>
          <Button variant="crimson" onClick={() => send({ type: 'act', kind: 'arrest', node })}>
            {fill(t(L.arrest), { a: node + 1 })}
          </Button>
        </div>
        <Button variant="ghost" block small onClick={() => send({ type: 'pass' })}>
          {t(L.pass)}
        </Button>
      </>
    );
  }

  const onTap = (n: number) => {
    if (view.phase === 'thieves') {
      if (path.length < 2) setPath([...path, n]);
    }
    else setTarget(n);
  };
  const chosen = view.phase === 'thieves' ? path : target !== null ? [target] : [];

  // What to say when it is not my move.
  let waiting = '';
  if (!view.myTurn) {
    if (view.phase === 'intermission') waiting = fill(t(L.waitBreak), { side: sideName(t, view.next) });
    else if (view.phase === 'over') waiting = t(L.watchTv);
    else if (view.turn.side && view.turn.side === view.side)
      waiting = fill(t(isThief ? L.waitThieves : L.waitTeam), { who: actorName });
    else if (view.turn.side) waiting = fill(t(L.waitOther), { side: sideName(t, view.turn.side) });
  }

  const secrets = (
    <HoldToSee label={t(L.hold)}>
      {isThief ? (
        <>
          <h3>{t(L.thiefRole)}</h3>
          <p>{fill(t(L.thiefSub), { n: (platform.gameConfig as { starGoal?: number }).starGoal ?? 15 })}</p>
          <p>
            {t(L.yourStop)}: <b>{view.myPos !== null ? view.myPos + 1 : '—'}</b>
            {view.thief!.partner && (
              <>
                {' · '}
                {t(L.partner)} {name(view.thief!.partner.id)}:{' '}
                <b>
                  {view.thief!.partner.pos !== null ? view.thief!.partner.pos + 1 : '—'}
                  {view.thief!.partner.arrested ? ` (${t(L.arrested)})` : ''}
                </b>
              </>
            )}
          </p>
          <p>
            {t(L.teamStars)}: <b>{view.thief!.held}</b>
          </p>
        </>
      ) : view.corrupt ? (
        <>
          <h3 className="rng-crooked">{t(L.crooked)}</h3>
          <p>{t(L.crookedSub)}</p>
        </>
      ) : (
        <>
          <h3>{t(L.honest)}</h3>
          <p>{t(L.honestSub)}</p>
        </>
      )}
      {view.corruptIds && (
        <p>
          {t(L.otherCrooked)}: <b>{view.corruptIds.map(name).join(', ')}</b>
        </p>
      )}
      {view.inv.length > 0 && (
        <>
          <span className="mp-eyebrow">{t(L.invTitle)}</span>
          {view.inv
            .slice()
            .reverse()
            .map((r, i) => (
              <div className="rng-inv" key={i}>
                <span>
                  R{r.r} · <b>{r.node + 1}</b>
                </span>
                <span className={r.hit ? 'rng-hit' : undefined}>{t(r.hit ? L.invHit : L.invMiss)}</span>
              </div>
            ))}
        </>
      )}
      {view.log.some(isPrivate) && (
        <>
          <span className="mp-eyebrow">{t(L.privateLog)}</span>
          <LogList entries={view.log.filter(isPrivate).slice(-20)} t={t} name={name} className="rng-plog" />
        </>
      )}
    </HoldToSee>
  );

  if (view.phase === 'briefing' && view.briefing) {
    const b = view.briefing;
    const card = view.role;
    const color = card.side === 'thieves' ? '#e44a5b' : TEAM_COLORS[card.side as Team];
    return (
      <div className="rng-ph">
        <Styles />
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={64} paused={!!platform.paused} />
          <span className="rng-tag">
            <span className="rng-dot" style={{ background: color }} />
            {sideName(t, card.side)} · {fill(t(L.orderN), { n: card.order })}
          </span>
          <p className="rng-status">
            {b.mode === 'dealer'
              ? t(b.ready ? L.dealerSeen : L.goDealerBrief)
              : b.ready
                ? t(L.readyDone)
                : t(L.briefPhone)}
          </p>
        </Panel>
        {b.mode === 'phone' && (
          <>
            <HoldToSee label={t(L.hold)}>
              <RoleCardView card={card} t={t} name={name} />
            </HoldToSee>
            <Button block disabled={b.ready} onClick={() => send({ type: 'ready' })}>
              {b.ready ? '✓ ' : ''}
              {t(L.ready)}
            </Button>
          </>
        )}
      </div>
    );
  }

  if (view.phase === 'vote') {
    return (
      <div className="rng-ph">
        <Styles />
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
          <p className="rng-status">{view.vote ? t(sent || view.vote.mine ? L.voted : L.voteHint) : t(L.thiefVote)}</p>
        </Panel>
        {view.vote && (
          <div className="rng-votes">
            {[...view.vote.candidates, 'none'].map((id) => {
              const p = platform.players.find((x) => x.id === id);
              const mine = (sent ?? view.vote!.mine) === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mine}
                  aria-label={id === 'none' ? t(L.nobody) : (p?.name ?? id)}
                  onClick={() => {
                    setSent(id);
                    send({ type: 'vote', target: id });
                  }}
                >
                  {id === 'none' ? (
                    <span style={{ fontSize: '1.6rem' }}>∅</span>
                  ) : (
                    <kit.Avatar emoji={p?.avatar ?? '?'} size={36} />
                  )}
                  {id === 'none' ? t(L.nobody) : p?.name}
                </button>
              );
            })}
          </div>
        )}
        {secrets}
      </div>
    );
  }

  return (
    <div className="rng-ph">
      <Styles />
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="rng-tag">
          <span
            className="rng-dot"
            style={
              team ? { background: TEAM_COLORS[team] } : { background: '#0b0b0d', boxShadow: '0 0 0 2px #e44a5b' }
            }
          />
          {sideName(t, view.side)}
        </span>
        <span className="rng-tag">
          📍 {view.myPos !== null && (!isThief || gangTurn) ? view.myPos + 1 : isThief ? '🔒' : '—'}
        </span>
        {view.deadline !== null && view.phase !== 'over' && (
          <Countdown deadline={view.deadline} total={view.total ?? 0} size={52} paused={!!platform.paused} />
        )}
      </div>
      {view.myTurn ? (
        <p className="rng-status">
          <b>{t(L.yourGo)}</b>
        </p>
      ) : (
        waiting && <p className="rng-status">{waiting}</p>
      )}
      {isThief && view.thief!.arrested && <p className="rng-status">{t(L.arrestedYou)}</p>}
      {!view.myTurn && lastInv && lastInv.r === view.round && view.phase === 'cops' && view.turn.side === view.side && (
        <p className="rng-status">{t(L.newResult)}</p>
      )}
      <ZoomMap
        board={board}
        t={t}
        avatars={avatarsOf(platform)}
        center={view.myPos !== null && (!isThief || gangTurn) ? view.myPos : null}
        pawns={pawns}
        stars={gangTurn ? (view.thief!.stars ?? []) : []}
        choices={choices}
        chosen={chosen}
        focus={view.myPos !== null && (!isThief || gangTurn) ? view.myPos : null}
        onTap={choices.length ? onTap : undefined}
      />
      {choices.length > 0 && choices.length <= 12 && (
        <div className="rng-quick">
          {choices.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={chosen.includes(n)}
              data-star={gangTurn && (view.thief!.stars ?? []).includes(n)}
              onClick={() => onTap(n)}
            >
              {n + 1}
            </button>
          ))}
        </div>
      )}
      {controls}
      {secrets}
      <LogMenu entries={view.log.filter((e) => !isPrivate(e))} t={t} name={name} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dealer: the thieves' hideout screen, on the whole match

function Dealer(props: DealerProps<DealerView | null>) {
  const { view, t, platform } = props;
  const name = useNames(platform);
  if (view?.kind === 'role') {
    return (
      <div className="rng-dealer rng-dealer--role">
        <Styles />
        <RoleCardView card={view.card} t={t} name={name} big />
        <p className="rng-sub" style={{ textAlign: 'center' }}>
          {t(L.roleRemember)}
        </p>
      </div>
    );
  }
  if (view?.kind === 'board') return <Hideout {...props} view={view} />;
  return null;
}

function Hideout({ view, kit, t, platform }: DealerProps<BoardView>) {
  const board = useBoard(view?.board);
  const name = useNames(platform);
  if (!view || !board) return null;
  const pawns = copPawns({}, view.cops, view.teams, view.turn.actor);
  for (const th of view.thieves) {
    if (th.pos === null) continue;
    (pawns[th.pos] ??= []).push({ id: th.id, color: '#000', kind: th.arrested ? 'jailed' : 'thief', glow: view.turn.actor === th.id });
  }
  const side = view.turn.side ?? view.next;
  return (
    <div className="rng-dealer">
      <Styles />
      <header className="rng-head">
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.1em' }}>
            {roundLabel(t, view.round, view.maxRounds)} ·{' '}
            {fill(t(view.turn.side ? L.dealerNow : L.dealerNext), { side: sideName(t, side) })}
          </span>
          <h1 className="rng-h1" style={{ fontSize: '3em' }}>
            {t(L.hideout)}
          </h1>
          <p className="rng-sub" style={{ fontSize: '1.4em' }}>
            {t(L.hideoutSub)}
          </p>
        </div>
        <div className="row" style={{ gap: '1.6em', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="rng-count">
              {view.held}/{view.goal}
            </div>
            <span className="mp-eyebrow">
              ★ {t(L.teamStars)} · {view.stars.length} {t(L.starsLeft)}
            </span>
          </div>
          {view.deadline !== null && (
            <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size="5.5em" paused={!!platform.paused} />
          )}
        </div>
      </header>
      <div className="rng-body">
        <div className="rng-mapbox">
          <CityMap board={board} pawns={pawns} stars={view.stars} avatars={avatarsOf(platform)} />
        </div>
        <div className="rng-side">
          <TeamsPanel
            view={{
              teams: view.teams,
              thieves: view.thieves.map((th) => th.id),
              cops: view.cops,
              turn: view.turn,
              arrested: Object.fromEntries(view.thieves.filter((th) => th.arrested).map((th) => [th.id, th.pos!])),
              thiefPos: Object.fromEntries(view.thieves.map((th) => [th.id, th.pos])),
              thiefStars: Object.fromEntries(view.thieves.map((th) => [th.id, th.held])),
              corrupt: view.corruptIds,
            }}
            platform={platform}
            kit={kit}
            t={t}
          />
          <LogList entries={view.log.slice(-12)} t={t} name={name} className="rng-log" />
        </div>
      </div>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });
