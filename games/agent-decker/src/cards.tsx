import type { CSSProperties, ReactNode } from 'react';
import type { I18nText } from '@mp/game-sdk';
import { CARDS, MISSIONS, type CostKind, type ObType } from './shared.ts';

// The cards, redrawn after the printed Agent Decker cards (Manuel Correia, CC BY-NC 4.0): slate top
// half, black obstacle half cut on a diagonal, blue triangle = Stealth, red circle = Fighting,
// target = Alarm, yellow KEEP stamp, condensed type. Every size is in em: the parent's font-size
// sets the card size (a card is 10em × 14em).

type T = (text: I18nText) => string;

export const LETTER_COLOR: Record<string, string> = {
  '': '#2f6fd6',
  B: '#f08a24',
  D: '#3fae49',
  F: '#e0245e',
  H: '#6a3fb5',
};

export const CARD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Saira+Stencil+One&display=swap');
.adg-c,.adg-back,.adg-m,.adg-al{--slate:#2b2e35;--blk:#0d0d0e;position:relative;width:10em;height:14em;border-radius:.5em;overflow:hidden;flex:none;
  background:var(--slate);color:#fff;font-family:Oswald,'Bahnschrift SemiCondensed','Arial Narrow',sans-serif;
  box-shadow:0 .25em .8em rgba(0,0,0,.55),0 0 0 .05em rgba(255,255,255,.08) inset;text-align:left;line-height:1.1}
