import type { I18nText } from '@mp/game-sdk';

// Tutorial slides and full rules, in PT-BR and EN, shared by the logic (page counts) and the UI
// (content). No secrets here: it ships to every phone. Inline markup: **bold** for key terms.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type SlideDemo = 'sides' | 'secret' | 'night' | 'cycle' | 'win';

/** Tutorial on the TV before the Host's setup — teaches the first round only. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: SlideDemo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'sides',
    body: [
      tx(
        'Cada um recebe uma **classe secreta**: **Inocente**, **Impostor** ou **Neutro**.',
        'Everyone gets a **secret class**: **Innocent**, **Impostor** or **Neutral**.',
      ),
      tx(
        'Os Impostores se conhecem e matam à noite. Os Inocentes precisam descobrir quem são. Cada Neutro joga sozinho, com a própria vitória.',
        'Impostors know each other and kill at night. Innocents must find out who they are. Each Neutral plays alone, with their own win.',
      ),
    ],
  },
  {
    title: tx('Sua classe é só sua', 'Your class is yours alone'),
    demo: 'secret',
    body: [
      tx(
        'No celular, **segure o cartão** para ver sua classe e o que ela faz. Solte e ela some.',
        'On your phone, **hold the card** to see your class and what it does. Let go and it hides.',
      ),
      tx(
        'A TV mostra a mesa: quem está vivo, quem morreu e o que todos ficam sabendo. Mortes **não revelam a classe** (a menos que o Host ligue essa opção).',
        'The TV shows the table: who is alive, who died and what everyone learns. Deaths **do not reveal the class** (unless the Host turns that on).',
      ),
    ],
  },
  {
    title: tx('À noite, todos tocam', 'At night, everyone taps'),
    demo: 'night',
    body: [
      tx(
        'Quem tem poder escolhe o alvo no celular. **Quem não tem toca em alguém mesmo assim** — assim ninguém percebe quem age.',
        'Whoever has a power picks a target on their phone. **Whoever has none taps someone anyway** — so nobody can tell who acts.',
      ),
      tx(
        'No fim da noite, cada celular mostra o **relatório**: o resultado da sua ação (ou nada). Leia em silêncio.',
        'At the end of the night every phone shows the **report**: the result of your action (or nothing). Read it in silence.',
      ),
    ],
  },
  {
    title: tx('O ciclo de um dia', 'The cycle of a day'),
    demo: 'cycle',
    body: [
      tx(
        '**Manhã Cedo**: a TV revela quem não acordou. **Manhã**: discutam e acusem — quem quiser pede para pular.',
        '**Early Morning**: the TV reveals who did not wake up. **Morning**: debate and accuse — anyone may ask to skip.',
      ),
      tx(
        '**Tarde**: votem para expulsar alguém ou **Pular**. Empate expulsa ninguém. Depois, anoitece de novo.',
        '**Afternoon**: vote to expel someone or **Skip**. A tie expels nobody. Then night falls again.',
      ),
    ],
  },
  {
    title: tx('Como vencer', 'How to win'),
    demo: 'win',
    body: [
      tx(
        '**Inocentes** vencem quando todos os Impostores e Neutros saem. **Impostores** vencem quando forem tantos quanto os Inocentes vivos.',
        '**Innocents** win once every Impostor and Neutral is gone. **Impostors** win once they match the living Innocents.',
      ),
      tx(
        'Um **Neutro** que cumpre sua vitória **encerra o jogo na hora**. Na dúvida, abra 📖 Regras no celular.',
        'A **Neutral** who meets their goal **ends the game at once**. When in doubt, open 📖 Rules on your phone.',
      ),
    ],
  },
];

/** The full rules: any phone, any phase; the Host can show a page on the TV. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Jogo de dedução social para **5 a 16 pessoas**, no estilo lobisomem. Cada jogador recebe uma classe secreta com um poder — 38 classes, além do **Inocente** e do **Impostor** comuns, sem poder.',
        'A social-deduction game for **5 to 16 people**, werewolf style. Everyone gets a secret class with a power — 38 classes, plus the plain **Innocent** and **Impostor**, who have none.',
      ),
      tx(
        'Os dias alternam **Noite** (poderes em segredo) e **Dia** (discussão e votação). Partidas de 20 a 40 minutos.',
        'Days alternate **Night** (powers in secret) and **Day** (debate and vote). Matches take 20 to 40 minutes.',
      ),
      tx(
        'A TV é a mesa: mostra quem está vivo, as mortes, os anúncios e a contagem dos votos. O celular é seu: sua classe, seus alvos, seus resultados.',
        'The TV is the table: it shows who is alive, the deaths, the announcements and the vote totals. Your phone is yours: your class, your targets, your results.',
      ),
    ],
  },
  {
    title: tx('Filiações e vitória', 'Sides and winning'),
    body: [
      tx(
        '**Inocentes** vencem quando nenhum Impostor e nenhum Neutro está vivo.',
        '**Innocents** win when no Impostor and no Neutral is alive.',
      ),
      tx(
        '**Impostores** se conhecem (nomes e classes), veem as escolhas de ataque uns dos outros e vencem quando os Impostores vivos forem **tantos quanto ou mais** que os Inocentes vivos.',
        '**Impostors** know each other (names and classes), see each other\'s attack picks and win when living Impostors are **as many as or more** than living Innocents.',
      ),
      tx(
        '**Neutros** têm cada um a própria condição (veja a ficha da classe). Quando um Neutro a cumpre, **o jogo acaba na hora** e só ele vence. Exceção: o **Nômade** vence junto com quem vencer, se estiver vivo no fim.',
        '**Neutrals** each have their own goal (see the class card). When a Neutral meets it, **the game ends at once** and they alone win. Exception: the **Nomad** wins alongside whoever wins, if alive at the end.',
      ),
      tx(
        'Se não sobrar ninguém de nenhum dos dois lados, ninguém vence.',
        'If nobody from either side is left, nobody wins.',
      ),
    ],
  },
  {
    title: tx('A configuração', 'The setup'),
    body: [
      tx(
        'Depois do tutorial, o **Host** monta a partida no celular enquanto todos leem as regras. A TV mostra só as contagens.',
        'After the tutorial, the **Host** builds the match on their phone while everyone reads the rules. The TV shows only the counts.',
      ),
      tx(
        '**Impostores** (pelo menos 1, sempre menos que os Inocentes) e **Neutros** (0 a 8); o resto é Inocente. Cada classe pode ficar em **Auto**, **Forçar** ou **Banir**. Classes não se repetem: vagas que sobram viram Inocente ou Impostor comum.',
        '**Impostors** (at least 1, always fewer than the Innocents) and **Neutrals** (0 to 8); everyone else is Innocent. Each class can be **Auto**, **Force** or **Ban**. Classes never repeat: leftover seats become a plain Innocent or Impostor.',
      ),
      tx(
        'Opções: ataque dos Impostores (**1 do time** ou **cada um**; no modo "cada um", impostor com habilidade **mata OU usa** ou **mata E usa**), se os mortos veem tudo, Orador com 2 ou 3 votos, revelar a classe dos mortos, e os tempos de cada fase.',
        'Options: Impostor attack (**1 for the team** or **each one**; in "each one" mode, an Impostor with an ability **kills OR uses it** or **kills AND uses it**), whether the dead see everything, Orator with 2 or 3 votes, revealing the class of the dead, and each phase\'s timer.',
      ),
      tx(
        'Ninguém fica sabendo quais classes foram forçadas, banidas ou sorteadas — nem o Host, depois do sorteio.',
        'Nobody learns which classes were forced, banned or dealt — not even the Host, once they are dealt.',
      ),
    ],
  },
  {
    title: tx('A Noite', 'Night'),
    body: [
      tx(
        '**Todos** escolhem algo no celular: quem tem poder escolhe o alvo (ou **Não usar esta noite**); quem não tem faz uma escolha falsa. Dá para trocar até o tempo acabar (45 s por padrão; o Host pode mudar). A noite termina antes se todos já escolheram.',
        '**Everyone** picks something on their phone: a power picks its target (or **Skip tonight**); no power makes a decoy pick. You can change it until time runs out (45 s by default; the Host can change it). Night ends early once everyone has picked.',
      ),
      tx(
        '**Ataque do time**: cada Impostor vota num alvo ou em **Ninguém**; vence a maioria, e empate é sorteado. No modo "cada um", cada Impostor tem o próprio ataque.',
        '**Team attack**: each Impostor votes for a target or **Nobody**; the majority wins, and a tie is drawn at random. In "each one" mode, every Impostor has their own attack.',
      ),
      tx(
        'Tudo acontece ao mesmo tempo, nesta ordem: trocas do Nômade → enredados e armadilhas da Sentinela → bloqueios (Chaveiro, Construtor, Sabotador) → proteções → ataques → veneno e cura → investigações → marcações para depois.',
        'Everything happens at once, in this order: Nomad swaps → entangled players and Sentinel traps → blocks (Locksmith, Builder, Saboteur) → protection → attacks → poison and cures → investigations → marks for later.',
      ),
      tx(
        'Um jogador **bloqueado** não age naquela noite, mas ainda pode sofrer ações. Várias ações sobre a mesma pessoa valem todas, cada uma pela sua ficha.',
        'A **blocked** player does not act that night but can still be targeted. Several actions on the same person all count, each by its own card.',
      ),
    ],
  },
  {
    title: tx('Relatório e Manhã Cedo', 'Report and Early Morning'),
    body: [
      tx(
        '**Relatório** (10 s): todos os celulares mostram ao mesmo tempo o resultado da própria noite — investigações, avisos de barricada, enredamento, cura, poção, roubo. Para a maioria, "Nada a relatar".',
        '**Report** (10 s): every phone shows its own night results at the same time — investigations, notices of barricade, entanglement, cure, potion, theft. For most people, "Nothing to report".',
      ),
      tx(
        '**Manhã Cedo**: a TV revela uma a uma as mortes da noite (ou "Todos acordaram"), mostra o **Suspeito** pego numa armadilha e avisa se **há um envenenado**.',
        '**Early Morning**: the TV reveals the night\'s deaths one by one (or "Everyone woke up"), shows any **Suspect** caught in a trap and warns if **someone is poisoned**.',
      ),
      tx(
        'É a hora dos poderes da manhã: **Psicólogo** (sabe se foi alvo de algo letal), **Porta-voz** (anuncia um de até 3 fatos reais da noite, anônimo ou assinado, ou fica calado), **Historiador** (guarda 1 de 2 fatos) e **Médico Legista** (examina um morto).',
        'Morning powers act now: **Psychologist** (learns if something deadly targeted them), **Spokesperson** (announces one of up to 3 true facts from the night, anonymous or signed, or stays silent), **Historian** (stores 1 of 2 facts) and **Coroner** (examines a dead player).',
      ),
      tx(
        'Anúncios mostram no máximo o nome de **quem sofreu** a ação, nunca de quem agiu.',
        'Announcements show at most the name of **who was affected**, never who acted.',
      ),
    ],
  },
  {
    title: tx('Manhã: a discussão', 'Morning: the debate'),
    body: [
      tx(
        'Conversem, acusem, blefem — 3 minutos por padrão (o Host pode mudar). Contar sua classe é permitido; mentir também.',
        'Talk, accuse, bluff — 3 minutes by default (the Host can change it). Telling your class is allowed; so is lying.',
      ),
      tx(
        'Cada jogador vivo pode tocar **Pular discussão** uma vez. Cada pedido corta uma parte igual do tempo que resta: com 4 vivos, o primeiro pedido corta 25%; quando todos pedem, a votação começa.',
        'Each living player may tap **Skip the debate** once. Each request cuts an equal share of the time left: with 4 alive, the first request cuts 25%; once everyone has asked, the vote starts.',
      ),
      tx(
        'O **Médico Legista** ainda pode agir; o **Historiador** pode revelar um fato guardado (2 vezes por partida).',
        'The **Coroner** can still act; the **Historian** may reveal a stored fact (twice per match).',
      ),
    ],
  },
  {
    title: tx('Tarde: a votação', 'Afternoon: the vote'),
    body: [
      tx(
        'Cada vivo vota em alguém para expulsar ou em **Pular**, e pode trocar até o tempo acabar (60 s por padrão). Termina antes quando todos votaram. Ninguém vota em si mesmo.',
        'Each living player votes for someone to expel or for **Skip**, and may change it until time runs out (60 s by default). It ends early once everyone has voted. Nobody votes for themselves.',
      ),
      tx(
        'A TV mostra **só a contagem**, nunca quem votou em quem. O mais votado é condenado; **empate** ou **Pular** no topo: ninguém sai. O **Orador** vale 2 ou 3 votos.',
        'The TV shows **only the totals**, never who voted for whom. The most voted is condemned; a **tie** or **Skip** on top: nobody leaves. The **Orator** counts 2 or 3 votes.',
      ),
      tx(
        'Durante a votação, **Sniper** e **Exorcista** agem ao vivo e o **Shapeshifter** pode imitar alguém. Votos de quem morre são descartados; votos em quem morre viram Pular. **Maestro**, **Trapaceiro**, **Shapeshifter** e **Parasita** mexem na contagem em segredo.',
        'During the vote, the **Sniper** and **Exorcist** act live and the **Shapeshifter** may imitate someone. Votes from someone who dies are dropped; votes on someone who dies become Skip. **Maestro**, **Trickster**, **Shapeshifter** and **Parasite** change the totals in secret.',
      ),
    ],
  },
  {
    title: tx('Veredito', 'Verdict'),
    body: [
      tx(
        'A TV mostra a contagem e o condenado. Sempre há **10 s de apelação** — mesmo sem Advogado na partida, para a pausa não entregar nada.',
        'The TV shows the totals and who is condemned. There are always **10 s of appeal** — even with no Lawyer in the match, so the pause gives nothing away.',
      ),
      tx(
        'O **Advogado** pode anular a expulsão (2 vezes por partida); a TV diz só "anulada". Sem anulação, o condenado é **expulso** e não revela a classe (a menos que o Host tenha ligado essa opção). Depois, anoitece.',
        'The **Lawyer** may overturn the expulsion (twice per match); the TV only says "overturned". Otherwise the condemned player is **expelled** without revealing their class (unless the Host turned that on). Then night falls.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        '**Mortos** viram espectadores e ficam em silêncio. Se o Host escolheu "Mortos veem tudo", o celular deles mostra todas as classes e a última noite.',
        '**The dead** become spectators and stay silent. If the Host chose "The dead see everything", their phone shows every class and the last night.',
      ),
      tx(
        'Se alguém desconecta, o jogo pausa por 20 s. Se não voltar, **sai da partida**: conta como morto, a classe não é revelada e nenhum poder ganha crédito por essa saída.',
        'If someone disconnects, the game pauses for 20 s. If they do not come back, they **leave the match**: they count as dead, their class stays hidden and no power gets credit for it.',
      ),
      tx(
        'Ninguém espera por ninguém: toda fase termina pelo tempo. Quem não escolhe a tempo simplesmente não age.',
        'Nobody waits for anyone: every phase ends by its timer. Anyone who does not pick in time simply does not act.',
      ),
    ],
  },
  {
    title: tx('As classes', 'The classes'),
    body: [
      tx(
        'Cada classe tem uma ficha logo abaixo destas páginas, com busca. O Host pode mostrar qualquer ficha na TV para resolver uma dúvida da mesa.',
        'Every class has a card right below these pages, with search. The Host can show any card on the TV to settle a question at the table.',
      ),
      tx(
        'Classes com **usos limitados** dizem quantos; o cartão da sua classe mostra quantos usos restam.',
        'Classes with **limited uses** say how many; your class card shows how many you have left.',
      ),
    ],
  },
  {
    title: tx('Fim de jogo', 'End of the game'),
    body: [
      tx(
        'Quando um lado vence, a TV mostra **Vencedores** e **Perdedores** e revela a classe de todos.',
        'When a side wins, the TV shows **Winners** and **Losers** and reveals everyone\'s class.',
      ),
      tx(
        'Este jogo **não dá pontos** no placar da sala. O Host escolhe **Jogar de novo** (volta à configuração com as mesmas escolhas, sem tutorial) ou **Encerrar** (volta ao lobby).',
        'This game **gives no points** on the room scoreboard. The Host picks **Play again** (back to the setup with the same choices, no tutorial) or **Finish** (back to the lobby).',
      ),
    ],
  },
];

/** Incógnito is an original game: nothing to credit. */
export const CREDITS: I18nText | null = null;

/** One-liners on the TV during the first night and day while the tutorial option is on. */
export type Hint = 'night' | 'report' | 'dawn' | 'day' | 'vote' | 'verdict';

export const HINTS: Record<Hint, I18nText> = {
  night: tx('Dica: todos tocam em alguém no celular — até quem não tem poder.', 'Tip: everyone taps someone on their phone — even without a power.'),
  report: tx('Dica: leiam o relatório em silêncio; quem não tem nada vê "Nada a relatar".', 'Tip: read your report in silence; most people see "Nothing to report".'),
  dawn: tx('Dica: quem tem poder da manhã olha o celular agora.', 'Tip: morning powers, check your phone now.'),
  day: tx('Dica: discutam e acusem; toque "Pular discussão" quando quiser votar.', 'Tip: debate and accuse; tap "Skip the debate" when you are ready to vote.'),
  vote: tx('Dica: vote em quem expulsar, ou em Pular. A TV mostra só a contagem.', 'Tip: vote for whom to expel, or Skip. The TV shows only the totals.'),
  verdict: tx('Dica: o Advogado ainda pode anular a expulsão.', 'Tip: the Lawyer may still overturn the expulsion.'),
};
