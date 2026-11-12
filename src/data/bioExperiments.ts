export interface BioExperimentCase {
  id: string;
  codeName: string;
  badgeIcon: string;
  shortTitle: string;
  koreanShortTitle: string;
  headline: string;
  koreanHeadline: string;
  institution: string;
  leadScientist: string;
  journalCitation: string;
  pmidOrDoi: string;
  pubMedSearchQuery: string;
  wikiTitle: string;
  videoUrl: string;
  fallbackVideoUrl: string;
  microscopyPhotoUrl: string;
  secondaryPhotoUrl: string;
  hostTissueA: string;
  koreanHostTissueA: string;
  stemCellBridge: {
    factors: string[];
    lineage: string;
    koreanLineage: string;
    viabilityPercent: number;
    fusionMechanism: string;
    koreanFusionMechanism: string;
  };
  donorTissueB: string;
  koreanDonorTissueB: string;
  eerieRealitySummary: string;
  koreanSummary: string;
  narratorScript: string[];
  koreanNarratorScript: string[];
  themeColor: "emerald" | "cyan" | "rose" | "amber" | "purple" | "blue";
  pulseBpm: number;
}

export interface ChimeraPartOption {
  id: string;
  category: "head" | "heart" | "torso" | "limbs";
  icon: string;
  nameEn: string;
  nameKo: string;
  originCase: string;
  descEn: string;
  descKo: string;
  traitTag: "mythic" | "gamer" | "disco";
}

