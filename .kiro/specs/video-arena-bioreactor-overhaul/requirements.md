# Requirements Specification: Video, Arena, Bioreactor & Monster Vault Overhaul

## 1. Background & Problem Statement
Currently, both the **Bioreactor Growth Chamber** and the **3D Clash Arena** suffer from severe video repetition and lack of persistence:
1. **Clear Role Separation Needed**:
   - **Curated 6 Specimens**: Standard reference specimens that demonstrate how the 6-stage biological growth (Stem Cell -> Juvenile -> Adult) is visualized inside the bioreactor chamber.
   - **3 Pre-made Battle Samples**: Existing clash MP4s (`battle_dragon_vs_kraken.mp4`, `battle_cerberus_vs_hydra.mp4`, `battle_xeno_vs_frankenstein.mp4`) are ONLY demonstration mock battles for those exact 3 classic pairings.
   - **All Other Battles**: Must feature the actual designed custom monsters clashing in real-time or via generated AI battle clips.
2. **Missing Media Persistence (Monster Vault DB)**:
   - Currently, custom monsters created in the studio are kept only in temporary React state. Once the browser reloads, the custom monster's prompts, stats, image, and generated video blob URLs disappear.
   - Because video and high-res image blobs exceed localStorage limits (~5MB quota), an **IndexedDB-backed Monster Vault** is required to persist custom monsters (metadata, combat stats, image Blob, and video Blob) permanently across browser sessions.

---

## 2. Functional Requirements

### REQ-1: Role Separation for Samples vs Custom Battles
- **1.1 (6 Bioreactor Samples)**: The 6 curated specimen monsters (`CURATED_6_MONSTERS`) serve as biological benchmarks in the Bioreactor to showcase the 6-stage growth sequence (`growthStages`).
- **1.2 (3 Pre-made Mock Battles)**: The 3 pre-built battle videos in `public/videos/battles/` must ONLY play when the exact corresponding pair fights:
  - `myth_dragon` vs `myth_kraken` -> `battle_dragon_vs_kraken.mp4`
  - `myth_cerberus` vs `myth_hydra` -> `battle_cerberus_vs_hydra.mp4`
  - `alien_xenomorph` vs `myth_frankenstein` -> `battle_xeno_vs_frankenstein.mp4`
- **1.3 (All Other Battles)**: For ANY battle involving a custom designed monster, or any other monster pairing, the system MUST NOT play the dragon vs kraken mock video. It MUST execute the real combat scene using the designed monsters' own visuals and combat stats.

### REQ-2: Monster Vault Database (IndexedDB Persistence)
- **2.1 (Storage Engine)**: Implement `monsterVaultService.ts` utilizing browser `IndexedDB` (database: `KiroweenMonsterVault`, store: `custom_monsters`).
- **2.2 (Data Schema)**:
  - `id`: unique monster string (e.g. `custom_1731650000000`)
  - `nameKo` / `nameEn`: Monster name
  - `createdAt`: ISO timestamp
  - `parts`: body parts description
  - `stats`: `{ atk, def, spd, regen, energy }`
  - `promptEn` / `promptKo`: full prompt
  - `imageBlob`: raw image Blob / dataUrl
  - `videoBlob`: raw video Blob (MP4 or WebM)
  - `themeHex`: visual accent color
- **2.3 (Lifecycle)**:
  - When a custom monster is created/awoken in `CustomMonsterStudio`, automatically save or update it in the Monster Vault DB.
  - On application startup or Arena opening, load all saved custom monsters from IndexedDB into the fighter roster dropdowns.
  - Custom monsters persist indefinitely across browser refreshes and restarts.
  - Provide a one-click "Delete" or "Clear Vault" option in the roster manager.

### REQ-3: Real Custom Fighter Dual Confrontation in Arena
- **3.1**: When fighters clash in the Arena, the two fighters' actual video/living canvas (`f1.videoSrc` vs `f2.videoSrc`) face each other on the ring.
- **3.2**: Combat rounds (`f1_strike`, `f2_strike`, `clash`, `ko`) trigger dynamic forward lunges, strike shockwaves, attribute particle effects, recoil shakes, and floating damage numbers based on `arenaBattle.ts`.
- **3.3**: The user can click `⚔️ AI 결투 실사 영상 생성` to synthesize a unified cinematic clash clip for the pair using LTX / Luma.

### REQ-4: Bioreactor Video & Asset Cleanup
- **4.1**: Remove all battle videos (`battle_*.mp4`) from `referenceVideoSelector.ts` and incubator mappings.
- **4.2**: Curated monsters use biological growth sequences (`chimera_growth_*.mp4`).
- **4.3**: Custom monsters play their own video through all 6 growth stages.

### REQ-5: Quality & Regression
- **5.1**: `npx tsc --noEmit` exits with 0 errors.
- **5.2**: `npm test -- --run` passes all tests (including new IndexedDB vault tests).
- **5.3**: Production build `npm run build` succeeds.
