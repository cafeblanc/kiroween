# 🎯 [Kiro 정밀 작업 지시서] 설계된 괴수들의 실전 전투 장면 구현 및 DB 영속 저장소 구축

> **핵심 원칙**: 
> 1. **"샘플 6개는 배양기에서 6단계 성장 과정이 어떻게 표시되는지 보여주는 레퍼런스로 사용한다."**
> 2. **"모의 전투신 3개의 샘플(드래곤vs크라켄, 케르베로스vs히드라, 제노모프vs프랑켄슈타인)은 오직 해당 3개 매칭에만 시연용으로 적용한다."**
> 3. **"그 외의 모든 전투신은 사용자가 설계한 괴수들로 직접 전투 장면을 만든다."**
> 4. **"이를 위해 사용자가 설계한 괴수의 프롬프트, 5대 스탯, 고해상도 이미지 및 생성 동영상(Blob)을 브라우저 DB(IndexedDB)에 영구 보관하는 Monster Vault 시스템을 구축한다."**

---

## 🚨 최우선 해결 과제 (Critical Tasks)

### 1. 커스텀 괴수 이미지·동영상 영속 보관함 (Monster Vault IndexedDB) 구축
- **신규 파일**: `src/services/monsterVaultService.ts`
- **배경**: `localStorage`는 5MB 용량 한계로 인해 무거운 비디오와 이미지를 저장할 수 없음. 브라우저 표준 대용량 저장소인 `IndexedDB`를 구축하여 수백 MB의 비디오/이미지 Blob을 영구 보관해야 함.
- **기능 요구사항**:
  1. `IndexedDB` (데이터베이스명: `KiroweenMonsterVault`, 객체저장소: `custom_monsters`) 초기화.
  2. `saveMonster(monster)`:
     - 괴수의 기본 정보(이름, 프롬프트, 5대 스탯, 테마 색상) 저장.
     - 이미지 DataURL 및 비디오 Blob URL을 바이너리 `Blob`으로 추출하여 IndexedDB에 영구 보존.
  3. `getAllMonsters()`:
     - 앱 시작 시 또는 결투장 열람 시 저장된 모든 커스텀 괴수를 조회.
     - 저장된 비디오 Blob을 `URL.createObjectURL(blob)`로 즉시 재생 가능한 URL로 복원하여 반환.
  4. `deleteMonster(id)` 및 `clearVault()` 제공.
- **연동 파일**:
  - `src/components/bioreactor/CustomMonsterStudio.tsx`: 괴수 생성 또는 배양기/결투장 전송 시 `saveMonster` 호출.
  - `src/components/BioStitchLabView.tsx`: 마운트 시 `getAllMonsters()`를 호출하여 `customArenaRoster`에 자동으로 채워 넣음 (브라우저를 껐다 켜도 내가 만든 괴수 목록이 100% 유지).

---

### 2. 결투장(아레나)의 역할 분담 및 실시간 듀얼 격돌 엔진 완성
- **파일**: `src/components/BioStitchLabView.tsx`, `src/components/bioreactor/arena/BattleMatrix.ts`
- **역할 분담 규칙 (`selectPrebuiltBattleVideo`)**:
  - **오직 3개의 모의 전투 샘플 매칭에만 사전 제작 영상 반환**:
    1. 드래곤(`myth_dragon`) vs 크라켄(`myth_kraken`) -> `battle_dragon_vs_kraken.mp4`
    2. 케르베로스(`myth_cerberus`) vs 히드라(`myth_hydra`) -> `battle_cerberus_vs_hydra.mp4`
    3. 제노모프(`alien_xenomorph`) vs 프랑켄슈타인(`myth_frankenstein`) -> `battle_xeno_vs_frankenstein.mp4`
  - **그 외의 모든 대전(커스텀 괴수 vs 커스텀 괴수, 커스텀 괴수 vs 샘플 괴수 등)은 무조건 `null`을 반환**:
    - 절대 옛날 드래곤 vs 크라켄 영상으로 덮어쓰지 말 것!
- **Dual Confrontation Stage (실제 설계 괴수들의 격돌 무대)**:
  - `activeClashVideoUrl`이 `null`일 때 링 위에 두 괴수의 실제 비디오(`f1.videoSrc` vs `f2.videoSrc`)가 마주 보고 대치.
  - 라운드 타이머(`f1_strike`, `f2_strike`, `clash`, `ko`)에 따라:
    - 선공 괴수가 상대 진영으로 크게 도약 돌진(+60px, 1.25배 줌)하며 타격 이펙트 방출.
    - 피격 괴수는 뒤로 밀려나며 붉은 피격 플래시 및 충격파 흔들림.
    - `arenaBattle.ts`에 의해 계산된 능력치 기반 특수기(`🌋 초고온 마그마 일격`, `⚡ 고전압 스파크 반격` 등) 팝업.
    - KO 시 승리한 설계 괴수가 화면 중앙으로 클로즈업되며 승리 포효 연출!
- **AI 결투 실사 영상 생성 버튼 유지**:
  - 두 설계 괴수의 프롬프트를 결합하여 LTX / Luma로 대전 비디오를 생성하는 기능(`aiBattleVideoUrl`)은 원클릭 옵션으로 유지.

---

### 3. 배양기(Bioreactor) 샘플 6개 및 커스텀 성장 정상화
- **파일**: `src/services/referenceVideoSelector.ts`, `src/data/comicMonsters.ts`
- **샘플 6개 (`CURATED_6_MONSTERS`)**: 배양기에서 6단계 줄기세포 분열 → 성체 성장 과정이 어떻게 시각화되는지 보여주는 레퍼런스 표본으로 고정.
- **배양기 내 전투 영상 매핑 완전 삭제**:
  - `referenceVideoSelector.ts`에서 `BATTLE_XENO`, `BATTLE_CERBERUS` 등 엉뚱한 전투 영상(`battle_*.mp4`) 매핑을 모두 삭제하고, 생체 성장 영상(`chimera_growth_*.mp4`)으로 정상 배치.
- **커스텀 괴수 배양**:
  - 사용자가 설계하여 Monster Vault에 저장된 커스텀 영상이 15초 배양기 6단계에 걸쳐 100% 온전히 재생되도록 보장.

---

## 🛠️ 작업 및 배포 절차
1. `src/services/monsterVaultService.ts` 및 단위 테스트 `monsterVaultService.test.ts` 구현.
2. `BioStitchLabView.tsx` 및 `BattleMatrix.ts`의 전투 영상 분기 및 Vault 연동 수정.
3. `referenceVideoSelector.ts`의 배양기 영상 정리.
4. 검증 실행:
   - `npx tsc --noEmit` 타입 검사 오류 0건 확인.
   - `npm test -- --run` 전체 테스트 통과 확인.
   - `npm run build` 빌드 성공 확인.
5. `git commit` 및 `origin/main` 푸시 후 Vercel 배포 확인 보고.
