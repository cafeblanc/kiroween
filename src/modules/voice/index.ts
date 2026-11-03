// Autonomous Standalone Voice Module - Public API Exports
// Usage:
// import { GptLiveVoiceWidget, useGptLiveVoice } from '@/modules/voice';

export { GptLiveVoiceWidget } from './GptLiveVoiceWidget';
export { VoiceLabApp } from './VoiceLabApp';
export { useGptLiveVoice } from './useGptLiveVoice';
export { executeVoiceButtonCommand, setCheckoutModalState } from './voiceButtonController';
export { speakLocalizedText, findStrictVoice } from './ttsSpeaker';
export * from './types';
