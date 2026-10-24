import { useEffect, useRef, useState, type ReactNode } from 'react';
import { defineGameUI, type DealerProps, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { DealerView, Placement, PlayerView, PublicRound, PublicView } from './logic.ts';
import { START_COINS, TEAMS, type Team } from './shared.ts';
import { CREDITS, RULES, SLIDES, type SlideDemo } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) may be
// imported here. Platform components come in through `kit`, text goes through `t()`, and styles
// are scoped with the `dddg-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];
type Platform = DisplayProps['platform'];

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  of: { 'pt-BR': 'de', en: 'of' },
  firstTo: { 'pt-BR': 'primeiro a {n} vence', en: 'first to {n} wins' },
  replay: { 'pt-BR': 'desempate', en: 'replay' },
  gold: { 'pt-BR': 'Ouro', en: 'Gold' },
  crimson: { 'pt-BR': 'Carmesim', en: 'Crimson' },
  teamsTitle: { 'pt-BR': 'Os times', en: 'The teams' },
  teamsSub: {
    'pt-BR': 'Cada um tem 10 dobrões para a partida inteira.',
    en: 'Everyone has 10 doubloons for the whole match.',
  },
  depositTitle: { 'pt-BR': 'Depósitos', en: 'Deposits' },
  depositSub: {
    'pt-BR': 'Um por vez no Dealer: quanto você joga no pote?',
    en: 'One at a time at the Dealer: how much goes in the pot?',
  },
  atDealer: { 'pt-BR': 'no Dealer', en: 'at the Dealer' },
  wins: { 'pt-BR': 'vitórias', en: 'wins' },
  history: { 'pt-BR': 'Rodadas', en: 'Rounds' },
  tie: { 'pt-BR': 'Empate', en: 'Tie' },
  tieTitle: { 'pt-BR': 'Empate!', en: 'Tie!' },
  tieSub: {
    'pt-BR': 'Os dobrões voltam para os donos. A rodada recomeça.',
    en: 'The doubloons go back to their owners. The round starts over.',
  },
  winsRound: { 'pt-BR': 'vence a rodada', en: 'wins the round' },
  deposited: { 'pt-BR': 'depositou', en: 'deposited' },
  secret: { 'pt-BR': 'em segredo', en: 'secret' },
  winnerSecret: { 'pt-BR': 'O total do vencedor fica em segredo.', en: 'The winner’s total stays secret.' },
  finalWin: { 'pt-BR': 'vence a partida', en: 'wins the match' },
  draw: { 'pt-BR': 'Empate geral', en: 'A draw' },
  drawSub: { 'pt-BR': 'Ninguém pontua nesta partida.', en: 'Nobody scores this match.' },
  broke: { 'pt-BR': 'Os dois times ficaram sem dobrões.', en: 'Both teams ran out of doubloons.' },
  manyTies: { 'pt-BR': 'Empates demais seguidos.', en: 'Too many ties in a row.' },
  rankingSub: {
    'pt-BR': 'O ranking vai pelos dobrões que cada um guardou.',
    en: 'The ranking goes by the doubloons each player kept.',
  },
  revealTitle: { 'pt-BR': 'Revelação', en: 'Reveal' },
  pts: { 'pt-BR': 'pts', en: 'pts' },
  // Phone
  youAre: { 'pt-BR': 'Você é do time', en: 'You are on team' },
  goDealer: {
    'pt-BR': 'Toque em “Ir ao Dealer” acima. Lá você vê seu saldo e decide o depósito.',
    en: 'Tap “Go to the Dealer” above. There you see your balance and choose your deposit.',
  },
  doneNote: {
    'pt-BR': 'Sua vez nesta rodada acabou. Olhe a TV para a revelação.',
    en: 'Your turn this round is over. Watch the TV for the reveal.',
  },
  howMuch: { 'pt-BR': 'Quanto vai para o pote?', en: 'How much goes in the pot?' },
  confirm: { 'pt-BR': 'Depositar', en: 'Deposit' },
  zero: { 'pt-BR': 'Nada', en: 'None' },
  all: { 'pt-BR': 'Tudo', en: 'All' },
  final: { 'pt-BR': 'É definitivo.', en: 'It is final.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  place: { 'pt-BR': 'lugar', en: 'place' },
  balance: { 'pt-BR': 'Saldo', en: 'Balance' },
  // Dealer
  yourBalance: { 'pt-BR': 'Seu saldo', en: 'Your balance' },
  toPot: { 'pt-BR': 'para o pote', en: 'to the pot' },
  left: { 'pt-BR': 'ficam', en: 'left' },
  dealerNote: {
    'pt-BR': 'Escolha no celular e confirme. Ninguém mais vê isto.',
    en: 'Choose on your phone and confirm. Nobody else sees this.',
  },
  // Tutorial and rules
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
  pot: { 'pt-BR': 'Pote', en: 'Pot' },
} satisfies Record<string, I18nText>;

