import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps, type UIKit } from '@mp/game-sdk';
import type { NightPanel, PlayerView, PublicView, Report } from './logic.ts';
import {
  MAX_NEUTRALS,
  PICKABLE,
  POTIONS,
  ROLE_IDS,
  TEAM_NAME,
  TEAM_PLURAL,
  TIME_LIMITS,
  role,
  type ActionKind,
  type NightEvent,
  type Potion,
  type RoleId,
  type RolePick,
  type Setup,
  type SetupError,
  type Team,
} from './shared.ts';

// Only `react`, `@mp/game-sdk` and ./shared.ts (public catalogue) are imported here. Platform
// components come in through `kit`, text goes through `t()`, styles are scoped with `ig-`.

type T = (text: I18nText) => string;
const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const L = {
  title: { 'pt-BR': 'Incógnito', en: 'Incognito' },
  day: { 'pt-BR': 'Dia {n}', en: 'Day {n}' },
  nightN: { 'pt-BR': 'Noite {n}', en: 'Night {n}' },
  // phases
  setupTitle: { 'pt-BR': 'Montando a partida', en: 'Setting up' },
  setupSub: { 'pt-BR': 'O Host escolhe as classes. Leiam o guia no celular.', en: 'The Host picks the classes. Read the guide on your phone.' },
  revealTitle: { 'pt-BR': 'Suas classes', en: 'Your classes' },
  revealSub: { 'pt-BR': 'Segure o cartão no celular para ver a sua — em segredo.', en: 'Hold the card on your phone to see yours — in secret.' },
  nightTitle: { 'pt-BR': 'Noite', en: 'Night' },
  nightSub: { 'pt-BR': 'Todos escolhem no celular. Ninguém pode saber quem age.', en: 'Everyone picks on their phone. Nobody can tell who acts.' },
  reportTitle: { 'pt-BR': 'O dia nasce', en: 'Daybreak' },
  reportSub: { 'pt-BR': 'Leiam seus relatórios em silêncio.', en: 'Read your reports in silence.' },
  dawnTitle: { 'pt-BR': 'Manhã Cedo', en: 'Early Morning' },
  dawnSub: { 'pt-BR': 'O que aconteceu durante a noite.', en: 'What happened during the night.' },
  dayTitle: { 'pt-BR': 'Manhã', en: 'Morning' },
  daySub: { 'pt-BR': 'Discutam. Quem está mentindo?', en: 'Debate. Who is lying?' },
  voteTitle: { 'pt-BR': 'Tarde', en: 'Afternoon' },
  voteSub: { 'pt-BR': 'Votem no celular para expulsar alguém — ou pulem.', en: 'Vote on your phone to expel someone — or skip.' },
  verdictTitle: { 'pt-BR': 'Veredito', en: 'Verdict' },
  duskTitle: { 'pt-BR': 'Anoitece', en: 'Nightfall' },
  endTitle: { 'pt-BR': 'Fim de jogo', en: 'Game over' },
  // feed
  noDeaths: { 'pt-BR': 'Ninguém morreu esta noite.', en: 'Nobody died tonight.' },
  diedNight: { 'pt-BR': '{v} não acordou.', en: '{v} did not wake up.' },
  left: { 'pt-BR': '{v} saiu da partida.', en: '{v} left the match.' },
  suspect: { 'pt-BR': 'Suspeito: {v} caiu numa armadilha.', en: 'Suspect: {v} walked into a trap.' },
  poisoned: { 'pt-BR': 'Há um envenenado entre vocês.', en: 'Someone among you is poisoned.' },
  spokesAnon: { 'pt-BR': 'Porta-voz anônimo', en: 'Anonymous Spokesperson' },
  spokesBy: { 'pt-BR': 'Porta-voz: {v}', en: 'Spokesperson: {v}' },
  historian: { 'pt-BR': 'Historiador', en: 'Historian' },
  snipe: { 'pt-BR': 'Um tiro! {v} morreu — era {r}.', en: 'A shot! {v} died — they were {r}.' },
  snipeFail: { 'pt-BR': '{v} errou o tiro e morreu — era o Sniper.', en: '{v} missed and died — they were the Sniper.' },
  exorcise: { 'pt-BR': '{a} é Exorcista e revelou: {v} é Impostor!', en: '{a} is an Exorcist and revealed: {v} is an Impostor!' },
  exorciseFail: { 'pt-BR': 'Um exorcismo falhou: {a} e {b} morreram.', en: 'An exorcism failed: {a} and {b} died.' },
  feed: { 'pt-BR': 'Acontecimentos', en: 'Events' },
  nothingYet: { 'pt-BR': 'Nada por enquanto.', en: 'Nothing yet.' },
  skip: { 'pt-BR': 'Pular', en: 'Skip' },
  condemned: { 'pt-BR': '{v} foi condenado. Apelação…', en: '{v} was condemned. Appeal…' },
  tie: { 'pt-BR': 'Ninguém foi condenado.', en: 'Nobody was condemned.' },
  expelled: { 'pt-BR': '{v} foi expulso.', en: '{v} was expelled.' },
  annulled: { 'pt-BR': 'A expulsão de {v} foi anulada!', en: '{v}\'s expulsion was overturned!' },
  nobodyOut: { 'pt-BR': 'Ninguém saiu hoje.', en: 'Nobody left today.' },
  winInnocent: { 'pt-BR': 'Os Inocentes venceram', en: 'The Innocents win' },
  winImpostor: { 'pt-BR': 'Os Impostores venceram', en: 'The Impostors win' },
  winNeutral: { 'pt-BR': '{v} venceu sozinho', en: '{v} wins alone' },
  draw: { 'pt-BR': 'Ninguém venceu', en: 'Nobody wins' },
  winners: { 'pt-BR': 'Vencedores', en: 'Winners' },
  losers: { 'pt-BR': 'Perdedores', en: 'Losers' },
  counts: { 'pt-BR': '{i} Impostores · {n} Neutros · {o} Inocentes', en: '{i} Impostors · {n} Neutrals · {o} Innocents' },
  killTeam: { 'pt-BR': 'Impostores matam juntos (1 por noite)', en: 'Impostors kill together (1 per night)' },
  killEach: { 'pt-BR': 'Cada Impostor mata', en: 'Each Impostor kills' },
  abilityOr: { 'pt-BR': 'matar OU usar a habilidade', en: 'kill OR use the ability' },
  abilityAnd: { 'pt-BR': 'matar E usar a habilidade', en: 'kill AND use the ability' },
  specBlind: { 'pt-BR': 'Mortos não veem nada', en: 'The dead see nothing' },
  specOmni: { 'pt-BR': 'Mortos veem tudo', en: 'The dead see everything' },
  oratorN: { 'pt-BR': 'Orador vale {n} votos', en: 'Orator counts {n} votes' },
  // phone
  tabGame: { 'pt-BR': 'Jogo', en: 'Game' },
  tabGuide: { 'pt-BR': 'Guia', en: 'Guide' },
  waitHost: { 'pt-BR': 'O Host está configurando a partida. Leia o Guia enquanto isso.', en: 'The Host is setting up. Read the Guide meanwhile.' },
  hold: { 'pt-BR': 'Segure para ver sua classe', en: 'Hold to see your class' },
  yourTeam: { 'pt-BR': 'Seus parceiros', en: 'Your partners' },
  twinWith: { 'pt-BR': 'Seu par de Gêmeo: {v}', en: 'Your Twin pair: {v}' },
  bountyIs: { 'pt-BR': 'Seu alvo tem a classe: {r}', en: 'Your target\'s class: {r}' },
  bountyNone: { 'pt-BR': 'Sem alvo no momento.', en: 'No target right now.' },
  hits: { 'pt-BR': 'Acertos: {n}/3', en: 'Hits: {n}/3' },
  prophecyOn: { 'pt-BR': 'Sua profecia: {v}', en: 'Your prophecy: {v}' },
  usesLeft: { 'pt-BR': 'Usos restantes: {n}', en: 'Uses left: {n}' },
  gotIt: { 'pt-BR': 'Entendi', en: 'Got it' },
  waiting: { 'pt-BR': 'Aguardando os outros…', en: 'Waiting for the others…' },
  look: { 'pt-BR': 'Olhe para a TV.', en: 'Look at the TV.' },
  dead: { 'pt-BR': 'Você morreu. Fique em silêncio e assista.', en: 'You are dead. Stay quiet and watch.' },
  entangled: { 'pt-BR': 'Você está enredado: não pode agir esta noite.', en: 'You are entangled: you cannot act tonight.' },
  decoy: { 'pt-BR': 'Você não tem ação à noite. Toque em alguém mesmo assim — ninguém saberá.', en: 'You have no night action. Tap someone anyway — nobody will know.' },
  noKill: { 'pt-BR': 'Ninguém', en: 'Nobody' },
  killTitleTeam: { 'pt-BR': 'Ataque do time', en: 'Team attack' },
  killTitleEach: { 'pt-BR': 'Seu ataque', en: 'Your attack' },
  extraKill: { 'pt-BR': 'Ataque extra (Gêmeo)', en: 'Extra kill (Twin)' },
  exclusive: { 'pt-BR': 'Esta noite: matar OU usar a habilidade.', en: 'Tonight: kill OR use your ability.' },
  matesPick: { 'pt-BR': 'Escolhas dos parceiros', en: 'Partners\' picks' },
  target: { 'pt-BR': 'Alvo', en: 'Target' },
  targetN: { 'pt-BR': 'Alvo {n}', en: 'Target {n}' },
  guess: { 'pt-BR': 'Qual classe?', en: 'Which class?' },
  pickClass: { 'pt-BR': '— escolha uma classe —', en: '— pick a class —' },
  confirm: { 'pt-BR': 'Confirmar', en: 'Confirm' },
  pass: { 'pt-BR': 'Não usar esta noite', en: 'Skip tonight' },
  passed: { 'pt-BR': 'Você não vai agir esta noite.', en: 'You will not act tonight.' },
  locked: { 'pt-BR': 'Registrado. Pode mudar até o tempo acabar.', en: 'Locked in. You can change it until time runs out.' },
  reportHead: { 'pt-BR': 'Relatório da noite', en: 'Night report' },
  reportEmpty: { 'pt-BR': 'Nada a relatar.', en: 'Nothing to report.' },
  psychYes: { 'pt-BR': 'Psicólogo: alguém tentou te matar esta noite.', en: 'Psychologist: someone tried to kill you tonight.' },
  psychNo: { 'pt-BR': 'Psicólogo: ninguém tentou te matar esta noite.', en: 'Psychologist: nobody tried to kill you tonight.' },
  spokesHead: { 'pt-BR': 'Porta-voz: anunciar um fato?', en: 'Spokesperson: announce a fact?' },
  sign: { 'pt-BR': 'Assinar com meu nome', en: 'Sign with my name' },
  announce: { 'pt-BR': 'Anunciar na TV', en: 'Announce on the TV' },
  silent: { 'pt-BR': 'Ficar calado', en: 'Stay silent' },
  spokesDone: { 'pt-BR': 'Feito por hoje.', en: 'Done for today.' },
  noEvents: { 'pt-BR': 'Nenhum acontecimento esta noite.', en: 'No events tonight.' },
  histHead: { 'pt-BR': 'Historiador: guardar um fato?', en: 'Historian: store a fact?' },
  histReplace: { 'pt-BR': 'Seu arquivo está cheio. Trocar qual?', en: 'Your archive is full. Replace which?' },
  store: { 'pt-BR': 'Guardar', en: 'Store' },
  dontStore: { 'pt-BR': 'Não guardar', en: 'Don\'t store' },
  archive: { 'pt-BR': 'Seu arquivo', en: 'Your archive' },
  reveal: { 'pt-BR': 'Revelar na TV', en: 'Reveal on the TV' },
  autopsyHead: { 'pt-BR': 'Médico Legista: examinar um morto', en: 'Coroner: examine a dead player' },
  autopsyNone: { 'pt-BR': 'Nenhum morto para examinar.', en: 'No dead to examine.' },
  autopsyRes: { 'pt-BR': '{v} era {t}.', en: '{v} was {t}.' },
  skipDay: { 'pt-BR': 'Pular discussão ({n}/{of})', en: 'Skip the debate ({n}/{of})' },
  skipAsked: { 'pt-BR': 'Você pediu para pular ({n}/{of})', en: 'You asked to skip ({n}/{of})' },
  skipsTv: { 'pt-BR': 'Pedidos para pular a discussão: {n}/{of}', en: 'Requests to skip the debate: {n}/{of}' },
  wasRole: { 'pt-BR': ' — era {r}.', en: ' — they were {r}.' },
  revealOn: { 'pt-BR': 'A classe de quem morre é revelada', en: 'The class of the dead is revealed' },
  revealOff: { 'pt-BR': 'Mortes não revelam a classe', en: 'Deaths do not reveal the class' },
  sReveal: { 'pt-BR': 'Revelar classe de mortos/expulsos', en: 'Reveal the class of the dead/expelled' },
  sRevealNo: { 'pt-BR': 'Não', en: 'No' },
  sRevealYes: { 'pt-BR': 'Sim', en: 'Yes' },
  voteHead: { 'pt-BR': 'Expulsar quem?', en: 'Expel whom?' },
  sniperHead: { 'pt-BR': 'Sniper: um tiro nesta votação', en: 'Sniper: one shot this vote' },
  fire: { 'pt-BR': 'Atirar', en: 'Fire' },
  exorcistHead: { 'pt-BR': 'Exorcista: um exorcismo nesta votação', en: 'Exorcist: one exorcism this vote' },
  exorciseBtn: { 'pt-BR': 'Exorcizar', en: 'Exorcise' },
  potionWord: { 'pt-BR': 'Poção', en: 'Potion' },
  shifted: { 'pt-BR': 'Era um disfarce! {v} é o Shapeshifter.', en: 'It was a disguise! {v} is the Shapeshifter.' },
  shifterHead: { 'pt-BR': 'Shapeshifter: imitar alguém nesta votação (1 uso)', en: 'Shapeshifter: imitate someone this vote (1 use)' },
  imitate: { 'pt-BR': 'Imitar', en: 'Imitate' },
  brewHead: { 'pt-BR': 'Preparar qual poção?', en: 'Brew which potion?' },
  potionHead: { 'pt-BR': 'Sua poção: {p}', en: 'Your potion: {p}' },
  keep: { 'pt-BR': 'Guardar a poção', en: 'Keep the potion' },
  linkWith: { 'pt-BR': 'Ligado telepaticamente a: {v}', en: 'Telepathically linked to: {v}' },
  potionHeld: { 'pt-BR': 'Você tem uma poção de {p}.', en: 'You hold a {p} potion.' },
  potionLater: { 'pt-BR': 'Você tem uma poção de {p} (usável a partir da próxima noite).', en: 'You hold a {p} potion (usable from next night).' },
  alchemyBrewed: { 'pt-BR': 'Poção preparada: {p}', en: 'Potion brewed: {p}' },
  alchemyGiven: { 'pt-BR': 'Poção de {p} entregue.', en: '{p} potion handed over.' },
  parasiteHost: { 'pt-BR': 'Hospedeiro: {v} · votos roubados: {n}/5', en: 'Host: {v} · stolen votes: {n}/5' },
  parasiteNone: { 'pt-BR': 'Sem hospedeiro ainda.', en: 'No host yet.' },
  stoleAs: { 'pt-BR': 'Você era Ladrão e roubou esta classe. Para os outros, ainda é "Ladrão".', en: 'You were the Thief and stole this class. To others you still read as "Thief".' },
  lingering: { 'pt-BR': 'Você foi atingido: morre no fim da próxima noite (ainda pode agir).', en: 'You were struck: you die at the end of the next night (you can still act).' },
  doomed: { 'pt-BR': 'Sua pena: você morre no fim desta próxima noite.', en: 'Your penalty: you die at the end of the coming night.' },
  appealHead: { 'pt-BR': 'Advogado: anular a expulsão?', en: 'Lawyer: overturn the expulsion?' },
  appeal: { 'pt-BR': 'Anular', en: 'Overturn' },
  appealed: { 'pt-BR': 'Expulsão anulada.', en: 'Expulsion overturned.' },
  youWon: { 'pt-BR': 'Você venceu!', en: 'You won!' },
  youLost: { 'pt-BR': 'Você perdeu.', en: 'You lost.' },
  again: { 'pt-BR': 'Jogar de novo', en: 'Play again' },
  finish: { 'pt-BR': 'Encerrar', en: 'Finish' },
  omniHead: { 'pt-BR': 'Espectador: todas as classes', en: 'Spectator: every class' },
  omniLog: { 'pt-BR': 'Última noite', en: 'Last night' },
  blocked: { 'pt-BR': '(sem efeito)', en: '(no effect)' },
  // setup
  sImpostors: { 'pt-BR': 'Impostores', en: 'Impostors' },
  sNeutrals: { 'pt-BR': 'Neutros', en: 'Neutrals' },
  sInnocents: { 'pt-BR': 'Inocentes', en: 'Innocents' },
  sSuggested: { 'pt-BR': 'Usar sugestão ({i}/{n})', en: 'Use suggestion ({i}/{n})' },
  sKill: { 'pt-BR': 'Ataque dos Impostores', en: 'Impostor attack' },
  sTeam: { 'pt-BR': '1 do time', en: '1 for the team' },
  sEach: { 'pt-BR': 'Cada um', en: 'Each one' },
  sAbility: { 'pt-BR': 'Impostor com habilidade', en: 'Impostor with an ability' },
  sOr: { 'pt-BR': 'Mata OU usa', en: 'Kill OR use' },
  sAnd: { 'pt-BR': 'Mata E usa', en: 'Kill AND use' },
  sSpectator: { 'pt-BR': 'Mortos', en: 'The dead' },
  sBlind: { 'pt-BR': 'Sem info', en: 'No info' },
  sOmni: { 'pt-BR': 'Veem tudo', en: 'See all' },
  sOrator: { 'pt-BR': 'Votos do Orador', en: 'Orator votes' },
  sTimes: { 'pt-BR': 'Tempos (segundos)', en: 'Timers (seconds)' },
  tDawn: { 'pt-BR': 'Manhã Cedo', en: 'Early morning' },
  tDay: { 'pt-BR': 'Discussão', en: 'Debate' },
  tVote: { 'pt-BR': 'Votação', en: 'Vote' },
  tNight: { 'pt-BR': 'Noite', en: 'Night' },
  sClasses: { 'pt-BR': 'Classes', en: 'Classes' },
  auto: { 'pt-BR': 'Auto', en: 'Auto' },
  force: { 'pt-BR': 'Forçar', en: 'Force' },
  ban: { 'pt-BR': 'Banir', en: 'Ban' },
  start: { 'pt-BR': 'Começar', en: 'Start' },
  search: { 'pt-BR': 'Buscar classe…', en: 'Search class…' },
  rulesHead: { 'pt-BR': 'Regras', en: 'Rules' },
} satisfies Record<string, I18nText>;

