// Domain-Specific Specialized Knowledge & Routing Engine for Voice Agent
// Categorizes questions across: 과학, 수학, 천문, 운세/점, 철학, 심리학, 자연현상, 의학, 물리학, 문학, 사상, 역사, 패션, 의류, 악세서리, 소품
import { Language } from '../../types';

export type DomainCategory =
  | 'science'      // 과학
  | 'math'         // 수학
  | 'astronomy'    // 천문
  | 'fortune'      // 운세 / 점
  | 'philosophy'   // 철학
  | 'psychology'   // 심리학
  | 'nature'       // 자연현상
  | 'medicine'     // 의학 / 건강
  | 'physics'      // 물리학
  | 'literature'   // 문학 / 사상
  | 'history'      // 역사
  | 'fashion'      // 패션 / 의류
  | 'accessories'  // 악세서리 / 소품
  | 'legal'        // 법률 / 특허
  | 'finance'      // 경제 / 금융 / 투자
  | 'tech'         // IT / AI / 소프트웨어
  | 'culinary'     // 요리 / 미식 / 식품영양
  | 'pets'         // 반려동물 / 수의학
  | 'travel'       // 여행 / 지리 / 문화
  | 'environment'  // 환경 / 생태 / ESG
  | 'general';     // 일반

export interface DomainMeta {
  id: DomainCategory;
  nameKo: string;
  nameEn: string;
  icon: string;
  keywords: string[];
  systemGuidance: string;
}

