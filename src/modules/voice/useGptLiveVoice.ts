// Headless Hook for gpt-live WebRTC Full-Duplex Voice Engine with Specialized Domain Optimization
// Pure standalone implementation with zero dependencies on domain business logic.

import { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceStatus, VoiceToolDefinition, DomainCategory, DomainMeta } from './types';
import { DomainKnowledgeRouter } from './domainRouter';

export interface UseGptLiveVoiceOptions {
  apiKey?: string;
  systemInstruction: string;
  model?: string;
  voiceName?: string;
  tools?: VoiceToolDefinition[];
  enableDomainSearch?: boolean;
  inputDeviceId?: string;
  outputDeviceId?: string;
  onDomainSearch?: (domain: DomainCategory, query: string) => Promise<string> | string;
  onTranscript?: (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => void;
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<any> | void;
  onStatusChange?: (status: VoiceStatus) => void;
  onDomainDetected?: (domain: DomainCategory, meta: DomainMeta, query: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

export function useGptLiveVoice(options: UseGptLiveVoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [activeDomain, setActiveDomain] = useState<DomainCategory>('general');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    if (newStatus === 'disconnected' as any || newStatus === 'idle') {
      setIsVoiceActive(false);
    } else if (newStatus === 'connected' || newStatus === 'speaking' || newStatus === 'listening') {
      setIsVoiceActive(true);
    }
    optionsRef.current.onStatusChange?.(newStatus);
  }, []);

  const reportError = useCallback((errText: string) => {
    setError(errText);
    updateStatus('error');
    optionsRef.current.onError?.(errText);
  }, [updateStatus]);

  const setupVisualizer = (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);

      const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
      const loop = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setAudioLevel(avg);
          optionsRef.current.onAudioLevel?.(avg);
        }
        animFrameIdRef.current = requestAnimationFrame(loop);
      };
      animFrameIdRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.warn('[useGptLiveVoice] Visualizer init notice:', e);
    }
  };

  const stopVoice = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    setAudioLevel(0);
    setIsVoiceActive(false);
    setActiveDomain('general');
    updateStatus('idle');
  }, [updateStatus]);

  const startVoice = useCallback(async (explicitKey?: string): Promise<boolean> => {
    try {
      setError(null);
      updateStatus('connecting');

      const targetKey = (explicitKey || optionsRef.current.apiKey || localStorage.getItem('kiroween_openai_api_key') || '').trim();

      if (!targetKey) {
        throw new Error('OpenAI API Key가 설정되지 않았습니다. API 키를 입력해주세요.');
      }

      // 1. Capture microphone with device selection and echo cancellation
      const targetInputId = optionsRef.current.inputDeviceId || localStorage.getItem('kiroween_audio_input_device') || '';
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      if (targetInputId) {
        audioConstraints.deviceId = { exact: targetInputId };
      }

      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });
      } catch (mediaErr: any) {
        if (targetInputId) {
          console.warn('[useGptLiveVoice] Exact input device fallback to default mic:', mediaErr);
          localStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } else {
          if (mediaErr?.name === 'NotAllowedError' || mediaErr?.message?.toLowerCase().includes('permission')) {
            throw new Error('브라우저 마이크 권한이 차단되었습니다 (Permission denied). 크롬 주소창 왼쪽의 자물쇠/설정 아이콘을 눌러 [마이크] 권한을 [허용]으로 변경해주세요.');
          }
          throw new Error('마이크 장치 접근 실패: ' + (mediaErr?.message || '마이크 장치를 찾을 수 없습니다.'));
        }
      }

      setupVisualizer(localStreamRef.current);

      // 2. Initialize WebRTC
      pcRef.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      remoteAudioRef.current = new Audio();
      remoteAudioRef.current.autoplay = true;

      const targetOutputId = optionsRef.current.outputDeviceId || localStorage.getItem('kiroween_audio_output_device') || '';
      if (targetOutputId && typeof (remoteAudioRef.current as any).setSinkId === 'function') {
        try {
          await (remoteAudioRef.current as any).setSinkId(targetOutputId);
          console.log('[useGptLiveVoice] Audio routed to hearing aid / output device:', targetOutputId);
        } catch (sinkErr) {
          console.warn('[useGptLiveVoice] setSinkId notice (routed via default):', sinkErr);
        }
      }

      pcRef.current.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      for (const track of localStreamRef.current.getAudioTracks()) {
        pcRef.current.addTrack(track, localStreamRef.current);
      }

      // 3. Create DataChannel
      dcRef.current = pcRef.current.createDataChannel('oai-events');
      setupDataChannel(dcRef.current, optionsRef.current);

      // 4. Create local SDP Offer
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // 5. Authenticate via Official OpenAI GA /v1/realtime/client_secrets
      // Note: User key supports 'gpt-realtime' / 'gpt-realtime-1.5' / 'gpt-realtime-mini'
      const primaryModel = optionsRef.current.model || 'gpt-realtime';
      const voice = optionsRef.current.voiceName || 'alloy';
      let activeBearer = targetKey;
      let usedEphemeral = false;

      try {
        const secretRes = await fetch('/api/openai/v1/realtime/client_secrets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${targetKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session: {
              type: 'realtime',
              model: primaryModel
            }
          })
        });

        if (secretRes.ok) {
          const secretData = await secretRes.json();
          const token = secretData.value || secretData.client_secret?.value;
          if (token) {
            activeBearer = token;
            usedEphemeral = true;
            console.log('[useGptLiveVoice] Ephemeral token acquired successfully:', token.slice(0, 10) + '...');
          }
        } else if (secretRes.status === 401) {
          throw new Error('OpenAI API 키 인증 실패 (401 Unauthorized): 입력하신 API 키가 유효하지 않습니다. 올바른 키를 입력해주세요.');
        } else if (secretRes.status === 403) {
          throw new Error('OpenAI 권한 거부 (403 Permission denied): 현재 API 키에 Realtime API 접근 권한이 없거나 제한된 Project 키입니다.');
        } else if (secretRes.status === 429) {
          throw new Error('OpenAI 크레딧 부족 또는 요청 제한 (429 Rate Limit/Quota Exceeded): OpenAI 유료 크레딧 잔액을 확인해주세요.');
        }
      } catch (tokenErr: any) {
        if (tokenErr.message?.includes('401') || tokenErr.message?.includes('403') || tokenErr.message?.includes('429')) {
          throw tokenErr;
        }
        console.warn('[useGptLiveVoice] Direct call token fallback notice:', tokenErr);
      }

      // 6. Send SDP Offer to Official OpenAI GA Realtime Calls Endpoint (/v1/realtime/calls)
      const gaCallsUrl = '/api/openai/v1/realtime/calls';
      let sdpResponse: Response;

      if (usedEphemeral) {
        // Ephemeral token already bound to session; send SDP offer directly
        sdpResponse = await fetch(gaCallsUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeBearer}`,
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        });
      } else {
        // Direct master key call: send multipart/form-data with sdp and session
        const formData = new FormData();
        formData.append('sdp', new Blob([offer.sdp || ''], { type: 'application/sdp' }));
        formData.append(
          'session',
          new Blob(
            [
              JSON.stringify({
                type: 'realtime',
                model: primaryModel,
                instructions: optionsRef.current.systemInstruction || 'You are an intelligent voice assistant.',
                voice: voice
              })
            ],
            { type: 'application/json' }
          )
        );

        sdpResponse = await fetch(gaCallsUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeBearer}`
          },
          body: formData
        });
      }

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        if (sdpResponse.status === 401) {
          throw new Error('OpenAI 인증 실패 (401 Unauthorized): API 키가 올바른지 확인하세요.');
        } else if (sdpResponse.status === 403) {
          throw new Error('OpenAI 권한 거부 (403 Permission denied): Realtime 모델 권한이 없는 API 키입니다.');
        } else if (sdpResponse.status === 429) {
          throw new Error('OpenAI 크레딧 부족 (429 Too Many Requests): 계정의 유료 크레딧을 확인하세요.');
        } else {
          try {
            const parsed = JSON.parse(errorText);
            throw new Error(`OpenAI Realtime 연결 오류 (${sdpResponse.status}): ${parsed.error?.message || errorText}`);
          } catch (_) {
            throw new Error(`OpenAI Realtime 연결 오류 (${sdpResponse.status}): ${errorText.slice(0, 150)}`);
          }
        }
      }

      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      };

      await pcRef.current.setRemoteDescription(answer);
      updateStatus('connected');
      return true;
    } catch (err: any) {
      console.error('[useGptLiveVoice] Connection error:', err);
      const msg = err?.message || '실시간 음성 연결에 실패했습니다.';
      reportError(msg);
      stopVoice();
      return false;
    }
  }, [reportError, stopVoice, updateStatus]);

  // DataChannel configuration with Domain-Optimized Tool
  const setupDataChannel = (dc: RTCDataChannel, currentOpts: UseGptLiveVoiceOptions) => {
    dc.onopen = () => {
      console.log('[useGptLiveVoice] DataChannel opened, sending session config with domain search');

      const toolsPayload = (currentOpts.tools || []).map(t => ({
        type: 'function',
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }));

      // Automatically inject Domain-Optimized Search tool
      if (currentOpts.enableDomainSearch !== false) {
        toolsPayload.push({
          type: 'function',
          name: 'domain_optimized_search',
          description: 'Perform deep domain-specific optimized knowledge retrieval for specialized fields: science, math, astronomy, fortune, philosophy, psychology, nature, medicine, physics, literature, history, fashion, accessories.',
          parameters: {
            type: 'object',
            properties: {
              domain: {
                type: 'string',
                description: 'The specialized domain category (e.g. science, math, medicine, astronomy, fortune, philosophy, fashion, etc.)'
              },
              query: {
                type: 'string',
                description: 'The specific specialized question to research'
              }
            },
            required: ['domain', 'query']
          }
        });
      }

      const domainInstructions = `\n[Specialized Domain Knowledge Optimization]:
You are equipped with 'domain_optimized_search'. When the user asks domain-specific or expert questions across science, math, astronomy, fortune/divination, philosophy, psychology, nature, medicine/health, physics, literature, history, fashion, or accessories, call 'domain_optimized_search' to retrieve authoritative domain insights before speaking. Tailor your terminology, rigor, and depth according to the domain.`;

      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'],
          instructions: currentOpts.systemInstruction + domainInstructions,
          voice: currentOpts.voiceName || 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.65,
            prefix_padding_ms: 300,
            silence_duration_ms: 600
          },
          tools: toolsPayload,
          tool_choice: 'auto'
        }
      };

      dc.send(JSON.stringify(sessionConfig));
    };

    let pendingAgentText = '';
    let lastEmittedAgentText = '';
    let lastEmittedUserText = '';

    dc.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'input_audio_buffer.speech_started':
            updateStatus('listening');
            break;

          case 'input_audio_buffer.speech_stopped':
            updateStatus('connected');
            break;

          // User Speech Transcription with Immediate Domain Analysis & Deduplication
          case 'conversation.item.input_audio_transcription.completed':
            if (msg.transcript && msg.transcript.trim()) {
              const cleanText = msg.transcript.trim();
              if (cleanText !== lastEmittedUserText) {
                lastEmittedUserText = cleanText;
                const detected = DomainKnowledgeRouter.detectDomain(cleanText);
                setActiveDomain(detected.domain);
                if (detected.domain !== 'general') {
                  optionsRef.current.onDomainDetected?.(detected.domain, detected.meta, cleanText);
                }
                optionsRef.current.onTranscript?.('user', cleanText, detected.domain);
              }
            }
            break;

          // Agent Answer Transcription Streaming
          case 'response.audio_transcript.delta':
          case 'response.output_text.delta':
          case 'response.text.delta':
            if (msg.delta) {
              pendingAgentText += msg.delta;
            }
            updateStatus('speaking');
            break;

          // Agent Complete Answer: Deduplicated strictly once per response turn
          case 'response.audio_transcript.done':
          case 'response.output_text.done':
          case 'response.text.done': {
            const agentAnswer = (msg.transcript || msg.text || pendingAgentText).trim();
            if (agentAnswer && agentAnswer !== lastEmittedAgentText) {
              lastEmittedAgentText = agentAnswer;
              optionsRef.current.onTranscript?.('agent', agentAnswer, activeDomain);
            }
            pendingAgentText = '';
            break;
          }

          // Audio playback status with Acoustic Echo Shield
          case 'response.audio.delta':
          case 'response.output_audio.delta':
            // Acoustic Echo Shield: Mute local mic while AI speaks to prevent speaker-to-mic feedback loop & stuttering
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => {
                if (t.enabled) t.enabled = false;
              });
            }
            updateStatus('speaking');
            break;

          case 'response.audio.done':
          case 'response.output_audio.done':
          case 'response.done':
            // Re-enable local mic immediately when AI finishes speaking so user can respond naturally
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => {
                if (!t.enabled) t.enabled = true;
              });
            }
            updateStatus('listening');
            break;

          // Tool Calling (including domain_optimized_search)
          case 'response.function_call_arguments.done':
            try {
              const args = JSON.parse(msg.arguments || '{}');

              if (msg.name === 'domain_optimized_search') {
                // Execute domain search
                let searchResult = '';
                if (optionsRef.current.onDomainSearch) {
                  searchResult = await optionsRef.current.onDomainSearch(args.domain, args.query);
                } else {
                  searchResult = DomainKnowledgeRouter.resolveDomainKnowledge(args.domain, args.query);
                }

                dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: msg.call_id,
                    output: JSON.stringify({ success: true, knowledge: searchResult })
                  }
                }));

                dc.send(JSON.stringify({ type: 'response.create' }));
              } else {
                // Application-level tools (e.g. execute_instant_action)
                optionsRef.current.onToolCall?.(msg.name, args);

                dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: msg.call_id,
                    output: JSON.stringify({ success: true })
                  }
                }));

                dc.send(JSON.stringify({ type: 'response.create' }));
              }
            } catch (fnErr) {
              console.error('[useGptLiveVoice] Tool parsing failed:', fnErr);
            }
            break;

          case 'error':
            console.error('[useGptLiveVoice] Server error event:', msg.error);
            optionsRef.current.onError?.(msg.error?.message || 'Server error event');
            break;
        }
      } catch (parseErr) {
        console.warn('[useGptLiveVoice] JSON parse notice:', event.data);
      }
    };

    dc.onclose = () => {
      stopVoice();
    };
  };

  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [stopVoice]);

  return {
    status,
    isVoiceActive,
    error,
    audioLevel,
    activeDomain,
    startVoice,
    stopVoice,
    setError
  };
}

