# 🎯 [Kiro 후속 정밀 완결 지시서] 미완료 항목 마무리 및 최종 배포

> **지시 개요**: Kiro의 이전 보고서에서 **"지시대로 되지 않았거나 하지 않은 것"**으로 명시된 핵심 미완료 항목들을 즉시 완성하고, 커밋·푸시 및 Vercel 배포까지 완료하라.

---

## 🚨 해결해야 할 4대 완결 과제 (Remaining Finish Tasks)

### 1. 커스텀 괴수 영구 저장 UI 연결 (Custom Monster Vault Wiring)
* **문제점**: `monsterVaultService.ts`의 `saveMonster`와 `getAllMonsters`는 구현되었으나 UI에 연결되지 않아 새로고침 시 설계한 괴수가 사라짐.
* **해결 작업**:
  1. **`src/components/bioreactor/CustomMonsterStudio.tsx`**:
     - `buildCustomMonsterObject()`로 생성된 커스텀 괴수가 배양기(`handleStartCustomBioreactor`)나 결투장(`handleSendCustomToArena`)으로 전송될 때, `saveMonster`를 호출하여 IndexedDB에 저장.
     - (이미지 DataURL이나 비디오 Blob URL이 있으면 `fetch(url).then(r => r.blob())`로 추출하여 바이너리로 전달).
  2. **`src/components/BioStitchLabView.tsx`**:
     - 마운트 시(`useEffect`) `getAllMonsters()`를 호출하여 IndexedDB에 저장된 커스텀 괴수들을 복원하고 `customArenaRoster`에 자동으로 채움.
     - **새로고침을 하거나 브라우저를 껐다 켜도 내가 설계한 괴수가 결투장 드롭다운과 로스터에 그대로 유지**되도록 할 것!

---

### 2. 게임앱 수준 3D 컷씬 모션 연출 구현 (Game-App 3D Combat Motion)
* **문제점**: 중단으로 인해 1.3배 돌진, 카메라 쉐이크, 속성 필살기 연출이 아직 반영되지 않음.
* **해결 작업** (`src/components/BioStitchLabView.tsx`의 Dual Confrontation Stage):
  1. **도약 & 급돌진**:
     - `arenaPhase === "f1_strike"`: 좌측 괴수가 화면 전면으로 **1.3배 확대 줌인**되며 상대 쪽으로 **+60px 급돌진** (`scale-125 translate-x-16 z-30 brightness-125`).
     - `arenaPhase === "f2_strike"`: 우측 괴수가 **1.3배 확대 줌인**되며 좌측으로 **-60px 반격 돌진** (`scale-125 -translate-x-16 z-30 brightness-125`).
  2. **피격 리액션 & 카메라 흔들림 (Screen Shake)**:
     - 피격당한 괴수는 뒤로 밀려나며 붉은 피격 플래시(`bg-red-600/40`)와 진동 효과.
  3. **속성 필살기 & 대미지 연출**:
     - 라운드 이벤트의 속성 스킬명(`🌋 초고온 마그마 일격`, `⚡ 고전압 스파크 반격` 등)이 두 괴수 충돌 지점에서 화려하게 팝업.
  4. **최후의 KO 넉다운**:
     - 승리 괴수가 화면 중앙으로 클로즈업 줌인되며 승리 포효 연출, 패배 괴수는 페이드아웃.

---

### 3. 배양기(Bioreactor) 영상 매핑 무결성 점검
* `referenceVideoSelector.ts` 및 `comicMonsters.ts`에서 배양기 내부 성장 영상에 엉뚱한 전투 영상(`battle_*.mp4`)이 완전히 배제되었는지 최종 점검.
* 6종 샘플 괴수와 커스텀 괴수가 15초 배양기에서 6단계 줄기세포 성장(`growthStages`)을 거쳐 3D 각성 포효까지 온전히 재생되는지 확인.

---

### 4. 검증, 커밋, 푸시 및 Vercel 배포
1. `npx tsc --noEmit` 및 `npx tsc --noEmit -p api/tsconfig.json` 오류 0건 확인.
2. `npm test -- --run` 전체 테스트(233개 이상) 통과 확인.
3. `npm run build` 빌드 성공 확인.
4. 작업한 모든 변경 파일(`BioStitchLabView.tsx`, `CustomMonsterStudio.tsx`, `monsterVaultService.ts`, `battleStoryService.ts` 등)을 `git add`, `git commit` 후 `git push origin main`으로 푸시.
5. GitHub commit status API로 Vercel 배포 완료(`state=success`) 확인 후 최종 보고하라.
