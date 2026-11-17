# Design: LTX 2.5 Integration & Stat-Driven Arena

## 1. Architecture & Data Flow
```text
CustomMonsterStudio
  ├─ Parts + Sliders (ATK/DEF/SPD/REGEN/ENERGY)
  ├─ generateCustomMonsterImage()  ──▶ HF FLUX / Pollinations / Procedural Fallback
  ├─ generateVideoFromMonsterImage() ──▶ HF LTX-Video / MediaRecorder Fallback
  ├─ [15초 배양기 가동] ──▶ BioreactorScreen (blob: videoSrc) ──▶ AwakeningRoar (fullscreen)
  └─ [결투장 바로 출격] ──▶ BioStitchLabView (monster_arena)
```

## 2. Key Files
- `src/services/customMonsterMediaService.ts`:
  - `buildEnglishMonsterPrompt()`
  - `generateCustomMonsterImage()`
  - `generateVideoFromMonsterImage()` (upgrade to support optional `/api/generate-video` / `Lightricks/LTX-Video` before `MediaRecorder` fallback)
- `src/components/bioreactor/CustomMonsterStudio.tsx`:
  - Optional HF Token / LTX status badge + stat sliders + action buttons
- `src/components/BioStitchLabView.tsx`:
  - `handleStartArenaBattle()` stat-weighted combat resolution (`ATK`, `DEF`, `SPD`, `REGEN`, `ENERGY`)
  - `customArenaRoster` + `CURATED_6_MONSTERS` synchronization
- `src/utils/security.ts`:
  - `API_ALLOWLIST` includes `/api/generate-video`, `api-inference.huggingface.co`, `router.huggingface.co`, `image.pollinations.ai`
