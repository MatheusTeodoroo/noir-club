import type { I18nText } from '@mp/game-sdk';

// Every Noir Club game ships a tutorial and the full rules (see the skill's reference/rules.md).
// Both live here, in PT-BR and EN, so the UI and the logic share one source. Inline markup:
// **bold** for key terms; {a} / {b} for the answer badges the UI substitutes (see `rich()` in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/**
 * Tutorial slides shown on the TV before the first round (Host advances them from the phone).
 * `demo` names a small live illustration the TV draws next to the text.
 */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'write' | 'vote' | 'scale' | 'points' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'write',
    body: [
      tx(
        'A cada rodada, um jogador é o **Autor**: ele escreve no celular uma pergunta ou situação com **duas respostas**.',
        'Each round, one player is the **Author**: on their phone they write a question or situation with **two answers**.',
      ),
      tx(
        'O objetivo do Autor é **rachar a sala ao meio** — metade de um lado, metade do outro.',
        'The Author’s goal is to **split the room in half** — half on one side, half on the other.',
      ),
      tx(
        'Sem ideia? O botão **Sugerir** traz um dilema pronto, que dá para editar.',
        'Out of ideas? The **Suggest** button brings a ready-made dilemma you can edit.',
      ),
    ],
  },
  {
    title: tx('Todos votam', 'Everyone votes'),
    demo: 'vote',
    body: [
      tx(
        'A pergunta aparece na TV. Todos, menos o Autor, escolhem {a} ou {b} **em segredo** no celular.',
        'The question appears on the TV. Everyone but the Author picks {a} or {b} **in secret** on their phone.',
      ),
      tx(
        'A TV mostra só **quem já votou** — nunca o lado. Responda com sinceridade!',
        'The TV only shows **who has voted** — never the side. Answer honestly!',
      ),
    ],
  },
  {
    title: tx('A balança', 'The scale'),
    demo: 'scale',
    body: [
      tx(
        'Na revelação a **balança** pende para o lado mais votado, e a TV mostra **quem votou em quê**.',
        'At the reveal the **scale** tips toward the bigger side, and the TV shows **who voted for what**.',
      ),
      tx(
        'Quanto mais nivelada a balança, melhor para o Autor.',
        'The more level the scale, the better for the Author.',
      ),
    ],
  },
  {
    title: tx('Pontos', 'Points'),
    demo: 'points',
    body: [
      tx(
        'Só o Autor pontua: **100 × lado menor ÷ lado maior**. 4 × 4 vale **100**; 4 × 3 vale **75**; 7 × 0 vale **0**.',
        'Only the Author scores: **100 × smaller side ÷ bigger side**. 4 × 4 is worth **100**; 4 × 3 is **75**; 7 × 0 is **0**.',
      ),
      tx(
        'Cada jogador é o Autor **uma vez**. No fim, vence quem tiver mais pontos.',
        'Every player is the Author **once**. At the end, the most points wins.',
      ),
    ],
  },
];

