import { createContext, useContext } from 'react';
import type { Lang } from '@mp/protocol';
import type { GameManifest, I18nText } from '@mp/game-sdk';

const pt = {
  'brand.name': 'Noir Club',
  'brand.tagline': 'Onde cada jogador esconde algo.',
  'home.create': 'Criar sala',
  'home.join': 'Entrar na sala',
  'home.code': 'Código da sala',
  'home.tv': 'Usar como TV / Dealer',
  'home.tvHint': 'Abra este site na TV e escolha esta opção.',
  'home.notFound': 'Sala não encontrada',
  'join.title': 'Quem é você?',
  'join.name': 'Apelido',
  'join.avatar': 'Seu sigilo',
  'join.enter': 'Sentar à mesa',
  'join.remote': 'Estou jogando remotamente',
  'lobby.waiting': 'Aguardando o Host escolher um jogo…',
  'lobby.players': 'Jogadores',
  'lobby.join': 'Entre em',
  'lobby.withCode': 'com o código',
  'lobby.scan': 'ou aponte a câmera',
  'lobby.chosen': 'Jogo escolhido',
  'lobby.need': 'Precisa de {min} a {max} jogadores',
  'lobby.needStep': 'Precisa de {min} a {max} jogadores, de {step} em {step}',
  'lobby.even': 'pares',
  'admin.title': 'Mesa do Host',
  'admin.games': 'Jogos',
  'admin.game': 'Jogo',
  'admin.noGameYet': 'Nenhum jogo escolhido ainda.',
  'admin.pickGame': 'Escolher jogo',
  'admin.changeGame': 'Trocar jogo',
  'admin.searchGames': 'Buscar jogo',
  'admin.filters': 'Filtros',
  'admin.filterAll': 'Todos',
  'admin.filterDuel': 'Solo e duelo',
  'admin.filterGroup': 'Grupos',
  'admin.filterFits': 'Cabem na sala ({n})',
  'admin.filterQuick': 'Até {n} min',
  'admin.recent': 'Recentes',
  'admin.allGames': 'Todos os jogos',
  'admin.results': 'Resultados',
  'admin.clearFilters': 'Limpar',
  'admin.back': 'Voltar',
  'admin.chooseThis': 'Escolher este jogo',
  'admin.noGamesFound': 'Nenhum jogo encontrado.',
  'admin.close': 'Fechar',
  'admin.selected': 'Escolhido',
  'admin.config': 'Configuração',
  'admin.start': 'Começar',
  'admin.settings': 'Sala',
  'admin.sharedHost': 'Host compartilhado (o Display roda o jogo)',
  'admin.lang': 'Idioma das telas',
  'admin.tvs': 'Telas',
  'admin.tvCode': 'Código mostrado na TV',
  'admin.asDisplay': 'Display',
  'admin.asDealer': 'Dealer',
  'admin.kick': 'Remover',
  'admin.backToLobby': 'Voltar ao lobby',
  'admin.noDisplay': 'Nenhum Display conectado',
  'admin.engineHere': 'O jogo está rodando neste celular. Mantenha a tela ligada.',
  'player.spectator': 'Você está assistindo. Entra na próxima partida.',
  'player.loading': 'Preparando a mesa…',
  'player.results': 'Fim de jogo',
  'dealer.request': 'Ir ao Dealer',
  'dealer.queued': 'Na fila do Dealer — posição {n}',
  'dealer.cancel': 'Sair da fila',
  'dealer.called': 'Sua vez! Vá até o Dealer e digite o código da tela.',
  'dealer.attempts': '{n} tentativas restantes',
  'dealer.confirm': 'Confirmar',
  'dealer.inside': 'Você está com o Dealer',
  'dealer.leave': 'Sair do Dealer',
  'dealer.waiting': 'O Dealer aguarda…',
  'dealer.next': 'Próximo',
  'dealer.queue': 'Fila',
  'dealer.goTo': 'Dirija-se ao Dealer',
  'dealer.typeCode': 'Digite este código no seu celular',
  'dealer.remote': 'Visita remota em andamento',
  'tv.pairTitle': 'Conectar esta tela',
  'tv.pairHint': 'No celular do Host, abra Telas e digite:',
  'tv.tapSound': 'Toque para ativar o som',
  'tv.reset': 'Desconectar esta tela',
  'status.reconnecting': 'Reconectando…',
  'status.engineOffline': 'O Host caiu. Aguardando reconexão…',
  'status.engineMigrating': 'Transferindo a mesa para o Display…',
  'status.paused': '{name} desconectou. Aguardando…',
  'status.kicked': 'Você foi removido da sala.',
  'results.title': 'Placar',
  'results.points': 'pts',
  'lang.label': 'Idioma',
  'links.title': 'Ajude a melhorar o Noir Club',
  'links.suggest': 'Sugerir um jogo',
  'links.bug': 'Reportar um bug',
  'links.copyright': 'Direitos autorais',
  'links.notice':
    'Noir Club é um projeto independente de jogos sociais. Se algum conteúdo aqui é seu e foi usado sem permissão, envie uma reivindicação de direitos autorais.',
  'links.opensNewTab': 'abre em nova aba',
  'results.feedback': 'Algo deu errado ou tem uma ideia?',
} as const;

type Key = keyof typeof pt;

