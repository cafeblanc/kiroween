import React from 'react';
import { VoiceLabApp } from './modules/voice';

export const App: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">
      <VoiceLabApp />
    </div>
  );
};
