import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms; {animal} and
// {area} tokens ({lion}, {river}…) become the same icons the board shows (see `rich()` in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'pyramid' | 'opening' | 'areas' | 'hunt' | 'goals';

/** Tutorial slides shown on the TV before the opening (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'pyramid',
    body: [
      tx(
        'Cada um de vocês é **um dos 13 animais** da pirâmide, sorteado em segredo. Só você vê o seu no celular.',
        'Each of you is **one of the 13 animals** in the pyramid, drawn in secret. Only you see yours on your phone.',
      ),
      tx(
        'Cada animal tem **seu próprio objetivo**: sobreviver, ver o {lion} Leão cair, proteger o {crocodile} Crocodilo… Mentir sobre quem você é faz parte.',
        'Each animal has **its own goal**: survive, see the {lion} Lion fall, protect the {crocodile} Crocodile… Lying about who you are is part of it.',
      ),
      tx('São **4 rodadas**. No fim, quem cumpriu o objetivo vence.', 'There are **4 rounds**. At the end, whoever met their goal wins.'),
    ],
  },
  {
    title: tx('A abertura', 'The opening'),
    demo: 'opening',
    body: [
      tx(
        '**Toque no cartão** do celular para ver seu animal e seu objetivo (ele se esconde sozinho). O {chameleon} Camaleão escolhe um **disfarce**.',
        '**Tap the card** on your phone to see your animal and goal (it hides itself again). The {chameleon} Chameleon picks a **disguise**.',
      ),
      tx(
        'Depois, cada um **espia** 1 jogador ({crow} Corvo, {plover} Pássaro-palito e {rat} Rato espiam 2). Ninguém sabe quem espiou quem.',
        'Then everyone **peeks** at 1 player (the {crow} Crow, {plover} Plover and {rat} Rat peek at 2). Nobody knows who peeked at whom.',
      ),
      tx(
        'Por fim, todos dão um **palpite** de quem vai vencer — só o do {crow} Corvo vale.',
        'Finally, everyone **guesses** who will win — only the {crow} Crow’s guess counts.',
      ),
    ],
  },
  {
    title: tx('As áreas', 'The areas'),
    demo: 'areas',
    body: [
      tx(
        'Toda rodada, depois de **conversar**, cada um escolhe em segredo uma área: {river} Rio, {sky} Céu, {field} Campo ou {forest} Floresta.',
        'Each round, after **talking**, everyone secretly picks an area: {river} River, {sky} Sky, {field} Field or {forest} Forest.',
      ),
      tx(
        'Cada animal tem um **habitat**. Quem passa uma rodada fora dele **precisa voltar** na seguinte. Quem não voa não vai ao Céu.',
        'Each animal has a **habitat**. Spend a round away and you **must go back** the next one. Animals that can’t fly can’t go to the Sky.',
      ),
      tx('A TV então mostra **quem está em cada área**.', 'The TV then shows **who is in each area**.'),
    ],
  },
  {
    title: tx('A caçada', 'The hunt'),
    demo: 'hunt',
    body: [
      tx(
        'Toque em alguém da sua área para **atacar**, quantas vezes quiser. Se ele estiver **mais abaixo** na pirâmide, você o devora na hora.',
        'Tap someone in your area to **attack**, as many times as you like. If they are **lower** in the pyramid, you eat them on the spot.',
      ),
      tx(
        'Igual ou acima: **nada acontece**, e ninguém fica sabendo. Atacou a {snake} Cobra? **Você morre.**',
        'Same level or higher: **nothing happens**, and nobody is told. Attacked the {snake} Snake? **You die.**',
      ),
      tx(
        'Só quem está na área vê quem atacou. No **anoitecer**, a TV revela as vítimas para todos.',
        'Only those in the area see who attacked. At **dusk**, the TV reveals the victims to everyone.',
      ),
    ],
  },
  {
    title: tx('Fome e vitória', 'Hunger and victory'),
    demo: 'goals',
    body: [
      tx(
        'Predadores **precisam comer**: o {lion} Leão morre após 1 rodada sem comer; {crocodile} Crocodilo e {eagle} Águia, após 2 seguidas; a {hyena} Hiena, após 3.',
        'Predators **must eat**: the {lion} Lion dies after 1 round without food; the {crocodile} Crocodile and {eagle} Eagle after 2 in a row; the {hyena} Hyena after 3.',
      ),
      tx(
        'Depois da 4ª rodada, quem cumpriu o objetivo ganha **1 ponto**. Vários podem vencer — até mortos.',
        'After round 4, everyone who met their goal scores **1 point**. Many can win — even the dead.',
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
        'Um jogo de blefe e caça para **exatamente 13 pessoas**. Cada uma recebe, por sorteio, um dos 13 animais da pirâmide alimentar.',
        'A bluffing and hunting game for **exactly 13 people**. Each one draws one of the 13 animals of the food chain.',
      ),
      tx(
        'Cada animal tem uma **condição de vitória** própria. O jogo tem uma abertura e **4 rodadas**; no fim, os jogadores se dividem entre quem cumpriu sua condição e quem não.',
        'Each animal has its own **win condition**. The game has an opening and **4 rounds**; at the end, players split into those who met their condition and those who didn’t.',
      ),
      tx(
        'Seu animal é segredo. Você pode dizer o que quiser sobre ele — inclusive mentir.',
        'Your animal is a secret. You may say anything about it — including lies.',
      ),
    ],
  },
  {
    title: tx('A pirâmide', 'The pyramid'),
    body: [
      tx('**Nível 1** — {lion} Leão.', '**Level 1** — {lion} Lion.'),
      tx('**Nível 2** — {crocodile} Crocodilo.', '**Level 2** — {crocodile} Crocodile.'),
      tx('**Nível 3** — {eagle} Águia.', '**Level 3** — {eagle} Eagle.'),
      tx('**Nível 4** — {hyena} Hiena.', '**Level 4** — {hyena} Hyena.'),
      tx(
        '**Base** — {snake} Cobra, {chameleon} Camaleão, {crow} Corvo, {plover} Pássaro-palito, {rat} Rato, {deer} Cervo, {mallard} Pato-real, {otter} Lontra e {rabbit} Coelho.',
        '**Bottom** — {snake} Snake, {chameleon} Chameleon, {crow} Crow, {plover} Plover, {rat} Rat, {deer} Deer, {mallard} Mallard, {otter} Otter and {rabbit} Rabbit.',
      ),
      tx(
        'Um animal só consegue devorar quem está **num nível mais baixo** que o dele. Os da base nunca devoram ninguém.',
        'An animal can only eat animals on a **lower level** than its own. Animals at the bottom never eat anyone.',
      ),
    ],
  },
  {
    title: tx('Os predadores', 'The predators'),
    body: [
      tx(
        '{lion} **Leão** — habitat {field} Campo, não vai ao Céu. Vence se **sobreviver** às 4 rodadas. Morre se passar **1 rodada** sem comer.',
        '{lion} **Lion** — habitat {field} Field, can’t go to the Sky. Wins by **surviving** all 4 rounds. Dies after **1 round** without eating.',
      ),
      tx(
        '{crocodile} **Crocodilo** — habitat {river} Rio, não vai ao Céu. Vence se **sobreviver**. Morre após **2 rodadas seguidas** sem comer.',
        '{crocodile} **Crocodile** — habitat {river} River, can’t go to the Sky. Wins by **surviving**. Dies after **2 rounds in a row** without eating.',
      ),
      tx(
        '{eagle} **Águia** — habitat {sky} Céu, vai a qualquer área. Vence se **sobreviver**. Morre após **2 rodadas seguidas** sem comer.',
        '{eagle} **Eagle** — habitat {sky} Sky, can go anywhere. Wins by **surviving**. Dies after **2 rounds in a row** without eating.',
      ),
      tx(
        '{hyena} **Hiena** — habitat {field} Campo, não vai ao Céu. Vence se **o Leão morrer** (mesmo que ela morra). Morre após **3 rodadas seguidas** sem comer.',
        '{hyena} **Hyena** — habitat {field} Field, can’t go to the Sky. Wins if **the Lion dies** (even if she dies). Dies after **3 rounds in a row** without eating.',
      ),
    ],
  },
  {
    title: tx('A base da pirâmide', 'The bottom of the pyramid'),
    body: [
      tx(
        '{snake} **Cobra** — {forest} Floresta, não vai ao Céu. **Não pode morrer**: quem a ataca morre. Vence se houver **10 ou mais mortos** no fim.',
        '{snake} **Snake** — {forest} Forest, can’t go to the Sky. **Cannot die**: whoever attacks her dies. Wins if **10 or more** players are dead at the end.',
      ),
      tx(
        '{chameleon} **Camaleão** — {forest} Floresta, não vai ao Céu. Vence se **sobreviver**. Escolhe um **disfarce**: quem o espia vê esse animal.',
        '{chameleon} **Chameleon** — {forest} Forest, can’t go to the Sky. Wins by **surviving**. Picks a **disguise**: whoever peeks at it sees that animal.',
      ),
      tx(
        '{crow} **Corvo** — {sky} Céu, vai a qualquer área. Espia **2**. Vence se **o jogador do seu palpite vencer** (mesmo que o Corvo morra).',
        '{crow} **Crow** — {sky} Sky, can go anywhere. Peeks at **2**. Wins if **the player it guessed wins** (even if the Crow dies).',
      ),
      tx(
        '{plover} **Pássaro-palito** — {river} Rio, vai a qualquer área. Espia **2**. Vence se **o Crocodilo sobreviver** (mesmo que ele morra).',
        '{plover} **Plover** — {river} River, can go anywhere. Peeks at **2**. Wins if **the Crocodile survives** (even if the Plover dies).',
      ),
      tx(
        '{rat} **Rato** — {forest} Floresta, não vai ao Céu. Espia **2**. Vence se **o Leão sobreviver** (mesmo que ele morra).',
        '{rat} **Rat** — {forest} Forest, can’t go to the Sky. Peeks at **2**. Wins if **the Lion survives** (even if the Rat dies).',
      ),
      tx(
        '**O quarteto** — {deer} Cervo ({field} Campo), {mallard} Pato-real ({sky} Céu, voa), {otter} Lontra ({river} Rio) e {rabbit} Coelho ({forest} Floresta). Vencem se **sobreviverem**. Só o Pato-real vai ao Céu.',
        '**The quartet** — {deer} Deer ({field} Field), {mallard} Mallard ({sky} Sky, flies), {otter} Otter ({river} River) and {rabbit} Rabbit ({forest} Forest). They win by **surviving**. Only the Mallard can go to the Sky.',
      ),
    ],
  },
  {
    title: tx('A abertura', 'The opening'),
    body: [
      tx(
        '**1 · Animal** — toque no cartão do celular para ver seu animal (as espiadas e o que você testemunhar também ficam nele). Toque em **Pronto**. O Camaleão, em vez disso, escolhe seu **disfarce** entre os outros 12 animais (sem escolha, um é sorteado).',
        '**1 · Animal** — tap the card on your phone to see your animal (your peeks and what you witness are kept there too). Tap **Ready**. The Chameleon instead picks its **disguise** among the other 12 animals (no choice: one is drawn).',
      ),
      tx(
        '**2 · Espiar** — escolha 1 jogador (Corvo, Pássaro-palito e Rato: 2) e veja o animal dele. Quem espia o Camaleão vê o disfarce. Ninguém é avisado de que foi espiado.',
        '**2 · Peek** — pick 1 player (Crow, Plover and Rat: 2) and see their animal. Peeking at the Chameleon shows its disguise. Nobody is told they were peeked at.',
      ),
      tx(
        '**3 · Palpite** — todos escolhem quem acham que vai vencer, para ninguém saber quem é o Corvo. **Só o palpite do Corvo conta.**',
        '**3 · Guess** — everyone picks who they think will win, so nobody can tell who the Crow is. **Only the Crow’s guess counts.**',
      ),
      tx(
        'Cada passo dura 30 s por padrão (o Host pode mudar) e termina antes se todos agirem.',
        'Each step lasts 30 s by default (the Host can change it) and ends early once everyone has acted.',
      ),
    ],
  },
  {
    title: tx('A rodada: conversa e movimento', 'The round: talk and move'),
    body: [
      tx(
        '**1 · Conversa** (90 s) — negociem, blefem, façam alianças. Ninguém é obrigado a dizer a verdade.',
        '**1 · Talk** (90 s) — negotiate, bluff, make alliances. Nobody has to tell the truth.',
      ),
      tx(
        '**2 · Movimento** (20 s) — escolha em segredo uma área: {river} Rio, {sky} Céu, {field} Campo ou {forest} Floresta. Dá para trocar até o tempo acabar.',
        '**2 · Move** (20 s) — secretly pick an area: {river} River, {sky} Sky, {field} Field or {forest} Forest. You can change it until time runs out.',
      ),
      tx(
        'Quem não pode voar não vai ao Céu. Quem passou a rodada anterior **fora do habitat** só pode voltar ao habitat. Na 1ª rodada a escolha é livre.',
        'Animals that can’t fly can’t go to the Sky. Whoever spent the previous round **away from home** can only go back home. In round 1 the choice is free.',
      ),
      tx(
        'Quem não escolher a tempo fica no **habitat**. Depois do movimento, a TV mostra quem está em cada área.',
        'Anyone who doesn’t choose in time stays in their **habitat**. After moving, the TV shows who is in each area.',
      ),
    ],
  },
  {
    title: tx('A rodada: caçada', 'The round: the hunt'),
    body: [
      tx(
        '**3 · Caçada** (45 s) — seu celular lista quem está na sua área. Escolha alguém e toque em **Atacar**. Pode atacar quantas vezes e quantas pessoas quiser, a qualquer momento.',
        '**3 · Hunt** (45 s) — your phone lists who is in your area. Pick someone and tap **Attack**. Attack as often and as many players as you like, at any moment.',
      ),
      tx(
        'Alvo **mais abaixo** na pirâmide: ele é **devorado na hora** e sai do jogo; você está alimentado nesta rodada.',
        'Target **lower** in the pyramid: they are **eaten on the spot** and leave the game; you are fed this round.',
      ),
      tx(
        'Alvo do **mesmo nível ou acima**: **nada acontece**, e ninguém é avisado — nem você.',
        'Target on the **same level or higher**: **nothing happens**, and nobody is told — not even you.',
      ),
      tx(
        'Alvo **Cobra**: quem atacou **morre** no lugar dela.',
        'Target is the **Snake**: the attacker **dies** instead.',
      ),
      tx(
        'Quem está na área vê na hora, no celular, **quem devorou quem**. Quem está fora não sabe quem atacou.',
        'Players in the area see at once, on their phones, **who ate whom**. Those elsewhere never learn who attacked.',
      ),
    ],
  },
  {
    title: tx('A rodada: anoitecer', 'The round: dusk'),
    body: [
      tx(
        '**4 · Anoitecer** — a TV revela as vítimas da rodada: nome, animal e área. Quem morreu atacando a Cobra aparece como **devorado**, igual aos outros.',
        '**4 · Dusk** — the TV reveals the round’s victims: name, animal and area. Whoever died attacking the Snake shows as **eaten**, like everyone else.',
      ),
      tx(
        'Depois vem a **fome**: predadores que não comeram somam uma rodada de fome; comer zera a conta. Leão morre com 1, Crocodilo e Águia com 2, Hiena com 3. A TV mostra quem morreu de fome.',
        'Then comes **hunger**: predators that didn’t eat add one hungry round; eating resets it. The Lion dies at 1, the Crocodile and Eagle at 2, the Hyena at 3. The TV shows who starved.',
      ),
      tx(
        'Mortos não jogam mais, mas continuam na sala — e alguns ainda podem vencer.',
        'The dead no longer play, but they stay in the room — and some can still win.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        '**Quarteto unido** — se todos os sobreviventes do quarteto ({deer} {mallard} {otter} {rabbit}) estiverem na **mesma área** e forem **2 ou mais**, nenhum deles pode ser devorado. Ataques contra eles falham em silêncio.',
        '**United quartet** — if every survivor of the quartet ({deer} {mallard} {otter} {rabbit}) is in the **same area** and there are **2 or more**, none of them can be eaten. Attacks on them fail silently.',
      ),
      tx(
        '**Ordem dos ataques** — vale quem ataca primeiro. Quem já foi devorado não ataca mais.',
        '**Attack order** — first come, first served. Whoever has been eaten can no longer attack.',
      ),
      tx(
        '**Quem cai da sala** — o jogo pausa por 20 s. Se a pessoa não volta, o animal fica **parado**: sempre no habitat, sem atacar, podendo ser devorado e passar fome. Se ela voltar e agir, volta a jogar.',
        '**Dropped players** — the game pauses for 20 s. If they don’t come back, their animal goes **idle**: always at home, never attacking, still edible and still hungry. If they return and act, they play again.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'Depois do anoitecer da **4ª rodada**, a TV revela todos os animais e quem cumpriu sua condição.',
        'After the dusk of **round 4**, the TV reveals every animal and who met their condition.',
      ),
      tx(
        'Quem cumpriu ganha **1 ponto** no placar da sala; quem não, 0. Podem vencer muitos ao mesmo tempo, vivos ou mortos.',
        'Everyone who met it scores **1 point** on the room’s scoreboard; everyone else 0. Many can win at once, alive or dead.',
      ),
      tx(
        'O palpite do Corvo é conferido por último: ele vence se o jogador escolhido estiver entre os vencedores.',
        'The Crow’s guess is checked last: it wins if the chosen player is among the winners.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Inspirado no jogo “Food Chain” do programa **The Genius: Rule Breaker** (tvN, 2014).',
        'Inspired by the “Food Chain” game from the show **The Genius: Rule Breaker** (tvN, 2014).',
      ),
      tx(
        'Esta é uma adaptação digital independente e não oficial; não tem vínculo nem endosso dos criadores do programa. Ilustrações e textos são originais.',
        'This is an independent, unofficial digital adaptation, not affiliated with or endorsed by the show’s creators. Art and texts are original.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText | null = tx(
  'Inspirado em “Food Chain”, de The Genius: Rule Breaker (tvN) · adaptação não oficial',
  'Inspired by “Food Chain” from The Genius: Rule Breaker (tvN) · unofficial adaptation',
);
