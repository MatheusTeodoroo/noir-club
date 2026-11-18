import type { I18nText } from '@mp/game-sdk';

// Tutorial and full rules, PT-BR and EN. Inline markup: **bold** for key terms; {cr} becomes the
// credit chip the screens use.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'table' | 'investigate' | 'spin' | 'manipulate' | 'firing';

export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'table',
    body: [
      tx(
        'Um revólver no centro da mesa. O tambor tem **uma câmara para cada cadeira**, e algumas delas têm **balas** — ninguém sabe quais.',
        'A revolver in the middle of the table. The cylinder has **one chamber per seat**, and some hold **bullets** — nobody knows which.',
      ),
      tx(
        'Cada um começa com **16 créditos** {cr}, que só o próprio jogador vê. Gaste-os para descobrir e mover as balas.',
        'Everyone starts with **16 credits** {cr}, which only they can see. Spend them to find and move the bullets.',
      ),
      tx(
        'Quando **metade da mesa zerar**, a arma dispara uma vez em cada cadeira. Quem levar bala perde; o resto ganha.',
        'When **half the table is broke**, the gun fires once at every seat. Whoever is hit loses; everyone else wins.',
      ),
    ],
  },
  {
    title: tx('Investigar', 'Investigate'),
    demo: 'investigate',
    body: [
      tx(
        'Na sua vez, escolha **duas câmaras vizinhas** e descubra qual delas tem bala.',
        'On your turn, pick **two neighbouring chambers** and learn which of them holds a bullet.',
      ),
      tx(
        '**Investigação pública** (1 {cr}): o resultado aparece **no celular de todos**. **Investigação particular** (2 {cr}): só no seu. Pode contar — ou mentir.',
        '**Public investigation** (1 {cr}): the result shows **on everyone’s phone**. **Private investigation** (2 {cr}): only on yours. You may tell — or lie.',
      ),
      tx(
        'O resultado fica na tela **só por 8 segundos** e depois some. **Memorize!** A TV nunca mostra onde estão as balas.',
        'The result stays on screen **for only 8 seconds**, then it’s gone. **Memorize it!** The TV never shows where the bullets are.',
      ),
    ],
  },
  {
    title: tx('Girar', 'Spin'),
    demo: 'spin',
    body: [
      tx(
        'O disparo é sempre na ordem **A, B, C…**, começando por **quem está na mira** do cano. **Girar** move a arma inteira no sentido horário: a mira passa para a próxima pessoa.',
        'The gun always fires in order **A, B, C…**, starting with **whoever is in the barrel’s sights**. **Spinning** turns the whole gun clockwise: the aim moves to the next person.',
      ),
      tx(
        '**Giro simples** (3 {cr}) move uma posição; **giro duplo** (4 {cr}) move duas. Todo giro aparece na TV.',
        '**Single spin** (3 {cr}) moves one position; **double spin** (4 {cr}) moves two. Every spin shows on the TV.',
      ),
    ],
  },
  {
    title: tx('Manipular', 'Manipulate'),
    demo: 'manipulate',
    body: [
      tx(
        '**Manipulação** (6 {cr}) troca em segredo o conteúdo de duas câmaras vizinhas — se uma tinha bala, a bala muda de lugar.',
        '**Manipulation** (6 {cr}) secretly swaps the contents of two neighbouring chambers — if one held a bullet, the bullet moves.',
      ),
      tx(
        'Você **carrega no máximo 3 por vez**; a carga acumula. Ao chegar a **exatamente 6**, escolhe as câmaras. **Passou de 6? Perde tudo o que carregou.**',
        'You **load at most 3 per turn**; the charge adds up. At **exactly 6** you pick the chambers. **Went past 6? You lose everything you loaded.**',
      ),
    ],
  },
  {
    title: tx('A vez e o disparo', 'Turns and the firing'),
    demo: 'firing',
    body: [
      tx(
        'Todos jogam uma vez por rodada, e é **obrigatório gastar**. Quem zerou só pode **Passar**. Investigação particular, carga e passe aparecem iguais na TV: **ação privada**.',
        'Everyone plays once per round, and you **must spend**. Whoever is broke can only **Pass**. Private investigation, loading and passing look the same on the TV: **private action**.',
      ),
      tx(
        'Assim que metade zerar, a arma dispara: começa em **quem está na mira** e segue no sentido horário. Não esteja na frente de uma bala.',
        'As soon as half are broke, the gun fires: it starts with **whoever is in its sights** and goes clockwise. Don’t be in front of a bullet.',
      ),
    ],
  },
];

