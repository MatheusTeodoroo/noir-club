import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, PT-BR and EN. Inline markup: **bold** for key terms; {r} {g} {b} {w}
// for the colour chips, which the UI draws as the same chips the board uses.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'stacks' | 'hand' | 'order' | 'pass' | 'topple';

export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'stacks',
    body: [
      tx(
        'Na mesa há **três pilhas** de fichas: {r} vermelha, {g} verde e {b} azul.',
        'There are **three stacks** of chips on the table: {r} red, {g} green and {b} blue.',
      ),
      tx(
        'Cada rodada, todos colocam uma ficha. Quem fizer uma pilha somar **13 ou mais** leva as fichas dela como **penalidade**.',
        'Each round, everyone adds a chip. Whoever makes a stack total **13 or more** takes its chips as a **penalty**.',
      ),
      tx('Vence quem terminar com **menos penalidades**.', 'The **fewest penalties** wins.'),
    ],
  },
  {
    title: tx('Sua mão', 'Your hand'),
    demo: 'hand',
    body: [
      tx(
        'Você tem **cartas de 0 a 6** (o valor da ficha) e **fichas de cor**: duas {r}, duas {g}, duas {b} e um {w} **arco-íris**.',
        'You hold **cards 0 to 6** (the chip’s value) and **colour chips**: two {r}, two {g}, two {b} and one {w} **rainbow**.',
      ),
      tx(
        'A cada rodada, envie **em segredo** uma carta e uma cor pelo celular. Cada peça só se usa uma vez por mão.',
        'Each round, send **in secret** one card and one colour from your phone. Each piece is used once per hand.',
      ),
    ],
  },
  {
    title: tx('A ordem', 'The order'),
    demo: 'order',
    body: [
      tx(
        'A TV revela as cores e depois as cartas. Quem usou o {w} **arco-íris** empilha primeiro.',
        'The TV reveals the colours, then the cards. Whoever used the {w} **rainbow** stacks first.',
      ),
      tx(
        'Depois, a **carta maior** vem antes. Empate: quem tem o **marcador ★**, e em seguida no sentido horário a partir dele.',
        'Then the **higher card** goes first. Ties: whoever holds the **★ marker**, then clockwise from them.',
      ),
    ],
  },
  {
    title: tx('Empilhar ou passar', 'Stack or pass'),
    demo: 'pass',
    body: [
      tx(
        'Na sua vez, toque **Empilhar** — sua ficha vai para a pilha da sua cor; com o {w}, você escolhe a pilha.',
        'On your turn, tap **Stack** — your chip goes onto the stack of your colour; with the {w}, you pick the stack.',
      ),
      tx(
        'Ou **Passe** (uma vez por rodada): você vai para o fim da fila. Quem passou primeiro empilha **por último**.',
        'Or **Pass** (once per round): you go to the back. Whoever passed first stacks **last**.',
      ),
    ],
  },
  {
    title: tx('Desabou!', 'Toppled!'),
    demo: 'topple',
    body: [
      tx(
        'Se a sua ficha faz a pilha chegar a **13 ou mais**, você leva **uma penalidade por ficha** que já estava nela. A sua ficha fica, começando a pilha de novo.',
        'If your chip brings the stack to **13 or more**, you take **one penalty per chip** that was already on it. Your chip stays, starting the stack again.',
      ),
      tx(
        'O último a levar penalidade pega o **marcador ★**. A cada 7 rodadas a mão é renovada, mas as pilhas continuam.',
        'The last player penalised takes the **★ marker**. Every 7 rounds hands are refreshed, but the stacks stay.',
      ),
    ],
  },
];

