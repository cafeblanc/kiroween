// Standalone Voice Module Test Lab
// A dedicated test application created specifically for testing natural voice chat with 20 Domain AI Knowledge.

import React, { useState, useRef, useEffect } from 'react';
import { GptLiveVoiceWidget } from './GptLiveVoiceWidget';
import { DomainCategory, DOMAIN_REGISTRY, DomainMeta, DomainKnowledgeRouter } from './domainRouter';
import { VoiceStatus, VoiceToolDefinition, GptLiveVoiceWidgetHandle } from './types';
import { Language } from '../../types';
import { buildVoiceInstructions } from './voicePromptBuilder';
import { speakLocalizedText } from './ttsSpeaker';

interface VoiceLabAppProps {
  lang?: Language;
}

interface TestLog {
  id: string;
  time: string;
  type: 'info' | 'user' | 'agent' | 'domain' | 'tool' | 'error';
  content: string;
  isStreaming?: boolean;
}

const TEST_TOOLS: VoiceToolDefinition[] = [
  {
    name: 'test_action_trigger',
    description: 'Trigger a test action or simulated reservation/research for verification',
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

// 20 Specialized Domain Test Prompts (Exclusively Academic & Professional Knowledge)
const DOMAIN_TEST_PROMPTS: Array<{ domain: DomainCategory; label: string; prompt: string }> = [
  { domain: 'science', label: '🔬 과학', prompt: '과학적으로 효소의 기질 특이성과 분해 메커니즘을 설명해줘' },
  { domain: 'math', label: '📐 수학', prompt: '수학적으로 황금비와 피보나치 수열의 관계를 증명해줘' },
  { domain: 'astronomy', label: '🌌 천문', prompt: '천문학 관점에서 블랙홀 사건의 지평선과 강착원반을 설명해줘' },
  { domain: 'fortune', label: '🔮 운세/점', prompt: '동양 철학 오행의 관점에서 오늘의 길운과 조화로운 기운을 풀어줘' },
  { domain: 'philosophy', label: '🏛️ 철학', prompt: '철학적으로 실존주의와 니체의 초인 사상을 연결해서 설명해줘' },
  { domain: 'psychology', label: '🧠 심리학', prompt: '심리학적으로 인지 부조화와 확증 편향이 일어나는 원인은 뭐야?' },
  { domain: 'nature', label: '🌿 자연', prompt: '자연현상 중 엘니뇨와 라니냐의 대기 순환 원리를 설명해줘' },
  { domain: 'medicine', label: '🩺 의학', prompt: '의학적으로 항산화 성분이 활성산소를 억제하고 세포 노화를 방지하는 원리는?' },
  { domain: 'physics', label: '⚛️ 물리', prompt: '물리학적으로 비뉴턴 유체의 점성과 전단 응력 관계를 설명해줘' },
  { domain: 'literature', label: '📚 문학', prompt: '문학적으로 고전 문학에서 달콤함과 은유가 지닌 상징성을 분석해줘' },
  { domain: 'history', label: '📜 역사', prompt: '역사적으로 실크로드를 통한 동서양 문화 및 교역의 발전 과정을 알려줘' },
  { domain: 'fashion', label: '👗 패션', prompt: '올가을 트렌드에 어울리는 톤온톤 패션 코디와 원단 매칭을 추천해줘' },
  { domain: 'accessories', label: '💍 악세서리', prompt: '악세서리와 소품 스타일링에서 전통 매듭과 모던 주얼리의 포인트 연출법은?' },
  { domain: 'legal', label: '⚖️ 법률/특허', prompt: '법률적으로 AI 창작물의 저작권 인정 여부와 특허 보호 요건은?' },
  { domain: 'finance', label: '📈 금융/투자', prompt: '경제 금융 관점에서 인플레이션 시기 실물 자산 가치 방어 전략은?' },
  { domain: 'tech', label: '💻 IT/AI', prompt: 'IT 기술 관점에서 WebRTC 초저지연 오디오 스트리밍과 VAD 원리는?' },
  { domain: 'culinary', label: '🍳 요리/미식', prompt: '요리 미식 관점에서 마이야르 반응의 최적 온도와 풍미 극대화 비법은?' },
  { domain: 'pets', label: '🐾 반려동물', prompt: '수의학적으로 강아지와 고양이의 필수 영양소 대사 차이점은?' },
  { domain: 'travel', label: '✈️ 여행/문화', prompt: '여행 문화 관점에서 역사와 자연이 어우러진 힐링 투어 코스를 추천해줘' },
  { domain: 'environment', label: '🌱 환경/생태', prompt: '환경 생태 관점에서 생물 다양성 보존과 ESG 탄소 순환 경제의 연관성은?' }
];

const speakLocalized = (text: string, lang: Language = 'ko') => {
  speakLocalizedText(text, lang);
};

export const VoiceLabApp: React.FC<VoiceLabAppProps> = ({
  lang: initialLang = 'ko'
}) => {
  const [lang, setLang] = useState<Language>(initialLang);
  const [logs, setLogs] = useState<TestLog[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      content: '🎙️ gpt-realtime 음성 대화 랩이 준비되었습니다. 마이크 버튼을 눌러 말하거나 좌측 20개 전문 도메인 질문을 클릭하세요.'
    }
  ]);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [activeDomain, setActiveDomain] = useState<DomainCategory>('general');
  const [textInput, setTextInput] = useState('');

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const voiceWidgetRef = useRef<GptLiveVoiceWidgetHandle | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: TestLog['type'], content: string) => {
    setLogs(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.type === type && (last.content === content || last.content.trim() === content.trim())) {
          return prev;
        }
      }
      return [
        ...prev,
        {
          id: Date.now() + Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          type,
          content
        }
      ];
    });
  };

  const handleTranscript = (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => {
    if (!text || !text.trim()) return;
    if (domain && domain !== 'general') {
      setActiveDomain(domain);
    }
    const senderLabel = sender === 'user' ? 'user' : 'agent';
    addLog(senderLabel, text.trim());
  };

  const handleTranscriptStream = (
    _sender: 'agent',
    delta: string,
    fullText: string,
    domain?: DomainCategory
  ) => {
    if (domain && domain !== 'general') {
      setActiveDomain(domain);
    }

    if (!delta && !fullText) {
      setLogs(prev => [
        ...prev,
        {
          id: 'stream-' + Date.now(),
          time: new Date().toLocaleTimeString(),
          type: 'agent',
          content: '',
          isStreaming: true
        }
      ]);
      return;
    }

    setLogs(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].type === 'agent' && copy[i].isStreaming) {
          copy[i] = {
            ...copy[i],
            content: fullText,
            isStreaming: true
          };
          return copy;
        }
      }
      return [
        ...prev,
        {
          id: 'stream-' + Date.now(),
          time: new Date().toLocaleTimeString(),
          type: 'agent',
          content: fullText,
          isStreaming: true
        }
      ];
    });
  };

  const handleDomainDetected = (domain: DomainCategory, meta: DomainMeta, query: string) => {
    setActiveDomain(domain);
    addLog('domain', `🎯 [분야 자동 감지]: ${meta.icon} ${meta.nameKo} (${meta.nameEn}) - 핵심어 분석 완료: "${query}"`);
  };

  const handleSimulateQuestion = (prompt: string) => {
    addLog('user', `나(User): "${prompt}"`);

    const detected = DomainKnowledgeRouter.detectDomain(prompt);
    setActiveDomain(detected.domain);
    addLog('domain', `🎯 [파악된 분야]: ${detected.meta.icon} ${detected.meta.nameKo} - 질문 분석 완료`);

    const expertAnswer = DomainKnowledgeRouter.resolveDomainKnowledge(detected.domain, prompt, undefined, lang);
    setTimeout(() => {
      addLog('agent', `gpt-realtime: [${detected.meta.icon} ${detected.meta.nameKo}] ${expertAnswer}`);
      speakLocalized(expertAnswer, lang);
    }, 250);
  };

  const handleQuestionClick = (prompt: string) => {
    if (voiceWidgetRef.current?.isVoiceActive) {
      addLog('user', `나(User): "${prompt}"`);
      voiceWidgetRef.current.sendTextMessage(prompt);
    } else {
      handleSimulateQuestion(prompt);
    }
  };

  const handleToolCall = (toolName: string, args: Record<string, any>) => {
    const alertMsg = `⚡ [Tool Triggered]: ${toolName} -> ${JSON.stringify(args)}`;
    addLog('tool', alertMsg);
  };

  const handleError = (error: string) => {
    addLog('error', `⚠️ 에러 발생: ${error}`);
  };

  const systemInstruction = buildVoiceInstructions(lang);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* Top Voice Control Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎙️</span>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
              gpt-realtime 음성 대화 랩 (Voice Lab)
            </h1>
            <p className="text-[10px] text-slate-400">
              실시간 WebRTC Full-Duplex · 20개 전문 도메인 AI
            </p>
          </div>
        </div>

        {/* Center: Domain Indicator */}
        <div className="flex items-center gap-2">
          {activeDomain !== 'general' && DOMAIN_REGISTRY[activeDomain] && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-400/60 text-purple-200 px-3 py-1 rounded-full text-xs font-bold shadow animate-in fade-in">
              <span>{DOMAIN_REGISTRY[activeDomain].icon}</span>
              <span>분야: <strong className="text-white">{DOMAIN_REGISTRY[activeDomain].nameKo}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Language Selector & Voice Widget Controls */}
        <div className="flex items-center gap-2">
          {/* Active UI Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-purple-500/30 rounded-xl px-2.5 py-1 shadow-inner">
            <span className="text-xs text-purple-300">🌐</span>
            <select
              value={lang}
              onChange={e => setLang(e.target.value as Language)}
              className="bg-transparent text-xs text-purple-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ko" className="bg-slate-900">한국어 (KO)</option>
              <option value="en" className="bg-slate-900">English (EN)</option>
              <option value="ja" className="bg-slate-900">日本語 (JA)</option>
              <option value="zh" className="bg-slate-900">中文 (ZH)</option>
              <option value="es" className="bg-slate-900">Español (ES)</option>
              <option value="fr" className="bg-slate-900">Français (FR)</option>
            </select>
          </div>

          {/* Standalone Voice Widget Injected */}
          <GptLiveVoiceWidget
            ref={voiceWidgetRef}
            systemInstruction={systemInstruction}
            tools={TEST_TOOLS}
            enableDomainSearch={true}
            lang={lang}
            onStatusChange={status => {
              setVoiceStatus(status);
              if (status === 'connected') {
                addLog('info', '✅ gpt-realtime WebRTC 음성 세션이 연결되었습니다. 마이크로 질문을 자유롭게 말씀해 보세요!');
              } else if (status === 'idle') {
                addLog('info', '⏹️ gpt-realtime 세션이 종료되었습니다.');
              }
            }}
            onTranscript={handleTranscript}
            onTranscriptStream={handleTranscriptStream}
            onDomainDetected={handleDomainDetected}
            onToolCall={handleToolCall}
            onError={handleError}
          />
        </div>
      </div>

      {/* Main Lab Workspace: Responsive Side-by-Side Split */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
        
        {/* Left: 20 Domain Knowledge Panel (w-full md:w-5/12) */}
        <section className="w-full md:w-5/12 h-[42%] md:h-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-0">
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🎯</span>
              <h2 className="text-xs font-bold text-purple-300">20개 전문 도메인 AI 질문 세트</h2>
            </div>
            <span className="text-[10px] text-slate-400">클릭 시 즉시 질문 전송</span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5 min-h-0">
            <div className="grid grid-cols-1 gap-1.5">
              {DOMAIN_TEST_PROMPTS.map(item => (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => handleQuestionClick(item.prompt)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer w-full hover:scale-[1.01] active:scale-[0.99] ${
                    activeDomain === item.domain
                      ? 'bg-purple-950/90 border-purple-400 text-white ring-2 ring-purple-400/50 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {activeDomain === item.domain && (
                        <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                          현재 감지됨
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] bg-purple-900/50 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-bold hover:bg-purple-600 hover:text-white transition">
                      질문 전송 🚀
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-300 truncate w-full">
                    "{item.prompt}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Live WebRTC & Transcript Stream Console (w-full md:w-7/12) */}
        <section className="w-full md:w-7/12 h-[58%] md:h-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-0">
          
          {/* Status Bar */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                voiceStatus === 'connected' || voiceStatus === 'speaking' || voiceStatus === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : voiceStatus === 'connecting'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-600'
              }`} />
              <span className="text-xs font-bold text-white">
                WebRTC 상태: <span className="text-purple-400 uppercase font-mono">{voiceStatus}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">실시간 대화 로그 & 음성 자막 창</span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 transition cursor-pointer font-semibold"
              >
                🗑️ 지우기
              </button>
            </div>
          </div>

          {/* Live Transcript & Log Console Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs bg-slate-950/70 scroll-smooth min-h-0">
            {logs.map(log => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border leading-relaxed animate-in fade-in duration-150 ${
                  log.type === 'user'
                    ? 'bg-purple-950/80 border-purple-500/60 text-purple-100 shadow-md'
                    : log.type === 'agent'
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-md'
                    : log.type === 'domain'
                    ? 'bg-indigo-950/90 border-indigo-500/60 text-indigo-300 font-bold'
                    : log.type === 'tool'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 font-bold'
                    : log.type === 'error'
                    ? 'bg-red-950/90 border-red-500/60 text-red-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] opacity-70 mb-1">
                  <span className="font-bold">
                    {log.type === 'user'
                      ? '👤 나 (User)'
                      : log.type === 'agent'
                      ? '🤖 gpt-realtime'
                      : log.type === 'domain'
                      ? '🎯 도메인 엔진'
                      : log.type.toUpperCase()}
                  </span>
                  <span>{log.time}</span>
                </div>
                <div className="font-sans text-xs break-words leading-relaxed">
                  {log.content}
                  {log.type === 'agent' && log.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Text Question Input Bar for gpt-realtime */}
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!textInput.trim()) return;
              const q = textInput.trim();
              setTextInput('');

              if (voiceWidgetRef.current?.isVoiceActive) {
                addLog('user', `나(User): "${q}"`);
                voiceWidgetRef.current.sendTextMessage(q);
              } else {
                handleSimulateQuestion(q);
              }
            }}
            className="p-2 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="gpt-realtime과 대화할 질문을 입력하세요 (엔터 또는 전송 클릭)..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1 shrink-0"
            >
              <span>전송</span>
              <span>🚀</span>
            </button>
          </form>

          {/* Console Footer */}
          <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
            <span>OpenAI Realtime GA Engine (gpt-realtime /v1/realtime/calls)</span>
            <span>마이크로 말하거나 좌측 20개 전문 도메인 질문을 클릭하세요</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default VoiceLabApp;
