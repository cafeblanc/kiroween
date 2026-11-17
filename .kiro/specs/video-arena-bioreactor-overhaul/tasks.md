# Implementation Tasks: Video, Arena, and Bioreactor Overhaul

- [ ] 1. Overhaul Arena Clash Selection to Feature Custom Monsters <!-- id: 1 -->
  - [ ] 1.1 In `src/components/BioStitchLabView.tsx` and `src/components/bioreactor/arena/BattleMatrix.ts`, modify `selectPrebuiltBattleVideo`:
    - Return `null` whenever either fighter is a custom monster (`id.startsWith("custom_")`).
    - Return `null` whenever there is no genuine pre-authored clash video for the pair. Do NOT return the fallback `battle_dragon_vs_kraken.mp4`.
  - [ ] 1.2 When `selectPrebuiltBattleVideo` returns `null`, ensure `activeClashVideoUrl` is `null`, forcing the UI to render the Dual Confrontation Stage.
  - [ ] 1.3 Enhance the Dual Confrontation Stage JSX in `BioStitchLabView.tsx`:
    - Verify Fighter 1 and Fighter 2 explicitly play their own `videoSrc` or animated portrait with `monster.colorHex` bio-aura.
    - Ensure strike lunges, recoil shakes, damage numbers, and skill popups clearly reflect the custom monster.
    - On KO, zoom the winning monster with victory roar and display the combat stats comparison.
  - [ ] 1.4 Add unit and property tests in `src/components/bioreactor/arena/BattleMatrix.test.ts` verifying custom monsters never receive fallback clash videos.

- [ ] 2. Remove Wrong Battle Videos from Bioreactor and Curate Growth Footage <!-- id: 2 -->
  - [ ] 2.1 In `src/services/referenceVideoSelector.ts` and `src/data/comicMonsters.ts`, replace all incubator references to `battle_*.mp4` with appropriate biological growth or awakening sequences.
  - [ ] 2.2 Ensure `myth_frankenstein`, `alien_xenomorph`, and `myth_cerberus` use appropriate growth videos instead of battle clips.
  - [ ] 2.3 Verify `BioreactorScreen.tsx` preserves custom monster video seamlessly from Stage 1 (Stem Cell) through Stage 6 (Adult Awakening).
  - [ ] 2.4 Update tests in `src/services/videoConcatenationService.test.ts` and `src/components/bioreactor/__tests__/growth-sequence.integration.test.tsx` to match clean video mappings.

- [ ] 3. Dynamic Visual Awakening for Custom Monsters <!-- id: 3 -->
  - [ ] 3.1 In `src/components/bioreactor/awakening/AwakeningRoar.tsx`, ensure the 3D burst overlay directly uses `monster.jumpscareImg || monster.avatarImg` with dynamic chromatic aberration and screen shockwave.
  - [ ] 3.2 Ensure the monster's roar audio (`monster.roarAudio`) and theme color (`monster.colorHex`) illuminate the glass cracks.

- [ ] 4. Verification, Build, and Vercel Deployment <!-- id: 4 -->
  - [ ] 4.1 Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
  - [ ] 4.2 Run `npm test -- --run` and verify all 210+ test cases pass.
  - [ ] 4.3 Run `npm run build` and ensure production build completes.
  - [ ] 4.4 Commit, push to `origin/main`, and verify successful deployment on `https://asura.cafeblanc.kr`.
