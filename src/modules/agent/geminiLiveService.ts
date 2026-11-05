// Gemini Multimodal Live API Client for Kiroween Live Commerce
// Supports: Bidirectional WebSocket, 16kHz PCM audio streaming, 24kHz audio playback,
// Periodic video frame capture from live stream canvas, and Function Calling (execute_instant_action).

export interface GeminiLiveCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => void;
  onTranscript: (sender: 'user' | 'agent', text: string) => void;
  onToolCall: (name: string, args: Record<string, any>) => void;
  onError: (err: string) => void;
  onAudioWave?: (frequencyData: Uint8Array) => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private playbackContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private isConnected = false;
  private videoInterval: number | null = null;
  private callbacks: GeminiLiveCallbacks;
  private animFrameId: number | null = null;

  constructor(callbacks: GeminiLiveCallbacks) {
    this.callbacks = callbacks;
  }

  // Connect to Gemini Multimodal Live WebSocket
  public async connect(apiKey: string, systemInstruction: string): Promise<boolean> {
    try {
      this.callbacks.onStatusChange('connecting');

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.callbacks.onStatusChange('connected');

        // Send initial setup frame
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck' // Natural, friendly voice
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: 'execute_instant_action',
                    description: 'Trigger the Instant Action checkout sheet when user wants to purchase or checkout the current stream item.',
                    parameters: {
                      type: 'OBJECT',
                      properties: {
                        productId: { type: 'STRING', description: 'Product ID to checkout' },
                        quantity: { type: 'INTEGER', description: 'Item quantity' }
                      },
                      required: ['productId']
                    }
                  }
                ]
              }
            ]
          }
        };

        this.ws?.send(JSON.stringify(setupMessage));
        this.startAudioRecording();
        this.startVideoFrameCapture();
      };

      this.ws.onmessage = async (event) => {
        try {
          let data: any;
          if (event.data instanceof Blob) {
            data = JSON.parse(await event.data.text());
          } else {
            data = JSON.parse(event.data);
          }

          this.handleServerMessage(data);
        } catch (e: any) {
          console.error('[Gemini Live] Message parse error:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.error('[Gemini Live] WebSocket Error:', e);
        this.callbacks.onError('WebSocket connection error. Please verify Gemini API key.');
        this.callbacks.onStatusChange('error');
      };

      this.ws.onclose = () => {
        this.disconnect();
      };

      return true;
    } catch (err: any) {
      this.callbacks.onError(err?.message || 'Connection failed');
      this.callbacks.onStatusChange('error');
      return false;
    }
  }

  // Handle incoming server payload
  private handleServerMessage(data: any) {
    // 1. Tool call (e.g. execute_instant_action)
    if (data.toolCall?.functionCalls) {
      for (const call of data.toolCall.functionCalls) {
        this.callbacks.onToolCall(call.name, call.args || {});
        // Acknowledge tool call to Gemini
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const toolResp = {
            toolResponse: {
              functionResponses: [
                {
                  response: { output: { success: true, message: 'Instant action triggered successfully' } },
                  id: call.id
                }
              ]
            }
          };
          this.ws.send(JSON.stringify(toolResp));
        }
      }
    }

    // 2. Audio & text parts
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        // Transcript / Text
        if (part.text) {
          this.callbacks.onTranscript('agent', part.text);
        }
        // Audio stream (24kHz PCM linear16)
        if (part.inlineData?.mimeType?.includes('audio/pcm') && part.inlineData?.data) {
          this.callbacks.onStatusChange('speaking');
          this.playPcmAudio(part.inlineData.data);
        }
      }
    }

    if (data.serverContent?.turnComplete) {
      this.callbacks.onStatusChange('listening');
    }
  }

  // Record user audio (16kHz PCM linear16) and stream to Gemini Live
  private async startAudioRecording() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;

      // Use ScriptProcessorNode for wide browser compatibility
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcm16.buffer);

        const realTimeAudio = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Data
              }
            ]
          }
        };

        this.ws.send(JSON.stringify(realTimeAudio));
      };

      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Start audio waveform visualizer loop
      this.startWaveformLoop();
    } catch (e: any) {
      console.warn('[Gemini Live] Mic recording failed:', e);
      this.callbacks.onError('Microphone access denied: ' + (e?.message || ''));
    }
  }

  // Waveform animation loop
  private startWaveformLoop() {
    if (!this.analyser) return;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);

    const tick = () => {
      if (this.analyser && this.callbacks.onAudioWave) {
        this.analyser.getByteFrequencyData(buffer);
        this.callbacks.onAudioWave(buffer);
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  // Periodic video frame capture from live stream element
  private startVideoFrameCapture() {
    // Send 1 frame every 1.5 seconds for multimodal vision grounding
    this.videoInterval = window.setInterval(() => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const videoEl = document.getElementById('kiroween-live-video') as HTMLVideoElement | null;
      if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

      try {
        const canvas = document.createElement('canvas');
        // Scale down to standard 480x270 for low latency
        const width = 480;
        const height = Math.round((videoEl.videoHeight / videoEl.videoWidth) * width) || 270;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoEl, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64Jpeg = dataUrl.split(',')[1];

        if (base64Jpeg) {
          const videoFrameMsg = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'image/jpeg',
                  data: base64Jpeg
                }
              ]
            }
          };
          this.ws.send(JSON.stringify(videoFrameMsg));
        }
      } catch (err) {
        // Video might be cross-origin if external
        console.warn('[Gemini Live] Video frame capture skipped:', err);
      }
    }, 1500);
  }

  // Play incoming 24kHz PCM linear16 audio chunks
  private playPcmAudio(base64Audio: string) {
    if (!this.playbackContext) {
      this.playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      this.nextPlayTime = this.playbackContext.currentTime;
    }

    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.playbackContext.destination);

    const startTime = Math.max(this.playbackContext.currentTime, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;
  }

  // Convert float audio buffer (-1.0 to 1.0) to 16-bit PCM Int16Array
  private floatTo16BitPCM(floatArray: Float32Array): Int16Array {
    const pcm16 = new Int16Array(floatArray.length);
    for (let i = 0; i < floatArray.length; i++) {
      const s = Math.max(-1, Math.min(1, floatArray[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Disconnect & cleanup all audio nodes and intervals
  public disconnect() {
    this.isConnected = false;

    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close();
      this.playbackContext = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}
