import React from 'react';
import type { StageProgressHUDProps } from '../../types/kiroween';
import { GROWTH_STAGES, STAGE_COUNT, STAGE_DURATION_SEC, getStageByNumber } from './growthStages';

const STAGE_GLYPHS = ['①', '②', '③', '④', '⑤', '⑥'] as const;

export type BpmZone = 'green' | 'yellow' | 'red';

/** BPM color zones: green 58-105, yellow 105-200, red 200+ (boundaries belong to the higher zone). */
export function getBpmZone(bpm: number): BpmZone {
  if (bpm >= 200) return 'red';
  if (bpm >= 105) return 'yellow';
  return 'green';
}

const BPM_COLORS: Record<BpmZone, string> = {
  green: '#10b981',
  yellow: '#facc15',
  red: '#ef4444',
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** e.g. "② CELL DIVISION" */
export function getStageLabel(stage: number): string {
  const n = Math.round(clamp(stage, 1, STAGE_COUNT));
  const cfg = getStageByNumber(n, GROWTH_STAGES);
  return `${STAGE_GLYPHS[n - 1]} ${cfg?.label ?? ''}`.trim();
}

export const StageProgressHUD: React.FC<StageProgressHUDProps> = ({ stage, progress, bpm }) => {
  const pct = clamp(progress, 0, 100);
  const stageLabel = getStageLabel(stage);
  const bpmColor = BPM_COLORS[getBpmZone(bpm)];
  const elapsed = (pct / 100) * STAGE_DURATION_SEC;

  return (
    <div
      data-testid="stage-progress-hud"
      className="pointer-events-none w-full max-w-xs rounded-md border border-bio/40 bg-obsidian/80 p-3 font-mono text-xs text-bio backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <span data-testid="hud-stage-label" className="font-bold tracking-wider text-neural">
          {stageLabel}
        </span>
        <span data-testid="hud-timer" className="text-slate-300">
          {elapsed.toFixed(1)}s / {STAGE_DURATION_SEC.toFixed(1)}s
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Stage progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
      >
        <div
          data-testid="hud-progress-bar"
          className="h-full rounded-full bg-gradient-to-r from-bio to-neural"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span data-testid="hud-progress-pct">{Math.round(pct)}%</span>
        <span data-testid="hud-bpm" className="font-bold" style={{ color: bpmColor }}>
          ♥ {Math.round(bpm)} BPM
        </span>
      </div>
    </div>
  );
};

export default StageProgressHUD;
