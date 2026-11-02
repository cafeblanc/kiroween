// Standalone UI Widget for gpt-live WebRTC Voice Call with Domain-Optimized Intelligence
// Pure In/Out contract: accepts systemInstruction & tools in, emits onTranscript & onToolCall out.

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { GptLiveVoiceWidgetProps, GptLiveVoiceWidgetHandle, DOMAIN_REGISTRY, AudioDeviceOption } from './types';
import { useGptLiveVoice, enumerateHearingDevices } from './useGptLiveVoice';

export const GptLiveVoiceWidget = forwardRef<GptLiveVoiceWidgetHandle, GptLiveVoiceWidgetProps>(({
  apiKey,
  systemInstruction,
  model,
  voiceName,
  tools,
  enableDomainSearch = true,
  className = '',
  onDomainSearch,
  onTranscript,
  onTranscriptStream,
  onToolCall,
  onStatusChange,
  onDomainDetected,
  onError,
  onAudioLevel
}, ref) => {
  const [localKey, setLocalKey] = useState(() => apiKey || localStorage.getItem('kiroween_openai_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  // Audio Device States
  const [inputDevices, setInputDevices] = useState<AudioDeviceOption[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedInput, setSelectedInput] = useState(() => localStorage.getItem('kiroween_audio_input_device') || '');
  const [selectedOutput, setSelectedOutput] = useState(() => localStorage.getItem('kiroween_audio_output_device') || '');
  const [detectedHearingAid, setDetectedHearingAid] = useState<{ label: string } | null>(null);

  // Refresh audio devices
  const refreshDevices = async () => {
    try {
      const res = await enumerateHearingDevices();
      setInputDevices(res.inputs);
      setOutputDevices(res.outputs);
      if (res.detectedHearingAid) {
        setDetectedHearingAid({ label: res.detectedHearingAid.label });
      }
    } catch (e) {
      console.warn('Device scan notice:', e);
    }
  };

  useEffect(() => {
    refreshDevices();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, []);

  const {
    status,
    isVoiceActive,
    error,
    activeDomain,
    startVoice,
    stopVoice,
    sendTextMessage,
    setError
  } = useGptLiveVoice({
    apiKey: localKey,
    systemInstruction,
    model,
    voiceName,
    tools,
    enableDomainSearch,
    inputDeviceId: selectedInput,
    outputDeviceId: selectedOutput,
    onDomainSearch,
    onTranscript,
    onTranscriptStream,
    onToolCall,
    onStatusChange,
    onDomainDetected,
    onError,
    onAudioLevel
  });

  useImperativeHandle(ref, () => ({
    startVoice,
    stopVoice,
    sendTextMessage,
    isVoiceActive,
    status
  }), [startVoice, stopVoice, sendTextMessage, isVoiceActive, status]);

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

  const handleSelectInput = (deviceId: string) => {
    setSelectedInput(deviceId);
    if (deviceId) {
      localStorage.setItem('kiroween_audio_input_device', deviceId);
    } else {
      localStorage.removeItem('kiroween_audio_input_device');
    }
  };

  const handleSelectOutput = (deviceId: string) => {
    setSelectedOutput(deviceId);
    if (deviceId) {
      localStorage.setItem('kiroween_audio_output_device', deviceId);
    } else {
      localStorage.removeItem('kiroween_audio_output_device');
    }
  };

  const currentDomainMeta = activeDomain && activeDomain !== 'general' ? DOMAIN_REGISTRY[activeDomain] : null;

  return (
    <div className={`flex flex-col select-none relative ${className}`}>
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

        {/* Hearing Aid / Bluetooth Status Pill */}
        <button
          type="button"
          onClick={() => {
            refreshDevices();
            setShowDeviceModal(prev => !prev);
          }}
          className={`text-[11px] px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 border ${
            detectedHearingAid || selectedOutput || selectedInput
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/90'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="보청기 / 블루투스 오디오 장치 설정"
        >
          <span>🦻</span>
          <span>{detectedHearingAid ? '보청기 연결됨' : '오디오 설정'}</span>
        </button>

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

      {/* Audio Device & Hearing Aid Modal */}
      {showDeviceModal && (
        <div className="absolute top-12 right-2 bg-slate-950 border border-emerald-500/50 p-4 rounded-xl shadow-2xl z-40 w-84 flex flex-col gap-3 animate-in slide-in-from-top duration-150 text-xs">
          <div className="flex items-center justify-between font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <span>🦻</span>
              <span>보청기 / 블루투스 오디오 설정</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDeviceModal(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 text-[11px] text-emerald-200 leading-relaxed">
            <p className="font-semibold text-emerald-300 mb-1">
              ✅ 보청기 헤드셋 활용 완벽 지원
            </p>
            <p className="text-slate-300">
              유튜브 시청 시 보청기로 소리가 들린다면, PC나 모바일의 기본 오디오 출력이 이미 보청기로 연결되어 있습니다. 본 음성 대화 또한 보청기로 직접 전송되어 스피커 하울링 없이 매우 선명하게 들으실 수 있습니다.
            </p>
          </div>

          {/* Output Selector (Hearing aid / Speakers) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>🎧 소리 출력 (보청기 / 이어폰 / 스피커):</span>
              <button
                type="button"
                onClick={refreshDevices}
                className="text-[10px] text-purple-400 hover:underline"
              >
                새로고침
              </button>
            </label>
            <select
              value={selectedOutput}
              onChange={e => handleSelectOutput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 truncate"
            >
              <option value="">시스템 기본 출력 (유튜브와 동일하게 보청기로 출력)</option>
              {outputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.isHearingAidOrBluetooth ? '🦻 [블루투스/보청기] ' : '🔈 '}
                  {d.label || `스피커 (${d.deviceId.slice(0, 6)})`}
                </option>
              ))}
            </select>
          </div>

          {/* Input Selector (Mic) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-300">
              🎙️ 마이크 입력:
            </label>
            <select
              value={selectedInput}
              onChange={e => handleSelectInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 truncate"
            >
              <option value="">시스템 기본 마이크 (권장)</option>
              {inputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.isHearingAidOrBluetooth ? '🦻 [블루투스] ' : '🎤 '}
                  {d.label || `마이크 (${d.deviceId.slice(0, 6)})`}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowDeviceModal(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition shadow-md cursor-pointer mt-1"
          >
            설정 저장 및 닫기
          </button>
        </div>
      )}

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
            별도로 분야를 선택하실 필요 없이, <strong>말씀하시는 질문의 핵심어를 gpt-live가 실시간 분석</strong>하여 20개 전문 분야(과학·수학·의학·운세 등)를 자동 파악하고 답변합니다.
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
});
GptLiveVoiceWidget.displayName = 'GptLiveVoiceWidget';
export default GptLiveVoiceWidget;
