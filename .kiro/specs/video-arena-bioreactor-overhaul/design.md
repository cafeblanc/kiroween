# Technical Design: Custom Monster Battle Arena & Bioreactor Overhaul

## 1. Root Cause Analysis
In `src/components/BioStitchLabView.tsx`:
```tsx
// Current flawed logic:
const handleStartArenaBattle = () => {
  setActiveClashVideoUrl(selectPrebuiltBattleVideo(arenaFighter1, arenaFighter2));
  setIsArenaBattling(true);
  ...
};
```
Because `selectPrebuiltBattleVideo` calls `getBattleVideoForPair(...)` which falls back to `/videos/battles/battle_dragon_vs_kraken.mp4`, `activeClashVideoUrl` is ALWAYS non-null.
Consequently, in the JSX:
```tsx
{activeClashVideoUrl ? (
  <video src={activeClashVideoUrl} ... /> // Overwrites EVERYTHING with the old Dragon vs Kraken video!
) : (
  // The actual dual fighter stage where arenaFighter1 and arenaFighter2 fight NEVER runs!
)}
```
The custom monster designed by the user was completely erased the moment the battle began.

---

## 2. Architecture & Design Solution

```
┌────────────────────────────────────────────────────────┐
│               CLASH ARENA BATTLE ENGINE                │
└────────────────────────────────────────────────────────┘
                           │
             Is there an explicit AI-generated
              video for this exact pair?
             (aiBattleVideoUrl !== null)
              ├─── YES ───► Fullscreen AI Clash Video
              │
              └─── NO ────► DUAL REAL-TIME CLASH RING
                           ┌─────────────────────────────┐
                           │ Left:   Custom Monster 1    │
                           │         (videoSrc / canvas) │
                           │ Right:  Opponent Monster 2  │
                           │         (videoSrc / canvas) │
                           └──────────────┬──────────────┘
                                          │
                     Battle Event Timers (arenaBattle.ts)
                                          │
      ┌────────────────┬──────────────────┼─────────────────┬───────────────┐
      ▼                ▼                  ▼                 ▼               ▼
   Round 0          Round 1            Round 2           Round 3         Round 4
 [Idle Stance]   [F1 Strike]        [F2 Counter]         [Clash]          [KO]
 Both breathe    F1 lunges forward  F2 lunges forward  Both collide    Winner zooms,
 & pulse aura    Shockwave on F2    Shockwave on F1    Lightning shock  Loser knocked out
```

### 2.1 Abolish False Pre-built Overlays
- In `selectPrebuiltBattleVideo(f1, f2)`:
  - If either `f1` or `f2` is a custom monster (`m.id.startsWith("custom_")`), return `null`.
  - For curated monsters, ONLY return a pre-built video if it exists in `PREMADE_BATTLES`. Never return a generic dragon vs kraken fallback.
  - When it returns `null`, `activeClashVideoUrl` remains `null`.

### 2.2 Live Dual Fighter Confrontation Ring
When `activeClashVideoUrl` is null:
- **Fighter 1 (Left)**: Renders `arenaFighter1.videoSrc` (or high-res custom avatar with pulsing biological animation).
- **Fighter 2 (Right)**: Renders `arenaFighter2.videoSrc`.
- **Dynamic Combat Motion**:
  - `f1_strike`: Fighter 1 scales up by 1.25x, accelerates forward (+60px), emitting attack slash particles and custom skill banners (`🌋 초고온 마그마 일격` etc.). Fighter 2 recoils and flashes red (`animate-ping`).
  - `f2_strike`: Fighter 2 charges forward, Fighter 1 recoils and takes damage.
  - `clash`: Screen shakes with biological lightning overlay.
  - `ko`: Winning monster expands to center stage in victory pose with roar audio, while the defeated monster dissolves into fluid particles.

### 2.3 Breathing & Motion Canvas for Static Images
If a custom monster does not yet have an MP4 video, its high-resolution image must NOT be a dead flat rectangle. It will be wrapped in a dynamic creature stage with:
- Breathing idle deformation (`scale` and `filter` drop-shadow pulse in rhythm with `monster.bpm`).
- Bioluminescent energy glow matching `monster.colorHex`.
- Aggressive strike lunge when attacking.

### 2.4 Bioreactor Chamber Overhaul
- In `referenceVideoSelector.ts`:
  - Completely remove `/videos/battles/*` references.
  - Map curated monsters to real biological growth footage:
    - Dragon/Phoenix/Griffin -> `chimera_growth_dragon_24s.mp4`
    - Kraken/Hydra/Cthulhu -> `chimera_growth_kraken_24s.mp4`
    - Deep Sea / Leviathan / Cerberus -> `chimera_growth_deepsea_abyss_30s.mp4`
    - Prometheus / Android / Organoid -> `chimera_awakening_cyber.mp4`
- For custom monsters:
  - 100% of the 15-second growth sequence uses the custom monster's media.
  - The 3D awakening roar sequence displays the custom monster's face breaking through the fluid glass.
