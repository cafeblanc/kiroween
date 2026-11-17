# Implementation Tasks: Video, Arena, Bioreactor & Monster Vault Overhaul

- [ ] 1. Build Monster Vault IndexedDB Persistence (`monsterVaultService.ts`) <!-- id: 1 -->
  - [ ] 1.1 Create `src/services/monsterVaultService.ts` using native `indexedDB`:
    - Database name: `KiroweenMonsterVault`, store: `custom_monsters`.
    - Methods: `saveMonster`, `getAllMonsters`, `deleteMonster`, `clearVault`.
    - Automatically convert and store raw `Blob` for image and video.
    - On load, regenerate active `blob:` URLs via `URL.createObjectURL(blob)`.
  - [ ] 1.2 In `CustomMonsterStudio.tsx`, whenever a custom monster is generated or awakened (`handleStartCustomBioreactor` / `handleSendCustomToArena`), save it directly to `monsterVaultService`.
  - [ ] 1.3 In `BioStitchLabView.tsx`, load all stored monsters on mount via `monsterVaultService.getAllMonsters()` and initialize `customArenaRoster`.
  - [ ] 1.4 Write unit tests in `src/services/monsterVaultService.test.ts` verifying saving, retrieval, Blob reconstitution, and deletion.

- [x] 2. Overhaul Arena Clash Selection to Feature Custom Monsters <!-- id: 2 -->
  - [x] 2.1 In `BattleMatrix.ts` and `BioStitchLabView.tsx`, rewrite `selectPrebuiltBattleVideo`:
    - Return `null` whenever either fighter is a custom monster (`id.startsWith("custom_")`).
    - Return a pre-built video ONLY for the 3 exact mock battle pairs (Dragon vs Kraken, Cerberus vs Hydra, Xeno vs Frankenstein).
    - For all other combinations, return `null` (never fall back to dragon vs kraken).
  - [x] 2.2 When `selectPrebuiltBattleVideo` returns `null`, ensure `activeClashVideoUrl` is `null`, forcing the Dual Confrontation Stage to render.
  - [x] 2.3 Enhance the Dual Confrontation Stage JSX in `BioStitchLabView.tsx`:
    - Fighter 1 (Left) and Fighter 2 (Right) must display their own `videoSrc` or living portrait canvas.
    - Lunges, recoil shakes, damage numbers, and skill popups must visually animate both fighters.
    - On KO, zoom the winning monster with victory roar and display the combat stats comparison.
  - [x] 2.4 Add unit and property tests in `src/components/bioreactor/arena/BattleMatrix.test.ts`.

- [ ] 3. Remove Wrong Battle Videos from Bioreactor and Curate Growth Footage <!-- id: 3 -->
  - [-] 3.1 In `src/services/referenceVideoSelector.ts` and `src/data/comicMonsters.ts`, replace all incubator references to `battle_*.mp4` with appropriate biological growth sequences.
  - [ ] 3.2 Ensure `myth_frankenstein`, `alien_xenomorph`, and `myth_cerberus` use appropriate growth videos instead of battle clips.
  - [ ] 3.3 Verify `BioreactorScreen.tsx` plays custom monster videos seamlessly through all 6 growth stages.
  - [ ] 3.4 Update tests in `src/services/videoConcatenationService.test.ts` and `src/components/bioreactor/__tests__/growth-sequence.integration.test.tsx`.

- [ ] 4. Verification, Build, and Vercel Deployment <!-- id: 4 -->
  - [ ] 4.1 Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
  - [ ] 4.2 Run `npm test -- --run` and verify all tests pass.
  - [ ] 4.3 Run `npm run build` and ensure production build completes.
  - [ ] 4.4 Commit, push to `origin/main`, and verify successful deployment on `https://asura.cafeblanc.kr`.
