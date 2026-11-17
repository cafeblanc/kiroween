# Requirements: LTX 2.5 Custom Monster Studio & 3D Awakening / Arena Integration

## 1. Overview
Connect the **커스텀 괴수 설계 (`CustomMonsterStudio`)** Text → Image → Video pipeline with **LTX 2.5 / HuggingFace Inference** (plus zero-key AI & procedural fallbacks), wire custom monster stats into **3D Awakening** and **Real-time Duel (`monster_arena`)**, and verify end-to-end playback and Vercel production deployment.

## 2. Functional Requirements

### FR-1: Custom Monster Design (Text → Image → Video)
1. **Multi-Part Description**: Users describe Head, Horns/Crown, Torso, Arms/Tentacles/Wings, Legs, Tail, and Skin/Aura, plus adjust 5 combat stat sliders (`ATK`, `DEF`, `SPD`, `REGEN`, `ENERGY`).
2. **Text → Image**: Translates Korean description into an English visual prompt (`buildEnglishMonsterPrompt`) and generates a unique AI image per specification via:
   - Tier 1: HuggingFace Inference (`FLUX.1-schnell` / LTX ecosystem when token or `/api/generate-video` proxy is available)
   - Tier 2: Zero-key `image.pollinations.ai`
   - Tier 3: Procedural multi-part mutation canvas fallback
3. **Image → Video**: Converts the generated/uploaded monster image into a playable & downloadable video via:
   - Tier 1: HuggingFace `Lightricks/LTX-Video` (or `/api/generate-video` serverless endpoint)
   - Tier 2: High-FPS `MediaRecorder` kinematic bio-animation (`canvas.captureStream(30)`) driven by BPM & combat stats

### FR-2: 15s Bioreactor → Fullscreen 3D Awakening Integration
1. Launching `15초 배양기 가동` passes the custom monster (`videoSrc`, `jumpscareImg`, `bpm`, `promptEn`) into `BioreactorScreen`.
2. `sanitizeVideoUrl` and `createVideoPipeline` accept `blob:` URLs cleanly without falling back to unrelated defaults.
3. `AwakeningRoar` displays fullscreen 3D awakening at 100% completion and stops cardiac thump audio cleanly on finish or return.

### FR-3: Real-time Duel (`monster_arena`) Stat-Driven Combat & Live Video
1. Custom monsters created in `CustomMonsterStudio` can launch directly into `monster_arena` (`customArenaRoster`) as Fighter 1 or be selected from the Fighter 1/2 dropdowns alongside the 6 curated specimens.
2. Combat simulation (`handleStartArenaBattle`) uses each fighter's `ATK`, `DEF`, `SPD`, `REGEN`, `ENERGY` stats to compute turn order, damage, critical hits, and counter-attacks alongside random variance.
3. Arena displays adult monster visuals (`jumpscareImg` + adult video segment `>= 65%` duration), center clash shockwave, live combat log ticker, and victory banner.
