import { useEffect, useRef } from "react";
import { INCUBATE_BURST_MS } from "../../utils/summonTiming";
import { particleState, smokeCover, smokeParticles } from "../../utils/smokeBurst";

/**
 * Full-screen smoke explosion drawn on a canvas (no video, so it costs nothing and fits any monster).
 * Starts its own clock on mount. Without a 2D context, or with reduced motion, it draws nothing and the image
 * reveal underneath still plays.
 */
export default function SmokeBurst() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const c = ctx;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const puffs = smokeParticles(Math.random);
    const start = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const t = now - start;
      const w = canvas.width;
      const h = canvas.height;
      c.clearRect(0, 0, w, h);
      const cover = smokeCover(t);
      if (cover > 0) {
        // Even haze so the screen is fully hidden while the puffs swirl on top
        c.fillStyle = `rgba(28, 30, 34, ${0.72 * cover})`;
        c.fillRect(0, 0, w, h);
        for (const p of puffs) {
          const s = particleState(p, t, w, h);
          if (!s) continue;
          const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
          g.addColorStop(0, `rgba(${p.shade}, ${p.shade}, ${p.shade + 6}, ${s.alpha})`);
          g.addColorStop(1, `rgba(${p.shade}, ${p.shade}, ${p.shade + 6}, 0)`);
          c.fillStyle = g;
          c.beginPath();
          c.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          c.fill();
        }
      }
      if (t < INCUBATE_BURST_MS) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