/**
 * The full rules, readable on any phone at any time and showable on the TV by the Host.
 */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo de dilemas para 5 a 16 pessoas. Cada rodada, um jogador é o **Autor** e tenta dividir a sala exatamente ao meio com uma pergunta de duas respostas.',
        'A game of dilemmas for 5 to 16 people. Each round, one player is the **Author** and tries to split the room exactly in half with a two-answer question.',
      ),
      tx(
        'A partida tem uma rodada por jogador: todos são o Autor **uma vez**, numa ordem sorteada. Vence quem somar mais pontos.',
        'The match has one round per player: everyone is the Author **once**, in a random order. The most points wins.',
      ),
    ],
  },
  {
    title: tx('O Autor', 'The Author'),
    body: [
      tx(
        'O Autor escreve no celular uma **pergunta** (até 140 letras) e duas respostas, {a} e {b} (até 40 letras cada). As respostas precisam ser diferentes.',
        'The Author writes a **question** (up to 140 characters) and two answers, {a} and {b} (up to 40 characters each) on their phone. The answers must differ.',
      ),
      tx(
        '**Sugerir** preenche tudo com um dilema pronto; dá para editar ou pedir outro. **Enviar** coloca a pergunta no ar.',
        '**Suggest** fills everything in with a ready-made dilemma; you can edit it or ask for another. **Send** puts the question on air.',
      ),
      tx(
        'São **75 s** para escrever (o Host pode mudar). Se o tempo acabar, a casa usa a última sugestão do Autor — ou uma nova — e a rodada segue valendo para ele.',
        'You have **75 s** to write (the Host can change it). If time runs out, the house uses the Author’s last suggestion — or a fresh one — and the round still counts for them.',
      ),
    ],
  },
  {
    title: tx('A votação', 'Voting'),
    body: [
      tx(
        'Todos, menos o Autor, escolhem {a} ou {b} no celular, **em segredo**. Dá para trocar de lado até a votação fechar.',
        'Everyone but the Author picks {a} or {b} on their phone, **in secret**. You can switch sides until voting closes.',
      ),
      tx(
        'A TV mostra só **quem já votou**. A votação fecha quando todos votam ou depois de **25 s** (o Host pode mudar).',
        'The TV only shows **who has voted**. Voting closes when everyone has voted or after **25 s** (the Host can change it).',
      ),
      tx(
        'Quem vota não ganha pontos: responda o que **você** escolheria de verdade.',
        'Voters score nothing: answer what **you** would really choose.',
      ),
    ],
  },
  {
    title: tx('A revelação', 'The reveal'),
    body: [
      tx(
        'A balança pende para o lado mais votado. A TV mostra a contagem de cada lado, **o nome de quem votou** em cada um e os pontos do Autor.',
        'The scale tips toward the side with more votes. The TV shows each side’s count, **the names of who voted** on each side, and the Author’s points.',
      ),
      tx('Lados empatados são uma **divisão perfeita**.', 'Equal sides are a **perfect split**.'),
    ],
  },
  {
    title: tx('Pontuação', 'Scoring'),
    body: [
      tx(
        'O Autor ganha **100 × lado menor ÷ lado maior**, arredondado. Exemplos: 4 × 4 = **100**; 4 × 3 = **75**; 5 × 2 = **40**; 6 × 1 = **17**; 7 × 0 = **0**.',
        'The Author scores **100 × smaller side ÷ bigger side**, rounded. Examples: 4 × 4 = **100**; 4 × 3 = **75**; 5 × 2 = **40**; 6 × 1 = **17**; 7 × 0 = **0**.',
      ),
      tx(
        'Com número ímpar de votos não dá para empatar: o melhor possível fica abaixo de 100 (com 7 votos, 4 × 3 = 75). Vale igual para todos os Autores da partida.',
        'With an odd number of votes a tie is impossible: the best result is below 100 (with 7 votes, 4 × 3 = 75). It’s the same for every Author in the match.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        '**Quem não vota** a tempo fica de fora da contagem — não conta a favor nem contra. Se ninguém votar, o Autor faz 0.',
        '**Anyone who doesn’t vote** in time is left out of the count — neither for nor against. If nobody votes, the Author scores 0.',
      ),
      tx(
        '**Alguém caiu?** O jogo pausa por 20 s. Se não voltar: um votante que já votou mantém o voto; um Autor que estava escrevendo recebe uma pergunta da casa.',
        '**Someone dropped?** The game pauses for 20 s. If they don’t return: a voter who already voted keeps their vote; an Author who was writing gets a question from the house.',
      ),
    ],
  },
  {
    title: tx('Fim da partida', 'End of the match'),
    body: [
      tx(
        'Depois que todos foram o Autor, vence quem tiver **mais pontos**. Empates no topo dividem a vitória.',
        'Once everyone has been the Author, the **most points** wins. Ties at the top share the win.',
      ),
      tx(
        'Os pontos da partida entram no placar da sala.',
        'The match points are added to the room’s scoreboard.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. Original game: none. */
export const CREDITS: I18nText | null = null;
