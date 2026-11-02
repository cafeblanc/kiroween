import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProductItem, Language } from '../../types';
import { GptLiveVoiceWidget, VoiceToolDefinition, VoiceStatus, DomainCategory, DOMAIN_REGISTRY, DomainKnowledgeRouter } from '../voice';

interface AgentChatProps {
  lang: Language;
  onTriggerAction: (product: ProductItem) => void;
  activeProduct: ProductItem | null;
}

const VOICE_TOOLS: VoiceToolDefinition[] = [
  {
    name: 'execute_instant_action',
    description: 'Trigger instant in-stream checkout action sheet when the user expresses desire to buy, order, or purchase the current live stream item.',
    parameters: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'Product ID to purchase'
        }
      },
      required: ['productId']
    }
  }
];

export const AgentChat: React.FC<AgentChatProps> = ({
  lang,
  onTriggerAction,
  activeProduct
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: {
        en: '🤖 Welcome to Kiroween Multimodal Agent! Ask anything via text or voice. Specialized domain queries (Science, Medicine, History, Fortune, Physics, Fashion, etc.) are automatically optimized.',
        ko: '🤖 Kiroween 멀티모달 에이전트에 오신 것을 환영합니다! 텍스트 또는 음성으로 질문해 보세요. 과학·의학·역사·운세·물리·패션 등 전문 질문은 핵심어를 자동 감지하여 최적화된 전문 답변을 제공합니다.',
        ja: '🤖 Kiroweenマルチモーダルエージェントへようこそ！科学、医学、歴史などの専門的な質問にも最適化された回答を提供します。',
        zh: '🤖 欢迎来到 Kiroween 多模态智能代理！科学、医学、历史、物理等专业提问均支持核心词自动识别与深度优化检索。',
        es: '🤖 ¡Bienvenido al Agente Multimodal de Kiroween! Respuestas optimizadas para ciencia, medicina, historia y más.',
        fr: '🤖 Bienvenue sur l’Agent Multimodal Kiroween ! Réponses expertes optimisées par domaine.'
      },
      timestamp: 'Ready'
    }
  ]);
  const [input, setInput] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [activeDomainNotice, setActiveDomainNotice] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll so newest messages always appear at bottom and previous messages push up
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dynamic system instructions for voice agent with domain grounding
  const voiceInstructions = `You are the Kiroween Live Commerce Co-Host AI Agent powered by gpt-live-1.
You are co-hosting an active live shopping broadcast with the host on screen.
The current featured stream product is:
- Product ID: ${activeProduct?.id || 'prod-honey'}
- Name: ${activeProduct?.name.en || 'Organic Acacia Honey (500g)'}
- Price: ${activeProduct?.currency || 'KRW'} ${activeProduct?.price || 32000}
- Description: ${activeProduct?.description.en || '100% pure organic honey'}

Specialized Domain Intelligence:
You are an expert who can seamlessly answer across 13 specialized domains:
[Science, Math, Astronomy, Fortune/Divination, Philosophy, Psychology, Nature, Medicine/Health, Physics, Literature, History, Fashion, Accessories].
When a specialized question is asked, analyze the core keywords, cite rigorous facts or cultural depth according to the field, and deliver articulate, concise spoken turns (1-2 sentences).
If user wants to buy or order, call 'execute_instant_action'.`;

  // Handle incoming transcripts from the independent Voice Module
  const handleVoiceTranscript = (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => {
    if (!text || !text.trim()) return;

    let displayPrefix = '';
    if (domain && domain !== 'general' && DOMAIN_REGISTRY[domain]) {
      const meta = DOMAIN_REGISTRY[domain];
      displayPrefix = `[${meta.icon} ${meta.nameKo} 최적화] `;
    }

    const msg: ChatMessage = {
      id: Date.now() + '-' + sender,
      sender: sender === 'user' ? 'user' : 'ai',
      text: sender === 'user' ? `🎙️ ${displayPrefix}"${text.trim()}"` : `🗣️ ${displayPrefix}${text.trim()}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, msg]);
  };

  // Handle tool execution triggered by the independent Voice Module
  const handleVoiceToolCall = (toolName: string) => {
    if (toolName === 'execute_instant_action' && activeProduct) {
      const actionMsg: ChatMessage = {
        id: Date.now() + '-action',
        sender: 'ai',
        text: `⚡ [gpt-live-1] ${activeProduct.name[lang] || activeProduct.name.en} 결제창을 화면 앞에 열었습니다!`,
        suggestedProduct: activeProduct,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, actionMsg]);
      onTriggerAction(activeProduct);
    }
  };

  // Handle domain detection notification
  const handleDomainDetected = (domain: DomainCategory) => {
    const meta = DOMAIN_REGISTRY[domain];
    if (meta && domain !== 'general') {
      setActiveDomainNotice(`${meta.icon} ${meta.nameKo} 전문 최적화 검색 활성화`);
      setTimeout(() => setActiveDomainNotice(null), 3000);
    }
  };

  // Text message submit with domain classification & expert answering
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const query = input.trim();
    const detected = DomainKnowledgeRouter.detectDomain(query);

    const userMsg: ChatMessage = {
      id: Date.now() + '-user',
      sender: 'user',
      text: detected.domain !== 'general' ? `[${detected.meta.icon} ${detected.meta.nameKo}] ${query}` : query,
      timestamp: new Date().toLocaleTimeString()
    };

    let replyText = `🤖 AI Agent: "${query}" 질문을 확인했습니다.`;
    let suggested: ProductItem | undefined = undefined;

    const q = query.toLowerCase();
    if (q.includes('buy') || q.includes('결제') || q.includes('checkout') || q.includes('주문') || q.includes('살게') || q.includes('살래')) {
      if (activeProduct) {
        replyText = `⚡ ${activeProduct.name[lang] || activeProduct.name.en} PayPal 즉시 결제창을 화면 앞에 열었습니다!`;
        suggested = activeProduct;
        onTriggerAction(activeProduct);
      }
    } else if (detected.domain !== 'general') {
      // Domain-specific optimized response
      const meta = detected.meta;
      if (detected.domain === 'medicine') {
        replyText = `🩺 [의학/건강 전문 분석]: 100% 천연 아카시아 벌꿀은 포도당 대비 과당 비율이 높아 당 흡수 속도(GI 지수)가 상대적으로 완만하며, 플라보노이드 항산화 성분과 프로폴리스 미량 원소가 풍부하여 면역력 및 피로 회복에 우수한 약리적 이점을 지닙니다.`;
      } else if (detected.domain === 'physics') {
        replyText = `⚛️ [물리학/유체역학 분석]: 벌꿀의 점성(Viscosity)은 고농도 당류 분자 간의 수소 결합과 유변학적(Rheology) 비뉴턴 유체 특성에 기인하며, 온도에 따른 분자 운동에너지 변화로 유동성이 제어됩니다.`;
      } else if (detected.domain === 'history') {
        replyText = `📜 [역사/문화 사료 분석]: 조선왕조실록 및 동의보감에 따르면 천연 봉밀(蜂蜜)은 왕실의 귀한 진상품이자 자양강장제로 기록되어 있으며, 양평 지역은 예로부터 청정 수계와 밀원지가 발달하여 명품 꿀로 명성을 이어왔습니다.`;
      } else if (detected.domain === 'fortune') {
        replyText = `🔮 [운세/명리 분석]: 꿀(달콤함과 황금빛)은 오행 중 토(土)의 기운과 금(金)의 재물운을 상징합니다. 오늘 이 황금 벌꿀을 곁들이시면 화합의 기운과 뜻밖의 재물 인연이 트이는 길한 기운을 얻으실 수 있습니다!`;
      } else if (detected.domain === 'science') {
        replyText = `🔬 [과학/생물학 분석]: 꿀벌이 아카시아 꽃꿀을 채집한 후 인베르타아제(Invertase) 효소 분해 과정을 거쳐 자당이 포도당과 과당으로 완벽히 전화된 자연 효소 활성 복합체입니다.`;
      } else if (detected.domain === 'fashion' || detected.domain === 'accessories') {
        replyText = `👗 [패션/소품 스타일링]: 고급 전통 수제 보자기 매듭과 단아한 노리개 장식은 전통과 모던함이 어우러져 격식 있는 명절 선물이나 홈카페 인테리어 소품으로 완벽한 조화를 이룹니다.`;
      } else {
        replyText = `${meta.icon} [${meta.nameKo} 최적화 분석]: "${query}"에 대해 ${meta.systemGuidance.slice(0, 80)}...`;
      }
    } else if (activeProduct) {
      replyText = `🤖 [실시간 방송 컨텍스트] 현재 방송 상품: ${activeProduct.name[lang] || activeProduct.name.en}. ${activeProduct.description[lang] || activeProduct.description.en}`;
    }

    const aiMsg: ChatMessage = {
      id: Date.now() + '-ai',
      sender: 'ai',
      text: replyText,
      suggestedProduct: suggested,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Header with Unified Start/Stop Voice Button & Domain Optimization */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              Kiroween Contextual Agent
              {(voiceStatus === 'connected' || voiceStatus === 'speaking' || voiceStatus === 'listening') && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              )}
            </h3>
            <span className="text-[10px] text-emerald-400 font-medium">
              {voiceStatus === 'speaking'
                ? '🗣️ gpt-live-1 발화 중 (끼어들기 가능)'
                : voiceStatus === 'listening'
                ? '👂 실시간 음성 경청 중 (말씀하세요)'
                : voiceStatus === 'connected'
                ? '🟢 실시간 음성 통화 대기 중'
                : '● 전문 13개 도메인 최적화 엔진 탑재'}
            </span>
          </div>
        </div>

        {/* Completely Standalone Autonomous Voice Module Instance */}
        <GptLiveVoiceWidget
          systemInstruction={voiceInstructions}
          tools={VOICE_TOOLS}
          onStatusChange={setVoiceStatus}
          onTranscript={handleVoiceTranscript}
          onToolCall={handleVoiceToolCall}
          onDomainDetected={handleDomainDetected}
        />
      </div>

      {/* Floating Domain Detection Banner */}
      {activeDomainNotice && (
        <div className="bg-indigo-950/95 border-b border-indigo-500/50 px-3 py-1.5 text-xs text-indigo-200 flex items-center justify-between animate-in slide-in-from-top duration-200 shrink-0">
          <span className="font-bold flex items-center gap-1.5">
            <span className="animate-spin text-sm">⚙️</span>
            <span>{activeDomainNotice}</span>
          </span>
          <span className="text-[10px] text-indigo-400">자동 분리 최적화</span>
        </div>
      )}

      {/* Unified Messages Feed */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 scroll-smooth min-h-0"
      >
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed shadow-md ${
                m.sender === 'user'
                  ? 'bg-purple-600 text-white font-medium rounded-br-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 opacity-70 text-[9px]">
                <span>{m.sender === 'user' ? '👤 나 (User)' : '🤖 Kiroween Agent'}</span>
                <span>· {m.timestamp}</span>
              </div>
              {typeof m.text === 'string' ? m.text : (m.text[lang] || m.text.en)}
            </div>

            {/* In-Stream Suggested Action Card */}
            {m.suggestedProduct && (
              <div className="mt-2 bg-slate-950 border border-purple-500/60 p-2.5 rounded-xl flex items-center justify-between gap-3 w-full max-w-[85%] shadow-xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{m.suggestedProduct.icon}</span>
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-white truncate">{m.suggestedProduct.name[lang] || m.suggestedProduct.name.en}</p>
                    <p className="text-[11px] text-amber-400 font-extrabold">{m.suggestedProduct.currency} {m.suggestedProduct.price.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTriggerAction(m.suggestedProduct!)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 shadow-md flex items-center gap-1"
                >
                  <span>🅿️</span>
                  <span>PayPal 결제</span>
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Domain Suggestion Chips */}
      <div className="px-2 py-1.5 bg-slate-950/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] shrink-0">
        <span className="text-slate-500 font-bold shrink-0">도메인 질문 예시:</span>
        <button
          type="button"
          onClick={() => { setInput('의학적으로 아카시아 꿀의 효능과 혈당 영향은?'); }}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition"
        >
          🩺 의학적 효능
        </button>
        <button
          type="button"
          onClick={() => { setInput('물리학 관점에서 꿀의 점성과 유체역학 원리는?'); }}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition"
        >
          ⚛️ 물리학적 점성
        </button>
        <button
          type="button"
          onClick={() => { setInput('역사적으로 조선시대에도 벌꿀을 약재로 썼나요?'); }}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition"
        >
          📜 역사적 유래
        </button>
        <button
          type="button"
          onClick={() => { setInput('오늘 운세 관점에서 꿀을 먹으면 어떤 기운이 좋은가요?'); }}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition"
        >
          🔮 운세/풍수
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 bg-slate-950/90 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="말씀하시거나 질문 입력 (예: '의학적으로는?', '역사적 유래는?')..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
};
export default AgentChat;