const CSS = `
.dddg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:2.6em 4em 4.6em;gap:1.6em;box-sizing:border-box}
.dddg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:2em}
.dddg-h1{font-family:var(--font-display);font-weight:900;font-size:4.6em;letter-spacing:.05em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.dddg-h1[data-team=crimson]{background-image:linear-gradient(180deg,#ff8a8a,var(--crimson-hi) 50%,var(--crimson))}
.dddg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.9em;color:var(--text-dim);margin:.25em 0 0}
.dddg-coin{display:inline-block;width:1em;height:1em;border-radius:50%;vertical-align:-.12em;
  background:radial-gradient(circle at 35% 30%,#fff3c4,#e2c35a 35%,#b08a1e 70%,#6e5410);box-shadow:inset 0 0 0 .08em rgba(80,55,5,.6),0 .05em .15em rgba(0,0,0,.5)}
.dddg-dot{display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:-.05em}
.dddg-dot[data-team=gold]{background:linear-gradient(180deg,var(--gold-hi),var(--gold-lo))}
.dddg-dot[data-team=crimson]{background:linear-gradient(180deg,var(--crimson-hi),var(--crimson-lo))}
.dddg-clock{font-family:var(--font-display);font-weight:900;font-size:5.4em;line-height:1;color:var(--gold-hi);font-variant-numeric:tabular-nums;white-space:nowrap}
.dddg-pclock{font-family:var(--font-display);font-weight:900;font-size:2.6rem;line-height:1;color:var(--gold-hi);font-variant-numeric:tabular-nums}
.dddg-clock[data-urgent=true],.dddg-pclock[data-urgent=true]{color:var(--crimson-hi)}
/* Team boards (TV) */
.dddg-board{display:grid;grid-template-columns:1fr 1fr;gap:2.4em;align-content:center;min-height:0}
.dddg-team{border-radius:var(--radius-lg);padding:1.6em 1.8em;display:grid;gap:1.2em;align-content:start;
  background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));box-shadow:0 0 0 1px var(--line) inset}
.dddg-team[data-team=gold]{box-shadow:0 0 0 1px rgba(212,175,55,.45) inset,0 0 3em rgba(212,175,55,.08)}
.dddg-team[data-team=crimson]{box-shadow:0 0 0 1px rgba(190,30,60,.55) inset,0 0 3em rgba(190,30,60,.1)}
.dddg-teamhead{display:flex;align-items:center;justify-content:space-between;gap:1em}
.dddg-teamname{font-family:var(--font-display);font-weight:700;font-size:2.4em;letter-spacing:.08em;text-transform:uppercase}
.dddg-team[data-team=gold] .dddg-teamname{color:var(--gold-hi)}
.dddg-team[data-team=crimson] .dddg-teamname{color:var(--crimson-hi)}
.dddg-pips{display:flex;gap:.5em;font-size:2.2em}
.dddg-pip{width:1em;height:1em;border-radius:50%;box-shadow:0 0 0 .08em var(--line-strong) inset;opacity:.5}
.dddg-pip[data-on=true]{opacity:1;box-shadow:none;background:radial-gradient(circle at 35% 30%,#fff3c4,#e2c35a 35%,#b08a1e 70%,#6e5410)}
.dddg-team[data-team=crimson] .dddg-pip[data-on=true]{background:radial-gradient(circle at 35% 30%,#ffd0d0,var(--crimson-hi) 40%,var(--crimson-lo))}
.dddg-seats{display:flex;flex-wrap:wrap;gap:1.4em 1.8em;justify-content:center}
.dddg-seat{display:grid;justify-items:center;gap:.35em;font-weight:600;font-size:1.25em;min-width:5.5em;text-align:center}
.dddg-seat small{font-size:.75em;color:var(--crimson-hi);text-transform:uppercase;letter-spacing:.1em}
.dddg-hist{display:flex;gap:1em;justify-content:center;flex-wrap:wrap;font-size:1.25em;padding:0 9em}
.dddg-chip{display:flex;align-items:center;gap:.5em;padding:.45em .9em;border-radius:999px;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;white-space:nowrap}
.dddg-chip b{font-family:var(--font-display);color:var(--gold-hi)}
/* Reveal (TV) */
.dddg-reveal{display:grid;justify-items:center;align-content:center;gap:1.6em;text-align:center}
.dddg-big{font-family:var(--font-display);font-weight:900;font-size:6.5em;line-height:1.1;padding-top:.05em;text-transform:uppercase;letter-spacing:.04em;margin:0;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.dddg-big[data-team=crimson]{background-image:linear-gradient(180deg,#ff9a9a,var(--crimson-hi) 50%,var(--crimson))}
.dddg-totals{display:flex;gap:3em;justify-content:center}
.dddg-total{display:grid;justify-items:center;gap:.3em;padding:1.2em 2.4em;border-radius:var(--radius-lg);box-shadow:0 0 0 1px var(--line) inset;background:rgba(255,255,255,.03)}
.dddg-total span{font-size:1.4em;color:var(--text-dim)}
.dddg-total b{font-family:var(--font-display);font-size:4.2em;color:var(--gold-hi);line-height:1}
.dddg-total b.dddg-q{color:var(--text-mute)}
.dddg-late{animation:dddg-rise .9s var(--ease-out) backwards;animation-delay:2.5s}
@keyframes dddg-rise{from{opacity:0;transform:translateY(1.2em) scale(.96)}}
/* Final (TV) */
.dddg-final{display:grid;gap:1.6em;min-height:0;align-content:start}
.dddg-cols{display:grid;grid-template-columns:1fr 1fr;gap:2.4em}
.dddg-ranks{display:grid;gap:.45em;align-content:start}
.dddg-rank{display:grid;grid-template-columns:2.4em auto 1fr auto auto;align-items:center;gap:.8em;font-size:1.25em;padding:.3em .8em;border-radius:var(--radius);background:rgba(255,255,255,.03)}
.dddg-rank[data-team=gold]{box-shadow:inset .25em 0 0 var(--gold)}
.dddg-rank[data-team=crimson]{box-shadow:inset .25em 0 0 var(--crimson-hi)}
.dddg-rank .dddg-place{font-family:var(--font-display);font-weight:900;font-size:1.5em;color:var(--gold-hi);text-align:center}
.dddg-rank .dddg-name{font-weight:600}
.dddg-rank .dddg-bal{font-family:var(--font-display);font-size:1.3em;display:flex;align-items:center;gap:.3em}
.dddg-rank .dddg-pts{color:var(--text-dim);min-width:3.5em;text-align:right}
.dddg-rounds{display:flex;flex-wrap:wrap;justify-content:center;gap:.6em;font-size:1.15em}
.dddg-rline{display:flex;gap:.9em;align-items:center;padding:.35em .9em;border-radius:999px;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset}
.dddg-rline span{display:flex;gap:.35em;align-items:center;white-space:nowrap}
.dddg-rline b{font-family:var(--font-display)}
.dddg-rline [data-win=true] b{color:var(--gold-hi)}
/* Phone */
.dddg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.dddg-badge{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-display);font-size:1.6rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.dddg-badge[data-team=gold]{color:var(--gold-hi)}
.dddg-badge[data-team=crimson]{color:var(--crimson-hi)}
.dddg-stepper{display:grid;grid-template-columns:72px 1fr 72px;align-items:center;gap:12px}
.dddg-step{height:72px;border-radius:18px;border:0;font-size:2.2rem;font-weight:700;color:var(--gold-hi);background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line-strong) inset;cursor:pointer}
.dddg-step:disabled{opacity:.3}
.dddg-step:active:not(:disabled){transform:scale(.95)}
.dddg-amount{font-family:var(--font-display);font-weight:900;font-size:4.2rem;color:var(--gold-hi);text-align:center;line-height:1;display:flex;align-items:center;justify-content:center;gap:10px}
.dddg-amount .dddg-coin{width:.6em;height:.6em}
.dddg-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dddg-me{display:grid;gap:4px;justify-items:center}
.dddg-me b{font-family:var(--font-display);font-size:3rem;color:var(--gold-hi);line-height:1}
/* Dealer */
.dddg-dealer{container-type:inline-size;display:grid;justify-items:center;align-content:center;gap:1.2em;text-align:center;padding:4em 2em}
.tv .dddg-dealer{min-height:100vh;box-sizing:border-box}
.dddg-dealer .dddg-bal{font-family:var(--font-display);font-weight:900;font-size:min(14em,34cqw);line-height:1;color:var(--gold-hi);display:flex;align-items:center;gap:.15em}
.dddg-dealer .dddg-bal .dddg-coin{width:.55em;height:.55em}
.dddg-dealer .dddg-flow{display:flex;gap:1.4em;align-items:center;font-size:min(2.4em,6cqw)}
.dddg-dealer .dddg-flow b{font-family:var(--font-display);color:var(--gold-hi);font-size:1.4em}
/* Tutorial slide (TV) */
.dddg-slide{height:100vh;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:4em;padding:4em 5em;box-sizing:border-box}
.dddg-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.dddg-slide b,.dddg-rules b,.dddg-tvrules b{color:var(--gold-hi);font-weight:600}
.dddg-dots{display:flex;gap:.6em;margin-top:1.5em}
.dddg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.dddg-dots span[data-on='true']{background:var(--gold)}
.dddg-demo{display:grid;gap:1.4em;justify-items:center;font-size:1.3em}
.dddg-demo .dddg-team{width:26em;padding:1em 1.4em;gap:.6em}
.dddg-demo .dddg-teamname{font-size:1.8em}
.dddg-demo .dddg-seats{flex-wrap:nowrap}
.dddg-stack{display:flex;gap:.2em;font-size:1.3em}
.dddg-pot{width:7em;height:7em;border-radius:50%;display:grid;place-items:center;font-family:var(--font-display);color:var(--text-dim);letter-spacing:.1em;text-transform:uppercase;
  background:radial-gradient(circle at 50% 40%,#1a1410,#050304);box-shadow:0 0 0 2px var(--gold-lo) inset,0 0 2.5em rgba(212,175,55,.15)}
.dddg-fall{animation:dddg-fall 2.4s var(--ease-out) infinite}
@keyframes dddg-fall{0%{transform:translateY(0);opacity:1}70%{transform:translateY(5em);opacity:0}100%{transform:translateY(5em);opacity:0}}
.dddg-ring{width:9em;height:9em;border-radius:50%;display:grid;place-items:center;font-family:var(--font-display);font-size:1.4em;color:var(--crimson-hi);
  background:conic-gradient(var(--crimson-hi) 0 25%,rgba(255,255,255,.08) 25% 100%);-webkit-mask:radial-gradient(circle,transparent 62%,#000 63%);mask:radial-gradient(circle,transparent 62%,#000 63%)}
.dddg-ringwrap{position:relative;display:grid;place-items:center}
.dddg-ringwrap b{position:absolute;font-family:var(--font-display);font-size:2.6em;color:var(--crimson-hi)}
/* Rules overlay (TV) and reader (phone) */
.dddg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.dddg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.dddg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.dddg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.dddg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.dddg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.dddg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.dddg-rules p{margin:0;line-height:1.5}
.dddg-row{display:flex;gap:8px}
.dddg-row > *{flex:1}
`;

