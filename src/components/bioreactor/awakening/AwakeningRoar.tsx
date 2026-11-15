import React, { useCallback, useEffect, useRef, useState } from 'react';
import { safeVideoUrl } from '../../../utils/security';
import type {
  AwakeningRoarProps,
  AwakeningRoarState,
  MonsterDefinition,
} from '../../../types/kiroween';

const DEFAULT_VIDEO = '/videos/chimera_awakening_dragon.mp4';
const DEFAULT_ROAR = '/sounds/monster_roar_ferocious.wav';
const ROAR_DURATION_MS = 3000;
const BASE_VOLUME = 0.8;
/** REQ-14: HTML5 Audio fallback plays 30% quieter. */
const FALLBACK_VOLUME = BASE_VOLUME * 0.7;

/** Map a hex color to a base frequency (70-220 Hz) from its hue. */
export function baseFrequencyFromColor(color: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return 110;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return 70 + (h / 360) * 150;
}

/** Harmonic multipliers; higher stage BPM yields more harmonics (3-6). */
export function harmonicsFromBpm(bpm: number): number[] {
  const count = Math.max(3, Math.min(6, Math.round(bpm / 30)));
  return Array.from({ length: count }, (_, i) => i + 1);
}

function finalBpm(monster: MonsterDefinition): number {
  const last = monster.stages?.[monster.stages.length - 1];
  return last?.targetBpm ?? 120;
}

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

const CRACKS: string[] = [
  'M50 0 L46 18 L54 34 L47 52 L55 70 L50 100',
  'M0 40 L22 44 L38 38 L52 50 L74 46 L100 55',
  'M12 0 L24 22 L18 42 L34 60',
  'M88 0 L76 24 L82 44 L66 62',
  'M20 100 L30 80 L26 66 L42 56',
  'M80 100 L70 82 L76 68 L60 56',
];

export const AwakeningRoar: React.FC<AwakeningRoarProps> = ({ monster, fullscreen = false, onComplete }) => {
  const [state, setState] = useState<AwakeningRoarState>({
    isRoaring: false,
    glassCrackProgress: 0,
    roarVolume: 0,
  });
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const playHtmlFallback = useCallback((src: string) => {
    try {
      const audio = new Audio(src);
      audio.volume = FALLBACK_VOLUME;
      htmlAudioRef.current = audio;
      void audio.play().catch(() => undefined);
    } catch {
      /* audio unavailable: visuals still run */
    }
  }, []);

  const playRoar = useCallback(async () => {
    const src = monster.roarAudio || DEFAULT_ROAR;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return playHtmlFallback(src);

    try {
      const ctx = new Ctor();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
      if (ctx.state !== 'running') {
        void ctx.close().catch(() => undefined);
        ctxRef.current = null;
        return playHtmlFallback(src);
      }

      const now = ctx.currentTime;
      const dur = ROAR_DURATION_MS / 1000;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(BASE_VOLUME, now + 0.15);
      master.gain.exponentialRampToValueAtTime(0.001, now + dur);
      master.connect(ctx.destination);

      const base = baseFrequencyFromColor(monster.color);
      harmonicsFromBpm(finalBpm(monster)).forEach((mult, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(base * mult * 1.4, now);
        osc.frequency.exponentialRampToValueAtTime(base * mult, now + dur);
        g.gain.value = 0.5 / (i + 1);
        osc.connect(g).connect(master);
        osc.start(now);
        osc.stop(now + dur);
      });

      // Layer the recorded roar sample under the synthesized harmonics.
      try {
        const res = await fetch(src);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        const sample = ctx.createBufferSource();
        sample.buffer = buf;
        sample.connect(master);
        sample.start();
      } catch {
        /* synthesized layer alone is sufficient */
      }
    } catch {
      playHtmlFallback(src);
    }
  }, [monster, playHtmlFallback]);

  useEffect(() => {
    setState({ isRoaring: true, glassCrackProgress: 0, roarVolume: BASE_VOLUME });
    setVideoFailed(false);
    void playRoar();

    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ROAR_DURATION_MS);
      setState({ isRoaring: p < 1, glassCrackProgress: p, roarVolume: BASE_VOLUME * (1 - p) });
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      htmlAudioRef.current?.pause();
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    };
  }, [monster, playRoar]);

  const visibleCracks = Math.ceil(state.glassCrackProgress * CRACKS.length);
  const popScale = 0.55 + Math.sin(Math.min(1, state.glassCrackProgress * 1.15) * (Math.PI / 2)) * 0.65;
  const popZ = Math.round(state.glassCrackProgress * 220);

  return (
    <div
      className={`${
        fullscreen ? 'fixed inset-0 z-[100]' : 'absolute inset-0'
      } overflow-hidden bg-[#020617] pointer-events-none`}
      style={fullscreen ? { perspective: '1200px' } : undefined}
      data-testid="awakening-roar"
    >
      <div
        className="absolute inset-0 w-full h-full"
        style={
          fullscreen
            ? {
                transform: `translateZ(${popZ}px) scale(${popScale.toFixed(3)})`,
                transformStyle: 'preserve-3d',
                filter: `drop-shadow(0 0 40px ${monster.color || '#ef4444'})`,
                transition: 'transform 50ms linear',
              }
            : undefined
        }
      >
        {!videoFailed ? (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={safeVideoUrl(monster.awakeningVideo || DEFAULT_VIDEO)}
            autoPlay
            muted
            playsInline
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${monster.color || '#ef4444'}88, #020617 70%)`,
            }}
            data-testid="awakening-fallback"
          />
        )}
      </div>

      {/* Roar flash, contained inside the frame (no outer border shake). */}
      <div
        className="absolute inset-0 bg-[#ef4444] mix-blend-screen"
        style={{ opacity: state.isRoaring ? 0.25 * (1 - state.glassCrackProgress) : 0 }}
      />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {CRACKS.slice(0, visibleCracks).map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={i % 2 ? '#06b6d4' : '#10b981'}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
            style={{ filter: 'drop-shadow(0 0 2px #10b981)' }}
          />
        ))}
      </svg>

      <div className="absolute bottom-3 left-0 right-0 text-center font-mono text-xs tracking-widest text-[#ef4444]">
        {state.isRoaring ? `${monster.name} AWAKENS` : ''}
      </div>
    </div>
  );
};

export default AwakeningRoar;
