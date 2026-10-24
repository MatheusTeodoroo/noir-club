import { useEffect, useState, type ReactNode } from 'react';
import {
  defineGameUI,
  type DealerProps,
  type DisplayProps,
  type I18nText,
  type PlayerProps,
} from '@mp/game-sdk';
import type { Announcement, DealerView, MesaError, Notice, PlayerView, PublicView, Result, Seen } from './logic.ts';
import { CATALOG, GROUP_NAMES, UNITS, type CharId, type CondKind, type Room, type Team } from './shared.ts';
import { CREDITS, RULES, SLIDES, type Demo } from './texts.ts';

// Only `react` and `@mp/game-sdk` may be imported here (plus the public shared.ts and texts.ts).
// Platform components come in through `kit`, text goes through `t()`, styles use the `feg-` prefix.

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  hall: { 'pt-BR': 'Salão', en: 'Hall' },
  envoys: { 'pt-BR': 'Embaixadores', en: 'Envoys' },
  leader: { 'pt-BR': 'Líder', en: 'Leader' },
  noLeader: { 'pt-BR': 'sem líder', en: 'no leader' },
  players: { 'pt-BR': 'jogadores', en: 'players' },
  hostage1: { 'pt-BR': 'refém', en: 'hostage' },
  hostageN: { 'pt-BR': 'reféns', en: 'hostages' },
  locked: { 'pt-BR': 'Reféns travados', en: 'Hostages locked' },
  choosing: { 'pt-BR': 'Escolhendo reféns…', en: 'Choosing hostages…' },

  mesaTitle: { 'pt-BR': 'O baralho', en: 'The deck' },
  mesaSub: { 'pt-BR': 'O Host escolhe os personagens desta partida.', en: 'The Host picks this match’s characters.' },
  buried: { 'pt-BR': 'Uma carta será enterrada', en: 'One card will be buried' },
  table: { 'pt-BR': 'Reféns por rodada', en: 'Hostages per round' },

  briefTitle: { 'pt-BR': 'Aos salões', en: 'To your halls' },
  briefPhone: {
    'pt-BR': 'Vá para o seu salão e espie sua carta no celular.',
    en: 'Go to your hall and peek at your card on your phone.',
  },
  briefDealer: {
    'pt-BR': 'Um por vez, vá ao Dealer ver sua carta. Depois, vá para o seu salão.',
    en: 'One at a time, see your card at the Dealer. Then go to your hall.',
  },

  roundSub: {
    'pt-BR': 'Conversem, compartilhem, desconfiem. Cada líder escolhe quem atravessa.',
    en: 'Talk, share, suspect. Each leader picks who crosses over.',
  },
  noClock: { 'pt-BR': 'Sem cronômetro: a rodada acaba quando os dois líderes travarem.', en: 'No clock: the round ends when both leaders lock.' },
  lastRound: { 'pt-BR': 'Última rodada', en: 'Final round' },

  exTitle: { 'pt-BR': 'Troca de reféns', en: 'Hostage exchange' },
  exSub: { 'pt-BR': 'Reféns, atravessem agora. Líderes, sem conversa.', en: 'Hostages, cross over now. Leaders, no talking.' },
  goesTo: { 'pt-BR': 'vão para o Salão', en: 'go to Hall' },

  pauseTitle: { 'pt-BR': 'Pausa', en: 'Pause' },
  pauseSub: { 'pt-BR': 'Antes da revelação, alguns têm algo a anunciar.', en: 'Before the reveal, a few have something to announce.' },
  sudden: { 'pt-BR': 'A partida acabou de repente!', en: 'The match ended suddenly!' },
  step5: { 'pt-BR': 'O Investigador aponta a carta enterrada', en: 'The Investigator names the buried card' },
  step10: { 'pt-BR': 'O Apostador escolhe a família vencedora', en: 'The Gambler names the winning family' },
  step15: { 'pt-BR': 'O Atirador escolhe seu alvo', en: 'The Marksman picks a target' },
  silent: { 'pt-BR': 'ficou em silêncio', en: 'stayed silent' },
  shoots: { 'pt-BR': 'atira em', en: 'shoots' },

  revealTitle: { 'pt-BR': 'A revelação', en: 'The reveal' },
  winOuro: { 'pt-BR': 'A Família Ouro vence', en: 'The Gold Family wins' },
  winCarmim: { 'pt-BR': 'A Família Carmim vence', en: 'The Crimson Family wins' },
  winNone: { 'pt-BR': 'Nenhuma família vence', en: 'Neither family wins' },
  tyrantWins: { 'pt-BR': 'O Tirano vence sozinho!', en: 'The Tyrant wins alone!' },
  bossFell: { 'pt-BR': 'O Chefão caiu.', en: 'The Boss went down.' },
  bossLives: { 'pt-BR': 'O Chefão escapou.', en: 'The Boss got away.' },
  doctorMiss: { 'pt-BR': 'O Chefão não passou pelo Médico.', en: 'The Boss never saw the Doctor.' },
  engineerMiss: { 'pt-BR': 'O Assassino não passou pelo Armeiro.', en: 'The Hitman never saw the Armorer.' },
  boomDinamite: { 'pt-BR': 'A Dinamite encontrou o Chefão!', en: 'The Dynamite found the Boss!' },
  boomGuarda: { 'pt-BR': 'O Guarda-costas encontrou o Assassino!', en: 'The Bodyguard found the Hitman!' },
  buriedCard: { 'pt-BR': 'Carta enterrada', en: 'Buried card' },
  fell: { 'pt-BR': 'caiu', en: 'down' },

  ouro: { 'pt-BR': 'Ouro', en: 'Gold' },
  carmim: { 'pt-BR': 'Carmim', en: 'Crimson' },
  prata: { 'pt-BR': 'Prata', en: 'Silver' },
  verde: { 'pt-BR': 'Verde', en: 'Green' },
  zombiesWin: { 'pt-BR': 'Os infectados vencem!', en: 'The infected win!' },
  cantShareNote: {
    'pt-BR': 'Suas condições impedem você de aceitar.',
    en: 'Your conditions keep you from accepting.',
  },
  psychOffer: {
    'pt-BR': '{n} (Terapeuta) oferece cura: troque a carta e perca sua condição.',
    en: '{n} (Therapist) offers a cure: card share and lose your condition.',
  },
  limitedNote: {
    'pt-BR': 'Suas condições limitam o que você pode mostrar.',
    en: 'Your conditions limit what you can show.',
  },
  errZombieImmune: {
    'pt-BR': 'O Contagiado não pode jogar com o Intocável.',
    en: 'The Infected can’t be played with the Untouchable.',
  },
  nenhum: { 'pt-BR': 'Nenhuma', en: 'Neither' },

  // phone
  tapToPeek: { 'pt-BR': 'Toque para espiar sua carta', en: 'Tap to peek at your card' },
  cardChanged: { 'pt-BR': 'Sua carta mudou — toque para ver', en: 'Your card changed — tap to see' },
  secretNews: { 'pt-BR': 'Novidade secreta — toque para ler', en: 'Secret news — tap to read' },
  showKnown: { 'pt-BR': 'Ver o que você sabe', en: 'See what you know' },
  hide: { 'pt-BR': 'Esconder', en: 'Hide' },
  revealRoom: { 'pt-BR': 'Revelar ao salão', en: 'Reveal to the hall' },
  revealRoomSure: { 'pt-BR': 'Todos do salão verão sua carta. Confirmar?', en: 'Everyone in the hall will see your card. Confirm?' },
  confirm: { 'pt-BR': 'Confirmar', en: 'Confirm' },
  cancel: { 'pt-BR': 'Cancelar', en: 'Cancel' },
  waitHost: { 'pt-BR': 'O Host está montando o baralho. Olhe a TV.', en: 'The Host is building the deck. Watch the TV.' },
  presets: { 'pt-BR': 'Começar de', en: 'Start from' },
  basico: { 'pt-BR': 'Básico', en: 'Basic' },
  classico: { 'pt-BR': 'Clássico', en: 'Classic' },
  caos: { 'pt-BR': 'Caos', en: 'Chaos' },
  bury: { 'pt-BR': 'Enterrar uma carta', en: 'Bury a card' },
  deal: { 'pt-BR': 'Distribuir cartas', en: 'Deal the cards' },
  errTooMany: { 'pt-BR': 'Personagens demais para esta mesa.', en: 'Too many characters for this table.' },
  errNeedBury: { 'pt-BR': 'O Investigador exige uma carta enterrada.', en: 'The Investigator needs a buried card.' },
  errFew: { 'pt-BR': 'Sem os Embaixadores, ficam menos de 6 jogadores.', en: 'Without the Envoys, fewer than 6 players remain.' },
  warnBig: { 'pt-BR': 'recomendado para 11+', en: 'best with 11+' },
  cards: { 'pt-BR': 'cartas', en: 'cards' },

  goHall: { 'pt-BR': 'Vá para o Salão {r}', en: 'Go to Hall {r}' },
  youEnvoy: { 'pt-BR': 'Você circula entre os salões.', en: 'You walk between the halls.' },
  ready: { 'pt-BR': 'Pronto', en: 'Ready' },
  waitingOthers: { 'pt-BR': 'Esperando os outros…', en: 'Waiting for the others…' },
  goDealer: { 'pt-BR': 'Vá ao Dealer para ver sua carta (botão acima).', en: 'Go to the Dealer to see your card (button above).' },

  inHall: { 'pt-BR': 'Você está no Salão {r}', en: 'You are in Hall {r}' },
  youLead: { 'pt-BR': 'Você é o líder', en: 'You are the leader' },
  leaderIs: { 'pt-BR': 'Líder: {n}', en: 'Leader: {n}' },
  people: { 'pt-BR': 'Pessoas aqui', en: 'People here' },
  everyone: { 'pt-BR': 'Todos os jogadores', en: 'All players' },
  askCard: { 'pt-BR': 'Pedir troca de carta', en: 'Offer card share' },
  askColor: { 'pt-BR': 'Pedir troca de cor', en: 'Offer colour share' },
  showCard: { 'pt-BR': 'Mostrar minha carta', en: 'Show my card' },
  showColor: { 'pt-BR': 'Mostrar minha cor', en: 'Show my colour' },
  nominate: { 'pt-BR': 'Nomear líder', en: 'Appoint as leader' },
  pointAt: { 'pt-BR': 'Apontar para líder', en: 'Point as leader' },
  unpoint: { 'pt-BR': 'Baixar a mão', en: 'Lower your hand' },
  handOver: { 'pt-BR': 'Passar a liderança', en: 'Hand over leadership' },
  pointing: { 'pt-BR': 'apontando', en: 'pointing' },
  votesFor: { 'pt-BR': '{n} de {m} apontam para {who}', en: '{n} of {m} point at {who}' },
  wantsShare: { 'pt-BR': '{n} quer trocar a carta com você', en: '{n} offers to card share' },
  wantsColor: { 'pt-BR': '{n} quer trocar a cor com você', en: '{n} offers to colour share' },
  accept: { 'pt-BR': 'Aceitar', en: 'Accept' },
  decline: { 'pt-BR': 'Recusar', en: 'Decline' },
  waitingAnswer: { 'pt-BR': 'Esperando {n} responder…', en: 'Waiting for {n} to answer…' },
  withdraw: { 'pt-BR': 'Desistir', en: 'Withdraw' },
  offersLead: { 'pt-BR': '{n} quer passar a liderança para você', en: '{n} wants to hand you the leadership' },
  hostagesPick: { 'pt-BR': 'Escolha {n} refém(ns)', en: 'Pick {n} hostage(s)' },
  lock: { 'pt-BR': 'Travar reféns', en: 'Lock hostages' },
  lockedNote: { 'pt-BR': 'Reféns travados: {n}', en: 'Hostages locked: {n}' },
  hallPicks: { 'pt-BR': 'O líder escolheu: {n}', en: 'The leader picked: {n}' },
  tackled: { 'pt-BR': 'segurado', en: 'held' },
  known: { 'pt-BR': 'O que você sabe', en: 'What you know' },
  nothingKnown: { 'pt-BR': 'Ninguém se mostrou a você ainda.', en: 'Nobody has shown you anything yet.' },
  colorOnly: { 'pt-BR': 'só a cor', en: 'colour only' },
  power: { 'pt-BR': 'Seu poder', en: 'Your power' },
  usePower: { 'pt-BR': 'Usar poder', en: 'Use power' },
  pickTargets: { 'pt-BR': 'Escolha {n}:', en: 'Pick {n}:' },
  notNow: { 'pt-BR': 'Indisponível agora.', en: 'Not available now.' },
  inLove: { 'pt-BR': 'Apaixonado por {n}: terminem no mesmo salão.', en: 'In love with {n}: end in the same hall.' },
  inHate: { 'pt-BR': 'Odeia {n}: terminem em salões diferentes.', en: 'You hate {n}: end in different halls.' },
  foolish: { 'pt-BR': 'Tolo: você aceita todo pedido de carta.', en: 'Gullible: you accept every card share.' },

  hostageGo: { 'pt-BR': 'Você é refém! Vá para o Salão {r}', en: 'You are a hostage! Go to Hall {r}' },
  arrived: { 'pt-BR': 'Cheguei', en: 'I’m here' },
  stayPut: { 'pt-BR': 'Fique no seu salão. Olhe a TV.', en: 'Stay in your hall. Watch the TV.' },
  watchTv: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  yourTurn: { 'pt-BR': 'Sua vez de anunciar', en: 'Your turn to announce' },
  guessBuried: { 'pt-BR': 'Qual carta foi enterrada?', en: 'Which card was buried?' },
  guessFamily: { 'pt-BR': 'Qual família vence?', en: 'Which family wins?' },
  guessShot: { 'pt-BR': 'Em quem você atira?', en: 'Whom do you shoot?' },
  announced: { 'pt-BR': 'Anúncio feito.', en: 'Announced.' },
  youWon: { 'pt-BR': 'Você venceu!', en: 'You won!' },
  youLost: { 'pt-BR': 'Você perdeu.', en: 'You lost.' },
  endedAs: { 'pt-BR': 'Terminou como', en: 'Ended as' },

  memorize: { 'pt-BR': 'Memorize. Não conte a ninguém.', en: 'Memorize it. Tell no one.' },
  dealerIdle: { 'pt-BR': 'Ficha Explosiva', en: 'Loaded Chip' },

  tutorial: { 'pt-BR': 'Tutorial', en: 'Tutorial' },
  hostAdvances: { 'pt-BR': 'O Host avança pelo celular', en: 'The Host moves on from their phone' },
  followTv: { 'pt-BR': 'Acompanhe o tutorial na TV.', en: 'Follow the tutorial on the TV.' },
  prev: { 'pt-BR': 'Anterior', en: 'Back' },
  next: { 'pt-BR': 'Próximo', en: 'Next' },
  startDeck: { 'pt-BR': 'Montar o baralho', en: 'Build the deck' },
  skip: { 'pt-BR': 'Pular tutorial', en: 'Skip tutorial' },
  rules: { 'pt-BR': 'Regras', en: 'Rules' },
  showOnTv: { 'pt-BR': 'Mostrar na TV', en: 'Show on TV' },
  hideFromTv: { 'pt-BR': 'Tirar da TV', en: 'Hide from TV' },
  close: { 'pt-BR': 'Fechar', en: 'Close' },
  hintNominate: {
    'pt-BR': 'Primeiro passo: em cada salão, alguém toca em outra pessoa e escolhe Nomear líder.',
    en: 'First step: in each hall, someone taps another person and picks Appoint as leader.',
  },
  hintShare: {
    'pt-BR': 'Conversem! Toque em alguém do salão para pedir troca de carta ou mostrar a sua.',
    en: 'Talk! Tap someone in your hall to offer a card share or show yours.',
  },
  hintLock: {
    'pt-BR': 'Falta pouco: líderes, marquem os reféns e toquem em Travar reféns.',
    en: 'Almost time: leaders, mark the hostages and tap Lock hostages.',
  },
  demoHall: { 'pt-BR': 'Salão', en: 'Hall' },
  demoAccept: { 'pt-BR': 'aceitou', en: 'accepted' },
  demoGoesDown: { 'pt-BR': 'todos aqui caem', en: 'everyone here goes down' },
} satisfies Record<string, I18nText>;

