import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProductItem, Language } from '../../types';

interface AgentChatProps {
  lang: Language;
  onTriggerAction: (product: ProductItem) => void;
  activeProduct: ProductItem | null;
  onOpenGeminiVoice: () => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  lang,
  onTriggerAction,
  activeProduct,
  onOpenGeminiVoice
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: {
        en: '🤖 Welcome to Kiroween Multimodal Agent! Ask anything about the live stream or type "buy" for instant execution.',
        ko: '🤖 Kiroween 멀티모달 에이전트에 오신 것을 환영합니다! 라이브 영상 속 상품 문의나 즉시 실행을 테스트해보세요.',
        ja: '🤖 Kiroweenマルチモーダルエージェントへようこそ！',
        zh: '🤖 欢迎来到 Kiroween 多模态智能代理！',
        es: '🤖 ¡Bienvenido al Agente Multimodal de Kiroween!',
        fr: '🤖 Bienvenue sur l’Agent Multimodal Kiroween !'
      },
      timestamp: 'Now'
    }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    let replyText = `🤖 AI Agent received: "${query}"`;
    let suggested: ProductItem | undefined = undefined;

    if (query.toLowerCase().includes('buy') || query.includes('결제') || query.includes('checkout') || query.includes('주문')) {
      if (activeProduct) {
        replyText = `🤖 Initiating In-Stream Action for ${activeProduct.name[lang] || activeProduct.name.en}!`;
        suggested = activeProduct;
      }
    } else if (activeProduct) {
      replyText = `🤖 [Multimodal Context] Currently viewing: ${activeProduct.name[lang] || activeProduct.name.en}. ${activeProduct.description[lang] || activeProduct.description.en}`;
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
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="text-xs font-bold text-white">Kiroween Contextual Agent</h3>
            <span className="text-[10px] text-emerald-400 font-medium">● Real-time Stream Hook Active</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenGeminiVoice}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-purple-900/40 flex items-center gap-1.5 transition active:scale-95 cursor-pointer animate-pulse"
        >
          <span>🎙️</span>
          <span>Gemini Live</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-purple-600 text-white font-medium rounded-br-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
              }`}
            >
              {typeof m.text === 'string' ? m.text : (m.text[lang] || m.text.en)}
            </div>

            {/* Suggested Action Card */}
            {m.suggestedProduct && (
              <div className="mt-2 bg-slate-950 border border-purple-500/50 p-2.5 rounded-lg flex items-center justify-between gap-3 w-full max-w-[85%] shadow-lg">
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
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[11px] px-2.5 py-1.5 rounded transition cursor-pointer shrink-0"
                >
                  Confirm Action
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 bg-slate-950/80 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask AI or type 'buy' to execute action..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};
export default AgentChat;
