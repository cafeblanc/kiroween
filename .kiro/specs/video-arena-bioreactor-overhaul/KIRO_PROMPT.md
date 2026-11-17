# 🎯 [Kiro 정밀 작업 지시서] 이미지와 실감나는 3D 전투 동영상 중심의 전면 개편

> **최우선 절대 원칙**:  
> **"가장 중요한 것은 고품질 이미지와 실감나는 3D 전투 동영상이다!"**  
> 1. **샘플 6개**: 배양기에서 6단계 줄기세포 성장 과정이 어떻게 표시되는지 보여주는 레퍼런스 표본.
> 2. **모의 전투신 3개 샘플**: (드래곤 vs 크라켄, 케르베로스 vs 히드라, 제노모프 vs 프랑켄슈타인) 오직 해당 3개 매칭에만 시연용으로 적용.
> 3. **그 외의 모든 전투신**: **"사용자가 설계한 괴수들로 실감나는 3D 전투 장면을 직접 연출"**한다.
> 4. **영속 저장소 (Monster Vault DB)**: 생성된 고해상도 이미지와 3D 전투 동영상이 새로고침해도 날아가지 않도록 **브라우저 IndexedDB에 영구 보존**한다.

---

## 🚨 핵심 개발 과제 (Core Objectives)

### 1. 실감나는 3D 전투 동영상 & 실시간 듀얼 격돌 엔진 (Cinematic 3D Clash Engine)
- **파일**: `src/components/BioStitchLabView.tsx`, `src/components/bioreactor/arena/BattleMatrix.ts`
- **엉터리 고정 영상 차단**:
  - `selectPrebuiltBattleVideo`: 커스텀 괴수가 포함되어 있거나 3대 샘플 매칭이 아닌 경우 **무조건 `null` 반환** (옛날 드래곤 vs 크라켄 영상 강제 덮어쓰기 완전 박멸).
- **실감나는 3D 전투 무대 (Dual Dynamic 3D Arena)**:
  - 좌/우 링 위에 두 괴수의 **실제 3D/AI 영상(`videoSrc`)** 또는 **생체 오라가 맥동하는 입체적 캔버스**가 대치.
  - 전투 라운드 타이머(`f1_strike`, `f2_strike`, `clash`, `ko`)에 맞춰 **실제 타격 액션** 연출:
    - **입체적 돌진 타격**: 공격 괴수가 카메라 앞으로 튀어나오듯 확대(Zoom-in 1.25x)되며 상대 진영으로 맹렬히 돌진(+60px lunge), 베기/할퀴기 3D 광선 이펙트 및 충격파 방출.
    - **피격 리액션**: 맞은 괴수가 뒤로 크게 밀려나며 화면 전체에 붉은 섬광과 카메라 쉐이크(Screen Shake).
    - **속성 필살기 폭발**: 능력치(ATK, DEF, SPD, REGEN, ENERGY)에 맞춘 고유 3D 스킬(`🌋 초고온 마그마 일격`, `⚡ 고전압 스파크 반격`, `☣️ 맹독 산성 분사` 등) 폭발.
    - **최후의 KO & 승리 포효**: 승리 괴수가 3D 클로즈업되며 승리의 포효를 내지르고 승리 엠블럼 표출.
- **두 괴수의 'AI 3D 실사 격돌 동영상(LTX/Luma)' 원클릭 생성**:
  - 결투장 툴바에 **`⚔️ 두 괴수의 AI 3D 실사 격돌 영상 생성`** 버튼 배치.
  - 두 괴수의 부위별 프롬프트와 스탯을 합성하여 LTX-Video / Luma로 요청 -> 실제 두 괴수가 서로 맞붙어 싸우는 고유 시네마틱 MP4를 생성하여 결투장에 즉시 상영.

---

### 2. 고화질 이미지 & 동영상 영구 보존 DB (Monster Vault IndexedDB)
- **신규 파일**: `src/services/monsterVaultService.ts`
- **배경**: `localStorage`는 5MB 용량 한계로 비디오/이미지 저장이 불가능함. 브라우저 대용량 저장소인 `IndexedDB`를 구축하여 수백 MB의 비디오/이미지 바이너리 Blob을 영구 보존.
- **기능 요구사항**:
  1. `IndexedDB` (DB명: `KiroweenMonsterVault`, Store명: `custom_monsters`) 구현.
  2. `saveMonster(monster)`:
     - 이름, 부위 프롬프트, 5대 스탯, 테마 색상 저장.
     - 고해상도 이미지 DataURL 및 생성된 비디오를 바이너리 `Blob`으로 추출하여 영구 저장.
  3. `getAllMonsters()`:
     - 앱 시작 시 또는 결투장 열람 시 저장된 모든 커스텀 괴수를 불러옴.
     - 저장된 비디오 Blob을 `URL.createObjectURL(blob)`로 즉시 재생 가능한 URL로 복구하여 반환.
  4. `deleteMonster(id)` 및 `clearVault()` 제공.
- **연동**:
  - `CustomMonsterStudio.tsx`: 이미지/영상 생성 완료 시 및 배양기/결투장 전송 시 `saveMonster` 호출.
  - `BioStitchLabView.tsx`: 마운트 시 `getAllMonsters()`로 `customArenaRoster` 자동 복원 (브라우저를 껐다 켜도 내가 만든 괴수들과 영상들이 영구 보존됨).

---

### 3. 배양기(Bioreactor) 샘플 6개 및 커스텀 성장 정상화
- **파일**: `src/services/referenceVideoSelector.ts`, `src/data/comicMonsters.ts`
- **샘플 6개 (`CURATED_6_MONSTERS`)**: 배양기 6단계 성장(줄기세포 -> 난할 -> 배아 -> 기관형성 -> 유체 -> 성체 각성)의 시각적 레퍼런스로 확정.
- **배양기 내 전투 영상 매핑 제거**: `referenceVideoSelector.ts`의 `BATTLE_XENO`, `BATTLE_CERBERUS` 등 엉뚱한 전투 영상 참조를 완전 삭제하고, 순수 생체 성장 영상(`chimera_growth_*.mp4`)으로 정상 배치.
- **커스텀 괴수 배양**: 사용자가 설계한 커스텀 영상이 15초 동안 6단계 성장을 거쳐 3D 각성 포효까지 온전히 재생되도록 보장.

---

## 🛠️ 작업 및 배포 절차
1. `src/services/monsterVaultService.ts` 및 단위 테스트 `monsterVaultService.test.ts` 작성.
2. `BioStitchLabView.tsx` 및 `BattleMatrix.ts`의 3D 격돌 링 UI 및 Vault 연동.
3. `referenceVideoSelector.ts`의 배양기 영상 정리.
4. 검증 실행:
   - `npx tsc --noEmit` 타입 검사 오류 0건 확인.
   - `npm test -- --run` 전체 테스트 통과 확인.
   - `npm run build` 빌드 성공 확인.
5. `git commit` 및 `origin/main` 푸시 후 Vercel 배포 확인 보고.
