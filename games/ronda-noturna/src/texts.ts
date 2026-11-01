import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules (see the skill's reference/rules.md), in PT-BR and EN, shared by the
// logic (page counts) and the UI (content). No secrets here: it ships to every phone.
// Inline markup: **bold** for the terms a player must spot.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** The five spaces of the house; with remote screens on, phones say which one to be in. */
export const SPACES = {
  hall: tx('Corredor', 'Hall'),
  thieves: tx('Sala dos ladrões', "Thieves' room"),
  red: tx('Sala Vermelha', 'Red room'),
  blue: tx('Sala Azul', 'Blue room'),
  green: tx('Sala Verde', 'Green room'),
} satisfies Record<string, I18nText>;

/**
 * Tutorial slides on the TV before the role briefing; the Host advances them from the phone.
 * `demo` names the live illustration the TV draws beside the text with the game's own pieces.
 */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'sides' | 'rooms' | 'map' | 'round' | 'secrets' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'sides',
    body: [
      tx(
        'Dois **ladrões** invisíveis roubam **estrelas** escondidas pela cidade. Com **15 estrelas**, eles vencem.',
        'Two unseen **thieves** steal **stars** hidden around the city. With **15 stars**, they win.',
      ),
      tx(
        'Três equipes de polícia — **Vermelha**, **Azul** e **Verde** — vencem se **prenderem os dois**.',
        'Three police squads — **Red**, **Blue** and **Green** — win if they **arrest both**.',
      ),
      tx(
        'Mas duas equipes escondem um **policial corrupto**, que joga pelos ladrões.',
        'But two of the squads hide a **crooked cop**, who plays for the thieves.',
      ),
    ],
  },
  {
    title: tx('Cada time na sua sala', 'Each side in its own room'),
    demo: 'rooms',
    body: [
      tx(
        'Ladrões e cada equipe de polícia têm **uma sala só sua**; todos se encontram no **corredor**.',
        'The thieves and each police squad have **a room of their own**; everyone meets in the **hall**.',
      ),
      tx(
        'Na **sua vez**, sua equipe fica na sua sala. Fora dela, ande pelo corredor — **nunca entre na sala de outro time**.',
        'On **your turn**, your side stays in its room. Otherwise roam the hall — **never enter another side’s room**.',
      ),
      tx(
        'A tela da sala dos ladrões (o **Dealer**) mostra as estrelas e onde eles estão.',
        'The screen in the thieves’ room (the **Dealer**) shows the stars and where they are.',
      ),
    ],
  },
  {
    title: tx('O mapa', 'The map'),
    demo: 'map',
    body: [
      tx(
        'A cidade é feita de **casas numeradas** ligadas por linhas. Cada linha vale **1 passo**.',
        'The city is made of **numbered stops** joined by lines. Every line is **1 step**.',
      ),
      tx(
        'Os **peões da polícia** são públicos: cada um mostra o avatar do jogador na cor da equipe.',
        'The **police pawns** are public: each shows the player’s avatar in the squad’s colour.',
      ),
      tx(
        'Os **ladrões** e as **estrelas** ficam escondidos. Ladrão que passa ou para numa estrela **pega na hora**.',
        'The **thieves** and the **stars** stay hidden. A thief who passes or stops on a star **takes it at once**.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    demo: 'round',
    body: [
      tx(
        '**1 · Ladrões**: em ordem, cada um anda **até 2 casas** (ou fica parado).',
        '**1 · Thieves**: in order, each moves **up to 2 stops** (or stays put).',
      ),
      tx(
        '**2 · Polícia**: uma equipe de cada vez, cada policial com **2 ações**: andar 0 ou 1 casa e **Investigar** ou **Prender**.',
        '**2 · Police**: one squad at a time, each cop with **2 actions**: move 0 or 1 stop, then **Investigate** or **Arrest**.',
      ),
      tx(
        '**Investigar** diz só a você se algum ladrão **já pisou** naquela casa. **Prender** pega todo ladrão que estiver ali.',
        '**Investigate** tells only you whether a thief **has ever stepped** on that stop. **Arrest** catches every thief there.',
      ),
    ],
  },
  {
    title: tx('Segredos e o fim', 'Secrets and the end'),
    demo: 'secrets',
    body: [
      tx(
        'Seu papel aparece no celular só enquanto você **segura o botão**. Os corruptos sabem quem são; os ladrões também.',
        'Your role shows on the phone only while you **hold the button**. The crooked cops know each other; so do the thieves.',
      ),
      tx(
        'A prisão de um **corrupto sempre falha** — e parece igual a errar a casa.',
        'A **crooked cop’s arrest always fails** — and looks just like a miss.',
      ),
      tx(
        'No **teto de rodadas**, cada equipe vota em quem acha ser o corrupto. Se todas acertarem, a polícia vence.',
        'At the **round cap**, each squad votes for who it thinks is crooked. If every squad is right, the police win.',
      ),
    ],
  },
];

/**
 * The full rules, readable on any phone at any time and showable on the TV by the Host.
 * Numbers match the default config; the Host can change the ones marked so.
 */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Jogo de dedução e perseguição para **10 a 14 pessoas**, em casa, com quatro salas isoladas e um corredor que liga todas.',
        'A deduction and chase game for **10 to 14 people**, at home, with four separate rooms and a hall joining them.',
      ),
      tx(
        '**Ladrões** (2) roubam estrelas escondidas no mapa. **Policiais** (os demais), em três equipes, tentam prendê-los. Dois policiais são **corruptos** e vencem junto com os ladrões.',
        '**Thieves** (2) steal stars hidden on the map. **Cops** (everyone else), in three squads, try to catch them. Two cops are **crooked** and win with the thieves.',
      ),
      tx(
        'Ladrões e corruptos vencem com **15 estrelas** (o Host pode mudar a meta). A polícia honesta vence **prendendo os dois ladrões**. Se o **teto de rodadas** chegar antes, uma votação decide.',
        'Thieves and crooked cops win at **15 stars** (the Host can change the goal). The honest police win by **arresting both thieves**. If the **round cap** comes first, a vote decides.',
      ),
    ],
  },
  {
    title: tx('Papéis', 'Roles'),
    body: [
      tx(
        '**Ladrões** — são 2, e todos sabem quem são. Ninguém vê onde estão, exceto eles mesmos e os corruptos (pelo registro).',
        '**Thieves** — there are 2, and everyone knows who they are. Nobody sees where they are, except themselves and the crooked cops (through the log).',
      ),
      tx(
        '**Equipes de polícia** — Vermelha, Azul e Verde, do tamanho mais parecido possível. Quem está em cada equipe e a **ordem** dentro dela são públicos.',
        '**Police squads** — Red, Blue and Green, as even in size as possible. Who is in each squad and the **turn order** inside it are public.',
      ),
      tx(
        '**Corruptos** — 2 policiais, **no máximo um por equipe**: duas equipes têm um, uma não tem nenhum. Os corruptos sabem um do outro, e os ladrões sabem dos dois. Os policiais honestos não sabem.',
        '**Crooked cops** — 2 cops, **at most one per squad**: two squads have one, one has none. The crooked cops know each other and the thieves know both. Honest cops don’t.',
      ),
      tx(
        'O corrupto vê, só no **registro secreto**, a casa onde cada ladrão começou e **para onde foi** a cada rodada — não o caminho nem as estrelas. Ladrões não aparecem no mapa dele. A prisão dele **sempre falha**.',
        'A crooked cop sees, only in their **secret log**, the stop where each thief started and **where they moved** each round — not the path, nor the stars. Thieves never show on their map. Their arrests **always fail**.',
      ),
    ],
  },
  {
    title: tx('Salas e telas', 'Rooms and screens'),
    body: [
      tx(
        '**Salas**: ladrões, Vermelha, Azul e Verde, cada time na sua; e o **corredor**. Durante a vez do seu time, fiquem todos na sua sala, sem contato com os outros. Fora da sua vez, circule pelo corredor, sem entrar em sala de outro time.',
        '**Rooms**: thieves, Red, Blue and Green, one per side; plus the **hall**. During your side’s turn, all stay in your room with no contact with others. Otherwise move around the hall without entering another side’s room.',
      ),
      tx(
        '**TV** (no corredor e nas salas da polícia): o mapa com os peões da polícia, as equipes, de quem é a vez, o tempo e o registro público.',
        '**TV** (in the hall and the police rooms): the map with the police pawns, the squads, whose turn it is, the clock and the public log.',
      ),
      tx(
        '**Dealer** (na sala dos ladrões): mostra as estrelas, os dois ladrões, as estrelas do bando e os corruptos marcados.',
        '**Dealer** (in the thieves’ room): shows the stars, both thieves, the gang’s stars and the crooked cops marked.',
      ),
      tx(
        '**Celular**: suas jogadas, o mapa com zoom, o **📜 Registro** (abre e fecha) e **Segure para ver seus segredos** — papel, investigações e registro secreto aparecem só enquanto você segura.',
        '**Phone**: your moves, a zoomable map, the **📜 Log** (opens and closes) and **Hold to see your secrets** — role, investigations and secret log show only while you hold.',
      ),
    ],
  },
  {
    title: tx('Preparação', 'Setup'),
    body: [
      tx(
        '**Papéis**: cada um vê o seu no celular (segurando o botão e tocando em **Pronto**) ou indo ao **Dealer**, um por vez — o Host escolhe antes da partida. Há um tempo para isso (60 s no celular; no Dealer, pelo menos 40 s por jogador).',
        '**Roles**: everyone sees theirs on the phone (hold the button, then tap **Ready**) or by going to the **Dealer**, one at a time — the Host picks before the match. There is a time limit (60 s on phones; at the Dealer, at least 40 s per player).',
      ),
      tx(
        '**28 estrelas** são escondidas em casas diferentes (o Host pode mudar).',
        '**28 stars** are hidden on different stops (the Host can change this).',
      ),
      tx(
        '**Posicionamento**: os policiais escolhem uma casa intercalando as equipes — o 1º da Vermelha, o 1º da Azul, o 1º da Verde, depois o 2º da Vermelha, e assim por diante. Depois os ladrões, em segredo — **não podem começar numa casa com estrela**. Várias pessoas podem ficar na mesma casa. Não há tempo limite.',
        '**Placing**: the cops pick a stop alternating squads — Red #1, Blue #1, Green #1, then Red #2, and so on. Then the thieves, in secret — **they cannot start on a star**. Several people may share a stop. There is no time limit.',
      ),
    ],
  },
  {
    title: tx('Vez dos ladrões', 'The thieves’ turn'),
    body: [
      tx(
        'Os ladrões sempre jogam primeiro, na ordem sorteada: o 2º só joga depois do 1º. O bando tem **3 minutos** no total (o Host pode mudar).',
        'The thieves always go first, in the drawn order: the 2nd moves after the 1st. The gang has **3 minutes** in total (the Host can change this).',
      ),
      tx(
        'Cada ladrão anda **0, 1 ou 2 casas** (toque nas casas uma de cada vez, depois **Ir para**; ou **Ficar parado**). Pode passar ou parar onde há policial — nada acontece.',
        'Each thief moves **0, 1 or 2 stops** (tap the stops one at a time, then **Go to**; or **Stay put**). They may pass or stop where a cop stands — nothing happens.',
      ),
      tx(
        'Toda **estrela** na casa onde passa ou para é coletada na hora. A nova posição só aparece para os ladrões e, no registro secreto, para os corruptos. O público vê apenas “**fulano jogou**”.',
        'Every **star** on a stop passed or reached is taken at once. The new position shows only to the thieves and, in the secret log, to the crooked cops. The public only sees “**so-and-so played**”.',
      ),
      tx(
        'Se o tempo acabar, quem não se moveu **fica parado**.',
        'If time runs out, whoever hasn’t moved **stays put**.',
      ),
    ],
  },
  {
    title: tx('Vez da polícia', 'The police turn'),
    body: [
      tx(
        'Depois dos ladrões, jogam as equipes, uma de cada vez. Dentro da equipe, cada policial joga na sua vez, na ordem sorteada; a equipe tem **5 minutos** no total (o Host pode mudar).',
        'After the thieves, the squads play one at a time. Within a squad, each cop plays in the drawn order; the squad has **5 minutes** in total (the Host can change this).',
      ),
      tx(
        'Cada policial tem **2 ações**. Uma ação é: escolher a sua casa ou uma vizinha (andar 0 ou 1 casa) e então **Investigar** ou **Prender** ali. Pode repetir a mesma ação. **Passar a vez** encerra sua vez; ações não usadas se perdem.',
        'Each cop has **2 actions**. An action is: pick your stop or a neighbouring one (move 0 or 1 stop), then **Investigate** or **Arrest** there. You may repeat an action. **Pass** ends your turn; unused actions are lost.',
      ),
      tx(
        '**Investigar**: só você vê se **algum ladrão já pisou** naquela casa em algum momento do jogo (começou, passou, parou ou está lá). Todos veem que você investigou a casa. Você pode contar o resultado à equipe — ou mentir.',
        '**Investigate**: only you see whether **a thief has ever stepped** on that stop at any point (started, passed, stopped or is there now). Everyone sees that you investigated it. You may tell your squad the result — or lie.',
      ),
      tx(
        '**Prender**: se houver ladrão na casa, ele é preso, e o resultado é público. A prisão de um **corrupto sempre falha**, mesmo na casa certa, e aparece igual a um erro.',
        '**Arrest**: if a thief is on the stop, they are caught, and the result is public. A **crooked cop’s arrest always fails**, even on the right stop, and looks like a miss.',
      ),
      tx(
        'Se o tempo da equipe acabar, quem ainda não agiu **perde a vez**.',
        'If the squad’s time runs out, whoever hasn’t acted **loses their turn**.',
      ),
    ],
  },
  {
    title: tx('Prisões e estrelas', 'Arrests and stars'),
    body: [
      tx(
        'Uma prisão pega **todos os ladrões** que estiverem na casa.',
        'One arrest catches **every thief** on the stop.',
      ),
      tx(
        'O ladrão preso sai do jogo e **perde todas as estrelas** que pegou. Elas voltam a ser escondidas em casas sem estrela e sem o ladrão que sobrou. O bando ainda precisa da **meta inteira**.',
        'An arrested thief leaves the game and **loses every star** they took. Those stars are hidden again on stops with no star and not under the remaining thief. The gang still needs the **full goal**.',
      ),
    ],
  },
  {
    title: tx('A rodada e as revelações', 'The round and the reveals'),
    body: [
      tx(
        '**1 · Ladrões** → **2 · Polícia**, uma equipe por vez. A ordem das equipes gira: rodada 1 Vermelha, Azul, Verde; rodada 2 Azul, Verde, Vermelha; rodada 3 Verde, Vermelha, Azul; e repete.',
        '**1 · Thieves** → **2 · Police**, one squad at a time. The squad order rotates: round 1 Red, Blue, Green; round 2 Blue, Green, Red; round 3 Green, Red, Blue; and repeat.',
      ),
      tx(
        'Antes de cada vez há **10 segundos** para o time chegar à sua sala; a TV diz quem vai.',
        'Before each turn there are **10 seconds** for that side to reach its room; the TV says who is up.',
      ),
      tx(
        'A TV mostra o tempo todo **quantas estrelas foram distribuídas** e a **meta** dos ladrões. Quantas o bando já coletou só aparece **a cada 5 rodadas** (o Host pode mudar), no fim da rodada — e fica na TV até a próxima revelação. Nunca onde estão.',
        'The TV always shows **how many stars were hidden** and the thieves’ **goal**. How many the gang has taken is shown only **every 5 rounds** (the Host can change this), at the end of the round — and stays on the TV until the next reveal. Never where.',
      ),
    ],
  },
  {
    title: tx('Votação final', 'The final vote'),
    body: [
      tx(
        'Se houver **teto de rodadas** (15 por padrão; o Host pode mudar ou tirar) e ninguém tiver vencido até lá, cada equipe vota, na sua sala, em quem acha ser o corrupto da equipe — ou em **Ninguém**. São 3 minutos.',
        'If there is a **round cap** (15 by default; the Host can change or remove it) and nobody has won by then, each squad votes, in its room, for who it thinks is the squad’s crooked cop — or **Nobody**. There are 3 minutes.',
      ),
      tx(
        'Um nome precisa de **maioria simples**. **Ninguém** só vale se a equipe toda votar nele. Empate ou falta de votos conta como **erro**.',
        'A name needs a **simple majority**. **Nobody** only counts if the whole squad picks it. A tie or missing votes count as **wrong**.',
      ),
      tx(
        'O corrupto também vota, mas **o voto dele não conta** — assim ele não consegue forçar um empate numa equipe de duas pessoas.',
        'The crooked cop votes too, but **their vote isn’t counted** — so they can’t force a tie in a two-cop squad.',
      ),
      tx(
        'Se **as três equipes acertarem**, a polícia honesta vence. Se alguma errar, ladrões e corruptos vencem. Sem teto, não há votação.',
        'If **all three squads are right**, the honest police win. If any is wrong, thieves and crooked cops win. With no cap, there is no vote.',
      ),
    ],
  },
  {
    title: tx('Fim, pontos e quedas', 'End, points and dropouts'),
    body: [
      tx(
        'A partida termina **na hora** em que o bando chega à meta de estrelas, ou em que os dois ladrões são presos; senão, na votação. A TV revela os corruptos e onde estavam os ladrões.',
        'The match ends **at once** when the gang reaches the star goal, or when both thieves are caught; otherwise at the vote. The TV reveals the crooked cops and where the thieves were.',
      ),
      tx(
        'Cada vencedor ganha **3 pontos** no placar da sala; quem perde fica com 0.',
        'Each winner scores **3 points** on the room’s scoreboard; losers get 0.',
      ),
      tx(
        'Se alguém cair, o jogo pausa por 20 s. Se não voltar: no posicionamento, vai para uma casa aleatória; ladrão fica parado; policial perde a vez; o voto dele fica faltando.',
        'If someone drops, the game pauses for 20 s. If they don’t return: while placing they go to a random stop; a thief stays put; a cop loses their turn; their vote is missing.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Ronda Noturna é inspirado no jogo de tabuleiro **Crooked Cops**: ladrões escondidos num mapa de casas e caminhos, equipes de polícia em salas separadas e policiais corruptos entre elas.',
        'Night Watch is inspired by the board game **Crooked Cops**: thieves hidden on a map of stops and paths, police squads in separate rooms and crooked cops among them.',
      ),
      tx(
        'Esta é uma adaptação livre, com nome, mapas, telas e ajustes de regras próprios do Noir Club. **Não é uma versão oficial** nem tem ligação com os autores ou editores do original.',
        'This is a free adaptation, with Noir Club’s own name, maps, screens and rule tweaks. It is **not an official version** and has no connection to the original’s authors or publishers.',
      ),
    ],
  },
];

