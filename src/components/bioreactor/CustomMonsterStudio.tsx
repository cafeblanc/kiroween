import React, { useRef, useState } from "react";
import {
  MONSTER_STUDIO_PRESETS,
  MonsterBodyParts,
  MonsterStudioPreset,
  composeDescriptionFromParts,
  computeMonsterBioStats,
  generateCustomMonsterImage,
  generateVideoFromMonsterImage,
} from "../../services/customMonsterMediaService";
import type { ComicMonster } from "../../data/comicMonsters";
import { saveMonster } from "../../services/monsterVaultService";
import { monsterToVaultInput, urlToBlob } from "../../services/customMonsterVaultMapping";

interface CustomMonsterStudioProps {
  isKo: boolean;
  onAwakenCustomMonster: (monster: ComicMonster) => void;
  onSendToArena?: (monster: ComicMonster) => void;
  /** Optional HuggingFace token shared from the lab view; the local input below overrides it. */
  initialHfToken?: string;
}

const MUTATION_CHIPS: Array<{
  labelKo: string;
  field: keyof MonsterBodyParts;
  appendKo: string;
}> = [
  { labelKo: "🔥 용암 비늘 흉곽", field: "torso", appendKo: "용암이 흐르는 흑요석 비늘 갑옷" },
  { labelKo: "⚡ 고전압 전극 볼트", field: "hornsOrCrown", appendKo: "고전압 전기 스파크가 튀는 금속 전극 볼트" },
  { labelKo: "🐙 8촉수 흡반 팔", field: "arms", appendKo: "강철 갈고리 흡반이 달린 8개의 심해 촉수" },
  { labelKo: "🦂 전갈 산성 독침 꼬리", field: "tail", appendKo: "초강산 독침이 달린 절지 전갈 꼬리" },
  { labelKo: "👑 생체발광 왕관 뿔", field: "hornsOrCrown", appendKo: "시안빛으로 맥동하는 생체발광 왕관 뿔" },
  { labelKo: "🦾 티타늄 포식자 발톱", field: "arms", appendKo: "면도날 같은 티타늄 생체 발톱" },
];