.adg-c.adg-top{height:5.6em}
.adg-badge{position:absolute;display:block;inset:0;width:100%;height:100%}
.adg-c-res{left:.45em;top:.45em;width:2em;height:2em}
.adg-c-title{position:absolute;left:3.1em;right:0;top:.7em;font-weight:400;font-size:1em;text-transform:uppercase;letter-spacing:.02em;
  border-bottom:.08em solid #fff;padding:0 .3em .05em 0;white-space:nowrap;overflow:hidden}
.adg-c-txt{position:absolute;left:5.2em;right:.8em;top:3.35em;font-size:.6em;font-weight:300;line-height:1.2}
.adg-c-txt b,.adg-c-ptext b{font-weight:600}
.adg-keep{position:absolute;right:.45em;top:3.5em;font:700 1em/1 Oswald,sans-serif;letter-spacing:.04em;color:#2a2a2a;background:#f2cd2c;
  padding:.06em .28em;transform:rotate(-7deg);box-shadow:0 0 0 .09em #2a2a2a inset,0 0 0 .14em #f2cd2c}
.adg-keep.adg-inline{position:static;display:inline-block;font-size:.85em;transform:none;vertical-align:.05em;padding:0 .2em}
.adg-c-low{position:absolute;inset:0;background:var(--blk);clip-path:polygon(0 31%,100% 52%,100% 100%,0 100%)}
.adg-c-line{position:absolute;inset:0;width:100%;height:100%}
.adg-c-ob{position:absolute;right:1em;top:5.15em;width:6.6em;text-align:right;transform:rotate(12.5deg);transform-origin:100% 0;
  font:700 1.1em/.95 Oswald,sans-serif;text-transform:uppercase;letter-spacing:.01em;text-shadow:0 .05em 0 #000}
.adg-c-cost{left:6.95em;top:8.3em;width:2.55em;height:2.55em}
.adg-c-alarm{left:6.95em;top:11.05em;width:2.55em;height:2.55em}
.adg-c-ptext{position:absolute;left:2em;top:15.4em;width:8.6em;font-size:.6em;font-weight:300;line-height:1.18}
.adg-c-type{position:absolute;left:.45em;bottom:.45em;width:.95em;height:.95em;color:#fff}
.adg-c-letter{position:absolute;right:.35em;bottom:.2em;font:700 .75em Oswald,sans-serif}
.adg-ico{display:inline-block;width:1.25em;height:1.25em;vertical-align:-.3em}
.adg-ico.adg-ico-t{width:1em;height:1em;vertical-align:-.12em}
.adg-back .adg-c-low{clip-path:polygon(0 50%,100% 30%,100% 100%,0 100%)}
.adg-logo{position:absolute;left:1.2em;top:4.1em;transform:rotate(-14deg);transform-origin:0 0;line-height:1}
.adg-logo i{display:block;font:300 .9em Oswald,sans-serif;letter-spacing:.95em;color:#0d0d0e;font-style:normal}
.adg-logo b{display:block;font:400 2.05em 'Saira Stencil One',Oswald,sans-serif;letter-spacing:.04em;color:#fff;margin-top:.12em}
.adg-m .adg-c-low{clip-path:polygon(0 64%,100% 40%,100% 100%,0 100%)}
.adg-m-body{position:absolute;left:.6em;top:8.9em;width:11em;transform:rotate(-14deg);transform-origin:0 0;display:grid;gap:.2em}
.adg-m-title{font:700 1.25em/1 Oswald,sans-serif;text-transform:uppercase;white-space:nowrap}
.adg-m-quote{font-size:.42em;font-weight:300;line-height:1.2;max-width:20em}
.adg-m-goal{display:flex;align-items:flex-end;gap:.25em;color:var(--mc)}
.adg-m-goal .adg-ico{width:2em;height:2em;vertical-align:-.6em}
.adg-m-goal b{font:300 1.45em/1 Oswald,sans-serif;letter-spacing:.02em}
.adg-m-goal span{font:400 .5em/1.15 Oswald,sans-serif;max-width:7.5em;padding-bottom:.2em}
.adg-m-reward{position:absolute;left:.7em;right:.7em;top:.6em;display:grid;gap:.25em;justify-items:start}
.adg-m-reward .adg-c-title{position:static;font-size:.9em;border:0;padding:0}
.adg-m-reward small{font-size:.5em;font-weight:300;line-height:1.2;color:#cfd3dc}
.adg-m-reward .adg-keep{position:static;font-size:.8em;margin:.2em 0 0 .2em}
.adg-al{display:grid;grid-template-rows:4.3em 1fr}
.adg-al-tens{display:flex;gap:.18em;justify-content:center;align-items:flex-end;padding:0 .4em .4em;transform:rotate(-6deg)}
.adg-al-keys{background:var(--blk);clip-path:polygon(0 12%,100% 0,100% 100%,0 100%);display:grid;grid-template-columns:repeat(3,1.95em);gap:.2em .3em;
  justify-content:center;align-content:center;padding-top:.8em;
  background-image:radial-gradient(circle at 50% 50%,rgba(255,255,255,.05) 0 .35em,transparent .36em);background-size:.8em .7em}
.adg-al-key{position:relative;width:1.95em;height:1.95em}
.adg-al-word{grid-column:2/4;font:700 1.3em/1.4 Oswald,sans-serif;letter-spacing:.02em;align-self:center}
.adg-al-chip{position:relative;width:1.65em;height:1.65em}
.adg-al-on::after{content:'';position:absolute;inset:-.12em;border-radius:50%;background:rgba(214,30,44,.5);border:.14em solid #ff4d3d;
  box-shadow:0 0 .5em rgba(255,60,50,.8)}
.adg-c.adg-dim,.adg-back.adg-dim{filter:grayscale(.6) brightness(.55)}
`;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const STEALTH = { fill: '#9fb4ea', stroke: '#1c3a9c' };
const FIGHT = { fill: '#ff8f8b', stroke: '#e4302c' };

/** Resource / cost / alarm badge with its number, as printed. */
export function Badge({ kind, n, className }: { kind: CostKind | 'alarm'; n?: number | string; className?: string }) {
  const label = n === undefined ? null : (
    <text
      x="50"
      y={kind === 'stealth' ? 77 : 66}
      textAnchor="middle"
      fontFamily="Oswald, sans-serif"
      fontWeight="600"
      fontSize={String(n).length > 1 ? (kind === 'stealth' ? 34 : 40) : kind === 'stealth' ? 40 : 46}
      fill="#1e2230"
    >
      {n}
    </text>
  );
  return (
    <svg viewBox="0 0 100 100" className={`adg-badge ${className ?? ''}`} aria-hidden="true">
      {kind === 'stealth' && <polygon points="50,7 95,90 5,90" fill={STEALTH.fill} stroke={STEALTH.stroke} strokeWidth="7" strokeLinejoin="round" />}
      {kind === 'fight' && <circle cx="50" cy="50" r="43" fill={FIGHT.fill} stroke={FIGHT.stroke} strokeWidth="7" />}
      {kind === 'any' && (
        <>
          <circle cx="50" cy="50" r="43" fill={STEALTH.fill} stroke={STEALTH.stroke} strokeWidth="7" />
          <polygon points="50,15 87,79 13,79" fill="none" stroke={FIGHT.stroke} strokeWidth="6" strokeLinejoin="round" />
        </>
      )}
      {kind === 'alarm' && (
        <>
          <circle cx="50" cy="50" r="46" fill="#fff" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#1e2230" strokeWidth="6" />
          {[0, 90, 180, 270].map((r) => (
            <rect key={r} x="46" y="8" width="8" height="14" fill="#1e2230" transform={`rotate(${r} 50 50)`} />
          ))}
        </>
      )}
      {label}
    </svg>
  );
}

const TYPE_PATHS: Record<ObType, ReactNode> = {
  person: (
    <>
      <circle cx="12" cy="7" r="4.6" />
      <path d="M3 22.5c0-5.2 4-8.4 9-8.4s9 3.2 9 8.4z" />
    </>
  ),
  location: <path fillRule="evenodd" d="M12 1.5a7.3 7.3 0 0 0-7.3 7.3c0 5.5 7.3 13.7 7.3 13.7s7.3-8.2 7.3-13.7A7.3 7.3 0 0 0 12 1.5zm0 10.2a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8z" />,
  electronic: (
    <>
      <path fillRule="evenodd" d="M12 1.5a7.5 7.5 0 0 0-4.3 13.6V18h8.6v-2.9A7.5 7.5 0 0 0 12 1.5zm0 2.4a5.1 5.1 0 0 1 2.7 9.4l-.6.4v1.9h-4.2v-1.9l-.6-.4A5.1 5.1 0 0 1 12 3.9z" />
      <path d="M8.5 19.4h7v1.6h-7zM10 21.8h4v1.2h-4z" />
      <path d="M10.4 9.2l1.6 2.6 1.6-2.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  door: <path fillRule="evenodd" d="M6.5 1.5h11v21h-11zm2.6 3v5.4h5.8V4.5z" />,
  animal: (
    <>
      <ellipse cx="6" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="10" cy="5.6" rx="2.2" ry="2.9" />
      <ellipse cx="14.2" cy="5.6" rx="2.2" ry="2.9" />
      <ellipse cx="18.2" cy="10" rx="2.2" ry="2.8" />
      <path d="M12 11.5c-3.6 0-6.4 4.3-6.4 7 0 2.6 2.7 2.7 6.4 1.7 3.7 1 6.4.9 6.4-1.7 0-2.7-2.8-7-6.4-7z" />
    </>
  ),
};

export function TypeIcon({ type, className }: { type: ObType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {TYPE_PATHS[type]}
    </svg>
  );
}

/** Renders card / rules text: **bold** and {icon} / {stealth2}-style tokens. */
export function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{[a-z]+\d*\})/g).map((part, i) => {
    if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    const m = /^\{([a-z]+)(\d*)\}$/.exec(part);
    if (!m) return part;
    const [, name, num] = m;
    if (name === 'keep') return <span key={i} className="adg-keep adg-inline">KEEP</span>;
    if (name === 'stealth' || name === 'fight' || name === 'any' || name === 'alarm') {
      return (
        <span key={i} className="adg-ico" style={{ position: 'relative' }}>
          <Badge kind={name} n={num || undefined} className="" />
        </span>
      );
    }
    return <TypeIcon key={i} type={name as ObType} className="adg-ico adg-ico-t" />;
  });
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/** Shrinks a title so longer translations still fit the printed layout. */
const fit = (text: string, chars: number, base: number) =>
  `${Math.min(base, (base * chars) / Math.max(text.length, 1)).toFixed(2)}em`;
const textSize = (text: string) => (text.length > 105 ? '.5em' : text.length > 80 ? '.54em' : '.6em');
const longestWord = (text: string) => text.split(/[\s-]+/).reduce((a, b) => (b.length > a.length ? b : a), '');

export function CardFace({
  id,
  t,
  variant = 'full',
  cost,
  dim,
  className,
  style,
}: {
  id: string;
  t: T;
  variant?: 'full' | 'top';
  /** Effective cost (Watchtower), shown instead of the printed one. */
  cost?: { kind: CostKind; n: number } | null;
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const card = CARDS[id];
  if (!card) return null;
  const { top, bottom } = card;
  const color = LETTER_COLOR[card.letter ?? ''];
  const full = variant === 'full' && bottom;
  return (
    <div
      className={`adg-c ${variant === 'top' ? 'adg-top' : ''} ${dim ? 'adg-dim' : ''} ${className ?? ''}`}
      style={style}
      aria-label={t(full ? bottom.name : top.name)}
    >
      {top.res && <Badge kind={top.res.kind} n={top.res.n} className="adg-c-res" />}
      <div className="adg-c-title" style={{ fontSize: fit(t(top.name), 12, 1) }}>
        {t(top.name)}
      </div>
      {top.text && (
        <div className="adg-c-txt" style={{ fontSize: textSize(t(top.text)) }}>
          {rich(t(top.text))}
        </div>
      )}
      {top.keep && !top.rule && <span className="adg-keep">KEEP</span>}
      {full && (
        <>
          <div className="adg-c-low" />
          <svg className="adg-c-line" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="0,69 65,87 65,140" fill="none" stroke={color} strokeWidth="0.9" />
          </svg>
          <div className="adg-c-ob" style={{ fontSize: fit(longestWord(t(bottom.name)), 9, 1.1) }}>
            {t(bottom.name)}
          </div>
          {bottom.text && <div className="adg-c-ptext">{rich(t(bottom.text))}</div>}
          <Badge kind={(cost ?? bottom.cost).kind} n={(cost ?? bottom.cost).n} className="adg-c-cost" />
          <Badge kind="alarm" n={bottom.alarm} className="adg-c-alarm" />
          <TypeIcon type={bottom.type} className="adg-c-type" />
          {card.letter && (
            <span className="adg-c-letter" style={{ color }}>
              {card.letter}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function CardBack({ dim, className, label }: { dim?: boolean; className?: string; label?: string }) {
  return (
    <div className={`adg-back ${dim ? 'adg-dim' : ''} ${className ?? ''}`} aria-label={label}>
      <div className="adg-c-low" />
      <div className="adg-logo">
        <i>AGENT</i>
        <b>DECKER</b>
      </div>
    </div>
  );
}

export function MissionCard({ index, t, className }: { index: number; t: T; className?: string }) {
  const m = MISSIONS[index]!;
  const reward = CARDS[m.reward]!.top;
  return (
    <div className={`adg-m ${className ?? ''}`} style={{ '--mc': m.color } as CSSProperties}>
      <div className="adg-m-reward">
        <div className="row" style={{ gap: '.3em', alignItems: 'center' }}>
          {reward.res && (
            <span className="adg-ico" style={{ position: 'relative', fontSize: '1.5em' }}>
              <Badge kind={reward.res.kind} n={reward.res.n} />
            </span>
          )}
          <span className="adg-c-title">{t(reward.name)}</span>
        </div>
        {reward.text && <small>{rich(t(reward.text))}</small>}
        {reward.keep && <span className="adg-keep">KEEP</span>}
      </div>
      <div className="adg-c-low" />
      <div className="adg-m-body">
        <div className="adg-m-title" style={{ fontSize: fit(t(m.title), 12, 1.25) }}>
          {t(m.title)}
        </div>
        <div className="adg-m-quote">{t(m.quote)}</div>
        <div className="adg-m-goal">
          <b>{t({ 'pt-BR': 'OBJETIVO', en: 'GOAL' })}</b>
          <span>{rich(t(m.goalText))}</span>
        </div>
      </div>
      <span className="adg-c-letter" style={{ color: m.color }}>
        {m.letter}
      </span>
    </div>
  );
}

/** The Alarm card with its two tokens: one on the tens, one on the units. */
export function AlarmCard({ alarm, className }: { alarm: number; className?: string }) {
  const value = Math.min(alarm, 49);
  const tens = Math.floor(value / 10) * 10;
  const ones = value % 10;
  return (
    <div className={`adg-al ${className ?? ''}`} aria-label={`Alarm ${alarm}`}>
      <div className="adg-al-tens">
        {[0, 10, 20, 30, 40].map((v, i) => (
          <span key={v} className={`adg-al-chip ${v === tens ? 'adg-al-on' : ''}`} style={{ marginBottom: `${i * 0.35}em` }}>
            <Badge kind="alarm" n={v} className="" />
          </span>
        ))}
      </div>
      <div className="adg-al-keys">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((v) => (
          <span key={v} className={`adg-al-key ${v === ones ? 'adg-al-on' : ''}`}>
            <Badge kind="alarm" n={v} className="" />
          </span>
        ))}
        <span className="adg-al-word">ALARM</span>
      </div>
    </div>
  );
}
