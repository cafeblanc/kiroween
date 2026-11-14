import React, { useEffect, useRef } from 'react';
import type { Bubble, BioreactorFluidProps as BaseProps } from '../../types/kiroween';
import {
  bubbleCount,
  bubbleOpacity,
  bubbleX,
  clampFluidLevel,
  createBubble,
  stepBubble,
  surfaceBaseY,
  surfaceWaveOffset,
} from './fluidDynamics';

export interface BioreactorFluidProps extends BaseProps {
  /** Optional bpm; speeds up bubbles and surface waves (REQ-11). */
  bpm?: number;
  /** Optional growth stage (1-6); raises surface wave frequency (REQ-11.2). */
  stage?: number;
}

/**
 * Canvas fluid layer: rising bubbles and a sine-wave surface. Fills its parent
 * (absolute inset-0) and draws only inside its own canvas, so it never moves the frame.
 */
export const BioreactorFluid: React.FC<BioreactorFluidProps> = ({ fluidLevel, bpm, stage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ fluidLevel, bpm, stage });
  propsRef.current = { fluidLevel, bpm, stage };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let bubbles: Bubble[] = [];
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      const { fluidLevel: lvl, bpm: curBpm, stage: curStage } = propsRef.current;
      const level = clampFluidLevel(lvl);

      const w = canvas.clientWidth || canvas.width;
      const h = canvas.clientHeight || canvas.height;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const target = bubbleCount(level, curBpm);
      while (bubbles.length < target) bubbles.push(createBubble(Math.random, level));
      if (bubbles.length > target) bubbles.length = target;
      bubbles = bubbles.map((b) => stepBubble(b, dt, level, curBpm));

      ctx.clearRect(0, 0, w, h);

      // Fluid body with sine-wave surface.
      const baseY = surfaceBaseY(level);
      ctx.beginPath();
      ctx.moveTo(0, h);
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const nx = i / steps;
        ctx.lineTo(nx * w, (baseY + surfaceWaveOffset(nx, elapsed, curBpm, curStage)) * h);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16,185,129,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(6,182,212,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bubbles.
      const alpha = bubbleOpacity(level);
      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(bubbleX(b) * w, b.y * h, Math.max(1, b.radius * w), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,243,208,${(alpha * 0.5).toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(6,182,212,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      data-testid="bioreactor-fluid"
      aria-hidden="true"
    />
  );
};

export default BioreactorFluid;
