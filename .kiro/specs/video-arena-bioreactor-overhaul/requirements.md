# Requirements Specification: Video, Arena, and Bioreactor Overhaul

## 1. Background & Problem Statement
Currently, both the **Bioreactor Growth Chamber** and the **3D Clash Arena** suffer from severe video repetition and outdated hardcoded fallbacks:
1. **Arena Battle Video Hijacking**:
   - `BioStitchLabView.tsx` currently invokes `selectPrebuiltBattleVideo(arenaFighter1, arenaFighter2)`, which unconditionally returns `FALLBACK_BATTLE_VIDEO` (`/videos/battles/battle_dragon_vs_kraken.mp4`) whenever two fighters lack a pre-made clash clip.
   - Because `activeClashVideoUrl` is always non-null, the application **always displays the old dragon vs kraken battle video**, completely overriding and hiding the custom monster that the user just designed.
   - The interactive Dual Confrontation stage (Option B in `BioStitchLabView.tsx`, where `arenaFighter1.videoSrc` and `arenaFighter2.videoSrc` face off, advance, recoil, and strike) is never shown.
2. **Bioreactor Video Repetition & Wrong Asset Mapping**:
   - In `referenceVideoSelector.ts` and `comicMonsters.ts`, multiple distinct monsters (e.g., Xenomorph, Frankenstein, Arachno, Cerberus, Hydra) are mistakenly mapped to battle clips (`battle_cerberus_vs_hydra.mp4`, `battle_xeno_vs_frankenstein.mp4`) inside the growth incubator.
   - 12 out of 16 monsters share only 3 duplicate 24s/30s clips (`chimera_growth_dragon_24s.mp4`, `chimera_growth_kraken_24s.mp4`, `chimera_growth_deepsea_abyss_30s.mp4`).
   - If a custom monster is awakened without an AI-generated video, it defaults blindly to `/videos/chimera_growth_dragon_24s.mp4`.
3. **3D Awakening Burst Video Isolation**:
   - The 3D awakening roar stage and top "3D AI Burst Video" trigger either reuse the generic dragon burst video (`chimera_awakening_dragon.mp4` / `fallback.mp4`) or fail to integrate the custom monster's dynamic visuals.

---

## 2. Functional Requirements

### REQ-1: Real Custom Fighter Dual Confrontation in Arena
- **1.1**: If the two fighters do NOT have an exact, pre-authored pair video (`PREMADE_BATTLES`), the arena MUST NOT force-overlay `battle_dragon_vs_kraken.mp4`.
- **1.2**: Instead, the arena MUST activate the **Dual Confrontation Stage** where `arenaFighter1.videoSrc` and `arenaFighter2.videoSrc` (or their animated portrait canvas/video) are displayed side-by-side.
- **1.3**: During battle phases (`f1_strike`, `f2_strike`, `clash`, `ko`), the two fighter panels must visually react (lunge forward, flash red on hit, shake with shockwaves, and zoom in on victory).
- **1.4**: If the user explicitly generates an AI clash video for the exact pair via Luma/LTX (`aiBattleVideoUrl`), only then does the unified video player engage.

### REQ-2: Bioreactor Video Logic & Fallback Cleanup
- **2.1**: Remove all battle video paths (`/videos/battles/*`) from `referenceVideoSelector.ts` and `comicMonsters.ts`. An incubator chamber must NEVER play a battle clip.
- **2.2**: Category-based growth assignment: Curated monsters must map to distinct growth sequences aligned with their biological archetype (e.g., Draconic/Aerial, Deep-sea Cephalopod, Cybernetic Organoid, Bioluminescent Amphibian).
- **2.3**: Custom monsters in Bioreactor: The custom monster's generated video (or procedural video generator) must be the primary `videoSrc`.
- **2.4**: Stage progression (15s total across 6 stages) must slice the custom video appropriately or loop seamlessly without freezing or blank screens.

### REQ-3: Dynamic 3D Awakening Burst
- **3.1**: At stage 6 (15.0s) or upon clicking "3D 각성", the awakening glass crack and roar must feature the active monster's specific visual texture and color aura (not a hardcoded dragon).
- **3.2**: When AI 3D burst generation is requested, the prompt must accurately combine the monster's current archetype, body parts, and combat stats.

### REQ-4: Code Quality & Regressions
- **4.1**: `npx tsc --noEmit` must report zero errors across both frontend and api.
- **4.2**: All unit, property, and integration tests in `vitest` must pass (minimum 210+ tests).
- **4.3**: Production build `npm run build` must succeed without warnings or broken chunks.
