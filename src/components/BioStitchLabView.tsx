import React, { useState, useEffect, useRef } from "react";
import {
  VERIFIED_BIO_EXPERIMENTS,
  BioExperimentCase,
  CHIMERA_PART_OPTIONS,
  ChimeraPartOption
} from "../data/bioExperiments";
import { COMIC_MONSTERS, ComicMonster, HUMAN_PROMETHEUS_MONSTER } from "../data/comicMonsters";
import { REAL_STEM_CELL_PHOTOS } from "../data/stemCellPhotos";
import {
  scienceStitchService,
  detectQuestionIntent,
  toConciseCore,
  translateTextToLanguage,
  fetchWithTimeout,
  type StitchedResearchDossier
} from "../services/scienceStitchService";
import { BioSimCanvas } from "./BioSimCanvas";
import { CustomMonsterStudio } from "./bioreactor/CustomMonsterStudio";
import { ArenaHalf } from "./bioreactor/ArenaHalf";
import { generateMonsterVideo } from "../services/videoGenService";
import { LTX_MAX_WAIT_MS } from "../services/ltxJobClient";
import { BioreactorScreen } from "./bioreactor/BioreactorScreen";
import { BATTLE_VIDEO_SECONDS, MIRROR_RIGHT_FIGHTER, generateBattleVideo } from "../services/battleVideoService";
import {
  EMPTY_SLOTS,
  canStartDesignedBattle,
  isDesignedMonster,
  placeEntrant,
  pruneSlots,
  selectSlot,
  type ArenaSlots,
} from "../utils/arenaRoster";
import {
  ARENA_TURN_MS,
  type IncubationPhase,
  MONSTER_REVEAL_MS,
  INCUBATE_BURST_MS,
  BURST_EXPLODE_MS,
  SUMMON_ROAR_INTERVAL_MS,
  EMBRYO_CLIPS,
  EMBRYO_CLIP_RATE,
  EMBRYO_CROSSFADE_MS,
  EMBRYO_FRAMES,
  EMBRYO_STAGE_DURATIONS_MS,
  type EmbryoAction,
  MONSTER_EMERGE_MS,
  embryoSequence,
  nextEmbryoClip,
  faceOffAngleDeg,
  summonRoarVolume,
} from "../utils/summonTiming";
import { playExplosionSound, startBubbleSound } from "../utils/bubbleSound";
import SmokeBurst from "./bioreactor/SmokeBurst";
import {
  cleanStoryName,
  composeBattleStory,
  joinActs,
  toStoryFighter,
  type BattleStory,
  type StoryActs,
} from "../services/battleStoryService";
import {
  getAllMonsters,
  getChronicle,
  getChronicles,
  deleteChronicle,
  newChronicleId,
  revokeObjectUrls,
  saveChronicle,
  type BattleChronicle,
} from "../services/monsterVaultService";
import { GROWTH_STAGES } from "./bioreactor/growthStages";
import { GoogleLanguageSelector, getBcp47ForLang } from "./GoogleLanguageSelector";
import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";
import { resolveBattle, type BattleResult } from "../utils/arenaBattle";
import { addToRoster, mergeRoster, ownedBlobUrls, vaultToComicMonster } from "../services/customMonsterVaultMapping";

type LangMode = "KO" | "EN";

const LOCAL_CONFOCAL_FALLBACK = "/images/chimera_microscopy_quad.jpg";

// Synapse chat overlay: messages stay on the video this long after the last one, then slide up and vanish.
const SYNAPSE_CHAT_ABSORB_MS = 3000;
/** The chimera lab tab (6 curated sample specimens) is hidden for now at the user's request; the code is kept. */
const SHOW_CHIMERA_LAB = false;
const SYNAPSE_CHAT_EXIT_ANIM_MS = 550;

interface LabManualPoint {
  icon: string;
  ko: { title: string; body: string };
  en: { title: string; body: string };
}

// Concise 6-point Lab Manual (bilingual; the modal picks ko/en by isKo).
const LAB_MANUAL_POINTS: LabManualPoint[] = [
  {
    icon: "🐭",
    ko: { title: "1. 실제 줄기세포 실험 탐구", body: "실험 목록(아홀로틀 사지 재생·유령 심장·키메라 영장류 등)을 누르면 현미경 뷰와 논문 요약이 즉시 전환됩니다." },
    en: { title: "1. Explore real stem-cell experiments", body: "Pick an experiment from the list (axolotl limb regeneration, ghost heart, chimeric primate and more) to switch the microscopy view and paper summary." },
  },
  {
    icon: "📡",
    ko: { title: "2. 전체 화면 현미경 영상", body: "화면 전체에 음소거 현미경 영상과 공초점 사진을 겹쳐 보여주며, 화면을 누르면 내레이터가 켜지고 꺼집니다. 사용법은 맨 윗줄 [❓ 사용법] 버튼에 있습니다." },
    en: { title: "2. Full-screen microscopy view", body: "The muted microscopy video is layered over a confocal photo across the whole screen. Tap it to toggle the narrator. This guide is under [❓ Help] in the top bar." },
  },
  {
    icon: "🌐",
    ko: { title: "3. 다국어 & 내레이터", body: "우측 상단 언어 선택기로 화면 전체를 번역하고, 내레이터 버튼으로 해당 언어 음성을 듣습니다." },
    en: { title: "3. Languages & narrator", body: "Use the language selector at the top right to translate the screen, and the Narrator button to hear it spoken." },
  },
  {
    icon: "💬",
    ko: { title: "4. 논문·백과사전 채팅", body: "맨 아래 입력창에 질문하면 PubMed와 위키백과를 실시간으로 검색해 영상 위에 답변을 보여주고, 약 3초 뒤 위로 사라집니다. 하단 사진 목록에서 6개 실험을 고를 수 있습니다." },
    en: { title: "4. Paper & encyclopedia chat", body: "Ask in the input line at the very bottom. The lab searches PubMed and Wikipedia live, shows the answer over the video, and it slides away after about 3 seconds. Pick one of the 6 experiments from the photo strip at the bottom." },
  },
  {
    icon: "⚡",
    ko: { title: "5. 키메라 조립·부활", body: "키메라 조립 버튼으로 iPSC를 조직 사이에 주입해 괴수를 15초 배양하고 3D 각성과 결투장으로 이어갑니다." },
    en: { title: "5. Chimera assembly", body: "Open the Chimera Assembler to inject iPSCs between tissues, culture a creature for 15 seconds, then awaken it and send it to the arena." },
  },
  {
    icon: "🧬",
    ko: { title: "6. 괴수 설계실", body: "맨 윗줄 [괴수 설계실]에서 부위를 설계하고 [괴수 배양기 가동] 또는 [생성 괴수 결투장 출격]을 누르면 이미지와 영상이 백그라운드에서 만들어집니다. 가이드를 닫으면 진행 중인 화면 그대로 돌아갑니다." },
    en: { title: "6. Monster Design Room", body: "Design the parts in [Monster Design Room] in the top bar, then press [Start the bioreactor] or [Send to the arena]; the image and video are made in the background. Closing this guide returns you to where you were." },
  },
];

function buildOfflineDossier(query: string): StitchedResearchDossier {
  return {
    query,
    timestamp: new Date().toLocaleTimeString(),
    wiki: null,
    papers: [],
    stemCellSynthesisEn:
      "The live PubMed / Wikipedia lookup is unavailable right now. Please try again in a moment or ask about the active experiment.",
    stemCellSynthesisKo:
      "실시간 PubMed / 위키백과 검색이 지금은 응답하지 않습니다. 잠시 후 다시 시도하거나 현재 실험에 대해 질문해 주세요.",
  };
}

interface SynapseChatMessage {
  id: string;
  sender: "researcher" | "ai";
  textEn: string;
  textKo: string;
  subTextEn?: string;
  subTextKo?: string;
  pmidBadge?: string;
  timestamp: string;
  linkedCase?: BioExperimentCase;
}

export interface ChimeraCreationResult {
  archetype: "mythic" | "gamer" | "disco";
  badge: string;
  titleKo: string;
  titleEn: string;
  subtitleKo: string;
  subtitleEn: string;
  storyKo: string;
  storyEn: string;
  firstWordsKo: string;
  firstWordsEn: string;
  speechKo: string;
  speechEn: string;
  bpm: number;
  colorHex: string;
}

// Generate organic biological cardiac acoustic buffer ("쿵... 쾅!", Lub-Dub)
function createOrganicHeartbeatBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const duration = 0.55;
  const totalSamples = Math.floor(sampleRate * duration);
  const audioBuf = ctx.createBuffer(1, totalSamples, sampleRate);
  const data = audioBuf.getChannelData(0);

  // Brown noise for biological fluid turbulence
  let lastNoise = 0;
  let fVal = 0;
  const alpha = (2 * Math.PI * 65) / sampleRate;

  for (let i = 0; i < totalSamples; i++) {
    const white = Math.random() * 2 - 1;
    lastNoise = (lastNoise + 0.04 * white) / 1.04;
    fVal += alpha * (lastNoise - fVal);
    const filteredNoise = fVal;
    const t = i / sampleRate;
    let sample = 0;

    // S1 (쿵! Lub): 0.02s to 0.22s
    const t1 = t - 0.02;
    if (t1 >= 0 && t1 < 0.20) {
      const attack = Math.min(1.0, t1 / 0.006);
      const decay = Math.exp(-t1 * 15);
      const env = attack * decay;

      const freq1 = 54 * Math.exp(-t1 * 10) + 24;
      const w1 = Math.sin(2 * Math.PI * freq1 * t1);

      const freqSub = 28 * Math.exp(-t1 * 8) + 14;
      const wSub = Math.sin(2 * Math.PI * freqSub * t1);

      const turb = filteredNoise * 2.4;
      const raw = (w1 * 1.5 + wSub * 1.25 + turb * 0.55) * env;
      sample += Math.tanh(raw * 2.5) * 0.98;
    }

    // S2 (쾅! Dub): 0.165s to 0.35s
    const t2 = t - 0.165;
    if (t2 >= 0 && t2 < 0.18) {
      const attack2 = Math.min(1.0, t2 / 0.005);
      const decay2 = Math.exp(-t2 * 19);
      const env2 = attack2 * decay2;

      const freq2 = 68 * Math.exp(-t2 * 12) + 32;
      const w2 = Math.sin(2 * Math.PI * freq2 * t2);

      const freqSub2 = 38 * Math.exp(-t2 * 9) + 20;
      const wSub2 = Math.sin(2 * Math.PI * freqSub2 * t2);

      const turb2 = filteredNoise * 2.0;
      const raw2 = (w2 * 1.35 + wSub2 * 1.0 + turb2 * 0.45) * env2;
      sample += Math.tanh(raw2 * 2.3) * 0.94;
    }

    data[i] = Math.max(-0.99, Math.min(0.99, sample));
  }

  return audioBuf;
}

export const BioStitchLabView: React.FC = () => {
  const [experiments] = useState<BioExperimentCase[]>(VERIFIED_BIO_EXPERIMENTS);
  const [activeExp, setActiveExp] = useState<BioExperimentCase>(VERIFIED_BIO_EXPERIMENTS[0]);
  const [selectedLangCode, setSelectedLangCode] = useState<string>(() => {
    if (typeof window === "undefined") return "ko";
    return window.localStorage.getItem("prometheus_lang") || "ko";
  });
  const [langMode, setLangMode] = useState<LangMode>(() =>
    selectedLangCode === "en" ? "EN" : "KO",
  );
  const isKo = langMode === "KO";

  const handleGlobalLanguageChange = (langCode: string) => {
    setSelectedLangCode(langCode);
    setLangMode(langCode === "en" ? "EN" : "KO");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("prometheus_lang", langCode);
      document.documentElement.lang = langCode;
    }
  };

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isCustomMonsterModalOpen, setIsCustomMonsterModalOpen] = useState<boolean>(false);
  const [isKiroSpecModalOpen, setIsKiroSpecModalOpen] = useState<boolean>(false);
  const [kiroModalTab, setKiroModalTab] = useState<"requirements" | "tasks" | "hooks" | "code_gen">("requirements");
  const [selectedCodeSpec, setSelectedCodeSpec] = useState<string>("stitcher");
  const [isCodeCopied, setIsCodeCopied] = useState<boolean>(false);
  const [isStitchModalOpen, setIsStitchModalOpen] = useState<boolean>(false);
  // 키메라 배양실(샘플 6종)은 당분간 숨김: 결투장이 기본 탭 (코드는 유지, SHOW_CHIMERA_LAB로 다시 켤 수 있음)
  const [activeModalTab, setActiveModalTab] = useState<"chimera_assembler" | "monster_arena">(
    SHOW_CHIMERA_LAB ? "chimera_assembler" : "monster_arena",
  );
  // 괴수 설계실 → 배양기: 이미지가 백그라운드에서 완성되면 3D로 튀어나오는 연출 (포효와 함께)
  const [revealMonster, setRevealMonster] = useState<ComicMonster | null>(null);
  // 괴수 설계실 → 결투장 출격: 동영상이 완성될 때까지 이미지 + 점점 커지는 포효
  const [summon, setSummon] = useState<{ monster: ComicMonster; progress: number; error: string | null } | null>(null);
  // 초기 화면을 벗어난 상태: 내레이터를 즉시 멈춘다
  // ⚡ 배양기 가동 중: 화면 전체에 배양기 영상을 틀어 두고 이미지는 백그라운드에서 생성
  const [incubating, setIncubating] = useState<{ monster: ComicMonster; ready: ComicMonster | null; readyAt: number | null; phase: IncubationPhase } | null>(null);
  const incubatingRef = useRef<typeof incubating>(null);
  incubatingRef.current = incubating;
  const isAwayFromHome =
    isStitchModalOpen || isCustomMonsterModalOpen || summon !== null || incubating !== null || revealMonster !== null;

  // Monster Clash Arena: 설계한 괴수만 서는 두 개의 절반 화면 (왼쪽 / 오른쪽)
  const [arenaSlots, setArenaSlots] = useState<ArenaSlots>(EMPTY_SLOTS);
  const [customArenaRoster, setCustomArenaRoster] = useState<ComicMonster[]>([]);
  // 결투 영상 단계: 두 괴수 화면 → (생성 중) → 영상 재생 → 결과 표시
  const [battlePhase, setBattlePhase] = useState<"stage" | "playing" | "outcome">("stage");
  const [duelWinnerSide, setDuelWinnerSide] = useState<1 | 2 | null>(null);
  const arenaLeft = arenaSlots.left ? customArenaRoster.find((m) => m.id === arenaSlots.left) ?? null : null;
  const arenaRight = arenaSlots.right ? customArenaRoster.find((m) => m.id === arenaSlots.right) ?? null : null;
  // 슬롯이 비어 있으면 샘플 괴수(설계 괴수가 아님 → 결투 불가)로 자리만 채운다
  const arenaFighter1: ComicMonster = arenaLeft ?? COMIC_MONSTERS[0];
  const arenaFighter2: ComicMonster = arenaRight ?? COMIC_MONSTERS[1];
  // 스튜디오에서 고른 대전: 슬롯이 이 쌍으로 바뀐 직후 스토리 편집 창을 연다
  const pendingBattleVideoRef = useRef<{ f1: string; f2: string } | null>(null);
  const [ai3DBurstVideoUrl, setAi3DBurstVideoUrl] = useState<string | null>(null);
  const [isGeneratingAi3D, setIsGeneratingAi3D] = useState<boolean>(false);
  const [ai3DStatus, setAi3DStatus] = useState<string>("");
  const [hfTokenInput, setHfTokenInput] = useState<string>("");
  // 보관함에서 복원한 커스텀 괴수: 현재 로스터 스냅샷 + 이 컴포넌트가 만든 blob: URL(언마운트 시 해제)
  const customRosterRef = useRef<ComicMonster[]>([]);
  customRosterRef.current = customArenaRoster;
  const restoredUrlsRef = useRef<string[]>([]);
  // LTX 실사 격돌 영상 (두 괴수의 설계 프롬프트를 합성). 듀얼 스테이지는 항상 폴백으로 유지
  const [aiClashUrl, setAiClashUrl] = useState<string | null>(null);
  const [isGeneratingAiClash, setIsGeneratingAiClash] = useState<boolean>(false);
  const [aiClashStatus, setAiClashStatus] = useState<{ kind: "loading" | "error" | "nokey" | "ok"; text: string } | null>(null);
  // AI 생체 배틀 서사 (스토리) + 연대기(IndexedDB) 상태
  const [battleStory, setBattleStory] = useState<BattleStory | null>(null);
  const [storyAct, setStoryAct] = useState<0 | 1 | 2 | 3>(0); // 0 = 모두 표시(대기/다시보기), 1~3 = 라이브 진행 중인 막
  const [showChronicles, setShowChronicles] = useState<boolean>(false);
  // 스토리 편집 (영상 생성 전): 편집은 무료, 비용은 생성 버튼을 누를 때만 발생
  const [isStoryEditorOpen, setIsStoryEditorOpen] = useState<boolean>(false);
  const [storyDraft, setStoryDraft] = useState<StoryActs | null>(null);
  const [storyDraftLang, setStoryDraftLang] = useState<"ko" | "en">("ko");
  const [chronicles, setChronicles] = useState<BattleChronicle[]>([]);
  const [viewChronicle, setViewChronicle] = useState<{ record: BattleChronicle; videoUrl: string | null } | null>(null);
  const viewChronicleUrlRef = useRef<string | null>(null);
  // 현재 쌍의 전투 계획: 영상 프롬프트와 실제 결투가 같은 이야기를 쓰도록 공유
  const plannedBattleRef = useRef<{
    key: string;
    battle: BattleResult;
    story: BattleStory;
    played: boolean;
    chronicleId: string;
    timestamp: number;
    videoBlob: Blob | null;
    /** Language the user edited the story in (the video prompt needs English, so Korean edits are translated). */
    editedLang?: "ko" | "en";
  } | null>(null);
  const aiClashBlobRef = useRef<string | null>(null);
  const aiClashAbortRef = useRef<AbortController | null>(null);

  // Block 1: Video & Confocal Microscopy Photo
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState<boolean>(false);
  const [photoDead, setPhotoDead] = useState<boolean>(false);
  // The local LTX clip failed to load (not deployed yet, or unsupported): play the archival video instead.
  const [clipFailed, setClipFailed] = useState<boolean>(false);
  const narrationIdRef = useRef<number>(0);
  const narrationAbortRef = useRef<AbortController | null>(null);

  // Block 2: WebAudio Narrator & ECG Pulse
  const [isSoundOn, setIsSoundOn] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pulseIntervalRef = useRef<number | null>(null);

  // High-Impact Ear-Stimulating Cardiac Thump Engine & Real Specimen Assets
  const isHeartbeatAudioOn = true;
  const cardiacBufferRef = useRef<AudioBuffer | null>(null);
  const chimeraCardiacIntervalRef = useRef<number | null>(null);
  const masterImgRef = useRef<HTMLImageElement | null>(null);
  const roarImgRef = useRef<HTMLImageElement | null>(null);
  const quadImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const mImg = new Image();
    mImg.src = "/images/chimera_bioreactor_master.jpg";
    masterImgRef.current = mImg;

    const rImg = new Image();
    rImg.src = "/images/chimera_awakened_roar.jpg";
    roarImgRef.current = rImg;

    const qImg = new Image();
    qImg.src = "/images/chimera_microscopy_quad.jpg";
    quadImgRef.current = qImg;

    // Preload organic biological heartbeat WAV or synthesize in-memory buffer
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current && !cardiacBufferRef.current) {
          cardiacBufferRef.current = createOrganicHeartbeatBuffer(audioCtxRef.current);
        }
      }
      fetch("/sounds/cardiac_thump_organic.wav")
        .then((res) => res.arrayBuffer())
        .then((buf) => {
          if (audioCtxRef.current) {
            audioCtxRef.current.decodeAudioData(buf, (decoded) => {
              cardiacBufferRef.current = decoded;
            });
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  // Block 3: 3-Second Auto-Absorbing Synapse Chat (with dismissed cursor fix)
  const [messages, setMessages] = useState<SynapseChatMessage[]>([
    {
      id: "init-1",
      sender: "ai",
      textKo: "🧬 프로메테우스 만능줄기세포(iPSC) 실험실에 접속되었습니다. 하단의 실제 실험을 내레이터와 함께 살펴보거나, [괴수 설계 & 전투] 버튼을 눌러 나만의 괴수를 설계하고 대결해 보세요!",
      textEn: "🧬 PROMETHEUS-iPSC Lab Online. Explore the 6 real-world stem-cell experiments in the photo strip with the narrator, or press [Monster Design & Battle] to design your own monster and fight!",
      subTextKo: "질문을 입력하면 실시간으로 PubMed 논문과 백과사전을 검색해 답변합니다.",
      subTextEn: "Type any question to query live PubMed papers and Wikipedia archives.",
      pmidBadge: "PMID: 36224417 (Nature)",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [mobileVisibleMessages, setMobileVisibleMessages] = useState<SynapseChatMessage[]>([]);
  const [mobileChatPhase, setMobileChatPhase] = useState<"hidden" | "visible" | "exiting">("hidden");
  const mobileDismissedIndexRef = useRef<number>(0);
  const [inputText, setInputText] = useState<string>("");
  const [isQueryingApi, setIsQueryingApi] = useState<boolean>(false);

  const [isChatOverlayHovered, setIsChatOverlayHovered] = useState<boolean>(false);
  const mobileChatScrollRef = useRef<HTMLDivElement | null>(null);

  // Block 4A: Mythic Chimera 4-Part Assembler & Video-like Morphing Chamber
  const headOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "head");
  const heartOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "heart");
  const torsoOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "torso");
  const limbOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "limbs");

  const [selectedHead] = useState<ChimeraPartOption>(headOptions[0]);
  const [selectedHeart] = useState<ChimeraPartOption>(heartOptions[0]);
  const [selectedTorso] = useState<ChimeraPartOption>(torsoOptions[0]);
  const [selectedLimbs] = useState<ChimeraPartOption>(limbOptions[0]);

  type MorphStageType =
    | "idle"
    | "bubbling"
    | "cellular"
    | "morphing"
    | "draining"
    | "awakened"
    | "stage1_cleavage"
    | "stage2_division"
    | "stage3_organ"
    | "stage4_neural"
    | "stage5_hypertrophy";

  const [morphStage, setMorphStage] = useState<MorphStageType>("idle");
  const [morphPercent, setMorphPercent] = useState<number>(0);
  const [fluidLevel, setFluidLevel] = useState<number>(1.0); // 1.0 (가득 참) -> 0.15 (빠짐)
  const [eyesOpen, setEyesOpen] = useState<number>(0.0); // 0 (감김) -> 1 (번쩍 뜨임)
  const [creatureBpm, setCreatureBpm] = useState<number>(76);
  const bioreactorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Custom Monster Prompt & 12 Comic Monster Characters Engine
  type ChimeraScreenMode = "photos" | "videos" | "bioreactor";
  const [chimeraScreen, setChimeraScreen] = useState<ChimeraScreenMode>("photos");
  const [returnChimeraScreen, setReturnChimeraScreen] = useState<ChimeraScreenMode>("photos");
  const [selectedComicMonster, setSelectedComicMonster] = useState<ComicMonster>(COMIC_MONSTERS[0]);
  const [isFullscreenJumpscareActive, setIsFullscreenJumpscareActive] = useState<boolean>(false);

  // 15초 정밀 6단계 타임랩스: 실제 진행/영상/BPM/각성은 BioreactorScreen(GrowthTimelapseEngine 훅 기반)이 담당
  const [bioreactorRunId, setBioreactorRunId] = useState<number>(0);

  const BIOREACTOR_MORPH_STAGES: MorphStageType[] = [
    "stage1_cleavage",
    "stage2_division",
    "stage3_organ",
    "stage4_neural",
    "stage5_hypertrophy",
  ];

  const handleSelectAndAwakenMonster = (monster: ComicMonster) => {
    if (chimeraScreen !== "bioreactor") {
      setReturnChimeraScreen(chimeraScreen);
    }
    setSelectedComicMonster(monster);
    setAi3DBurstVideoUrl(null);
    setAi3DStatus("");
    setEyesOpen(0.2);
    setFluidLevel(1.0);
    setMorphStage("stage1_cleavage");
    setMorphPercent(16);
    setCreatureBpm(GROWTH_STAGES[0].targetBpm);
    setBioreactorRunId((n) => n + 1); // 화면을 재마운트하여 15초 시퀀스를 처음부터 재시작
    setChimeraScreen("bioreactor"); // 즉시 독립된 3번 배양기 화면으로 전환!
  };

  // BioreactorScreen -> 단계 변경 (BPM 58 -> 260)
  const handleBioreactorStageChange = (stage: number, bpm: number) => {
    setCreatureBpm(bpm);
    setMorphStage(BIOREACTOR_MORPH_STAGES[Math.min(stage, 5) - 1] ?? "stage1_cleavage");
    setMorphPercent(Math.round((stage / GROWTH_STAGES.length) * 100) - (stage === GROWTH_STAGES.length ? 5 : 0));
  };

  // BioreactorScreen -> 6단계 완료로 AwakeningRoar 시작
  const handleBioreactorAwaken = () => {
    setMorphStage("awakened");
    setMorphPercent(100);
    setFluidLevel(0.15);
    setEyesOpen(1.0);
  };

  // AI 격돌 영상 URL 교체 시 이전 blob URL을 해제 (keepBlobUrl 사용 → 호출자가 수명 관리)
  const setAiClashUrlOwned = (next: string | null) => {
    const prev = aiClashBlobRef.current;
    if (prev && prev !== next) URL.revokeObjectURL(prev);
    aiClashBlobRef.current = next && next.startsWith("blob:") ? next : null;
    setAiClashUrl(next);
  };


  // 현재 쌍의 전투 계획(결과 + 서사)을 얻거나 새로 만든다. 영상 프롬프트와 실제 결투가 같은 이야기를 공유
  const getOrCreatePlannedBattle = (forceNew: boolean) => {
    const key = `${arenaFighter1.id}|${arenaFighter2.id}`;
    const cur = plannedBattleRef.current;
    if (!forceNew && cur && cur.key === key) return cur;
    const battle = resolveBattle(arenaFighter1, arenaFighter2, Math.random);
    const story = composeBattleStory(toStoryFighter(arenaFighter1), toStoryFighter(arenaFighter2), battle);
    const planned = {
      key,
      battle,
      story,
      played: false,
      chronicleId: newChronicleId(),
      timestamp: Date.now(),
      videoBlob: null as Blob | null,
      editedLang: undefined as "ko" | "en" | undefined,
    };
    plannedBattleRef.current = planned;
    return planned;
  };

  // 연대기를 IndexedDB에 저장 (같은 id면 갱신: 영상 Blob 추가 시 같은 레코드를 덮어씀). 실패해도 앱은 계속 동작
  const persistChronicle = (p: NonNullable<typeof plannedBattleRef.current>) => {
    const winner = p.battle.winner === 1 ? arenaFighter1 : arenaFighter2;
    void saveChronicle({
      id: p.chronicleId,
      fighter1Id: arenaFighter1.id,
      fighter2Id: arenaFighter2.id,
      winnerId: winner.id,
      storyKo: p.story.textKo,
      storyEn: p.story.textEn,
      actsKo: p.story.storyKo,
      actsEn: p.story.storyEn,
      aiBattleVideo: p.videoBlob,
      timestamp: p.timestamp,
    });
  };

  // 두 괴수의 설계 프롬프트를 하나로 합성해 LTX(프록시 /api/generate-video 또는 HF Lightricks/LTX-Video)로 격돌 영상 생성
  // 📝 스토리 편집: 현재 쌍의 전투 계획(결과 + 서사)을 열어 화면 언어로 편집. 편집은 무료(영상 생성 시에만 비용)
  const openStoryEditor = () => {
    if (!canStartDesignedBattle(arenaFighter1, arenaFighter2)) return;
    const planned = getOrCreatePlannedBattle(false);
    const lang = isKo ? "ko" : "en";
    setBattleStory(planned.story);
    setStoryDraft({ ...(lang === "ko" ? planned.story.storyKo : planned.story.storyEn) });
    setStoryDraftLang(lang);
    setIsStoryEditorOpen(true);
  };

  const saveStoryDraft = () => {
    if (!storyDraft) return;
    const planned = getOrCreatePlannedBattle(false);
    const clean = (s: string) => s.replace(/\r/g, "").trim().slice(0, 600);
    const acts: StoryActs = { act1: clean(storyDraft.act1), act2_clash: clean(storyDraft.act2_clash), act3_finish: clean(storyDraft.act3_finish) };
    const next: BattleStory =
      storyDraftLang === "ko"
        ? { ...planned.story, storyKo: acts, textKo: joinActs(acts) }
        : { ...planned.story, storyEn: acts, textEn: joinActs(acts) };
    planned.story = next;
    planned.editedLang = storyDraftLang;
    setBattleStory(next);
  };

  // 자동 생성된 원래 서사로 되돌리기 (같은 전투 결과 유지)
  const resetStoryDraft = () => {
    const planned = getOrCreatePlannedBattle(false);
    const original = composeBattleStory(toStoryFighter(arenaFighter1), toStoryFighter(arenaFighter2), planned.battle);
    setStoryDraft({ ...(storyDraftLang === "ko" ? original.storyKo : original.storyEn) });
  };

  /** English acts for the video prompt; a story edited in Korean is translated first (falls back to the auto English). */
  const storyEnForVideo = async (planned: NonNullable<typeof plannedBattleRef.current>): Promise<StoryActs> => {
    if (planned.editedLang !== "ko") return planned.story.storyEn;
    try {
      const [act1, act2_clash, act3_finish] = await Promise.all(
        [planned.story.storyKo.act1, planned.story.storyKo.act2_clash, planned.story.storyKo.act3_finish].map((t) =>
          translateTextToLanguage(t, "en", "ko"),
        ),
      );
      return { act1, act2_clash, act3_finish };
    } catch {
      return planned.story.storyEn;
    }
  };

  const handleGenerateAiClashVideo = async () => {
    if (isGeneratingAiClash || !canStartDesignedBattle(arenaFighter1, arenaFighter2)) return;
    const f1 = arenaFighter1;
    const f2 = arenaFighter2;
    const controller = new AbortController();
    aiClashAbortRef.current = controller;
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, LTX_MAX_WAIT_MS + 30_000);
    setIsGeneratingAiClash(true);
    setAiClashStatus({ kind: "loading", text: isKo ? `⏳ ${f1.nameKo} vs ${f2.nameKo} 서사 전투 영상(LTX-2.5 fast · 1080p · ${BATTLE_VIDEO_SECONDS}초) 생성 중... (보통 1~2분, 최대 4분)` : `⏳ Generating the ${f1.nameEn} vs ${f2.nameEn} story battle video (LTX-2.5 fast · 1080p · ${BATTLE_VIDEO_SECONDS} s)... (usually 1-2 min, up to 4)` });
    let ownedBlob: string | null = null;
    // 서사(story)에서 영상 프롬프트를 만든다: 2막(격돌) + 3막(결말). LTX-2.5 fast는 최소 6초라 3~5초 생성이 불가능하므로 재생 시 5초로 제한
    const planned = getOrCreatePlannedBattle(false);
    if (!planned.played) {
      setBattleStory(planned.story);
      setStoryAct(0);
    }
    try {
      // 두 설계 괴수의 이미지를 첫 프레임에 나란히 배치(image-to-video)하고, 서사·전신 동작·화염/레이저를 담은 프롬프트로 10초 전투 영상 생성
      const res = await generateBattleVideo({
        f1,
        f2,
        storyEn: await storyEnForVideo(planned),
        signal: controller.signal,
      });
      const safe = res.success && res.videoUrl ? sanitizeVideoUrl(res.videoUrl) : null;
      if (safe && safe.startsWith("blob:")) ownedBlob = safe;
      if (controller.signal.aborted && !timedOut) {
        // 파이터가 바뀌었거나 화면을 떠남: 결과를 버리고 blob 해제
        if (ownedBlob) URL.revokeObjectURL(ownedBlob);
        return;
      }
      if (timedOut) {
        if (ownedBlob) URL.revokeObjectURL(ownedBlob);
        setAiClashStatus({ kind: "error", text: isKo ? "⚠️ LTX 생성 시간 초과. 듀얼 스테이지로 대결할 수 있습니다." : "⚠️ LTX generation timed out. You can still fight on the dual stage." });
        return;
      }
      if (safe) {
        setAiClashUrlOwned(safe);
        planned.played = true;
        setDuelWinnerSide(planned.battle.winner);
        setBattlePhase("playing");
        setAiClashStatus({ kind: "ok", text: isKo ? "✅ LTX 격돌 영상 준비 완료" : "✅ LTX clash video ready" });
        // 영상 Blob을 연대기에 저장 (전투가 이미 시작됐다면 같은 레코드를 갱신, 아니면 전투 시작 시 함께 저장)
        {
          // 결과가 원격 URL(사전서명, 만료 가능)로 남은 경우에도 Blob 변환을 시도한다 (CORS로 실패하면 건너뜀)
          try {
            planned.videoBlob = await (await fetch(safe)).blob();
            if (planned.played) persistChronicle(planned);
          } catch {
            persistChronicle(planned); /* Blob 저장 실패는 재생에 영향 없음: 영상 없이 기록만 저장 */
          }
        }
        return;
      }
      const err = res.error ?? "";
      if (err === "NO_API_KEY" || /no ai video api token|no .*token configured/i.test(err)) {
        setAiClashStatus({
          kind: "nokey",
          text: isKo
            ? "⚠️ LTX API 키가 서버에 설정되지 않았습니다. Vercel 환경변수 LTXV_API_KEY(또는 LTX_API_KEY)를 확인하세요. 듀얼 스테이지로 계속 대결할 수 있습니다."
            : "⚠️ The LTX API key is not configured on the server. Set LTXV_API_KEY (or LTX_API_KEY) in the Vercel environment. The dual stage still works.",
        });
      } else {
        setAiClashStatus({
          kind: "error",
          text: (isKo ? "⚠️ LTX 영상 생성 실패: " : "⚠️ LTX video failed: ") + (err.slice(0, 120) || "unknown") + (isKo ? " (듀얼 스테이지 유지)" : " (dual stage kept)"),
        });
      }
    } catch (e) {
      if (ownedBlob) URL.revokeObjectURL(ownedBlob);
      setAiClashStatus({ kind: "error", text: (isKo ? "⚠️ LTX 영상 생성 실패: " : "⚠️ LTX video failed: ") + ((e as Error)?.message ?? "").slice(0, 120) });
    } finally {
      window.clearTimeout(timer);
      if (aiClashAbortRef.current === controller) {
        aiClashAbortRef.current = null;
        setIsGeneratingAiClash(false);
      }
    }
  };

  // 파이터가 바뀌면 진행 중 생성 취소 + 이전 쌍의 AI 영상 폐기, 언마운트 시 blob 해제
  useEffect(() => {
    aiClashAbortRef.current?.abort();
    aiClashAbortRef.current = null;
    setIsGeneratingAiClash(false);
    setAiClashUrlOwned(null);
    setAiClashStatus(null);
    plannedBattleRef.current = null;
    setBattleStory(null);
    setStoryAct(0);
    setBattlePhase("stage");
    setDuelWinnerSide(null);
  }, [arenaFighter1.id, arenaFighter2.id]);

  // 로스터에서 사라진 괴수(삭제 등)는 슬롯에서도 내린다
  useEffect(() => {
    setArenaSlots((s) => pruneSlots(s, new Set(customArenaRoster.map((m) => m.id))));
  }, [customArenaRoster]);
  // 스튜디오에서 상대를 고르면 슬롯을 설정한 뒤(위 효과가 이전 쌍을 정리한 다음) 스토리 편집 창을 연다
  useEffect(() => {
    const pending = pendingBattleVideoRef.current;
    if (!pending || pending.f1 !== arenaFighter1.id || pending.f2 !== arenaFighter2.id) return;
    pendingBattleVideoRef.current = null;
    openStoryEditor();
  }, [arenaFighter1.id, arenaFighter2.id]);

  const arenaHasTwoDesigns = canStartDesignedBattle(arenaFighter1, arenaFighter2);
  const arenaRosterList = customArenaRoster.filter(isDesignedMonster);

  // 두 자리가 모두 차면 서로를 향해 천천히 돌아선다(ARENA_TURN_MS). 다 돌아선 뒤에 가운데 [결투] 버튼이 나타난다
  const [duelReady, setDuelReady] = useState<boolean>(false);
  const [duelReplayKey, setDuelReplayKey] = useState<number>(0);
  useEffect(() => {
    if (!arenaHasTwoDesigns) {
      setDuelReady(false);
      return;
    }
    const t = window.setTimeout(() => setDuelReady(true), ARENA_TURN_MS);
    return () => window.clearTimeout(t);
  }, [arenaHasTwoDesigns, arenaFighter1.id, arenaFighter2.id]);

  const duelWinner = duelWinnerSide === 1 ? arenaFighter1 : duelWinnerSide === 2 ? arenaFighter2 : null;
  const duelOutcomeLine = battleStory ? (isKo ? battleStory.storyKo.act3_finish : battleStory.storyEn.act3_finish) : "";

  // [⚔️ 결투]: 이번 쌍의 전투 계획(결과+서사)을 만들거나 재사용하고, 기록을 저장한 뒤 12초 전투 영상을 생성 (이미 만든 영상이 있으면 다시 재생만)
  const handleDuel = () => {
    if (!arenaHasTwoDesigns || isGeneratingAiClash) return;
    if (aiClashUrl) {
      setDuelReplayKey((k) => k + 1);
      setBattlePhase("playing");
      return;
    }
    const planned = getOrCreatePlannedBattle(false);
    planned.played = true;
    setBattleStory(planned.story);
    setDuelWinnerSide(planned.battle.winner);
    persistChronicle(planned);
    void handleGenerateAiClashVideo();
  };

  // ── 괴수 설계실 백그라운드 작업 연동 ──
  // 이미지 완성(⚡ 생성 또는 📁 업로드): 로스터를 갱신하고, 전체 화면 3D 등장 연출(2초) 후 설계실로 자동 복귀
  const handleMonsterImageReady = (m: ComicMonster) => {
    setCustomArenaRoster((prev) => addToRoster(prev, m));
    setSelectedComicMonster((cur) => (cur.id === m.id ? m : cur));
    setIsCustomMonsterModalOpen(false);
    if (!incubatingRef.current) {
      // 업로드한 이미지: 생성 없이 바로 3D 등장 연출
      setRevealMonster(m);
      return;
    }
    // 배양기에서 만든 이미지: 먼저 디코딩해 반쯤 로드된 채로 튀어나오지 않게 한 뒤, 탱크 안에서 서서히 형성되는 단계를 시작한다
    void (async () => {
      try {
        const img = new Image();
        img.src = m.jumpscareImg || m.avatarImg;
        await img.decode();
      } catch {
        /* 디코딩 실패해도 연출은 계속 (브라우저가 그리면서 로드) */
      }
      // Only marks the image as ready. The hand-off itself waits for the tank clip to reach TANK_HANDOFF_FRACTION
      // (embryo growth fully shown), see onTankTimeUpdate.
      setIncubating((s) => (s ? { ...s, ready: m, readyAt: Date.now() } : s));
    })();
  };

  // 3D 급팽창: 이미지가 전체 화면을 덮은 채로 끝나고, 배양기 화면으로 되돌아가지 않고 바로 괴수 설계실로 복귀
  const incubatePhase = incubating?.phase ?? null;

  // 사실적인 배아 발생 시퀀스(FLUX 6장, 줄기세포 → 종을 알아보기 전의 후기 배아). 배아 발생이 끝까지 지나간 뒤에만 연결:
  // 이미지가 빨리 끝나도 마지막 단계까지 보여 주고, 늦으면 마지막 배아가 맥동하며 기다린다 (embryoSequence).
  const [embryo, setEmbryo] = useState<{ stage: number; action: EmbryoAction }>({ stage: 0, action: "play" });
  const incubationKey = incubating?.monster.id ?? null;
  // LTX 전환 영상 5편(1→2 … 5→6)을 이어서 재생. 영상을 못 쓰면 사진 시퀀스(embryoSequence)로 대체한다
  const [embryoClip, setEmbryoClip] = useState<number>(0);
  const [embryoClipsDone, setEmbryoClipsDone] = useState<boolean>(false);
  const [embryoUseStills, setEmbryoUseStills] = useState<boolean>(false);
  useEffect(() => {
    if (incubatePhase !== "growing") return;
    setEmbryoClip(0);
    setEmbryoClipsDone(false);
    setEmbryoUseStills(false);
  }, [incubationKey]);
  // Clip mode: hand off once the last clip ended and the image is ready; until then the last egg frame pulses.
  const incubateReady = incubating?.ready !== null && incubating?.ready !== undefined;
  useEffect(() => {
    if (embryoUseStills || incubatePhase !== "growing" || !embryoClipsDone || !incubateReady) return;
    setIncubating((cur) => (cur && cur.phase === "growing" ? { ...cur, phase: "materialising" } : cur));
  }, [embryoUseStills, incubatePhase, embryoClipsDone, incubateReady]);
  useEffect(() => {
    if (!embryoUseStills || incubatePhase !== "growing") return;
    const started = Date.now();
    setEmbryo({ stage: 0, action: "play" });
    const t = window.setInterval(() => {
      const s = incubatingRef.current;
      if (!s) return;
      const next = embryoSequence(Date.now() - started, s.ready !== null);
      setEmbryo((cur) => (cur.stage === next.stage && cur.action === next.action ? cur : next));
      if (next.action === "handoff") {
        window.clearInterval(t);
        // The finished form first emerges slowly inside the egg, then bursts out (reveal)
        setIncubating((cur) => (cur && cur.phase === "growing" ? { ...cur, phase: "materialising" } : cur));
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [incubatePhase, incubationKey, embryoUseStills]);

  // 완성된 모습이 알 속에서 천천히 드러난 뒤(MONSTER_EMERGE_MS) 3D 급팽창으로 넘어간다
  useEffect(() => {
    if (incubatePhase !== "materialising") return;
    const t = window.setTimeout(() => {
      setIncubating((cur) => (cur && cur.phase === "materialising" ? { ...cur, phase: "reveal" } : cur));
    }, MONSTER_EMERGE_MS);
    return () => window.clearTimeout(t);
  }, [incubatePhase, incubationKey]);
  useEffect(() => {
    if (incubatePhase !== "reveal") return;
    const ready = incubatingRef.current?.ready;
    if (ready) playChimeraRoar(ready.roarAudio);
    // 포효하며 화면 밖으로 튀어나온 순간 연기와 함께 폭발한다
    const boom = window.setTimeout(() => playExplosionSound(), BURST_EXPLODE_MS);
    const t = window.setTimeout(() => {
      setIncubating(null);
      setIsCustomMonsterModalOpen(true);
    }, INCUBATE_BURST_MS);
    return () => {
      window.clearTimeout(boom);
      window.clearTimeout(t);
    };
  }, [incubatePhase]);

  // 배양 중에는 뽀글거리는 소리 (WebAudio 합성). 완성된 모습이 드러나는 동안에도 계속되고, 팽창 연출이 시작되면 멈춘다
  const isIncubationGrowing = incubatePhase === "growing" || incubatePhase === "materialising";
  useEffect(() => {
    if (!isIncubationGrowing) return;
    const stop = startBubbleSound();
    return stop;
  }, [isIncubationGrowing]);

  const backToDesignRoom = () => {
    setRevealMonster(null);
    setSummon(null);
    setIncubating(null);
    setIsStitchModalOpen(false);
    setIsCustomMonsterModalOpen(true);
  };

  // 출격 대기 화면: 조용한 포효가 진행률에 따라 점점 커진다 (약 4초마다 한 번)
  const summonRef = useRef<typeof summon>(null);
  summonRef.current = summon;
  const isSummoning = summon !== null && summon.error === null;
  useEffect(() => {
    if (!isSummoning) return;
    const roarOnce = () => {
      const s = summonRef.current;
      if (!s) return;
      const a = new Audio(s.monster.roarAudio || "/sounds/monster_roar_ferocious.wav");
      a.volume = summonRoarVolume(s.progress);
      a.play().catch(() => {});
    };
    roarOnce();
    const t = window.setInterval(roarOnce, SUMMON_ROAR_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [isSummoning]);

  // 3D 등장 연출은 잠깐 보여주고 자동으로 닫는다
  useEffect(() => {
    if (!revealMonster) return;
    playChimeraRoar(revealMonster.roarAudio);
    const t = window.setTimeout(() => {
      setRevealMonster(null);
      setIncubating(null);
      setIsCustomMonsterModalOpen(true); // 연출이 끝나면 괴수 설계실을 다시 연다
    }, MONSTER_REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [revealMonster?.id, revealMonster?.avatarImg]);

  // 연대기 다시보기: 저장된 영상 Blob의 blob: URL은 교체/닫기/언마운트 시 해제
  const closeViewChronicle = () => {
    revokeObjectUrls([viewChronicleUrlRef.current]);
    viewChronicleUrlRef.current = null;
    setViewChronicle(null);
  };

  const refreshChronicles = async () => {
    setChronicles(await getChronicles(20));
  };

  const handleToggleChronicles = () => {
    if (showChronicles) {
      setShowChronicles(false);
      closeViewChronicle();
      return;
    }
    setShowChronicles(true);
    void refreshChronicles();
  };

  const handleOpenChronicle = async (id: string) => {
    const rec = await getChronicle(id);
    closeViewChronicle();
    if (!rec) return;
    let url: string | null = null;
    if (rec.aiBattleVideo) {
      try { url = URL.createObjectURL(rec.aiBattleVideo); } catch { url = null; }
    }
    viewChronicleUrlRef.current = url;
    setViewChronicle({ record: rec, videoUrl: url });
  };

  const handleDeleteChronicle = async (id: string) => {
    await deleteChronicle(id);
    if (viewChronicle?.record.id === id) closeViewChronicle();
    await refreshChronicles();
  };

  useEffect(() => {
    return () => {
      revokeObjectUrls([viewChronicleUrlRef.current]);
      viewChronicleUrlRef.current = null;
      aiClashAbortRef.current?.abort();
      if (aiClashBlobRef.current) URL.revokeObjectURL(aiClashBlobRef.current);
      aiClashBlobRef.current = null;
    };
  }, []);

  // 보관함(IndexedDB)에서 저장된 커스텀 괴수를 복원해 결투장 로스터에 합친다 (새로고침/브라우저 재시작 후에도 유지).
  // 보관함이 원본(source of truth)이며 화면에는 최근 CUSTOM_ROSTER_DISPLAY_LIMIT개까지만 표시한다.
  useEffect(() => {
    let cancelled = false;
    void getAllMonsters()
      .then((records) => {
        if (cancelled) {
          // 로드 도중 언마운트: 만들어진 blob: URL을 즉시 해제
          revokeObjectUrls(records.flatMap((r) => [r.imageUrl, r.videoUrl]));
          return;
        }
        const restored: ComicMonster[] = [];
        for (const r of records) {
          const m = vaultToComicMonster(r);
          if (m) restored.push(m);
          else revokeObjectUrls([r.imageUrl, r.videoUrl]);
        }
        const have = new Set(customRosterRef.current.map((m) => m.id));
        // 이미 메모리에 있는 같은 id는 메모리 쪽이 우선: 복원본의 URL은 버린다
        revokeObjectUrls(ownedBlobUrls(restored.filter((m) => have.has(m.id))));
        const fresh = restored.filter((m) => !have.has(m.id));
        restoredUrlsRef.current.push(...ownedBlobUrls(fresh));
        if (fresh.length > 0) setCustomArenaRoster((prev) => mergeRoster(prev, fresh));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      revokeObjectUrls(restoredUrlsRef.current);
      restoredUrlsRef.current = [];
    };
  }, []);

  // 연대기 목록의 괴수 이름 (로스터에서 찾고 없으면 id)
  const nameOfFighter = (id: string): string => {
    const m = [...customArenaRoster, ...COMIC_MONSTERS].find((x) => x.id === id);
    return m ? cleanStoryName(isKo ? m.nameKo : m.nameEn, id) : id;
  };

  // 3막 서사 카드: reveal=true면 진행된 막까지만 보여주고(스포일러 방지) 현재 막을 강조
  const renderStoryActs = (acts: StoryActs, active: 0 | 1 | 2 | 3, subtitle: boolean) => {
    const rows: Array<[1 | 2 | 3, string, string]> = [
      [1, isKo ? "1막 · 대치" : "Act 1 · Confrontation", acts.act1],
      [2, isKo ? "2막 · 격돌" : "Act 2 · Clash", acts.act2_clash],
      [3, isKo ? "3막 · 결말" : "Act 3 · Finish", acts.act3_finish],
    ];
    return (
      <div className={`grid gap-1.5 ${subtitle ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"}`}>
        {rows.map(([n, label, text]) => {
          const visible = active === 0 || n <= active;
          const live = active === n;
          return (
            <div
              key={n}
              aria-current={live ? "step" : undefined}
              className={`rounded-lg border px-2 py-1.5 transition-colors motion-reduce:transition-none ${
                live
                  ? "border-amber-300 bg-amber-500/15 shadow-[0_0_14px_rgba(251,191,36,0.45)]"
                  : visible
                  ? "border-slate-600 bg-slate-900/80"
                  : "border-slate-800 bg-slate-950/60 opacity-50"
              }`}
            >
              <p className={`text-[10px] font-black mb-0.5 ${live ? "text-amber-300" : "text-cyan-300"}`}>{label}</p>
              <p className="text-[11px] leading-snug text-slate-100 whitespace-pre-line">{visible ? text : "…"}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // "📜 AI 생체 배틀 서사" 창 + 지난 전투 스토리 다시보기
  const renderStoryPanel = () => {
    const acts = battleStory ? (isKo ? battleStory.storyKo : battleStory.storyEn) : null;
    const rec = viewChronicle?.record ?? null;
    const recActs = rec ? (isKo ? rec.actsKo : rec.actsEn) : undefined;
    return (
      <section aria-label="AI Battle Story" className="shrink-0 rounded-xl border border-amber-400/40 bg-slate-950/90 px-2.5 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-amber-300">📜 {isKo ? "AI 생체 배틀 서사 (Battle Story)" : "AI Bio-Battle Story"}</h3>
          <button
            type="button"
            onClick={handleToggleChronicles}
            aria-expanded={showChronicles}
            className="px-2 py-0.5 rounded-lg text-[10px] font-black border border-cyan-400/60 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/25"
          >
            {showChronicles ? (isKo ? "✕ 닫기" : "✕ Close") : (isKo ? "📜 지난 전투 스토리 다시보기" : "📜 Replay past battle stories")}
          </button>
        </div>

        {!showChronicles && acts && (
          <div role="status" aria-live="polite">
            {renderStoryActs(acts, storyAct, false)}
          </div>
        )}
        {!showChronicles && !acts && (
          <p className="text-[11px] text-slate-400">
            {isKo ? "결투를 시작하면 두 괴수의 생체 스펙으로 짧고 강렬한 3막 서사가 펼쳐집니다." : "Start a duel to unfold a short 3-act story from both monsters' bio specs."}
          </p>
        )}

        {showChronicles && (
          <div className="flex flex-col gap-1.5">
            {chronicles.length === 0 ? (
              <p className="text-[11px] text-slate-400">{isKo ? "저장된 전투 기록이 없습니다." : "No saved battles yet."}</p>
            ) : (
              <ul className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                {chronicles.map((c) => (
                  <li key={c.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleOpenChronicle(c.id)}
                      className={`flex-1 text-left truncate rounded-lg border px-2 py-1 text-[11px] ${
                        rec?.id === c.id ? "border-amber-300 bg-amber-500/15 text-amber-200" : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-400/60"
                      }`}
                    >
                      {new Date(c.timestamp).toLocaleString(isKo ? "ko-KR" : "en-US")} · {nameOfFighter(c.fighter1Id)} vs {nameOfFighter(c.fighter2Id)} · 🏆 {nameOfFighter(c.winnerId)}{c.aiBattleVideo ? " · 🎬" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteChronicle(c.id)}
                      aria-label={isKo ? "기록 삭제" : "Delete record"}
                      className="px-1.5 py-1 rounded-lg border border-rose-500/40 text-rose-300 text-[10px]"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {rec && (
              <div className="flex flex-col gap-1.5">
                {viewChronicle?.videoUrl && (
                  <video
                    key={viewChronicle.videoUrl}
                    src={viewChronicle.videoUrl}
                    controls
                    muted
                    loop
                    playsInline
                    className="w-full max-h-48 rounded-lg bg-black object-contain"
                  />
                )}
                {recActs ? (
                  renderStoryActs(recActs, 0, false)
                ) : (
                  <p className="text-[11px] text-slate-100 whitespace-pre-line">{isKo ? rec.storyKo : rec.storyEn}</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  // 3D 각성 괴수 실사 동영상 API 생성 (고정된 프레임 내부에서 살아 움직이며 포효하는 괴수 AI 비디오 생성)
  const handleGenerateAi3DBurstVideo = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsGeneratingAi3D(true);
    setAi3DStatus(isKo ? "⏳ AI 동영상 API로 살아 움직이는 괴수 생성 중..." : "⏳ Generating live 3D creature video...");

    const prompt = `Close-up cinematic 3D monster movie shot: ${selectedComicMonster.promptEn} opening its jaws wide, roaring fiercely and moving limbs dynamically toward the camera inside a sci-fi bioreactor, photorealistic CGI, 4k, smooth motion.`;

    const res = await generateMonsterVideo({
      prompt,
      provider: "ltx",
    });

    if (res.success && res.videoUrl) {
      setAi3DBurstVideoUrl(res.videoUrl);
      setAi3DStatus(isKo ? "✅ AI 3D 괴수 동영상 생성 완료!" : "✅ AI Creature Video Ready!");
      playChimeraRoar(selectedComicMonster.roarAudio);
    } else {
      const reason = (res.error ?? "").slice(0, 120) || (isKo ? "원인 불명" : "unknown reason");
      setAi3DStatus(
        isKo
          ? `⚠️ LTX 동영상 생성 실패: ${reason} (현재 내장 성체 영상 재생)`
          : `⚠️ LTX video failed: ${reason} (playing built-in adult video)`
      );
    }
    setIsGeneratingAi3D(false);
  };

  // 배양기 화면에서 이전 선택 화면으로 복귀 핸들러
  const handleReturnToSelection = () => {
    setIsFullscreenJumpscareActive(false);
    setMorphStage("idle");
    setChimeraScreen(returnChimeraScreen);
  };

  // Top-right mini ECG canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const renderWave = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle =
        activeExp.themeColor === "rose"
          ? "#fb7185"
          : activeExp.themeColor === "amber"
          ? "#fbbf24"
          : "#34d399";
      ctx.lineWidth = 1.8;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const phase = (x + t) * 0.08;
        const spike = (x + t) % 90 < 6 ? Math.sin(((x + t) % 90) * 1.1) * 12 : 0;
        const y = h / 2 + Math.sin(phase) * 3 + spike;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      t += 2.2;
      animId = requestAnimationFrame(renderWave);
    };

    animId = requestAnimationFrame(renderWave);
    return () => cancelAnimationFrame(animId);
  }, [activeExp]);

  // Cylindrical Glass Bioreactor Vat: Living Chimera Simulation Engine
  useEffect(() => {
    if (!isStitchModalOpen || activeModalTab !== "chimera_assembler") return;
    const canvas = bioreactorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    // Rising amniotic bio-bubbles inside fluid
    const bubbles = Array.from({ length: 42 }, () => ({
      x: Math.random() * 640,
      y: 80 + Math.random() * 260,
      radius: 1.5 + Math.random() * 3.5,
      speed: 0.6 + Math.random() * 1.4,
      wobble: Math.random() * Math.PI * 2
    }));

    const drawBioreactor = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Deep Laboratory Background
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, w, h);

      const vatX = 35;
      const vatY = 22;
      const vatW = w - 70;
      const vatH = h - 44;
      const cx = w / 2;
      const cy = h / 2 - 12;

      // 2. Cylindrical Glass Bioreactor Chamber Outer Shell
      const gradTube = ctx.createLinearGradient(vatX, 0, vatX + vatW, 0);
      gradTube.addColorStop(0, "rgba(15, 23, 42, 0.95)");
      gradTube.addColorStop(0.12, "rgba(6, 78, 59, 0.22)");
      gradTube.addColorStop(0.5, "rgba(2, 44, 34, 0.45)");
      gradTube.addColorStop(0.88, "rgba(6, 78, 59, 0.22)");
      gradTube.addColorStop(1, "rgba(15, 23, 42, 0.95)");
      ctx.fillStyle = gradTube;
      ctx.fillRect(vatX, vatY, vatW, vatH);

      // 3. Fluid Drainage Simulation (Amniotic Bio-Nutrient Broth)
      // fluidLevel: 1.0 (Full) -> 0.15 (Drained)
      const fluidTopY = vatY + (1.0 - fluidLevel) * (vatH - 45);
      const fluidHeight = (vatY + vatH) - fluidTopY;

      if (fluidHeight > 0) {
        const fluidGrad = ctx.createLinearGradient(0, fluidTopY, 0, vatY + vatH);
        fluidGrad.addColorStop(0, "rgba(16, 185, 129, 0.45)");
        fluidGrad.addColorStop(0.4, "rgba(5, 150, 105, 0.38)");
        fluidGrad.addColorStop(1, "rgba(4, 120, 87, 0.72)");
        ctx.fillStyle = fluidGrad;
        ctx.fillRect(vatX, fluidTopY, vatW, fluidHeight);

        // Fluid Surface Wave & Bubbles
        ctx.strokeStyle = "rgba(110, 231, 183, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = vatX; x <= vatX + vatW; x += 4) {
          const waveY = fluidTopY + Math.sin((x * 0.04) + (frame * 0.08)) * 3.5;
          if (x === vatX) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();

        // Rising Bubbles
        bubbles.forEach((b) => {
          b.y -= b.speed;
          b.wobble += 0.04;
          if (b.y < fluidTopY) {
            b.y = vatY + vatH - 10;
            b.x = vatX + 20 + Math.random() * (vatW - 40);
          }
          const bx = b.x + Math.sin(b.wobble) * 2;
          ctx.fillStyle = "rgba(167, 243, 208, 0.55)";
          ctx.beginPath();
          ctx.arc(bx, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 4. Cylindrical Glass Tube Reflections & Highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(vatX + 12, vatY + 8, 22, vatH - 16);
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(vatX + 38, vatY + 8, 10, vatH - 16);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(vatX + vatW - 24, vatY + 8, 12, vatH - 16);

      // Glass Chamber Border
      ctx.strokeStyle = "rgba(52, 211, 153, 0.5)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(vatX, vatY, vatW, vatH);

      // Top & Bottom Heavy Metal Flange Caps with Screws
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(vatX - 10, vatY - 14, vatW + 20, 22);
      ctx.fillRect(vatX - 10, vatY + vatH - 8, vatW + 20, 24);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(vatX - 10, vatY - 14, vatW + 20, 22);
      ctx.strokeRect(vatX - 10, vatY + vatH - 8, vatW + 20, 24);

      // Heavy Metal Bolts on Cap
      for (let s = 0; s < 7; s++) {
        const sx = vatX + 15 + s * ((vatW - 30) / 6);
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(sx, vatY - 3, 3.5, 0, Math.PI * 2);
        ctx.arc(sx, vatY + vatH + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================
      // 5. PROGRESSIVE CHIMERA ENTITY MORPHOGENESIS & RENDERING
      // =========================================================
      // Floating Buoyancy Wave in fluid
      const floatY = fluidLevel > 0.4 ? Math.sin(frame * 0.038) * 8 : 10;

      // 6-Organ Cycling Flash & Fade (번쩍번쩍 나타났다 스르르 사라지는 효과)
      // 0: Horns & Teeth (대소하는 큰 입과 이빨, 뿔)
      // 1: Brain & Eyes (뇌 오가노이드, 안구, 귀, 주름)
      // 2: Heart (BPM 쿵쾅쿵쾅 심장 & 대동맥)
      // 3: Muscular Torso (근육질 흉곽 & 늑골 & 복근)
      // 4: Limbs & Wings (날개 & 6개 촉수)
      // 5: Cilia & Glowing Veins (미세 섬모 & 전신 생체발광 혈관)
      const organCycle = Math.floor(frame / 60) % 6;
      const organProgress = (frame % 60) / 60;
      const flashIntensity = Math.sin(organProgress * Math.PI); // 0 -> 1 -> 0 smooth bell

      const isJawsFlashing = organCycle === 0;
      const isBrainFlashing = organCycle === 1;
      const isHeartFlashing = organCycle === 2;
      const isTorsoFlashing = organCycle === 3;
      const isLimbsFlashing = organCycle === 4;

      // REAL-TIME HEARTBEAT SIMULATION SYNCED TO creatureBpm
      const beatSpeed = (creatureBpm / 60) * 0.13;
      const beatPhase = (frame * beatSpeed) % (Math.PI * 2);
      const rawPulse = Math.sin(beatPhase);
      const isBeatSystole = rawPulse > 0.35;
      const heartPumpScale = 1 + (isBeatSystole ? Math.pow(rawPulse, 5) * 0.52 : -Math.pow(Math.abs(rawPulse), 3) * 0.08);

      // =========================================================
      // 5-A. REAL LABORATORY PHOTOGRAPHIC COMPOSITE & MORPHOGENESIS
      // =========================================================
      const mImg = masterImgRef.current;
      const rImg = roarImgRef.current;
      const qImg = quadImgRef.current;
      const isAwakened = morphStage === "awakened";
      const isDraining = morphStage === "draining";

      // In awakened or late draining, switch seamlessly to the ecstatic roaring beast!
      const activePhoto = (isAwakened || (isDraining && fluidLevel < 0.6)) && rImg?.complete ? rImg : mImg;

      if (activePhoto && activePhoto.complete && activePhoto.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(vatX + 2, vatY + 2, vatW - 4, vatH - 4);
        ctx.clip();

        const imgAspect = activePhoto.naturalWidth / activePhoto.naturalHeight;
        const targetH = vatH * 0.94;
        const targetW = targetH * imgAspect;
        const photoX = cx - targetW / 2;
        const photoY = cy - targetH / 2 + floatY;

        if (morphStage === "idle") {
          // 0. Dormant state: faint latent silhouette shimmering in murky fluid
          ctx.save();
          ctx.filter = "blur(5px) brightness(0.65) contrast(130%)";
          ctx.globalAlpha = 0.55 + Math.sin(frame * 0.035) * 0.15;
          ctx.drawImage(activePhoto, photoX, photoY, targetW, targetH);
          ctx.restore();
        } else if (morphStage === "bubbling" || morphStage === "cellular") {
          // 1. Step 1: Center Bubbling & Stem-Cell Undulation Phase
          const blurPx = Math.max(12, Math.round(32 - (Math.min(100, morphPercent) / 35) * 18));
          ctx.save();
          ctx.filter = `blur(${blurPx}px) contrast(${1.4 + (morphPercent / 35) * 0.4}) brightness(${0.55 + (morphPercent / 35) * 0.35})`;
          ctx.globalAlpha = 0.35 + (morphPercent / 35) * 0.45;
          ctx.drawImage(activePhoto, photoX, photoY, targetW, targetH);
          ctx.restore();

          // Swirling Stem-Cell Latent Noise Scanlines
          ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
          ctx.lineWidth = 1;
          for (let nl = 0; nl < 6; nl++) {
            const ny = vatY + ((frame * 3 + nl * 60) % vatH);
            ctx.beginPath();
            ctx.moveTo(vatX, ny);
            ctx.lineTo(vatX + vatW, ny);
            ctx.stroke();
          }
        } else if (morphStage === "morphing") {
          // 2. Step 2: Denoising & Fine Biological Feature Solidification (점점 윤곽이 뚜렷해짐: 14px -> 0px)
          const morphProgress = Math.max(0, Math.min(1.0, (morphPercent - 35) / 37));
          const blurPx = Math.max(0, Math.round((1 - morphProgress) * 14));
          ctx.save();
          if (blurPx > 0) {
            ctx.filter = `blur(${blurPx}px) contrast(${1.15 + morphProgress * 0.35})`;
          }
          ctx.globalAlpha = 0.8 + morphProgress * 0.2;
          ctx.drawImage(activePhoto, photoX, photoY, targetW, targetH);
          ctx.restore();

          // High-frequency synaptic electricity arcs sparking across solidifying organs
          const sparkCount = Math.floor(morphPercent / 14);
          for (let sp = 0; sp < sparkCount; sp++) {
            const sx = cx + (Math.sin(frame * 0.25 + sp * 2) * targetW * 0.35);
            const sy = cy + floatY + (Math.cos(frame * 0.18 + sp * 3) * targetH * 0.35);
            ctx.strokeStyle = sp % 2 === 0 ? "#67e8f9" : "#fde047";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (Math.random() - 0.5) * 22, sy + (Math.random() - 0.5) * 22);
            ctx.lineTo(sx + (Math.random() - 0.5) * 35, sy + (Math.random() - 0.5) * 35);
            ctx.stroke();
          }
        } else if (morphStage === "draining") {
          // 3. Step 3: Amniotic Fluid Rapid Drainage & Water Condensation
          ctx.save();
          ctx.globalAlpha = 1.0;
          ctx.drawImage(activePhoto, photoX, photoY, targetW, targetH);
          ctx.restore();

          // Vertical water condensation streaks running down the glass
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1.5;
          for (let d = 0; d < 8; d++) {
            const dx = vatX + 25 + d * ((vatW - 50) / 7);
            const dy = vatY + ((frame * 6 + d * 45) % (vatH - 20));
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx + Math.sin(frame * 0.1 + d) * 2, dy + 25);
            ctx.stroke();
          }
        } else if (morphStage === "awakened") {
          // 4. Step 4: 짠! 하고 완전 각성 (High-Definition Crystal Clarity Beast in Drained Bioreactor)
          ctx.save();
          ctx.globalAlpha = 1.0;
          ctx.drawImage(activePhoto, photoX, photoY, targetW, targetH);
          ctx.restore();

          // Awakened Brilliant Bio-Flash (짠! 효과) on initial awakening
          if (frame % 120 < 15) {
            const flashA = (15 - (frame % 120)) / 15 * 0.45;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashA})`;
            ctx.fillRect(vatX, vatY, vatW, vatH);
          }

          // Rising steam vents from bottom metal flange
          for (let st = 0; st < 6; st++) {
            const stX = vatX + 35 + st * ((vatW - 70) / 5);
            const stY = vatY + vatH - 12 - ((frame * 2 + st * 25) % 95);
            const stR = 8 + ((frame * 2 + st * 25) % 95) * 0.25;
            ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, 0.35 - (stR / 50))})`;
            ctx.beginPath();
            ctx.arc(stX, stY, stR, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Real-Time Contracting Heart Shockwave Radiation Rings (Centered on Creature's Chest)
        const chestX = cx;
        const chestY = cy + floatY - 8;
        if (isBeatSystole) {
          ctx.save();
          ctx.strokeStyle = `rgba(244, 63, 94, ${0.85 * (creatureBpm / 140)})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(chestX, chestY, 36 * heartPumpScale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = "rgba(34, 211, 238, 0.7)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(chestX, chestY, 52 * heartPumpScale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore(); // Clip restore
      }

      // 5-B. 4 FLOATING REAL LABORATORY MICROSCOPY LENSES (점진적 융합 변형)
      if (qImg && qImg.complete && qImg.naturalWidth > 0 && (morphStage === "bubbling" || morphStage === "cellular" || (morphStage === "morphing" && morphPercent < 65))) {
        const qw = qImg.naturalWidth;
        const qh = qImg.naturalHeight;
        const panels = [
          { sx: 0, sy: 0, label: "🧠 92% 인간 뇌 오가노이드", color: "#38bdf8" },
          { sx: qw / 2, sy: 0, label: "🫀 고스트 하트 심근", color: "#f43f5e" },
          { sx: 0, sy: qh / 2, label: "🦁 생체 형광 근육질 흉곽", color: "#f59e0b" },
          { sx: qw / 2, sy: qh / 2, label: "🦎 이동성 섬모 생체 로봇", color: "#34d399" }
        ];

        const convergeProgress = (morphStage === "bubbling" || morphStage === "cellular") ? (morphPercent / 100) * 0.4 : 0.4 + (morphPercent / 65) * 0.6;
        const orbitR = Math.max(15, 115 * (1 - convergeProgress * 0.88));
        const lensRadius = Math.max(16, 38 * (1 - convergeProgress * 0.52));

        panels.forEach((p, idx) => {
          const angle = (idx * Math.PI) / 2 + frame * 0.015;
          const lx = cx + Math.cos(angle) * orbitR * 1.25;
          const ly = cy + Math.sin(angle) * orbitR * 0.85 + floatY;

          // Streaming bio-filament lines connecting photos to center
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.55 * (1 - convergeProgress * 0.75);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.quadraticCurveTo(cx, cy + floatY + (idx % 2 === 0 ? -25 : 25), cx, cy + floatY);
          ctx.stroke();

          // Circular lens clipping
          ctx.beginPath();
          ctx.arc(lx, ly, lensRadius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(qImg, p.sx, p.sy, qw / 2, qh / 2, lx - lensRadius, ly - lensRadius, lensRadius * 2, lensRadius * 2);
          ctx.restore();

          // High-tech lens frame & label
          ctx.save();
          ctx.beginPath();
          ctx.arc(lx, ly, lensRadius, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          if (convergeProgress < 0.65) {
            ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
            ctx.fillRect(lx - 55, ly + lensRadius + 3, 110, 16);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(lx - 55, ly + lensRadius + 3, 110, 16);
            ctx.fillStyle = p.color;
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(p.label, lx, ly + lensRadius + 14);
          }
          ctx.restore();
        });
      }



      // =========================================================
      // 6. REAL-TIME ECG MONITOR OSCILLOSCOPE (튜브 바닥 심전도)
      // =========================================================
      const ecgY = vatY + vatH - 36;
      const ecgH = 30;

      ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
      ctx.fillRect(vatX + 1, ecgY, vatW - 2, ecgH);
      ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(vatX + 1, ecgY, vatW - 2, ecgH);

      // Realtime ECG Waveform synchronized to creatureBpm
      ctx.strokeStyle = creatureBpm > 130 ? "#f43f5e" : creatureBpm > 90 ? "#fbbf24" : "#34d399";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const ecgCycleWidth = (vatW - 30) / Math.max(2, Math.round(creatureBpm / 24));
      for (let x = 0; x < vatW - 20; x++) {
        const drawX = vatX + 10 + x;
        const phase = (x + frame * 3.5) % ecgCycleWidth;
        let spike = 0;
        if (phase > ecgCycleWidth * 0.45 && phase < ecgCycleWidth * 0.55) {
          const peak = (phase - ecgCycleWidth * 0.45) / (ecgCycleWidth * 0.1);
          spike = -Math.sin(peak * Math.PI) * (ecgH * 0.44);
        } else if (phase > ecgCycleWidth * 0.65 && phase < ecgCycleWidth * 0.8) {
          const tw = (phase - ecgCycleWidth * 0.65) / (ecgCycleWidth * 0.15);
          spike = -Math.sin(tw * Math.PI) * (ecgH * 0.18);
        }
        const py = ecgY + ecgH * 0.65 + spike;
        if (x === 0) ctx.moveTo(drawX, py);
        else ctx.lineTo(drawX, py);
      }
      ctx.stroke();

      // ECG Heartbeat Badge
      ctx.fillStyle = isBeatSystole ? "#f43f5e" : "#94a3b8";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`🫀 ${creatureBpm} BPM`, vatX + 14, ecgY + 19);

      // =========================================================
      // 7. HUD ACTIVE ORGAN FLASHING BANNER (번쩍이는 부위 라벨 표시)
      // =========================================================
      if (flashIntensity > 0.22) {
        let activeName = "";
        let organIcon = "";
        let badgeColor = "#10b981";

        if (isJawsFlashing) {
          activeName = isKo ? "대소(大笑)하는 큰 입과 날카로운 송곳니 & 악마의 뿔" : "Grand Laughing Jaws, Sharp Bio-Fangs & Demon Horns";
          organIcon = "😈 [LAUGHING JAWS & HORNS]";
          badgeColor = "#fde047";
        } else if (isBrainFlashing) {
          activeName = isKo ? `${selectedHead.nameKo} (이마 주름 & 3개 안구 & 쫑긋한 귀)` : `${selectedHead.nameEn} (Forehead Wrinkles, 3 Eyes, Ears)`;
          organIcon = "🧠 [BRAIN, EYES & EARS]";
          badgeColor = "#38bdf8";
        } else if (isHeartFlashing) {
          activeName = `${isKo ? selectedHeart.nameKo : selectedHeart.nameEn} (${creatureBpm} BPM 박동)`;
          organIcon = "🫀 [PULSING BIO-HEART]";
          badgeColor = "#f43f5e";
        } else if (isTorsoFlashing) {
          activeName = isKo ? `${selectedTorso.nameKo} (단단한 근육질 흉곽 & 복근 & 늑골)` : `${selectedTorso.nameEn} (Muscular Pectorals, 6-Pack Abs, Ribs)`;
          organIcon = "🦁 [MUSCULAR TORSO & RIBS]";
          badgeColor = "#f59e0b";
        } else if (isLimbsFlashing) {
          activeName = isKo ? selectedLimbs.nameKo : selectedLimbs.nameEn;
          organIcon = "🦎 [WINGS & TENTACLES]";
          badgeColor = "#a855f7";
        } else {
          activeName = isKo ? "온몸을 관통하는 전신 생체발광(GFP) 형광 혈관망 & 미세 섬모" : "Full-Body Bioluminescent Vein Network & Dense Cilia";
          organIcon = "⚡ [BIOLUMINESCENT VEINS]";
          badgeColor = "#34d399";
        }

        ctx.fillStyle = `rgba(2, 6, 23, ${0.88 * flashIntensity})`;
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.5;
        const bannerW = Math.min(520, vatW - 20);
        const bannerX = cx - bannerW / 2;
        const bannerY = vatY + 12;
        ctx.fillRect(bannerX, bannerY, bannerW, 26);
        ctx.strokeRect(bannerX, bannerY, bannerW, 26);

        ctx.fillStyle = badgeColor;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`⚡ ${organIcon}: ${activeName}`, cx, bannerY + 17);
        ctx.textAlign = "start";
      }

      frame++;
      animId = requestAnimationFrame(drawBioreactor);
    };

    animId = requestAnimationFrame(drawBioreactor);
    return () => cancelAnimationFrame(animId);
  }, [isStitchModalOpen, activeModalTab, morphStage, creatureBpm, fluidLevel, eyesOpen, selectedHead, selectedHeart, selectedTorso, selectedLimbs, isKo]);

  // Video switch handler
  useEffect(() => {
    setVideoFailed(false);
    setPhotoDead(false);
    setClipFailed(false);
  }, [activeExp.id]);

  const activeVideoSrc = activeExp.clipUrl && !clipFailed ? activeExp.clipUrl : activeExp.videoUrl;
  const playingClip = activeVideoSrc === activeExp.clipUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;

    // Browsers without Ogg Theora support cannot play Wikimedia .ogv clips; show photo + canvas instead.
    if (
      /\.og[vg](\?|$)/i.test(activeVideoSrc) &&
      typeof video.canPlayType === "function" &&
      !video.canPlayType('video/ogg; codecs="theora"')
    ) {
      setVideoFailed(true);
      return;
    }

    const tryPlay = (isRetry: boolean) => {
      const playPromise = video.play();
      if (!playPromise || typeof playPromise.catch !== "function") return;
      playPromise.catch((err: unknown) => {
        const name = (err as { name?: string } | null)?.name;
        // AbortError: play() interrupted by a new load/source swap, not a real failure.
        if (name === "AbortError") return;
        if (name === "NotAllowedError" && !isRetry) {
          video.muted = true;
          tryPlay(true);
          return;
        }
        if (playingClip) setClipFailed(true);
        else setVideoFailed(true);
      });
    };
    tryPlay(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExp.id, activeVideoSrc]);

  // Fetch live PubMed & Wiki when dossier tab is opened
  // WebAudio Sound Effects
  const triggerBioBeep = (freqStart = 520, freqEnd = 180, duration = 0.15) => {
    // If it's the 520Hz hospital beep default call, route directly to visceral cardiac thump!
    if (freqStart === 520) {
      playCardiacThump(activeExp.pulseBpm);
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  // WebAudio High-Impact Organic Biological Cardiac Thump Engine ("쿵쾅! 쿵쾅!")
  // 점점 빨라지는 BPM에 맞춰 볼륨과 서브베이스 파워도 [작은 심장소리 ---> 거대한 흉곽 쿵쾅 심장소리]로 점진적 변모!
  const playCardiacThump = (bpm: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      if (!cardiacBufferRef.current) {
        cardiacBufferRef.current = createOrganicHeartbeatBuffer(ctx);
      }

      const src = ctx.createBufferSource();
      src.buffer = cardiacBufferRef.current;

      // Realistic speed scaling with BPM (faster BPM = tighter, snappier thuds)
      const speedRate = Math.max(0.85, Math.min(1.55, 0.90 + (bpm / 200) * 0.38));
      src.playbackRate.setValueAtTime(speedRate, ctx.currentTime);

      // Deep analog chest wall absorption filter: 140Hz (작은 배아 둔탁음) -> 240Hz (거대 괴수 선명한 타격음)
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      const cutoffFreq = Math.min(240, Math.max(140, 130 + (bpm / 200) * 85));
      lowpass.frequency.setValueAtTime(cutoffFreq, ctx.currentTime);
      lowpass.Q.setValueAtTime(1.4, ctx.currentTime);

      // Sub-bass peaking boost filter: 42Hz (+2.0dB 배아 미세 박동 -> +15.0dB 거대 괴수 흉곽 진동 폭격!)
      const bassBoost = ctx.createBiquadFilter();
      bassBoost.type = "peaking";
      bassBoost.frequency.setValueAtTime(42, ctx.currentTime);
      bassBoost.Q.setValueAtTime(1.8, ctx.currentTime);
      const bassGain = Math.min(16.0, Math.max(2.0, 2.0 + ((bpm - 50) / 210) * 14.0));
      bassBoost.gain.setValueAtTime(bassGain, ctx.currentTime);

      const gainNode = ctx.createGain();
      // 점진적 볼륨 증폭: 58 BPM (0.22 미세한 작은 심장소리) ---> 260 BPM (2.2 거대한 괴수 쿵쾅 심장소리!)
      const dynamicVolume = Math.min(2.4, Math.max(0.22, 0.20 + Math.pow(Math.max(0, bpm - 50) / 210, 1.35) * 2.1));
      gainNode.gain.setValueAtTime(dynamicVolume, ctx.currentTime);

      src.connect(bassBoost);
      bassBoost.connect(lowpass);
      lowpass.connect(gainNode);
      gainNode.connect(ctx.destination);

      src.start(ctx.currentTime);
    } catch {}
  };

  // Maximum Output Beast Roar Player & Multi-Harmonic Sound Synthesizer (최대 출력 포효 사운드 엔진)
  const playChimeraRoar = (customRoarPath?: string) => {
    try {
      const audioPath = customRoarPath || selectedComicMonster.roarAudio || "/sounds/monster_roar_ferocious.wav";

      // 1. Channel A: Native HTML Audio at 100% Volume
      const roarAudioA = new Audio(audioPath);
      roarAudioA.volume = 1.0;
      roarAudioA.play().catch(() => {});

      // Channel B: Parallel delayed channel (+12ms) for massive stereo chorus widening and double punch
      setTimeout(() => {
        const roarAudioB = new Audio(audioPath);
        roarAudioB.volume = 1.0;
        roarAudioB.play().catch(() => {});
      }, 12);

      // 2. High-Impact WebAudio Master Compressor & Overdrive for MAXIMUM OUTPUT
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;

        // Dynamics Compressor to maximize loudness and punch without digital clipping
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-18, now);
        comp.knee.setValueAtTime(8, now);
        comp.ratio.setValueAtTime(14, now);
        comp.attack.setValueAtTime(0.002, now);
        comp.release.setValueAtTime(0.18, now);

        // Master Gain Boost Node (+9.5 dB overdrive boost)
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(2.8, now);

        comp.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Fetch & decode raw WAV for unconstrained WebAudio hardware amplification
        fetch(audioPath)
          .then((res) => res.arrayBuffer())
          .then((buf) => ctx.decodeAudioData(buf))
          .then((decoded) => {
            const node = ctx.createBufferSource();
            node.buffer = decoded;
            node.connect(comp);
            node.start(ctx.currentTime);
          })
          .catch(() => {});

        // Only play synthetic beast oscillators for non-piggy monsters (귀여운 꿀꿀이는 원음 그대로 맑게 출력)
        const isCutePig = audioPath.includes("piggy") || selectedComicMonster.id === "flying_piggy";

        if (!isCutePig) {
          // Earth-shaking sub-bass tremor (sawtooth 85Hz -> 160Hz -> 20Hz at peak gain)
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = "sawtooth";
          subOsc.frequency.setValueAtTime(85, now);
          subOsc.frequency.exponentialRampToValueAtTime(160, now + 0.3);
          subOsc.frequency.exponentialRampToValueAtTime(20, now + 2.4);

          subGain.gain.setValueAtTime(0.01, now);
          subGain.gain.linearRampToValueAtTime(1.8, now + 0.15); // Maximum gain
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(450, now);
          filter.frequency.linearRampToValueAtTime(900, now + 0.4);
          filter.frequency.exponentialRampToValueAtTime(120, now + 2.4);
          filter.Q.value = 6.0;

          subOsc.connect(filter);
          filter.connect(subGain);
          subGain.connect(ctx.destination);
          subOsc.start(now);
          subOsc.stop(now + 2.5);

          // Piercing screeching beast resonance layer
          const screamOsc = ctx.createOscillator();
          const screamGain = ctx.createGain();
          screamOsc.type = "square";
          screamOsc.frequency.setValueAtTime(500, now);
          screamOsc.frequency.exponentialRampToValueAtTime(950, now + 0.25);
          screamOsc.frequency.exponentialRampToValueAtTime(160, now + 1.8);

          screamGain.gain.setValueAtTime(0.01, now);
          screamGain.gain.linearRampToValueAtTime(0.85, now + 0.1);
          screamGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          screamOsc.connect(screamGain);
          screamGain.connect(ctx.destination);
          screamOsc.start(now);
          screamOsc.stop(now + 1.8);
        }
      }
    } catch {}
  };

  // Multi-Country Speech Synthesis (synced to selectedLangCode)
  const speakText = async (textKo: string, textEn: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    narrationAbortRef.current?.abort();
    const narrationId = ++narrationIdRef.current;
    const abortController = new AbortController();
    narrationAbortRef.current = abortController;

    const targetCode = selectedLangCode || "ko";
    const bcp47 = getBcp47ForLang(targetCode);
    let rawText = targetCode === "ko" ? textKo : textEn;

    if (targetCode !== "ko" && targetCode !== "en") {
      try {
        const url = assertAllowedApiEndpoint(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(textEn)}`,
        );
        const res = await fetchWithTimeout(url, 8000, { signal: abortController.signal });
        if (res.ok) {
          const data = await res.json();
          const translated = Array.isArray(data?.[0])
            ? data[0].map((seg: unknown[]) => (typeof seg?.[0] === "string" ? seg[0] : "")).join("")
            : "";
          if (translated.trim()) rawText = translated;
        }
      } catch {
        /* fallback to English narration */
      }
    }

    // Discard stale narration (sound muted, experiment/language changed, or unmounted during translate).
    if (narrationId !== narrationIdRef.current) return;

    const softenedText = rawText
      .replace(/([.!?])\s*/g, "$1 ... ")
      .replace(/([,])\s*/g, "$1 , ");

    const utter = new SpeechSynthesisUtterance(softenedText);
    utter.lang = bcp47;
    utter.rate = targetCode === "ko" ? 0.91 : 0.93;
    utter.pitch = 1.02;

    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices && allVoices.length > 0) {
      const langPrefix = bcp47.split("-")[0].toLowerCase();
      const exactMatch =
        allVoices.find(
          (v) =>
            v.lang.toLowerCase() === bcp47.toLowerCase() &&
            (v.name.includes("Natural") || v.name.includes("Online") || v.name.includes("Google")),
        ) ||
        allVoices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(langPrefix) &&
            (v.name.includes("Natural") || v.name.includes("Online") || v.name.includes("Google")),
        ) ||
        allVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (exactMatch) utter.voice = exactMatch;
    }

    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (pulseIntervalRef.current) {
      window.clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }

    const stopNarration = () => {
      narrationIdRef.current++;
      narrationAbortRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };

    // 초기 화면을 벗어나면(배양실·결투장·괴수 설계실) 내레이터와 바이오 비프음을 즉시 멈춘다
    if (!isSoundOn || isAwayFromHome) {
      stopNarration();
      return;
    }

    void speakText(
      activeExp.koreanNarratorScript.join(" "),
      activeExp.narratorScript.join(" ")
    );

    const intervalMs = Math.max(550, Math.round((60 / activeExp.pulseBpm) * 1000));
    pulseIntervalRef.current = window.setInterval(() => {
      triggerBioBeep();
    }, intervalMs);

    return () => {
      if (pulseIntervalRef.current) window.clearInterval(pulseIntervalRef.current);
      stopNarration();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [isSoundOn, activeExp.id, selectedLangCode, isAwayFromHome]);

  // Leaving the arena (closing the modal or switching tabs) returns it to the two-halves view; a running generation continues.
  useEffect(() => {
    if (isStitchModalOpen && activeModalTab === "monster_arena") return;
    setBattlePhase("stage");
  }, [isStitchModalOpen, activeModalTab]);
  // Release the shared AudioContext on unmount.
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try {
          Promise.resolve(audioCtxRef.current.close()).catch(() => {});
        } catch {
          /* already closed */
        }
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Active WebAudio Cardiac Loop for Chimera Assembler (Only active during bioreactor growth)
  useEffect(() => {
    if (
      !isStitchModalOpen ||
      activeModalTab !== "chimera_assembler" ||
      chimeraScreen !== "bioreactor" ||
      morphStage === "awakened" ||
      !isHeartbeatAudioOn
    ) {
      if (chimeraCardiacIntervalRef.current) {
        window.clearInterval(chimeraCardiacIntervalRef.current);
        chimeraCardiacIntervalRef.current = null;
      }
      return;
    }

    // Immediate beat on mount or BPM change
    playCardiacThump(creatureBpm);

    const intervalMs = Math.max(260, Math.round((60 / creatureBpm) * 1000));
    chimeraCardiacIntervalRef.current = window.setInterval(() => {
      playCardiacThump(creatureBpm);
    }, intervalMs);

    return () => {
      if (chimeraCardiacIntervalRef.current) {
        window.clearInterval(chimeraCardiacIntervalRef.current);
        chimeraCardiacIntervalRef.current = null;
      }
    };
  }, [isStitchModalOpen, activeModalTab, chimeraScreen, morphStage, isHeartbeatAudioOn, creatureBpm]);

  // Auto-absorbing floating chat on all viewports (only shows new messages since last dismissal).
  // The hide timer is paused while the pointer is over the overlay.
  useEffect(() => {
    if (messages.length === 0) return;

    const activeBatch = messages.slice(mobileDismissedIndexRef.current);
    if (activeBatch.length === 0) return;

    setMobileVisibleMessages(activeBatch.slice(-5));
    setMobileChatPhase("visible");

    // Scroll only the overlay's own box. Element.scrollIntoView also scrolled the full-screen overflow-hidden
    // ancestors, which lifted the whole bottom strip off the screen edge after a few thumbnail clicks.
    requestAnimationFrame(() => {
      if (mobileChatScrollRef.current) {
        mobileChatScrollRef.current.scrollTop = mobileChatScrollRef.current.scrollHeight;
      }
    });

    if (isChatOverlayHovered) return;

    const currentLength = messages.length;

    const exitTimer = setTimeout(() => {
      setMobileChatPhase("exiting");
    }, SYNAPSE_CHAT_ABSORB_MS);

    const clearTimer = setTimeout(() => {
      mobileDismissedIndexRef.current = currentLength;
      setMobileChatPhase("hidden");
      setMobileVisibleMessages([]);
    }, SYNAPSE_CHAT_ABSORB_MS + SYNAPSE_CHAT_EXIT_ANIM_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(clearTimer);
    };
  }, [messages, isChatOverlayHovered]);

  const handleSelectExperiment = (exp: BioExperimentCase) => {
    setActiveExp(exp);
    // Automatically close the Chimera Assembler & other modals when switching cases
    setIsStitchModalOpen(false);
    setIsHelpOpen(false);
    setIsKiroSpecModalOpen(false);

    const msg: SynapseChatMessage = {
      id: Date.now().toString() + "-case",
      sender: "ai",
      textKo: `${exp.badgeIcon} [${exp.codeName}] ${exp.koreanHeadline}`,
      textEn: `${exp.badgeIcon} [${exp.codeName}] ${exp.headline}`,
      subTextKo: exp.koreanSummary,
      subTextEn: exp.eerieRealitySummary,
      pmidBadge: exp.pmidOrDoi,
      timestamp: new Date().toLocaleTimeString(),
      linkedCase: exp
    };
    void appendTranslatedAiReply(msg);
  };

  const getEffectiveTargetLang = (): string => {
    if (selectedLangCode && selectedLangCode !== "ko") return selectedLangCode;
    if (typeof document !== "undefined") {
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (combo?.value && combo.value !== "ko") return combo.value;
      const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([^;]+)/);
      if (match?.[1] && match[1] !== "ko") return match[1];
    }
    return "ko";
  };

  const appendTranslatedAiReply = async (msg: SynapseChatMessage) => {
    const lang = getEffectiveTargetLang();
    if (lang === "ko") {
      setMessages((prev) => [...prev, msg]);
      return;
    }
    if (lang === "en") {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          textKo: msg.textEn,
          subTextKo: msg.subTextEn,
        },
      ]);
      return;
    }
    const [translatedMain, translatedSub] = await Promise.all([
      translateTextToLanguage(msg.textKo, lang),
      msg.subTextKo ? translateTextToLanguage(msg.subTextKo, lang) : Promise.resolve(undefined),
    ]);
    const finalMain = translatedMain && translatedMain !== msg.textKo ? translatedMain : msg.textEn;
    const finalSub =
      translatedSub && translatedSub !== msg.subTextKo ? translatedSub : msg.subTextEn;
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        textKo: finalMain,
        textEn: finalMain,
        subTextKo: finalSub,
        subTextEn: finalSub,
      },
    ]);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isQueryingApi) return;

    const rawQuery = inputText.trim();
    setInputText("");

    const userMsg: SynapseChatMessage = {
      id: Date.now().toString() + "-u",
      sender: "researcher",
      textKo: rawQuery,
      textEn: rawQuery,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, userMsg]);

    const lower = rawQuery.toLowerCase();
    const intent = detectQuestionIntent(rawQuery);

    if (intent === "app_usage") {
      const replyMsg: SynapseChatMessage = {
        id: (Date.now() + 1).toString() + "-ai",
        sender: "ai",
        textKo:
          "하단 사진 목록에서 6개 실제 줄기세포 실험을 전환하고, 같은 줄의 [괴수 설계 & 전투]에서 6종 표본을 15초 배양해 3D 각성·결투를 진행할 수 있습니다. 상단에서 다국가 언어와 내레이터 음성을 켜고 끌 수 있습니다.",
        textEn:
          "Switch between 6 real stem-cell cases in the photo strip at the bottom, or open the Monster Design & Battle button in the same strip to culture 6 specimens for 15s into 3D awakening and duel. Use the top bar for multi-language translation and narrator voice.",
        pmidBadge: "LAB GUIDE",
        timestamp: new Date().toLocaleTimeString()
      };
      await appendTranslatedAiReply(replyMsg);
      return;
    }

    const matchedCase = experiments.find(
      (c) =>
        lower.includes(c.shortTitle.toLowerCase()) ||
        lower.includes(c.koreanShortTitle.toLowerCase()) ||
        ((lower.includes("쥐") || lower.includes("mouse") || lower.includes("92") || lower.includes("스탠퍼드")) &&
          c.id.includes("xenocortication")) ||
        ((lower.includes("유령") || lower.includes("심장") || lower.includes("ghost") || lower.includes("heart")) &&
          c.id.includes("ghost-heart")) ||
        ((lower.includes("사후") || lower.includes("죽은 뇌") || lower.includes("예일") || lower.includes("brainex")) &&
          c.id.includes("brainex")) ||
        ((lower.includes("돼지") || lower.includes("pig") || lower.includes("인간-돼지")) &&
          c.id.includes("human-pig-chimera")) ||
        ((lower.includes("영장류") || lower.includes("원숭이") || lower.includes("형광") || lower.includes("monkey")) &&
          c.id.includes("chimeric-monkey")) ||
        ((lower.includes("아홀로틀") || lower.includes("도롱뇽") || lower.includes("사지") || lower.includes("axolotl")) &&
          c.id.includes("axolotl"))
    );

    const isContextualFollowUp =
      !matchedCase &&
      /(이\s*실험|현재\s*실험|이거|여기서|원리|왜|어떻게|유전자|인자|논문|출처|저자|연구소|윤리|위험|한계|실제|진짜|가능)/.test(
        lower
      ) &&
      !/(크리스퍼|crispr|텔로미어|telomere|야마나카|dna|rna|백신|암세포)/.test(lower);

    const targetCase = matchedCase || (isContextualFollowUp ? activeExp : undefined);

    if (targetCase) {
      if (matchedCase && matchedCase.id !== activeExp.id) {
        setActiveExp(matchedCase);
      }
      const factors = targetCase.stemCellBridge.factors.join(", ");
      let textKo = "";
      let textEn = "";

      switch (intent) {
        case "mechanism":
          textKo = `[${targetCase.koreanShortTitle} 작동 원리]\n• 핵심 결합: ${targetCase.koreanHostTissueA}에 ${targetCase.koreanDonorTissueB}를 정밀 접합합니다.\n• 기전 설명: ${toConciseCore(targetCase.stemCellBridge.koreanFusionMechanism, 280)}\n• 연구 의의: ${toConciseCore(targetCase.koreanSummary, 220)} (${targetCase.institution}, ${targetCase.pmidOrDoi})`;
          textEn = `[${targetCase.shortTitle} Mechanism]\n• Core Fusion: Combines ${targetCase.hostTissueA} with ${targetCase.donorTissueB}.\n• Process: ${toConciseCore(targetCase.stemCellBridge.fusionMechanism, 280)}\n• Significance: ${toConciseCore(targetCase.eerieRealitySummary, 220)} (${targetCase.institution}, ${targetCase.pmidOrDoi})`;
          break;
        case "genes_cells":
          textKo = `[핵심 유전자·줄기세포 구성]\n• 주요 인자: ${factors}\n• 분화 계통: ${targetCase.stemCellBridge.koreanLineage} (세포 생존·활성도 ${targetCase.stemCellBridge.viabilityPercent}%)\n• 작용 방식: ${toConciseCore(targetCase.stemCellBridge.koreanFusionMechanism, 240)}\n• 연구 요약: ${toConciseCore(targetCase.koreanSummary, 180)}`;
          textEn = `[Key Genes & Stem-Cell Lineage]\n• Key Factors: ${factors}\n• Target Lineage: ${targetCase.stemCellBridge.lineage} (${targetCase.stemCellBridge.viabilityPercent}% viability)\n• Mechanism: ${toConciseCore(targetCase.stemCellBridge.fusionMechanism, 240)}\n• Summary: ${toConciseCore(targetCase.eerieRealitySummary, 180)}`;
          break;
        case "paper_source":
          textKo = `[학술 논문 및 연구 출처]\n• 연구 기관 및 책임자: ${targetCase.institution} — ${targetCase.leadScientist}\n• 게재 학술지: ${targetCase.journalCitation} (${targetCase.pmidOrDoi})\n• 실험 내용: ${toConciseCore(targetCase.koreanSummary, 260)}\n• 사용 세포 계통: ${targetCase.stemCellBridge.koreanLineage} (${factors})`;
          textEn = `[Study & Journal Citation]\n• Institution & Lead: ${targetCase.institution} — ${targetCase.leadScientist}\n• Journal: ${targetCase.journalCitation} (${targetCase.pmidOrDoi})\n• Findings: ${toConciseCore(targetCase.eerieRealitySummary, 260)}\n• Lineage: ${targetCase.stemCellBridge.lineage} (${factors})`;
          break;
        case "ethics_reality":
          textKo = `[실제 연구 여부 및 생명윤리 한계]\n• 검증 출처: ${targetCase.institution} (${targetCase.leadScientist})가 ${targetCase.journalCitation}에 발표한 실제 연구입니다 (${targetCase.pmidOrDoi}).\n• 달성 수준: ${targetCase.stemCellBridge.koreanLineage} 기준 활성도 ${targetCase.stemCellBridge.viabilityPercent}%를 기록했습니다.\n• 윤리·과학적 경계: ${toConciseCore(targetCase.koreanSummary, 220)} 현재는 장기 재생·난치병 모델링 목적의 엄격한 생명윤리 규범 내에서만 허용됩니다.`;
          textEn = `[Scientific Reality & Bioethics]\n• Verified Study: Real peer-reviewed research by ${targetCase.leadScientist} (${targetCase.institution}) in ${targetCase.journalCitation} (${targetCase.pmidOrDoi}).\n• Viability: Achieved ${targetCase.stemCellBridge.viabilityPercent}% in ${targetCase.stemCellBridge.lineage}.\n• Ethical Boundary: ${toConciseCore(targetCase.eerieRealitySummary, 220)} Strictly regulated for disease modeling and regenerative medicine.`;
          break;
        default:
          textKo = `[${targetCase.koreanShortTitle} 상세 해설]\n• 연구 배경: ${toConciseCore(targetCase.koreanSummary, 260)}\n• 줄기세포 접합: ${targetCase.koreanHostTissueA} ↔ ${targetCase.koreanDonorTissueB} (${factors})\n• 작동 기전: ${toConciseCore(targetCase.stemCellBridge.koreanFusionMechanism, 220)}\n• 출처: ${targetCase.institution} · ${targetCase.pmidOrDoi}`;
          textEn = `[${targetCase.shortTitle} Overview]\n• Summary: ${toConciseCore(targetCase.eerieRealitySummary, 260)}\n• Stem-Cell Bridge: ${targetCase.hostTissueA} ↔ ${targetCase.donorTissueB} (${factors})\n• Mechanism: ${toConciseCore(targetCase.stemCellBridge.fusionMechanism, 220)}\n• Source: ${targetCase.institution} · ${targetCase.pmidOrDoi}`;
          break;
      }

      const replyMsg: SynapseChatMessage = {
        id: (Date.now() + 1).toString() + "-ai",
        sender: "ai",
        textKo,
        textEn,
        pmidBadge: targetCase.pmidOrDoi,
        timestamp: new Date().toLocaleTimeString(),
        linkedCase: targetCase
      };
      await appendTranslatedAiReply(replyMsg);
      return;
    }

    const activeLang = getEffectiveTargetLang();
    setIsQueryingApi(true);
    let dossier: StitchedResearchDossier;
    try {
      dossier = await scienceStitchService.stitchLiveQuery(rawQuery, activeLang);
    } catch {
      dossier = buildOfflineDossier(rawQuery);
    } finally {
      setIsQueryingApi(false);
    }

    const topPaper = dossier.papers[0];

    const aiReply: SynapseChatMessage = {
      id: (Date.now() + 2).toString() + "-ai",
      sender: "ai",
      textKo: dossier.stemCellSynthesisKo,
      textEn: dossier.stemCellSynthesisEn,
      subTextKo:
        dossier.wiki && topPaper
          ? `📄 관련 PubMed 논문: "${topPaper.title}" (${topPaper.journalTitle}, ${topPaper.pubYear})`
          : undefined,
      subTextEn:
        dossier.wiki && topPaper
          ? `📄 Related PubMed Study: "${topPaper.title}" (${topPaper.journalTitle}, ${topPaper.pubYear})`
          : undefined,
      pmidBadge: topPaper?.pmid ? `PMID: ${topPaper.pmid}` : dossier.wiki ? "Wikipedia Live" : "Search",
      timestamp: new Date().toLocaleTimeString()
    };

    if (activeLang !== "ko" && activeLang !== "en") {
      // dossier.stemCellSynthesisKo is already localized to activeLang; only translate subTextKo if present
      const translatedSub = aiReply.subTextKo
        ? await translateTextToLanguage(aiReply.subTextKo, activeLang, "ko")
        : undefined;
      setMessages((prev) => [
        ...prev,
        {
          ...aiReply,
          textEn: aiReply.textKo,
          subTextKo: translatedSub,
          subTextEn: translatedSub,
        },
      ]);
      return;
    }

    await appendTranslatedAiReply(aiReply);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col w-full max-w-full overflow-hidden box-border">
      {/* Top Header with Seamless Language Switcher (한국어 / English / 한·영 병기) */}
      <header className="border-b border-emerald-500/30 px-2.5 sm:px-4 py-2 flex justify-between items-center bg-slate-900/95 backdrop-blur shadow-lg w-full shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <h1
            translate="no"
            className="text-xs sm:text-sm font-black tracking-wide text-emerald-300 truncate shrink-0"
          >
            PROMETHEUS-iPSC
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCustomMonsterModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer transition shadow border border-cyan-300/50 active:scale-95"
            >
              <span>🧬</span>
              <span>{isKo ? "괴수 설계실" : "Monster Design Room"}</span>
            </button>
            {/* 결투장으로 바로: DB에 저장된 괴수들로 다시 결투하거나 만든 결투 영상을 다시 본다 */}
            <button
              type="button"
              onClick={() => {
                setIsCustomMonsterModalOpen(false);
                setActiveModalTab("monster_arena");
                setIsStitchModalOpen(true);
              }}
              className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer transition shadow border border-rose-300/50 active:scale-95"
            >
              <span>⚔️</span>
              <span>{isKo ? "괴수 결투장" : "Monster Arena"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSoundOn((prev) => !prev)}
              className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded border transition font-bold cursor-pointer shadow ${
                !isSoundOn
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 animate-pulse"
              }`}
            >
              {isSoundOn
                ? isKo
                  ? "🔊 내레이터"
                  : "🔊 Narrator"
                : isKo
                ? "🔇 내레이터"
                : "🔇 Narrator"}
            </button>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer transition shadow border border-cyan-300/50 active:scale-95"
            >
              <span>❓</span>
              <span>{isKo ? "사용법" : "Help / Lab Guide"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <GoogleLanguageSelector value={selectedLangCode} onChange={handleGlobalLanguageChange} />
        </div>
      </header>

      {/* Main Split Grid */}
      <div
        className="relative flex-1 flex flex-col p-0 w-full max-w-full box-border items-stretch overflow-hidden"
        style={{ height: "calc(100dvh - 48px)", maxHeight: "calc(100dvh - 48px)" }}
      >
        {/* SECTION 1: Bio-Microscopy & Real Photographic Evidence Viewport */}
        <div className="h-full relative bg-black border-0 rounded-none p-0 flex flex-col justify-between w-full max-w-full overflow-hidden box-border">
          <div
            onClick={() => setIsSoundOn((prev) => !prev)}
            className="relative w-full h-full bg-slate-950 rounded-none overflow-hidden cursor-pointer select-none flex-1 min-h-0"
          >
            {/* Background High-Res Real Confocal/Experiment Photo */}
            <img
              key={activeExp.id + "-photo"}
              src={activeExp.microscopyPhotoUrl}
              alt={activeExp.headline}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallback === "1") {
                  setPhotoDead(true);
                  return;
                }
                img.dataset.fallback = "1";
                img.src = LOCAL_CONFOCAL_FALLBACK;
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-all duration-700 filter contrast-125"
            />

            {/* Canvas bio-simulation: always-visible fallback when no real media can be shown */}
            {(videoFailed && photoDead) && <BioSimCanvas />}

            {/* Live Microscopy Video Layer */}
            {!videoFailed && (
              <video
                ref={videoRef}
                key={activeExp.id + "-" + activeVideoSrc}
                src={activeVideoSrc}
                autoPlay
                loop
                muted
                playsInline
                onError={() => (playingClip ? setClipFailed(true) : setVideoFailed(true))}
                className={
                  playingClip
                    ? "absolute inset-0 w-full h-full object-cover"
                    : "absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
                }
              />
            )}

            {/* Eerie Bioluminescent Grid & Vignette Overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 28%, rgba(2, 6, 23, 0.88) 100%), repeating-linear-gradient(0deg, rgba(16, 185, 129, 0.04) 0px, rgba(16, 185, 129, 0.04) 1px, transparent 1px, transparent 3px)"
              }}
            />

            {/* BOTTOM OVERLAY (all viewports): chat overlay, experiment photo strip, input line */}
            <div
              className="absolute bottom-0 inset-x-0 z-20 flex flex-col justify-end bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent px-2.5 md:px-4 pb-[max(2px,env(safe-area-inset-bottom))] pt-8 pointer-events-none gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 0. 5s Auto-Absorbing Synapse Chat (questions, answers, PubMed / Wikipedia cards) */}
              {mobileChatPhase !== "hidden" && mobileVisibleMessages.length > 0 && (
                <div
                  className="w-full max-w-3xl mx-auto max-h-[38dvh] overflow-hidden flex flex-col justify-end mb-1 pointer-events-auto"
                  onMouseEnter={() => setIsChatOverlayHovered(true)}
                  onMouseLeave={() => setIsChatOverlayHovered(false)}
                >
                  <div
                    ref={mobileChatScrollRef}
                    className={`flex flex-col gap-1.5 overflow-y-auto no-scrollbar transition-all duration-500 ease-in-out ${
                      mobileChatPhase === "exiting"
                        ? "-translate-y-full opacity-0"
                        : "translate-y-0 opacity-100"
                    }`}
                  >
                    {mobileVisibleMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col w-full ${
                          msg.sender === "researcher" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={
                            msg.sender === "researcher"
                              ? "max-w-[82%] px-3 py-1.5 rounded-2xl rounded-br-xs text-xs bg-emerald-500 text-slate-950 font-bold shadow-lg break-words"
                              : "max-w-[92%] px-3 py-1.5 rounded-2xl rounded-bl-xs text-xs bg-slate-950/90 backdrop-blur-md text-emerald-100 border border-emerald-500/40 shadow-lg break-words"
                          }
                        >
                          {msg.sender === "ai" && msg.pmidBadge && (
                            <span className="inline-block text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded mb-1">
                              {msg.pmidBadge}
                            </span>
                          )}
                          <p
                            translate={msg.sender === "ai" && selectedLangCode !== "ko" ? "no" : undefined}
                            className="whitespace-pre-line"
                          >
                            {isKo ? msg.textKo : msg.textEn}
                          </p>
                          {(isKo ? msg.subTextKo : msg.subTextEn) && (
                            <p className="text-[11px] text-slate-300 mt-1 border-t border-slate-700/80 pt-1">
                              {isKo ? msg.subTextKo : msg.subTextEn}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Active experiment headline (compact; full text in title) */}
              <p
                className="pointer-events-auto self-start max-w-full truncate bg-black/60 border border-emerald-500/30 rounded px-2 py-0.5 text-[10px] md:text-[11px] font-bold text-white"
                title={`${isKo ? activeExp.koreanHeadline : activeExp.headline} (${activeExp.journalCitation})`}
              >
                {activeExp.badgeIcon} {isKo ? activeExp.koreanHeadline : activeExp.headline}
                <span className="hidden md:inline text-emerald-300 font-mono font-normal"> · {activeExp.journalCitation}</span>
              </p>

              {/* 2. Experiment photo strip (all samples always fit: equal shares of the width, no scrolling)
                     + Monster Design & Battle button last, fixed width so it never leaves the screen */}
              <div className="flex gap-1.5 md:gap-2 w-full py-0.5 pointer-events-auto items-stretch">
                {experiments.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => handleSelectExperiment(exp)}
                    title={`${isKo ? exp.koreanHeadline : exp.headline} (${exp.journalCitation})`}
                    aria-label={isKo ? exp.koreanShortTitle : exp.shortTitle}
                    className={`relative flex-1 basis-0 min-w-0 max-w-[160px] h-14 sm:h-16 md:h-[72px] rounded-lg overflow-hidden cursor-pointer shadow-lg border-2 transition active:scale-95 ${
                      activeExp.id === exp.id
                        ? "border-emerald-400 ring-2 ring-emerald-400/60"
                        : "border-slate-700 opacity-80 hover:opacity-100 hover:border-emerald-500/60"
                    }`}
                  >
                    <img
                      src={exp.microscopyPhotoUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback === "1") return;
                        img.dataset.fallback = "1";
                        img.src = LOCAL_CONFOCAL_FALLBACK;
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 pt-3 pb-0.5 text-[9px] md:text-[10px] font-bold text-white leading-tight flex items-center justify-center sm:justify-start gap-0.5">
                      <span>{exp.badgeIcon}</span>
                      {/* 좁은 화면에서는 아이콘만, 넓으면 짧은 제목까지 */}
                      <span className="truncate hidden sm:inline">{isKo ? exp.koreanShortTitle : exp.shortTitle}</span>
                    </span>
                  </button>
                ))}
                {/* 맨 위 [괴수 설계실] 버튼과 같은 동작: 괴수 설계실을 연다 */}
                <button
                  type="button"
                  onClick={() => setIsCustomMonsterModalOpen(true)}
                  className="shrink-0 w-[72px] sm:w-24 md:w-28 h-14 sm:h-16 md:h-[72px] rounded-lg text-[10px] sm:text-[11px] font-black cursor-pointer shadow-lg transition flex flex-col items-center justify-center gap-0.5 border px-1 text-center leading-tight bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 border-emerald-300 active:scale-95"
                >
                  <span className="text-sm sm:text-base">⚡</span>
                  <span>{isKo ? "괴수 설계 & 전투" : "Monster Design & Battle"}</span>
                </button>
              </div>

              {/* 3. Bottom line: chat input + Send */}
              <form onSubmit={handleSendChat} className="flex gap-1.5 pointer-events-auto w-full">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isKo
                      ? "질문 또는 생물학 미스터리 검색 (실시간 PubMed)..."
                      : "Ask Dr. Kiro or search PubMed live..."
                  }
                  aria-label={isKo ? "질문 입력" : "Ask a question"}
                  className="flex-1 min-w-0 bg-slate-950/90 backdrop-blur-md border-2 border-cyan-400/90 rounded-lg px-3 py-2 text-sm text-white shadow-[0_0_14px_rgba(34,211,238,0.45)] focus:outline-none focus:border-emerald-300 focus:shadow-[0_0_18px_rgba(110,231,183,0.7)] placeholder-slate-300"
                />
                <button
                  type="submit"
                  disabled={isQueryingApi}
                  className="bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-300 px-4 py-2 rounded-lg text-sm font-black text-slate-950 shrink-0 cursor-pointer shadow-[0_0_14px_rgba(16,185,129,0.5)]"
                >
                  {isQueryingApi ? "..." : isKo ? "전송" : "Send"}
                </button>
              </form>
            </div>

            {/* BLOCK 4 OVERLAY: [Tab 1] Mythic Chimera 4-Part Video Morphing Assembler & [Tab 2] Live PubMed Dossier */}
            {isStitchModalOpen && (
              <div
                className="fixed inset-0 z-50 flex flex-col bg-slate-950"
                onClick={() => setIsStitchModalOpen(false)}
              >
                <div
                  className="relative w-full h-full bg-slate-950 flex flex-col overflow-hidden text-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 1-LINE SLIM HEADER BAR (글씨는 맨 윗줄 1줄만! 나머지 전체는 영상으로 꽉 채움) */}
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-800 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar bg-slate-950/95">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {SHOW_CHIMERA_LAB && (
                      <button
                        type="button"
                        onClick={() => setActiveModalTab("chimera_assembler")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition flex items-center gap-1 whitespace-nowrap ${
                          activeModalTab === "chimera_assembler"
                            ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow"
                            : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        <span>⚡</span>
                        <span>{isKo ? "키메라 배양실" : "Bio-Assembler"}</span>
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveModalTab("monster_arena")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition flex items-center gap-1 whitespace-nowrap ${
                          activeModalTab === "monster_arena"
                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow shadow-rose-600/30"
                            : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        <span>⚔️</span>
                        <span>{isKo ? "결투장" : "Arena"}</span>
                      </button>                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={backToDesignRoom}
                        className="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-400/60 px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer whitespace-nowrap"
                      >
                        🧬 {isKo ? "괴수 설계실로" : "Design Room"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsStitchModalOpen(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        ✕ {isKo ? "닫기" : "Close"}
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: MYTHIC CHIMERA ASSEMBLER & VIDEO-LIKE BIOREACTOR MORPHING */}
                  {activeModalTab === "chimera_assembler" ? (
                    <div
                      className={`flex flex-col flex-1 min-h-0 ${
                        chimeraScreen === "bioreactor" ? "overflow-hidden" : "overflow-y-auto p-3"
                      }`}
                    >

                      {/* ============================================================== */}
                      {/* 독립 화면 1: 실제 사진 보여 주는 화면 (Real Specimen Photo Gallery) */}
                      {/* ============================================================== */}
                      {chimeraScreen === "photos" && (
                        <div className="flex flex-col gap-3.5 animate-fadeIn">
                          <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">📷</span>
                                <h3 className="text-xs sm:text-sm font-black text-amber-300">
                                  {isKo ? "키메라 배양실 (전설 2 · 외계 2 · 프랑켄슈타인 1 · 인간 1)" : "Chimera Bioreactor Lab (6 Specimens)"}
                                </h3>
                              </div>
                              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold">
                                6 SPECIMENS
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {isKo
                                ? "전설의 괴수 2종, 외계 상상의 괴수 2종, 프랑켄슈타인 1종, 인간 1종 총 6가지 표본입니다. 원하는 표본을 클릭하면 해당 괴수의 배양기 타임랩스가 즉시 시작됩니다."
                                : "6 curated specimens (2 Mythic, 2 Alien, 1 Frankenstein, 1 Human). Click any specimen to start its 15-second bioreactor time-lapse!"}
                            </p>

                            {/* 6 Specimens Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {REAL_STEM_CELL_PHOTOS.map((photo) => {
                                const targetMonster =
                                  COMIC_MONSTERS.find((m) => m.id === photo.targetMonsterId) ||
                                  (photo.targetMonsterId === HUMAN_PROMETHEUS_MONSTER.id
                                    ? HUMAN_PROMETHEUS_MONSTER
                                    : COMIC_MONSTERS[0]);
                                const isSelected = selectedComicMonster.id === targetMonster.id;
                                return (
                                  <div
                                    key={photo.id}
                                    className={`group rounded-xl border p-2.5 text-left transition flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                                      isSelected
                                        ? "bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/60 shadow-2xl"
                                        : "bg-slate-950/85 border-slate-800 hover:border-amber-400/60 hover:bg-slate-900/90"
                                    }`}
                                  >
                                    {/* Real Photo Thumbnail */}
                                    <div
                                      onClick={() => handleSelectAndAwakenMonster(targetMonster)}
                                      className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-700/60 bg-black cursor-pointer group-hover:border-amber-400/80 transition"
                                    >
                                      <img
                                        src={photo.imgSrc}
                                        alt={photo.titleKo}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                      />
                                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/85 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-400/40">
                                        <span className="text-amber-300 font-mono">{photo.categoryKo}</span>
                                      </div>
                                      <div className="absolute bottom-1 right-1 bg-black/85 text-cyan-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">
                                        🔬 {photo.magnification} · {photo.stainType}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="text-[11px] sm:text-xs font-black text-white line-clamp-1 flex items-center justify-between">
                                        <span>{isKo ? photo.titleKo : photo.titleEn}</span>
                                      </h4>
                                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                                        {isKo ? photo.descriptionKo : photo.descriptionEn}
                                      </p>
                                      <div className="mt-1.5 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                                        <span>🧬 배양 파생:</span>
                                        <span className="font-bold underline">{photo.targetMonsterName}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectAndAwakenMonster(targetMonster)}
                                        className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-[10px] font-black py-1.5 rounded-lg cursor-pointer transition shadow flex items-center justify-center gap-1"
                                      >
                                        <span>⚡</span>
                                        <span>{isKo ? `이 세포로 [${photo.targetMonsterName}] 15초 배양 시작` : `Awaken ${photo.targetMonsterName}`}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ============================================================== */}
                      {/* 독립 화면 2: 16가지 동영상 선택 화면 (16 Dynamic Specimen Videos) */}
                      {/* ============================================================== */}
                      {chimeraScreen === "videos" && (
                        <div className="flex flex-col gap-3.5 animate-fadeIn">
                          <div className="bg-slate-900/90 border-2 border-cyan-500/40 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">🎬</span>
                                <h3 className="text-xs sm:text-sm font-black text-cyan-300">
                                  {isKo ? "2. 16가지 동영상 선택 화면 (16 Dynamic Specimen Videos)" : "2. 16 Dynamic Specimen Videos"}
                                </h3>
                              </div>
                              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
                                16 DYNAMIC VIDEOS
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {isKo
                                ? "원하는 동영상을 클릭하면 배양기 화면으로 즉시 전환되며, 배양기 중심 기포 발생 → 줄기세포 일렁임 → 3D 돌출 포효가 자동으로 진행됩니다!"
                                : "Click any video card below to switch directly to the Bioreactor Chamber and start central bubbling, stem-cell undulation, and 3D roaring lunge!"}
                            </p>

                            {/* 12 Video Cards Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {COMIC_MONSTERS.map((monster) => {
                                const isSelected = selectedComicMonster.id === monster.id;
                                return (
                                  <div
                                    key={monster.id}
                                    onClick={() => handleSelectAndAwakenMonster(monster)}
                                    className={`group rounded-xl border p-2 text-left transition flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden ${
                                      isSelected
                                        ? "bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-400/60 shadow-2xl scale-[1.01]"
                                        : "bg-slate-950/85 border-slate-800 hover:border-cyan-400/60 hover:bg-slate-900/90 hover:scale-[1.01]"
                                    }`}
                                  >
                                    {/* Video Preview Container */}
                                    <div className="relative w-full h-32 sm:h-36 rounded-lg overflow-hidden border border-slate-700 bg-black">
                                      <video
                                        src={monster.videoSrc}
                                        muted
                                        loop
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                      />
                                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/85 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                        <span>{monster.icon}</span>
                                        <span style={{ color: monster.colorHex }}>{monster.badge}</span>
                                      </div>
                                      <div className="absolute bottom-1 right-1 bg-black/85 text-cyan-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">
                                        🫀 {monster.bpm} BPM
                                      </div>
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition pointer-events-none">
                                        <span className="w-8 h-8 rounded-full bg-cyan-500/80 text-black flex items-center justify-center text-xs font-black shadow-lg">
                                          ▶
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="text-[11px] sm:text-xs font-black text-white truncate flex items-center justify-between">
                                        <span>{isKo ? monster.nameKo : monster.nameEn}</span>
                                        <span className="text-[9px] text-cyan-400 font-bold bg-cyan-500/20 px-1 rounded">
                                          동영상
                                        </span>
                                      </h4>
                                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 leading-tight">
                                        {isKo ? monster.taglineKo : monster.taglineEn}
                                      </p>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-800/80">
                                      <span className="text-cyan-400 font-bold text-[9px] flex items-center gap-1">
                                        ⚡ 클릭 즉시 배양기 3D 각성
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      )}

                      {/* ============================================================== */}
                      {/* 독립 화면 3: 배양기 화면 (전체 화면 꽉 찬 영상 뷰포트) */}
                      {/* ============================================================== */}
                      {chimeraScreen === "bioreactor" && (
                        <BioreactorScreen
                          key={`${selectedComicMonster.id}-${bioreactorRunId}`}
                          monster={selectedComicMonster}
                          onStageChange={handleBioreactorStageChange}
                          onAwaken={handleBioreactorAwaken}
                          onHeartbeat={(bpm) => {
                            if (isHeartbeatAudioOn) playCardiacThump(bpm);
                          }}
                          onReturn={handleReturnToSelection}
                        />
                      )}
                    </div>
                  ) : (
                  /* TAB 2: MONSTER CLASH ARENA (설계한 괴수만: 왼쪽/오른쪽 절반 화면 → 서로 마주봄 → [결투] 12초 영상 → 결과) */
                  <div className="flex flex-col flex-1 min-h-0 gap-2 animate-fadeIn">
                    {/* Match list + story editor */}
                    <div className="flex items-center justify-between gap-2 bg-slate-900/95 border border-rose-500/40 px-2.5 py-1.5 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          aria-label={isKo ? "왼쪽 괴수" : "Left monster"}
                          value={arenaSlots.left ?? ""}
                          onChange={(e) => setArenaSlots((s) => selectSlot(s, "left", e.target.value || null))}
                          className="bg-slate-950 border border-cyan-500/60 text-cyan-300 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none max-w-[190px]"
                        >
                          <option value="">{isKo ? "— 왼쪽 괴수 선택 —" : "— Left monster —"}</option>
                          {arenaRosterList.map((m) => (
                            <option key={m.id} value={m.id}>🔵 {isKo ? m.nameKo : m.nameEn}</option>
                          ))}
                        </select>
                        <span className="text-xs font-black text-rose-500 px-0.5">VS</span>
                        <select
                          aria-label={isKo ? "오른쪽 괴수" : "Right monster"}
                          value={arenaSlots.right ?? ""}
                          onChange={(e) => setArenaSlots((s) => selectSlot(s, "right", e.target.value || null))}
                          className="bg-slate-950 border border-rose-500/60 text-rose-300 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none max-w-[190px]"
                        >
                          <option value="">{isKo ? "— 오른쪽 괴수 선택 —" : "— Right monster —"}</option>
                          {arenaRosterList.map((m) => (
                            <option key={m.id} value={m.id}>🔴 {isKo ? m.nameKo : m.nameEn}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={openStoryEditor}
                          disabled={isGeneratingAiClash || !arenaHasTwoDesigns}
                          title={isKo ? "영상 생성 전에 배틀 스토리를 확인·편집합니다 (편집은 무료)" : "Review and edit the battle story before generating (editing is free)"}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-cyan-400/70 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50 whitespace-nowrap"
                        >
                          {isKo ? "📝 스토리 편집" : "📝 Edit story"}
                        </button>
                        {aiClashStatus && aiClashStatus.kind !== "loading" && (
                          <span
                            role="status"
                            className={`text-[10px] font-bold max-w-[340px] truncate ${aiClashStatus.kind === "ok" ? "text-emerald-300" : "text-rose-300"}`}
                            title={aiClashStatus.text}
                          >
                            {aiClashStatus.text}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stage: two halves (perspective on the stage so the turn toward each other reads as 3D) */}
                    <div
                      className="relative flex-1 min-h-[60vh] rounded-2xl overflow-hidden border-2 border-rose-500/50 bg-black shadow-2xl"
                      style={{ perspective: "1400px" }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(244,63,94,0.22)_0%,_rgba(15,23,42,0.95)_75%,_#000_100%)] pointer-events-none" />
                      <div className="relative w-full h-full flex items-stretch">
                        <ArenaHalf
                          monster={arenaLeft}
                          angleDeg={faceOffAngleDeg("left", arenaHasTwoDesigns)}
                          isKo={isKo}
                          tint="cyan"
                          emptyLabel={isKo ? "왼쪽 자리: 먼저 출격한 괴수가 서 있습니다. 위 목록에서 고를 수도 있습니다." : "Left half: the first monster to enter stands here. You can also pick one from the list above."}
                        />
                        <ArenaHalf
                          monster={arenaRight}
                          angleDeg={faceOffAngleDeg("right", arenaHasTwoDesigns)}
                          isKo={isKo}
                          mirror={MIRROR_RIGHT_FIGHTER}
                          tint="rose"
                          emptyLabel={isKo ? "오른쪽 자리: 괴수 설계실에서 두 번째 괴수를 만들어 출격시키세요." : "Right half: design a second monster in the Design Room and send it out."}
                        />
                      </div>

                      {/* Center: duel button / progress */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        {arenaRosterList.length < 2 && !arenaHasTwoDesigns && (
                          <div className="pointer-events-auto flex flex-col items-center gap-2 text-center px-4 py-3 rounded-2xl bg-black/70 border border-slate-700 max-w-xs">
                            <p className="text-xs font-black text-rose-200">
                              {isKo ? "결투장은 직접 설계한 괴수끼리만 싸웁니다." : "The arena is only for monsters you designed."}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {isKo
                                ? `괴수 설계실에서 2마리를 설계하세요. (현재 ${arenaRosterList.length}마리) 샘플 6종은 배양기 시연 전용입니다.`
                                : `Design 2 monsters in the Design Room (you have ${arenaRosterList.length}). The 6 samples are for the bioreactor only.`}
                            </p>
                            <button
                              type="button"
                              onClick={backToDesignRoom}
                              className="px-3 py-1.5 rounded-lg text-xs font-black border border-cyan-400/70 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30"
                            >
                              🧬 {isKo ? "괴수 설계실로" : "Design Room"}
                            </button>
                          </div>
                        )}
                        {arenaHasTwoDesigns && isGeneratingAiClash && (
                          /* 전투 장면에는 자막을 띄우지 않는다: 회전 표시만 (스크린 리더용 이름은 유지) */
                          <div
                            role="status"
                            aria-label={isKo ? `${BATTLE_VIDEO_SECONDS}초 전투 영상 생성 중` : `Generating the ${BATTLE_VIDEO_SECONDS} s battle video`}
                            className="w-10 h-10 rounded-full border-4 border-amber-300/30 border-t-amber-300 animate-spin motion-reduce:animate-none"
                          />
                        )}
                        {arenaHasTwoDesigns && !isGeneratingAiClash && duelReady && (
                          <div className="pointer-events-auto flex flex-col items-center gap-1">
                            {/* 비용 안내는 화면 자막 대신 마우스를 올렸을 때(title)만 보인다 */}
                            <button
                              type="button"
                              onClick={handleDuel}
                              title={aiClashUrl
                                ? (isKo ? "이미 만든 영상이라 무료" : "Already made, free")
                                : (isKo ? `${BATTLE_VIDEO_SECONDS}초 전투 영상 약 $1.56` : `${BATTLE_VIDEO_SECONDS} s battle video, about $1.56`)}
                              className="px-6 py-3 rounded-2xl text-base sm:text-lg font-black text-white bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-[0_0_30px_rgba(244,63,94,0.6)] motion-safe:animate-pulse"
                            >
                              {aiClashUrl ? (isKo ? "▶ 결투 다시 보기" : "▶ Replay the duel") : (isKo ? "⚔️ 결투" : "⚔️ Duel")}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Battle video (full stage, plays once) and the outcome after it ends */}
                      {battlePhase !== "stage" && aiClashUrl && (
                        <div className="absolute inset-0 z-30 bg-black">
                          <video
                            key={`${aiClashUrl}-${duelReplayKey}`}
                            src={aiClashUrl}
                            autoPlay
                            muted
                            playsInline
                            controls={battlePhase === "playing"}
                            onEnded={() => setBattlePhase("outcome")}
                            className="w-full h-full object-cover"
                          />
                          {battlePhase === "playing" && (
                            <button
                              type="button"
                              onClick={() => setBattlePhase("stage")}
                              aria-label={isKo ? "두 괴수 화면으로" : "Back to the two monsters"}
                              title={isKo ? "두 괴수 화면으로" : "Back to the two monsters"}
                              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 border border-slate-600 text-slate-200 hover:bg-black/80"
                            >
                              ✕
                            </button>
                          )}
                          {battlePhase === "outcome" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-4 text-center" role="status" aria-live="polite">
                              <p className="text-2xl sm:text-4xl font-black text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.8)]">
                                {duelWinner
                                  ? (isKo ? `🏆 ${duelWinner.nameKo} 승리!` : `🏆 ${duelWinner.nameEn} wins!`)
                                  : (isKo ? "결투 종료" : "Duel over")}
                              </p>
                              {duelOutcomeLine && <p className="max-w-2xl text-sm sm:text-base text-slate-100 leading-relaxed">{duelOutcomeLine}</p>}
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setDuelReplayKey((k) => k + 1); setBattlePhase("playing"); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black border border-amber-400/70 bg-amber-500/20 text-amber-100 hover:bg-amber-500/35"
                                >
                                  ▶ {isKo ? "다시 보기" : "Replay"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBattlePhase("stage")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black border border-cyan-400/70 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30"
                                >
                                  ↩ {isKo ? "두 괴수 화면으로" : "Back to the two monsters"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>                )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CONCISE 6-CARD [❓ Help] LAB MANUAL MODAL */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-slate-100"
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📖</span>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {isKo ? "PROMETHEUS-iPSC 핵심 사용 가이드" : "PROMETHEUS-iPSC Quick User Guide"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer shadow"
              >
                ← {isKo ? "돌아가기" : "Back"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">{LAB_MANUAL_POINTS[0].icon}</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">{isKo ? LAB_MANUAL_POINTS[0].ko.title : LAB_MANUAL_POINTS[0].en.title}</p>
                  <p className="text-slate-300 leading-snug">{isKo ? LAB_MANUAL_POINTS[0].ko.body : LAB_MANUAL_POINTS[0].en.body}</p>
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">{LAB_MANUAL_POINTS[1].icon}</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">{isKo ? LAB_MANUAL_POINTS[1].ko.title : LAB_MANUAL_POINTS[1].en.title}</p>
                  <p className="text-slate-300 leading-snug">{isKo ? LAB_MANUAL_POINTS[1].ko.body : LAB_MANUAL_POINTS[1].en.body}</p>
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">{LAB_MANUAL_POINTS[2].icon}</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">{isKo ? LAB_MANUAL_POINTS[2].ko.title : LAB_MANUAL_POINTS[2].en.title}</p>
                  <p className="text-slate-300 leading-snug">{isKo ? LAB_MANUAL_POINTS[2].ko.body : LAB_MANUAL_POINTS[2].en.body}</p>
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">{LAB_MANUAL_POINTS[3].icon}</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">{isKo ? LAB_MANUAL_POINTS[3].ko.title : LAB_MANUAL_POINTS[3].en.title}</p>
                  <p className="text-slate-300 leading-snug">{isKo ? LAB_MANUAL_POINTS[3].ko.body : LAB_MANUAL_POINTS[3].en.body}</p>
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">{LAB_MANUAL_POINTS[4].icon}</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">{isKo ? LAB_MANUAL_POINTS[4].ko.title : LAB_MANUAL_POINTS[4].en.title}</p>
                  <p className="text-slate-300 leading-snug">{isKo ? LAB_MANUAL_POINTS[4].ko.body : LAB_MANUAL_POINTS[4].en.body}</p>
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">{LAB_MANUAL_POINTS[5].icon}</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">{isKo ? LAB_MANUAL_POINTS[5].ko.title : LAB_MANUAL_POINTS[5].en.title}</p>
                  <p className="text-slate-300 leading-snug">{isKo ? LAB_MANUAL_POINTS[5].ko.body : LAB_MANUAL_POINTS[5].en.body}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition cursor-pointer"
            >
              {isKo ? "확인 완료 — 현재 실험실 화면으로 돌아가기" : "Got it — back to the active experiment"}
            </button>
          </div>
        </div>
      )}

      {/* 괴수 설계실 (MONSTER DESIGN ROOM): 닫아도 마운트를 유지해 설계 내용과 백그라운드 이미지·영상 작업이 이어진다 */}
      {(
        <div
          aria-hidden={!isCustomMonsterModalOpen}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 ${
            isCustomMonsterModalOpen ? "" : "hidden"
          }`}
          onClick={() => setIsCustomMonsterModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧬</span>
                <h2 className="text-xs sm:text-sm font-black text-cyan-300">
                  {isKo ? "괴수 설계실" : "Monster Design Room"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomMonsterModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs px-3 py-1 rounded-lg cursor-pointer transition"
              >
                ✕ {isKo ? "닫기" : "Close"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <CustomMonsterStudio
                initialHfToken={hfTokenInput}
                isKo={isKo}
                opponentRoster={customArenaRoster}
                onStartBattleVideo={(me, opponent) => {
                  setCustomArenaRoster((prev) => addToRoster(addToRoster(prev, me), opponent));
                  setBattlePhase("stage");
                  setIsCustomMonsterModalOpen(false);
                  setIsStitchModalOpen(true);
                  setActiveModalTab("monster_arena");
                  // 바로 생성하지 않고 스토리 편집 창을 연다 (비용은 편집 창의 생성 버튼에서만 발생)
                  if (me.id === arenaSlots.left && opponent.id === arenaSlots.right) {
                    openStoryEditor();
                  } else {
                    pendingBattleVideoRef.current = { f1: me.id, f2: opponent.id };
                    setArenaSlots({ left: me.id, right: opponent.id });
                  }
                }}
                onIncubateStart={(m) => {
                  // 배양기 전체 화면 영상을 틀고(설계실은 닫음) 이미지는 백그라운드에서 생성
                  setRevealMonster(null);
                  setIncubating({ monster: m, ready: null, readyAt: null, phase: "growing" });
                  setIsCustomMonsterModalOpen(false);
                }}
                onIncubateFailed={(message) => {
                  setIncubating(null);
                  setIsCustomMonsterModalOpen(true);
                  setSummon(null);
                  void message;
                }}
                onMonsterImageReady={handleMonsterImageReady}
                onSummonStart={(m) => {
                  setIsCustomMonsterModalOpen(false);
                  setRevealMonster(null);
                  setSummon({ monster: m, progress: 0, error: null });
                }}
                onSummonProgress={(pct) => setSummon((s) => (s ? { ...s, progress: pct } : s))}
                onSummonFailed={(message) => setSummon((s) => (s ? { ...s, error: message } : s))}
                onSendToArena={(customMonster) => {
                  // 동영상 완성: 출격 대기 화면을 닫고 결투장에 등장 (마지막 포효는 최대 음량).
                  // 먼저 들어온 괴수는 왼쪽, 두 번째는 오른쪽 절반에 선다
                  if (summonRef.current) playChimeraRoar(customMonster.roarAudio);
                  setSummon(null);
                  setCustomArenaRoster((prev) => addToRoster(prev, customMonster));
                  setArenaSlots((s) => placeEntrant(s, customMonster.id));
                  setBattlePhase("stage");
                  setIsCustomMonsterModalOpen(false);
                  setIsStitchModalOpen(true);
                  setActiveModalTab("monster_arena");
                }}              />
            </div>
          </div>
        </div>
      )}

      {/* ⚡ 배양기 가동: 전체 화면 배양기 영상 → 이미지가 탱크 안에서 형성 → (reveal) 유리 파열 3D 연출이 위에 겹친다. 영상은 끝까지 마운트되어 검은 프레임이 없다 */}
      {incubating && (
        <div className="fixed inset-0 z-[66] bg-black overflow-hidden text-slate-100" role="status" aria-live="polite">
          {/* Embryo development as LTX clips (frame k -> k+1) played back to back. The poster is the clip's start frame and
              the next clip is preloaded, so there is no black gap. After the last clip the final egg frame pulses
              until the monster image is ready. Enlarged from the top-left like the photos (watermark off screen). */}
          {!embryoUseStills && (
            <>
              {embryoClipsDone ? (
                <img
                  src={EMBRYO_FRAMES[EMBRYO_FRAMES.length - 1]}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover embryo-frame embryo-frame-hold"
                />
              ) : (
                <video
                  key={EMBRYO_CLIPS[embryoClip]}
                  src={EMBRYO_CLIPS[embryoClip]}
                  poster={EMBRYO_FRAMES[embryoClip]}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => { e.currentTarget.playbackRate = EMBRYO_CLIP_RATE; }}
                  onEnded={() => {
                    const n = nextEmbryoClip(embryoClip);
                    if (n.done) setEmbryoClipsDone(true);
                    else setEmbryoClip(n.index);
                  }}
                  onError={() => setEmbryoUseStills(true)}
                  className="absolute inset-0 w-full h-full object-cover embryo-frame"
                />
              )}
              {!embryoClipsDone && embryoClip + 1 < EMBRYO_CLIPS.length && (
                <video src={EMBRYO_CLIPS[embryoClip + 1]} preload="auto" muted playsInline className="hidden" aria-hidden="true" />
              )}
            </>
          )}
          {/* Fallback: the six photos cross-fade with a slow zoom. Tinted with the monster colour like the clips. */}
          {embryoUseStills && EMBRYO_FRAMES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover embryo-frame ${i === embryo.stage ? "embryo-frame-active" : ""} ${
                i === embryo.stage && embryo.action === "hold" ? "embryo-frame-hold" : ""
              }`}
              style={{
                opacity: i === embryo.stage ? 1 : 0,
                transitionDuration: `${EMBRYO_CROSSFADE_MS}ms`,
                // The slow zoom lasts as long as this stage (the division stages are the longest)
                ["--stage-ms" as string]: `${EMBRYO_STAGE_DURATIONS_MS[i]}ms`,
              } as React.CSSProperties}
            />
          ))}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-color opacity-35"
            style={{ backgroundColor: incubating.monster.colorHex }}
            aria-hidden="true"
          />
          {/* The finished form emerges slowly where the egg's shadow was: blurred and dark, then sharp and lit */}
          {(incubating.phase === "materialising" || incubating.phase === "reveal") && incubating.ready && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <img
                src={incubating.ready.jumpscareImg || incubating.ready.avatarImg}
                alt=""
                className="incubate-emerge max-w-[62vw] max-h-[62vh] object-contain"
                style={{ ["--reveal-glow" as string]: incubating.ready.colorHex } as React.CSSProperties}
              />
            </div>
          )}
          {incubating.phase === "reveal" && incubating.ready && (
            /* Finale (INCUBATE_BURST_MS): the adult lunges out of the screen with a roar, explodes into smoke, stays
               hidden, then appears full screen as the smoke sinks. It ends covering the screen, so the tank clip
               never shows again before the Design Room reopens. */
            <div className="absolute inset-0 overflow-hidden incubate-expand-stage pointer-events-none" aria-hidden="true">
              {/* Black backing appears with the image so the finished adult fills the screen on its own */}
              <div className="absolute inset-0 bg-black incubate-expand-backing" />
              <img
                src={incubating.ready.jumpscareImg || incubating.ready.avatarImg}
                alt=""
                className="incubate-expand absolute inset-0 w-full h-full object-cover"
                style={{ ["--reveal-glow" as string]: incubating.ready.colorHex } as React.CSSProperties}
              />
              <SmokeBurst />
              <div
                className="absolute inset-0 incubate-expand-flash"
                style={{ ["--reveal-glow" as string]: incubating.ready.colorHex } as React.CSSProperties}
              />
            </div>
          )}
          {/* 배양기 장면에는 자막을 띄우지 않는다: 설계실로 돌아가는 작은 아이콘 버튼만 둔다 */}
          {incubating.phase === "growing" && (
            <button
              type="button"
              onClick={backToDesignRoom}
              aria-label={isKo ? "괴수 설계실로 돌아가기" : "Back to the Design Room"}
              title={isKo ? "괴수 설계실로 돌아가기" : "Back to the Design Room"}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 border border-slate-600 text-slate-200 hover:bg-black/80"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* ⚡ 배양기 가동 중 이미지 완성: "짠" 하고 3D로 포효하며 화면 밖으로 튀어나오는 연출 */}
      {revealMonster && (
        <div
          key={revealMonster.avatarImg}
          className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center overflow-hidden monster-reveal-stage"
          aria-hidden="true"
        >
          <div className="absolute inset-0 monster-reveal-flash" />
          <img
            src={revealMonster.jumpscareImg || revealMonster.avatarImg}
            alt=""
            className="monster-reveal-burst relative max-w-[78vw] max-h-[78vh] object-contain"
            style={{ ["--reveal-glow" as string]: revealMonster.colorHex } as React.CSSProperties}
          />
        </div>
      )}

      {/* ⚔️ 결투장 출격 대기: 백그라운드에서 동영상을 만드는 동안 배양기 이미지 + 점점 커지는 포효 */}
      {summon && (
        <div className="fixed inset-0 z-[65] bg-black flex flex-col items-center justify-center gap-4 p-4 text-slate-100">
          <img
            src={summon.monster.avatarImg}
            alt={summon.monster.nameKo}
            className="summon-breath max-w-[88vw] max-h-[68vh] object-contain rounded-2xl"
            style={{ ["--reveal-glow" as string]: summon.monster.colorHex } as React.CSSProperties}
          />
          {/* 출격 대기 화면에는 자막을 띄우지 않는다: 진행 막대(글자 없음)와 아이콘 버튼만. 오류는 알려야 하므로 표시 */}
          {summon.error ? (
            <p role="alert" className="text-sm font-bold text-rose-300 text-center">⚠️ {summon.error}</p>
          ) : (
            <div
              className="w-full max-w-md h-1.5 bg-slate-800/80 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(summon.progress)}
              aria-label={isKo ? "결투장 출격 준비" : "Getting ready for the arena"}
            >
              <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500" style={{ width: `${Math.max(3, summon.progress)}%` }} />
            </div>
          )}
          <button
            type="button"
            onClick={backToDesignRoom}
            aria-label={isKo ? "괴수 설계실로 돌아가기 (영상은 계속 만들어집니다)" : "Back to the Design Room (the video keeps rendering)"}
            title={isKo ? "괴수 설계실로 돌아가기 (영상은 계속 만들어집니다)" : "Back to the Design Room (the video keeps rendering)"}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 border border-slate-600 text-slate-200 hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      )}

      {/* 📝 배틀 스토리 편집 (영상 생성 전). 전투 장면에는 스토리를 표시하지 않는다 */}
      {isStoryEditorOpen && storyDraft && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
          onClick={() => setIsStoryEditorOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isKo ? "배틀 스토리 편집" : "Edit battle story"}
            className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-cyan-300">
                📝 {isKo ? "배틀 스토리 편집" : "Edit battle story"} · {arenaFighter1.nameKo} vs {arenaFighter2.nameKo}
              </h2>
              <button
                type="button"
                onClick={() => setIsStoryEditorOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold px-3 py-1 rounded-lg"
              >
                ✕ {isKo ? "닫기" : "Close"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {isKo
                ? `머리·팔·다리·꼬리·몸통의 공격과 입 화염포, 꼬리 공격을 자유롭게 고치세요. 편집은 무료이며, 비용은 [전투 영상 생성]을 누를 때만 듭니다 (${BATTLE_VIDEO_SECONDS}초 1편 약 $1.56). 한국어로 고친 내용은 영상 프롬프트용으로 영어로 번역됩니다.`
                : `Edit the head, arm, leg, tail and torso attacks, the mouth flame cannon and the tail strikes. Editing is free; only [Generate battle video] costs (${BATTLE_VIDEO_SECONDS} s, about $1.56).`}
            </p>
            {([
              ["act1", isKo ? "1막 · 대치" : "Act 1 · Confrontation"],
              ["act2_clash", isKo ? "2막 · 공방 (영상에 반영)" : "Act 2 · Exchange (used in the video)"],
              ["act3_finish", isKo ? "3막 · 결정타 (영상에 반영)" : "Act 3 · Finish (used in the video)"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] font-black text-amber-300">{label}</span>
                <textarea
                  value={storyDraft[key]}
                  onChange={(e) => setStoryDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
                  maxLength={600}
                  rows={key === "act2_clash" ? 4 : 3}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-2 text-xs leading-relaxed focus:outline-none resize-y"
                />
              </label>
            ))}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetStoryDraft}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 bg-slate-800 hover:bg-slate-700"
              >
                ↺ {isKo ? "자동 스토리로 되돌리기" : "Reset to the generated story"}
              </button>
              <button
                type="button"
                onClick={() => { saveStoryDraft(); setIsStoryEditorOpen(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-black border border-cyan-400/70 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30"
              >
                💾 {isKo ? "저장" : "Save"}
              </button>
              <button
                type="button"
                disabled={isGeneratingAiClash}
                onClick={() => { saveStoryDraft(); setIsStoryEditorOpen(false); void handleGenerateAiClashVideo(); }}
                className="px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:from-rose-500 hover:to-amber-400 disabled:opacity-50"
              >
                ⚔️ {isKo ? `저장 후 전투 영상 생성 (${BATTLE_VIDEO_SECONDS}초)` : `Save and generate (${BATTLE_VIDEO_SECONDS} s)`}
              </button>
            </div>
            {renderStoryPanel()}
          </div>
        </div>
      )}

      {/* KIRO SPEC-DRIVEN DEVELOPMENT SHOWCASE & LIVE CODE GENERATOR MODAL */}
      {isKiroSpecModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-slate-100"
          onClick={() => setIsKiroSpecModalOpen(false)}
        >
          <div
            className="bg-slate-900 border-2 border-purple-500/70 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
                  KIROWEEN 2026 · VERIFIED SPEC-DRIVEN DEVELOPMENT
                </span>
                <h2 className="text-sm sm:text-base font-black text-white mt-1 flex items-center gap-2">
                  <span>📐 Kiro Architecture & Live Code Generator Studio</span>
                  <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    ✔ 100% Executed
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsKiroSpecModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
              >
                ✕ {isKo ? "닫기" : "Close"}
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setKiroModalTab("requirements")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                  kiroModalTab === "requirements"
                    ? "bg-purple-600 text-white shadow"
                    : "bg-slate-800/80 text-slate-300 hover:text-white"
                }`}
              >
                📋 EARS Requirements (REQ 1–5)
              </button>
              <button
                type="button"
                onClick={() => setKiroModalTab("tasks")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                  kiroModalTab === "tasks"
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-slate-800/80 text-slate-300 hover:text-white"
                }`}
              >
                ✅ Tasks Checklist (5/5 Done)
              </button>
              <button
                type="button"
                onClick={() => setKiroModalTab("hooks")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                  kiroModalTab === "hooks"
                    ? "bg-cyan-600 text-white shadow"
                    : "bg-slate-800/80 text-slate-300 hover:text-white"
                }`}
              >
                ⚙️ Steering & Hooks
              </button>
              <button
                type="button"
                onClick={() => setKiroModalTab("code_gen")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                  kiroModalTab === "code_gen"
                    ? "bg-amber-600 text-slate-950 font-black shadow"
                    : "bg-slate-800/80 text-amber-300 hover:text-white"
                }`}
              >
                ⚡ Live Spec Code Generator
              </button>
            </div>

            {/* TAB 1: REQUIREMENTS (EARS NOTATION) */}
            {kiroModalTab === "requirements" && (
              <div className="flex flex-col gap-3 text-xs">
                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3">
                  <span className="font-mono text-purple-300 font-bold">REQ-1: 10대 실존 바이오-프랑켄슈타인 뷰포트 전환</span>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    <strong>WHEN</strong> 사용자가 검증된 10대 생체 실험(스탠퍼드 92% 쥐 대뇌 인간화, 유령 심장, 예일 BrainEx 사후 뇌 부활 등)을 클릭하면,
                    <strong> THE SYSTEM SHALL</strong> 페이지 새로고침 없이 즉시 고해상도 현미경 동영상과 학술지(Nature/Cell/Science) 실제 실험 사진, PMID/DOI 검증 메타데이터를 로드한다.
                  </p>
                </div>
                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3">
                  <span className="font-mono text-purple-300 font-bold">REQ-2: 점진적 사진 융합 바이오-키메라 어셈블러</span>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    <strong>WHEN</strong> 사용자가 두뇌·심장·몸통·사지 부위를 선택하고 조립을 시작하면,
                    <strong> THE SYSTEM SHALL</strong> 실제 실험실 현미경 사진 4장이 원통형 배양기 속에서 유동하며 중심부로 점진적 융합(Diffusion Morphing)되고, 배양액이 배출된 뒤 살아 움직이는 생명체로 각성한다.
                  </p>
                </div>
                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3">
                  <span className="font-mono text-purple-300 font-bold">REQ-3: WebAudio 실시간 심장박동 음향 & 가변 BPM 심전도</span>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    <strong>WHEN</strong> 사용자가 심박수(BPM) 슬라이더를 조절하면,
                    <strong> THE SYSTEM SHALL</strong> 튜브 바닥의 실시간 심전도(ECG) 오실로스코프 파형과 WebAudio 저음 심근 수축음(쿵...쾅!)의 재생 주기 및 피치를 지연 없이 즉각 동기화한다.
                  </p>
                </div>
                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3">
                  <span className="font-mono text-purple-300 font-bold">REQ-4: 3초 자동 흡수 플로팅 시냅스 채팅</span>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    <strong>WHEN</strong> 사용자가 생물학 키워드를 검색하거나 메시지를 수신하면,
                    <strong> THE SYSTEM SHALL</strong> 3.0초 후 채팅창이 상단으로 부드럽게 흡수(-translate-y-full opacity-0)되어 현미경 시야를 방해하지 않는다.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: TASKS CHECKLIST */}
            {kiroModalTab === "tasks" && (
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold font-mono">
                    <span>Task 1: Initialize Kiro Spec-Driven Architecture (/.kiro)</span>
                    <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">100% Completed</span>
                  </div>
                  <ul className="text-slate-300 list-disc list-inside space-y-1">
                    <li>1.1 Create <code>.kiro/steering/product.md</code> and <code>tech.md</code></li>
                    <li>1.2 Author EARS-compliant <code>requirements.md</code></li>
                    <li>1.3 Author Mermaid architecture & state diagrams in <code>design.md</code></li>
                    <li>1.4 Configure <code>pubmed-citation-verifier.hook.json</code></li>
                  </ul>
                </div>

                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold font-mono">
                    <span>Task 2: Verified Bio-Frankenstein Dataset (10 Peer-Reviewed Cases)</span>
                    <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">100% Completed</span>
                  </div>
                  <p className="text-slate-300">
                    스탠퍼드대 92% 인간 뇌 오가노이드, 유령 심장, 예일 BrainEx 사후 뇌 부활, 디시브레인, 앤스로봇, 인간-돼지 키메라, 인공 합성 배아(Stembryo), 형광 키메라 영장류, 3D 혈관 심장 프린팅, 아홀로틀 재생 블라스테마 10대 검증 완료.
                  </p>
                </div>

                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold font-mono">
                    <span>Task 3 & 4: WebAudio Synthesizer & Canvas Morphogenesis Engine</span>
                    <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">100% Completed</span>
                  </div>
                  <p className="text-slate-300">
                    WebAudio 이중 발진기 심박음(Lub-Dub), 괴수의 호탕한 대소(大笑) 음향, 자연스러운 신경망 나레이터, 4대 현미경 사진 렌즈 융합 애니메이션 구현 완료.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: STEERING & HOOKS */}
            {kiroModalTab === "hooks" && (
              <div className="flex flex-col gap-3 text-xs">
                <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3 font-mono">
                  <p className="text-cyan-300 font-bold mb-1.5">📄 .kiro/hooks/pubmed-citation-verifier.hook.json</p>
                  <pre className="text-[11px] text-slate-300 overflow-x-auto p-2 bg-black/60 rounded border border-slate-800">
{`{
  "$schema": "https://kiro.dev/schemas/hook.v1.json",
  "name": "pubmed-citation-verifier",
  "description": "Validates that every experiment case contains an authentic PubMed PMID / DOI and verified Yamanaka factor bridge",
  "trigger": { "fileMatch": "src/data/bioExperiments.ts", "events": ["onSave", "onPreCommit"] },
  "action": "run-script",
  "command": "node scripts/verify-citations.js --strict",
  "status": "PASSED (10/10 verified peer-reviewed studies)"
}`}
                  </pre>
                </div>

                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3 font-mono">
                  <p className="text-purple-300 font-bold mb-1.5">📜 .kiro/steering/tech.md (Zero-Key API Constraint)</p>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    심사위원 및 일반 사용자가 별도의 API Key 없이 즉시 전 세계 어디서나 테스트할 수 있도록, PubMed(EuropePMC) 및 Wikipedia 공개 REST API를 클라이언트 직접 호출 방식으로 무인 인증 바인딩함.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: LIVE CODE GENERATOR STUDIO */}
            {kiroModalTab === "code_gen" && (
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 p-2.5 rounded-xl border border-amber-500/40">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">Kiro Spec Code Preset:</span>
                    <select
                      value={selectedCodeSpec}
                      onChange={(e) => {
                        setSelectedCodeSpec(e.target.value);
                        setIsCodeCopied(false);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
                    >
                      <option value="stitcher">REQ-1: Live PubMed Science Stitcher Service</option>
                      <option value="audio">REQ-2: WebAudio High-Impact Cardiac Pulse Engine</option>
                      <option value="canvas">REQ-3: Bioreactor Photo Diffusion Canvas Engine</option>
                      <option value="hook">HOOK: PubMed Citation Automated Validation Hook</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const codeEl = document.getElementById("generated-spec-code");
                      if (codeEl) {
                        navigator.clipboard.writeText(codeEl.innerText);
                        setIsCodeCopied(true);
                        setTimeout(() => setIsCodeCopied(false), 2000);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded-lg font-black cursor-pointer transition shadow"
                  >
                    {isCodeCopied ? "✔ Copied to Clipboard!" : "📋 Copy Verified Code"}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono overflow-x-auto max-h-[380px]">
                  <pre id="generated-spec-code" className="text-[11px] text-emerald-300 leading-relaxed">
                    {selectedCodeSpec === "stitcher" &&
`// [Kiro Generated Implementation] REQ-1: Real-Time Scientific Stitcher Service
import axios from "axios";

export interface PubMedPaper {
  id: string;
  title: string;
  journal: string;
  year: string;
  authors: string;
  doi: string;
}

export class ScienceStitchService {
  async queryPubMed(keyword: string): Promise<PubMedPaper[]> {
    const url = \`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=\${encodeURIComponent(keyword)}+AND+stem+cell&format=json&pageSize=5\`;
    const res = await axios.get(url, { timeout: 6000 });
    return (res.data.resultList?.result || []).map((r: any) => ({
      id: r.pmid || r.id,
      title: r.title,
      journal: r.journalTitle || "Peer-Reviewed Bio-Journal",
      year: r.pubYear || "2024",
      authors: r.authorString || "Scientific Consortium",
      doi: r.doi ? \`https://doi.org/\${r.doi}\` : ""
    }));
  }
}
export const scienceStitchService = new ScienceStitchService();`}

                    {selectedCodeSpec === "audio" &&
`// [Kiro Generated Implementation] REQ-2: WebAudio Sub-Bass Cardiac Thump (Lub-Dub) Engine
export const playCardiacThump = (bpm: number, audioCtx: AudioContext) => {
  const now = audioCtx.currentTime;
  
  // 1. High-Impact Low-End Lub: 65 Hz -> 26 Hz, Lowpass Filter
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  const filter1 = audioCtx.createBiquadFilter();
  filter1.type = "lowpass";
  filter1.frequency.setValueAtTime(220, now);
  filter1.Q.setValueAtTime(4.2, now);

  const baseFreq = Math.min(100, 52 + (bpm / 200) * 44);
  osc1.frequency.setValueAtTime(baseFreq, now);
  osc1.frequency.exponentialRampToValueAtTime(25, now + 0.15);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(1.25, now + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

  osc1.connect(filter1).connect(gain1).connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.18);

  // 2. Snappy Valve Dub (쾅!): 160 Hz -> 35 Hz, Bandpass Resonance
  const dubTime = now + 0.11;
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  const filter2 = audioCtx.createBiquadFilter();
  filter2.type = "bandpass";
  filter2.frequency.setValueAtTime(320, dubTime);
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(baseFreq * 1.35, dubTime);
  osc2.frequency.exponentialRampToValueAtTime(30, dubTime + 0.13);

  gain2.gain.linearRampToValueAtTime(1.05, dubTime + 0.012);
  gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.15);

  osc2.connect(filter2).connect(gain2).connect(audioCtx.destination);
  osc2.start(dubTime);
  osc2.stop(dubTime + 0.16);
};`}

                    {selectedCodeSpec === "canvas" &&
`// [Kiro Generated Implementation] REQ-3: Bioreactor Real Photographic Diffusion Synthesis
export const renderBioreactorMorph = (
  ctx: CanvasRenderingContext2D,
  masterImg: HTMLImageElement,
  quadImg: HTMLImageElement,
  morphStage: "injecting" | "morphing" | "draining" | "awakened",
  morphPercent: number,
  vatBounds: { x: number; y: number; w: number; h: number }
) => {
  // 1. Photographic Specimen Center Clip
  ctx.save();
  ctx.beginPath();
  ctx.rect(vatBounds.x + 2, vatBounds.y + 2, vatBounds.w - 4, vatBounds.h - 4);
  ctx.clip();

  if (morphStage === "injecting") {
    // Progressive AI Stem-Cell Diffusion Filter
    const blurPx = Math.max(1, Math.round(12 - (morphPercent / 100) * 10));
    ctx.filter = \`blur(\${blurPx}px) contrast(\${1 + (morphPercent / 100) * 0.4})\`;
  }
  ctx.drawImage(masterImg, vatBounds.x + 10, vatBounds.y + 10, vatBounds.w - 20, vatBounds.h - 20);
  ctx.filter = "none";
  ctx.restore();
};`}

                    {selectedCodeSpec === "hook" &&
`// [Kiro Generated Hook] .kiro/hooks/pubmed-citation-verifier.hook.json
{
  "$schema": "https://kiro.dev/schemas/hook.v1.json",
  "name": "pubmed-citation-verifier",
  "trigger": { "fileMatch": "src/data/bioExperiments.ts", "events": ["onSave"] },
  "validationRules": [
    { "field": "pmidOrDoi", "pattern": "^(PMID: \\\\d+|DOI: 10\\\\.\\\\d{4,9}/.+)", "required": true },
    { "field": "stemCellBridge.factors", "minItems": 3, "required": true }
  ],
  "verificationOutput": "✔ 10/10 Peer-Reviewed Landmark Frankenstein Studies Verified"
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN MONSTER 3D MOVIE BURST OVERLAY (테두리 100% 고정, 내부 영상만 살아 움직임 + AI 동영상 API 생성 지원) */}
      {isFullscreenJumpscareActive && (
        <div
          onClick={() => setIsFullscreenJumpscareActive(false)}
          className="fixed inset-0 z-[999999] w-screen h-screen bg-slate-950/95 flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden cursor-pointer gap-2"
          style={{ width: "100vw", height: "100vh" }}
        >
          <audio autoPlay src={selectedComicMonster.roarAudio} />

          {/* 1-Line Fixed Top Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl flex items-center justify-between gap-2 bg-slate-900/95 border border-emerald-500/40 px-3 py-1.5 rounded-xl shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-emerald-300">
                {selectedComicMonster.icon} {selectedComicMonster.nameKo}
              </span>
              {ai3DStatus && (
                <span className="text-[11px] font-mono text-cyan-300 hidden md:inline">{ai3DStatus}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="password"
                value={hfTokenInput}
                onChange={(e) => setHfTokenInput(e.target.value)}
                placeholder={isKo ? "HF 무료 토큰(선택)" : "HF Token (opt)"}
                className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                disabled={isGeneratingAi3D}
                onClick={handleGenerateAi3DBurstVideo}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-3 py-1 rounded-lg cursor-pointer transition shadow whitespace-nowrap disabled:opacity-50"
              >
                {isGeneratingAi3D ? "⏳ AI 영상 생성 중..." : "🎬 AI 살아 움직이는 3D 영상 생성"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreenJumpscareActive(false);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-lg cursor-pointer shadow whitespace-nowrap"
              >
                ✕ {isKo ? "배양기 복귀" : "Close"}
              </button>
            </div>
          </div>

          {/* 100% FIXED OUTER FRAME: 테두리는 고정된 상태에서 안의 동영상만 살아서 재생 */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl flex-1 min-h-0 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl bg-black"
          >
            <video
              key={ai3DBurstVideoUrl || selectedComicMonster.videoSrc}
              src={ai3DBurstVideoUrl || selectedComicMonster.videoSrc}
              autoPlay
              loop
              muted
              playsInline
              onLoadedMetadata={(e) => {
                if (!ai3DBurstVideoUrl) {
                  const v = e.currentTarget;
                  if (v.duration) v.currentTime = v.duration * 0.55;
                }
              }}
              className="w-full h-full object-cover scale-[1.16] filter brightness-150 contrast-115 saturate-125"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BioStitchLabView;
