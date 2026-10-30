import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules (see the skill's reference/rules.md), in PT-BR and EN, shared by the UI
// and the logic. Inline markup: **bold** for key terms.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** Tutorial slides shown on the TV before round 1; the Host advances them from the phone. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'deal' | 'round' | 'clue' | 'sort' | 'reveal' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'deal',
    body: [
      tx(
        'Cada um recebe **cartas secretas de 1 a 100** no celular. Só você vê os seus números.',
        'Everyone gets **secret cards from 1 to 100** on their phone. Only you see your numbers.',
      ),
      tx(
        'A rodada tem um **tema**, uma escala do menor (1) ao maior (100), como **Tamanho de animais**.',
        'Each round has a **theme**, a scale from lowest (1) to highest (100), like **Animal size**.',
      ),
      tx(
        'O objetivo é colocar todas as cartas da mesa **em ordem** sem nunca dizer um número.',
        'The goal is to put every card on the table **in order** without ever saying a number.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    demo: 'round',
    body: [
      tx(
        '**1 · Tema**: o **mestre do tema** (muda a cada rodada) escolhe 1 de 3 temas ou escreve o seu.',
        '**1 · Theme**: the **theme master** (a new one each round) picks 1 of 3 themes or writes one.',
      ),
      tx(
        '**2 · Dicas**: todos descrevem suas cartas no celular.',
        '**2 · Clues**: everyone describes their cards on their phone.',
      ),
      tx('**3 · Ordenar**: as cartas vão para a fila.', '**3 · Sort**: the cards go into a row.'),
      tx(
        '**4 · Revelação**: a TV vira as cartas e mostra quem acertou.',
        '**4 · Reveal**: the TV flips the cards and shows who got it right.',
      ),
    ],
  },
  {
    title: tx('As dicas', 'The clues'),
    demo: 'clue',
    body: [
      tx(
        'Para cada carta, escreva uma **dica** na escala do tema. Em Tamanho de animais: 4 é **aranha**, 40 **cachorro**, 97 **baleia**.',
        'For each card, write a **clue** on the theme’s scale. For Animal size: 4 is **spider**, 40 **dog**, 97 **whale**.',
      ),
      tx(
        'Nada de números! A TV mostra as dicas **só quando todos terminarem**.',
        'No numbers! The TV shows the clues **only once everyone is done**.',
      ),
      tx(
        'Quando metade da mesa terminar, começa um **relógio** para o resto.',
        'Once half the table is done, a **clock** starts for the rest.',
      ),
    ],
  },
  {
    title: tx('Ordenar', 'Sorting'),
    demo: 'sort',
    body: [
      tx(
        '**Cooperativo**: o grupo monta **uma só fila**. Qualquer um mexe em qualquer carta e a TV mostra tudo ao vivo. Conversem!',
        '**Cooperative**: the group builds **one shared row**. Anyone can move any card and the TV shows it live. Talk it over!',
      ),
      tx(
        '**Competitivo**: cada um monta **a própria fila**, em segredo.',
        '**Competitive**: everyone builds **their own row**, in secret.',
      ),
      tx(
        'Toque numa carta e depois no lugar dela, use as setas ou arraste. Terminou? Toque **Pronto!**',
        'Tap a card then its place, use the arrows, or drag. Done? Tap **Ready!**',
      ),
    ],
  },
  {
    title: tx('Revelação e pontos', 'Reveal and points'),
    demo: 'reveal',
    body: [
      tx(
        'As cartas viram **da menor para a maior**. Verde está no lugar certo.',
        'Cards flip **from lowest to highest**. Green means in the right place.',
      ),
      tx(
        '**Cooperativo**: a nota é a **% de cartas no lugar certo**.',
        '**Cooperative**: your score is the **% of cards in the right place**.',
      ),
      tx(
        '**Competitivo**: **1 ponto** por carta no lugar, **+5** pela fila perfeita e **+1** ao dono de cada carta que outro jogador acertou.',
        '**Competitive**: **1 point** per card in place, **+5** for a perfect row and **+1** to a card’s owner for each other player who placed it right.',
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
        'Um jogo de dicas e intuição para **2 a 16** pessoas. Cada rodada tem um tema, uma escala de 1 a 100, e cada jogador recebe cartas secretas com números de 1 a 100.',
        'A game of clues and gut feeling for **2 to 16** people. Each round has a theme, a scale from 1 to 100, and every player gets secret cards numbered 1 to 100.',
      ),
      tx(
        'Você descreve seus números com palavras na escala do tema, e a mesa tenta colocar todas as cartas em ordem usando só as dicas.',
        'You describe your numbers in words on the theme’s scale, and the table tries to put every card in order using only the clues.',
      ),
      tx(
        'Dois modos, escolhidos pelo Host no lobby: **Cooperativo** (o grupo monta uma fila juntos) e **Competitivo** (cada um monta a sua e quem acertar mais ganha). São 5 rodadas por padrão (o Host escolhe de 1 a 25).',
        'Two modes, picked by the Host in the lobby: **Cooperative** (the group builds one row together) and **Competitive** (everyone builds their own and the best wins). 5 rounds by default (the Host picks 1 to 25).',
      ),
    ],
  },
  {
    title: tx('O tema e o mestre', 'The theme and the master'),
    body: [
      tx(
        'A cada rodada um jogador é o **mestre do tema**, em ordem pelos lugares da mesa (quem estiver desconectado é pulado). O mestre também recebe cartas e joga normalmente.',
        'Each round one player is the **theme master**, in seat order (anyone disconnected is skipped). The master also gets cards and plays as usual.',
      ),
      tx(
        '**Sorteado**: o jogo sorteia 3 temas e o mestre escolhe 1 no celular. Os temas não se repetem até o banco acabar.',
        '**Drawn**: the game draws 3 themes and the master picks 1 on their phone. Themes don’t repeat until the bank runs out.',
      ),
      tx(
        '**Escrito**: o mestre digita o tema (até 60 caracteres) e, se quiser, o que vale 1 e o que vale 100 (até 24 cada).',
        '**Written**: the master types the theme (up to 60 characters) and, optionally, what 1 and 100 mean (up to 24 each).',
      ),
      tx(
        'Não há limite de tempo para o tema. Se o mestre sair da sala, o jogo sorteia um tema sozinho.',
        'There is no time limit for the theme. If the master leaves the room, the game draws a theme on its own.',
      ),
    ],
  },
  {
    title: tx('As cartas e as dicas', 'Cards and clues'),
    body: [
      tx(
        'O baralho tem 100 cartas, de 1 a 100, sem repetição. Cada jogador recebe **1 carta por padrão**; o Host pode dar mais, até 100 ÷ jogadores (com 10 jogadores, até 10 cartas). Se pedir mais, a TV avisa o corte.',
        'The deck has 100 cards, 1 to 100, no repeats. Each player gets **1 card by default**; the Host can deal more, up to 100 ÷ players (10 players: up to 10 cards). Asking for more is capped and the TV says so.',
      ),
      tx(
        'Para cada carta, escreva uma **dica** de até 60 caracteres. Dá para trocar a dica até a fase acabar. Não diga nem escreva números: essa é a regra de honra do jogo.',
        'For each card, write a **clue** of up to 60 characters. You can change it until the phase ends. Don’t say or write numbers: that’s the game’s honour rule.',
      ),
      tx(
        'A TV mostra só quantas dicas cada um já escreveu. As dicas aparecem todas juntas quando a fase acaba.',
        'The TV only shows how many clues each player has written. All clues appear together when the phase ends.',
      ),
      tx(
        'A fase não tem relógio no começo. Quando **pelo menos metade** dos jogadores conectados terminar, começa um relógio de **60 s** (o Host pode mudar). A fase acaba quando todos terminam ou o tempo acaba. Cartas sem dica ficam com **—**.',
        'The phase starts without a clock. Once **at least half** of the connected players are done, a **60 s** clock starts (the Host can change it). The phase ends when everyone is done or time runs out. Cards without a clue show **—**.',
      ),
    ],
  },
  {
    title: tx('Ordenar · Cooperativo', 'Sorting · Cooperative'),
    body: [
      tx(
        'Existe **uma só fila**, mostrada ao vivo na TV e em todos os celulares. Qualquer jogador pode mover qualquer carta.',
        'There is **one shared row**, shown live on the TV and on every phone. Any player can move any card.',
      ),
      tx(
        'Para mover: toque numa carta e depois no lugar dela, use as setas **↑ ↓** ou arraste pela alça **⠿**. Seus números aparecem nas suas cartas só no seu celular.',
        'To move: tap a card then its place, use the **↑ ↓** arrows, or drag the **⠿** handle. Your numbers appear on your cards only on your phone.',
      ),
      tx(
        'Toque **Pronto!** quando concordar com a fila. **Qualquer movimento desmarca o Pronto de todos.**',
        'Tap **Ready!** when you agree with the row. **Any move clears everyone’s Ready.**',
      ),
      tx(
        'A fase acaba quando todos os conectados estão prontos ou depois de **180 s** (o Host pode mudar).',
        'The phase ends when every connected player is ready or after **180 s** (the Host can change it).',
      ),
    ],
  },
  {
    title: tx('Ordenar · Competitivo', 'Sorting · Competitive'),
    body: [
      tx(
        'Cada jogador monta **a própria fila**, com todas as cartas da mesa (inclusive as suas). Ninguém vê a fila dos outros até a revelação.',
        'Every player builds **their own row** with every card on the table (yours included). Nobody sees anyone else’s row until the reveal.',
      ),
      tx(
        'A TV mostra todas as dicas agrupadas por dono, para todos consultarem. Conversar, perguntar e blefar é permitido.',
        'The TV shows every clue grouped by owner, for everyone to check. Talking, asking and bluffing are allowed.',
      ),
      tx(
        'Mover uma carta desmarca **só o seu** Pronto. A fase acaba quando todos estão prontos ou depois de **180 s**.',
        'Moving a card clears **only your own** Ready. The phase ends when everyone is ready or after **180 s**.',
      ),
    ],
  },
  {
    title: tx('A revelação', 'The reveal'),
    body: [
      tx(
        'A TV vira as cartas **da menor para a maior**, mostrando dica e número. A posição certa de cada carta é o seu lugar nessa ordem.',
        'The TV flips the cards **from lowest to highest**, showing clue and number. Each card’s right position is its place in that order.',
      ),
      tx(
        '**Cooperativo**: cada carta da fila acende verde (lugar exato) ou vermelho. Depois aparece a **precisão**: a % de cartas no lugar exato.',
        '**Cooperative**: each card in the row lights up green (exact place) or red. Then comes the **accuracy**: the % of cards in their exact place.',
      ),
      tx(
        '**Competitivo**: depois da ordem correta, a TV mostra a fila de cada jogador lado a lado, com os acertos em verde e os pontos da rodada.',
        '**Competitive**: after the correct order, the TV shows each player’s row side by side, with hits in green and the round’s points.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        '**Cooperativo**: todos ganham o mesmo valor no placar, a **média da precisão** das rodadas (0 a 100).',
        '**Cooperative**: everyone scores the same, the **average accuracy** of the rounds (0 to 100).',
      ),
      tx(
        '**Competitivo**, por rodada: **1 ponto** por carta no lugar exato, **+5** se a sua fila estiver perfeita, e o dono de cada carta ganha **+1** para cada outro jogador que a colocou no lugar exato. Dicas claras rendem pontos!',
        '**Competitive**, per round: **1 point** per card in its exact place, **+5** if your row is perfect, and each card’s owner gets **+1** for every other player who placed it exactly right. Clear clues pay!',
      ),
      tx(
        'O jogo acaba depois da última rodada. Empates ficam empatados no placar.',
        'The game ends after the last round. Ties stay tied on the scoreboard.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        'Se alguém cair, o jogo pausa por 20 s. Se a pessoa não voltar, o jogo segue sem ela:',
        'If someone drops, the game pauses for 20 s. If they don’t come back, the game carries on without them:',
      ),
      tx(
        '**Mestre do tema**: o jogo sorteia o tema. **Dicas**: as que faltaram ficam com —, e a pessoa não conta mais para "metade" nem para "todos". **Ordenar**: ela não conta para o Pronto; no competitivo, a fila dela pontua como estava.',
        '**Theme master**: the game draws the theme. **Clues**: missing ones stay —, and they no longer count towards "half" or "everyone". **Sorting**: they don’t count for Ready; in competitive, their row scores as it was.',
      ),
      tx(
        'Se ninguém mexer na fila, a revelação usa a ordem em que as cartas estiverem quando o tempo acabar.',
        'If nobody touches the row, the reveal uses the order the cards are in when time runs out.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Inspirado no jogo de cartas **ito**. Esta é uma versão independente e não oficial para o Noir Club, com nome, temas, telas e textos próprios, que muda as regras para a plataforma (dicas escritas, modo competitivo com pontos, precisão no cooperativo).',
        'Inspired by the card game **ito**. This is an independent, unofficial version for Noir Club, with its own name, themes, screens and texts, and rule changes for the platform (written clues, a competitive mode with points, accuracy in co-op).',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText | null = tx(
  'Inspirado no jogo de cartas **ito**. Versão não oficial, com nome, temas e textos próprios.',
  'Inspired by the card game **ito**. Unofficial version with its own name, themes and texts.',
);