const ERRORS: Record<SetupError, I18nText> = {
  tooManyImpostors: { 'pt-BR': 'Os Impostores precisam ser menos que os Inocentes.', en: 'Impostors must be fewer than Innocents.' },
  noInnocents: { 'pt-BR': 'Sobrou nenhum Inocente.', en: 'No Innocents left.' },
  forcedImpostors: { 'pt-BR': 'Classes de Impostor forçadas demais para as vagas.', en: 'Too many forced Impostor classes for the seats.' },
  forcedNeutrals: { 'pt-BR': 'Classes Neutras forçadas demais para as vagas.', en: 'Too many forced Neutral classes for the seats.' },
  forcedInnocents: { 'pt-BR': 'Classes Inocentes forçadas demais para as vagas.', en: 'Too many forced Innocent classes for the seats.' },
  notEnoughNeutrals: { 'pt-BR': 'Classes Neutras banidas demais para essa quantidade.', en: 'Too many Neutral classes banned for that count.' },
  twinNeedsTwo: { 'pt-BR': 'O Gêmeo precisa de 2 ou mais Impostores.', en: 'The Twin needs 2 or more Impostors.' },
};

const POTION: Record<Potion, I18nText> = {
  kill: { 'pt-BR': 'Morte', en: 'Death' },
  protect: { 'pt-BR': 'Proteção', en: 'Protection' },
  investigate: { 'pt-BR': 'Investigação', en: 'Insight' },
};

