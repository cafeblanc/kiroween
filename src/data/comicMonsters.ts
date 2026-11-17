/** Body-part slots of a designed monster (same keys as MonsterBodyParts in customMonsterMediaService). */
export type MonsterPartKey = "head" | "hornsOrCrown" | "torso" | "arms" | "legs" | "tail" | "auraAndSkin";

export interface ComicMonster {
  id: string;
  nameKo: string;
  nameEn: string;
  taglineKo: string;
  taglineEn: string;
  icon: string;
  bpm: number;
  colorHex: string;
  badge: string;
  promptKo: string;
  promptEn: string;
  avatarImg: string;
  jumpscareImg: string;
  videoSrc: string;
  roarAudio: string;
  funFactKo: string;
  funFactEn: string;
  /**
   * Per-part design text from the Custom Monster Studio (Korean, as the user typed it). Battle stories
   * and battle videos use it so the head, arms, legs, tail and torso each take part in the fight.
   */
  bodyParts?: Partial<Record<MonsterPartKey, string>>;
  /** Optional combat stats (custom monsters); curated monsters fall back to defaults in the arena. */
  customStats?: {
    atk: number;
    def: number;
    spd: number;
    regen: number;
    energy: number;
  };
}

export const COMIC_MONSTERS: ComicMonster[] = [
  {
    id: "myth_dragon",
    nameKo: "01. 화염룡 드래곤 (Dragon)",
    nameEn: "01. Pyroclastic Dragon",
    taglineKo: "배아 난할부터 날개와 장갑 비늘을 펼치며 거대한 성체로 성장하는 24초 실시간 가상 타임랩스",
    taglineEn: "24-second virtual time-lapse: from blastocyst cleavage to fully winged fire-breathing apex predator",
    icon: "🐉🔥",
    bpm: 94,
    colorHex: "#f97316",
    badge: "24초 성장 드래곤",
    promptKo: "배양기 속에서 배아부터 날개와 고열 내화 비늘을 형성하며 거대하게 성장하는 환상종 드래곤",
    promptEn: "Massive pyroclastic dragon developing inside a bioreactor from blastocyst to adult winged predator",
    avatarImg: "/images/samples/myth_dragon.jpg",
    jumpscareImg: "/images/samples/myth_dragon.jpg",
    videoSrc: "/videos/chimera_growth_dragon_24s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "조류의 흉골 비행근과 파충류의 케라틴 비늘 조직을 iPSC 만능줄기세포 단계에서 융합했습니다.",
    funFactEn: "Engineered via iPSC blastocyst complementation fusing avian flight muscles with reptilian scales."
  },
  {
    id: "myth_kraken",
    nameKo: "02. 심해 거수 크라켄 (Kraken)",
    nameEn: "02. Abyssal Colossus Kraken",
    taglineKo: "배양기 속에서 원시 배아 구체가 8개의 거대 생체 발광 촉수로 분화하는 24초 실시간 타임랩스",
    taglineEn: "24-second virtual time-lapse: embryonic sphere morphing into a bioluminescent 8-tentacled titan",
    icon: "🐙🌊",
    bpm: 82,
    colorHex: "#06b6d4",
    badge: "24초 성장 크라켄",
    promptKo: "심해 해구의 고압 챔버 속에서 8개의 거대 촉수와 흡반을 뻗으며 각성하는 전설의 크라켄",
    promptEn: "Legendary giant deep-sea kraken awakening inside a pressurized amniotic vat with undulating tentacles",
    avatarImg: "/images/samples/myth_kraken.jpg",
    jumpscareImg: "/images/samples/myth_kraken.jpg",
    videoSrc: "/videos/chimera_growth_kraken_24s.mp4",
    roarAudio: "/sounds/roar_disco_kraken.wav",
    funFactKo: "대왕오징어의 무수한 자율 신경절과 연체동물 연골 스캐폴드로 무한한 촉수 굴절각을 구현합니다.",
    funFactEn: "Incorporates cephalopod decentralized neural ganglia and flexible cartilage scaffolds."
  },
  {
    id: "myth_chimera",
    nameKo: "03. 원조 삼중수 키메라 (Chimera)",
    nameEn: "03. Primordial Tri-Beast Chimera",
    taglineKo: "사자 두경부 + 산양 골격근 + 독사 꼬리가 단일 배반포에서 공생 발현한 원조 신화수",
    taglineEn: "Lion cranium, caprine skeletal muscle, and serpentine tail co-developed from a single blastocyst",
    icon: "🦁🐐🐍",
    bpm: 128,
    colorHex: "#eab308",
    badge: "원조 3중 키메라",
    promptKo: "사자의 갈기와 발톱, 염소의 뿔과 근육, 뱀의 미부를 지닌 그리스 신화의 원조 생체 키메라 괴수",
    promptEn: "Mythological Greek Chimera with a roaring lion head, goat horns, and coiled venomous serpent tail",
    avatarImg: "/images/chimera_awakened_roar.jpg",
    jumpscareImg: "/images/chimera_awakened_roar.jpg",
    videoSrc: "/videos/chimera_growth_deepsea_abyss_30s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "현대 의학에서 서로 다른 유전자를 지닌 세포가 한 개체에 공존하는 현상을 키메라(Chimera)라 부릅니다.",
    funFactEn: "Gave its name to the biomedical phenomenon where two distinct genetic lineages coexist in a single organism."
  },
  {
    id: "myth_hydra",
    nameKo: "04. 불사 수룡 히드라 (Hydra)",
    nameEn: "04. Immortal Multi-Headed Hydra",
    taglineKo: "잘려도 수초 만에 배가되어 재생되는 무한 pluripotency 줄기세포 군집 다두 수룡",
    taglineEn: "Self-renewing pluripotency powerhouse: multi-headed water dragon regenerating damaged tissue in seconds",
    icon: "🐍💧",
    bpm: 110,
    colorHex: "#10b981",
    badge: "무한 재생 줄기세포",
    promptKo: "배양액 속에서 여러 개의 뱀 머리가 상처 없이 재생하며 꿈틀거리는 레르나의 전설 수룡 히드라",
    promptEn: "Lernaean Hydra with multiple regenerating serpentine heads coiling inside an emerald bio-chamber",
    avatarImg: "/images/chimera_myth_hydra.jpg",
    jumpscareImg: "/images/chimera_myth_hydra.jpg",
    videoSrc: "/videos/chimera_growth_kraken_24s.mp4",
    roarAudio: "/sounds/roar_mega_chicken.wav",
    funFactKo: "실제 민물 히드라(Hydra vulgaris)는 FoxO 유전자로 인해 생물학적으로 영구 불사(Biological Immortality)를 누립니다.",
    funFactEn: "Real Hydra vulgaris expresses continuous FoxO transcription factors, granting continuous stem cell self-renewal."
  },
  {
    id: "myth_phoenix",
    nameKo: "05. 영구 부활 피닉스 (Phoenix)",
    nameEn: "05. Rejuvenating Sun Phoenix",
    taglineKo: "노화된 체세포를 0세의 유도만능줄기세포(iPSC)로 되돌려 잿더미에서 영원히 부활하는 화염 신조",
    taglineEn: "Perpetual cellular reprogramming: reversing adult senescence back to embryonic potency from the ashes",
    icon: "🦅🔥",
    bpm: 145,
    colorHex: "#ef4444",
    badge: "세포 역분화 부활",
    promptKo: "타오르는 붉은 깃털과 황금빛 후광을 뿜으며 줄기세포 배양액 속에서 비상하는 불사조 피닉스",
    promptEn: "Radiant mythical Phoenix rising from glowing stem-cell amniotic embers with flaming feathered wings",
    avatarImg: "/images/chimera_myth_phoenix.jpg",
    jumpscareImg: "/images/chimera_myth_phoenix.jpg",
    videoSrc: "/videos/chimera_growth_dragon_24s.mp4",
    roarAudio: "/sounds/roar_caffeine_vampire.wav",
    funFactKo: "야마나카 신야 교수의 4대 만능인자(Oct4, Sox2, Klf4, c-Myc)를 통한 세포 역분화의 상징체입니다.",
    funFactEn: "The ultimate biological metaphor for Yamanaka factor cellular reprogramming (Oct4, Sox2, Klf4, c-Myc)."
  },
  {
    id: "myth_griffin",
    nameKo: "06. 황금 날개 그리핀 (Griffin)",
    nameEn: "06. Sovereign Sky Griffin",
    taglineKo: "대형 맹금류의 예리한 시각·부리·날개와 맹수 사자의 폭발적 도약 근육이 결합된 하이브리드 제왕",
    taglineEn: "Apex aerial and terrestrial predator fusing raptor visual acuity and wings with ferocious feline musculature",
    icon: "🦅🦁",
    bpm: 118,
    colorHex: "#d97706",
    badge: "공중-지상 제왕",
    promptKo: "황금빛 독수리 머리와 거대한 깃털 날개, 근육질 사자의 몸체와 발톱통을 지닌 위엄 있는 그리핀",
    promptEn: "Majestic imperial griffin with golden eagle beak and feathers, muscular lion torso and hindquarters",
    avatarImg: "/images/chimera_myth_griffin.jpg",
    jumpscareImg: "/images/chimera_myth_griffin.jpg",
    videoSrc: "/videos/chimera_growth_dragon_24s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "조류의 초고밀도 기낭 폐 시스템과 포유류의 강인한 골격을 결합하여 고고도에서도 지치지 않습니다.",
    funFactEn: "Combines avian unidirectional air-sac respiration with dense mammalian bone architecture."
  },
  {
    id: "myth_pegasus",
    nameKo: "07. 신성 천마 페가수스 (Pegasus)",
    nameEn: "07. Celestial Winged Pegasus",
    taglineKo: "거대한 말의 근골격계에 조류의 비행 흉골과 날개깃이 완벽히 봉합된 우아한 비행 영물",
    taglineEn: "Equine locomotor power seamlessly stitched with avian pectoral flight architecture and feathering",
    icon: "🦄🪽",
    bpm: 88,
    colorHex: "#38bdf8",
    badge: "비행 포유류 근골격",
    promptKo: "순백의 근육질 말 몸체에 은빛 거대 날개를 활짝 펼치며 푸른 배양기 속을 부유하는 천마 페가수스",
    promptEn: "Ethereal white winged pegasus suspended in a bioluminescent cyan amniotic chamber with feathered plumage",
    avatarImg: "/images/chimera_myth_pegasus.jpg",
    jumpscareImg: "/images/chimera_myth_pegasus.jpg",
    videoSrc: "/videos/chimera_growth_dragon_24s.mp4",
    roarAudio: "/sounds/roar_flying_piggy.wav",
    funFactKo: "포유류 척추의 흉추 부위에 추가적인 견갑골 관절을 유전적으로 배치하여 비행 양력을 확보했습니다.",
    funFactEn: "Features a duplicate pectoral girdle genetically inserted at thoracic vertebrae to support flight aerodynamics."
  },
  {
    id: "myth_cerberus",
    nameKo: "08. 지옥견 케르베로스 (Cerberus)",
    nameEn: "08. Tri-Brain Cerberus",
    taglineKo: "세 개의 독립된 뇌 오가노이드가 단일 척수 신경망을 공유하며 빈틈없는 전방위 경계를 수행하는 맹수",
    taglineEn: "Tri-cranial neural organoid integration: three distinct brains harmonized through a single massive spinal cord",
    icon: "🐺🔥",
    bpm: 165,
    colorHex: "#b91c1c",
    badge: "삼두 신경계 융합",
    promptKo: "붉게 번뜩이는 6개의 눈과 날카로운 이빨을 드러낸 세 개의 검은 늑대 머리를 가진 지옥견 케르베로스",
    promptEn: "Monstrous three-headed hellhound Cerberus with snarling fangs and burning crimson eyes in a dark gothic vat",
    avatarImg: "/images/chimera_myth_cerberus.jpg",
    jumpscareImg: "/images/chimera_myth_cerberus.jpg",
    videoSrc: "/videos/chimera_growth_deepsea_abyss_30s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "예일대 브레인엑스(BrainEx) 체외 관류 기법을 적용하여 3개 두뇌의 신경 활동을 동기화했습니다.",
    funFactEn: "Synchronized using Yale BrainEx ex-vivo perfusion protocols to align multi-cerebral neuro-electric impulses."
  },
  {
    id: "myth_leviathan",
    nameKo: "09. 심해 해룡 레비아탄 (Leviathan)",
    nameEn: "09. Abyssal Dreadnought Leviathan",
    taglineKo: "배아 구체 난할부터 심해 완전체로 거대화하는 30초 실시간 가상 타임랩스 정답 표본",
    taglineEn: "Official 30-second virtual time-lapse: real embryonic sphere cleaving and expanding into an apex leviathan",
    icon: "🐋⚡",
    bpm: 72,
    colorHex: "#0284c7",
    badge: "★ 30초 성장 정답 표본",
    promptKo: "심해 해구의 원통형 배양기 속에서 배아부터 촉수와 청린 비늘을 펼치며 거대하게 성장하는 심해 해룡",
    promptEn: "Massive bioluminescent sea leviathan growing in a high-tech bioreactor vat from embryo to adult predator",
    avatarImg: "/images/abyss_frame_32s.jpg",
    jumpscareImg: "/images/abyss_frame_32s.jpg",
    videoSrc: "/videos/chimera_growth_deepsea_abyss_30s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "사용자가 지정한 공식 30초 실시간 가상 타임랩스로, 배아 난할부터 성체 포효까지 완벽히 동기화됩니다.",
    funFactEn: "The benchmark 30-second virtual time-lapse tracking continuous morphogenetic expansion in vitro."
  },
  {
    id: "myth_basilisk",
    nameKo: "10. 석화 맹독 바실리스크 (Basilisk)",
    nameEn: "10. Petrifying Basilisk",
    taglineKo: "수탉의 두경부 볏과 살무사의 맹독성 비늘 몸통이 결합된 신경 마비 및 근육 경화 석화 괴수",
    taglineEn: "Cockatrice-serpentine hybrid producing neuro-paralytic venom that calcifies organic muscular tissue on contact",
    icon: "🐓🐍",
    bpm: 104,
    colorHex: "#15803d",
    badge: "석화 독소 파충류",
    promptKo: "닭의 부리와 붉은 볏, 비늘 덮인 녹색 뱀의 몸체와 노란 파충류 안광을 뿜는 전설의 괴수 바실리스크",
    promptEn: "Terrifying Basilisk hybrid with rooster comb, hooked beak, and iridescent venomous serpent coils",
    avatarImg: "/images/chimera_myth_basilisk.jpg",
    jumpscareImg: "/images/chimera_myth_basilisk.jpg",
    videoSrc: "/videos/chimera_growth_dragon_24s.mp4",
    roarAudio: "/sounds/roar_scaredy_ghost.wav",
    funFactKo: "방울뱀의 신경독 단백질 분비 세포를 조류 타액선에 삽입하여 급속 석화 마비 독소를 합성합니다.",
    funFactEn: "Synthesizes rapid tetanic neurotoxins by splicing crotaline venom peptides into salivary glandular tissue."
  },
  {
    id: "myth_sphinx",
    nameKo: "11. 영지 스핑크스 (Sphinx)",
    nameEn: "11. Enlightened Sphinx",
    taglineKo: "고등 영장류의 대뇌 피질 지능 오가노이드와 사자의 치명적 근력, 맹금류 날개가 조화된 지혜의 수호신",
    taglineEn: "Cerebral cortical intelligence organoids fused with feline strength and raptor aerial locomotion",
    icon: "🦁👑",
    bpm: 78,
    colorHex: "#ca8a04",
    badge: "고등 두뇌 오가노이드",
    promptKo: "황금 사자 몸체에 인간의 고귀한 얼굴, 독수리 날개를 달고 푸른 배양기 속에서 눈을 뜬 스핑크스",
    promptEn: "Mythological Sphinx with regal human cranial features, muscular lion body, and soaring raptor wings in lab",
    avatarImg: "/images/chimera_myth_sphinx.jpg",
    jumpscareImg: "/images/chimera_myth_sphinx.jpg",
    videoSrc: "/videos/chimera_growth_deepsea_abyss_30s.mp4",
    roarAudio: "/sounds/roar_wonky_brain.wav",
    funFactKo: "실제 인간 유도만능줄기세포 유래 뇌 오가노이드(Brain Organoids)의 시냅스 연결망 연구를 기반으로 합니다.",
    funFactEn: "Modeled after human iPSC-derived brain organoid research studying synaptic interconnectivity."
  },
  {
    id: "alien_xenomorph",
    nameKo: "12. 제노모프 바이오 타이탄 (Xenomorph Bio-Titan)",
    nameEn: "12. Xenomorph Bio-Titan",
    taglineKo: "흑요석 생체 외골격과 이중 턱(Pharyngeal Jaw)을 지닌 궁극의 성간 우주 기생 포식 생명체",
    taglineEn: "Apex interstellar parasite equipped with obsidian chitinous exoskeleton, pharyngeal jaw, and acidic circulation",
    icon: "👽💀",
    bpm: 195,
    colorHex: "#6366f1",
    badge: "외계 산성 포식자",
    promptKo: "흑요석처럼 번쩍이는 생체 외골격과 날카로운 이중 턱, 칼날 꼬리를 지닌 위협적인 외계 제노모프 타이탄",
    promptEn: "Terrifying xenomorph alien titan with shiny obsidian exoskeleton, elongated skull, and razor blade tail in amniotic chamber",
    avatarImg: "/images/samples/alien_xenomorph.jpg",
    jumpscareImg: "/images/samples/alien_xenomorph.jpg",
    videoSrc: "/videos/chimera_growth_deepsea_abyss_30s.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "불소 수지 기반의 생체 중합체 혈관을 형성하여 pH 0.1의 초강산 체액 순환을 견뎌냅니다.",
    funFactEn: "Reinforced with fluoropolymer-lined vascular endothelium to withstand hyper-acidic metabolic circulation."
  },
  {
    id: "alien_cthulhu",
    nameKo: "13. 코스믹 크툴루 엔티티 (Cosmic Cthulhu Entity)",
    nameEn: "13. Cosmic Cthulhu Entity",
    taglineKo: "심우주 성운의 암흑물질 파동과 양자 텔레파시 신경망을 흡수하여 배양액을 진동시키는 초차원 엔티티",
    taglineEn: "Extra-dimensional cephalopod horror vibrating the amniotic fluid with dark matter quantum wave resonance",
    icon: "🐙🌌",
    bpm: 64,
    colorHex: "#8b5cf6",
    badge: "초차원 성간 촉수",
    promptKo: "흑자색 성운빛 촉수 군체와 거대한 비막 날개, 수십 개의 푸른 안광을 번뜩이는 우주적 존재 크툴루",
    promptEn: "Cosmic Cthulhu entity with undulating nebula-tinted tentacles and massive membranous wings suspended in cybernetic tank",
    avatarImg: "/images/chimera_alien_cthulhu.jpg",
    jumpscareImg: "/images/chimera_alien_cthulhu.jpg",
    videoSrc: "/videos/chimera_growth_kraken_24s.mp4",
    roarAudio: "/sounds/roar_disco_kraken.wav",
    funFactKo: "18Hz 초저주파(Infrasound) 뇌파를 지속 방출하여 배양기 주변 전자 장비에 전자기 공명을 유도합니다.",
    funFactEn: "Emits continuous 18 Hz infrasonic neuro-pulses, inducing electromagnetic resonance across laboratory instruments."
  },
  {
    id: "alien_arachno",
    nameKo: "14. 아라크노 제노-크러스트 (Arachno-Xeno Crustacean)",
    nameEn: "14. Arachno-Xeno Crustacean",
    taglineKo: "방사능 행성의 초고온 지각을 파고드는 티타늄 생체 갑각과 4중 집게발, 8족 보행 외계 절지괴수",
    taglineEn: "Titanium-reinforced chitinous multi-limbed extraterrestrial crawler designed for subterranean radiation survival",
    icon: "🦂🕷️",
    bpm: 152,
    colorHex: "#ec4899",
    badge: "방사능 극한 절지수",
    promptKo: "티타늄 강도의 4중 집게발과 8개의 다리, 플라즈마 독침을 가진 심우주 아라크노 크러스트 외계 괴수",
    promptEn: "Armored arachno-crustacean alien predator with quadruple titanium pincers and eight articulated crawling legs in vat",
    avatarImg: "/images/chimera_alien_arachno.jpg",
    jumpscareImg: "/images/chimera_alien_arachno.jpg",
    videoSrc: "/videos/chimera_awakening_cyber.mp4",
    roarAudio: "/sounds/roar_mega_chicken.wav",
    funFactKo: "방사선 분해 효소를 생산하는 외계 고세균 유전자를 결합하여 감마선 50,000 Gy 피폭에도 세포 손상이 없습니다.",
    funFactEn: "Spliced with radio-tolerant extremophile archaea enzymes, resisting up to 50,000 Gy of ionizing gamma radiation."
  },
  {
    id: "alien_void_slug",
    nameKo: "15. 보이드 아비스 레비아탄 (Bioluminescent Void Leviathan)",
    nameEn: "15. Bioluminescent Void Leviathan",
    taglineKo: "우주 진공의 전자기 플라즈마를 흡수하며 배양기 전체를 청록색 성운으로 물들이는 반투명 외계 유영체",
    taglineEn: "Translucent bio-photonic drifter absorbing vacuum plasma and illuminating the vat in radiant cyan nebular auroras",
    icon: "✨🛸",
    bpm: 58,
    colorHex: "#14b8a6",
    badge: "성간 플라즈마 유영체",
    promptKo: "에메랄드와 자줏빛 네온으로 빛나는 반투명 외계 해파리-고래형 보이드 레비아탄 생명체",
    promptEn: "Luminescent ethereal alien void creature undulating through glowing nutrient broth with pulsating neon plasma core",
    avatarImg: "/images/samples/alien_void_slug.jpg",
    jumpscareImg: "/images/samples/alien_void_slug.jpg",
    videoSrc: "/videos/chimera_growth_deepsea_abyss_30s.mp4",
    roarAudio: "/sounds/roar_avocado_slime.wav",
    funFactKo: "생체 내 루시페린-루시페라아제 발광 반응을 우주 플라즈마 파장에 맞춰 극대화한 자가 발광 유기체입니다.",
    funFactEn: "Harnesses engineered bio-photonic enzymes tuned to cosmic plasma wavelengths for autonomous illumination."
  },
  {
    id: "myth_frankenstein",
    nameKo: "16. 모던 바이오 프랑켄슈타인 (The Modern Prometheus)",
    nameEn: "16. Frankenstein: The Modern Prometheus",
    taglineKo: "15종의 신화·외계 생체 유전자와 전자기 펄스로 재탄생한 인류 역사상 최초의 iPSC 인공 합성 인간 키메라 거인",
    taglineEn: "The crowning Promethean Adam: composite organism revived with 15 species iPSC bio-stitching & electro-pulses",
    icon: "⚡🧟‍♂️",
    bpm: 180,
    colorHex: "#10b981",
    badge: "👑 PROMETHEUS 완전체",
    promptKo: "전자기 전극과 생체 줄기세포 봉합선이 푸르게 빛나며 배양기 속에서 부활 포효하는 바이오 프랑켄슈타인",
    promptEn: "Modern Bio-Frankenstein synthetic giant awakening inside an electric amniotic vat, surgical stitches glowing",
    avatarImg: "/images/samples/myth_frankenstein.jpg",
    jumpscareImg: "/images/samples/myth_frankenstein.jpg",
    videoSrc: "/videos/chimera_awakening_cyber.mp4",
    roarAudio: "/sounds/monster_roar_ferocious.wav",
    funFactKo: "메리 셸리의 1818년 원작 소설 부제인 'The Modern Prometheus'를 2026년 첨단 재생의학으로 완벽히 재해석한 본 프로젝트의 정점입니다.",
    funFactEn: "The ultimate climax of the PROMETHEUS project, reviving Mary Shelley's 1818 masterpiece through modern regenerative biology."
  }
];

