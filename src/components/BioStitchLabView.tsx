import React, { useState, useEffect, useRef } from "react";
import {
  VERIFIED_BIO_EXPERIMENTS,
  BioExperimentCase,
  CHIMERA_PART_OPTIONS,
  ChimeraPartOption
} from "../data/bioExperiments";
import { scienceStitchService, PubMedPaper, WikiContext } from "../services/scienceStitchService";

type LangMode = "KO" | "EN" | "BOTH";

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

interface ChimeraCreationResult {
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

export const BioStitchLabView: React.FC = () => {
  const [experiments] = useState<BioExperimentCase[]>(VERIFIED_BIO_EXPERIMENTS);
  const [activeExp, setActiveExp] = useState<BioExperimentCase>(VERIFIED_BIO_EXPERIMENTS[0]);
  const [langMode, setLangMode] = useState<LangMode>("KO");

  const isKo = langMode === "KO" || langMode === "BOTH";

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isKiroSpecModalOpen, setIsKiroSpecModalOpen] = useState<boolean>(false);
  const [isStitchModalOpen, setIsStitchModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<"chimera_assembler" | "pubmed_dossier">("chimera_assembler");

  // Block 1: Video & Confocal Microscopy Photo
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState<boolean>(false);
  const [showPhotoOverlay, setShowPhotoOverlay] = useState<boolean>(false);

  // Block 2: WebAudio Narrator & ECG Pulse
  const [isSoundOn, setIsSoundOn] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pulseIntervalRef = useRef<number | null>(null);

  // Block 3: 3-Second Auto-Absorbing Synapse Chat (with dismissed cursor fix)
  const [messages, setMessages] = useState<SynapseChatMessage[]>([
    {
      id: "init-1",
      sender: "ai",
      textKo: "🧬 프로메테우스 만능줄기세포(iPSC) 실험실에 접속되었습니다. 하단의 6대 실제 실험을 내레이터와 함께 살펴보거나, [🧬 신화적 키메라 조립 & 부활] 버튼을 눌러 새로운 생명체를 조립해 보세요!",
      textEn: "🧬 PROMETHEUS-iPSC Lab Online. Explore the 6 real-world stem-cell experiments with the narrator, or open [🧬 Mythic Chimera Assembler] to stitch and resurrect a custom creature!",
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

  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mobileChatScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileChatEndRef = useRef<HTMLDivElement | null>(null);

  // Block 4A: Mythic Chimera 4-Part Assembler & Video-like Morphing Chamber
  const headOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "head");
  const heartOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "heart");
  const torsoOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "torso");
  const limbOptions = CHIMERA_PART_OPTIONS.filter((p) => p.category === "limbs");

  const [selectedHead, setSelectedHead] = useState<ChimeraPartOption>(headOptions[0]);
  const [selectedHeart, setSelectedHeart] = useState<ChimeraPartOption>(heartOptions[0]);
  const [selectedTorso, setSelectedTorso] = useState<ChimeraPartOption>(torsoOptions[0]);
  const [selectedLimbs, setSelectedLimbs] = useState<ChimeraPartOption>(limbOptions[0]);

  const [morphStage, setMorphStage] = useState<"idle" | "injecting" | "morphing" | "awakened">("idle");
  const [morphPercent, setMorphPercent] = useState<number>(0);
  const [chimeraResult, setChimeraResult] = useState<ChimeraCreationResult | null>(null);
  const bioreactorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Block 4B: Live PubMed + Wikipedia Dossier
  const [livePapers, setLivePapers] = useState<PubMedPaper[]>([]);
  const [liveWiki, setLiveWiki] = useState<WikiContext | null>(null);
  const [isLoadingPapers, setIsLoadingPapers] = useState<boolean>(false);
  const [customStitchQuery, setCustomStitchQuery] = useState<string>("");

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

  // Video-like Bioreactor Morphing Canvas Animation (Cells dividing, lightning, chimeric silhouette)
  useEffect(() => {
    if (!isStitchModalOpen || activeModalTab !== "chimera_assembler") return;
    const canvas = bioreactorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const nodes = Array.from({ length: 34 }, (_, i) => ({
      angle: (i / 34) * Math.PI * 2,
      radius: 25 + (i % 5) * 18,
      speed: 0.012 + (i % 4) * 0.006,
      size: 3 + (i % 4) * 2
    }));

    const drawBioreactor = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "rgba(2, 6, 23, 0.28)";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      const primaryColor =
        morphStage === "awakened" && chimeraResult
          ? chimeraResult.colorHex
          : morphStage === "morphing"
          ? "#f59e0b"
          : "#10b981";

      // Outer Bioreactor Containment Ring
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = morphStage === "morphing" ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.42 + Math.sin(frame * 0.08) * 4, 0, Math.PI * 2);
      ctx.stroke();

      // Swirling iPSC Stem-Cell Clusters & Neural Synapses
      const speedMult = morphStage === "morphing" ? 4.2 : morphStage === "injecting" ? 2.5 : 1;
      nodes.forEach((n, idx) => {
        n.angle += n.speed * speedMult;
        const r =
          morphStage === "morphing"
            ? n.radius * (0.4 + 0.6 * Math.abs(Math.sin(frame * 0.05)))
            : n.radius;
        const x = cx + Math.cos(n.angle) * r * 1.3;
        const y = cy + Math.sin(n.angle) * r * 0.85;

        // Draw synapse web lines toward center
        if (idx % 2 === 0) {
          ctx.strokeStyle = `${primaryColor}44`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        // Draw dividing cell node
        ctx.fillStyle = idx % 3 === 0 ? "#38bdf8" : primaryColor;
        ctx.beginPath();
        ctx.arc(x, y, n.size + (morphStage === "morphing" ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
      });

      // Lightning / Bio-Electric Jolt Arcs during morphing
      if (morphStage === "injecting" || morphStage === "morphing") {
        for (let b = 0; b < 3; b++) {
          ctx.strokeStyle = b % 2 === 0 ? "#fde047" : "#67e8f9";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + (Math.random() - 0.5) * w * 0.8, 0);
          ctx.lineTo(cx + (Math.random() - 0.5) * 50, cy + (Math.random() - 0.5) * 40);
          ctx.lineTo(cx + (Math.random() - 0.5) * w * 0.8, h);
          ctx.stroke();
        }
      }

      // Central Pulsing Chimera Core
      const pulseRadius = 24 + Math.sin(frame * 0.14) * 6;
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, pulseRadius * 2.2);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      frame++;
      animId = requestAnimationFrame(drawBioreactor);
    };

    animId = requestAnimationFrame(drawBioreactor);
    return () => cancelAnimationFrame(animId);
  }, [isStitchModalOpen, activeModalTab, morphStage, chimeraResult]);

