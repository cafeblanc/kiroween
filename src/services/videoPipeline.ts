import type {
  AIVideoGenerator,
  ReferenceVideoSelector,
  StageClip,
  VideoPipeline,
  VideoSourceResult,
} from '../types/kiroween';
import { sanitizeVideoUrl } from '../utils/security';

export const AI_FALLBACK_MESSAGE = 'AI generation unavailable, using reference video';

const STAGE_LABELS = ['STEM CELL', 'CELL DIVISION', 'EMBRYO', 'GROWTH', 'JUVENILE', 'ADULT'];
const STAGE_SECONDS = 2.5;

export interface VideoPipelineDeps {
  /** Resolves the AI generator (defaults to ./aiVideoService). */
  getAIGenerator?: () => Promise<AIVideoGenerator>;
  /** Resolves the reference selector (defaults to ./referenceVideoSelector). */
  getReferenceSelector?: () => Promise<ReferenceVideoSelector>;
  /** Returns true when an AI provider key is configured. */
  isAIAvailable?: () => boolean;
  /** Called with a user-facing notice when falling back. */
  onUserMessage?: (message: string) => void;
}

function readKey(envName: string, storageKey: string): string {
  let envVal = '';
  try {
    envVal = ((import.meta as any).env?.[envName] as string | undefined) || '';
  } catch {
    // import.meta.env unavailable
  }
  if (envVal.trim()) return envVal.trim();
  try {
    return (localStorage.getItem(storageKey) || '').trim();
  } catch {
    return '';
  }
}

/**
 * True only when the paid six-stage LTX pipeline is explicitly enabled (VITE_LTX_PIPELINE or
 * localStorage kiroween_ltx_pipeline = "1"). Six 6 s 1080p jobs per monster are costly, so it is opt-in.
 */
export function isAIVideoAvailable(): boolean {
  return readKey('VITE_LTX_PIPELINE', 'kiroween_ltx_pipeline') === '1';
}

async function pickExport<T>(modPromise: Promise<any>, names: string[], label: string): Promise<T> {
  const mod = await modPromise;
  for (const n of names) {
    if (mod?.[n]) return mod[n] as T;
  }
  if (mod?.default) return mod.default as T;
  throw new Error(`${label} export not found`);
}

const defaultGetAIGenerator = () =>
  pickExport<AIVideoGenerator>(
    import('./aiVideoService'),
    ['aiVideoGenerator', 'AIVideoGenerator'],
    'AIVideoGenerator',
  );

const defaultGetReferenceSelector = () =>
  pickExport<ReferenceVideoSelector>(
    import('./referenceVideoSelector'),
    ['referenceVideoSelector', 'ReferenceVideoSelector'],
    'ReferenceVideoSelector',
  );

function buildClips(videoUrl: string): StageClip[] {
  return STAGE_LABELS.map((label, i) => ({
    start: i * STAGE_SECONDS,
    end: (i + 1) * STAGE_SECONDS,
    label,
    videoUrl,
  }));
}

export function createVideoPipeline(deps: VideoPipelineDeps = {}): VideoPipeline {
  const getAI = deps.getAIGenerator ?? defaultGetAIGenerator;
  const getRef = deps.getReferenceSelector ?? defaultGetReferenceSelector;
  const isAIAvailable = deps.isAIAvailable ?? isAIVideoAvailable;
  const notify = deps.onUserMessage ?? (() => {});

  const useReference = async (monsterId: string, reason: string): Promise<VideoSourceResult> => {
    notify(AI_FALLBACK_MESSAGE);
    const selector = await getRef();
    const result = selector.select(monsterId);
    return { ...result, message: result.message ?? (reason ? AI_FALLBACK_MESSAGE : undefined) };
  };

  return {
    async getVideoSource(monsterId: string): Promise<VideoSourceResult> {
      if (!isAIAvailable()) {
        console.warn('[VideoPipeline] No AI API key configured, using reference video');
        return useReference(monsterId, 'no_api_key');
      }

      try {
        const generator = await getAI();
        const res = await generator.generateSixStageSequence(monsterId);
        const safeAiUrl = sanitizeVideoUrl(res.videoUrl);
        if (!res.success || !safeAiUrl) {
          throw new Error(res.error || 'Video generation failed');
        }
        return {
          source: 'ai',
          videoUrl: safeAiUrl,
          clips: buildClips(safeAiUrl),
        };
      } catch (err) {
        console.error('[VideoPipeline] AI video generation error:', (err as Error)?.message ?? err);
        return useReference(monsterId, 'api_error');
      }
    },
  };
}

/** Default pipeline instance. */
export const videoPipeline: VideoPipeline = createVideoPipeline();
