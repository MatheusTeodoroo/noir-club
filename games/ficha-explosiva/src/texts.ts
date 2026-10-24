import type { I18nText } from '@mp/game-sdk';
import { CATALOG, GROUP_NAMES, UNITS, type CharId } from './shared.ts';

// The tutorial and the full rules, in PT-BR and EN, shared by the UI and the logic (page counts).
// Inline markup: **bold** for the terms a player must spot. No secrets here: it ships to every phone.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'families' | 'halls' | 'share' | 'round';

/** Tutorial slides shown on the TV before the deck is built (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Duas famílias', 'Two families'),
    demo: 'families',
    body: [
      tx(
        'Vocês se dividem em duas famílias: a **Família Ouro** protege **o Chefão**; a **Família Carmim** tem **o Assassino**, que carrega a ficha explosiva.',
        'You split into two families: the **Gold Family** protects **the Boss**; the **Crimson Family** has **the Hitman**, who carries the loaded chip.',
      ),
      tx(
        'No fim, todos no salão do Assassino caem. O Carmim vence se o Chefão estiver lá; o Ouro, se não estiver.',
        'At the end, everyone in the Hitman’s hall goes down. Crimson wins if the Boss is there; Gold wins if he is not.',
      ),
    ],
  },
  {
    title: tx('Dois salões', 'Two halls'),
    demo: 'halls',
    body: [
      tx(
        'O jogo sorteia quem fica no **Salão A** e quem fica no **Salão B** — dois cômodos onde um não ouve o outro.',
        'The game decides who stands in **Hall A** and who stands in **Hall B** — two rooms out of earshot of each other.',
      ),
      tx(
        'Sua carta fica **escondida no celular**: toque para espiar. A TV mostra só o que os dois salões podem saber: quem está onde e quem lidera.',
        'Your card stays **hidden on your phone**: tap to peek. The TV only shows what both halls may know: who is where and who leads.',
      ),
    ],
  },
  {
    title: tx('Converse e mostre', 'Talk and show'),
    demo: 'share',
    body: [
      tx(
        'Fale à vontade e minta se quiser. Para provar quem você é, toque em alguém do seu salão e **peça troca de carta**: se a pessoa aceitar, cada um vê a carta do outro.',
        'Talk freely and lie if you like. To prove who you are, tap someone in your hall and **offer a card share**: if they accept, each of you sees the other’s card.',
      ),
      tx(
        'Cada salão tem um **líder**. Nomeie alguém (nunca você mesmo); se mais da metade do salão **apontar** para outra pessoa, ela toma a liderança.',
        'Each hall has a **leader**. Appoint someone (never yourself); if more than half the hall **points** at someone else, they take over.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    demo: 'round',
    body: [
      tx(
        '**1 ·** O relógio corre (3, 2 e 1 minuto). **2 ·** O líder escolhe os **reféns** no celular e trava. **3 ·** No fim do tempo, os reféns **trocam de salão**.',
        '**1 ·** The clock runs (3, 2 and 1 minute). **2 ·** The leader picks the **hostages** on the phone and locks them. **3 ·** When time is up, the hostages **swap halls**.',
      ),
      tx(
        'Depois da última troca vem a **revelação**. Cartas prata têm objetivos próprios — leia a sua!',
        'After the last exchange comes the **reveal**. Silver cards have goals of their own — read yours!',
      ),
    ],
  },
];

const charLine = (c: CharId): I18nText => ({
  'pt-BR': `**${CATALOG[c].name['pt-BR']}** — ${CATALOG[c].text['pt-BR']}`,
  en: `**${CATALOG[c].name.en}** — ${CATALOG[c].text.en}`,
});

/** Characters of text per rules page, so a page still fits the TV when the Host shows it. */
const PAGE_CHARS = 650;

/** Splits lines into pages of about the same length, none much over PAGE_CHARS. */
function paginate(lines: I18nText[]): I18nText[][] {
  const len = (l: I18nText) => Math.max(l['pt-BR'].length, l.en.length);
  const total = lines.reduce((n, l) => n + len(l), 0);
  const target = total / Math.ceil(total / PAGE_CHARS);
  const pages: I18nText[][] = [[]];
  let size = 0;
  for (const l of lines) {
    if (size > 0 && size + len(l) / 2 > target) {
      pages.push([]);
      size = 0;
    }
    pages.at(-1)!.push(l);
    size += len(l);
  }
  return pages;
}

