# 🎯 Kiro 핵심 작업 지시서: 설계된 괴수들의 실전 전투 장면 구현 및 전면 개편

> **핵심 원칙**: **"사용자가 직접 설계한 괴수들로 전투 장면을 만드는 것이 본 프로젝트의 절대적인 핵심이다!"**  
> 현재 코드처럼 사용자가 기껏 설계한 괴수는 온데간데없고, 옛날 드래곤 vs 크라켄 영상(`battle_dragon_vs_kraken.mp4`)을 틀어버리는 엉터리 폴백을 완전히 박멸하고, **설계된 괴수들이 링 위에서 직접 격돌하는 실전 전투 장면**을 구현하라.

---

## 🚨 최우선 해결 과제 (Critical Objective)

1. **설계된 괴수가 직접 등장하는 실시간 결투장 (Dual Dynamic Combat Arena)**:
   * 사용자가 설계한 커스텀 괴수(`arenaFighter1`)와 상대 괴수(`arenaFighter2`)가 결투장 링의 좌/우에 **실제 본인의 영상/살아 숨쉬는 비주얼로 마주 보고 섭니다.**
   * 옛날 고정 영상(`battle_dragon_vs_kraken.mp4`) 오버레이를 영구 제거합니다.
   * 전투가 시작되면 설계된 괴수들이 실제로:
     * **돌진 및 도약 공격**: 선공 괴수가 상대 진영으로 화면을 뚫을 듯 돌진(Lunge & Zoom)하며 타격 이펙트 방출.
     * **피격 및 충격파**: 맞은 괴수가 뒤로 밀려나며 붉은 섬광과 피격 진동.
     * **특수기 폭발**: 괴수의 속성(화염, 번개, 맹독, 산성, 생체오라)과 능력치(ATK, DEF, SPD, REGEN, ENERGY)에 맞춘 고유 필살기(`🌋 초고온 마그마 일격`, `⚡ 고전압 스파크 반격` 등)가 두 괴수 사이에서 직접 터져 나옴.
     * **최후의 KO 및 승리 포효**: 승리한 설계 괴수가 화면 중앙으로 클로즈업되며 승리의 포효를 내지르고, 패배한 괴수는 넉다운.

2. **설계된 괴수 맞춤형 'AI 실사 격돌 동영상(AI Clash Video)' 생성 버튼 복원/강화**:
   * 결투장 상단에 **`⚔️ 두 괴수의 AI 실사 격돌 영상 생성 (LTX / Luma)`** 버튼을 명확히 배치.
   * 클릭 시: 파이터 1의 설계 프롬프트와 파이터 2의 설계 프롬프트를 합성하여:
     `"Epic cinematic clash between {fighter1.nameEn} ({fighter1.promptEn}) and {fighter2.nameEn} ({fighter2.promptEn}) battling inside a dark sci-fi bio-arena, claws and energy clashing, hyper-realistic 8k"`
   * LTX-Video / Luma / HuggingFace를 통해 **"실제 두 설계 괴수가 맞붙어 싸우는 AI 생성 비디오"**를 렌더링하여 결투장 중앙에 상영할 수 있도록 연동.

3. **배양기(Bioreactor) 영상 매핑 정상화**:
   * `referenceVideoSelector.ts` 및 `comicMonsters.ts`에서 성장 배양기에 엉뚱하게 들어가 있던 '전투 영상(`battle_*.mp4`)'을 전면 삭제.
   * 배양기에는 생체 성장 영상(`chimera_growth_*.mp4`)만 들어가도록 정상화하고, 사용자가 설계한 커스텀 괴수는 15초 동안 **자신의 세포 분열 → 성체 각성**을 100% 온전히 보여주도록 보장.

---

## 🛠️ 작업 상세 지시 (Tasks)

### Task 1: 결투장 엔진 재코딩 (`src/components/BioStitchLabView.tsx`, `BattleMatrix.ts`)
* `selectPrebuiltBattleVideo`:
  * 커스텀 괴수가 포함되어 있거나 고유 사전 제작 영상이 없는 경우 **무조건 `null` 반환** (드래곤 vs 크라켄 옛날 영상 반환 절대 금지).
  * `activeClashVideoUrl`을 `null`로 유지하여, **두 괴수가 직접 맞붙는 듀얼 전투 장면이 100% 실행**되도록 할 것.
* 듀얼 전투 링 UI 강화:
  * 좌측: 사용자가 설계한 괴수의 영상(`arenaFighter1.videoSrc`) 또는 살아 움직이는 생체 캔버스.
  * 우측: 상대 괴수의 영상(`arenaFighter2.videoSrc`).
  * `arenaBattle.ts`의 각 라운드 타이머(`f1_strike`, `f2_strike`, `clash`, `ko`)에 맞춰 실제로 전진 돌진, 카메라 쉐이크, 속성 타격 이펙트, 체력바 차감, KO 승리 세레머니를 완성도 높게 렌더링.

### Task 2: 두 설계 괴수의 'AI 격돌 영상 생성' 기능 완성
* 결투장 툴바에 **`⚔️ AI 결투 실사 영상 생성`** 버튼 배치.
* 두 파이터의 부위별 묘사 + 스탯을 결합한 대전 프롬프트를 구성하여 `/api/generate-video` (LTX-Video / Luma)로 요청.
* 생성 성공 시 `aiBattleVideoUrl`에 담아 전체 화면 시네마틱 전투로 전환하고, 닫으면 다시 듀얼 아레나로 복귀.

### Task 3: 배양기(Bioreactor) 자산 매핑 정상화
* `src/services/referenceVideoSelector.ts`에서 `BATTLE_XENO`, `BATTLE_CERBERUS` 등 전투 영상 매핑 제거.
* 생체 성장 비디오로 올바르게 재배치하고, 커스텀 괴수는 자신의 생성 미디어를 배양기 6단계에 걸쳐 온전히 재생.

### Task 4: 검증 및 배포
* `npx tsc --noEmit` 통과 확인.
* `npm test -- --run` 전체 테스트(210개 이상) 통과 확인.
* `npm run build` 빌드 성공 확인.
* `git commit` 및 `origin/main` 푸시, 배포 완료 후 결과 보고.
