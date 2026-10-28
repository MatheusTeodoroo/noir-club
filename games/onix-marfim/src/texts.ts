import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms (see `rich()`
// in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** Tutorial slides shown on the TV before the first round (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'stones' | 'round' | 'board' | 'end' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'stones',
    body: [
      tx(
        'Um duelo entre **dois jogadores**. Cada um recebe **9 pedras**, numeradas de **0 a 8**.',
        'A duel between **two players**. Each of you gets **9 stones**, numbered **0 to 8**.',
      ),
      tx(
        'Os pares (0, 2, 4, 6, 8) são de **ônix** — pretas. Os ímpares (1, 3, 5, 7) são de **marfim** — brancas.',
        'Even stones (0, 2, 4, 6, 8) are **onyx** — black. Odd stones (1, 3, 5, 7) are **ivory** — white.',
      ),
      tx(
        'Os números das suas pedras só aparecem no **seu celular**.',
        'Your stones’ numbers only show on **your phone**.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    demo: 'round',
    body: [
      tx(
        '**1 ·** Quem começa apresenta uma pedra. Todos veem só a **cor**.',
        '**1 ·** The starter presents a stone. Everyone sees only its **colour**.',
      ),
      tx(
        '**2 ·** O rival responde com uma pedra dele. **3 ·** O **número maior** ganha **1 ponto**. Números iguais: ninguém pontua.',
        '**2 ·** The rival answers with one of theirs. **3 ·** The **higher number** scores **1 point**. Equal numbers: nobody scores.',
      ),
      tx(
        'Os números **não são revelados** — só quem venceu. Quem vence a rodada começa a próxima.',
        'The numbers are **not revealed** — only who won. The round winner starts the next one.',
      ),
    ],
  },
  {
    title: tx('O que a TV mostra', 'What the TV shows'),
    demo: 'board',
    body: [
      tx(
        'O **placar**, e as **pedras que restam** a cada um — só as cores, nunca os números.',
        'The **score**, and the **stones each player has left** — colours only, never numbers.',
      ),
      tx(
        'O **histórico**: a cor que cada um jogou em cada rodada e quem venceu. Use-o para deduzir o que o rival ainda tem.',
        'The **history**: the colour each of you played every round and who won. Use it to work out what your rival still holds.',
      ),
    ],
  },
  {
    title: tx('Fim do duelo', 'End of the duel'),
    demo: 'end',
    body: [
      tx(
        'São sempre **9 rodadas** — todas as pedras são usadas. Mais pontos vence.',
        'There are always **9 rounds** — every stone gets played. Most points wins.',
      ),
      tx(
        'No fim, a TV **revela todos os números**, rodada por rodada.',
        'At the end, the TV **reveals every number**, round by round.',
      ),
      tx(
        'Pontos **empatados**? Um **duelo de desempate** começa com pedras novas.',
        'Points **level**? A **tiebreak duel** starts with fresh stones.',
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
        'Um duelo de dedução para **2 jogadores**. Cada um tem 9 pedras numeradas de 0 a 8 e joga uma por rodada.',
        'A deduction duel for **2 players**. Each of you holds 9 stones numbered 0 to 8 and plays one per round.',
      ),
      tx(
        'Número maior vence a rodada — mas você só vê a **cor** da pedra do rival, nunca o número.',
        'The higher number wins the round — but you only ever see the **colour** of your rival’s stone, never its number.',
      ),
      tx(
        'Depois de **9 rodadas**, vence quem tiver **mais pontos**.',
        'After **9 rounds**, whoever has **more points** wins.',
      ),
    ],
  },
  {
    title: tx('As pedras', 'The stones'),
    body: [
      tx(
        '**Ônix** (preta): os pares **0, 2, 4, 6 e 8** — cinco pedras.',
        '**Onyx** (black): the even numbers **0, 2, 4, 6 and 8** — five stones.',
      ),
      tx(
        '**Marfim** (branca): os ímpares **1, 3, 5 e 7** — quatro pedras.',
        '**Ivory** (white): the odd numbers **1, 3, 5 and 7** — four stones.',
      ),
      tx(
        'Cada pedra é usada **uma única vez** por duelo. As que você ainda tem aparecem no seu celular; a TV mostra as que restam a cada um **só pela cor**, pretas primeiro.',
        'Each stone is used **only once** per duel. Yours are on your phone; the TV shows what each player has left **by colour only**, black first.',
      ),
    ],
  },
  {
    title: tx('Sua vez', 'Your turn'),
    body: [
      tx(
        '**Apresentar**: na sua vez, toque numa das suas pedras. Ela sai da sua mão e a **cor** aparece na TV e no celular do rival.',
        '**Present**: on your turn, tap one of your stones. It leaves your hand and its **colour** shows on the TV and on your rival’s phone.',
      ),
      tx(
        'Quem responde já sabe a cor da pedra de quem começou. Quem começa não sabe nada da resposta.',
        'Whoever answers already knows the colour of the starter’s stone. The starter knows nothing about the answer.',
      ),
      tx(
        'Você tem **45 s** por jogada (o Host pode mudar). Se o tempo acabar, o jogo apresenta a sua **menor pedra** e a TV avisa.',
        'You have **45 s** per move (the Host can change it). If time runs out, the game presents your **lowest stone** and the TV says so.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Abertura**: quem começa apresenta uma pedra. Na 1ª rodada, quem começa é **sorteado**.',
        '**1 · Lead**: the starter presents a stone. In round 1 the starter is **drawn at random**.',
      ),
      tx(
        '**2 · Resposta**: o rival apresenta uma pedra.',
        '**2 · Answer**: the rival presents a stone.',
      ),
      tx(
        '**3 · Resultado**: o número maior ganha **1 ponto**. A TV diz só **quem venceu** — os números continuam secretos.',
        '**3 · Result**: the higher number scores **1 point**. The TV only says **who won** — the numbers stay secret.',
      ),
      tx(
        '**4 ·** Quem venceu a rodada **começa a próxima**.',
        '**4 ·** The round winner **starts the next one**.',
      ),
    ],
  },
  {
    title: tx('Empates e desempate', 'Ties and tiebreak'),
    body: [
      tx(
        '**Rodada empatada** (mesmo número): ninguém pontua, e quem começou essa rodada começa a próxima.',
        '**Tied round** (same number): nobody scores, and whoever started that round starts the next one.',
      ),
      tx(
        '**Duelo empatado** (mesmos pontos depois de 9 rodadas): começa um **duelo de desempate**, com pedras novas de 0 a 8 e o placar zerado. Começa quem venceu a última rodada. Repete até alguém vencer.',
        '**Tied duel** (equal points after 9 rounds): a **tiebreak duel** begins, with fresh stones 0 to 8 and the score back to zero. The winner of the last round starts. It repeats until someone wins.',
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
        'O duelo tem **sempre 9 rodadas**, mesmo que o vencedor já esteja definido.',
        'A duel **always has 9 rounds**, even when the winner is already settled.',
      ),
      tx(
        'Ao fim de cada duelo, a TV **revela todos os números**, rodada por rodada.',
        'At the end of each duel, the TV **reveals every number**, round by round.',
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
        'Uma versão Noir Club de um **duelo clássico de números ocultos**, em que só a cor da escolha do rival é revelada.',
        'A Noir Club take on a **classic hidden-number duel**, where only the colour of the rival’s choice is shown.',
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
  'Inspirado num duelo clássico de números ocultos.',
  'Inspired by a classic hidden-number duel.',
);
