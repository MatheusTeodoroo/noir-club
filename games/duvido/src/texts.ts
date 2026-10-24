import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules (see the skill's reference/rules.md), in PT-BR and EN. Shared by the
// logic (page counts) and the UI (content); no secrets here. Inline markup: **bold** for the
// terms a player must spot; {card} is swapped for the card icon the TV board uses.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'question' | 'category' | 'raise' | 'doubt' | 'cards';

/** Tutorial slides on the TV before round 1; the Host advances them from the phone. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'question',
    body: [
      tx(
        'Cada rodada tem **uma pergunta** cuja resposta é **um número**. Ninguém sabe a resposta — todo mundo chuta.',
        'Each round has **one question** whose answer is **a number**. Nobody knows it — everyone guesses.',
      ),
      tx(
        'Os palpites vão subindo até alguém gritar **DUVIDO!**. Quem errar leva uma carta {card}, e **quem juntar mais cartas perde**.',
        'Guesses keep climbing until someone shouts **I DOUBT IT!**. Whoever is wrong takes a card {card}, and **the most cards loses**.',
      ),
    ],
  },
  {
    title: tx('A categoria', 'The category'),
    demo: 'category',
    body: [
      tx(
        'Quem **abre a rodada** (★) escolhe no celular uma entre as categorias sorteadas.',
        'Whoever **opens the round** (★) picks one of the drawn categories on their phone.',
      ),
      tx(
        'Sai uma pergunta dessa categoria, com a **unidade** em que se responde: anos, kg, metros…',
        'A question from it appears, with the **unit** to answer in: years, kg, meters…',
      ),
    ],
  },
  {
    title: tx('Palpites', 'Guesses'),
    demo: 'raise',
    body: [
      tx(
        'A vez anda **em ordem**, como na fita da TV, e volta ao começo quando chega no fim.',
        'Turns go **in order**, like the strip on the TV, and loop back to the start.',
      ),
      tx(
        'Quem abre dá um número que acha ser **menor ou igual** à resposta.',
        'The opener says a number they think is **at most** the answer.',
      ),
      tx(
        'Na sua vez: **Palpitar** um número **maior** que o anterior, ou **DUVIDO!** se achar que ele já passou da resposta.',
        'On your turn: **Guess** a number **higher** than the last one, or **I DOUBT IT!** if you think it is already over the answer.',
      ),
    ],
  },
  {
    title: tx('DUVIDO!', 'I DOUBT IT!'),
    demo: 'doubt',
    body: [
      tx(
        'A TV revela a resposta. Se o último palpite **passou da resposta**, quem palpitou leva a carta.',
        'The TV reveals the answer. If the last guess is **over the answer**, the guesser takes the card.',
      ),
      tx(
        'Se ele for **menor ou igual**, a carta fica com **quem duvidou**. Quem duvidou abre a próxima rodada.',
        'If it is **at most the answer**, the card goes to **the doubter**. The doubter opens the next round.',
      ),
    ],
  },
  {
    title: tx('Quem perde', 'Who loses'),
    demo: 'cards',
    body: [
      tx(
        'Cada carta {card} vale **−1 ponto**. A partida acaba depois das rodadas combinadas, ou quando alguém chega ao limite de cartas.',
        'Each card {card} is worth **−1 point**. The match ends after the set rounds, or when someone reaches the card limit.',
      ),
      tx('Fuja das cartas: blefe alto, mas não alto demais.', 'Stay away from cards: bluff high, but not too high.'),
    ],
  },
];

/** The full rules: readable on any phone at any moment; the Host can put a page on the TV. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo de palpites e blefe para **3 a 16 pessoas**. Cada rodada tem uma pergunta cuja resposta é um número inteiro.',
        'A guessing and bluffing game for **3 to 16 people**. Each round has a question whose answer is a whole number.',
      ),
      tx(
        'Os palpites sobem até alguém duvidar. Quem errar leva uma **carta** {card}. No fim, **quem tiver mais cartas perde** e todos os outros vencem.',
        'Guesses climb until someone doubts. Whoever is wrong takes a **card** {card}. At the end, **the most cards loses** and everyone else wins.',
      ),
      tx(
        'O jogo tem dezenas de categorias e milhares de perguntas. Uma pergunta nunca se repete na mesma partida.',
        'The game has dozens of categories and thousands of questions. A question never repeats within a match.',
      ),
    ],
  },
  {
    title: tx('Ordem e categoria', 'Order and category'),
    body: [
      tx(
        '**Ordem**: no começo da partida o jogo sorteia a ordem dos jogadores. A vez segue essa ordem e volta ao primeiro depois do último — a fita na parte de baixo da TV mostra quem joga agora e quem vem depois.',
        '**Order**: at the start the game shuffles the seating. Turns follow it and loop from the last back to the first — the strip at the bottom of the TV shows who plays now and who comes next.',
      ),
      tx(
        '**Quem abre** (★): sorteado na 1ª rodada; depois, quem duvidou na rodada anterior.',
        '**The opener** (★): drawn in round 1; after that, whoever doubted in the previous round.',
      ),
      tx(
        '**Categoria**: quem abre escolhe uma das categorias sorteadas (5 por padrão; o Host pode mudar). Sai uma pergunta dessa categoria, com a **unidade** em que se responde.',
        '**Category**: the opener picks one of the drawn categories (5 by default; the Host can change it). A question from it appears, with the **unit** to answer in.',
      ),
    ],
  },
  {
    title: tx('Palpitar', 'Guess'),
    body: [
      tx(
        '**Abertura**: quem abre dá o primeiro palpite — um número que acha ser **menor ou igual** à resposta (pode ser 0).',
        '**Opening**: the opener makes the first guess — a number they think is **at most** the answer (0 is allowed).',
      ),
      tx(
        '**Palpitar**: na sua vez, diga um número inteiro **maior** que o último palpite. Use o teclado ou os atalhos +1, +10 e ×2.',
        '**Guess**: on your turn, say a whole number **higher** than the last guess. Use the keypad or the +1, +10 and ×2 shortcuts.',
      ),
      tx(
        'Só valem números inteiros. Para respostas grandes a pergunta já vem numa unidade que dá inteiro (milhões, mil, cm…).',
        'Only whole numbers count. For big answers the question already comes in a unit that keeps it whole (millions, thousands, cm…).',
      ),
    ],
  },
  {
    title: tx('DUVIDO!', 'I DOUBT IT!'),
    body: [
      tx(
        'Na sua vez, em vez de palpitar, você pode apertar **DUVIDO!** contra o último palpite. Não dá para duvidar antes do primeiro palpite.',
        'On your turn, instead of guessing, you can press **I DOUBT IT!** against the last guess. You cannot doubt before the first guess.',
      ),
      tx(
        'A TV revela a resposta. Palpite **maior** que a resposta: quem palpitou leva a carta. Palpite **menor ou igual** (inclusive exato): quem duvidou leva.',
        'The TV reveals the answer. Guess **over** the answer: the guesser takes the card. Guess **at most** the answer (exact included): the doubter takes it.',
      ),
      tx(
        'Em qualquer caso, **quem duvidou abre a próxima rodada**.',
        'Either way, **the doubter opens the next round**.',
      ),
    ],
  },
  {
    title: tx('Dobrei! (opcional)', 'Doubled! (optional)'),
    body: [
      tx(
        'Se o Host ligar o **Dobrei!**, um palpite que seja **pelo menos o dobro** do anterior ganha uma **ficha** ◎.',
        'If the Host turns on **Doubled!**, a guess that is **at least twice** the previous one earns a **chip** ◎.',
      ),
      tx(
        'Exceção: se justamente esse palpite for duvidado e tiver passado da resposta, a ficha não é ganha.',
        'Exception: if that very guess is doubted and turns out to be over the answer, no chip.',
      ),
      tx(
        'Na contagem final, cada ficha **anula uma carta** (a pontuação nunca passa de 0).',
        'At the final count, each chip **cancels one card** (a score never goes above 0).',
      ),
    ],
  },
  {
    title: tx('Tempo e ausências', 'Time and absences'),
    body: [
      tx(
        '**Tempo por turno**: desligado por padrão — o jogo espera. Se o Host definir um tempo e ele acabar: na escolha de categoria, uma é sorteada; no primeiro palpite, ele vira 1; nos demais, o jogador **duvida automaticamente**.',
        '**Time per turn**: off by default — the game waits. If the Host sets one and it runs out: when picking a category, one is drawn; on the opening guess, it becomes 1; on any other turn, the player **doubts automatically**.',
      ),
      tx(
        '**Quem cai**: o jogo pausa por alguns segundos. Se a pessoa não voltar, ela sai da ordem (mantém as cartas) e a vez passa para a próxima. Com menos de 2 pessoas conectadas, a partida acaba.',
        '**Dropped players**: the game pauses for a few seconds. If they do not return, they leave the order (keeping their cards) and the turn passes on. With fewer than 2 people connected, the match ends.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'Cada carta {card} vale **−1 ponto** no placar da sala; quem não levou nenhuma fica com 0.',
        'Each card {card} is worth **−1 point** on the room scoreboard; anyone with no cards scores 0.',
      ),
      tx(
        '**Fim por rodadas** (padrão: 10): a partida acaba depois da última revelação. **Fim por cartas**: acaba na revelação em que alguém chega a X cartas (o Host escolhe X). Se as perguntas acabarem, a partida acaba também.',
        '**End by rounds** (default 10): the match ends after the last reveal. **End by cards**: it ends at the reveal where someone reaches X cards (the Host picks X). If the questions run out, the match ends too.',
      ),
      tx(
        '**Empates** ficam empatados: quem tiver o mesmo número de cartas divide a posição no placar.',
        '**Ties** stay tied: players with the same number of cards share the place on the scoreboard.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. */
export const CREDITS: I18nText | null = tx(
  'Inspirado em **Nem a Pato!**, de Rodrigo Rego (Grok Games). Versão não oficial, com perguntas próprias.',
  'Inspired by **Nem a Pato!** by Rodrigo Rego (Grok Games). Unofficial version with its own questions.',
);
