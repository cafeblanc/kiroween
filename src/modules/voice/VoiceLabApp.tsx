// Standalone Voice Module Test Lab
// A dedicated test application created specifically to test the standalone voice module in complete isolation.

import React, { useState, useRef, useEffect } from 'react';
import { GptLiveVoiceWidget } from './GptLiveVoiceWidget';
import { DomainCategory, DOMAIN_REGISTRY, DomainMeta, DomainKnowledgeRouter } from './domainRouter';
import { VoiceStatus, VoiceToolDefinition, GptLiveVoiceWidgetHandle } from './types';
import { ProductItem, ActionOrder, Language } from '../../types';
import { ActionExecutionSheet } from '../action/ActionExecutionSheet';
import { PayPalReceiptModal } from '../action/PayPalReceiptModal';
import { executeVoiceButtonCommand } from './voiceButtonController';
import { buildVoiceInstructions } from './voicePromptBuilder';

interface VoiceLabAppProps {
  onBackToMain?: () => void;
  activeProduct?: ProductItem | null;
  products?: ProductItem[];
  lang?: Language;
}

interface TestLog {
  id: string;
  time: string;
  type: 'info' | 'user' | 'agent' | 'domain' | 'tool' | 'error';
  content: string;
  isStreaming?: boolean;
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-honey',
    name: {
      en: 'Organic Acacia Honey (500g)',
      ko: '양평 친환경 아카시아 벌꿀 (500g)',
      ja: '有機栽培アカシア蜂蜜 (500g)',
      zh: '有机洋槐蜂蜜 (500g)',
      es: 'Miel Orgánica de Acacia (500g)',
      fr: 'Miel d Acacia Biologique (500g)'
    },
    price: 32000,
    currency: 'KRW',
    stock: 24,
    icon: '🍯',
    videoUrl: '/videos/honey_demo.mp4',
    description: {
      en: '100% Pure natural organic honey harvested from Yangpyeong mountains.',
      ko: '맑은 물 양평 청정 자연에서 채밀한 100% 순수 천연 아카시아 벌꿀입니다.',
      ja: '楊平の清らかな自然の中で採取された100%純粋な天然アカシア蜂蜜です。',
      zh: '采自杨平纯净山野的100%纯天然洋槐蜂蜜。',
      es: 'Miel de acacia 100% pura y natural recolectada en las montañas vírgenes.',
      fr: 'Miel d acacia 100% pur et naturel récolté dans la nature préservée.'
    },
    timelineMarkers: []
  },
  {
    id: 'prod-tea',
    name: {
      en: 'Handmade Traditional Herbal Tea Set',
      ko: '핸드메이드 전통차 선물 세트',
      ja: 'ハンドメイド伝統茶ギフトセット',
      zh: '手工传统茶礼盒',
      es: 'Set de Té Herbal Tradicional Hecho a Mano',
      fr: 'Coffret de Thé Traditionnel Fait Main'
    },
    price: 48000,
    currency: 'KRW',
    stock: 15,
    icon: '🍵',
    videoUrl: '/videos/tea_demo.mp4',
    description: {
      en: 'Handmade traditional herbal tea set crafted with carefully selected ingredients.',
      ko: '엄선된 전통 원료를 정성껏 덖아 만든 수제 전통차 선물 세트입니다.',
      ja: '厳選された伝統原料を丁寧に焙煎して作った手作り伝統茶ギフトセットです。',
      zh: '精选传统原料精心烘焙的手工传统茶礼盒。',
      es: 'Set de té tradicional hecho a mano con ingredientes seleccionados.',
      fr: 'Coffret de thé traditionnel fait main préparé avec soin.'
    },
    timelineMarkers: []
  }
];