const en: Record<Key, string> = {
  'brand.name': 'Noir Club',
  'brand.tagline': 'Where every player hides something.',
  'home.create': 'Create room',
  'home.join': 'Join room',
  'home.code': 'Room code',
  'home.tv': 'Use as TV / Dealer',
  'home.tvHint': 'Open this site on the TV and pick this option.',
  'home.notFound': 'Room not found',
  'join.title': 'Who are you?',
  'join.name': 'Nickname',
  'join.avatar': 'Your sigil',
  'join.enter': 'Take a seat',
  'join.remote': "I'm playing remotely",
  'lobby.waiting': 'Waiting for the Host to pick a game…',
  'lobby.players': 'Players',
  'lobby.join': 'Go to',
  'lobby.withCode': 'with code',
  'lobby.scan': 'or scan',
  'lobby.chosen': 'Chosen game',
  'lobby.need': 'Needs {min} to {max} players',
  'lobby.needStep': 'Needs {min} to {max} players, in steps of {step}',
  'lobby.even': 'even',
  'admin.title': "Host's table",
  'admin.games': 'Games',
  'admin.game': 'Game',
  'admin.noGameYet': 'No game chosen yet.',
  'admin.pickGame': 'Choose a game',
  'admin.changeGame': 'Change game',
  'admin.searchGames': 'Search games',
  'admin.filters': 'Filters',
  'admin.filterAll': 'All',
  'admin.filterDuel': 'Solo & duel',
  'admin.filterGroup': 'Groups',
  'admin.filterFits': 'Fit the room ({n})',
  'admin.filterQuick': 'Up to {n} min',
  'admin.recent': 'Recent',
  'admin.allGames': 'All games',
  'admin.results': 'Results',
  'admin.clearFilters': 'Clear',
  'admin.back': 'Back',
  'admin.chooseThis': 'Choose this game',
  'admin.noGamesFound': 'No games found.',
  'admin.close': 'Close',
  'admin.selected': 'Chosen',
  'admin.config': 'Settings',
  'admin.start': 'Start',
  'admin.settings': 'Room',
  'admin.sharedHost': 'Shared host (the Display runs the game)',
  'admin.lang': 'Screen language',
  'admin.tvs': 'Screens',
  'admin.tvCode': 'Code shown on the TV',
  'admin.asDisplay': 'Display',
  'admin.asDealer': 'Dealer',
  'admin.kick': 'Remove',
  'admin.backToLobby': 'Back to lobby',
  'admin.noDisplay': 'No Display connected',
  'admin.engineHere': 'The game runs on this phone. Keep the screen on.',
  'player.spectator': "You're watching. You'll join the next match.",
  'player.loading': 'Setting the table…',
  'player.results': 'Game over',
  'dealer.request': 'Go to the Dealer',
  'dealer.queued': 'In the Dealer queue — position {n}',
  'dealer.cancel': 'Leave queue',
  'dealer.called': 'Your turn! Go to the Dealer and type the code on screen.',
  'dealer.attempts': '{n} attempts left',
  'dealer.confirm': 'Confirm',
  'dealer.inside': "You're with the Dealer",
  'dealer.leave': 'Leave the Dealer',
  'dealer.waiting': 'The Dealer awaits…',
  'dealer.next': 'Next',
  'dealer.queue': 'Queue',
  'dealer.goTo': 'Proceed to the Dealer',
  'dealer.typeCode': 'Type this code on your phone',
  'dealer.remote': 'Remote visit in progress',
  'tv.pairTitle': 'Connect this screen',
  'tv.pairHint': "On the Host's phone, open Screens and type:",
  'tv.tapSound': 'Tap to enable sound',
  'tv.reset': 'Disconnect this screen',
  'status.reconnecting': 'Reconnecting…',
  'status.engineOffline': 'The Host dropped. Waiting to reconnect…',
  'status.engineMigrating': 'Moving the table to the Display…',
  'status.paused': '{name} disconnected. Waiting…',
  'status.kicked': 'You were removed from the room.',
  'results.title': 'Scoreboard',
  'results.points': 'pts',
  'lang.label': 'Language',
  'links.title': 'Help improve Noir Club',
  'links.suggest': 'Suggest a game',
  'links.bug': 'Report a bug',
  'links.copyright': 'Copyright',
  'links.notice':
    'Noir Club is an independent social-games project. If any content here is yours and was used without permission, submit a copyright claim.',
  'links.opensNewTab': 'opens in a new tab',
  'results.feedback': 'Something went wrong or have an idea?',
};

const dicts: Record<Lang, Record<Key, string>> = { 'pt-BR': pt, en };

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('mp.lang');
    if (saved === 'en' || saved === 'pt-BR') return saved;
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function makeT(lang: Lang) {
  const dict = dicts[lang];
  return (key: Key, vars?: Record<string, string | number>) => {
    let s: string = dict[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

export type T = ReturnType<typeof makeT>;

export const LangContext = createContext<Lang>('pt-BR');

/** Changes this device's language (saved for next visits). Screens that follow the room's language override LangContext. */
export const SetLangContext = createContext<(lang: Lang) => void>(() => {});

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem('mp.lang', lang);
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
  document.documentElement.lang = lang;
}

export function useSetLang() {
  return useContext(SetLangContext);
}

export function useT() {
  const lang = useContext(LangContext);
  return { t: makeT(lang), lang, tg: (text: I18nText) => text[lang] ?? text['pt-BR'] };
}

/** "4–12", or "4–12 · pares" when the game only starts with every second count. */
export function playerRange(m: Pick<GameManifest, 'minPlayers' | 'maxPlayers' | 'playerStep'>, t: T) {
  const range = m.minPlayers === m.maxPlayers ? `${m.minPlayers}` : `${m.minPlayers}–${m.maxPlayers}`;
  const step = m.playerStep ?? 1;
  if (step <= 1) return range;
  return step === 2 && m.minPlayers % 2 === 0 ? `${range} · ${t('lobby.even')}` : `${range} · +${step}`;
}