const NOTICE: Record<Notice['k'], I18nText> = {
  declined: { 'pt-BR': '{a} recusou.', en: '{a} declined.' },
  expired: { 'pt-BR': '{a} não respondeu a tempo.', en: '{a} did not answer in time.' },
  forced: { 'pt-BR': '{a} usou o Federal: vocês trocaram as cartas.', en: '{a} used the Fed: you card shared.' },
  enforced: { 'pt-BR': '{a} (Cobrador) obrigou você e {b} a trocar as cartas.', en: '{a} (Enforcer) made you and {b} card share.' },
  love: { 'pt-BR': '{a} (Casamenteira): você está apaixonado por {b}.', en: '{a} (Matchmaker): you are in love with {b}.' },
  hate: { 'pt-BR': '{a} (Intrigante): você odeia {b}.', en: '{a} (Troublemaker): you hate {b}.' },
  cancelled: { 'pt-BR': 'Amor e ódio se anularam: você está livre.', en: 'Love and hate cancelled out: you are free.' },
  bounced: { 'pt-BR': 'Você foi expulso! Vá agora para o Salão {r}.', en: 'You were thrown out! Go to Hall {r} now.' },
  swapped: { 'pt-BR': 'Você trocou de carta com {a}! Veja sua nova carta.', en: 'You swapped cards with {a}! Check your new card.' },
  cured: { 'pt-BR': '{a} (Boticário) curou suas condições.', en: '{a} (Apothecary) cured your conditions.' },
  leader: { 'pt-BR': 'Você agora é o líder do salão.', en: 'You are now the hall’s leader.' },
  lostLead: { 'pt-BR': 'Você não é mais o líder.', en: 'You are no longer the leader.' },
  condition: { 'pt-BR': 'Trocar com {a} deixou você "{c}".', en: 'Sharing with {a} left you "{c}".' },
  healed: { 'pt-BR': '{a} (Terapeuta) curou você.', en: '{a} (Therapist) cured you.' },
  sober: { 'pt-BR': 'Você ficou sóbrio: sua carta mudou! Veja a nova.', en: 'You sobered up: your card changed! Check the new one.' },
};

/** Condition names, as the cards print them. */
const COND: Record<CondKind, I18nText> = {
  love: { 'pt-BR': 'apaixonado', en: 'in love' },
  hate: { 'pt-BR': 'odeia', en: 'in hate' },
  foolish: { 'pt-BR': 'tolo', en: 'gullible' },
  shy: { 'pt-BR': 'tímido', en: 'shy' },
  coy: { 'pt-BR': 'recatado', en: 'coy' },
  paranoid: { 'pt-BR': 'paranoico', en: 'paranoid' },
  savvy: { 'pt-BR': 'esperto', en: 'savvy' },
  cursed: { 'pt-BR': 'calado', en: 'gagged' },
  honest: { 'pt-BR': 'sincero', en: 'honest' },
  liar: { 'pt-BR': 'mentiroso', en: 'liar' },
  zombie: { 'pt-BR': 'infectado', en: 'infected' },
};

/** What each condition means for the player, shown under their open card. */
const COND_RULE: Record<Exclude<CondKind, 'love' | 'hate'>, I18nText> = {
  foolish: { 'pt-BR': 'Tolo: você aceita todo pedido de troca.', en: 'Gullible: you accept every share offer.' },
  shy: { 'pt-BR': 'Tímido: você não mostra nem troca nada.', en: 'Shy: you show and share nothing.' },
  coy: { 'pt-BR': 'Recatado: só troca de cor.', en: 'Coy: colour shares only.' },
  paranoid: { 'pt-BR': 'Paranoico: uma única troca de carta na partida.', en: 'Paranoid: a single card share per match.' },
  savvy: { 'pt-BR': 'Esperto: só troca de carta inteira.', en: 'Savvy: card shares only.' },
  cursed: { 'pt-BR': 'Calado: sem barulho e sem poderes falados.', en: 'Gagged: no noise and no spoken powers.' },
  honest: { 'pt-BR': 'Sincero: tudo o que você fala é verdade.', en: 'Honest: everything you say is true.' },
  liar: { 'pt-BR': 'Mentiroso: tudo o que você fala é mentira.', en: 'Liar: everything you say is a lie.' },
  zombie: { 'pt-BR': 'Infectado: você vence com os infectados.', en: 'Infected: you win with the infected.' },
};

