import type { I18nText } from '@mp/game-sdk';

// The card catalogue of Agent Decker (Manuel Correia, CC BY-NC 4.0), shared by the logic and the
// UI. Nothing here is secret: every card is printed face up somewhere. Texts use {tokens} that the
// UI turns into the original icons: {stealth}, {fight}, {any}, {person}, {location}, {electronic},
// {door}, {animal}, {keep}; a number right after a resource token is drawn inside it ({fight1}).

export type Res = 'stealth' | 'fight';
export type CostKind = Res | 'any';
export type ObType = 'person' | 'location' | 'electronic' | 'door' | 'animal';

export type Effect =
  | 'draw1'
  | 'draw2'
  | 'draw3'
  | 'rock'
  | 'bin'
  | 'burn'
  | 'recall'
  | 'planAhead'
  | 'foresight'
  | 'justTheThing'
  | 'retrace'
  | 'distraction'
  | 'gearUp'
  | 'swap'
  | 'saveBullets'
  | 'misdirect'
  | 'flashy';

export type Passive =
  | 'patrol'
  | 'guardDog'
  | 'radioTower'
  | 'siren'
  | 'inspector'
  | 'dormitory'
  | 'watchtower'
  | 'sniper'
  | 'barrel'
  | 'clumsy'
  | 'hawk';

export interface CardTop {
  name: I18nText;
  text?: I18nText;
  /** Resource printed in the top-left badge; 'X' is computed by the effect. */
  res?: { kind: Res; n: number | 'X' };
  keep?: boolean;
  effect?: Effect;
  /** "Place X in your discard to interact with a {type}". */
  item?: ObType;
  /** Bazooka / Optic Camouflage: goes to the obstacles discard when used. */
  toObstacles?: boolean;
  /** Mission rewards that change the rules. */
  rule?: { interactions?: number; draw?: number };
}

export interface CardBottom {
  name: I18nText;
  type: ObType;
  cost: { kind: CostKind; n: number };
  alarm: number;
  text?: I18nText;
  passive?: Passive;
}

