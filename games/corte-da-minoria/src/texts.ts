import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms; {token} for the
// icons the UI swaps in: {blue} {green} the colours, {crown} the king, {pass} the Royal Pass.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type DemoKind = 'court' | 'colors' | 'divide' | 'pass' | 'score';

/** Tutorial slides shown on the TV before the election (the Host advances them from the phone). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: DemoKind }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'court',
    body: [
      tx(
        'Cada rodada, o {crown} **rei** divide a corte em dois salões: **A** e **B**.',
        'Each round, the {crown} **king** splits the court into two halls: **A** and **B**.',
      ),
      tx(
        'Você pontua quando, no seu salão, a sua cor secreta está em **minoria**.',
        'You score when, in your hall, your secret colour is in the **minority**.',
      ),
      tx(
        'Todos serão rei uma vez. Os pontos ficam em segredo até o fim.',
        'Everyone will be king once. Points stay secret until the end.',
      ),
    ],
  },
  {
    title: tx('Sua cor secreta', 'Your secret colour'),
    demo: 'colors',
    body: [
      tx(
        'Antes da 1ª rodada, cada um escolhe em segredo {blue} **Azul** ou {green} **Verde**.',
        'Before round 1, everyone secretly picks {blue} **Blue** or {green} **Green**.',
      ),
      tx(
        'A cada 2 rodadas (antes da 3ª, 5ª, 7ª…) você pode **manter ou trocar** a cor.',
        'Every 2 rounds (before rounds 3, 5, 7…) you may **keep or switch** your colour.',
      ),
      tx(
        'Ninguém mais vê sua cor. Blefe à vontade.',
        'Nobody else sees your colour. Bluff away.',
      ),
    ],
  },
  {
    title: tx('O rei divide', 'The king splits'),
    demo: 'divide',
    body: [
      tx(
        'O primeiro rei é **eleito por voto secreto**. Depois, cada rei nomeia um **sucessor** que ainda não reinou.',
        'The first king is **elected by secret vote**. After that, each king names an **heir** who hasn’t reigned yet.',
      ),
      tx(
        'O rei coloca todos — inclusive ele mesmo — em A ou B, ao vivo na TV. Pelo menos **2 em cada salão**.',
        'The king places everyone — themselves included — in A or B, live on the TV. At least **2 in each hall**.',
      ),
      tx('Negociem, pressionem, mintam.', 'Negotiate, pressure, lie.'),
    ],
  },
  {
    title: tx('Passe Real', 'Royal Pass'),
    demo: 'pass',
    body: [
      tx(
        'Cada jogador tem **um** {pass} **Passe Real** para a partida inteira.',
        'Each player has **one** {pass} **Royal Pass** for the whole match.',
      ),
      tx(
        'Depois que o rei divide, há alguns segundos em que você pode usá-lo para **trocar de salão**. Todos veem.',
        'After the king splits, there are a few seconds in which you can use it to **switch halls**. Everyone sees it.',
      ),
    ],
  },
  {
    title: tx('Quem pontua', 'Who scores'),
    demo: 'score',
    body: [
      tx(
        'Em cada salão, quem tem a cor **com menos gente** ganha **1 ponto**.',
        'In each hall, whoever has the colour **with fewer people** scores **1 point**.',
      ),
      tx(
        'Empate, uma cor só ou alguém sozinho no salão: **ninguém pontua** ali.',
        'A tie, a single colour or someone alone in the hall: **nobody scores** there.',
      ),
      tx(
        'A TV mostra só quantos de cada cor havia em cada salão. Seu celular diz se você pontuou.',
        'The TV only shows how many of each colour were in each hall. Your phone tells you if you scored.',
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
        'Jogo de blefe e dedução para **5 a 15** pessoas. Cada um guarda uma cor secreta e tenta ficar na **minoria** do salão onde o rei o colocar.',
        'A bluffing and deduction game for **5 to 15** people. Everyone keeps a secret colour and tries to be in the **minority** of the hall the king puts them in.',
      ),
      tx(
        'Há tantas rodadas quanto jogadores: **todos serão rei uma vez**. Vence quem tiver mais pontos no fim.',
        'There are as many rounds as players: **everyone is king once**. The most points at the end wins.',
      ),
    ],
  },
  {
    title: tx('As peças', 'The pieces'),
    body: [
      tx(
        '{blue} **Azul** e {green} **Verde**: as duas cores. A sua só aparece no seu celular (segure para ver) — ou só no Dealer, se o Host escolheu assim.',
        '{blue} **Blue** and {green} **Green**: the two colours. Yours only shows on your phone (hold to see) — or only at the Dealer, if the Host chose so.',
      ),
      tx(
        '**Salão A** e **Salão B**: os dois grupos da rodada. Não precisa mudar de sala, é só a divisão na TV.',
        '**Hall A** and **Hall B**: the round’s two groups. Nobody changes rooms; it is just the split on the TV.',
      ),
      tx(
        '{crown} **Rei**: divide a corte e nomeia o próximo rei.',
        '{crown} **King**: splits the court and names the next king.',
      ),
      tx(
        '{pass} **Passe Real**: um por jogador, uso único na partida, intransferível. Troca você de salão depois da divisão.',
        '{pass} **Royal Pass**: one per player, single use per match, not transferable. Moves you to the other hall after the split.',
      ),
    ],
  },
  {
    title: tx('A eleição', 'The election'),
    body: [
      tx(
        'No começo, todos votam em segredo no celular para eleger o primeiro rei. Pode votar em si mesmo e trocar o voto até o tempo acabar (45 s por padrão; o Host pode mudar).',
        'At the start, everyone votes in secret on their phone to elect the first king. You may vote for yourself and change your vote until time runs out (45 s by default; the Host can change it).',
      ),
      tx(
        'A TV mostra só quantos votos cada um recebeu. **Empate**: nova votação apenas entre os mais votados. Novo empate: **sorteio** entre eles.',
        'The TV only shows how many votes each person got. **Tie**: a new vote among the most voted only. Another tie: a **draw** among them.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Cor** (só nas rodadas 1, 3, 5…): escolha {blue} ou {green}; nas rodadas 3, 5… mantenha ou troque. Quem não escolher a tempo mantém a cor (na 1ª rodada, recebe uma ao acaso).',
        '**1 · Colour** (rounds 1, 3, 5… only): pick {blue} or {green}; in rounds 3, 5… keep or switch. Anyone who doesn’t choose in time keeps their colour (in round 1, gets a random one).',
      ),
      tx(
        '**2 · Divisão**: o rei coloca cada jogador em A ou B no celular dele; a TV mostra ao vivo. Ele confirma quando todos estão posicionados e há pelo menos 2 em cada salão (2 min por padrão).',
        '**2 · Split**: the king puts each player in A or B on their phone; the TV shows it live. They confirm once everyone is placed with at least 2 in each hall (2 min by default).',
      ),
      tx(
        '**3 · Passe Real**: alguns segundos (20 s por padrão) para quem quiser usar o passe. Toque em **Pronto** se não for usar.',
        '**3 · Royal Pass**: a few seconds (20 s by default) for anyone who wants to use their pass. Tap **Ready** if you won’t.',
      ),
      tx(
        '**4 · Revelação**: a TV mostra quantos {blue} e {green} há em cada salão; cada celular diz ao dono se pontuou.',
        '**4 · Reveal**: the TV shows how many {blue} and {green} are in each hall; each phone tells its owner whether they scored.',
      ),
      tx(
        '**5 · Sucessor**: o rei escolhe o próximo rei entre quem ainda não reinou.',
        '**5 · Heir**: the king picks the next king among those who haven’t reigned.',
      ),
    ],
  },
  {
    title: tx('Passe Real', 'Royal Pass'),
    body: [
      tx(
        'Depois que o rei confirma a divisão, abre-se a janela do {pass} **Passe Real**. Usar o passe troca você de salão na hora, e a TV mostra quem usou.',
        'Once the king confirms the split, the {pass} **Royal Pass** window opens. Using it moves you to the other hall at once, and the TV shows who used it.',
      ),
      tx(
        'Cada um tem só um, para a partida inteira. O rei também tem o dele. A janela fecha no tempo ou quando todos que ainda têm passe tocarem **Pronto**.',
        'Everyone has only one for the whole match. The king has one too. The window closes when time runs out or when everyone still holding a pass taps **Ready**.',
      ),
      tx(
        'O passe pode deixar um salão com menos de 2 pessoas — o mínimo de 2 vale só para o rei.',
        'A pass may leave a hall with fewer than 2 people — the minimum of 2 only binds the king.',
      ),
    ],
  },
  {
    title: tx('Pontuação', 'Scoring'),
    body: [
      tx(
        'Em cada salão, se as duas cores estão presentes e em números diferentes, cada jogador da cor **com menos gente** ganha **1 ponto**.',
        'In each hall, if both colours are present in different numbers, each player of the colour **with fewer people** scores **1 point**.',
      ),
      tx(
        'Exemplo: salão A com 4 {blue} e 3 {green} → os 3 {green} pontuam. Salão B com 3 {green} e 2 {blue} → os 2 {blue} pontuam.',
        'Example: hall A with 4 {blue} and 3 {green} → the 3 {green} score. Hall B with 3 {green} and 2 {blue} → the 2 {blue} score.',
      ),
      tx(
        '**Empate** (2 × 2), **uma cor só**, **alguém sozinho** ou salão vazio: ninguém pontua naquele salão.',
        'A **tie** (2 × 2), **a single colour**, **someone alone** or an empty hall: nobody scores in that hall.',
      ),
      tx(
        'Os pontos são **secretos**: seu celular mostra só os seus.',
        'Points are **secret**: your phone only shows your own.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        '**Rei sem tempo**: quem ele não posicionou vai para um salão ao acaso (mantendo 2 em cada); se não nomear um sucessor, ele é sorteado.',
        '**King out of time**: anyone left unplaced goes to a random hall (keeping 2 in each); if no heir is named, one is drawn.',
      ),
      tx(
        '**Cor no Dealer** (opção do Host): na janela de cor, todos vão ao Dealer. Lá a tela mostra sua cor atual e você escolhe no celular. Quem não for a tempo mantém a cor (na 1ª rodada, recebe uma ao acaso).',
        '**Colour at the Dealer** (Host option): in each colour window everyone visits the Dealer. Its screen shows your current colour and you choose on your phone. Anyone who doesn’t go in time keeps their colour (in round 1, gets a random one).',
      ),
      tx(
        '**Quem sai** da partida deixa os salões e a fila do trono; seus pontos continuam valendo. Com menos de 4 jogadores, a partida termina.',
        '**Anyone who leaves** the match drops out of the halls and the throne line; their points still count. With fewer than 4 players, the match ends.',
      ),
    ],
  },
  {
    title: tx('Fim da partida', 'End of the match'),
    body: [
      tx(
        'Depois da rodada do último rei, a TV revela tudo: a cor, o salão e o ponto de cada jogador em cada rodada, e o total de cada um.',
        'After the last king’s round, the TV reveals everything: each player’s colour, hall and point in every round, and everyone’s total.',
      ),
      tx(
        'Vence quem tiver mais pontos; empates dividem a posição. Os pontos entram no placar da sala.',
        'The most points wins; ties share the place. Points go to the room’s scoreboard.',
      ),
    ],
  },
];

export const CREDITS: I18nText | null = tx(
  'Adaptado do “King Game” de The Genius, temporada 2, episódio 3 (tvN). Versão não oficial.',
  'Adapted from “King Game” in The Genius, season 2, episode 3 (tvN). Unofficial version.',
);
