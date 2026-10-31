import type { I18nText } from '@mp/game-sdk';

// Tutorial, full rules and credits, in PT-BR and EN. Inline markup: **bold** for key terms.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** The three rooms; with remote screens on, phones say which one to be in. */
export const PLACES = {
  nobre: tx('Salão Nobre', 'Salão Nobre'),
  prive: tx('Salão Privé', 'Salão Privé'),
  terraco: tx('Terraço', 'Terrace'),
} satisfies Record<string, I18nText>;

/** Tutorial slides on the TV before the first round; `demo` names the live illustration beside them. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'salons' | 'day' | 'night' | 'ledger' | 'end' }[] = [
  {
    title: tx('Dois salões e um ladrão', 'Two salons and a burglar'),
    demo: 'salons',
    body: [
      tx(
        'Vocês se dividem entre o **Salão Nobre** e o **Salão Privé**, em cômodos separados. Entre eles fica o **Terraço**.',
        'You split between the **Salão Nobre** and the **Salão Privé**, in separate rooms. Between them is the **Terrace**.',
      ),
      tx(
        'Cada morador começa com **10 de ouro**. Um de vocês é o **ladrão** e começa com nada — só ele sabe.',
        'Every resident starts with **10 gold**. One of you is the **burglar** and starts with nothing — only they know.',
      ),
      tx(
        'Segure o botão do celular para ver seu papel. **Ninguém vê o próprio ouro.**',
        'Hold the button on your phone to see your role. **Nobody sees their own gold.**',
      ),
    ],
  },
  {
    title: tx('O dia: exílio', 'Day: the exile'),
    demo: 'day',
    body: [
      tx(
        'Cada salão conversa e vota no celular em **um morador do próprio salão** para mandar ao Terraço. Pode votar em si mesmo.',
        'Each salon talks it over and votes on the phone for **one of its own** to send to the Terrace. You may vote for yourself.',
      ),
      tx(
        'Se **todos** do salão votarem no mesmo nome, está decidido. Se o tempo acabar, vai o **mais votado** (empate: sorteio).',
        'If **everyone** in the salon votes for the same name, it is decided. When time runs out, the **most voted** goes (tie: a draw).',
      ),
    ],
  },
  {
    title: tx('A noite: o roubo', 'Night: the robbery'),
    demo: 'night',
    body: [
      tx(
        'Os dois exilados passam a noite juntos no **Terraço**. Enquanto isso, se o ladrão ficou num salão, ele **rouba 1 de ouro de cada morador** que ficou lá.',
        'The two exiles spend the night together on the **Terrace**. Meanwhile, if the burglar stayed in a salon, they **steal 1 gold from every resident** left there.',
      ),
      tx(
        'Se o ladrão foi exilado, ninguém é roubado. O roubo é **silencioso**: ninguém fica sabendo.',
        'If the burglar was exiled, nobody is robbed. The robbery is **silent**: nobody finds out.',
      ),
      tx(
        'De manhã, os exilados **trocam de salão**: o do Nobre vai para o Privé e vice-versa.',
        'In the morning the exiles **swap salons**: the Nobre one goes to the Privé and vice versa.',
      ),
    ],
  },
  {
    title: tx('A contagem', 'The count'),
    demo: 'ledger',
    body: [
      tx(
        'A cada 2 rodadas a TV mostra o ouro de todos, por **letra**. A letra de cada um é fixa, mas **ninguém sabe qual é a sua**.',
        'Every 2 rounds the TV shows everyone’s gold, by **letter**. Each person’s letter is fixed, but **nobody knows which is theirs**.',
      ),
      tx(
        'Compare as colunas: quem cresce é o ladrão; quem cai dormiu perto dele.',
        'Compare the columns: whoever grows is the burglar; whoever drops slept near them.',
      ),
    ],
  },
  {
    title: tx('Quem ganha', 'Who wins'),
    demo: 'end',
    body: [
      tx(
        'No fim, o salão **com o ladrão perde**. No salão vencedor, ganha quem tiver **mais ouro**; no perdedor, perde quem tiver **menos**.',
        'At the end, the salon **holding the burglar loses**. In the winning salon, the **richest** wins; in the losing one, the **poorest** loses.',
      ),
      tx(
        'O ladrão ganha junto só se tiver **mais ouro que todos**. Senão, perde junto.',
        'The burglar wins too only with **more gold than anyone**. Otherwise they lose too.',
      ),
    ],
  },
];

/** The full rules: on every phone, and on the TV when the Host shows them. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo de dedução para **7 a 12** pessoas em três cômodos: o **Salão Nobre** (o grande), o **Salão Privé** (o pequeno) e, entre eles, o **Terraço**.',
        'A deduction game for **7 to 12** people in three rooms: the **Salão Nobre** (the big one), the **Salão Privé** (the small one) and, between them, the **Terrace**.',
      ),
      tx(
        'Um de vocês é o **ladrão**. Os moradores querem terminar longe dele e com ouro; o ladrão quer terminar mais rico que todos.',
        'One of you is the **burglar**. Residents want to end away from them, with their gold; the burglar wants to end richer than everyone.',
      ),
      tx(
        'São **10 rodadas** de dia e noite (o Host pode escolher 6 ou 8).',
        'There are **10 rounds** of day and night (the Host may pick 6 or 8).',
      ),
    ],
  },
  {
    title: tx('Os salões', 'The salons'),
    body: [
      tx(
        'O jogo sorteia quem começa em cada salão. O Privé tem cerca de 3/8 do grupo: 7→4/3, 8→5/3, 9→6/3, 10→6/4, 11→7/4, 12→7/5 (Nobre/Privé).',
        'The game draws who starts in each salon. The Privé holds about 3/8 of the group: 7→4/3, 8→5/3, 9→6/3, 10→6/4, 11→7/4, 12→7/5 (Nobre/Privé).',
      ),
      tx(
        'Os salões ficam em cômodos onde um não ouve o outro. Os tamanhos nunca mudam: a cada noite um sai de cada lado e um entra.',
        'The salons are in rooms out of earshot of each other. Their sizes never change: each night one leaves each side and one arrives.',
      ),
      tx(
        'A TV mostra quem está em cada salão. Ela aparece igual em todos os cômodos, então nunca mostra segredos.',
        'The TV shows who is in each salon. It looks the same in every room, so it never shows secrets.',
      ),
    ],
  },
  {
    title: tx('Seu papel e o ouro', 'Your role and the gold'),
    body: [
      tx(
        '**Segure** o botão "Ver meu papel" no celular para ver se você é **Morador** ou **Ladrão**. Todos têm o mesmo botão.',
        '**Hold** the "See my role" button on your phone to see whether you are a **Resident** or the **Burglar**. Everyone has the same button.',
      ),
      tx(
        'Moradores começam com **10 de ouro**; o ladrão com **0**. **Ninguém vê o próprio ouro** durante o jogo — nem o ladrão.',
        'Residents start with **10 gold**; the burglar with **0**. **Nobody sees their own gold** during the game — not even the burglar.',
      ),
      tx(
        'Cada jogador tem uma **letra** secreta (A, B, C…), fixa o jogo todo. Ninguém sabe a própria letra.',
        'Each player has a secret **letter** (A, B, C…), fixed for the whole game. Nobody knows their own letter.',
      ),
    ],
  },
  {
    title: tx('O dia: exílio', 'Day: the exile'),
    body: [
      tx(
        'O dia dura **3 minutos** (o Host pode mudar para 2, 5 ou 10). Cada salão conversa e vota no celular em quem vai ao **Terraço**.',
        'The day lasts **3 minutes** (the Host may change it to 2, 5 or 10). Each salon talks and votes on the phone for who goes to the **Terrace**.',
      ),
      tx(
        'Só se vota em alguém **do próprio salão**, e pode ser você mesmo. Dá para trocar o voto, e todos do salão veem os votos uns dos outros.',
        'You may only vote for someone **in your own salon**, yourself included. You can change your vote, and everyone in the salon sees each other’s votes.',
      ),
      tx(
        '**Decidido**: quando todos do salão votam no mesmo nome, o exílio trava na hora e a TV mostra "decidido". Quando os dois salões decidem, a noite começa.',
        '**Decided**: when everyone in the salon votes for the same name, the exile locks at once and the TV shows "decided". When both salons decide, night falls.',
      ),
      tx(
        '**Fim do tempo**: vai o mais votado. Empate, ou ninguém votou: sorteio entre os empatados (ou o salão todo).',
        '**Time up**: the most voted goes. A tie, or no votes: a draw among the tied (or the whole salon).',
      ),
    ],
  },
  {
    title: tx('A noite: o roubo', 'Night: the robbery'),
    body: [
      tx(
        'Os dois exilados vão ao **Terraço** e conversam a sós por **60 s** (o Host pode mudar). O resto fica no seu salão.',
        'The two exiles go to the **Terrace** and talk alone for **60 s** (the Host may change it). Everyone else stays in their salon.',
      ),
      tx(
        'Se o ladrão **não** foi exilado, **cada morador** que ficou no salão dele perde **1 de ouro**, e o ladrão ganha tudo. No Nobre de 5, são 3 vítimas (+3 ao ladrão); no Privé de 3, só 1 (+1).',
        'If the burglar was **not** exiled, **every resident** left in their salon loses **1 gold**, and the burglar takes it all. In a Nobre of 5 that is 3 victims (+3 to the burglar); in a Privé of 3, just 1 (+1).',
      ),
      tx(
        'Se o ladrão **foi exilado**, ninguém é roubado. Nenhuma tela avisa se houve roubo.',
        'If the burglar **was exiled**, nobody is robbed. No screen says whether a robbery happened.',
      ),
    ],
  },
  {
    title: tx('A troca', 'The swap'),
    body: [
      tx(
        'Ao amanhecer, o exilado do Nobre vai para o **Privé** e o do Privé vai para o **Nobre**. O celular diz para onde ir.',
        'At dawn, the Nobre exile goes to the **Privé** and the Privé exile goes to the **Nobre**. The phone says where to go.',
      ),
      tx(
        'Ao chegar, toque **Cheguei**. Quando os dois chegam (ou após 30 s), começa o próximo dia.',
        'On arrival, tap **I’m here**. When both have arrived (or after 30 s), the next day begins.',
      ),
    ],
  },
  {
    title: tx('A contagem', 'The count'),
    body: [
      tx(
        'Depois das rodadas **2, 4, 6 e 8**, a TV mostra o ouro de todos por **letra**, e guarda as contagens anteriores ao lado.',
        'After rounds **2, 4, 6 and 8**, the TV shows everyone’s gold by **letter**, keeping the earlier counts beside it.',
      ),
      tx(
        'As letras não mudam, mas ninguém sabe de quem é cada uma. Cruze as contagens com quem dormiu em qual salão.',
        'Letters never change, but nobody knows whose is whose. Cross the counts with who slept in which salon.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        'Um salão que já **decidiu** não pode mais trocar o voto.',
        'A salon that has **decided** can no longer change its vote.',
      ),
      tx(
        'Quem cai da sala por mais de 20 s perde o voto e não conta para o "todos votaram igual" — mas ainda pode ser exilado, e troca de salão normalmente.',
        'Anyone who drops for more than 20 s loses their vote and doesn’t count for "everyone voted the same" — but can still be exiled, and swaps salons as usual.',
      ),
      tx(
        'Quem joga de longe pertence a um salão como todos; combinem uma chamada.',
        'Remote players belong to a salon like everyone else; set up a call.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'Depois da última troca, o salão onde o ladrão está **perde**; o outro **vence**. A TV revela o ladrão, as letras e o ouro de todos.',
        'After the last swap, the salon holding the burglar **loses**; the other **wins**. The TV reveals the burglar, the letters and everyone’s gold.',
      ),
      tx(
        '**Vence** quem tem mais ouro no salão vencedor. **Perde** quem tem menos ouro no salão perdedor (sem contar o ladrão). Empates dividem.',
        '**Winner**: the richest in the winning salon. **Loser**: the poorest in the losing salon (not counting the burglar). Ties share.',
      ),
      tx(
        'O **ladrão** vence junto só com **mais ouro que todos** — empatar não basta. Senão, perde junto.',
        'The **burglar** wins too only with **more gold than anyone** — a tie is not enough. Otherwise they lose too.',
      ),
      tx(
        'Pontos no placar: vencedores **3**, os demais do salão vencedor **1**, o salão perdedor **0**.',
        'Scoreboard points: winners **3**, the rest of the winning salon **1**, the losing salon **0**.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Adaptado de **Catch the Burglar**, jogo principal do 6º episódio de The Genius: Rules of the Game (temporada 1, tvN, 2013).',
        'Adapted from **Catch the Burglar**, the main match of episode 6 of The Genius: Rules of the Game (season 1, tvN, 2013).',
      ),
      tx(
        'Versão não oficial: só as regras foram reaproveitadas. Nomes, textos e visual são do Noir Club. Mudanças: 7–12 jogadores, dia de 3 min, ouro oculto do próprio dono.',
        'Unofficial version: only the rules are reused. Names, texts and visuals are Noir Club’s. Changes: 7–12 players, 3-minute day, gold hidden from its owner.',
      ),
    ],
  },
];

export const CREDITS: I18nText | null = tx(
  'Adaptado de “Catch the Burglar”, de The Genius: Rules of the Game (tvN). Versão não oficial.',
  'Adapted from “Catch the Burglar”, from The Genius: Rules of the Game (tvN). Unofficial version.',
);
