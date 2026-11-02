// Standalone Voice Module Test Lab
// A dedicated test application created specifically to test the standalone voice module in complete isolation.

import React, { useState, useRef, useEffect } from 'react';
import { GptLiveVoiceWidget } from './GptLiveVoiceWidget';
import { DomainCategory, DOMAIN_REGISTRY, DomainMeta, DomainKnowledgeRouter } from './domainRouter';
import { VoiceStatus, VoiceToolDefinition } from './types';

interface VoiceLabAppProps {
  onBackToMain?: () => void;
}

interface TestLog {
  id: string;
  time: string;
  type: 'info' | 'user' | 'agent' | 'domain' | 'tool' | 'error';
  content: string;
}

const TEST_TOOLS: VoiceToolDefinition[] = [
  {
    name: 'test_action_trigger',
    description: 'Trigger a test action or simulated reservation/order for verification',
    parameters: {
      type: 'object',
      properties: {
        actionName: { type: 'string', description: 'Name of the action' },
        details: { type: 'string', description: 'Details or reason' }
      },
      required: ['actionName']
    }
  }
];

const DOMAIN_TEST_PROMPTS: Array<{ domain: DomainCategory; label: string; prompt: string }> = [
  { domain: 'science', label: '🔬 과학', prompt: '과학적으로 효소의 기질 특이성과 분해 메커니즘을 설명해줘' },
  { domain: 'math', label: '📐 수학', prompt: '수학적으로 황금비와 피보나치 수열의 관계를 증명해줘' },
  { domain: 'astronomy', label: '🌌 천문', prompt: '천문학 관점에서 블랙홀 사건의 지평선과 강착원반을 설명해줘' },
  { domain: 'fortune', label: '🔮 운세/점', prompt: '오늘 내 일진과 황금빛 기운의 재물운을 점쳐줘' },
  { domain: 'philosophy', label: '🏛️ 철학', prompt: '철학적으로 실존주의와 니체의 초인 사상을 연결해서 설명해줘' },
  { domain: 'psychology', label: '🧠 심리학', prompt: '심리학적으로 인지 부조화와 확증 편향이 일어나는 원인은 뭐야?' },
  { domain: 'nature', label: '🌿 자연', prompt: '자연현상 중 엘니뇨와 라니냐의 대기 순환 원리를 설명해줘' },
  { domain: 'medicine', label: '🩺 의학', prompt: '의학적으로 천연 꿀의 항산화 성분과 혈당 대사에 미치는 영향은?' },
  { domain: 'physics', label: '⚛️ 물리', prompt: '물리학적으로 비뉴턴 유체의 점성과 전단 응력 관계를 설명해줘' },
  { domain: 'literature', label: '📚 문학', prompt: '문학적으로 고전 문학에서 달콤함과 은유가 지닌 상징성을 분석해줘' },
  { domain: 'history', label: '📜 역사', prompt: '역사적으로 조선시대 왕실 진상품과 민간 교역의 유래를 알려줘' },
  { domain: 'fashion', label: '👗 패션', prompt: '올가을 트렌드에 어울리는 톤온톤 패션 코디와 원단 매칭을 추천해줘' },
  { domain: 'accessories', label: '💍 악세서리', prompt: '악세서리와 소품 스타일링에서 전통 보자기 매듭의 포인트 연출법은?' },
  { domain: 'legal', label: '⚖️ 법률/특허', prompt: '법률적으로 전자상거래 원산지 표시 규정과 특허 보호 요건은?' },
  { domain: 'finance', label: '📈 금융/투자', prompt: '경제 금융 관점에서 인플레이션 시기 실물 자산 가치 방어 전략은?' },
  { domain: 'tech', label: '💻 IT/AI', prompt: 'IT 기술 관점에서 WebRTC 초저지연 오디오 스트리밍과 VAD 원리는?' },
  { domain: 'culinary', label: '🍳 요리/미식', prompt: '요리 미식 관점에서 마이야르 반응과 천연 꿀의 고메 페어링 비법은?' },
  { domain: 'pets', label: '🐾 반려동물', prompt: '수의학적으로 강아지나 고양이에게 천연 꿀을 급여할 때 주의사항은?' },
  { domain: 'travel', label: '✈️ 여행/문화', prompt: '여행 문화 관점에서 양평 두물머리와 용문산 힐링 투어 코스 추천해줘' },
  { domain: 'environment', label: '🌱 환경/생태', prompt: '환경 생태 관점에서 꿀벌 보호와 ESG 탄소 순환 경제의 연관성은?' }
];

