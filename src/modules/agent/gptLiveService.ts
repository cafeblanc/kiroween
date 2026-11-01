// gpt-live-1 WebRTC Realtime API Client for Kiroween Live Commerce
// Provides: Full-Duplex Simultaneous Listen-and-Speak, Native Server VAD,
// Instant Barge-in (Interruption), WebRTC Acoustic Echo Cancellation,
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

      // 1. Get User Media with WebRTC hardware echo cancellation
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 2. Setup Audio Visualizer
      this.setupVisualizer(this.localStream);

      // 3. Create WebRTC PeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Setup remote audio playback
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

      // 4. Create DataChannel for events and function calls
      this.dc = this.pc.createDataChannel('oai-events');
      this.setupDataChannel(instructions, featuredProductId);

      // 5. Create SDP Offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // 6. Connect to OpenAI Realtime Endpoint via Vite Proxy (/api/openai) to bypass browser CORS
      // First try to obtain an ephemeral token from sessions endpoint
      let activeBearer = apiKey.trim();
      try {
        const sessionRes = await fetch('/api/openai/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeBearer}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-realtime-preview',
            voice: 'verse'
          })
        });

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.client_secret?.value) {
            activeBearer = sessionData.client_secret.value;
            console.log('[gpt-live-1] Ephemeral session token obtained successfully');
          }
        } else {
          const errData = await sessionRes.text();
          console.warn('[gpt-live-1] Ephemeral session notice:', sessionRes.status, errData);
          if (sessionRes.status === 401) {
            throw new Error('OpenAI API 키가 올바르지 않습니다 (401 Unauthorized). 키를 다시 확인해주세요.');
          } else if (sessionRes.status === 429) {
            throw new Error('OpenAI API 사용량 한도 초과 또는 잔여 크레딧 부족 (429 Rate Limit/Quota Exceeded). 계정 크레딧을 확인해주세요.');
          }
        }
      } catch (tokenErr: any) {
        if (tokenErr.message?.includes('401') || tokenErr.message?.includes('429')) {
          throw tokenErr;
        }
        console.warn('[gpt-live-1] Direct proxy fallback:', tokenErr);
      }

      // Send SDP Offer to Realtime WebRTC endpoint through local proxy
      const sdpUrl = '/api/openai/v1/realtime?model=gpt-4o-realtime-preview';
      const sdpResponse = await fetch(sdpUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${activeBearer}`,
          'Content-Type': 'application/sdp'
        }
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        if (sdpResponse.status === 401) {
          throw new Error('OpenAI 인증 실패 (401 Unauthorized): API 키 권한 또는 Realtime API 활성 여부를 확인하세요.');
        } else if (sdpResponse.status === 429) {
          throw new Error('OpenAI 크레딧 부족 또는 요청 제한 (429 Too Many Requests): 계정에 사용 가능한 결제 크레딧이 있는지 확인하세요.');
        } else {
          throw new Error(`OpenAI Realtime 연결 오류 (${sdpResponse.status}): ${errorText.slice(0, 150)}`);
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
      console.error('[gpt-live-1] Connection error:', err);
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
      console.log('[gpt-live-1] DataChannel opened, sending session configuration');

      // Configure session with Server VAD and In-stream Action Tool
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'],
          instructions: instructions,
          voice: 'verse', // warm, natural conversational voice
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
        console.warn('[gpt-live-1] Failed to parse message:', event.data);
      }
    };

    this.dc.onerror = (err) => {
      console.error('[gpt-live-1] DataChannel error:', err);
    };

    this.dc.onclose = () => {
      console.log('[gpt-live-1] DataChannel closed');
      this.callbacks.onStatusChange('disconnected');
    };
  }

  private handleServerEvent(msg: any) {
    switch (msg.type) {
      // 1. User started speaking -> Native Barge-in (agent cuts off automatically)
      case 'input_audio_buffer.speech_started':
        console.log('[gpt-live-1] User speech detected (Barge-in active)');
        this.callbacks.onStatusChange('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        this.callbacks.onStatusChange('connected');
        break;

      // 2. Transcriptions
      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) {
          this.callbacks.onTranscript('user', msg.transcript);
        }
        break;

      case 'response.audio_transcript.done':
        if (msg.transcript) {
          this.callbacks.onTranscript('agent', msg.transcript);
        }
        break;

      // 3. Agent Audio Speaking State
      case 'response.audio.delta':
        this.callbacks.onStatusChange('speaking');
        break;

      case 'response.audio.done':
      case 'response.done':
        this.callbacks.onStatusChange('listening');
        break;

      // 4. In-Stream Action Tool Calling
      case 'response.function_call_arguments.done':
        console.log('[gpt-live-1] Tool call received:', msg.name, msg.arguments);
        try {
          const args = JSON.parse(msg.arguments || '{}');
          this.callbacks.onToolCall(msg.name, args);

          // Respond to tool call
          this.sendEvent({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: msg.call_id,
              output: JSON.stringify({ success: true, message: 'Instant action modal triggered successfully' })
            }
          });

          // Trigger continuation
          this.sendEvent({ type: 'response.create' });
        } catch (e) {
          console.error('[gpt-live-1] Tool call parsing failed:', e);
        }
        break;

      case 'error':
        console.error('[gpt-live-1] Server error:', msg.error);
        this.callbacks.onError(msg.error?.message || 'Server error received');
        break;
    }
  }

  public sendEvent(event: any) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  }

  // Setup Web Audio Analyser for smooth waveform rendering
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
      console.warn('[gpt-live-1] Visualizer init failed:', e);
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
