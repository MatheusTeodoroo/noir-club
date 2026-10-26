import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { Death, Phase, PlayerView, PublicView } from './logic.ts';
import {
  ANIMALS,
  ANIMAL_LIST,
  AREAS,
  AREA_NAME,
  GOAL_TEXT,
  starveText,
  type Animal,
  type Area,
} from './shared.ts';
import { CREDITS, RULES, SLIDES, type Demo } from './texts.ts';
import { AnimalIcon, AreaIcon } from './icons.tsx';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (shared.ts, texts.ts, icons.tsx)
// are imported here. Platform components come in through `kit`, text goes through `t()`, and
// styles are scoped with the `cag-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];
type Seat = DisplayProps['platform']['players'][number];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  opening: { 'pt-BR': 'Abertura', en: 'Opening' },
  roleTitle: { 'pt-BR': 'Seu animal', en: 'Your animal' },
  roleSub: {
    'pt-BR': 'Toque no cartão do celular para ver seu animal. O Camaleão escolhe um disfarce.',
    en: 'Tap the card on your phone to see your animal. The Chameleon picks a disguise.',
  },
  peekTitle: { 'pt-BR': 'Espiem', en: 'Peek' },
  peekSub: {
    'pt-BR': 'Escolha no celular quem espiar. Ninguém fica sabendo.',
    en: 'Pick on your phone whom to peek at. Nobody will know.',
  },
  guessTitle: { 'pt-BR': 'Palpites', en: 'Guesses' },
  guessSub: {
    'pt-BR': 'Quem vai vencer? Todos escolhem — só o palpite do Corvo conta.',
    en: 'Who will win? Everyone picks — only the Crow’s guess counts.',
  },
  talkTitle: { 'pt-BR': 'Conversa', en: 'Talk' },
  talkSub: {
    'pt-BR': 'Negociem, blefem e decidam para onde ir.',
    en: 'Negotiate, bluff and decide where to go.',
  },
  moveTitle: { 'pt-BR': 'Para onde?', en: 'Where to?' },
  moveSub: { 'pt-BR': 'Escolha a área em segredo no celular.', en: 'Pick your area in secret on your phone.' },
  huntTitle: { 'pt-BR': 'Caçada', en: 'The hunt' },
  huntSub: {
    'pt-BR': 'Ataque pelo celular quem está na sua área. Cuidado com a Cobra.',
    en: 'Attack anyone in your area from your phone. Beware of the Snake.',
  },
  duskTitle: { 'pt-BR': 'Anoitecer', en: 'Dusk' },
  duskSub: { 'pt-BR': 'As vítimas desta rodada…', en: 'This round’s victims…' },
  duskNone: { 'pt-BR': 'Ninguém morreu nesta rodada.', en: 'Nobody died this round.' },
  finalTitle: { 'pt-BR': 'Fim da cadeia', en: 'End of the chain' },
  winnersN: { 'pt-BR': 'vencedores', en: 'winners' },
  deadN: { 'pt-BR': 'mortos', en: 'dead' },
  crowBet: { 'pt-BR': 'O Corvo apostou em', en: 'The Crow bet on' },
  crowNone: { 'pt-BR': 'O Corvo não deu palpite.', en: 'The Crow made no guess.' },
  won: { 'pt-BR': 'Venceu', en: 'Won' },
  lost: { 'pt-BR': 'Perdeu', en: 'Lost' },
  eatenIn: { 'pt-BR': 'devorado', en: 'eaten' },
  starved: { 'pt-BR': 'morreu de fome', en: 'starved' },
  inArea: { 'pt-BR': 'em', en: 'in' },
  pyramid: { 'pt-BR': 'A pirâmide', en: 'The pyramid' },
  graveyard: { 'pt-BR': 'Fora do jogo', en: 'Out of the game' },
  nobodyHere: { 'pt-BR': 'ninguém', en: 'nobody' },
  // phone
  tapToSee: { 'pt-BR': 'Toque para ver seu animal', en: 'Tap to see your animal' },
  hideIt: { 'pt-BR': 'Toque para esconder', en: 'Tap to hide' },
  secretCard: { 'pt-BR': 'Seu cartão secreto', en: 'Your secret card' },
  level: { 'pt-BR': 'Nível', en: 'Level' },
  bottom: { 'pt-BR': 'Base', en: 'Bottom' },
  habitat: { 'pt-BR': 'Habitat', en: 'Habitat' },
  cantGo: { 'pt-BR': 'Não vai ao', en: 'Can’t go to the' },
  goal: { 'pt-BR': 'Objetivo', en: 'Goal' },
  hunger: { 'pt-BR': 'Fome', en: 'Hunger' },
  disguise: { 'pt-BR': 'Seu disfarce', en: 'Your disguise' },
  youPeeked: { 'pt-BR': 'Você espiou', en: 'You peeked' },
  yourGuess: { 'pt-BR': 'Seu palpite', en: 'Your guess' },
  seen: { 'pt-BR': 'O que você viu', en: 'What you saw' },
  ready: { 'pt-BR': 'Pronto', en: 'Ready' },
  waiting: { 'pt-BR': 'Aguardando os outros…', en: 'Waiting for the others…' },
  pickDisguise: {
    'pt-BR': 'Você é o Camaleão: escolha o animal que quem espiar você vai ver.',
    en: 'You are the Chameleon: pick the animal anyone peeking at you will see.',
  },
  pickPeek: {
    'pt-BR': 'Escolha quem espiar (seu cartão diz quantos)',
    en: 'Pick whom to peek at (your card says how many)',
  },
  peeksLeft: { 'pt-BR': 'Espiadas', en: 'Peeks' },
  peek: { 'pt-BR': 'Espiar', en: 'Peek' },
  peekDone: {
    'pt-BR': 'Pronto! Toque no cartão para ver o que você espiou.',
    en: 'Done! Tap the card to see what you peeked.',
  },
  pickGuess: {
    'pt-BR': 'Quem vai vencer? Só o palpite do Corvo conta.',
    en: 'Who will win? Only the Crow’s guess counts.',
  },
  guessSaved: { 'pt-BR': 'Palpite registrado. Pode trocar até o tempo acabar.', en: 'Guess saved. You can change it until time runs out.' },
  talkPhone: { 'pt-BR': 'Conversem! Logo vocês escolhem a área.', en: 'Talk! You’ll pick an area soon.' },
  pickArea: { 'pt-BR': 'Escolha sua área', en: 'Pick your area' },
  forbidden: { 'pt-BR': 'não pode ir', en: 'can’t go' },
  mustReturn: { 'pt-BR': 'precisa voltar ao habitat', en: 'must go home' },
  areaSaved: { 'pt-BR': 'Pode trocar até o tempo acabar.', en: 'You can change it until time runs out.' },
  youAreIn: { 'pt-BR': 'Você está em', en: 'You are in' },
  alone: { 'pt-BR': 'Ninguém mais está aqui.', en: 'Nobody else is here.' },
  tapTarget: { 'pt-BR': 'Escolha um alvo e ataque', en: 'Pick a target and attack' },
  attack: { 'pt-BR': 'Atacar', en: 'Attack' },
  tried: { 'pt-BR': 'atacado', en: 'attacked' },
  ate: { 'pt-BR': 'devorou', en: 'ate' },
  diedOn: { 'pt-BR': 'atacou e foi morto por', en: 'attacked and was killed by' },
  thisArea: { 'pt-BR': 'Nesta área', en: 'In this area' },
  witnessed: { 'pt-BR': 'O que você testemunhou', en: 'What you witnessed' },
  youDied: { 'pt-BR': 'Você está fora', en: 'You are out' },
  eatenBy: { 'pt-BR': 'Você foi devorado por', en: 'You were eaten by' },
  killedBy: { 'pt-BR': 'Você atacou a Cobra:', en: 'You attacked the Snake:' },
  starvedYou: { 'pt-BR': 'Você morreu de fome.', en: 'You starved.' },
  stillWin: { 'pt-BR': 'Você ainda pode vencer:', en: 'You can still win:' },
  noWin: { 'pt-BR': 'Seu objetivo era sobreviver. Continue na conversa!', en: 'Your goal was to survive. Stay in the conversation!' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  youWon: { 'pt-BR': 'Você venceu!', en: 'You won!' },
  youLost: { 'pt-BR': 'Você não cumpriu seu objetivo.', en: 'You didn’t meet your goal.' },
  seeScores: { 'pt-BR': 'Ver placar', en: 'See scoreboard' },
  // tutorial & rules
  tutorial: { 'pt-BR': 'Tutorial', en: 'Tutorial' },
  hostAdvances: { 'pt-BR': 'O Host avança pelo celular', en: 'The Host moves on from their phone' },
  followTv: { 'pt-BR': 'Acompanhe o tutorial na TV.', en: 'Follow the tutorial on the TV.' },
  prev: { 'pt-BR': 'Anterior', en: 'Back' },
  next: { 'pt-BR': 'Próximo', en: 'Next' },
  start: { 'pt-BR': 'Começar', en: 'Start' },
  skip: { 'pt-BR': 'Pular tutorial', en: 'Skip tutorial' },
  rules: { 'pt-BR': 'Regras', en: 'Rules' },
  showOnTv: { 'pt-BR': 'Mostrar na TV', en: 'Show on TV' },
  hideFromTv: { 'pt-BR': 'Tirar da TV', en: 'Hide from TV' },
  close: { 'pt-BR': 'Fechar', en: 'Close' },
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
  demoPeek: { 'pt-BR': 'espiou', en: 'peeked' },
  demoNothing: { 'pt-BR': 'nada acontece', en: 'nothing happens' },
  demoDies: { 'pt-BR': 'quem ataca morre', en: 'the attacker dies' },
  demoEats: { 'pt-BR': 'devora', en: 'eats' },
  demoHome: { 'pt-BR': 'habitat', en: 'habitat' },
} satisfies Record<string, I18nText>;