const SEEN_HOW: Record<Seen['how'], I18nText> = {
  cardShare: { 'pt-BR': 'troca de carta', en: 'card share' },
  colorShare: { 'pt-BR': 'troca de cor', en: 'colour share' },
  shown: { 'pt-BR': 'mostrou a você', en: 'showed you' },
  colorShown: { 'pt-BR': 'mostrou a cor', en: 'showed the colour' },
  public: { 'pt-BR': 'revelou ao salão', en: 'revealed to the hall' },
  power: { 'pt-BR': 'poder', en: 'power' },
};

const POWER_TARGETS: Record<string, number> = {
  federal: 1,
  cobrador: 2,
  casamenteira: 2,
  intrigante: 2,
  usurpador: 0,
  guarda: 1,
  vereador: 0,
  leao: 1,
  terapeuta: 1,
};

const GLYPH: Record<CharId, string> = {
  chefao: '👑', assassino: '💣', soldadoOuro: '♦', soldadoCarmim: '♥', apostador: '🎲',
  herdeiro: '🗝️', bracoDireito: '🤝', investigador: '🔍', atirador: '🔭', alvo: '🎯', isca: '🪆',
  enfermeira: '💉', aprendiz: '🔧', afilhado: '🎩', devedor: '💸', rival: '⚔️', sobrevivente: '🛟',
  duquesa: '💎', abutre: '🦅', mordomo: '🛎️', governanta: '🧹', bonnie: '🌹', clyde: '🚗',
  esposa: '💍', amante: '💋', credor: '📜', caloteiro: '🏃', habitue: '🪑', turista: '🧳',
  medico: '🩺', armeiro: '🔩', dinamite: '🧨', guardaCostas: '🛡️', fichaQuente: '🌶️',
  federalOuro: '🕵️', federalCarmim: '🕵️', cobradorOuro: '📒', cobradorCarmim: '📒',
  casamenteira: '💘', intrigante: '💔', infiltradoOuro: '🎭', infiltradoCarmim: '🎭',
  sombra: '👥', sabotador: '⚙️', corregedor: '⚖️', tirano: '🏛️', boticarioOuro: '⚗️',
  boticarioCarmim: '⚗️', usurpadorOuro: '✊', usurpadorCarmim: '✊', guardaOuro: '🚧',
  guardaCarmim: '🚧', vereadorOuro: '🗳️', vereadorCarmim: '🗳️', leaoOuro: '🚪', leaoCarmim: '🚪',
  mandachuva: '🎰', anarquista: '🏴', lacaio: '🙇', embaixadorOuro: '🕊️', embaixadorCarmim: '🕊️',
  santoOuro: '😇', santoCarmim: '😇', mentirosoOuro: '🤥', mentirosoCarmim: '🤥', vendadoOuro: '🙈',
  vendadoCarmim: '🙈', sorridenteOuro: '😁', sorridenteCarmim: '😁', mudoOuro: '🤐', mudoCarmim: '🤐',
  fofoqueiroOuro: '📸', fofoqueiroCarmim: '📸', timidoOuro: '😳', timidoCarmim: '😳', recatadoOuro: '🧣',
  recatadoCarmim: '🧣', paranoicoOuro: '👀', paranoicoCarmim: '👀', terapeutaOuro: '🛋️', terapeutaCarmim: '🛋️',
  chantagistaOuro: '✉️', chantagistaCarmim: '✉️', trapaceiroOuro: '🃏', trapaceiroCarmim: '🃏',
  capangaOuro: '🥊', capangaCarmim: '🥊', mordacaOuro: '🩹', mordacaCarmim: '🩹', golpistaOuro: '🎩',
  golpistaCarmim: '🎩', negociadorOuro: '🤝', negociadorCarmim: '🤝', intocavelOuro: '🛡️', intocavelCarmim: '🛡️',
  contagiado: '🦠', trevo: '🍀', bebado: '🍾',
};

const TEAM_LABEL: Record<Team, I18nText> = { ouro: L.ouro, carmim: L.carmim, prata: L.prata, verde: L.verde };

