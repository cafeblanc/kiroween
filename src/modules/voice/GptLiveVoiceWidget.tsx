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
      {/* Control Strip: Clean, Single-click Start/Stop & Auto-Domain Badge */}
      <div className="flex items-center gap-2">
        {/* Realtime Auto-Detected Domain Badge */}
        {currentDomainMeta && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border border-purple-400/60 text-purple-100 px-2.5 py-1 rounded-full text-xs font-bold animate-in fade-in duration-200 shadow-md">
            <span>{currentDomainMeta.icon}</span>
            <span>분야: <strong className="text-white">{currentDomainMeta.nameKo}</strong></span>
            {status === 'speaking' ? (
              <span className="text-[10px] text-emerald-300 font-normal">· 답변 중</span>
            ) : status === 'listening' ? (
              <span className="text-[10px] text-yellow-300 font-normal">· 경청 중</span>
            ) : (
              <span className="text-[10px] text-indigo-300 font-normal">· 최적화 준비됨</span>
            )}
          </div>
        )}

        {/* API Key Modal Button */}
        <button
          type="button"
          onClick={() => setShowKeyModal(prev => !prev)}
          className="text-[11px] bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          title="OpenAI API Key 설정"
        >
          <span>🔑</span>
          <span>{localKey ? 'Key 등록됨' : 'Key 등록'}</span>
        </button>

        {/* Main Single Start / Stop Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
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
              ? '발화 중 (끼어들기 가능)'
              : status === 'listening'
              ? '질문 듣는 중...'
              : isVoiceActive
              ? '통화 종료 (Stop)'
              : '음성 대화 시작 (Start Voice)'}
          </span>
        </button>
      </div>

      {/* Floating Settings Drawer: Clean Key Input only */}
      {showKeyModal && (
        <div className="absolute top-12 right-2 bg-slate-950 border border-purple-500/50 p-3.5 rounded-xl shadow-2xl z-40 w-80 flex flex-col gap-3 animate-in slide-in-from-top duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span>OpenAI API Key 설정</span>
            <button
              type="button"
              onClick={() => setShowKeyModal(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            별도로 분야를 선택하실 필요 없이, <strong>말씀하시는 질문의 핵심어를 gpt-live가 실시간 분석</strong>하여 13개 전문 분야(과학·수학·의학·운세 등)를 자동 파악하고 답변합니다.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold">OpenAI API Key (GA WebRTC /v1/realtime/calls):</label>
            <input
              type="password"
              value={localKey}
              onChange={e => setLocalKey(e.target.value)}
              placeholder="sk-proj-..."
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveKey}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 rounded-lg transition shadow-md cursor-pointer"
          >
            저장 및 즉시 음성 대화 시작
          </button>
        </div>
      )}

      {/* Error Callout */}
      {error && (
        <div className="absolute top-12 left-2 right-2 bg-red-950/95 border border-red-500/60 p-2.5 rounded-xl shadow-2xl z-40 flex items-start justify-between gap-2 text-xs text-red-200 animate-in fade-in duration-150">
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
            className="text-red-400 hover:text-white font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
export default GptLiveVoiceWidget;