const AREA_TONE: Record<Area, string> = {
  river: '#5b8fb3',
  sky: '#b9c6d3',
  field: '#d4af37',
  forest: '#5e9c6b',
};

const CSS = `
.cag-wrap{--cag-ink:#0b0a0d;height:100vh;display:grid;grid-template-rows:auto 1fr;padding:2.6em 4em 3.4em;gap:1.6em;box-sizing:border-box}
.cag-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.cag-h1{font-family:var(--font-display);font-weight:900;font-size:4.6em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.cag-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.2em 0 0}
.cag-body{display:grid;grid-template-columns:21em 1fr;gap:3em;min-height:0}
.cag-gold{color:var(--gold)}
/* pyramid */
.cag-pyr{display:grid;gap:.5em;justify-items:center;align-content:center}
.cag-pyr-row{display:flex;gap:.35em;justify-content:center;flex-wrap:wrap}
.cag-pyr-cell{display:grid;place-items:center;border-radius:.5em;background:rgba(212,175,55,.06);box-shadow:0 0 0 1px var(--line) inset;color:var(--gold)}
.cag-pyr-cell[data-dead=true]{color:var(--crimson-hi);opacity:.55}
.cag-pyr-lvl{font-family:var(--font-display);font-size:.85em;color:var(--text-mute);letter-spacing:.2em}
/* seats */
.cag-seats{display:flex;flex-wrap:wrap;gap:1.6em 2em;justify-content:center;align-content:center}
.cag-seat{display:grid;justify-items:center;gap:.35em;width:7.4em;text-align:center}
.cag-seat-name{font-weight:600;font-size:1.25em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cag-seat-tag{font-size:1.05em;color:var(--crimson-hi);display:flex;gap:.3em;align-items:center}
.cag-seat[data-dead=true] .cag-seat-name{color:var(--text-mute);text-decoration:line-through}
/* areas */
.cag-areas{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4em;min-height:0}
.cag-area{border-radius:var(--radius-lg);padding:1.2em 1em;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));
  box-shadow:0 0 0 1px var(--line) inset;display:grid;grid-template-rows:auto 1fr;gap:1em;min-height:0}
.cag-area-head{display:flex;align-items:center;gap:.6em;font-family:var(--font-display);font-size:1.9em;letter-spacing:.08em;text-transform:uppercase}
.cag-area-count{margin-left:auto;font-size:.8em;color:var(--text-dim)}
.cag-area-seats{display:flex;flex-wrap:wrap;gap:1em .6em;justify-content:center;align-content:flex-start}
.cag-area-seats .cag-seat{width:5.6em}
.cag-area-seats .cag-seat-name{font-size:1.1em}
.cag-empty{font-family:var(--font-serif);font-style:italic;color:var(--text-mute);font-size:1.4em;text-align:center}
/* dusk & final */
.cag-deaths{display:flex;flex-wrap:wrap;gap:2em;justify-content:center;align-content:center}
.cag-death{display:grid;justify-items:center;gap:.5em;padding:1.6em 2em;border-radius:var(--radius-lg);min-width:13em;
  background:linear-gradient(180deg,rgba(139,26,36,.22),rgba(139,26,36,.06));box-shadow:0 0 0 1px rgba(196,48,64,.45) inset;
  animation:cag-rise .9s var(--ease-out) backwards}
.cag-death .cag-big{color:var(--gold-hi)}
.cag-death-name{font-family:var(--font-display);font-size:1.8em}
.cag-death-how{font-family:var(--font-serif);font-style:italic;font-size:1.4em;color:var(--text-dim);display:flex;gap:.35em;align-items:center}
.cag-none{font-family:var(--font-serif);font-style:italic;font-size:2.6em;color:var(--gold);text-align:center;align-self:center;animation:cag-rise .9s 2.3s var(--ease-out) backwards}
@keyframes cag-rise{from{opacity:0;transform:translateY(1.2em) scale(.96)}}
.cag-finals{display:grid;grid-template-columns:repeat(7,1fr);gap:1.2em;align-content:center}
.cag-fcard{display:grid;justify-items:center;gap:.3em;padding:1em .6em;border-radius:var(--radius-lg);text-align:center;
  box-shadow:0 0 0 1px var(--line) inset;animation:cag-rise .8s var(--ease-out) backwards}
.cag-fcard[data-won=true]{background:linear-gradient(180deg,rgba(212,175,55,.2),rgba(212,175,55,.04));box-shadow:0 0 0 1px var(--gold) inset,0 0 2em rgba(212,175,55,.25)}
.cag-fcard[data-won=false]{opacity:.75}
.cag-fcard .cag-seat-name{font-size:1.15em}
.cag-fanimal{display:flex;gap:.3em;align-items:center;color:var(--gold-hi);font-size:1.1em}
.cag-fstatus{font-family:var(--font-display);font-size:1em;letter-spacing:.15em;text-transform:uppercase}
.cag-fcard[data-won=true] .cag-fstatus{color:var(--gold-hi)}
.cag-fcard[data-won=false] .cag-fstatus{color:var(--text-mute)}
.cag-fdead{font-size:.95em;color:var(--crimson-hi)}
.cag-crowline{text-align:center;font-family:var(--font-serif);font-style:italic;font-size:1.6em;color:var(--text-dim);margin-top:1em}
/* Tutorial slide (TV) */
.cag-slide{--cag-ink:#0b0a0d;height:100vh;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:4em;padding:4em 5em;box-sizing:border-box}
.cag-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.cag-slide b,.cag-rules b,.cag-tvrules b{color:var(--gold-hi);font-weight:600}
.cag-tok{color:var(--gold);display:inline-flex;vertical-align:-.15em}
.cag-dots{display:flex;gap:.6em;margin-top:1.5em}
.cag-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.cag-dots span[data-on='true']{background:var(--gold)}
.cag-demo{display:grid;gap:1.4em;justify-items:center;font-size:1.3em}
.cag-demo-row{display:flex;gap:1.2em;align-items:center;justify-content:center}
.cag-demo-arrow{font-family:var(--font-display);color:var(--gold);font-size:1.4em}
.cag-demo-cap{font-family:var(--font-serif);font-style:italic;color:var(--text-dim);font-size:1.1em}
.cag-flip{animation:cag-flip 4s ease-in-out infinite}
@keyframes cag-flip{0%,35%{transform:rotateY(0)}50%,85%{transform:rotateY(180deg)}100%{transform:rotateY(360deg)}}
/* Rules overlay (TV) and reader (phone) */
.cag-tvrules{--cag-ink:#0b0a0d;position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.cag-tvrules .mp-panel{width:min(64em,92vw);padding:2.2em 3em;max-height:40em;overflow:hidden}
.cag-tvrules h2{font-family:var(--font-display);font-size:2.4em;margin:.2em 0 .5em;color:var(--gold-hi)}
.cag-tvrules p{font-size:1.35em;line-height:1.4;margin:0 0 .5em}
.cag-sheet{--cag-ink:#0b0a0d;position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.cag-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.cag-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.cag-rules p{margin:0;line-height:1.5}
.cag-row{display:flex;gap:8px}
.cag-row > *{flex:1}
/* phone */
.cag-p{--cag-ink:#0b0a0d}
.cag-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.cag-card{all:unset;box-sizing:border-box;display:grid;gap:10px;width:100%;padding:16px;border-radius:18px;cursor:pointer;
  background:radial-gradient(120% 100% at 50% 0%,rgba(212,175,55,.14),rgba(20,16,22,.9));box-shadow:0 0 0 1px var(--gold-lo) inset;
  -webkit-tap-highlight-color:transparent;user-select:none}
.cag-card-back{display:grid;justify-items:center;gap:8px;padding:12px 0;color:var(--gold)}
.cag-card-back span{font-family:var(--font-display);letter-spacing:.12em;text-transform:uppercase;font-size:.95rem}
.cag-card-front{display:grid;gap:8px}
.cag-me{display:flex;gap:14px;align-items:center;color:var(--gold-hi)}
.cag-me h3{font-family:var(--font-display);font-size:1.6rem;margin:0;color:var(--gold-hi)}
.cag-me small{display:block;color:var(--text-dim);font-size:.85rem;letter-spacing:.08em;text-transform:uppercase}
.cag-facts{display:grid;gap:6px;font-size:.95rem;line-height:1.4}
.cag-facts b{color:var(--gold-hi);font-weight:600}
.cag-secret{border-top:1px solid var(--line);padding-top:8px;display:grid;gap:4px;font-size:.95rem}
.cag-secret-line{display:flex;align-items:center;gap:6px}
.cag-hint{font-size:.8rem;color:var(--text-mute);text-align:center;letter-spacing:.08em;text-transform:uppercase}
.cag-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cag-grid4{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.cag-opt{all:unset;box-sizing:border-box;cursor:pointer;display:grid;justify-items:center;gap:4px;padding:10px 6px;min-height:56px;border-radius:14px;
  text-align:center;font-size:.85rem;color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;-webkit-tap-highlight-color:transparent}
.cag-opt .cag-opt-icon{color:var(--gold)}
.cag-opt[aria-pressed=true]{background:linear-gradient(180deg,rgba(226,195,90,.35),rgba(168,133,32,.25));box-shadow:0 0 0 2px var(--gold) inset}
.cag-opt[aria-disabled=true]{opacity:.35;cursor:not-allowed}
.cag-opt-name{font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cag-opt small{color:var(--text-mute);font-size:.72rem}
.cag-opt[data-tried=true]{box-shadow:0 0 0 1px var(--crimson) inset}
.cag-area-big{display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--font-display);font-size:1.5rem;letter-spacing:.08em;text-transform:uppercase}
.cag-feed{display:grid;gap:6px;font-size:.95rem}
.cag-feed div{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.cag-feed b{color:var(--gold-hi)}
.cag-result{font-family:var(--font-display);font-size:2rem;text-align:center;margin:0}
`;

