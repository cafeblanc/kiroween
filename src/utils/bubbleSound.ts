/**
 * Bioreactor bubbling sound, synthesised with WebAudio (no audio file): a low liquid rumble plus random short
 * "blub" bubbles (sine tones that sweep upward). startBubbleSound() returns a stop function that fades out and
 * closes its own AudioContext.
 */

export interface BubbleParams {
  /** Start pitch (Hz) of one bubble. */
  freq: number;
  /** Pitch at the end of the bubble (Hz); bubbles sweep upward. */
  endFreq: number;
  /** Bubble length (s). */
  duration: number;
  /** Peak gain 0..1. */
  gain: number;
  /** Wait before the next bubble (ms). */
  nextInMs: number;
}

export const BUBBLE_MASTER_GAIN = 0.35;
const RUMBLE_GAIN = 0.05;

/** One random bubble from `rng()` in [0, 1). Pure, for tests. */
export function bubbleParams(rng: () => number): BubbleParams {
  const r = () => Math.min(0.999999, Math.max(0, rng()));
  const freq = 180 + r() * 520; // 180..700 Hz
  const big = r() < 0.2; // a few bigger, deeper "glugs"
  return {
    freq: big ? freq * 0.55 : freq,
    endFreq: (big ? freq * 0.55 : freq) * (1.6 + r() * 1.4),
    duration: big ? 0.12 + r() * 0.1 : 0.04 + r() * 0.07,
    gain: big ? 0.5 + r() * 0.3 : 0.15 + r() * 0.35,
    nextInMs: Math.round(35 + r() * (big ? 260 : 180)),
  };
}

/**
 * One explosion "boom" for the bioreactor finale: a low sine thump (90 -> 30 Hz) plus a noise blast whose low-pass
 * closes from 1.6 kHz to 80 Hz. Uses its own AudioContext and closes it after ~2 s. No-op without WebAudio.
 */
export function playExplosionSound(rng: () => number = Math.random): void {
  const Ctx: typeof AudioContext | undefined =
    typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
  if (!Ctx) return;
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return;
  }
  try {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(90, t);
    thump.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    thumpGain.gain.setValueAtTime(0.0001, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    thump.connect(thumpGain).connect(master);
    thump.start(t);
    thump.stop(t + 1);

    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 1.6), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(80, t + 1.4);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.7, t + 0.015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    noise.connect(lp).connect(noiseGain).connect(master);
    noise.start(t);
  } catch {
    /* ignore */
  }
  window.setTimeout(() => void ctx.close().catch(() => {}), 2000);
}

/** Starts the bubbling loop. Returns a stop function (safe to call more than once). No-op without WebAudio. */
export function startBubbleSound(rng: () => number = Math.random): () => void {
  const Ctx: typeof AudioContext | undefined =
    typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
  if (!Ctx) return () => {};
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return () => {};
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  const master = ctx.createGain();
  master.gain.value = BUBBLE_MASTER_GAIN;
  // A low-pass keeps the bubbles round and wet rather than beepy.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1800;
  tone.connect(master);
  master.connect(ctx.destination);

  // Low liquid rumble: filtered noise, very quiet.
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (rng() * 2 - 1) * 0.6;
  const rumble = ctx.createBufferSource();
  rumble.buffer = noiseBuf;
  rumble.loop = true;
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 220;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = RUMBLE_GAIN;
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(master);
  rumble.start();

  let stopped = false;
  let timer: number | undefined;
  const bubble = () => {
    if (stopped) return;
    const p = bubbleParams(rng);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(p.freq, t);
    osc.frequency.exponentialRampToValueAtTime(p.endFreq, t + p.duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p.gain, t + p.duration * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + p.duration);
    osc.connect(g).connect(tone);
    osc.start(t);
    osc.stop(t + p.duration + 0.02);
    timer = window.setTimeout(bubble, p.nextInMs);
  };
  bubble();

  return () => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
    try {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      try {
        rumble.stop();
      } catch {
        /* ignore */
      }
      void ctx.close().catch(() => {});
    }, 300);
  };
}