/** Rules pages per group of characters, written from the same catalog the cards use. */
const characterPages = (['reservas', 'salas', 'compartilhar', 'lideranca'] as const).flatMap((g) => {
  const lines = [...new Set(UNITS.filter((u) => u.group === g).flatMap((u) => u.cards))]
    // Twin cards (an Ouro and a Carmim copy) share one line.
    .filter((c, i, all) => all.findIndex((x) => CATALOG[x].name.en === CATALOG[c].name.en) === i)
    .map(charLine);
  const pages = paginate(lines);
  return pages.map((body, i) => {
    const part = pages.length > 1 ? ` (${i + 1}/${pages.length})` : '';
    return {
      title: tx(`Personagens: ${GROUP_NAMES[g]['pt-BR']}${part}`, `Characters: ${GROUP_NAMES[g].en}${part}`),
      body,
    };
  });
});

/** The full rules, readable on any phone at any time and showable on the TV by the Host. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Jogo de dedução social para **6 a 30 pessoas**, em dois cômodos. Duas famílias disputam a sorte do **Chefão** (Ouro) contra o **Assassino** (Carmim); cartas **Prata** jogam por conta própria.',
        'A social deduction game for **6 to 30 people**, in two rooms. Two families fight over the fate of the **Boss** (Gold) against the **Hitman** (Crimson); **Silver** cards play for themselves.',
      ),
      tx(
        'A partida tem 3 rodadas (3, 2 e 1 minuto). No fim de cada uma, os líderes trocam reféns entre os salões. Depois da última troca, todos no salão do Assassino caem.',
        'A match has 3 rounds (3, 2 and 1 minute). At the end of each, the leaders trade hostages between the halls. After the last exchange, everyone in the Hitman’s hall goes down.',
      ),
      tx(
        'A **TV** mostra a mesma imagem em todos os cômodos: relógio, quem está em cada salão, líderes e cartas reveladas para sempre. Tudo o que é secreto fica no seu **celular**.',
        'The **TV** shows the same picture in every room: the clock, who is in each hall, the leaders and cards revealed for good. Everything secret stays on your **phone**.',
      ),
    ],
  },
  {
    title: tx('Preparação', 'Setup'),
    body: [
      tx(
        '**O baralho**: o Host escolhe um ponto de partida (Básico, Clássico ou Caos) e liga ou desliga grupos de personagens no celular. O jogo completa com cartas de família para Ouro e Carmim ficarem do mesmo tamanho; a TV mostra todas as cartas em jogo.',
        '**The deck**: the Host picks a starting point (Basic, Classic or Chaos) and switches groups of characters on or off on the phone. The game fills in family cards so Gold and Crimson have the same size; the TV shows every card in play.',
      ),
      tx(
        '**Número ímpar**: entra o **Apostador**. O Host pode, em vez disso, **enterrar uma carta** (sai do jogo sem ninguém saber qual); aí entram o **Herdeiro** e o **Braço Direito** como reservas.',
        '**Odd count**: the **Gambler** joins. The Host may instead **bury a card** (it leaves the game, nobody knows which); the **Heir** and the **Right Hand** then join as backups.',
      ),
      tx(
        '**Ver a carta**: no celular (toque para espiar e depois **Pronto**) ou, se o Host escolheu, um por vez no **Dealer**. Vá para o salão que o celular indicar.',
        '**Seeing your card**: on the phone (tap to peek, then **Ready**) or, if the Host chose so, one at a time at the **Dealer**. Go to the hall your phone shows.',
      ),
    ],
  },
  {
    title: tx('As cartas', 'The cards'),
    body: [
      tx(
        '**Ouro** e **Carmim**: vencem ou perdem com a família. **Prata**: cada carta tem o próprio objetivo, escrito nela.',
        '**Gold** and **Crimson**: win or lose with their family. **Silver**: each card has its own goal, written on it.',
      ),
      tx(
        'A **cor** de uma carta é a da faixa. O **Infiltrado** é a exceção: num compartilhamento de cor ele mostra a cor da outra família.',
        'A card’s **colour** is its band. The **Mole** is the exception: in a colour share it shows the other family’s colour.',
      ),
      tx(
        '**Carta nova é carta limpa**: quem recebe outra carta (Ficha Quente) perde todas as condições e passa a jogar pela nova carta.',
        '**A new card is a clean card**: whoever gets another card (Hot Chip) loses every condition and now plays for the new card.',
      ),
      tx(
        '**Poderes são obrigatórios** quando a regra diz que acontecem; os que você escolhe usar aparecem no seu celular, com a carta aberta, em **Usar poder**.',
        '**Powers are mandatory** when the rule says they happen; the ones you choose to use show on your phone, with the card open, under **Use power**.',
      ),
    ],
  },
  {
    title: tx('Líderes', 'Leaders'),
    body: [
      tx(
        '**Nomear**: enquanto um salão está sem líder, qualquer um toca em outra pessoa do salão e escolhe **Nomear líder**. Ninguém se nomeia.',
        '**Appoint**: while a hall has no leader, anyone taps another person in the hall and picks **Appoint as leader**. Nobody appoints themselves.',
      ),
      tx(
        '**Apontar**: com líder definido, cada um pode **apontar** para alguém do salão (inclusive para si). Quando mais da metade do salão aponta para a mesma pessoa, ela vira líder na hora. **Baixar a mão** retira o voto.',
        '**Point**: once there is a leader, anyone may **point** at someone in the hall (yourself included). When more than half the hall points at the same person, they become leader at once. **Lower your hand** withdraws the vote.',
      ),
      tx(
        '**Passar a liderança**: o líder oferece a alguém, que aceita ou recusa. Quem recebeu não pode devolver para quem passou na mesma rodada.',
        '**Hand over leadership**: the leader offers it to someone, who accepts or declines. Whoever took it can’t hand it back to the giver in the same round.',
      ),
      tx(
        'O líder **nunca é refém**. Se o salão terminar a rodada sem líder, o jogo sorteia um.',
        'The leader is **never a hostage**. If a hall ends the round without a leader, the game draws one at random.',
      ),
    ],
  },
  {
    title: tx('Compartilhar e revelar', 'Sharing and revealing'),
    body: [
      tx(
        '**Pedir troca de carta**: a outra pessoa aceita ou recusa; aceitou, cada um vê a carta inteira do outro. Pedido sem resposta expira em 30 s. Só um pedido seu por vez.',
        '**Offer card share**: the other person accepts or declines; once accepted, each sees the other’s whole card. An unanswered offer expires after 30 s. One offer of yours at a time.',
      ),
      tx(
        '**Pedir troca de cor** e **Mostrar minha cor** (só com 11 ou mais jogadores): mostram apenas a cor da carta.',
        '**Offer colour share** and **Show my colour** (only with 11 or more players): show only the card’s colour.',
      ),
      tx(
        '**Mostrar minha carta**: só a outra pessoa vê a sua, sem troca. **Revelar ao salão**: todos do seu salão veem sua carta.',
        '**Show my card**: only the other person sees yours, nothing in return. **Reveal to the hall**: everyone in your hall sees your card.',
      ),
      tx(
        'Tudo só funciona com quem está **no mesmo salão** (Embaixadores falam com todos). O que você viu fica em **Ver o que você sabe**.',
        'All of it only works with people **in the same hall** (Envoys reach everyone). What you have seen stays under **See what you know**.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Relógio**: as rodadas duram 3, 2 e 1 minuto (o Host pode mudar: todas de 3 min, sem cronômetro, ou 5 rodadas de 5·4·3·2·1 com 11+ jogadores).',
        '**1 · Clock**: rounds last 3, 2 and 1 minute (the Host can change it: all 3 min, no clock, or 5 rounds of 5·4·3·2·1 with 11+ players).',
      ),
      tx(
        '**2 · Reféns**: o líder marca no celular quantos reféns a rodada pede e toca em **Travar reféns** — depois disso não muda mais. O salão vê quem foi escolhido; a TV só mostra que travou.',
        '**2 · Hostages**: the leader marks as many hostages as the round asks for and taps **Lock hostages** — after that it can’t change. The hall sees who was picked; the TV only shows that it is locked.',
      ),
      tx(
        '**3 · Fim do tempo**: quem não travou recebe reféns sorteados. A TV mostra os reféns dos dois salões ao mesmo tempo.',
        '**3 · Time’s up**: a leader who did not lock gets hostages drawn at random. The TV shows both halls’ hostages at the same time.',
      ),
      tx(
        'Reféns por rodada (3 rodadas): 6–13 jogadores: 1·1·1 · 14–21: 2·1·1 · 22+: 3·2·1. Com 5 rodadas: 11–13: 2·2·1·1·1 · 14–17: 3·2·2·1·1 · 18–21: 4·3·2·1·1 · 22+: 5·4·3·2·1. Embaixadores não contam.',
        'Hostages per round (3 rounds): 6–13 players: 1·1·1 · 14–21: 2·1·1 · 22+: 3·2·1. With 5 rounds: 11–13: 2·2·1·1·1 · 14–17: 3·2·2·1·1 · 18–21: 4·3·2·1·1 · 22+: 5·4·3·2·1. Envoys don’t count.',
      ),
    ],
  },
  {
    title: tx('A troca de reféns', 'The hostage exchange'),
    body: [
      tx(
        'Os reféns atravessam para o outro salão e tocam em **Cheguei**. A troca acaba quando todos chegam ou em 30 s (o Host pode mudar).',
        'The hostages cross to the other hall and tap **I’m here**. The exchange ends when everyone has arrived or after 30 s (the Host can change it).',
      ),
      tx(
        'Os líderes continuam líderes na rodada seguinte. Pedidos de troca em aberto são cancelados entre as rodadas.',
        'Leaders stay leaders in the next round. Open share offers are cancelled between rounds.',
      ),
    ],
  },
  {
    title: tx('Pausa e revelação', 'Pause and reveal'),
    body: [
      tx(
        'Depois da última troca, quem tem algo a anunciar escolhe no celular, nesta ordem: **Investigador** (a carta enterrada), **Apostador** (qual família vence), **Atirador** (em quem atira). Cada passo dura até 40 s.',
        'After the last exchange, whoever has something to announce chooses on the phone, in this order: **Investigator** (the buried card), **Gambler** (which family wins), **Marksman** (whom to shoot). Each step lasts up to 40 s.',
      ),
      tx(
        'Então a TV vira todas as cartas. Todos no salão do Assassino caem (com a Dinamite ou o Guarda-costas, quem cai é o salão deles).',
        'Then the TV flips every card. Everyone in the Hitman’s hall goes down (with the Dynamite or the Bodyguard, it is their hall that goes down).',
      ),
      tx(
        '**Ouro vence** se o Chefão escapou (e, com o Médico em jogo, se o Chefão trocou de carta com ele). **Carmim vence** se o Chefão caiu (e, com o Armeiro, se o Assassino trocou de carta com ele). As duas podem perder.',
        '**Gold wins** if the Boss got away (and, with the Doctor in play, if the Boss card shared with him). **Crimson wins** if the Boss went down (and, with the Armorer, if the Hitman card shared with him). Both can lose.',
      ),
    ],
  },
  {
    title: tx('Personagens: base', 'Characters: basics'),
    body: (['chefao', 'assassino', 'soldadoOuro', 'soldadoCarmim', 'apostador'] as CharId[]).map(charLine),
  },
  ...characterPages,
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        '**Condições**: apaixonado (terminem no mesmo salão), odeia (terminem em salões diferentes) e tolo (aceita todo pedido de carta). Apaixonado e odeia se anulam.',
        '**Conditions**: in love (end in the same hall), in hate (end in different halls) and gullible (accepts every card share). In love and in hate cancel out.',
      ),
      tx(
        '**Quem cai da conexão** pausa o jogo por 20 s. Se não voltar, continua como carta parada: fica no salão, conta no fim e pode ser refém. Se era líder, o salão nomeia outro.',
        '**Whoever drops** pauses the game for 20 s. If they don’t return, they stay as a standing card: still in the hall, counted at the end, and may be a hostage. If they led, the hall appoints another.',
      ),
      tx(
        '**Salão pequeno**: se não houver gente suficiente para os reféns pedidos, o salão manda quem puder.',
        '**Small hall**: if there aren’t enough people for the hostages asked, the hall sends whoever it can.',
      ),
      tx(
        '**Variantes do Host**: enterrar carta também com número par; derrota prematura (cartas prata que já perderam jogam a última rodada como Apostador); sem cronômetro (a rodada acaba quando os dois líderes travam).',
        '**Host variants**: bury a card with an even count too; early loss (silver cards already lost play the last round as Gamblers); no clock (the round ends when both leaders lock).',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'Cada jogador que cumpriu o próprio objetivo ganha **1 ponto** no placar da sala; quem não cumpriu, 0. Se o **Tirano** vencer, só ele pontua.',
        'Every player who met their own goal scores **1 point** on the room’s scoreboard; everyone else 0. If the **Tyrant** wins, only he scores.',
      ),
      tx(
        'Vale a carta que você tem **no fim** da partida (ela pode ter mudado com a Ficha Quente).',
        'What counts is the card you hold **at the end** of the match (it may have changed with the Hot Chip).',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Mecânica inspirada em **Two Rooms and a Boom**, de Alan Gerding e Sean McCoy (Tuesday Knight Games).',
        'Mechanics inspired by **Two Rooms and a Boom**, by Alan Gerding and Sean McCoy (Tuesday Knight Games).',
      ),
      tx(
        'Esta é uma versão **não oficial**, sem afiliação: nome, textos, personagens e visual são próprios do Noir Club.',
        'This is an **unofficial** version with no affiliation: name, texts, characters and visuals are Noir Club’s own.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide. */
export const CREDITS: I18nText | null = tx(
  'Inspirado em Two Rooms and a Boom (Alan Gerding e Sean McCoy) — versão não oficial.',
  'Inspired by Two Rooms and a Boom (Alan Gerding and Sean McCoy) — unofficial version.',
);
