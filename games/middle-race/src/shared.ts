import type { I18nText } from '@mp/game-sdk';

// Constants both sides need (logic and UI). Nothing here is secret.

export const PLAYERS = 11;
export const MIDDLE = 6;
/** Movements allowed inside one turn before the reaction system is cut (anti-loop). */
export const MOVE_LIMIT = 50;
/** Pause between two visible movements on the TV, so cascades read step by step. */
export const BEAT_MS = 1200;
export const VOTE_RESULT_MS = 6000;
export const PICK_REVEAL_MS = 2500;

export type ClassId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const CLASS_IDS: ClassId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const GRAVITY = 1, RESET = 2, PUSH = 3, DELETE = 4, JUNTO = 5, UNION = 6, ONE = 7, MIRROR = 8, JUMP = 9, SILENCE = 10, FAST = 11;

/** Classes whose target choice follows the non-consecutive rule. */
export const NON_CONSECUTIVE: number[] = [GRAVITY, RESET, PUSH, DELETE, JUNTO, MIRROR, SILENCE];

export function startingHand(cls: number): number[] {
  return cls === JUMP ? [0, 1, 2, 3, 4] : [1, 2, 3, 4];
}

export interface ClassInfo {
  id: ClassId;
  name: I18nText;
  kind: I18nText;
  text: I18nText;
  icon: string;
}

const ACTIVE = { 'pt-BR': 'Ativa', en: 'Active' };
const REACTIVE = { 'pt-BR': 'Reativa', en: 'Reactive' };
const FORCED = { 'pt-BR': 'Reativa obrigatória', en: 'Forced reaction' };
const PROPERTY = { 'pt-BR': 'Propriedade', en: 'Property' };

export const CLASSES: ClassInfo[] = [
  {
    id: 1, icon: '⬇', name: { 'pt-BR': 'Gravidade', en: 'Gravity' }, kind: ACTIVE,
    text: {
      'pt-BR': 'No seu turno, descarta 1 carta sem se mover e puxa 1 jogador: quem está à frente vai para 1 espaço à sua frente; quem está atrás, para 1 espaço atrás de você.',
      en: 'On your turn, discard 1 card without moving and pull 1 player: someone ahead lands 1 space in front of you; someone behind lands 1 space behind you.',
    },
  },
  {
    id: 2, icon: '↺', name: { 'pt-BR': 'Reset', en: 'Reset' }, kind: FORCED,
    text: {
      'pt-BR': 'Sempre que se move para trás, escolhe outro jogador: todas as cartas descartadas dele voltam para a mão.',
      en: 'Whenever you move backwards, pick another player: all of their discarded cards return to their hand.',
    },
  },
  {
    id: 3, icon: '⇆', name: { 'pt-BR': 'Empurrão', en: 'Shove' }, kind: REACTIVE,
    text: {
      'pt-BR': 'Não divide espaço (exceto largada e chegada): cada jogador no seu espaço é empurrado 1 para frente ou para trás, à sua escolha.',
      en: 'Shares no space (except start and finish): everyone on your space is shoved 1 forwards or backwards, your choice.',
    },
  },
  {
    id: 4, icon: '✂', name: { 'pt-BR': 'Delete', en: 'Delete' }, kind: FORCED,
    text: {
      'pt-BR': 'Quando outra classe o move, escolhe um jogador, vê a mão dele e escolhe 1 carta para ele manter; as outras somem até o próximo reset dele.',
      en: 'When another class moves you, pick a player, see their hand and choose 1 card they keep; the rest vanish until their next reset.',
    },
  },
  {
    id: 5, icon: '⇉', name: { 'pt-BR': 'Junto', en: 'Together' }, kind: REACTIVE,
    text: {
      'pt-BR': 'Ao se mover com sua última carta da mão, escolhe outro jogador, que anda para frente a mesma distância.',
      en: 'When you move with the last card in your hand, pick another player, who moves forward the same distance.',
    },
  },
  {
    id: 6, icon: '⊕', name: { 'pt-BR': 'União', en: 'Union' }, kind: REACTIVE,
    text: {
      'pt-BR': 'Todos que estiverem exatamente 1 espaço à sua frente são puxados para o seu espaço. Automático.',
      en: 'Everyone exactly 1 space ahead of you is pulled onto your space. Automatic.',
    },
  },
  {
    id: 7, icon: '①', name: { 'pt-BR': 'Um', en: 'One' }, kind: { 'pt-BR': 'Reativa especial', en: 'Special reaction' },
    text: {
      'pt-BR': 'Sempre que outro jogador joga uma carta "1" para se mover, você anda 1 espaço para frente ou para trás, antes de qualquer outra reação. Funciona até na largada.',
      en: 'Whenever another player plays a "1" card to move, you move 1 space forwards or backwards, before any other reaction. Works even on the start column.',
    },
  },
  {
    id: 8, icon: '◫', name: { 'pt-BR': 'Espelho', en: 'Mirror' }, kind: FORCED,
    text: {
      'pt-BR': 'Quando outra classe o move, escolhe um jogador e o move a mesma distância na direção oposta.',
      en: 'When another class moves you, pick a player and move them the same distance in the opposite direction.',
    },
  },
  {
    id: 9, icon: '⤴', name: { 'pt-BR': 'Pulo', en: 'Leap' }, kind: PROPERTY,
    text: {
      'pt-BR': 'Tem as cartas 0 a 4. Ao andar com a carta, pula jogadores sem contá-los. Com 2 cartas pode resetar a mão no início do turno.',
      en: 'Holds cards 0 to 4. Moving with a card, you leap over players without counting them. With 2 cards left you may reset at the start of your turn.',
    },
  },
  {
    id: 10, icon: '✕', name: { 'pt-BR': 'Silêncio', en: 'Silence' }, kind: ACTIVE,
    text: {
      'pt-BR': 'Antes de jogar a carta, pode calar outro jogador: a habilidade dele fica desligada até o seu próximo turno.',
      en: 'Before playing your card, you may silence another player: their ability is off until your next turn.',
    },
  },
  {
    id: 11, icon: '»', name: { 'pt-BR': 'Rápido', en: 'Swift' }, kind: PROPERTY,
    text: {
      'pt-BR': 'Antes da corrida, 2 das suas cartas viram cartas para trás (segredo). A cada carta, pode dobrar o valor.',
      en: 'Before the race, 2 of your cards become backward cards (secret). Each card, you may double its value.',
    },
  },
];

