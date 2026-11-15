import React, { useEffect, useRef } from "react";

const OBSIDIAN = "#020617";
const EMERALD = "#10b981";
const CYAN = "#06b6d4";
const CRIMSON = "#ef4444";

interface Cell {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  color: string;
}

/** Canvas bio-simulation shown when neither the microscopy video nor the confocal photo can load. */
export const BioSimCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth || 640;
      canvas.height = canvas.clientHeight || 360;
    };
    resize();

    const palette = [EMERALD, CYAN, CRIMSON];
    const cells: Cell[] = Array.from({ length: 28 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 8 + Math.random() * 22,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      phase: Math.random() * Math.PI * 2,
      color: palette[i % palette.length],
    }));

    let frame = 0;
    let animId = 0;
    const draw = () => {
      frame++;
      ctx.globalAlpha = 1;
      ctx.fillStyle = OBSIDIAN;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const c of cells) {
        c.x += c.vx;
        c.y += c.vy;
        if (c.x < -c.r) c.x = canvas.width + c.r;
        if (c.x > canvas.width + c.r) c.x = -c.r;
        if (c.y < -c.r) c.y = canvas.height + c.r;
        if (c.y > canvas.height + c.r) c.y = -c.r;
        const pulse = 1 + 0.12 * Math.sin(frame * 0.05 + c.phase);
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.28;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = c.color;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
      }
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Bio-simulation fallback"
      className="absolute inset-0 w-full h-full"
    />
  );
};