export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo de blefe e cálculo para **2 a 16 pessoas**. Três pilhas de fichas aguentam até **12**: quem fizer uma delas chegar a **13** leva as fichas dela como penalidade.',
        'A game of bluff and arithmetic for **2 to 16 people**. Three chip stacks hold up to **12**: whoever brings one to **13** takes its chips as a penalty.',
      ),
      tx(
        'A partida tem **14 rodadas** por padrão (o Host escolhe 7, 14, 21, 28 ou 35). Vence quem terminar com **menos penalidades**.',
        'A match has **14 rounds** by default (the Host picks 7, 14, 21, 28 or 35). The **fewest penalties** wins.',
      ),
    ],
  },
  {
    title: tx('As peças', 'The pieces'),
    body: [
      tx(
        '**Pilhas**: {r} vermelha, {g} verde e {b} azul. A TV mostra as fichas de cada uma e a soma.',
        '**Stacks**: {r} red, {g} green and {b} blue. The TV shows each stack’s chips and total.',
      ),
      tx(
        '**Cartas**: cada jogador tem sete, de **0 a 6**. O número é o valor da ficha que você coloca.',
        '**Cards**: each player has seven, from **0 to 6**. The number is the value of the chip you add.',
      ),
      tx(
        '**Fichas de cor**: duas {r}, duas {g}, duas {b} e um {w} **arco-íris**. A cor diz em qual pilha a ficha entra; o arco-íris entra em qualquer uma e joga primeiro.',
        '**Colour chips**: two {r}, two {g}, two {b} and one {w} **rainbow**. The colour says which stack the chip goes on; the rainbow goes on any stack and plays first.',
      ),
      tx(
        '**Marcador ★**: decide os empates na ordem. Começa com alguém sorteado.',
        '**★ Marker**: breaks ties in the order. It starts with a random player.',
      ),
    ],
  },
  {
    title: tx('1 · Envio', '1 · Send'),
    body: [
      tx(
        'Todos escolhem **em segredo** uma carta e uma cor no celular e tocam **Enviar**. Dá para trocar até todos enviarem ou o tempo acabar (**60 s** por padrão; o Host pode mudar).',
        'Everyone secretly picks a card and a colour on their phone and taps **Send**. You can change it until everyone has sent or time runs out (**60 s** by default; the Host can change it).',
      ),
      tx(
        'Quem não enviar a tempo recebe uma carta e uma cor **sorteadas** da própria mão. A TV marca essas jogadas como automáticas.',
        'Anyone who doesn’t send in time gets a card and colour **drawn at random** from their own hand. The TV marks those plays as automatic.',
      ),
      tx(
        'Cada carta e cada cor só podem ser usadas **uma vez por mão** (7 rodadas).',
        'Each card and each colour can be used **once per hand** (7 rounds).',
      ),
    ],
  },
  {
    title: tx('2 · Revelação e ordem', '2 · Reveal and order'),
    body: [
      tx(
        'A TV revela primeiro as cores e depois as cartas, e monta a fila de quem empilha:',
        'The TV reveals the colours first, then the cards, and lines up who stacks:',
      ),
      tx(
        '**1º** quem usou o {w} arco-íris (entre eles, a carta maior antes). **2º** os demais, da **carta maior para a menor**.',
        '**1st** whoever used the {w} rainbow (among them, the higher card first). **2nd** everyone else, from **highest card to lowest**.',
      ),
      tx(
        '**Empate**: quem tem o **marcador ★** vem antes; depois, o sentido horário a partir dele (a ordem dos jogadores na TV).',
        '**Ties**: whoever holds the **★ marker** goes first; then clockwise from them (the player order on the TV).',
      ),
    ],
  },
  {
    title: tx('3 · Empilhar ou passar', '3 · Stack or pass'),
    body: [
      tx(
        'Um de cada vez, na ordem da fila. Na sua vez você tem **15 s** (o Host pode mudar) para:',
        'One at a time, in queue order. On your turn you have **15 s** (the Host can change it) to:',
      ),
      tx(
        '**Empilhar**: sua ficha entra na pilha da sua cor. Com o {w} arco-íris, você escolhe a pilha na hora.',
        '**Stack**: your chip goes onto the stack of your colour. With the {w} rainbow, you choose the stack right then.',
      ),
      tx(
        '**Passar** (uma vez por rodada): você vai para o fim da fila. Se vários passarem, empilham na **ordem inversa** dos passes — quem passou primeiro é o último. Quem já passou não passa de novo.',
        '**Pass** (once per round): you go to the back of the queue. If several pass, they stack in **reverse order** of passing — the first to pass is last. You can’t pass twice.',
      ),
      tx(
        'Se o tempo acabar, sua ficha é **empilhada automaticamente** (o arco-íris vai para a pilha de menor soma).',
        'If time runs out, your chip is **stacked automatically** (a rainbow goes onto the stack with the lowest total).',
      ),
    ],
  },
  {
    title: tx('4 · Desabamento e marcador', '4 · Toppling and the marker'),
    body: [
      tx(
        'Se a sua ficha faz a soma da pilha chegar a **13 ou mais**, a pilha desaba: você leva **1 penalidade por ficha** que já estava nela (fichas de valor 0 também contam).',
        'If your chip brings the stack’s total to **13 or more**, it topples: you take **1 penalty per chip** that was already on it (chips worth 0 count too).',
      ),
      tx(
        'Sua ficha **fica** na pilha e ela recomeça a partir dela. Exemplo: pilha 6 + 5, você coloca 2 → 13: leva **2** penalidades e a pilha fica só com o seu 2.',
        'Your chip **stays** and the stack starts over from it. Example: stack 6 + 5, you add 2 → 13: you take **2** penalties and the stack is just your 2.',
      ),
      tx(
        'No fim da rodada, o **último jogador penalizado** fica com o **marcador ★**. Se ninguém foi penalizado, o marcador passa para o próximo no sentido horário.',
        'At the end of the round, the **last player penalised** takes the **★ marker**. If nobody was penalised, the marker moves to the next player clockwise.',
      ),
    ],
  },
  {
    title: tx('Mãos novas e situações especiais', 'New hands and special cases'),
    body: [
      tx(
        'A cada **7 rodadas** todos recebem de novo as cartas 0–6 e as sete fichas de cor. As pilhas **não** são esvaziadas.',
        'Every **7 rounds** everyone gets cards 0–6 and the seven colour chips back. The stacks are **not** emptied.',
      ),
      tx(
        'Se o Host ligar a opção, a TV mostra as **cartas e cores já usadas** por cada um nesta mão — dá para deduzir o que sobrou para os outros.',
        'If the Host turns it on, the TV shows the **cards and colours already used** by each player this hand — so you can work out what the others have left.',
      ),
      tx(
        'Quem cair e não voltar em 20 s passa a jogar **no automático**: carta e cor sorteadas, sempre empilha. Se voltar, joga normalmente.',
        'Anyone who drops and isn’t back within 20 s plays **automatically**: random card and colour, always stacks. If they return, they play normally again.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'Depois da última rodada, a classificação vai de **menos penalidades** para mais. Empate: fica atrás quem foi **penalizado por último**.',
        'After the last round, the ranking goes from **fewest penalties** to most. Ties: whoever was **penalised last** ranks lower.',
      ),
      tx(
        'No placar da sala, o 1º ganha **N−1 pontos**, o 2º N−2… e o último 0 (N = número de jogadores). Quem empatar de verdade (sem nenhuma penalidade) divide a posição.',
        'On the room scoreboard, 1st scores **N−1 points**, 2nd N−2… and last 0 (N = number of players). Players who truly tie (no penalties at all) share the position.',
      ),
    ],
  },
];

export const CREDITS: I18nText | null = tx(
  'Inspirado em “Peso 13”, de O Jogo do Diabo (The Devil’s Plan, Netflix), temporada 3, episódio 2. Versão não oficial.',
  'Inspired by “Weight 13” from The Devil’s Plan (Netflix), season 3, episode 2. Unofficial version.',
);
