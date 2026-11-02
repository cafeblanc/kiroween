// Autonomous Standalone Voice Module - Contracts & Types
// Completely decoupled from application business logic for universal portability.

import { DomainCategory, DomainMeta } from './domainRouter';
export * from './domainRouter';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

export interface VoiceToolProperty {
  type: string;
  description?: string;
  enum?: string[];
}

export interface VoiceToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, VoiceToolProperty>;
    required?: string[];
  };
}

export interface VoiceTranscriptItem {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  domain?: DomainCategory;
}

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isHearingAidOrBluetooth?: boolean;
}

export interface GptLiveVoiceInProps {
  /** Optional API Key; if omitted, checks localStorage or Vite environment */
  apiKey?: string;
  /** System instructions defining agent persona, role, and context */
  systemInstruction: string;
  /** Voice model ID (defaults to 'gpt-realtime' for GA WebRTC calls) */
  model?: string;
  /** Preferred voice name (e.g. 'alloy', 'verse', 'shimmer', 'echo') */
  voiceName?: string;
  /** List of callable client-side tools */
  tools?: VoiceToolDefinition[];
  /** Enable automatic specialized domain classification & optimized search */
  enableDomainSearch?: boolean;
  /** Optional audio input device ID (e.g. microphone) */
  inputDeviceId?: string;
  /** Optional audio output device ID (e.g. Bluetooth hearing aid, headphones, speaker) */
  outputDeviceId?: string;
  /** Optional external domain search provider (e.g. custom vector DB or web search) */
  onDomainSearch?: (domain: DomainCategory, query: string) => Promise<string> | string;
  /** Optional custom class name for styling container */
  className?: string;
}

export interface GptLiveVoiceOutCallbacks {
  /** Emitted whenever the user or agent transcript updates */
  onTranscript?: (sender: 'user' | 'agent', text: string, domain?: DomainCategory) => void;
  /** Emitted when the voice agent calls a registered tool */
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<any> | void;
  /** Emitted whenever the connection or speaking status changes */
  onStatusChange?: (status: VoiceStatus) => void;
  /** Emitted when a specialized domain is detected in user speech */
  onDomainDetected?: (domain: DomainCategory, meta: DomainMeta, query: string) => void;
  /** Emitted when an error occurs (mic denied, network error, 401/403) */
  onError?: (error: string) => void;
  /** Emitted on real-time audio volume level change (0-255) */
  onAudioLevel?: (level: number) => void;
}

export type GptLiveVoiceWidgetProps = GptLiveVoiceInProps & GptLiveVoiceOutCallbacks;

export interface GptLiveVoiceWidgetHandle {
  startVoice: (key?: string) => Promise<boolean>;
  stopVoice: () => void;
  sendTextMessage: (text: string) => boolean;
  isVoiceActive: boolean;
  status: VoiceStatus;
}