export const VoiceLabApp: React.FC<VoiceLabAppProps> = ({ onBackToMain }) => {
  const [logs, setLogs] = useState<TestLog[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      content: '🎙️ Voice Module Standalone Test Lab initialized. Ready for domain queries & WebRTC testing.'
    }
  ]);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [activeDomain, setActiveDomain] = useState<DomainCategory>('general');
  const [toolAlert, setToolAlert] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: TestLog['type'], content: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Date.now() + Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        type,
        content
      }
    ]);
  };

  const handleTranscript = (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => {
    if (sender === 'user') {
      addLog('user', `나(User): "${text}"`);
    } else {
      const domText = domain && domain !== 'general' ? `[${domain}] ` : '';
      addLog('agent', `gpt-live: ${domText}${text}`);
    }
  };

  const handleDomainDetected = (domain: DomainCategory, meta: DomainMeta, query: string) => {
    setActiveDomain(domain);
    addLog('domain', `🎯 [분야 자동 감지]: ${meta.icon} ${meta.nameKo} (${meta.nameEn}) - 핵심어 분석 완료: "${query}" (최적화 답변 준비 중...)`);
  };

  const handleSimulateQuestion = (prompt: string) => {
    addLog('user', `나(User): "${prompt}"`);
    const detected = DomainKnowledgeRouter.detectDomain(prompt);
    setActiveDomain(detected.domain);
    addLog('domain', `🎯 [파악된 분야]: ${detected.meta.icon} ${detected.meta.nameKo} - 질문 핵심어 자동 분리 완료 (답변 생성 중...)`);

    const expertAnswer = DomainKnowledgeRouter.resolveDomainKnowledge(detected.domain, prompt);
    setTimeout(() => {
      addLog('agent', `gpt-live: [${detected.meta.icon} ${detected.meta.nameKo} 최적화 답변] ${expertAnswer}`);
    }, 400);
  };

  const handleToolCall = (toolName: string, args: Record<string, any>) => {
    const alertMsg = `⚡ [Tool Triggered]: ${toolName} -> ${JSON.stringify(args)}`;
    setToolAlert(alertMsg);
    addLog('tool', alertMsg);
    setTimeout(() => setToolAlert(null), 5000);
  };

  const handleError = (error: string) => {
    addLog('error', `⚠️ 에러 발생: ${error}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* Top Header */}
      <header className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎙️</span>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
              gpt-live-1 Standalone Voice Module Test Lab
            </h1>
            <p className="text-[11px] text-slate-400">
              100% 완전 독립 음성 모듈 검증 · 13개 전문 도메인 최적화 검색 및 발화 테스트베드
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBackToMain && (
            <button
              type="button"
              onClick={onBackToMain}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>📺</span>
              <span>메인 라이브 방송으로 복귀</span>
            </button>
          )}

          {/* Standalone Voice Widget Injected */}
          <GptLiveVoiceWidget
            systemInstruction="You are an omni-expert AI voice consultant in a standalone test lab. You answer questions across science, math, astronomy, fortune, philosophy, psychology, nature, medicine, physics, literature, history, fashion, and accessories with high intellectual depth, clarity, and lively spoken turns. Call test_action_trigger when requested."
            tools={TEST_TOOLS}
            enableDomainSearch={true}
            onStatusChange={status => {
              setVoiceStatus(status);
              addLog('info', `상태 변경: ${status}`);
            }}
            onTranscript={handleTranscript}
            onDomainDetected={handleDomainDetected}
            onToolCall={handleToolCall}
            onError={handleError}
          />
        </div>
      </header>

      {/* Main Lab Workspace */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        
        {/* Left: 13 Domain Quick-Test Panel (lg:col-span-5) */}
        <section className="lg:col-span-5 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-0">
          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <h2 className="text-xs font-bold text-purple-300">13개 전문 분야 질문 테스트 세트</h2>
            </div>
            <span className="text-[10px] text-slate-400">마이크로 직접 말하거나 클릭하여 테스트</span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
              💡 아래의 질문들은 <span className="text-purple-300 font-bold">핵심어(과학, 의학, 역사, 운세 등)</span>에 따라 음성 모듈 내부의 <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 text-[10px]">DomainKnowledgeRouter</code>가 자동으로 최적화 검색을 분기 수행합니다.
            </p>

            <div className="grid grid-cols-1 gap-1.5">
              {DOMAIN_TEST_PROMPTS.map(item => (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => handleSimulateQuestion(item.prompt)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer w-full hover:scale-[1.01] active:scale-[0.99] ${
                    activeDomain === item.domain
                      ? 'bg-purple-950/90 border-purple-400 text-white ring-2 ring-purple-400/50 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {activeDomain === item.domain && (
                        <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                          현재 감지됨
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] bg-purple-900/40 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-bold hover:bg-purple-600 hover:text-white transition">
                      질문 전송 🚀
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-200 mt-0.5">
                    "{item.prompt}"
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Tool Action Call Card */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">도구 호출 테스트: "액션 트리거해줘"</span>
            <button
              type="button"
              onClick={() => handleToolCall('test_action_trigger', { actionName: 'InstantLabTest', timestamp: Date.now() })}
              className="bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
            >
              ⚡ 도구 수동 실행
            </button>
          </div>
        </section>

        {/* Right: Live WebRTC & Transcript Stream Console (lg:col-span-7) */}
        <section className="lg:col-span-7 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-0">
          
          {/* Status & Active Domain Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                voiceStatus === 'connected' || voiceStatus === 'speaking' || voiceStatus === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : voiceStatus === 'connecting'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-600'
              }`} />
              <span className="text-xs font-bold text-white">
                실시간 WebRTC 상태: <span className="text-purple-400 uppercase font-mono">{voiceStatus}</span>
              </span>
            </div>

            {activeDomain !== 'general' && DOMAIN_REGISTRY[activeDomain] && (
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-in fade-in">
                <span>{DOMAIN_REGISTRY[activeDomain].icon}</span>
                <span>{DOMAIN_REGISTRY[activeDomain].nameKo} 최적화 엔진 동작 중</span>
              </span>
            )}
          </div>

          {/* Action Alert Banner */}
          {toolAlert && (
            <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-2.5 text-xs text-emerald-300 flex items-center justify-between animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span className="font-mono font-bold">{toolAlert}</span>
              </div>
              <button
                type="button"
                onClick={() => setToolAlert(null)}
                className="text-emerald-400 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Live Transcript & Log Console Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 font-mono text-xs bg-slate-950/60 scroll-smooth">
            {logs.map(log => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border leading-relaxed animate-in fade-in duration-150 ${
                  log.type === 'user'
                    ? 'bg-purple-950/70 border-purple-500/50 text-purple-200'
                    : log.type === 'agent'
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : log.type === 'domain'
                    ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300 font-bold'
                    : log.type === 'tool'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold'
                    : log.type === 'error'
                    ? 'bg-red-950/80 border-red-500/60 text-red-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-60 mb-1">
                  <span>[{log.type.toUpperCase()}]</span>
                  <span>{log.time}</span>
                </div>
                <div className="font-sans text-xs break-words">{log.content}</div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Console Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
            <span>OpenAI Realtime GA Engine (/v1/realtime/calls)</span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="hover:text-slate-300 transition text-[11px]"
            >
              🗑️ 로그 지우기 (Clear)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
export default VoiceLabApp;
