import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, in PT-BR and EN. Inline markup: **bold** for key terms (see `rich()`
// in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/** Tutorial slides shown on the TV before the first round (the Host advances them). */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'faces' | 'table' | 'actions' | 'both' | 'reveal' }[] = [
  {
    title: tx('Duas faces', 'Two faces'),
    demo: 'faces',
    body: [
      tx(
        'Um duelo entre **dois jogadores**. Cada rodada, cada um recebe uma carta com **dois números diferentes**, de 1 a 10.',
        'A duel between **two players**. Each round, each of you gets a card with **two different numbers**, from 1 to 10.',
      ),
      tx(
        'A **frente** fica virada para cima: todos veem, na TV e nos celulares.',
        'The **front** lies face up: everyone sees it, on the TV and on the phones.',
      ),
      tx(
        'O **verso** só aparece no **seu** celular. Ninguém mais sabe o que tem nele.',
        'The **back** only shows on **your** phone. Nobody else knows what is on it.',
      ),
    ],
  },
  {
    title: tx('Escolha o lado', 'Pick a side'),
    demo: 'table',
    body: [
      tx(
        'No seu primeiro lance da rodada, você escolhe em qual lado aposta: **Frente** ou **Verso**. Depois não dá para trocar.',
        'With your first move of the round, you pick which side you bet on: **Front** or **Back**. It cannot change afterwards.',
      ),
      tx(
        'Suas fichas vão para a zona do lado escolhido na mesa — **todos veem o lado**, nunca o verso.',
        'Your chips go to that side’s zone on the table — **everyone sees the side**, never the back.',
      ),
      tx(
        'Na revelação, o seu lado escolhido enfrenta o lado escolhido do rival. O **maior número** leva o pote.',
        'At the reveal, your chosen side faces your rival’s chosen side. The **higher number** takes the pot.',
      ),
    ],
  },
  {
    title: tx('Sua vez', 'Your turn'),
    demo: 'actions',
    body: [
      tx(
        '**Pagar**: iguala a aposta do rival. A aposta acaba e as cartas viram. (No 1º lance, com as apostas iguais, é **Passar**: a vez vai para o rival.)',
        '**Call**: match your rival’s bet. Betting ends and the cards flip. (On the first move, with bets equal, it is **Check**: the turn goes to your rival.)',
      ),
      tx(
        '**Aumentar**: aposta mais que o rival. A vez passa para ele.',
        '**Raise**: bet more than your rival. The turn passes to them.',
      ),
      tx(
        '**Desistir**: o rival leva o pote. Se o seu **tempo acabar**, você desiste!',
        '**Fold**: your rival takes the pot. If your **time runs out**, you fold!',
      ),
    ],
  },
  {
    title: tx('Aposta dupla', 'Both sides'),
    demo: 'both',
    body: [
      tx(
        'Acha que **frente e verso** da sua carta vencem o lado do rival? Aposte em **Ambos**: você paga o **dobro** — a aposta vale para cada lado.',
        'Think **both the front and the back** of your card beat your rival’s side? Bet on **Both**: you pay **double** — the bet counts on each side.',
      ),
      tx(
        'Só vence se os **dois lados forem maiores**. Um lado igual ou menor e você perde tudo.',
        'You win only if **both sides are higher**. One side equal or lower and you lose it all.',
      ),
      tx(
        'Vencendo — ou se o rival desistir — você ganha **+10 fichas** do rival. Só um jogador por rodada pode apostar em Ambos.',
        'Win — or have your rival fold — and you take **+10 chips** from your rival. Only one player per round may bet on Both.',
      ),
    ],
  },
  {
    title: tx('A revelação', 'The reveal'),
    demo: 'reveal',
    body: [
      tx(
        '**1 ·** Cada um paga **1 ficha** de entrada. **2 ·** Apostem, um de cada vez. **3 ·** As cartas viram na TV.',
        '**1 ·** Each of you antes **1 chip**. **2 ·** Bet, one at a time. **3 ·** The cards flip on the TV.',
      ),
      tx(
        'Lados **iguais**: ninguém leva — o pote **acumula** para a próxima rodada.',
        '**Equal** sides: nobody wins — the pot **carries over** to the next round.',
      ),
      tx(
        'Quem ficar **sem fichas** perde. Blefe à vontade.',
        'Whoever runs **out of chips** loses. Bluff away.',
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
        'Um duelo de pôquer para **2 jogadores**. Cada um começa com **30 fichas** (o Host pode mudar).',
        'A poker duel for **2 players**. Each starts with **30 chips** (the Host can change it).',
      ),
      tx(
        'Cada rodada, cada um recebe uma carta de **duas faces**: a frente é pública, o verso só o dono vê. Você aposta em um lado — ou nos dois.',
        'Each round, each of you gets a **two-faced** card: the front is public, only its owner sees the back. You bet on one side — or on both.',
      ),
      tx(
        'Vence quem deixar o rival **sem fichas** — ou quem tiver mais fichas ao fim das rodadas.',
        'You win by leaving your rival with **no chips** — or by having more chips when the rounds are over.',
      ),
    ],
  },
  {
    title: tx('As cartas', 'The cards'),
    body: [
      tx(
        'Cada carta tem **dois números diferentes** de **1 a 10**, um em cada face. O 10 é o maior, o 1 o menor.',
        'Each card has **two different numbers** from **1 to 10**, one on each face. 10 is the highest, 1 the lowest.',
      ),
      tx(
        'O sapato tem **200 cartas**: quatro jogos de 50, embaralhados juntos. Cada jogo tem todos os 45 pares de números uma vez, mais 5 pares sorteados. Qual número fica na frente também é sorteado.',
        'The shoe holds **200 cards**: four sets of 50, shuffled together. Each set has all 45 number pairs once, plus 5 random pairs. Which number is the front is random too.',
      ),
      tx(
        'Quando o sapato acaba ele é **reembaralhado**, e a TV avisa.',
        'When the shoe runs out it is **reshuffled**, and the TV says so.',
      ),
    ],
  },
  {
    title: tx('Escolher o lado', 'Picking a side'),
    body: [
      tx(
        'O lado é escolhido no **seu primeiro lance** da rodada (Passar, Pagar ou Aumentar): **Frente**, **Verso** ou **Ambos**. Depois ele fica **travado** até o fim da rodada.',
        'You pick the side with **your first move** of the round (Check, Call or Raise): **Front**, **Back** or **Both**. It is then **locked** until the round ends.',
      ),
      tx(
        'O lado escolhido aparece **para todos** na TV. Apostar na frente mostra o seu número; apostar no verso o esconde.',
        'Your chosen side shows **to everyone** on the TV. Betting on the front shows your number; betting on the back hides it.',
      ),
      tx(
        'Quem joga **depois** já vê o lado do rival antes de escolher o seu. Desistir não exige escolher lado.',
        'Whoever moves **second** already sees their rival’s side before picking. Folding needs no side.',
      ),
    ],
  },
  {
    title: tx('Ações', 'Actions'),
    body: [
      tx(
        'As apostas são **por lado**. Quem aposta em um lado coloca a aposta uma vez; quem aposta em Ambos coloca a mesma aposta **em cada lado** (o dobro de fichas).',
        'Bets are **per side**. Betting on one side puts the bet down once; betting on Both puts the same bet **on each side** (twice the chips).',
      ),
      tx(
        '**Pagar**: iguala a aposta do rival. A aposta acaba e as cartas viram. Se o rival ainda não escolheu lado (o 1º lance da rodada), o botão é **Passar**: você só escolhe seu lado e a vez vai para ele.',
        '**Call**: match your rival’s bet. Betting ends and the cards flip. If your rival has not picked a side yet (the round’s 1st move), the button is **Check**: you just pick your side and the turn goes to them.',
      ),
      tx(
        '**Aumentar**: aposta mais que o rival — pelo menos **1 ficha a mais por lado**. Você nunca aposta mais do que tem, nem mais do que o rival consegue cobrir.',
        '**Raise**: bet more than your rival — at least **1 more chip per side**. You never bet more than you have, nor more than your rival can cover.',
      ),
      tx(
        '**Desistir**: você perde o que apostou e o rival leva o pote. Você tem **30 s** por jogada (o Host pode mudar); se o tempo acabar, você **desiste**.',
        '**Fold**: you lose what you bet and your rival takes the pot. You have **30 s** per move (the Host can change it); if time runs out, you **fold**.',
      ),
    ],
  },
  {
    title: tx('Aposta dupla', 'Both sides'),
    body: [
      tx(
        'Escolha **Ambos** quando achar que **frente e verso** da sua carta são **maiores** que o lado escolhido do rival.',
        'Pick **Both** when you think **both the front and the back** of your card are **higher** than your rival’s chosen side.',
      ),
      tx(
        'Você vence só se **os dois** forem estritamente maiores. Se qualquer lado for **igual ou menor**, o rival leva o pote inteiro — não há empate.',
        'You win only if **both** are strictly higher. If either side is **equal or lower**, your rival takes the whole pot — there is no tie.',
      ),
      tx(
        '**Bônus**: vencendo com Ambos — também quando o rival **desiste** — você recebe **10 fichas** extras do rival (ou todas as que ele tiver).',
        '**Bonus**: winning on Both — also when your rival **folds** — earns you **10 extra chips** from your rival (or all they have).',
      ),
      tx(
        'Só **um jogador por rodada** pode apostar em Ambos, e só se tiver fichas para cobrir o dobro.',
        'Only **one player per round** may bet on Both, and only with enough chips to cover double.',
      ),
    ],
  },
  {
    title: tx('Empates', 'Ties'),
    body: [
      tx(
        '**Lados iguais**: ninguém leva. O pote inteiro **acumula** e vai para quem vencer a próxima rodada.',
        '**Equal sides**: nobody wins. The whole pot **carries over** to whoever wins the next round.',
      ),
      tx(
        'Se, depois de um empate, alguém ficar sem fichas, o pote acumulado **volta meio a meio** e o jogo segue.',
        'If someone is left with no chips after a tie, the carried pot **goes back half and half** and play goes on.',
      ),
      tx(
        'Se um jogador sair e não voltar em 20 s, o outro **vence** na hora.',
        'If a player leaves and does not return within 20 s, the other **wins** at once.',
      ),
    ],
  },
  {
    title: tx('Fim e pontuação', 'End and scoring'),
    body: [
      tx(
        'Quem começa é sorteado na 1ª rodada e depois **alterna**. Cada rodada termina com as duas cartas viradas na TV — também quando alguém desiste.',
        'The first player is drawn in round 1 and then **alternates**. Every round ends with both cards flipped on the TV — also when someone folds.',
      ),
      tx(
        'A partida acaba quando alguém fica **sem fichas**, ou depois de **15 rodadas** (o Host pode mudar) — vence quem tiver mais fichas.',
        'The match ends when someone has **no chips**, or after **15 rounds** (the Host can change it) — the most chips wins.',
      ),
      tx(
        '**Morte súbita**: se ao fim das rodadas houver pote acumulado ou as fichas estiverem iguais, jogam-se rodadas extras até haver um vencedor.',
        '**Sudden death**: if a carried pot is pending or the chips are equal when the rounds are over, extra rounds are played until there is a winner.',
      ),
      tx(
        'No placar da sala, o vencedor ganha **1 ponto** e o perdedor 0.',
        'On the room scoreboard, the winner gets **1 point** and the loser 0.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Adaptação livre da mecânica de um jogo de pôquer de cartas de duas faces visto no programa de TV **The Genius** (tvN). Regras de jogos não são protegidas por direitos autorais.',
        'A free adaptation of the mechanics of a two-faced-card poker game seen on the TV show **The Genius** (tvN). Game rules are not protected by copyright.',
      ),
      tx(
        'Nome, textos, telas e arte originais do Noir Club. Não é uma versão oficial de nenhum programa de TV.',
        'Name, text, screens and art are original to Noir Club. Not an official version of any TV show.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText | null = tx(
  'Adaptação livre de um jogo do programa The Genius (tvN).',
  'A free adaptation of a game from the TV show The Genius (tvN).',
);