const TEST_TOOLS: VoiceToolDefinition[] = [
  {
    name: 'open_checkout',
    description: 'Trigger and immediately open the in-stream checkout payment sheet modal for the featured product when the user says "결제창 띄워", "결제창 띄워줘", "결제창 열어줘", "결제해줘", "구매창 띄워", "이거 살래", "구매할래", "주문할래", "checkout", "buy this", "order this".',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'ID of the product to checkout' },
        reason: { type: 'string', description: 'User intent or checkout phrase' }
      }
    }
  },
  {
    name: 'execute_instant_action',
    description: 'Autonomous execution of instant in-stream checkout action sheet when user expresses intent to buy, order or checkout.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID to checkout' }
      }
    }
  },
  {
    name: 'test_action_trigger',
    description: 'Trigger a test action or simulated reservation/order for verification',
    parameters: {
      type: 'object',
      properties: {
        actionName: { type: 'string', description: 'Name of the action' },
        details: { type: 'string', description: 'Details or reason' }
      },
      required: ['actionName']
    }
  }
];

const DOMAIN_TEST_PROMPTS: Array<{ domain: DomainCategory; label: string; prompt: string }> = [
  { domain: 'general', label: '🛍️ 결제창 띄우기 (음성 구매)', prompt: '결제창 띄워줘! 양평 아카시아 벌꿀 지금 결제할래' },
  { domain: 'general', label: '➕ 버튼 음성: "하나 더" (수량 +1)', prompt: '하나 더' },
  { domain: 'general', label: '➖ 버튼 음성: "하나 빼" (수량 -1)', prompt: '하나 빼' },
  { domain: 'general', label: '🚀 버튼 음성: "결제하기" (구매 완료)', prompt: '결제하기' },
  { domain: 'general', label: '✕ 버튼 음성: "취소" (결제창 닫기)', prompt: '취소' },
  { domain: 'science', label: '🔬 과학', prompt: '과학적으로 효소의 기질 특이성과 분해 메커니즘을 설명해줘' },
  { domain: 'math', label: '📐 수학', prompt: '수학적으로 황금비와 피보나치 수열의 관계를 증명해줘' },
  { domain: 'astronomy', label: '🌌 천문', prompt: '천문학 관점에서 블랙홀 사건의 지평선과 강착원반을 설명해줘' },
  { domain: 'fortune', label: '🔮 운세/점', prompt: '오늘 내 일진과 황금빛 기운의 재물운을 점쳐줘' },
  { domain: 'philosophy', label: '🏛️ 철학', prompt: '철학적으로 실존주의와 니체의 초인 사상을 연결해서 설명해줘' },
  { domain: 'psychology', label: '🧠 심리학', prompt: '심리학적으로 인지 부조화와 확증 편향이 일어나는 원인은 뭐야?' },
  { domain: 'nature', label: '🌿 자연', prompt: '자연현상 중 엘니뇨와 라니냐의 대기 순환 원리를 설명해줘' },
  { domain: 'medicine', label: '🩺 의학', prompt: '의학적으로 천연 꿀의 항산화 성분과 혈당 대사에 미치는 영향은?' },
  { domain: 'physics', label: '⚛️ 물리', prompt: '물리학적으로 비뉴턴 유체의 점성과 전단 응력 관계를 설명해줘' },
  { domain: 'literature', label: '📚 문학', prompt: '문학적으로 고전 문학에서 달콤함과 은유가 지닌 상징성을 분석해줘' },
  { domain: 'history', label: '📜 역사', prompt: '역사적으로 조선시대 왕실 진상품과 민간 교역의 유래를 알려줘' },
  { domain: 'fashion', label: '👗 패션', prompt: '올가을 트렌드에 어울리는 톤온톤 패션 코디와 원단 매칭을 추천해줘' },
  { domain: 'accessories', label: '💍 악세서리', prompt: '악세서리와 소품 스타일링에서 전통 보자기 매듭의 포인트 연출법은?' },
  { domain: 'legal', label: '⚖️ 법률/특허', prompt: '법률적으로 전자상거래 원산지 표시 규정과 특허 보호 요건은?' },
  { domain: 'finance', label: '📈 금융/투자', prompt: '경제 금융 관점에서 인플레이션 시기 실물 자산 가치 방어 전략은?' },
  { domain: 'tech', label: '💻 IT/AI', prompt: 'IT 기술 관점에서 WebRTC 초저지연 오디오 스트리밍과 VAD 원리는?' },
  { domain: 'culinary', label: '🍳 요리/미식', prompt: '요리 미식 관점에서 마이야르 반응과 천연 꿀의 고메 페어링 비법은?' },
  { domain: 'pets', label: '🐾 반려동물', prompt: '수의학적으로 강아지나 고양이에게 천연 꿀을 급여할 때 주의사항은?' },
  { domain: 'travel', label: '✈️ 여행/문화', prompt: '여행 문화 관점에서 양평 두물머리와 용문산 힐링 투어 코스 추천해줘' },
  { domain: 'environment', label: '🌱 환경/생태', prompt: '환경 생태 관점에서 꿀벌 보호와 ESG 탄소 순환 경제의 연관성은?' }
];