export const CustomMonsterStudio: React.FC<CustomMonsterStudioProps> = ({
  isKo,
  onAwakenCustomMonster,
  onSendToArena,
  initialHfToken,
}) => {
  const [hfTokenInput, setHfTokenInput] = useState<string>("");
  const [imagePromptEn, setImagePromptEn] = useState<string | undefined>(undefined);
  const [videoSource, setVideoSource] = useState<"ltx" | "mediarecorder" | null>(null);
  const hfToken = hfTokenInput.trim() || initialHfToken?.trim() || "";
  const [selectedPreset, setSelectedPreset] = useState<MonsterStudioPreset>(
    MONSTER_STUDIO_PRESETS[0],
  );
  const [customName, setCustomName] = useState<string>(
    `${MONSTER_STUDIO_PRESETS[0].nameKo} 커스텀`,
  );
  const [parts, setParts] = useState<MonsterBodyParts>(
    MONSTER_STUDIO_PRESETS[0].defaultParts,
  );
  const [longPrompt, setLongPrompt] = useState<string>(() =>
    composeDescriptionFromParts(
      MONSTER_STUDIO_PRESETS[0],
      MONSTER_STUDIO_PRESETS[0].defaultParts,
    ),
  );

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [themeHex, setThemeHex] = useState<string>(MONSTER_STUDIO_PRESETS[0].colorHex);
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statOverrides, setStatOverrides] = useState<
    Partial<Record<"atk" | "def" | "spd" | "regen" | "energy", number>>
  >({});

  const computedStats = computeMonsterBioStats(longPrompt);
  const bioStats = {
    ...computedStats,
    atk: statOverrides.atk ?? computedStats.atk,
    def: statOverrides.def ?? computedStats.def,
    spd: statOverrides.spd ?? computedStats.spd,
    regen: statOverrides.regen ?? computedStats.regen,
    energy: statOverrides.energy ?? computedStats.energy,
  };

  const handleSelectPreset = (preset: MonsterStudioPreset) => {
    setSelectedPreset(preset);
    setCustomName(`${preset.nameKo} 커스텀`);
    setParts(preset.defaultParts);
    setLongPrompt(composeDescriptionFromParts(preset, preset.defaultParts));
    setThemeHex(preset.colorHex);
    setStatOverrides({});
    setImagePromptEn(undefined);
    setVideoSource(null);
    setGeneratedImageUrl(null);
    setGeneratedVideoUrl(null);
    setStatusMessage(null);
  };

  const handlePartChange = (field: keyof MonsterBodyParts, value: string) => {
    const nextParts = { ...parts, [field]: value };
    setParts(nextParts);
    setLongPrompt(composeDescriptionFromParts(selectedPreset, nextParts));
  };

  const handleGenerateImage = async () => {
    if (isGeneratingImg) return;
    setIsGeneratingImg(true);
    setStatusMessage(null);
    try {
      const result = await generateCustomMonsterImage({
        preset: selectedPreset,
        description: longPrompt,
        hfToken: hfToken || undefined,
        stats: {
          atk: bioStats.atk,
          def: bioStats.def,
          spd: bioStats.spd,
          regen: bioStats.regen,
          energy: bioStats.energy,
        },
      });
      setImagePromptEn(result.promptEn);
      setVideoSource(null);
      setGeneratedImageUrl(result.imageUrl);
      setThemeHex(result.themeHex);
      setGeneratedVideoUrl(null);
      setStatusMessage(
        result.source === "procedural"
          ? isKo
            ? "외부 AI 응답 지연으로 부위별 변이 합성 이미지를 생성했습니다. 이제 동영상으로 변환하거나 배양기에 투입하세요."
            : "Rendered procedural multi-part mutation image. Convert to video or launch bioreactor."
          : isKo
          ? "입력하신 부위별 사양에 맞춰 새로운 AI 괴수 이미지를 생성했습니다! 이제 아래에서 동영상으로 변환하거나 배양기에 투입하세요."
          : "Generated a brand-new AI monster image matching your specs! Convert to video or launch bioreactor.",
      );
    } catch (err) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : isKo
          ? "이미지 생성 중 오류가 발생했습니다."
          : "Failed to generate monster image.",
      );
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setGeneratedImageUrl(reader.result);
        setImagePromptEn(undefined);
        setVideoSource(null);
        setGeneratedVideoUrl(null);
        setStatusMessage(
          isKo
            ? "업로드한 이미지를 괴수 스튜디오에 불러왔습니다. 이제 동영상을 생성할 수 있습니다."
            : "Uploaded image loaded. You can now generate a video from it.",
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    if (isGeneratingVideo) return;
    const sourceImage = generatedImageUrl || selectedPreset.baseImageSrc;
    setIsGeneratingVideo(true);
    setVideoProgress(0);
    setStatusMessage(null);
    try {
      const result = await generateVideoFromMonsterImage({
        imageUrl: sourceImage,
        description: longPrompt,
        accentColor: themeHex,
        durationSec: 5,
        onProgress: setVideoProgress,
        hfToken: hfToken || undefined,
        promptEn: imagePromptEn,
      });
      setGeneratedVideoUrl(result.videoUrl);
      setVideoSource(result.source);
      setStatusMessage(
        result.source === "ltx"
          ? isKo
            ? "LTX-Video 실사 동영상 생성 완료! 재생, 다운로드 또는 15초 배양기에 바로 투입할 수 있습니다."
            : "LTX-Video photoreal clip ready! Play, download, or start the 15s bioreactor."
          : isKo
          ? `⚠️ LTX 실사 동영상 생성 실패: ${result.ltxError ?? "원인 불명"}. 대신 이미지를 움직이는 로컬 애니메이션(${result.durationSec}초)을 만들었습니다.`
          : `⚠️ LTX video failed: ${result.ltxError ?? "unknown reason"}. A local animation of the image (${result.durationSec}s) was rendered instead.`,
      );
    } catch (err) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : isKo
          ? "동영상 생성 중 오류가 발생했습니다."
          : "Failed to generate monster video.",
      );
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // 같은 설계(이름·프롬프트·능력치·이미지·영상)는 같은 id를 재사용: 배양기와 결투장 양쪽으로 보내도 보관함에는 1건(upsert)
  const buildIdRef = useRef<{ sig: string; id: string } | null>(null);
  const stableCustomId = (): string => {
    const sig = JSON.stringify([selectedPreset.id, customName, longPrompt, themeHex, generatedImageUrl, generatedVideoUrl, bioStats]);
    if (buildIdRef.current?.sig === sig) return buildIdRef.current.id;
    const id = `custom_${selectedPreset.id}_${Date.now()}`;
    buildIdRef.current = { sig, id };
    return id;
  };

  const buildCustomMonsterObject = (): ComicMonster => ({
    id: stableCustomId(),
    nameEn: customName || `${selectedPreset.nameEn} Custom`,
    nameKo: customName || `${selectedPreset.nameKo} 커스텀`,
    taglineKo: bioStats.elementLabelKo,
    taglineEn: bioStats.elementLabelEn,
    icon: selectedPreset.icon,
    bpm: Math.round(95 + (bioStats.spd + bioStats.energy) * 0.4),
    colorHex: themeHex,
    badge: "CUSTOM AI",
    customStats: {
      atk: bioStats.atk,
      def: bioStats.def,
      spd: bioStats.spd,
      regen: bioStats.regen,
      energy: bioStats.energy,
    },
    promptEn: `${longPrompt}\n[Combat Stats: ATK ${bioStats.atk}, DEF ${bioStats.def}, SPD ${bioStats.spd}, REGEN ${bioStats.regen}, ENERGY ${bioStats.energy}]`,
    promptKo: `${longPrompt}\n[전투 능력치: 공격력 ${bioStats.atk}, 방어력 ${bioStats.def}, 속도 ${bioStats.spd}, 재생력 ${bioStats.regen}, 에너지 ${bioStats.energy}]`,
    avatarImg: generatedImageUrl || selectedPreset.baseImageSrc,
    jumpscareImg: generatedImageUrl || selectedPreset.baseImageSrc,
    videoSrc: generatedVideoUrl || "/videos/chimera_growth_dragon_24s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: `${customName} (ATK ${bioStats.atk} · DEF ${bioStats.def} · SPD ${bioStats.spd}): 부위별 맞춤 유전자가 배양기에서 각성했습니다!`,
    funFactEn: `${customName} (ATK ${bioStats.atk} · DEF ${bioStats.def} · SPD ${bioStats.spd}): Custom bio-parts awakened inside the chamber!`,
  });

  // 보관함(IndexedDB) 저장: UI를 막지 않는 fire-and-forget. blob:/data:/http 이미지·영상을 Blob으로 변환해 저장하고,
  // 변환 실패 시 가능한 것만(나머지는 메타/기본 경로) 저장하며 앱 동작에는 영향을 주지 않는다.
  const persistToVault = (monster: ComicMonster, imageUrl: string | null, videoUrl: string | null) => {
    void (async () => {
      try {
        const [image, video] = await Promise.all([urlToBlob(imageUrl), urlToBlob(videoUrl)]);
        await saveMonster(monsterToVaultInput(monster, image, video));
      } catch (err) {
        console.warn("[CustomMonsterStudio] vault save failed", err);
      }
    })();
  };

  const handleStartCustomBioreactor = () => {
    const monster = buildCustomMonsterObject();
    persistToVault(monster, generatedImageUrl, generatedVideoUrl);
    onAwakenCustomMonster(monster);
  };

  const handleSendCustomToArena = () => {
    const monster = buildCustomMonsterObject();
    persistToVault(monster, generatedImageUrl, generatedVideoUrl);
    onSendToArena?.(monster);
  };

  const applyMutationChip = (field: keyof MonsterBodyParts, appendKo: string) => {
    const current = parts[field];
    const nextVal = current.includes(appendKo) ? current : `${current} + ${appendKo}`;
    handlePartChange(field, nextVal);
  };

  const partFields: Array<{ key: keyof MonsterBodyParts; labelKo: string; labelEn: string }> = [
    { key: "head", labelKo: "머리 (Head)", labelEn: "Head" },
    { key: "hornsOrCrown", labelKo: "뿔·왕관·전극", labelEn: "Horns / Crown" },
    { key: "torso", labelKo: "몸통 (Torso)", labelEn: "Torso" },
    { key: "arms", labelKo: "팔,촉수,날개 (Arms)", labelEn: "Arms / Tentacles / Wings" },
    { key: "legs", labelKo: "다리·하체 (Legs)", labelEn: "Legs" },
    { key: "tail", labelKo: "꼬리·후면 (Tail)", labelEn: "Tail / Back" },
    { key: "auraAndSkin", labelKo: "피부·특수 오라", labelEn: "Skin & Aura" },
  ];

  return (
    <div className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-3 sm:p-4 flex flex-col gap-3.5 shadow-xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧬</span>
          <h3 className="text-xs sm:text-sm font-black text-cyan-300">
            {isKo
              ? "커스텀 괴수 부위별 묘사 & AI 이미지·동영상 제작실"
              : "Custom Monster Part-by-Part AI Image & Video Studio"}
          </h3>
        </div>
        <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
          IMAGE → VIDEO AI
        </span>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        {isKo
          ? "괴수 6종 중 하나를 선택한 뒤 머리·팔·다리·몸통·꼬리·뿔 등 각 부위를 길게 묘사해 AI 괴수 이미지를 만들고, 그 이미지로 움직이는 동영상까지 제작해 배양기에 투입하세요."
          : "Choose one of the 6 base monsters, describe each body part in detail, generate a custom AI monster image, and animate it into a video for the bioreactor."}
      </p>

      {/* 1. 6 Base Monster Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {MONSTER_STUDIO_PRESETS.map((preset) => {
          const active = selectedPreset.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-2 py-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-1.5 ${
                active
                  ? "bg-cyan-950/80 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/60"
                  : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-cyan-500/50"
              }`}
            >
              <span className="text-base shrink-0">{preset.icon}</span>
              <span className="text-[10px] font-bold leading-tight line-clamp-2">
                {isKo ? preset.nameKo : preset.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Body Parts Quick Inputs + Custom Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-300">
            {isKo ? "괴수 이름" : "Monster Name"}
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none"
          />
        </div>
        {partFields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-300">
              {isKo ? f.labelKo : f.labelEn}
            </label>
            <input
              type="text"
              value={parts[f.key]}
              onChange={(e) => handlePartChange(f.key, e.target.value)}
              className="bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-100 outline-none"
            />
          </div>
        ))}
      </div>

      {/* 2.5 One-Click Bio-Mutation Chips + Live Bio-Stats HUD */}
      <div className="flex flex-col gap-2 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-black text-amber-300">
            ⚡ {isKo ? "원클릭 부위 변이 조합 (클릭 시 부위 묘사 즉시 추가)" : "Quick Bio-Mutations"}
          </span>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
            {isKo ? bioStats.elementLabelKo : bioStats.elementLabelEn}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUTATION_CHIPS.map((chip) => (
            <button
              key={chip.labelKo}
              type="button"
              onClick={() => applyMutationChip(chip.field, chip.appendKo)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-200 border border-slate-700 hover:border-cyan-400 cursor-pointer transition"
            >
              + {chip.labelKo}
            </button>
          ))}
        </div>
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-emerald-300">
                🧬{" "}
                {isKo
                  ? "괴수 생체 전투 능력치 조절 (슬라이더로 직접 설정 가능)"
                  : "Monster Combat Stats Tuner (Interactive Sliders)"}
              </span>
              <span className="text-[9px] text-slate-400 font-sans">
                {isKo
                  ? "부위 묘사에 따라 자동 계산되며, 슬라이더를 당겨 직접 조절하면 AI 이미지·동영상 및 결투장에 실시간 반영됩니다."
                  : "Auto-computed from part descriptions; dragging sliders directly overrides values for AI image/video & Arena."}
              </span>
            </div>
            {Object.keys(statOverrides).length > 0 && (
              <button
                type="button"
                onClick={() => setStatOverrides({})}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 cursor-pointer transition"
              >
                {isKo ? "↺ 자동 분석값으로 복원" : "↺ Reset to Auto"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {(
              [
                { key: "atk", labelKo: "공격력 (ATK)", labelEn: "ATK", subKo: "타격·파괴력", subEn: "Attack Power", val: bioStats.atk, accent: "accent-rose-500", text: "text-rose-400" },
                { key: "def", labelKo: "방어력 (DEF)", labelEn: "DEF", subKo: "외골격·장갑", subEn: "Defense Armor", val: bioStats.def, accent: "accent-amber-400", text: "text-amber-400" },
                { key: "spd", labelKo: "속도 (SPD)", labelEn: "SPD", subKo: "민첩·공속", subEn: "Speed & Agility", val: bioStats.spd, accent: "accent-cyan-400", text: "text-cyan-400" },
                { key: "regen", labelKo: "재생력 (REGEN)", labelEn: "REGEN", subKo: "체력 자가회복", subEn: "Regeneration", val: bioStats.regen, accent: "accent-emerald-400", text: "text-emerald-400" },
                { key: "energy", labelKo: "에너지 (ENERGY)", labelEn: "ENERGY", subKo: "생체오라·BPM", subEn: "Energy & Aura", val: bioStats.energy, accent: "accent-purple-400", text: "text-purple-400" },
              ] as const
            ).map((stat) => (
              <div key={stat.key} className="bg-slate-900/95 border border-slate-800 rounded-lg p-2 flex flex-col gap-1.5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                  <span className={stat.text}>{isKo ? stat.labelKo : stat.labelEn}</span>
                  <span className="text-white font-black bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] border border-slate-700/60">{stat.val}</span>
                </div>
                <div className="text-[9px] text-slate-400 flex justify-between items-center font-sans">
                  <span>{isKo ? stat.subKo : stat.subEn}</span>
                  <span className="text-[8px] text-slate-400 font-mono">20~99</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={99}
                  value={stat.val}
                  aria-label={stat.labelKo}
                  onChange={(e) =>
                    setStatOverrides((prev) => ({
                      ...prev,
                      [stat.key]: Number(e.target.value),
                    }))
                  }
                  className={`w-full h-2 cursor-pointer rounded-lg bg-slate-800 ${stat.accent}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Long Multi-Line Monster Description Chat / Prompt Box */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-black text-emerald-300">
            {isKo
              ? "💬 괴수 전체 부위 상세 묘사 창 (길게 자유 입력 가능)"
              : "💬 Full Multi-Part Monster Description Box (Long Prompt)"}
          </label>
          <span className="text-[10px] font-mono text-slate-400">
            {longPrompt.length} chars
          </span>
        </div>
        <textarea
          rows={6}
          value={longPrompt}
          onChange={(e) => setLongPrompt(e.target.value)}
          placeholder={
            isKo
              ? "머리, 뿔, 팔, 다리, 몸통, 꼬리, 피부 질감과 특수 능력까지 원하는 대로 길고 자세하게 묘사해 주세요..."
              : "Describe the head, horns, arms, legs, torso, tail, skin texture, and aura in full detail..."
          }
          className="w-full min-h-[140px] bg-slate-950 border border-emerald-500/40 focus:border-emerald-400 rounded-xl p-3 text-xs text-slate-100 leading-relaxed outline-none resize-y shadow-inner"
        />
      </div>

      {/* 3.5 Optional HF / LTX token + connection status badge */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-2">
        <span
          data-testid="ltx-status-badge"
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            videoSource === "ltx"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
              : videoSource === "mediarecorder"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
              : "bg-slate-800 text-slate-300 border-slate-600"
          }`}
        >
          {videoSource === "ltx"
            ? isKo
              ? "LTX-2.5 fast · 1080p 생성됨"
              : "LTX-2.5 fast · 1080p ready"
            : videoSource === "mediarecorder"
            ? isKo
              ? "LTX 실패 · 로컬 애니메이션(실사 영상 아님)"
              : "LTX failed · local animation (not a real video)"
            : isKo
            ? "LTX-2.5 fast · 1080p (서버 프록시) → 실패 시 로컬 폴백"
            : "LTX-2.5 fast · 1080p (server proxy) → local fallback"}
        </span>
        <input
          type="password"
          value={hfTokenInput}
          onChange={(e) => setHfTokenInput(e.target.value)}
          autoComplete="off"
          placeholder={isKo ? "HF 토큰(이미지 생성 전용, 선택, 저장되지 않음)" : "HF token (image generation only, optional, not stored)"}
          className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none"
        />
      </div>

      {/* 4. AI Image & Image-to-Video Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerateImage}
          disabled={isGeneratingImg}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition shadow-lg flex items-center gap-1.5"
        >
          <span>🎨</span>
          <span>
            {isGeneratingImg
              ? isKo
                ? "AI 괴수 이미지 생성 중..."
                : "Generating Image..."
              : isKo
              ? "AI 괴수 이미지 생성"
              : "Generate Monster Image"}
          </span>
        </button>

        <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer transition flex items-center gap-1.5">
          <span>📁</span>
          <span>{isKo ? "내 이미지 불러오기" : "Upload Image"}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUploadImage}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={handleGenerateVideo}
          disabled={isGeneratingVideo}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition shadow-lg flex items-center gap-1.5"
        >
          <span>🎬</span>
          <span>
            {isGeneratingVideo
              ? isKo
                ? `동영상 제작 중 (${videoProgress}%)...`
                : `Rendering Video (${videoProgress}%)...`
              : isKo
              ? "이 이미지로 AI 동영상 만들기"
              : "Create AI Video from Image"}
          </span>
        </button>
      </div>

      {statusMessage && (
        <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl px-3 py-2 text-[11px] text-cyan-200">
          {statusMessage}
        </div>
      )}

      {/* 5. Preview Area: Generated Image + Generated Video */}
      {(generatedImageUrl || generatedVideoUrl) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {generatedImageUrl && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300">
                  🖼️ {isKo ? "생성된 괴수 이미지" : "Generated Monster Image"}
                </span>
                <a
                  href={generatedImageUrl}
                  download={`${selectedPreset.id}_custom.png`}
                  className="text-[10px] font-bold text-emerald-400 hover:underline"
                >
                  {isKo ? "이미지 저장" : "Download PNG"}
                </a>
              </div>
              <img
                src={generatedImageUrl}
                alt={customName}
                className="w-full h-56 object-cover rounded-lg border border-slate-800 bg-black"
              />
            </div>
          )}

          {generatedVideoUrl && (
            <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-300">
                  🎬 {isKo ? "이미지 기반 AI 동영상" : "AI Image-to-Video Output"}
                </span>
                <a
                  href={generatedVideoUrl}
                  download={`${selectedPreset.id}_custom.${videoSource === "ltx" ? "mp4" : "webm"}`}
                  className="text-[10px] font-bold text-emerald-400 hover:underline"
                >
                  {isKo
                    ? `동영상 저장 (.${videoSource === "ltx" ? "mp4" : "webm"})`
                    : "Download Video"}
                </a>
              </div>
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-56 object-cover rounded-lg border border-slate-800 bg-black"
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Direct Launch into 15s Bioreactor or Battle Arena */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleStartCustomBioreactor}
          className="w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 hover:from-amber-400 hover:via-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm py-2.5 rounded-xl cursor-pointer transition shadow-xl flex items-center justify-center gap-2"
        >
          <span>⚡</span>
          <span>
            {isKo
              ? `[${customName}] 15초 배양기 가동`
              : `Launch 15s Bioreactor`}
          </span>
        </button>

        {onSendToArena && (
          <button
            type="button"
            onClick={handleSendCustomToArena}
            className="w-full bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm py-2.5 rounded-xl cursor-pointer transition shadow-xl flex items-center justify-center gap-2"
          >
            <span>⚔️</span>
            <span>
              {isKo
                ? `[${customName}] 결투장 바로 출격`
                : `Send to Real-time Duel`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
