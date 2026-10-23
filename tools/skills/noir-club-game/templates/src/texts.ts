import type { I18nText } from '@mp/game-sdk';

// Every Noir Club game ships a tutorial and the full rules (see the skill's reference/rules.md).
// Both live here, in PT-BR and EN, so the UI and the logic share one source. Inline markup:
// **bold** for key terms; {token} for icons the UI substitutes (see `rich()` in ui.tsx).

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

/**
 * Tutorial slides shown on the TV before the first round (Host advances them from the phone).
 * Short and ordered for a first-timer: what you are doing, what you see, what you do, how you win.
 * `demo` names a small live illustration the TV draws next to the text.
 */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'pick' | 'reveal' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'pick',
    body: [
      tx(
        'A cada rodada, todos escolhem **em segredo** um número de 1 a 5 no próprio celular.',
        'Each round, everyone picks a number from 1 to 5 **in secret** on their own phone.',
      ),
      tx(
        'A TV mostra só **quem já escolheu** — nunca o número.',
        'The TV only shows **who has picked** — never the number.',
      ),
    ],
  },
  {
    title: tx('Quem pontua', 'Who scores'),
    demo: 'reveal',
    body: [
      tx(
        'Na revelação, o **maior número que ninguém repetiu** vence e vale esses pontos.',
        'At the reveal, the **highest number nobody repeated** wins and scores that many points.',
      ),
      tx('Se todos repetirem, ninguém pontua. Blefe!', 'If every number is repeated, nobody scores. Bluff!'),
    ],
  },
];

/**
 * The full rules, readable on any phone at any time and showable on the TV by the Host.
 * Page order: overview (goal and theme) → what you see → what you do → round by round →
 * scoring and end → credits (when the game adapts someone else's work).
 */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo rápido de blefe para 2 a 12 pessoas. O objetivo é somar mais pontos ao fim das rodadas.',
        'A quick bluffing game for 2 to 12 people. The goal is to have the most points when the rounds are over.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Escolha**: cada um escolhe 1 a 5 no celular, em segredo. Dá para trocar até o tempo acabar.',
        '**1 · Pick**: everyone picks 1 to 5 on their phone, in secret. You can change it until time runs out.',
      ),
      tx(
        '**2 · Revelação**: quando todos escolheram (ou o tempo acabou), a TV revela os números.',
        '**2 · Reveal**: once everyone has picked (or time runs out), the TV reveals the numbers.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'O maior número que **só uma pessoa** escolheu vale seus pontos para ela. Números repetidos não valem nada.',
        'The highest number that **only one person** picked scores its value for them. Repeated numbers score nothing.',
      ),
      tx(
        'Depois da última rodada, vence quem tiver mais pontos. Quem não escolher a tempo fica de fora da rodada.',
        'After the last round, the most points wins. Anyone who doesn’t pick in time sits that round out.',
      ),
    ],
  },
];

/** Shown on the first tutorial slide and the last rules page. Fill it in when the game adapts an existing one. */
export const CREDITS: I18nText | null = null;
