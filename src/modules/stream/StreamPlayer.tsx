import React, { useRef, useState, useEffect } from 'react';
import { ProductItem } from '../../types';

interface StreamPlayerProps {
  product: ProductItem | null;
  onSelectAction: () => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ product, onSelectAction }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col gap-1.5 group select-none">
      {/* 1. Video Content Box (화면을 최대한 채우도록 테두리/패딩 제거 및 확장) */}
      <div className="relative flex-1 min-h-0 w-full bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        {product ? (
          <video
            ref={videoRef}
            id="kiroween-live-video"
            crossOrigin="anonymous"
            key={product.id + '-' + product.videoUrl}
            src={product.videoUrl}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain bg-black"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="text-slate-500 text-sm">No Live Stream Feed Active</div>
        )}

        {/* Floating Top Controls */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            LIVE STREAM
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className="pointer-events-auto bg-slate-900/80 hover:bg-slate-800 backdrop-blur text-white px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            {isMuted ? '🔇 Unmute' : '🔊 Sound On'}
          </button>
        </div>

        {/* Center Play Overlay when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-white/20 backdrop-blur p-4 rounded-full text-white text-2xl">
              ▶
            </div>
          </div>
        )}
      </div>

      {/* 2. Dedicated Bottom Action Bar (사진 아래, 채팅창 'Kiroween Contextual Agent' 바로 윗선까지 위치) */}
      {product && (
        <div className="w-full bg-slate-900/95 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between shadow-xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl">{product.icon}</span>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{product.name.en}</p>
              <p className="text-xs text-amber-400 font-extrabold">
                {product.currency} {product.price.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSelectAction}
            className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-lg transition cursor-pointer shrink-0 flex items-center gap-1"
          >
            <span>⚡</span>
            <span>Instant Action</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default StreamPlayer;
