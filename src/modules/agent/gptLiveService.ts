// gpt-live-1 WebRTC Realtime API (GA endpoint /v1/realtime/calls)
// Provides: Full-Duplex Simultaneous Listen-and-Speak, Native Server VAD,
// Instant Barge-in (Interruption), WebRTC Hardware Echo Cancellation,
// and In-Stream Action Tool Calling.

export interface GptLiveCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => void;
  onTranscript: (sender: 'user' | 'agent', text: string) => void;
  onToolCall: (name: string, args: Record<string, any>) => void;
  onError: (err: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class GptLiveService {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private callbacks: GptLiveCallbacks;
  private isConnected = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  constructor(callbacks: GptLiveCallbacks) {
    this.callbacks = callbacks;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public async connect(apiKey: string, instructions: string, featuredProductId: string): Promise<boolean> {
    try {
      this.callbacks.onStatusChange('connecting');

      // 1. Check & Acquire Microphone stream with browser hardware AEC
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (mediaErr: any) {
        if (mediaErr?.name === 'NotAllowedError' || mediaErr?.message?.toLowerCase().includes('permission')) {
          throw new Error('브라우저 마이크 권한이 차단되었습니다 (Permission denied). 크롬 주소창 왼쪽의 자물쇠/설정 아이콘을 눌러 [마이크] 권한을 [허용]으로 변경해주세요.');
        }
        throw new Error('마이크 장치 접근 실패: ' + (mediaErr?.message || '장치를 확인할 수 없습니다.'));
      }

      // 2. Setup Audio Visualizer
      this.setupVisualizer(this.localStream);

      // 3. Create WebRTC PeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Remote audio playback
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;

      this.pc.ontrack = (event) => {
        if (this.remoteAudio && event.streams[0]) {
          this.remoteAudio.srcObject = event.streams[0];
        }
      };

      // Add local microphone audio track to WebRTC
      for (const track of this.localStream.getAudioTracks()) {
        this.pc.addTrack(track, this.localStream);
      }

      // 4. Create DataChannel for events and tool calls
      this.dc = this.pc.createDataChannel('oai-events');
      this.setupDataChannel(instructions, featuredProductId);

      // 5. Create local SDP Offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // 6. Authenticate with OpenAI GA Realtime API
      // Try generating ephemeral client secret first via /v1/realtime/client_secrets or /v1/realtime/sessions
      let activeBearer = apiKey.trim();

      try {
        // Attempt 1: /v1/realtime/client_secrets (GA endpoint)
        const secretRes = await fetch('/api/openai/v1/realtime/client_secrets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session: {
              type: 'realtime',
              model: 'gpt-4o-realtime-preview',
              voice: 'verse'
            }
          })
        });

        if (secretRes.ok) {
          const secretData = await secretRes.json();
          const token = secretData.value || secretData.client_secret?.value;
          if (token) {
            activeBearer = token;
            console.log('[gpt-live-1 GA] Ephemeral client_secret obtained successfully');
          }
        } else if (secretRes.status === 401) {
          throw new Error('OpenAI API 키 인증 실패 (401 Unauthorized): API 키가 올바른지 확인해주세요.');
        } else if (secretRes.status === 403) {
          throw new Error('OpenAI 권한 거부 (403 Permission denied): 현재 API 키에 Realtime API 접근 권한이 없거나 제한된 Project 키입니다. platform.openai.com에서 Realtime 권한이 부여된 키인지 확인하세요.');
        } else if (secretRes.status === 429) {
          throw new Error('OpenAI 크레딧 부족 또는 요청 제한 (429 Rate Limit/Quota Exceeded): OpenAI 유료 크레딧 잔액을 확인해주세요.');
        } else {
          // Attempt 2 fallback: /v1/realtime/sessions
          const sessionRes = await fetch('/api/openai/v1/realtime/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-realtime-preview',
              voice: 'verse'
            })
          });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            const token = sessionData.client_secret?.value || sessionData.value;
            if (token) activeBearer = token;
          }
        }
      } catch (tokenErr: any) {
        if (tokenErr.message?.includes('401') || tokenErr.message?.includes('403') || tokenErr.message?.includes('429')) {
          throw tokenErr;
        }
        console.warn('[gpt-live-1 GA] Client secret creation notice, proceeding to direct call:', tokenErr);
      }

      // 7. Send Multipart FormData SDP Offer to Official OpenAI GA Realtime Calls Endpoint (/v1/realtime/calls)
      const gaCallsUrl = '/api/openai/v1/realtime/calls';
      const formData = new FormData();
      formData.append('sdp', new Blob([offer.sdp || ''], { type: 'application/sdp' }));
      formData.append(
        'session',
        new Blob(
          [
            JSON.stringify({
              type: 'realtime',
              model: 'gpt-4o-realtime-preview',
              instructions: instructions,
              voice: 'verse'
            })
          ],
          { type: 'application/json' }
        )
      );

      const sdpResponse = await fetch(gaCallsUrl, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${activeBearer}`
        }
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('[gpt-live-1 GA Calls failed]:', sdpResponse.status, errorText);

        if (sdpResponse.status === 401) {
          throw new Error('OpenAI 인증 실패 (401 Unauthorized): API 키가 올바른지 확인하세요.');
        } else if (sdpResponse.status === 403) {
          throw new Error('OpenAI 권한 거부 (403 Permission denied): 현재 API 키에 Realtime 모델 권한이 없습니다.');
        } else if (sdpResponse.status === 429) {
          throw new Error('OpenAI 크레딧 부족 (429 Too Many Requests): 계정에 유료 크레딧 잔액이 있는지 확인하세요.');
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

      await this.pc.setRemoteDescription(answer);
      this.isConnected = true;
      this.callbacks.onStatusChange('connected');
      return true;
    } catch (err: any) {
      console.error('[gpt-live-1 GA] Final Connection Error:', err);
      const msg = err?.message || 'Failed to connect to gpt-live-1';
      this.callbacks.onError(msg);
      this.callbacks.onStatusChange('error');
      this.disconnect();
      return false;
    }
  }

  private setupDataChannel(instructions: string, featuredProductId: string) {
    if (!this.dc) return;

    this.dc.onopen = () => {
      console.log('[gpt-live-1 GA] DataChannel opened, configuring session');

      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'],
          instructions: instructions,
          voice: 'verse',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 400
          },
          tools: [
            {
              type: 'function',
              name: 'execute_instant_action',
              description: 'Trigger instant in-stream checkout action sheet when the user expresses desire to buy, order, or purchase the current live stream item.',
              parameters: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'string',
                    description: 'The product ID to purchase, e.g. ' + featuredProductId
                  },
                  quantity: {
                    type: 'integer',
                    description: 'Quantity of items to buy'
                  }
                },
                required: ['productId']
              }
            }
          ],
          tool_choice: 'auto'
        }
      };

      this.sendEvent(sessionConfig);
    };

    this.dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleServerEvent(msg);
      } catch (e) {
        console.warn('[gpt-live-1 GA] Message parse notice:', event.data);
      }
    };

    this.dc.onerror = (err) => {
      console.error('[gpt-live-1 GA] DataChannel error:', err);
    };

    this.dc.onclose = () => {
      console.log('[gpt-live-1 GA] DataChannel closed');
      this.callbacks.onStatusChange('disconnected');
    };
  }

  private handleServerEvent(msg: any) {
    switch (msg.type) {
      // 1. User started speaking -> Native Barge-in
      case 'input_audio_buffer.speech_started':
        this.callbacks.onStatusChange('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        this.callbacks.onStatusChange('connected');
        break;

      // 2. Transcriptions (Supports GA & Beta formats)
      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) {
          this.callbacks.onTranscript('user', msg.transcript);
        }
        break;

      case 'response.audio_transcript.done':
      case 'response.output_text.done':
        if (msg.transcript || msg.text) {
          this.callbacks.onTranscript('agent', msg.transcript || msg.text);
        }
        break;

      // 3. Audio speaking state
      case 'response.audio.delta':
      case 'response.output_audio.delta':
        this.callbacks.onStatusChange('speaking');
        break;

      case 'response.audio.done':
      case 'response.output_audio.done':
      case 'response.done':
        this.callbacks.onStatusChange('listening');
        break;

      // 4. In-Stream Action Tool Calling
      case 'response.function_call_arguments.done':
        console.log('[gpt-live-1 GA] Function call arguments received:', msg.name, msg.arguments);
        try {
          const args = JSON.parse(msg.arguments || '{}');
          this.callbacks.onToolCall(msg.name, args);

          this.sendEvent({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: msg.call_id,
              output: JSON.stringify({ success: true, message: 'Instant action modal triggered successfully' })
            }
          });

          this.sendEvent({ type: 'response.create' });
        } catch (e) {
          console.error('[gpt-live-1 GA] Function call parse failed:', e);
        }
        break;

      case 'error':
        console.error('[gpt-live-1 GA] Server error event:', msg.error);
        this.callbacks.onError(msg.error?.message || 'Server error event received');
        break;
    }
  }

  public sendEvent(event: any) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  }

  private setupVisualizer(stream: MediaStream) {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      const loop = () => {
        if (this.analyser && this.callbacks.onAudioLevel) {
          this.analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          this.callbacks.onAudioLevel(avg);
        }
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.animFrameId = requestAnimationFrame(loop);
    } catch (e) {
      console.warn('[gpt-live-1 GA] Visualizer setup notice:', e);
    }
  }

  public disconnect() {
    this.isConnected = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}
