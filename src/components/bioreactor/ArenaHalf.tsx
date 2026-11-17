import React, { useEffect, useState } from "react";
import type { ComicMonster } from "../../data/comicMonsters";
import { hasOwnEntranceVideo } from "../../utils/arenaRoster";
import { ARENA_TURN_MS, ENTRANCE_CROSSFADE_MS, shouldFreezeEntrance } from "../../utils/summonTiming";

/** True when the user asked the OS for less motion: the turn then jumps straight to its end pose. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

interface ArenaHalfProps {
  monster: ComicMonster | null;
  /** CSS rotateY degrees (0 until both halves are filled, then the face-off angle). */
  angleDeg: number;
  isKo: boolean;
  emptyLabel: string;
  tint: "cyan" | "rose";
}

/**
 * One half of the arena: the monster's image, plus its entrance video which plays only the first
 * ENTRANCE_PLAY_SECONDS and then freezes on that frame. The half turns slowly toward the opponent (CSS 3D).
 */
export const ArenaHalf: React.FC<ArenaHalfProps> = ({ monster, angleDeg, isKo, emptyLabel, tint }) => {
  const reduced = usePrefersReducedMotion();
  // The still image stays under the video until the video's first frame is decoded, then the video fades in (no hard cut).
  const [videoShown, setVideoShown] = useState(false);
  const videoKey = monster ? `${monster.id}-${monster.videoSrc}` : "";
  useEffect(() => setVideoShown(false), [videoKey]);
  const border = tint === "cyan" ? "border-cyan-500/40" : "border-rose-500/40";
  return (
    <div className="relative h-full w-1/2 p-1 sm:p-2">
      <div
        data-testid={`arena-half-${tint}`}
        className={`relative h-full w-full rounded-2xl overflow-hidden border-2 ${border} bg-slate-950`}
        style={{
          transform: `rotateY(${angleDeg}deg)`,
          transition: reduced ? "none" : `transform ${ARENA_TURN_MS}ms ease-in-out`,
          willChange: reduced ? undefined : "transform",
        }}
      >
        {monster ? (
          <>
            <img
              src={monster.jumpscareImg || monster.avatarImg}
              alt={isKo ? monster.nameKo : monster.nameEn}
              onError={(e) => {
                if (monster.avatarImg && e.currentTarget.src !== monster.avatarImg) e.currentTarget.src = monster.avatarImg;
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {hasOwnEntranceVideo(monster.videoSrc) && (
              <video
                key={videoKey}
                onLoadedData={() => setVideoShown(true)}
                onPlaying={() => setVideoShown(true)}
                style={{ opacity: videoShown ? 1 : 0, transition: reduced ? "none" : `opacity ${ENTRANCE_CROSSFADE_MS}ms ease-in-out` }}
                src={monster.videoSrc}
                autoPlay
                muted
                playsInline
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (shouldFreezeEntrance(v.currentTime)) v.pause();
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
              <p className="text-xs sm:text-sm font-black text-white truncate">{isKo ? monster.nameKo : monster.nameEn}</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <p className="text-xs text-slate-500 leading-relaxed">{emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
};