const CSS = `
.feg-wrap{position:relative;height:100vh;display:grid;grid-template-rows:auto 1fr;padding:2.4em 3.4em 4.2em;gap:1.4em;overflow:hidden}
.feg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:2em}
.feg-h1{font-family:var(--font-display);font-weight:900;font-size:4.4em;letter-spacing:.05em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.feg-h1--crimson{background:linear-gradient(180deg,#ff8a9a,var(--crimson-hi) 50%,var(--crimson-lo));-webkit-background-clip:text;background-clip:text}
.feg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.2em 0 0}
.feg-body{min-height:0;display:grid;gap:1.2em}
.feg-halls{display:grid;grid-template-columns:1fr auto 1fr;gap:1.4em;min-height:0}
.feg-halls--dense .feg-seat{font-size:.74em;width:7.4em}
.feg-halls--dense .feg-seats{gap:.5em .6em}
.feg-hall{border-radius:1.2em;padding:1.1em 1.3em;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--line) inset;display:grid;grid-template-rows:auto 1fr auto;gap:.8em;min-height:0}
.feg-hallname{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-display);font-size:2em;color:var(--gold-hi);letter-spacing:.08em}
.feg-hallname small{font-family:var(--font-ui);font-size:.5em;color:var(--text-mute);letter-spacing:.1em;text-transform:uppercase}
.feg-seats{display:flex;flex-wrap:wrap;gap:.9em 1.1em;align-content:flex-start;justify-content:center}
.feg-seat{display:grid;justify-items:center;gap:.25em;width:7.6em;font-weight:600;font-size:1em;text-align:center;position:relative}
.feg-seat > span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.feg-seat--lead > span{color:var(--gold-hi)}
.feg-seat--dead .feg-ava{filter:grayscale(1) brightness(.5)}
.feg-seat--dead > span:not(.feg-seat-card){color:var(--text-mute);text-decoration:line-through}
.feg-seat .feg-chip{font-size:.8em}
.feg-crown{position:absolute;top:-.7em;font-size:1.5em;filter:drop-shadow(0 0 8px rgba(246,220,138,.8))}
.feg-status{font-size:1.2em;color:var(--text-dim);text-align:center}
.feg-status--ok{color:var(--gold-hi)}
.feg-mid{display:grid;align-content:center;justify-items:center;gap:.8em;min-width:7em}
.feg-mid .mp-eyebrow{font-size:1em}
.feg-chip{display:inline-flex;align-items:center;gap:.35em;padding:.15em .6em;border-radius:99em;font-size:.85em;font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.feg-chip--ouro{background:linear-gradient(180deg,#f0d77a,#b8902a);color:#1a0f05}
.feg-chip--carmim{background:linear-gradient(180deg,#d9344f,#7a0a1c);color:#fff3f3}
.feg-chip--prata{background:linear-gradient(180deg,#d6d8de,#8b8f99);color:#15161a}
.feg-chip--verde{background:linear-gradient(180deg,#5fbf72,#1f6b34);color:#f1fff3}
.feg-deck{display:flex;flex-wrap:wrap;gap:.7em;justify-content:center;align-content:center}
.feg-card{--c1:#f0d77a;--c2:#b8902a;--ink:#1a0f05;width:7.2em;height:10em;border-radius:.8em;position:relative;display:grid;grid-template-rows:auto 1fr auto;justify-items:center;padding:.5em .4em .6em;
  background:linear-gradient(165deg,#fbf3e1,#e2cfa6);color:var(--ink);box-shadow:0 0 0 .18em var(--c2) inset,0 1em 2em -1em #000;overflow:hidden;font-size:1em}
.feg-card::before{content:'';position:absolute;inset:auto 0 0 0;height:2.1em;background:linear-gradient(180deg,var(--c1),var(--c2))}
.feg-card--carmim{--c1:#d9344f;--c2:#7a0a1c}
.feg-card--prata{--c1:#d6d8de;--c2:#7d818b}
.feg-card--verde{--c1:#5fbf72;--c2:#1f6b34}
.feg-card-team{font-size:.6em;letter-spacing:.14em;text-transform:uppercase;font-weight:800;opacity:.75}
.feg-card-glyph{font-size:2.8em;align-self:center;line-height:1}
.feg-card-name{position:relative;z-index:1;font-family:var(--font-display);font-weight:800;font-size:.78em;text-align:center;line-height:1.1;color:#fff;text-shadow:0 1px 2px #0008;padding:0 .2em}
.feg-card--ouro .feg-card-name,.feg-card--prata .feg-card-name{color:#1a0f05;text-shadow:none}
.feg-card--sm{font-size:.62em}
.feg-card--lg{font-size:2.4em}
.feg-card--flip{animation:feg-flip .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes feg-flip{from{transform:rotateY(90deg);opacity:0}to{transform:none;opacity:1}}
.feg-info{display:flex;gap:2.4em;justify-content:center;font-size:1.3em;color:var(--text-dim)}
.feg-info b{color:var(--gold-hi);font-family:var(--font-display)}
.feg-error{color:var(--crimson-hi);font-size:1.3em;text-align:center}
.feg-arrows{display:grid;grid-template-columns:1fr auto 1fr;gap:2em;align-items:center}
.feg-arrow{font-size:4em;color:var(--gold);animation:feg-slide 1.6s ease-in-out infinite alternate}
@keyframes feg-slide{from{transform:translateX(-.3em)}to{transform:translateX(.3em)}}
.feg-cross{display:flex;flex-wrap:wrap;gap:1em;justify-content:center;align-items:center;font-size:1.5em}
.feg-cross .feg-arrow{font-size:2.6em}
.feg-ann{display:grid;gap:.7em;justify-items:center;font-size:1.6em}
.feg-ann-row{display:flex;gap:.6em;align-items:center}
.feg-verdict{font-family:var(--font-display);font-weight:900;font-size:3.4em;text-transform:uppercase;text-align:center;line-height:1.15;padding-top:.05em;animation:feg-rise 1s 2.3s both}
.feg-verdict--ouro{color:var(--gold-hi);text-shadow:0 0 .6em rgba(246,220,138,.5)}
.feg-verdict--carmim{color:#ff6b80;text-shadow:0 0 .6em rgba(217,52,79,.6)}
.feg-verdict--nenhum{color:var(--text)}
@keyframes feg-rise{from{opacity:0;transform:translateY(.4em) scale(.96)}}
.feg-blast{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--x,50%) 60%,rgba(255,200,120,.9),rgba(217,52,79,.55) 22%,transparent 55%);animation:feg-blast 1.6s 2.3s both;opacity:0}
@keyframes feg-blast{0%{opacity:0;transform:scale(.4)}15%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
.feg-seat-card{animation:feg-flip .7s cubic-bezier(.2,.8,.2,1) both}
.feg-notes{display:flex;flex-wrap:wrap;gap:1.4em;justify-content:center;font-size:1.25em;color:var(--text-dim);font-style:italic;font-family:var(--font-serif)}

/* phone */
.feg-p{display:grid;gap:12px}
.feg-row{display:flex;align-items:center;gap:10px}
.feg-row--between{justify-content:space-between}
.feg-note{font-family:var(--font-serif);font-style:italic;font-size:1.1rem;color:var(--text-dim);text-align:center;margin:0}
.feg-title{font-family:var(--font-display);font-size:1.25rem;color:var(--gold-hi);margin:0;text-align:center;letter-spacing:.04em}
.feg-label{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute);font-weight:700;margin:4px 0 0}
.feg-mycard{display:grid;justify-items:center;gap:10px;text-align:center}
.feg-mycard .feg-card{font-size:16px}
.feg-back{width:7.2em;height:10em;font-size:16px;border-radius:.8em;border:0;cursor:pointer;background:repeating-linear-gradient(45deg,#2a0a12 0 10px,#1a0509 10px 20px);box-shadow:0 0 0 2px var(--gold-lo) inset;color:var(--gold);font-family:var(--font-display);font-size:16px;display:grid;place-items:center;padding:12px}
.feg-goal{font-weight:700;color:var(--text)}
.feg-text{font-size:.92rem;color:var(--text-dim);line-height:1.4;margin:0}
.feg-cond{font-size:.9rem;color:#ff8a9a;margin:0}
.feg-people{display:grid;gap:6px}
.feg-person{display:grid;gap:8px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.035);box-shadow:0 0 0 1px var(--line) inset}
.feg-person--open{box-shadow:0 0 0 1px var(--gold-lo) inset;background:rgba(212,175,55,.06)}
.feg-person-head{display:flex;align-items:center;gap:10px;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:0;min-height:44px;width:100%}
.feg-person-name{flex:1;font-weight:600}
.feg-person-tags{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.feg-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.feg-actions > *{min-height:44px}
.feg-alert{display:grid;gap:8px;padding:12px;border-radius:14px;background:linear-gradient(180deg,rgba(217,52,79,.18),rgba(217,52,79,.06));box-shadow:0 0 0 1px var(--crimson) inset}
.feg-toggle{display:flex;flex-wrap:wrap;gap:6px}
.feg-unit{border:0;cursor:pointer;border-radius:12px;padding:8px 10px;min-height:44px;font:inherit;font-size:.85rem;text-align:left;color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;display:grid;gap:2px}
.feg-unit[aria-pressed=true]{background:rgba(212,175,55,.16);box-shadow:0 0 0 1px var(--gold) inset}
.feg-unit small{color:var(--text-mute)}
.feg-pick{border:0;cursor:pointer;border-radius:12px;padding:8px 10px;min-height:48px;font:inherit;color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;display:flex;align-items:center;gap:8px}
.feg-pick[aria-pressed=true]{background:rgba(212,175,55,.18);box-shadow:0 0 0 1px var(--gold) inset}
.feg-picks{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.feg-seen{display:grid;gap:6px}
.feg-seen-row{display:flex;align-items:center;gap:8px;font-size:.92rem}
.feg-seen-row small{color:var(--text-mute)}
.feg-toast{font-size:.9rem;padding:8px 10px;border-radius:10px;background:rgba(212,175,55,.08);box-shadow:0 0 0 1px var(--line) inset}
.feg-big{font-family:var(--font-display);font-size:1.6rem;color:var(--gold-hi);text-align:center;margin:0}

/* tutorial slide (TV) */
.feg-slide{height:100vh;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:3.4em;padding:3.4em 4.4em 4.4em}
.feg-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.feg-slide b,.feg-rules b,.feg-tvrules b{color:var(--gold-hi);font-weight:700}
.feg-dots{display:flex;gap:.6em;margin-top:1.2em}
.feg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.feg-dots span[data-on='true']{background:var(--gold)}
.feg-demo{display:grid;gap:1.2em;justify-items:center;align-content:center}
.feg-demo-row{display:flex;gap:1.1em;align-items:center;justify-content:center;flex-wrap:wrap}
.feg-demo-hall{border-radius:1em;padding:.9em 1.1em;box-shadow:0 0 0 1px var(--line) inset;background:rgba(255,255,255,.03);display:grid;gap:.6em;justify-items:center;min-width:12em}
.feg-demo-hall--boom{box-shadow:0 0 0 2px var(--crimson) inset,0 0 3em rgba(217,52,79,.35)}
.feg-demo-step{display:flex;align-items:center;gap:.8em;font-size:1.3em}
.feg-demo-step b{font-family:var(--font-display);font-size:1.4em;color:var(--gold-hi);min-width:1.4em}
/* rules overlay (TV) and reader (phone) */
.feg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.feg-tvrules .mp-panel{width:min(64em,90vw);max-height:40em;overflow:hidden;padding:2.2em 2.8em}
.feg-tvrules h2{font-family:var(--font-display);font-size:2.4em;margin:.2em 0 .5em;color:var(--gold-hi)}
.feg-tvrules p{font-size:1.35em;line-height:1.42;margin:0 0 .55em}
.feg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.feg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.feg-rules h3{font-family:var(--font-display);font-size:1.35rem;margin:0;color:var(--gold-hi)}
.feg-rules p{margin:0;line-height:1.5;font-size:.95rem}
.feg-hint{display:inline-block;margin-top:.5em;padding:.35em .9em;border-radius:99em;font-size:1.25em;color:#1a0f05;background:linear-gradient(180deg,#f0d77a,#b8902a)}

/* dealer */
.feg-dealer{display:grid;place-items:center;align-content:center;gap:1em;text-align:center;container-type:inline-size;padding:1em}
.tv .feg-dealer{min-height:100vh}
.feg-dealer .feg-card{font-size:min(3em,9cqw)}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

function fill(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

type Names = Record<string, { name: string; avatar: string; connected: boolean }>;
function useNames(platform: DisplayProps['platform']): Names {
  return Object.fromEntries(platform.players.map((p) => [p.id, { name: p.name, avatar: p.avatar, connected: p.connected }]));
}

function Card({ id, t, size, flip, delay }: { id: CharId; t: (x: I18nText) => string; size?: 'sm' | 'lg'; flip?: boolean; delay?: number }) {
  const def = CATALOG[id];
  return (
    <div
      className={`feg-card feg-card--${def.team}${size ? ` feg-card--${size}` : ''}${flip ? ' feg-card--flip' : ''}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span className="feg-card-team">{t(TEAM_LABEL[def.team])}</span>
      <span className="feg-card-glyph" aria-hidden>
        {GLYPH[id]}
      </span>
      <span className="feg-card-name">{t(def.name)}</span>
    </div>
  );
}

function Chip({ id, t }: { id: CharId; t: (x: I18nText) => string }) {
  const def = CATALOG[id];
  return (
    <span className={`feg-chip feg-chip--${def.team}`}>
      <span aria-hidden>{GLYPH[id]}</span>
      {t(def.name)}
    </span>
  );
}

// ---------------------------------------------------------------- tutorial and rules

const DEMO_AVATARS = ['🎩', '🦊', '🌙', '🍷', '💎', '🎲'];