const Styles = () => <style>{CSS}</style>;

const Coin = () => <i className="dddg-coin" aria-hidden />;
const Dot = ({ team }: { team: Team }) => <i className="dddg-dot" data-team={team} aria-hidden />;
const teamName = (t: T, team: Team) => t(team === 'gold' ? L.gold : L.crimson);
const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** Settings the texts mention ({min}, {sec}), from the Host's config. */
function configVars(platform: Platform) {
  const c = platform.gameConfig;
  return { min: Number(c['roundMinutes'] ?? 15), sec: Number(c['visitSeconds'] ?? 30) };
}

/** Renders **bold**, *italic* and the {coin} / {gold} / {crimson} icons inside a translated string. */
function rich(text: string, vars: Record<string, string | number> = {}): ReactNode[] {
  return fill(text, vars)
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|\{coin\}|\{gold\}|\{crimson\})/g)
    .map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <i key={i}>{part.slice(1, -1)}</i>;
      if (part === '{coin}') return <Coin key={i} />;
      if (part === '{gold}') return <Dot key={i} team="gold" />;
      if (part === '{crimson}') return <Dot key={i} team="crimson" />;
      return part;
    });
}

/** MM:SS round clock (rounds run for minutes); holds its value while the room is paused. */
function Clock({ deadline, paused, kit, className }: { deadline: number | null; paused: boolean; kit: Kit; className: string }) {
  const now = kit.useRoomNow();
  const frozen = useRef<number | null>(null);
  const live = deadline === null ? 0 : Math.max(0, deadline - now);
  if (!paused) frozen.current = null;
  else if (frozen.current === null) frozen.current = live;
  const secs = Math.ceil((paused ? frozen.current! : live) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <span className={className} data-urgent={secs <= 60}>
      {mm}:{ss}
    </span>
  );
}