  // Video switch handler
  useEffect(() => {
    setVideoFailed(false);
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        setVideoFailed(true);
      });
    }
  }, [activeExp.id]);

  // Fetch live PubMed & Wiki when dossier tab is opened
  useEffect(() => {
    if (!isStitchModalOpen) return;
    let cancelled = false;
    setIsLoadingPapers(true);

    Promise.all([
      scienceStitchService.fetchPubMedPapers(activeExp.pubMedSearchQuery, 3),
      scienceStitchService.fetchWikipediaContext(activeExp.wikiTitle, isKo ? "ko" : "en")
    ]).then(([papers, wiki]) => {
      if (cancelled) return;
      setLivePapers(papers);
      setLiveWiki(wiki);
      setIsLoadingPapers(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isStitchModalOpen, activeExp.id, isKo]);

  // WebAudio Sound Effects
  const triggerBioBeep = (freqStart = 520, freqEnd = 180, duration = 0.15) => {
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

  // Bilingual Speech Synthesis (Korean / English synced to langMode)
  const speakText = (textKo: string, textEn: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const useKoreanVoice = langMode === "KO" || langMode === "BOTH";
    const utter = new SpeechSynthesisUtterance(useKoreanVoice ? textKo : textEn);
    utter.lang = useKoreanVoice ? "ko-KR" : "en-US";
    utter.rate = useKoreanVoice ? 0.98 : 0.94;
    utter.pitch = 0.85;
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (pulseIntervalRef.current) {
      window.clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }

    if (!isSoundOn) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    speakText(
      activeExp.koreanNarratorScript.join(" "),
      activeExp.narratorScript.join(" ")
    );

    const intervalMs = Math.max(550, Math.round((60 / activeExp.pulseBpm) * 1000));
    pulseIntervalRef.current = window.setInterval(() => {
      triggerBioBeep();
    }, intervalMs);

    return () => {
      if (pulseIntervalRef.current) window.clearInterval(pulseIntervalRef.current);
    };
  }, [isSoundOn, activeExp.id, langMode]);

  // Desktop chat scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Mobile 3s auto-absorbing floating chat (only shows new messages since last dismissal)
  useEffect(() => {
    if (messages.length === 0) return;

    const activeBatch = messages.slice(mobileDismissedIndexRef.current);
    if (activeBatch.length === 0) return;

    setMobileVisibleMessages(activeBatch.slice(-5));
    setMobileChatPhase("visible");

    requestAnimationFrame(() => {
      mobileChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (mobileChatScrollRef.current) {
        mobileChatScrollRef.current.scrollTop = mobileChatScrollRef.current.scrollHeight;
      }
    });

    const currentLength = messages.length;

    const exitTimer = setTimeout(() => {
      setMobileChatPhase("exiting");
    }, 3000);

    const clearTimer = setTimeout(() => {
      mobileDismissedIndexRef.current = currentLength;
      setMobileChatPhase("hidden");
      setMobileVisibleMessages([]);
    }, 3550);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(clearTimer);
    };
  }, [messages]);

  const handleSelectExperiment = (exp: BioExperimentCase) => {
    setActiveExp(exp);
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
    setMessages((prev) => [...prev, msg]);
  };

  // Assemble & Resurrect Custom Mythic/Grotesque/Disco Chimera!
  const handleAssembleChimera = () => {
    setMorphStage("injecting");
    setMorphPercent(18);
    setChimeraResult(null);
    triggerBioBeep(320, 640, 0.25);

    setTimeout(() => {
      setMorphStage("morphing");
      setMorphPercent(68);
      triggerBioBeep(680, 920, 0.3);
    }, 900);

    setTimeout(() => {
      const traits = [
        selectedHead.traitTag,
        selectedHeart.traitTag,
        selectedTorso.traitTag,
        selectedLimbs.traitTag
      ];
      const gamerCount = traits.filter((t) => t === "gamer").length;
      const discoCount = traits.filter((t) => t === "disco").length;

      let res: ChimeraCreationResult;

      if (gamerCount >= 2) {
        res = {
          archetype: "gamer",
          badge: "🕹️🐙⚡",
          titleKo: "기괴한 변이 탄생: 6팔 달린 불사의 아케이드 게이머 키메라!",
          titleEn: "Bizarre Awakening: The 6-Armed Immortal Arcade Gamer Chimera!",
          subtitleKo: `${selectedHead.nameKo} + ${selectedLimbs.nameKo} 과융합 변이`,
          subtitleEn: `${selectedHead.nameEn} + ${selectedLimbs.nameEn} Hyper-Fusion`,
          storyKo:
            "만능줄기세포(iPSC)에 퐁(Pong) 게임 뇌세포(DishBrain)의 도파민 신호가 과다 증폭되었습니다! 배양기 속에서 6개의 초정밀 재생 팔다리가 솟아나더니, 깨어나자마자 실험실 메인프레임 모니터를 장악해 초당 120타(1200 APM)의 속도로 고전 게임 대결을 신청하고 있습니다!",
          storyEn:
            "DishBrain gaming dopamine overloaded the pluripotent stem-cell matrix! Sprouting six hyper-dexterous regenerating limbs inside the bioreactor, the creature hijacked the lab mainframe at 1,200 APM and refuses to stop until someone beats its Pong high score!",
          firstWordsKo: "💬 키메라의 첫 마디: \"인간 박사님, 동전(Insert Coin) 넣으세요. 저랑 퐁(Pong) 한 판 안 뜨면 실험실 문 안 열어줍니다!\"",
          firstWordsEn: "💬 First Words: \"INSERT COIN, DOCTOR! Nobody leaves this laboratory until you beat my Pong high score!\"",
          speechKo:
            "경고! 디시브레인 게이머 유전자가 과다 발현되었습니다. 여섯 개의 재생 팔다리를 가진 불사의 프로게이머 키메라가 깨어나 실험실 컴퓨터로 게임 대결을 요구하고 있습니다!",
          speechEn:
            "Alert! DishBrain gaming neurons have taken over the stem-cell matrix! A six-armed immortal arcade chimera has awakened and challenges you to a game of Pong!",
          bpm: 145,
          colorHex: "#06b6d4"
        };
      } else if (discoCount >= 2) {
        res = {
          archetype: "disco",
          badge: "🎃🪩🕺",
          titleKo: "할로윈 폭주 탄생: 자정의 문워크 디스코 프랑켄슈타인!",
          titleEn: "Midnight Outbreak: The Moonwalking Disco Frankenstein!",
          subtitleKo: `${selectedHeart.nameKo} + ${selectedLimbs.nameKo} 리듬 공명`,
          subtitleEn: `${selectedHeart.nameEn} + ${selectedLimbs.nameEn} Rhythm Resonance`,
          storyKo:
            "예일대 BrainEx 관류 펌프의 맥박이 128 BPM 할로윈 신스웨이브 주파수와 공명했습니다! 수백만 개의 앤스로봇 섬모 다리와 발광 해파리 미러볼 몸통이 결합되어, 배양기 유리를 박차고 나와 실험실의 모든 생체 로봇들과 함께 무중력 문워크 군무를 추기 시작합니다!",
          storyEn:
            "The BrainEx perfusion pump locked onto a 128-BPM Halloween synthwave frequency! Powered by millions of microscopic cilia legs and a glowing GFP mirror-ball torso, the chimera is moonwalking across the ceiling and leading all lab biobots in a midnight flashmob!",
          firstWordsKo: "💬 키메라의 첫 마디: \"심장이 128 비트로 뛰는데 어떻게 가만히 누워있나요? 조명 끄고 네온 형광 단백질(GFP) 켜세요, 파티 시작입니다!\"",
          firstWordsEn: "💬 First Words: \"With a 128-BPM stem-cell heart, staying dead is impossible! Turn on the GFP blacklights—it's Kiroween party time!\"",
          speechKo:
            "놀라운 현상입니다! 줄기세포 배양액이 백이십팔 비피엠 댄스 리듬과 공명하여, 자정의 문워크 디스코 키메라가 탄생해 실험실 전체를 할로윈 무도회장으로 바꾸고 있습니다!",
          speechEn:
            "Incredible! The stem-cell bioreactor resonated at 128 BPM, awakening the Midnight Disco Chimera! It is currently moonwalking across the laboratory!",
          bpm: 128,
          colorHex: "#a855f7"
        };
      } else {
        res = {
          archetype: "mythic",
          badge: "🏛️🦁🦅",
          titleKo: "신화적 초월체 부활: 프로메테우스 네온 스핑크스(Neon Sphinx)!",
          titleEn: "Mythic Resurrection: The Prometheus Neon Sphinx!",
          subtitleKo: `${selectedHead.nameKo} + ${selectedTorso.nameKo} 완벽 융합`,
          subtitleEn: `${selectedHead.nameEn} + ${selectedTorso.nameEn} Perfect Synthesis`,
          storyKo:
            "스탠퍼드 92% 인간 대뇌 오가노이드의 고차원 자아(폰 에코노모 뉴런)와 반투명 유령 심장, 황금 사자·그리핀 동체, 그리고 아홀로틀의 불사 재생 날개가 만능줄기세포(iPSC) 시냅스 브릿지로 완벽히 하나가 되었습니다! 고대 신화 속에서만 전해지던 불멸의 지성체가 황금빛 눈을 뜨며 당신을 바라봅니다.",
          storyEn:
            "The 92% human cortical organoid, translucent Ghost Heart, golden Griffin thorax, and regenerating Axolotl wings have fused seamlessly via pluripotent stem cells! A majestic, hyper-intelligent mythical guardian opens its glowing eyes inside the chamber.",
          firstWordsKo: "💬 키메라의 첫 마디: \"인간의 뇌와 불멸의 육체를 이어 붙인 창조주여... 나의 첫 번째 수수께끼에 답할 준비가 되었는가?\"",
          firstWordsEn: "💬 First Words: \"O Creator who stitched human mind to immortal flesh... are you ready to answer my first riddle?\"",
          speechKo:
            "생체 접합 대성공! 구십이 퍼센트 인간 대뇌 오가노이드와 불사의 재생 날개, 유령 심장이 완벽히 융합되어 고대 신화 속의 초월 생명체 네온 스핑크스가 눈을 떴습니다!",
          speechEn:
            "Bio-stitching complete! The human cortical organoid, Ghost Heart, and regenerating wings have fused into a majestic mythical Neon Sphinx!",
          bpm: 84,
          colorHex: "#10b981"
        };
      }

      setMorphPercent(100);
      setMorphStage("awakened");
      setChimeraResult(res);
      triggerBioBeep(440, 880, 0.35);
      speakText(res.speechKo, res.speechEn);
    }, 2200);
  };

  const handleCustomLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStitchQuery.trim()) return;
    setIsLoadingPapers(true);
    const q = customStitchQuery.trim();
    const dossier = await scienceStitchService.stitchLiveQuery(q, isKo);
    setLivePapers(dossier.papers);
    setLiveWiki(dossier.wiki);
    setIsLoadingPapers(false);
    triggerBioBeep();
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
    const matchedCase = experiments.find(
      (c) =>
        lower.includes(c.shortTitle.toLowerCase()) ||
        lower.includes(c.koreanShortTitle.toLowerCase()) ||
        (lower.includes("쥐") && c.id.includes("xenocortication")) ||
        (lower.includes("mouse") && c.id.includes("xenocortication")) ||
        (lower.includes("92") && c.id.includes("xenocortication")) ||
        (lower.includes("심장") && c.id.includes("ghost-heart")) ||
        (lower.includes("heart") && c.id.includes("ghost-heart")) ||
        (lower.includes("돼지") && (c.id.includes("brainex") || c.id.includes("chimera"))) ||
        (lower.includes("pong") && c.id.includes("dishbrain")) ||
        (lower.includes("게임") && c.id.includes("dishbrain")) ||
        (lower.includes("로봇") && c.id.includes("anthrobots"))
    );

    if (matchedCase) {
      setActiveExp(matchedCase);
      const replyMsg: SynapseChatMessage = {
        id: (Date.now() + 1).toString() + "-ai",
        sender: "ai",
        textKo: `🧬 [실험 전환 → ${matchedCase.koreanShortTitle}]: ${matchedCase.koreanSummary}`,
        textEn: `🧬 [Specimen Switched → ${matchedCase.shortTitle}]: ${matchedCase.eerieRealitySummary}`,
        pmidBadge: matchedCase.pmidOrDoi,
        timestamp: new Date().toLocaleTimeString(),
        linkedCase: matchedCase
      };
      setMessages((prev) => [...prev, replyMsg]);
      return;
    }

    setIsQueryingApi(true);
    const dossier = await scienceStitchService.stitchLiveQuery(rawQuery, isKo);
    setIsQueryingApi(false);

    const topPaper = dossier.papers[0];
    const wikiSnippet = dossier.wiki?.extract
      ? dossier.wiki.extract.slice(0, 200) + "..."
      : isKo
      ? "만능줄기세포(iPSC) 분화 및 생체 조직 융합 경로가 확인되었습니다."
      : "Direct pluripotent stem-cell differentiation pathway analyzed.";

    const aiReply: SynapseChatMessage = {
      id: (Date.now() + 2).toString() + "-ai",
      sender: "ai",
      textKo: dossier.stemCellSynthesisKo,
      textEn: dossier.stemCellSynthesisEn,
      subTextKo: topPaper
        ? `📄 검증된 PubMed 논문: "${topPaper.title}" (${topPaper.journalTitle}, ${topPaper.pubYear}) — ${wikiSnippet}`
        : `📚 아카이브 기록: ${wikiSnippet}`,
      subTextEn: topPaper
        ? `📄 Verified PubMed Study: "${topPaper.title}" (${topPaper.journalTitle}, ${topPaper.pubYear}) — ${wikiSnippet}`
        : `📚 Archival Record: ${wikiSnippet}`,
      pmidBadge: topPaper?.pmid ? `PMID: ${topPaper.pmid}` : "PubMed / EuropePMC Live",
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, aiReply]);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col w-full max-w-full overflow-hidden box-border">
      {/* Top Header with Seamless Language Switcher (한국어 / English / 한·영 병기) */}
      <header className="border-b border-emerald-500/30 px-2.5 sm:px-4 py-2 flex justify-between items-center bg-slate-900/95 backdrop-blur shadow-lg w-full shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <h1 className="text-xs sm:text-sm font-black tracking-wide text-emerald-300 truncate">
            PROMETHEUS-iPSC{" "}
            <span className="text-slate-300 font-semibold hidden sm:inline">
              | {isKo ? "현대판 프랑켄슈타인 만능줄기세포 실험실" : "Modern Bio-Frankenstein Stem-Cell Lab"}
            </span>
          </h1>
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full hidden lg:flex items-center gap-1 shrink-0">
            <span>🧬 iPSC 98%</span>
            <span>· Kiroween Frankenstein Track</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5 text-[10px] sm:text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setLangMode("KO")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition ${
                langMode === "KO" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              🇰🇷 한국어
            </button>
            <button
              type="button"
              onClick={() => setLangMode("EN")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition ${
                langMode === "EN" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              🇺🇸 ENG
            </button>
            <button
              type="button"
              onClick={() => setLangMode("BOTH")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition hidden sm:inline-block ${
                langMode === "BOTH" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              🌐 한+영
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsKiroSpecModalOpen(true)}
            className="bg-purple-950/90 hover:bg-purple-900 text-purple-300 border border-purple-500/50 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition shadow"
          >
            📐 .kiro Plan
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <div
        className="relative flex-1 flex flex-col md:grid md:grid-cols-12 gap-0 md:gap-3 p-0 md:p-3.5 w-full max-w-full box-border items-stretch overflow-hidden"
        style={{ height: "calc(100dvh - 48px)", maxHeight: "calc(100dvh - 48px)" }}
      >
        {/* SECTION 1: Bio-Microscopy & Real Photographic Evidence Viewport */}
        <div className="h-full md:h-full md:col-span-7 relative bg-black md:bg-slate-900/60 border-0 md:border md:border-emerald-500/30 rounded-none md:rounded-2xl p-0 md:p-2.5 shadow-2xl flex flex-col justify-between w-full max-w-full overflow-hidden box-border">
          <div
            onClick={() => setIsSoundOn((prev) => !prev)}
            className="relative w-full h-full bg-slate-950 rounded-none md:rounded-xl overflow-hidden md:border md:border-slate-800 shadow-inner cursor-pointer select-none flex-1 min-h-0"
          >
            {/* Background High-Res Real Confocal/Experiment Photo */}
            <img
              src={showPhotoOverlay ? activeExp.secondaryPhotoUrl : activeExp.microscopyPhotoUrl}
              alt={activeExp.headline}
              className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-all duration-700 filter contrast-125"
            />

            {/* Live Microscopy Video Layer */}
            {!videoFailed && !showPhotoOverlay && (
              <video
                ref={videoRef}
                key={activeExp.id + "-" + activeExp.videoUrl}
                src={activeExp.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setVideoFailed(true)}
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
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

            {/* Top-Left: BIO-FEED Badge + [❓ Help] Button + Real Journal Citation */}
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex flex-col items-start gap-1.5 max-w-[66%]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center bg-black/85 backdrop-blur-md rounded-md p-0.5 border border-emerald-500/40 shadow-lg gap-1">
                  <span className="bg-emerald-600 text-slate-950 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded flex items-center gap-1 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                    <span>BIO-FEED</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHelpOpen(true);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-2 py-0.5 rounded text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer transition shadow border border-cyan-300/50 active:scale-95"
                  >
                    <span>❓</span>
                    <span>{isKo ? "사용법(Help)" : "Help"}</span>
                  </button>
                </div>

                <span className="bg-black/85 backdrop-blur-md text-amber-300 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md border border-amber-500/40 font-mono font-bold shadow truncate max-w-full">
                  {activeExp.pmidOrDoi}
                </span>
              </div>

              {/* Active Case Floating Scientific Banner */}
              <div className="bg-slate-950/90 backdrop-blur-md border-l-4 border-emerald-400 px-2.5 py-1.5 rounded-r-lg shadow-xl">
                <p className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  {activeExp.codeName} · {activeExp.institution}
                </p>
                {langMode !== "EN" && (
                  <p className="text-xs sm:text-sm font-extrabold text-white leading-snug mt-0.5">
                    {activeExp.koreanHeadline}
                  </p>
                )}
                {langMode !== "KO" && (
                  <p className="text-[11px] sm:text-xs font-bold text-emerald-200 leading-snug mt-0.5">
                    {activeExp.headline}
                  </p>
                )}
              </div>
            </div>

            {/* Top-Right: Sound Narrator Toggle + Stem-Cell Viability + Photo/Video Switcher */}
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSoundOn((prev) => !prev);
                }}
                className={`text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md border transition font-bold cursor-pointer shadow-lg ${
                  !isSoundOn
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 animate-pulse"
                }`}
              >
                {isSoundOn
                  ? isKo
                    ? "🔊 내레이터 해설 켜짐"
                    : "🔊 Narrator ON"
                  : isKo
                  ? "🔇 내레이터 소리 켜기"
                  : "🔇 Tap for Voice"}
              </button>

              <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border bg-black/85 text-emerald-300 border-emerald-500/40 shadow">
                🧬 {isKo ? "줄기세포 활성도" : "Viability"}: {activeExp.stemCellBridge.viabilityPercent}% ({activeExp.pulseBpm} BPM)
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPhotoOverlay((prev) => !prev);
                }}
                className="bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-[10px] px-2 py-1 rounded-md font-semibold cursor-pointer shadow"
              >
                {showPhotoOverlay
                  ? isKo
                    ? "🎬 현미경 동영상 보기"
                    : "🎬 Microscopy Video"
                  : isKo
                  ? "📸 실제 실험 사진 보기"
                  : "📸 Confocal Photo"}
              </button>

              <canvas
                ref={canvasRef}
                width={110}
                height={26}
                className="bg-black/80 border border-emerald-500/30 rounded px-1"
              />
            </div>

            {/* Real Photographic Evidence Thumbnail Card (Bottom-Right on Desktop) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowPhotoOverlay((prev) => !prev);
              }}
              className="hidden md:flex absolute bottom-3 right-3 z-20 bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 rounded-xl p-2 items-center gap-2.5 max-w-[340px] shadow-2xl hover:border-emerald-400 transition cursor-pointer"
            >
              <img
                src={activeExp.microscopyPhotoUrl}
                alt="Confocal Microscopy"
                className="w-14 h-14 rounded-lg object-cover border border-emerald-400/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  {isKo ? "실제 학술지 실험 사진 (클릭 시 확대)" : "VERIFIED LAB PHOTO (CLICK)"}
                </span>
                <p className="text-[11px] font-bold text-white truncate mt-0.5">{activeExp.journalCitation}</p>
                <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight mt-0.5">
                  {isKo ? activeExp.stemCellBridge.koreanLineage : activeExp.stemCellBridge.lineage}
                </p>
              </div>
            </div>

            {/* MOBILE FLOATING OVERLAY */}
            <div
              className="md:hidden absolute bottom-0 inset-x-0 z-20 flex flex-col justify-end bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-2.5 pb-2 pt-6 pointer-events-none gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 0. Mobile 3s Auto-Absorbing Synapse Chat */}
              {mobileChatPhase !== "hidden" && mobileVisibleMessages.length > 0 && (
                <div className="w-full max-h-[34dvh] overflow-hidden flex flex-col justify-end mb-1 pointer-events-none">
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
                              : "max-w-[90%] px-3 py-1.5 rounded-2xl rounded-bl-xs text-xs bg-slate-950/90 backdrop-blur-md text-emerald-100 border border-emerald-500/40 shadow-lg break-words"
                          }
                        >
                          <p>{isKo ? msg.textKo : msg.textEn}</p>
                          {(isKo ? msg.subTextKo : msg.subTextEn) && (
                            <p className="text-[11px] text-slate-300 mt-1 border-t border-slate-700/80 pt-1">
                              {isKo ? msg.subTextKo : msg.subTextEn}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={mobileChatEndRef} className="h-0 w-0" />
                  </div>
                </div>
              )}

              {/* 1. Mobile Specimen Selection Chips */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
                {experiments.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => handleSelectExperiment(exp)}
                    className={`text-[10px] px-2.5 py-1 rounded-full cursor-pointer shadow flex items-center gap-1 border shrink-0 transition ${
                      activeExp.id === exp.id
                        ? "bg-emerald-500 text-slate-950 border-emerald-300 font-black"
                        : "bg-slate-900/85 backdrop-blur-xs text-slate-200 border-slate-700"
                    }`}
                  >
                    <span>{exp.badgeIcon}</span>
                    <span className="truncate max-w-[125px]">
                      {isKo ? exp.koreanShortTitle : exp.shortTitle}
                    </span>
                  </button>
                ))}
              </div>

              {/* 2. Mobile Active Specimen & [🧬 Mythic Chimera Assembler] Bar */}
              <div className="bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-emerald-500/40 flex items-center justify-between gap-2 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xl shrink-0">{activeExp.badgeIcon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {isKo ? activeExp.koreanShortTitle : activeExp.shortTitle}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-mono truncate">
                      {activeExp.stemCellBridge.factors.slice(0, 4).join(" · ")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStitchModalOpen((prev) => !prev)}
                  className="bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 cursor-pointer shadow-lg flex items-center gap-1"
                >
                  <span>⚡</span>
                  <span>
                    {isStitchModalOpen
                      ? isKo
                        ? "실험실 닫기"
                        : "Close Lab"
                      : isKo
                      ? "키메라 조립·부활"
                      : "Assemble Chimera"}
                  </span>
                </button>
              </div>

              {/* 3. Mobile Floating Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-1.5 pointer-events-auto">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isKo
                      ? "질문 또는 생물학 미스터리 검색 (실시간 PubMed)..."
                      : "Ask Dr. Kiro or search PubMed live..."
                  }
                  className="flex-1 min-w-0 bg-black/80 backdrop-blur-md border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={isQueryingApi}
                  className="bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-lg text-xs font-black text-slate-950 shrink-0 cursor-pointer shadow"
                >
                  {isQueryingApi ? "..." : isKo ? "전송" : "Send"}
                </button>
              </form>
            </div>

            {/* BLOCK 4 OVERLAY: [Tab 1] Mythic Chimera 4-Part Video Morphing Assembler & [Tab 2] Live PubMed Dossier */}
            {isStitchModalOpen && (
              <div
                className="absolute inset-x-2 bottom-2 top-12 z-30 bg-slate-950/95 border-2 border-emerald-400 p-3 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl overflow-y-auto box-border flex flex-col gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header & Mode Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-2.5 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveModalTab("chimera_assembler")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition flex items-center gap-1.5 ${
                        activeModalTab === "chimera_assembler"
                          ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-lg"
                          : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <span>⚡</span>
                      <span>
                        {isKo
                          ? "1. 신화적 키메라 생명체 조립 & 부활 배양기"
                          : "1. Mythic Chimera Bio-Assembler"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModalTab("pubmed_dossier")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition flex items-center gap-1.5 ${
                        activeModalTab === "pubmed_dossier"
                          ? "bg-cyan-500 text-slate-950 shadow-lg"
                          : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <span>🔬</span>
                      <span>
                        {isKo
                          ? "2. 현재 사례 줄기세포 분석 & 실시간 PubMed 논문"
                          : "2. Case iPSC Bridge & Live PubMed"}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsStitchModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer self-end sm:self-auto"
                  >
                    ✕ {isKo ? "닫기" : "Close"}
                  </button>
                </div>

                {/* TAB 1: MYTHIC CHIMERA ASSEMBLER & VIDEO-LIKE BIOREACTOR MORPHING */}
                {activeModalTab === "chimera_assembler" ? (
                  <div className="flex flex-col gap-3">
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-200 leading-relaxed">
                      {isKo
                        ? "💡 6대 실제 실험에서 검증된 기술(인간 뇌 오가노이드, 유령 심장, 생체 로봇 등)을 결합해 머리·심장·몸통·팔다리를 조립하세요! 만능줄기세포(iPSC) 배양기 속에서 세포가 분열하며 새로운 생명체로 변이·부활합니다."
                        : "💡 Combine real experimental breakthroughs (cortical organoids, Ghost Heart, biobots) to stitch a custom Head, Heart, Torso, and Limbs inside the iPSC Bioreactor!"}
                    </div>

                    {/* 4 Body Part Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* 1. Head / Brain */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-emerald-400">
                          🧠 {isKo ? "1. 두뇌 (Head / Cortex) 선택" : "1. Select Head / Brain"}
                        </label>
                        <select
                          value={selectedHead.id}
                          onChange={(e) =>
                            setSelectedHead(headOptions.find((o) => o.id === e.target.value) || headOptions[0])
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                        >
                          {headOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.icon} {isKo ? o.nameKo : o.nameEn}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isKo ? selectedHead.descKo : selectedHead.descEn}
                        </p>
                      </div>

                      {/* 2. Heart / Core */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-rose-400">
                          🫀 {isKo ? "2. 심장 (Heart / Core) 선택" : "2. Select Heart / Core"}
                        </label>
                        <select
                          value={selectedHeart.id}
                          onChange={(e) =>
                            setSelectedHeart(heartOptions.find((o) => o.id === e.target.value) || heartOptions[0])
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
                        >
                          {heartOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.icon} {isKo ? o.nameKo : o.nameEn}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isKo ? selectedHeart.descKo : selectedHeart.descEn}
                        </p>
                      </div>

                      {/* 3. Torso / Body */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-amber-400">
                          🦁 {isKo ? "3. 몸통 (Torso / Thorax) 선택" : "3. Select Torso / Body"}
                        </label>
                        <select
                          value={selectedTorso.id}
                          onChange={(e) =>
                            setSelectedTorso(torsoOptions.find((o) => o.id === e.target.value) || torsoOptions[0])
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          {torsoOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.icon} {isKo ? o.nameKo : o.nameEn}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isKo ? selectedTorso.descKo : selectedTorso.descEn}
                        </p>
                      </div>

                      {/* 4. Limbs */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-cyan-400">
                          🦎 {isKo ? "4. 팔다리·날개 (Limbs) 선택" : "4. Select Limbs / Wings"}
                        </label>
                        <select
                          value={selectedLimbs.id}
                          onChange={(e) =>
                            setSelectedLimbs(limbOptions.find((o) => o.id === e.target.value) || limbOptions[0])
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          {limbOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.icon} {isKo ? o.nameKo : o.nameEn}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isKo ? selectedLimbs.descKo : selectedLimbs.descEn}
                        </p>
                      </div>
                    </div>

                    {/* Visual Bioreactor Chamber & Morphing Action */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-900/95 border-2 border-emerald-500/40 rounded-2xl p-3">
                      <div className="md:col-span-5 relative rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 h-[170px] flex items-center justify-center">
                        <canvas
                          ref={bioreactorCanvasRef}
                          width={320}
                          height={170}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="relative z-10 flex flex-col items-center text-center pointer-events-none px-2">
                          <div className="text-3xl sm:text-4xl animate-pulse-glow flex items-center gap-1 bg-black/65 px-3 py-1.5 rounded-2xl border border-white/15">
                            <span>{selectedHead.icon}</span>
                            <span>+</span>
                            <span>{selectedHeart.icon}</span>
                            <span>+</span>
                            <span>{selectedTorso.icon}</span>
                            <span>+</span>
                            <span>{selectedLimbs.icon}</span>
                          </div>
                          <span className="mt-2 text-[10px] font-mono bg-black/80 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                            {morphStage === "idle"
                              ? isKo
                                ? "배양기 대기 중 (Ready to Stitch)"
                                : "Bioreactor Standby"
                              : morphStage === "injecting"
                              ? isKo
                                ? "🧬 야마나카 줄기세포 주입 중... (18%)"
                                : "🧬 Injecting Yamanaka iPSCs... (18%)"
                              : morphStage === "morphing"
                              ? isKo
                                ? "⚡ 신경·혈관 급속 변이 및 융합 중... (68%)"
                                : "⚡ Rapid Morphogenesis & Lightning... (68%)"
                              : isKo
                              ? "✨ 신규 키메라 생명체 부활 완료! (100%)"
                              : "✨ Chimera Awakened! (100%)"}
                          </span>
                        </div>
                      </div>

                      <div className="md:col-span-7 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleAssembleChimera}
                          disabled={morphStage === "injecting" || morphStage === "morphing"}
                          className="w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm cursor-pointer shadow-xl transition active:scale-98"
                        >
                          {morphStage === "injecting" || morphStage === "morphing"
                            ? isKo
                              ? "⚡ 배양기 세포 분열 및 생체 접합 진행 중..."
                              : "⚡ Bioreactor Morphing in Progress..."
                            : isKo
                            ? "⚡ 만능줄기세포(iPSC) 주입 & 키메라 생명체 부활 가동!"
                            : "⚡ Inject iPSC Stem Cells & Resurrect Chimera!"}
                        </button>

                        {chimeraResult ? (
                          <div className="bg-slate-950 border-2 border-amber-400/70 rounded-xl p-3 flex flex-col gap-1.5 animate-fadeIn">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm font-black text-amber-300">
                                {chimeraResult.badge} {isKo ? chimeraResult.titleKo : chimeraResult.titleEn}
                              </span>
                              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 shrink-0">
                                {chimeraResult.bpm} BPM
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-relaxed">
                              {isKo ? chimeraResult.storyKo : chimeraResult.storyEn}
                            </p>
                            <p className="text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 mt-0.5">
                              {isKo ? chimeraResult.firstWordsKo : chimeraResult.firstWordsEn}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
                            {isKo
                              ? "👆 위 버튼을 누르면 선택한 4가지 부위(두뇌·심장·몸통·사지)가 만능줄기세포 배양기 안에서 동영상처럼 변이하며 [신화적 수호신 스핑크스], [6팔 프로게이머 괴물], 또는 [자정의 문워크 프랑켄슈타인]으로 깨어납니다!"
                              : "👆 Click the button above to fuse your 4 chosen parts inside the bioreactor and witness which creature awakens!"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: CASE IPSC BRIDGE & LIVE PUBMED DOSSIER */
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
                      <div className="bg-slate-900/90 border border-rose-500/40 rounded-xl p-2.5 flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-rose-400 font-bold">
                          1. {isKo ? "숙주 생체 조직 (TISSUE A)" : "HOST SUBSTRATE (TISSUE A)"}
                        </span>
                        <p className="text-xs font-bold text-white mt-1">
                          {isKo ? activeExp.koreanHostTissueA : activeExp.hostTissueA}
                        </p>
                      </div>

                      <div className="bg-emerald-950/60 border-2 border-emerald-400 rounded-xl p-2.5 flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-emerald-300 font-black">
                          2. 🧬 {isKo ? "만능줄기세포(iPSC) 접합 브릿지" : "iPSC STEM-CELL BRIDGE"}
                        </span>
                        <p className="text-xs font-extrabold text-white mt-1">
                          {isKo ? activeExp.stemCellBridge.koreanLineage : activeExp.stemCellBridge.lineage}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {activeExp.stemCellBridge.factors.map((f) => (
                            <span
                              key={f}
                              className="text-[9px] font-mono bg-slate-950/90 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-2.5 flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          3. {isKo ? "이식·융합 조직 (TISSUE B)" : "DONOR / CHIMERA (TISSUE B)"}
                        </span>
                        <p className="text-xs font-bold text-white mt-1">
                          {isKo ? activeExp.koreanDonorTissueB : activeExp.donorTissueB}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed">
                      <strong className="text-emerald-400">
                        ⚡ {isKo ? "줄기세포 접합 메커니즘: " : "Bio-Stitch Mechanism: "}
                      </strong>
                      {isKo
                        ? activeExp.stemCellBridge.koreanFusionMechanism
                        : activeExp.stemCellBridge.fusionMechanism}
                    </div>

                    <form onSubmit={handleCustomLiveSearch} className="flex gap-2">
                      <input
                        type="text"
                        value={customStitchQuery}
                        onChange={(e) => setCustomStitchQuery(e.target.value)}
                        placeholder={
                          isKo
                            ? "PubMed 및 위키피디아 실시간 학술 검색 (예: cerebral organoid, xenobot)..."
                            : "Search live PubMed & Wikipedia (e.g., brain organoid, xenobot)..."
                        }
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="submit"
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer shrink-0"
                      >
                        🔬 {isKo ? "실시간 논문 검색" : "Live PubMed Search"}
                      </button>
                    </form>

                    <div className="flex flex-col gap-2">
                      {isLoadingPapers && (
                        <span className="text-[11px] text-emerald-400 animate-pulse">
                          {isKo
                            ? "실시간 PubMed / EuropePMC 및 백과사전 데이터베이스 조회 중..."
                            : "Querying live scientific databases..."}
                        </span>
                      )}

                      {liveWiki && (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 flex items-start gap-2.5">
                          {liveWiki.thumbnailUrl && (
                            <img
                              src={liveWiki.thumbnailUrl}
                              alt={liveWiki.title}
                              className="w-12 h-12 rounded object-cover shrink-0 border border-slate-700"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-[11px]">📚 {liveWiki.title}</p>
                            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{liveWiki.extract}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2">
                        {livePapers.map((p) => (
                          <div
                            key={p.id}
                            className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-emerald-300 line-clamp-1">{p.title}</span>
                              {p.pmid && (
                                <a
                                  href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 shrink-0"
                                >
                                  PMID:{p.pmid} ↗
                                </a>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {p.authorString} · <span className="text-amber-300">{p.journalTitle} ({p.pubYear})</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Bottom Specimen & Chimera Assembler Action Card */}
          <div className="hidden md:block mt-2 shrink-0 w-full box-border">
            <div className="bg-slate-900/95 p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-3 shadow-xl w-full h-[74px] box-border overflow-hidden">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
                  {activeExp.badgeIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-white truncate">
                    {isKo ? activeExp.koreanHeadline : activeExp.headline}
                  </p>
                  <p className="text-[11px] text-emerald-300 font-mono truncate mt-0.5">
                    🧬 {isKo ? activeExp.stemCellBridge.koreanLineage : activeExp.stemCellBridge.lineage} ({activeExp.journalCitation})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStitchModalOpen((prev) => !prev)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black shrink-0 cursor-pointer shadow-lg transition flex items-center gap-1.5 border ${
                  isStitchModalOpen
                    ? "bg-slate-800 text-slate-200 border-slate-600"
                    : "bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 border-emerald-300 active:scale-95"
                }`}
              >
                <span>⚡</span>
                <span>
                  {isStitchModalOpen
                    ? isKo
                      ? "조립 실험실 닫기"
                      : "Close Lab"
                    : isKo
                    ? "신화적 키메라 조립 & 부활 실험"
                    : "Mythic Chimera Bio-Assembler"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Desktop 5-Column AI Bio-Telemetry & Real-World Specimen Archive */}
        <div className="hidden md:flex md:h-full md:col-span-5 bg-slate-900/85 border border-emerald-500/30 rounded-2xl flex-col shadow-2xl w-full max-w-full overflow-hidden box-border">
          <div
            ref={chatMessagesRef}
            className="flex-1 min-h-0 p-3 overflow-y-auto no-scrollbar flex flex-col gap-2.5 w-full box-border"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.sender === "researcher"
                    ? "flex flex-col items-end w-full"
                    : "flex flex-col items-start w-full"
                }
              >
                <div
                  className={
                    msg.sender === "researcher"
                      ? "max-w-[85%] p-2.5 rounded-xl text-xs bg-emerald-500 text-slate-950 font-bold shadow"
                      : "w-full p-3 rounded-xl text-xs bg-slate-950/90 text-slate-200 border border-slate-800 shadow-md flex flex-col gap-1.5"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {msg.sender === "researcher"
                        ? isKo
                          ? "🧑‍🔬 연구원 (YOU)"
                          : "🧑‍🔬 RESEARCHER"
                        : isKo
                        ? "🧬 빅터 키로 박사 (AI 수석 생명공학자)"
                        : "🧬 DR. VICTOR KIRO (iPSC AI)"}
                    </span>
                    {msg.pmidBadge && (
                      <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        {msg.pmidBadge}
                      </span>
                    )}
                  </div>

                  {langMode !== "EN" && (
                    <p className="leading-relaxed font-semibold text-white">{msg.textKo}</p>
                  )}
                  {langMode !== "KO" && (
                    <p className="leading-relaxed font-medium text-emerald-200">{msg.textEn}</p>
                  )}

                  {(isKo ? msg.subTextKo : msg.subTextEn) && (
                    <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                      {langMode !== "EN" && <p>{msg.subTextKo}</p>}
                      {langMode === "BOTH" && msg.subTextEn && (
                        <p className="text-slate-400 mt-1">{msg.subTextEn}</p>
                      )}
                      {langMode === "EN" && <p>{msg.subTextEn}</p>}
                    </div>
                  )}

                  {msg.linkedCase && (
                    <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-amber-300 font-mono truncate">
                        iPSC: {msg.linkedCase.stemCellBridge.factors.join(", ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveExp(msg.linkedCase!);
                          setIsStitchModalOpen(true);
                        }}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer shrink-0"
                      >
                        ⚡ {isKo ? "키메라 조립실 열기" : "Open Bio-Assembler"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-0 w-0" />
          </div>

          {/* 6 Real-World Bio-Frankenstein Experiment Chips */}
          <div className="px-2.5 pt-2 pb-2 flex gap-1.5 flex-wrap border-t border-slate-800 bg-slate-950/70 shrink-0 w-full box-border">
            {experiments.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => handleSelectExperiment(exp)}
                className={`text-[11px] px-2.5 py-1 rounded-full cursor-pointer shadow-sm flex items-center gap-1 border transition ${
                  activeExp.id === exp.id
                    ? "bg-emerald-500 text-slate-950 border-emerald-300 font-black"
                    : "bg-slate-900 text-emerald-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span>{exp.badgeIcon}</span>
                <span className="truncate max-w-[135px]">
                  {isKo ? exp.koreanShortTitle : exp.shortTitle}
                </span>
              </button>
            ))}
          </div>

          {/* Live Chat & PubMed Search Form */}
          <form
            onSubmit={handleSendChat}
            className="p-2.5 border-t border-slate-800 flex gap-2 bg-slate-900 shrink-0 w-full box-border"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isKo
                  ? "실험 질문 또는 생물학 키워드 검색 (예: 쥐 뇌, 유령 심장, organoid)..."
                  : "Ask about any experiment or search PubMed..."
              }
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={isQueryingApi}
              className="bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1.5 rounded-lg text-xs font-black text-slate-950 shrink-0 cursor-pointer transition"
            >
              {isQueryingApi ? "..." : isKo ? "전송" : "Send"}
            </button>
          </form>
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
                <span className="text-lg shrink-0">🐭</span>
                <div>
                  <p className="font-bold text-emerald-400 mb-0.5">1. 6대 실제 줄기세포 실험 탐구</p>
                  <p className="text-slate-300 leading-snug">
                    하단 <strong>6개 실험 칩(쥐 뇌 92% 인간화, 유령 심장 등)</strong>을 누르면 실제 현미경 영상·사진과 논문으로 즉시 전환됩니다.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">⚡</span>
                <div>
                  <p className="font-bold text-amber-400 mb-0.5">2. 신화적 키메라 조립 & 부활</p>
                  <p className="text-slate-300 leading-snug">
                    <strong>신화적 키메라 조립 & 부활</strong> 버튼에서 두뇌·심장·몸통·사지를 조합해 배양기 변이 애니메이션과 반전 생명체를 깨웁니다.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">🌐</span>
                <div>
                  <p className="font-bold text-cyan-400 mb-0.5">3. 한·영 실시간 번역 & 음성 해설</p>
                  <p className="text-slate-300 leading-snug">
                    상단 <strong>🇰🇷 한국어 / 🇺🇸 ENG / 🌐 한+영</strong> 버튼으로 전체 언어와 박사님의 음성 내레이션을 즉시 전환합니다.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">💬</span>
                <div>
                  <p className="font-bold text-emerald-300 mb-0.5">4. 실시간 논문 검색 & 3초 채팅</p>
                  <p className="text-slate-300 leading-snug">
                    질문 입력 시 PubMed·백과사전을 실시간 검색하며, 모바일에선 <strong>3초 후 위로 사라진 뒤 재노출되지 않습니다.</strong>
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">📸</span>
                <div>
                  <p className="font-bold text-rose-400 mb-0.5">5. 실제 학술지 실험 사진 전환</p>
                  <p className="text-slate-300 leading-snug">
                    우측 상단 <strong>실제 실험 사진 보기</strong> 버튼으로 현미경 동영상과 고해상도 실험 증거 사진을 교차 확인합니다.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">📐</span>
                <div>
                  <p className="font-bold text-purple-400 mb-0.5">6. Kiro Spec-Driven 설계도</p>
                  <p className="text-slate-300 leading-snug">
                    상단 <strong>.kiro Plan</strong> 버튼에서 Kiro IDE의 Steering·Requirements·Design·Hooks 명세를 확인합니다.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition cursor-pointer"
            >
              확인 완료 — 현재 실험실 화면으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* KIRO SPEC-DRIVEN DEVELOPMENT SHOWCASE MODAL */}
      {isKiroSpecModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-slate-100"
          onClick={() => setIsKiroSpecModalOpen(false)}
        >
          <div
            className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
                  KIROWEEN 2026 · HOW WE USED KIRO
                </span>
                <h2 className="text-sm sm:text-base font-black text-white mt-1">
                  📐 Kiro Spec-Driven Architecture (`/.kiro` Directory)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsKiroSpecModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-3">
                <p className="font-mono font-bold text-purple-300">/.kiro/steering/</p>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Defined domain rules in <code>product.md</code> and <code>tech.md</code> to anchor the Frankenstein track around real iPSC stem-cell biology and zero-key PubMed/Wikipedia REST APIs.
                </p>
              </div>
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3">
                <p className="font-mono font-bold text-emerald-300">/.kiro/specs/</p>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Authored EARS-notation <code>requirements.md</code>, Mermaid state machines in <code>design.md</code>, and modular 4-block execution checklists in <code>tasks.md</code> before writing code.
                </p>
              </div>
              <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3">
                <p className="font-mono font-bold text-cyan-300">/.kiro/hooks/</p>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Configured <code>pubmed-citation-verifier.hook.json</code> to automatically validate PMID/DOI citations and Yamanaka factor lineages on every save of <code>bioExperiments.ts</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BioStitchLabView;
