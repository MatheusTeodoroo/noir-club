import { useEffect, useRef, useState } from 'react';
import {
  defineGameUI,
  type DealerProps,
  type DisplayProps,
  type I18nText,
  type PlayerProps,
} from '@mp/game-sdk';
import type { DealerView, Notice, PlayerView, PublicView } from './logic.ts';
import { CODE_MISSES } from './shared.ts';

// Only `react` and `@mp/game-sdk` may be imported here (plus shared constants and logic types).
// Platform components come in through `kit`, text goes through `t()`, styles use the `sg-` prefix.

const L = {
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  rolesTitle: { 'pt-BR': 'Quem está infectado?', en: 'Who is infected?' },
  rolesDealer: {
    'pt-BR': 'Um por vez, vão ao Dealer descobrir seu papel.',
    en: 'One at a time, visit the Dealer to learn your role.',
  },
  rolesPhone: {
    'pt-BR': 'Escondam a tela e segurem o cartão no celular para ver seu papel.',
    en: 'Hide your screen and hold the card on your phone to see your role.',
  },
  roundTitle: { 'pt-BR': 'Contato', en: 'Contact' },
  roundSub: {
    'pt-BR': 'Escolha alguém no celular, encontrem-se e troquem os códigos. Quem não tocar ninguém, adoece.',
    en: 'Pick someone on your phone, meet up and swap codes. Whoever touches no one falls ill.',
  },
  timeLeft: { 'pt-BR': 'até o fim da rodada', en: 'until the round ends' },
  recent: { 'pt-BR': 'Toques recentes', en: 'Recent touches' },
  noTouches: { 'pt-BR': 'Ninguém se arriscou ainda…', en: 'Nobody has risked it yet…' },
  intervalTitle: { 'pt-BR': 'Fim da rodada', en: 'End of round' },
  intervalSub: {
    'pt-BR': 'Quantos ainda estão sãos? Conversem — a próxima rodada já vem.',
    en: 'How many are still healthy? Talk it over — the next round is coming.',
  },
  zombies: { 'pt-BR': 'Zumbis', en: 'Zombies' },
  humans: { 'pt-BR': 'Humanos', en: 'Humans' },
  finalZombies: { 'pt-BR': 'O Surto venceu', en: 'The Outbreak won' },
  finalZombiesSub: {
    'pt-BR': 'Ninguém escapou. Os Zumbis iniciais levam a mesa.',
    en: 'No one escaped. The starting Zombies take the table.',
  },
  finalSurvivors: { 'pt-BR': 'Sobreviventes', en: 'Survivors' },
  finalSurvivorsSub: {
    'pt-BR': 'Quem resistiu com mais toques vence.',
    en: 'Whoever held out with the most touches wins.',
  },
  finalTie: { 'pt-BR': 'Vitória conjunta', en: 'Joint victory' },
  finalTieSub: {
    'pt-BR': 'Todos os sobreviventes empataram — todos vencem.',
    en: 'Every survivor tied — they all win.',
  },
  patientZero: { 'pt-BR': 'Zumbis iniciais', en: 'Starting zombies' },
  outbreak: { 'pt-BR': 'Contágio', en: 'Spread' },
  noInfections: { 'pt-BR': 'Ninguém foi infectado.', en: 'Nobody was infected.' },
  idle: { 'pt-BR': 'não tocou ninguém', en: 'touched no one' },
  cured: { 'pt-BR': 'curado', en: 'cured' },
  gifts: { 'pt-BR': 'Curas doadas', en: 'Cures given' },
  standing: { 'pt-BR': 'Placar', en: 'Standings' },
  pts: { 'pt-BR': 'pts', en: 'pts' },
  // Phone
  goDealer: { 'pt-BR': 'Vá ao Dealer para descobrir seu papel.', en: 'Go to the Dealer to learn your role.' },
  roleKnown: { 'pt-BR': 'Papel visto. Guarde segredo e aguarde.', en: 'Role seen. Keep it secret and wait.' },
  hold: { 'pt-BR': 'Segure para ver seu papel', en: 'Hold to see your role' },
  youAre: { 'pt-BR': 'Você é', en: 'You are' },
  zombie: { 'pt-BR': 'Zumbi', en: 'Zombie' },
  human: { 'pt-BR': 'Humano', en: 'Human' },
  gotIt: { 'pt-BR': 'Entendi', en: 'Got it' },
  pickTarget: { 'pt-BR': 'Com quem tocar?', en: 'Who will you touch?' },
  waitingAccept: { 'pt-BR': 'Esperando resposta de', en: 'Waiting for' },
  wantsTouch: { 'pt-BR': 'quer tocar em você', en: 'wants to touch you' },
  accept: { 'pt-BR': 'Aceitar', en: 'Accept' },
  decline: { 'pt-BR': 'Recusar', en: 'Decline' },
  cancel: { 'pt-BR': 'Cancelar', en: 'Cancel' },
  yourCode: { 'pt-BR': 'Seu código — mostre para', en: 'Your code — show it to' },
  typeCode: { 'pt-BR': 'Digite o código de', en: 'Type the code of' },
  codeOk: { 'pt-BR': 'Código certo. Esperando', en: 'Code right. Waiting for' },
  tries: { 'pt-BR': 'tentativas', en: 'tries' },
  send: { 'pt-BR': 'Confirmar', en: 'Confirm' },
  cures: { 'pt-BR': 'Curas', en: 'Cures' },
  takeCure: { 'pt-BR': 'Tomar cura', en: 'Take a cure' },
  takeCureSure: {
    'pt-BR': 'Tomar uma cura agora? Ela só funciona se você foi infectado há pouco, nesta rodada.',
    en: 'Take a cure now? It only works if you were infected recently, this round.',
  },
  confirmTake: { 'pt-BR': 'Tomar', en: 'Take it' },
  giveCure: { 'pt-BR': 'Dar cura', en: 'Give a cure' },
  giveTo: { 'pt-BR': 'Dar uma cura para quem?', en: 'Give a cure to whom?' },
  back: { 'pt-BR': 'Voltar', en: 'Back' },
  giftFrom: { 'pt-BR': 'Curas recebidas de', en: 'Cures received from' },
  watch: { 'pt-BR': 'Olhe para a TV!', en: 'Look at the TV!' },
  breakNote: {
    'pt-BR': 'Intervalo. Ainda dá para dar uma cura em segredo.',
    en: 'Break. You can still give a cure in secret.',
  },
  // Dealer
  dealerZombie: {
    'pt-BR': 'Você começa infectado. Toque nos Humanos sem ser descoberto.',
    en: 'You start infected. Touch the Humans without being found out.',
  },
  dealerHuman: {
    'pt-BR': 'Você está são. Some pontos tocando Humanos — e fuja dos Zumbis.',
    en: 'You are healthy. Score by touching Humans — and avoid the Zombies.',
  },
  secret: { 'pt-BR': 'Memorize. Não conte a ninguém.', en: 'Memorise it. Tell no one.' },
} satisfies Record<string, I18nText>;

