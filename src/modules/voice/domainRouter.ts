// Domain-Specific Specialized Knowledge & Routing Engine for Voice Agent
// Categorizes questions across: 과학, 수학, 천문, 운세/점, 철학, 심리학, 자연현상, 의학, 물리학, 문학, 사상, 역사, 패션, 의류, 악세서리, 소품

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
   * Generate an optimized expert response for the detected domain
   */
  public static resolveDomainKnowledge(domain: DomainCategory, query: string, contextProduct?: string): string {
    const meta = DOMAIN_REGISTRY[domain] || DOMAIN_REGISTRY.general;

    switch (domain) {
      case 'science':
        return '꿀벌의 인베르타아제(Invertase) 효소 작용으로 자당이 포도당과 과당으로 분해된 100% 천연 단당류 복합체로, 활성 효소와 항균 미네랄이 풍부하게 보존되어 있습니다.';
      case 'math':
        return '수학적 황금비(φ ≈ 1.618)와 피보나치 수열은 육각 벌집 격자 구조의 표면적 대비 부피 최적화 공식과 일치하여, 자연계에서 가장 완벽한 기하학적 대칭을 이룹니다.';
      case 'astronomy':
        return '천문학적으로 블랙홀은 탈출속도가 광속을 초과하는 시공간 영역이며, 사건의 지평선(Event Horizon) 직전의 강착원반에서는 상대론적 제트와 극고온 마찰열이 발생합니다.';
      case 'fortune':
        return '황금빛 꿀은 오행(五行) 중 중앙의 토(土)와 결실의 금(金)을 상징하여, 오늘 귀하의 일진에 풍요로운 재물운과 대인관계의 원만한 화합의 기운을 강력히 북돋워 줍니다.';
      case 'philosophy':
        return '실존주의 철학과 니체의 초인(Übermensch) 사상은 외부의 억압을 벗어나 주체적인 가치 창조자로 거듭나는 삶을 강조하며, 순간의 순수한 긍정을 역설합니다.';
      case 'psychology':
        return '인지부조화(Cognitive Dissonance)는 자신의 신념과 상충하는 현실에 직면했을 때 발생하는 심리적 긴장 상태이며, 뇌는 이를 합리화나 선택적 확증 편향으로 해소하려 합니다.';
      case 'nature':
        return '적도 태평양의 해수면 온도 변화에 따른 엘니뇨와 라니냐는 워커 순환(Walker Circulation) 대기 패턴을 교란하여 전 지구적 이상 기상과 강수량 재배치를 초래합니다.';
      case 'medicine':
        return '천연 아카시아 꿀은 포도당 대비 과당 비율이 높아 당 흡수(GI)가 완만하며, 폴리페놀 항산화제와 글루콘산의 천연 항균 활성으로 피로 회복과 위장 보호에 탁월한 의학적 효능을 보입니다.';
      case 'physics':
        return '꿀은 전단 응력(Shear Stress)에 따라 점성이 달라지는 유변학적 비뉴턴 유체 특성을 가지며, 고농도 당류 간의 수소 결합 네트워크가 온도에 따라 급격한 점성 전이를 유발합니다.';
      case 'literature':
        return '고전 문학에서 달콤함과 꿀은 인간의 본원적 욕망, 시적 영감의 원천, 그리고 고난 뒤에 찾아오는 불멸의 깨달음을 상징하는 보편적 은유로 사용되었습니다.';
      case 'history':
        return '조선왕조실록 및 동의보감 기록에 따르면 봉밀(蜂蜜)은 궁중의 귀한 약재이자 진상품이었으며, 양평 지역은 예로부터 맑은 수계와 천연 밀원지로 명성을 떨쳤습니다.';
      case 'fashion':
        return '은은한 앰버 골드 컬러는 가을/겨울 시즌 웜톤 베이스의 톤온톤 스타일링에 고급스러운 무게감을 더해주며, 천연 소재(울, 실크, 린넨)와 매칭할 때 우아한 클래식 룩을 완성합니다.';
      case 'accessories':
        return '고급 전통 비단 보자기 매듭과 노리개 포인트는 격조 있는 선물 포장뿐만 아니라, 모던한 인테리어 오브제나 한복/모던 드레스의 유니크한 스타일링 소품으로 각광받고 있습니다.';
      case 'legal':
        return '전자상거래법 및 표시·광고의 공정화에 관한 법률에 따라, 원산지 증명서와 1+등급 공인 시험 성적서가 엄격히 구비되어 소비자 신뢰와 지식재산권을 완벽히 보호합니다.';
      case 'finance':
        return '글로벌 인플레이션 환경에서 실물 가치를 지닌 프리미엄 농산물 및 특산품은 화폐 가치 하락을 방어하는 대체 소비재로서 높은 경제적 효용과 가치 보존성을 가집니다.';
      case 'tech':
        return '본 음성 에이전트는 OpenAI 최신 GA WebRTC(/v1/realtime/calls) 규격과 실시간 오디오 VAD, 그리고 20개 전문 도메인 키워드 자동 분류 라우터를 통해 초저지연 양방향 인텔리전스를 제공합니다.';
      case 'culinary':
        return '100% 천연 아카시아 꿀은 특유의 맑고 우아한 바닐라 풍미로 고온 가열 없이 디저트, 고트 치즈, 드레싱 페어링에 원재료 본연의 맛을 극대화시키는 최고급 미식 식재료입니다.';
      case 'pets':
        return '반려견의 경우 1세 미만 자견이나 당뇨 환견을 제외하고, 소량의 순수 천연 벌꿀은 환절기 기침 완화와 기력 회복을 위한 안전한 영양 보조 간식이 될 수 있습니다(적정 급여량 준수 필수).';
      case 'travel':
        return '대한민국 양평의 두물머리와 용문산 자락은 청정 상수원 보호구역으로 지정되어 공해 없는 자연경관과 유서 깊은 산지 힐링 여행의 대표적인 명소로 손꼽힙니다.';
      case 'environment':
        return '꿀벌은 전 세계 주요 작물의 70% 이상을 수분 매개하는 생태계의 핵심 지표종이며, 친환경 양봉을 장려하는 것은 생물 다양성 보전과 ESG 탄소 순환 경제의 핵심 실천입니다.';
      default:
        return `[${meta.icon} ${meta.nameKo} 안내]: "${query}"에 대하여 최적화된 전문 답변을 제공합니다. ${contextProduct ? `현재 스트림 대상: ${contextProduct}` : ''}`;
    }
  }
}
