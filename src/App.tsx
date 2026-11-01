import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="bg-slate-900 border border-purple-500/40 p-8 rounded-2xl shadow-2xl max-w-xl">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
          🎃 Kiroween 2026
        </h1>
        <p className="text-sm text-slate-300 font-semibold mb-2">
          Autonomous Multimodal Agentic Video Platform
        </p>
        <p className="text-xs text-slate-400">
          Powered by Kiro Specs & Agent Hooks Architecture
        </p>
      </div>
    </div>
  );
};

export default App;