const speakKorean = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const clean = text.replace(/\[.*?\]/g, '').replace(/[#\*\_]/g, '').trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'ko-KR';
    utter.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koVoice) utter.voice = koVoice;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('TTS notice:', e);
  }
};

export const VoiceLabApp: React.FC<VoiceLabAppProps> = ({
  onBackToMain,
  activeProduct,
  products,
  lang = 'ko'
}) => {
  const availableProducts = products && products.length > 0 ? products : DEFAULT_PRODUCTS;
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(() => activeProduct || availableProducts[0]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<ActionOrder | null>(null);
  const [successToast, setSuccessToast] = useState<ActionOrder | null>(null);

  const [logs, setLogs] = useState<TestLog[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      content: '🎙️ Voice Module Standalone Test Lab initialized. Ready for domain queries, instant checkout & WebRTC testing.'
    }
  ]);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [activeDomain, setActiveDomain] = useState<DomainCategory>('general');
  const [toolAlert, setToolAlert] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const voiceWidgetRef = useRef<GptLiveVoiceWidgetHandle | null>(null);

  useEffect(() => {
    if (activeProduct) {
      setSelectedProduct(activeProduct);
    }
  }, [activeProduct]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Global listener for voice button commands inside Voice Lab
  useEffect(() => {
    const handleSelectProduct = (e: any) => {
      const pid = e.detail?.productId;
      const found = availableProducts.find(p => p.id === pid);
      if (found) {
        setSelectedProduct(found);
        addLog('info', `📌 현재 결제 대상 상품이 [${found.name.ko || found.name.en}]으로 설정되었습니다.`);
      }
    };

    const handleClearLogs = () => {
      setLogs([]);
      addLog('info', '🧹 대화 로그가 초기화되었습니다.');
    };

    const handleTriggerTool = () => {
      handleToolCall('test_action_trigger', { actionName: 'InstantLabTest', timestamp: Date.now() });
    };

    const handleDomainPrompt = (e: any) => {
      const targetDomain = e.detail?.domain;
      const foundPrompt = DOMAIN_TEST_PROMPTS.find(p => p.domain === targetDomain);
      if (foundPrompt) {
        handleQuestionClick(foundPrompt.prompt);
      }
    };

    window.addEventListener('kiroween:select_product', handleSelectProduct);
    window.addEventListener('kiroween:clear_logs', handleClearLogs);
    window.addEventListener('kiroween:trigger_tool', handleTriggerTool);
    window.addEventListener('kiroween:select_domain_prompt', handleDomainPrompt);

    return () => {
      window.removeEventListener('kiroween:select_product', handleSelectProduct);
      window.removeEventListener('kiroween:clear_logs', handleClearLogs);
      window.removeEventListener('kiroween:trigger_tool', handleTriggerTool);
      window.removeEventListener('kiroween:select_domain_prompt', handleDomainPrompt);
    };
  }, [availableProducts]);

  const addLog = (type: TestLog['type'], content: string) => {
    setLogs(prev => {
      // Deduplication: prevent exact or redundant consecutive duplicate entries
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.type === type && (last.content === content || last.content.trim() === content.trim())) {
          return prev;
        }
      }
      return [
        ...prev,
        {
          id: Date.now() + Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          type,
          content
        }
      ];
    });
  };

  // Immediate checkout sheet trigger
  const triggerCheckout = (prod?: ProductItem | null, reason?: string) => {
    const targetProd = prod || selectedProduct;
    if (!targetProd) return;
    setIsCheckoutOpen(true);
    const alertMsg = `⚡ [결제창 즉시 표시]: ${targetProd.name.ko || targetProd.name.en} (${targetProd.price.toLocaleString()}원) 결제창이 열렸습니다.${reason ? ' (' + reason + ')' : ''}`;
    setToolAlert(alertMsg);
    addLog('tool', alertMsg);

    // Also dispatch global event so App.tsx can open it anywhere
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kiroween:open_checkout', { detail: { product: targetProd } }));
    }
  };

  // Robust checkout intent detector for Korean & English voice commands
  const isCheckoutIntent = (text: string): boolean => {
    const t = text.replace(/\s+/g, '').toLowerCase();
    return (
      t.includes('결제') ||
      t.includes('결재') ||
      t.includes('구매') ||
      t.includes('주문') ||
      t.includes('살래') ||
      t.includes('살게') ||
      t.includes('살까') ||
      t.includes('살게요') ||
      t.includes('사겠') ||
      t.includes('사고싶') ||
      t.includes('계산') ||
      t.includes('checkout') ||
      t.includes('buy') ||
      t.includes('order') ||
      t.includes('pay')
    );
  };

  // Voice Command Router for In-Modal Buttons ("하나 더", "하나 빼", "결제하기", "취소")
  const handleVoiceButtonCommand = (rawText: string): boolean => {
    const t = rawText.replace(/\s+/g, '').toLowerCase();

    // 1. Cancel / Close command
    if (t.includes('취소') || t.includes('닫기') || t.includes('안살래') || t.includes('그만')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kiroween:checkout_action', { detail: { action: 'cancel' } }));
      }
      setIsCheckoutOpen(false);
      addLog('info', '🛑 음성 명령: "취소" 버튼이 작동되어 결제창이 닫혔습니다.');
      return true;
    }

    // 2. Pay Now / Confirm Purchase command
    if (t.includes('결제하기') || t.includes('구매하기') || t.includes('결제진행') || t.includes('구매완료') || t.includes('paynow')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kiroween:checkout_action', { detail: { action: 'pay' } }));
      }
      addLog('info', '🚀 음성 명령: "결제하기" 버튼이 작동되었습니다.');
      return true;
    }

    // 3. Increase Quantity command ("하나 더", "더하기", "플러스", "추가")
    if (t.includes('하나더') || t.includes('더하기') || t.includes('플러스') || t.includes('수량추가') || t.includes('올려') || t.includes('+1')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kiroween:checkout_action', { detail: { action: 'increase' } }));
      }
      addLog('info', '➕ 음성 명령: "하나 더" (수량 +1) 버튼이 작동되었습니다.');
      return true;
    }

    // 4. Decrease Quantity command ("하나 빼", "빼기", "마이너스", "줄여")
    if (t.includes('하나빼') || t.includes('빼기') || t.includes('마이너스') || t.includes('수량빼') || t.includes('줄여') || t.includes('-1')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kiroween:checkout_action', { detail: { action: 'decrease' } }));
      }
      addLog('info', '➖ 음성 명령: "하나 빼" (수량 -1) 버튼이 작동되었습니다.');
      return true;
    }

    // 5. Specific quantity like "2개", "3개", "두개", "세개"
    const match = rawText.match(/(\d+)\s*개/) || rawText.match(/(두|세|네|다섯)\s*개/);
    if (match) {
      const numMap: Record<string, number> = { 두: 2, 세: 3, 네: 4, 다섯: 5 };
      const q = numMap[match[1]] || parseInt(match[1], 10);
      if (q > 0) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kiroween:checkout_action', { detail: { action: 'set_quantity', quantity: q } }));
        }
        addLog('info', `📦 음성 명령: 수량이 ${q}개로 설정되었습니다.`);
        return true;
      }
    }

    return false;
  };

  const handleTranscriptStream = (_sender: 'agent', _delta: string, fullText: string, domain?: DomainCategory) => {
    const domText = domain && domain !== 'general' ? `[${domain}] ` : '';
    const formattedContent = `gpt-realtime: ${domText}${fullText}`;

    // If AI voice response says "결제창" or "결제", trigger the checkout sheet immediately!
    if (fullText.includes('결제') || fullText.includes('결재') || fullText.includes('구매창') || fullText.includes('주문창')) {
      if (!isCheckoutOpen) {
        triggerCheckout(selectedProduct, 'AI 실시간 음성 발화 감지');
      }
    }

    setLogs(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.type === 'agent' && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: formattedContent }
          ];
        }
      }
      return [
        ...prev,
        {
          id: 'stream-' + Date.now(),
          time: new Date().toLocaleTimeString(),
          type: 'agent',
          content: formattedContent,
          isStreaming: true
        }
      ];
    });
  };

  const handleTranscript = (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => {
    if (sender === 'user') {
      addLog('user', `나(User): "${text}"`);

      // Universal Voice Button Execution: trigger any button click instantly by its short name!
      const matched = executeVoiceButtonCommand(text);
      if (matched) {
        addLog('info', `🎯 음성 버튼 작동: "${matched.buttonName}" 버튼이 클릭되었습니다.`);
        return;
      }

      // Zero-failure fallback: check if user speech explicitly asks for checkout
      if (isCheckoutIntent(text)) {
        triggerCheckout(selectedProduct, `사용자 음성 인식 ("${text}")`);
      }
    } else {
      const domText = domain && domain !== 'general' ? `[${domain}] ` : '';
      const finalContent = `gpt-realtime: ${domText}${text}`;

      // Zero-failure fallback: if AI response mentions checkout, guarantee checkout modal is open!
      if (text.includes('결제') || text.includes('결재') || text.includes('구매창') || text.includes('주문창')) {
        if (!isCheckoutOpen) {
          triggerCheckout(selectedProduct, `AI 응답 확인`);
        }
      }

      setLogs(prev => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.type === 'agent' && last.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: finalContent, isStreaming: false }
            ];
          }
        }
        if (prev.length > 0 && prev[prev.length - 1].content.trim() === finalContent.trim()) {
          return prev;
        }
        return [
          ...prev,
          {
            id: Date.now() + Math.random().toString(),
            time: new Date().toLocaleTimeString(),
            type: 'agent',
            content: finalContent,
            isStreaming: false
          }
        ];
      });
    }
  };

  const handleDomainDetected = (domain: DomainCategory, meta: DomainMeta, query: string) => {
    setActiveDomain(domain);
    addLog('domain', `🎯 [분야 자동 감지]: ${meta.icon} ${meta.nameKo} (${meta.nameEn}) - 핵심어 분석 완료: "${query}"`);
  };

  const handleSimulateQuestion = (prompt: string) => {
    addLog('user', `나(User): "${prompt}"`);

    // Handle checkout intent in simulated/offline mode as well
    if (isCheckoutIntent(prompt)) {
      triggerCheckout(selectedProduct, prompt);
      const reply = `네! 현재 판매 중인 ${selectedProduct.name.ko || selectedProduct.name.en} 결제창을 지금 바로 화면에 띄워드렸습니다! 결제를 진행해 주세요.`;
      setTimeout(() => {
        addLog('agent', `gpt-realtime: [🛍️ 결제창 즉시 호출] ${reply}`);
        speakKorean(reply);
      }, 200);
      return;
    }

    const detected = DomainKnowledgeRouter.detectDomain(prompt);
    setActiveDomain(detected.domain);
    addLog('domain', `🎯 [파악된 분야]: ${detected.meta.icon} ${detected.meta.nameKo} - 질문 분석 완료`);

    const expertAnswer = DomainKnowledgeRouter.resolveDomainKnowledge(detected.domain, prompt);
    setTimeout(() => {
      addLog('agent', `gpt-realtime: [${detected.meta.icon} ${detected.meta.nameKo} 최적화 답변] ${expertAnswer}`);
      speakKorean(expertAnswer);
    }, 250);
  };

  const handleQuestionClick = (prompt: string) => {
    // Check Universal Voice Button command first
    const matched = executeVoiceButtonCommand(prompt);
    if (matched && matched.commandType !== 'open_checkout') {
      addLog('info', `🎯 버튼 작동: "${matched.buttonName}"이(가) 실행되었습니다.`);
      return;
    }

    if (isCheckoutIntent(prompt)) {
      triggerCheckout(selectedProduct, prompt);
    }

    if (voiceWidgetRef.current?.isVoiceActive) {
      addLog('user', `나(User): "${prompt}"`);
      voiceWidgetRef.current.sendTextMessage(prompt);
    } else {
      handleSimulateQuestion(prompt);
    }
  };

  const handleToolCall = (toolName: string, args: Record<string, any>) => {
    if (toolName === 'open_checkout' || toolName === 'execute_instant_action') {
      const targetProd = (args.productId && availableProducts.find(p => p.id === args.productId)) || selectedProduct;
      triggerCheckout(targetProd, args.reason || 'OpenAI Realtime 도구 호출 (open_checkout)');
      return;
    }

    const alertMsg = `⚡ [Tool Triggered]: ${toolName} -> ${JSON.stringify(args)}`;
    setToolAlert(alertMsg);
    addLog('tool', alertMsg);
    setTimeout(() => setToolAlert(null), 5000);
  };

  const handleError = (error: string) => {
    addLog('error', `⚠️ 에러 발생: ${error}`);
  };

  const handleOrderSuccess = (order: ActionOrder) => {
    setLatestOrder(order);
    setSuccessToast(order);
    setIsReceiptOpen(true);
    addLog('tool', `🎉 [결제 완료 성공]: 주문번호 ${order.orderId} 결제가 정상 완료되었습니다! (송장: ${order.trackingNumber})`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2500);
  };

  // Build localized real-time prompt injecting current product, language & checkout command rules
  const systemInstruction = buildVoiceInstructions(lang, selectedProduct);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* Top Voice Control Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎙️</span>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
              gpt-realtime 음성 대화 랩 (Voice Lab)
            </h1>
            <p className="text-[10px] text-slate-400">
              실시간 WebRTC Full-Duplex · 현재 판매 상품 음성 결제창 연동 & 20개 도메인 AI
            </p>
          </div>
        </div>

        {/* Center: Live Product Switcher & Domain Indicator */}
        <div className="flex items-center gap-2">
          {/* Active Product Badge / Switcher with Short Voice Names */}
          <div className="flex bg-slate-950 border border-purple-500/40 rounded-xl p-1 items-center gap-1 shadow-inner">
            <span className="text-[10px] text-purple-300 font-bold px-1.5 hidden sm:inline">🛒 상품:</span>
            {availableProducts.map(p => {
              const shortName = p.id === 'prod-honey' ? '벌꿀' : '전통차';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(p);
                    addLog('info', `📌 현재 결제 대상 상품이 [${p.name.ko || p.name.en}] (${p.price.toLocaleString()}원)으로 설정되었습니다.`);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    selectedProduct.id === p.id
                      ? 'bg-purple-600 text-white font-bold shadow-md ring-1 ring-purple-300'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title={`음성으로 "${shortName}"이라고 말해도 선택됩니다`}
                >
                  <span>{p.icon}</span>
                  <span>{shortName}</span>
                  <span className="text-[10px] opacity-80">({p.price.toLocaleString()}원)</span>
                </button>
              );
            })}
          </div>

          {activeDomain !== 'general' && DOMAIN_REGISTRY[activeDomain] && (
            <div className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-400/60 text-purple-200 px-3 py-1 rounded-full text-xs font-bold shadow animate-in fade-in">
              <span>{DOMAIN_REGISTRY[activeDomain].icon}</span>
              <span>분야: <strong className="text-white">{DOMAIN_REGISTRY[activeDomain].nameKo}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Controls & Back button */}
        <div className="flex items-center gap-2">
          {onBackToMain && (
            <button
              type="button"
              onClick={onBackToMain}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title='음성으로 "방송"이라고 말해도 이동합니다'
            >
              <span>📺</span>
              <span>방송</span>
            </button>
          )}

          {/* Standalone Voice Widget Injected */}
          <GptLiveVoiceWidget
            ref={voiceWidgetRef}
            systemInstruction={systemInstruction}
            tools={TEST_TOOLS}
            enableDomainSearch={true}
            lang={lang}
            onStatusChange={status => {
              setVoiceStatus(status);
              if (status === 'connected') {
                addLog('info', '✅ gpt-realtime WebRTC 음성 세션이 연결되었습니다. 마이크로 "결제창 띄워줘"라고 말씀해 보세요!');
              } else if (status === 'idle') {
                addLog('info', '⏹️ gpt-realtime 세션이 종료되었습니다.');
              }
            }}
            onTranscript={handleTranscript}
            onTranscriptStream={handleTranscriptStream}
            onDomainDetected={handleDomainDetected}
            onToolCall={handleToolCall}
            onError={handleError}
          />
        </div>
      </div>

      {/* Main Lab Workspace: Responsive Side-by-Side Split */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
        
        {/* Left: 20 Domain Quick-Test Panel (w-full md:w-5/12) */}
        <section className="w-full md:w-5/12 h-[42%] md:h-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-0">
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🎯</span>
              <h2 className="text-xs font-bold text-purple-300">현재 판매 상품 & 음성 질문 세트</h2>
            </div>
            <span className="text-[10px] text-slate-400">클릭 시 즉시 질문 전송</span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2 min-h-0">
            {/* Featured Active Sale Product Card */}
            <div className="bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-pink-950/80 border border-purple-500/50 p-3 rounded-xl shadow-lg flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-3xl shrink-0 p-1 bg-purple-900/40 rounded-xl border border-purple-500/30">
                  {selectedProduct.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-pink-500/30 text-pink-300 border border-pink-400/40 px-1.5 py-0.2 rounded font-bold animate-pulse">
                      🔴 라이브 판매 중
                    </span>
                    <h3 className="text-xs font-bold text-white truncate">
                      {selectedProduct.name.ko || selectedProduct.name.en}
                    </h3>
                  </div>
                  <p className="text-[12px] text-purple-200 font-mono font-bold mt-0.5">
                    {selectedProduct.price.toLocaleString()}원
                    <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                      · 재고 {selectedProduct.stock}개 한정
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => triggerCheckout(selectedProduct, '결제창 띄우기 버튼 클릭')}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-lg shrink-0 flex items-center gap-1 active:scale-95"
                title='음성으로 "결제창"이라고 말해도 열립니다'
              >
                <span>⚡</span>
                <span>결제창</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug px-0.5">
              💡 음성으로 <span className="text-emerald-300 font-bold">"결제창 띄워"</span> 또는 <span className="text-emerald-300 font-bold">"이거 결제해줘"</span>라고 말하면 아래 상품의 PayPal/카드 결제창이 즉시 화면에 열립니다.
            </p>

            <div className="grid grid-cols-1 gap-1.5">
              {DOMAIN_TEST_PROMPTS.map(item => (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => handleQuestionClick(item.prompt)}
                  className={`p-2 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer w-full hover:scale-[1.01] active:scale-[0.99] ${
                    activeDomain === item.domain
                      ? 'bg-purple-950/90 border-purple-400 text-white ring-2 ring-purple-400/50 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {activeDomain === item.domain && (
                        <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                          현재 감지됨
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] bg-purple-900/50 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-bold hover:bg-purple-600 hover:text-white transition">
                      질문 전송 🚀
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-300 truncate w-full">
                    "{item.prompt}"
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Tool Action Call Card */}
          <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
            <span className="text-[10px] text-slate-400">음성 명령: "도구"</span>
            <button
              type="button"
              onClick={() => handleToolCall('test_action_trigger', { actionName: 'InstantLabTest', timestamp: Date.now() })}
              className="bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
              title='음성으로 "도구"라고 말해도 실행됩니다'
            >
              ⚡ 도구
            </button>
          </div>
        </section>

        {/* Right: Live WebRTC & Transcript Stream Console (w-full md:w-7/12) */}
        <section className="w-full md:w-7/12 h-[58%] md:h-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-0">
          
          {/* Status & Active Domain Bar */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                voiceStatus === 'connected' || voiceStatus === 'speaking' || voiceStatus === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : voiceStatus === 'connecting'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-600'
              }`} />
              <span className="text-xs font-bold text-white">
                WebRTC 상태: <span className="text-purple-400 uppercase font-mono">{voiceStatus}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">실시간 대화 로그 & 음성 자막 창</span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 transition cursor-pointer font-semibold"
                title='음성으로 "지우기"라고 말해도 삭제됩니다'
              >
                🗑️ 지우기
              </button>
            </div>
          </div>

          {/* Action Alert Banner */}
          {toolAlert && (
            <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-2 text-xs text-emerald-300 flex items-center justify-between animate-in slide-in-from-top duration-200 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <span>⚡</span>
                <span className="font-mono font-bold truncate">{toolAlert}</span>
              </div>
              <button
                type="button"
                onClick={() => setToolAlert(null)}
                className="text-emerald-400 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Live Transcript & Log Console Feed (Always Visible & Auto-scrolled) */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs bg-slate-950/70 scroll-smooth min-h-0">
            {logs.map(log => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border leading-relaxed animate-in fade-in duration-150 ${
                  log.type === 'user'
                    ? 'bg-purple-950/80 border-purple-500/60 text-purple-100 shadow-md'
                    : log.type === 'agent'
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-md'
                    : log.type === 'domain'
                    ? 'bg-indigo-950/90 border-indigo-500/60 text-indigo-300 font-bold'
                    : log.type === 'tool'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 font-bold'
                    : log.type === 'error'
                    ? 'bg-red-950/90 border-red-500/60 text-red-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] opacity-70 mb-1">
                  <span className="font-bold">
                    {log.type === 'user'
                      ? '👤 나 (User)'
                      : log.type === 'agent'
                      ? '🤖 gpt-realtime'
                      : log.type === 'domain'
                      ? '🎯 도메인 엔진'
                      : log.type.toUpperCase()}
                  </span>
                  <span>{log.time}</span>
                </div>
                <div className="font-sans text-xs break-words leading-relaxed">
                  {log.content}
                  {log.type === 'agent' && log.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Text Question Input Bar for gpt-realtime */}
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!textInput.trim()) return;
              const q = textInput.trim();
              setTextInput('');

              // If checkout sheet is open, check button name command first
              if (isCheckoutOpen) {
                const handled = handleVoiceButtonCommand(q);
                if (handled) return;
              }

              if (voiceWidgetRef.current?.isVoiceActive) {
                addLog('user', `나(User): "${q}"`);
                voiceWidgetRef.current.sendTextMessage(q);
              } else {
                handleSimulateQuestion(q);
              }
            }}
            className="p-2 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="gpt-realtime과 대화할 질문을 입력하세요 (엔터 또는 전송 클릭)..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1 shrink-0"
            >
              <span>전송</span>
              <span>🚀</span>
            </button>
          </form>

          {/* Console Footer */}
          <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
            <span>OpenAI Realtime GA Engine (gpt-realtime /v1/realtime/calls)</span>
            <span>마이크로 말하거나 좌측 질문을 클릭하세요</span>
          </div>
        </section>
      </main>

      {/* Instant Action Checkout Sheet Modal for Currently Advertised Product */}
      <ActionExecutionSheet
        product={selectedProduct}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleOrderSuccess}
      />

      {/* Official PayPal Order Receipt & Tracking Modal */}
      <PayPalReceiptModal
        order={latestOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        lang="ko"
      />

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-14 right-4 bg-emerald-600 border border-emerald-400 text-white p-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in fade-in duration-200">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-xs font-bold">결제 및 주문이 성공적으로 완료되었습니다!</p>
            <p className="text-[11px] opacity-90">주문번호: {successToast.orderId} · 송장번호: {successToast.trackingNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default VoiceLabApp;
