import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MonsterDefinition } from '../../types/kiroween';
import { BioreactorContainer } from './BioreactorContainer';
import { BioreactorFluid } from './BioreactorFluid';
import { useGrowthTimelapse } from './GrowthTimelapseEngine';
import { GROWTH_STAGES, STAGE_COUNT, STAGE_DURATION_SEC } from './growthStages';
import { StageProgressHUD } from './StageProgressHUD';
import { AwakeningRoar } from './awakening';
import { createVideoPipeline } from '../../services/videoPipeline';

/** Minimal monster shape the screen needs (ComicMonster satisfies this). */
export interface BioreactorMonsterInput {
  id: string;
  nameEn: string;
  nameKo: string;
  icon: string;
  colorHex: string;
  roarAudio: string;
  promptEn: string;
  promptKo: string;
  videoSrc: string;
}

export interface BioreactorScreenProps {
  monster: BioreactorMonsterInput;
  /** Awakening (glass crack + roar) trigger from outside, e.g. the "3D burst now" button. Increment to fire. */
  awakenSignal?: number;
  /** Fired on every stage change (including stage 1 at start). */
  onStageChange?: (stage: number, bpm: number) => void;
  /** Fired once when awakening starts (sequence end or manual trigger). */
  onAwaken?: () => void;
  /** Fired on each heartbeat tick, at the current BPM. */
  onHeartbeat?: (bpm: number) => void;
  /** Clicking the chamber returns to the selector. */
  onReturn?: () => void;
  /** Control buttons rendered over the bottom of the chamber. */
  controls?: React.ReactNode;
}

const AWAKENING_VIDEO = '/videos/chimera_awakening_dragon.mp4';
const AWAKENING_VIDEO_CYBER = '/videos/chimera_awakening_cyber.mp4';

export function toMonsterDefinition(m: BioreactorMonsterInput): MonsterDefinition {
  const awakeningVideo = /bot|alien|cyber/i.test(m.id) ? AWAKENING_VIDEO_CYBER : AWAKENING_VIDEO;
  return {
    id: m.id,
    name: m.nameEn,
    nameKo: m.nameKo,
    type: 'mythic',
    color: m.colorHex,
    roarAudio: m.roarAudio,
    awakeningVideo,
    promptEn: m.promptEn,
    promptKo: m.promptKo,
    growthReference: m.videoSrc,
    stages: GROWTH_STAGES.map((s) => ({
      stage: s.stage,
      label: s.label,
      description: s.visualEffect,
      start: s.start,
      end: s.end,
      targetBpm: s.targetBpm,
      visualEffect: s.visualEffect,
      videoPrompt: m.promptEn,
    })),
  };
}

/** Fluid level: full while growing, drained once the creature awakens. */
export const FLUID_LEVEL_GROWING = 1.0;
export const FLUID_LEVEL_AWAKENED = 0.15;

/**
 * 15s growth screen: video pipeline -> BioreactorContainer (fixed frame) with
 * BioreactorFluid inside, StageProgressHUD, per-stage video clip (timecode
 * segment) + playback rate, BPM-driven heartbeat, and AwakeningRoar.
 */