/** Credit line: shown on the first tutorial slide; the rules end with a Credits page. */
export const CREDITS: I18nText | null = tx(
  'Inspirado no jogo de tabuleiro **Crooked Cops**. Adaptação livre para o Noir Club — não é uma versão oficial.',
  'Inspired by the board game **Crooked Cops**. A free adaptation for Noir Club — not an official version.',
);

/** One-line hints on the TV during the first round while the tutorial option is on. */
export const HINTS: Record<'placing' | 'thieves' | 'cops' | 'intermission', I18nText> = {
  placing: tx(
    'Policiais escolhem qualquer casa; ladrões, em segredo, uma casa sem estrela.',
    'Cops pick any stop; thieves, in secret, a stop without a star.',
  ),
  intermission: tx(
    'Quem joga agora vai para a sua sala; os demais ficam no corredor.',
    'Whoever is up goes to their room; everyone else stays in the hall.',
  ),
  thieves: tx(
    'Ladrões andam até 2 casas — estrelas no caminho são deles.',
    'Thieves move up to 2 stops — stars on the way are theirs.',
  ),
  cops: tx(
    'Cada policial: 2 ações — andar 0 ou 1 casa e Investigar ou Prender.',
    'Each cop: 2 actions — move 0 or 1 stop, then Investigate or Arrest.',
  ),
};