export interface CardDef {
  id: string;
  /** Mission set letter printed bottom-right (B, D, F, H); none for the base obstacles. */
  letter?: string;
  top: CardTop;
  /** Obstacle half; starting cards and rewards have none. */
  bottom?: CardBottom;
}

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export const CARDS: Record<string, CardDef> = {
  hide: { id: 'hide', top: { name: tx('Esconder', 'Hide'), res: { kind: 'stealth', n: 1 } } },
  punch: { id: 'punch', top: { name: tx('Soco', 'Punch'), res: { kind: 'fight', n: 1 } } },

  // --- Base obstacle deck (22) ---
  guard: {
    id: 'guard',
    top: { name: tx('Pistola', 'Gun'), res: { kind: 'fight', n: 2 } },
    bottom: { name: tx('Guarda', 'Guard'), type: 'person', cost: { kind: 'fight', n: 2 }, alarm: 4 },
  },
  patrol: {
    id: 'patrol',
    top: { name: tx('Interrogar', 'Interrogate'), text: tx('Compre duas cartas.', 'Draw two cards.'), effect: 'draw2' },
    bottom: {
      name: tx('Guarda de Ronda', 'Patrolling Guard'),
      type: 'person',
      cost: { kind: 'any', n: 5 },
      alarm: 5,
      passive: 'patrol',
      text: tx(
        'Na Rolagem da Linha, o **Guarda de Ronda** avança uma posição a mais.',
        'During the Line Scroll, **Patrolling Guard** slides forward one more position.',
      ),
    },
  },
  motion: {
    id: 'motion',
    top: { name: tx('Não se Mexa', "Don't Move"), res: { kind: 'stealth', n: 3 } },
    bottom: { name: tx('Corredor com Sensor', 'Motion Sensor Hall'), type: 'location', cost: { kind: 'any', n: 6 }, alarm: 6 },
  },
  waste: {
    id: 'waste',
    top: {
      name: tx('Lixeira', 'Bin'),
      text: tx('Remova do jogo quantas cartas quiser da sua mão.', 'Take any number of cards from your hand and remove them from the game.'),
      effect: 'bin',
    },
    bottom: { name: tx('Sala de Lixo', 'Waste Room'), type: 'location', cost: { kind: 'any', n: 6 }, alarm: 3 },
  },
  dog: {
    id: 'dog',
    top: { name: tx('Seguir', 'Follow'), text: tx('Compre uma carta.', 'Draw a card.'), res: { kind: 'stealth', n: 1 }, effect: 'draw1' },
    bottom: {
      name: tx('Cão de Guarda', 'Guard Dog'),
      type: 'animal',
      cost: { kind: 'fight', n: 5 },
      alarm: 6,
      passive: 'guardDog',
      text: tx(
        'Quando o **Cão de Guarda** aparece, se houver um {person} na linha, deslize-o até ficar adjacente a ele.',
        "When **Guard Dog** appears, if there is a {person} on the line, slide it all the way until it's adjacent to it.",
      ),
    },
  },
  sentry: {
    id: 'sentry',
    top: { name: tx('Metralhadora', 'Machine Gun'), res: { kind: 'fight', n: 3 } },
    bottom: { name: tx('Torreta', 'Sentry Gun'), type: 'electronic', cost: { kind: 'fight', n: 5 }, alarm: 6 },
  },
  camera: {
    id: 'camera',
    top: { name: tx('Fora de Vista', 'Out of Sight'), res: { kind: 'stealth', n: 2 } },
    bottom: { name: tx('Câmera de Segurança', 'Security Camera'), type: 'electronic', cost: { kind: 'stealth', n: 2 }, alarm: 8 },
  },
  gym: {
    id: 'gym',
    top: {
      name: tx('Golpe Vistoso', 'Flashy Move'),
      text: tx(
        'Dá {fight1} para cada duas cartas na sua pilha de descarte, arredondando para baixo.',
        'Gives you {fight1} for every two cards in your discard pile, rounded down.',
      ),
      res: { kind: 'fight', n: 'X' },
      effect: 'flashy',
    },
    bottom: { name: tx('Porta do Ginásio', 'Gym Door'), type: 'door', cost: { kind: 'any', n: 9 }, alarm: 3 },
  },
  sleeping: {
    id: 'sleeping',
    top: {
      name: tx('Cartão de Acesso', 'Keycard'),
      text: tx('Descarte o **Cartão de Acesso** para interagir com uma {door}.', 'Place **Keycard** in your discard to interact with a {door}.'),
      keep: true,
      item: 'door',
    },
    bottom: { name: tx('Guarda Dormindo', 'Sleeping Guard'), type: 'person', cost: { kind: 'stealth', n: 3 }, alarm: 0 },
  },
  infirmary: {
    id: 'infirmary',
    top: {
      name: tx('Clorofórmio', 'Chloroform'),
      text: tx('Descarte o **Clorofórmio** para interagir com um {person}.', 'Place **Chloroform** in your discard to interact with a {person}.'),
      keep: true,
      item: 'person',
    },
    bottom: { name: tx('Enfermaria', 'Infirmary'), type: 'location', cost: { kind: 'stealth', n: 3 }, alarm: 3 },
  },
  yard: {
    id: 'yard',
    top: { name: tx('Jogar uma Pedra', 'Throw a Rock'), text: tx('{fight1} ou compre uma carta.', '{fight1} or draw a card.'), effect: 'rock' },
    bottom: { name: tx('Porta do Pátio', 'Yard Door'), type: 'door', cost: { kind: 'stealth', n: 4 }, alarm: 4 },
  },
  radio: {
    id: 'radio',
    top: {
      name: tx('Despistar', 'Misdirect'),
      text: tx(
        'Coloque quantas cartas quiser da sua mão na Área de Jogo e ganhe {stealth2} por cada.',
        'Place any number of cards from your hand in the Play Area and get {stealth2} for each.',
      ),
      res: { kind: 'stealth', n: 'X' },
      effect: 'misdirect',
    },
    bottom: {
      name: tx('Torre de Rádio', 'Radio Tower'),
      type: 'location',
      cost: { kind: 'any', n: 7 },
      alarm: 6,
      passive: 'radioTower',
      text: tx(
        'Quando a **Torre de Rádio** aparece, deslize todos os {person} até ficarem ao lado dela.',
        'When **Radio Tower** appears, slide all {person} cards all the way next to it.',
      ),
    },
  },

  // --- B: after Mission One ---
  siren: {
    id: 'siren',
    letter: 'B',
    top: {
      name: tx('Equipar-se!', 'Gear Up!'),
      text: tx(
        'Compre uma carta para cada {keep} que você tem equipado, até no máximo três cartas.',
        'Draw a card for every {keep} you have currently equipped, to a maximum of three cards drawn.',
      ),
      effect: 'gearUp',
    },
    bottom: {
      name: tx('Sirene', 'Siren'),
      type: 'electronic',
      cost: { kind: 'any', n: 12 },
      alarm: 5,
      passive: 'siren',
      text: tx(
        'Ao ser descartada, coloque todas as cartas da linha no Descarte de Obstáculos. Só aumente o alarme pela **Sirene**.',
        'When discarded, place every card in the line on the Obstacles Discard. Only raise the alarm for the **Siren**.',
      ),
    },
  },
  locker: {
    id: 'locker',
    letter: 'B',
    top: { name: tx('Uniforme de Guarda', 'Guard Uniform'), res: { kind: 'stealth', n: 1 }, keep: true },
    bottom: { name: tx('Vestiário', 'Locker Room'), type: 'location', cost: { kind: 'any', n: 8 }, alarm: 3 },
  },
  inspector: {
    id: 'inspector',
    letter: 'B',
    top: { name: tx('Recuperar', 'Recall'), text: tx('Pegue uma carta da sua pilha de descarte para a mão.', 'Take a card from your discard pile to your hand.'), effect: 'recall' },
    bottom: {
      name: tx('Inspetor', 'Inspector'),
      type: 'person',
      cost: { kind: 'stealth', n: 7 },
      alarm: 5,
      passive: 'inspector',
      text: tx(
        'Na Rolagem da Linha, o **Inspetor** desvira a última carta da linha. Efeitos "quando aparece" são ativados.',
        'At the Line Scroll, **Inspector** flips the last card in the line face up. "When appears" effects activate.',
      ),
    },
  },

  // --- D: after Mission Two ---
  archive: {
    id: 'archive',
    letter: 'D',
    top: {
      name: tx('Planejar', 'Plan Ahead'),
      text: tx(
        'Olhe as três cartas do topo do seu baralho. Fique com uma e devolva as outras na ordem que quiser.',
        'Look at the top three cards of your deck. Keep one and put back the rest in any order.',
      ),
      effect: 'planAhead',
    },
    bottom: { name: tx('Porta do Arquivo', 'Archive Door'), type: 'door', cost: { kind: 'fight', n: 8 }, alarm: 4 },
  },
  dormitory: {
    id: 'dormitory',
    letter: 'D',
    top: { name: tx('Distração', 'Distraction'), text: tx('Puxe uma carta de obstáculo de volta para o início da linha.', 'Pull an obstacle card back to the start of the line.'), effect: 'distraction' },
    bottom: {
      name: tx('Dormitório', 'Dormitory'),
      type: 'location',
      cost: { kind: 'any', n: 16 },
      alarm: 7,
      passive: 'dormitory',
      text: tx(
        'Na Rolagem da Linha, cartas viradas para baixo não deslizam para a direita. As viradas para cima ainda deslizam.',
        "At the Line Scroll, facedown cards don't slide to the right. Faceup cards still do.",
      ),
    },
  },
  engineering: {
    id: 'engineering',
    letter: 'D',
    top: {
      name: tx('P.E.M.', 'E.M.P.'),
      text: tx('Descarte o **P.E.M.** para interagir com um {electronic}.', 'Place **E.M.P.** in your discard to interact with a {electronic}.'),
      keep: true,
      item: 'electronic',
    },
    bottom: { name: tx('Engenharia', 'Engineering Bay'), type: 'location', cost: { kind: 'stealth', n: 8 }, alarm: 6 },
  },
  cctv: {
    id: 'cctv',
    letter: 'D',
    top: {
      name: tx('Refazer os Passos', 'Retrace Steps'),
      text: tx(
        'Embaralhe o descarte de obstáculos com o baralho de obstáculos para formar um novo baralho de obstáculos.',
        'Shuffle the obstacles discard with the obstacles deck to form a new obstacles deck.',
      ),
      effect: 'retrace',
    },
    bottom: { name: tx('Porta da Sala de CFTV', 'C.C.T.V. Room Door'), type: 'door', cost: { kind: 'stealth', n: 12 }, alarm: 7 },
  },

  // --- F: after Mission Three ---
  sniper: {
    id: 'sniper',
    letter: 'F',
    top: {
      name: tx('Na Medida Certa', 'Just the Thing'),
      text: tx('Procure uma carta no seu baralho. Embaralhe-o e coloque-a no topo.', 'Search your deck for a card. Shuffle it, then place it on top.'),
      effect: 'justTheThing',
    },
    bottom: {
      name: tx('Franco-Atirador', 'Sniper'),
      type: 'person',
      cost: { kind: 'fight', n: 10 },
      alarm: 6,
      passive: 'sniper',
      text: tx(
        'Não é possível interagir com o **Franco-Atirador** a menos que ele seja o único {person} na linha.',
        "**Sniper** can't be interacted with unless it's the only {person} in the line.",
      ),
    },
  },
  watchtower: {
    id: 'watchtower',
    letter: 'F',
    top: {
      name: tx('Antevisão', 'Foresight'),
      text: tx('Olhe as cinco cartas do topo do seu baralho e devolva-as na ordem que quiser.', 'Look at the top five cards of your deck and put them back in any order.'),
      effect: 'foresight',
    },
    bottom: {
      name: tx('Torre de Vigia', 'Watchtower'),
      type: 'location',
      cost: { kind: 'stealth', n: 12 },
      alarm: 7,
      passive: 'watchtower',
      text: tx('A **Torre de Vigia** aumenta em 2 o custo das cartas adjacentes.', '**Watchtower** increases the cost of adjacent cards by 2.'),
    },
  },
  prison: {
    id: 'prison',
    letter: 'F',
    top: { name: tx('Prisioneiro', 'Prisoner'), res: { kind: 'fight', n: 1 }, keep: true },
    bottom: { name: tx('Porta da Prisão', 'Prison Door'), type: 'door', cost: { kind: 'fight', n: 10 }, alarm: 5 },
  },
  barrel: {
    id: 'barrel',
    letter: 'F',
    top: {
      name: tx('Queimar', 'Burn'),
      text: tx('Escolha até duas cartas da sua pilha de descarte e remova-as do jogo.', 'Pick up to two cards from your discard pile and remove them from the game.'),
      effect: 'burn',
    },
    bottom: {
      name: tx('Barril Inflamável', 'Flammable Barrel'),
      type: 'electronic',
      cost: { kind: 'any', n: 14 },
      alarm: 3,
      passive: 'barrel',
      text: tx(
        'Quando você interage com o **Barril Inflamável**, nocauteie as cartas adjacentes a ele.',
        'When you interact with **Flammable Barrel**, knock out the cards that are adjacent to it.',
      ),
    },
  },
  bazooka: {
    id: 'bazooka',
    letter: 'F',
    top: {
      name: tx('Bazuca', 'Bazooka'),
      text: tx(
        'Quando a **Bazuca** é usada, ela vai para o descarte de obstáculos em vez do seu.',
        'When Bazooka is used, it gets discarded to the obstacles discard instead of your own.',
      ),
      res: { kind: 'fight', n: 5 },
      toObstacles: true,
    },
    bottom: { name: tx('Guarda com Bazuca', 'Guard with Bazooka'), type: 'person', cost: { kind: 'fight', n: 8 }, alarm: 10 },
  },

  // --- H: after Mission Four ---
  tech: {
    id: 'tech',
    letter: 'H',
    top: {
      name: tx('Camuflagem Óptica', 'Optic Camouflage'),
      text: tx(
        'Quando a **Camuflagem Óptica** é usada, ela vai para o descarte de obstáculos em vez do seu.',
        'When **Optic Camouflage** is used, it gets discarded to the obstacles discard instead of your own.',
      ),
      res: { kind: 'stealth', n: 4 },
      toObstacles: true,
    },
    bottom: { name: tx('Contêiner Tecnológico', 'Tech Container'), type: 'electronic', cost: { kind: 'any', n: 10 }, alarm: 5 },
  },
  fence: {
    id: 'fence',
    letter: 'H',
    top: { name: tx('Poupar Balas', 'Save Bullets'), text: tx('Guarde uma carta não usada para o próximo turno.', 'Save an unused card for the next turn.'), effect: 'saveBullets' },
    bottom: { name: tx('Cerca de Arame', 'Chain Link Fence'), type: 'location', cost: { kind: 'stealth', n: 7 }, alarm: 5 },
  },
  laser: {
    id: 'laser',
    letter: 'H',
    top: { name: tx('Supervelocidade', 'Superspeed'), text: tx('Compre três cartas.', 'Draw three cards.'), effect: 'draw3' },
    bottom: { name: tx('Corredor de Laser', 'Laser Hall'), type: 'location', cost: { kind: 'stealth', n: 14 }, alarm: 10 },
  },
  clumsy: {
    id: 'clumsy',
    letter: 'H',
    top: { name: tx('Mão Pesada', 'Heavy Hand'), res: { kind: 'fight', n: 3 } },
    bottom: {
      name: tx('Guarda Desastrado', 'Clumsy Guard'),
      type: 'person',
      cost: { kind: 'fight', n: 8 },
      alarm: 6,
      passive: 'clumsy',
      text: tx(
        'Quando você interage com o **Guarda Desastrado**, pode em vez disso nocautear uma carta adjacente.',
        'When you interact with **Clumsy Guard**, you may instead knock out an adjacent card.',
      ),
    },
  },
  armored: {
    id: 'armored',
    letter: 'H',
    top: { name: tx('Fuzil Automático', 'Auto Rifle'), res: { kind: 'fight', n: 4 } },
    bottom: { name: tx('Guarda Blindado', 'Armored Guard'), type: 'person', cost: { kind: 'fight', n: 12 }, alarm: 8 },
  },
  hawk: {
    id: 'hawk',
    letter: 'H',
    top: { name: tx('Trocar', 'Swap'), text: tx('Troque seu baralho pelo seu descarte.', 'Swap your deck with your discard.'), effect: 'swap' },
    bottom: {
      name: tx('Falcão', 'Hawk'),
      type: 'animal',
      cost: { kind: 'fight', n: 12 },
      alarm: 6,
      passive: 'hawk',
      text: tx(
        'Quando o **Falcão** está virado para cima na linha, você não pode interagir com cartas que custam só {stealth}.',
        "When **Hawk** is faceup in the line, you can't interact with cards that cost only {stealth}.",
      ),
    },
  },

  // --- Mission rewards (they live in the Equip Area for the rest of the campaign) ---
  map: { id: 'map', top: { name: tx('Mapa', 'Map'), res: { kind: 'stealth', n: 1 }, keep: true } },
  rule2: {
    id: 'rule2',
    top: {
      name: tx('Nova Regra', 'New Rule'),
      text: tx('Agora você pode interagir com até DUAS cartas de obstáculo por turno.', 'You can now interact with up to TWO obstacle cards per turn.'),
      keep: true,
      rule: { interactions: 2 },
    },
  },
  rule5: {
    id: 'rule5',
    top: {
      name: tx('Nova Regra', 'New Rule'),
      text: tx('No início do turno, compre CINCO cartas em vez de quatro.', 'At the start of the turn, draw FIVE cards instead of four.'),
      rule: { draw: 5 },
    },
  },
  rule3: {
    id: 'rule3',
    top: {
      name: tx('Nova Regra', 'New Rule'),
      text: tx('Agora você pode interagir com até TRÊS cartas de obstáculo por turno.', 'You can now interact with up to THREE obstacle cards per turn.'),
      rule: { interactions: 3 },
    },
  },
  complete: { id: 'complete', top: { name: tx('Missão Cumprida', 'Mission Complete') } },
};