const KIND: Record<ActionKind, I18nText> = {
  attack: { 'pt-BR': 'atacou', en: 'attacked' },
  protect: { 'pt-BR': 'protegeu', en: 'protected' },
  investigate: { 'pt-BR': 'investigou', en: 'investigated' },
  block: { 'pt-BR': 'bloqueou', en: 'blocked' },
  mark: { 'pt-BR': 'marcou alguém', en: 'marked someone' },
  nothing: { 'pt-BR': 'não fez nada', en: 'did nothing' },
};

const EVENT: Record<NightEvent['kind'], I18nText> = {
  attacked: { 'pt-BR': '{v} sofreu um ataque.', en: '{v} was attacked.' },
  protected: { 'pt-BR': '{v} foi salvo de uma morte.', en: '{v} was saved from death.' },
  guarded: { 'pt-BR': 'Quem atacou {v} caiu nas mãos do Guarda.', en: 'Whoever attacked {v} fell to the Guard.' },
  investigated: { 'pt-BR': '{v} foi investigado.', en: '{v} was investigated.' },
  blocked: { 'pt-BR': '{v} foi impedido de agir.', en: '{v} was stopped from acting.' },
  poisoned: { 'pt-BR': '{v} foi envenenado.', en: '{v} was poisoned.' },
  cured: { 'pt-BR': '{v} foi curado de um veneno.', en: '{v} was cured of a poison.' },
  trapped: { 'pt-BR': 'Uma armadilha disparou em {v}.', en: 'A trap went off on {v}.' },
  manipulated: { 'pt-BR': 'O voto de {v} foi manipulado.', en: '{v}\'s vote was tampered with.' },
  entangled: { 'pt-BR': '{v} foi enredado.', en: '{v} was entangled.' },
};

const RULES: I18nText[] = [
  {
    'pt-BR': 'Ciclo: Noite → Manhã Cedo (mortes e habilidades da manhã) → Manhã (discussão) → Tarde (votação) → Noite.',
    en: 'Cycle: Night → Early Morning (deaths, morning abilities) → Morning (debate) → Afternoon (vote) → Night.',
  },
  {
    'pt-BR': 'Inocentes vencem quando todos os Impostores e Neutros morrerem. Impostores vencem quando forem tantos quanto os Inocentes vivos. Cada Neutro tem a própria vitória — e ela encerra o jogo na hora.',
    en: 'Innocents win when every Impostor and Neutral is dead. Impostors win once they match the living Innocents. Each Neutral has their own win — and it ends the game at once.',
  },
  {
    'pt-BR': 'À noite todos tocam em algo no celular, mesmo sem habilidade, para ninguém perceber quem age. Os resultados chegam no relatório ao fim da noite.',
    en: 'At night everyone taps something, even without an ability, so nobody can tell who acts. Results arrive in the report at the end of the night.',
  },
  {
    'pt-BR': 'Mortes são anunciadas sem revelar a classe. Na votação vence a maioria; empate ou "Pular" no topo: ninguém sai. A TV mostra só a contagem, nunca quem votou em quem.',
    en: 'Deaths are announced without the class. The vote goes to the majority; a tie or "Skip" on top: nobody leaves. The TV shows only totals, never who voted for whom.',
  },
  {
    'pt-BR': 'Jogador bloqueado (Chaveiro, Construtor, Tentáculo) não age naquela noite, mas ainda pode sofrer ações. Classes não se repetem.',
    en: 'A blocked player (Locksmith, Builder, Tentacle) takes no action that night but can still be targeted. Classes never repeat.',
  },
];

const TEAM_CLASS: Record<Team, string> = { innocent: 'ig-inn', impostor: 'ig-imp', neutral: 'ig-neu' };

const CSS = `
.ig-tv{height:100vh;box-sizing:border-box;padding:2.2em 3.2em 5.5em;display:grid;grid-template-rows:auto 1fr;gap:1.4em;overflow:hidden}
.ig-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.ig-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.ig-night .ig-h1{background:linear-gradient(180deg,#e8e4ff,#a9a3d6 55%,#6b6699);-webkit-background-clip:text;background-clip:text}
.ig-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.2em 0 0}
.ig-body{display:grid;grid-template-columns:1.3fr 1fr;gap:2.2em;min-height:0}
.ig-seats{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.4em,1fr));gap:1.1em .8em;align-content:start}
.ig-stage{display:grid;place-items:center;min-height:0}
.ig-seats.wide{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:1.8em 1.6em;max-width:68em}
.ig-seats.wide .ig-seat{width:9em}
.ig-seats.wide .ig-seat b{font-size:1.4em;max-width:7em}
.ig-seat{display:grid;justify-items:center;gap:.35em;text-align:center}
.ig-seat b{font-size:1.2em;font-weight:600;max-width:6.5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ig-seat small{font-size:1em;color:var(--crimson-hi);font-weight:600}
.ig-seat.dead{opacity:.35}
.ig-seat.dead b{text-decoration:line-through}
.ig-feed{display:grid;gap:.7em;align-content:start;overflow:hidden}
.ig-feed h3{margin:0;font-family:var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-size:1.3em}
.ig-item{font-size:1.4em;line-height:1.3;padding:.5em .8em;border-left:3px solid var(--gold-lo);background:rgba(255,255,255,.03);border-radius:6px}
.ig-item.crim{border-left-color:var(--crimson)}
.ig-item em{display:block;font-size:.7em;font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute)}
.ig-center{display:grid;place-items:center;align-content:center;gap:1.4em;text-align:center}
.ig-big{font-family:var(--font-display);font-size:3.2em;font-weight:900;color:var(--gold-hi);margin:0}
.ig-big.crim{color:var(--crimson-hi)}
.ig-chips{display:flex;gap:1em;flex-wrap:wrap;justify-content:center}
.ig-chip{font-size:1.5em;padding:.35em .9em;border-radius:999px;box-shadow:0 0 0 1px var(--line-strong) inset}
.ig-rules{display:grid;gap:.4em;font-size:1.25em;color:var(--text-dim)}
.ig-card{display:grid;gap:.6em;padding:1.6em 1.8em;border-radius:var(--radius-lg);background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--line) inset;max-width:34em}
.ig-card .mp-eyebrow{font-size:1em}
.ig-card h2{margin:0;font-family:var(--font-display);font-size:2.6em;line-height:1.15;padding-top:.05em}
.ig-card p{margin:0;font-size:1.3em;line-height:1.4;color:var(--text-dim)}
.ig-inn h2,.ig-inn .ig-team{color:var(--gold-hi)}
.ig-imp h2,.ig-imp .ig-team{color:var(--crimson-hi)}
.ig-neu h2,.ig-neu .ig-team{color:#7cc7b0}
.ig-tally{display:grid;gap:.6em;width:min(52em,100%)}
.ig-bar{display:grid;grid-template-columns:12em 1fr 3em;align-items:center;gap:1em;font-size:1.5em;animation:ig-rise .6s var(--ease-out) both}
.ig-bar span:first-child{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ig-bar i{display:block;height:.9em;border-radius:999px;background:linear-gradient(90deg,var(--gold-lo),var(--gold-hi))}
.ig-bar.top i{background:linear-gradient(90deg,var(--crimson-lo),var(--crimson-hi))}
.ig-bar b{font-family:var(--font-display)}
.ig-cols{display:flex;gap:3em;justify-content:center;align-items:flex-start;width:100%}
.ig-col{display:grid;gap:.6em;align-content:start;justify-items:start}
.ig-col-list{display:grid;grid-auto-flow:column;gap:.55em 1.8em}
.ig-col h3{margin:0 0 .3em;font-family:var(--font-display);letter-spacing:.12em;text-transform:uppercase;font-size:1.4em;color:var(--gold)}
.ig-row{display:flex;align-items:center;gap:.6em;font-size:1.15em}
.ig-row div{display:grid;line-height:1.15}
.ig-row div span{font-size:.85em}
.ig-rise{animation:ig-rise .7s var(--ease-out) both}
@keyframes ig-rise{from{opacity:0;transform:translateY(.6em)}}

/* phone */
.ig-ph{display:grid;gap:14px}
.ig-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:rgba(255,255,255,.04);padding:4px;border-radius:12px}
.ig-tab{min-height:40px;border:0;border-radius:9px;background:transparent;color:var(--text-dim);font:600 15px var(--font-ui);cursor:pointer}
.ig-tab[aria-selected=true]{background:var(--ink-3);color:var(--gold-hi)}
.ig-sec{display:grid;gap:10px}
.ig-sec h4{margin:0;font:600 13px var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.ig-note{font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:var(--text-dim);text-align:center;margin:0}
.ig-hold{min-height:120px;border:0;border-radius:16px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none;
  background:repeating-linear-gradient(45deg,rgba(212,175,55,.08) 0 10px,rgba(212,175,55,.02) 10px 20px),var(--ink-2);
  box-shadow:0 0 0 1px var(--line-strong) inset;color:var(--gold);font:600 16px var(--font-ui);display:grid;place-items:center;padding:16px;text-align:center}
.ig-role{display:grid;gap:6px;text-align:left;width:100%}
.ig-role b{font-family:var(--font-display);font-size:26px;line-height:1.2}
.ig-role .ig-team{font:600 12px var(--font-ui);letter-spacing:.14em;text-transform:uppercase}
.ig-role p{margin:0;font-size:14px;color:var(--text-dim);line-height:1.4}
.ig-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.ig-pick{min-height:64px;border:0;border-radius:12px;cursor:pointer;display:grid;justify-items:center;gap:4px;padding:8px 4px;
  background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;color:var(--text);font:600 13px var(--font-ui)}
.ig-pick span{max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ig-pick[aria-pressed=true]{background:linear-gradient(180deg,rgba(226,195,90,.35),rgba(168,133,32,.25));box-shadow:0 0 0 2px var(--gold) inset}
.ig-pick.crim[aria-pressed=true]{background:linear-gradient(180deg,rgba(180,40,60,.45),rgba(110,20,35,.35));box-shadow:0 0 0 2px var(--crimson-hi) inset}
.ig-pick:disabled{opacity:.4}
.ig-list{display:grid;gap:8px}
.ig-opt{min-height:48px;text-align:left;border:0;border-radius:12px;padding:10px 14px;cursor:pointer;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;color:var(--text);font:500 14px var(--font-ui);line-height:1.35}
.ig-opt[aria-pressed=true]{box-shadow:0 0 0 2px var(--gold) inset}
.ig-res{padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.04);font-size:15px;line-height:1.4}
.ig-select{min-height:48px;border-radius:12px;background:var(--ink-2);color:var(--text);border:1px solid var(--line-strong);padding:0 12px;font:500 15px var(--font-ui)}
.ig-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ig-step{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px}
.ig-step button{min-height:44px;border:0;border-radius:10px;background:var(--ink-3);color:var(--gold-hi);font:700 20px var(--font-ui);cursor:pointer}
.ig-step button:disabled{opacity:.35}
.ig-step div{text-align:center;font:600 15px var(--font-ui)}
.ig-step div b{font-family:var(--font-display);font-size:22px;color:var(--gold-hi);display:block}
.ig-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;background:rgba(255,255,255,.04);padding:3px;border-radius:10px}
.ig-seg button{min-height:38px;border:0;border-radius:8px;background:transparent;color:var(--text-dim);font:600 13px var(--font-ui);cursor:pointer}
.ig-seg button[aria-pressed=true]{background:var(--ink-3);color:var(--gold-hi)}
.ig-seg button.ban[aria-pressed=true]{color:var(--crimson-hi)}
.ig-cls{display:grid;grid-template-columns:1fr 180px;gap:8px;align-items:center;font-size:14px}
.ig-err{color:var(--crimson-hi);font-size:14px;margin:0}
.ig-guide{display:grid;gap:8px}
.ig-g{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset}
.ig-g b{font-family:var(--font-display);font-size:17px}
.ig-g p{margin:4px 0 0;font-size:14px;color:var(--text-dim);line-height:1.45}
.ig-input{min-height:44px;border-radius:12px;background:var(--ink-2);color:var(--text);border:1px solid var(--line-strong);padding:0 12px;font:500 15px var(--font-ui)}
`;