const NOTICE: Record<Notice['kind'], I18nText> = {
  touched: { 'pt-BR': 'Toque registrado com', en: 'Touch registered with' },
  declined: { 'pt-BR': 'Toque cancelado com', en: 'Touch called off with' },
  expired: { 'pt-BR': 'O pedido expirou com', en: 'The request expired with' },
  failed: { 'pt-BR': 'Códigos errados — cancelado com', en: 'Wrong codes — called off with' },
  cured: { 'pt-BR': 'Cura tomada.', en: 'Cure taken.' },
  gave: { 'pt-BR': 'Você deu uma cura para', en: 'You gave a cure to' },
  gift: { 'pt-BR': 'Você recebeu uma cura de', en: 'You received a cure from' },
};

const CSS = `
.sg-wrap{height:100vh;display:grid;grid-template-rows:auto 1fr;padding:2.6em 4em 4.5em;gap:1.6em;box-sizing:border-box;
  background:radial-gradient(ellipse at 50% 120%,rgba(122,31,43,.28),transparent 60%)}
.sg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2em}
.sg-h1{font-family:var(--font-display);font-weight:900;font-size:4.6em;letter-spacing:.06em;text-transform:uppercase;margin:0;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.sg-h1.sg-red{background:linear-gradient(180deg,var(--crimson-hi),var(--crimson) 60%,var(--crimson-lo));-webkit-background-clip:text;background-clip:text}
.sg-sub{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-dim);margin:.2em 0 0;max-width:30em}
.sg-seats{display:flex;flex-wrap:wrap;gap:2em 2.4em;justify-content:center;align-content:center}
.sg-seat{display:grid;justify-items:center;gap:.5em;font-weight:600;font-size:1.3em}
.sg-board{display:grid;grid-template-columns:1fr 1.4fr;gap:3em;align-items:center}
.sg-stat{display:grid;justify-items:center;gap:.2em}
.sg-big{font-family:var(--font-display);font-weight:900;font-size:9em;line-height:1;color:var(--gold-hi)}
.sg-big.sg-red{color:var(--crimson-hi)}
.sg-clock{font-family:var(--font-display);font-weight:900;font-size:8em;line-height:1;color:var(--gold-hi);font-variant-numeric:tabular-nums;white-space:nowrap}
.sg-clock.sg-red{color:var(--crimson-hi)}
.sg-label{font-family:var(--font-display);letter-spacing:.2em;text-transform:uppercase;font-size:1.3em;color:var(--text-dim)}
.sg-recent{display:grid;gap:1em}
.sg-pair{display:flex;align-items:center;gap:1em;font-size:1.6em;font-weight:600;padding:.5em .9em;border-radius:var(--radius-lg);
  background:rgba(255,255,255,.03);box-shadow:0 0 0 1px var(--line) inset;animation:sg-rise .6s var(--ease-out) both}
.sg-pair:first-child{box-shadow:0 0 0 1px var(--gold) inset,0 0 1.2em rgba(212,175,55,.25)}
.sg-amp{font-family:var(--font-display);color:var(--gold);font-size:1.2em}
.sg-empty{font-family:var(--font-serif);font-style:italic;font-size:1.8em;color:var(--text-mute)}
.sg-hist{display:flex;gap:1.2em;justify-content:center}
.sg-counts{display:flex;justify-content:center;gap:10em;align-items:center}
.sg-counts .sg-stat{animation:sg-pop .9s cubic-bezier(.16,1,.3,1) 2.3s both}
@keyframes sg-pop{from{opacity:0;transform:scale(.4)}}
@keyframes sg-rise{from{opacity:0;transform:translateY(.8em)}}
.sg-final{display:grid;grid-template-columns:1fr 1.1fr;gap:2.4em;min-height:0}
.sg-h1--final{font-size:3.6em}
.sg-infs{display:grid;grid-template-columns:1fr 1fr;gap:.45em 1.2em}
.sg-infs .sg-line{font-size:1.05em;gap:.45em}
.sg-infs small{white-space:nowrap}
.sg-infs .mp-chip{white-space:nowrap;font-size:.7em}
.sg-col{display:grid;align-content:start;gap:.7em;min-height:0}
.sg-step{animation:sg-rise .7s var(--ease-out) both}
.sg-line{display:flex;align-items:center;gap:.7em;font-size:1.25em;font-weight:600}
.sg-line small{font-weight:400;color:var(--text-dim);font-size:.85em}
.sg-strike{text-decoration:line-through;opacity:.6}
.sg-rank{display:grid;grid-template-columns:repeat(2,1fr);gap:.4em 1.2em}
.sg-rank .sg-line{justify-content:space-between;padding:.25em .6em;border-radius:var(--radius);background:rgba(255,255,255,.03)}
.sg-rank .sg-win{box-shadow:0 0 0 1px var(--gold) inset;color:var(--gold-hi)}
.sg-pts{font-family:var(--font-display);font-weight:900;white-space:nowrap}
.sg-zero{font-size:1.5em;line-height:1;color:var(--crimson-hi);text-shadow:0 0 .4em rgba(196,40,60,.5)}
/* phone */
.sg-note{font-family:var(--font-serif);font-style:italic;font-size:1.2rem;color:var(--text-dim);text-align:center;margin:0}
.sg-toast{text-align:center;font-weight:600;padding:10px 12px;border-radius:12px;background:rgba(212,175,55,.12);color:var(--gold-hi);animation:sg-rise .4s var(--ease-out) both}
.sg-targets{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.sg-target{display:flex;align-items:center;gap:10px;min-height:56px;padding:8px 12px;border:0;border-radius:14px;cursor:pointer;text-align:left;
  font:600 1rem var(--font-ui);color:var(--text);background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset}
.sg-target:disabled{opacity:.4;cursor:default}
.sg-target[aria-pressed=true]{box-shadow:0 0 0 2px var(--gold) inset}
.sg-code{font-family:var(--font-display);font-weight:900;font-size:4.5rem;line-height:1;color:var(--gold-hi);text-align:center;letter-spacing:.1em}
.sg-card{user-select:none;-webkit-user-select:none;touch-action:none;display:grid;place-items:center;min-height:200px;border-radius:18px;cursor:pointer;
  background:repeating-linear-gradient(45deg,rgba(212,175,55,.08) 0 10px,transparent 10px 20px),var(--ink-2);box-shadow:0 0 0 1px var(--gold) inset}
.sg-card b{font-family:var(--font-display);font-size:2.6rem;letter-spacing:.08em;text-transform:uppercase}
.sg-card .sg-z{color:var(--crimson-hi)}
.sg-card .sg-h{color:var(--gold-hi)}
.sg-cures{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sg-cures strong{font-family:var(--font-display);font-size:1.4rem;color:var(--gold-hi)}
.sg-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
/* dealer */
.sg-dealer{display:grid;place-items:center;align-content:center;gap:.6em;text-align:center;container-type:inline-size;padding:1em}
.tv .sg-dealer{min-height:100vh}
.sg-role{font-family:var(--font-display);font-weight:900;text-transform:uppercase;letter-spacing:.06em;margin:0;line-height:1.15;padding-top:.05em;
  font-size:min(9em,18cqw);animation:sg-pop .8s cubic-bezier(.16,1,.3,1) both}
.sg-role.sg-z{color:var(--crimson-hi);text-shadow:0 0 .4em rgba(196,40,60,.45)}
.sg-role.sg-h{color:var(--gold-hi);text-shadow:0 0 .4em rgba(212,175,55,.4)}
.sg-dealer p{font-family:var(--font-serif);font-style:italic;font-size:min(2em,5cqw);color:var(--text-dim);margin:0;max-width:24em}
`;

