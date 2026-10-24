import { useEffect, useRef, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { Guess, PlayerView, PublicView } from './logic.ts';
import { LEAD_MS, MAX_GUESS } from './shared.ts';
import { CREDITS, RULES, SLIDES, type Demo } from './texts.ts';

// Only `react`, `@mp/game-sdk` and the secret-free `shared.ts` and `texts.ts` are imported here. Platform
// components come in through `kit`, text goes through `t()`, and styles use the `dg-` prefix.

const L = {
  gameName: { 'pt-BR': 'Duvido!', en: 'I Doubt It!' },
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  upTo: { 'pt-BR': 'até {n} cartas', en: 'up to {n} cards' },
  answerIn: { 'pt-BR': 'responda em {unit}', en: 'answer in {unit}' },
  categoryTitle: { 'pt-BR': 'Categoria', en: 'Category' },
  categorySub: {
    'pt-BR': '{name} escolhe a categoria da rodada',
    en: '{name} picks the round category',
  },
  openSub: {
    'pt-BR': '{name} abre: um número que acha ser menor ou igual à resposta',
    en: '{name} opens: a number they think is at most the answer',
  },
  turnSub: {
    'pt-BR': 'Vez de {name}: mais que {n} ou DUVIDO!',
    en: '{name}’s turn: more than {n} or I DOUBT IT!',
  },
  revealSub: { 'pt-BR': '{a} duvidou de {b}', en: '{a} doubted {b}' },
  revealAuto: {
    'pt-BR': 'O tempo de {a} acabou: duvidou de {b}',
    en: '{a} ran out of time: doubted {b}',
  },
  answer: { 'pt-BR': 'Resposta', en: 'Answer' },
  takes: { 'pt-BR': '{name} leva a carta', en: '{name} takes the card' },
  overshot: { 'pt-BR': '{n} passou da resposta', en: '{n} is over the answer' },
  held: {
    'pt-BR': '{n} não passou da resposta',
    en: '{n} is not over the answer',
  },
  chip: { 'pt-BR': 'Dobrei! +1 ficha', en: 'Doubled! +1 chip' },
  doubled: { 'pt-BR': 'dobrei', en: 'doubled' },
  starter: { 'pt-BR': 'Abre a rodada', en: 'Opens the round' },
  cards: { 'pt-BR': 'cartas', en: 'cards' },
  // phone
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  pickCategory: { 'pt-BR': 'Escolha a categoria', en: 'Pick the category' },
  waitCategory: {
    'pt-BR': '{name} está escolhendo a categoria…',
    en: '{name} is picking the category…',
  },
  yourTurn: { 'pt-BR': 'Sua vez!', en: 'Your turn!' },
  openHint: {
    'pt-BR': 'Dê um número que você acha que é menor ou igual à resposta.',
    en: 'Give a number you think is at most the answer.',
  },
  last: { 'pt-BR': 'Último palpite', en: 'Last guess' },
  by: { 'pt-BR': 'de {name}', en: 'by {name}' },
  minHint: { 'pt-BR': 'Mínimo {n}', en: 'At least {n}' },
  dobreiHint: {
    'pt-BR': '{n} ou mais vale uma ficha Dobrei!',
    en: '{n} or more earns a Doubled! chip',
  },
  send: { 'pt-BR': 'Palpitar', en: 'Guess' },
  doubt: { 'pt-BR': 'DUVIDO!', en: 'I DOUBT IT!' },
  clear: { 'pt-BR': 'Limpar', en: 'Clear' },
  erase: { 'pt-BR': 'Apagar', en: 'Delete' },
  waitTurn: { 'pt-BR': 'Vez de {name}', en: '{name}’s turn' },
  sent: { 'pt-BR': 'Enviado…', en: 'Sent…' },
  youTake: { 'pt-BR': 'Você leva a carta', en: 'You take the card' },
  safe: { 'pt-BR': 'Você escapou desta', en: 'You got away with it' },
  yourCards: { 'pt-BR': 'Suas cartas', en: 'Your cards' },
  yourChips: { 'pt-BR': 'Fichas Dobrei', en: 'Doubled chips' },
  // first-round hints (tutorial on)
  hintCategory: {
    'pt-BR': 'Dica: quem abre toca numa categoria no celular — escolha uma que você conhece.',
    en: 'Tip: the opener taps a category on their phone — pick one you know.',
  },
  hintOpen: {
    'pt-BR': 'Dica: abra com um número que você tem certeza que não passa da resposta.',
    en: 'Tip: open with a number you are sure is not over the answer.',
  },
  hintRaise: {
    'pt-BR': 'Dica: acha que já passou da resposta? DUVIDO! Senão, palpite um número maior.',
    en: 'Tip: think it is already over the answer? I DOUBT IT! Otherwise, guess higher.',
  },
  // tutorial and rules
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
  demoQuestion: { 'pt-BR': 'Ano de lançamento de Tetris', en: 'Year Tetris was released' },
  demoUnit: { 'pt-BR': 'ano', en: 'year' },
} satisfies Record<string, I18nText>;

type T = (text: I18nText) => string;

/** Category names for the tutorial demo (the real bank lives in the logic only). */
const DEMO_CATEGORIES: I18nText[] = [
  { 'pt-BR': 'Filmes', en: 'Movies' },
  { 'pt-BR': 'Natureza', en: 'Nature' },
  { 'pt-BR': 'Futebol', en: 'Soccer' },
  { 'pt-BR': 'Música', en: 'Music' },
  { 'pt-BR': 'Videogames', en: 'Video games' },
];

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const fmt = (n: number, lang: string) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR').format(n);

const CSS = `
.dg-tv{height:100vh;box-sizing:border-box;padding:2em 3.2em 5.2em;display:grid;grid-template-rows:auto 1fr auto;gap:1em;overflow:hidden}
.dg-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:2em}
.dg-brand{min-width:0}
.dg-h1{font-family:var(--font-display);font-weight:900;font-size:3.6em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.dg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.6em;color:var(--text-dim);margin:.2em 0 0}
.dg-round{display:grid;justify-items:center;gap:.3em;padding-top:.8em;text-align:center}
.dg-round b{font-family:var(--font-display);font-size:1.8em;letter-spacing:.12em;text-transform:uppercase;color:var(--text)}
.dg-round span{font-size:1.1em;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.dg-timer{justify-self:end}
.dg-main{display:grid;align-content:center;min-height:0;overflow:hidden;container-type:size}
/* Shrinks the whole centre column when the screen is short, so it never runs under the turn tape. */
.dg-fit{display:grid;justify-items:center;gap:.4em;text-align:center;font-size:min(1em,calc(100cqh / 23))}
.dg-q{margin:0;max-width:60em;font-family:var(--font-display);font-size:2.3em;line-height:1.2;padding-top:.05em;color:var(--text)}
.dg-in{font-size:1.2em;color:var(--text-dim);margin:0 0 .3em}
.dg-in b{color:var(--gold);font-weight:600}
.dg-num{font-family:var(--font-display);font-weight:900;font-size:6.5em;line-height:1;color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.3);animation:dg-pop .5s var(--ease-out) both}
.dg-unit{font-size:1.4em;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.dg-by{display:flex;align-items:center;gap:.5em;font-size:1.3em;color:var(--text-dim)}
.dg-label{font-size:1em;letter-spacing:.24em;text-transform:uppercase;color:var(--text-dim)}
.dg-num.dg-answer{font-size:5.2em}
.dg-answer{animation:dg-flip .7s var(--ease-out) both;text-shadow:0 0 .5em rgba(212,175,55,.45)}
.dg-late{animation:dg-rise .6s var(--ease-out) both}
.dg-verdict{display:grid;justify-items:center;gap:.1em;margin-top:.2em}
.dg-verdict p{margin:0;font-size:1.15em;color:var(--text-dim)}
.dg-verdict h3{margin:0;display:flex;align-items:center;gap:.5em;font-family:var(--font-display);font-size:1.9em;color:var(--crimson-hi)}
.dg-chipline{font-size:1.2em;color:var(--gold)}
.dg-wait{font-family:var(--font-serif);font-style:italic;font-size:2em;color:var(--text-mute)}
.dg-opts{display:flex;gap:1.2em;justify-content:center;flex-wrap:wrap;max-width:70em;margin-top:1em}
.dg-opt{min-width:11em;padding:1em 1.5em;border-radius:var(--radius-lg);font-family:var(--font-display);font-size:1.6em;color:var(--gold-hi);
  background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line-strong) inset;animation:dg-rise .6s var(--ease-out) both}
.dg-tape{position:relative;height:8.4em;overflow:hidden}
.dg-tape.fade{-webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.dg-cell{position:absolute;left:50%;bottom:0;width:9em;margin-left:-4.5em;display:flex;align-items:flex-end;justify-content:center;transition:transform .7s var(--ease-out);animation:dg-fade .7s var(--ease-out) both}
.dg-arrow{position:absolute;left:-.5em;bottom:3.2em;font-size:1.4em;color:var(--gold-lo);line-height:1}
.dg-seat{display:grid;justify-items:center;gap:.2em;width:7.6em;text-align:center;transition:transform .3s var(--ease-out)}
.dg-seat b{font-size:1.1em;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dg-seat.on b{color:var(--gold-hi)}
.dg-seat small{display:flex;gap:.6em;font-size:1em;color:var(--text-dim)}
.dg-seat small span{font-family:var(--font-display);color:var(--text)}
.dg-seat small .lost{color:var(--crimson-hi)}
.dg-seat .dg-said{font-style:normal;font-family:var(--font-display);color:var(--gold)}
.dg-tv.many .dg-h1{font-size:3em}
.dg-hintbar{margin:0 0 .4em;padding:.35em 1em;border-radius:999px;font-size:1.15em;color:var(--gold-hi);background:rgba(212,175,55,.08);box-shadow:0 0 0 1px var(--gold-lo) inset}
.dg-opt.pick{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
/* Tutorial slide (TV) */
.dg-slide{height:100vh;box-sizing:border-box;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em 5.5em}
.dg-slide p{font-size:1.6em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.dg-slide b,.dg-rules b,.dg-tvrules b{color:var(--gold-hi);font-weight:600}
.dg-credit{font-family:var(--font-serif);font-style:italic;color:var(--text-dim)}
.dg-slide .dg-credit{font-size:1.2em}
.dg-cardicon{color:var(--crimson-hi)}
.dg-dots{display:flex;gap:.6em;margin-top:1.5em}
.dg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.dg-dots span[data-on='true']{background:var(--gold)}
.dg-demo{display:grid;justify-items:center;gap:.6em;text-align:center}
.dg-demostrip{display:flex;align-items:flex-end;justify-content:center;gap:1em;font-size:1.5em}
.dg-demoarrow{align-self:center;font-size:1.6em;color:var(--gold-lo)}
/* Rules overlay (TV) and reader (phone) */
.dg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.dg-tvrules .mp-panel{width:min(62em,90vw);padding:2.2em 3em}
.dg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .5em;color:var(--gold-hi)}
.dg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.dg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.dg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.dg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.dg-rules p{margin:0;line-height:1.5}
.dg-row{display:flex;gap:8px}
.dg-row > *{flex:1}
@keyframes dg-pop{from{opacity:0;transform:scale(.5)}}
@keyframes dg-fade{from{opacity:0}}
@keyframes dg-rise{from{opacity:0;transform:translateY(.6em)}}
@keyframes dg-flip{from{opacity:0;transform:rotateX(90deg) scale(.6)}}

.dg-ph{display:grid;gap:14px}
.dg-pq{display:grid;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset}
.dg-pq small{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute)}
.dg-pq p{margin:0;font-size:1.05rem;line-height:1.3}
.dg-pq em{font-style:normal;font-size:.85rem;color:var(--gold)}
.dg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.dg-big{font-family:var(--font-display);font-weight:900;font-size:2.6rem;line-height:1;color:var(--gold-hi);text-align:center;margin:0}
.dg-cat{min-height:56px;border:0;border-radius:14px;font-family:var(--font-display);font-size:1.2rem;color:var(--gold-hi);cursor:pointer;
  background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line-strong) inset}
.dg-cat[aria-pressed=true]{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520)}
.dg-last{display:flex;align-items:baseline;justify-content:space-between;gap:8px;color:var(--text-dim)}
.dg-last b{font-family:var(--font-display);font-size:1.4rem;color:var(--text)}
.dg-entry{min-height:64px;display:grid;place-items:center;border-radius:14px;font-family:var(--font-display);font-weight:900;font-size:2.2rem;color:var(--gold-hi);
  background:#0b0907;box-shadow:0 0 0 1px var(--line-strong) inset;overflow:hidden;white-space:nowrap}
.dg-entry.bad{color:var(--crimson-hi)}
.dg-entry.empty{color:var(--text-mute)}
.dg-keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dg-key{min-height:54px;border:0;border-radius:12px;font-family:var(--font-display);font-size:1.5rem;color:var(--text);cursor:pointer;
  background:rgba(255,255,255,.06);box-shadow:0 0 0 1px var(--line) inset}
.dg-key:active{transform:scale(.96)}
.dg-key.fn{font-family:var(--font-ui);font-size:.95rem;color:var(--text-dim)}
.dg-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dg-quick button{min-height:44px;border:0;border-radius:999px;font-weight:600;color:var(--gold);cursor:pointer;background:rgba(212,175,55,.08);box-shadow:0 0 0 1px var(--gold-lo) inset}
.dg-hint{font-size:.9rem;color:var(--text-mute);text-align:center;margin:0}
.dg-hint.gold{color:var(--gold)}
.dg-acts{display:grid;gap:10px}
.dg-tally{display:flex;justify-content:center;gap:24px;color:var(--text-dim);font-size:.95rem}
.dg-tally b{font-family:var(--font-display);font-size:1.3rem;color:var(--text);margin-left:6px}
.dg-res{text-align:center;display:grid;gap:6px}
.dg-res.lose .dg-big{color:var(--crimson-hi)}
`;

const Styles = () => <style>{CSS}</style>;

type Who = (id: string) => { name: string; avatar: string; connected: boolean };
function useWho(platform: DisplayProps['platform']): Who {
  return (id) => {
    const p = platform.players.find((x) => x.id === id);
    return {
      name: p?.name ?? '?',
      avatar: p?.avatar ?? '🂠',
      connected: p?.connected ?? false,
    };
  };
}

// ---------------------------------------------------------------------------
// Tutorial and rules (every game has both)
// ---------------------------------------------------------------------------

/** Renders **bold** and the {card} token inside a translated string. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{card\})/g).map((part, i) => {
    if (part === '{card}')
      return (
        <span key={i} className="dg-cardicon" aria-hidden>
          🂠
        </span>
      );
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    return part;
  });
}

type Kit = DisplayProps['kit'];

/** A seat as the turn strip draws it, for the tutorial demos. */
function DemoSeat({
  kit,
  emoji,
  name,
  big,
  on,
  lost,
  said,
  cards,
}: {
  kit: Kit;
  emoji: string;
  name: string;
  big?: boolean;
  on?: boolean;
  lost?: boolean;
  said?: string;
  cards?: number;
}) {
  return (
    <div className={`dg-seat ${on ? 'on' : ''}`}>
      <kit.Avatar emoji={emoji} size={big ? '4.6em' : '3.2em'} active={on} crimson={lost} />
      <b>{name}</b>
      <small>
        {said && <em className="dg-said">{said}</em>}
        {cards !== undefined && <span className={lost ? 'lost' : ''}>🂠 {cards}</span>}
      </small>
    </div>
  );
}

/** Live illustrations next to each slide, drawn with the game's real pieces. */
function SlideDemo({ demo, kit, t }: { demo: Demo; kit: Kit; t: T }) {
  if (demo === 'question') {
    return (
      <div className="dg-demo">
        <h2 className="dg-q" style={{ fontSize: '2em' }}>
          {t(L.demoQuestion)}
        </h2>
        <p className="dg-in">{fill(t(L.answerIn), { unit: t(L.demoUnit) })}</p>
        <span className="dg-num" style={{ opacity: 0.4 }}>
          ?
        </span>
      </div>
    );
  }
  if (demo === 'category') {
    return (
      <div className="dg-demo">
        <div className="dg-opts" style={{ marginTop: 0 }}>
          {DEMO_CATEGORIES.map((c, i) => (
            <div key={i} className={`dg-opt ${i === 1 ? 'pick' : ''}`} style={{ animationDelay: `${i * 90}ms` }}>
              {t(c)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (demo === 'raise') {
    return (
      <div className="dg-demo dg-demostrip">
        <DemoSeat kit={kit} emoji="🎩" name="Ana" said="12" />
        <span className="dg-demoarrow">➜</span>
        <DemoSeat kit={kit} emoji="🦊" name="Beto" said="30" />
        <span className="dg-demoarrow">➜</span>
        <DemoSeat kit={kit} emoji="🌙" name="Caio" big on />
        <span className="dg-demoarrow">↺</span>
      </div>
    );
  }
  if (demo === 'doubt') {
    return (
      <div className="dg-demo">
        <span className="dg-label">{t(L.answer)}</span>
        <span className="dg-num" style={{ fontSize: '5em' }}>
          64
        </span>
        <div className="dg-verdict" style={{ marginTop: '.4em' }}>
          <p>{fill(t(L.overshot), { n: 75 })}</p>
          <h3>
            <kit.Avatar emoji="🦊" size="1.3em" crimson />
            {fill(t(L.takes), { name: 'Beto' })}
          </h3>
        </div>
      </div>
    );
  }
  return (
    <div className="dg-demo dg-demostrip">
      <DemoSeat kit={kit} emoji="🎩" name="Ana" cards={0} />
      <DemoSeat kit={kit} emoji="🌙" name="Caio" cards={1} />
      <DemoSeat kit={kit} emoji="🦊" name="Beto" cards={3} lost big />
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: Kit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="dg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="dg-h1" style={{ fontSize: '3.6em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && <p className="dg-credit">{rich(t(CREDITS))}</p>}
        <div className="dg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="dg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
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
  const last = page === RULES.length - 1;
  return (
    <div className="dg-tvrules">
      <kit.Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {last && CREDITS && <p className="dg-credit">{rich(t(CREDITS))}</p>}
      </kit.Panel>
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
    <div className="dg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="dg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {last && CREDITS && (
          <p>
            <b>{t(L.credits)}</b> — {rich(t(CREDITS))}
          </p>
        )}
        <div className="dg-row">
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

/** The Host's controls for the tutorial; everyone else is pointed at the TV. */
function IntroControls({
  view,
  kit,
  t,
  send,
  isHost,
}: {
  view: PlayerView;
  kit: PlayerProps['kit'];
  t: T;
  send(a: unknown): void;
  isHost: boolean;
}) {
  const { Button, Panel } = kit;
  const last = view.slide === view.slides - 1;
  return (
    <>
      <Panel className="stack" style={{ textAlign: 'center' }}>
        <span className="mp-eyebrow">
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
        {!isHost && <p className="dg-note">{t(L.followTv)}</p>}
      </Panel>
      {isHost && (
        <>
          <div className="dg-row">
            <Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
              ‹ {t(L.prev)}
            </Button>
            <Button onClick={() => send({ type: 'intro', dir: 1 })}>{last ? t(L.start) : `${t(L.next)} ›`}</Button>
          </div>
          {!last && (
            <Button block small variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
              {t(L.skip)}
            </Button>
          )}
        </>
      )}
    </>
  );
}

const CELL_EM = 9;

/** Position on the endless turn tape: grows by the seats advanced, so slots slide forward and wrap. */
function useTape(seats: string[], turn: string) {
  const at = Math.max(0, seats.indexOf(turn));
  const ref = useRef({ pos: at, idx: at });
  if (at !== ref.current.idx) {
    const n = seats.length;
    ref.current = { pos: ref.current.pos + ((at - ref.current.idx + n) % n), idx: at };
  }
  return ref.current;
}

function Display({ view, kit, t, lang, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const who = useWho(platform);
  const last = view.guesses.at(-1) ?? null;
  const r = view.result;
  const now = kit.useRoomNow();
  const n = view.seats.length;
  const many = n > 8;
  // Turn order as an endless tape: the player on turn sits in the middle, neighbours on each side.
  const reach = Math.min(4, Math.floor(n / 2));
  const tape = useTape(view.seats, view.turn);
  // The answer lands on the room clock (same instant as the phones), fixed once per reveal.
  const delay = useRef({ round: -1, ms: LEAD_MS });
  if (r && delay.current.round !== view.round) {
    const at = view.deadline !== null && view.total !== null ? view.deadline - view.total + LEAD_MS : now + LEAD_MS;
    delay.current = { round: view.round, ms: Math.max(0, at - now) };
  }
  const revealDelay = delay.current.ms;
  // The seat strip keeps the old tally until the answer lands, so it does not spoil the drumroll.
  const landed = !r || view.deadline === null || view.total === null || now >= view.deadline - view.total + LEAD_MS;
  const shownCards = (id: string) => (view.cards[id] ?? 0) - (!landed && r?.loser === id ? 1 : 0);
  const shownChips = (id: string) =>
    (view.chips[id] ?? 0) - (!landed && r ? r.chips.filter((c) => c === id).length : 0);
  // Each player's latest guess this round, shown under their seat.
  const said: Record<string, Guess> = {};
  for (const g of view.guesses) said[g.by] = g;

  let sub = '';
  if (view.phase === 'category') sub = fill(t(L.categorySub), { name: who(view.turn).name });
  else if (view.phase === 'guess')
    sub = last
      ? fill(t(L.turnSub), { name: who(view.turn).name, n: fmt(last.value, lang) })
      : fill(t(L.openSub), { name: who(view.turn).name });
  else if (r) sub = fill(t(r.auto ? L.revealAuto : L.revealSub), { a: who(r.doubter).name, b: who(r.guesser).name });

  const unit = view.question ? t(view.question.unit) : '';
  const rulesOverlay = view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />;
  const hintText =
    view.hint === 'category'
      ? L.hintCategory
      : view.hint === 'open'
        ? L.hintOpen
        : view.hint === 'raise'
          ? L.hintRaise
          : null;

  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} kit={kit} t={t} />
        {rulesOverlay}
      </>
    );
  }

  return (
    <div className={`dg-tv ${many ? 'many' : ''}`}>
      <Styles />
      <header className="dg-head">
        <div className="dg-brand">
          <h1 className="dg-h1">{t(L.gameName)}</h1>
          <p className="dg-sub mp-enter" key={sub}>
            {sub}
          </p>
        </div>
        <div className="dg-round">
          <b>
            {t(L.round)} {view.round}
            {view.rounds !== null ? `/${view.rounds}` : ''}
          </b>
          {view.cardLimit !== null && <span>{fill(t(L.upTo), { n: view.cardLimit })}</span>}
          {view.category && <span>{t(view.category)}</span>}
        </div>
        <div className="dg-timer">
          {view.deadline !== null && (
            <Countdown deadline={view.deadline} total={view.total ?? 0} size="6em" paused={!!platform.paused} />
          )}
        </div>
      </header>

      <main className="dg-main">
        <div className="dg-fit">
          {hintText && (
            <p className="dg-hintbar mp-enter" key={view.hint}>
              {t(hintText)}
            </p>
          )}
          {view.phase === 'category' && (
            <>
              <h2 className="dg-q">{t(L.categoryTitle)}</h2>
              <div className="dg-opts">
                {view.options.map((o, i) => (
                  <div key={i} className="dg-opt" style={{ animationDelay: `${i * 90}ms` }}>
                    {t(o)}
                  </div>
                ))}
              </div>
            </>
          )}

          {view.question && (
            <>
              <h2 className="dg-q">{t(view.question.text)}</h2>
              <p className="dg-in">{fill(t(L.answerIn), { unit })}</p>
            </>
          )}

          {view.phase === 'guess' &&
            (last ? (
              <>
                <span className="dg-num" key={view.guesses.length}>
                  {fmt(last.value, lang)}
                </span>
                <span className="dg-unit">{unit}</span>
                <span className="dg-by">
                  <Avatar emoji={who(last.by).avatar} size="1.4em" />
                  {who(last.by).name}
                  {last.doubled && <span className="mp-chip">{t(L.doubled)} ×2</span>}
                </span>
              </>
            ) : (
              <span className="dg-wait">…</span>
            ))}

          {view.phase === 'reveal' && r && (
            <>
              <span className="dg-label">{t(L.answer)}</span>
              <span className="dg-num dg-answer" style={{ animationDelay: `${revealDelay}ms` }}>
                {fmt(r.answer, lang)}
              </span>
              <span className="dg-unit dg-late" style={{ animationDelay: `${revealDelay}ms` }}>
                {unit}
              </span>
              <div className="dg-verdict dg-late" style={{ animationDelay: `${revealDelay + 500}ms` }}>
                <p>{fill(t(r.guess > r.answer ? L.overshot : L.held), { n: fmt(r.guess, lang) })}</p>
                <h3>
                  <Avatar emoji={who(r.loser).avatar} size="1.3em" crimson />
                  {fill(t(L.takes), { name: who(r.loser).name })}
                </h3>
                {r.chips.length > 0 && (
                  <span className="dg-chipline">
                    {t(L.chip)}: {r.chips.map((id) => who(id).name).join(', ')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <div className={`dg-tape ${reach >= 3 ? 'fade' : ''}`}>
        {Array.from({ length: reach * 2 + 1 }, (_, k) => {
          // Slot on the endless tape; its key is its absolute position, so a new turn slides it.
          const v = tape.pos + k - reach;
          const id = view.seats[((v % n) + n) % n]!;
          const centre = v === tape.pos;
          const p = who(id);
          const on = centre && view.phase !== 'reveal';
          const lost = view.phase === 'reveal' && landed && r?.loser === id;
          const g = said[id];
          return (
            <div key={v} className="dg-cell" style={{ transform: `translateX(${(v - tape.pos) * CELL_EM}em)` }}>
              <span className="dg-arrow">➜</span>
              <div className={`dg-seat ${on ? 'on' : ''}`}>
                <Avatar
                  emoji={p.avatar}
                  size={centre ? '4.6em' : '3.2em'}
                  active={on}
                  crimson={lost}
                  offline={!p.connected}
                  badge={id === view.starter && view.phase !== 'reveal' ? '★' : undefined}
                  title={id === view.starter ? t(L.starter) : undefined}
                />
                <b>{p.name}</b>
                <small>
                  {g && <em className="dg-said">{fmt(g.value, lang)}</em>}
                  <span className={lost ? 'lost' : ''} title={t(L.cards)}>
                    🂠 {shownCards(id)}
                  </span>
                  {view.dobrei && <span>◎ {shownChips(id)}</span>}
                </small>
              </div>
            </div>
          );
        })}
      </div>
      {rulesOverlay}
    </div>
  );
}

function Player({ view, kit, t, lang, send, platform, you }: PlayerProps<PlayerView>) {
  const who = useWho(platform);
  const now = kit.useRoomNow();
  const [rules, setRules] = useState(false);
  if (!view) return null;
  const myId = you.you;
  const isHost = you.isAdmin;
  // The rules are one tap away in every phase.
  const rulesButton = (
    <kit.Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </kit.Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );

  if (view.phase === 'intro') {
    return (
      <div className="dg-ph">
        <Styles />
        <IntroControls view={view} kit={kit} t={t} send={send} isHost={isHost} />
        {rulesButton}
        {reader}
      </div>
    );
  }

  const last = view.guesses.at(-1) ?? null;
  const r = view.result;
  const landed = !r || view.deadline === null || view.total === null || now >= view.deadline - view.total + LEAD_MS;
  const myCards = (view.cards[myId] ?? 0) - (!landed && r?.loser === myId ? 1 : 0);
  const myChips = (view.chips[myId] ?? 0) - (!landed && r ? r.chips.filter((c) => c === myId).length : 0);

  return (
    <div className="dg-ph">
      <Styles />
      {view.question && (
        <div className="dg-pq">
          <small>
            {t(L.round)} {view.round}
            {view.rounds !== null ? `/${view.rounds}` : ''} · {view.category ? t(view.category) : ''}
          </small>
          <p>{t(view.question.text)}</p>
          <em>{t(view.question.unit)}</em>
        </div>
      )}

      {view.phase === 'category' &&
        (view.isTurn ? (
          <CategoryPicker view={view} t={t} send={send} />
        ) : (
          <kit.Panel>
            <p className="dg-note">{fill(t(L.waitCategory), { name: who(view.turn).name })}</p>
          </kit.Panel>
        ))}

      {view.phase === 'guess' &&
        (view.isTurn ? (
          <GuessPad view={view} t={t} lang={lang} send={send} kit={kit} platform={platform} who={who} />
        ) : (
          <kit.Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
            {last && (
              <>
                <span className="mp-eyebrow">{t(L.last)}</span>
                <p className="dg-big">{fmt(last.value, lang)}</p>
                <span className="dg-hint">{fill(t(L.by), { name: who(last.by).name })}</span>
              </>
            )}
            <p className="dg-note">{fill(t(L.waitTurn), { name: who(view.turn).name })}</p>
          </kit.Panel>
        ))}

      {view.phase === 'reveal' && (
        <RevealPanel
          view={view}
          myId={myId}
          loserName={view.result ? who(view.result.loser).name : ''}
          t={t}
          lang={lang}
          kit={kit}
        />
      )}

      <div className="dg-tally">
        <span>
          {t(L.yourCards)}
          <b>{myCards}</b>
        </span>
        {view.dobrei && (
          <span>
            {t(L.yourChips)}
            <b>{myChips}</b>
          </span>
        )}
      </div>
      {rulesButton}
      {reader}
    </div>
  );
}

function CategoryPicker({ view, t, send }: Pick<PlayerProps<PlayerView>, 'view' | 't' | 'send'>) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [view.round, view.phase]);
  return (
    <div className="dg-ph">
      <p className="dg-note">{t(L.pickCategory)}</p>
      {view.options.map((o, i) => (
        <button
          key={i}
          type="button"
          className="dg-cat"
          aria-pressed={picked === i}
          disabled={picked !== null}
          onClick={() => {
            setPicked(i);
            send({ type: 'category', index: i });
          }}
        >
          {t(o)}
        </button>
      ))}
    </div>
  );
}

const MAX_DIGITS = String(MAX_GUESS).length;

function GuessPad({
  view,
  t,
  lang,
  send,
  kit,
  platform,
  who,
}: Pick<PlayerProps<PlayerView>, 'view' | 't' | 'lang' | 'send' | 'kit' | 'platform'> & { who: Who }) {
  const [digits, setDigits] = useState('');
  const [sent, setSent] = useState(false);
  const turnKey = `${view.round}-${view.guesses.length}`;
  useEffect(() => {
    setDigits('');
    setSent(false);
  }, [turnKey]);

  const last = view.guesses.at(-1) ?? null;
  const value = digits === '' ? null : Number(digits);
  const ok = value !== null && value >= view.minGuess && value <= MAX_GUESS;
  const press = (d: string) => setDigits((s) => (s === '0' ? d : s + d).slice(0, MAX_DIGITS));
  const quick = (n: number) => setDigits(String(Math.min(MAX_GUESS, n)));

  return (
    <div className="dg-ph">
      {view.deadline !== null && (
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size={60} paused={!!platform.paused} />
        </div>
      )}
      <p className="dg-big" style={{ fontSize: '1.8rem' }}>
        {t(L.yourTurn)}
      </p>
      {last ? (
        <div className="dg-last">
          <span>
            {t(L.last)} · {who(last.by).name}
          </span>
          <b>{fmt(last.value, lang)}</b>
        </div>
      ) : (
        <p className="dg-hint">{t(L.openHint)}</p>
      )}
      <div className={`dg-entry ${value === null ? 'empty' : ok ? '' : 'bad'}`} aria-live="polite">
        {value === null ? fmt(view.minGuess, lang) : fmt(value, lang)}
      </div>
      <p className={`dg-hint ${view.doubleAt !== null && value !== null && value >= view.doubleAt ? 'gold' : ''}`}>
        {fill(t(L.minHint), { n: fmt(view.minGuess, lang) })}
        {view.doubleAt !== null && <> · {fill(t(L.dobreiHint), { n: fmt(view.doubleAt, lang) })}</>}
      </p>
      {last && (
        <div className="dg-quick">
          <button type="button" onClick={() => quick(last.value + 1)}>
            +1
          </button>
          <button type="button" onClick={() => quick(last.value + 10)}>
            +10
          </button>
          <button type="button" onClick={() => quick(Math.max(last.value * 2, last.value + 1))}>
            ×2
          </button>
        </div>
      )}
      <div className="dg-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="dg-key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="dg-key fn" onClick={() => setDigits('')}>
          {t(L.clear)}
        </button>
        <button type="button" className="dg-key" onClick={() => press('0')}>
          0
        </button>
        <button
          type="button"
          className="dg-key fn"
          aria-label={t(L.erase)}
          onClick={() => setDigits((s) => s.slice(0, -1))}
        >
          ⌫
        </button>
      </div>
      <div className="dg-acts">
        <kit.Button
          block
          disabled={!ok || sent}
          onClick={() => {
            if (!ok) return;
            setSent(true);
            send({ type: 'guess', value });
          }}
        >
          {sent ? t(L.sent) : `${t(L.send)}${value !== null && ok ? ` ${fmt(value, lang)}` : ''}`}
        </kit.Button>
        {view.canDoubt && (
          <kit.Button
            block
            variant="crimson"
            disabled={sent}
            onClick={() => {
              setSent(true);
              send({ type: 'doubt' });
            }}
          >
            {t(L.doubt)}
          </kit.Button>
        )}
      </div>
    </div>
  );
}

function RevealPanel({
  view,
  myId,
  loserName,
  t,
  lang,
  kit,
}: Pick<PlayerProps<PlayerView>, 'view' | 't' | 'lang' | 'kit'> & {
  myId: string;
  loserName: string;
}) {
  const now = kit.useRoomNow();
  const r = view.result;
  const showAt = view.deadline !== null && view.total !== null ? view.deadline - view.total + LEAD_MS : 0;
  if (!r || now < showAt) {
    return (
      <kit.Panel>
        <p className="dg-note">{t(L.watch)}</p>
      </kit.Panel>
    );
  }
  const lost = r.loser === myId;
  const involved = r.doubter === myId || r.guesser === myId;
  return (
    <kit.Panel className={`dg-res mp-enter ${lost ? 'lose' : ''}`}>
      <span className="mp-eyebrow">{t(L.answer)}</span>
      <p className="dg-big">{fmt(r.answer, lang)}</p>
      <p className="dg-note">{lost ? t(L.youTake) : involved ? t(L.safe) : fill(t(L.takes), { name: loserName })}</p>
      {r.chips.includes(myId) && <p className="dg-hint gold">{t(L.chip)}</p>}
    </kit.Panel>
  );
}

export default defineGameUI({ Display, Player });
