import type { I18nText } from '@mp/game-sdk';

// Tutorial slides, full rules and first-round hints, in PT-BR and EN, shared by the logic (page
// counts) and the UI (content). No secrets here: it ships to every phone. Inline markup: **bold**.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type SlideDemo = 'goal' | 'board' | 'turn' | 'reactions' | 'flow';

/** Tutorial on the TV before the Host's setup — teaches the first round only. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: SlideDemo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'goal',
    body: [
      tx(
        'Onze jogadores, onze classes, uma corrida. Mas ninguém quer chegar primeiro: vence quem cruzar a chegada **exatamente em 6º**, no meio.',
        'Eleven players, eleven classes, one race. But nobody wants to finish first: whoever crosses the line **exactly 6th**, in the middle, wins.',
      ),
      tx(
        'Quanto mais longe do 6º você chegar, menos pontos. **1º e 11º** saem sem nada.',
        'The further from 6th you finish, the fewer points. **1st and 11th** score nothing.',
      ),
    ],
  },
  {
    title: tx('O tabuleiro', 'The board'),
    demo: 'board',
    body: [
      tx(
        'Cada classe corre na **sua linha**, da **Largada** (coluna 1) até a **Chegada** (última coluna). Quem chega sai da corrida na hora.',
        'Each class races on **its own row**, from the **Start** (column 1) to the **Finish** (last column). Whoever arrives leaves the race at once.',
      ),
      tx(
        'Ao lado do nome, a TV mostra as **cartas já descartadas** de cada um. Embaixo, a **classificação ao vivo** — o 6º lugar brilha.',
        'Next to each name the TV shows the **cards already discarded**. At the bottom, the **live standings** — 6th place glows.',
      ),
    ],
  },
  {
    title: tx('Sua vez', 'Your turn'),
    demo: 'turn',
    body: [
      tx(
        'As classes jogam em ordem, **1 a 11**. Na sua vez, toque numa carta no celular: você **descarta** e anda esse número de casas.',
        'Classes play in order, **1 to 11**. On your turn, tap a card on your phone: you **discard** it and move that many spaces.',
      ),
      tx(
        'Sua mão é **segredo**; o descarte é público. Quando a mão acaba, **todas as cartas voltam**.',
        'Your hand is **secret**; discards are public. When your hand runs out, **every card comes back**.',
      ),
      tx(
        'Algumas classes têm escolhas extras na vez (Gravidade, Silêncio, Pulo, Rápido) — o celular mostra quando.',
        'Some classes get extra choices on their turn (Gravity, Silence, Leap, Swift) — the phone shows them when they apply.',
      ),
    ],
  },
  {
    title: tx('Reações em cadeia', 'Chain reactions'),
    demo: 'reactions',
    body: [
      tx(
        'Todo movimento dispara as reações, nesta ordem: **A** — o **Um** reage a uma carta "1"; **B** — **Reset**, **Delete** e **Espelho** reagem por obrigação; **C** — as demais, da classe 1 à 11.',
        'Every move triggers reactions, in this order: **A** — **One** reacts to a "1" card; **B** — **Reset**, **Delete** and **Mirror** react by force; **C** — the rest, class 1 to 11.',
      ),
      tx(
        'Se uma reação mexe alguém, ela dispara novas reações. Quando for a sua, o celular pede a escolha; a TV narra cada passo.',
        'If a reaction moves someone, that triggers new reactions. When it is yours, your phone asks for the choice; the TV narrates every step.',
      ),
    ],
  },
  {
    title: tx('A partida, passo a passo', 'The match, step by step'),
    demo: 'flow',
    body: [
      tx(
        '**1 · Votação invertida** — quem receber mais votos escolhe a classe por **último**. Empates votam de novo.',
        '**1 · Inverted vote** — whoever gets the most votes picks a class **last**. Ties vote again.',
      ),
      tx(
        '**2 · Escolha de classes** — um por vez, na ordem da votação. **3 · Estratégia** — conversem e combinem. **4 · Corrida** — com pausas a cada algumas rodadas.',
        '**2 · Class pick** — one at a time, in vote order. **3 · Strategy** — talk and make deals. **4 · Race** — with breaks every few rounds.',
      ),
    ],
  },
];

/** Full rules, in the order a newcomer needs them. Numbers match the code and default settings. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        '**Middle Race** é para exatamente **11 jogadores**. Cada um controla uma das 11 classes numa corrida e tenta cruzar a chegada **em 6º lugar**.',
        '**Middle Race** is for exactly **11 players**. Each controls one of the 11 classes in a race and tries to cross the finish **in 6th place**.',
      ),
      tx(
        'O tabuleiro tem 11 linhas (uma por classe) e **32 colunas** por padrão (o Host pode mudar de 16 a 48). Coluna 1 é a **Largada**, a última é a **Chegada**.',
        'The board has 11 rows (one per class) and **32 columns** by default (the Host can set 16 to 48). Column 1 is the **Start**, the last one is the **Finish**.',
      ),
      tx(
        'A TV mostra o tabuleiro, a narração e a classificação ao vivo. O celular é o seu controle: sua mão, suas jogadas e suas decisões.',
        'The TV shows the board, the narration and the live standings. Your phone is your controller: your hand, your plays and your decisions.',
      ),
    ],
  },
  {
    title: tx('Preparação e leitura', 'Setup and reading'),
    body: [
      tx(
        'Depois do tutorial, o **Host** ajusta a partida no celular: colunas, tempos de leitura, votação, escolha, estratégia, turno e reação, e as pausas. Os outros leem o guia.',
        'After the tutorial, the **Host** sets up the match on their phone: columns, reading, vote, pick, strategy, turn and reaction times, and breaks. Everyone else reads the guide.',
      ),
      tx(
        '**Tempo de leitura** (90 s por padrão, pode ser desligado): regras e classes na TV. Acaba antes se todos tocarem **Pronto**.',
        '**Reading time** (90 s by default, can be turned off): rules and classes on the TV. It ends early when everyone taps **Ready**.',
      ),
    ],
  },
  {
    title: tx('Votação invertida', 'Inverted vote'),
    body: [
      tx(
        'Todos votam em quem deve escolher a classe por último. Pode votar em si mesmo. O voto é **secreto**: a TV mostra só quem já votou e, na apuração, o total de cada um.',
        'Everyone votes for who should pick a class last. You may vote for yourself. Votes are **secret**: the TV only shows who has voted and, at the tally, each total.',
      ),
      tx(
        'Quem tem **mais votos** fica com a **última** posição em disputa; quem tem menos, com a primeira. Jogadores **empatados** fazem uma nova votação só entre eles, pelas posições que dividem — todos os 11 votam de novo.',
        'The **most voted** takes the **last** position at stake; the least voted, the first. **Tied** players hold a new vote among themselves only, for the positions they share — all 11 vote again.',
      ),
      tx(
        'As votações das posições mais altas vêm primeiro. Um grupo que empata do mesmo jeito **vota de novo, sem limite**. Quem não vota a tempo simplesmente não conta (45 s por votação por padrão).',
        'Votes for later positions come first. A group that ties the same way **votes again, with no limit**. Anyone who doesn\'t vote in time simply doesn\'t count (45 s per vote by default).',
      ),
    ],
  },
  {
    title: tx('Escolha de classes e estratégia', 'Class pick and strategy'),
    body: [
      tx(
        'Na ordem da votação, cada jogador escolhe uma classe livre (30 s por padrão; se o tempo acabar, ganha uma classe aleatória). O último recebe a que sobrou.',
        'In vote order, each player picks a free class (30 s by default; if time runs out, they get a random one). The last player gets the one left.',
      ),
      tx(
        '**Estratégia** (120 s por padrão, pode ser desligada): conversem à vontade. Acaba antes se todos tocarem **Pronto**.',
        '**Strategy** (120 s by default, can be turned off): talk freely. It ends early when everyone taps **Ready**.',
      ),
      tx(
        'Antes da corrida, o **Rápido** escolhe em segredo **2 das suas 4 cartas** que vão andar sempre **para trás**.',
        'Before the race, **Swift** secretly picks **2 of its 4 cards** that always move **backwards**.',
      ),
    ],
  },
  {
    title: tx('Cartas', 'Cards'),
    body: [
      tx(
        'Cada jogador começa com as cartas **1, 2, 3 e 4**. O **Pulo** tem também a carta **0**.',
        'Every player starts with cards **1, 2, 3 and 4**. **Leap** also has a **0** card.',
      ),
      tx(
        'Sua mão é **secreta**. A carta descartada em cada jogada é **pública** e aparece ao lado do seu nome na TV.',
        'Your hand is **secret**. The card discarded on each play is **public** and shows next to your name on the TV.',
      ),
      tx(
        'Quando você descarta a última carta, **todas voltam para a mão** (inclusive as que o Delete tirou). O Pulo também pode resetar com 2 cartas na mão.',
        'When you discard your last card, **all of them come back** (including those Delete took). Leap may also reset with 2 cards in hand.',
      ),
    ],
  },
  {
    title: tx('Seu turno', 'Your turn'),
    body: [
      tx(
        'As classes jogam em ordem crescente, **1 a 11**, e depois recomeçam. Quem já chegou é pulado. Uma **rodada** é uma volta completa.',
        'Classes play in ascending order, **1 to 11**, then start over. Anyone who has finished is skipped. A **round** is one full lap.',
      ),
      tx(
        '**Ação padrão**: descarte uma carta e ande esse número para frente (o Rápido anda para trás com as cartas escolhidas). Gravidade e Silêncio podem usar a habilidade; Pulo e Rápido têm opções próprias.',
        '**Standard action**: discard a card and move that many spaces forward (Swift moves back with its chosen cards). Gravity and Silence may use their ability; Leap and Swift have their own options.',
      ),
      tx(
        'Você tem **30 s** por turno (o Host pode mudar). Se o tempo acabar, o jogo descarta **uma carta aleatória** por você, sem habilidade.',
        'You have **30 s** per turn (the Host can change it). If time runs out, the game plays **a random card** for you, with no ability.',
      ),
    ],
  },
  {
    title: tx('Sistema de reações', 'Reaction system'),
    body: [
      tx(
        'Depois de **qualquer movimento** (por carta ou por habilidade), as reações rodam em três fluxos:',
        'After **any movement** (by card or by ability), reactions run in three flows:',
      ),
      tx(
        '**A · Especial Um** — se o movimento foi com uma carta **"1"** de outra classe, o **Um** anda 1 para frente ou para trás, antes de tudo.',
        '**A · Special One** — if the move used another class\'s **"1"** card, **One** moves 1 forward or back, before anything else.',
      ),
      tx(
        '**B · Direto** — **Reset** que andou para trás, **Delete** e **Espelho** movidos por outra classe agem na hora, por obrigação, na ordem das classes.',
        '**B · Direct** — **Reset** moved backwards, and **Delete** and **Mirror** moved by another class act at once, by force, in class order.',
      ),
      tx(
        '**C · Reativo** — verifica as classes de 1 a 11 (**Empurrão**, **Junto**, **União**). Toda reação que move alguém dispara um novo sistema de reações; quando ele termina, a verificação recomeça da classe 1.',
        '**C · Reactive** — checks classes 1 to 11 (**Shove**, **Together**, **Union**). Every reaction that moves someone triggers a new reaction system; when it ends, the check restarts from class 1.',
      ),
      tx(
        'Escolhas de reação têm **15 s** (o Host pode mudar); se o tempo acabar, a escolha é sorteada. Um turno tem no máximo **50 movimentos**: depois disso as reações param ("Ciclo interrompido").',
        'Reaction choices have **15 s** (the Host can change it); if time runs out, the choice is random. A turn allows at most **50 movements**: after that, reactions stop ("Loop cut").',
      ),
    ],
  },
  {
    title: tx('Largada, chegada e alvos', 'Start, finish and targets'),
    body: [
      tx(
        '**Largada**: quem está na coluna 1 não reage — exceto o **Um**, que reage sempre, e o **Empurrão** depois de já ter se movido. Quem está lá ainda pode ser alvo e usar habilidades ativas.',
        '**Start**: whoever is on column 1 does not react — except **One**, which always reacts, and **Shove** once it has moved. They can still be targeted and use active abilities.',
      ),
      tx(
        '**Chegada**: quem chega sai da corrida na hora e não reage mais. Movimentos que passariam das bordas **param** na coluna 1 ou na chegada.',
        '**Finish**: whoever arrives leaves the race at once and reacts no more. Moves that would go past the edges **stop** at column 1 or at the finish.',
      ),
      tx(
        '**Não consecutivo**: Gravidade, Reset, Empurrão, Delete, Junto, Espelho e Silêncio não podem escolher o mesmo jogador em duas ativações seguidas. Se o único alvo possível for esse, a habilidade **não ativa** dessa vez — e na próxima pode escolhê-lo de novo.',
        '**Non-consecutive**: Gravity, Reset, Shove, Delete, Together, Mirror and Silence cannot pick the same player in two activations in a row. If that player is the only possible target, the ability **does not fire** this time — and next time it may pick them again.',
      ),
    ],
  },
  {
    title: tx('Classes 1 a 4', 'Classes 1 to 4'),
    body: [
      tx(
        '**1 · Gravidade** (ativa): no seu turno, descarta 1 carta **sem andar** e puxa um jogador de outra coluna — se está à frente, vai para 1 casa à sua frente; se está atrás, para 1 casa atrás de você.',
        '**1 · Gravity** (active): on your turn, discard 1 card **without moving** and pull a player from another column — if ahead, they land 1 space in front of you; if behind, 1 space behind you.',
      ),
      tx(
        '**2 · Reset** (obrigatória): sempre que anda **para trás**, por qualquer motivo, escolhe outro jogador — todas as cartas descartadas dele voltam para a mão.',
        '**2 · Reset** (forced): whenever it moves **backwards**, for any reason, it picks another player — all their discarded cards return to their hand.',
      ),
      tx(
        '**3 · Empurrão** (reativa): não divide espaço (exceto largada e chegada). Cada jogador no seu espaço, em ordem de classe, é empurrado 1 casa para frente ou para trás, à sua escolha; cada empurrão roda um sistema de reações completo.',
        '**3 · Shove** (reactive): shares no space (except start and finish). Everyone on its space, in class order, is shoved 1 space forward or back, its choice; each shove runs a full reaction system.',
      ),
      tx(
        '**4 · Delete** (obrigatória): quando outra classe o move, escolhe um jogador, vê a mão dele e escolhe **1 carta para ele manter**; as outras somem até o próximo reset dele.',
        '**4 · Delete** (forced): when another class moves it, it picks a player, sees their hand and chooses **1 card they keep**; the rest vanish until their next reset.',
      ),
    ],
  },
  {
    title: tx('Classes 5 a 8', 'Classes 5 to 8'),
    body: [
      tx(
        '**5 · Junto** (reativa): ao andar com a **última carta** da mão, escolhe outro jogador, que anda para frente a mesma distância.',
        '**5 · Together** (reactive): when it moves with the **last card** in hand, it picks another player, who moves forward the same distance.',
      ),
      tx(
        '**6 · União** (automática): todos que estiverem **exatamente 1 casa à frente** dela são puxados para o espaço dela.',
        '**6 · Union** (automatic): everyone **exactly 1 space ahead** of it is pulled onto its space.',
      ),
      tx(
        '**7 · Um** (reação especial): sempre que **outro** jogador joga uma carta **"1"** para se mover (inclusive dobrada ou para trás), anda 1 casa para frente ou para trás. Funciona até na largada.',
        '**7 · One** (special reaction): whenever **another** player plays a **"1"** card to move (doubled or backwards too), it moves 1 space forward or back. Works even on the start column.',
      ),
      tx(
        '**8 · Espelho** (obrigatória): quando outra classe o move, escolhe um jogador e o move a **mesma distância na direção oposta**.',
        '**8 · Mirror** (forced): when another class moves it, it picks a player and moves them the **same distance the opposite way**.',
      ),
    ],
  },
  {
    title: tx('Classes 9 a 11', 'Classes 9 to 11'),
    body: [
      tx(
        '**9 · Pulo** (propriedade): tem as cartas **0 a 4**. Ao andar com a carta, **pula** jogadores sem contá-los como casas. A carta 0 descarta sem andar. Com 2 cartas na mão pode **resetar** no início do turno e jogar em seguida.',
        '**9 · Leap** (property): holds cards **0 to 4**. Moving with a card, it **leaps** over players without counting them as spaces. The 0 card discards without moving. With 2 cards in hand it may **reset** at the start of its turn, then play.',
      ),
      tx(
        '**10 · Silêncio** (ativa): antes de jogar a carta, pode **calar** outro jogador: a habilidade e as propriedades dele ficam desligadas até o próximo turno do Silêncio.',
        '**10 · Silence** (active): before playing its card, it may **silence** another player: their ability and properties are off until Silence\'s next turn.',
      ),
      tx(
        '**11 · Rápido** (propriedade): 2 cartas andam sempre para trás (escolhidas em segredo). A cada carta pode **dobrar** o valor; a direção nunca muda.',
        '**11 · Swift** (property): 2 cards always move backwards (picked in secret). Each card, it may **double** the value; the direction never changes.',
      ),
    ],
  },
  {
    title: tx('Rodadas, pausas e ausências', 'Rounds, breaks and absences'),
    body: [
      tx(
        'Com a **pausa** ligada (padrão: a cada **5 rodadas**, **60 s**), a TV mostra a classificação e o jogo para. Acaba antes se todos tocarem **Pronto**. No alto da TV aparecem as rodadas que faltam para a pausa.',
        'With **breaks** on (default: every **5 rounds**, **60 s**), the TV shows the standings and play stops. It ends early when everyone taps **Ready**. The top of the TV shows the rounds left until the break.',
      ),
      tx(
        'Se alguém cair, o jogo pausa por 20 s. Se não voltar, essa pessoa vira **automática**: suas jogadas e decisões são sorteadas na hora. Se voltar, joga de novo normalmente.',
        'If someone drops, the game pauses for 20 s. If they don\'t come back, they become **automatic**: their plays and decisions are random and immediate. If they return, they play normally again.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'Quem chega primeiro na mesma cascata fica com a melhor posição. A corrida termina quando sobra no máximo um corredor, que fica em último.',
        'Whoever reaches the finish first in the same cascade gets the better place. The race ends when at most one runner is left, who takes last place.',
      ),
      tx(
        'Pontos pela posição na corrida: **6º = 10**; **5º e 7º = 7**; **4º e 8º = 5**; **3º e 9º = 3**; **2º e 10º = 1**; **1º e 11º = 0**. Os pontos somam no placar da sala.',
        'Points by race place: **6th = 10**; **5th and 7th = 7**; **4th and 8th = 5**; **3rd and 9th = 3**; **2nd and 10th = 1**; **1st and 11th = 0**. Points add to the room scoreboard.',
      ),
    ],
  },
];

/** Original game: no credits needed. */
export const CREDITS: I18nText | null = null;

/** One-line tips on the TV during the first round while the tutorial option is on. */
export type Hint = 'turn' | 'react' | 'cascade';

export const HINTS: Record<Hint, I18nText> = {
  turn: tx('Dica: quem está na vez toca numa carta no celular.', 'Tip: whoever\'s turn it is taps a card on their phone.'),
  react: tx('Dica: uma reação pede uma escolha — olhe o celular de quem está em vermelho.', 'Tip: a reaction needs a choice — check the phone of whoever is in red.'),
  cascade: tx('Dica: cada movimento dispara reações — Um, depois Reset/Delete/Espelho, depois 1→11.', 'Tip: every move triggers reactions — One, then Reset/Delete/Mirror, then 1→11.'),
};
