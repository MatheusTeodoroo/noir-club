import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules (see the skill's reference/rules.md), in PT-BR and EN. Shared by the
// logic (page counts) and the UI (content); no secrets here. Inline markup: **bold** for the
// terms a player must spot; {zombie} and {cure} are swapped for the icons the TV uses.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'table' | 'touch' | 'outcomes' | 'cure' | 'end';

/** Tutorial slides on the TV before the roles; the Host advances them from the phone. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'table',
    body: [
      tx(
        'Alguns de vocês começam como **Zumbis** {zombie}; o resto é **Humano**. Ninguém sabe quem é quem — você descobre só o seu papel, no Dealer ou no celular.',
        'A few of you start as **Zombies** {zombie}; everyone else is **Human**. Nobody knows who is who — you only learn your own role, at the Dealer or on your phone.',
      ),
      tx(
        'Humanos querem **sobreviver e somar pontos**. Zumbis querem **infectar todo mundo**.',
        'Humans want to **survive and score**. Zombies want to **infect everyone**.',
      ),
    ],
  },
  {
    title: tx('O toque', 'The touch'),
    demo: 'touch',
    body: [
      tx(
        'Durante a rodada, escolha alguém no celular. A pessoa **aceita**, vocês se encontram e cada um digita o **código** que aparece no celular do outro.',
        'During the round, pick someone on your phone. They **accept**, you meet up, and each of you types the **code** shown on the other’s phone.',
      ),
      tx(
        'O celular só diz **"Toque registrado"**. O resultado fica em segredo até o fim do jogo.',
        'Your phone only says **"Touch registered"**. The result stays secret until the end of the game.',
      ),
    ],
  },
  {
    title: tx('O que um toque faz', 'What a touch does'),
    demo: 'outcomes',
    body: [
      tx('**Humano + Humano:** cada um ganha 1 ponto.', '**Human + Human:** each scores 1 point.'),
      tx(
        '**Humano + Zumbi:** o Humano vira Zumbi — e passa a infectar também.',
        '**Human + Zombie:** the Human turns — and infects others from then on.',
      ),
      tx('**Zumbi + Zumbi:** nada acontece.', '**Zombie + Zombie:** nothing happens.'),
      tx(
        'Toque pelo menos uma pessoa por rodada: **quem não tocar ninguém vira Zumbi** no fim dela.',
        'Touch at least one person each round: **whoever touches no one turns** when it ends.',
      ),
    ],
  },
  {
    title: tx('A cura', 'The cure'),
    demo: 'cure',
    body: [
      tx(
        'Cada um começa com **1 cura** {cure}. Se você acha que tocou um Zumbi, tome a cura: ela só funciona se a infecção for **desta rodada** e **recente** (3 min por padrão).',
        'Everyone starts with **1 cure** {cure}. If you think you touched a Zombie, take it: it only works on an infection from **this round** that is still **recent** (3 min by default).',
      ),
      tx(
        'Ninguém fica sabendo se funcionou. Você também pode **dar sua cura** em segredo para outra pessoa.',
        'Nobody learns whether it worked. You can also **give your cure** to someone else in secret.',
      ),
    ],
  },
  {
    title: tx('Rodadas e vitória', 'Rounds and winning'),
    demo: 'end',
    body: [
      tx(
        'No fim de cada rodada a TV mostra **quantos Zumbis e quantos Humanos** existem — nunca quem.',
        'After each round the TV shows **how many Zombies and how many Humans** there are — never who.',
      ),
      tx(
        'No fim, os **Humanos vivos** pontuam seus toques; o mais pontuado ganha +3. Zumbis não pontuam. Se todos virarem Zumbis, **os Zumbis iniciais vencem**.',
        'At the end, **surviving Humans** score their touches; the top scorer gets +3. Zombies never score. If everyone turns, **the starting Zombies win**.',
      ),
    ],
  },
];

/** Full rules, readable on every phone; the Host can show a page on the TV. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Surto é um jogo de dedução social para **5 a 12 jogadores**, presencial. Alguns começam infectados e tentam espalhar o Surto; os outros tentam sobreviver e somar pontos tocando apenas Humanos.',
        'Outbreak is an in-person social deduction game for **5 to 12 players**. A few start infected and try to spread the Outbreak; the rest try to survive and score by touching only Humans.',
      ),
      tx(
        'A partida tem **3 rodadas de 8 minutos** por padrão, com um intervalo de 60 s entre elas. O Host pode mudar rodadas, duração, intervalo, janela da cura, número de Zumbis iniciais e como os papéis são revelados.',
        'A match has **3 rounds of 8 minutes** by default, with a 60 s break between them. The Host can change the rounds, their length, the break, the cure window, the number of starting Zombies and how roles are revealed.',
      ),
    ],
  },
  {
    title: tx('Papéis', 'Roles'),
    body: [
      tx(
        '**Zumbi inicial** {zombie}: começa infectado. São 2 Zumbis iniciais (1 com menos de 7 jogadores), ou o número que o Host escolher.',
        '**Starting Zombie** {zombie}: starts infected. There are 2 (1 with fewer than 7 players), or as many as the Host picks.',
      ),
      tx('**Humano:** todos os outros.', '**Human:** everyone else.'),
      tx(
        'Antes da 1ª rodada cada um vê **só o próprio papel**: no **Dealer**, um de cada vez, ou no celular, segurando o cartão — o Host escolhe. Depois disso o celular nunca mais mostra o papel.',
        'Before round 1 everyone sees **only their own role**: at the **Dealer**, one at a time, or on the phone by holding the card — the Host picks. After that the phone never shows a role again.',
      ),
      tx(
        'Quem é infectado **não é avisado**. Você nunca sabe ao certo se ainda é Humano.',
        'A player who gets infected **is not told**. You never know for sure that you are still Human.',
      ),
    ],
  },
  {
    title: tx('Tocar', 'Touching'),
    body: [
      tx(
        '1 · No celular, toque no nome de alguém. 2 · A pessoa escolhe **Aceitar** ou **Recusar**. 3 · Aceito, cada celular mostra um **código de 2 dígitos**. 4 · Encontrem-se e cada um digita o código **do outro**. Quando os dois acertam, o toque é registrado.',
        '1 · On your phone, tap someone’s name. 2 · They choose **Accept** or **Decline**. 3 · Once accepted, each phone shows a **2-digit code**. 4 · Meet up and each types the **other’s** code. When both are right, the touch is registered.',
      ),
      tx(
        'O pedido expira em **45 s**. Três códigos errados cancelam o toque. Cada pessoa só tem **um pedido aberto** por vez, e quem está ocupado aparece apagado na lista.',
        'A request expires after **45 s**. Three wrong codes call the touch off. Each player has only **one open request** at a time, and busy players are dimmed in the list.',
      ),
      tx(
        'Na mesma rodada você **não pode tocar a mesma pessoa duas vezes**; na rodada seguinte, pode.',
        'Within a round you **cannot touch the same person twice**; in the next round you can.',
      ),
      tx(
        'A TV mostra os **3 toques mais recentes** (quem tocou quem), nunca o resultado.',
        'The TV shows the **3 most recent touches** (who touched whom), never the result.',
      ),
    ],
  },
  {
    title: tx('Resultado de um toque', 'What a touch does'),
    body: [
      tx('**Humano + Humano:** +1 ponto para cada um.', '**Human + Human:** +1 point each.'),
      tx(
        '**Humano + Zumbi:** o Humano vira Zumbi. Vale para Zumbis iniciais e para quem já foi infectado.',
        '**Human + Zombie:** the Human turns. This goes for starting Zombies and for anyone already infected.',
      ),
      tx('**Zumbi + Zumbi:** nada acontece.', '**Zombie + Zombie:** nothing happens.'),
      tx(
        '**Sem toques:** um Humano que não tocou ninguém durante a rodada inteira vira Zumbi quando ela termina. Essa infecção não tem cura.',
        '**No touches:** a Human who touched no one for the whole round turns when it ends. That infection cannot be cured.',
      ),
      tx(
        'Ninguém recebe o resultado: o celular só diz "Toque registrado com …".',
        'Nobody is told the result: the phone only says "Touch registered with …".',
      ),
    ],
  },
  {
    title: tx('Curas', 'Cures'),
    body: [
      tx(
        'Cada jogador começa com **1 cura** {cure}. **Tomar cura** só pode ser feito durante uma rodada e sempre gasta a cura.',
        'Everyone starts with **1 cure** {cure}. **Take a cure** only works during a round and always uses it up.',
      ),
      tx(
        'Ela cura apenas se você foi infectado por um toque **nesta mesma rodada**, há no máximo **3 minutos** (o Host pode mudar). Uma infecção da rodada anterior não tem cura, mesmo dentro do tempo.',
        'It only cures you if you were infected by a touch **in this same round**, at most **3 minutes** ago (the Host can change it). An infection from an earlier round cannot be cured, even within the time.',
      ),
      tx(
        '**Zumbis iniciais nunca são curados.** Tomar uma cura sem estar infectado não faz nada. Em todos os casos o celular só diz "Cura tomada".',
        '**Starting Zombies are never cured.** Taking a cure while not infected does nothing. In every case the phone only says "Cure taken".',
      ),
      tx(
        '**Dar cura:** durante a rodada ou no intervalo, você pode dar uma cura para qualquer jogador. Ninguém mais fica sabendo; quem recebe vê quem deu. Curas se acumulam.',
        '**Give a cure:** during a round or the break, you can give a cure to any player. Nobody else learns of it; the receiver sees who gave it. Cures add up.',
      ),
    ],
  },
  {
    title: tx('Rodadas, intervalos e ausências', 'Rounds, breaks and absences'),
    body: [
      tx(
        'Cada rodada tem um relógio na TV. Ao acabar, pedidos abertos são cancelados, quem não tocou ninguém vira Zumbi, e a TV revela **quantos Zumbis e quantos Humanos** existem.',
        'Each round has a clock on the TV. When it runs out, open requests are cancelled, anyone who touched no one turns, and the TV reveals **how many Zombies and how many Humans** there are.',
      ),
      tx(
        'Segue o **intervalo** para conversar (60 s por padrão) e a próxima rodada. Se não sobrar nenhum Humano, o jogo vai direto para o final.',
        'Then comes the **break** to talk (60 s by default) and the next round. If no Human is left, the game goes straight to the end.',
      ),
      tx(
        'Se alguém cair, o jogo pausa por 20 s. Se não voltar, seus pedidos abertos são cancelados e ele segue na partida — e pode virar Zumbi por não tocar ninguém.',
        'If someone drops, the game pauses for 20 s. If they do not come back, their open requests are cancelled and they stay in the match — and may turn for touching no one.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'O jogo termina depois da última rodada (ou antes, se todos virarem Zumbis). A TV mostra os Zumbis iniciais, cada infecção, as curas que funcionaram e as curas doadas.',
        'The game ends after the last round (or earlier, if everyone turns). The TV shows the starting Zombies, every infection, the cures that worked and the cures given.',
      ),
      tx(
        '**Humanos vivos:** 1 ponto por toque em Humano; quem tiver mais pontos ganha **+3** (empatados no topo, todos ganham). Se todos os vivos empatarem, é **vitória conjunta**.',
        '**Surviving Humans:** 1 point per touch with a Human; the top scorer gets **+3** (everyone tied at the top gets it). If every survivor ties, it is a **joint victory**.',
      ),
      tx(
        '**Zumbis não pontuam**, nem os iniciais nem os infectados. Se todos virarem Zumbis, **os Zumbis iniciais vencem** a partida, marcados com {zombie} no placar.',
        '**Zombies never score**, starting or infected. If everyone turns, **the starting Zombies win** the match, marked with {zombie} on the standings.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Mais sobre o jogo original: the-genius-show.fandom.com/wiki/Zombie_Game',
        'More about the original game: the-genius-show.fandom.com/wiki/Zombie_Game',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText | null = tx(
  'Inspirado no **Zombie Game** do programa **The Genius** (1ª temporada). Versão não oficial, com nome, telas e textos próprios.',
  'Inspired by the **Zombie Game** from the show **The Genius** (season 1). Unofficial version with its own name, screens and texts.',
);