/** Small live illustrations next to each slide, drawn with the game's real cards and halls. */
function SlideDemo({ demo, kit, t }: { demo: Demo; kit: DisplayProps['kit']; t: (x: I18nText) => string }) {
  const { Avatar } = kit;
  if (demo === 'families') {
    return (
      <div className="feg-demo">
        <div className="feg-demo-row" style={{ fontSize: '1.6em' }}>
          <Card id="chefao" t={t} flip />
          <Card id="assassino" t={t} flip delay={300} />
        </div>
        <div className="feg-demo-row">
          <Card id="soldadoOuro" t={t} flip delay={600} />
          <Card id="soldadoCarmim" t={t} flip delay={750} />
          <Card id="apostador" t={t} flip delay={900} />
        </div>
      </div>
    );
  }
  if (demo === 'halls') {
    return (
      <div className="feg-demo-row" style={{ fontSize: '1.3em' }}>
        {(['A', 'B'] as Room[]).map((r, i) => (
          <div key={r} className="feg-demo-hall">
            <span className="feg-hallname">
              {t(L.demoHall)} {r}
            </span>
            <div className="feg-demo-row">
              {DEMO_AVATARS.slice(i * 3, i * 3 + 3).map((a, j) => (
                <span key={a} className="feg-seat" style={{ width: 'auto' }}>
                  {j === 0 && (
                    <span className="feg-crown" aria-hidden>
                      ♛
                    </span>
                  )}
                  <Avatar emoji={a} size="3.4em" active={j === 0} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'share') {
    return (
      <div className="feg-demo">
        <div className="feg-demo-row" style={{ fontSize: '1.2em' }}>
          <div className="feg-demo">
            <Avatar emoji="🎩" size="4em" active />
            <Card id="chefao" t={t} flip delay={900} />
          </div>
          <span className="feg-arrow" aria-hidden>
            ⇄
          </span>
          <div className="feg-demo">
            <Avatar emoji="🦊" size="4em" active badge="✓" />
            <Card id="soldadoOuro" t={t} flip delay={1100} />
          </div>
        </div>
        <span className="feg-chip feg-chip--ouro" style={{ fontSize: '1.2em' }}>
          ✓ {t(L.demoAccept)}
        </span>
      </div>
    );
  }
  if (demo === 'round') {
    const steps: [string, string, string][] = [
      ['1', '⏱', '3 · 2 · 1 min'],
      ['2', '♛', t(L.lock)],
      ['3', '⇄', t(L.exTitle)],
      ['4', '💥', t(L.revealTitle)],
    ];
    return (
      <div className="feg-demo" style={{ justifyItems: 'start' }}>
        {steps.map(([n, icon, label], i) => (
          <div key={n} className="feg-demo-step mp-enter" style={{ animationDelay: `${i * 250}ms` }}>
            <b>{n}</b>
            <span aria-hidden>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
        <div className="feg-demo-row" style={{ fontSize: '.9em' }}>
          <div className="feg-demo-hall feg-demo-hall--boom">
            <div className="feg-demo-row">
              <Card id="assassino" t={t} size="sm" />
              <Card id="chefao" t={t} size="sm" />
            </div>
            <span className="feg-chip feg-chip--carmim">💥 {t(L.demoGoesDown)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: DisplayProps['kit']; t: (x: I18nText) => string }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="feg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="feg-h1" style={{ fontSize: '3.8em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="feg-sub" style={{ fontSize: '1.1em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="feg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="feg-sub" style={{ fontSize: '1.1em', marginTop: '.8em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: DisplayProps['kit']; t: (x: I18nText) => string }) {
  const r = RULES[page]!;
  return (
    <div className="feg-tvrules">
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
  t: (x: I18nText) => string;
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
    <div className="feg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="feg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="feg-actions">
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

// ---------------------------------------------------------------- TV

function Header({
  kit,
  platform,
  eyebrow,
  title,
  sub,
  deadline,
  total,
  crimson,
}: {
  kit: DisplayProps['kit'];
  platform: DisplayProps['platform'];
  eyebrow?: string;
  title: string;
  sub: string;
  deadline?: number | null;
  total?: number | null;
  crimson?: boolean;
}) {
  return (
    <header className="feg-head mp-enter" key={title}>
      <div>
        {eyebrow && (
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {eyebrow}
          </span>
        )}
        <h1 className={`feg-h1${crimson ? ' feg-h1--crimson' : ''}`}>{title}</h1>
        <p className="feg-sub">{sub}</p>
      </div>
      {deadline ? <kit.Countdown deadline={deadline} total={total ?? 0} size="7em" paused={!!platform.paused} /> : null}
    </header>
  );
}

function Seat({
  id,
  names,
  kit,
  lead,
  badge,
  crimson,
  active,
  children,
  dead,
}: {
  id: string;
  names: Names;
  kit: DisplayProps['kit'];
  lead?: boolean;
  badge?: string;
  crimson?: boolean;
  active?: boolean;
  dead?: boolean;
  children?: unknown;
}) {
  const p = names[id];
  return (
    <div className={`feg-seat${lead ? ' feg-seat--lead' : ''}${dead ? ' feg-seat--dead' : ''}`}>
      {lead && (
        <span className="feg-crown" aria-hidden>
          ♛
        </span>
      )}
      <span className="feg-ava">
        <kit.Avatar emoji={p?.avatar ?? '🎩'} size="3.6em" offline={p ? !p.connected : false} badge={badge} crimson={crimson} active={active || lead} />
      </span>
      <span>{p?.name ?? id}</span>
      {children as any}
    </div>
  );
}

function Halls({
  view,
  names,
  kit,
  t,
  seat,
  footer,
  middle,
}: {
  view: PublicView;
  names: Names;
  kit: DisplayProps['kit'];
  t: (x: I18nText) => string;
  seat: (id: string, hall: Room | null) => unknown;
  footer?: (hall: Room) => unknown;
  middle?: unknown;
}) {
  const dense = Math.max(view.rooms.A.length, view.rooms.B.length) > 8;
  return (
    <div className={`feg-halls${dense ? ' feg-halls--dense' : ''}`}>
      {(['A', 'B'] as Room[]).map((hall, i) => (
        <section key={hall} className="feg-hall" style={{ gridColumn: i === 0 ? 1 : 3 }}>
          <div className="feg-hallname">
            {t(L.hall)} {hall}
            <small>
              {view.rooms[hall].length} {t(L.players)}
            </small>
          </div>
          <div className="feg-seats">{view.rooms[hall].map((id) => seat(id, hall) as any)}</div>
          {footer ? (footer(hall) as any) : <span />}
        </section>
      ))}
      <div className="feg-mid" style={{ gridColumn: 2, gridRow: 1 }}>
        {view.envoys.length > 0 && (
          <>
            <span className="mp-eyebrow">{t(L.envoys)}</span>
            {view.envoys.map((id) => (
              <Seat key={id} id={id} names={names} kit={kit}>
                {view.revealed[id] && <Chip id={view.revealed[id]!} t={t} />}
              </Seat>
            ))}
          </>
        )}
        {middle as any}
      </div>
    </div>
  );
}

function Display(props: DisplayProps<PublicView>) {
  const { view, kit, t } = props;
  if (!view) return null;
  return (
    <>
      <Styles />
      {view.phase === 'intro' ? <TutorialSlide view={view} kit={kit} t={t} /> : <Board {...props} />}
      {view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />}
    </>
  );
}

const HINTS: Record<NonNullable<PublicView['hint']>, I18nText> = {
  nominate: L.hintNominate,
  share: L.hintShare,
  lock: L.hintLock,
};

function Board({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const names = useNames(platform);
  if (!view) return null;
  const roundEyebrow = `${t(L.round)} ${view.round}/${view.rounds}`;

  if (view.phase === 'mesa' && view.mesa) {
    const m = view.mesa;
    return (
      <div className="feg-wrap">
        <Styles />
        <Header kit={kit} platform={platform} title={t(L.mesaTitle)} sub={t(L.mesaSub)} />
        <div className="feg-body" style={{ gridTemplateRows: 'auto 1fr auto' }}>
          <div className="feg-info">
            <span>
              <b>{m.players}</b> {t(L.players)}
            </span>
            <span>
              <b>{m.preview.length}</b> {t(L.cards)}
            </span>
            {m.bury && <span>⚰ {t(L.buried)}</span>}
          </div>
          <div className="feg-deck">
            {m.preview.map((c, i) => (
              <Card key={`${c}-${i}`} id={c} t={t} size={m.preview.length > 18 ? 'sm' : undefined} />
            ))}
          </div>
          {m.errors.map((e) => (
            <p key={e} className="feg-error">
              {t(MESA_ERRORS[e])}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (view.phase === 'briefing' && view.briefing) {
    const done = view.briefing.done;
    return (
      <div className="feg-wrap">
        <Styles />
        <Header
          kit={kit}
          platform={platform}
          eyebrow={`${view.hostages.join(' · ')} — ${t(L.table)}`}
          title={t(L.briefTitle)}
          sub={t(view.briefing.mode === 'dealer' ? L.briefDealer : L.briefPhone)}
          deadline={view.deadline}
          total={view.total}
        />
        <Halls
          view={view}
          names={names}
          kit={kit}
          t={t}
          seat={(id) => <Seat key={id} id={id} names={names} kit={kit} badge={done.includes(id) ? '✓' : undefined} />}
        />
      </div>
    );
  }

  if (view.phase === 'round') {
    const n = view.hostages[view.round - 1] ?? 1;
    const last = view.round === view.rounds;
    return (
      <div className="feg-wrap">
        <Styles />
        <Header
          kit={kit}
          platform={platform}
          eyebrow={`${roundEyebrow}${last ? ` · ${t(L.lastRound)}` : ''}`}
          title={`${n} ${t(n === 1 ? L.hostage1 : L.hostageN)}`}
          sub={view.hint ? t(HINTS[view.hint]) : view.timed ? t(L.roundSub) : t(L.noClock)}
          deadline={view.timed ? view.deadline : null}
          total={view.total}
        />
        <Halls
          view={view}
          names={names}
          kit={kit}
          t={t}
          seat={(id, hall) => (
            <Seat
              key={id}
              id={id}
              names={names}
              kit={kit}
              lead={!!hall && view.leaders[hall] === id}
              badge={view.tackled.includes(id) ? '🚧' : undefined}
            >
              {view.revealed[id] && <Chip id={view.revealed[id]!} t={t} />}
            </Seat>
          )}
          footer={(hall) => (
            <div className={`feg-status${view.locked[hall] ? ' feg-status--ok' : ''}`}>
              {view.leaders[hall] ? (view.locked[hall] ? `✓ ${t(L.locked)}` : t(L.choosing)) : t(L.noLeader)}
            </div>
          )}
        />
      </div>
    );
  }

  if (view.phase === 'exchange' && view.exchange) {
    const ex = view.exchange;
    return (
      <div className="feg-wrap">
        <Styles />
        <Header kit={kit} platform={platform} eyebrow={roundEyebrow} title={t(L.exTitle)} sub={t(L.exSub)} deadline={view.deadline} total={view.total} />
        <div className="feg-body" style={{ alignContent: 'center', gap: '3em' }}>
          {(['A', 'B'] as Room[]).map((from) => (
            <div key={from} className="feg-arrows mp-enter" style={{ animationDelay: `${from === 'A' ? 2300 : 2600}ms` }}>
              <div className="feg-hallname" style={{ justifyContent: 'flex-end' }}>
                {t(L.hall)} {from}
              </div>
              <div className="feg-cross">
                {ex[from].map((id) => (
                  <Seat key={id} id={id} names={names} kit={kit} active={view.arrived.includes(id)} badge={view.arrived.includes(id) ? '✓' : undefined} />
                ))}
                <span className="feg-arrow" aria-hidden>
                  {from === 'A' ? '→' : '←'}
                </span>
              </div>
              <div className="feg-hallname">
                {t(L.goesTo)} {from === 'A' ? 'B' : 'A'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view.phase === 'pause') {
    const step = view.pause?.step;
    return (
      <div className="feg-wrap">
        <Styles />
        <Header
          kit={kit}
          platform={platform}
          title={view.suddenEnd ? t(L.sudden) : t(L.pauseTitle)}
          sub={step ? t(step === 5 ? L.step5 : step === 10 ? L.step10 : L.step15) : t(L.pauseSub)}
          deadline={view.deadline}
          total={view.total}
          crimson={view.suddenEnd}
        />
        <div className="feg-body" style={{ alignContent: 'center', justifyItems: 'center', gap: '2em' }}>
          {view.pause && (
            <div className="feg-seats">
              {view.pause.choosers.map((id) => (
                <Seat key={id} id={id} names={names} kit={kit} active={view.pause!.chosen.includes(id)} badge={view.pause!.chosen.includes(id) ? '✓' : undefined} />
              ))}
            </div>
          )}
          <Announcements list={view.announcements} names={names} t={t} />
        </div>
      </div>
    );
  }

  if (view.phase === 'reveal' && view.result) return <Reveal view={view} result={view.result} names={names} kit={kit} t={t} platform={platform} />;
  return null;
}

function Announcements({ list, names, t }: { list: Announcement[]; names: Names; t: (x: I18nText) => string }) {
  if (!list.length) return null;
  return (
    <div className="feg-ann">
      {list.map((a, i) => (
        <div key={i} className="feg-ann-row mp-enter">
          <b>{names[a.who]?.name ?? a.who}</b>
          {a.value === null ? (
            <span>{t(L.silent)}</span>
          ) : a.step === 5 ? (
            <Chip id={a.value as CharId} t={t} />
          ) : a.step === 10 ? (
            <span className={`feg-chip feg-chip--${a.value === 'nenhum' ? 'prata' : a.value}`}>
              {t(a.value === 'ouro' ? L.ouro : a.value === 'carmim' ? L.carmim : L.nenhum)}
            </span>
          ) : (
            <span>
              {t(L.shoots)} <b>{names[a.value]?.name ?? a.value}</b>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Reveal({
  view,
  result,
  names,
  kit,
  t,
  platform,
}: {
  view: PublicView;
  result: Result;
  names: Names;
  kit: DisplayProps['kit'];
  t: (x: I18nText) => string;
  platform: DisplayProps['platform'];
}) {
  const halls: Record<Room, string[]> = { A: [], B: [] };
  const outside: string[] = [];
  for (const [id, r] of Object.entries(result.rooms)) (r ? halls[r] : outside).push(id);
  const deadHall = result.boom?.room ?? (result.hitmanId ? result.rooms[result.hitmanId] : null);
  const title = result.tyrant ? L.tyrantWins : result.verdict === 'ouro' ? L.winOuro : result.verdict === 'carmim' ? L.winCarmim : L.winNone;
  const notes: I18nText[] = [];
  if (result.boom) notes.push(result.boom.kind === 'dinamite' ? L.boomDinamite : L.boomGuarda);
  notes.push(result.bossId && result.dead.includes(result.bossId) ? L.bossFell : L.bossLives);
  if (result.doctorOk === false) notes.push(L.doctorMiss);
  if (result.engineerOk === false) notes.push(L.engineerMiss);
  if (result.zombies) notes.push(L.zombiesWin);
  const shown: PublicView = { ...view, rooms: halls, envoys: outside, revealed: {} };
  let i = 0;
  return (
    <div className="feg-wrap">
      <Styles />
      <header className="feg-head">
        <div style={{ width: '100%' }}>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(L.revealTitle)}
          </span>
          <div className={`feg-verdict feg-verdict--${result.tyrant ? 'nenhum' : result.verdict}`}>{t(title)}</div>
          <div className="feg-notes" style={{ marginTop: '.4em' }}>
            {notes.map((n, k) => (
              <span key={k}>{t(n)}</span>
            ))}
            {result.buried && (
              <span>
                {t(L.buriedCard)}: <Chip id={result.buried} t={t} />
              </span>
            )}
          </div>
        </div>
      </header>
      <Halls
        view={shown}
        names={names}
        kit={kit}
        t={t}
        seat={(id) => (
          <Seat
            key={id}
            id={id}
            names={names}
            kit={kit}
            dead={result.dead.includes(id)}
            active={result.winners.includes(id)}
            badge={result.winners.includes(id) ? '★' : undefined}
          >
            <span className="feg-seat-card" style={{ animationDelay: `${600 + i++ * 60}ms` }}>
              <Chip id={result.cards[id]!} t={t} />
            </span>
          </Seat>
        )}
        footer={(hall) =>
          hall === deadHall ? (
            <div className="feg-status" style={{ color: 'var(--crimson-hi)' }}>
              💥 {t(L.fell)}
            </div>
          ) : undefined
        }
      />
      {deadHall && <div className="feg-blast" style={{ ['--x' as any]: deadHall === 'A' ? '25%' : '75%' }} />}
    </div>
  );
}

// ---------------------------------------------------------------- phone

function MyCard({
  view,
  t,
  send,
  names,
  children,
}: {
  view: PlayerView;
  t: (x: I18nText) => string;
  send: (a: unknown) => void;
  names: Names;
  /** Shown only while the card is open (e.g. the power), so a glance at the phone gives nothing away. */
  children?: unknown;
}) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  // A swapped card is flagged on the back, never opened by itself (people may be standing close).
  const [seenSwap, setSeenSwap] = useState(0);
  const swap = view.notices.filter((n) => n.k === 'swapped' || n.k === 'sober').at(-1)?.n ?? 0;
  if (!view.card) return null;
  const def = CATALOG[view.card];
  if (!open) {
    return (
      <div className="feg-mycard">
        <button
          type="button"
          className="feg-back"
          onClick={() => {
            setOpen(true);
            setSeenSwap(swap);
          }}
        >
          {t(swap > seenSwap ? L.cardChanged : L.tapToPeek)}
        </button>
      </div>
    );
  }
  return (
    <div className="feg-mycard">
      <Card id={view.card} t={t} flip />
      <p className="feg-goal">{t(def.goal)}</p>
      <p className="feg-text">{t(def.text)}</p>
      {view.conditions.map((c, i) => (
        <p key={i} className="feg-cond">
          {c.k === 'love' || c.k === 'hate'
            ? fill(t(c.k === 'love' ? L.inLove : L.inHate), { n: names[c.with]?.name ?? c.with })
            : t(COND_RULE[c.k])}
        </p>
      ))}
      <div className="feg-actions" style={{ width: '100%' }}>
        <button type="button" className="feg-pick" onClick={() => setOpen(false)} style={{ justifyContent: 'center' }}>
          {t(L.hide)}
        </button>
        {view.phase === 'round' && view.room && view.allowed.show && !sure && (
          <button type="button" className="feg-pick" onClick={() => setSure(true)} style={{ justifyContent: 'center' }}>
            {t(L.revealRoom)}
          </button>
        )}
      </div>
      {sure && (
        <div className="feg-alert" style={{ width: '100%' }}>
          <p className="feg-text">{t(L.revealRoomSure)}</p>
          <div className="feg-actions">
            <button
              type="button"
              className="feg-pick"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                send({ type: 'showRoom' });
                setSure(false);
              }}
            >
              {t(L.confirm)}
            </button>
            <button type="button" className="feg-pick" style={{ justifyContent: 'center' }} onClick={() => setSure(false)}>
              {t(L.cancel)}
            </button>
          </div>
        </div>
      )}
      <div style={{ width: '100%' }}>{children as any}</div>
    </div>
  );
}

function Mesa({ view, kit, t, send }: { view: PlayerView; kit: PlayerProps['kit']; t: (x: I18nText) => string; send: (a: unknown) => void }) {
  const m = view.mesa!;
  if (!view.isHost) return <p className="feg-note">{t(L.waitHost)}</p>;
  const groups = ['reservas', 'salas', 'compartilhar', 'lideranca', 'atuacao', 'condicoes', 'caos'] as const;
  return (
    <div className="feg-p">
      <p className="feg-label">{t(L.presets)}</p>
      <div className="feg-picks" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {(['basico', 'classico', 'caos'] as const).map((p) => (
          <button key={p} type="button" className="feg-pick" style={{ justifyContent: 'center' }} onClick={() => send({ type: 'preset', id: p })}>
            {t(L[p])}
          </button>
        ))}
      </div>
      {m.canBury && (
        <button type="button" className="feg-unit" aria-pressed={m.bury} onClick={() => send({ type: 'setBury', on: !m.bury })}>
          ⚰ {t(L.bury)}
        </button>
      )}
      {groups.map((g) => (
        <div key={g} className="feg-p" style={{ gap: 6 }}>
          <p className="feg-label">{t(GROUP_NAMES[g])}</p>
          <div className="feg-toggle">
            {UNITS.filter((u) => u.group === g).map((u) => (
              <button
                key={u.id}
                type="button"
                className="feg-unit"
                aria-pressed={m.units.includes(u.id)}
                onClick={() => send({ type: 'toggleUnit', unit: u.id })}
              >
                <span>{u.cards.map((c) => `${GLYPH[c]} ${t(CATALOG[c].name)}`).filter((x, i, a) => a.indexOf(x) === i).join(' · ')}</span>
                {m.warnings.includes(u.id) && <small>{t(L.warnBig)}</small>}
              </button>
            ))}
          </div>
        </div>
      ))}
      {m.errors.map((e) => (
        <p key={e} className="feg-cond">
          {t(MESA_ERRORS[e])}
        </p>
      ))}
      <p className="feg-note">
        {m.preview.length} {t(L.cards)} · {m.players} {t(L.players)}
      </p>
      <kit.Button variant="crimson" block disabled={m.errors.length > 0} onClick={() => send({ type: 'deal' })}>
        {t(L.deal)}
      </kit.Button>
    </div>
  );
}

function Requests({ view, kit, t, send, names }: { view: PlayerView; kit: PlayerProps['kit']; t: (x: I18nText) => string; send: (a: unknown) => void; names: Names }) {
  const nm = (id: string) => names[id]?.name ?? id;
  // A cure offer or a share your conditions forbid would name a role or a condition: neutral until tapped.
  const [opened, setOpened] = useState<string[]>([]);
  return (
    <>
      {view.requestsIn.map((q) =>
        (q.psych || !q.canAccept) && !opened.includes(q.id) ? (
          <button
            key={q.id}
            type="button"
            className="feg-toast mp-enter"
            style={{ border: 0, color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => setOpened([...opened, q.id])}
          >
            {t(L.secretNews)}
          </button>
        ) : (
        <div key={q.id} className="feg-alert">
          <b>{fill(t(q.psych ? L.psychOffer : q.kind === 'card' ? L.wantsShare : L.wantsColor), { n: nm(q.from) })}</b>
          {!q.canAccept && <p className="feg-text">{t(L.cantShareNote)}</p>}
          <div className="feg-actions">
            <kit.Button variant="gold" disabled={!q.canAccept} onClick={() => send({ type: 'answer', id: q.id, accept: true })}>
              {t(L.accept)}
            </kit.Button>
            <kit.Button variant="ghost" onClick={() => send({ type: 'answer', id: q.id, accept: false })}>
              {t(L.decline)}
            </kit.Button>
          </div>
        </div>
        ),
      )}
      {view.requestOut && (
        <div className="feg-toast feg-row feg-row--between">
          <span>{fill(t(L.waitingAnswer), { n: nm(view.requestOut.to) })}</span>
          <kit.Button small variant="ghost" onClick={() => send({ type: 'cancel' })}>
            {t(L.withdraw)}
          </kit.Button>
        </div>
      )}
    </>
  );
}

/** Notices that name a role or a condition: they show a neutral line until tapped. */
const SECRET_NOTICES: Notice['k'][] = [
  'forced', 'enforced', 'love', 'hate', 'cancelled', 'swapped', 'cured', 'condition', 'healed', 'sober',
];

const MESA_ERRORS: Record<MesaError, I18nText> = {
  tooMany: L.errTooMany,
  needBury: L.errNeedBury,
  fewPlayers: L.errFew,
  zombieImmune: L.errZombieImmune,
};

function Notices({ view, t, names }: { view: PlayerView; t: (x: I18nText) => string; names: Names }) {
  const [seenUpTo, setSeenUpTo] = useState(0);
  const [opened, setOpened] = useState<number[]>([]);
  const fresh = view.notices.filter((n) => n.n > seenUpTo).slice(-3);
  if (!fresh.length) return null;
  return (
    <div className="feg-p" style={{ gap: 6 }}>
      {fresh.map((n) => {
        const hidden = SECRET_NOTICES.includes(n.k) && !opened.includes(n.n);
        return (
          <button
            key={n.n}
            type="button"
            className="feg-toast mp-enter"
            style={{ border: 0, color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => (hidden ? setOpened([...opened, n.n]) : setSeenUpTo(n.n))}
          >
            {hidden
              ? t(L.secretNews)
              : n.k === 'condition' && n.cancelled
                ? t(NOTICE.cancelled)
                : fill(t(NOTICE[n.k]), {
                    a: names[n.who ?? '']?.name ?? '',
                    b: names[n.who2 ?? '']?.name ?? '',
                    r: n.room ?? '',
                    c: n.cond ? t(COND[n.cond]) : '',
                  })}
          </button>
        );
      })}
    </div>
  );
}

function Known({ view, t, names, kit }: { view: PlayerView; t: (x: I18nText) => string; names: Names; kit: PlayerProps['kit'] }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="feg-pick" style={{ justifyContent: 'center' }} onClick={() => setOpen(true)}>
        {t(L.showKnown)} ({new Set(view.seen.map((s) => s.who)).size})
      </button>
    );
  }
  const latest = new Map<string, Seen>();
  for (const s of view.seen) {
    const prev = latest.get(s.who);
    if (!prev || s.card || !prev.card) latest.set(s.who, s);
  }
  return (
    <div className="feg-p" style={{ gap: 6 }}>
      <button type="button" className="feg-pick" style={{ justifyContent: 'center' }} onClick={() => setOpen(false)}>
        {t(L.hide)}
      </button>
      <p className="feg-label">{t(L.known)}</p>
      {latest.size === 0 && <p className="feg-text">{t(L.nothingKnown)}</p>}
      <div className="feg-seen">
        {[...latest.values()].reverse().map((s) => (
          <div key={s.who} className="feg-seen-row">
            <kit.Avatar emoji={names[s.who]?.avatar ?? '🎩'} size={28} />
            <b style={{ flex: 1 }}>{names[s.who]?.name ?? s.who}</b>
            {s.card ? (
              <Chip id={s.card} t={t} />
            ) : (
              <span className={`feg-chip feg-chip--${s.look}`}>
                {t(TEAM_LABEL[s.look])} · {t(L.colorOnly)}
              </span>
            )}
            <small>
              {t(SEEN_HOW[s.how])} · R{s.round}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

function PowerPanel({ view, kit, t, send, names, me }: { view: PlayerView; kit: PlayerProps['kit']; t: (x: I18nText) => string; send: (a: unknown) => void; names: Names; me: string }) {
  const [targets, setTargets] = useState<string[]>([]);
  useEffect(() => setTargets([]), [view.power?.ready, view.round]);
  if (!view.power || !view.card) return null;
  const n = POWER_TARGETS[view.power.kind] ?? 0;
  const pool = view.roomMates.filter((id) => id !== me);
  return (
    <kit.Panel className="feg-p">
      <p className="feg-label">
        {t(L.power)} · {GLYPH[view.card]} {t(CATALOG[view.card].name)}
      </p>
      {!view.power.ready ? (
        <p className="feg-text">{t(L.notNow)}</p>
      ) : (
        <>
          {n > 0 && (
            <>
              <p className="feg-text">{fill(t(L.pickTargets), { n })}</p>
              <div className="feg-picks">
                {pool.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="feg-pick"
                    aria-label={names[id]?.name}
                    aria-pressed={targets.includes(id)}
                    onClick={() =>
                      setTargets((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-n)))
                    }
                  >
                    <kit.Avatar emoji={names[id]?.avatar ?? '🎩'} size={26} />
                    {names[id]?.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <kit.Button
            variant="crimson"
            block
            disabled={targets.length !== n}
            onClick={() => {
              send({ type: 'power', targets });
              setTargets([]);
            }}
          >
            {t(L.usePower)}
          </kit.Button>
        </>
      )}
    </kit.Panel>
  );
}

function LeaderPanel({ view, kit, t, send, names }: { view: PlayerView; kit: PlayerProps['kit']; t: (x: I18nText) => string; send: (a: unknown) => void; names: Names }) {
  if (!view.isLeader) {
    if (!view.picks.length) return null;
    return <p className="feg-text">{fill(t(L.hallPicks), { n: view.picks.map((id) => names[id]?.name ?? id).join(', ') })}</p>;
  }
  if (view.locked) {
    return (
      <kit.Panel>
        <p className="feg-title">✓ {fill(t(L.lockedNote), { n: view.picks.map((id) => names[id]?.name ?? id).join(', ') })}</p>
      </kit.Panel>
    );
  }
  return (
    <kit.Panel className="feg-p">
      <p className="feg-title">{fill(t(L.hostagesPick), { n: view.need })}</p>
      <div className="feg-picks">
        {view.eligible.map((id) => (
          <button
            key={id}
            type="button"
            className="feg-pick"
            aria-label={names[id]?.name}
            aria-pressed={view.picks.includes(id)}
            onClick={() => send({ type: 'toggleHostage', target: id })}
          >
            <kit.Avatar emoji={names[id]?.avatar ?? '🎩'} size={26} />
            {names[id]?.name}
          </button>
        ))}
      </div>
      <kit.Button variant="crimson" block disabled={view.picks.length !== view.need} onClick={() => send({ type: 'lockHostages' })}>
        {t(L.lock)}
      </kit.Button>
    </kit.Panel>
  );
}

function People({ view, kit, t, send, names, me }: { view: PlayerView; kit: PlayerProps['kit']; t: (x: I18nText) => string; send: (a: unknown) => void; names: Names; me: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const list = view.envoy ? view.reachable : view.roomMates.filter((id) => id !== me);
  const myPoint = view.points[me] ?? null;
  const tally: Record<string, number> = {};
  for (const target of Object.values(view.points)) if (target) tally[target] = (tally[target] ?? 0) + 1;
  const hallSize = view.roomMates.length;
  const leaderOffer = view.offer && view.offer.to === me ? view.offer : null;

  return (
    <div className="feg-p" style={{ gap: 8 }}>
      {leaderOffer && (
        <div className="feg-alert">
          <b>{fill(t(L.offersLead), { n: names[leaderOffer.from]?.name ?? '' })}</b>
          <div className="feg-actions">
            <kit.Button variant="gold" onClick={() => send({ type: 'answerLead', accept: true })}>
              {t(L.accept)}
            </kit.Button>
            <kit.Button variant="ghost" onClick={() => send({ type: 'answerLead', accept: false })}>
              {t(L.decline)}
            </kit.Button>
          </div>
        </div>
      )}
      {Object.entries(tally)
        .filter(([id]) => id !== view.leader)
        .map(([id, n]) => (
          <p key={id} className="feg-text">
            ✋ {fill(t(L.votesFor), { n, m: hallSize, who: names[id]?.name ?? id })}
          </p>
        ))}
      <p className="feg-label">{t(view.envoy ? L.everyone : L.people)}</p>
      <div className="feg-people">
        {list.map((id) => {
          const isOpen = open === id;
          const canReach = view.reachable.includes(id);
          return (
            <div key={id} className={`feg-person${isOpen ? ' feg-person--open' : ''}`}>
              <button type="button" className="feg-person-head" aria-label={names[id]?.name} onClick={() => setOpen(isOpen ? null : id)}>
                <kit.Avatar emoji={names[id]?.avatar ?? '🎩'} size={34} offline={names[id] ? !names[id]!.connected : false} />
                <span className="feg-person-name">{names[id]?.name ?? id}</span>
                <span className="feg-person-tags">
                  {view.leader === id && <span className="feg-chip feg-chip--ouro">♛ {t(L.leader)}</span>}
                  {view.tackled.includes(id) && <span className="feg-chip feg-chip--prata">🚧 {t(L.tackled)}</span>}
                  {myPoint === id && <span className="feg-chip feg-chip--carmim">✋</span>}
                </span>
              </button>
              {isOpen && canReach && (
                <div className="feg-actions">
                  <kit.Button
                    small
                    variant="gold"
                    disabled={!!view.requestOut || !view.allowed.cardShare}
                    onClick={() => send({ type: 'request', to: id, kind: 'card' })}
                  >
                    {t(L.askCard)}
                  </kit.Button>
                  {view.big && (
                    <kit.Button
                      small
                      variant="gold"
                      disabled={!!view.requestOut || !view.allowed.colorShare}
                      onClick={() => send({ type: 'request', to: id, kind: 'color' })}
                    >
                      {t(L.askColor)}
                    </kit.Button>
                  )}
                  <kit.Button small variant="ghost" disabled={!view.allowed.show} onClick={() => send({ type: 'show', to: id, kind: 'card' })}>
                    {t(L.showCard)}
                  </kit.Button>
                  {view.big && (
                    <kit.Button small variant="ghost" disabled={!view.allowed.show} onClick={() => send({ type: 'show', to: id, kind: 'color' })}>
                      {t(L.showColor)}
                    </kit.Button>
                  )}
                  {!view.envoy && !view.leader && (
                    <kit.Button small variant="crimson" onClick={() => send({ type: 'nominate', target: id })}>
                      {t(L.nominate)}
                    </kit.Button>
                  )}
                  {!view.envoy && view.leader && view.leader !== id && (
                    <kit.Button small variant="crimson" onClick={() => send({ type: 'point', target: myPoint === id ? null : id })}>
                      {t(myPoint === id ? L.unpoint : L.pointAt)}
                    </kit.Button>
                  )}
                  {view.isLeader && view.noReturn !== id && (
                    <kit.Button small variant="ghost" onClick={() => send({ type: 'offerLead', target: id })}>
                      {t(L.handOver)}
                    </kit.Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!view.envoy && view.leader && view.leader !== me && (
        <kit.Button small variant={myPoint === me ? 'crimson' : 'ghost'} onClick={() => send({ type: 'point', target: myPoint === me ? null : me })}>
          {myPoint === me ? t(L.unpoint) : `${t(L.pointAt)} (${names[me]?.name ?? ''})`}
        </kit.Button>
      )}
    </div>
  );
}

function PauseChoice({ view, kit, t, send, names }: { view: PlayerView; kit: PlayerProps['kit']; t: (x: I18nText) => string; send: (a: unknown) => void; names: Names }) {
  const p = view.pause!;
  if (!p.mine) return <p className="feg-note">{t(L.watchTv)}</p>;
  if (p.choice) return <p className="feg-title">✓ {t(L.announced)}</p>;
  const label = p.step === 5 ? L.guessBuried : p.step === 10 ? L.guessFamily : L.guessShot;
  return (
    <kit.Panel className="feg-p">
      <p className="feg-label">{t(L.yourTurn)}</p>
      <p className="feg-title">{t(label)}</p>
      <div className="feg-picks">
        {p.options.map((o) => (
          <button key={o} type="button" className="feg-pick" onClick={() => send({ type: 'pauseChoice', value: o })}>
            {p.step === 5 ? (
              <>
                {GLYPH[o as CharId]} {t(CATALOG[o as CharId].name)}
              </>
            ) : p.step === 10 ? (
              t(o === 'ouro' ? L.ouro : o === 'carmim' ? L.carmim : L.nenhum)
            ) : (
              <>
                <kit.Avatar emoji={names[o]?.avatar ?? '🎩'} size={26} />
                {names[o]?.name ?? o}
              </>
            )}
          </button>
        ))}
      </div>
    </kit.Panel>
  );
}

function Player(props: PlayerProps<PlayerView>) {
  const { view, kit, t, send, you } = props;
  const [rules, setRules] = useState(false);
  if (!view) return null;
  const isHost = you.isAdmin;
  // The rules are one tap away in every phase.
  const footer = (
    <>
      <kit.Button block small variant="ghost" onClick={() => setRules(true)}>
        📖 {t(L.rules)}
      </kit.Button>
      {rules && <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />}
    </>
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return (
      <div className="feg-p">
        <Styles />
        <kit.Panel className="feg-p" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <p className="feg-title">{t(SLIDES[view.slide]!.title)}</p>
          {!isHost && <p className="feg-note">{t(L.followTv)}</p>}
        </kit.Panel>
        {isHost && (
          <>
            <div className="feg-actions">
              <kit.Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
                ‹ {t(L.prev)}
              </kit.Button>
              <kit.Button onClick={() => send({ type: 'intro', dir: 1 })}>
                {last ? t(L.startDeck) : `${t(L.next)} ›`}
              </kit.Button>
            </div>
            {!last && (
              <kit.Button block small variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
                {t(L.skip)}
              </kit.Button>
            )}
          </>
        )}
        {footer}
      </div>
    );
  }
  return (
    <div className="feg-p">
      <PlayerBody {...props} />
      {footer}
    </div>
  );
}

function PlayerBody({ view, kit, t, send, platform, you: me }: PlayerProps<PlayerView>) {
  const names = useNames(platform);
  if (!view) return null;
  const myIdNow = me.you;

  if (view.phase === 'mesa') {
    return (
      <div className="feg-p">
        <Styles />
        <Mesa view={view} kit={kit} t={t} send={send} />
      </div>
    );
  }

  const hallLine = view.envoy ? t(L.youEnvoy) : view.room ? fill(t(L.inHall), { r: view.room }) : '';

  if (view.phase === 'briefing') {
    return (
      <div className="feg-p">
        <Styles />
        {view.room && <p className="feg-big">{fill(t(L.goHall), { r: view.room })}</p>}
        {view.envoy && <p className="feg-big">{t(L.youEnvoy)}</p>}
        {view.card ? (
          <MyCard view={view} t={t} send={send} names={names} />
        ) : (
          <p className="feg-note">{t(L.goDealer)}</p>
        )}
        {view.briefingMode === 'phone' &&
          (view.ready ? (
            <p className="feg-note">{t(L.waitingOthers)}</p>
          ) : (
            <kit.Button variant="gold" block onClick={() => send({ type: 'ready' })}>
              {t(L.ready)}
            </kit.Button>
          ))}
      </div>
    );
  }

  if (view.phase === 'round') {
    return (
      <div className="feg-p">
        <Styles />
        <div className="feg-row feg-row--between">
          <div>
            <p className="feg-label">
              {t(L.round)} {view.round}/{view.rounds}
            </p>
            <b>{hallLine}</b>
            <p className="feg-text">
              {view.isLeader ? t(L.youLead) : view.leader ? fill(t(L.leaderIs), { n: names[view.leader]?.name ?? '' }) : t(L.noLeader)}
            </p>
          </div>
          {view.deadline && <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size={64} paused={!!platform.paused} />}
        </div>
        <Requests view={view} kit={kit} t={t} send={send} names={names} />
        <Notices view={view} t={t} names={names} />
        <LeaderPanel view={view} kit={kit} t={t} send={send} names={names} />
        <MyCard view={view} t={t} send={send} names={names}>
          <PowerPanel view={view} kit={kit} t={t} send={send} names={names} me={myIdNow} />
        </MyCard>
        <People view={view} kit={kit} t={t} send={send} names={names} me={myIdNow} />
        <Known view={view} t={t} names={names} kit={kit} />
      </div>
    );
  }

  if (view.phase === 'exchange') {
    return (
      <div className="feg-p">
        <Styles />
        {view.hostage ? (
          <>
            <p className="feg-big">{fill(t(L.hostageGo), { r: view.hostage })}</p>
            {view.arrived ? (
              <p className="feg-note">{t(L.waitingOthers)}</p>
            ) : (
              <kit.Button variant="gold" block onClick={() => send({ type: 'arrived' })}>
                {t(L.arrived)}
              </kit.Button>
            )}
          </>
        ) : (
          <p className="feg-note">{t(L.stayPut)}</p>
        )}
        <Notices view={view} t={t} names={names} />
        <MyCard view={view} t={t} send={send} names={names} />
      </div>
    );
  }

  if (view.phase === 'pause' && view.pause) {
    return (
      <div className="feg-p">
        <Styles />
        <PauseChoice view={view} kit={kit} t={t} send={send} names={names} />
        <Known view={view} t={t} names={names} kit={kit} />
      </div>
    );
  }

  if (view.phase === 'reveal' && view.result) {
    const won = view.result.winners.includes(myIdNow);
    const card = view.result.cards[myIdNow];
    return (
      <kit.Panel className="feg-p" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <Styles />
        <p className="feg-big">{t(won ? L.youWon : L.youLost)}</p>
        {card && (
          <>
            <p className="feg-label">{t(L.endedAs)}</p>
            <Card id={card} t={t} />
          </>
        )}
        <p className="feg-note">{t(L.watchTv)}</p>
      </kit.Panel>
    );
  }

  return (
    <div className="feg-p">
      <Styles />
      <p className="feg-note">{t(L.watchTv)}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Dealer

function Dealer({ view, t }: DealerProps<DealerView>) {
  if (!view?.card) {
    return (
      <div className="feg-dealer">
        <Styles />
        <h1 className="feg-h1">{t(L.dealerIdle)}</h1>
      </div>
    );
  }
  const def = CATALOG[view.card];
  return (
    <div className="feg-dealer">
      <Styles />
      <Card id={view.card} t={t} flip />
      <p className="feg-sub" style={{ maxWidth: '30em' }}>
        {t(def.goal)}
      </p>
      <p className="feg-text" style={{ fontSize: 'min(1.4em, 4cqw)', maxWidth: '40em' }}>
        {t(def.text)}
      </p>
      {view.room && <p className="feg-sub">{fill(t(L.goHall), { r: view.room })}</p>}
      <p className="mp-eyebrow">{t(L.memorize)}</p>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });
