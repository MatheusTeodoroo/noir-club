import { useEffect, useState, type ReactNode } from 'react';
import { defineGameUI, type DealerProps, type DisplayProps, type I18nText, type PlayerProps } from '@mp/game-sdk';
import type { CompanyView, DealerHintsView, MarketView, PlayerView, PublicView, RuleToken } from './logic.ts';
import { CREDITS, RULES, SLIDES, type Demo } from './texts.ts';
import { BANDS, MAX_QTY, ROUNDS, money, type Lang } from './shared.ts';

// Only `react`, `@mp/game-sdk` and this game's secret-free modules (texts.ts, shared.ts) are
// imported here. Styles are scoped with the `mdsg-` prefix.

type T = (text: I18nText) => string;

const L = {
  title: { 'pt-BR': 'Mercado das Sombras', en: 'Shadow Market' },
  round: { 'pt-BR': 'Rodada', en: 'Round' },
  closing: { 'pt-BR': 'Fechamento', en: 'Market close' },
  finalClose: { 'pt-BR': 'Fechamento final', en: 'Final close' },
  held: { 'pt-BR': 'Em carteira', en: 'Held' },
  buys: { 'pt-BR': 'Compras', en: 'Buys' },
  sells: { 'pt-BR': 'Vendas', en: 'Sells' },
  shares: { 'pt-BR': 'ações', en: 'shares' },
  share: { 'pt-BR': 'ação', en: 'share' },
  start: { 'pt-BR': 'Início', en: 'Start' },
  reveal: { 'pt-BR': 'Revelação das regras', en: 'Rules revealed' },
  revealSub: { 'pt-BR': 'Novas palavras de cada regra', en: 'More words of every rule' },
  allRevealed: { 'pt-BR': 'Todas as regras reveladas', en: 'Every rule revealed' },
  rankPos: { 'pt-BR': 'º', en: '' },
  pts: { 'pt-BR': 'pts', en: 'pts' },
  pt: { 'pt-BR': 'pt', en: 'pt' },
  // phone
  cash: { 'pt-BR': 'Caixa', en: 'Cash' },
  worth: { 'pt-BR': 'Patrimônio', en: 'Net worth' },
  rank: { 'pt-BR': 'Posição', en: 'Rank' },
  you: { 'pt-BR': 'você', en: 'you' },
  qty: { 'pt-BR': 'Quantidade', en: 'Quantity' },
  buy: { 'pt-BR': 'Comprar', en: 'Buy' },
  sell: { 'pt-BR': 'Vender', en: 'Sell' },
  sellAll: { 'pt-BR': 'Vender tudo', en: 'Sell all' },
  max: { 'pt-BR': 'Máx', en: 'Max' },
  blindNote: {
    'pt-BR': 'Sob Segredo: o preço é real, mas ninguém vê. Seu caixa fica oculto até o Segredo acabar.',
    en: 'Under a Secret: the price is real but nobody sees it. Your cash stays hidden until it ends.',
  },
  blindCash: { 'pt-BR': 'Você negociou às cegas — caixa oculto.', en: 'You traded blind — cash hidden.' },
  secret: { 'pt-BR': 'Segredo', en: 'Secret' },
  secretHere: { 'pt-BR': '🤫 Ativar meu Segredo aqui', en: '🤫 Use my Secret here' },
  secretConfirm: { 'pt-BR': 'Confirmar: ocultar por 2 rodadas', en: 'Confirm: hide for 2 rounds' },
  secretSet: { 'pt-BR': 'Seu Segredo vai em', en: 'Your Secret goes on' },
  secretWhen: { 'pt-BR': 'no fechamento (dá para cancelar até lá).', en: 'at the close (cancel until then).' },
  cancel: { 'pt-BR': 'Cancelar', en: 'Cancel' },
  secretSpent: { 'pt-BR': 'Seu Segredo já foi usado.', en: 'Your Secret is spent.' },
  secretLeft: { 'pt-BR': 'Você tem 1 Segredo para a partida.', en: 'You have 1 Secret for the match.' },
  hiddenNow: { 'pt-BR': 'Oculta por um Segredo', en: 'Hidden by a Secret' },
  closedTitle: { 'pt-BR': 'Mercado fechado', en: 'Market closed' },
  closedSub: { 'pt-BR': 'Olhe a TV: os preços estão mudando.', en: 'Look at the TV: prices are moving.' },
  finalSub: { 'pt-BR': 'Seu patrimônio final', en: 'Your final net worth' },
  points: { 'pt-BR': 'pontos', en: 'points' },
  tapCompany: { 'pt-BR': 'Toque numa empresa para negociar.', en: 'Tap a company to trade.' },
  noise: { 'pt-BR': '+ ruído', en: '+ noise' },
  hintsTitle: { 'pt-BR': 'Dicas das regras', en: 'Rule hints' },
  hintsSub: { 'pt-BR': 'Novas palavras nas rodadas 5, 10 e 15; tudo na 20.', en: 'More words at rounds 5, 10 and 15; everything at 20.' },
  legendHidden: { 'pt-BR': 'oculto', en: 'hidden' },
  legendNext: { 'pt-BR': 'aparece no próximo marco', en: 'appears at the next milestone' },
  tutorial: { 'pt-BR': 'Tutorial', en: 'Tutorial' },
  hostAdvances: { 'pt-BR': 'O Host avança pelo celular', en: 'The Host moves on from their phone' },
  followTv: { 'pt-BR': 'Acompanhe o tutorial na TV.', en: 'Follow the tutorial on the TV.' },
  prev: { 'pt-BR': 'Anterior', en: 'Back' },
  next: { 'pt-BR': 'Próximo', en: 'Next' },
  begin: { 'pt-BR': 'Começar', en: 'Start' },
  skip: { 'pt-BR': 'Pular tutorial', en: 'Skip tutorial' },
  rules: { 'pt-BR': 'Regras', en: 'Rules' },
  showOnTv: { 'pt-BR': 'Mostrar na TV', en: 'Show on TV' },
  hideFromTv: { 'pt-BR': 'Tirar da TV', en: 'Hide from TV' },
  close: { 'pt-BR': 'Fechar', en: 'Close' },
  credits: { 'pt-BR': 'Créditos', en: 'Credits' },
} satisfies Record<string, I18nText>;

const CSS = `
/* ---------- TV board (same arrangement as the reference: logo + 7 cards in a 4×2 grid, ranking on the right) */
.mdsg-tv{height:100vh;box-sizing:border-box;padding:1em 1.1em;display:grid;grid-template-columns:minmax(0,1fr) 18.5em;grid-template-rows:minmax(0,1fr) auto;gap:.7em 1em;
  background:radial-gradient(120% 90% at 30% 10%,#1a1622 0%,#0d0b11 60%,#08070b 100%)}
.mdsg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:.8em;min-height:0;position:relative}
.mdsg-brand{display:grid;justify-items:center;align-content:center;gap:.6em;text-align:center;min-width:0}
.mdsg-logo{width:7em;height:7em;filter:drop-shadow(0 0 .9em rgba(70,90,255,.45))}
.mdsg-brandname{font-family:var(--font-display);font-weight:900;font-size:1.3em;letter-spacing:.03em;line-height:1.15;padding-top:.05em;text-transform:uppercase;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 55%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.mdsg-roundrow{display:flex;align-items:center;gap:.6em}
.mdsg-roundbox{font-family:var(--font-display);font-weight:900;font-size:1.55em;letter-spacing:.03em;padding:.22em .5em;border-radius:.2em;color:#f4f1ff;
  background:linear-gradient(180deg,#24306e,#141c4a);box-shadow:0 0 0 .06em rgba(160,175,255,.5) inset,0 .3em 1em rgba(0,0,0,.5);line-height:1.15;white-space:nowrap}
.mdsg-roundsub{font-family:var(--font-serif);font-style:italic;color:var(--gold-hi);font-size:1.3em}
.mdsg-card{display:grid;grid-template-rows:auto 1fr auto auto;gap:.4em;padding:.55em .6em .6em;border-radius:.6em;min-height:0;
  background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03));box-shadow:0 0 0 1px var(--line) inset,0 .4em 1.2em rgba(0,0,0,.45)}
.mdsg-cname{display:flex;align-items:center;justify-content:center;gap:.35em;font-family:var(--font-display);font-weight:700;font-size:1.25em;color:var(--text);white-space:nowrap;overflow:hidden}
.mdsg-cname span:last-child{overflow:hidden;text-overflow:ellipsis}
.mdsg-chart{background:#f3efe6;border-radius:.3em;min-height:0;display:flex}
.mdsg-chart svg{width:100%;height:100%}
.mdsg-band{display:flex;align-items:center;justify-content:center;gap:.35em;font-family:var(--font-display);font-weight:900;font-size:1.6em;color:#fff;
  padding:.12em .3em;border-radius:.12em;line-height:1.2;letter-spacing:.02em}
.mdsg-band[data-dir=up]{background:linear-gradient(180deg,#d8452f,#a8231c)}
.mdsg-band[data-dir=down]{background:linear-gradient(180deg,#22357e,#14215a)}
.mdsg-band[data-dir=flat]{background:linear-gradient(180deg,#3a3642,#26232c)}
.mdsg-band[data-dir=hidden]{background:linear-gradient(180deg,#5a4fe0,#3a2fb5);letter-spacing:.2em}
.mdsg-table{display:grid;grid-template-columns:1fr 1fr;font-size:.92em;border:1px solid var(--line-strong);border-radius:.15em;overflow:hidden}
.mdsg-table > div{padding:.2em .4em;overflow:hidden;display:flex;justify-content:space-between;gap:.3em;white-space:nowrap;color:var(--text-dim)}
.mdsg-table b{color:var(--text);font-weight:700}
.mdsg-table > div:first-child{grid-column:1 / -1;border-bottom:1px solid var(--line-strong)}
.mdsg-table > div:nth-child(3){border-left:1px solid var(--line-strong)}
.mdsg-rank{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:var(--gap);padding-bottom:3.6em;min-height:0}
.mdsg-crawl{grid-column:1;grid-row:2;height:2.4em;overflow:hidden;border-radius:.35em;display:flex;align-items:center;color:#16131c;background:linear-gradient(180deg,#ebe7fb,#d5cff3);box-shadow:0 0 0 .1em #3a2a68 inset;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
.mdsg-crawl-track{display:flex;width:max-content;animation:mdsg-crawl 60s linear infinite;will-change:transform}
.mdsg-crawl-half{display:flex;align-items:center;flex:none}
.mdsg-crawl-item{display:inline-flex;align-items:center;gap:.4em;padding:0 .9em;font-size:1.15em;white-space:nowrap}
.mdsg-crawl-item b{font-family:var(--font-display);color:#3a2a68}
.mdsg-crawl-item > i{font-style:normal;color:#3a2a68;margin-left:.6em}
@keyframes mdsg-crawl{to{transform:translateX(-50%)}}
/* Dealer hints board (Host option) */
.mdsg-dealer{container-type:inline-size;box-sizing:border-box;padding:3.5em 4em 2.5em;display:grid;grid-template-rows:auto 1fr;gap:1.2em;text-align:left}
.tv .mdsg-dealer{min-height:100vh}
.mdsg-dealer header{text-align:center}
.mdsg-dealer .mdsg-h1{font-size:min(3.4em,9cqw);margin:.1em 0 .2em}
.mdsg-dealer .mdsg-sub{font-size:1.3em}
.mdsg-dlist{display:grid;gap:.8em;align-content:space-evenly}
.mdsg-dealer .mdsg-rline{grid-template-columns:minmax(8em,15em) 1fr}
.mdsg-dealer .mdsg-pill{font-size:1.25em}
.mdsg-dealer .mdsg-rline > span{font-size:1.35em}
@container (max-width:40em){.mdsg-dealer .mdsg-rline{grid-template-columns:1fr}}
.mdsg-rrow{flex:1;display:grid;grid-template-columns:2.8em 1fr 7.4em;align-items:stretch;min-height:0;max-height:3.2em;font-size:var(--fs)}
.mdsg-rrow > *{display:flex;align-items:center;min-width:0}
.mdsg-rpos{justify-content:center;font-family:var(--font-display);font-weight:900;color:#fff;background:#14215a;border-radius:.15em 0 0 .15em}
.mdsg-rname{padding:0 .5em;font-weight:700;color:#f4f1ff;background:#1b1a22;overflow:hidden;white-space:nowrap;gap:.35em}
.mdsg-rname span:last-child{overflow:hidden;text-overflow:ellipsis}
.mdsg-rval{justify-content:flex-end;padding:0 1em 0 .4em;font-family:var(--font-display);font-weight:700;color:#18161d;
  background:linear-gradient(180deg,#f4f1ea,#d9d4c8);clip-path:polygon(0 0,86% 0,100% 50%,86% 100%,0 100%);white-space:nowrap;gap:.3em}
.mdsg-rrow[data-top=true] .mdsg-rpos{background:linear-gradient(180deg,var(--gold-hi),var(--gold-lo));color:#1a0f05}
.mdsg-pts{font-family:var(--font-ui);font-size:.75em;font-weight:800;color:#fff;background:var(--crimson);border-radius:1em;padding:.05em .45em}
.mdsg-cd{position:absolute;right:0;top:0}
.mdsg-pop{animation:mdsg-pop .7s cubic-bezier(.16,1,.3,1) both}
@keyframes mdsg-pop{from{opacity:0;transform:translateY(.4em) scale(.92)}}
/* rules overlay over the cards */
.mdsg-reveal{position:absolute;inset:0;z-index:5;display:grid;grid-template-rows:auto 1fr;gap:.8em;padding:1.2em 1.4em;border-radius:.8em;
  background:#0b0a10;box-shadow:0 0 0 1px var(--line-strong) inset;animation:mdsg-fade .6s ease both}
@keyframes mdsg-fade{from{opacity:0}}
.mdsg-reveal .mdsg-pill{font-size:1.12em;padding:.3em .8em}
.mdsg-reveal h2{margin:0;font-family:var(--font-display);font-size:2.6em;line-height:1.15;padding-top:.05em;color:var(--gold-hi);text-transform:uppercase;letter-spacing:.05em}
.mdsg-reveal h2 small{display:block;font-family:var(--font-serif);font-style:italic;text-transform:none;letter-spacing:0;font-size:.5em;color:var(--text-dim)}
.mdsg-rlist{display:grid;grid-auto-rows:auto;align-content:space-evenly;gap:.45em;min-height:0}
.mdsg-rline{display:grid;grid-template-columns:13.5em 1fr;align-items:center;gap:.8em;min-height:0}
.mdsg-rline > span{font-family:var(--font-display);font-weight:700;font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* rule pill (TV + phone) */
.mdsg-pill{display:flex;align-items:center;flex-wrap:wrap;gap:.25em .45em;padding:.35em .9em;border-radius:.5em;color:#16131c;font-size:1.25em;line-height:1.3;
  background:linear-gradient(180deg,#ebe7fb,#d5cff3);box-shadow:0 0 0 .12em #3a2a68 inset}
.mdsg-pill > i{font-style:normal;color:#3a2a68}
.mdsg-piece{font-weight:800}
.mdsg-piece[data-new=true]{animation:mdsg-glow 1.4s 5.3s ease both}
@keyframes mdsg-glow{0%{opacity:0;color:var(--crimson)}60%{opacity:1;color:var(--crimson)}100%{color:inherit}}
.mdsg-boxes{display:inline-flex;gap:.18em}
.mdsg-word{display:inline-flex;gap:.08em}
.mdsg-word u{width:.75em;height:.85em;border-radius:.08em;background:#b9b0e6;box-shadow:0 0 0 .06em #6d5fb5 inset;display:inline-block}
.mdsg-boxes[data-next=true] u{background:#f0a3ad;box-shadow:0 0 0 .06em var(--crimson) inset}
.mdsg-noise{font-size:.8em;color:#6d5fb5;font-weight:700}
/* tutorial */
.mdsg-slide{height:100vh;display:grid;grid-template-columns:1fr 1.05fr;align-items:center;gap:3.5em;padding:4em 4.5em;box-sizing:border-box}
.mdsg-slide p{font-size:1.55em;line-height:1.45;margin:0 0 .7em;color:var(--text)}
.mdsg-slide b,.mdsg-rules b,.mdsg-tvrules b{color:var(--gold-hi);font-weight:600}
.mdsg-h1{font-family:var(--font-display);font-weight:900;font-size:4em;letter-spacing:.05em;text-transform:uppercase;margin:.2em 0 .5em;line-height:1.15;padding-top:.05em;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 50%,var(--gold-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.mdsg-sub{font-family:var(--font-serif);font-style:italic;color:var(--text-dim);margin:0}
.mdsg-dots{display:flex;gap:.6em;margin-top:1.5em}
.mdsg-dots span{width:.8em;height:.8em;border-radius:50%;background:var(--line-strong)}
.mdsg-dots span[data-on='true']{background:var(--gold)}
.mdsg-demo{display:grid;gap:1.2em;justify-items:center}
.mdsg-demo .mdsg-card{width:16em;height:22em}
.mdsg-democards{display:flex;gap:1.2em}
.mdsg-demo .mdsg-democards .mdsg-card{width:14em;height:19em}
.mdsg-phone{width:20em;border-radius:1.6em;padding:1.2em;background:#121017;box-shadow:0 0 0 .2em #2a2733,0 1em 2em rgba(0,0,0,.6);display:grid;gap:.7em;font-size:1.1em}
.mdsg-bandlist{display:grid;gap:.6em;width:24em}
.mdsg-bandlist div{display:flex;justify-content:space-between;align-items:center;padding:.5em .9em;border-radius:.4em;background:rgba(255,255,255,.05);box-shadow:0 0 0 1px var(--line) inset;font-size:1.4em}
.mdsg-bandlist b{font-family:var(--font-display);color:var(--gold-hi)}
/* rules overlay (TV) and reader (phone) */
.mdsg-tvrules{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,3,7,.9)}
.mdsg-tvrules .mp-panel{width:min(62em,92vw);padding:2.2em 3em}
.mdsg-tvrules h2{font-family:var(--font-display);font-size:2.5em;margin:.2em 0 .6em;color:var(--gold-hi)}
.mdsg-tvrules p{font-size:1.4em;line-height:1.45;margin:0 0 .6em}
.mdsg-sheet{position:fixed;inset:0;z-index:40;background:rgba(5,3,7,.95);overflow-y:auto;padding:16px}
.mdsg-rules{max-width:480px;margin:0 auto;display:grid;gap:12px}
.mdsg-rules h3{font-family:var(--font-display);font-size:1.4rem;margin:0;color:var(--gold-hi)}
.mdsg-rules p{margin:0;line-height:1.5}
.mdsg-row{display:flex;gap:8px}
.mdsg-row > *{flex:1}
/* ---------- phone */
.mdsg-ph{display:grid;gap:10px}
.mdsg-top{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.mdsg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.mdsg-stat{display:grid;gap:2px;padding:8px;border-radius:10px;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;min-width:0}
.mdsg-stat span{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-mute)}
.mdsg-stat b{font-family:var(--font-display);font-size:1rem;color:var(--gold-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mdsg-co{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:8px;width:100%;padding:10px 12px;border:0;border-radius:12px;cursor:pointer;text-align:left;color:var(--text);
  font:inherit;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px var(--line) inset;min-height:56px}
.mdsg-co[aria-expanded=true]{box-shadow:0 0 0 1.5px var(--gold) inset;background:rgba(212,175,55,.07)}
.mdsg-co .ic{font-size:1.4rem}
.mdsg-co .nm{display:grid;min-width:0}
.mdsg-co .nm b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mdsg-co .nm small{color:var(--text-mute)}
.mdsg-co .pr{display:grid;justify-items:end;font-family:var(--font-display);font-weight:700}
.mdsg-up{color:#ff7a5c}.mdsg-down{color:#7f9bff}.mdsg-flat{color:var(--text-mute)}.mdsg-hid{color:#a99cff}
.mdsg-detail{display:grid;gap:10px;padding:12px;border-radius:12px;background:rgba(0,0,0,.25);box-shadow:0 0 0 1px var(--line) inset}
.mdsg-detail .mdsg-pill{font-size:.95rem}
.mdsg-step{display:grid;grid-template-columns:repeat(2,44px) 1fr repeat(2,44px);gap:6px;align-items:center}
.mdsg-step button{height:44px;border-radius:10px;border:0;font:inherit;font-weight:700;color:var(--gold-hi);background:rgba(255,255,255,.06);box-shadow:0 0 0 1px var(--line) inset;cursor:pointer}
.mdsg-step output{text-align:center;font-family:var(--font-display);font-size:1.6rem;color:var(--text)}
.mdsg-note{font-family:var(--font-serif);font-style:italic;font-size:1.1rem;color:var(--text-dim);text-align:center;margin:0}
.mdsg-small{font-size:.85rem;color:var(--text-dim);margin:0;text-align:center}
.mdsg-flash{font-size:.9rem;color:var(--ok);text-align:center;margin:0}
.mdsg-secret{display:grid;gap:8px;padding:10px 12px;border-radius:12px;background:rgba(90,79,224,.14);box-shadow:0 0 0 1px rgba(150,140,255,.35) inset}
`;

const Styles = () => <style>{CSS}</style>;

/** Renders **bold** inside a translated string. */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

const num = (v: number, lang: Lang) => money(v, lang).replace('$', '');
function axisLabel(v: number, lang: Lang): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })}M`;
  return num(v, lang);
}
function niceMax(v: number): number {
  const e = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  for (const m of [1, 1.5, 2, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e;
  return 10 * e;
}

// ---------------------------------------------------------------------------
// Pieces shared by the TV, the tutorial demos and the phone
// ---------------------------------------------------------------------------

/** Line chart with dots, gaps where a Secret hid the close, x axis "Start 2R 4R…". */
function Chart({ history, lang, t }: { history: (number | null)[]; lang: Lang; t: T }) {
  const W = 130;
  const H = 92;
  const left = 25;
  const right = 4;
  const top = 6;
  const bottom = 14;
  const values = history.filter((v): v is number => v !== null);
  const max = niceMax(Math.max(10_000, ...values) * 1.05);
  const xMax = Math.max(4, history.length - 1);
  const x = (k: number) => left + (k / xMax) * (W - left - right);
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const segments: string[] = [];
  let cur = '';
  history.forEach((v, k) => {
    if (v === null) {
      if (cur) segments.push(cur);
      cur = '';
    } else cur += `${cur ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) segments.push(cur);
  const every = xMax > 16 ? 4 : 2;
  const ticks = Array.from({ length: Math.floor(xMax / every) + 1 }, (_, i) => i * every);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <line x1={left} y1={top} x2={left} y2={H - bottom} stroke="#1a1a1a" strokeWidth="1" />
      <line x1={left} y1={H - bottom} x2={W - right} y2={H - bottom} stroke="#1a1a1a" strokeWidth="1" />
      {[0, max / 2, max].map((v) => (
        <text key={v} x={left - 2} y={y(v) + 2} fontSize="7" textAnchor="end" fill="#333">
          {axisLabel(v, lang)}
        </text>
      ))}
      {ticks.map((k) => (
        <text key={k} x={x(k)} y={H - 5} fontSize="6.5" textAnchor="middle" fill="#333">
          {k === 0 ? t(L.start) : `${k}R`}
        </text>
      ))}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      ))}
      {history.map((v, k) => (v === null ? null : <circle key={k} cx={x(k)} cy={y(v)} r="2" fill="#111" />))}
    </svg>
  );
}

