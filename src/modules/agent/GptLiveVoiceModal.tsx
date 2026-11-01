import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, Language } from '../../types';
import { GptLiveService } from './gptLiveService';

interface GptLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProduct: ProductItem | null;
  lang: Language;
  onTriggerAction: (product: ProductItem) => void;
}

export const GptLiveVoiceModal: React.FC<GptLiveVoiceModalProps> = ({
  isOpen,
  onClose,
  activeProduct,
  lang,
  onTriggerAction
}) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('kiroween_openai_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  const [transcripts, setTranscripts] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: lang === 'ko'
        ? '안녕하세요! gpt-live-1 실시간 통화 세션이 준비되었습니다. 편하게 말씀해 주세요. 말하는 중간에 끼어드셔도 바로 알아듣습니다!'
        : 'Hello! gpt-live-1 Full-Duplex Realtime call is active. Feel free to talk naturally or interrupt me anytime!',
      time: 'Ready'
    }
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const gptServiceRef = useRef<GptLiveService | null>(null);
  const videoOriginalMutedRef = useRef<boolean>(false);

  // Auto-scroll transcript container so latest message is always in view at bottom
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Dynamic Frequency Waveform Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barCount = 36;
      const barWidth = width / barCount - 3;

      for (let i = 0; i < barCount; i++) {
        let val = 8;
        if (status === 'speaking') {
          val = 14 + Math.sin(Date.now() / 120 + i * 0.4) * 16 + Math.random() * 8;
        } else if (status === 'listening' || status === 'connected') {
          val = 10 + (audioLevel / 255) * (height * 0.8) + Math.sin(Date.now() / 200 + i * 0.5) * 6;
        } else if (status === 'connecting') {
          val = 8 + Math.sin(Date.now() / 150 + i * 0.8) * 8;
        }

        val = Math.max(4, Math.min(height - 6, val));
        const x = i * (barWidth + 3);
        const y = (height - val) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + val);
        if (status === 'speaking') {
          gradient.addColorStop(0, '#ec4899');
          gradient.addColorStop(1, '#a855f7');
        } else if (status === 'listening') {
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(1, '#06b6d4');
        } else {
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(1, '#3b82f6');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, val, 3);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [status, audioLevel]);

  // Start Realtime Session
  const startSession = async () => {
    setErrorMessage(null);

    // Mute stream video while in full-duplex call to keep audio crystal clear
    const video = document.getElementById('kiroween-live-video') as HTMLVideoElement | null;
    if (video) {
      videoOriginalMutedRef.current = video.muted;
      video.muted = true;
    }

    if (apiKey.trim()) {
      setIsSimulated(false);
      localStorage.setItem('kiroween_openai_api_key', apiKey.trim());

      const instructions = `You are the Kiroween Live Commerce Co-Host AI Agent powered by gpt-live-1.
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

      const service = new GptLiveService({
        onStatusChange: (s) => setStatus(s),
        onTranscript: (sender, text) => {
          setTranscripts(prev => [...prev, { sender, text, time: new Date().toLocaleTimeString() }]);
        },
        onToolCall: (name, args) => {
          console.log('[gpt-live-1 Tool Execution]:', name, args);
          if (name === 'execute_instant_action' && activeProduct) {
            setActionNotice(`⚡ gpt-live-1 triggered Instant Action for ${activeProduct.name[lang] || activeProduct.name.en}!`);
            onTriggerAction(activeProduct);
          }
        },
        onError: (err) => {
          setErrorMessage(err);
        },
        onAudioLevel: (lvl) => {
          setAudioLevel(lvl);
        }
      });

      gptServiceRef.current = service;
      const success = await service.connect(apiKey.trim(), instructions, activeProduct?.id || 'prod-honey');
      if (!success) {
        setIsSimulated(true);
      }
    } else {
      // Prompt user to enter API key or run interactive test
      setShowKeyInput(true);
      setIsSimulated(true);
      setStatus('connected');
    }
  };

  const stopSession = () => {
    if (gptServiceRef.current) {
      gptServiceRef.current.disconnect();
      gptServiceRef.current = null;
    }
    const video = document.getElementById('kiroween-live-video') as HTMLVideoElement | null;
    if (video) {
      video.muted = videoOriginalMutedRef.current;
    }
    setStatus('disconnected');
  };

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen]);

  // Instant trigger simulation for quick testing
  const handleQuickAction = (phrase: string) => {
    const now = new Date().toLocaleTimeString();
    setTranscripts(prev => [...prev, { sender: 'user', text: phrase, time: now }]);

    if (activeProduct) {
      setTimeout(() => {
        const reply = lang === 'ko'
          ? `네! 실시간 방송 중인 ${activeProduct.name[lang] || activeProduct.name.en} 결제창을 즉시 열어드립니다!`
          : `Got it! Opening instant checkout for ${activeProduct.name[lang] || activeProduct.name.en} right now!`;
        setTranscripts(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString() }]);
        setActionNotice(`⚡ gpt-live-1 triggered Instant Action for ${activeProduct.name[lang] || activeProduct.name.en}!`);
        onTriggerAction(activeProduct);
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-purple-500/50 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-2xl">🎙️</span>
              <span
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  status === 'speaking'
                    ? 'bg-purple-500 animate-pulse'
                    : status === 'listening'
                    ? 'bg-emerald-400 animate-ping'
                    : status === 'connected'
                    ? 'bg-emerald-500'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white">gpt-live-1 Realtime Call</h2>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  {isSimulated ? 'Key Setup Mode' : 'WebRTC Full-Duplex'}
                </span>
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">
                  Barge-in Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {status === 'speaking'
                  ? '🗣️ gpt-live-1 말하는 중 (언제든 끼어들어서 말씀하세요)'
                  : status === 'listening'
                  ? '👂 경청 중... (자유롭게 말씀하세요)'
                  : status === 'connecting'
                  ? '⏳ WebRTC P2P 실시간 통화 연결 중...'
                  : status === 'connected'
                  ? '🟢 실시간 통화 활성화 (양방향 동시 발화/끼어들기 대기)'
                  : '통화 종료됨'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyInput(prev => !prev)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              🔑 {apiKey ? 'Key 설정됨' : 'OpenAI Key 입력'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg p-1 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* API Key Input Drawer */}
        {showKeyInput && (
          <div className="p-3 bg-slate-950 border-b border-purple-500/30 flex flex-col gap-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-purple-300">OpenAI API Key (gpt-live-1 WebRTC 실시간 통화):</label>
              <span className="text-[10px] text-slate-400">브라우저 로컬스토리지에만 안전하게 보관됩니다</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  setShowKeyInput(false);
                  stopSession();
                  startSession();
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer shrink-0"
              >
                연결 시작 (Connect)
              </button>
            </div>
          </div>
        )}

        {/* Action Triggered Notification Toast */}
        {actionNotice && (
          <div className="bg-emerald-950/90 border border-emerald-500/60 p-2.5 mx-4 mt-3 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <p className="text-xs font-bold text-emerald-300">{actionNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-emerald-400 text-xs hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-red-950/90 border border-red-500/60 p-2.5 mx-4 mt-3 rounded-xl flex items-center justify-between animate-in fade-in duration-200 text-red-300 text-xs">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 font-bold hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sound Waveform & Active Product Info */}
        <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center gap-3">
          <div className="w-full h-20 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
            <canvas ref={canvasRef} width={460} height={70} className="w-full h-full" />
            <div className="absolute top-2 right-2 text-[9px] text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              FULL-DUPLEX LIVE STREAM
            </div>
          </div>

          {activeProduct && (
            <div className="flex items-center justify-between w-full bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{activeProduct.icon}</span>
                <div>
                  <p className="text-white font-bold">{activeProduct.name[lang] || activeProduct.name.en}</p>
                  <p className="text-[11px] text-slate-400">라이브 스트리밍 연동 중</p>
                </div>
              </div>
              <span className="text-amber-400 font-extrabold text-sm">
                {activeProduct.currency} {activeProduct.price.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Stream */}
        <div
          ref={transcriptContainerRef}
          className="flex-1 min-h-[160px] max-h-[240px] p-4 overflow-y-auto flex flex-col gap-2.5 bg-slate-900/60 border-t border-b border-slate-800/80 scroll-smooth"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Transcript Stream</p>
            <span className="text-[10px] text-purple-400 font-mono">Barge-in / Simultaneous Listen</span>
          </div>

          {transcripts.map((t, idx) => (
            <div key={idx} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed ${
                  t.sender === 'user'
                    ? 'bg-purple-600 text-white font-medium rounded-br-none shadow-md'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none shadow-md'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 opacity-70 text-[9px]">
                  <span>{t.sender === 'user' ? '👤 나 (User)' : '🤖 gpt-live-1'}</span>
                  <span>· {t.time}</span>
                </div>
                {t.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Instant Test Actions */}
        <div className="p-3 bg-slate-950 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold">⚡ 원클릭 발화 시뮬레이션 (Instant Test):</span>
            <span className="text-[10px] text-emerald-400">말씀하시거나 버튼을 눌러 테스트</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickAction(lang === 'ko' ? '저기 들고 계신 꿀 바로 주문해줘!' : 'Buy that honey for me!')}
              className="bg-purple-900/50 hover:bg-purple-800/80 text-purple-200 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow"
            >
              <span>⚡</span>
              <span>{lang === 'ko' ? '"꿀 바로 주문해줘!"' : '"Buy this honey!"'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction(lang === 'ko' ? '이 꿀 원산지가 어디인가요?' : 'Where is this honey harvested?')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer active:scale-95"
            >
              {lang === 'ko' ? '"원산지가 어디예요?"' : '"Where is it from?"'}
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction(lang === 'ko' ? '가격과 용량이 어떻게 돼요?' : 'What is the price and volume?')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer active:scale-95"
            >
              {lang === 'ko' ? '"가격과 용량이 어떻게 돼요?"' : '"Price and volume?"'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] text-slate-400">
              {apiKey ? 'OpenAI Realtime P2P WebRTC 활성' : 'API Key 미입력 (원클릭 테스트 가능)'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-1.5 rounded-lg transition cursor-pointer"
          >
            통화 종료 (End Call)
          </button>
        </div>
      </div>
    </div>
  );
};
export default GptLiveVoiceModal;
