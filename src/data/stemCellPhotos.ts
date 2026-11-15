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
    id: "photo_01_myth_dragon",
    titleKo: "01. [전설의 괴수] 화염룡 드래곤",
    titleEn: "01. [Mythic] Pyroclastic Dragon",
    categoryKo: "전설의 괴수 1",
    categoryEn: "Mythic Beast 1",
    descriptionKo: "조류의 흉골 비행근과 파충류 케라틴 비늘 줄기세포를 융합해 배아부터 성체 드래곤으로 배양합니다.",
    descriptionEn: "Fuses avian flight muscle and reptilian scale stem cells from blastocyst to adult pyroclastic dragon.",
    imgSrc: "/images/chimera_jumpscare_dragon.jpg",
    targetMonsterId: "myth_dragon",
    targetMonsterName: "화염룡 드래곤",
    magnification: "600x",
    stainType: "OCT4/SOX2 Fluorescence"
  },
  {
    id: "photo_02_myth_kraken",
    titleKo: "02. [전설의 괴수] 심해 거수 크라켄",
    titleEn: "02. [Mythic] Abyssal Kraken",
    categoryKo: "전설의 괴수 2",
    categoryEn: "Mythic Beast 2",
    descriptionKo: "대왕오징어 자율 신경절과 연체동물 연골 스캐폴드를 결합해 8개의 거대 촉수를 가진 크라켄을 배양합니다.",
    descriptionEn: "Combines cephalopod neural ganglia and cartilage scaffolds to grow an 8-tentacled abyssal kraken.",
    imgSrc: "/images/chimera_jumpscare_disco_kraken.jpg",
    targetMonsterId: "myth_kraken",
    targetMonsterName: "심해 거수 크라켄",
    magnification: "250x",
    stainType: "DAPI / Phalloidin"
  },
  {
    id: "photo_03_alien_xenomorph",
    titleKo: "03. [외계 괴수] 제노모프 바이오 타이탄",
    titleEn: "03. [Alien] Xenomorph Bio-Titan",
    categoryKo: "외계 괴수 1",
    categoryEn: "Alien Beast 1",
    descriptionKo: "키틴질 외골격과 초강산 내성 혈관 조직을 결합해 성간 포식자 제노모프 타이탄을 배양합니다.",
    descriptionEn: "Splices chitinous exoskeleton with hyper-acidic vascular endothelium to culture a Xenomorph Bio-Titan.",
    imgSrc: "/images/chimera_alien_xenomorph.jpg",
    targetMonsterId: "alien_xenomorph",
    targetMonsterName: "제노모프 바이오 타이탄",
    magnification: "1500x",
    stainType: "Chitin SEM"
  },
  {
    id: "photo_04_alien_void",
    titleKo: "04. [외계 괴수] 심우주 보이드 레비아탄",
    titleEn: "04. [Alien] Void Abyss Leviathan",
    categoryKo: "외계 괴수 2",
    categoryEn: "Alien Beast 2",
    descriptionKo: "생체 발광 효소와 반투명 유영 조직을 미세 유체 배양기에서 증식시켜 심우주 보이드 괴수를 배양합니다.",
    descriptionEn: "Cultures bio-photonic translucent tissues inside a microfluidic chamber into a Void Abyss Leviathan.",
    imgSrc: "/images/chimera_alien_void_slug.jpg",
    targetMonsterId: "alien_void_slug",
    targetMonsterName: "보이드 아비스 레비아탄",
    magnification: "150x",
    stainType: "Bioluminescence"
  },
  {
    id: "photo_05_frankenstein",
    titleKo: "05. [프랑켄슈타인] 모던 바이오 프랑켄슈타인",
    titleEn: "05. [Frankenstein] Modern Bio-Frankenstein",
    categoryKo: "프랑켄슈타인 1",
    categoryEn: "Frankenstein 1",
    descriptionKo: "다종 생체 조직을 전자기 펄스와 줄기세포 봉합 기술로 재결합한 프로메테우스 프랑켄슈타인을 배양합니다.",
    descriptionEn: "Reconstructs multi-lineage bio-tissues via electro-pulse stimulation and stem-cell stitching.",
    imgSrc: "/images/frankenstein_chimera.jpg",
    targetMonsterId: "myth_frankenstein",
    targetMonsterName: "모던 바이오 프랑켄슈타인",
    magnification: "1x Macro",
    stainType: "Electro-Bio Vat"
  },
  {
    id: "photo_06_human",
    titleKo: "06. [인간] 합성 인간 호모 프로메테우스",
    titleEn: "06. [Human] Synthetic Homo Prometheus",
    categoryKo: "인간 1",
    categoryEn: "Human 1",
    descriptionKo: "인간 유도만능줄기세포(hiPSC)와 뇌 오가노이드 신경망을 통합해 차세대 인공 합성 인간을 배양합니다.",
    descriptionEn: "Integrates human iPSC lineages and cortical brain organoid networks into a synthetic human.",
    imgSrc: "/images/yale_brainex_perfusion_lab.jpg",
    targetMonsterId: "human_prometheus",
    targetMonsterName: "합성 인간 프로메테우스",
    magnification: "800x",
    stainType: "Synaptophysin / MAP2"
  }
];
