import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { Count, FinalResult, PlayerView, PublicView, Salon } from './logic.ts';
import { CREDITS, RULES, SLIDES } from './texts.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts) may be imported
// here. Platform components come in through `kit`, text goes through `t()`, and styles are
// scoped with the `plg-` prefix.

type T = (text: I18nText) => string;
type Kit = DisplayProps['kit'];
type Who = { id: string; name: string; avatar: string; connected: boolean };

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  nobre: { 'pt-BR': 'Salão Nobre', en: 'Salão Nobre' },
  prive: { 'pt-BR': 'Salão Privé', en: 'Salão Privé' },
  terrace: { 'pt-BR': 'Terraço', en: 'Terrace' },
  papelTitle: { 'pt-BR': 'Seus papéis', en: 'Your roles' },
  papelSub: {
    'pt-BR': 'Segure o botão do celular para ver seu papel, e vá para o seu salão.',
    en: 'Hold the button on your phone to see your role, then go to your salon.',
  },
  dayTitle: { 'pt-BR': 'Dia', en: 'Day' },
  daySub: {
    'pt-BR': 'Cada salão escolhe, no celular, quem vai passar a noite no Terraço.',
    en: 'Each salon picks, on the phone, who spends the night on the Terrace.',
  },
  nightTitle: { 'pt-BR': 'Noite', en: 'Night' },
  nightSub: {
    'pt-BR': 'Exilados, ao Terraço. O ladrão age em silêncio…',
    en: 'Exiles, to the Terrace. The burglar works in silence…',
  },
  swapTitle: { 'pt-BR': 'Amanhecer', en: 'Dawn' },
  swapSub: {
    'pt-BR': 'Os exilados trocam de salão: Nobre ⇄ Privé.',
    en: 'The exiles swap salons: Nobre ⇄ Privé.',
  },
  countTitle: { 'pt-BR': 'Contagem', en: 'The count' },
  countSub: {
    'pt-BR': 'O ouro de todos, por letra. Ninguém sabe de quem é cada letra.',
    en: 'Everyone’s gold, by letter. Nobody knows whose letter is whose.',
  },
  finalTitle: { 'pt-BR': 'O ladrão era…', en: 'The burglar was…' },
  decided: { 'pt-BR': 'Decidido', en: 'Decided' },
  voting: { 'pt-BR': 'Votando…', en: 'Voting…' },
  ready: { 'pt-BR': 'Pronto', en: 'Ready' },
  ledger: { 'pt-BR': 'Livro de contas', en: 'Ledger' },
  wins: { 'pt-BR': 'vence', en: 'wins' },
  loses: { 'pt-BR': 'perde', en: 'loses' },
  winner: { 'pt-BR': 'Vencedor', en: 'Winner' },
  loser: { 'pt-BR': 'Perdedor', en: 'Loser' },
  burglarWon: {
    'pt-BR': 'Mais rico que todos — o ladrão vence junto.',
    en: 'Richer than everyone — the burglar wins too.',
  },
  burglarLost: {
    'pt-BR': 'Não foi o mais rico — o ladrão perde junto.',
    en: 'Not the richest — the burglar loses too.',
  },
  gold: { 'pt-BR': 'ouro', en: 'gold' },
  hintVote: {
    'pt-BR': 'Conversem no salão e votem no celular: quem vai ao Terraço?',
    en: 'Talk in your salon and vote on your phone: who goes to the Terrace?',
  },
  hintUnanimous: {
    'pt-BR': 'Se todos do salão votarem no mesmo nome, o exílio fecha na hora.',
    en: 'If everyone in a salon votes for the same name, the exile locks at once.',
  },
  // Phone
  holdRole: { 'pt-BR': 'Segure para ver seu papel', en: 'Hold to see your role' },
  resident: { 'pt-BR': 'Morador', en: 'Resident' },
  burglar: { 'pt-BR': 'Ladrão', en: 'Burglar' },
  residentNote: {
    'pt-BR': 'Descubra o ladrão e fique longe dele.',
    en: 'Find the burglar and stay away from them.',
  },
  burglarNote: {
    'pt-BR': 'Roube sem ser exilado. Termine mais rico que todos.',
    en: 'Steal without being exiled. End richer than everyone.',
  },
  youAreIn: { 'pt-BR': 'Você está no', en: 'You are in the' },
  goTo: { 'pt-BR': 'Vá para o', en: 'Go to the' },
  readyWait: { 'pt-BR': 'Pronto. Esperando os outros…', en: 'Ready. Waiting for the others…' },
  vote: { 'pt-BR': 'Quem vai ao Terraço?', en: 'Who goes to the Terrace?' },
  voteNote: {
    'pt-BR': 'Todos votando no mesmo nome decide na hora. Pode trocar.',
    en: 'Everyone on the same name decides at once. You can change.',
  },
  decidedOther: { 'pt-BR': 'vai ao Terraço ao anoitecer.', en: 'goes to the Terrace at nightfall.' },
  decidedYou: { 'pt-BR': 'Você vai ao Terraço ao anoitecer.', en: 'You go to the Terrace at nightfall.' },
  you: { 'pt-BR': 'você', en: 'you' },
  goTerrace: { 'pt-BR': 'Vá ao Terraço', en: 'Go to the Terrace' },
  goTerraceNote: {
    'pt-BR': 'Passe a noite com o outro exilado. Conversem a sós.',
    en: 'Spend the night with the other exile. Talk in private.',
  },
  stay: { 'pt-BR': 'Fique no salão', en: 'Stay in your salon' },
  stayNote: { 'pt-BR': 'A noite cai. Ninguém sabe o que se perdeu.', en: 'Night falls. Nobody knows what was lost.' },
  arrived: { 'pt-BR': 'Cheguei', en: 'I’m here' },
  arrivedWait: { 'pt-BR': 'Chegada registrada.', en: 'Arrival noted.' },
  welcome: { 'pt-BR': 'Um novo morador chega ao seu salão.', en: 'A new resident arrives in your salon.' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  youWin: { 'pt-BR': 'Você venceu!', en: 'You won!' },
  youLose: { 'pt-BR': 'Você perdeu.', en: 'You lost.' },
  wasBurglar: { 'pt-BR': '🗝 Você era o ladrão.', en: '🗝 You were the burglar.' },
  youSafe: { 'pt-BR': 'Seu salão venceu.', en: 'Your salon won.' },
  youOut: { 'pt-BR': 'Seu salão perdeu.', en: 'Your salon lost.' },
  pts: { 'pt-BR': 'pts', en: 'pts' },
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
} satisfies Record<string, I18nText>;