export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Jogo de dedução e blefe para **3 a 10 pessoas**. Um revólver fica no centro da mesa, com **uma câmara por cadeira** e algumas **balas** escondidas (2 por padrão; o Host pode mudar, até jogadores − 1).',
        'A deduction and bluffing game for **3 to 10 people**. A revolver sits in the middle of the table, with **one chamber per seat** and a few hidden **bullets** (2 by default; the Host can change it, up to players − 1).',
      ),
      tx(
        'O objetivo é **não estar na mira de uma bala** quando a arma disparar. Quem sobrevive ganha 1 ponto; quem é atingido, 0.',
        'The goal is **not to be in front of a bullet** when the gun fires. Survivors score 1 point; whoever is hit scores 0.',
      ),
    ],
  },
  {
    title: tx('A mesa', 'The table'),
    body: [
      tx(
        '**Cadeiras**: a ordem é sorteada. Quem tira a cadeira 1 joga primeiro e começa **na mira** do cano; os outros seguem no sentido horário.',
        '**Seats**: the order is drawn at random. Seat 1 plays first and starts **in the barrel’s sights**; the others follow clockwise.',
      ),
      tx(
        '**Câmaras**: rotuladas A, B, C… no sentido horário; o **cano fica na câmara A**. No início, A aponta para a cadeira 1, B para a 2 e assim por diante. Cada câmara aponta sempre para a cadeira à sua frente.',
        '**Chambers**: labelled A, B, C… clockwise; the **barrel sits at chamber A**. At the start, A points at seat 1, B at seat 2 and so on. Each chamber always points at the seat in front of it.',
      ),
      tx(
        '**Créditos** {cr}: todos começam com **16**. Só você vê quantos tem — nem a TV mostra.',
        '**Credits** {cr}: everyone starts with **16**. Only you see how many you have — not even the TV shows it.',
      ),
    ],
  },
  {
    title: tx('Investigações', 'Investigations'),
    body: [
      tx(
        'Escolha **duas câmaras vizinhas** (A·B, B·C… e a última com A). Você descobre **qual delas tem bala**: as duas, uma (e qual) ou nenhuma.',
        'Pick **two neighbouring chambers** (A·B, B·C… and the last with A). You learn **which of them holds a bullet**: both, one (and which) or neither.',
      ),
      tx(
        '**Investigação pública — 1 {cr}**: o resultado aparece **no celular de todos os jogadores**. A TV mostra só quem investigou e qual par.',
        '**Public investigation — 1 {cr}**: the result appears **on every player’s phone**. The TV only shows who investigated which pair.',
      ),
      tx(
        '**Investigação particular — 2 {cr}**: só o seu celular mostra o resultado. A TV mostra apenas “ação privada”.',
        '**Private investigation — 2 {cr}**: only your phone shows the result. The TV only shows “private action”.',
      ),
      tx(
        'O resultado é **temporário**: fica 8 segundos na tela e some — não fica anotado em lugar nenhum. A TV nunca mostra onde estão as balas, só a ordem das câmaras e quem está na mira. E lembre-se: alguém pode manipular as câmaras depois.',
        'The result is **temporary**: it stays on screen for 8 seconds and disappears — it isn’t noted anywhere. The TV never shows where the bullets are, only the chamber order and who is in its sights. And remember: someone may manipulate the chambers afterwards.',
      ),
    ],
  },
  {
    title: tx('Giros', 'Spins'),
    body: [
      tx(
        '**Giro simples — 3 {cr}**: a arma inteira gira **uma posição no sentido horário**. O cano (câmara A) passa a mirar a cadeira seguinte — o primeiro tiro passa a ser nela — e B, C… acompanham.',
        '**Single spin — 3 {cr}**: the whole gun turns **one position clockwise**. The barrel (chamber A) now aims at the next seat — the first shot now goes there — and B, C… follow.',
      ),
      tx(
        '**Giro duplo — 4 {cr}**: duas posições no sentido horário.',
        '**Double spin — 4 {cr}**: two positions clockwise.',
      ),
      tx(
        'Os giros são **públicos**: a TV anuncia e mostra **quem está na mira**. Girar não muda onde estão as balas (isso só a manipulação faz) — muda por quem os tiros começam.',
        'Spins are **public**: the TV announces them and shows **who is in its sights**. Spinning doesn’t change where the bullets are (only a manipulation does) — it changes who the shots start with.',
      ),
    ],
  },
  {
    title: tx('Manipulação', 'Manipulation'),
    body: [
      tx(
        '**Manipulação — 6 {cr}**: troca em segredo o conteúdo de **duas câmaras vizinhas**. Se uma tinha bala e a outra não, a bala muda de câmara. Se as duas tinham (ou nenhuma), nada muda.',
        '**Manipulation — 6 {cr}**: secretly swaps the contents of **two neighbouring chambers**. If one held a bullet and the other didn’t, the bullet moves. If both did (or neither), nothing changes.',
      ),
      tx(
        'Não dá para pagar 6 de uma vez: em cada vez você **carrega 1, 2 ou 3** créditos, e a carga **acumula** entre as suas vezes (pode intercalar com outras ações).',
        'You can’t pay 6 at once: on each turn you **load 1, 2 or 3** credits, and the charge **adds up** across your turns (you can do other actions in between).',
      ),
      tx(
        'Quando a carga chega a **exatamente 6**, você escolhe as duas câmaras na mesma vez. Se **passar de 6**, os créditos carregados **se perdem** e a carga volta a zero.',
        'When the charge reaches **exactly 6**, you pick the two chambers on that same turn. If it **goes past 6**, the loaded credits **are lost** and the charge resets to zero.',
      ),
      tx(
        'Cada carga — e a troca — aparece na TV só como “ação privada”. Só você vê a sua carga.',
        'Each load — and the swap — appears on the TV only as “private action”. Only you see your charge.',
      ),
    ],
  },
  {
    title: tx('A vez e a rodada', 'Turns and rounds'),
    body: [
      tx(
        '**1 · Ordem**: em cada rodada todos jogam uma vez, no sentido horário. O primeiro da rodada muda: rodada 1 começa na cadeira 1, rodada 2 na cadeira 2, e assim por diante.',
        '**1 · Order**: each round everyone plays once, clockwise. The first player moves on: round 1 starts at seat 1, round 2 at seat 2, and so on.',
      ),
      tx(
        '**2 · Gastar é obrigatório**: na sua vez você escolhe uma ação que possa pagar. Não existe passe voluntário.',
        '**2 · You must spend**: on your turn you pick an action you can afford. There is no voluntary pass.',
      ),
      tx(
        '**3 · Sem créditos**: quem zerou toca **Passar**. Na TV isso é igual a qualquer ação privada — ninguém descobre que você zerou.',
        '**3 · Broke**: whoever is out of credits taps **Pass**. On the TV it looks like any private action — nobody learns you are broke.',
      ),
      tx(
        'Não há tempo limite: a mesa espera quem está na vez. Conversem, acusem e blefem à vontade.',
        'There is no time limit: the table waits for whoever is playing. Talk, accuse and bluff all you like.',
      ),
    ],
  },
  {
    title: tx('O disparo', 'The firing'),
    body: [
      tx(
        'Assim que **metade dos jogadores** (arredondado para cima: 2 de 3, 3 de 6, 5 de 10) estiver **sem créditos**, a jogada termina e a arma dispara na hora.',
        'As soon as **half the players** (rounded up: 2 of 3, 3 of 6, 5 of 10) are **out of credits**, that turn ends and the gun fires at once.',
      ),
      tx(
        'As câmaras disparam **sempre na ordem A, B, C…**: a câmara A contra **quem está na mira**, a B contra a próxima cadeira no sentido horário, e assim por diante. Cada cadeira leva o que há na câmara apontada para ela.',
        'The chambers **always fire in order A, B, C…**: chamber A at **whoever is in its sights**, B at the next seat clockwise, and so on. Each seat gets whatever is in the chamber pointing at it.',
      ),
      tx(
        'Quando a última bala sai, o tambor inteiro é revelado.',
        'Once the last bullet is fired, the whole cylinder is revealed.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        '**Quem cai da sala** pausa o jogo por 20 s. Se não voltar, continua sentado (ainda pode levar bala), **conta como sem créditos** e as vezes dele passam sozinhas. Uma manipulação que ele deixou pela metade se perde.',
        '**Someone who drops** pauses the game for 20 s. If they don’t come back, they stay seated (they can still be hit), **count as out of credits** and their turns pass on their own. A Manipulation they left half-done is lost.',
      ),
      tx(
        '**Contar o que viu** é permitido — e mentir também. Depois que o resultado some, o jogo nunca mais confirma nada até o disparo.',
        '**Telling what you saw** is allowed — and so is lying. Once a result fades, the game never confirms anything again until the firing.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'A partida é uma roleta só. Cada **sobrevivente ganha 1 ponto**; quem leva bala fica com 0. Os pontos somam no placar da sala.',
        'The match is a single roulette. Each **survivor scores 1 point**; whoever is hit scores 0. Points add to the room’s scoreboard.',
      ),
      tx(
        'Créditos que sobraram não valem nada no fim — mas economizar pode fazer os outros zerarem antes de você.',
        'Leftover credits are worth nothing at the end — but saving them may make the others go broke before you.',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Adaptado do jogo **“Roleta Russa”** do reality **O Jogo do Diabo** (*The Devil’s Plan*), temporada 3, episódio 5. Versão de fã, não oficial.',
        'Adapted from the game **“Russian Roulette”** in the reality show **The Devil’s Plan**, season 3, episode 5. Fan version, not official.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide. */
export const CREDITS: I18nText | null = tx(
  'Adaptado de “Roleta Russa”, de O Jogo do Diabo (The Devil’s Plan), T3 · E5.',
  'Adapted from “Russian Roulette”, The Devil’s Plan, S3 · E5.',
);