export const classInfo = (id: number): ClassInfo => CLASSES[id - 1] ?? CLASSES[0]!;

/** Ranking in the game by finishing place in the race (1-based), and the points it is worth. */
export function gameRank(racePlace: number): number {
  return Math.abs(racePlace - MIDDLE) + 1;
}
export const POINTS_BY_RANK: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 1, 6: 0 };
export const pointsFor = (racePlace: number) => POINTS_BY_RANK[gameRank(racePlace)] ?? 0;

// ---------------------------------------------------------------------------
// Host setup
// ---------------------------------------------------------------------------

export interface Setup {
  columns: number;
  readOn: boolean;
  readSec: number;
  voteSec: number;
  pickSec: number;
  stratOn: boolean;
  stratSec: number;
  turnSec: number;
  reactSec: number;
  pauseOn: boolean;
  pauseEvery: number;
  pauseSec: number;
}

export const DEFAULT_SETUP: Setup = {
  columns: 32,
  readOn: true,
  readSec: 90,
  voteSec: 45,
  pickSec: 30,
  stratOn: true,
  stratSec: 120,
  turnSec: 30,
  reactSec: 15,
  pauseOn: true,
  pauseEvery: 5,
  pauseSec: 60,
};

export type NumKey = { [K in keyof Setup]: Setup[K] extends number ? K : never }[keyof Setup];
export type BoolKey = { [K in keyof Setup]: Setup[K] extends boolean ? K : never }[keyof Setup];

export const SETUP_LIMITS: Record<NumKey, { min: number; max: number; step: number }> = {
  columns: { min: 16, max: 48, step: 1 },
  readSec: { min: 15, max: 600, step: 15 },
  voteSec: { min: 15, max: 180, step: 5 },
  pickSec: { min: 10, max: 120, step: 5 },
  stratSec: { min: 30, max: 900, step: 30 },
  turnSec: { min: 10, max: 120, step: 5 },
  reactSec: { min: 5, max: 60, step: 5 },
  pauseEvery: { min: 1, max: 20, step: 1 },
  pauseSec: { min: 15, max: 900, step: 15 },
};

export const BOOL_KEYS: BoolKey[] = ['readOn', 'stratOn', 'pauseOn'];