export const CHIMERA_PART_OPTIONS: ChimeraPartOption[] = [
  // HEAD / BRAIN
  {
    id: "head-philosopher",
    category: "head",
    icon: "🧠✨",
    nameEn: "92% Human Cortical Organoid (Philosopher Brain)",
    nameKo: "92% 인간 대뇌 오가노이드 (고차원 철학자의 뇌)",
    originCase: "Stanford Xenocortication",
    descEn: "Awakened von Economo consciousness neurons capable of deep riddles and telepathic calculation.",
    descKo: "폰 에코노모 자아 신경세포가 깨어나 고대 스핑크스처럼 심오한 수수께끼를 던지는 천재 두뇌",
    traitTag: "mythic"
  },
  {
    id: "head-dishbrain",
    category: "head",
    icon: "🕹️⚡",
    nameEn: "DishBrain 800K Silicon-Fused Gamer Cortex",
    nameKo: "DishBrain 80만 뉴런 프로게이머 하이브리드 뇌",
    originCase: "Cortical Labs DishBrain",
    descEn: " Obsessed with high-score arcade loops and 0.1ms reflex frame-perfect calculation.",
    descKo: "반도체 칩과 융합되어 승부욕과 아케이드 게임 본능이 극대화된 초고속 반사신경 두뇌",
    traitTag: "gamer"
  },
  {
    id: "head-brainex",
    category: "head",
    icon: "🎧🌙",
    nameEn: "Revived Midnight Groove Cortex (BrainEx Rhythm)",
    nameKo: "사후 4시간 부활한 자정의 리듬 뇌 (BrainEx)",
    originCase: "Yale BrainEx Protocol",
    descEn: "Pulsatile perfusion waves locked to a 128 BPM synthwave Halloween rhythm.",
    descKo: "인공 관류 펌프의 맥박이 128 BPM 디스코 비트와 공명하여 멈출 수 없는 흥을 내뿜는 두뇌",
    traitTag: "disco"
  },
  // HEART / CORE
  {
    id: "heart-ghost",
    category: "heart",
    icon: "👻🫀",
    nameEn: "Translucent Bioluminescent Ghost Heart",
    nameKo: "반투명 네온 발광 유령 심장 (Ghost Heart)",
    originCase: "Doris Taylor ECM Lab",
    descEn: "Decellularized white collagen scaffold glowing with emerald iPSC cardiomyocytes.",
    descKo: "새하얀 반투명 유령 심장 뼈대 속에서 에메랄드빛 줄기세포가 신비롭게 박동하는 심장",
    traitTag: "mythic"
  },
  {
    id: "heart-overclock",
    category: "heart",
    icon: "⚡🔋",
    nameEn: "240-BPM Overclocked Twin Pacemaker Core",
    nameKo: "240-BPM 초고속 오버클럭 듀얼 심장",
    originCase: "iPSC Cardiac Hydrogel",
    descEn: "Pumps pure adrenaline and ATP for non-stop marathon gaming and hyper-reflexes.",
    descKo: "초당 120타 컨트롤을 뒷받침하기 위해 초고속으로 에너지를 뿜어내는 듀얼 펌프 심장",
    traitTag: "gamer"
  },
  {
    id: "heart-subwoofer",
    category: "heart",
    icon: "🔊💜",
    nameEn: "Acoustic Subwoofer Pulse Organoid",
    nameKo: "중저음 서브우퍼 비트 심장 오가노이드",
    originCase: "Bio-AcousticPerfusion",
    descEn: "Every heartbeat drops a resonant Halloween bassline across the laboratory floor.",
    descKo: "심장이 뛸 때마다 실험실 바닥을 울리는 묵직한 할로윈 베이스 비트를 방출하는 심장",
    traitTag: "disco"
  },
  // TORSO / BODY
  {
    id: "torso-sphinx",
    category: "torso",
    icon: "🦁🏛️",
    nameEn: "Golden Chimeric Lion-Griffin Thorax",
    nameKo: "신화 속 황금 사자·그리핀 키메라 몸통",
    originCase: "Interspecies Blastocyst",
    descEn: "Majestic mythical guardian torso stitched via interspecies pluripotent stem-cell niches.",
    descKo: "이종 간 만능줄기세포 배아 융합으로 탄생한 고대 신화 속 위엄 넘치는 황금 수호신 동체",
    traitTag: "mythic"
  },
  {
    id: "torso-cyber",
    category: "torso",
    icon: "🖥️🧬",
    nameEn: "RGB Bioluminescent Exoskeleton Chasis",
    nameKo: "RGB 생체발광 게이밍 외골격 몸통",
    originCase: "CMOS Wetware Hybrid",
    descEn: " nerves wired directly into an illuminated translucent gaming ribcage.",
    descKo: "신경망이 화려한 네온 혈관과 연결되어 실시간으로 승률과 텐션을 빛으로 표현하는 몸통",
    traitTag: "gamer"
  },
  {
    id: "torso-mirror",
    category: "torso",
    icon: "🪩✨",
    nameEn: "Iridescent Jellyfish Mirror-Ball Torso",
    nameKo: "천연 미러볼 발광 해파리·크리스탈 몸통",
    originCase: "GFP Fluorescent Chimera",
    descEn: "Refracts green fluorescent protein (GFP) light into a dazzling midnight dancefloor.",
    descKo: "녹색형광단백질(GFP) 수정체 비늘이 실험실 전체를 할로윈 무도회장으로 바꾸는 몸통",
    traitTag: "disco"
  },
  // LIMBS
  {
    id: "limbs-wings",
    category: "limbs",
    icon: "🦅🦎",
    nameEn: "Immortal Axolotl-Phoenix Regenerating Wings & Paws",
    nameKo: "아홀로틀·불사조 무한 재생 날개와 사지",
    originCase: "Neoblast Regeneration",
    descEn: "Instantly regenerates any scratch with mythic grace and golden feathers.",
    descKo: "상처가 나도 즉시 완벽하게 재생되는 불사의 날개와 신비로운 수호신의 발",
    traitTag: "mythic"
  },
  {
    id: "limbs-octo",
    category: "limbs",
    icon: "🐙🎮",
    nameEn: "6 Hyper-Dexterous Arcade Tentacle Arms (1200 APM)",
    nameKo: "분당 1200타(APM) 6개의 초정밀 아케이드 팔다리",
    originCase: "Multicellular Biobot",
    descEn: "Six synchronized limbs capable of playing 3 keyboards and 2 joysticks simultaneously.",
    descKo: "동시에 키보드 3개와 조이스틱 2개를 완벽히 조작하는 6개의 초고속 멀티태스킹 팔다리",
    traitTag: "gamer"
  },
  {
    id: "limbs-moonwalk",
    category: "limbs",
    icon: "🕺🦠",
    nameEn: "Million-Cilia Zero-Friction Moonwalk Legs",
    nameKo: "수백만 섬모(Cilia) 무중력 문워크 댄스 다리",
    originCase: "Tufts Human Anthrobots",
    descEn: "Microscopic cilia arrays allow effortless 360-degree gliding and moonwalking on air.",
    descKo: "앤스로봇의 미세 섬모 추진력을 이용해 유리 바닥 위를 미끄러지듯 문워크하는 춤신춤왕 다리",
    traitTag: "disco"
  }
];