function Pips({ wins, needed }: { wins: number; needed: number }) {
  return (
    <div className="dddg-pips" aria-label={`${wins}/${needed}`}>
      {Array.from({ length: needed }, (_, i) => (
        <span key={i} className="dddg-pip" data-on={i < wins} />
      ))}
    </div>
  );
}

function RoundChip({ r, t }: { r: PublicRound; t: T }) {
  if (!r.winner) {
    return (
      <span className="dddg-chip">
        {t(L.round)} {r.round} · {t(L.tie)}
      </span>
    );
  }
  const loser: Team = r.winner === 'gold' ? 'crimson' : 'gold';
  return (
    <span className="dddg-chip">
      {t(L.round)} {r.round} · <Dot team={r.winner} /> {teamName(t, r.winner)} ·{' '}
      <Dot team={loser} /> <b>{r.loserTotal}</b>
      <Coin />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules (every game has both)
// ---------------------------------------------------------------------------

const DEMO_SEATS = [
  ['🎩', '🦊', '🌙'],
  ['🍷', '💎', '🦉'],
];

/** Small live illustrations next to each slide, drawn with the game's real pieces. */
function SlideDemo({ demo, kit, t, sec }: { demo: SlideDemo; kit: Kit; t: T; sec: number }) {
  const { Avatar } = kit;
  if (demo === 'teams') {
    return (
      <div className="dddg-demo">
        {TEAMS.map((team, ti) => (
          <div key={team} className="dddg-team" data-team={team}>
            <div className="dddg-teamhead">
              <span className="dddg-teamname">{teamName(t, team)}</span>
            </div>
            <div className="dddg-seats">
              {DEMO_SEATS[ti]!.map((e) => (
                <div key={e} className="dddg-seat">
                  <Avatar emoji={e} size="3em" />
                  <span className="dddg-stack" aria-hidden>
                    <Coin />
                    <Coin />
                    <Coin />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (demo === 'deposit') {
    return (
      <div className="dddg-demo">
        <span className="dddg-stack" style={{ fontSize: '2em' }}>
          {Array.from({ length: START_COINS }, (_, i) => (
            <span key={i} className={i >= 4 && i <= 6 ? 'dddg-fall' : undefined} style={{ animationDelay: `${(i - 4) * 0.4}s` }}>
              <Coin />
            </span>
          ))}
        </span>
        <div className="dddg-pot">{t(L.pot)}</div>
      </div>
    );
  }
  if (demo === 'reveal') {
    return (
      <div className="dddg-demo">
        <h2 className="dddg-big" style={{ fontSize: '3.4em' }}>
          {teamName(t, 'gold')}
        </h2>
        <div className="dddg-totals" style={{ fontSize: '.8em' }}>
          <div className="dddg-total">
            <span>
              <Dot team="gold" /> {teamName(t, 'gold')}
            </span>
            <b className="dddg-q">?</b>
          </div>
          <div className="dddg-total">
            <span>
              <Dot team="crimson" /> {teamName(t, 'crimson')}
            </span>
            <b>5</b>
          </div>
        </div>
      </div>
    );
  }
  if (demo === 'ranking') {
    const rows: [string, Team, number][] = [
      ['🎩', 'gold', 8],
      ['🦊', 'gold', 6],
      ['🌙', 'gold', 2],
      ['💎', 'crimson', 9],
      ['🍷', 'crimson', 5],
      ['🦉', 'crimson', 4],
    ];
    return (
      <div className="dddg-ranks" style={{ width: '22em' }}>
        {rows.map(([e, team, bal], i) => (
          <div key={e} className="dddg-rank" data-team={team}>
            <span className="dddg-place">{i + 1}</span>
            <Avatar emoji={e} size="2em" />
            <span />
            <span className="dddg-bal">
              {bal} <Coin />
            </span>
            <span />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="dddg-demo">
      <div className="dddg-ringwrap">
        <div className="dddg-ring" />
        <b>{sec}s</b>
      </div>
      <Avatar emoji="🎩" size="4em" crimson />
    </div>
  );
}

function TutorialSlide({ view, kit, t, platform }: { view: PublicView; kit: Kit; t: T; platform: Platform }) {
  const s = SLIDES[view.slide]!;
  const vars = configVars(platform);
  return (
    <div className="dddg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="dddg-h1" style={{ fontSize: '4em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b), vars)}</p>
        ))}
        {view.slide === 0 && (
          <p className="dddg-sub" style={{ fontSize: '1.1em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="dddg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="dddg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} sec={vars.sec} />
    </div>
  );
}

/** A rules page on the TV, while the Host shows it from their phone. */
function TvRules({ page, kit, t, platform }: { page: number; kit: Kit; t: T; platform: Platform }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  const vars = configVars(platform);
  return (
    <div className="dddg-tvrules">
      <Panel className="mp-enter" key={page}>
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b), vars)}</p>
        ))}
        {page === RULES.length - 1 && (
          <p>
            <b>{t(L.credits)}</b> — {t(CREDITS)}
          </p>
        )}
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
  platform,
  onClose,
}: {
  view: PlayerView;
  kit: PlayerProps['kit'];
  t: T;
  send(a: unknown): void;
  isHost: boolean;
  platform: Platform;
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
  const vars = configVars(platform);
  return (
    <div className="dddg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="dddg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b), vars)}</p>
        ))}
        {last && (
          <p>
            <b>{t(L.credits)}</b> — {t(CREDITS)}
          </p>
        )}
        <div className="dddg-row">
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

function TeamBoard({ view, kit, t, platform, team }: { view: PublicView; kit: Kit; t: T; platform: Platform; team: Team }) {
  const { Avatar } = kit;
  const members = platform.players.filter((p) => !p.spectator && view.teams[p.id] === team);
  const showDone = view.phase === 'deposit';
  return (
    <section className="dddg-team" data-team={team}>
      <div className="dddg-teamhead">
        <span className="dddg-teamname">
          <Dot team={team} /> {teamName(t, team)}
        </span>
        {view.phase !== 'teams' && <Pips wins={view.wins[team]} needed={view.winsNeeded} />}
      </div>
      <div className="dddg-seats">
        {members.map((p) => {
          const done = showDone && view.done.includes(p.id);
          const here = view.atDealer === p.id;
          return (
            <div key={p.id} className="dddg-seat">
              <Avatar
                emoji={p.avatar}
                size={members.length > 4 ? '3.8em' : '4.6em'}
                offline={!p.connected}
                active={done}
                crimson={here}
                badge={done ? '✓' : undefined}
              />
              <span>{p.name}</span>
              {here && <small>{t(L.atDealer)}</small>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Header({
  view,
  kit,
  t,
  platform,
  title,
  sub,
  team,
}: {
  view: PublicView;
  kit: Kit;
  t: T;
  platform: Platform;
  title: string;
  sub: ReactNode;
  team?: Team | null;
}) {
  const showClock = view.phase === 'deposit';
  return (
    <header className="dddg-head mp-enter" key={`${view.phase}-${view.round}-${view.ties}`}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.round)} {Math.min(view.round, view.maxRounds)} {t(L.of)} {view.maxRounds} ·{' '}
          {fill(t(L.firstTo), { n: view.winsNeeded })}
          {view.ties > 0 && view.phase === 'deposit' ? ` · ${t(L.replay)}` : ''}
        </span>
        <h1 className="dddg-h1" data-team={team ?? undefined} style={view.phase === 'final' ? { fontSize: '3.6em' } : undefined}>
          {title}
        </h1>
        <p className="dddg-sub">{sub}</p>
      </div>
      {showClock && <Clock deadline={view.deadline} paused={!!platform.paused} kit={kit} className="dddg-clock" />}
    </header>
  );
}

function History({ view, t }: { view: PublicView; t: T }) {
  return (
    <div className="dddg-hist">
      {view.history.map((r, i) => (
        <RoundChip key={i} r={r} t={t} />
      ))}
    </div>
  );
}

function Reveal({ view, t }: { view: PublicView; t: T }) {
  const r = view.reveal!;
  if (!r.winner) {
    return (
      <div className="dddg-reveal">
        <h2 className="dddg-big dddg-late">{t(L.tieTitle)}</h2>
        <p className="dddg-sub dddg-late">{t(L.tieSub)}</p>
      </div>
    );
  }
  const loser: Team = r.winner === 'gold' ? 'crimson' : 'gold';
  return (
    <div className="dddg-reveal">
      <h2 className="dddg-big dddg-late" data-team={r.winner}>
        {teamName(t, r.winner)}
      </h2>
      <p className="dddg-sub dddg-late" style={{ fontSize: '2.2em', margin: 0 }}>
        {t(L.winsRound)}
      </p>
      <div className="dddg-totals dddg-late">
        <div className="dddg-total">
          <span>
            <Dot team={r.winner} /> {teamName(t, r.winner)}
          </span>
          <b className="dddg-q">?</b>
          <span>{t(L.secret)}</span>
        </div>
        <div className="dddg-total">
          <span>
            <Dot team={loser} /> {teamName(t, loser)} {t(L.deposited)}
          </span>
          <b>{r.loserTotal}</b>
          <span>
            <Coin />
          </span>
        </div>
      </div>
    </div>
  );
}

function Final({ view, kit, t, platform }: { view: PublicView; kit: Kit; t: T; platform: Platform }) {
  const { Avatar } = kit;
  const f = view.final!;
  const byId = new Map(platform.players.map((p) => [p.id, p]));
  const rows = (list: Placement[]) =>
    list.map((p, i) => {
      const pl = byId.get(p.playerId);
      return (
        <div key={p.playerId} className="dddg-rank dddg-late" data-team={p.team} style={{ animationDelay: `${2.5 + i * 0.15}s` }}>
          <span className="dddg-place">{f.winner ? p.place : '—'}</span>
          <Avatar emoji={pl?.avatar ?? '🎩'} size="2em" active={f.winner !== null && p.place === 1} />
          <span className="dddg-name">{pl?.name ?? p.playerId}</span>
          <span className="dddg-bal">
            {f.balances[p.playerId]} <Coin />
          </span>
          <span className="dddg-pts">
            +{p.points} {t(L.pts)}
          </span>
        </div>
      );
    });
  const first = f.placements[0]?.team ?? 'gold';
  return (
    <div className="dddg-final">
      <div className="dddg-cols">
        <div className="dddg-ranks">{rows(f.placements.filter((p) => p.team === first))}</div>
        <div className="dddg-ranks">{rows(f.placements.filter((p) => p.team !== first))}</div>
      </div>
      <div className="dddg-rounds dddg-late">
        {view.history.map((r, i) => {
          const totals: Record<Team, number | null> = r.winner
            ? ({ [r.winner]: r.winnerTotal, [r.winner === 'gold' ? 'crimson' : 'gold']: r.loserTotal } as Record<Team, number | null>)
            : { gold: null, crimson: null };
          return (
            <div key={i} className="dddg-rline">
              <span>
                {t(L.round)} {r.round}
              </span>
              {r.winner ? (
                TEAMS.map((team) => (
                  <span key={team} data-win={team === r.winner}>
                    <Dot team={team} /> <b>{totals[team]}</b>
                    <Coin />
                  </span>
                ))
              ) : (
                <span style={{ gridColumn: 'span 2' }}>{t(L.tie)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const rulesOverlay = view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} platform={platform} />;

  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} kit={kit} t={t} platform={platform} />
        {rulesOverlay}
      </>
    );
  }

  const boards = (
    <div className="dddg-board">
      {TEAMS.map((team) => (
        <TeamBoard key={team} view={view} kit={kit} t={t} platform={platform} team={team} />
      ))}
    </div>
  );

  let title = t(L.depositTitle);
  let sub: ReactNode = t(L.depositSub);
  let team: Team | null = null;
  let body: ReactNode = boards;
  if (view.phase === 'teams') {
    title = t(L.teamsTitle);
    sub = t(L.teamsSub);
  } else if (view.phase === 'reveal' && view.reveal) {
    title = t(L.revealTitle);
    sub = view.reveal.winner ? t(L.winnerSecret) : '';
    body = <Reveal view={view} t={t} />;
  } else if (view.phase === 'final' && view.final) {
    const f = view.final;
    const why = f.reason === 'wins' ? '' : `${t(f.reason === 'broke' ? L.broke : L.manyTies)} `;
    team = f.winner;
    title = f.winner ? `${teamName(t, f.winner)} ${t(L.finalWin)}` : t(L.draw);
    sub = why + t(f.winner ? L.rankingSub : L.drawSub);
    body = <Final view={view} kit={kit} t={t} platform={platform} />;
  }

  return (
    <div className="dddg-wrap">
      <Styles />
      <Header view={view} kit={kit} t={t} platform={platform} title={title} sub={sub} team={team} />
      {body}
      {view.phase === 'final' ? <div /> : <History view={view} t={t} />}
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

function DepositControls({ view, kit, t, send, platform }: Pick<PlayerProps<PlayerView>, 'view' | 'kit' | 't' | 'send' | 'platform'>) {
  const { Button, Countdown, Panel } = kit;
  const visit = view.visit!;
  // Local value so taps feel instant; the Dealer screen mirrors it through `draft`.
  const [amount, setAmount] = useState(visit.draft);
  const set = (n: number) => {
    const v = Math.max(0, Math.min(visit.max, n));
    setAmount(v);
    send({ type: 'draft', amount: v });
  };
  return (
    <Panel className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mp-eyebrow">{t(L.howMuch)}</span>
        <Countdown deadline={visit.deadline} total={visit.total ?? 0} size={52} paused={!!platform.paused} />
      </div>
      <div className="dddg-stepper">
        <button type="button" className="dddg-step" aria-label="−" disabled={amount <= 0} onClick={() => set(amount - 1)}>
          −
        </button>
        <div className="dddg-amount" aria-live="polite">
          {amount} <Coin />
        </div>
        <button type="button" className="dddg-step" aria-label="+" disabled={amount >= visit.max} onClick={() => set(amount + 1)}>
          +
        </button>
      </div>
      <div className="dddg-quick">
        <Button small variant="ghost" onClick={() => set(0)}>
          {t(L.zero)}
        </Button>
        <Button small variant="ghost" onClick={() => set(visit.max)}>
          {t(L.all)}
        </Button>
      </div>
      <Button block variant="crimson" onClick={() => send({ type: 'deposit', amount })}>
        {t(L.confirm)} {amount}
      </Button>
      <p className="dddg-note" style={{ fontSize: '1rem' }}>
        {t(L.final)}
      </p>
    </Panel>
  );
}

function ordinal(n: number, lang: string) {
  if (lang !== 'en') return `${n}º`;
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

function Player({ view, kit, t, send, platform, you, lang }: PlayerProps<PlayerView>) {
  const { Button, Panel } = kit;
  const [rules, setRules] = useState(false);
  if (!view) return null;
  const isHost = you.isAdmin;

  // The rules are one tap away in every phase.
  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader
      view={view}
      kit={kit}
      t={t}
      send={send}
      isHost={isHost}
      platform={platform}
      onClose={() => setRules(false)}
    />
  );
  const badge = view.team && (
    <span className="dddg-badge" data-team={view.team}>
      <Dot team={view.team} /> {teamName(t, view.team)}
    </span>
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return (
      <div className="stack">
        <Styles />
        <Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
          {!isHost && <p className="dddg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="dddg-row">
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
        {rulesButton}
        {reader}
      </div>
    );
  }

  if (view.phase === 'deposit' && view.visit) {
    return (
      <div className="stack">
        <Styles />
        <DepositControls key={view.round} view={view} kit={kit} t={t} send={send} platform={platform} />
        {rulesButton}
        {reader}
      </div>
    );
  }

  let body: ReactNode;
  if (view.phase === 'teams') {
    body = (
      <>
        <span className="mp-eyebrow">{t(L.youAre)}</span>
        {badge}
        <p className="dddg-note">{t(L.watch)}</p>
      </>
    );
  } else if (view.phase === 'deposit') {
    body = (
      <>
        {badge}
        <Clock deadline={view.deadline} paused={!!platform.paused} kit={kit} className="dddg-pclock" />
        <p className="dddg-note">{t(view.done ? L.doneNote : L.goDealer)}</p>
      </>
    );
  } else if (view.phase === 'final' && view.placement) {
    body = (
      <>
        {badge}
        <div className="dddg-me">
          <b>{ordinal(view.placement.place, lang)}</b>
          <span className="mp-eyebrow">{t(L.place)}</span>
        </div>
        <p className="dddg-note">
          {t(L.balance)}: {view.myBalance} <Coin /> · +{view.placement.points} {t(L.pts)}
        </p>
      </>
    );
  } else {
    body = (
      <>
        {badge}
        <p className="dddg-note">{t(L.watch)}</p>
      </>
    );
  }

  return (
    <div className="stack">
      <Styles />
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center', gap: 14 }}>
        {body}
      </Panel>
      {rulesButton}
      {reader}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dealer
// ---------------------------------------------------------------------------

function Dealer({ view, kit, t, platform }: DealerProps<DealerView>) {
  const { Countdown } = kit;
  if (!view) return null;
  return (
    <div className="dddg-dealer">
      <Styles />
      {view.team && (
        <span className="dddg-badge" data-team={view.team} style={{ fontSize: '1.8em' }}>
          <Dot team={view.team} /> {teamName(t, view.team)} · {t(L.round)} {view.round}
        </span>
      )}
      <span className="mp-eyebrow" style={{ fontSize: '1.3em' }}>
        {t(L.yourBalance)}
      </span>
      <div className="dddg-bal mp-enter">
        {view.balance} <Coin />
      </div>
      <div className="dddg-flow">
        <span>
          <b>{view.draft}</b> {t(L.toPot)}
        </span>
        <span>→</span>
        <span>
          {t(L.left)} <b>{view.balance - view.draft}</b>
        </span>
      </div>
      <Countdown deadline={view.deadline} total={view.total ?? 0} size="5em" paused={!!platform.paused} />
      <p className="dddg-sub" style={{ fontSize: '1.5em' }}>
        {t(L.dealerNote)}
      </p>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });
