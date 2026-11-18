import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";
import { translateTextToLanguage } from "./scienceStitchService";
import { generateMonsterVideo } from "./videoGenService";
import { LTX_MAX_WAIT_MS, prepareImageForLtx } from "./ltxJobClient";
import { HF_IMAGE_URL, MAX_IMAGE_PROMPT_CHARS, hfImageRequestBody } from "../utils/hfImage";

export interface MonsterBodyParts {
  head: string;
  hornsOrCrown: string;
  torso: string;
  arms: string;
  legs: string;
  tail: string;
  auraAndSkin: string;
}

export interface MonsterStudioPreset {
  id: string;
  nameKo: string;
  nameEn: string;
  icon: string;
  colorHex: string;
  baseImageSrc: string;
  defaultParts: MonsterBodyParts;
}

export const MONSTER_STUDIO_PRESETS: MonsterStudioPreset[] = [
  {
    id: "myth_dragon",
    nameKo: "화염룡 드래곤",
    nameEn: "Pyroclastic Dragon",
    icon: "🐉",
    colorHex: "#f97316",
    baseImageSrc: "/images/samples/myth_dragon.jpg",
    defaultParts: {
      head: "날카로운 송곳니가 드러난 긴 주둥이와 용암처럼 빛나는 황금빛 눈을 가진 용의 머리",
      hornsOrCrown: "머리 뒤로 휘어진 검은 흑요석 쌍뿔과 목을 따라 솟은 붉은 가시 갈기",
      torso: "붉게 달아오른 틈이 갈라진 숯검정 비늘로 덮인 거대한 몸통",
      arms: "등에서 펼쳐진 거대한 박쥐 날개 한 쌍과 굵은 발톱이 달린 앞발",
      legs: "땅을 딛고 선 두꺼운 파충류 뒷다리와 날카로운 발톱",
      tail: "끝에 창날 모양 가시가 달린 길고 묵직한 비늘 꼬리",
      auraAndSkin: "비늘 틈새로 새어 나오는 붉은 마그마 빛과 주위를 떠도는 불티",
    },
  },
  {
    id: "myth_kraken",
    nameKo: "심해 거수 크라켄",
    nameEn: "Abyssal Kraken",
    icon: "🐙",
    colorHex: "#8b5cf6",
    baseImageSrc: "/images/samples/myth_kraken.jpg",
    defaultParts: {
      head: "거대한 대왕문어의 부풀어 오른 보라색 머리와 노랗게 빛나는 커다란 눈 두 개, 촉수 가운데 숨은 날카로운 부리",
      hornsOrCrown: "머리 위로 솟은 보랏빛 발광 가시 볏",
      torso: "흉터투성이의 두꺼운 보라색 문어 외투막 몸통",
      arms: "흡반과 갈고리 가시로 뒤덮인 굵고 긴 보라색 문어 촉수 여덟 개가 사방으로 휘몰아치는 모습",
      legs: "바닥을 움켜쥐고 거대한 몸을 들어 올리는 굵은 촉수들",
      tail: "몸 뒤로 채찍처럼 휘어진 가장 긴 촉수 두 개",
      auraAndSkin: "흡반을 따라 청록색으로 빛나는 점액질 보라색 피부와 주위에 소용돌이치는 물살",
    },
  },
  {
    id: "alien_xenomorph",
    nameKo: "제노모프 바이오 타이탄",
    nameEn: "Xenomorph Bio-Titan",
    icon: "👽",
    colorHex: "#10b981",
    baseImageSrc: "/images/samples/alien_xenomorph.jpg",
    defaultParts: {
      head: "뒤로 길게 뻗은 매끈한 검은 두개골과 눈 없는 얼굴, 은빛 이빨 사이로 나오는 작은 안쪽 턱",
      hornsOrCrown: "등을 따라 솟은 검은 관 모양 돌기 네 개",
      torso: "갈비뼈 모양 외골격이 드러난 마르고 긴 검은 몸통",
      arms: "긴 손가락 끝에 면도날 발톱이 달린 가늘고 긴 팔",
      legs: "역관절로 꺾인 길고 날렵한 다리",
      tail: "끝에 칼날이 달린 길고 마디진 검은 꼬리",
      auraAndSkin: "형광 연두색 산성 침이 흐르는 젖은 흑요석 키틴 외피",
    },
  },
  {
    id: "alien_void_slug",
    nameKo: "보이드 어비스 레비아탄",
    nameEn: "Void Abyss Leviathan",
    icon: "🛸",
    colorHex: "#06b6d4",
    baseImageSrc: "/images/samples/alien_void_slug.jpg",
    defaultParts: {
      head: "빛나는 시안색 눈 여섯 개와 바늘 이빨이 겹겹이 늘어선 거대한 입을 벌린 바다뱀 머리",
      hornsOrCrown: "머리 뒤로 뻗은 반투명 발광 가시 지느러미 왕관",
      torso: "S자로 크게 휘감긴 길고 굵은 반투명 바다뱀 몸통, 속에서 빛나는 장기가 비침",
      arms: "몸통 앞쪽 양옆에서 펼쳐진 날개 같은 거대한 가슴지느러미 한 쌍",
      legs: "몸통 아래를 따라 이어진 물결치는 긴 지느러미",
      tail: "끝이 넓은 노처럼 퍼진 길고 반투명한 꼬리지느러미",
      auraAndSkin: "깊은 바닷속 어둠에서 시안색과 에메랄드색으로 빛나는 반투명한 푸른 비늘 피부",
    },
  },
  {
    id: "myth_frankenstein",
    nameKo: "모던 바이오 프랑켄슈타인",
    nameEn: "Modern Bio-Frankenstein",
    icon: "🧟",
    colorHex: "#38bdf8",
    baseImageSrc: "/images/samples/myth_frankenstein.jpg",
    defaultParts: {
      head: "평평하고 각진 이마에 굵은 수술 봉합선이 있는 창백한 거인 괴물의 얼굴과 빛나는 주황색 눈",
      hornsOrCrown: "목을 감싼 푸른빛 금속 전극 고리와 케이블",
      torso: "흉터와 봉합선으로 이어 붙인 근육질 거구 상체",
      arms: "봉합선과 금속 고리가 감긴 굵고 긴 팔과 큰 주먹",
      legs: "검은 바지를 입은 굵은 다리",
      tail: "등에서 늘어진 굵은 전선 케이블",
      auraAndSkin: "창백한 회녹색 피부 주위로 튀는 푸른 번개 줄기",
    },
  },
  {
    id: "human_prometheus",
    nameKo: "합성 인간 호모 프로메테우스",
    nameEn: "Homo Prometheus",
    icon: "🧬",
    colorHex: "#34d399",
    baseImageSrc: "/images/samples/human_prometheus.jpg",
    defaultParts: {
      head: "빛나는 에메랄드색 눈과 강철 같은 턱을 가진 민머리 강화 인간 전사의 머리",
      hornsOrCrown: "관자놀이에서 뒤로 뻗은 금빛 금속 센서 돌기",
      torso: "가슴 한가운데 빛나는 인공 심장이 비치는 투명 흉갑을 두른 근육질 상체",
      arms: "주먹에 생체 강철 너클이 돋은 굵은 근육질 양팔",
      legs: "무릎 장갑을 두른 탄탄한 근육질 두 다리",
      tail: "척추를 따라 빛나는 에메랄드색 줄",
      auraAndSkin: "녹색 빛 혈관이 비치는 반투명한 합성 피부",
    },
  },
];

export interface MonsterBioStats {
  atk: number;
  def: number;
  spd: number;
  regen: number;
  energy: number;
  elementLabelKo: string;
  elementLabelEn: string;
}

export function computeMonsterBioStats(description: string): MonsterBioStats {
  const d = description.toLowerCase();
  let atk = 68;
  let def = 65;
  let spd = 64;
  let regen = 62;
  let energy = 70;

  if (/(송곳니|발톱|칼날|창날|이중\s*턱|독침|강철|방사|포식)/.test(d)) atk += 22;
  if (/(갑옷|비늘|외골격|흑요석|흉곽|껍질|장갑|두꺼운)/.test(d)) def += 24;
  if (/(날개|역관절|유영|지느러미|민첩|추진|도약|채찍)/.test(d)) spd += 25;
  if (/(재생|줄기세포|블라스테마|봉합|심장|회복|불사|미토콘드리아)/.test(d)) regen += 26;
  if (/(화염|용암|마그마|전기|스파크|볼트|생체\s*발광|산성|형광|우주)/.test(d)) energy += 24;

  const clamp = (n: number) => Math.min(99, Math.max(40, n));
  let elementLabelKo = "생체 키메라형";
  let elementLabelEn = "Bio-Chimera";
  if (/(화염|용암|마그마|불꽃)/.test(d)) {
    elementLabelKo = "초고온 마그마·화염형";
    elementLabelEn = "Pyroclastic Magma";
  } else if (/(전기|번개|스파크|볼트)/.test(d)) {
    elementLabelKo = "고전압 바이오·전격형";
    elementLabelEn = "High-Volt Bio-Electric";
  } else if (/(심해|촉수|크라켄|흡반)/.test(d)) {
    elementLabelKo = "심해 수압·생체발광형";
    elementLabelEn = "Abyssal Bioluminescent";
  } else if (/(산성|키틴|제노|외계)/.test(d)) {
    elementLabelKo = "초강산 키틴 포식형";
    elementLabelEn = "Acidic Chitin Apex";
  }

  return {
    atk: clamp(atk),
    def: clamp(def),
    spd: clamp(spd),
    regen: clamp(regen),
    energy: clamp(energy),
    elementLabelKo,
    elementLabelEn,
  };
}

export function composeDescriptionFromParts(
  preset: MonsterStudioPreset,
  parts: MonsterBodyParts,
): string {
  return [
    `[베이스 종족: ${preset.nameKo}]`,
    `• 머리: ${parts.head}`,
    `• 뿔·왕관·전극: ${parts.hornsOrCrown}`,
    `• 몸통: ${parts.torso}`,
    `• 팔·촉수·날개: ${parts.arms}`,
    `• 다리·하체: ${parts.legs}`,
    `• 꼬리·후면: ${parts.tail}`,
    `• 피부·오라: ${parts.auraAndSkin}`,
  ].join("\n");
}

function detectVisualTheme(description: string, fallbackHex: string) {
  const lower = description.toLowerCase();
  if (/(화염|용암|불꽃|마그마|드래곤|fire|flame|lava)/.test(lower)) {
    return { primary: "#f97316", secondary: "#ef4444", particleMode: "ember" as const };
  }
  if (/(전기|번개|스파크|볼트|프랑켄|electric|volt|spark)/.test(lower)) {
    return { primary: "#38bdf8", secondary: "#a855f7", particleMode: "electric" as const };
  }
  if (/(심해|바다|물|크라켄|보라|촉수|abyss|kraken|tentacle)/.test(lower)) {
    return { primary: "#a855f7", secondary: "#06b6d4", particleMode: "bubble" as const };
  }
  if (/(산성|키틴|제노|독|외계|acid|xenomorph|chitin)/.test(lower)) {
    return { primary: "#10b981", secondary: "#84cc16", particleMode: "spore" as const };
  }
  return { primary: fallbackHex || "#10b981", secondary: "#22d3ee", particleMode: "spore" as const };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Left-right mirror of an image as a JPEG data URL; null when the image cannot be loaded or drawn. */
export async function mirrorImageDataUrl(src: string): Promise<string | null> {
  try {
    const img = await loadImageElement(src);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0,
) {
  const imgRatio = img.width / Math.max(1, img.height);
  const canvasRatio = w / h;
  let drawW = w;
  let drawH = h;
  if (imgRatio > canvasRatio) {
    drawH = h * scale;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * scale;
    drawH = drawW / imgRatio;
  }
  const dx = (w - drawW) / 2 + offsetX;
  const dy = (h - drawH) / 2 + offsetY;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type MonsterCombatStats = Pick<MonsterBioStats, "atk" | "def" | "spd" | "regen" | "energy">;

function statTier(value: number, low: string, mid: string, high: string): string {
  return value >= 80 ? high : value >= 60 ? mid : low;
}

/** Pure: turns combat stats into visual English cues that always carry the literal ATK/DEF/SPD/REGEN/ENERGY values. */
export function describeStatsForPrompt(stats: MonsterCombatStats): string {
  const cues = [
    statTier(stats.atk, "restrained claws", "sharp predatory claws and fangs", "razor-sharp apex claws and fangs, aggressive attack stance"),
    statTier(stats.def, "thin exposed skin", "layered armored plating", "massive thick armored carapace"),
    statTier(stats.spd, "heavy grounded build", "athletic agile build", "lean hyper-agile build poised to lunge"),
    statTier(stats.regen, "scarred wounds", "visible regenerating tissue", "rapidly regenerating glowing flesh"),
    statTier(stats.energy, "dim glow", "pulsing bioluminescence", "intense crackling energy aura"),
  ];
  return `${cues.join(", ")} (combat stats ATK ${stats.atk}, DEF ${stats.def}, SPD ${stats.spd}, REGEN ${stats.regen}, ENERGY ${stats.energy})`;
}

/** Pure: the visual cues of the stats, without the numbers (numbers in an image prompt tend to be drawn as text). */
export function statCuesForImage(stats: MonsterCombatStats): string {
  return describeStatsForPrompt(stats).replace(/\s*\(combat stats[^)]*\)\s*$/, "");
}

/** Max length of the design part of the image prompt (the model weighs the first part of a long prompt most). */
export const MAX_IMAGE_DESIGN_CHARS = 700;

export { HF_IMAGE_MODEL, IMAGE_NEGATIVE_PROMPT } from "../utils/hfImage";

/** Opening of every image prompt; also how the battle prompt recognises the current format. */
export const IMAGE_PROMPT_HEAD = "Full-body shot of a single";

// "[베이스 종족: …]" / "[Base species: …]" lines carry no look; "• 머리: …" / "• Head: …" labels name the field,
// and their translation ("Arms, Tentacles, Wings") put tentacles on dragons.
const BRACKET_LINE = /^\s*\[[^\]]*\]\s*$/;
const PART_LABEL = /^\s*[•·\-*]\s*[^:：\n]{1,40}[:：]\s*/;

/** Pure: removes the field labels and the base-species line, keeping one design phrase per line. */
export function stripPartLabels(description: string): string {
  return description
    .split("\n")
    .filter((line) => !BRACKET_LINE.test(line))
    .map((line) => line.replace(PART_LABEL, "").trim())
    .filter(Boolean)
    .join("\n");
}

/** Cuts at a word boundary so the model never sees half a word. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, "");
}

/**
 * Pure: the English image prompt from the translated per-part description and the stats.
 * Three parts split by ";" (head / design / stat cues) then a fixed scene; the battle prompt reads the design part.
 * Full body, side three-quarter view facing right: the battle first frame mirrors the right fighter so the two face
 * each other, and a front-facing close-up makes the video model attack the camera.
 */
export function composeEnglishMonsterPrompt(
  presetNameEn: string,
  translatedDescription: string,
  stats?: MonsterCombatStats,
): string {
  const design = cutAtWord(
    stripPartLabels(translatedDescription)
      .split("\n")
      .map((l) => l.replace(/[;]+/g, ",").replace(/[.\s]+$/, "").trim())
      .filter(Boolean)
      .join(", ")
      .replace(/\s+/g, " ")
      .trim(),
    MAX_IMAGE_DESIGN_CHARS,
  );
  const name = presetNameEn.replace(/[;]+/g, " ").trim() || "bio-engineered";
  const parts = [
    `${IMAGE_PROMPT_HEAD} colossal ferocious ${name} monster in a powerful aggressive battle stance, its whole body visible from head to toe inside the frame, side three-quarter view facing right`,
    design || "a hulking bio-engineered creature",
  ];
  if (stats) parts.push(statCuesForImage(stats));
  parts.push(
    // Bright key light: with only rim light on a dark set every creature came out as a black silhouette.
    "bright cinematic key light showing its true colours and details clearly, dark sci-fi arena background, sharp focus, highly detailed fantasy creature concept art, no text, no letters",
  );
  return parts.join("; ");
}

export async function buildEnglishMonsterPrompt(
  preset: MonsterStudioPreset,
  description: string,
  stats?: MonsterCombatStats,
): Promise<string> {
  // Labels are removed before translating, so the translator never sees them.
  const translated = await translateTextToLanguage(stripPartLabels(description), "en", "ko");
  return composeEnglishMonsterPrompt(preset.nameEn, translated, stats);
}

export const POLLINATIONS_ATTEMPTS = 2;
export const POLLINATIONS_TIMEOUT_MS = 45000;
const POLLINATIONS_RETRY_DELAY_MS = 4000;
export const IMAGE_SIZE_PX = 1024;

/** Pure: the Pollinations FLUX request for a prompt and seed. */
export function pollinationsImageUrl(prompt: string, seed: number): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${IMAGE_SIZE_PX}&height=${IMAGE_SIZE_PX}&model=flux&nologo=true&seed=${seed}`;
}

let seedCounter = 0;

/** Every call gets a different seed: the nonce (time) and a per-call counter are mixed into the description/stat hash. */
export function buildImageSeed(
  description: string,
  stats?: MonsterCombatStats,
  nonce: number = Date.now(),
): number {
  seedCounter = (seedCounter + 1) % 1_000_003;
  const statKey = stats ? `${stats.atk}/${stats.def}/${stats.spd}/${stats.regen}/${stats.energy}` : "";
  return (hashString(`${description}|${statKey}`) + nonce * 31 + seedCounter * 7919) % 2_147_483_647;
}

/** Same-origin server image route; any failure (not configured, cap, credits, timeout) returns null -> fallback. */
export async function fetchServerImage(prompt: string, seed: number, timeoutMs = 55000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, MAX_IMAGE_PROMPT_CHARS), seed }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { imageDataUrl?: unknown } | null;
    const url = data?.imageDataUrl;
    return typeof url === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(url) ? url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImageBlobAsDataUrl(url: string, init?: RequestInit, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(assertAllowedApiEndpoint(url), {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") && blob.size < 2048) {
      throw new Error("Invalid image payload");
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function generateCustomMonsterImage(params: {
  preset: MonsterStudioPreset;
  description: string;
  hfToken?: string;
  stats?: MonsterCombatStats;
}): Promise<{
  imageUrl: string;
  themeHex: string;
  source: "hf" | "pollinations" | "procedural";
  promptEn: string;
  seed: number;
}> {
  const { preset, description, hfToken, stats } = params;
  const theme = detectVisualTheme(description, preset.colorHex);
  const seed = buildImageSeed(description, stats);
  const englishPrompt = await buildEnglishMonsterPrompt(preset, description, stats);

  // 1. HuggingFace SD3 through our server (/api/generate-image, server-side HF_TOKEN): sharper, follows the
  //    description better, supports a negative prompt and has no watermark.
  const serverImage = await fetchServerImage(englishPrompt, seed);
  if (serverImage) {
    return { imageUrl: serverImage, themeHex: theme.primary, source: "hf", promptEn: englishPrompt, seed };
  }

  // 1b. A personal HuggingFace token entered in the browser (optional)
  if (hfToken?.trim()) {
    try {
      const dataUrl = await fetchImageBlobAsDataUrl(
        HF_IMAGE_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken.trim()}`,
            "Content-Type": "application/json",
            Accept: "image/jpeg",
          },
          body: hfImageRequestBody(englishPrompt, seed),
        },
        45000,
      );
      return { imageUrl: dataUrl, themeHex: theme.primary, source: "hf", promptEn: englishPrompt, seed };
    } catch {
      // Fall through to zero-key AI generation
    }
  }

  // 2. Zero-key Real Generative AI Image (Pollinations.ai FLUX) driven by exact body-part prompt.
  // Without model=flux Pollinations uses a weaker default model (dark, face-only results). It often answers 503
  // when busy, so one retry with a short pause.
  const pollinationsUrl = pollinationsImageUrl(englishPrompt, seed);
  for (let attempt = 0; attempt < POLLINATIONS_ATTEMPTS; attempt++) {
    try {
      const dataUrl = await fetchImageBlobAsDataUrl(pollinationsUrl, undefined, POLLINATIONS_TIMEOUT_MS);
      return { imageUrl: dataUrl, themeHex: theme.primary, source: "pollinations", promptEn: englishPrompt, seed };
    } catch {
      if (attempt + 1 < POLLINATIONS_ATTEMPTS) await new Promise((r) => window.setTimeout(r, POLLINATIONS_RETRY_DELAY_MS));
    }
  }
  // Fall through to procedural multi-part mutation canvas (built on the preset's own sample image)

  // 3. Offline / Fallback Procedural Multi-Part Mutation Canvas (visibly varies per prompt)
  const size = 768;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const baseImg = await loadImageElement(preset.baseImageSrc);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, size, size);

  const hueShift = (hashString(description) % 180) - 90;
  ctx.save();
  ctx.filter = `contrast(1.16) saturate(1.3) hue-rotate(${hueShift}deg)`;
  drawCoverImage(ctx, baseImg, size, size, 1.04);
  ctx.restore();

  // Radial bioluminescent aura tint based on body-part description keywords
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.14, size / 2, size / 2, size * 0.56);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.7, `${theme.primary}44`);
  grad.addColorStop(1, "rgba(2, 6, 23, 0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Procedural anatomical accents based on prompt keywords
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const lower = description.toLowerCase();
  // Horns / Crown silhouette
  if (/(뿔|왕관|전극|볼트|horn|crown|bolt)/.test(lower)) {
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(size * 0.36, size * 0.25);
    ctx.quadraticCurveTo(size * 0.24, size * 0.08, size * 0.18, size * 0.14);
    ctx.moveTo(size * 0.64, size * 0.25);
    ctx.quadraticCurveTo(size * 0.76, size * 0.08, size * 0.82, size * 0.14);
    ctx.stroke();
  }
  // Tentacles / Wings / Tail
  if (/(촉수|날개|꼬리|tentacle|wing|tail)/.test(lower)) {
    ctx.strokeStyle = `${theme.primary}cc`;
    ctx.lineWidth = 5;
    for (let t = 0; t < 4; t++) {
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.62);
      ctx.bezierCurveTo(
        size * (0.2 + t * 0.2),
        size * 0.45,
        size * (0.15 + t * 0.24),
        size * 0.85,
        size * (0.08 + t * 0.28),
        size * 0.92,
      );
      ctx.stroke();
    }
  }

  for (let i = 0; i < 42; i++) {
    const px = ((i * 197 + seed) % size);
    const py = ((i * 313 + seed) % size);
    const r = 2 + (i % 6);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? `${theme.primary}aa` : `${theme.secondary}99`;
    ctx.fill();
  }

  if (theme.particleMode === "electric") {
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 2.5;
    for (let arc = 0; arc < 5; arc++) {
      ctx.beginPath();
      let x = 120 + arc * 130;
      let y = 90;
      ctx.moveTo(x, y);
      for (let step = 0; step < 6; step++) {
        x += (step % 2 === 0 ? 1 : -1) * (18 + arc * 4);
        y += 38;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();

  // Volumetric containment glass sheen & targeting calipers
  const glassGrad = ctx.createLinearGradient(0, 0, size, size);
  glassGrad.addColorStop(0, "rgba(255,255,255,0.12)");
  glassGrad.addColorStop(0.25, "rgba(255,255,255,0.02)");
  glassGrad.addColorStop(0.75, "rgba(0,0,0,0)");
  glassGrad.addColorStop(1, `${theme.secondary}26`);
  ctx.fillStyle = glassGrad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = `${theme.primary}cc`;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  return {
    imageUrl: canvas.toDataURL("image/png"),
    themeHex: theme.primary,
    source: "procedural",
    promptEn: englishPrompt,
    seed,
  };
}

// Last generated blob URL per source image; regenerating from the same image revokes the replaced blob.
const blobUrlByImage = new Map<string, string>();

export type MonsterVideoSource = "ltx" | "mediarecorder";

export interface MonsterVideoResult {
  videoUrl: string;
  mimeType: string;
  durationSec: number;
  source: MonsterVideoSource;
  /** Why LTX failed when `source` is "mediarecorder" (shown to the user instead of silently falling back). */
  ltxError?: string;
}

// LTX-2.5 jobs are polled for up to 4 minutes (ltxJobClient); abort the whole attempt a little after that.
const LTX_TIMEOUT_MS = LTX_MAX_WAIT_MS + 30_000;
const LTX_MOTION_SUFFIX =
  "the creature slowly breathes, flexes its limbs and roars, smooth cinematic motion, photorealistic CGI, 4k";

/**
 * Tier 1: official LTX-2.5 fast (1080p) via the server proxy /api/generate-video, as image-to-video from the
 * monster image (text-to-video when the image cannot be downscaled safely). The HuggingFace token is no longer
 * used for video (images still use it). Returns null when unconfigured or failed so the caller can fall back to MediaRecorder.
 */
async function tryGenerateLtxVideo(params: {
  imageUrl: string;
  description: string;
  promptEn?: string;
  imageKey: string;
  signal: AbortSignal;
  onProgress?: (pct: number) => void;
}): Promise<{ url: string | null; error?: string }> {
  const { imageUrl, description, promptEn, imageKey, signal, onProgress } = params;
  try {
    const base =
      promptEn?.trim() ||
      (await translateTextToLanguage(description, "en", "ko")).replace(/\s+/g, " ").trim().slice(0, 600);
    const prepared = await prepareImageForLtx(imageUrl);
    const res = await generateMonsterVideo({
      prompt: `${base}, ${LTX_MOTION_SUFFIX}`,
      provider: "ltx",
      image: prepared?.dataUri,
      aspect: prepared?.aspect ?? "1:1",
      keepBlobUrl: true,
      signal,
      // Typical jobs take about a minute: creep towards 95% and let completion jump to 100%.
      onStatus: (_s, elapsedMs) => onProgress?.(Math.min(95, 5 + Math.round((elapsedMs / 90_000) * 90))),
    });
    if (!res.success || !res.videoUrl) {
      const error = res.error || "LTX video generation failed";
      console.warn(`[customMonsterMedia] LTX failed: ${error}`);
      return { url: null, error };
    }
    const safe = sanitizeVideoUrl(res.videoUrl);
    if (!safe) return { url: null, error: "LTX returned an invalid video URL" };
    if (safe.startsWith("blob:")) {
      const prev = blobUrlByImage.get(imageKey);
      if (prev && prev !== safe) URL.revokeObjectURL(prev);
      blobUrlByImage.set(imageKey, safe);
    }
    return { url: safe };
  } catch (e: any) {
    const error = e?.message || "LTX video generation error";
    console.warn(`[customMonsterMedia] LTX error: ${error}`);
    return { url: null, error };
  }
}

export async function generateVideoFromMonsterImage(params: {
  imageUrl: string;
  description: string;
  accentColor: string;
  durationSec?: number;
  onProgress?: (pct: number) => void;
  hfToken?: string;
  promptEn?: string;
}): Promise<MonsterVideoResult> {
  const { imageUrl, description, promptEn, onProgress } = params;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LTX_TIMEOUT_MS);
  onProgress?.(2);
  let ltx: { url: string | null; error?: string } = { url: null };
  try {
    ltx = await tryGenerateLtxVideo({
      imageUrl,
      description,
      promptEn,
      imageKey: imageUrl,
      signal: controller.signal,
      onProgress,
    });
  } finally {
    clearTimeout(timer);
  }
  if (ltx.url) {
    onProgress?.(100);
    return { videoUrl: ltx.url, mimeType: "video/mp4", durationSec: 6, source: "ltx" };
  }
  const local = await generateMediaRecorderVideo(params);
  return { ...local, source: "mediarecorder", ltxError: ltx.error };
}

async function generateMediaRecorderVideo(params: {
  imageUrl: string;
  description: string;
  accentColor: string;
  durationSec?: number;
  onProgress?: (pct: number) => void;
}): Promise<{ videoUrl: string; mimeType: string; durationSec: number }> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("이 브라우저는 MediaRecorder 동영상 인코딩을 지원하지 않습니다.");
  }

  const { imageUrl, description, accentColor, durationSec = 5, onProgress } = params;
  const imageKey = imageUrl;
  const theme = detectVisualTheme(description, accentColor);
  const width = 640;
  const height = 640;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const img = await loadImageElement(imageUrl);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm")
    ? "video/webm"
    : "";

  const stream = canvas.captureStream(30);
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const particles = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 73) % width,
    y: (i * 137) % height,
    speedY: 0.8 + (i % 5) * 0.45,
    size: 2 + (i % 4),
    phase: i * 0.7,
  }));

  return new Promise((resolve, reject) => {
    recorder.onerror = () => reject(new Error("동영상 인코딩 중 오류가 발생했습니다."));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      const prevUrl = blobUrlByImage.get(imageKey);
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      const videoUrl = URL.createObjectURL(blob);
      blobUrlByImage.set(imageKey, videoUrl);
      onProgress?.(100);
      resolve({
        videoUrl,
        mimeType: mimeType || "video/webm",
        durationSec,
      });
    };

    const startTime = performance.now();
    const totalMs = durationSec * 1000;
    recorder.start(100);

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalMs);
      onProgress?.(Math.round(progress * 98));

      const t = elapsed / 1000;
      // Heartbeat-synced breathing pulse + cinematic camera micro-shake
      const beatWave = Math.pow(Math.max(0, Math.sin(t * 4.2)), 6);
      const breath = 1.05 + Math.sin(t * 2.4) * 0.03 + beatWave * 0.04 + progress * 0.06;
      const driftX = Math.sin(t * 1.1) * 11 + (beatWave > 0.7 ? (Math.sin(t * 55) * 4) : 0);
      const driftY = Math.cos(t * 0.9) * 9 + (beatWave > 0.7 ? (Math.cos(t * 48) * 4) : 0);

      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);
      drawCoverImage(ctx, img, width, height, breath, driftX, driftY);

      // Pulsing bio-aura
      const pulseAlpha = Math.round((0.18 + (Math.sin(t * 3.5) + 1) * 0.1) * 255)
        .toString(16)
        .padStart(2, "0");
      const aura = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.16,
        width / 2,
        height / 2,
        width * 0.54,
      );
      aura.addColorStop(0, "rgba(0,0,0,0)");
      aura.addColorStop(1, `${theme.primary}${pulseAlpha}`);
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);

      // Animated particles (embers / bubbles / spores / electric sparks)
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const p of particles) {
        const py =
          theme.particleMode === "bubble" || theme.particleMode === "ember"
            ? (p.y - t * 42 * p.speedY + height * 10) % height
            : (p.y + Math.sin(t * 2 + p.phase) * 18 + height) % height;
        const px = (p.x + Math.sin(t * 1.8 + p.phase) * 16 + width) % width;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${theme.secondary}cc`;
        ctx.fill();
      }

      if (theme.particleMode === "electric" && Math.sin(t * 12) > 0.25) {
        ctx.strokeStyle = "#bae6fd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let lx = 100 + ((Math.floor(t * 8) * 97) % 420);
        let ly = 40;
        ctx.moveTo(lx, ly);
        for (let s = 0; s < 5; s++) {
          lx += (s % 2 === 0 ? 22 : -22);
          ly += 52;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Subtle moving scanline
      const scanY = ((t * 140) % height);
      ctx.fillStyle = `${theme.primary}22`;
      ctx.fillRect(0, scanY, width, 4);

      if (elapsed < totalMs) {
        requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
      }
    };

    requestAnimationFrame(renderFrame);
  });
}
