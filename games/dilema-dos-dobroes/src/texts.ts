import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms; {coin} for the
// doubloon icon, {gold} / {crimson} for the team marks, {min} / {sec} for the round and visit
// lengths from the Host settings (see `rich()` in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type SlideDemo = 'teams' | 'deposit' | 'reveal' | 'ranking' | 'clock';

/** Tutorial slides shown on the TV before the first round (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: SlideDemo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'teams',
    body: [
      tx(
        'Vocês serão sorteados em **dois times**: {gold} **Ouro** e {crimson} **Carmesim**.',
        'You will be drawn into **two teams**: {gold} **Gold** and {crimson} **Crimson**.',
      ),
      tx(
        'Cada um recebe **10 dobrões** {coin} para a partida inteira. Ninguém ganha mais — só gasta.',
        'Everyone gets **10 doubloons** {coin} for the whole match. Nobody earns more — you only spend.',
      ),
      tx(
        'O dilema: seu time precisa vencer, mas **você** quer terminar com o bolso cheio.',
        'The dilemma: your team needs to win, but **you** want to finish with a full pocket.',
      ),
    ],
  },
  {
    title: tx('O depósito', 'The deposit'),
    demo: 'deposit',
    body: [
      tx(
        'A cada rodada, cada um vai **uma vez** ao **Dealer**. Só lá você vê quantos dobrões tem.',
        'Each round, everyone visits the **Dealer** **once**. Only there do you see how many doubloons you have.',
      ),
      tx(
        'No celular, escolha quanto jogar no **pote**, de 0 até o que tem, e toque em **Depositar**.',
        'On your phone, choose how much to drop in the **pot**, from 0 up to what you have, and tap **Deposit**.',
      ),
      tx('O que cai no pote **some para sempre**.', 'Whatever goes in the pot is **gone for good**.'),
    ],
  },
  {
    title: tx('A revelação', 'The reveal'),
    demo: 'reveal',
    body: [
      tx(
        'Vence a rodada o time que, **somado**, depositou mais.',
        'The team whose deposits **add up** to more wins the round.',
      ),
      tx(
        'A TV mostra quanto o **time perdedor** depositou. O total do vencedor fica **em segredo**.',
        'The TV shows how much the **losing team** deposited. The winner’s total stays **secret**.',
      ),
      tx(
        '**Empate**: os dobrões voltam para os donos e a rodada é jogada de novo.',
        '**Tie**: the doubloons go back to their owners and the round is played again.',
      ),
    ],
  },
  {
    title: tx('Quem vence', 'Who wins'),
    demo: 'ranking',
    body: [
      tx(
        'O primeiro time a vencer **3 rodadas** vence a partida (no máximo 5 rodadas).',
        'The first team to win **3 rounds** wins the match (5 rounds at most).',
      ),
      tx(
        'Mas o ranking é **individual**: primeiro o time vencedor, do mais rico ao mais pobre; depois o perdedor.',
        'But the ranking is **individual**: first the winning team, richest to poorest; then the losing team.',
      ),
      tx(
        'Ou seja: o melhor lugar é estar no time vencedor **gastando menos** que os colegas.',
        'So the best place is on the winning team, **spending less** than your teammates.',
      ),
    ],
  },
  {
    title: tx('Sem enrolar', 'No stalling'),
    demo: 'clock',
    body: [
      tx(
        'Cada rodada dura **{min} minutos**; ela acaba antes se todos já depositaram.',
        'Each round lasts **{min} minutes**; it ends early once everyone has deposited.',
      ),
      tx(
        'No Dealer você tem **{sec} segundos**. Estourou, saiu sem confirmar ou não foi: depósito de **0**.',
        'At the Dealer you have **{sec} seconds**. Time out, leave without confirming or never go: you deposit **0**.',
      ),
    ],
  },
];

/** The full rules, readable on any phone at any time and showable on the TV by the Host. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo de times e traição silenciosa para **4 a 12 pessoas, em número par**. Precisa do **Dealer**.',
        'A game of teams and quiet betrayal for **4 to 12 people, an even number**. It needs the **Dealer**.',
      ),
      tx(
        'Dois times disputam rodadas depositando dobrões {coin} num pote. Vence a partida o time que ganhar **3 rodadas** — mas cada jogador é ranqueado pelos dobrões que **guardou**.',
        'Two teams battle over rounds by dropping doubloons {coin} into a pot. The team that wins **3 rounds** wins the match — but each player is ranked by the doubloons they **kept**.',
      ),
    ],
  },
  {
    title: tx('Times e dobrões', 'Teams and doubloons'),
    body: [
      tx(
        '**Times**: no início o jogo sorteia dois times do mesmo tamanho, {gold} **Ouro** e {crimson} **Carmesim**. A TV mostra quem é de qual time.',
        '**Teams**: at the start the game draws two teams of equal size, {gold} **Gold** and {crimson} **Crimson**. The TV shows who is on which team.',
      ),
      tx(
        '**Dobrões**: cada jogador começa com **10** para a partida toda e nunca recebe mais. Você só mexe nos seus.',
        '**Doubloons**: each player starts with **10** for the whole match and never gets more. You only touch your own.',
      ),
      tx(
        '**Segredo**: seu saldo só aparece no **Dealer**. Ninguém mais o vê até o fim — nem no seu celular.',
        '**Secret**: your balance only shows at the **Dealer**. Nobody else sees it until the end — not even your phone.',
      ),
    ],
  },
  {
    title: tx('O Dealer e o depósito', 'The Dealer and the deposit'),
    body: [
      tx(
        'Durante a rodada, toque em **Ir ao Dealer**, entre na fila e, na sua vez, vá até a sala do Dealer e digite o código.',
        'During the round, tap **Go to the Dealer**, join the queue and, at your turn, walk to the Dealer room and type the code.',
      ),
      tx(
        'Lá a tela mostra seu saldo. No celular, use **−** e **+** para escolher de **0** até tudo o que tem e toque em **Depositar**. A escolha é **final** e você sai do Dealer.',
        'There the screen shows your balance. On your phone, use **−** and **+** to choose from **0** up to everything you have and tap **Deposit**. The choice is **final** and you leave the Dealer.',
      ),
      tx(
        'Cada jogador visita o Dealer **uma vez por rodada**. Os dobrões depositados vão para o **pote** e somem.',
        'Each player visits the Dealer **once per round**. Deposited doubloons go into the **pot** and vanish.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Depósitos**: todos visitam o Dealer. A TV marca com ✓ quem já depositou (nunca o valor).',
        '**1 · Deposits**: everyone visits the Dealer. The TV marks with ✓ who has deposited (never the amount).',
      ),
      tx(
        '**2 · Revelação**: quando todos depositaram, ou o tempo acabou, a TV revela o time que **somou mais** — esse vence a rodada.',
        '**2 · Reveal**: once everyone has deposited, or time runs out, the TV reveals the team that **added up to more** — that team wins the round.',
      ),
      tx(
        'A TV mostra o total do **time perdedor**. O total do **vencedor** fica escondido até o fim da partida.',
        'The TV shows the **losing team’s** total. The **winner’s** total stays hidden until the end of the match.',
      ),
      tx(
        'Cada rodada dura **15 minutos** por padrão (o Host pode mudar de 5 a 20).',
        'Each round lasts **15 minutes** by default (the Host can set 5 to 20).',
      ),
    ],
  },
  {
    title: tx('Empates e finais especiais', 'Ties and special endings'),
    body: [
      tx(
        '**Empate**: a TV mostra só “Empate!”, sem valores. Todo dobrão depositado na rodada **volta para o dono** e a rodada é jogada de novo — ela não conta no limite de 5.',
        '**Tie**: the TV only says “Tie!”, with no amounts. Every doubloon deposited that round **goes back to its owner** and the round is played again — it doesn’t count towards the limit of 5.',
      ),
      tx(
        '**Todos zerados**: se, depois de uma revelação, os dois times não tiverem mais nenhum dobrão, a partida acaba na hora. Vence quem tiver mais rodadas; com rodadas iguais, é **empate** e ninguém pontua.',
        '**Everyone broke**: if, after a reveal, neither team has a single doubloon left, the match ends at once. More round wins wins; with equal wins it is a **draw** and nobody scores.',
      ),
      tx(
        '**Empates seguidos**: depois de **3 empates seguidos** a partida acaba do mesmo jeito.',
        '**Ties in a row**: after **3 ties in a row** the match ends the same way.',
      ),
      tx(
        '**Quem cai**: um jogador que perde a conexão e não volta deposita 0 enquanto estiver fora.',
        '**Dropped players**: a player who loses connection and doesn’t come back deposits 0 while away.',
      ),
    ],
  },
  {
    title: tx('Sem enrolar', 'No stalling'),
    body: [
      tx(
        '**Visita curta**: no Dealer você tem **30 segundos** (o Host pode mudar de 15 a 60). Quando acaba, o jogo te tira de lá.',
        '**Short visit**: at the Dealer you have **30 seconds** (the Host can set 15 to 60). When it runs out, the game sends you out.',
      ),
      tx(
        '**Faltou, é zero**: se você estourar o tempo, sair sem confirmar ou não for ao Dealer antes do fim da rodada, seu depósito é **0** — e sua vez na rodada acaba.',
        '**Missed means zero**: if you run out of time, leave without confirming or don’t reach the Dealer before the round ends, your deposit is **0** — and your turn this round is over.',
      ),
      tx(
        'Assim, ninguém consegue segurar a fila para atrapalhar o outro time: a fila anda sempre.',
        'So nobody can hold the queue to hurt the other team: the line always moves.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'A partida acaba quando um time vence **3 rodadas** (no máximo 5 rodadas valendo). A TV então revela o saldo de cada um e os totais escondidos de cada rodada.',
        'The match ends when a team wins **3 rounds** (5 counted rounds at most). The TV then reveals everyone’s balance and every hidden total.',
      ),
      tx(
        '**Ranking**: primeiro os jogadores do time vencedor, do maior para o menor saldo; depois os do perdedor, na mesma ordem. Saldos iguais **dividem** a posição.',
        '**Ranking**: first the winning team’s players, from highest to lowest balance; then the losing team’s, in the same order. Equal balances **share** the place.',
      ),
      tx(
        '**Pontos**: cada um ganha *jogadores − posição + 1* (com 6: 6, 5, 4, 3, 2, 1), somados ao placar da sala.',
        '**Points**: each player scores *players − place + 1* (with 6: 6, 5, 4, 3, 2, 1), added to the room scoreboard.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText = tx(
  'Inspirado num jogo principal do 8º episódio de The Genius: Rules of the Game (programa coreano). Versão não oficial; textos e arte originais.',
  'Inspired by a main match from episode 8 of The Genius: Rules of the Game (Korean TV show). Unofficial version; original texts and art.',
);