const Styles = () => <style>{CSS}</style>;

const TOKENS = new Set<string>([...ANIMAL_LIST, ...AREAS]);

/** Renders **bold** and {animal}/{area} icon tokens inside a translated string. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{[a-z]+\})/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    const tok = part.startsWith('{') ? part.slice(1, -1) : '';
    if (TOKENS.has(tok)) {
      return (
        <span key={i} className="cag-tok">
          {(AREAS as string[]).includes(tok) ? <AreaIcon area={tok as Area} size="1.15em" /> : <AnimalIcon animal={tok as Animal} size="1.15em" />}
        </span>
      );
    }
    return part;
  });
}

const nameOf = (players: Seat[], id: string | null | undefined) => players.find((p) => p.id === id)?.name ?? '?';

// ---------------------------------------------------------------------------
// Pieces shared by the board and the tutorial
// ---------------------------------------------------------------------------

const PYRAMID: Animal[][] = [
  ['lion'],
  ['crocodile'],
  ['eagle'],
  ['hyena'],
  ['snake', 'chameleon', 'crow', 'plover', 'rat'],
  ['deer', 'mallard', 'otter', 'rabbit'],
];

/** The food-chain pyramid; `dead` animals are drawn in crimson. */
function Pyramid({ t, dead = [], size = 3.1 }: { t: T; dead?: Animal[]; size?: number }) {
  return (
    <div className="cag-pyr" style={{ fontSize: `${size / 3.1}em` }}>
      <span className="mp-eyebrow" style={{ fontSize: '1.05em' }}>
        {t(L.pyramid)}
      </span>
      {PYRAMID.map((row, r) => (
        <div key={r} className="cag-pyr-row">
          {row.map((a) => (
            <div
              key={a}
              className="cag-pyr-cell"
              data-dead={dead.includes(a)}
              style={{ width: `${r < 4 ? 3.6 + (3 - r) * 0.5 : 3.4}em`, height: `${r < 4 ? 3.6 + (3 - r) * 0.5 : 3.4}em` }}
              title={t(ANIMALS[a].name)}
            >
              <AnimalIcon animal={a} size="78%" />
            </div>
          ))}
        </div>
      ))}
      <span className="cag-pyr-lvl">1 › 2 › 3 › 4 › {t(L.bottom).toUpperCase()}</span>
    </div>
  );
}

