import React, { useEffect, useRef, useState } from 'react';
import {
  GROWTH_STAGES,
  TOTAL_DURATION_SEC,
  getStageByElapsed,
  getStageProgress,
  getTotalProgress,
} from './growthStages';

export interface GrowthTimelapseEngineProps {
  monsterId: string;
  onStageChange?: (stage: number, bpm: number) => void;
  onComplete?: () => void;
}

export interface GrowthTimelapseState {
  elapsedSec: number;
  stage: number;
  bpm: number;
  stageProgress: number;
  totalProgress: number;
  complete: boolean;
}

const INITIAL_STAGE = GROWTH_STAGES[0];

const initialState: GrowthTimelapseState = {
  elapsedSec: 0,
  stage: INITIAL_STAGE.stage,
  bpm: INITIAL_STAGE.targetBpm,
  stageProgress: 0,
  totalProgress: 0,
  complete: false,
};

/**
 * Drives the 15s, 6-stage growth sequence (2.5s per stage) from a
 * performance.now() baseline via requestAnimationFrame, so timing does not
 * drift. Restarts whenever monsterId changes. onStageChange fires exactly once
 * per stage (including stage 1 on start); onComplete fires once at 15.0s.
 */
export function useGrowthTimelapse(
  monsterId: string,
  onStageChange?: (stage: number, bpm: number) => void,
  onComplete?: () => void,
): GrowthTimelapseState {
  const [state, setState] = useState<GrowthTimelapseState>(initialState);
  const stageCbRef = useRef(onStageChange);
  const completeCbRef = useRef(onComplete);
  stageCbRef.current = onStageChange;
  completeCbRef.current = onComplete;

  useEffect(() => {
    const startedAt = performance.now();
    let rafId = 0;
    let lastStage = 0;
    let finished = false;

    const tick = (now: number) => {
      if (finished) return;
      const elapsedSec = Math.min(TOTAL_DURATION_SEC, Math.max(0, (now - startedAt) / 1000));
      const cfg = getStageByElapsed(elapsedSec);
      const complete = elapsedSec >= TOTAL_DURATION_SEC;

      // Fire every stage crossed since the last frame (handles throttled tabs).
      while (lastStage < cfg.stage) {
        lastStage += 1;
        const reached = GROWTH_STAGES[lastStage - 1];
        stageCbRef.current?.(reached.stage, reached.targetBpm);
      }

      setState({
        elapsedSec,
        stage: cfg.stage,
        bpm: cfg.targetBpm,
        stageProgress: complete ? 100 : getStageProgress(elapsedSec),
        totalProgress: getTotalProgress(elapsedSec),
        complete,
      });

      if (complete) {
        finished = true;
        completeCbRef.current?.();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    setState(initialState);
    rafId = requestAnimationFrame(tick);

    return () => {
      finished = true;
      cancelAnimationFrame(rafId);
    };
  }, [monsterId]);

  return state;
}

/**
 * Headless orchestrator: renders only a visually hidden live status node.
 * Visual display is handled by StageProgressHUD and the bioreactor components.
 */
export const GrowthTimelapseEngine: React.FC<GrowthTimelapseEngineProps> = ({
  monsterId,
  onStageChange,
  onComplete,
}) => {
  const s = useGrowthTimelapse(monsterId, onStageChange, onComplete);
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="off"
      data-monster-id={monsterId}
      data-stage={s.stage}
      data-bpm={s.bpm}
      data-complete={s.complete}
    >
      Stage {s.stage} of {GROWTH_STAGES.length}, {s.bpm} BPM
    </div>
  );
};

export default GrowthTimelapseEngine;