const Styles = () => <style>{CSS}</style>;

type Who = { id: string; name: string; avatar: string; connected: boolean };
function useWho(platform: DisplayProps['platform']) {
  return (id: string): Who => {
    const p = platform.players.find((x) => x.id === id);
    return { id, name: p?.name ?? '?', avatar: p?.avatar ?? '🎭', connected: p?.connected ?? false };
  };
}

function eventText(t: T, e: NightEvent, name: (id: string) => string) {
  return fmt(t(EVENT[e.kind]), { v: name(e.victim) });
}

// ---------------------------------------------------------------- Display

function RoleCard({ id, t, className = '' }: { id: RoleId; t: T; className?: string }) {
  const def = role(id);
  return (
    <div className={`ig-card ${TEAM_CLASS[def.team]} ${className}`}>
      <span className="mp-eyebrow ig-team">{t(TEAM_NAME[def.team])}</span>
      <h2>{t(def.name)}</h2>
      <p>{t(def.text)}</p>
    </div>
  );
}

function rulesLines(t: T, r: PublicView['rules']) {
  return [
    r.killMode === 'team' ? t(L.killTeam) : `${t(L.killEach)} — ${t(r.abilityMode === 'or' ? L.abilityOr : L.abilityAnd)}`,
    t(r.spectator === 'blind' ? L.specBlind : L.specOmni),
    fmt(t(L.oratorN), { n: r.oratorVotes }),
    t(r.revealDead ? L.revealOn : L.revealOff),
  ];
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const now = kit.useRoomNow();
  const who = useWho(platform);
  const name = (id: string) => who(id).name;
  if (!view) return null;
  const v = view;

  const timed = !['setup', 'end'].includes(v.phase);
  const titles: Record<PublicView['phase'], [I18nText, I18nText | null]> = {
    setup: [L.setupTitle, L.setupSub],
    reveal: [L.revealTitle, L.revealSub],
    night: [L.nightTitle, L.nightSub],
    report: [L.reportTitle, L.reportSub],
    dawn: [L.dawnTitle, L.dawnSub],
    day: [L.dayTitle, L.daySub],
    vote: [L.voteTitle, L.voteSub],
    verdict: [L.verdictTitle, null],
    dusk: [L.duskTitle, null],
    end: [L.endTitle, null],
  };
  const [title, sub] = titles[v.phase];
  const eyebrow =
    v.phase === 'setup'
      ? t(L.title)
      : v.phase === 'night' || v.phase === 'reveal'
        ? `${t(L.title)} · ${fmt(t(L.nightN), { n: Math.max(1, v.night) })}`
        : `${t(L.title)} · ${fmt(t(L.day), { n: v.day })}`;

  const seatIds = v.seats.length ? v.seats : platform.players.filter((p) => !p.spectator).map((p) => p.id);
  const wide = v.phase === 'reveal' || v.phase === 'night' || v.phase === 'report';
  const seats = (
    <div className={`ig-seats ${wide ? 'wide' : ''}`}>
      {seatIds.map((id) => {
        const p = who(id);
        const dead = v.seats.length > 0 && !v.alive.includes(id);
        const rev = v.revealed[id];
        const condemned = v.condemned === id;
        return (
          <div key={id} className={`ig-seat ${dead ? 'dead' : ''}`}>
            <Avatar
              emoji={p.avatar}
              size={wide ? '5.4em' : '4.2em'}
              offline={!p.connected}
              active={v.acted.includes(id)}
              crimson={condemned}
              badge={v.acted.includes(id) ? '✓' : undefined}
            />
            <b>{p.name}</b>
            {rev && <small>{rev.role ? t(role(rev.role).name) : rev.team ? t(TEAM_NAME[rev.team]) : ''}</small>}
          </div>
        );
      })}
    </div>
  );

  const feedItems: { key: string; text: string; tag?: string; crim?: boolean }[] = [];
  // With revealDead on, death lines also name the class.
  const withRole = (line: string, id: string) => {
    const r = v.rules.revealDead ? v.revealed[id]?.role : undefined;
    return r ? line.replace(/\.$/, '') + fmt(t(L.wasRole), { r: t(role(r).name) }) : line;
  };
  if (v.skips && v.skips.count > 0) feedItems.push({ key: 'skips', text: fmt(t(L.skipsTv), { n: v.skips.count, of: v.skips.of }) });
  if (v.dawn) {
    if (v.dawn.deaths.length === 0) feedItems.push({ key: 'nd', text: t(L.noDeaths) });
    for (const id of v.dawn.deaths) feedItems.push({ key: `d${id}`, text: withRole(fmt(t(L.diedNight), { v: name(id) }), id), crim: true });
    if (v.dawn.suspect) feedItems.push({ key: 'sus', text: fmt(t(L.suspect), { v: name(v.dawn.suspect) }), crim: true });
    if (v.dawn.poisoned) feedItems.push({ key: 'poi', text: t(L.poisoned), crim: true });
  }
  for (const d of v.deaths.filter((d) => d.cause === 'left' && d.day === v.day)) {
    feedItems.push({ key: `l${d.id}`, text: withRole(fmt(t(L.left), { v: name(d.id) }), d.id) });
  }
  v.news.forEach((n, i) =>
    feedItems.push({
      key: `n${i}`,
      tag: n.by === 'historian' ? t(L.historian) : n.signer ? fmt(t(L.spokesBy), { v: name(n.signer) }) : t(L.spokesAnon),
      text: eventText(t, n.event, name),
    }),
  );
  v.live.forEach((e, i) => {
    const text =
      e.k === 'snipe'
        ? fmt(t(L.snipe), { v: name(e.target), r: t(role(e.role).name) })
        : e.k === 'snipeFail'
          ? fmt(t(L.snipeFail), { v: name(e.sniper) })
          : e.k === 'exorcise'
            ? fmt(t(L.exorcise), { a: name(e.exorcist), v: name(e.target) })
            : e.k === 'exorciseFail'
              ? fmt(t(L.exorciseFail), { a: name(e.ids[0] ?? ''), b: name(e.ids[1] ?? '') })
              : fmt(t(L.shifted), { v: name(e.shifter) });
    feedItems.push({ key: `e${i}`, text, crim: true });
  });
  const feed = (
    <div className="ig-feed">
      <h3>{t(L.feed)}</h3>
      {feedItems.length === 0 && <div className="ig-item">{t(L.nothingYet)}</div>}
      {feedItems.map((f) => (
        <div key={f.key} className={`ig-item mp-enter ${f.crim ? 'crim' : ''}`}>
          {f.tag && <em>{f.tag}</em>}
          {f.text}
        </div>
      ))}
    </div>
  );

  let body: ReactNode;
  if (v.phase === 'setup' && v.setup) {
    const cards = [...PICKABLE, 'innocent', 'impostor'] as RoleId[];
    const idx = Math.floor(now / 7000) % cards.length;
    body = (
      <div className="ig-body">
        <div className="stack" style={{ alignContent: 'start', gap: '1.4em' }}>
          <div className="ig-chips">
            <span className="ig-chip">{fmt(t(L.counts), { i: v.setup.impostors, n: v.setup.neutrals, o: v.setup.innocents })}</span>
          </div>
          <div className="ig-rules">
            {rulesLines(t, v.rules).map((line) => (
              <span key={line}>• {line}</span>
            ))}
          </div>
          {seats}
        </div>
        <div className="ig-center">
          <RoleCard key={cards[idx]} id={cards[idx]!} t={t} className="mp-enter" />
        </div>
      </div>
    );
  } else if (v.phase === 'verdict' || v.phase === 'dusk') {
    const rows = Object.entries(v.tally ?? {}).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map((r) => r[1]));
    const outcome = v.outcome;
    body = (
      <div className="ig-center">
        <div className="ig-tally">
          {rows.map(([id, n], i) => (
            <div key={id} className={`ig-bar ${id === v.condemned ? 'top' : ''}`} style={{ animationDelay: `${2000 + i * 150}ms` }}>
              <span>{id === 'skip' ? t(L.skip) : name(id)}</span>
              <i style={{ width: `${(n / max) * 100}%` }} />
              <b>{n}</b>
            </div>
          ))}
        </div>
        {v.phase === 'verdict' && (
          <p className={`ig-big ig-rise ${v.condemned ? 'crim' : ''}`} style={{ animationDelay: '2.3s' }}>
            {v.condemned ? fmt(t(L.condemned), { v: name(v.condemned) }) : t(L.tie)}
          </p>
        )}
        {v.phase === 'dusk' && outcome && (
          <p className={`ig-big mp-enter ${outcome.k === 'expelled' ? 'crim' : ''}`}>
            {outcome.k === 'expelled'
              ? withRole(fmt(t(L.expelled), { v: name(outcome.target ?? '') }), outcome.target ?? '')
              : outcome.k === 'annulled'
                ? fmt(t(L.annulled), { v: name(outcome.target ?? '') })
                : t(L.nobodyOut)}
          </p>
        )}
        {v.phase === 'dusk' &&
          v.live.map((e) =>
            e.k === 'shifted' ? (
              <p key={e.shifter} className="ig-big crim ig-rise" style={{ fontSize: '2.2em', animationDelay: '.8s' }}>
                {fmt(t(L.shifted), { v: name(e.shifter) })}
              </p>
            ) : null,
          )}
      </div>
    );
  } else if (v.phase === 'end' && v.result) {
    const r = v.result;
    const headline =
      r.side === 'innocent'
        ? t(L.winInnocent)
        : r.side === 'impostor'
          ? t(L.winImpostor)
          : r.side === 'neutral' && r.neutral
            ? `${fmt(t(L.winNeutral), { v: name(r.neutral.id) })} — ${t(role(r.neutral.role).name)}`
            : t(L.draw);
    const losers = v.seats.filter((id) => !r.winners.includes(id));
    const col = (list: string[], head: I18nText, delay: number) => (
      <div className="ig-col">
        <h3>{t(head)}</h3>
        <div className="ig-col-list" style={{ gridTemplateRows: `repeat(${Math.min(Math.max(list.length, 1), 7)}, auto)` }}>
        {list.map((id, i) => {
          const rid = r.roles[id] ?? 'innocent';
          return (
            <div key={id} className="ig-row ig-rise" style={{ animationDelay: `${delay + i * 120}ms` }}>
              <Avatar emoji={who(id).avatar} size="2.4em" active={r.winners.includes(id)} offline={!v.alive.includes(id)} />
              <div className={TEAM_CLASS[role(rid).team]}>
                <b>{name(id)}</b>
                <span className="ig-team">
                  {r.thieves.includes(id) ? `${t(role('thief').name)} → ` : ''}
                  {t(role(rid).name)}
                </span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    );
    body = (
      <div className="ig-center" style={{ alignContent: 'start' }}>
        <p className="ig-big ig-rise" style={{ animationDelay: '2.3s' }}>
          {headline}
        </p>
        <div className="ig-cols">
          {col(r.winners, L.winners, 2600)}
          {col(losers, L.losers, 2900)}
        </div>
      </div>
    );
  } else {
    // In play the TV shows only the table: seats centred at night, seats + events by day.
    body = wide ? (
      <div className="ig-stage">{seats}</div>
    ) : (
      <div className="ig-body">
        {seats}
        {feed}
      </div>
    );
  }

  return (
    <div className={`ig-tv ${v.phase === 'night' || v.phase === 'reveal' ? 'ig-night' : ''}`}>
      <Styles />
      <header className="ig-head mp-enter" key={`${v.phase}-${v.day}-${v.night}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {eyebrow}
          </span>
          <h1 className="ig-h1">{t(title)}</h1>
          {sub && <p className="ig-sub">{t(sub)}</p>}
        </div>
        {timed && <Countdown deadline={v.deadline} total={v.total ?? 0} size="7em" paused={!!platform.paused} />}
      </header>
      {body}
    </div>
  );
}

// ---------------------------------------------------------------- Phone

interface Ctx {
  view: PlayerView;
  kit: UIKit;
  t: T;
  send(a: unknown): void;
  who(id: string): Who;
}

function Picks({
  c,
  ids,
  selected,
  onPick,
  crimson,
  extra,
}: {
  c: Ctx;
  ids: string[];
  selected: (string | null)[];
  onPick(id: string): void;
  crimson?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="ig-grid">
      {ids.map((id) => {
        const p = c.who(id);
        return (
          <button
            key={id}
            type="button"
            className={`ig-pick ${crimson ? 'crim' : ''}`}
            aria-label={p.name}
            aria-pressed={selected.includes(id)}
            onClick={() => onPick(id)}
          >
            <c.kit.Avatar emoji={p.avatar} size={30} />
            <span>{p.name}</span>
          </button>
        );
      })}
      {extra}
    </div>
  );
}

function ClassSelect({ c, value, onChange }: { c: Ctx; value: RoleId | null; onChange(r: RoleId): void }) {
  const sorted = [...ROLE_IDS].sort((a, b) => c.t(role(a).name).localeCompare(c.t(role(b).name)));
  return (
    <select className="ig-select" value={value ?? ''} aria-label={c.t(L.guess)} onChange={(e) => onChange(e.target.value as RoleId)}>
      <option value="" disabled>
        {c.t(L.pickClass)}
      </option>
      {sorted.map((id) => (
        <option key={id} value={id}>
          {c.t(role(id).name)}
        </option>
      ))}
    </select>
  );
}

function Hold({ c }: { c: Ctx }) {
  const [open, setOpen] = useState(false);
  const { view, t } = c;
  if (!view.role) return null;
  const def = role(view.role);
  const close = () => setOpen(false);
  return (
    <button
      type="button"
      className="ig-hold"
      aria-label={t(L.hold)}
      onPointerDown={() => setOpen(true)}
      onPointerUp={close}
      onPointerLeave={close}
      onPointerCancel={close}
      onContextMenu={(e) => e.preventDefault()}
    >
      {open ? (
        <div className={`ig-role ${TEAM_CLASS[def.team]}`}>
          <span className="ig-team">{t(TEAM_NAME[def.team])}</span>
          <b>{t(def.name)}</b>
          <p>{t(def.text)}</p>
          {view.usesLeft !== null && <p>{fmt(t(L.usesLeft), { n: view.usesLeft })}</p>}
          {view.mates.length > 0 && (
            <p>
              {t(L.yourTeam)}: {view.mates.map((m) => `${c.who(m.id).name} (${t(role(m.role).name)})${m.alive ? '' : ' ✕'}`).join(', ')}
            </p>
          )}
          {view.twin && <p>{fmt(t(L.twinWith), { v: c.who(view.twin).name })}</p>}
          {view.role === 'bountyHunter' && (
            <p>{view.bounty ? fmt(t(L.bountyIs), { r: t(role(view.bounty).name) }) : t(L.bountyNone)}</p>
          )}
          {view.journalistHits !== null && <p>{fmt(t(L.hits), { n: view.journalistHits })}</p>}
          {view.prophecy && <p>{fmt(t(L.prophecyOn), { v: c.who(view.prophecy).name })}</p>}
          {view.stole && <p>{t(L.stoleAs)}</p>}
          {view.link && <p>{fmt(t(L.linkWith), { v: c.who(view.link).name })}</p>}
          {view.potion && <p>{fmt(t(view.potion.usable ? L.potionHeld : L.potionLater), { p: t(POTION[view.potion.kind]) })}</p>}
          {view.alchemy && (
            <p>{fmt(t(view.alchemy.given ? L.alchemyGiven : L.alchemyBrewed), { p: t(POTION[view.alchemy.potion]) })}</p>
          )}
          {view.parasite && (
            <p>
              {view.parasite.host
                ? fmt(t(L.parasiteHost), { v: c.who(view.parasite.host).name, n: view.parasite.leeched })
                : t(L.parasiteNone)}
            </p>
          )}
          {view.lingering && <p>{t(L.lingering)}</p>}
          {view.doomed && <p>{t(L.doomed)}</p>}
        </div>
      ) : (
        t(L.hold)
      )}
    </button>
  );
}

function Guide({ t }: { t: T }) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const teams: Team[] = ['innocent', 'impostor', 'neutral'];
  return (
    <div className="ig-guide">
      <div className="ig-sec">
        <h4>{t(L.rulesHead)}</h4>
        {RULES.map((r, i) => (
          <div key={i} className="ig-g">
            <p style={{ margin: 0 }}>{t(r)}</p>
          </div>
        ))}
      </div>
      <input className="ig-input" placeholder={t(L.search)} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t(L.search)} />
      {teams.map((team) => {
        const list = ROLE_IDS.filter((id) => role(id).team === team && norm(t(role(id).name) + ' ' + t(role(id).text)).includes(norm(q)));
        if (!list.length) return null;
        return (
          <div key={team} className={`ig-sec ${TEAM_CLASS[team]}`}>
            <h4 className="ig-team">{t(TEAM_PLURAL[team])}</h4>
            {list.map((id) => (
              <div key={id} className="ig-g">
                <b>{t(role(id).name)}</b>
                <p>{t(role(id).text)}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange(n: number): void }) {
  return (
    <div className="ig-step">
      <button type="button" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <div>
        <b>{value}</b>
        {label}
      </div>
      <button type="button" aria-label={`${label} +`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  );
}

function Seg<V extends string | number>({ value, options, onChange }: { value: V; options: [V, string, string?][]; onChange(v: V): void }) {
  return (
    <div className="ig-seg">
      {options.map(([v, label, cls]) => (
        <button key={String(v)} type="button" className={cls} aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function SetupPanel({ c }: { c: Ctx }) {
  const { t, send, kit } = c;
  const data = c.view.setup!;
  const s = data.setup;
  const patch = (p: Partial<Setup>) => send({ type: 'setup', patch: p });
  const innocents = data.players - s.impostors - s.neutrals;
  const teams: Team[] = ['impostor', 'neutral', 'innocent'];
  const timeLabels: Record<keyof Setup['times'], I18nText> = { dawn: L.tDawn, day: L.tDay, vote: L.tVote, night: L.tNight };
  return (
    <div className="ig-ph">
      <div className="ig-sec">
        <Stepper label={t(L.sImpostors)} value={s.impostors} min={1} max={Math.max(1, data.players - 2)} onChange={(n) => patch({ impostors: n })} />
        <Stepper label={t(L.sNeutrals)} value={s.neutrals} min={0} max={MAX_NEUTRALS} onChange={(n) => patch({ neutrals: n })} />
        <p className="ig-note">
          {t(L.sInnocents)}: {innocents}
        </p>
        <kit.Button variant="ghost" small onClick={() => patch(data.suggested)}>
          {fmt(t(L.sSuggested), { i: data.suggested.impostors, n: data.suggested.neutrals })}
        </kit.Button>
      </div>
      <div className="ig-sec">
        <h4>{t(L.sKill)}</h4>
        <Seg value={s.killMode} options={[['team', t(L.sTeam)], ['each', t(L.sEach)]]} onChange={(v) => patch({ killMode: v })} />
        {s.killMode === 'each' && (
          <>
            <h4>{t(L.sAbility)}</h4>
            <Seg value={s.abilityMode} options={[['or', t(L.sOr)], ['and', t(L.sAnd)]]} onChange={(v) => patch({ abilityMode: v })} />
          </>
        )}
        <h4>{t(L.sSpectator)}</h4>
        <Seg value={s.spectator} options={[['blind', t(L.sBlind)], ['omniscient', t(L.sOmni)]]} onChange={(v) => patch({ spectator: v })} />
        <h4>{t(L.sOrator)}</h4>
        <Seg value={s.oratorVotes} options={[[2, '2'], [3, '3']]} onChange={(v) => patch({ oratorVotes: v })} />
        <h4>{t(L.sReveal)}</h4>
        <Seg
          value={s.revealDead ? 'yes' : 'no'}
          options={[
            ['no', t(L.sRevealNo)],
            ['yes', t(L.sRevealYes)],
          ]}
          onChange={(v) => patch({ revealDead: v === 'yes' })}
        />
      </div>
      <div className="ig-sec">
        <h4>{t(L.sTimes)}</h4>
        {(Object.keys(TIME_LIMITS) as (keyof Setup['times'])[]).map((k) => (
          <Stepper
            key={k}
            label={t(timeLabels[k])}
            value={s.times[k]}
            min={TIME_LIMITS[k].min}
            max={TIME_LIMITS[k].max}
            step={TIME_LIMITS[k].step}
            onChange={(n) => patch({ times: { ...s.times, [k]: n } })}
          />
        ))}
      </div>
      <div className="ig-sec">
        <h4>{t(L.sClasses)}</h4>
        {teams.map((team) => (
          <div key={team} className={`ig-sec ${TEAM_CLASS[team]}`}>
            <span className="ig-team" style={{ font: '600 12px var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              {t(TEAM_PLURAL[team])}
            </span>
            {PICKABLE.filter((id) => role(id).team === team).map((id) => (
              <div key={id} className="ig-cls">
                <span>{t(role(id).name)}</span>
                <Seg<RolePick>
                  value={s.picks[id] ?? 'auto'}
                  options={[
                    ['auto', t(L.auto)],
                    ['force', t(L.force)],
                    ['ban', t(L.ban), 'ban'],
                  ]}
                  onChange={(v) => patch({ picks: { [id]: v } })}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {data.errors.map((e) => (
        <p key={e} className="ig-err">
          {t(ERRORS[e])}
        </p>
      ))}
      <kit.Button block disabled={data.errors.length > 0} onClick={() => send({ type: 'start' })}>
        {t(L.start)}
      </kit.Button>
    </div>
  );
}

function reportText(c: Ctx, r: Report): string {
  const { t } = c;
  const n = (id: string) => c.who(id).name;
  const pt = t({ 'pt-BR': 'pt', en: 'en' }) === 'pt';
  switch (r.k) {
    case 'investigator':
      return pt
        ? `${n(r.a)} e ${n(r.b)}: ${r.same ? 'SIM, mesma filiação' : 'NÃO, filiações diferentes'}.`
        : `${n(r.a)} and ${n(r.b)}: ${r.same ? 'YES, same side' : 'NO, different sides'}.`;
    case 'tracker':
      return `${n(r.target)} ${t(KIND[r.kind])}.`;
    case 'cartographer':
      return pt ? `${r.count} pessoa(s) agiram sobre ${n(r.target)}.` : `${r.count} player(s) acted on ${n(r.target)}.`;
    case 'curator':
      return pt ? `${n(r.target)} é ${t(TEAM_NAME[r.team])}.` : `${n(r.target)} is ${t(TEAM_NAME[r.team])}.`;
    case 'curatorCured':
      return pt
        ? `${n(r.target)} estava envenenado — você curou. Há um Envenenador.`
        : `${n(r.target)} was poisoned — you cured them. There is a Poisoner.`;
    case 'journalist':
      return pt
        ? `${n(r.target)} ${r.correct ? 'É' : 'não é'} ${t(role(r.guess).name)}. Acertos: ${r.hits}/3.`
        : `${n(r.target)} ${r.correct ? 'IS' : 'is not'} ${t(role(r.guess).name)}. Hits: ${r.hits}/3.`;
    case 'trap':
      return r.triggered
        ? pt
          ? `Sua armadilha em ${n(r.target)} disparou.`
          : `Your trap on ${n(r.target)} went off.`
        : pt
          ? `Ninguém caiu na armadilha em ${n(r.target)}.`
          : `Nobody walked into the trap on ${n(r.target)}.`;
    case 'cured':
      return pt ? 'Você estava envenenado e foi curado.' : 'You were poisoned and got cured.';
    case 'barricaded':
      return pt ? 'Você foi barricado: sua ação desta noite não aconteceu.' : 'You were barricaded: your action tonight did not happen.';
    case 'entangled':
      return pt ? 'Você foi enredado: não poderá agir na próxima noite.' : 'You were entangled: you cannot act next night.';
    case 'linked':
      return pt ? `Você está ligado telepaticamente a ${n(r.other)}.` : `You are telepathically linked to ${n(r.other)}.`;
    case 'potion':
      return pt
        ? `Você recebeu uma poção de ${t(POTION[r.kind])}. Pode usá-la a partir da próxima noite.`
        : `You received a ${t(POTION[r.kind])} potion. You can use it from next night.`;
    case 'potionInsight':
      return pt ? `A poção revelou: ${n(r.target)} é ${t(TEAM_NAME[r.team])}.` : `The potion revealed: ${n(r.target)} is ${t(TEAM_NAME[r.team])}.`;
    case 'stole':
      return pt ? `Você roubou a classe: agora é ${t(role(r.role).name)}.` : `You stole the class: you are now ${t(role(r.role).name)}.`;
  }
}

function NightForm({ c, night }: { c: Ctx; night: NightPanel }) {
  const { t, send, kit } = c;
  const ab = night.ability;
  const [picks, setPicks] = useState<string[]>(night.mine?.targets ?? []);
  const [guess, setGuess] = useState<RoleId | null>(night.mine?.guess ?? null);
  const [kill, setKill] = useState<string | null | undefined>(night.kill?.mine);
  const [kill2, setKill2] = useState<string | null | undefined>(night.kill2?.mine);
  useEffect(() => setKill(night.kill?.mine), [night.kill?.mine]);
  useEffect(() => setKill2(night.kill2?.mine), [night.kill2?.mine]);
  useEffect(() => {
    setPicks(night.mine?.targets ?? []);
    setGuess(night.mine?.guess ?? null);
  }, [JSON.stringify(night.mine)]);

  if (night.entangled) {
    return (
      <div className="ig-sec">
        <p className="ig-note">{t(L.entangled)}</p>
        {night.acked ? <p className="ig-note">{t(L.waiting)}</p> : <kit.Button block onClick={() => send({ type: 'ack' })}>{t(L.gotIt)}</kit.Button>}
      </div>
    );
  }

  const killBlock = night.kill && (
    <div className="ig-sec">
      <h4>{t(night.kill.mode === 'team' ? L.killTitleTeam : L.killTitleEach)}</h4>
      {night.kill.exclusive && <p className="ig-note">{t(L.exclusive)}</p>}
      {Object.keys(night.kill.mates).length > 0 && (
        <div className="ig-res">
          {t(L.matesPick)}:{' '}
          {Object.entries(night.kill.mates)
            .map(([m, target]) => `${c.who(m).name} → ${target ? c.who(target).name : t(L.noKill)}`)
            .join(' · ')}
        </div>
      )}
      <Picks
        c={c}
        crimson
        ids={night.kill.candidates}
        selected={kill === undefined ? [] : [kill]}
        onPick={(id) => {
          setKill(id);
          send({ type: 'kill', target: id });
        }}
        extra={
          <button
            type="button"
            className="ig-pick crim"
            aria-pressed={kill === null}
            onClick={() => {
              setKill(null);
              send({ type: 'kill', target: null });
            }}
          >
            <span style={{ fontSize: 24 }}>∅</span>
            <span>{t(L.noKill)}</span>
          </button>
        }
      />
    </div>
  );

  const kill2Block = night.kill2 && (
    <div className="ig-sec">
      <h4>{t(L.extraKill)}</h4>
      <Picks
        c={c}
        crimson
        ids={night.kill2.candidates}
        selected={kill2 === undefined ? [] : [kill2]}
        onPick={(id) => {
          setKill2(id);
          send({ type: 'kill2', target: id });
        }}
        extra={
          <button
            type="button"
            className="ig-pick crim"
            aria-pressed={kill2 === null}
            onClick={() => {
              setKill2(null);
              send({ type: 'kill2', target: null });
            }}
          >
            <span style={{ fontSize: 24 }}>∅</span>
            <span>{t(L.noKill)}</span>
          </button>
        }
      />
    </div>
  );

  const potionBlock = night.potion && (
    <div className="ig-sec">
      <h4>{fmt(t(L.potionHead), { p: t(POTION[night.potion.kind]) })}</h4>
      <Picks
        c={c}
        crimson={night.potion.kind === 'kill'}
        ids={night.potion.candidates}
        selected={night.potion.mine ? [night.potion.mine] : []}
        onPick={(id) => send({ type: 'potion', target: id })}
      />
      <kit.Button variant="ghost" small onClick={() => send({ type: 'potion', target: null })}>
        {t(L.keep)}
      </kit.Button>
    </div>
  );

  let abilityBlock: ReactNode = null;
  if (ab && night.brew) {
    abilityBlock = (
      <div className="ig-sec">
        <h4>{t(role(ab.role).name)}</h4>
        <p className="ig-note" style={{ fontSize: '1rem' }}>
          {t(L.brewHead)}
        </p>
        <div className="ig-list">
          {POTIONS.map((p) => (
            <button
              key={p}
              type="button"
              className="ig-opt"
              aria-pressed={night.mine?.potion === p}
              onClick={() => send({ type: 'ability', targets: [], potion: p })}
            >
              {t(POTION[p])}
            </button>
          ))}
        </div>
        <kit.Button variant="ghost" small onClick={() => send({ type: 'ability', targets: [] })}>
          {t(L.pass)}
        </kit.Button>
      </div>
    );
  } else if (ab) {
    const spec = ab.spec;
    const simple = spec.targets === 1 && !spec.guess;
    const slot = Math.min(picks.length, spec.targets - 1);
    const ready = picks.length === spec.targets && (!spec.guess || !!guess);
    abilityBlock = (
      <div className="ig-sec">
        <h4>
          {t(role(ab.role).name)}
          {ab.usesLeft !== null ? ` · ${fmt(t(L.usesLeft), { n: ab.usesLeft })}` : ''}
        </h4>
        <p className="ig-note" style={{ fontSize: '1rem' }}>
          {t(role(ab.role).short)}
        </p>
        {simple ? (
          <Picks
            c={c}
            ids={ab.slots[0] ?? []}
            selected={picks}
            onPick={(id) => {
              setPicks([id]);
              send({ type: 'ability', targets: [id] });
            }}
          />
        ) : (
          <>
            {Array.from({ length: spec.targets }, (_, i) => (
              <div key={i} className="ig-sec">
                <span className="mp-eyebrow">{spec.labels?.[i] ? t(spec.labels[i]!) : spec.targets > 1 ? fmt(t(L.targetN), { n: i + 1 }) : t(L.target)}</span>
                {(i === slot || picks[i]) && (
                  <Picks
                    c={c}
                    ids={(ab.slots[i] ?? []).filter((id) => !picks.slice(0, i).includes(id))}
                    selected={picks[i] ? [picks[i]!] : []}
                    onPick={(id) => setPicks([...picks.slice(0, i), id])}
                  />
                )}
              </div>
            ))}
            {spec.guess && <ClassSelect c={c} value={guess} onChange={setGuess} />}
            <kit.Button block disabled={!ready} onClick={() => send({ type: 'ability', targets: picks, ...(spec.guess ? { guess } : {}) })}>
              {t(L.confirm)}
            </kit.Button>
          </>
        )}
        <kit.Button
          variant="ghost"
          small
          onClick={() => {
            setPicks([]);
            send({ type: 'ability', targets: [] });
          }}
        >
          {t(L.pass)}
        </kit.Button>
        {night.mine && night.mine.targets.length === 0 && <p className="ig-note">{t(L.passed)}</p>}
      </div>
    );
  } else if (night.decoy) {
    abilityBlock = (
      <div className="ig-sec">
        <p className="ig-note">{t(L.decoy)}</p>
        <Picks
          c={c}
          ids={night.decoy}
          selected={picks}
          onPick={(id) => {
            setPicks([id]);
            send({ type: 'ability', targets: [id] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="ig-ph">
      {killBlock}
      {kill2Block}
      {abilityBlock}
      {potionBlock}
      {night.done && <p className="ig-note">{t(L.locked)}</p>}
    </div>
  );
}

function ReportBlock({ c }: { c: Ctx }) {
  const { t, view } = c;
  return (
    <div className="ig-sec">
      <h4>{t(L.reportHead)}</h4>
      {view.report.length === 0 ? (
        <div className="ig-res">{t(L.reportEmpty)}</div>
      ) : (
        view.report.map((r, i) => (
          <div key={i} className="ig-res">
            {reportText(c, r)}
          </div>
        ))
      )}
      {view.psych !== null && <div className="ig-res">{t(view.psych ? L.psychYes : L.psychNo)}</div>}
    </div>
  );
}

function Spokes({ c }: { c: Ctx }) {
  const { t, send, kit, view } = c;
  const [pick, setPick] = useState<number | null>(null);
  const [signed, setSigned] = useState(false);
  const sp = view.spokes!;
  const name = (id: string) => c.who(id).name;
  if (sp.done) return <p className="ig-note">{t(L.spokesDone)}</p>;
  return (
    <div className="ig-sec">
      <h4>{t(L.spokesHead)}</h4>
      {sp.offer.length === 0 && <div className="ig-res">{t(L.noEvents)}</div>}
      <div className="ig-list">
        {sp.offer.map((e, i) => (
          <button key={i} type="button" className="ig-opt" aria-pressed={pick === i} onClick={() => setPick(i)}>
            {eventText(t, e, name)}
          </button>
        ))}
      </div>
      {sp.offer.length > 0 && (
        <label className="ig-inline">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
          {t(L.sign)}
        </label>
      )}
      <kit.Button block disabled={pick === null} onClick={() => send({ type: 'spokes', index: pick, signed })}>
        {t(L.announce)}
      </kit.Button>
      <kit.Button variant="ghost" small onClick={() => send({ type: 'spokes', index: null })}>
        {t(L.silent)}
      </kit.Button>
    </div>
  );
}

function Historian({ c }: { c: Ctx }) {
  const { t, send, kit, view } = c;
  const h = view.hist!;
  const [pick, setPick] = useState<number | null>(null);
  const [replace, setReplace] = useState<number | null>(null);
  const name = (id: string) => c.who(id).name;
  const full = h.stored.length >= 2;
  return (
    <div className="ig-sec">
      {h.offer && (
        <>
          <h4>{t(L.histHead)}</h4>
          {h.offer.length === 0 && <div className="ig-res">{t(L.noEvents)}</div>}
          <div className="ig-list">
            {h.offer.map((e, i) => (
              <button key={i} type="button" className="ig-opt" aria-pressed={pick === i} onClick={() => setPick(i)}>
                {eventText(t, e, name)}
              </button>
            ))}
          </div>
          {full && pick !== null && (
            <>
              <span className="mp-eyebrow">{t(L.histReplace)}</span>
              <div className="ig-list">
                {h.stored.map((e, i) => (
                  <button key={i} type="button" className="ig-opt" aria-pressed={replace === i} onClick={() => setReplace(i)}>
                    {eventText(t, e, name)}
                  </button>
                ))}
              </div>
            </>
          )}
          <kit.Button
            block
            disabled={pick === null || (full && replace === null)}
            onClick={() => send({ type: 'histStore', index: pick, ...(full ? { replace } : {}) })}
          >
            {t(L.store)}
          </kit.Button>
          <kit.Button variant="ghost" small onClick={() => send({ type: 'histStore', index: null })}>
            {t(L.dontStore)}
          </kit.Button>
        </>
      )}
      {h.stored.length > 0 && (
        <>
          <h4>
            {t(L.archive)}
            {view.usesLeft !== null ? ` · ${fmt(t(L.usesLeft), { n: view.usesLeft })}` : ''}
          </h4>
          {h.stored.map((e, i) => (
            <div key={i} className="ig-sec">
              <div className="ig-res">{eventText(t, e, name)}</div>
              {h.canReveal && (
                <kit.Button small onClick={() => send({ type: 'histReveal', index: i })}>
                  {t(L.reveal)}
                </kit.Button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Autopsy({ c }: { c: Ctx }) {
  const { t, send, view } = c;
  const a = view.autopsy!;
  return (
    <div className="ig-sec">
      <h4>
        {t(L.autopsyHead)}
        {view.usesLeft !== null ? ` · ${fmt(t(L.usesLeft), { n: view.usesLeft })}` : ''}
      </h4>
      {a.results.map((r) => (
        <div key={r.target} className="ig-res">
          {fmt(t(L.autopsyRes), { v: c.who(r.target).name, t: t(TEAM_NAME[r.team]) })}
        </div>
      ))}
      {a.canUse &&
        (a.candidates.length ? (
          <Picks c={c} ids={a.candidates} selected={[]} onPick={(id) => send({ type: 'autopsy', target: id })} />
        ) : (
          <div className="ig-res">{t(L.autopsyNone)}</div>
        ))}
    </div>
  );
}

function VoteForm({ c }: { c: Ctx }) {
  const { t, send, kit, view } = c;
  const vote = view.vote!;
  const [mine, setMine] = useState<string | null>(vote.mine);
  const [target, setTarget] = useState<string | null>(null);
  const [guess, setGuess] = useState<RoleId | null>(null);
  useEffect(() => setMine(vote.mine), [vote.mine]);
  const cast = (id: string) => {
    setMine(id);
    send({ type: 'vote', target: id });
  };
  return (
    <div className="ig-ph">
      <div className="ig-sec">
        <h4>{t(L.voteHead)}</h4>
        <Picks
          c={c}
          crimson
          ids={vote.candidates}
          selected={[mine]}
          onPick={cast}
          extra={
            <button type="button" className="ig-pick" aria-pressed={mine === 'skip'} onClick={() => cast('skip')}>
              <span style={{ fontSize: 24 }}>↷</span>
              <span>{t(L.skip)}</span>
            </button>
          }
        />
        {mine && <p className="ig-note">{t(L.locked)}</p>}
      </div>
      {vote.special && (
        <div className="ig-sec">
          <h4>{t(vote.special === 'sniper' ? L.sniperHead : vote.special === 'exorcist' ? L.exorcistHead : L.shifterHead)}</h4>
          <Picks c={c} ids={vote.candidates} selected={[target]} onPick={setTarget} />
          {vote.special === 'sniper' && <ClassSelect c={c} value={guess} onChange={setGuess} />}
          <kit.Button
            variant="crimson"
            block
            disabled={!target || (vote.special === 'sniper' && !guess)}
            onClick={() =>
              send(
                vote.special === 'sniper'
                  ? { type: 'snipe', target, guess }
                  : vote.special === 'exorcist'
                    ? { type: 'exorcise', target }
                    : { type: 'shift', target },
              )
            }
          >
            {t(vote.special === 'sniper' ? L.fire : vote.special === 'exorcist' ? L.exorciseBtn : L.imitate)}
          </kit.Button>
        </div>
      )}
    </div>
  );
}

function Omni({ c }: { c: Ctx }) {
  const { t, view } = c;
  const o = view.omni!;
  const n = (id: string) => c.who(id).name;
  return (
    <div className="ig-sec">
      <h4>{t(L.omniHead)}</h4>
      {Object.entries(o.roles).map(([id, rid]) => (
        <div key={id} className={`ig-res ${TEAM_CLASS[role(rid).team]}`}>
          {n(id)} — <span className="ig-team">{t(role(rid).name)}</span>
        </div>
      ))}
      {o.log.length > 0 && <h4>{t(L.omniLog)}</h4>}
      {o.log.map((e, i) => (
        <div key={i} className="ig-res">
          {n(e.actor)} ({e.role === 'kill' ? t(L.killTitleTeam) : e.role === 'potion' ? t(L.potionWord) : t(role(e.role).name)}) → {e.targets.map(n).join(', ')}
          {e.guess ? ` · ${t(role(e.guess).name)}` : ''} {e.effective ? '' : t(L.blocked)}
        </div>
      ))}
    </div>
  );
}

function GamePane({ c }: { c: Ctx }) {
  const { view: v, t, kit, send } = c;
  const { Panel, Countdown, Button } = kit;
  if (v.phase === 'setup') return v.setup ? <SetupPanel c={c} /> : <p className="ig-note">{t(L.waitHost)}</p>;

  if (v.phase === 'end') {
    return (
      <div className="ig-ph">
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <p className="ig-note">{t(L.look)}</p>
        </Panel>
        {v.isHost && (
          <>
            <Button block onClick={() => send({ type: 'again' })}>
              {t(L.again)}
            </Button>
            <Button block variant="ghost" onClick={() => send({ type: 'finish' })}>
              {t(L.finish)}
            </Button>
          </>
        )}
      </div>
    );
  }

  const countdown = v.deadline !== null && <Countdown deadline={v.deadline} total={v.total ?? 0} size={64} />;
  let main: ReactNode = <p className="ig-note">{t(L.look)}</p>;
  if (!v.alive && v.seat) {
    main = (
      <>
        <p className="ig-note">{t(L.dead)}</p>
        {v.omni && <Omni c={c} />}
      </>
    );
  } else if (v.phase === 'reveal') {
    main = v.acked ? <p className="ig-note">{t(L.waiting)}</p> : <Button block onClick={() => send({ type: 'ack' })}>{t(L.gotIt)}</Button>;
  } else if (v.phase === 'night' && v.night) {
    main = <NightForm key={`n${v.day}`} c={c} night={v.night} />;
  } else if (v.phase === 'report') {
    main = <ReportBlock c={c} />;
  } else if (v.phase === 'dawn' || v.phase === 'day') {
    main = (
      <>
        <ReportBlock c={c} />
        {v.spokes && <Spokes c={c} />}
        {v.hist && <Historian c={c} />}
        {v.autopsy && <Autopsy c={c} />}
        {v.skip && (
          <Button variant="ghost" block disabled={v.skip.mine} onClick={() => send({ type: 'skip' })}>
            {fmt(t(v.skip.mine ? L.skipAsked : L.skipDay), { n: v.skip.count, of: v.skip.of })}
          </Button>
        )}
      </>
    );
  } else if (v.phase === 'vote' && v.vote) {
    main = (
      <>
        <VoteForm key={`v${v.day}`} c={c} />
        {v.hist?.canReveal && v.hist.stored.length > 0 && <Historian c={c} />}
      </>
    );
  } else if (v.phase === 'verdict' && v.appeal) {
    main = v.appeal.appealed ? (
      <p className="ig-note">{t(L.appealed)}</p>
    ) : (
      <div className="ig-sec">
        <h4>{t(L.appealHead)}</h4>
        <Button variant="crimson" block onClick={() => send({ type: 'appeal' })}>
          {t(L.appeal)}
        </Button>
      </div>
    );
  }

  return (
    <div className="ig-ph">
      {v.seat && <Hold c={c} />}
      {countdown && <div style={{ display: 'grid', justifyItems: 'center' }}>{countdown}</div>}
      {main}
    </div>
  );
}

function Player({ view, kit, t, send, platform }: PlayerProps<PlayerView>) {
  const [tab, setTab] = useState<'game' | 'guide'>('game');
  const who = useWho(platform);
  if (!view) return null;
  const c: Ctx = { view, kit, t, send, who };
  return (
    <div className="ig-ph">
      <Styles />
      <div className="ig-tabs" role="tablist">
        <button type="button" role="tab" className="ig-tab" aria-selected={tab === 'game'} onClick={() => setTab('game')}>
          {t(L.tabGame)}
        </button>
        <button type="button" role="tab" className="ig-tab" aria-selected={tab === 'guide'} onClick={() => setTab('guide')}>
          {t(L.tabGuide)}
        </button>
      </div>
      {tab === 'guide' ? <Guide t={t} /> : <GamePane c={c} />}
    </div>
  );
}

export default defineGameUI({ Display, Player });
