import { useEffect, useState } from 'react';
import { defineGameUI, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { Card, LogEvent, PlayerView, PublicView, SlotView } from './logic.ts';
import { CARDS, MISSIONS } from './shared.ts';
import { AlarmCard, Badge, CARD_CSS, CardBack, CardFace, MissionCard, TypeIcon, rich } from './cards.tsx';
import { L, RULES, SLIDES } from './texts.ts';

// Agent Decker (Manuel Correia, CC BY-NC 4.0). Only `react` and `@mp/game-sdk` may be imported
// from outside the game; platform components come in through `kit`; classes use the `adg-` prefix.

type T = (text: I18nText) => string;

const CSS = `
${CARD_CSS}
.adg-tv{height:100vh;display:grid;grid-template-rows:auto auto auto 1fr auto;gap:.9em;padding:1.4em 2.4em 1em;color:#fff;
  background:radial-gradient(120% 80% at 50% 0%,#23262d 0%,#141518 55%,#0b0b0c 100%);font-family:Oswald,var(--font-ui),sans-serif;overflow:hidden}
.adg-head{display:flex;align-items:center;gap:2em}
.adg-brand{line-height:1}
.adg-brand i{display:block;font:300 .95em Oswald,sans-serif;letter-spacing:.9em;color:#9aa1ad;font-style:normal}
.adg-brand b{display:block;font:400 2.6em 'Saira Stencil One',Oswald,sans-serif;letter-spacing:.05em}
.adg-goal{flex:1;display:flex;align-items:center;gap:1em;min-width:0}
.adg-goal-m{font:600 1.3em Oswald,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:var(--mc)}
.adg-goal-g{font:300 2.2em/1 Oswald,sans-serif;color:var(--mc)}
.adg-goal-t{font:400 1.45em Oswald,sans-serif}
.adg-goal-t .adg-ico{width:1.8em;height:1.8em;vertical-align:-.5em}
.adg-met{background:#2c8a3c;color:#fff;font:600 1em Oswald,sans-serif;padding:.25em .7em;border-radius:99em;letter-spacing:.04em;animation:adg-pulse 1.6s ease-in-out infinite}
@keyframes adg-pulse{50%{box-shadow:0 0 1.2em #3fae49}}
.adg-stat{display:grid;justify-items:center;font:400 1em Oswald,sans-serif;color:#9aa1ad;text-transform:uppercase;letter-spacing:.08em}
.adg-stat b{font:600 2em/1 Oswald,sans-serif;color:#fff;letter-spacing:0}
.adg-bar{display:flex;align-items:center;gap:1.4em;min-height:2.6em}
.adg-hint{flex:1;display:flex;align-items:center;gap:.6em;font:400 1.35em Oswald,sans-serif;color:#ffe59a;background:rgba(242,205,44,.08);
  border-left:.2em solid #f2cd2c;padding:.35em .9em;border-radius:.2em}
.adg-hint .adg-ico{width:1.3em;height:1.3em}
.adg-log{display:flex;gap:1em;justify-content:flex-end;font:300 1.15em Oswald,sans-serif;color:#c9ced8;margin-left:auto}
.adg-log span{animation:adg-in .5s var(--ease-out) both;white-space:nowrap}
.adg-log b{color:#ff8f8b;font-weight:600}
@keyframes adg-in{from{opacity:0;transform:translateY(.4em)}}
.adg-lineRow{display:flex;align-items:flex-start;justify-content:center;gap:1.1em}
.adg-pile{display:grid;justify-items:center;gap:.35em;font:400 1em Oswald,sans-serif;color:#9aa1ad;text-transform:uppercase;letter-spacing:.06em}
.adg-pile b{font:600 1.4em Oswald,sans-serif;color:#fff}
.adg-pile .adg-back,.adg-pile .adg-ghost{font-size:.55em}
.adg-ghost{width:10em;height:14em;border-radius:.5em;border:.12em dashed rgba(255,255,255,.18)}
.adg-line{display:flex;gap:.7em;font-size:.86em;padding:.5em .9em .4em;background:rgba(255,255,255,.025);border-radius:.6em;
  box-shadow:0 0 0 .06em rgba(255,255,255,.06) inset}
.adg-slot{display:grid;justify-items:center;gap:.3em;position:relative}
.adg-slot > :first-child{animation:adg-slide .55s var(--ease-out) both}
@keyframes adg-slide{from{opacity:0;transform:translateX(-2.5em)}}
.adg-slotNo{font:500 1.05em Oswald,sans-serif;color:#7d8491}
.adg-slot.adg-can .adg-c{box-shadow:0 0 0 .14em #6f95ff,0 0 1.4em rgba(111,149,255,.55)}
.adg-tag{position:absolute;top:-.6em;left:50%;transform:translateX(-50%);font:600 .8em Oswald,sans-serif;background:#c3162a;color:#fff;padding:.1em .5em;border-radius:.3em;white-space:nowrap;z-index:2}
.adg-exit{position:absolute;right:-.15em;top:50%;transform:translate(100%,-50%);font-size:2.2em;color:#ff8f8b;opacity:.75}
.adg-agent{display:grid;grid-template-columns:auto auto 1fr auto;gap:1.6em;align-items:start;min-height:0}
.adg-sect{display:grid;gap:.4em;align-content:start;min-width:0}
.adg-lbl{font:500 .95em Oswald,sans-serif;text-transform:uppercase;letter-spacing:.12em;color:#9aa1ad;display:flex;gap:.6em;align-items:baseline}
.adg-lbl em{font-style:normal;color:#fff;font-weight:600}
.adg-pool{display:grid;gap:.6em}
.adg-res{display:flex;align-items:center;gap:.5em;font:600 3.2em/1 Oswald,sans-serif}
.adg-res .adg-ico{width:1em;height:1em;vertical-align:0}
.adg-dots{display:flex;gap:.35em}
.adg-dots i{width:.9em;height:.9em;border-radius:50%;border:.12em solid #6f95ff}
.adg-dots i.on{background:#6f95ff}
.adg-hand{display:flex;font-size:1em;padding-top:.3em}
.adg-hand > *{transition:margin .3s}
.adg-zones{display:flex;gap:1.4em;align-items:flex-start;font-size:1em}
.adg-mini{display:flex;flex-wrap:wrap;gap:.3em;font-size:.5em;max-width:22em}
.adg-equip{display:grid;grid-template-columns:repeat(2,auto);gap:.35em;font-size:.72em;justify-content:start}
.adg-foot{text-align:center;font:300 .95em Oswald,sans-serif;color:#7d8491;letter-spacing:.04em;padding-right:12em;padding-left:12em}
.adg-over{position:fixed;inset:0;z-index:5;display:grid;place-items:center;background:rgba(8,8,10,.86);backdrop-filter:blur(.3em);animation:adg-in .5s both}
.adg-full{position:fixed;inset:0;z-index:4;display:grid;grid-template-columns:auto 1fr;gap:4em;align-items:center;padding:4em 6em 5em;
  background:radial-gradient(120% 80% at 30% 20%,#262a33 0%,#121316 60%,#09090a 100%);color:#fff;font-family:Oswald,sans-serif}
.adg-full h1{font:600 3.6em/1.1 Oswald,sans-serif;text-transform:uppercase;letter-spacing:.03em;margin:0 0 .3em;padding-top:.05em}
.adg-full p{font:300 1.4em/1.35 Oswald,sans-serif;margin:.35em 0;color:#dfe3ea;max-width:32em}
.adg-full p b{font-weight:600;color:#fff}
.adg-full p .adg-ico{width:1.3em;height:1.3em}
.adg-eyebrow{font:500 1.1em Oswald,sans-serif;letter-spacing:.4em;text-transform:uppercase;color:#9aa1ad}
.adg-bigLogo{font-size:2em}
.adg-credits p{font-size:1.3em;max-width:40em}
.adg-dotsNav{display:flex;gap:.6em;margin-top:1.6em}
.adg-dotsNav i{width:.8em;height:.8em;border-radius:50%;background:#3a3f4a}
.adg-dotsNav i.on{background:#f2cd2c}
.adg-demo{display:flex;gap:1.2em;align-items:center;font-size:1.4em;position:relative}
.adg-call{position:absolute;font:700 .8em Oswald,sans-serif;background:#f2cd2c;color:#1e1e1e;border-radius:.3em;padding:.05em .35em}
.adg-arrow{font-size:3em;color:#9aa1ad}
.adg-steps{display:grid;gap:.8em;font-size:1.5em}
.adg-step{display:flex;gap:.6em;align-items:center}
.adg-step b{display:grid;place-items:center;width:1.8em;height:1.8em;border-radius:50%;background:#2f6fd6;font-weight:700}
.adg-panel{background:#16181d;border-radius:1em;padding:2.4em 3em;box-shadow:0 0 0 .08em rgba(255,255,255,.08) inset,0 2em 4em rgba(0,0,0,.6);max-width:62em}
.adg-panel h2{font:600 2.8em/1.1 Oswald,sans-serif;text-transform:uppercase;margin:0 0 .4em}
.adg-panel p{font:300 1.5em/1.4 Oswald,sans-serif;margin:.4em 0;color:#dfe3ea}
.adg-panel p b{font-weight:600;color:#fff}
.adg-results{display:flex;gap:1.2em;margin:1.2em 0}
.adg-results div{display:grid;justify-items:center;gap:.3em;font:400 1.1em Oswald,sans-serif;color:#9aa1ad;min-width:5em}
.adg-results b{font:600 2.2em/1 Oswald,sans-serif;color:#fff}
.adg-score{font:600 3.5em/1 Oswald,sans-serif;color:#f2cd2c}

/* phone */
.adg-ph{display:grid;gap:12px;font-family:Oswald,var(--font-ui),sans-serif;color:#fff;padding-bottom:84px}
.adg-ph .adg-lbl{font-size:13px}
.adg-status{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;background:#1a1c21;border-radius:12px;padding:10px 12px}
.adg-status .adg-goal-m{font-size:13px}
.adg-status-goal{font:400 15px/1.25 Oswald,sans-serif}
.adg-status-goal .adg-ico{width:20px;height:20px;vertical-align:-5px}
.adg-chips{display:flex;gap:10px;align-items:center;font:600 20px Oswald,sans-serif}
.adg-chips .adg-ico{width:22px;height:22px;vertical-align:-4px}
.adg-alarmChip{display:flex;align-items:center;gap:4px;font:600 20px Oswald,sans-serif}
.adg-alarmChip .adg-ico{width:24px;height:24px}
.adg-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.adg-tile{position:relative;min-height:92px;border:0;border-radius:10px;padding:8px 8px 6px;text-align:left;color:#fff;cursor:pointer;
  background:linear-gradient(162deg,#2b2e35 0 34%,#0d0d0e 34.5%);box-shadow:0 0 0 1px rgba(255,255,255,.1) inset;font-family:Oswald,sans-serif;display:grid;align-content:space-between}
.adg-tile.can{box-shadow:0 0 0 2px #6f95ff inset,0 0 14px rgba(111,149,255,.4)}
.adg-tile.down{background:#14161a;color:#6c7380}
.adg-tile.empty{background:transparent;box-shadow:0 0 0 1px rgba(255,255,255,.12) inset;cursor:default}
.adg-tile-no{font:500 11px Oswald,sans-serif;color:#9aa1ad}
.adg-tile-name{font:600 14px/1.05 Oswald,sans-serif;text-transform:uppercase;margin-top:12px}
.adg-tile-row{display:flex;align-items:center;gap:4px;margin-top:4px}
.adg-tile-row .adg-ico{width:26px;height:26px}
.adg-tile-row svg.adg-ico-t{width:14px;height:14px;margin-left:auto;color:#cfd3dc}
.adg-tile-x{position:absolute;right:6px;top:6px;font:600 11px Oswald,sans-serif;color:#ff8f8b}
.adg-handGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:16px}
.adg-handGrid .adg-c{width:100%;font-size:inherit;cursor:pointer;height:6.2em}
.adg-handGrid button{all:unset;display:block;cursor:pointer;border-radius:.5em}
.adg-handGrid button[aria-pressed=true] .adg-c{box-shadow:0 0 0 3px #f2cd2c}
.adg-handGrid button.sel2 .adg-c{box-shadow:0 0 0 3px #6f95ff}
.adg-handGrid .adg-ord{position:absolute;right:.3em;bottom:.3em;background:#f2cd2c;color:#111;font:700 .9em Oswald,sans-serif;border-radius:99em;padding:0 .45em;z-index:2}
.adg-actions{display:flex;gap:8px;flex-wrap:wrap}
.adg-actions > *{flex:1}
.adg-equipRow{display:flex;gap:6px;flex-wrap:wrap;font-size:11px}
.adg-dock{position:fixed;left:0;right:0;bottom:0;z-index:6;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));
  background:rgba(12,12,14,.94);box-shadow:0 -1px 0 rgba(255,255,255,.08)}
.adg-dock > :last-child{flex:1}
.adg-dock > :not(:last-child){flex:none;min-width:64px;padding:4px 10px;flex-direction:column;gap:3px}
.adg-status-goal .adg-ico{width:26px !important;height:26px !important;vertical-align:-8px !important}
.adg-dockIco{display:block;font-size:20px;line-height:1}
.adg-dockTxt{display:block;font-size:10px;letter-spacing:.05em}
.adg-sheet{position:fixed;inset:0;z-index:8;background:rgba(6,6,8,.82);display:grid;align-items:end;animation:adg-in .25s both}
.adg-sheetBox{background:#16181d;border-radius:18px 18px 0 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom));display:grid;gap:12px;max-height:92vh;overflow:auto}
.adg-sheetCard{display:flex;justify-content:center;font-size:21px}
.adg-note{font:300 15px/1.3 Oswald,sans-serif;color:#cfd3dc;margin:0}
.adg-note .adg-ico{width:18px;height:18px;vertical-align:-4px}
.adg-warn{font:400 15px/1.3 Oswald,sans-serif;color:#ffb0a8;margin:0}
.adg-warn .adg-ico{width:18px;height:18px;vertical-align:-4px}
.adg-seg{display:flex;gap:6px;flex-wrap:wrap}
.adg-seg button{flex:1;min-height:44px;border-radius:10px;border:0;background:#24272e;color:#fff;font:500 15px Oswald,sans-serif;cursor:pointer}
.adg-seg button[aria-pressed=true]{background:#2f56c8}
.adg-split{display:flex;align-items:center;justify-content:center;gap:14px;font:600 22px Oswald,sans-serif}
.adg-split .adg-ico{width:26px;height:26px;vertical-align:-5px}
.adg-split button{width:44px;height:44px;border-radius:50%;border:0;background:#24272e;color:#fff;font-size:22px;cursor:pointer}
.adg-rules h3{font:600 22px Oswald,sans-serif;text-transform:uppercase;margin:0}
.adg-rules p{font:300 16px/1.4 Oswald,sans-serif;margin:0 0 8px;color:#dfe3ea}
.adg-rules p b{font-weight:600;color:#fff}
.adg-rules .adg-ico{width:18px;height:18px;vertical-align:-4px}
.adg-center{display:grid;gap:12px;justify-items:center;text-align:center}
.adg-center h2{font:600 26px Oswald,sans-serif;text-transform:uppercase;margin:0}
`;

const Styles = () => <style>{CSS}</style>;

const cardName = (t: T, id: string, half: 'top' | 'bottom' = 'bottom') => {
  const c = CARDS[id];
  if (!c) return id;
  return t(half === 'bottom' && c.bottom ? c.bottom.name : c.top.name);
};

function logText(t: T, e: LogEvent) {
  switch (e.k) {
    case 'leave':
      return (
        <>
          {cardName(t, e.def)} {t(L.logLeave)} <b>+{e.n}</b>
        </>
      );
    case 'leaveDown':
      return `${cardName(t, e.def)} ${t(L.logLeaveDown)}`;
    case 'siren':
      return (
        <>
          {t(L.logSiren)} <b>+{e.n}</b>
        </>
      );
    case 'flip':
      return `${t(L.logFlip)} ${cardName(t, e.def)}`;
    case 'disarm':
      return `${t(L.logDisarm)} ${cardName(t, e.def)}`;
    case 'knock':
      return `${t(L.logKnock)} ${cardName(t, e.def)}`;
    case 'equip':
      return `${t(L.logEquip)} ${cardName(t, e.def, 'top')}`;
    case 'item':
      return `${t(L.logItem)} ${cardName(t, e.def, 'top')} ${t(L.in)} ${cardName(t, e.target)}`;
    case 'obShuffle':
      return t(L.logObShuffle);
    case 'deckShuffle':
      return t(L.logDeckShuffle);
  }
}

function GoalLine({ view, t, compact }: { view: PublicView; t: T; compact?: boolean }) {
  const m = MISSIONS[view.mission]!;
  return (
    <div className="adg-goal" style={{ '--mc': m.color } as React.CSSProperties}>
      <div>
        <div className="adg-goal-m">
          {t(m.title)} · {view.mission + 1}/{view.missions}
        </div>
        {compact ? (
          <div className="adg-status-goal">{rich(t(m.goalText))}</div>
        ) : (
          <div className="row" style={{ gap: '.5em', alignItems: 'baseline' }}>
            <span className="adg-goal-g">{t(L.goalWord)}</span>
            <span className="adg-goal-t">{rich(t(m.goalText))}</span>
          </div>
        )}
      </div>
      {view.goalMet && !compact && <span className="adg-met">{t(L.goalMet)}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TV
// ---------------------------------------------------------------------------

function Credits({ t }: { t: T }) {
  return (
    <div className="adg-credits">
      <p>{t(L.credit1)}</p>
      <p>{t(L.credit2)}</p>
      <p>{t(L.credit3)}</p>
      <p>{t(L.credit4)}</p>
    </div>
  );
}

function Brand({ big }: { big?: boolean }) {
  return (
    <div className={`adg-brand ${big ? 'adg-bigLogo' : ''}`}>
      <i>AGENT</i>
      <b>DECKER</b>
    </div>
  );
}

function SlideDemo({ demo, t }: { demo: (typeof SLIDES)[number]['demo']; t: T }) {
  if (demo === 'overview') {
    return (
      <div className="adg-demo" style={{ fontSize: '1.45em' }}>
        <CardFace id="guard" t={t} />
        <CardFace id="camera" t={t} />
        <AlarmCard alarm={12} />
      </div>
    );
  }
  if (demo === 'anatomy') {
    return (
      <div className="adg-demo" style={{ fontSize: '1.9em' }}>
        <div style={{ position: 'relative' }}>
          <CardFace id="camera" t={t} />
          <span className="adg-call" style={{ left: '2.6em', top: '-.9em' }}>{t({ 'pt-BR': 'Recompensa', en: 'Reward' })}</span>
          <span className="adg-call" style={{ left: '-1.2em', top: '6.2em' }}>{t({ 'pt-BR': 'Obstáculo', en: 'Obstacle' })}</span>
          <span className="adg-call" style={{ left: '10.2em', top: '8.7em' }}>{t({ 'pt-BR': 'Custo', en: 'Cost' })}</span>
          <span className="adg-call" style={{ left: '10.2em', top: '11.6em' }}>{t({ 'pt-BR': 'Alarme', en: 'Alarm' })}</span>
          <span className="adg-call" style={{ left: '-.6em', top: '12.9em' }}>{t({ 'pt-BR': 'Tipo', en: 'Type' })}</span>
        </div>
      </div>
    );
  }
  if (demo === 'interact') {
    return (
      <div className="adg-demo" style={{ fontSize: '1.3em' }}>
        <CardFace id="sleeping" t={t} />
        <div className="stack" style={{ gap: '1em' }}>
          <div className="row" style={{ gap: '.6em', alignItems: 'center' }}>
            <span className="adg-arrow">→</span>
            <CardFace id="sleeping" t={t} variant="top" />
          </div>
          <div className="row" style={{ gap: '.6em', alignItems: 'center' }}>
            <span className="adg-arrow">↓</span>
            <CardBack className="" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="adg-demo" style={{ fontSize: '.9em' }}>
      <CardBack />
      {['camera', 'guard', 'yard', 'dog', 'patrol'].map((id) => (
        <CardFace key={id} id={id} t={t} />
      ))}
      <span className="adg-arrow">→</span>
    </div>
  );
}

function Intro({ view, t }: { view: PublicView; t: T }) {
  const last = view.slide === view.slides - 1;
  const nav = (
    <div className="adg-dotsNav">
      {Array.from({ length: view.slides }, (_, i) => (
        <i key={i} className={i === view.slide ? 'on' : ''} />
      ))}
    </div>
  );
  if (view.slide === 0) {
    return (
      <div className="adg-full mp-enter" key="s0">
        <div style={{ fontSize: '3em' }}>
          <CardBack />
        </div>
        <div>
          <Brand big />
          <p style={{ fontSize: '1.8em', marginTop: '.6em' }}>{t(L.byline)}</p>
          <div className="adg-eyebrow" style={{ marginTop: '1.6em' }}>
            {t(L.creditsTitle)}
          </div>
          <Credits t={t} />
          {nav}
        </div>
      </div>
    );
  }
  if (last) {
    return (
      <div className="adg-full mp-enter" key="brief">
        <div style={{ fontSize: '2.6em' }}>
          <MissionCard index={0} t={t} />
        </div>
        <div>
          <div className="adg-eyebrow">{t(L.briefing)}</div>
          <h1 style={{ color: MISSIONS[0]!.color }}>{t(MISSIONS[0]!.title)}</h1>
          <p>{t(L.briefingSub)}</p>
          <p style={{ fontSize: '2em' }}>{rich(t(MISSIONS[0]!.goalText))}</p>
          {nav}
        </div>
      </div>
    );
  }
  const s = SLIDES[view.slide - 1]!;
  return (
    <div className="adg-full mp-enter" key={`s${view.slide}`}>
      <SlideDemo demo={s.demo} t={t} />
      <div>
        <div className="adg-eyebrow">{view.slide}/{view.slides - 2}</div>
        <h1>{t(s.title)}</h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {nav}
      </div>
    </div>
  );
}

function RulesPanel({ page, t }: { page: number; t: T }) {
  const r = RULES[page]!;
  return (
    <div className="adg-over">
      <div className="adg-panel mp-enter" key={page}>
        <div className="adg-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </div>
        <h2>{t(r.title)}</h2>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
      </div>
    </div>
  );
}

function MissionDone({ view, t }: { view: PublicView; t: T }) {
  const done = MISSIONS[view.mission - 1]!;
  return (
    <div className="adg-full mp-enter" key="done">
      <div className="row" style={{ fontSize: '2.2em', gap: '.8em' }}>
        <MissionCard index={view.mission - 1} t={t} />
        <MissionCard index={view.mission} t={t} />
      </div>
      <div>
        <div className="adg-eyebrow" style={{ color: done.color }}>
          {t(done.title)}
        </div>
        <h1>{t(L.missionComplete)}</h1>
        <p>
          {t(L.alarmAt)}: <b>{view.results.at(-1)}</b> · +{50 - (view.results.at(-1) ?? 0)}
        </p>
        <p>
          {t(L.reward)}: <b>{cardName(t, done.reward, 'top')}</b>
          {CARDS[done.reward]!.top.text && <> — {rich(t(CARDS[done.reward]!.top.text!))}</>}
        </p>
        <div className="adg-eyebrow" style={{ marginTop: '1.4em' }}>
          {t(L.nextMission)}
        </div>
        <p style={{ fontSize: '2em', color: MISSIONS[view.mission]!.color }}>
          {t(MISSIONS[view.mission]!.title)}: {rich(t(MISSIONS[view.mission]!.goalText))}
        </p>
      </div>
    </div>
  );
}

function Over({ view, t, kit, platform }: { view: PublicView; t: T } & Pick<DisplayProps, 'kit' | 'platform'>) {
  const o = view.outcome!;
  const title = o.won ? L.won : o.reason === 'alarm' ? L.lostAlarm : o.reason === 'time' ? L.lostTime : L.lostLeft;
  const sub = o.won ? L.wonSub : o.reason === 'alarm' ? L.lostAlarmSub : o.reason === 'time' ? L.lostTimeSub : L.lostLeftSub;
  return (
    <div className="adg-full mp-enter" key="over">
      <div style={{ fontSize: '2.6em' }}>{o.won ? <MissionCard index={Math.min(view.mission, 4)} t={t} /> : <AlarmCard alarm={view.alarm} />}</div>
      <div>
        <div className="adg-eyebrow">AGENT DECKER</div>
        <h1 style={{ color: o.won ? '#f2cd2c' : '#ff6b5e' }}>{t(title)}</h1>
        <p>{t(sub)}</p>
        <div className="adg-eyebrow" style={{ marginTop: '1.2em' }}>
          {t(L.results)}
        </div>
        <div className="adg-results">
          {MISSIONS.slice(0, view.missions).map((m, i) => (
            <div key={i}>
              <span style={{ color: m.color }}>{t(m.title)}</span>
              <b>{view.results[i] ?? '—'}</b>
            </div>
          ))}
        </div>
        <p>
          {t(L.totalAlarm)}: <b>{view.results.reduce((a, b) => a + b, 0)}</b>
        </p>
        <div className="row" style={{ gap: '1.4em', alignItems: 'center', marginTop: '.6em' }}>
          <span className="adg-score">{view.score}</span>
          <span style={{ fontSize: '1.3em', color: '#9aa1ad' }}>{t(L.points)}</span>
          <kit.Countdown deadline={view.deadline} total={view.total ?? 0} size="4em" paused={!!platform.paused} />
        </div>
      </div>
    </div>
  );
}

function handOverlap(n: number, width: number, cardW: number) {
  if (n <= 1) return 0;
  return Math.min(0.5, (width - n * cardW) / (n - 1));
}

function Display({ view, kit, t, platform }: DisplayProps<PublicView>) {
  if (!view) return null;
  const { Countdown } = kit;
  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <Intro view={view} t={t} />
        {view.tvRules !== null && <RulesPanel page={view.tvRules} t={t} />}
      </>
    );
  }

  const hintText = { play: L.hintPlay, interact: L.hintInteract, goal: L.hintGoal, end: L.hintEnd } as const;
  const overlap = handOverlap(view.hand.length, 38, 10);
  const discardTop = view.discard.at(-1);

  return (
    <div className="adg-tv">
      <Styles />
      <header className="adg-head">
        <Brand />
        <GoalLine view={view} t={t} />
        <div className="adg-stat">
          {t(L.turn)}
          <b>{view.turn}</b>
        </div>
        <div className="adg-stat">
          {t(L.interactions)}
          <b>
            {view.interactions}/{view.maxInteractions}
          </b>
        </div>
        {view.deadline !== null && <Countdown deadline={view.deadline} total={view.total ?? 0} size="5em" paused={!!platform.paused} />}
      </header>

      <div className="adg-bar">
        {view.pendingKind ? (
          <div className="adg-hint">{t(L.choosing)}</div>
        ) : (
          view.hint && <div className="adg-hint mp-enter" key={view.hint}>{rich(t(hintText[view.hint]))}</div>
        )}
        <div className="adg-log">
          {view.log.slice(0, view.hint || view.pendingKind ? 2 : 3).map((l) => (
            <span key={l.id}>{logText(t, l.e)}</span>
          ))}
        </div>
      </div>

      <div className="adg-lineRow">
        <div className="adg-pile">
          {view.obDeck ? <CardBack /> : <div className="adg-ghost" />}
          {t(L.obDeck)}
          <b>{view.obDeck}</b>
        </div>
        <div className="adg-line">
          {view.line.map((s, i) => (
            <LineSlot key={s?.uid ?? `e${i}-${view.scrolls}`} slot={s} index={i} t={t} view={view} last={i === 5} />
          ))}
        </div>
        <div className="adg-pile">
          {view.obDiscard ? <CardBack dim /> : <div className="adg-ghost" />}
          {t(L.obDiscard)}
          <b>{view.obDiscard}</b>
        </div>
      </div>

      <div className="adg-agent">
        <div className="adg-sect">
          <div className="adg-lbl">
            {t(L.alarm)} <em>{view.alarm}/50</em>
          </div>
          <div style={{ fontSize: '.74em' }}>
            <AlarmCard alarm={view.alarm} />
          </div>
        </div>
        <div className="adg-sect adg-pool">
          <div className="adg-lbl">{t(L.pool)}</div>
          <div className="adg-res">
            <span className="adg-ico" style={{ position: 'relative' }}>
              <Badge kind="stealth" />
            </span>
            {view.pool.stealth}
          </div>
          <div className="adg-res">
            <span className="adg-ico" style={{ position: 'relative' }}>
              <Badge kind="fight" />
            </span>
            {view.pool.fight}
          </div>
          <div className="adg-dots" aria-label={t(L.interactions)}>
            {Array.from({ length: view.maxInteractions }, (_, i) => (
              <i key={i} className={i < view.maxInteractions - view.interactions ? 'on' : ''} />
            ))}
          </div>
        </div>
        <div className="adg-sect">
          <div className="adg-lbl">
            {t(L.hand)} <em>{view.hand.length}</em>
          </div>
          <div className="adg-hand">
            {view.hand.map((c, i) => (
              <div key={c.uid} style={{ marginLeft: i ? `${overlap}em` : 0, position: 'relative' }}>
                <CardFace id={c.def} t={t} variant="top" className="mp-enter" />
                {view.saved === c.uid && <span className="adg-tag">{t(L.saved)}</span>}
              </div>
            ))}
          </div>
          <div className="adg-zones" style={{ marginTop: '.6em' }}>
            <Zone label={L.playArea} cards={view.play} t={t} />
            <div className="adg-sect">
              <div className="adg-lbl">
                {t(L.deck)} <em>{view.deck}</em> · {t(L.discard)} <em>{view.discard.length}</em>
                {view.removed > 0 && (
                  <>
                    · <em>{view.removed}</em> {t(L.removed)}
                  </>
                )}
              </div>
              <div className="row" style={{ gap: '.4em', fontSize: '.34em' }}>
                {view.deck ? <CardBack /> : <div className="adg-ghost" />}
                {discardTop ? <CardFace id={discardTop.def} t={t} variant="full" /> : <div className="adg-ghost" />}
              </div>
            </div>
          </div>
        </div>
        <div className="adg-sect" style={{ paddingRight: '1em' }}>
          <div className="adg-lbl">{t(L.equipArea)}</div>
          <div className="adg-equip">
            {view.equip.map((c) => (
              <CardFace key={c.uid} id={c.def} t={t} variant="top" />
            ))}
          </div>
        </div>
      </div>

      <footer className="adg-foot">{t(L.footer)}</footer>

      {view.phase === 'mission' && <MissionDone view={view} t={t} />}
      {view.phase === 'over' && <Over view={view} t={t} kit={kit} platform={platform} />}
      {view.tvRules !== null && <RulesPanel page={view.tvRules} t={t} />}
    </div>
  );
}

function Zone({ label, cards, t }: { label: I18nText; cards: Card[]; t: T }) {
  return (
    <div className="adg-sect">
      <div className="adg-lbl">
        {t(label)} <em>{cards.length}</em>
      </div>
      <div className="adg-mini">
        {cards.map((c) => (
          <CardFace key={c.uid} id={c.def} t={t} variant="top" />
        ))}
      </div>
    </div>
  );
}

function LineSlot({ slot, index, t, view, last }: { slot: SlotView | null; index: number; t: T; view: PublicView; last: boolean }) {
  if (!slot) {
    return (
      <div className="adg-slot">
        <div className="adg-ghost" />
        <span className="adg-slotNo">{index + 1}</span>
      </div>
    );
  }
  const can =
    view.phase === 'play' &&
    !slot.down &&
    !slot.blocked &&
    view.interactions < view.maxInteractions &&
    (slot.affordable || slot.items.length > 0);
  return (
    <div className={`adg-slot ${can ? 'adg-can' : ''}`}>
      {slot.down ? <CardBack /> : <CardFace id={slot.def} t={t} cost={slot.cost} />}
      {slot.blocked && <span className="adg-tag">🚫</span>}
      <span className="adg-slotNo">{index + 1}</span>
      {last && <span className="adg-exit">›</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

function RulesReader({ t, view, send, onClose }: { t: T; view: PublicView; send(a: unknown): void; onClose(): void }) {
  const [page, setPage] = useState(view.tvRules ?? 0);
  const onTv = view.tvRules !== null;
  useEffect(() => {
    if (onTv) send({ type: 'tvRules', page });
  }, [page]);
  const r = RULES[page]!;
  return (
    <div className="adg-sheet" role="dialog">
      <div className="adg-sheetBox adg-rules">
        <div className="adg-lbl">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </div>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="adg-seg">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹ {t(L.prev)}
          </button>
          <button type="button" disabled={page === RULES.length - 1} onClick={() => setPage(page + 1)}>
            {t(L.next)} ›
          </button>
        </div>
        <div className="adg-seg">
          <button type="button" aria-pressed={onTv} onClick={() => send({ type: 'tvRules', page: onTv ? null : page })}>
            📺 {t(onTv ? L.hideFromTv : L.showOnTv)}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onTv) send({ type: 'tvRules', page: null });
              onClose();
            }}
          >
            {t(L.close)}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ view, t }: { view: PublicView; t: T }) {
  return (
    <div className="adg-status">
      <GoalLine view={view} t={t} compact />
      <div className="adg-alarmChip" aria-label={t(L.alarm)}>
        <span className="adg-ico" style={{ position: 'relative' }}>
          <Badge kind="alarm" />
        </span>
        {view.alarm}
      </div>
      <div className="adg-chips">
        <span>
          <span className="adg-ico" style={{ position: 'relative' }}>
            <Badge kind="stealth" />
          </span>{' '}
          {view.pool.stealth}
        </span>
        <span>
          <span className="adg-ico" style={{ position: 'relative' }}>
            <Badge kind="fight" />
          </span>{' '}
          {view.pool.fight}
        </span>
      </div>
      <div className="adg-lbl" style={{ justifySelf: 'end' }}>
        <em>{view.maxInteractions - view.interactions}</em> {t(L.interLeft)}
      </div>
    </div>
  );
}

function InteractSheet({
  view,
  index,
  t,
  kit,
  send,
  onClose,
}: {
  view: PublicView;
  index: number;
  t: T;
  kit: PlayerProps['kit'];
  send(a: unknown): void;
  onClose(): void;
}) {
  const slot = view.line[index];
  const [item, setItem] = useState<string | null>(null);
  const cost = slot?.cost ?? null;
  const lo = cost ? Math.max(0, cost.n - view.pool.fight) : 0;
  const hi = cost ? Math.min(cost.n, view.pool.stealth) : 0;
  const [st, setSt] = useState(lo);
  if (!slot) return null;
  const def = CARDS[slot.def]!;
  const left = view.interactions < view.maxInteractions;
  const payable = item !== null || slot.affordable;
  const ok = !slot.down && !slot.blocked && left && payable;
  const act = (extra: Record<string, unknown>) => {
    send({ type: 'interact', slot: index, ...(item ? { item } : cost?.kind === 'any' ? { stealth: st } : {}), ...extra });
    onClose();
  };
  const neighbours = [index - 1, index + 1].filter((j) => view.line[j] && !view.line[j]!.down);

  return (
    <div className="adg-sheet" role="dialog" onClick={onClose}>
      <div className="adg-sheetBox" onClick={(e) => e.stopPropagation()}>
        <div className="adg-sheetCard">{slot.down ? <CardBack /> : <CardFace id={slot.def} t={t} cost={slot.cost} />}</div>
        {slot.down ? (
          <p className="adg-note">{t(L.knockedOut)}</p>
        ) : (
          <>
            {slot.blocked === 'hawk' && <p className="adg-warn">{rich(t(L.blockedHawk))}</p>}
            {slot.blocked === 'sniper' && <p className="adg-warn">{rich(t(L.blockedSniper))}</p>}
            {!slot.blocked && !left && <p className="adg-warn">{t(L.blockedLimit)}</p>}
            {!slot.blocked && left && !payable && <p className="adg-warn">{t(L.blockedCost)}</p>}
            {slot.items.length > 0 && !slot.blocked && left && (
              <>
                <div className="adg-lbl">{t(L.payWith)}</div>
                <div className="adg-seg">
                  <button type="button" aria-pressed={item === null} disabled={!slot.affordable} onClick={() => setItem(null)}>
                    {t(L.resources)}
                  </button>
                  {slot.items.map((u) => {
                    const id = view.equip.find((c) => c.uid === u)?.def ?? '';
                    return (
                      <button key={u} type="button" aria-pressed={item === u} onClick={() => setItem(u)}>
                        {cardName(t, id, 'top')}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {ok && item === null && cost?.kind === 'any' && hi > lo && (
              <>
                <div className="adg-lbl">{t(L.split)}</div>
                <div className="adg-split">
                  <button type="button" aria-label="-" onClick={() => setSt(Math.max(lo, st - 1))}>
                    −
                  </button>
                  <span>
                    <span className="adg-ico" style={{ position: 'relative' }}>
                      <Badge kind="stealth" />
                    </span>{' '}
                    {st} +{' '}
                    <span className="adg-ico" style={{ position: 'relative' }}>
                      <Badge kind="fight" />
                    </span>{' '}
                    {cost.n - st}
                  </span>
                  <button type="button" aria-label="+" onClick={() => setSt(Math.min(hi, st + 1))}>
                    +
                  </button>
                </div>
              </>
            )}
            {ok && (
              <div className="stack" style={{ gap: 8 }}>
                <kit.Button block onClick={() => act({ mode: 'disarm' })}>
                  {t(L.disarm)}
                </kit.Button>
                {def.top.keep && (
                  <kit.Button block onClick={() => act({ mode: 'disarm', equip: true })}>
                    {t(L.disarmEquip)}
                  </kit.Button>
                )}
                <kit.Button block variant="crimson" onClick={() => act({ mode: 'knock' })}>
                  {t(L.knock)}
                </kit.Button>
                {def.bottom?.passive === 'clumsy' &&
                  neighbours.map((j) => (
                    <kit.Button key={j} block variant="ghost" onClick={() => act({ mode: 'adjacent', target: j })}>
                      {t(j < index ? L.knockLeft : L.knockRight)}
                    </kit.Button>
                  ))}
                <p className="adg-note">{t(L.disarmHelp)}</p>
                <p className="adg-note">{t(L.knockHelp)}</p>
              </div>
            )}
          </>
        )}
        <kit.Button block variant="ghost" onClick={onClose}>
          {t(L.close)}
        </kit.Button>
      </div>
    </div>
  );
}

function LineTiles({ view, t, onPick, pickAll }: { view: PublicView; t: T; onPick(i: number): void; pickAll?: boolean }) {
  return (
    <div className="adg-tiles">
      {view.line.map((s, i) => {
        if (!s) {
          return (
            <div key={`e${i}`} className="adg-tile empty">
              <span className="adg-tile-no">{i + 1}</span>
            </div>
          );
        }
        const b = CARDS[s.def]!.bottom!;
        const can = !s.down && !s.blocked && view.interactions < view.maxInteractions && (s.affordable || s.items.length > 0);
        return (
          <button
            key={s.uid}
            type="button"
            className={`adg-tile ${s.down ? 'down' : ''} ${can || pickAll ? 'can' : ''}`}
            aria-label={s.down ? `${i + 1}` : t(b.name)}
            onClick={() => onPick(i)}
          >
            <span className="adg-tile-no">{i + 1}</span>
            {s.blocked && <span className="adg-tile-x">🚫</span>}
            <span className="adg-tile-name">{s.down ? 'AGENT DECKER' : t(b.name)}</span>
            {!s.down && s.cost && (
              <span className="adg-tile-row">
                <span className="adg-ico" style={{ position: 'relative' }}>
                  <Badge kind={s.cost.kind} n={s.cost.n} />
                </span>
                <span className="adg-ico" style={{ position: 'relative' }}>
                  <Badge kind="alarm" n={b.alarm} />
                </span>
                <TypeIcon type={b.type} className="adg-ico adg-ico-t" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Choices asked by a card effect. */
function PendingPanel({ view, t, kit, send }: { view: PlayerView; t: T; kit: PlayerProps['kit']; send(a: unknown): void }) {
  const kind = view.pendingKind!;
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked([]), [kind, view.looking?.length]);
  const toggle = (u: string, max = Infinity) =>
    setPicked(picked.includes(u) ? picked.filter((x) => x !== u) : picked.length < max ? [...picked, u] : picked);

  const help = {
    bin: L.pendingBin,
    misdirect: L.pendingMisdirect,
    burn: L.pendingBurn,
    recall: L.pendingRecall,
    saveBullets: L.pendingSave,
    justTheThing: L.pendingJust,
    distraction: L.pendingDistraction,
    planAhead: L.pendingPlan,
    foresight: L.pendingForesight,
  }[kind];

  if (kind === 'distraction') {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <p className="adg-note">{t(help)}</p>
        <LineTiles view={view} t={t} pickAll onPick={(i) => send({ type: 'resolve', slot: i })} />
      </div>
    );
  }

  const fromHand = kind === 'bin' || kind === 'misdirect' || kind === 'saveBullets';
  const fromDiscard = kind === 'burn' || kind === 'recall';
  const source: Card[] = fromHand ? view.hand : fromDiscard ? view.discard : (view.looking ?? []);
  const max = kind === 'burn' ? 2 : kind === 'recall' || kind === 'saveBullets' || kind === 'justTheThing' ? 1 : Infinity;
  const ordering = kind === 'planAhead' || kind === 'foresight';
  const need = kind === 'recall' || kind === 'justTheThing' ? 1 : ordering ? source.length : 0;
  const ready = ordering || need ? picked.length === need : true;

  const submit = () => {
    if (kind === 'planAhead') send({ type: 'resolve', keep: picked[0], order: picked.slice(1) });
    else if (kind === 'foresight') send({ type: 'resolve', order: picked });
    else send({ type: 'resolve', uids: picked });
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="adg-note">{rich(t(help))}</p>
      <div className="adg-handGrid">
        {source.map((c) => {
          const at = picked.indexOf(c.uid);
          return (
            <button
              key={c.uid}
              type="button"
              aria-pressed={at >= 0}
              aria-label={cardName(t, c.def, 'top')}
              style={{ position: 'relative' }}
              onClick={() => toggle(c.uid, ordering ? Infinity : max)}
            >
              <CardFace id={c.def} t={t} variant="top" />
              {ordering && at >= 0 && (
                <span className="adg-ord">{kind === 'planAhead' && at === 0 ? t(L.keepLabel) : kind === 'planAhead' ? at : at + 1}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="adg-actions">
        {ordering && (
          <kit.Button variant="ghost" onClick={() => setPicked([])}>
            {t(L.reset)}
          </kit.Button>
        )}
        <kit.Button disabled={!ready} onClick={submit}>
          {!ordering && !need && picked.length === 0 ? t(L.none) : t(L.confirm)}
        </kit.Button>
      </div>
    </div>
  );
}

function Player({ view, kit, t, send }: PlayerProps<PlayerView>) {
  const [sel, setSel] = useState<string | null>(null);
  const [sheet, setSheet] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  useEffect(() => setSel(null), [view?.hand.length, view?.turn]);
  if (!view) return null;
  const { Button } = kit;

  const reader = rules && <RulesReader t={t} view={view} send={send} onClose={() => setRules(false)} />;

  if (view.phase === 'intro') {
    const last = view.slide === view.slides - 1;
    return (
      <div className="adg-ph adg-center" style={{ paddingBottom: 0 }}>
        <Styles />
        <h2>{view.slide === 0 ? 'Agent Decker' : last ? t(L.briefing) : t(SLIDES[view.slide - 1]!.title)}</h2>
        <p className="adg-note">{t(L.introPhone)}</p>
        {view.slide === 0 && (
          <div className="adg-rules" style={{ textAlign: 'left' }}>
            <p>{t(L.credit1)}</p>
            <p>{t(L.credit2)}</p>
            <p>{t(L.credit3)}</p>
            <p>{t(L.credit4)}</p>
          </div>
        )}
        <div className="adg-actions" style={{ width: '100%' }}>
          <Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
            ‹ {t(L.prev)}
          </Button>
          <Button onClick={() => send({ type: 'intro', dir: 1 })}>{last ? t(L.start) : `${t(L.next)} ›`}</Button>
        </div>
        {!last && (
          <Button block variant="ghost" onClick={() => send({ type: 'intro', dir: 'skip' })}>
            {t(L.skip)}
          </Button>
        )}
        <Button block variant="ghost" onClick={() => setRules(true)}>
          📖 {t(L.rules)}
        </Button>
        {reader}
      </div>
    );
  }

  if (view.phase === 'mission' || view.phase === 'over') {
    return (
      <div className="adg-ph adg-center" style={{ paddingBottom: 0 }}>
        <Styles />
        <h2>{view.phase === 'mission' ? t(L.missionComplete) : t(view.outcome?.won ? L.won : L.watchTv)}</h2>
        <p className="adg-note">{t(view.phase === 'mission' ? L.missionPhone : L.overPhone)}</p>
        {view.phase === 'mission' && (
          <div style={{ fontSize: 18 }}>
            <MissionCard index={view.mission} t={t} />
          </div>
        )}
        <Button block onClick={() => send({ type: view.phase === 'mission' ? 'continue' : 'finish' })}>
          {t(view.phase === 'mission' ? L.continue : L.seeScore)}
        </Button>
        <Button block variant="ghost" onClick={() => setRules(true)}>
          📖 {t(L.rules)}
        </Button>
        {reader}
      </div>
    );
  }

  const selected = view.hand.find((c) => c.uid === sel) ?? null;
  const top = selected ? CARDS[selected.def]!.top : null;

  return (
    <div className="adg-ph">
      <Styles />
      <StatusBar view={view} t={t} />
      {view.pendingKind ? (
        <PendingPanel view={view} t={t} kit={kit} send={send} />
      ) : (
        <>
          <div className="adg-lbl">
            {t(L.theLine)} <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {t(L.tapLine)}</span>
          </div>
          <LineTiles view={view} t={t} onPick={setSheet} />
          <div className="adg-lbl">
            {t(L.hand)} <em>{view.hand.length}</em>
            <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {t(L.tapToPlay)}</span>
          </div>
          <div className="adg-handGrid">
            {view.hand.map((c) => (
              <button
                key={c.uid}
                type="button"
                aria-pressed={sel === c.uid}
                aria-label={cardName(t, c.def, 'top')}
                style={{ position: 'relative' }}
                onClick={() => setSel(sel === c.uid ? null : c.uid)}
              >
                <CardFace id={c.def} t={t} variant="top" />
                {view.saved === c.uid && <span className="adg-ord">{t(L.saved)}</span>}
              </button>
            ))}
          </div>
          {selected && top && (
            <div className="adg-actions">
              {top.effect === 'rock' ? (
                <>
                  <Button onClick={() => send({ type: 'play', uid: selected.uid, opt: 'fight' })}>{rich(t(L.rockFight))}</Button>
                  <Button onClick={() => send({ type: 'play', uid: selected.uid, opt: 'draw' })}>{t(L.rockDraw)}</Button>
                </>
              ) : (
                (top.res || top.effect) && <Button onClick={() => send({ type: 'play', uid: selected.uid })}>{t(L.play)}</Button>
              )}
              {top.keep && (
                <Button variant="ghost" onClick={() => send({ type: 'equip', uid: selected.uid })}>
                  {t(L.equip)}
                </Button>
              )}
            </div>
          )}
          {view.equip.length > 0 && (
            <>
              <div className="adg-lbl">{t(L.equipArea)}</div>
              <div className="adg-equipRow">
                {view.equip.map((c) => (
                  <CardFace key={c.uid} id={c.def} t={t} variant="top" />
                ))}
              </div>
            </>
          )}
          <div className="adg-lbl">
            {t(L.playArea)} <em>{view.play.length}</em> · {t(L.deck)} <em>{view.deck}</em> · {t(L.discard)} <em>{view.discard.length}</em>
          </div>
        </>
      )}
      <div className="adg-dock">
        <Button variant="ghost" small disabled={!view.canUndo || !!view.pendingKind} onClick={() => send({ type: 'undo' })}>
          <span className="adg-dockIco">↶</span>
          <span className="adg-dockTxt">{t(L.undo)}</span>
        </Button>
        <Button variant="ghost" small onClick={() => setRules(true)}>
          <span className="adg-dockIco">📖</span>
          <span className="adg-dockTxt">{t(L.rules)}</span>
        </Button>
        <Button variant="crimson" disabled={!!view.pendingKind} onClick={() => send({ type: 'endTurn' })}>
          {t(L.endTurn)}
        </Button>
      </div>
      {sheet !== null && !view.pendingKind && (
        <InteractSheet key={`${sheet}-${view.line[sheet]?.uid}`} view={view} index={sheet} t={t} kit={kit} send={send} onClose={() => setSheet(null)} />
      )}
      {reader}
    </div>
  );
}

export default defineGameUI({ Display, Player });