export const BioreactorScreen: React.FC<BioreactorScreenProps> = ({
  monster,
  awakenSignal = 0,
  onStageChange,
  onAwaken,
  onHeartbeat,
  onReturn,
  controls,
}) => {
  const [isAwakening, setIsAwakening] = useState(false);
  const [videoUrl, setVideoUrl] = useState(monster.videoSrc);
  const [notice, setNotice] = useState<string | undefined>();
  const videoHostRef = useRef<HTMLDivElement>(null);
  const awakenedRef = useRef(false);
  const onAwakenRef = useRef(onAwaken);
  onAwakenRef.current = onAwaken;
  const onHeartbeatRef = useRef(onHeartbeat);
  onHeartbeatRef.current = onHeartbeat;

  const definition = useMemo(() => toMonsterDefinition(monster), [monster]);

  const awaken = useCallback(() => {
    if (awakenedRef.current) return;
    awakenedRef.current = true;
    setIsAwakening(true);
    onAwakenRef.current?.();
  }, []);

  const growth = useGrowthTimelapse(monster.id, onStageChange, awaken);

  // Resolve the video source through the pipeline (AI when a key is set; otherwise the monster's own growth clip).
  useEffect(() => {
    let cancelled = false;
    setVideoUrl(monster.videoSrc);
    setNotice(undefined);
    const pipeline = createVideoPipeline({ onUserMessage: (m) => !cancelled && setNotice(m) });
    pipeline
      .getVideoSource(monster.id)
      .then((res) => {
        if (cancelled) return;
        if (res.source === 'ai' || res.source === 'cache') setVideoUrl(res.videoUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [monster.id, monster.videoSrc]);

  // Manual trigger ("3D burst now").
  useEffect(() => {
    if (awakenSignal > 0) awaken();
  }, [awakenSignal, awaken]);

  // Per-stage clip: seek to this stage's 1/6 timecode segment and fit it to 2.5s.
  const stage = growth.stage;
  useEffect(() => {
    if (isAwakening) return undefined;
    const apply = () => {
      const v = videoHostRef.current?.querySelector('video');
      if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return false;
      const segment = v.duration / STAGE_COUNT;
      try {
        v.currentTime = (stage - 1) * segment;
        v.playbackRate = Math.min(16, Math.max(0.0625, segment / STAGE_DURATION_SEC));
        void v.play().catch(() => undefined);
      } catch {
        /* element not seekable yet */
      }
      return true;
    };
    if (apply()) return undefined;
    // Video not ready yet: retry when metadata arrives.
    const v = videoHostRef.current?.querySelector('video');
    if (!v) return undefined;
    v.addEventListener('loadedmetadata', apply, { once: true });
    return () => v.removeEventListener('loadedmetadata', apply);
  }, [stage, videoUrl, isAwakening]);

  // Heartbeat that speeds up with BPM.
  const bpm = growth.bpm;
  useEffect(() => {
    if (isAwakening) return undefined;
    const beat = () => onHeartbeatRef.current?.(bpm);
    beat();
    const id = window.setInterval(beat, 60000 / bpm);
    return () => window.clearInterval(id);
  }, [bpm, isAwakening]);

  return (
    <div
      className="relative flex-1 min-h-[75vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      data-testid="bioreactor-screen"
      data-stage={stage}
      data-bpm={bpm}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,_rgba(16,185,129,0.38)_0%,_rgba(6,182,212,0.22)_35%,_rgba(15,23,42,0.85)_70%,_#020617_100%)] pointer-events-none" />

      <div ref={videoHostRef} className="relative w-full max-w-5xl cursor-pointer" onClick={onReturn}>
        <BioreactorContainer
          videoUrl={videoUrl}
          stageProgress={growth.stageProgress}
          currentStage={stage}
          bpm={bpm}
          fluidLevel={isAwakening ? FLUID_LEVEL_AWAKENED : FLUID_LEVEL_GROWING}
          isAwakening={isAwakening}
        >
          <BioreactorFluid
            fluidLevel={isAwakening ? FLUID_LEVEL_AWAKENED : FLUID_LEVEL_GROWING}
            bpm={bpm}
            stage={stage}
          />
          {isAwakening && <AwakeningRoar monster={definition} />}
          <div className="absolute left-3 top-3 z-10">
            <StageProgressHUD stage={stage} progress={growth.stageProgress} bpm={bpm} />
          </div>
          {notice && (
            <div className="absolute right-3 top-3 z-10 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-amber-300">
              {notice}
            </div>
          )}
        </BioreactorContainer>
      </div>

      {controls && (
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <span className="text-[11px] font-mono bg-black/80 backdrop-blur text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 font-bold">
            {monster.icon} {monster.nameKo} · {Math.round(growth.totalProgress)}% ({bpm} BPM)
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">{controls}</div>
        </div>
      )}
    </div>
  );
};

export default BioreactorScreen;
