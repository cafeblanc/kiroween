# Implementation Tasks: Story Generation, 3D Combat, and Vault DB

- [ ] 1. Implement Concise Battle Story Generator (`battleStoryService.ts`) <!-- id: 1 -->
  - [ ] 1.1 Create `src/services/battleStoryService.ts`:
    - Pure generator function accepting `f1`, `f2`, and `battleResult` from `arenaBattle.ts`.
    - Produces structured 3-act narrative (`act1_intro`, `act2_clash`, `act3_finish`) in Korean and English.
    - Accurately incorporates body parts, combat stats (ATK, DEF, SPD, REGEN, ENERGY), and specific triggered skills (`🌋 초고온 마그마 일격` etc.).
  - [ ] 1.2 Write comprehensive unit tests in `src/services/battleStoryService.test.ts`.

- [ ] 2. Build Monster Vault IndexedDB Persistence with Story Chronicles (`monsterVaultService.ts`) <!-- id: 2 -->
  - [ ] 2.1 Implement `src/services/monsterVaultService.ts`:
    - Database `KiroweenMonsterVault` with stores: `custom_monsters` and `battle_chronicles`.
    - Methods: `saveMonster`, `getAllMonsters`, `saveBattleChronicle`, `getLatestBattleStory`, `deleteMonster`, `clearVault`.
    - Handles raw `Blob` storage for images and videos with automatic `URL.createObjectURL(blob)` recovery.
  - [ ] 2.2 Write unit tests in `src/services/monsterVaultService.test.ts`.

- [ ] 3. Wire Battle Story & Dynamic 3D Combat Arena into `BioStitchLabView.tsx` <!-- id: 3 -->
  - [ ] 3.1 In `selectPrebuiltBattleVideo`, return `null` for custom monsters and non-sample pairs (never fallback to dragon vs kraken).
  - [ ] 3.2 Display the generated battle story (`act1`, `act2`, `act3`) in the Arena HUD during and after the battle.
  - [ ] 3.3 When generating the AI 3D battle clip via LTX / Luma, inject the generated English story into the prompt:
    `"AAA mobile game cinematic battle cutscene, 3D bio-engineered creature clash between {f1.nameEn} and {f2.nameEn}: {storyEn.act2_clash}, {storyEn.act3_finish}, dynamic camera angle, neon shockwaves, 4k game trailer, no text"`
  - [ ] 3.4 Ensure the Dual Confrontation Stage visibly lunges, shakes, flashes, and displays the battle story in sync.

- [ ] 4. Clean Bioreactor Video Mappings <!-- id: 4 -->
  - [ ] 4.1 Remove all battle video references from `src/services/referenceVideoSelector.ts` and `src/data/comicMonsters.ts`.
  - [ ] 4.2 Verify 6-stage growth functions cleanly for both curated 6 specimens and custom monsters.

- [ ] 5. Verification, Build, and Vercel Deployment <!-- id: 5 -->
  - [ ] 5.1 Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
  - [ ] 5.2 Run `npm test -- --run` and verify all tests pass.
  - [ ] 5.3 Run `npm run build` and ensure production build succeeds.
  - [ ] 5.4 Commit, push to `origin/main`, and verify deployment on `https://asura.cafeblanc.kr`.