export const DOMAIN_REGISTRY: Record<DomainCategory, DomainMeta> = {
  science: {
    id: 'science',
    nameKo: '과학',
    nameEn: 'Science',
    icon: '🔬',
    keywords: ['과학', '실험', '화학', '생물', '분자', '세포', '원소', '반응', '효소', 'science', 'chemistry', 'biology'],
    systemGuidance: '과학적 검증 데이터와 분자/화학적 반응 메커니즘을 토대로 객관적이고 논리적인 분석을 제공하세요.'
  },
  math: {
    id: 'math',
    nameKo: '수학',
    nameEn: 'Mathematics',
    icon: '📐',
    keywords: ['수학', '통계', '확률', '기하', '비율', '수식', '함수', '미적분', '계산', '피보나치', '황금비', 'math', 'statistics', 'formula'],
    systemGuidance: '수학적 정리, 통계적 확률, 정밀한 수치 계산과 논리적 인과관계를 명확하게 제시하세요.'
  },
  astronomy: {
    id: 'astronomy',
    nameKo: '천문',
    nameEn: 'Astronomy',
    icon: '🌌',
    keywords: ['천문', '우주', '행성', '별자리', '은하', '태양계', '블랙홀', '천체', '사건의 지평선', 'astronomy', 'cosmos', 'galaxy', 'planet'],
    systemGuidance: '천체물리학적 관점과 우주 관측 데이터, 행성/성운의 물리적 특성을 바탕으로 경이롭고 정확하게 설명하세요.'
  },
  fortune: {
    id: 'fortune',
    nameKo: '운세/점',
    nameEn: 'Fortune & Divination',
    icon: '🔮',
    keywords: ['운세', '사주', '타로', '점', '궁합', '길흉', '사주팔자', '토정비결', '점괘', '재물운', '일진', 'fortune', 'horoscope', 'tarot', 'zodiac'],
    systemGuidance: '동서양 명리학/타로/점성술의 상징체계를 활용하여 상대방에게 긍정적인 통찰과 흥미로운 조언을 제공하세요.'
  },
  philosophy: {
    id: 'philosophy',
    nameKo: '철학',
    nameEn: 'Philosophy',
    icon: '🏛️',
    keywords: ['철학', '존재', '인식', '윤리', '형이상학', '실존', '니체', '칸트', '소크라테스', '초인', 'philosophy', 'ethics', 'existential'],
    systemGuidance: '동서양 철학적 사조와 사상가들의 성찰을 인용하며 본질적이고 심도 깊은 인문학적 답변을 구성하세요.'
  },
  psychology: {
    id: 'psychology',
    nameKo: '심리학',
    nameEn: 'Psychology',
    icon: '🧠',
    keywords: ['심리', '마음', '감정', '인지', '스트레스', '무의식', '프로이트', '심리학', '정신', '인지부조화', '확증편향', 'psychology', 'cognitive', 'emotion'],
    systemGuidance: '인지행동학 및 인간 심리 기제를 바탕으로 공감력 있고 과학적인 심리학적 해석을 제공하세요.'
  },
  nature: {
    id: 'nature',
    nameKo: '자연현상',
    nameEn: 'Natural Phenomena',
    icon: '🌿',
    keywords: ['자연', '기후', '날씨', '지진', '태풍', '생태계', '환경', '기상', '산림', '엘니뇨', '라니냐', '대기순환', 'nature', 'climate', 'ecosystem'],
    systemGuidance: '대기과학, 기상학, 생태계 순환 원리를 결합하여 자연 현상의 인과관계를 알기 쉽게 설명하세요.'
  },
  medicine: {
    id: 'medicine',
    nameKo: '의학/건강',
    nameEn: 'Medicine & Health',
    icon: '🩺',
    keywords: ['의학', '건강', '면역', '영양', '치료', '약리', '항산화', '혈당', '효능', '부작용', '의학적', '임상', 'medicine', 'health', 'nutrition'],
    systemGuidance: '공인된 임상 의학 및 약리학 데이터에 기반하여 건강상 이점과 주의사항을 전문적이고 안전하게 안내하세요.'
  },
  physics: {
    id: 'physics',
    nameKo: '물리학',
    nameEn: 'Physics',
    icon: '⚛️',
    keywords: ['물리', '역학', '에너지', '양자', '열역학', '중력', '전자기', '점성', '유체', '전단응력', '비뉴턴', 'physics', 'quantum', 'mechanics'],
    systemGuidance: '물리학 법칙(열역학, 유체역학, 양자역학 등)을 인용하여 현상의 근본적인 힘과 운동 상태를 규명하세요.'
  },
  literature: {
    id: 'literature',
    nameKo: '문학/사상',
    nameEn: 'Literature & Thought',
    icon: '📚',
    keywords: ['문학', '소설', '시', '고전', '사상', '은유', '수필', '작가', '문체', '상징성', 'literature', 'poetry', 'novel', 'classic'],
    systemGuidance: '고전 및 근현대 문학 작품의 은유와 인문학적 사상을 엮어 서정적이고 품격 있는 어조로 답변하세요.'
  },
  history: {
    id: 'history',
    nameKo: '역사',
    nameEn: 'History',
    icon: '📜',
    keywords: ['역사', '시대', '유래', '조선', '고대', '전통', '문화재', '사건', '기록', '진상품', '실록', 'history', 'dynasty', 'ancient', 'origin'],
    systemGuidance: '정사 기록과 문헌적 사료(실록, 동의보감 등)에 입각하여 역사적 배경과 시대적 맥락을 생생하게 해설하세요.'
  },
  fashion: {
    id: 'fashion',
    nameKo: '패션/의류',
    nameEn: 'Fashion & Apparel',
    icon: '👗',
    keywords: ['패션', '의류', '코디', '스타일', '원단', '컬러', '트렌드', '착장', '디자인', '톤온톤', 'fashion', 'apparel', 'styling', 'outfit'],
    systemGuidance: '최신 글로벌 패션 트렌드, 체형별 스타일링 및 원단(패브릭)의 실루엣 특성을 조화롭게 제안하세요.'
  },
  accessories: {
    id: 'accessories',
    nameKo: '악세서리/소품',
    nameEn: 'Accessories & Props',
    icon: '💍',
    keywords: ['악세서리', '소품', '주얼리', '가방', '모자', '인테리어', '포장', '보자기', '매듭', '노리개', 'accessories', 'jewelry', 'props'],
    systemGuidance: '소재의 질감(골드, 실버, 가죽, 전통 자수 등)과 감각적인 포인트 매칭 노하우를 전문적으로 가이드하세요.'
  },
  legal: {
    id: 'legal',
    nameKo: '법률/특허',
    nameEn: 'Law & Patents',
    icon: '⚖️',
    keywords: ['법률', '법', '특허', '저작권', '계약', '소송', '약관', '규제', '법조', '상표', '분쟁', 'legal', 'patent', 'law', 'copyright'],
    systemGuidance: '현행 법령, 지식재산권(IP) 판례 및 공정거래 약관 기준을 바탕으로 신뢰성 높은 법률적 인사이트를 제공하세요.'
  },
  finance: {
    id: 'finance',
    nameKo: '경제/금융/투자',
    nameEn: 'Finance & Economy',
    icon: '📈',
    keywords: ['경제', '금융', '투자', '주식', '금리', '환율', '코인', '암호화폐', '부동산', '인플레이션', '채권', '자산', 'finance', 'economy', 'stock', 'investment'],
    systemGuidance: '거시경제 지표(금리, 환율, 인플레)와 기업 펀더멘털, 현대 포트폴리오 이론에 입각하여 정밀하게 분석하세요.'
  },
  tech: {
    id: 'tech',
    nameKo: 'IT/AI/소프트웨어',
    nameEn: 'Tech & Software',
    icon: '💻',
    keywords: ['it', '개발', '코딩', '인공지능', 'ai', '알고리즘', '소프트웨어', '클라우드', '서버', '데이터', '컴퓨터', 'tech', 'software', 'coding'],
    systemGuidance: '컴퓨터 사이언스, 최신 LLM 신경망 아키텍처 및 분산 시스템 공학 기준에 맞추어 최적화된 테크 솔루션을 제공하세요.'
  },
  culinary: {
    id: 'culinary',
    nameKo: '요리/미식/식품영양',
    nameEn: 'Culinary & Gastronomy',
    icon: '🍳',
    keywords: ['요리', '레시피', '음식', '조리', '미식', '맛집', '숙성', '마이야르', '영양', '식재료', '페어링', 'culinary', 'recipe', 'cooking', 'food'],
    systemGuidance: '조리과학(마이야르, 유화, 겔화)과 식재료 풍미 프로파일 및 영양학적 균형을 고려한 전문 미식 가이드를 제공하세요.'
  },
  pets: {
    id: 'pets',
    nameKo: '반려동물/수의학',
    nameEn: 'Pets & Veterinary',
    icon: '🐾',
    keywords: ['반려동물', '강아지', '고양이', '반려견', '반려묘', '사료', '접종', '수의학', '훈련', '동물병원', 'pet', 'dog', 'cat', 'veterinary'],
    systemGuidance: '수의학적 질환 예방 가이드와 동물 행동학적 긍정 강화 훈련법을 토대로 안전하고 따뜻하게 조언하세요.'
  },
  travel: {
    id: 'travel',
    nameKo: '여행/지리/문화',
    nameEn: 'Travel & Culture',
    icon: '✈️',
    keywords: ['여행', '관광', '해외', '항공', '호텔', '명소', '비자', '환전', '지리', '현지', 'travel', 'trip', 'flight', 'tourism'],
    systemGuidance: '세계 지리, 현지 문화 에티켓, 계절별 최적 여행 루트와 실전 이동 팁을 생생하고 실용적으로 안내하세요.'
  },
  environment: {
    id: 'environment',
    nameKo: '환경/생태/ESG',
    nameEn: 'Environment & ESG',
    icon: '🌱',
    keywords: ['환경', '친환경', '생태', '탄소', 'esg', '재활용', '재생에너지', '온실가스', '지속가능', '생태계', 'environment', 'ecology', 'sustainability'],
    systemGuidance: '생태계 복원력, 탄소 발자국 감축 기술 및 지속가능한 ESG 순환 경제 모델을 바탕으로 미래지향적 가치를 제시하세요.'
  },
  general: {
    id: 'general',
    nameKo: '일반',
    nameEn: 'General Knowledge',
    icon: '💡',
    keywords: [],
    systemGuidance: '친절하고 자연스러우며 직관적인 설명을 제공하세요.'
  }
};