export const VERIFIED_BIO_EXPERIMENTS: BioExperimentCase[] = [
  {
    id: "case-01-xenocortication",
    codeName: "CASE #01 · XENOCORTICATION",
    badgeIcon: "🐭🧠",
    shortTitle: "92% Human-Brain Mouse",
    koreanShortTitle: "쥐 뇌 92% 인간화",
    headline: "Stanford 'Xenocortication': Mouse Cortex 92% Replaced by Human Stem-Cell Brain",
    koreanHeadline: "[최신 뉴스] 쥐의 뇌 92%를 대체한 인간 줄기세포 대뇌 오가노이드 (스탠퍼드대)",
    institution: "Stanford University (Sergiu Pașca Lab)",
    leadScientist: "Dr. Sergiu Pașca et al.",
    journalCitation: "Nature (2022–2026 Landmark Xenocortication Series)",
    pmidOrDoi: "PMID: 36224417 / DOI: 10.1038/s41586-022-05277-w",
    pubMedSearchQuery: "human cortical organoids transplanted rodent brain Pasca",
    wikiTitle: "Cerebral_organoid",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Mitosis_480%2A360.theora.ogv",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/MTS_mitosis_project.theora.ogv",
    microscopyPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/61/Human_Cerebral_Organoids_%2853728295930%29.jpg",
    secondaryPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ee/Human_Brain_Organoid.jpg",
    hostTissueA: "Genetically Depleted Rodent Neocortex & Hippocampus Cavity",
    koreanHostTissueA: "대뇌 피질과 해마 영역을 비워낸 설치류(쥐) 두개골 숙주",
    stemCellBridge: {
      factors: ["OCT4", "SOX2", "KLF4", "c-MYC", "Dual-SMAD Inhibition"],
      lineage: "hiPSC-Derived Cortical Organoids & Von Economo Neurons",
      koreanLineage: "인간 유도만능줄기세포(hiPSC) 대뇌 오가노이드 & 폰 에코노모 자아 뉴런",
      viabilityPercent: 92,
      fusionMechanism: "Host rodent blood vessels vascularize the human stem-cell organoid; human axons project down to the mouse spinal cord and wire into whisker/visual sensory circuits.",
      koreanFusionMechanism: "쥐의 뇌혈관이 이식된 인간 줄기세포 뇌 오가노이드 속으로 자라 들어가 영양을 공급하고, 인간 신경 다발이 쥐의 척수까지 뻗어 내려가 수염 감각 및 행동 회로를 직접 장악합니다."
    },
    donorTissueB: "Human Induced Pluripotent Stem Cell (hiPSC) 3D Cerebral Organoid",
    koreanDonorTissueB: "인간 유도만능줄기세포(hiPSC) 3차원 대뇌 피질 오가노이드",
    eerieRealitySummary: "By depleting the native mouse cortex and transplanting human pluripotent stem-cell brain organoids, human neural tissue expanded to occupy 92% of the cortical volume—spontaneously awakening human-specific 'von Economo' consciousness neurons and actively driving the animal's behavior.",
    koreanSummary: "쥐의 대뇌 피질을 비워내고 인간 유도만능줄기세포(hiPSC)로 배양한 뇌 오가노이드를 이식하자, 쥐의 뇌 혈관이 인간 뇌세포에 연결되며 대뇌의 무려 92%가 인간 뇌 조직으로 채워졌습니다. 심지어 배양 접시에서는 절대 나타나지 않던 인간 고유의 고차원 자아 신경세포(폰 에코노모 뉴런)까지 깨어나 쥐의 척수와 행동을 직접 통제하기 시작했습니다.",
    narratorScript: [
      "Welcome to Project Prometheus. You are viewing Case Zero-One: Stanford University's Xenocortication breakthrough.",
      "Using human induced pluripotent stem cells, researchers grew three-dimensional human cerebral organoids and grafted them into a living rodent brain.",
      "The result shocked the scientific world: human neurons expanded to replace ninety-two percent of the host cortex, awakening human-specific von Economo neurons inside an animal skull."
    ],
    koreanNarratorScript: [
      "프로메테우스 줄기세포 실험실에 오신 것을 환영합니다. 첫 번째 사례는 스탠퍼드 대학의 제노코티케이션 실험입니다.",
      "연구진은 인간의 유도만능줄기세포로 입체 대뇌 오가노이드를 배양한 뒤 살아있는 쥐의 뇌 속에 이식했습니다.",
      "결과는 충격적이었습니다. 인간 뇌세포가 쥐 대뇌 피질의 구십이 퍼센트를 대체하며 척수까지 연결되었고, 인간 고유의 고차원 자아 신경세포인 폰 에코노모 뉴런까지 깨어났습니다."
    ],
    themeColor: "emerald",
    pulseBpm: 88
  },
  {
    id: "case-02-ghost-heart",
    codeName: "CASE #02 · GHOST HEART",
    badgeIcon: "👻🫀",
    shortTitle: "Beating Ghost Heart",
    koreanShortTitle: "박동하는 유령 심장",
    headline: "Decellularized 'Ghost Heart' Resurrected with iPSC Cardiomyocytes",
    koreanHeadline: "세포를 다 빼낸 새하얀 '유령 심장'에 만능줄기세포를 부어 다시 박동시키다",
    institution: "University of Minnesota / Texas Heart Institute",
    leadScientist: "Dr. Doris Taylor & Dr. Harald Ott",
    journalCitation: "Nature Medicine (Perfusion-decellularized matrix constructs)",
    pmidOrDoi: "PMID: 18193059 / DOI: 10.1038/nm1684",
    pubMedSearchQuery: "perfusion decellularized matrix heart stem cell recellularization",
    wikiTitle: "Decellularization",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s001.ogv",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Proteolysis-regulates-cardiomyocyte-maturation-and-tissue-integration-ncomms14495-s3.ogv",
    microscopyPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Blue_Veins_of_the_Heart%E2%80%99s_Shield.jpg",
    secondaryPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Human_embryonic_stem_cell_colony_phase.jpg",
    hostTissueA: "Cadaveric Translucent White Extracellular Matrix (ECM) Ghost Scaffold",
    koreanHostTissueA: "모든 세포를 씻어내어 유령처럼 새하얗고 반투명해진 심장 콜라겐 뼈대(ECM)",
    stemCellBridge: {
      factors: ["OCT4", "SOX2", "Activin-A", "BMP4", "Wnt-Modulators"],
      lineage: "iPSC-Derived Contracting Cardiomyocytes & Endothelial Cells",
      koreanLineage: "만능줄기세포(iPSC) 분화 박동 심근세포 및 혈관 내피세포",
      viabilityPercent: 96,
      fusionMechanism: "Pluripotent stem cells recognize the dead collagen vascular ghost channels, differentiating into synchronized heart muscle fibers that resume spontaneous electrical beating within 8 days.",
      koreanFusionMechanism: "만능줄기세포들이 죽은 심장의 텅 빈 콜라겐 혈관 통로를 스스로 인식하여 찾아 들어가고, 심장 근육 섬유로 분화하여 8일 만에 자발적인 전기 신호와 함께 다시 쿵쾅거리며 박동을 시작합니다."
    },
    donorTissueB: "Millions of Reprogrammed Pluripotent Stem-Cell Cardiac Progenitors",
    koreanDonorTissueB: "역분화 유도만능줄기세포(iPSC) 유래 수백만 개의 심장 전구세포",
    eerieRealitySummary: "A dead heart is washed with detergent until every living cell dissolves, leaving a spectral, translucent white 'Ghost Heart'. When injected with pluripotent stem cells, the cells migrate into the ghost vessels and suddenly begin beating in unison on Day 8.",
    koreanSummary: "죽은 심장에 특수 계면활성제를 흘려보내 모든 세포를 녹여내면 유령처럼 새하얗고 반투명한 콜라겐 뼈대('유령 심장')만 남습니다. 이 죽은 껍데기에 만능줄기세포(iPSC)를 주입하자, 세포들이 스스로 심장 근육과 혈관으로 분화하여 8일 만에 다시 스스로 쿵쾅거리며 박동하기 시작했습니다.",
    narratorScript: [
      "Case Zero-Two: The Ghost Heart resurrection protocol.",
      "By flushing a dead cadaver heart with cellular detergents, all DNA is stripped away, leaving an eerie, translucent white collagen ghost scaffold.",
      "When seeded with induced pluripotent stem cells, the stem cells recognize the ancient architecture, differentiate into heart muscle, and spontaneously begin beating again."
    ],
    koreanNarratorScript: [
      "두 번째 사례는 유령 심장 부활 프로젝트입니다.",
      "죽은 심장에 세포 용해제를 흘려보내 모든 디엔에이를 씻어내면, 유령처럼 새하얗고 투명한 콜라겐 심장 뼈대만 남게 됩니다.",
      "여기에 유도만능줄기세포를 주입하자, 줄기세포들이 스스로 빈 혈관과 심장 구조를 인식해 근육으로 분화하며 다시 힘차게 심장 박동을 시작했습니다."
    ],
    themeColor: "rose",
    pulseBpm: 74
  },
  {
    id: "case-03-yale-brainex",
    codeName: "CASE #03 · YALE BRAINEX",
    badgeIcon: "🧠⚡",
    shortTitle: "4-Hour Dead Brain Revived",
    koreanShortTitle: "사후 4시간 죽은 뇌 부활",
    headline: "Yale BrainEx: Synaptic Revival in Pig Brains 4 Hours Post-Mortem",
    koreanHeadline: "도축장 사후 4시간 지난 죽은 뇌에 인공 혈액을 주입해 뇌세포를 부활시키다 (예일대)",
    institution: "Yale School of Medicine",
    leadScientist: "Dr. Nenad Sestan et al.",
    journalCitation: "Nature (2019) Vol. 568, pp. 336–343",
    pmidOrDoi: "PMID: 30996318 / DOI: 10.1038/s41586-019-1099-1",
    pubMedSearchQuery: "Restoration of brain circulation and cellular functions hours post-mortem Sestan",
    wikiTitle: "BrainEx",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Frankenstein_1910.ogv",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Mitosis_480%2A360.theora.ogv",
    microscopyPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Charles_Ogle_In_Frankenstein_1910.jpg",
    secondaryPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/02/Methodological_advancement_in_brain_organoid_generation.webp",
    hostTissueA: "Decapitated Mammalian Brain (4 Hours Post-Mortem Ischemia)",
    koreanHostTissueA: "사망 후 4시간이 경과해 혈류가 완전히 멈춘 포유류의 분리된 뇌",
    stemCellBridge: {
      factors: ["Hemopure HbOC", "Cryoprotective Neuro-Glial Stabilizers", "Neural Progenitor Support"],
      lineage: "Revived Hippocampal & Prefrontal Cortical Pyramidal Neurons",
      koreanLineage: "사후 소생된 해마 및 전두엽 피질 피라미드 신경세포",
      viabilityPercent: 89,
      fusionMechanism: "Pulsatile computer-driven perfusion restores micro-capillary oxygen flow and glial homeostasis, allowing dead-zone neurons to fire action potentials again.",
      koreanFusionMechanism: "컴퓨터로 제어되는 인공 맥박 관류 장치가 미세 뇌혈관에 산소와 신경 보호 인자를 공급하자, 죽어가던 뇌세포들이 대사를 재개하고 시냅스 전기 신호를 다시 발화합니다."
    },
    donorTissueB: "BrainEx Synthetic Acellular Cytoprotective Perfusion Matrix",
    koreanDonorTissueB: "BrainEx 컴퓨터 맥박 제어 인공 생체 관류 솔루션",
    eerieRealitySummary: "Four hours after death and decapitation, brains connected to Yale's computerized BrainEx pump regained blood vessel dilation, glucose consumption, and spontaneous synaptic electrical firing—forcing scientists to keep general anesthesia on standby in case consciousness returned.",
    koreanSummary: "죽은 지 4시간이 지나 완전히 부패가 시작되어야 할 뇌에 예일대의 컴퓨터 제어 생체 관류 시스템(BrainEx)을 접합하자, 죽었던 뇌혈관이 다시 맥박에 맞춰 뛰고 해마와 대뇌 피질의 뉴런들이 다시 시냅스 전기 신호를 쏘기 시작했습니다. 연구진은 뇌가 고통을 느끼는 '의식'까지 깨어날까 봐 실험 내내 신경차단 마취제를 대기시켜야 했습니다.",
    narratorScript: [
      "Case Zero-Three: Yale University's BrainEx Post-Mortem Revival.",
      "Four hours after death, isolated brains were connected to a computerized pulsatile bio-perfusion matrix.",
      "Cerebral vessels dilated, cellular metabolism restarted, and individual neurons fired synaptic potentials—shattering the boundary between life and death."
    ],
    koreanNarratorScript: [
      "세 번째 사례는 예일 대학교의 브레인엑스 사후 뇌 부활 실험입니다.",
      "사망한 지 네 시간이 지난 뇌에 컴퓨터로 맥박을 모사하는 인공 혈액 관류 장치를 연결했습니다.",
      "그러자 죽었던 뇌혈관이 다시 팽창하고 포도당을 소비하며 신경세포들이 시냅스 전기 신호를 다시 쏘기 시작해, 삶과 죽음의 경계를 완전히 뒤흔들었습니다."
    ],
    themeColor: "amber",
    pulseBpm: 62
  },
  {
    id: "case-04-dishbrain",
    codeName: "CASE #04 · DISHBRAIN SBI",
    badgeIcon: "🕹️🧬",
    shortTitle: "Living Neurons Play Pong",
    koreanShortTitle: "게임하는 인간 뇌세포",
    headline: "DishBrain: 800,000 Human Stem-Cell Neurons Fused to a Silicon Chip Learn Pong",
    koreanHeadline: "컴퓨터 칩 위에 배양된 80만 개의 인간 줄기세포 뇌가 5분 만에 스스로 게임을 깨우치다",
    institution: "Cortical Labs & Monash University",
    leadScientist: "Dr. Brett Kagan et al.",
    journalCitation: "Neuron (2022) — In vitro neurons learn and exhibit sentience",
    pmidOrDoi: "PMID: 36228614 / DOI: 10.1016/j.neuron.2022.09.001",
    pubMedSearchQuery: "In vitro neurons learn and exhibit sentience when embodied in a simulated game-world",
    wikiTitle: "Wetware_computer",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/14/2D-and-3D-Self-Assembling-Nanofiber-Hydrogels-for-Cardiomyocyte-Culture-285678.f1.ogv",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s001.ogv",
    microscopyPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Pipeline_for_multiscale_hyperdimensional_analysis_of_organoids.webp",
    secondaryPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/db/Cerebral_organoid_flowchart.png",
    hostTissueA: "High-Density CMOS Multi-Electrode Silicon Array (HD-MEA)",
    koreanHostTissueA: "고밀도 CMOS 다중 미세전극 반도체 실리콘 칩 (HD-MEA)",
    stemCellBridge: {
      factors: ["NGN2 Direct Reprogramming", "hiPSC Cortical Differentiation", "Laminin Bio-Coat"],
      lineage: "800,000 Living Human Cortical Neurons Stitched to Gold Micro-Electrodes",
      koreanLineage: "금 미세전극과 직접 시냅스를 형성한 80만 개의 살아있는 인간 대뇌 뉴런",
      viabilityPercent: 95,
      fusionMechanism: "Pluripotent stem-cell dendrites physically wrap around silicon micro-transistors, exchanging bi-directional electrical impulses to minimize variational free energy.",
      koreanFusionMechanism: "만능줄기세포에서 분화한 신경 수상돌기들이 실리콘 칩의 미세 트랜지스터를 직접 감싸 안으며 양방향 전기 신호를 주고받고 스스로 학습 회로를 재구성합니다."
    },
    donorTissueB: "Human iPSC-Derived Cortical Neural Network ('Synthetic Biological Intelligence')",
    koreanDonorTissueB: "인간 유도만능줄기세포(hiPSC) 유래 대뇌 신경망 ('합성 생물학적 지능')",
    eerieRealitySummary: "By growing 800,000 human stem-cell neurons directly onto a computer chip and feeding them electrical coordinates of a Pong ball, the disembodied brain cells realized they were inside a game world and taught themselves to move the paddle within 5 minutes.",
    koreanSummary: "인간 유도만능줄기세포(hiPSC)로 분화시킨 80만 개의 살아있는 대뇌 신경세포를 반도체 실리콘 칩 위에 직접 접합했습니다. 이 '접시 위의 뇌(DishBrain)'에 전기 신호로 고전 게임 '퐁(Pong)'의 공 위치를 알려주자, 눈도 손도 없는 뇌세포들이 단 5분 만에 스스로 라켓을 움직여 공을 받아치는 법을 터득했습니다.",
    narratorScript: [
      "Case Zero-Four: DishBrain Synthetic Biological Intelligence.",
      "Eight hundred thousand living human cortical neurons, derived from pluripotent stem cells, were fused directly onto a CMOS silicon microchip.",
      "When connected to the video game Pong via electrical feedback, the living cells self-organized and learned to hit the ball within five minutes."
    ],
    koreanNarratorScript: [
      "네 번째 사례는 디시브레인 합성 생물학 지능입니다.",
      "유도만능줄기세포에서 분화시킨 팔십만 개의 살아있는 인간 뇌 신경세포를 반도체 마이크로칩 위에 직접 융합시켰습니다.",
      "고전 게임 퐁의 공 위치를 전기 자극으로 전달하자, 배양 접시 속 뇌세포들이 스스로 조직화하며 단 오 분 만에 공을 받아치는 법을 학습했습니다."
    ],
    themeColor: "cyan",
    pulseBpm: 105
  },
  {
    id: "case-05-anthrobots",
    codeName: "CASE #05 · ANTHROBOTS",
    badgeIcon: "🤖🦠",
    shortTitle: "Living Human Biobots",
    koreanShortTitle: "신경을 꿰매는 생체 로봇",
    headline: "Anthrobots & Xenobots: Self-Assembling Human Stem Biobots That Stitch Neural Wounds",
    koreanHeadline: "성인 세포가 스스로 조립되어 헤엄치며 찢어진 인간 뇌신경을 꿰매는 생체 로봇",
    institution: "Tufts University & Harvard Wyss Institute",
    leadScientist: "Dr. Michael Levin & Dr. Gizem Gumuskaya",
    journalCitation: "Advanced Science (2023/2025) & PNAS (2020)",
    pmidOrDoi: "PMID: 38032125 / DOI: 10.1002/advs.202303575",
    pubMedSearchQuery: "Motile Living Biobots Self-Construct from Adult Human Somatic Progenitor Seed Cells",
    wikiTitle: "Xenobot",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Mitosis_drosophila_larva.ogv",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Mitosis_480%2A360.theora.ogv",
    microscopyPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Xenobot.jpg",
    secondaryPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/73/Xenobot_Multiple_Design_Organism_Pairs.png",
    hostTissueA: "Lacerated Human 2D Neural Tissue Sheet (Severed Axons)",
    koreanHostTissueA: "물리적으로 절단되어 신경 다발이 끊어진 인간 신경 조직 시트",
    stemCellBridge: {
      factors: ["Adult Somatic Progenitor Plasticity", "Cilia-Outward Polarity Reversal", "Morphogenetic Fields"],
      lineage: "Self-Assembled Multicellular Ciliated Human Anthrobots",
      koreanLineage: "섬모(Cilia) 추진력을 가진 자가 조립 다세포 인간 앤스로봇",
      viabilityPercent: 94,
      fusionMechanism: "Freed from their normal anatomical constraints, adult progenitor cells invert their cilia outward like thousands of microscopic oars, cluster over severed human neurons, and induce rapid axonal bridging.",
      koreanFusionMechanism: "기존 신체의 해부학적 제약에서 해방된 성체 전구세포들이 수천 개의 미세 섬모를 바깥으로 뒤집어 노처럼 저으며 이동하고, 끊어진 인간 신경 상처 위에 군집하여 신경 재생 다리를 놓아줍니다."
    },
    donorTissueB: "Autonomous Living Biobot Swarm (Zero Genetic Modification)",
    koreanDonorTissueB: "유전자 조작 없이 스스로 조립된 살아있는 인간 생체 로봇 군집",
    eerieRealitySummary: "When adult human progenitor cells are liberated from the body and cultured in specific matrices, they refuse to die—instead, they self-assemble into brand-new motile organisms ('Anthrobots') that swim across damaged human neural networks and stitch severed nerves back together.",
    koreanSummary: "인간의 체세포·전구세포를 기존 신체 구조에서 분리해 특수 배양하자, 세포들이 죽지 않고 스스로 섬모(Cilia)를 바깥으로 뒤집어 노처럼 저으며 헤엄치는 완전히 새로운 다세포 생명체('앤스로봇')로 재조립되었습니다. 더 놀라운 것은 이 생체 로봇들이 칼로 찢어놓은 인간 신경세포 상처 부위로 몰려가 끊어진 신경 다리를 스스로 이어 붙였다는 사실입니다.",
    narratorScript: [
      "Case Zero-Five: Living Human Anthrobots and Xenobots.",
      "Liberated from their default anatomical blueprint, human progenitor cells spontaneously self-assemble into motile microscopic organisms.",
      "When placed upon severed human neural tissue, these living biobots crawl across the gap and biologically stitch the torn neurons back together."
    ],
    koreanNarratorScript: [
      "다섯 번째 사례는 살아있는 인간 생체 로봇, 앤스로봇입니다.",
      "인간의 전구세포를 신체에서 분리해 배양하자, 세포들이 스스로 섬모를 바깥으로 뒤집어 헤엄쳐 다니는 새로운 형태의 생명체로 자가 조립되었습니다.",
      "이 생체 로봇들을 찢어진 인간 뇌신경 위에 올려놓자, 스스로 상처 부위로 이동해 끊어진 신경세포들을 생물학적으로 꿰매어 복구했습니다."
    ],
    themeColor: "purple",
    pulseBpm: 92
  },
  {
    id: "case-06-human-pig-chimera",
    codeName: "CASE #06 · INTERSPECIES CHIMERA",
    badgeIcon: "🐷🧬",
    shortTitle: "Human-Pig Chimera Embryo",
    koreanShortTitle: "인간-돼지 키메라 배아",
    headline: "Salk Institute Interspecies Blastocyst: Human Pluripotent Stem Cells Growing Inside Pig Embryos",
    koreanHeadline: "유전자 가위로 비워낸 돼지 배아 속에 인간 만능줄기세포를 접합해 인간 장기를 키우다",
    institution: "Salk Institute for Biological Studies",
    leadScientist: "Dr. Juan Carlos Izpisua Belmonte et al.",
    journalCitation: "Cell (2017) Vol. 168, Issue 3, pp. 473–486",
    pmidOrDoi: "PMID: 28129541 / DOI: 10.1016/j.cell.2016.12.036",
    pubMedSearchQuery: "Interspecies Chimerism with Mammalian Pluripotent Stem Cells Belmonte",
    wikiTitle: "Human%E2%80%93animal_hybrid",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s003.ogv",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s004.ogv",
    microscopyPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Xenobot_-_A_tall_quadruped.jpg",
    secondaryPhotoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Xenobots_Evolved_Designs.png",
    hostTissueA: "CRISPR-Cas9 Organ-Niche Deleted Porcine Blastocyst Embryo",
    koreanHostTissueA: "CRISPR 유전자 가위로 특정 장기 형성 유전자를 비워낸 포유류 배아",
    stemCellBridge: {
      factors: ["OCT4", "SOX2", "KLF4", "c-MYC", "Intermediate Poised hiPSC State"],
      lineage: "GFP-Labeled Human Pluripotent Stem Cells (Endoderm/Mesoderm)",
      koreanLineage: "녹색형광단백질(GFP) 표지 인간 유도만능줄기세포",
      viabilityPercent: 91,
      fusionMechanism: "By deleting the master organ-forming gene in a pig embryo via CRISPR, a developmental vacuum is created; injected human pluripotent stem cells rush in to fill the missing organ niche.",
      koreanFusionMechanism: "유전자 가위로 동물 배아 내 장기 형성 유전자를 제거해 '발생학적 빈자리'를 만들면, 주입된 인간 만능줄기세포가 그 빈자리를 찾아 들어가 부족한 장기를 인간 세포로 대신 만들어냅니다."
    },
    donorTissueB: "Patient-Derived Induced Pluripotent Stem Cells (hiPSCs)",
    koreanDonorTissueB: "환자 맞춤형 유도만능줄기세포(hiPSC) 군집",
    eerieRealitySummary: "Using CRISPR to delete the genetic instructions for a specific organ in a pig embryo and injecting glowing human pluripotent stem cells, scientists created living human-pig chimeric embryos where human cells colonize the empty biological niche to grow transplantable human organs.",
    koreanSummary: "크리스퍼(CRISPR) 유전자 가위로 돼지 수정란에서 특정 장기를 만드는 유전자를 잘라내어 '생물학적 빈자리'를 만든 뒤, 그 속에 형광 표지된 인간 유도만능줄기세포(hiPSC)를 주입했습니다. 그러자 인간 줄기세포가 돼지 배아의 빈자리를 찾아 들어가 융합되며 동물 몸속에서 인간 세포로 이루어진 장기 조직이 자라나기 시작했습니다.",
    narratorScript: [
      "Case Zero-Six: The Salk Institute Interspecies Chimera.",
      "Scientists used CRISPR gene editing to delete an organ niche inside a porcine embryo, then injected glowing human pluripotent stem cells.",
      "The human stem cells colonized the developmental vacuum, fusing two species into a single living chimeric organism."
    ],
    koreanNarratorScript: [
      "여섯 번째 사례는 솔크 연구소의 이종 간 키메라 배아 실험입니다.",
      "연구진은 유전자 가위로 돼지 배아의 장기 유전자를 비워낸 뒤, 형광 빛을 내는 인간 유도만능줄기세포를 주입했습니다.",
      "인간 줄기세포들은 배아 속의 빈자리를 찾아 들어가 융합되었고, 서로 다른 두 종의 세포가 하나의 생명체 안에서 함께 자라나는 키메라가 탄생했습니다."
    ],
    themeColor: "blue",
    pulseBpm: 80
  }
];
