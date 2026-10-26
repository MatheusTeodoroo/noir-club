import type { I18nText } from '@mp/game-sdk';

// The 13 animals and the 4 areas: public rules shared by the logic and the UI. Nothing here is
// secret — which player holds which animal lives only in the engine state.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Area = 'river' | 'sky' | 'field' | 'forest';
export const AREAS: Area[] = ['river', 'sky', 'field', 'forest'];

export const AREA_NAME: Record<Area, I18nText> = {
  river: tx('Rio', 'River'),
  sky: tx('Céu', 'Sky'),
  field: tx('Campo', 'Field'),
  forest: tx('Floresta', 'Forest'),
};

export type Animal =
  | 'lion'
  | 'crocodile'
  | 'eagle'
  | 'hyena'
  | 'snake'
  | 'chameleon'
  | 'crow'
  | 'plover'
  | 'rat'
  | 'deer'
  | 'mallard'
  | 'otter'
  | 'rabbit';

/** Win conditions, as the logic evaluates them after round 4. */
export type Goal = 'survive' | 'lionDies' | 'lionLives' | 'crocLives' | 'massacre' | 'guess';

export interface AnimalInfo {
  name: I18nText;
  /** 1 = top of the pyramid. An attack succeeds only on a strictly higher number. */
  level: number;
  habitat: Area;
  forbidden: Area[];
  /** Consecutive unfed rounds that kill it; null = never starves. */
  starve: number | null;
  peeks: 1 | 2;
  goal: Goal;
  /** Wins even if it was eaten (its goal is about other animals). */
  winsDead: boolean;
  /** Special rule, shown on the phone and in the rules. */
  special: I18nText | null;
}

const QUARTET = tx(
  'Se todos os sobreviventes do quarteto Cervo/Pato-real/Lontra/Coelho (2 ou mais) estiverem na mesma área, nenhum deles pode ser devorado.',
  'If every survivor of the Deer/Mallard/Otter/Rabbit quartet (2 or more) is in the same area, none of them can be eaten.',
);

export const ANIMALS: Record<Animal, AnimalInfo> = {
  lion: {
    name: tx('Leão', 'Lion'),
    level: 1,
    habitat: 'field',
    forbidden: ['sky'],
    starve: 1,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: null,
  },
  crocodile: {
    name: tx('Crocodilo', 'Crocodile'),
    level: 2,
    habitat: 'river',
    forbidden: ['sky'],
    starve: 2,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: null,
  },
  eagle: {
    name: tx('Águia', 'Eagle'),
    level: 3,
    habitat: 'sky',
    forbidden: [],
    starve: 2,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: null,
  },
  hyena: {
    name: tx('Hiena', 'Hyena'),
    level: 4,
    habitat: 'field',
    forbidden: ['sky'],
    starve: 3,
    peeks: 1,
    goal: 'lionDies',
    winsDead: true,
    special: null,
  },
  snake: {
    name: tx('Cobra', 'Snake'),
    level: 5,
    habitat: 'forest',
    forbidden: ['sky'],
    starve: null,
    peeks: 1,
    goal: 'massacre',
    winsDead: true,
    special: tx(
      'Não pode morrer. Quem atacar a Cobra morre no lugar dela.',
      'Cannot die. Whoever attacks the Snake dies instead.',
    ),
  },
  chameleon: {
    name: tx('Camaleão', 'Chameleon'),
    level: 5,
    habitat: 'forest',
    forbidden: ['sky'],
    starve: null,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: tx(
      'Antes das espiadas, escolhe um disfarce: quem espiar o Camaleão vê esse animal.',
      'Before the peeks, picks a disguise: whoever peeks at the Chameleon sees that animal.',
    ),
  },
  crow: {
    name: tx('Corvo', 'Crow'),
    level: 5,
    habitat: 'sky',
    forbidden: [],
    starve: null,
    peeks: 2,
    goal: 'guess',
    winsDead: true,
    special: tx('Espia 2 jogadores em vez de 1.', 'Peeks at 2 players instead of 1.'),
  },
  plover: {
    name: tx('Pássaro-palito', 'Plover'),
    level: 5,
    habitat: 'river',
    forbidden: [],
    starve: null,
    peeks: 2,
    goal: 'crocLives',
    winsDead: true,
    special: tx('Espia 2 jogadores em vez de 1.', 'Peeks at 2 players instead of 1.'),
  },
  rat: {
    name: tx('Rato', 'Rat'),
    level: 5,
    habitat: 'forest',
    forbidden: ['sky'],
    starve: null,
    peeks: 2,
    goal: 'lionLives',
    winsDead: true,
    special: tx('Espia 2 jogadores em vez de 1.', 'Peeks at 2 players instead of 1.'),
  },
  deer: {
    name: tx('Cervo', 'Deer'),
    level: 5,
    habitat: 'field',
    forbidden: ['sky'],
    starve: null,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: QUARTET,
  },
  mallard: {
    name: tx('Pato-real', 'Mallard'),
    level: 5,
    habitat: 'sky',
    forbidden: [],
    starve: null,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: QUARTET,
  },
  otter: {
    name: tx('Lontra', 'Otter'),
    level: 5,
    habitat: 'river',
    forbidden: ['sky'],
    starve: null,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: QUARTET,
  },
  rabbit: {
    name: tx('Coelho', 'Rabbit'),
    level: 5,
    habitat: 'forest',
    forbidden: ['sky'],
    starve: null,
    peeks: 1,
    goal: 'survive',
    winsDead: false,
    special: QUARTET,
  },
};

/** Pyramid order, top first. */
export const ANIMAL_LIST = Object.keys(ANIMALS) as Animal[];
export const QUARTET_ANIMALS: Animal[] = ['deer', 'mallard', 'otter', 'rabbit'];

export const ROUNDS = 4;
/** The Snake wins when at least this many players are dead at the end. */
export const MASSACRE = 10;

export const GOAL_TEXT: Record<Goal, I18nText> = {
  survive: tx('Sobreviver às 4 rodadas.', 'Survive all 4 rounds.'),
  lionDies: tx('O Leão morrer (vale mesmo se você morrer).', 'The Lion dies (counts even if you die).'),
  lionLives: tx('O Leão sobreviver às 4 rodadas (vale mesmo se você morrer).', 'The Lion survives all 4 rounds (counts even if you die).'),
  crocLives: tx(
    'O Crocodilo sobreviver às 4 rodadas (vale mesmo se você morrer).',
    'The Crocodile survives all 4 rounds (counts even if you die).',
  ),
  massacre: tx(`${MASSACRE} ou mais jogadores mortos no fim.`, `${MASSACRE} or more players dead at the end.`),
  guess: tx(
    'Acertar, no começo, um jogador que vai vencer (vale mesmo se você morrer).',
    'Guess, at the start, one player who will win (counts even if you die).',
  ),
};

export const starveText = (n: number | null): I18nText | null =>
  n === null
    ? null
    : n === 1
      ? tx('Morre se passar 1 rodada sem comer.', 'Dies after 1 round without eating.')
      : tx(`Morre se passar ${n} rodadas seguidas sem comer.`, `Dies after ${n} rounds in a row without eating.`);
