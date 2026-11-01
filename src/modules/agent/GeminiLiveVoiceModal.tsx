import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, Language } from '../../types';
import { GeminiLiveService } from './geminiLiveService';

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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('kiroween_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: lang === 'ko'
        ? '안녕하세요! 라이브 방송을 함께 보고 있는 Gemini Multimodal Live 에이전트입니다. 무엇이든 물어보시거나 "주문해줘"라고 말씀해 보세요.'
        : 'Hello! I am your Gemini Multimodal Live Agent watching the broadcast with you. Ask me anything about what you see, or say "buy it" to checkout!',
      time: 'Ready'
    }
  ]);
  const [simulatedMode, setSimulatedMode] = useState(false);
  const [actionTriggeredNotice, setActionTriggeredNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize Canvas Waveform
  const drawWaveform = (freqData?: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;

    const barCount = 32;
    const barWidth = (width / barCount) - 3;

    for (let i = 0; i < barCount; i++) {
      let val = 15;
      if (freqData && freqData.length > 0) {
        const index = Math.floor((i / barCount) * freqData.length);
        val = Math.max(8, (freqData[index] / 255) * height);
      } else if (status === 'speaking' || status === 'listening') {
        // Subtle ambient oscillation
        val = 10 + Math.sin(Date.now() / 200 + i) * 8 + Math.random() * 6;
      }

      const x = i * (barWidth + 3);
      const y = (height - val) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + val);
      if (status === 'speaking') {
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(1, '#ec4899');
      } else if (status === 'listening') {
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#06b6d4');
      } else {
        gradient.addColorStop(0, '#64748b');
        gradient.addColorStop(1, '#334155');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, Math.max(4, val), 4);
      ctx.fill();
    }
  };

  // Start Gemini Multimodal Live or Simulation
  const startLiveSession = async () => {
    setErrorMessage(null);

    // If API key is present, connect to native Gemini 2.0 Live WebSocket
    if (apiKey.trim()) {
      localStorage.setItem('kiroween_gemini_api_key', apiKey.trim());
      setSimulatedMode(false);

      const systemPrompt = `You are the Kiroween Live Commerce Multimodal AI Shopping Assistant. 
You are watching a live stream video with the user. The current featured product is:
ID: ${activeProduct?.id || 'prod-honey'}
Name: ${activeProduct?.name.en || 'Organic Acacia Honey'}
Price: ${activeProduct?.currency || 'KRW'} ${activeProduct?.price || 32000}
Description: ${activeProduct?.description.en || ''}

You receive real-time video snapshots from the stream and user audio.
Your goal is to converse naturally, explain the product, answer questions about what is shown on screen, and guide purchases.
If the user says they want to buy, purchase, order, or checkout the item (e.g., "I want to buy this", "저거 살게요", "주문해줘"), 
IMMEDIATELY call the function 'execute_instant_action' with productId="${activeProduct?.id || 'prod-honey'}".
Keep your answers brief, engaging, helpful, and natural for voice conversation.`;

      const service = new GeminiLiveService({
        onStatusChange: (newStatus) => setStatus(newStatus),
        onTranscript: (sender, text) => {
          setTranscripts(prev => [...prev, { sender, text, time: new Date().toLocaleTimeString() }]);
        },
        onToolCall: (name, args) => {
          console.log('[Gemini Live Tool Call]:', name, args);
          if (name === 'execute_instant_action' && activeProduct) {
            setActionTriggeredNotice(`⚡ Gemini executed Instant Action for ${activeProduct.name[lang] || activeProduct.name.en}!`);
            onTriggerAction(activeProduct);
          }
        },
        onError: (err) => {
          setErrorMessage(err);
        },
        onAudioWave: (freq) => {
          drawWaveform(freq);
        }
      });

      liveServiceRef.current = service;
      const ok = await service.connect(apiKey.trim(), systemPrompt);
      if (!ok) {
        fallbackToSimulatedLive();
      }
    } else {
      // Fallback: Ultra-realistic browser speech recognition + TTS simulation
      fallbackToSimulatedLive();
    }
  };

  // Fallback Simulation Mode using Web Speech API
  const fallbackToSimulatedLive = () => {
    setSimulatedMode(true);
    setStatus('connected');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Browser does not support Web Speech. Please enter a Gemini API Key for WebSocket Live streaming.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = lang === 'ko' ? 'ko-KR' : 'en-US';

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      if (!transcript.trim()) return;

      const userText = transcript.trim();
      setTranscripts(prev => [...prev, { sender: 'user', text: userText, time: new Date().toLocaleTimeString() }]);

      // Process intent
      handleSimulatedAgentResponse(userText);
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech recognition error:', e);
    };

    recognition.onend = () => {
      if (isOpen && simulatedMode) {
        try { recognition.start(); } catch (_) {}
      }
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const handleSimulatedAgentResponse = (userQuery: string) => {
    setStatus('speaking');
    let reply = '';
    const q = userQuery.toLowerCase();

    if (q.includes('buy') || q.includes('order') || q.includes('checkout') || q.includes('사') || q.includes('주문') || q.includes('결제')) {
      if (activeProduct) {
        reply = lang === 'ko'
          ? `네! 실시간 영상 속 ${activeProduct.name[lang] || activeProduct.name.en} 결제창을 즉시 열어드립니다!`
          : `Got it! Triggering the Instant Action checkout for ${activeProduct.name[lang] || activeProduct.name.en} right now!`;
        setActionTriggeredNotice(`⚡ Gemini executed Instant Action for ${activeProduct.name[lang] || activeProduct.name.en}!`);
        onTriggerAction(activeProduct);
      }
    } else {
      if (activeProduct) {
        reply = lang === 'ko'
          ? `화면의 라이브 방송을 확인했습니다. 현재 쇼호스트가 소개 중인 ${activeProduct.name[lang] || activeProduct.name.en} 상품이며, 가격은 ${activeProduct.currency} ${activeProduct.price.toLocaleString()}원입니다. 청정 자연에서 채밀된 100% 천연 제품이에요!`
          : `I see the stream! The host is showing the ${activeProduct.name[lang] || activeProduct.name.en}, priced at ${activeProduct.currency} ${activeProduct.price.toLocaleString()}. It is 100% organic and harvest-certified. Would you like me to place an order?`;
      } else {
        reply = `I am watching the live stream with you. How can I assist you with this product?`;
      }
    }

    setTranscripts(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString() }]);

    // Browser TTS playback
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(reply);
      utter.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
      utter.rate = 1.05;
      utter.onend = () => setStatus('listening');
      synth.speak(utter);
    } else {
      setTimeout(() => setStatus('listening'), 2000);
    }
  };

  const stopLiveSession = () => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStatus('disconnected');
  };

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }
    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  useEffect(() => {
    const timer = setInterval(() => {
      drawWaveform();
    }, 50);
    return () => clearInterval(timer);
  }, [status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/40 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-2xl">🎙️</span>
              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                status === 'connected' || status === 'listening' || status === 'speaking'
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-red-500'
              }`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Gemini Multimodal Live Interaction
                <span className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-semibold">
                  {simulatedMode ? 'Live Simulation' : 'WebSocket Live (2.0 Flash)'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {status === 'speaking'
                  ? '🔊 Gemini is speaking...'
                  : status === 'listening'
                  ? '🎤 Listening to your voice (Speak freely)...'
                  : status === 'connecting'
                  ? '⏳ Connecting to Gemini Multimodal Live API...'
                  : '🟢 Ready for bidirectional voice conversation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyInput(prev => !prev)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg transition"
              title="Set Gemini API Key"
            >
              🔑 {apiKey ? 'Key Set' : 'Set API Key'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg p-1 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* API Key Drawer */}
        {showKeyInput && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col gap-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-purple-300">Google Gemini API Key (for Live Multimodal WebSocket):</label>
              <span className="text-[10px] text-slate-400">Leave blank for browser speech fallback</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  setShowKeyInput(false);
                  stopLiveSession();
                  startLiveSession();
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-1 rounded transition"
              >
                Apply & Reconnect
              </button>
            </div>
          </div>
        )}

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

        {/* Visualizer & Multimodal Stream Eye */}
        <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center gap-3">
          {/* Waveform Canvas */}
          <div className="w-full h-20 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-center p-2 relative overflow-hidden">
            <canvas ref={canvasRef} width={420} height={70} className="w-full h-full" />
            <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
              MULTIMODAL STREAM SYNC
            </div>
          </div>

          {/* Active Product & Multimodal Context Pill */}
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
        <div className="flex-1 min-h-[160px] p-4 overflow-y-auto flex flex-col gap-2.5 bg-slate-900/60">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Transcript Stream</p>
          {transcripts.map((t, idx) => (
            <div key={idx} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed ${
                  t.sender === 'user'
                    ? 'bg-purple-600 text-white font-medium rounded-br-none'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 opacity-70 text-[10px]">
                  <span>{t.sender === 'user' ? '👤 You' : '🤖 Gemini Live'}</span>
                  <span>· {t.time}</span>
                </div>
                {t.text}
              </div>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="p-2.5 bg-red-950/80 border-t border-red-800 text-red-300 text-xs flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 font-bold text-xs hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Footer Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Try saying:</span>
            <button
              type="button"
              onClick={() => handleSimulatedAgentResponse(lang === 'ko' ? '저 꿀 지금 바로 주문해줘!' : 'Order this honey for me right now!')}
              className="bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[11px] transition"
            >
              {lang === 'ko' ? '💡 "저 꿀 바로 주문해줘!"' : '💡 "Order this honey for me!"'}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition"
          >
            End Live Voice
          </button>
        </div>
      </div>
    </div>
  );
};
export default GeminiLiveVoiceModal;
