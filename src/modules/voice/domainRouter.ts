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
    keywords: ['수학', '통계', '확률', '기하', '비율', '수식', '함수', '미적분', '계산', 'math', 'statistics', 'formula'],
    systemGuidance: '수학적 정리, 통계적 확률, 정밀한 수치 계산과 논리적 인과관계를 명확하게 제시하세요.'
  },
  astronomy: {
    id: 'astronomy',
    nameKo: '천문',
    nameEn: 'Astronomy',
    icon: '🌌',
    keywords: ['천문', '우주', '행성', '별자리', '은하', '태양계', '블랙홀', '천체', 'astronomy', 'cosmos', 'galaxy', 'planet'],
    systemGuidance: '천체물리학적 관점과 우주 관측 데이터, 행성/성운의 물리적 특성을 바탕으로 경이롭고 정확하게 설명하세요.'
  },
  fortune: {
    id: 'fortune',
    nameKo: '운세/점',
    nameEn: 'Fortune & Divination',
    icon: '🔮',
    keywords: ['운세', '사주', '타로', '점', '궁합', '길흉', '사주팔자', '토정비결', '점괘', 'fortune', 'horoscope', 'tarot', 'zodiac'],
    systemGuidance: '동서양 명리학/타로/점성술의 상징체계를 활용하여 상대방에게 긍정적인 통찰과 흥미로운 조언을 제공하세요.'
  },
  philosophy: {
    id: 'philosophy',
    nameKo: '철학',
    nameEn: 'Philosophy',
    icon: '🏛️',
    keywords: ['철학', '존재', '인식', '윤리', '형이상학', '실존', '니체', '칸트', '소크라테스', 'philosophy', 'ethics', 'existential'],
    systemGuidance: '동서양 철학적 사조와 사상가들의 성찰을 인용하며 본질적이고 심도 깊은 인문학적 답변을 구성하세요.'
  },
  psychology: {
    id: 'psychology',
    nameKo: '심리학',
    nameEn: 'Psychology',
    icon: '🧠',
    keywords: ['심리', '마음', '감정', '인지', '스트레스', '무의식', '프로이트', '심리학', '정신', 'psychology', 'cognitive', 'emotion'],
    systemGuidance: '인지행동학 및 인간 심리 기제를 바탕으로 공감력 있고 과학적인 심리학적 해석을 제공하세요.'
  },
  nature: {
    id: 'nature',
    nameKo: '자연현상',
    nameEn: 'Natural Phenomena',
    icon: '🌿',
    keywords: ['자연', '기후', '날씨', '지진', '태풍', '생태계', '환경', '기상', '산림', 'nature', 'climate', 'ecosystem'],
    systemGuidance: '대기과학, 기상학, 생태계 순환 원리를 결합하여 자연 현상의 인과관계를 알기 쉽게 설명하세요.'
  },
  medicine: {
    id: 'medicine',
    nameKo: '의학/건강',
    nameEn: 'Medicine & Health',
    icon: '🩺',
    keywords: ['의학', '건강', '면역', '영양', '치료', '약리', '항산화', '혈당', '효능', '부작용', 'medicine', 'health', 'nutrition'],
    systemGuidance: '공인된 임상 의학 및 약리학 데이터에 기반하여 건강상 이점과 주의사항을 전문적이고 안전하게 안내하세요.'
  },
  physics: {
    id: 'physics',
    nameKo: '물리학',
    nameEn: 'Physics',
    icon: '⚛️',
    keywords: ['물리', '역학', '에너지', '양자', '열역학', '중력', '전자기', '점성', '유체', 'physics', 'quantum', 'mechanics'],
    systemGuidance: '물리학 법칙(열역학, 유체역학, 양자역학 등)을 인용하여 현상의 근본적인 힘과 운동 상태를 규명하세요.'
  },
  literature: {
    id: 'literature',
    nameKo: '문학/사상',
    nameEn: 'Literature & Thought',
    icon: '📚',
    keywords: ['문학', '소설', '시', '고전', '사상', '은유', '수필', '작가', '문체', 'literature', 'poetry', 'novel', 'classic'],
    systemGuidance: '고전 및 근현대 문학 작품의 은유와 인문학적 사상을 엮어 서정적이고 품격 있는 어조로 답변하세요.'
  },
  history: {
    id: 'history',
    nameKo: '역사',
    nameEn: 'History',
    icon: '📜',
    keywords: ['역사', '시대', '유래', '조선', '고대', '전통', '문화재', '사건', '기록', 'history', 'dynasty', 'ancient', 'origin'],
    systemGuidance: '정사 기록과 문헌적 사료(실록, 동의보감 등)에 입각하여 역사적 배경과 시대적 맥락을 생생하게 해설하세요.'
  },
  fashion: {
    id: 'fashion',
    nameKo: '패션/의류',
    nameEn: 'Fashion & Apparel',
    icon: '👗',
    keywords: ['패션', '의류', '코디', '스타일', '원단', '컬러', '트렌드', '착장', '디자인', 'fashion', 'apparel', 'styling', 'outfit'],
    systemGuidance: '최신 글로벌 패션 트렌드, 체형별 스타일링 및 원단(패브릭)의 실루엣 특성을 조화롭게 제안하세요.'
  },
  accessories: {
    id: 'accessories',
    nameKo: '악세서리/소품',
    nameEn: 'Accessories & Props',
    icon: '💍',
    keywords: ['악세서리', '소품', '주얼리', '가방', '모자', '인테리어', '포장', '보자기', 'accessories', 'jewelry', 'props'],
    systemGuidance: '소재의 질감(골드, 실버, 가죽, 전통 자수 등)과 감각적인 포인트 매칭 노하우를 전문적으로 가이드하세요.'
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

    // 1. Direct explicit prefix check: e.g. [과학], [의학], [운세] or "의학적으로", "물리학 관점에서"
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

    const basePrompt = `[${meta.icon} ${meta.nameKo} 전문 최적화 검색 결과]: 
질문: "${query}"
분야 가이드: ${meta.systemGuidance}
${contextProduct ? `현재 스트림 대상 상품: ${contextProduct}` : ''}`;

    return basePrompt;
  }
}
