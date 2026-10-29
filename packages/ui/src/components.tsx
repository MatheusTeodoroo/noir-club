import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Contexts: room clock and rendering quality tier
// ---------------------------------------------------------------------------

export type QualityTier = 'high' | 'medium' | 'low';

export const RoomTimeContext = createContext<() => number>(() => Date.now());
export const QualityContext = createContext<QualityTier>('high');

export const useQuality = () => useContext(QualityContext);

/** Room-clock now, re-rendering at `fps` (low by default: countdowns don't need 60fps). */
export function useRoomNow(fps = 4): number {
  const getNow = useContext(RoomTimeContext);
  const [now, setNow] = useState(getNow);
  useEffect(() => {
    const id = setInterval(() => setNow(getNow()), 1000 / fps);
    return () => clearInterval(id);
  }, [getNow, fps]);
  return now;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Stage({
  children,
  particles = true,
  className = '',
}: {
  children: ReactNode;
  particles?: boolean;
  className?: string;
}) {
  const tier = useQuality();
  return (
    <div className={`mp-stage mp-tier-${tier} ${className}`}>
      {particles && <GoldDust />}
      <div className="mp-stage-content">{children}</div>
    </div>
  );
}

export function Panel({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`mp-panel ${className}`} style={style}>
      {children}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'gold' | 'crimson' | 'ghost';
  block?: boolean;
  small?: boolean;
};

export function Button({ variant = 'gold', block, small, className = '', ...rest }: ButtonProps) {
  const cls = [
    'mp-btn',
    variant !== 'gold' && `mp-btn--${variant}`,
    block && 'mp-btn--block',
    small && 'mp-btn--sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={cls} {...rest} />;
}

export function Avatar({
  emoji,
  size = 56,
  active,
  crimson,
  offline,
  badge,
  title,
}: {
  emoji: string;
  /** Pixels, or any CSS length (e.g. "6em" to scale with a TV screen). */
  size?: number | string;
  active?: boolean;
  crimson?: boolean;
  offline?: boolean;
  badge?: ReactNode;
  title?: string;
}) {
  const cls = [
    'mp-avatar',
    active && 'mp-avatar--active',
    crimson && 'mp-avatar--crimson',
    offline && 'mp-avatar--offline',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      style={{ '--size': typeof size === 'number' ? `${size}px` : size } as CSSProperties}
      title={title}
    >
      <span className="mp-avatar-emoji" aria-hidden>
        {emoji}
      </span>
      {badge !== undefined && <span className="mp-avatar-badge">{badge}</span>}
    </div>
  );
}

/** Ring countdown to a room-clock deadline. Freezes while `paused`. `size`: px, or a CSS length such as "7em". */
export function Countdown({
  deadline,
  total,
  size = 96,
  paused,
}: {
  deadline: number | null;
  total: number;
  size?: number | string;
  paused?: boolean;
}) {
  const now = useRoomNow(paused ? 0.5 : 8);
  const frozen = useRef<number | null>(null);
  if (paused && frozen.current === null) frozen.current = now;
  if (!paused) frozen.current = null;
  const effectiveNow = frozen.current ?? now;
  const left = deadline === null ? 0 : Math.max(0, deadline - effectiveNow);
  const secs = Math.ceil(left / 1000);
  // Drawn in a 100x100 viewBox so the ring scales with any CSS size.
  const r = 46;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, left / total) : 0;
  const css = typeof size === 'number' ? `${size}px` : size;
  return (
    <div
      className={`mp-countdown ${secs <= 5 && deadline ? 'mp-countdown--urgent' : ''}`}
      style={{ width: css, height: css }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={secs <= 5 ? 'var(--crimson-hi)' : 'var(--gold)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 250ms linear' }}
        />
      </svg>
      <span className="mp-countdown-value" style={{ fontSize: `calc(${css} * 0.32)` }}>
        {secs}
      </span>
    </div>
  );
}

/**
 * Phone text entry with a submit button: Enter submits, the field clears after a submit,
 * autocorrect/capitalisation are off, and `oneWord` strips spaces as the player types.
 */
export function TextInput({
  onSubmit,
  placeholder,
  maxLength = 40,
  oneWord,
  submitLabel = 'OK',
  disabled,
  autoFocus,
  clearOnSubmit = true,
}: {
  onSubmit(text: string): void;
  placeholder?: string;
  maxLength?: number;
  oneWord?: boolean;
  submitLabel?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  clearOnSubmit?: boolean;
}) {
  const [text, setText] = useState('');
  const clean = text.trim();
  const submit = () => {
    if (!clean || disabled) return;
    onSubmit(clean);
    if (clearOnSubmit) setText('');
  };
  return (
    <form
      className="mp-textinput"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        className="mp-input"
        value={text}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="send"
        aria-label={placeholder}
        onChange={(e) => setText(oneWord ? e.target.value.replace(/\s+/g, '') : e.target.value)}
      />
      <Button type="submit" small disabled={disabled || !clean}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange(v: boolean): void;
  disabled?: boolean;
}) {
  return (
    <label className="mp-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange(v: number): void;
}) {
  return (
    <div className="mp-stepper">
      <button
        type="button"
        aria-label="-"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
      >
        −
      </button>
      <output>{value}</output>
      <button
        type="button"
        aria-label="+"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GoldDust: slow, soft gold bokeh drifting upward. Particle count follows the quality tier.
// ---------------------------------------------------------------------------

export function GoldDust() {
  const tier = useQuality();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || tier === 'low') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const count = tier === 'high' ? 90 : 35;
    const dpr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 2 : 1);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number };
    const spawn = (initial: boolean): P => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(0.08 + Math.random() * 0.25),
      r: 0.8 + Math.random() * 2.6,
      life: initial ? Math.random() * 600 : 0,
      max: 700 + Math.random() * 900,
      hue: 40 + Math.random() * 10,
    });
    const ps = Array.from({ length: count }, () => spawn(true));
    let raf = 0;
    let t = 0;
    const frame = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]!;
        p.life += 1;
        p.x += p.vx + Math.sin((p.y + t) * 0.01) * 0.25;
        p.y += p.vy;
        if (p.y < -10 || p.life > p.max) ps[i] = spawn(false);
        const fade = Math.sin((p.life / p.max) * Math.PI);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${p.hue}, 70%, 72%, ${0.45 * fade})`);
        g.addColorStop(1, `hsla(${p.hue}, 70%, 55%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [tier]);

  return <canvas ref={ref} className="mp-particles" aria-hidden />;
}

// ---------------------------------------------------------------------------
// Rive: a .riv driven by data binding. `values` are written to the bound view model,
// `trigger` fires a trigger property whenever its `nonce` changes.
// ---------------------------------------------------------------------------

export type RiveValues = Record<string, string | number | boolean>;

export interface RiveViewProps {
  src: string;
  artboard?: string;
  stateMachine?: string;
  values?: RiveValues;
  trigger?: { name: string; nonce: number | string };
  className?: string;
  style?: CSSProperties;
  /** Shown while the Rive runtime loads and if the file fails to load. */
  fallback?: ReactNode;
}

const RivePlayer = lazy(() => import('./rive.tsx'));

export function RiveView(props: RiveViewProps) {
  return (
    <Suspense fallback={props.fallback ?? null}>
      <RivePlayer {...props} />
    </Suspense>
  );
}
