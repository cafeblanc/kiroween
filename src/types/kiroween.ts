/**
 * Core types for the Kiroween rearchitecture (15s, 6-stage growth timelapse,
 * hybrid video pipeline, 16x16 battle matrix).
 * Source of truth: .kiro/specs/kiroween-rearchitecture/design.md (Data Models).
 */

// ---------------------------------------------------------------------------
// Growth stages & monsters
// ---------------------------------------------------------------------------

export type GrowthStageNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface GrowthStage {
  stage: number; // 1-6
  label: string; // "STEM CELL", "CELL DIVISION", ...
  description: string;
  start: number; // seconds (0.0, 2.5, 5.0, ...)
  end: number; // seconds (2.5, 5.0, 7.5, ...)
  targetBpm: number;
  visualEffect: string;
  videoPrompt: string; // AI generation prompt for this stage
}

/** Lightweight stage config used by the timelapse engine. */
export interface GrowthStageConfig {
  stage: number;
  label: string;
  start: number;
  end: number;
  targetBpm: number;
  visualEffect: string;
  transitionTrigger: boolean;
}

export type MonsterType = 'mythic' | 'gamer' | 'disco';

export interface MonsterDefinition {
  id: string;
  name: string;
  nameKo: string;
  type: MonsterType;
  color: string;
  roarAudio: string;
  awakeningVideo: string;
  promptEn: string;
  promptKo: string;
  growthReference: string; // URL to reference video
  stages: GrowthStage[];
}

// ---------------------------------------------------------------------------
// Battle matrix
// ---------------------------------------------------------------------------

export interface BattleVideoMapping {
  f1Id: string;
  f2Id: string;
  videoUrl: string;
  isPreMade: boolean; // true if the MP4 file exists
}

export interface BattleMatrix {
  getBattleVideo(f1Id: string, f2Id: string): string;
  generateMatrix(monsters: MonsterDefinition[]): void;
}

// ---------------------------------------------------------------------------
// Video pipeline
// ---------------------------------------------------------------------------

export type VideoProvider = 'huggingface_wan2' | 'luma';

export type VideoSourceKind = 'ai' | 'reference' | 'cache';

export interface StageClip {
  start: number;
  end: number;
  label: string;
  videoUrl: string;
}

export interface VideoGenerationRequest {
  prompt: string;
  provider: VideoProvider;
  apiKey?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
  duration?: number;
}

export interface VideoCacheEntry {
  promptHash: string; // SHA256 hash of prompt
  videoUrl: string;
  timestamp: number; // creation time (ms)
  expiry: number; // expiry time (ms), default 24h
}

/** Result of resolving a monster to a playable growth video. */
export interface VideoSourceResult {
  source: VideoSourceKind;
  videoUrl: string;
  clips: StageClip[];
  /** User-facing notice when a fallback was used. */
  message?: string;
}

export interface AIVideoGenerator {
  generateSixStageSequence(monsterId: string): Promise<VideoGenerationResponse>;
  generateSingleStage(
    prompt: string,
    provider: string,
    apiKey?: string,
  ): Promise<string | null>;
  splitIntoSixStages(prompt: string): string[];
  checkCache(prompt: string): Promise<string | null>;
  cacheVideo(prompt: string, url: string): Promise<void>;
}

export interface ReferenceVideoSelector {
  select(monsterId: string): VideoSourceResult;
}

export interface VideoConcatenationService {
  concatenateStages(clips: StageClip[]): string; // returns concatenated video URL
  createCrossfadeTransition(current: StageClip, next: StageClip): Promise<void>;
  calculateTotalDuration(clips: StageClip[]): number;
}

export interface VideoPipeline {
  getVideoSource(monsterId: string): Promise<VideoSourceResult>;
}

// ---------------------------------------------------------------------------
// Component props / state
// ---------------------------------------------------------------------------

export interface BioreactorContainerProps {
  videoUrl: string;
  stageProgress: number; // 0-100
  currentStage: number; // 1-6
  bpm: number;
  fluidLevel: number; // 1.0 (full) -> 0.15 (drained)
  isAwakening: boolean;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobble: number; // phase for sine wave
}

export interface BioreactorContainerState {
  fluidOpacity: number;
  bubblePosition: { x: number; y: number; radius: number }[];
  reflectionPosition: { x: number; y: number }[];
}

export interface BioreactorFluidProps {
  fluidLevel: number;
}

export interface BioreactorFluidState {
  bubbles: Bubble[];
  surfaceWaveOffset: number;
}

export interface GrowthTimelapseEngineProps {
  monsterId: string;
  onStageChange?: (stage: number, bpm: number) => void;
  onComplete?: () => void;
}

export interface StageProgressHUDProps {
  stage: number; // 1-6
  progress: number; // 0-100
  bpm: number;
}

export interface StageProgressHUDState {
  stageLabel: string;
  progressBarColor: string;
  bpmColor: string;
}

export interface AwakeningRoarProps {
  monster: MonsterDefinition;
  onComplete?: () => void;
}

export interface AwakeningRoarState {
  isRoaring: boolean;
  glassCrackProgress: number;
  roarVolume: number;
}