export const STARTING_DECK = ['hide', 'hide', 'hide', 'punch', 'punch', 'punch', 'punch', 'punch'];

export const BASE_OBSTACLES = [
  'guard', 'guard', 'guard',
  'patrol', 'patrol',
  'motion',
  'waste', 'waste',
  'dog', 'dog',
  'sentry',
  'camera', 'camera', 'camera', 'camera', 'camera',
  'gym',
  'sleeping',
  'infirmary',
  'yard', 'yard',
  'radio',
];

export type Goal =
  | { kind: 'pay'; cost: { kind: CostKind; n: number }; item?: string }
  | { kind: 'hand'; n: number }
  | { kind: 'knockAll' };

export interface MissionDef {
  letter: string;
  /** Colour of the mission's set, as printed. */
  color: string;
  title: I18nText;
  quote: I18nText;
  goalText: I18nText;
  goal: Goal;
  reward: string;
  /** Mission obstacles shuffled in after this mission is completed. */
  adds: string[];
}

export const MISSIONS: MissionDef[] = [
  {
    letter: 'A',
    color: '#f08a24',
    title: tx('Missão Um', 'Mission One'),
    quote: tx('"Antes de tudo, arranje um mapa"', '"First things first, you should find yourself a map"'),
    goalText: tx('Obtenha {stealth6}', 'Get {stealth6}'),
    goal: { kind: 'pay', cost: { kind: 'stealth', n: 6 } },
    reward: 'map',
    adds: ['siren', 'locker', 'inspector'],
  },
  {
    letter: 'C',
    color: '#3fae49',
    title: tx('Missão Dois', 'Mission Two'),
    quote: tx('"Agora que sabe aonde ir, é hora de se misturar"', '"Now you know where to go, it\'s time to blend in"'),
    goalText: tx('Obtenha {fight6} e o UNIFORME DE GUARDA', 'Get {fight6} & the GUARD UNIFORM'),
    goal: { kind: 'pay', cost: { kind: 'fight', n: 6 }, item: 'locker' },
    reward: 'rule2',
    adds: ['archive', 'dormitory', 'engineering', 'cctv'],
  },
  {
    letter: 'E',
    color: '#e0245e',
    title: tx('Missão Três', 'Mission Three'),
    quote: tx('"Ele está na prisão, mas em qual cela? Reúna mais informações"', '"He\'s in the prison, but in which cell? Gather more information"'),
    goalText: tx('Tenha sete cartas na mão', 'Hold seven cards in your hand'),
    goal: { kind: 'hand', n: 7 },
    reward: 'rule5',
    adds: ['sniper', 'watchtower', 'prison', 'barrel', 'bazooka'],
  },
  {
    letter: 'G',
    color: '#6a3fb5',
    title: tx('Missão Quatro', 'Mission Four'),
    quote: tx('"Lá está ele! Pegue-o e saia de fininho!"', '"There he is! Get him and sneak out of there!"'),
    goalText: tx('Obtenha {any18} e o PRISIONEIRO', 'Get {any18} and the PRISONER'),
    goal: { kind: 'pay', cost: { kind: 'any', n: 18 }, item: 'prison' },
    reward: 'rule3',
    adds: ['tech', 'fence', 'laser', 'clumsy', 'armored', 'hawk'],
  },
  {
    letter: 'I',
    color: '#d7262b',
    title: tx('Missão Cinco', 'Mission Five'),
    quote: tx('"É isso! Agora só falta uma fuga limpa!"', '"That\'s it! Now all that\'s left to do is a clean getaway!"'),
    goalText: tx('Nocauteie as seis cartas da linha', 'Knock out the six cards in the line'),
    goal: { kind: 'knockAll' },
    reward: 'complete',
    adds: [],
  },
];

export const LINE_SIZE = 6;
export const ALARM_MAX = 50;
export const BASE_DRAW = 4;
/** Pages of the rules reader (phone and TV); their texts live in the UI. */
export const RULE_PAGES = 8;
/** Intro slides when the tutorial is on: credits, how-to-play slides, mission briefing. */
export const TUTORIAL_SLIDES = 6;