const Styles = () => <style>{CSS}</style>;

type Players = DisplayProps['platform']['players'];
const who = (players: Players, id: string | null) => players.find((p) => p.id === id);

// ───────────────────────────────── Display (TV) ─────────────────────────────────

/** Big MM:SS round clock; holds its value while the room is paused. */
function Clock({ deadline, paused, useRoomNow }: { deadline: number | null; paused: boolean; useRoomNow: () => number }) {
  const now = useRoomNow();
  const frozen = useRef<number | null>(null);
  const live = deadline === null ? 0 : Math.max(0, deadline - now);
  if (!paused) frozen.current = null;
  else if (frozen.current === null) frozen.current = live;
  const secs = Math.ceil((paused ? frozen.current! : live) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <span className={`sg-clock ${secs <= 60 ? 'sg-red' : ''}`}>
      {mm}:{ss}
    </span>
  );
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  const { Avatar, Countdown } = kit;
  const players = platform.players.filter((p) => !p.spectator);
  const name = (id: string | null) => who(players, id)?.name ?? '?';
  const avatar = (id: string | null) => who(players, id)?.avatar ?? '❔';
  const countdown = view.phase !== 'final' && (
    <Countdown deadline={view.deadline} total={view.total ?? 0} size="7em" paused={!!platform.paused} />
  );
  const eyebrow = (
    <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
      {t(L.round)} {view.round}/{view.rounds}
    </span>
  );

  if (view.phase === 'roles') {
    return (
      <div className="sg-wrap">
        <Styles />
        <header className="sg-head mp-enter" key="roles">
          <div>
            <h1 className="sg-h1">{t(L.rolesTitle)}</h1>
            <p className="sg-sub">{t(view.mode === 'dealer' ? L.rolesDealer : L.rolesPhone)}</p>
          </div>
          {countdown}
        </header>
        <div className="sg-seats">
          {players.map((p) => (
            <div key={p.id} className="sg-seat">
              <Avatar
                emoji={p.avatar}
                size="5.5em"
                offline={!p.connected}
                active={view.seen.includes(p.id)}
                crimson={platform.dealer.current === p.id}
                badge={view.seen.includes(p.id) ? '✓' : undefined}
              />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view.phase === 'round') {
    return (
      <div className="sg-wrap">
        <Styles />
        <header className="sg-head mp-enter" key={`round-${view.round}`}>
          <div>
            {eyebrow}
            <h1 className="sg-h1">{t(L.roundTitle)}</h1>
            <p className="sg-sub">{t(L.roundSub)}</p>
          </div>
        </header>
        <div className="sg-board">
          <div className="sg-stat">
            <Clock deadline={view.deadline} paused={!!platform.paused} useRoomNow={kit.useRoomNow} />
            <span className="sg-label">{t(L.timeLeft)}</span>
            {view.history.length > 0 && (
              <div className="sg-hist" style={{ marginTop: '1.4em' }}>
                {view.history.map((h) => (
                  <span key={h.round} className="mp-chip" style={{ fontSize: '1.1em' }}>
                    {t(L.round)} {h.round}: {h.zombies} {t(L.zombies)} · {h.humans} {t(L.humans)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="sg-recent">
            <span className="sg-label">{t(L.recent)}</span>
            {view.recent.length === 0 && <span className="sg-empty">{t(L.noTouches)}</span>}
            {view.recent.map((r) => (
              <div key={`${r.at}-${r.a}`} className="sg-pair">
                <Avatar emoji={avatar(r.a)} size="2.4em" />
                <span>{name(r.a)}</span>
                <span className="sg-amp">✦</span>
                <Avatar emoji={avatar(r.b)} size="2.4em" />
                <span>{name(r.b)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view.phase === 'interval') {
    const last = view.history[view.history.length - 1];
    return (
      <div className="sg-wrap">
        <Styles />
        <header className="sg-head mp-enter" key={`interval-${view.round}`}>
          <div>
            {eyebrow}
            <h1 className="sg-h1">
              {t(L.intervalTitle)} {view.round}
            </h1>
            <p className="sg-sub">{t(L.intervalSub)}</p>
          </div>
          {countdown}
        </header>
        <div className="sg-counts">
          <div className="sg-stat">
            <span className="sg-big sg-red">{last?.zombies ?? 0}</span>
            <span className="sg-label">{t(L.zombies)}</span>
          </div>
          <div className="sg-stat" style={{ animationDelay: '2.7s' }}>
            <span className="sg-big">{last?.humans ?? 0}</span>
            <span className="sg-label">{t(L.humans)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Final: the whole timeline, staged after the drumroll.
  const f = view.final;
  if (!f) return null;
  const title = f.scenario === 'zombies' ? L.finalZombies : f.scenario === 'tie' ? L.finalTie : L.finalSurvivors;
  const sub = f.scenario === 'zombies' ? L.finalZombiesSub : f.scenario === 'tie' ? L.finalTieSub : L.finalSurvivorsSub;
  const ranking = [...players].sort((a, b) => (f.scores[b.id] ?? 0) - (f.scores[a.id] ?? 0));
  const top = Math.max(0, ...Object.values(f.scores));
  let step = 0;
  const delay = () => ({ animationDelay: `${2300 + step++ * 220}ms` });
  return (
    <div className="sg-wrap">
      <Styles />
      <header className="sg-head mp-enter" key="final">
        <div>
          <h1 className={`sg-h1 sg-h1--final ${f.scenario === 'zombies' ? 'sg-red' : ''}`}>{t(title)}</h1>
          <p className="sg-sub">{t(sub)}</p>
        </div>
      </header>
      <div className="sg-final">
        <div className="sg-col">
          <span className="sg-label sg-step" style={delay()}>
            {t(L.patientZero)}
          </span>
          <div className="sg-line sg-step" style={delay()}>
            {f.initial.map((id) => (
              <span key={id} className="sg-line">
                <Avatar emoji={avatar(id)} size="2.4em" crimson />
                {name(id)}
              </span>
            ))}
          </div>
          <span className="sg-label sg-step" style={delay()}>
            {t(L.outbreak)}
          </span>
          {f.infections.length === 0 && (
            <span className="sg-empty sg-step" style={delay()}>
              {t(L.noInfections)}
            </span>
          )}
          <div className="sg-infs">
          {f.infections.slice(0, 14).map((i) => (
            <div key={`${i.id}-${i.at}`} className="sg-line sg-step" style={delay()}>
              <Avatar emoji={avatar(i.id)} size="1.5em" />
              <span className={i.curedAt !== null ? 'sg-strike' : undefined}>{name(i.id)}</span>
              <small>
                {i.by ? `← ${name(i.by)}` : t(L.idle)} · {t(L.round)} {i.round}
              </small>
              {i.curedAt !== null && <span className="mp-chip mp-chip--ok">✚ {t(L.cured)}</span>}
            </div>
          ))}
          </div>
          {f.gifts.length > 0 && (
            <>
              <span className="sg-label sg-step" style={delay()}>
                {t(L.gifts)}
              </span>
              <div className="sg-line sg-step" style={{ ...delay(), flexWrap: 'wrap' }}>
                {f.gifts.slice(0, 8).map((g, i) => (
                  <span key={i} className="mp-chip">
                    {name(g.from)} → {name(g.to)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="sg-col">
          <span className="sg-label sg-step" style={delay()}>
            {t(L.standing)}
          </span>
          <div className="sg-rank">
            {ranking.map((p) => {
              const alive = f.survivors.includes(p.id);
              const zero = f.initial.includes(p.id);
              // Zombies score nothing; when they take the game, the starting ones are the winners.
              const win = f.scenario === 'zombies' ? zero : (f.scores[p.id] ?? 0) === top && top > 0;
              return (
                <div key={p.id} className={`sg-line sg-step ${win ? 'sg-win' : ''}`} style={delay()}>
                  <span className="sg-line">
                    <Avatar emoji={p.avatar} size="1.5em" active={win} crimson={!alive} />
                    {p.name}
                  </span>
                  {zero ? (
                    <span className="sg-zero" title={t(L.patientZero)}>
                      ☣
                    </span>
                  ) : (
                    <span className="sg-pts">
                      {f.scores[p.id] ?? 0} <small>{t(L.pts)}</small>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────── Player (phone) ─────────────────────────────────

function Player({ view, kit, t, send, platform }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel, Avatar, TextInput } = kit;
  const now = kit.useRoomNow();
  const [screen, setScreen] = useState<'main' | 'cure' | 'give'>('main');
  const [giveTo, setGiveTo] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    setPending(null);
    setGiveTo(null);
    setScreen('main');
  }, [view?.phase, view?.round, view?.request?.id, view?.request?.accepted, view?.cures]);
  // A refused request changes nothing in the view; unlock the list again after a moment.
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setPending(null), 2_500);
    return () => clearTimeout(id);
  }, [pending]);
  if (!view) return null;
  const players = platform.players.filter((p) => !p.spectator);
  const name = (id: string | null) => who(players, id)?.name ?? '?';

  const toast =
    view.notice && now - view.notice.at < 8_000 ? (
      <div className="sg-toast" key={view.notice.at}>
        {t(NOTICE[view.notice.kind])}
        {view.notice.other ? ` ${name(view.notice.other)}.` : ''}
      </div>
    ) : null;

  const timer = (
    <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
      <Countdown deadline={view.deadline} total={view.total ?? 0} size={72} paused={!!platform.paused} />
    </Panel>
  );

  const giveScreen = (
    <div className="stack">
      <p className="sg-note">{t(L.giveTo)}</p>
      <div className="sg-targets">
        {view.targets.map((tg) => {
          const p = who(players, tg.id);
          return (
            <button
              key={tg.id}
              type="button"
              className="sg-target"
              aria-label={p?.name}
              aria-pressed={giveTo === tg.id}
              onClick={() => setGiveTo(tg.id)}
            >
              <Avatar emoji={p?.avatar ?? '❔'} size={32} />
              {p?.name}
            </button>
          );
        })}
      </div>
      <div className="sg-row2">
        <Button variant="ghost" onClick={() => setScreen('main')}>
          {t(L.back)}
        </Button>
        <Button disabled={!giveTo} onClick={() => giveTo && send({ type: 'give', target: giveTo })}>
          {t(L.giveCure)}
        </Button>
      </div>
    </div>
  );

  const curePanel = (canTake: boolean) => (
    <Panel className="stack">
      <div className="sg-cures">
        <span>
          {t(L.cures)} <strong>{view.cures}</strong>
        </span>
      </div>
      {view.giftsFrom.length > 0 && (
        <small style={{ color: 'var(--text-dim)' }}>
          {t(L.giftFrom)} {view.giftsFrom.map(name).join(', ')}
        </small>
      )}
      <div className={canTake ? 'sg-row2' : undefined}>
        {canTake && (
          <Button variant="crimson" disabled={view.cures < 1} onClick={() => setScreen('cure')}>
            ✚ {t(L.takeCure)}
          </Button>
        )}
        <Button variant="ghost" block={!canTake} disabled={view.cures < 1} onClick={() => setScreen('give')}>
          {t(L.giveCure)}
        </Button>
      </div>
    </Panel>
  );

  if (view.phase === 'roles') {
    if (view.mode === 'dealer') {
      return (
        <Panel>
          <Styles />
          <p className="sg-note">{t(view.seen ? L.roleKnown : L.goDealer)}</p>
        </Panel>
      );
    }
    return (
      <div className="stack">
        <Styles />
        <div
          className="sg-card"
          role="button"
          aria-label={t(L.hold)}
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
        >
          {holding && view.role ? (
            <div className="stack" style={{ justifyItems: 'center' }}>
              <span className="sg-note">{t(L.youAre)}</span>
              <b className={view.role === 'zombie' ? 'sg-z' : 'sg-h'}>{t(view.role === 'zombie' ? L.zombie : L.human)}</b>
            </div>
          ) : (
            <span className="sg-note">{t(L.hold)}</span>
          )}
        </div>
        {view.seen ? (
          <p className="sg-note">{t(L.roleKnown)}</p>
        ) : (
          <Button block onClick={() => send({ type: 'seen' })}>
            {t(L.gotIt)}
          </Button>
        )}
      </div>
    );
  }

  if (view.phase === 'final') {
    return (
      <Panel>
        <Styles />
        <p className="sg-note">{t(L.watch)}</p>
      </Panel>
    );
  }

  if (view.phase === 'interval') {
    return (
      <div className="stack">
        <Styles />
        {toast}
        {screen === 'give' ? (
          giveScreen
        ) : (
          <>
            <Panel>
              <p className="sg-note">{t(L.breakNote)}</p>
            </Panel>
            {curePanel(false)}
          </>
        )}
      </div>
    );
  }

  // Round
  if (screen === 'give') {
    return (
      <div className="stack">
        <Styles />
        {giveScreen}
      </div>
    );
  }
  if (screen === 'cure') {
    return (
      <div className="stack">
        <Styles />
        <Panel>
          <p className="sg-note">{t(L.takeCureSure)}</p>
        </Panel>
        <div className="sg-row2">
          <Button variant="ghost" onClick={() => setScreen('main')}>
            {t(L.back)}
          </Button>
          <Button variant="crimson" onClick={() => send({ type: 'cure' })}>
            ✚ {t(L.confirmTake)}
          </Button>
        </div>
      </div>
    );
  }

  const req = view.request;
  let body;
  if (req && !req.accepted && req.outgoing) {
    body = (
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <Countdown deadline={req.deadline} total={req.total ?? 0} size={64} paused={!!platform.paused} />
        <p className="sg-note">
          {t(L.waitingAccept)} {name(req.partner)}…
        </p>
        <Button variant="ghost" block onClick={() => send({ type: 'cancel' })}>
          {t(L.cancel)}
        </Button>
      </Panel>
    );
  } else if (req && !req.accepted) {
    body = (
      <Panel className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <Avatar emoji={who(players, req.partner)?.avatar ?? '❔'} size={64} active />
        <p className="sg-note">
          {name(req.partner)} {t(L.wantsTouch)}
        </p>
        <div className="sg-row2" style={{ width: '100%' }}>
          <Button variant="ghost" onClick={() => send({ type: 'decline' })}>
            {t(L.decline)}
          </Button>
          <Button onClick={() => send({ type: 'accept' })}>{t(L.accept)}</Button>
        </div>
      </Panel>
    );
  } else if (req) {
    body = (
      <Panel className="stack" style={{ textAlign: 'center' }}>
        <small style={{ color: 'var(--text-dim)' }}>
          {t(L.yourCode)} {name(req.partner)}
        </small>
        <div className="sg-code">{req.myCode}</div>
        {req.iConfirmed ? (
          <p className="sg-note">
            {t(L.codeOk)} {name(req.partner)}…
          </p>
        ) : (
          <>
            <small style={{ color: 'var(--text-dim)' }}>
              {t(L.typeCode)} {name(req.partner)} · {req.missesLeft}/{CODE_MISSES} {t(L.tries)}
            </small>
            <TextInput
              key={req.missesLeft}
              maxLength={2}
              oneWord
              placeholder="00"
              submitLabel={t(L.send)}
              onSubmit={(text) => {
                const value = Number(text);
                if (Number.isInteger(value) && value >= 10 && value <= 99) send({ type: 'code', value });
              }}
            />
          </>
        )}
        <div style={{ justifySelf: 'center' }}>
          <Countdown deadline={req.deadline} total={req.total ?? 0} size={48} paused={!!platform.paused} />
        </div>
        <Button variant="ghost" small onClick={() => send({ type: 'cancel' })}>
          {t(L.cancel)}
        </Button>
      </Panel>
    );
  } else {
    body = (
      <div className="stack">
        <p className="sg-note">{t(L.pickTarget)}</p>
        <div className="sg-targets">
          {view.targets.map((tg) => {
            const p = who(players, tg.id);
            return (
              <button
                key={tg.id}
                type="button"
                className="sg-target"
                aria-label={p?.name}
                aria-pressed={pending === tg.id}
                disabled={tg.touched || tg.busy || pending !== null}
                onClick={() => {
                  setPending(tg.id);
                  send({ type: 'touch', target: tg.id });
                }}
              >
                <Avatar emoji={p?.avatar ?? '❔'} size={32} offline={!p?.connected} badge={tg.touched ? '✓' : undefined} />
                {p?.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <Styles />
      {toast}
      {!req && timer}
      {body}
      {curePanel(true)}
    </div>
  );
}

// ───────────────────────────────── Dealer ─────────────────────────────────

function Dealer({ view, t }: DealerProps<DealerView>) {
  const z = view.role === 'zombie';
  return (
    <div className="sg-dealer">
      <Styles />
      <p>{t(L.youAre)}</p>
      <h1 className={`sg-role ${z ? 'sg-z' : 'sg-h'}`}>{t(z ? L.zombie : L.human)}</h1>
      <p>{t(z ? L.dealerZombie : L.dealerHuman)}</p>
      <p style={{ color: 'var(--gold)' }}>{t(L.secret)}</p>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });
