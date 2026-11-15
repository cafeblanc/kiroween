import React from 'react';
import type { BioreactorContainerProps } from '../../types/kiroween';
import { LazyVideo } from './videoLoading';

export interface BioreactorContainerSlots {
  /** Fluid/bubble layer (BioreactorFluid, task 2.2). Rendered inside the frame, above the video. */
  children?: React.ReactNode;
  /** Next stage video; preloaded in the background while the current one plays. */
  nextVideoUrl?: string;
}

/**
 * Fixed-frame glass chamber. The outer `.fixed-frame-border` never transforms,
 * animates, or shakes. All effects live inside an `overflow-hidden` inner
 * viewport, so nothing can escape or shift the frame (Requirement 3.1).
 */
export const BioreactorContainer: React.FC<
  BioreactorContainerProps & BioreactorContainerSlots
> = ({
  videoUrl,
  nextVideoUrl,
  stageProgress,
  currentStage,
  bpm,
  fluidLevel,
  isAwakening,
  children,
}) => {
  const progress = Math.min(100, Math.max(0, stageProgress));
  const level = Math.min(1, Math.max(0.15, fluidLevel));

  return (
    <div
      className="fixed-frame-border relative w-full h-full border border-neural/40 shadow-[0_0_24px_rgba(6,182,212,0.25),inset_0_0_32px_rgba(6,182,212,0.15)]"
      style={{ backgroundColor: '#020617', transform: 'none', animation: 'none' }}
      data-testid="bioreactor-container"
      data-stage={currentStage}
      data-awakening={isAwakening}
      data-bpm={bpm}
      data-fluid-level={level}
      data-progress={progress}
    >
      {/* Inner viewport: clips every effect to the frame. */}
      <div className="absolute inset-0 overflow-hidden" data-testid="bioreactor-viewport">
        {/* Video container: absolutely positioned, fixed to the frame. */}
        <div className="absolute inset-0" data-testid="bioreactor-video-container">
          <LazyVideo
            src={videoUrl}
            nextSrc={nextVideoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        </div>

        {/* Effects slot (BioreactorFluid etc.), contained by overflow-hidden. */}
        <div className="absolute inset-0 pointer-events-none" data-testid="bioreactor-effects">
          {children}
        </div>

        {/* Glass sheen, static. */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default BioreactorContainer;
