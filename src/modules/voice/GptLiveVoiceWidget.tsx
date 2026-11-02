// Standalone UI Widget for gpt-live WebRTC Voice Call with Domain-Optimized Intelligence
// Pure In/Out contract: accepts systemInstruction & tools in, emits onTranscript & onToolCall out.

import React, { useState } from 'react';
import { GptLiveVoiceWidgetProps, DOMAIN_REGISTRY } from './types';
import { useGptLiveVoice } from './useGptLiveVoice';

export const GptLiveVoiceWidget: React.FC<GptLiveVoiceWidgetProps> = ({
  apiKey,
  systemInstruction,
  model,
  voiceName,
  tools,
  enableDomainSearch = true,
  className = '',
  onDomainSearch,
  onTranscript,
  onToolCall,
  onStatusChange,
  onDomainDetected,
  onError,
  onAudioLevel
}) => {
  const [localKey, setLocalKey] = useState(() => apiKey || localStorage.getItem('kiroween_openai_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string | null>(null);

  const {
    status,
    isVoiceActive,
    error,
    activeDomain,
    startVoice,
    stopVoice,
    setError
  } = useGptLiveVoice({
    apiKey: localKey,
    systemInstruction,
    model,
    voiceName,
    tools,
    enableDomainSearch,
    onDomainSearch,
    onTranscript,
    onToolCall,
    onStatusChange,
    onDomainDetected,
    onError,
    onAudioLevel
  });

  const handleToggle = () => {
    if (isVoiceActive) {
      stopVoice();
    } else {
      if (!localKey.trim()) {
        setShowKeyModal(true);
      } else {
        startVoice(localKey.trim());
      }
    }
  };

  const handleSaveKey = () => {
    localStorage.setItem('kiroween_openai_api_key', localKey.trim());
    setShowKeyModal(false);
    setError(null);
    startVoice(localKey.trim());
  };

  const currentDomainMeta = activeDomain && activeDomain !== 'general' ? DOMAIN_REGISTRY[activeDomain] : null;

  return (
    <div className={`flex flex-col select-none ${className}`}>
      {/* Control Strip */}
      <div className="flex items-center gap-1.5">
        {/* Active Domain Indicator Pill */}
        {currentDomainMeta && (
          <span className="text-[10px] bg-indigo-950/90 text-indigo-300 border border-indigo-500/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow animate-in fade-in duration-200">
            <span>{currentDomainMeta.icon}</span>
            <span>{currentDomainMeta.nameKo} 최적화</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowKeyModal(prev => !prev)}
          className="text-[11px] bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-lg transition cursor-pointer"
          title="OpenAI API Key 및 전문 도메인 설정"
        >
          🔑 {localKey ? 'Key' : 'Key 등록'}
        </button>

        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
            isVoiceActive
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40 ring-2 ring-red-500/50 animate-pulse'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/40'
          }`}
        >
          <span>
            {status === 'speaking'
              ? '🗣️'
              : status === 'listening'
              ? '👂'
              : isVoiceActive
              ? '⏹️'
              : '🎙️'}
          </span>
          <span>
            {status === 'speaking'
              ? '발화 중...'
              : status === 'listening'
              ? '경청 중...'
              : isVoiceActive
              ? '통화 종료 (Stop)'
              : '통화 시작 (Start Voice)'}
          </span>
        </button>
      </div>

      {/* Floating Settings & Domain Drawer */}
      {showKeyModal && (
        <div className="absolute top-12 right-2 bg-slate-950 border border-purple-500/50 p-3.5 rounded-xl shadow-2xl z-30 w-80 flex flex-col gap-3 animate-in slide-in-from-top duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span>OpenAI API Key & 전문 도메인 최적화</span>
            <button
              type="button"
              onClick={() => setShowKeyModal(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold">API Key (GA /v1/realtime/calls):</label>
            <input
              type="password"
              value={localKey}
              onChange={e => setLocalKey(e.target.value)}
              placeholder="sk-proj-..."
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* Specialized Domain Categories (13개 핵심 전문 분야) */}
          <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2">
            <span className="text-[10px] font-bold text-indigo-300 flex items-center justify-between">
              <span>🎯 전문 질문 최적화 검색 지원 (13개 분야):</span>
              <span className="text-[9px] text-slate-400">키워드 자동 분리</span>
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              {Object.values(DOMAIN_REGISTRY).filter(d => d.id !== 'general').map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDomainFilter(selectedDomainFilter === d.id ? null : d.id)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition flex items-center gap-1 ${
                    selectedDomainFilter === d.id
                      ? 'bg-purple-600 border-purple-400 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{d.icon}</span>
                  <span>{d.nameKo}</span>
                </button>
              ))}
            </div>

            {selectedDomainFilter && DOMAIN_REGISTRY[selectedDomainFilter as keyof typeof DOMAIN_REGISTRY] && (
              <p className="text-[9px] text-indigo-200/90 bg-indigo-950/60 p-1.5 rounded border border-indigo-500/30">
                💡 핵심어: {DOMAIN_REGISTRY[selectedDomainFilter as keyof typeof DOMAIN_REGISTRY].keywords.slice(0, 6).join(', ')}...
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveKey}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 rounded-lg transition shadow-md"
          >
            저장 및 즉시 연결 (Connect)
          </button>
        </div>
      )}

      {/* Error Callout */}
      {error && (
        <div className="absolute top-12 left-2 right-2 bg-red-950/95 border border-red-500/60 p-2.5 rounded-xl shadow-2xl z-30 flex items-start justify-between gap-2 text-xs text-red-200 animate-in fade-in duration-150">
          <div className="flex items-start gap-1.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="leading-tight">
              <p className="font-bold text-red-300">음성 통화 연결 오류:</p>
              <p className="text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-white font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
export default GptLiveVoiceWidget;
