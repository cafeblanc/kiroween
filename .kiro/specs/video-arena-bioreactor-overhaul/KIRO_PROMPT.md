# 📜 [Kiro 정밀 실행 지시서] 간략한 배틀 스토리 생성·저장 및 스토리에 맞춘 3D 전투신 연동

> **이번 단계의 핵심 목표**:  
> **"두 설계 괴수의 생체 스펙을 바탕으로 '간략하고 강렬한 배틀 스토리'를 자동 생성하여 DB에 저장하고, 그 스토리에 맞춰 실감나는 3D 전투신을 연출 및 생성하라!"**

---

## 🎯 구현 요구사항 (Concrete Deliverables)

### 1. 간략한 배틀 스토리 생성기 (`src/services/battleStoryService.ts`)
* **입력 데이터**:
  * 파이터 1: 이름, 부위별 묘사, 5대 스탯(ATK, DEF, SPD, REGEN, ENERGY).
  * 파이터 2: 이름, 부위별 묘사, 5대 스탯(ATK, DEF, SPD, REGEN, ENERGY).
  * 전투 결과 (`resolveBattle`의 승자, 라운드별 발생 이벤트, 특수기명).
* **스토리 생성 구조 (3막 구조, 간략하고 역동적)**:
  * **1막 (대치와 조우)**: 두 괴수의 외형적 위압감과 생체 에너지의 충돌 (예: *"용암 비늘의 카이저 드래곤과 심해 촉수의 아비시안 크라켄이 어두운 배양 돔에서 마주쳐 격렬한 살기를 뿜어낸다."*)
  * **2막 (공방과 격돌)**: SPD 선공, ATK 타격, 특수기 충돌 (예: *"카이저 드래곤이 번개처럼 도약해 '초고온 마그마 일격'을 꽂아 넣자, 아비시안 크라켄이 전기 촉수 장벽으로 충격을 막아내며 반격한다."*)
  * **3막 (결정타와 KO)**: 최종 승자의 피니시 블로우와 승리 포효 (예: *"방어선이 무너진 크라켄의 중심부를 드래곤의 화염 숨결이 관통하며 치명적인 넉다운을 이끌어내고 포효한다."*)
* **규격**: 로컬 템플릿/규격 기반 고속 생성기(오프라인 지원) + 다국어(한국어 `storyKo`, 영어 `storyEn`) 지원.

---

### 2. 스토리의 IndexedDB 영구 저장 (`src/services/monsterVaultService.ts`)
* `monsterVaultService.ts`에 전투 기록(Battle Chronicle) 스토어(`battle_chronicles`) 또는 괴수별 최신 스토리 필드 추가.
* 두 괴수의 결투가 시작되거나 AI 영상이 생성될 때, **생성된 스토리 + 두 괴수 ID + 승자 + 타임스탬프**를 IndexedDB에 자동 저장.
* 브라우저를 새로고침하거나 나중에 다시 접속해도 **"📜 지난 전투 스토리 다시보기"** 가능.

---

### 3. 스토리를 바탕으로 한 3D 전투신 연동 (`src/components/BioStitchLabView.tsx`)
1. **결투장 UI 내 스토리 디스플레이**:
   * 결투장 링 하단/중앙에 **`📜 AI 생체 배틀 서사 (Battle Story)`** 창을 신설.
   * 라운드 진행(`f1_strike` -> `f2_strike` -> `clash` -> `ko`)에 맞춰 1막, 2막, 3막 스토리가 타이핑 애니메이션(또는 단계별 하이라이트)으로 노출.
2. **스토리 기반 3D 비디오 생성 프롬프트 합성**:
   * **`⚔️ 두 괴수의 AI 실사 3D 결투 동영상 생성`** 클릭 시:
   * 생성된 영문 스토리(`storyEn`)의 2막/3막 핵심 액션을 비디오 생성 프롬프트에 직접 반영:
     ```text
     "AAA mobile game cinematic battle cutscene, 3D bio-engineered creature clash between {f1.nameEn} and {f2.nameEn}: {storyEn.act2_clash}, {storyEn.act3_finish}, dynamic camera angle, neon shockwaves, 4k game trailer, no text"
     ```
   * 생성된 3~5초 실사 3D 동영상을 결투장 메인 뷰에 상영하고, 하단에 완성된 배틀 스토리를 자막처럼 띄움.
3. **기존 드래곤 vs 크라켄 옛날 영상 덮어쓰기 완전 차단**:
   * 사전 제작 3종 매칭이 아닌 경우 `selectPrebuiltBattleVideo`는 무조건 `null`을 반환하여, **두 설계 괴수가 직접 대치하는 듀얼 아레나 링**이 100% 작동하도록 보장.

---

### 4. 배양기(Bioreactor) 샘플 6개 및 커스텀 정상화
* `src/services/referenceVideoSelector.ts`에서 배양기에 들어가 있던 `BATTLE_XENO`, `BATTLE_CERBERUS` 등 엉뚱한 전투 동영상 매핑을 삭제하고 순수 생체 성장 영상(`chimera_growth_*.mp4`)으로 정상화.

---

## 🛠️ 작업 및 배포 절차
1. `src/services/battleStoryService.ts` 및 단위 테스트 `battleStoryService.test.ts` 구현.
2. `src/services/monsterVaultService.ts`에 스토리 저장 및 불러오기 연동.
3. `src/components/BioStitchLabView.tsx`에 스토리 표시창 및 듀얼 격돌 링 연동.
4. 검증 실행:
   - `npx tsc --noEmit` 타입 검사 0건 통과.
   - `npm test -- --run` 단위 테스트 전원 통과.
   - `npm run build` 빌드 성공 확인.
5. `git commit` 및 `origin/main` 푸시 후 Vercel 배포 확인 보고.
