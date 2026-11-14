export interface RealStemCellPhoto {
  id: string;
  titleKo: string;
  titleEn: string;
  categoryKo: string;
  categoryEn: string;
  descriptionKo: string;
  descriptionEn: string;
  imgSrc: string;
  targetMonsterId: string;
  targetMonsterName: string;
  magnification: string;
  stainType: string;
}

export const REAL_STEM_CELL_PHOTOS: RealStemCellPhoto[] = [
  {
    id: "photo_01_embryo_sphere",
    titleKo: "01. 원시 배아 세포 구체 (Blastosphere)",
    titleEn: "01. Primitive Embryonic Blastosphere",
    categoryKo: "초기 발생학",
    categoryEn: "Early Embryology",
    descriptionKo: "수정 후 난할 과정을 거치며 자전하는 단일 배반포 구체. 중심부에서 만능줄기세포 내부세포괴(ICM)가 응축됩니다.",
    descriptionEn: "Spinning spherical blastocyst post-cleavage. Inner cell mass (ICM) condensing at the embryonic pole.",
    imgSrc: "/images/abyss_frame_2s.jpg",
    targetMonsterId: "myth_leviathan",
    targetMonsterName: "심해 해룡 레비아탄",
    magnification: "400x",
    stainType: "Phase Contrast Live"
  },
  {
    id: "photo_02_cell_division",
    titleKo: "02. iPSC 만능줄기세포 군집 분열",
    titleEn: "02. hiPSC Colony Cleavage & Division",
    categoryKo: "만능성 세포",
    categoryEn: "Pluripotent Stem Cells",
    descriptionKo: "역분화 유도만능줄기세포가 고밀도로 밀집하며 급속히 자기 복제(Self-renewal)를 진행하는 살아있는 세포 집락.",
    descriptionEn: "High-density induced pluripotent stem cell colonies undergoing logarithmic exponential self-renewal.",
    imgSrc: "/images/abyss_frame_10s.jpg",
    targetMonsterId: "myth_dragon",
    targetMonsterName: "화염룡 드래곤",
    magnification: "600x",
    stainType: "OCT4/SOX2 Fluorescence"
  },
  {
    id: "photo_03_organogenesis",
    titleKo: "03. 체외 장기 원기 형성 (Organogenesis)",
    titleEn: "03. In Vitro Organ Primordia Morphogenesis",
    categoryKo: "기관 형성",
    categoryEn: "Organogenesis",
    descriptionKo: "줄기세포가 3차원 축을 형성하며 심장 원기 및 신경관 구조로 분화하기 시작하는 생체 타임랩스 단면.",
    descriptionEn: "Stem cells establishing 3D anterior-posterior body axis and differentiating into primitive organ buds.",
    imgSrc: "/images/abyss_frame_20s.jpg",
    targetMonsterId: "myth_kraken",
    targetMonsterName: "심해 거수 크라켄",
    magnification: "250x",
    stainType: "DAPI / Phalloidin"
  },
  {
    id: "photo_04_confocal_quad",
    titleKo: "04. 공초점 레이저 형광 현미경 4분할 분석",
    titleEn: "04. Confocal Laser Quad-Spectral Microscopy",
    categoryKo: "면역 형광",
    categoryEn: "Immunofluorescence",
    descriptionKo: "신경 세포(녹색), 혈관 내피(적색), 세포핵(청색) 등 생체 조직의 핵심 마커를 다중 파장으로 포착한 공초점 스캔.",
    descriptionEn: "Multi-channel confocal laser scanning revealing neuronal networks (green), vasculature (red), and nuclei (blue).",
    imgSrc: "/images/chimera_microscopy_quad.jpg",
    targetMonsterId: "myth_chimera",
    targetMonsterName: "원조 삼중수 키메라",
    magnification: "1200x",
    stainType: "Tuj1 / CD31 / DAPI"
  },
  {
    id: "photo_05_bubble_organoid",
    titleKo: "05. 미세 유체 기포 배양 오가노이드",
    titleEn: "05. Microfluidic Bubble Bio-Organoid",
    categoryKo: "바이오 리액터",
    categoryEn: "Bioreactor Culture",
    descriptionKo: "미세 유체 챔버 속 산소 기포와 삼투압 배양액 순환으로 3차원 부유 상태에서 자라나는 생체 조직 덩어리.",
    descriptionEn: "Suspended 3D tissue spheroid thriving inside a microfluidic chamber with continuous gas exchange.",
    imgSrc: "/images/stem_cell_bubble_organoid.png",
    targetMonsterId: "alien_void_slug",
    targetMonsterName: "보이드 아비스 레비아탄",
    magnification: "150x",
    stainType: "Brightfield Microscopy"
  },
  {
    id: "photo_06_bioreactor_vat",
    titleKo: "06. 원통형 유리 바이오리액터 배양 챔버",
    titleEn: "06. Cylindrical Glass Amniotic Bioreactor",
    categoryKo: "체외 배양 시스템",
    categoryEn: "Amniotic In Vitro System",
    descriptionKo: "항온·항습·무균 상태를 유지하는 원통형 유리 챔버. 중심부에서 영양액을 공급받으며 유기체가 부유 배양됩니다.",
    descriptionEn: "Sterile cylindrical glass chamber with precision fluidics maintaining nutrient saturation for suspended specimens.",
    imgSrc: "/images/bioreactor_cell_sphere_vat.jpg",
    targetMonsterId: "myth_frankenstein",
    targetMonsterName: "모던 바이오 프랑켄슈타인",
    magnification: "1x Macro",
    stainType: "Optical Chamber Lighting"
  },
  {
    id: "photo_07_neural_network",
    titleKo: "07. 신경 능선 및 뇌 오가노이드 시냅스망",
    titleEn: "07. Neural Crest & Brain Synaptic Mesh",
    categoryKo: "신경 생물학",
    categoryEn: "Neurobiology",
    descriptionKo: "신경 전도 신호를 전달하는 축삭 돌기망. 수만 개의 신경세포가 동기화된 전기 자극을 방출합니다.",
    descriptionEn: "Dense axonal projections and synaptic networks firing synchronized electro-chemical micro-pulses.",
    imgSrc: "/images/chimera_alien_cthulhu.jpg",
    targetMonsterId: "alien_cthulhu",
    targetMonsterName: "코스믹 크툴루 엔티티",
    magnification: "800x",
    stainType: "Synaptophysin / MAP2"
  },
  {
    id: "photo_08_chitin_exoskeleton",
    titleKo: "08. 키틴질 생체 외골격 미세 구조",
    titleEn: "08. Chitinous Bio-Exoskeleton Ultrastructure",
    categoryKo: "외골격 생체재료",
    categoryEn: "Biomaterials",
    descriptionKo: "강철 수준의 인장 강도를 지닌 절지동물 키틴-단백질 복합 격자망. 물리적 충격을 흡수하는 나노 적층 구조.",
    descriptionEn: "Nano-laminated chitin-protein crystalline matrix providing ultra-high tensile strength and impact resistance.",
    imgSrc: "/images/chimera_alien_arachno.jpg",
    targetMonsterId: "alien_arachno",
    targetMonsterName: "아라크노 제노-크러스트",
    magnification: "2000x",
    stainType: "Scanning Electron Micro (SEM)"
  }
];