/**
 * Enumerate connected audio devices (microphones, speakers, Bluetooth hearing aids)
 */
export const enumerateHearingDevices = async (): Promise<{
  inputs: Array<{ deviceId: string; label: string; kind: 'audioinput'; isHearingAidOrBluetooth: boolean }>;
  outputs: Array<{ deviceId: string; label: string; kind: 'audiooutput'; isHearingAidOrBluetooth: boolean }>;
  detectedHearingAid: { deviceId: string; label: string; isHearingAidOrBluetooth: boolean } | null;
}> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return { inputs: [], outputs: [], detectedHearingAid: null };
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const isBluetoothOrHearing = (label: string) => {
      const l = label.toLowerCase();
      return (
        l.includes('bluetooth') ||
        l.includes('hearing') ||
        l.includes('보청기') ||
        l.includes('hands-free') ||
        l.includes('headset') ||
        l.includes('ear') ||
        l.includes('buds') ||
        l.includes('oticon') ||
        l.includes('phonak') ||
        l.includes('resound') ||
        l.includes('starkey') ||
        l.includes('signia') ||
        l.includes('widex')
      );
    };

    const inputs = devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `마이크 (${d.deviceId.slice(0, 5)})`,
        kind: 'audioinput' as const,
        isHearingAidOrBluetooth: isBluetoothOrHearing(d.label)
      }));

    const outputs = devices
      .filter(d => d.kind === 'audiooutput')
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `스피커/보청기 (${d.deviceId.slice(0, 5)})`,
        kind: 'audiooutput' as const,
        isHearingAidOrBluetooth: isBluetoothOrHearing(d.label)
      }));

    const detectedHearingAid =
      outputs.find(o => o.isHearingAidOrBluetooth) ||
      inputs.find(i => i.isHearingAidOrBluetooth) ||
      null;

    return { inputs, outputs, detectedHearingAid };
  } catch (e) {
    console.warn('[useGptLiveVoice] enumerateDevices notice:', e);
    return { inputs: [], outputs: [], detectedHearingAid: null };
  }
};