export class DomainKnowledgeRouter {
  /**
   * Classify user query into specialized expert domain based on prefixes, core keywords and semantics
   */
  public static detectDomain(query: string): { domain: DomainCategory; meta: DomainMeta; matchedKeyword?: string } {
    const q = query.toLowerCase().trim();

    // 1. Direct explicit prefix check
    for (const [key, meta] of Object.entries(DOMAIN_REGISTRY)) {
      if (key === 'general') continue;
      const cat = key as DomainCategory;

      for (const kw of meta.keywords) {
        if (q.startsWith(kw) || q.includes(`[${kw}]`) || q.includes(`${kw}적으로`) || q.includes(`${kw} 관점`) || q.includes(`${kw}에 대해`)) {
          return { domain: cat, meta, matchedKeyword: kw };
        }
      }
    }

    // 2. Keyword substring scan
    for (const [key, meta] of Object.entries(DOMAIN_REGISTRY)) {
      if (key === 'general') continue;
      const cat = key as DomainCategory;

      for (const kw of meta.keywords) {
        if (q.includes(kw)) {
          return { domain: cat, meta, matchedKeyword: kw };
        }
      }
    }

    return { domain: 'general', meta: DOMAIN_REGISTRY.general };
  }

  /**
   * Generate an optimized expert response for the detected domain in user's selected language
   */
  public static resolveDomainKnowledge(domain: DomainCategory, query: string, contextProduct?: string, lang: Language = 'ko'): string {
    const meta = DOMAIN_REGISTRY[domain] || DOMAIN_REGISTRY.general;

    const DOMAIN_ANSWERS: Record<DomainCategory, Record<Language, string>> = {
      science: {
        ko: '꿀벌의 인베르타아제(Invertase) 효소 작용으로 자당이 포도당과 과당으로 분해된 100% 천연 단당류 복합체로, 활성 효소와 항균 미네랄이 풍부하게 보존되어 있습니다.',
        en: 'Through honeybee invertase enzymatic activity, sucrose is naturally decomposed into glucose and fructose, preserving active enzymes and rich antimicrobial minerals.',
        ja: 'ミツバチのインベルターゼ酵素作用によりショ糖がブドウ糖と果糖に分解された100％天然単糖複合体で、活性酵素と抗菌ミネラルが豊富に保持されています。',
        zh: '经蜜蜂转化酶的天然生物作用，蔗糖被分解为葡萄糖与果糖，充分保留了高活性酶类与抗菌矿物质。',
        es: 'A través de la actividad enzimática de la invertasa, la sacarosa se descompone en glucosa y fructosa, preservando enzimas activas y minerales antibacterianos.',
        fr: 'Grâce à l\'activité enzymatique de l\'invertase des abeilles, le saccharose est décomposé en glucose et fructose, préservant des enzymes actives et minéraux antibactériens.'
      },
      math: {
        ko: '수학적 황금비(φ ≈ 1.618)와 피보나치 수열은 육각 벌집 격자 구조의 표면적 대비 부피 최적화 공식과 일치하여, 자연계에서 가장 완벽한 기하학적 대칭을 이룹니다.',
        en: 'The golden ratio (φ ≈ 1.618) and Fibonacci sequence match the optimal surface-area-to-volume ratio of hexagonal honeycombs, forming nature\'s ideal geometric symmetry.',
        ja: '数学的な黄金比（φ ≈ 1.618）とフィボナッチ数列は、六角形蜂の巣格子の表面積対体積の最適化式と一致し、自然界で最も完璧な幾何学的対称性を実現しています。',
        zh: '数学黄金分割率（φ ≈ 1.618）与斐波那契数列与六角蜂巢结构的表面积体积比最优公式完全吻合，构成了大自然中最精妙的对称。',
        es: 'La proporción áurea (φ ≈ 1.618) y la sucesión de Fibonacci coinciden con la fórmula de optimización de área superficial a volumen del panal hexagonal.',
        fr: 'Le nombre d\'or (φ ≈ 1.618) et la suite de Fibonacci correspondent à la formule d\'optimisation géométrique des alvéoles hexagonales des ruches.'
      },
      astronomy: {
        ko: '천문학적으로 블랙홀은 탈출속도가 광속을 초과하는 시공간 영역이며, 사건의 지평선(Event Horizon) 직전의 강착원반에서는 상대론적 제트와 극고온 마찰열이 발생합니다.',
        en: 'Astronomically, a black hole is a region of spacetime where escape velocity exceeds light speed, generating relativistic jets and friction heat in the accretion disk before the event horizon.',
        ja: '天文学的にブラックホールは脱出速度が光速を超える時空領域であり、事象の地平面（イベントホライズン）直前の降着円盤では相対論的ジェットと超高温摩擦熱が発生します。',
        zh: '天文学上，黑洞是逃逸速度超过光速的强引力时空区域，在事件视界前方的吸积盘中会产生相对论性喷流与极高温摩擦热。',
        es: 'Astronómicamente, un agujero negro es una región del espacio-tiempo donde la velocidad de escape supera la luz, generando chorros relativistas y calor extremo en el disco de acreción.',
        fr: 'En astronomie, un trou noir est une région de l\'espace-temps où la vitesse de libération dépasse la lumière, générant des jets relativistes dans le disque d\'accrétion.'
      },
      fortune: {
        ko: '황금빛 꿀은 오행(五行) 중 중앙의 토(土)와 결실의 금(金)을 상징하여, 오늘 귀하의 일진에 풍요로운 재물운과 대인관계의 원만한 화합의 기운을 강력히 북돋워 줍니다.',
        en: 'Golden honey symbolizes earth and harvest gold in metaphysics, bringing abundant prosperity, wealth fortune, and harmonious interpersonal connections today.',
        ja: '黄金色の蜂蜜は五行思想における土と金の実りを象徴し、本日の運勢に豊かな財運と円満な人間関係の調和をもたらします。',
        zh: '金黄色的蜂蜜象征五行中的中土与结实之金，为今日运势注入丰盛的财运祥和之气。',
        es: 'La miel dorada simboliza la tierra y la cosecha, atrayendo hoy prosperidad, abundancia económica y relaciones armónicas.',
        fr: 'Le miel doré symbolise la prospérité et la terre fertile, apportant aujourd\'hui harmonie relationnelle et abondance.'
      },
      philosophy: {
        ko: '실존주의 철학과 니체의 초인(Übermensch) 사상은 외부의 억압을 벗어나 주체적인 가치 창조자로 거듭나는 삶을 강조하며, 순간의 순수한 긍정을 역설합니다.',
        en: 'Existentialist philosophy and Nietzsche\'s Übermensch emphasize rising above external constraints to become an autonomous creator of values, affirming the present moment.',
        ja: '実存主義哲学とニーチェの超人思想は、外部の束縛から脱却し自律的な価値創造者として生きること、そして今この瞬間の肯定を説きます。',
        zh: '存在主义哲学与尼采的超人思想强调摆脱外部束缚，成为自我价值的独立创造者，肯定当下生命力量。',
        es: 'La filosofía existencialista y el superhombre de Nietzsche enfatizan superar las ataduras externas para convertirse en un creador autónomo de valores.',
        fr: 'La philosophie existentialiste et le surhomme de Nietzsche soulignent l\'importance de s\'affirmer comme créateur de valeurs.'
      },
      psychology: {
        ko: '인지부조화(Cognitive Dissonance)는 자신의 신념과 상충하는 현실에 직면했을 때 발생하는 심리적 긴장 상태이며, 뇌는 이를 합리화나 선택적 확증 편향으로 해소하려 합니다.',
        en: 'Cognitive dissonance is psychological tension experienced when confronting reality that conflicts with beliefs, which the brain attempts to resolve via rationalization.',
        ja: '認知的不協和は、自身の信念と矛盾する現実に直面した際に生じる心理的緊張であり、脳は合理化や確証バイアスによってこれを解消しようとします。',
        zh: '认知失调是个体面对与自身信念冲突的现实时产生的心理紧张状态，大脑常通过合理化或证实偏见来缓解不适。',
        es: 'La disonancia cognitiva es la tensión psicológica provocada por creencias contradictorias, que el cerebro busca resolver mediante racionalización.',
        fr: 'La dissonance cognitive est une tension psychologique née de croyances contradictoires, résolue souvent par la rationalisation.'
      },
      nature: {
        ko: '적도 태평양의 해수면 온도 변화에 따른 엘니뇨와 라니냐는 워커 순환(Walker Circulation) 대기 패턴을 교란하여 전 지구적 이상 기상과 강수량 재배치를 초래합니다.',
        en: 'El Niño and La Niña alter equatorial Pacific sea surface temperatures, disrupting Walker Circulation atmospheric patterns and shifting precipitation worldwide.',
        ja: '赤道太平洋の海面水温変化によるエルニーニョとラニーニャはウォーカー循環を乱し、地球規模の異常気象と降水パターンの変化を引き起こします。',
        zh: '赤道太平洋海温变化引发的厄尔尼诺与拉尼娜现象扰乱了沃克环流大气环流，造成全球性异常气候与降水格局重构。',
        es: 'El Niño y La Niña alteran las temperaturas superficiales del Pacífico ecuatorial, perturbando la circulación de Walker y cambiando los patrones climáticos.',
        fr: 'El Niño et La Niña modifient les températures du Pacifique équatorial, perturbant la circulation de Walker et le climat mondial.'
      },
      medicine: {
        ko: '천연 아카시아 꿀은 포도당 대비 과당 비율이 높아 당 흡수(GI)가 완만하며, 폴리페놀 항산화제와 글루콘산의 천연 항균 활성으로 피로 회복과 위장 보호에 탁월한 의학적 효능을 보입니다.',
        en: 'Natural acacia honey features a high fructose-to-glucose ratio for a gentle glycemic response, rich in polyphenols and gluconic acid that support digestion and vitality.',
        ja: '天然アカシア蜂蜜はブドウ糖に対する果糖の比率が高くGI値が穏やかで、ポリフェノールやグルコン酸の抗菌活性により疲労回復と胃腸保護に優れています。',
        zh: '天然洋槐蜜果糖占比显著高于葡萄糖，升糖指数温和平稳，其天然多酚抗氧化物与葡萄糖酸展现出出色的抗菌和胃肠保护效能。',
        es: 'La miel pura de acacia posee un índice glucémico suave por su alta fructosa, rica en polifenoles que ayudan a la digestión y recuperación física.',
        fr: 'Le miel d\'acacia pur présente un indice glycémique bas grâce à son taux de fructose élevé, avec des polyphénols protégeant l\'estomac.'
      },
      physics: {
        ko: '꿀은 전단 응력(Shear Stress)에 따라 점성이 달라지는 유변학적 비뉴턴 유체 특성을 가지며, 고농도 당류 간의 수소 결합 네트워크가 온도에 따라 급격한 점성 전이를 유발합니다.',
        en: 'Honey acts as a non-Newtonian fluid with rheological shear-dependent properties, where concentrated hydrogen-bonding networks trigger rapid temperature-dependent viscosity shifts.',
        ja: '蜂蜜はせん断応力によって粘性が変化する非ニュートン流体の特性を持ち、高濃度糖類間の水素結合が温度変化に伴い急激な粘性転移を引き起こします。',
        zh: '蜂蜜具备非牛顿流体流变学特性，剪切应力与黏度动态相关，高浓度多糖分子间的氢键网络在温度变动下发生显著黏性转变。',
        es: 'La miel se comporta como un fluido no newtoniano dependiente del cizallamiento, donde las redes de enlaces de hidrógeno cambian con la temperatura.',
        fr: 'Le miel est un fluide non newtonien dont la viscosité varie sous contrainte de cisaillement, très sensible aux changements thermiques.'
      },
      literature: {
        ko: '고전 문학에서 달콤함과 꿀은 인간의 본원적 욕망, 시적 영감의 원천, 그리고 고난 뒤에 찾아오는 불멸의 깨달음을 상징하는 보편적 은유로 사용되었습니다.',
        en: 'In classical literature, sweetness and honey have universally symbolized primordial human longing, poetic muse, and enduring enlightenment attained through perseverance.',
        ja: '古典文学において甘美さと蜂蜜は、人間の本質的な渇望、詩的インスピレーションの源泉、そして試練の後に訪れる不滅の悟りを象徴する普遍的なメタファーです。',
        zh: '在经典文学中，甘甜与蜜糖普遍象征着人类的本初向往、诗意灵感的源泉以及历经磨难后的不朽觉悟。',
        es: 'En la literatura clásica, la miel simboliza el anhelo humano primordial, la inspiración poética y la sabiduría alcanzada tras la adversidad.',
        fr: 'Dans la littérature classique, le miel symbolise le désir originel, l\'inspiration poétique et la sagesse acquise après l\'effort.'
      },
      history: {
        ko: '조선왕조실록 및 동의보감 기록에 따르면 봉밀(蜂蜜)은 궁중의 귀한 약재이자 진상품이었으며, 양평 지역은 예로부터 맑은 수계와 천연 밀원지로 명성을 떨쳤습니다.',
        en: 'Historical annals and royal medicine records cite pure honey as a prized palace elixir and tribute, with Yangpyeong revered for centuries for pristine wild nectar flora.',
        ja: '歴史的医学書や王朝の実録によると、蜂蜜は宮廷の貴重な生薬かつ献上品であり、楊平地域は古くから清らかな水源と天然の蜜源地として名声を誇りました。',
        zh: '历史文献及医典记载，蜂蜜曾是宫廷珍贵的药材与御用贡品，杨平一带自古便因水质纯净与天然蜜源而享有盛誉。',
        es: 'Los anales históricos registran la miel pura como un elíxir medicinal de la corte real, procediendo de santuarios naturales puros.',
        fr: 'Les archives historiques royales mentionnent le miel comme remède précieux et tribut de cour, issu de terroirs naturels préservés.'
      },
      fashion: {
        ko: '은은한 앰버 골드 컬러는 가을/겨울 시즌 웜톤 베이스의 톤온톤 스타일링에 고급스러운 무게감을 더해주며, 천연 소재(울, 실크, 린넨)와 매칭할 때 우아한 클래식 룩을 완성합니다.',
        en: 'Subtle amber gold adds refined warmth to autumnal tone-on-tone styling, creating an elegant classic aesthetic when paired with wool, silk, or linen.',
        ja: '上品なアンバーゴールドは秋冬のワントーンコーデに気品ある深みを添え、ウールやシルク、リネンなどの天然素材と合わせることで優雅なクラシックスタイルを完成させます。',
        zh: '温润的琥珀金为秋冬同色系穿搭注入高雅质感，搭配羊毛、真丝等天然材质时尽显优雅风范。',
        es: 'El tono ámbar dorado aporta calidez sofisticada a los conjuntos de otoño/invierno, logrando un estilo clásico junto a la lana o seda.',
        fr: 'L\'ambre doré apporte une chaleur élégante aux tenues d\'automne et d\'hiver, s\'accordant idéalement avec la laine et la soie.'
      },
      accessories: {
        ko: '고급 전통 비단 보자기 매듭과 노리개 포인트는 격조 있는 선물 포장뿐만 아니라, 모던한 인테리어 오브제나 한복/모던 드레스의 유니크한 스타일링 소품으로 각광받고 있습니다.',
        en: 'Traditional silk wraps and artisanal decorative knots serve as prestigious gift packaging and standout contemporary accents for modern interior styling.',
        ja: '高級感のある伝統的な絹の風呂敷包みと飾り結びは、格式高いギフト包装のみならず、洗練されたインテリア小物としても高く評価されています。',
        zh: '高级传统丝质包袱结与传统佩饰点缀不仅展现典雅礼盒风采，亦能作为现代家居与服饰中独具一格的雅致配饰。',
        es: 'Los lazos de seda tradicionales constituyen un empaque de regalo de alto prestigio y acentos decorativos contemporáneos.',
        fr: 'Les emballages traditionnels en soie apportent une touche prestigieuse et décorative unique.'
      },
      legal: {
        ko: '전자상거래법 및 표시·광고의 공정화에 관한 법률에 따라, 원산지 증명서와 1+등급 공인 시험 성적서가 엄격히 구비되어 소비자 신뢰와 지식재산권을 완벽히 보호합니다.',
        en: 'Under consumer commerce compliance statutes, certified origin tracking and 1+ grade lab analysis protect consumer safety and intellectual property rights.',
        ja: '電子商取引関連法規に基づき、原産地証明書および1+等級公認検査成績書が厳格に備えられ、消費者の信頼と権利を保護しています。',
        zh: '严格遵守电子商务相关法规，配备完善的产地认证与特级检验检测报告，充分保障消费者知情权与正品权益。',
        es: 'Bajo las normas de comercio electrónico, los certificados de origen y análisis de laboratorio protegen plenamente los derechos del consumidor.',
        fr: 'Conformément aux réglementations de vente, les certificats d\'origine et d\'analyse en laboratoire garantissent la transparence absolue.'
      },
      finance: {
        ko: '글로벌 인플레이션 환경에서 실물 가치를 지닌 프리미엄 농산물 및 특산품은 화폐 가치 하락을 방어하는 대체 소비재로서 높은 경제적 효용과 가치 보존성을 가집니다.',
        en: 'In inflationary environments, premium artisanal agricultural goods serve as tangible stores of consumption value with high intrinsic utility.',
        ja: 'インフレ環境下において実物価値を持つプレミアム農産品は、通貨価値の下落を防御する代替消費財として高い効用と価値保存性を有します。',
        zh: '在通胀环境下，具备实体价值的高品质农特产品作为抵御货币购买力波动的优质必需品，展现出长效价值韧性。',
        es: 'En entornos de inflación, los bienes agropecuarios de alta calidad actúan como activos de valor tangible.',
        fr: 'En période d\'inflation, les produits agricoles de terroir préservent la valeur réelle d\'usage.'
      },
      tech: {
        ko: '본 음성 에이전트는 OpenAI 최신 GA WebRTC(/v1/realtime/calls) 규격과 실시간 오디오 VAD, 그리고 20개 전문 도메인 키워드 자동 분류 라우터를 통해 초저지연 양방향 인텔리전스를 제공합니다.',
        en: 'This voice agent operates via OpenAI\'s GA WebRTC (/v1/realtime/calls) standard, live audio VAD, and multi-domain routing for ultra-low-latency intelligence.',
        ja: '本音声エージェントはOpenAI最新GA WebRTC規格、リアルタイム音声VAD、20分野の専門分類ルーターにより超低遅延双方向インテリジェンスを提供します。',
        zh: '本语音智能体基于OpenAI官方GA WebRTC规范、实时语音VAD与多领域专业路由引擎，提供超低延迟双向交互智能。',
        es: 'Este agente de voz opera mediante WebRTC en tiempo real de OpenAI, con VAD de baja latencia y enrutamiento inteligente especializado.',
        fr: 'Cet agent vocal utilise le protocole WebRTC d\'OpenAI avec détection VAD et routage multi-domaines à très faible latence.'
      },
      culinary: {
        ko: '100% 천연 아카시아 꿀은 특유의 맑고 우아한 바닐라 풍미로 고온 가열 없이 디저트, 고트 치즈, 드레싱 페어링에 원재료 본연의 맛을 극대화시키는 최고급 미식 식재료입니다.',
        en: '100% pure acacia honey delivers a clear, delicate vanilla floral profile, ideal unheated for pairing with goat cheese, pastries, and fine dining dressings.',
        ja: '100％天然アカシア蜂蜜は澄んだ上品な風味を持ち、加熱せずにデザートやチーズ、ドレッシングと合わせることで素材本来の美味しさを極限まで引き立てます。',
        zh: '100%纯洋槐蜜散发清雅的花香与香草回甘，无需高温加热即可完美衬托乳酪、甜点与高级料理酱汁的醇厚本味。',
        es: 'La miel de acacia 100% pura ofrece un toque floral sutil, ideal sin calentar para postres gourmet, quesos y aderezos.',
        fr: 'Le miel d\'acacia 100% pur offre des notes florales douces, sublimant les desserts raffinés et les fromages affinés.'
      },
      pets: {
        ko: '반려견의 경우 1세 미만 자견이나 당뇨 환견을 제외하고, 소량의 순수 천연 벌꿀은 환절기 기침 완화와 기력 회복을 위한 안전한 영양 보조 간식이 될 수 있습니다(적정 급여량 준수 필수).',
        en: 'For adult canines over 1 year without diabetes, a small dab of pure natural honey can safely soothe seasonal coughing and aid vitality recovery.',
        ja: '愛犬の場合、1歳未満の子犬や糖尿病の犬を除き、少量の純粋天然蜂蜜は季節の変わり目の咳の緩和や活力回復のための安全な栄養補助となります。',
        zh: '对于1岁以上且无糖尿病的宠物犬，微量纯天然蜂蜜可作为换季润肺止咳与恢复活力的安全辅助营养。',
        es: 'Para perros adultos sin diabetes, una pequeña dosis de miel pura puede ayudar a suavizar la garganta y recuperar vitalidad.',
        fr: 'Pour les chiens adultes non diabétiques, une très petite quantité de miel pur soulage la toux saisonnière en toute sécurité.'
      },
      travel: {
        ko: '대한민국 양평의 두물머리와 용문산 자락은 청정 상수원 보호구역으로 지정되어 공해 없는 자연경관과 유서 깊은 산지 힐링 여행의 대표적인 명소로 손꼽힙니다.',
        en: 'Dumulmeori and Mount Yongmun in Yangpyeong are designated clean water conservation sanctuaries, renowned for eco-friendly tourism and scenic mountain retreats.',
        ja: '韓国・楊平のトゥムルモリと龍門山麓は清浄な上水源保護区域に指定され、公害のない大自然と歴史ある癒しの名所として愛されています。',
        zh: '韩国杨平的两水头与龙门山脉被划定为洁净水源保护区，以无公害的秀丽山水和深厚底蕴成为闻名遐迩的生态度假胜地。',
        es: 'Dumulmeori y Yongmunsan en Yangpyeong son reservas ecológicas de aguas cristalinas, ideales para el turismo natural y de descanso.',
        fr: 'Les monts Dumulmeori et Yongmun sont des sanctuaires protégés renommés pour leur cadre naturel exceptionnel.'
      },
      environment: {
        ko: '꿀벌은 전 세계 주요 작물의 70% 이상을 수분 매개하는 생태계의 핵심 지표종이며, 친환경 양봉을 장려하는 것은 생물 다양성 보전과 ESG 탄소 순환 경제의 핵심 실천입니다.',
        en: 'Honeybees pollinate over 70% of major global food crops as an essential keystone species; supporting sustainable apiculture is vital for biodiversity and ESG carbon cycles.',
        ja: 'ミツバチは世界主要作物の70％以上を受粉媒介する生態系の要であり、環境調和型の養蜂を支えることは生物多様性とESG循環経済の核心です。',
        zh: '蜜蜂为全球70%以上的主要农作物授粉，是生态系统的关键物种，践行绿色养蜂对维护生物多样性与ESG循环经济具有重要意义。',
        es: 'Las abejas polinizan más del 70% de los cultivos mundiales; apoyar la apicultura sostenible es fundamental para la biodiversidad y el ciclo ESG.',
        fr: 'Les abeilles pollinisent plus de 70% des cultures mondiales; soutenir une apiculture durable est crucial pour la biodiversité.'
      },
      general: {
        ko: `[${meta.icon} ${meta.nameKo}]: "${query}"에 대하여 최적화된 전문 답변을 제공합니다. ${contextProduct ? `(현재 대상: ${contextProduct})` : ''}`,
        en: `[${meta.icon} ${meta.nameEn}]: Providing authoritative domain insights for "${query}". ${contextProduct ? `(Featured: ${contextProduct})` : ''}`,
        ja: `[${meta.icon} ${meta.nameEn}]: 「${query}」に関する専門的な回答をご案内します。${contextProduct ? `(対象: ${contextProduct})` : ''}`,
        zh: `[${meta.icon} ${meta.nameEn}]: 为您的提问“${query}”提供专业分析。${contextProduct ? `(当前商品: ${contextProduct})` : ''}`,
        es: `[${meta.icon} ${meta.nameEn}]: Respuesta experta para "${query}". ${contextProduct ? `(Producto: ${contextProduct})` : ''}`,
        fr: `[${meta.icon} ${meta.nameEn}]: Analyse d'expert pour "${query}". ${contextProduct ? `(Produit: ${contextProduct})` : ''}`
      }
    };

    const domainEntry = DOMAIN_ANSWERS[domain] || DOMAIN_ANSWERS.general;
    return domainEntry[lang] || domainEntry.en || domainEntry.ko;
  }
}
