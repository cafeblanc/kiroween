import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProductItem, Language } from '../../types';
import { GptLiveVoiceWidget, VoiceToolDefinition, VoiceStatus } from '../voice';

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
        en: '🤖 Welcome to Kiroween Multimodal Agent! Ask anything via text or press [Start Voice Call] for real-time conversation.',
        ko: '🤖 Kiroween 멀티모달 에이전트에 오신 것을 환영합니다! 텍스트로 질문하시거나 [🎙️ 실시간 음성 통화]를 켜고 편하게 말씀해 보세요.',
        ja: '🤖 Kiroweenマルチモーダルエージェントへようこそ！音声またはテキストでお話しください。',
        zh: '🤖 欢迎来到 Kiroween 多模态智能代理！您可以文字提问或点击开启实时语音通话。',
        es: '🤖 ¡Bienvenido al Agente Multimodal de Kiroween! Hable o escriba en cualquier momento.',
        fr: '🤖 Bienvenue sur l’Agent Multimodal Kiroween ! Parlez ou écrivez à tout moment.'
      },
      timestamp: 'Ready'
    }
  ]);
  const [input, setInput] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll so newest messages always appear at bottom and previous messages push up
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dynamic system instructions for voice agent
  const voiceInstructions = `You are the Kiroween Live Commerce Co-Host AI Agent powered by gpt-live-1.
You are co-hosting an active live shopping broadcast with the host on screen.
The current featured stream product is:
- Product ID: ${activeProduct?.id || 'prod-honey'}
- Name: ${activeProduct?.name.en || 'Organic Acacia Honey (500g)'}
- Price: ${activeProduct?.currency || 'KRW'} ${activeProduct?.price || 32000}
- Description: ${activeProduct?.description.en || '100% pure organic honey'}

You are in a live phone call / full-duplex voice conversation with the viewer.
Rules:
1. Speak in a warm, lively, natural human voice (fluent in Korean or English as spoken by user).
2. Keep spoken turns concise, natural, and conversational (1-2 sentences per response).
3. If the user expresses intent to purchase or checkout (e.g. "이거 살게요", "주문해줘", "I want to buy", "checkout"), IMMEDIATELY call the tool 'execute_instant_action' with productId="${activeProduct?.id || 'prod-honey'}".
4. When the user interrupts or speaks mid-sentence, stop immediately and listen.`;

  // Handle incoming transcripts from the independent Voice Module
  const handleVoiceTranscript = (sender: 'user' | 'agent', text: string) => {
    if (!text || !text.trim()) return;
    const msg: ChatMessage = {
      id: Date.now() + '-' + sender,
      sender: sender === 'user' ? 'user' : 'ai',
      text: sender === 'user' ? `🎙️ "${text.trim()}"` : `🗣️ ${text.trim()}`,
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

  // Text message submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const query = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now() + '-user',
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };

    let replyText = `🤖 AI Agent: "${query}" 질문을 확인했습니다.`;
    let suggested: ProductItem | undefined = undefined;

    if (query.toLowerCase().includes('buy') || query.includes('결제') || query.includes('checkout') || query.includes('주문') || query.includes('살게') || query.includes('살래')) {
      if (activeProduct) {
        replyText = `⚡ ${activeProduct.name[lang] || activeProduct.name.en} PayPal 즉시 결제창을 화면 앞에 열었습니다!`;
        suggested = activeProduct;
        onTriggerAction(activeProduct);
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
      
      {/* Header integrating Standalone Voice Module via clean In/Out props */}
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
                : '● Real-time Stream Hook Active'}
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
        />
      </div>

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

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 bg-slate-950/90 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="말씀하시거나 질문 또는 '주문' 입력..."
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