export const HUMAN_PROMETHEUS_MONSTER: ComicMonster = {
  id: "human_prometheus",
  nameKo: "합성 인간 호모 프로메테우스 (Synthetic Human)",
  nameEn: "Synthetic Homo Prometheus",
  taglineKo: "인간 유도만능줄기세포(hiPSC)와 뇌 오가노이드 신경망이 통합된 차세대 인공 합성 인간",
  taglineEn: "Next-generation synthetic human integrating hiPSC lineages and cortical brain organoid networks",
  icon: "🧬🧠",
  bpm: 72,
  colorHex: "#38bdf8",
  badge: "인간 iPSC 완전체",
  promptKo: "인간 유도만능줄기세포와 뇌 오가노이드 신경망이 푸른 배양기 속에서 깨어나는 인공 합성 인간",
  promptEn: "Synthetic human organism awakening inside a high-tech cyan bioreactor with glowing neural networks",
  avatarImg: "/images/samples/human_prometheus.jpg",
  jumpscareImg: "/images/samples/human_prometheus.jpg",
  videoSrc: "/videos/chimera_awakening_cyber.mp4",
  roarAudio: "/sounds/roar_wonky_brain.wav",
  funFactKo: "인간 뇌 오가노이드(BrainEx)와 혈관화(Vascularization) 기술을 결합해 생체 항상성을 유지합니다.",
  funFactEn: "Combines vascularized human brain organoid networks with autonomous homeostatic perfusion."
};
