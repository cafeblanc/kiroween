# 🎮 [Kiro 정밀 작업 지시서] 게임앱 수준의 3~5초 실감나는 3D 전투 동영상 제작 및 전면 개편

> **절대 핵심 과제**:  
> **"짧지만 강렬하고 실감나는 '게임앱(AAA 모바일 게임/언리얼 엔진 5 시네마틱 컷씬) 수준'의 3D 전투 동영상을 구현하라!"**  
> 
> 1. **역할 분담**:
>    - **샘플 6개**: 배양기에서 6단계 줄기세포 성장 과정이 어떻게 표시되는지 보여주는 레퍼런스 표본.
>    - **모의 전투신 3개 샘플**: (드래곤 vs 크라켄, 케르베로스 vs 히드라, 제노모프 vs 프랑켄슈타인) 오직 해당 3개 매칭에만 시연용으로 적용.
>    - **그 외의 모든 전투신**: **"사용자가 설계한 괴수들로 3~5초 게임앱 수준의 실감나는 3D 전투 장면을 연출"**한다.
> 2. **Monster Vault (IndexedDB 영속 저장소)**: 생성된 고해상도 이미지와 3D 전투 비디오(Blob)를 브라우저 DB에 영구 보존하여 새로고침 후에도 언제든 즉시 재생/대전 가능하도록 구축한다.

---

## 🚨 핵심 개발 규격 (Game-App Level 3D Combat Specifications)

### 1. 게임앱 수준의 3~5초 3D 전투 컷씬 & 듀얼 격돌 엔진
- **파일**: `src/components/BioStitchLabView.tsx`, `src/services/videoGenService.ts`, `src/utils/arenaBattle.ts`
- **시네마틱 게임 컷씬 프롬프트 엔진**:
  - 두 설계 괴수의 대전 비디오 생성 시, AAA 모바일 게임 트레일러 수준의 3D 연출 프롬프트를 자동 합성:
    ```text
    "AAA mobile game cinematic battle cutscene, 3D bio-engineered creature clash, dynamic action camera angle, motion blur, glowing bioluminescent energy particles, intense shockwave impact, dramatic rim lighting, photorealistic creature rendering, 4k game trailer quality, no text"
    ```
  - LTX-Video / Luma API 프록시를 통해 **짧고 강렬한 3~5초 실사 3D 전투 영상(`aiBattleVideoUrl`)**을 렌더링하여 결투장 중앙에 풀화면으로 박진감 넘치게 상영.
- **실시간 듀얼 3D 아레나 무대 (Dual Dynamic 3D Arena)**:
  - 사전 제작 3종 매칭이 아닌 경우, 옛날 드래곤 vs 크라켄 영상을 덮어쓰지 말고 **무조건 두 괴수가 직접 싸우는 듀얼 아레나 링**을 가동 (`activeClashVideoUrl === null`).
  - **게임앱 수준의 역동적 전투 모션 연출**:
    - **도약 & 카메라 줌**: 공격 괴수가 화면 앞(카메라 쪽)으로 1.3배 확대되며 상대 진영으로 맹렬히 돌진(`scale-125`, `translate-x-16`).
    - **타격 임팩트 & 파티클**: 타격 순간 게임 특유의 크리티컬 슬래시 섬광 및 화면 흔들림(Camera Shake).
    - **능력치 필살기 팝업**: 괴수의 속성(화염, 번개, 맹독, 산성)과 5대 스탯에 따른 3D 스킬(`🌋 초고온 마그마 일격`, `⚡ 고전압 스파크 반격` 등)이 화려하게 폭발.
    - **KO 넉다운 연출**: 승리 괴수가 3D 클로즈업 포효를 내지르고, 패배 괴수는 넉다운되며 슬로우 모션 승리 엠블럼 표출.

---

### 2. 고화질 이미지 & 3D 동영상 영구 보존 DB (Monster Vault IndexedDB)
- **신규 파일**: `src/services/monsterVaultService.ts`
- **배경**: `localStorage`는 5MB 한계로 비디오 저장이 불가능함. 브라우저 대용량 저장소인 `IndexedDB`를 구축하여 수백 MB의 3D 비디오/이미지 바이너리 Blob을 영구 보존.
- **기능 요구사항**:
  1. `IndexedDB` (DB명: `KiroweenMonsterVault`, Store명: `custom_monsters`) 구현.
  2. `saveMonster(monster)`:
     - 괴수 메타데이터(이름, 부위 프롬프트, 5대 스탯, 테마 색상) 저장.
     - 고해상도 이미지 및 3~5초 3D 비디오를 바이너리 `Blob`으로 추출하여 영구 저장.
  3. `getAllMonsters()`:
     - 앱 시작 시 및 결투장 열람 시 저장된 모든 커스텀 괴수를 불러옴.
     - 저장된 비디오 Blob을 `URL.createObjectURL(blob)`로 즉시 재생 가능한 URL로 복원하여 반환.
  4. `deleteMonster(id)` 및 `clearVault()` 제공.
- **연동**:
  - `CustomMonsterStudio.tsx`: 이미지/영상 생성 완료 시 및 배양기/결투장 전송 시 `saveMonster` 호출.
  - `BioStitchLabView.tsx`: 마운트 시 `getAllMonsters()`로 `customArenaRoster` 자동 복원 (브라우저를 껐다 켜도 내가 만든 괴수들과 3D 영상들이 영구 보존됨).

---

### 3. 배양기(Bioreactor) 샘플 6개 및 커스텀 성장 정상화
- **파일**: `src/services/referenceVideoSelector.ts`, `src/data/comicMonsters.ts`
- **샘플 6개 (`CURATED_6_MONSTERS`)**: 배양기 6단계 성장(줄기세포 -> 난할 -> 배아 -> 기관형성 -> 유체 -> 성체 각성)의 시각적 레퍼런스로 확정.
- **배양기 내 전투 영상 매핑 제거**: `referenceVideoSelector.ts`의 `BATTLE_XENO`, `BATTLE_CERBERUS` 등 엉뚱한 전투 영상 참조를 완전 삭제하고, 순수 생체 성장 영상(`chimera_growth_*.mp4`)으로 정상 배치.
- **커스텀 괴수 배양**: 사용자가 설계한 커스텀 영상이 15초 동안 6단계 성장을 거쳐 3D 각성 포효까지 온전히 재생되도록 보장.

---

## 🛠️ 작업 및 배포 절차
1. `src/services/monsterVaultService.ts` 및 단위 테스트 `monsterVaultService.test.ts` 작성.
2. `BioStitchLabView.tsx` 및 `BattleMatrix.ts`의 게임앱 수준 3D 격돌 연출 및 Vault 연동.
3. `referenceVideoSelector.ts`의 배양기 영상 정리.
4. 검증 실행:
   - `npx tsc --noEmit` 타입 검사 오류 0건 확인.
   - `npm test -- --run` 전체 테스트 통과 확인.
   - `npm run build` 빌드 성공 확인.
5. `git commit` 및 `origin/main` 푸시 후 Vercel 배포 확인 보고.
