/**
 * Synthesised sound effects (no asset downloads). Displays schedule them on the room clock so
 * every TV plays the same cue at the same instant.
 */

let ctx: AudioContext | null = null;

/** Starts audio after a user gesture. Embedded browsers without Web Audio simply stay silent. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {
    /* no audio on this device */
  }
}

export function audioReady() {
  return !!ctx && ctx.state === 'running';
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, glideTo?: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noise(start: number, dur: number, gain: number) {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(start);
}

const sounds: Record<string, (t: number) => void> = {
  start: (t) => {
    tone(110, t, 1.6, 'sawtooth', 0.12, 55);
    tone(220, t + 0.05, 1.2, 'triangle', 0.1);
    tone(329.6, t + 0.3, 1.2, 'triangle', 0.08);
  },
  round: (t) => {
    tone(392, t, 0.5, 'triangle', 0.12);
    tone(523.3, t + 0.15, 0.7, 'triangle', 0.12);
  },
  phase: (t) => {
    tone(659.3, t, 0.35, 'sine', 0.12);
    tone(493.9, t + 0.12, 0.5, 'sine', 0.1);
  },
  tick: (t) => tone(1200, t, 0.06, 'square', 0.04),
  dealerCall: (t) => {
    tone(880, t, 0.25, 'sine', 0.1);
    tone(880, t + 0.3, 0.25, 'sine', 0.1);
  },
  drumroll: (t) => {
    for (let i = 0; i < 18; i++) noise(t + i * 0.13, 0.12, 0.18 + i * 0.01);
  },
  reveal: (t) => {
    tone(130.8, t, 2.2, 'sawtooth', 0.1);
    tone(261.6, t, 2, 'triangle', 0.12);
    tone(392, t + 0.08, 2, 'triangle', 0.1);
    tone(523.3, t + 0.16, 2, 'triangle', 0.08);
    noise(t, 0.6, 0.3);
  },
};

/** Play `name` after `delayMs` (0 = now). Unknown names are ignored. */
export function playSound(name: string, delayMs = 0) {
  if (!ctx || ctx.state !== 'running') return;
  const fn = sounds[name];
  if (fn) fn(ctx.currentTime + Math.max(0, delayMs) / 1000);
}
