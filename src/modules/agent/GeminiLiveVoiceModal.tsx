import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, Language } from '../../types';
import { speakLocalizedText } from '../voice/ttsSpeaker';

interface GeminiLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProduct: ProductItem | null;
  lang: Language;
  onTriggerAction: (product: ProductItem) => void;
}

export const GeminiLiveVoiceModal: React.FC<GeminiLiveVoiceModalProps> = ({
  isOpen,
  onClose,
  activeProduct,
  lang,
  onTriggerAction
}) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: lang === 'ko'
        ? '안녕하세요! 영상 속 상품에 대해 무엇이든 편하게 물어보세요. "주문해줘"라고 하시면 결제창을 열어드립니다.'
        : 'Hello! Ask me anything about the featured item, or say "Buy this" to trigger instant checkout.',
      time: 'Ready'
    }
  ]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [actionTriggeredNotice, setActionTriggeredNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const isAgentSpeakingRef = useRef<boolean>(false);
  const videoOriginalMutedRef = useRef<boolean>(false);

  // Dynamic sound wave animation
  const drawWaveform = (level = 10) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const barCount = 28;
    const barWidth = width / barCount - 3;

    for (let i = 0; i < barCount; i++) {
      let val = 8;
      if (status === 'speaking') {
        val = 15 + Math.sin(Date.now() / 150 + i * 0.4) * 14 + Math.random() * 8;
      } else if (status === 'listening') {
        val = 12 + Math.sin(Date.now() / 200 + i * 0.6) * 10 + Math.random() * (level * 1.5);
      } else if (status === 'processing') {
        val = 10 + Math.sin(Date.now() / 100 + i * 0.8) * 8;
      }

      val = Math.max(6, Math.min(height - 8, val));
      const x = i * (barWidth + 3);
      const y = (height - val) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + val);
      if (status === 'speaking') {
        gradient.addColorStop(0, '#ec4899');
        gradient.addColorStop(1, '#a855f7');
      } else if (status === 'listening') {
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#3b82f6');
      } else {
        gradient.addColorStop(0, '#64748b');
        gradient.addColorStop(1, '#475569');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, val, 3);
      ctx.fill();
    }
  };

  // Safe TTS Playback with Echo Guard
  const speakAgentResponse = (text: string, onFinished?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (onFinished) onFinished();
      return;
    }

    // Stop recognition while AI is talking so it never listens to its own voice!
    isAgentSpeakingRef.current = true;
    setStatus('speaking');

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch (_) {}
    }

    speakLocalizedText(text, lang, () => {
      // Buffer delay before unmuting mic to avoid picking up trailing echo
      setTimeout(() => {
        isAgentSpeakingRef.current = false;
        setStatus('idle');
        if (onFinished) onFinished();
        if (isMicActive) {
          startListening();
        }
      }, 500);
    });
  };

  // Initialize Speech Recognition for User Voice
  const startListening = () => {
    if (isAgentSpeakingRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.abort(); } catch (_) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false; // Turn off continuous mode to prevent self-looping!
      rec.interimResults = false;
      rec.lang = lang === 'ko' ? 'ko-KR' : 'en-US';

      rec.onstart = () => {
        setStatus('listening');
        setIsMicActive(true);
      };

      rec.onresult = (event: any) => {
        // Echo filter: ignore if agent is currently speaking
        if (isAgentSpeakingRef.current) return;

        const speechResult = event.results[0]?.[0]?.transcript?.trim();
        if (!speechResult) return;

        handleUserUtterance(speechResult);
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('[Voice] Recognition error:', e.error);
        }
        if (!isAgentSpeakingRef.current) {
          setStatus('idle');
        }
      };

      rec.onend = () => {
        if (!isAgentSpeakingRef.current && isMicActive) {
          // Restart listening only if mic is intentionally kept active
          setStatus('idle');
        }
      };

      speechRecognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.warn('[Voice] Failed to start recognition:', e);
      setStatus('idle');
    }
  };

  const stopListening = () => {
    setIsMicActive(false);
    setStatus('idle');
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
  };

  const toggleMic = () => {
    if (isMicActive || status === 'listening') {
      stopListening();
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      startListening();
    }
  };

  // Process User Utterance and Generate Clear Response
  const handleUserUtterance = (query: string) => {
    // Add User Message
    const now = new Date().toLocaleTimeString();
    setTranscripts(prev => [...prev, { sender: 'user', text: query, time: now }]);
    setStatus('processing');

    const q = query.toLowerCase();
    const isKorean = lang === 'ko';
    let reply = '';

    // Check for buy/order intent
    const buyKeywords = ['buy', 'order', 'purchase', 'checkout', '사', '주문', '결제', '살게', '살래'];
    const isBuyIntent = buyKeywords.some(kw => q.includes(kw));

    if (isBuyIntent && activeProduct) {
      reply = isKorean
        ? `${activeProduct.name[lang] || activeProduct.name.en} 결제창을 지금 열어드리겠습니다.`
        : `Opening the checkout sheet for ${activeProduct.name[lang] || activeProduct.name.en} right now!`;

      setActionTriggeredNotice(`⚡ Instant Action: ${activeProduct.name[lang] || activeProduct.name.en}`);
      onTriggerAction(activeProduct);
    } else if (q.includes('얼마') || q.includes('price') || q.includes('cost') || q.includes('가격')) {
      if (activeProduct) {
        reply = isKorean
          ? `현재 상품은 ${activeProduct.name[lang] || activeProduct.name.en}이며, 가격은 ${activeProduct.currency} ${activeProduct.price.toLocaleString()}원입니다.`
          : `The ${activeProduct.name[lang] || activeProduct.name.en} is priced at ${activeProduct.currency} ${activeProduct.price.toLocaleString()}.`;
      }
    } else if (q.includes('원산지') || q.includes('어디') || q.includes('where') || q.includes('organic') || q.includes('자연')) {
      if (activeProduct) {
        reply = isKorean
          ? `양평 청정 자연에서 채밀된 100% 천연 아카시아 벌꿀입니다. 품질이 아주 우수합니다.`
          : `It is 100% pure organic honey harvested from Yangpyeong mountains with certified purity.`;
      }
    } else {
      if (activeProduct) {
        reply = isKorean
          ? `영상 속 할아버지가 들고 계신 상품은 ${activeProduct.name[lang] || activeProduct.name.en}입니다. 주문을 원하시면 "주문해줘"라고 말씀해 주세요!`
          : `The product shown on stream is ${activeProduct.name[lang] || activeProduct.name.en}. Say "buy it" whenever you're ready!`;
      } else {
        reply = isKorean ? `네, 말씀하세요! 듣고 있습니다.` : `Yes, I am listening! How can I help you?`;
      }
    }

    setTranscripts(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString() }]);
    speakAgentResponse(reply);
  };

  // Mute background video audio while voice modal is open to prevent audio feedback
  useEffect(() => {
    const video = document.getElementById('kiroween-live-video') as HTMLVideoElement | null;
    if (isOpen) {
      if (video) {
        videoOriginalMutedRef.current = video.muted;
        video.muted = true; // Mute video so mic doesn't hear the video audio
      }
    } else {
      if (video) {
        video.muted = videoOriginalMutedRef.current;
      }
      stopListening();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isAgentSpeakingRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      drawWaveform();
    }, 60);
    return () => clearInterval(interval);
  }, [status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/40 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-2xl">🎙️</span>
              <span
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  status === 'speaking'
                    ? 'bg-purple-500 animate-pulse'
                    : status === 'listening'
                    ? 'bg-emerald-500 animate-ping'
                    : status === 'processing'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Gemini Multimodal Live Voice
                <span className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-semibold">
                  Acoustic Echo-Protected
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {status === 'speaking'
                  ? '🔊 에이전트가 답변 중입니다 (마이크 자동 음소거)...'
                  : status === 'listening'
                  ? '🎤 말씀하세요! 실시간으로 듣고 있습니다...'
                  : status === 'processing'
                  ? '⚡ 음성 인식 및 의도 분석 중...'
                  : '마이크 버튼을 누르거나 아래 추천 질문을 클릭하세요.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Triggered Notification Toast */}
        {actionTriggeredNotice && (
          <div className="bg-emerald-950/90 border border-emerald-500/60 p-2.5 mx-4 mt-3 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <p className="text-xs font-bold text-emerald-300">{actionTriggeredNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionTriggeredNotice(null)}
              className="text-emerald-400 text-xs hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="bg-red-950/90 border border-red-500/60 p-2.5 mx-4 mt-3 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-red-300 text-xs">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 text-xs hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Center Visualizer & Mic Control */}
        <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center gap-3">
          {/* Waveform Canvas */}
          <div className="w-full h-16 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden">
            <canvas ref={canvasRef} width={420} height={56} className="w-full h-full" />
            <div className="absolute top-2 right-2 text-[9px] text-slate-500 font-mono">
              ECHO-CANCELLED REALTIME FEED
            </div>
          </div>

          {/* Big Push-to-Talk / Toggle Mic Button */}
          <div className="flex flex-col items-center gap-1.5 my-1">
            <button
              type="button"
              onClick={toggleMic}
              disabled={status === 'speaking'}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all cursor-pointer active:scale-95 ${
                status === 'speaking'
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : status === 'listening'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50 ring-4 ring-red-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/50'
              }`}
            >
              {status === 'speaking' ? '🔊' : status === 'listening' ? '⏹️' : '🎙️'}
            </button>
            <span className="text-[11px] font-bold text-slate-300">
              {status === 'speaking'
                ? 'AI 답변 중...'
                : status === 'listening'
                ? '듣는 중 (클릭하면 멈춤)'
                : '클릭하고 말씀하세요'}
            </span>
          </div>

          {/* Active Product Pill */}
          {activeProduct && (
            <div className="flex items-center justify-between w-full bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeProduct.icon}</span>
                <span className="text-slate-300 font-semibold">{activeProduct.name[lang] || activeProduct.name.en}</span>
              </div>
              <span className="text-amber-400 font-bold">{activeProduct.currency} {activeProduct.price.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="flex-1 min-h-[140px] max-h-[220px] p-3.5 overflow-y-auto flex flex-col gap-2.5 bg-slate-900/70 border-t border-b border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Transcript Stream</p>
          {transcripts.map((t, idx) => (
            <div key={idx} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs leading-relaxed ${
                  t.sender === 'user'
                    ? 'bg-purple-600 text-white font-medium rounded-br-none'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 opacity-70 text-[9px]">
                  <span>{t.sender === 'user' ? '👤 나 (User)' : '🤖 Gemini Agent'}</span>
                  <span>· {t.time}</span>
                </div>
                {t.text}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Click-to-Speak Prompt Chips */}
        <div className="p-3 bg-slate-950 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-bold">💡 클릭하여 즉시 테스트 (Quick Speech Actions):</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleUserUtterance(lang === 'ko' ? '저기 들고 있는 꿀 주문해줘!' : 'Buy that honey for me!')}
              className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
            >
              <span>⚡</span>
              <span>{lang === 'ko' ? '"꿀 바로 주문해줘!"' : '"Buy this honey!"'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleUserUtterance(lang === 'ko' ? '이 벌꿀 얼마예요?' : 'How much is this honey?')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              {lang === 'ko' ? '"이 벌꿀 얼마예요?"' : '"How much is this?"'}
            </button>
            <button
              type="button"
              onClick={() => handleUserUtterance(lang === 'ko' ? '원산지가 어디인가요?' : 'Where is this harvested?')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              {lang === 'ko' ? '"원산지가 어디예요?"' : '"Where is it from?"'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {isMicActive ? '🔴 마이크 수신 활성' : '⚪ 마이크 대기 상태'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            닫기 (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
export default GeminiLiveVoiceModal;