function PriceBand({ c, lang }: { c: CompanyView; lang: Lang }) {
  if (c.hidden || c.price === null) {
    return (
      <div className="mdsg-band" data-dir="hidden">
        ???
      </div>
    );
  }
  const dir = c.change === null || c.change === 0 ? 'flat' : c.change > 0 ? 'up' : 'down';
  return (
    <div className="mdsg-band" data-dir={dir}>
      {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {money(c.price, lang)}
    </div>
  );
}

function CompanyCard({ c, lang, t, animate }: { c: CompanyView; lang: Lang; t: T; animate?: string }) {
  const q = (v: number | null) => (v === null ? (c.hidden ? '???' : '—') : String(v));
  return (
    <div className="mdsg-card">
      <div className="mdsg-cname" style={{ fontSize: t(c.name).length > 17 ? '1em' : t(c.name).length > 13 ? '1.1em' : undefined }}>
        <span>{c.icon}</span>
        <span>{t(c.name)}</span>
      </div>
      <div className="mdsg-chart">
        <Chart history={c.history} lang={lang} t={t} />
      </div>
      <div key={animate} className={animate ? 'mdsg-pop' : undefined}>
        <PriceBand c={c} lang={lang} />
      </div>
      <div className="mdsg-table">
        <div>
          <span>{t(L.held)}:</span>
          <b>
            {q(c.held)} {t(c.held === 1 ? L.share : L.shares)}
          </b>
        </div>
        <div>
          <span>{t(L.buys)}</span>
          <b>{q(c.buys)}</b>
        </div>
        <div>
          <span>{t(L.sells)}</span>
          <b>{q(c.sells)}</b>
        </div>
      </div>
    </div>
  );
}

function Tokens({ rule, lang, freshDelay }: { rule: Record<Lang, RuleToken[]>; lang: Lang; freshDelay?: string }) {
  return (
    <>
      {rule[lang].map((tok, i) =>
        'w' in tok ? (
          <span key={i} className="mdsg-piece" data-new={tok.fresh ?? false} style={tok.fresh && freshDelay ? { animationDelay: freshDelay } : undefined}>
            {tok.w}
          </span>
        ) : (
          <span key={i} className="mdsg-boxes" data-next={tok.hidden === 'next'}>
            <span className="mdsg-word">
              <u />
              <u />
              <u />
            </span>
          </span>
        ),
      )}
    </>
  );
}

function RulePill({ rule, lang, t, noise }: { rule: Record<Lang, RuleToken[]>; lang: Lang; t: T; noise?: boolean }) {
  return (
    <div className="mdsg-pill">
      <i>✦</i>
      <Tokens rule={rule} lang={lang} />
      {noise && <span className="mdsg-noise">{t(L.noise)}</span>}
      <i>✦</i>
    </div>
  );
}

/** Endless ticker under the cards with what is known of every rule. */
function Crawl({ view, lang, t }: { view: MarketView; lang: Lang; t: T }) {
  const items = view.companies.map((c, i) => (
    <span key={i} className="mdsg-crawl-item">
      <b>
        {c.icon} {t(c.name)}
      </b>
      <Tokens rule={c.rule} lang={lang} />
      <i>✦</i>
    </span>
  ));
  const words = view.companies.reduce((n, c) => n + c.rule[lang].length + 3, 0);
  return (
    <div className="mdsg-crawl" aria-hidden>
      <div className="mdsg-crawl-track" style={{ animationDuration: `${Math.max(40, words * 1.4)}s` }}>
        <span className="mdsg-crawl-half">{items}</span>
        <span className="mdsg-crawl-half">{items}</span>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg className="mdsg-logo" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="mdsg-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b6cff" />
          <stop offset="1" stopColor="#24186e" />
        </linearGradient>
      </defs>
      <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="#0d0a2a" stroke="#4d5cf0" strokeWidth="4" />
      <polygon points="50,12 85,32 85,68 50,88 15,68 15,32" fill="url(#mdsg-hex)" />
      <g stroke="rgba(255,255,255,.18)" strokeWidth=".8">
        {[30, 45, 60, 75].map((v) => (
          <line key={v} x1="15" y1={v} x2="85" y2={v} />
        ))}
        {[30, 45, 60, 75].map((v) => (
          <line key={`v${v}`} x1={v - 5} y1="18" x2={v - 5} y2="82" />
        ))}
      </g>
      <polyline
        points="18,30 28,44 34,38 42,56 50,50 58,66 64,60 72,72 82,52"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Ranking({ view, platform, lang, t, kit }: { kit: DisplayProps['kit']; view: MarketView; platform: DisplayProps['platform']; lang: Lang; t: T }) {
  const n = view.ranking.length;
  const fs = n > 12 ? 0.95 : 1.15;
  const gap = n > 12 ? 0.3 : 0.45;
  let pos = 0;
  let prev: number | null | undefined;
  return (
    <div className="mdsg-rank" style={{ ['--fs' as string]: `${fs}em`, ['--gap' as string]: `${gap}em` }}>
      {view.ranking.map((r, i) => {
        const p = platform.players.find((x) => x.id === r.id);
        // Ties share the position (only known while worths are visible).
        if (r.worth === null || r.worth !== prev) pos = i + 1;
        prev = r.worth;
        return (
          <div key={r.id} className="mdsg-rrow" data-top={pos === 1 && r.worth !== null}>
            <div className="mdsg-rpos">
              {pos}
              {t(L.rankPos)}
            </div>
            <div className="mdsg-rname">
              <kit.Avatar emoji={p?.avatar ?? '?'} size="1.5em" inline />
              <span>{p?.name ?? r.id}</span>
            </div>
            <div className="mdsg-rval">
              {r.worth === null ? '???' : money(r.worth, lang)}
              {r.points !== null && r.points > 0 && <span className="mdsg-pts">+{r.points}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorial and rules
// ---------------------------------------------------------------------------

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });
const SAMPLE: CompanyView = {
  icon: '🛡️',
  name: tx('Cofre Lacrado', 'Sealed Vault'),
  price: 14_641,
  change: 1_331,
  history: [10_000, 9_000, 8_100, 9_500, 11_000, 12_100, 13_310, 14_641],
  buys: 12,
  sells: 3,
  held: 27,
  hidden: false,
  rule: { 'pt-BR': [], en: [] },
};
const SAMPLE_DOWN: CompanyView = {
  ...SAMPLE,
  icon: '🎭',
  name: tx('Cabaré Luar', 'Moonlight Cabaret'),
  price: 6_800,
  change: -700,
  history: [10_000, 10_400, 9_300, 8_800, 8_200, 7_500, 6_800],
  buys: 2,
  sells: 9,
  held: 4,
};
/** Tutorial demo: only placeholders, never what a real rule looks like. */
const BOXES = (kinds: ('next' | 'later')[]): Record<Lang, RuleToken[]> => {
  const toks = kinds.map((k) => ({ hidden: k }));
  return { 'pt-BR': toks, en: toks };
};

function SlideDemo({ demo, lang, t }: { demo: Demo; lang: Lang; t: T }) {
  if (demo === 'board') {
    return (
      <div className="mdsg-demo">
        <div className="mdsg-democards">
          <CompanyCard c={SAMPLE} lang={lang} t={t} />
          <CompanyCard c={SAMPLE_DOWN} lang={lang} t={t} />
        </div>
      </div>
    );
  }
  if (demo === 'rule') {
    return (
      <div className="mdsg-demo" style={{ width: '100%' }}>
        <div className="mdsg-cname">
          <span>{SAMPLE.icon}</span>
          <span>{t(SAMPLE.name)}</span>
        </div>
        <div style={{ fontSize: '1.8em' }}>
          <RulePill rule={BOXES(['later', 'next', 'later'])} lang={lang} t={t} />
        </div>
        <div className="mdsg-row" style={{ gap: '1em', fontSize: '1.2em', whiteSpace: 'nowrap' }}>
          <span className="mdsg-pill" style={{ fontSize: '.9em' }}>
            <span className="mdsg-boxes">
              <span className="mdsg-word">
                <u />
                <u />
                <u />
              </span>
            </span>
            {t(L.legendHidden)}
          </span>
          <span className="mdsg-pill" style={{ fontSize: '.9em' }}>
            <span className="mdsg-boxes" data-next>
              <span className="mdsg-word">
                <u />
                <u />
                <u />
              </span>
            </span>
            {t(L.legendNext)}
          </span>
        </div>
      </div>
    );
  }
  if (demo === 'trade') {
    return (
      <div className="mdsg-phone">
        <div className="mdsg-cname">
          <span>{SAMPLE.icon}</span>
          <span>{t(SAMPLE.name)}</span>
        </div>
        <PriceBand c={SAMPLE} lang={lang} />
        <div className="mdsg-step" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
          <button type="button">−1</button>
          <output>3</output>
          <button type="button">+1</button>
        </div>
        <div className="mdsg-row">
          <span className="mp-chip">
            {t(L.buy)} · {money(3 * 14_641, lang)}
          </span>
          <span className="mp-chip mp-chip--crimson">{t(L.sell)}</span>
        </div>
      </div>
    );
  }
  if (demo === 'secret') {
    return (
      <div className="mdsg-demo">
        <div className="mdsg-democards">
          <CompanyCard c={SAMPLE} lang={lang} t={t} />
          <CompanyCard
            c={{ ...SAMPLE_DOWN, hidden: true, price: null, change: null, buys: null, sells: null, held: null, history: [...SAMPLE_DOWN.history.slice(0, 5), null, null] }}
            lang={lang}
            t={t}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="mdsg-bandlist">
      {BANDS.map((b) => (
        <div key={b.min}>
          <span>{money(b.min, lang)}+</span>
          <b>
            {b.points} {t(L.pts)}
          </b>
        </div>
      ))}
      <div>
        <span>1º</span>
        <b>+1 {t(L.pt)}</b>
      </div>
    </div>
  );
}

function TutorialSlide({ view, lang, t }: { view: PublicView; lang: Lang; t: T }) {
  const s = SLIDES[view.slide]!;
  return (
    <div className="mdsg-slide mp-enter" key={view.slide}>
      <div>
        <span className="mp-eyebrow" style={{ fontSize: '1.2em' }}>
          {t(L.title)} · {t(L.tutorial)} · {view.slide + 1}/{view.slides}
        </span>
        <h1 className="mdsg-h1">{t(s.title)}</h1>
        {s.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        {view.slide === 0 && CREDITS && (
          <p className="mdsg-sub" style={{ fontSize: '1.15em' }}>
            {t(CREDITS)}
          </p>
        )}
        <div className="mdsg-dots" aria-hidden>
          {Array.from({ length: view.slides }, (_, i) => (
            <span key={i} data-on={i === view.slide} />
          ))}
        </div>
        <p className="mdsg-sub" style={{ fontSize: '1.1em', marginTop: '1em' }}>
          {t(L.hostAdvances)}
        </p>
      </div>
      <SlideDemo demo={s.demo} lang={lang} t={t} />
    </div>
  );
}

function TvRules({ page, kit, t }: { page: number; kit: DisplayProps['kit']; t: T }) {
  const r = RULES[page]!;
  const { Panel } = kit;
  return (
    <div className="mdsg-tvrules">
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
    <div className="mdsg-sheet" role="dialog" aria-modal="true" aria-label={t(L.rules)}>
      <Panel className="mdsg-rules">
        <span className="mp-eyebrow">
          {t(L.rules)} · {page + 1}/{RULES.length}
        </span>
        <h3>{t(r.title)}</h3>
        {r.body.map((b, i) => (
          <p key={i}>{rich(t(b))}</p>
        ))}
        <div className="mdsg-row">
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

function Display({ view, kit, t, platform, lang }: DisplayProps<PublicView>) {
  const { Countdown } = kit;
  const rulesOverlay = view.tvRules !== null && <TvRules page={view.tvRules} kit={kit} t={t} />;
  if (view.phase === 'intro') {
    return (
      <>
        <Styles />
        <TutorialSlide view={view} lang={lang} t={t} />
        {rulesOverlay}
      </>
    );
  }
  const closing = view.phase === 'closing' || view.phase === 'final';
  const shownRound = view.phase === 'trading' ? view.round : Math.min(view.round + 1, ROUNDS);
  const animKey = closing ? `c${view.round}` : undefined;
  const brand = (
    <div className="mdsg-brand">
      <Logo />
      <div className="mdsg-brandname">{t(L.title)}</div>
      <div className="mdsg-roundrow">
        <div className="mdsg-roundbox">
          {t(L.round).toUpperCase()} {view.phase === 'final' ? ROUNDS : view.round}
        </div>
        {view.phase === 'trading' && (
          <Countdown deadline={view.deadline} total={view.total ?? 0} size="3.6em" paused={!!platform.paused} />
        )}
      </div>
      {closing && (
        <div className="mdsg-roundsub mp-enter">{t(view.phase === 'final' ? L.finalClose : L.closing)}</div>
      )}
    </div>
  );
  const showRules = view.milestone || view.phase === 'final';
  return (
    <div className="mdsg-tv">
      <Styles />
      <div className="mdsg-grid">
        {brand}
        {view.companies.map((c, i) => (
          <CompanyCard key={i} c={c} lang={lang} t={t} animate={animKey} />
        ))}
        {showRules && (
          <div className="mdsg-reveal">
            <h2>
              {t(view.phase === 'final' || shownRound >= 20 ? L.allRevealed : L.reveal)}
              <small>
                {view.phase === 'final' ? t(L.finalClose) : `${t(L.round)} ${shownRound} · ${t(L.revealSub)}`}
              </small>
            </h2>
            <div className="mdsg-rlist">
              {view.companies.map((c, i) => (
                <div key={i} className="mdsg-rline">
                  <span>
                    {c.icon} {t(c.name)}
                  </span>
                  <RulePill rule={c.rule} lang={lang} t={t} noise={view.noise} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Crawl view={view} lang={lang} t={t} />
      <Ranking view={view} platform={platform} lang={lang} t={t} kit={kit} />
      {rulesOverlay}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

function Player({ view, kit, t, send, platform, you, lang }: PlayerProps<PlayerView>) {
  const { Button, Countdown, Panel } = kit;
  const [rules, setRules] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [confirmSecret, setConfirmSecret] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => setFlash(null), [view?.round, view?.phase]);
  useEffect(() => setConfirmSecret(false), [open, view?.secretReq, view?.phase]);
  if (!view) return null;
  const isHost = you.isAdmin;

  const rulesButton = (
    <Button block small variant="ghost" onClick={() => setRules(true)}>
      📖 {t(L.rules)}
    </Button>
  );
  const reader = rules && (
    <RulesReader view={view} kit={kit} t={t} send={send} isHost={isHost} onClose={() => setRules(false)} />
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
          {!isHost && <p className="mdsg-note">{t(L.followTv)}</p>}
        </Panel>
        {isHost && (
          <>
            <div className="mdsg-row">
              <Button variant="ghost" disabled={view.slide === 0} onClick={() => send({ type: 'intro', dir: -1 })}>
                ‹ {t(L.prev)}
              </Button>
              <Button onClick={() => send({ type: 'intro', dir: 1 })}>{last ? t(L.begin) : `${t(L.next)} ›`}</Button>
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

  const trading = view.phase === 'trading';
  const total = view.holdings.reduce((s, q) => s + q, 0);
  const stats = (
    <div className="mdsg-stats">
      <div className="mdsg-stat">
        <span>{t(L.cash)}</span>
        <b>{view.cash === null ? '???' : money(view.cash, lang)}</b>
      </div>
      <div className="mdsg-stat">
        <span>{t(L.worth)}</span>
        <b>{view.worth === null ? '???' : money(view.worth, lang)}</b>
      </div>
      <div className="mdsg-stat">
        <span>{t(L.rank)}</span>
        <b>
          {view.rank}
          {t(L.rankPos)} / {view.ranking.length}
        </b>
      </div>
    </div>
  );

  const head = (
    <Panel className="mdsg-top">
      <div className="stack" style={{ gap: 4 }}>
        <span className="mp-eyebrow">
          {t(L.round)} {Math.min(view.round, ROUNDS)}/{ROUNDS}
        </span>
        <b style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
          {trading ? t(L.title) : view.phase === 'final' ? t(L.finalClose) : t(L.closedTitle)}
        </b>
      </div>
      {trading && <Countdown deadline={view.deadline} total={view.total ?? 0} size={56} paused={!!platform.paused} />}
    </Panel>
  );

  if (view.phase === 'final') {
    const me = view.ranking.find((r) => r.id === you.you);
    return (
      <div className="mdsg-ph">
        <Styles />
        {head}
        <Panel className="stack" style={{ textAlign: 'center', justifyItems: 'center' }}>
          <span className="mp-eyebrow">{t(L.finalSub)}</span>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold-hi)' }}>
            {view.worth === null ? '???' : money(view.worth, lang)}
          </b>
          <span>
            {view.rank}
            {t(L.rankPos)} · +{me?.points ?? 0} {t(L.points)}
          </span>
        </Panel>
        {rulesButton}
        {reader}
      </div>
    );
  }

  const sel = open !== null ? view.companies[open] : null;
  const mine = open !== null ? view.holdings[open]! : 0;
  const maxBuy = sel && sel.price !== null && view.cash !== null ? Math.min(MAX_QTY, Math.floor(view.cash / sel.price)) : MAX_QTY;
  const doTrade = (q: number) => {
    if (open === null || !sel) return;
    send({ type: 'trade', company: open, qty: q });
    setFlash(`${q > 0 ? t(L.buy) : t(L.sell)} ${Math.abs(q)} × ${t(sel.name)}`);
  };
  const secretTarget = view.secretReq !== null ? view.companies[view.secretReq] : null;

  return (
    <div className="mdsg-ph">
      <Styles />
      {head}
      {stats}
      {view.blind && view.cash === null && <p className="mdsg-small">{t(L.blindCash)}</p>}
      {!trading && (
        <Panel>
          <p className="mdsg-note">{t(L.closedSub)}</p>
        </Panel>
      )}
      {trading && secretTarget && (
        <div className="mdsg-secret">
          <span>
            🤫 {t(L.secretSet)} <b>{t(secretTarget.name)}</b> {t(L.secretWhen)}
          </span>
          <Button small variant="ghost" onClick={() => send({ type: 'secret', company: null })}>
            {t(L.cancel)}
          </Button>
        </div>
      )}
      {trading && open === null && <p className="mdsg-small">{t(L.tapCompany)}</p>}
      {view.companies.map((c, i) => {
        const dir = c.hidden || c.price === null ? 'hid' : !c.change ? 'flat' : c.change > 0 ? 'up' : 'down';
        const expanded = open === i;
        return (
          <div key={i} className="stack" style={{ gap: 6 }}>
            <button
              type="button"
              className="mdsg-co"
              aria-expanded={expanded}
              aria-label={t(c.name)}
              onClick={() => {
                setOpen(expanded ? null : i);
                setQty(1);
              }}
            >
              <span className="ic">{c.icon}</span>
              <span className="nm">
                <b>{t(c.name)}</b>
                <small>
                  {t(L.you)}: {view.holdings[i]} {t(L.shares)}
                </small>
              </span>
              <span className={`pr mdsg-${dir}`}>
                <span>{c.price === null ? '???' : money(c.price, lang)}</span>
                <small>
                  {dir === 'hid'
                    ? '🤫'
                    : c.change === null || c.change === 0
                      ? '•'
                      : `${c.change > 0 ? '▲' : '▼'} ${num(Math.abs(c.change), lang)}`}
                </small>
              </span>
            </button>
            {expanded && (
              <div className="mdsg-detail">
                <RulePill rule={c.rule} lang={lang} t={t} noise={view.noise} />
                {c.hidden && <p className="mdsg-small">{t(L.blindNote)}</p>}
                {trading && (
                  <>
                    <div className="mdsg-step">
                      <button type="button" onClick={() => setQty(Math.max(1, qty - 10))}>
                        −10
                      </button>
                      <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>
                        −1
                      </button>
                      <output aria-label={t(L.qty)}>{qty}</output>
                      <button type="button" onClick={() => setQty(Math.min(MAX_QTY, qty + 1))}>
                        +1
                      </button>
                      <button type="button" onClick={() => setQty(Math.min(MAX_QTY, qty + 10))}>
                        +10
                      </button>
                    </div>
                    <div className="mdsg-row">
                      <Button small variant="ghost" disabled={maxBuy < 1} onClick={() => setQty(Math.max(1, maxBuy))}>
                        {t(L.max)}
                      </Button>
                      <Button small variant="ghost" disabled={mine < 1} onClick={() => setQty(mine)}>
                        {t(L.you)}: {mine}
                      </Button>
                    </div>
                    <div className="mdsg-row">
                      <Button disabled={qty > maxBuy || maxBuy < 1} onClick={() => doTrade(qty)}>
                        {t(L.buy)}
                        {c.price !== null ? ` · ${money(qty * c.price, lang)}` : ''}
                      </Button>
                      <Button variant="crimson" disabled={qty > mine} onClick={() => doTrade(-qty)}>
                        {t(L.sell)}
                      </Button>
                    </div>
                    {mine > 0 && (
                      <Button small block variant="ghost" onClick={() => doTrade(-mine)}>
                        {t(L.sellAll)} ({mine})
                      </Button>
                    )}
                    {view.canSecret && view.secretReq !== i && (
                      <div className="mdsg-secret">
                        {!confirmSecret ? (
                          <Button small block variant="ghost" onClick={() => setConfirmSecret(true)}>
                            {t(L.secretHere)}
                          </Button>
                        ) : (
                          <Button small block variant="crimson" onClick={() => send({ type: 'secret', company: i })}>
                            🤫 {t(L.secretConfirm)}
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {flash && <p className="mdsg-flash">✓ {flash}</p>}
      <p className="mdsg-small">
        {t(L.secret)}: {view.secretUsed ? t(L.secretSpent) : t(L.secretLeft)} · {total} {t(L.shares)}
      </p>
      {rulesButton}
      {reader}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dealer (Host option): a standing board with only the rule hints
// ---------------------------------------------------------------------------

function Dealer({ view, t, lang }: DealerProps<DealerHintsView | null>) {
  if (!view) return null;
  return (
    <div className="mdsg-dealer">
      <Styles />
      <header>
        <span className="mp-eyebrow">
          {t(L.round)} {Math.min(view.phase === 'trading' ? view.round : view.round + 1, ROUNDS)}/{ROUNDS}
        </span>
        <h1 className="mdsg-h1">{t(L.hintsTitle)}</h1>
        <p className="mdsg-sub">{t(L.hintsSub)}</p>
      </header>
      <div className="mdsg-dlist">
        {view.companies.map((c, i) => (
          <div key={i} className="mdsg-rline">
            <span>
              {c.icon} {t(c.name)}
            </span>
            <RulePill rule={c.rule} lang={lang} t={t} noise={view.noise} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default defineGameUI({ Display, Player, Dealer });
