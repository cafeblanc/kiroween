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

  // Handle incoming transcripts from the independent Voice Module with strict deduplication
  const handleVoiceTranscript = (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => {
    if (!text || !text.trim()) return;

    let displayPrefix = '';
    if (domain && domain !== 'general' && DOMAIN_REGISTRY[domain]) {
      const meta = DOMAIN_REGISTRY[domain];
      displayPrefix = `[${meta.icon} ${meta.nameKo} 최적화] `;
    }

    const trimmed = text.trim();
    const formattedText = sender === 'user' ? `🎙️ ${displayPrefix}"${trimmed}"` : `🗣️ ${displayPrefix}${trimmed}`;

    setMessages(prev => {
      // Prevent duplicate messages from OpenAI audio/text multiple event fires
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const lastText = typeof last.text === 'string' ? last.text : '';
        if (last.sender === (sender === 'user' ? 'user' : 'ai') && (lastText === formattedText || lastText.includes(trimmed))) {
          return prev;
        }
      }

      const msg: ChatMessage = {
        id: Date.now() + '-' + sender,
        sender: sender === 'user' ? 'user' : 'ai',
        text: formattedText,
        timestamp: new Date().toLocaleTimeString()
      };
      return [...prev, msg];
    });
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
      setActiveDomainNotice(`${meta.icon} 파악된 분야: [${meta.nameKo}] - 질문 분석 및 최적화 답변 준비 중...`);
      setTimeout(() => setActiveDomainNotice(null), 4000);
    }
  };

  // Unified Query execution (for text submission and quick chips)
  const sendQuery = (queryText: string) => {
    const query = queryText.trim();
    if (!query) return;

    const detected = DomainKnowledgeRouter.detectDomain(query);
    if (detected.domain !== 'general') {
      handleDomainDetected(detected.domain);
    }

    const userMsg: ChatMessage = {
      id: Date.now() + '-user',
      sender: 'user',
      text: detected.domain !== 'general' ? `[${detected.meta.icon} ${detected.meta.nameKo}] "${query}"` : `"${query}"`,
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
      const expertAnswer = DomainKnowledgeRouter.resolveDomainKnowledge(detected.domain, query, activeProduct?.name[lang] || activeProduct?.name.en);
      replyText = `🗣️ [${detected.meta.icon} ${detected.meta.nameKo} 최적화 답변] ${expertAnswer}`;
      speakKorean(expertAnswer);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
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

      {/* Quick Domain One-Click Question & Test Chips */}
      <div className="px-2 py-1.5 bg-slate-950/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] shrink-0">
        <span className="text-purple-400 font-bold shrink-0">원클릭 테스트:</span>
        <button
          type="button"
          onClick={() => sendQuery('의학적으로 아카시아 꿀의 효능과 혈당 영향은?')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer"
        >
          🩺 의학적 효능
        </button>
        <button
          type="button"
          onClick={() => sendQuery('오늘 내 일진과 황금빛 기운의 재물운을 점쳐줘')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer"
        >
          🔮 운세/재물운
        </button>
        <button
          type="button"
          onClick={() => sendQuery('과학적으로 효소의 기질 특이성과 분해 메커니즘을 설명해줘')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer"
        >
          🔬 과학적 효소
        </button>
        <button
          type="button"
          onClick={() => sendQuery('법률적으로 전자상거래 원산지 표시 규정과 품질 보증은?')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer"
        >
          ⚖️ 법률/품질보증
        </button>
        <button
          type="button"
          onClick={() => sendQuery('요리 미식 관점에서 마이야르 반응과 꿀의 고메 페어링 비법은?')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer"
        >
          🍳 요리/미식
        </button>
        <button
          type="button"
          onClick={() => sendQuery('이 꿀 바로 주문해줘')}
          className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer font-bold"
        >
          ⚡ 꿀 바로 주문
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