const SALON_NAME: Record<Salon, I18nText> = { nobre: L.nobre, prive: L.prive };
const SALON_SHORT: Record<Salon, I18nText> = { nobre: { 'pt-BR': 'Nobre', en: 'Nobre' }, prive: { 'pt-BR': 'Privé', en: 'Privé' } };

const CSS = `
.plg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr;padding:2em 4em 3em;gap:1.2em;box-sizing:border-box}
.plg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:2em}
.plg-h1{font-family:var(--font-display);font-weight:900;font-size:4em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.plg-h1--night{background:linear-gradient(180deg,#e9d8ff,#9c8ac4 55%,#5d4f86);-webkit-background-clip:text;background-clip:text}
.plg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.65em;color:var(--text-dim);margin:.2em 0 0}
.plg-hint{display:inline-block;margin-top:.4em;font-size:1.15em;color:var(--gold-hi);border:1px solid var(--line-strong);border-radius:99em;padding:.3em 1em}
.plg-main{display:grid;grid-template-rows:1fr auto;gap:1em;min-height:0}
.plg-board{display:grid;grid-template-columns:1fr 13em 1fr;gap:1.4em;min-height:0}
.plg-salon{border:1px solid var(--line-strong);border-radius:var(--radius-lg);padding:1em 1.2em;display:grid;grid-template-rows:auto 1fr;gap:.6em;
  background:radial-gradient(ellipse at top,rgba(212,175,55,.08),transparent 70%)}
.plg-salon[data-dark='true']{background:radial-gradient(ellipse at top,rgba(110,90,170,.12),transparent 70%)}
.plg-salon-head{display:flex;justify-content:space-between;align-items:center;gap:1em}
.plg-salon-name{font-family:var(--font-display);font-size:2em;font-weight:700;color:var(--gold-hi);letter-spacing:.04em;white-space:nowrap}
.plg-chip{font-size:1.1em;padding:.25em .9em;border-radius:99em;border:1px solid var(--line-strong);color:var(--text-dim);white-space:nowrap}
.plg-chip[data-on='true']{color:#1a0f05;background:linear-gradient(180deg,#e2c35a,var(--gold) 50%,#a88520);border-color:transparent;font-weight:700}
.plg-seats{display:flex;flex-wrap:wrap;gap:.8em 1em;justify-content:center;align-content:center}
.plg-seat{display:grid;justify-items:center;gap:.3em;font-weight:600;font-size:1.1em;width:5em;text-align:center}
.plg-seat span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.plg-terrace{border:1px dashed var(--line-strong);border-radius:var(--radius-lg);display:grid;grid-template-rows:auto 1fr;justify-items:center;padding:1.2em .6em;gap:1em;
  background:linear-gradient(180deg,rgba(80,70,140,.10),transparent)}
.plg-terrace-name{font-family:var(--font-display);font-size:1.6em;color:#c9bdf0;letter-spacing:.06em}
.plg-terrace-body{display:grid;align-content:center;justify-items:center;gap:1.4em}
.plg-moon{font-size:4em;opacity:.35}
.plg-arrow{font-size:1.05em;color:var(--gold-hi);font-family:var(--font-display);letter-spacing:.04em}
/* Ledger */
.plg-ledger{justify-self:center;border-collapse:collapse;font-family:var(--font-display)}
.plg-ledger th,.plg-ledger td{padding:.2em .55em;text-align:center}
.plg-ledger th{color:var(--gold);font-weight:700}
.plg-ledger td{color:var(--text-dim)}
.plg-ledger td.plg-rlabel{font-family:var(--font-ui);font-size:.7em;color:var(--text-mute);text-align:right;white-space:nowrap}
.plg-ledger tr[data-new='true'] td{color:var(--gold-hi);font-weight:900}
.plg-ledger--big{font-size:3em}
.plg-demo .plg-ledger--big{font-size:2.2em}
.plg-ledger--small{font-size:1.3em}
.plg-ledger--small caption{font-family:var(--font-ui);font-size:.7em;color:var(--text-mute);letter-spacing:.2em;text-transform:uppercase;margin-bottom:.2em}
.plg-delta{display:block;font-size:.45em;font-family:var(--font-ui);color:var(--text-mute)}
.plg-pop{animation:plg-pop .7s cubic-bezier(.16,1,.3,1) both}
@keyframes plg-pop{from{opacity:0;transform:scale(.4)}}
.plg-late{animation:plg-rise .8s cubic-bezier(.16,1,.3,1) both}
@keyframes plg-rise{from{opacity:0;transform:translateY(1em)}}
/* Final */
.plg-final{display:grid;grid-template-columns:1fr 1.1fr 1fr;gap:2em;align-items:start;min-height:0}
.plg-thief{display:grid;justify-items:center;gap:.6em;text-align:center}
.plg-thief-name{font-family:var(--font-display);font-size:2.6em;font-weight:900;color:var(--crimson-hi)}
.plg-thief-gold{font-family:var(--font-display);font-size:2em;color:var(--gold-hi)}
.plg-thief-note{font-family:var(--font-serif);font-style:italic;font-size:1.5em;color:var(--text-dim);max-width:16em}
.plg-res{display:grid;gap:.3em}
.plg-res-head{font-family:var(--font-display);font-size:1.6em;color:var(--gold-hi);display:flex;justify-content:space-between;gap:1em}
.plg-res-head small{font-family:var(--font-ui);font-size:.7em;letter-spacing:.2em;text-transform:uppercase;color:var(--text-mute)}
.plg-res-row{display:grid;grid-template-columns:2.6em 1fr 1.8em 2.6em 1.6em;align-items:center;gap:.6em;font-size:1.35em;padding:.1em .4em;border-radius:.4em}
.plg-res-row[data-win='true']{background:rgba(212,175,55,.14)}
.plg-res-row[data-lose='true']{background:rgba(160,30,50,.18)}
.plg-res-letter{font-family:var(--font-display);color:var(--gold);text-align:center}
.plg-res-gold{font-family:var(--font-display);font-weight:900;text-align:right}
/* Phone */
.plg-role{position:relative;min-height:132px;border-radius:18px;border:1px solid var(--line-strong);display:grid;place-items:center;text-align:center;padding:14px;
  user-select:none;-webkit-user-select:none;touch-action:none;cursor:pointer;background:rgba(255,255,255,.03);-webkit-touch-callout:none}
.plg-role[data-open='true']{background:linear-gradient(180deg,rgba(212,175,55,.22),rgba(212,175,55,.06))}
.plg-role-name{font-family:var(--font-display);font-size:2rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
.plg-role-hold{font-size:1.05rem;color:var(--text-dim)}
.plg-salon-tag{font-family:var(--font-display);font-size:1.5rem;color:var(--gold-hi);margin:0}
.plg-votes{display:grid;gap:8px}
.plg-vote{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;min-height:56px;padding:6px 12px;border-radius:14px;border:0;cursor:pointer;
  font:inherit;color:var(--text);text-align:left;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset}
.plg-vote[aria-pressed=true]{box-shadow:0 0 0 2px var(--gold) inset;background:rgba(212,175,55,.12)}
.plg-vote:disabled{opacity:.55;cursor:default}
.plg-vote-emoji{font-size:1.7rem;text-align:center}
.plg-vote-by{font-size:1.05rem;letter-spacing:2px}
.plg-big{font-family:var(--font-display);font-size:1.6rem;color:var(--gold-hi);margin:0;text-align:center}
.plg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
/* Tutorial slide (TV) */
.plg-slide{height:100vh;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:3.5em;padding:3.5em 4.5em;box-sizing:border-box}
.plg-slide p{font-size:1.5em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.plg-slide b,.plg-rules b,.plg-tvrules b{color:var(--gold-hi);font-weight:600}
.plg-dots{display:flex;gap:.6em;margin-top:1.2em}
.plg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.plg-dots span[data-on='true']{background:var(--gold)}
.plg-demo{display:grid;gap:1.2em;justify-items:center;font-size:.9em}
.plg-demo .plg-board{width:100%;font-size:.72em;grid-template-columns:1fr 9em 1fr;min-height:24em}
.plg-demo .plg-seat{width:4.8em}
.plg-demo-phone{width:16em;border:1px solid var(--line-strong);border-radius:1.6em;padding:1em;display:grid;gap:.6em;font-size:1.2em;background:var(--ink-1)}
.plg-demo-phone .plg-vote{min-height:2.6em;font-size:1em;padding:.3em .7em;grid-template-columns:2em 1fr auto}
.plg-demo-cap{font-family:var(--font-serif);font-style:italic;font-size:1.5em;color:var(--text-dim);text-align:center}
.plg-coin{font-family:var(--font-display);font-weight:900;color:var(--gold-hi)}
.plg-coin--minus{color:var(--crimson-hi)}
/* Rules overlay (TV) and reader (phone) */
.plg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.88)}
.plg-tvrules .mp-panel{width:min(62em,90vw);padding:2.4em 3em}
.plg-tvrules h2{font-family:var(--font-display);font-size:2.6em;margin:.2em 0 .6em;color:var(--gold-hi)}
.plg-tvrules p{font-size:1.45em;line-height:1.45;margin:0 0 .6em}
.plg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.94);overflow-y:auto;padding:16px}
.plg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.plg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.plg-rules p{margin:0;line-height:1.5}
.plg-row{display:flex;gap:8px}
.plg-row > *{flex:1}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

const whoOf = (players: Who[], id: string): Who =>
  players.find((p) => p.id === id) ?? { id, name: id, avatar: '🎩', connected: true };

// ---------------------------------------------------------------------------
// Board pieces (TV and tutorial demos)
// ---------------------------------------------------------------------------

function Seat({ who, kit, badge, active, crimson }: { who: Who; kit: Kit; badge?: string; active?: boolean; crimson?: boolean }) {
  const { Avatar } = kit;
  return (
    <div className="plg-seat">
      <Avatar emoji={who.avatar} size="3.6em" offline={!who.connected} badge={badge} active={active} crimson={crimson} />
      <span>{who.name}</span>
    </div>
  );
}

function SalonBox({
  salon,
  people,
  chip,
  dark,
  kit,
  t,
  badges,
}: {
  salon: Salon;
  people: Who[];
  chip: { text: string; on: boolean } | null;
  dark?: boolean;
  kit: Kit;
  t: T;
  badges?: Record<string, string>;
}) {
  return (
    <section className="plg-salon" data-dark={!!dark}>
      <div className="plg-salon-head">
        <span className="plg-salon-name">{t(SALON_NAME[salon])}</span>
        {chip && (
          <span className="plg-chip" data-on={chip.on}>
            {chip.text}
          </span>
        )}
      </div>
      <div className="plg-seats">
        {people.map((p) => (
          <Seat key={p.id} who={p} kit={kit} badge={badges?.[p.id]} />
        ))}
      </div>
    </section>
  );
}

function Terrace({
  exiles,
  kit,
  t,
  arrows,
  arrived,
}: {
  exiles: { who: Who; to: Salon }[];
  kit: Kit;
  t: T;
  arrows: boolean;
  arrived: string[];
}) {
  return (
    <section className="plg-terrace">
      <span className="plg-terrace-name">{t(L.terrace)}</span>
      <div className="plg-terrace-body">
        {exiles.length === 0 && <span className="plg-moon">☾</span>}
        {exiles.map(({ who, to }) => (
          <div key={who.id} className="plg-seat mp-enter" style={{ width: '9em' }}>
            <kit.Avatar
              emoji={who.avatar}
              size="4.6em"
              crimson={!arrows}
              active={arrived.includes(who.id)}
              badge={arrived.includes(who.id) ? '✓' : undefined}
              offline={!who.connected}
            />
            <span>{who.name}</span>
            {arrows && <span className="plg-arrow">→ {t(SALON_SHORT[to])}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Ledger({ counts, big, fit, t, delay = 0 }: { counts: Count[]; big?: boolean; fit?: boolean; t: T; delay?: number }) {
  const letters = Object.keys(counts[0]?.gold ?? {}).sort();
  const rows = big ? counts : counts.slice(-2);
  // On the TV stage (72em wide) each letter column takes ~2.4 font units and the row label ~5.
  const style = fit ? { fontSize: `${Math.min(3, 70 / (letters.length * 2.4 + 5)).toFixed(2)}em` } : undefined;
  return (
    <table className={`plg-ledger ${big ? 'plg-ledger--big' : 'plg-ledger--small'}`} style={style}>
      {!big && <caption>{t(L.ledger)}</caption>}
      <thead>
        <tr>
          <th />
          {letters.map((l) => (
            <th key={l}>{l}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((c, ri) => {
          const isNew = big && ri === rows.length - 1;
          const prev = counts[counts.indexOf(c) - 1];
          return (
            <tr key={c.round} data-new={isNew}>
              <td className="plg-rlabel">
                {t(L.round)} {c.round}
              </td>
              {letters.map((l, li) => {
                const v = c.gold[l] ?? 0;
                const d = prev ? v - (prev.gold[l] ?? 0) : null;
                return (
                  <td
                    key={l}
                    className={isNew ? 'plg-pop' : undefined}
                    style={isNew ? { animationDelay: `${delay + li * 120}ms` } : undefined}
                  >
                    {v}
                    {isNew && d !== null && <span className="plg-delta">{d > 0 ? `+${d}` : d === 0 ? '·' : d}</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function FinalBoard({ r, players, kit, t }: { r: FinalResult; players: Who[]; kit: Kit; t: T }) {
  const thief = whoOf(players, r.burglar);
  const side = (s: Salon) =>
    Object.keys(r.salon)
      .filter((id) => r.salon[id] === s)
      .sort((a, b) => (r.gold[b] ?? 0) - (r.gold[a] ?? 0));
  const column = (s: Salon, delay: number) => (
    <div className="plg-res plg-late" style={{ animationDelay: `${delay}ms` }}>
      <div className="plg-res-head">
        <span>{t(SALON_NAME[s])}</span>
        <small>{t(s === r.losing ? L.loses : L.wins)}</small>
      </div>
      {side(s).map((id) => {
        const p = whoOf(players, id);
        const win = r.winners.includes(id);
        const lose = r.losers.includes(id);
        return (
          <div key={id} className="plg-res-row" data-win={win} data-lose={lose}>
            <kit.Avatar emoji={p.avatar} size="2em" crimson={id === r.burglar} active={win} />
            <span>{p.name}</span>
            <span className="plg-res-letter">{r.letters[id]}</span>
            <span className="plg-res-gold">{r.gold[id]}</span>
            <span>{win ? '♛' : lose ? '✗' : ''}</span>
          </div>
        );
      })}
    </div>
  );
  const winning: Salon = r.losing === 'nobre' ? 'prive' : 'nobre';
  return (
    <div className="plg-final">
      {column(winning, 3200)}
      <div className="plg-thief plg-pop" style={{ animationDelay: '2300ms' }}>
        <kit.Avatar emoji={thief.avatar} size="9em" crimson badge="🗝" />
        <span className="plg-thief-name">{thief.name}</span>
        <span className="plg-thief-gold">
          {r.gold[r.burglar]} {t(L.gold)} · {r.letters[r.burglar]}
        </span>
        <span className="plg-thief-note">{t(r.burglarRichest ? L.burglarWon : L.burglarLost)}</span>
      </div>
      {column(r.losing, 3600)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

const DEMO: Who[] = [
  { id: 'a', name: 'Ana', avatar: '🎩', connected: true },
  { id: 'b', name: 'Beto', avatar: '🦊', connected: true },
  { id: 'c', name: 'Caio', avatar: '🌙', connected: true },
  { id: 'd', name: 'Duda', avatar: '🃏', connected: true },
  { id: 'e', name: 'Eva', avatar: '🦚', connected: true },
  { id: 'f', name: 'Fábio', avatar: '♠️', connected: true },
  { id: 'g', name: 'Gabi', avatar: '🎲', connected: true },
  { id: 'h', name: 'Hugo', avatar: '🍸', connected: true },
];

function SlideDemo({ demo, kit, t }: { demo: (typeof SLIDES)[number]['demo']; kit: Kit; t: T }) {
  if (demo === 'salons' || demo === 'night') {
    const night = demo === 'night';
    const nobre = night ? DEMO.slice(0, 4) : DEMO.slice(0, 5);
    const prive = night ? DEMO.slice(5, 7) : DEMO.slice(5);
    const minus = night ? { b: '−1', c: '−1', d: '−1', a: '+3' } : undefined;
    return (
      <div className="plg-demo">
        <div className="plg-board">
          <SalonBox salon="nobre" people={nobre} chip={null} dark={night} kit={kit} t={t} badges={minus} />
          <Terrace
            exiles={night ? [{ who: DEMO[4]!, to: 'prive' }, { who: DEMO[7]!, to: 'nobre' }] : []}
            kit={kit}
            t={t}
            arrows={false}
            arrived={[]}
          />
          <SalonBox salon="prive" people={prive} chip={null} dark={night} kit={kit} t={t} />
        </div>
        <span className="plg-demo-cap">
          {night ? '🗝 Ana: +3 · Beto, Caio, Duda: −1' : '5 · ☾ · 3'}
        </span>
      </div>
    );
  }
  if (demo === 'day') {
    const votes: [Who, string][] = [
      [DEMO[0]!, '🦊🃏'],
      [DEMO[1]!, '🎩🦊'],
      [DEMO[2]!, ''],
      [DEMO[3]!, '🦚'],
      [DEMO[4]!, ''],
    ];
    return (
      <div className="plg-demo">
        <div className="plg-demo-phone">
          <span className="plg-salon-tag">{t(L.nobre)}</span>
          <div className="plg-votes">
            {votes.map(([w, by], i) => (
              <div key={w.id} className="plg-vote" aria-pressed={i === 1}>
                <span className="plg-vote-emoji">{w.avatar}</span>
                <span>{w.name}</span>
                <span className="plg-vote-by">{by}</span>
              </div>
            ))}
          </div>
        </div>
        <span className="plg-demo-cap">{t(L.hintUnanimous)}</span>
      </div>
    );
  }
  if (demo === 'ledger') {
    const counts: Count[] = [
      { round: 2, gold: { A: 9, B: 10, C: 3, D: 8, E: 10, F: 9, G: 10, H: 9 } },
      { round: 4, gold: { A: 8, B: 10, C: 6, D: 7, E: 9, F: 9, G: 10, H: 8 } },
    ];
    return (
      <div className="plg-demo">
        <Ledger counts={counts} big t={t} />
      </div>
    );
  }
  const r: FinalResult = {
    burglar: 'a',
    losing: 'nobre',
    winners: ['f'],
    losers: ['c', 'a'],
    burglarRichest: false,
    gold: { a: 9, b: 6, c: 5, d: 7, e: 8, f: 10, g: 9, h: 8 },
    letters: { a: 'C', b: 'A', c: 'H', d: 'D', e: 'F', f: 'B', g: 'E', h: 'G' },
    salon: { a: 'nobre', b: 'nobre', c: 'nobre', d: 'nobre', e: 'nobre', f: 'prive', g: 'prive', h: 'prive' },
    scores: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 3, g: 1, h: 1 },
  };
  const players = DEMO;
  return (
    <div className="plg-demo" style={{ width: '100%' }}>
      <div className="plg-res" style={{ width: '22em' }}>
        {(['f', 'g', 'h'] as const).map((id) => (
          <div key={id} className="plg-res-row" data-win={r.winners.includes(id)}>
            <kit.Avatar emoji={whoOf(players, id).avatar} size="2.4em" active={r.winners.includes(id)} />
            <span>{whoOf(players, id).name}</span>
            <span className="plg-res-letter">{r.letters[id]}</span>
            <span className="plg-res-gold">{r.gold[id]}</span>
            <span>{r.winners.includes(id) ? '♛' : ''}</span>
          </div>
        ))}
        {(['a', 'c'] as const).map((id) => (
          <div key={id} className="plg-res-row" data-lose>
            <kit.Avatar emoji={whoOf(players, id).avatar} size="2.4em" crimson={id === 'a'} />
            <span>
              {whoOf(players, id).name}
              {id === 'a' ? ' 🗝' : ''}
            </span>
            <span className="plg-res-letter">{r.letters[id]}</span>
            <span className="plg-res-gold">{r.gold[id]}</span>
            <span>✗</span>
          </div>
        ))}
      </div>
      <span className="plg-demo-cap">{t(L.burglarLost)}</span>
    </div>
  );
}

function TutorialSlide({ view, kit, t }: { view: PublicView; kit: Kit; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="plg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="plg-h1" style={{ fontSize: '3.6em', margin: '.2em 0 .5em' }}>
          {t(s.title)}
        </h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="plg-sub" style={{ fontSize: '1.15em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="plg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="plg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} kit={kit} t={t} />
    </div>
  );
}

function TvRules({ page, kit, t }: { page: number; kit: Kit; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="plg-tvrules">
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
    <div className="plg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="plg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="plg-row">
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
  const players: Who[] = platform.players.filter((p) => !p.spectator);
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

  const night = view.phase === 'noite' || view.phase === 'troca';
  const title = {
    papel: L.papelTitle,
    dia: L.dayTitle,
    noite: L.nightTitle,
    troca: L.swapTitle,
    contagem: L.countTitle,
    final: L.finalTitle,
  }[view.phase];
  const sub = {
    papel: L.papelSub,
    dia: L.daySub,
    noite: L.nightSub,
    troca: L.swapSub,
    contagem: L.countSub,
    final: null,
  }[view.phase];
  const timed = view.phase !== 'final' && view.phase !== 'contagem';

  const ex = view.exiles;
  // Exiles stand on the Terraço until they tap "Cheguei" in their new salão.
  const onTerrace = ex ? [ex.nobre, ex.prive].filter((id) => !view.arrived.includes(id)) : [];
  const inSalon = (s: Salon) => view.salons[s].filter((id) => !onTerrace.includes(id)).map((id) => whoOf(players, id));
  const terrace = ex
    ? [
        { who: whoOf(players, ex.nobre), to: 'prive' as Salon },
        { who: whoOf(players, ex.prive), to: 'nobre' as Salon },
      ].filter((e) => onTerrace.includes(e.who.id))
    : [];
  const arrivedBadges = view.phase === 'troca' ? Object.fromEntries(view.arrived.map((id) => [id, '✓'])) : undefined;
  const chip = (s: Salon) =>
    view.phase === 'dia' ? { text: view.decided[s] ? `✓ ${t(L.decided)}` : t(L.voting), on: view.decided[s] } : null;
  const readyBadges =
    view.phase === 'papel' ? Object.fromEntries(view.ready.map((id) => [id, '✓'])) : arrivedBadges;

  let body: ReactNode;
  if (view.phase === 'contagem') {
    body = (
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <Ledger counts={view.counts} big fit t={t} delay={2300} />
      </div>
    );
  } else if (view.phase === 'final' && view.result) {
    body = <FinalBoard r={view.result} players={players} kit={kit} t={t} />;
  } else {
    body = (
      <div className="plg-main">
        <div className="plg-board">
          <SalonBox salon="nobre" people={inSalon('nobre')} chip={chip('nobre')} dark={night} kit={kit} t={t} badges={readyBadges} />
          <Terrace exiles={terrace} kit={kit} t={t} arrows={view.phase === 'troca'} arrived={view.arrived} />
          <SalonBox salon="prive" people={inSalon('prive')} chip={chip('prive')} dark={night} kit={kit} t={t} badges={readyBadges} />
        </div>
        {view.phase === 'dia' && view.counts.length > 0 && <Ledger counts={view.counts} t={t} />}
      </div>
    );
  }

  return (
    <div className="plg-wrap">
      <Styles />
      <header className="plg-head mp-enter" key={`${view.phase}-${view.round}`}>
        <div>
          <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
            {t(L.round)} {view.round}/{view.rounds}
          </span>
          <h1 className={`plg-h1${night ? ' plg-h1--night' : ''}`}>{t(title)}</h1>
          {sub && <p className="plg-sub">{t(sub)}</p>}
          {view.hint && <span className="plg-hint">{t(view.hint === 'vote' ? L.hintVote : L.hintUnanimous)}</span>}
        </div>
        {timed && <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />}
      </header>
      {body}
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/** Press and hold to see the role; the same gesture and look for everyone until it opens. */
function RoleCard({ role, t }: { role: PlayerView['role']; t: T }) {
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  return (
    <div
      className="plg-role"
      role="button"
      aria-label={t(L.holdRole)}
      data-open={open}
      data-kind={role}
      onPointerDown={show}
      onPointerUp={hide}
      onPointerLeave={hide}
      onPointerCancel={hide}
      onContextMenu={(e) => e.preventDefault()}
    >
      {open ? (
        <div>
          <div className="plg-role-name">{t(role === 'burglar' ? L.burglar : L.resident)}</div>
          <div className="plg-role-hold">{t(role === 'burglar' ? L.burglarNote : L.residentNote)}</div>
        </div>
      ) : (
        <div className="plg-role-hold">🔒 {t(L.holdRole)}</div>
      )}
    </div>
  );
}

function Player({ view, kit, t, send, platform, you }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel } = kit;
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  useEffect(() => setOptimistic(null), [view?.phase, view?.round, view && JSON.stringify(view.votes)]);
  if (!view) return null;
  const isHost = you.isAdmin;
  const me = you.you;
  const players: Who[] = platform.players.filter((p) => !p.spectator);

  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
  );
  const wrap = (children: ReactNode, withRole = true) => (
    <div className="stack">
      <Styles />
      {children}
      {withRole && <RoleCard role={view.role} t={t} />}
      {rulesButton}
      {reader}
    </div>
  );
  const clock = view.deadline !== null && (
    <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
  );

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return wrap(
      <>
        <Panel className="stack" style={{ textAlign: 'center' }}>
          <span className="mp-eyebrow">
            {t(L.tutorial)} · {view.slide + 1}/{view.slides}
          </span>
          <h3 style={{ margin: 0 }}>{t(SLIDES[view.slide]!.title)}</h3>
          {!isHost && <p className="plg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="plg-row">
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
      </>,
      false,
    );
  }

  const salonLine = (
    <p className="plg-note">
      {t(L.youAreIn)} <b style={{ color: 'var(--gold-hi)' }}>{t(SALON_NAME[view.salon])}</b>
    </p>
  );

  if (view.phase === 'papel') {
    return wrap(
      <>
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          {clock}
          <p className="plg-note">{t(L.goTo)}</p>
          <p className="plg-salon-tag">{t(SALON_NAME[view.salon])}</p>
        </Panel>
        <RoleCard role={view.role} t={t} />
        {view.ready ? (
          <p className="plg-note">{t(L.readyWait)}</p>
        ) : (
          <Button block onClick={() => send({ type: 'ready' })}>
            {t(L.ready)}
          </Button>
        )}
      </>,
      false,
    );
  }

  if (view.phase === 'dia') {
    const decided = view.decided;
    const mine = optimistic ?? view.votes[me] ?? null;
    return wrap(
      <>
        <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          {clock}
          <p className="plg-salon-tag">{t(SALON_NAME[view.salon])}</p>
          {decided ? (
            <p className="plg-big">
              {decided === me ? t(L.decidedYou) : `${whoOf(players, decided).name} ${t(L.decidedOther)}`}
            </p>
          ) : (
            <>
              <p className="plg-big">{t(L.vote)}</p>
              <p className="plg-note">{t(L.voteNote)}</p>
            </>
          )}
        </Panel>
        <div className="plg-votes">
          {view.mates.map((id) => {
            const p = whoOf(players, id);
            const by = Object.entries(view.votes)
              .filter(([, target]) => target === id)
              .map(([voter]) => whoOf(players, voter).avatar)
              .join('');
            return (
              <button
                key={id}
                type="button"
                className="plg-vote"
                aria-label={p.name}
                aria-pressed={mine === id || decided === id}
                disabled={!!decided}
                onClick={() => {
                  setOptimistic(id);
                  send({ type: 'vote', target: id });
                }}
              >
                <span className="plg-vote-emoji">{p.avatar}</span>
                <span>
                  {p.name}
                  {id === me ? ` (${t(L.you)})` : ''}
                </span>
                <span className="plg-vote-by">{by}</span>
              </button>
            );
          })}
        </div>
      </>,
    );
  }

  if (view.phase === 'noite') {
    return wrap(
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {clock}
        <p className="plg-big">{t(view.exile ? L.goTerrace : L.stay)}</p>
        <p className="plg-note">{t(view.exile ? L.goTerraceNote : L.stayNote)}</p>
      </Panel>,
    );
  }

  if (view.phase === 'troca') {
    const ex = view.exile;
    return wrap(
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        {clock}
        {ex ? (
          <>
            <p className="plg-note">{t(L.goTo)}</p>
            <p className="plg-salon-tag">{t(SALON_NAME[ex.to])}</p>
            {ex.arrived ? (
              <p className="plg-note">{t(L.arrivedWait)}</p>
            ) : (
              <Button block onClick={() => send({ type: 'arrived' })}>
                {t(L.arrived)}
              </Button>
            )}
          </>
        ) : (
          <>
            {salonLine}
            <p className="plg-note">{t(L.welcome)}</p>
          </>
        )}
      </Panel>,
    );
  }

  if (view.phase === 'final' && view.result) {
    const r = view.result;
    const win = r.winners.includes(me);
    const lose = r.losers.includes(me);
    const pts = r.scores[me] ?? 0;
    const line = win ? L.youWin : lose ? L.youLose : pts > 0 ? L.youSafe : L.youOut;
    return wrap(
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <p className="plg-big">{t(line)}</p>
        {view.role === 'burglar' && <p className="plg-note">{t(L.wasBurglar)}</p>}
        <p className="plg-note">
          {r.gold[me]} {t(L.gold)} · {r.letters[me]} · +{pts} {t(L.pts)}
        </p>
        <p className="plg-note">{t(L.watch)}</p>
      </Panel>,
      false,
    );
  }

  return wrap(
    <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
      {salonLine}
      <p className="plg-big">{t(L.watch)}</p>
    </Panel>,
  );
}

export default defineGameUI({ Display, Player });