function SeatView({ p, kit, size = '4.6em', active, dead, badge }: { p: Seat; kit: Kit; size?: string; active?: boolean; dead?: Death; badge?: string }) {
  return (
    <div className="cag-seat" data-dead={!!dead}>
      <kit.Avatar emoji={p.avatar} size={size} offline={!p.connected} active={active} crimson={!!dead} badge={badge} />
      <span className="cag-seat-name">{p.name}</span>
      {dead && (
        <span className="cag-seat-tag">
          <AnimalIcon animal={dead.animal} size="1.3em" /> R{dead.round}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

function SlideDemo({ demo, kit, t }: { demo: Demo; kit: Kit; t: T }) {
  const { Avatar } = kit;
  if (demo === 'pyramid') return <Pyramid t={t} size={4} />;
  if (demo === 'opening') {
    return (
      <div className="cag-demo">
        <div className="cag-demo-row">
          <Avatar emoji="🎩" size="6em" active />
          <span className="cag-demo-arrow">→</span>
          <Avatar emoji="🦊" size="6em" />
          <span className="cag-demo-arrow">=</span>
          <span className="cag-flip cag-gold" style={{ display: 'inline-flex' }}>
            <AnimalIcon animal="otter" size="6em" />
          </span>
        </div>
        <span className="cag-demo-cap">
          🎩 {t(L.demoPeek)} 🦊 · {t(ANIMALS.otter.name)}
        </span>
        <div className="cag-demo-row">
          <span className="cag-gold">
            <AnimalIcon animal="chameleon" size="4em" />
          </span>
          <span className="cag-demo-arrow">≈</span>
          <span className="cag-gold">
            <AnimalIcon animal="lion" size="4em" />
          </span>
        </div>
      </div>
    );
  }
  if (demo === 'areas') {
    const sample: Record<Area, Animal> = { river: 'crocodile', sky: 'eagle', field: 'lion', forest: 'snake' };
    return (
      <div className="cag-areas" style={{ gridTemplateColumns: 'repeat(2, 1fr)', width: '30em' }}>
        {AREAS.map((a) => (
          <div key={a} className="cag-area" style={{ gridTemplateRows: 'auto auto' }}>
            <div className="cag-area-head" style={{ color: AREA_TONE[a], fontSize: '1.4em' }}>
              <AreaIcon area={a} size="1.4em" /> {t(AREA_NAME[a])}
            </div>
            <div className="cag-demo-cap" style={{ display: 'flex', gap: '.4em', alignItems: 'center', justifyContent: 'center' }}>
              <span className="cag-gold">
                <AnimalIcon animal={sample[a]} size="2.4em" />
              </span>
              {t(L.demoHome)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'hunt') {
    const line = (a: Animal, b: Animal, cap: I18nText, ok: boolean) => (
      <div className="cag-demo-row">
        <span className="cag-gold">
          <AnimalIcon animal={a} size="4em" />
        </span>
        <span className="cag-demo-arrow" style={{ color: ok ? 'var(--gold)' : 'var(--crimson-hi)' }}>
          ➝
        </span>
        <span className="cag-gold" style={{ opacity: ok ? 0.4 : 1 }}>
          <AnimalIcon animal={b} size="4em" />
        </span>
        <span className="cag-demo-cap" style={{ width: '9em' }}>
          {t(cap)}
        </span>
      </div>
    );
    return (
      <div className="cag-demo">
        {line('lion', 'deer', L.demoEats, true)}
        {line('hyena', 'eagle', L.demoNothing, false)}
        {line('eagle', 'snake', L.demoDies, false)}
      </div>
    );
  }
  return (
    <div className="cag-demo" style={{ fontSize: '1.15em' }}>
      {(['lion', 'hyena', 'snake', 'crow'] as Animal[]).map((a) => (
        <div key={a} className="cag-demo-row" style={{ justifyContent: 'flex-start', width: '24em' }}>
          <span className="cag-gold">
            <AnimalIcon animal={a} size="3em" />
          </span>
          <span style={{ fontSize: '1.05em' }}>{t(GOAL_TEXT[ANIMALS[a].goal])}</span>
        </div>
      ))}
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: Kit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="cag-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="cag-h1" style={{ fontSize: '3.8em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="cag-sub" style={{ fontSize: '1.15em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="cag-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="cag-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t }: { page: number; kit: Kit; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="cag-tvrules">
      <Styles />
      <Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
      </Panel>
    </div>
  );
}

/** Full rules on the phone: anyone can read them; the Host can mirror the page on the TV. */
function RulesReader({
  view,
  kit,
  t,
  send,
  isHost,
  onClose,
}: {
  view: PlayerView;
  kit: PlayerProps['kit'];
  t: T;
  send(a: unknown): void;
  isHost: boolean;
  onClose(): void;
}) {
  const { Button, Panel } = kit;
  const [page, setPage] = useState(view.tvRules ?? 0);
  const onTv = isHost && view.tvRules !== null;
  useEffect(() => {
    if (onTv) send({ type: 'tvRules', page });
  }, [page]);
  const r = RULES[page]!;
  const last = page === RULES.length - 1;
  return (
    <div className="cag-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="cag-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="cag-row">
          <Button small variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹ {t(L.prev)}
          </Button>
          <Button small variant="ghost" disabled={last} onClick={() => setPage(page + 1)}>
            {t(L.next)} ›
          </Button>
        </div>
        {isHost && (
          <Button small onClick={() => send({ type: 'tvRules', page: onTv ? null : page })}>
            📺 {t(onTv ? L.hideFromTv : L.showOnTv)}
          </Button>
        )}
        <Button
          small
          variant="ghost"
          onClick={() => {
            if (onTv) send({ type: 'tvRules', page: null });
            onClose();
          }}
        >
          {t(L.close)}
        </Button>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TV
// ---------------------------------------------------------------------------

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Countdown } = kit;
  const players = platform.players.filter((p) => !p.spectator);
  const rulesOverlay = view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />;

  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} kit={kit} t={t} />
        {rulesOverlay}
      </>
    );
  }

  const deadOf = (id: string) => view.dead.find((d) => d.id === id);
  const deadAnimals = view.dead.map((d) => d.animal);
  const opening = view.phase === 'role' || view.phase === 'peek' || view.phase === 'guess';
  const step = view.phase === 'role' ? 1 : view.phase === 'peek' ? 2 : 3;
  const [title, sub] = ({
    role: [L.roleTitle, L.roleSub],
    peek: [L.peekTitle, L.peekSub],
    guess: [L.guessTitle, L.guessSub],
    talk: [L.talkTitle, L.talkSub],
    move: [L.moveTitle, L.moveSub],
    hunt: [L.huntTitle, L.huntSub],
    dusk: [L.duskTitle, L.duskSub],
    final: [L.finalTitle, L.finalTitle],
    intro: [L.tutorial, L.tutorial],
  } satisfies Record<Phase, [I18nText, I18nText]>)[view.phase];
  const final = view.final;
  const subline = final
    ? `${final.winners.length} ${t(L.winnersN)} · ${final.deadCount} ${t(L.deadN)}`
    : t(sub);
  const timed = view.phase !== 'dusk' && view.phase !== 'final';

  let body: ReactNode;
  if (view.phase === 'hunt') {
    body = <AreaBoard view={view} players={players} kit={kit} t={t} />;
  } else if (view.phase === 'dusk') {
    const now = view.dead.filter((d) => d.round === view.round);
    body = now.length ? (
      <div className="cag-deaths">
        {now.map((d, i) => {
          const p = players.find((x) => x.id === d.id);
          return (
            <div key={d.id} className="cag-death" style={{ animationDelay: `${2300 + i * 450}ms` }}>
              {p && <kit.Avatar emoji={p.avatar} size="5em" crimson />}
              <span className="cag-death-name">{p?.name}</span>
              <span className="cag-big" style={{ display: 'flex', gap: '.4em', alignItems: 'center', fontSize: '1.5em' }}>
                <AnimalIcon animal={d.animal} size="2em" /> {t(ANIMALS[d.animal].name)}
              </span>
              <span className="cag-death-how">
                {d.cause === 'starved' ? t(L.starved) : t(L.eatenIn)} · <AreaIcon area={d.area} size="1.2em" />{' '}
                {t(AREA_NAME[d.area])}
              </span>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="cag-none">{t(L.duskNone)}</p>
    );
  } else if (final) {
    body = (
      <div>
        <div className="cag-finals">
          {players.map((p, i) => {
            const won = final.winners.includes(p.id);
            const animal = final.animals[p.id]!;
            const d = deadOf(p.id);
            return (
              <div key={p.id} className="cag-fcard" data-won={won} style={{ animationDelay: `${2300 + i * 120}ms` }}>
                <kit.Avatar emoji={p.avatar} size="3.6em" active={won} />
                <span className="cag-seat-name">{p.name}</span>
                <span className="cag-fanimal">
                  <AnimalIcon animal={animal} size="1.8em" /> {t(ANIMALS[animal].name)}
                </span>
                {d && <span className="cag-fdead">✕ R{d.round}</span>}
                <span className="cag-fstatus">{t(won ? L.won : L.lost)}</span>
              </div>
            );
          })}
        </div>
        <p className="cag-crowline">
          {final.crowGuess ? `${t(L.crowBet)} ${nameOf(players, final.crowGuess)}.` : t(L.crowNone)}
        </p>
      </div>
    );
  } else {
    const shown = view.phase === 'move' ? players.filter((p) => !deadOf(p.id)) : players;
    const graveyard = view.phase === 'move' ? players.filter((p) => deadOf(p.id)) : [];
    body = (
      <div className="cag-body">
        <Pyramid t={t} dead={deadAnimals} />
        <div style={{ display: 'grid', gap: '1.6em', alignContent: 'center' }}>
          <div className="cag-seats">
            {shown.map((p) => {
              const acted = view.acted.includes(p.id);
              const d = deadOf(p.id);
              return (
                <SeatView
                  key={p.id}
                  p={p}
                  kit={kit}
                  dead={d}
                  active={acted}
                  badge={acted ? '✓' : undefined}
                />
              );
            })}
          </div>
          {graveyard.length > 0 && (
            <div className="cag-seats" style={{ fontSize: '.75em', opacity: 0.8 }}>
              {graveyard.map((p) => (
                <SeatView key={p.id} p={p} kit={kit} dead={deadOf(p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cag-wrap">
      <Styles />
      <header className="cag-head mp-enter" key={`${view.phase}-${view.round}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {opening ? `${t(L.opening)} · ${step}/3` : `${t(L.round)} ${view.round}/${view.rounds}`}
          </span>
          <h1 className="cag-h1">{t(title)}</h1>
          <p className="cag-sub">{subline}</p>
        </div>
        {timed && <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />}
      </header>
      {body}
      {rulesOverlay}
    </div>
  );
}

/** The four areas with whoever went there (living at the start of the hunt). */
function AreaBoard({ view, players, kit, t }: { view: PublicView; players: Seat[]; kit: Kit; t: T }) {
  const board = view.board!;
  return (
    <div className="cag-areas">
      {AREAS.map((a) => (
        <section key={a} className="cag-area" style={{ boxShadow: `0 0 0 1px ${AREA_TONE[a]}55 inset` }}>
          <div className="cag-area-head" style={{ color: AREA_TONE[a] }}>
            <AreaIcon area={a} size="1.5em" /> {t(AREA_NAME[a])}
            <span className="cag-area-count">{board[a].length}</span>
          </div>
          {board[a].length ? (
            <div className="cag-area-seats" style={{ fontSize: board[a].length > 8 ? '.72em' : '1em' }}>
              {board[a].map((id) => {
                const p = players.find((x) => x.id === id);
                return p ? <SeatView key={id} p={p} kit={kit} size="3.8em" /> : null;
              })}
            </div>
          ) : (
            <p className="cag-empty">{t(L.nobodyHere)}</p>
          )}
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/** The player's secret card: hidden until tapped, hides itself again after a few seconds. */
function SecretCard({ view, t, players }: { view: PlayerView; t: T; players: Seat[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), 8000);
    return () => clearTimeout(id);
  }, [open]);
  const a = ANIMALS[view.animal];
  const starve = starveText(a.starve);
  return (
    <button
      type="button"
      className="cag-card"
      aria-label={t(open ? L.hideIt : L.tapToSee)}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      {!open ? (
        <div className="cag-card-back">
          <span style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)' }}>✦</span>
          <span>{t(L.tapToSee)}</span>
        </div>
      ) : (
        <div className="cag-card-front">
          <div className="cag-me">
            <AnimalIcon animal={view.animal} size={64} />
            <div>
              <small>
                {a.level <= 4 ? `${t(L.level)} ${a.level}` : t(L.bottom)} · {t(L.habitat)} {t(AREA_NAME[a.habitat])}
              </small>
              <h3>{t(a.name)}</h3>
            </div>
          </div>
          <div className="cag-facts">
            {!view.alive && (
              <div>
                <b style={{ color: 'var(--crimson-hi)' }}>{t(L.youDied)}</b>
              </div>
            )}
            <div>
              <b>{t(L.goal)}:</b> {t(GOAL_TEXT[a.goal])}
            </div>
            {view.phase === 'peek' && (
              <div>
                <b>{t(L.peeksLeft)}:</b> {view.peekCount}
              </div>
            )}
            {a.forbidden.length > 0 && (
              <div>
                {t(L.cantGo)} {a.forbidden.map((f) => t(AREA_NAME[f])).join(', ')}.
              </div>
            )}
            {starve && (
              <div>
                <b>{t(L.hunger)} {view.hunger}/{a.starve}:</b> {t(starve)}
              </div>
            )}
            {a.special && <div>{rich(t(a.special))}</div>}
          </div>
          {(view.disguise || view.peeks || view.guess) && (
            <div className="cag-secret">
              {view.disguise && (
                <div className="cag-secret-line">
                  <b>{t(L.disguise)}:</b> <AnimalIcon animal={view.disguise} size={22} /> {t(ANIMALS[view.disguise].name)}
                </div>
              )}
              {view.peeks?.map((p) => (
                <div key={p.target} className="cag-secret-line">
                  <b>{t(L.youPeeked)}:</b> {nameOf(players, p.target)} → <AnimalIcon animal={p.shown} size={22} />{' '}
                  {t(ANIMALS[p.shown].name)}
                </div>
              ))}
              {view.guess && (
                <div className="cag-secret-line">
                  <b>{t(L.yourGuess)}:</b> {nameOf(players, view.guess)}
                </div>
              )}
            </div>
          )}
          {view.sightings.length > 0 && (
            <div className="cag-secret">
              <b>{t(L.witnessed)}</b>
              <Feed view={view} t={t} players={players} />
            </div>
          )}
          <span className="cag-hint">{t(L.hideIt)}</span>
        </div>
      )}
    </button>
  );
}

function Feed({ view, t, players, round }: { view: PlayerView; t: T; players: Seat[]; round?: number }) {
  const list = view.sightings.filter((s) => round === undefined || s.round === round);
  return (
    <div className="cag-feed">
      {list.map((s, i) => (
        <div key={i}>
          <span style={{ color: 'var(--text-mute)' }}>R{s.round}</span>
          {s.kind === 'eaten' ? (
            <>
              <b>{nameOf(players, s.by)}</b> {t(L.ate)} <b>{nameOf(players, s.victim)}</b> (
              <AnimalIcon animal={s.victimAnimal} size={18} /> {t(ANIMALS[s.victimAnimal].name)})
            </>
          ) : (
            <>
              <b>{nameOf(players, s.victim)}</b> (<AnimalIcon animal={s.victimAnimal} size={18} />{' '}
              {t(ANIMALS[s.victimAnimal].name)}) {t(L.diedOn)} <b>{nameOf(players, s.by)}</b>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel, Avatar } = kit;
  const [rules, setRules] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const [optimistic, setOptimistic] = useState<string | null>(null);
  useEffect(() => {
    setPick([]);
    setOptimistic(null);
  }, [view?.phase, view?.round]);
  useEffect(() => setOptimistic(null), [view?.guess, view?.myMove, view?.disguise, view?.ready]);
  if (!view) return null;
  const isHost = you.isAdmin;
  const me = you.you;
  const players = platform.players.filter((p) => !p.spectator);
  const others = players.filter((p) => p.id !== me);
  const a = ANIMALS[view.animal];

  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );
  const timer = view.deadline !== null && (
    <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
  );
  const shell = (...children: ReactNode[]) => (
    <div className="stack cag-p">
      <Styles />
      {children}
      {rulesButton}
      {reader}
    </div>
  );
  const card = <SecretCard key="card" view={view} t={t} players={players} />;
  const head = (text: I18nText) => (
    <Panel key="head" className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
      {timer}
      <p className="cag-note">{t(text)}</p>
    </Panel>
  );
  const playerButton = (p: Seat, pressed: boolean, onClick: () => void, extra?: ReactNode, tried?: boolean) => (
    <button
      key={p.id}
      type="button"
      className="cag-opt"
      aria-pressed={pressed}
      aria-label={p.name}
      data-tried={tried}
      onClick={onClick}
    >
      <Avatar emoji={p.avatar} size={36} offline={!p.connected} />
      <span className="cag-opt-name">{p.name}</span>
      {extra}
    </button>
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return shell(
      <Panel key="intro" className="stack" style={{ textAlign: 'center' }}>
        <span className="mp-eyebrow">
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
        {!isHost && <p className="cag-note">{t(L.followTv)}</p>}
      </Panel>,
      isHost && (
        <div key="nav" className="cag-row">
          <Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
            ‹ {t(L.prev)}
          </Button>
          <Button onClick={() => send({ type: 'intro', dir: 1 })}>{last ? t(L.start) : `${t(L.next)} ›`}</Button>
        </div>
      ),
      isHost && !last && (
        <Button key="skip" block small variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
          {t(L.skip)}
        </Button>
      ),
    );
  }

  if (view.phase === 'role') {
    // The Chameleon's screen looks like everyone's (a Ready button) until it taps it.
    if (view.animal === 'chameleon' && optimistic === 'pick' && !view.ready) {
      const chosen = view.disguise;
      return shell(
        head(L.pickDisguise),
        card,
        <div key="grid" className="cag-grid">
          {ANIMAL_LIST.filter((x) => x !== 'chameleon').map((x) => (
            <button
              key={x}
              type="button"
              className="cag-opt"
              aria-pressed={chosen === x}
              aria-label={t(ANIMALS[x].name)}
              onClick={() => {
                setOptimistic('ready');
                send({ type: 'disguise', animal: x });
              }}
            >
              <span className="cag-opt-icon">
                <AnimalIcon animal={x} size={34} />
              </span>
              <span className="cag-opt-name">{t(ANIMALS[x].name)}</span>
            </button>
          ))}
        </div>,
      );
    }
    const ready = view.ready || optimistic === 'ready';
    return shell(
      head(ready ? L.waiting : L.roleSub),
      card,
      <Button
        key="ready"
        block
        disabled={ready}
        onClick={() => {
          if (view.animal === 'chameleon') return setOptimistic('pick');
          setOptimistic('ready');
          send({ type: 'ready' });
        }}
      >
        {t(L.ready)}
      </Button>,
    );
  }

  if (view.phase === 'peek') {
    if (view.peeks) return shell(head(L.peekDone), card);
    const n = view.peekCount;
    return shell(
      head(L.pickPeek),
      card,
      <div key="grid" className="cag-grid">
        {others.map((p) =>
          playerButton(p, pick.includes(p.id), () =>
            setPick(pick.includes(p.id) ? pick.filter((x) => x !== p.id) : [...pick, p.id].slice(-n)),
          ),
        )}
      </div>,
      <Button key="go" block disabled={pick.length !== n} onClick={() => send({ type: 'peek', targets: pick })}>
        {t(L.peek)}
      </Button>,
    );
  }

  if (view.phase === 'guess') {
    const chosen = optimistic ?? view.guess;
    return shell(
      head(chosen ? L.guessSaved : L.pickGuess),
      <div key="grid" className="cag-grid">
        {others.map((p) =>
          playerButton(p, chosen === p.id, () => {
            setOptimistic(p.id);
            send({ type: 'guess', target: p.id });
          }),
        )}
      </div>,
      card,
    );
  }

  if (view.phase === 'final') {
    return shell(
      <Panel key="res" className="stack" style={{ textAlign: 'center' }}>
        <p className="cag-result" style={{ color: view.won ? 'var(--gold-hi)' : 'var(--text-dim)' }}>
          {t(view.won ? L.youWon : L.youLost)}
        </p>
        <p className="cag-note">{t(L.watch)}</p>
      </Panel>,
      card,
      isHost && (
        <Button key="end" block onClick={() => send({ type: 'finish' })}>
          {t(L.seeScores)}
        </Button>
      ),
    );
  }

  // During the hunt a dead phone looks like a waiting one: the TV reveals the death at dusk.
  if (!view.alive && view.phase === 'hunt') return shell(head(L.watch), card);

  if (!view.alive) {
    const mine = view.sightings.find((s) => s.victim === me);
    return shell(
      <Panel key="dead" className="stack" style={{ textAlign: 'center' }}>
        <p className="cag-result" style={{ color: 'var(--crimson-hi)' }}>
          {t(L.youDied)}
        </p>
        <p className="cag-note">
          {mine
            ? `${t(mine.kind === 'eaten' ? L.eatenBy : L.killedBy)} ${nameOf(players, mine.by)}`
            : t(L.starvedYou)}
        </p>
        <p className="cag-note" style={{ fontSize: '1rem' }}>
          {a.winsDead ? `${t(L.stillWin)} ${t(GOAL_TEXT[a.goal])}` : t(L.noWin)}
        </p>
      </Panel>,
      card,
    );
  }

  if (view.phase === 'move') {
    const chosen = optimistic ?? view.myMove;
    return shell(
      head(chosen ? L.areaSaved : L.pickArea),
      <div key="areas" className="cag-grid4">
        {AREAS.map((x) => {
          const ok = view.moveOptions.includes(x);
          return (
            <button
              key={x}
              type="button"
              className="cag-opt"
              style={{ minHeight: 92 }}
              aria-pressed={chosen === x}
              aria-disabled={!ok}
              aria-label={t(AREA_NAME[x])}
              onClick={() => {
                if (!ok) return;
                setOptimistic(x);
                send({ type: 'move', area: x });
              }}
            >
              <span style={{ color: AREA_TONE[x] }}>
                <AreaIcon area={x} size={36} />
              </span>
              <span className="cag-opt-name" style={{ fontSize: '1rem' }}>
                {t(AREA_NAME[x])}
              </span>
              {!ok && <small>{t(a.forbidden.includes(x) ? L.forbidden : L.mustReturn)}</small>}
            </button>
          );
        })}
      </div>,
      card,
    );
  }

  if (view.phase === 'hunt') {
    const target = pick[0] && view.targets.includes(pick[0]) ? pick[0] : null;
    const area = view.myArea!;
    const here = view.sightings.filter((s) => s.round === view.round);
    return shell(
      <Panel key="head" className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {timer}
        <div className="cag-area-big" style={{ color: AREA_TONE[area] }}>
          <AreaIcon area={area} size={30} /> {t(AREA_NAME[area])}
        </div>
        <p className="cag-note">{t(view.targets.length ? L.tapTarget : L.alone)}</p>
      </Panel>,
      view.targets.length > 0 && (
        <div key="grid" className="cag-grid">
          {view.targets.map((id) => {
            const p = players.find((x) => x.id === id);
            if (!p) return null;
            const tried = view.attempts.includes(id);
            return playerButton(
              p,
              target === id,
              () => setPick(target === id ? [] : [id]),
              tried ? <small>{t(L.tried)}</small> : undefined,
              tried,
            );
          })}
        </div>
      ),
      view.targets.length > 0 && (
        <Button
          key="attack"
          block
          variant="crimson"
          disabled={!target}
          onClick={() => {
            if (!target) return;
            send({ type: 'attack', target });
            setPick([]);
          }}
        >
          🗡 {t(L.attack)} {target ? nameOf(players, target) : ''}
        </Button>
      ),
      here.length > 0 && (
        <Panel key="feed" className="stack">
          <span className="mp-eyebrow">{t(L.thisArea)}</span>
          <Feed view={view} t={t} players={players} round={view.round} />
        </Panel>
      ),
      card,
    );
  }

  // talk, dusk
  return shell(head(view.phase === 'talk' ? L.talkPhone : L.watch), card);
}

export default defineGameUI({ Display, Player });
