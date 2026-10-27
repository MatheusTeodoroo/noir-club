import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms (see `rich()`
// in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** Tutorial slides shown on the TV before the first round (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'duel' | 'board' | 'actions' | 'reveal' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'duel',
    body: [
      tx(
        'Um duelo entre **dois jogadores**. Cada rodada, cada um recebe uma carta de **1 a 10**.',
        'A duel between **two players**. Each round, each of you gets a card from **1 to 10**.',
      ),
      tx(
        'É uma carta **na testa**: o seu celular mostra a carta do **rival** — nunca a sua.',
        'It is a card **on your brow**: your phone shows your **rival’s** card — never your own.',
      ),
      tx(
        'Carta maior leva o pote. Quem ficar **sem fichas** perde.',
        'The higher card takes the pot. Whoever runs **out of chips** loses.',
      ),
    ],
  },
  {
    title: tx('O que você vê', 'What you see'),
    demo: 'board',
    body: [
      tx(
        'A TV mostra as **fichas** de cada um, as **apostas** da rodada e o **pote** no centro.',
        'The TV shows each player’s **chips**, this round’s **bets** and the **pot** in the middle.',
      ),
      tx(
        'O baralho tem **duas cartas de cada número** e só é reembaralhado quando acaba. As **cartas usadas** ficam na TV — conte-as!',
        'The deck has **two cards of each number** and is only reshuffled when it runs out. The **used cards** stay on the TV — count them!',
      ),
    ],
  },
  {
    title: tx('Sua vez', 'Your turn'),
    demo: 'actions',
    body: [
      tx(
        '**Pagar**: iguala a aposta do rival. A aposta acaba e as cartas são reveladas.',
        '**Call**: match your rival’s bet. Betting ends and the cards are revealed.',
      ),
      tx(
        '**Aumentar**: aposta mais que o rival. A vez passa para ele.',
        '**Raise**: bet more than your rival. The turn passes to them.',
      ),
      tx(
        '**Desistir**: o rival leva o pote. Desistir com um **10 na testa** custa **10 fichas** de multa!',
        '**Fold**: your rival takes the pot. Folding with a **10 on your brow** costs a **10-chip** penalty!',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    demo: 'reveal',
    body: [
      tx(
        '**1 ·** Cada um paga **1 ficha** de entrada. **2 ·** Apostem, um de cada vez. **3 ·** Revelação na TV.',
        '**1 ·** Each of you antes **1 chip**. **2 ·** Bet, one at a time. **3 ·** The TV reveals.',
      ),
      tx(
        'Cartas **iguais**: ninguém leva — o pote **acumula** para a próxima rodada.',
        '**Equal** cards: nobody wins — the pot **carries over** to the next round.',
      ),
      tx(
        'Olhe a carta do rival e o rosto dele. Blefe à vontade.',
        'Read your rival’s card and their face. Bluff away.',
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
        'Um duelo de pôquer para **2 jogadores**. Cada um começa com **20 fichas** (o Host pode mudar).',
        'A poker duel for **2 players**. Each starts with **20 chips** (the Host can change it).',
      ),
      tx(
        'Cada rodada, cada um recebe uma carta, mas só vê a do **rival**: a sua está “na testa”. A carta maior leva o pote.',
        'Each round, each of you gets a card but only sees your **rival’s**: yours is “on your brow”. The higher card takes the pot.',
      ),
      tx(
        'Vence quem deixar o rival **sem fichas** — ou quem tiver mais fichas ao fim das rodadas.',
        'You win by leaving your rival with **no chips** — or by having more chips when the rounds are over.',
      ),
    ],
  },
  {
    title: tx('O baralho', 'The deck'),
    body: [
      tx(
        '**20 cartas**: duas de cada número de **1 a 10**. O 10 é a maior, o 1 a menor.',
        '**20 cards**: two of each number from **1 to 10**. 10 is the highest, 1 the lowest.',
      ),
      tx(
        'As cartas saem **sem reposição**: a cada rodada saem duas, e o baralho só é **reembaralhado quando acaba** (a cada 10 rodadas). A TV avisa.',
        'Cards are dealt **without replacement**: two per round, and the deck is only **reshuffled when it runs out** (every 10 rounds). The TV says so.',
      ),
      tx(
        'As **cartas usadas** desde o último embaralhamento ficam na TV. Se os dois 10 já saíram, ninguém tem um 10.',
        'The **used cards** since the last shuffle stay on the TV. If both 10s are gone, nobody has a 10.',
      ),
    ],
  },
  {
    title: tx('Ações', 'Actions'),
    body: [
      tx(
        '**Pagar**: coloca fichas até igualar a aposta do rival. A aposta acaba e as cartas são reveladas. Se as apostas já estão iguais (logo depois da entrada), Pagar revela na hora.',
        '**Call**: put in chips until you match your rival’s bet. Betting ends and the cards are revealed. If the bets are already equal (right after the ante), Call reveals at once.',
      ),
      tx(
        '**Aumentar**: aposta mais que o rival — pelo menos **1 ficha a mais**. Não há limite fixo, mas você nunca aposta mais do que o rival consegue cobrir, nem mais do que você tem.',
        '**Raise**: bet more than your rival — at least **1 chip more**. There is no fixed limit, but you never bet more than your rival can cover, nor more than you have.',
      ),
      tx(
        '**Desistir**: você perde o que apostou e o rival leva o pote. Se a **sua** carta era um **10**, você ainda paga **10 fichas** de multa ao rival (ou todas as que tiver).',
        '**Fold**: you lose what you bet and your rival takes the pot. If **your** card was a **10**, you also pay your rival a **10-chip** penalty (or all you have).',
      ),
      tx(
        'Você tem **30 s** por jogada (o Host pode mudar). Se o tempo acabar, o jogo **paga** por você.',
        'You have **30 s** per move (the Host can change it). If time runs out, the game **calls** for you.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Cartas**: cada um recebe uma carta. Seu celular mostra a do rival.',
        '**1 · Cards**: each of you gets a card. Your phone shows your rival’s.',
      ),
      tx(
        '**2 · Entrada**: cada um coloca **1 ficha** no pote.',
        '**2 · Ante**: each of you puts **1 chip** in the pot.',
      ),
      tx(
        '**3 · Apostas**: quem começa é sorteado na 1ª rodada e depois **alterna**. Um de cada vez: Pagar, Aumentar ou Desistir.',
        '**3 · Betting**: the first player is drawn in round 1 and then **alternates**. One at a time: Call, Raise or Fold.',
      ),
      tx(
        '**4 · Revelação**: a TV mostra as duas cartas — sempre, até quando alguém desiste.',
        '**4 · Reveal**: the TV shows both cards — always, even when someone folds.',
      ),
    ],
  },
  {
    title: tx('Empates e multa do 10', 'Ties and the 10 penalty'),
    body: [
      tx(
        '**Cartas iguais**: ninguém leva. O pote inteiro **acumula** e vai para quem vencer a próxima rodada.',
        '**Equal cards**: nobody wins. The whole pot **carries over** to whoever wins the next round.',
      ),
      tx(
        'Se, depois de um empate, alguém ficar sem fichas, o pote acumulado **volta meio a meio** e o jogo segue.',
        'If someone is left with no chips after a tie, the carried pot **goes back half and half** and play goes on.',
      ),
      tx(
        '**Multa do 10**: só vale para quem **desiste** com um 10 na testa. Pagar com um 10 nunca custa multa.',
        '**The 10 penalty**: it only applies to whoever **folds** with a 10 on their brow. Calling with a 10 never costs a penalty.',
      ),
      tx(
        'Se um jogador sair e não voltar em 20 s, o outro **vence** na hora.',
        'If a player leaves and does not return within 20 s, the other **wins** at once.',
      ),
    ],
  },
  {
    title: tx('Fim e pontuação', 'End and scoring'),
    body: [
      tx(
        'A partida acaba quando alguém fica **sem fichas**, ou depois de **10 rodadas** (o Host pode mudar) — vence quem tiver mais fichas.',
        'The match ends when someone has **no chips**, or after **10 rounds** (the Host can change it) — the most chips wins.',
      ),
      tx(
        '**Morte súbita**: se ao fim das rodadas houver pote acumulado ou as fichas estiverem iguais, jogam-se rodadas extras até haver um vencedor.',
        '**Sudden death**: if a carried pot is pending or the chips are equal when the rounds are over, extra rounds are played until there is a winner.',
      ),
      tx(
        'No placar da sala, o vencedor ganha **1 ponto** e o perdedor 0.',
        'On the room scoreboard, the winner gets **1 point** and the loser 0.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Adaptação do jogo tradicional de cartas na testa conhecido como **Blind Man’s Bluff**, de domínio público.',
        'Adapted from the traditional card-on-the-forehead game known as **Blind Man’s Bluff**, in the public domain.',
      ),
      tx(
        'Textos, telas e arte originais do Noir Club. Não é uma versão oficial de nenhum programa de TV.',
        'Text, screens and art are original to Noir Club. Not an official version of any TV show.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText | null = tx(
  'Adaptado do jogo tradicional Blind Man’s Bluff (domínio público).',
  'Adapted from the traditional game Blind Man’s Bluff (public domain).',
);
