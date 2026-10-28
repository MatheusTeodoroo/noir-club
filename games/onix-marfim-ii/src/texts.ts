import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms (see `rich()`
// in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** Tutorial slides shown on the TV before the first round (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'colours' | 'round' | 'lamp' | 'end' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'colours',
    body: [
      tx(
        'Um duelo entre **dois jogadores**. Cada um começa com **99 pontos** para gastar em **9 rodadas**.',
        'A duel between **two players**. Each of you starts with **99 points** to spend over **9 rounds**.',
      ),
      tx(
        'Em cada rodada você aposta **quantos pontos quiser** dos que restam — até **0**.',
        'Each round you bid **as many points as you like** from what you have left — even **0**.',
      ),
      tx(
        'Ninguém vê o número: só a cor. **Um dígito (0–9) é ônix** — preto. **Dois dígitos (10–99) é marfim** — branco.',
        'Nobody sees the number, only its colour. **One digit (0–9) is onyx** — black. **Two digits (10–99) is ivory** — white.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    demo: 'round',
    body: [
      tx(
        '**1 ·** Quem começa aposta. A TV anuncia só a **cor** da aposta.',
        '**1 ·** The starter bids. The TV announces only the bid’s **colour**.',
      ),
      tx(
        '**2 ·** O rival responde, já sabendo essa cor. **3 ·** Quem apostou **mais** ganha **1 vitória**. Apostas iguais: ninguém ganha.',
        '**2 ·** The rival answers, knowing that colour. **3 ·** Whoever bid **more** gets **1 win**. Equal bids: nobody wins.',
      ),
      tx(
        'Os pontos apostados **somem** — ganhando ou perdendo. Quem vence a rodada começa a próxima.',
        'Points you bid are **gone** — win or lose. The round winner starts the next one.',
      ),
    ],
  },
  {
    title: tx('A lâmpada', 'The lamp'),
    demo: 'lamp',
    body: [
      tx(
        'Seus pontos restantes ficam **só no seu celular**. A TV mostra uma **lâmpada de 5 luzes** para cada jogador.',
        'Your points left are **only on your phone**. The TV shows a **five-light lamp** for each player.',
      ),
      tx(
        'Uma luz se **apaga a cada 20 pontos** gastos: 80 ou mais acende 5, abaixo de 80 acende 4… e com **0 pontos** ela apaga de vez.',
        'One light goes **out for every 20 points** spent: 80 or more lights 5, below 80 lights 4… and at **0 points** it goes dark.',
      ),
      tx(
        'A lâmpada muda **na hora da aposta**, antes do rival responder. Use as cores e as luzes para ler o adversário.',
        'The lamp changes **as soon as you bid**, before the rival answers. Read your opponent from the colours and the lights.',
      ),
    ],
  },
  {
    title: tx('Fim do duelo', 'End of the duel'),
    demo: 'end',
    body: [
      tx(
        'Quem chegar a **5 vitórias** vence na hora. Senão, depois de **9 rodadas**, vence quem tiver **mais vitórias**.',
        'Reach **5 wins** and you win at once. Otherwise, after **9 rounds**, whoever has **more wins** takes the duel.',
      ),
      tx(
        'No fim, a TV **revela todas as apostas**, rodada por rodada.',
        'At the end, the TV **reveals every bid**, round by round.',
      ),
      tx(
        'Vitórias **empatadas**? Começa um **duelo de desempate** — 99 pontos de novo.',
        'Wins **level**? A **tiebreak duel** starts — 99 points again.',
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
        'Um duelo de blefe e economia para **2 jogadores**. Cada um tem **99 pontos** para gastar em até **9 rodadas**.',
        'A duel of bluff and thrift for **2 players**. Each of you has **99 points** to spend over up to **9 rounds**.',
      ),
      tx(
        'Em cada rodada, a **aposta maior** vence — mas você só vê a **cor** da aposta do rival, nunca o número.',
        'Each round the **higher bid** wins — but you only ever see the **colour** of your rival’s bid, never its number.',
      ),
      tx(
        'Vence quem chegar a **5 vitórias**, ou quem tiver **mais vitórias** depois da 9ª rodada.',
        'You win by reaching **5 wins**, or by having **more wins** after round 9.',
      ),
    ],
  },
  {
    title: tx('Pontos, cores e lâmpada', 'Points, colours and lamp'),
    body: [
      tx(
        '**Ônix** (preto): apostas de **um dígito**, de 0 a 9. **Marfim** (branco): apostas de **dois dígitos**, de 10 a 99.',
        '**Onyx** (black): **one-digit** bids, 0 to 9. **Ivory** (white): **two-digit** bids, 10 to 99.',
      ),
      tx(
        'Seus pontos restantes aparecem **só no seu celular**. Pontos apostados são gastos, ganhando ou perdendo a rodada.',
        'Your points left show **only on your phone**. Points you bid are spent, whether you win the round or not.',
      ),
      tx(
        '**Lâmpada**: 5 luzes com 80–99 pontos, 4 com 60–79, 3 com 40–59, 2 com 20–39, 1 com 1–19 e **apagada com 0**. Ela muda assim que você aposta, antes do rival responder.',
        '**Lamp**: 5 lights at 80–99 points, 4 at 60–79, 3 at 40–59, 2 at 20–39, 1 at 1–19 and **dark at 0**. It changes as soon as you bid, before the rival answers.',
      ),
    ],
  },
  {
    title: tx('Sua vez', 'Your turn'),
    body: [
      tx(
        '**Apostar**: na sua vez, escolha um valor de **0 até os seus pontos restantes** e confirme. A cor aparece na TV e no celular do rival.',
        '**Bid**: on your turn, pick an amount from **0 up to your points left** and confirm. Its colour shows on the TV and on your rival’s phone.',
      ),
      tx(
        'Quem responde já sabe a cor e vê a lâmpada de quem começou. Quem começa não sabe nada da resposta.',
        'Whoever answers already knows the colour and sees the starter’s lamp. The starter knows nothing about the answer.',
      ),
      tx(
        'Você tem **45 s** por aposta (o Host pode mudar). Se o tempo acabar, o jogo aposta **0** por você e a TV avisa.',
        'You have **45 s** per bid (the Host can change it). If time runs out, the game bids **0** for you and the TV says so.',
      ),
      tx(
        'Sem pontos? Suas apostas passam a ser **0 automaticamente**, sem esperar.',
        'Out of points? Your bids become **0 automatically**, with no waiting.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Abertura**: quem começa aposta. Na 1ª rodada, quem começa é **sorteado**.',
        '**1 · Lead**: the starter bids. In round 1 the starter is **drawn at random**.',
      ),
      tx(
        '**2 · Resposta**: o rival aposta.',
        '**2 · Answer**: the rival bids.',
      ),
      tx(
        '**3 · Resultado**: a aposta maior ganha **1 vitória**. A TV diz só **quem venceu** — os números continuam secretos.',
        '**3 · Result**: the higher bid scores **1 win**. The TV only says **who won** — the numbers stay secret.',
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
        '**Rodada empatada** (mesmo valor): ninguém ganha a vitória, e quem começou essa rodada começa a próxima.',
        '**Tied round** (same amount): nobody gets the win, and whoever started that round starts the next one.',
      ),
      tx(
        '**Duelo empatado** (mesmas vitórias no fim): começa um **duelo de desempate**, com 99 pontos para cada um e as vitórias zeradas. Começa quem venceu a última rodada. Repete até alguém vencer.',
        '**Tied duel** (equal wins at the end): a **tiebreak duel** begins, with 99 points each and the wins back to zero. The winner of the last round starts. It repeats until someone wins.',
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
        'O duelo acaba quando alguém chega a **5 vitórias**, depois da **9ª rodada**, ou quando **os dois zeram** os pontos (o resto seria só empate).',
        'The duel ends when someone reaches **5 wins**, after **round 9**, or when **both players run out** of points (the rest could only tie).',
      ),
      tx(
        'Ao fim de cada duelo, a TV **revela todas as apostas**, rodada por rodada, e os pontos que sobraram.',
        'At the end of each duel, the TV **reveals every bid**, round by round, and the points left over.',
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
        'Uma versão Noir Club de um **duelo clássico de apostas ocultas**, em que só a cor da aposta do rival é revelada.',
        'A Noir Club take on a **classic hidden-bid duel**, where only the colour of the rival’s bid is shown.',
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
  'Inspirado num duelo clássico de apostas ocultas.',
  'Inspired by a classic hidden-bid duel.',
);
