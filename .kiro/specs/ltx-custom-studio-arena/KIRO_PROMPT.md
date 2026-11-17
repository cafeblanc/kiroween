# Kiro 작업 지시서 (복사해서 Kiro에 바로 입력)

`.kiro/specs/ltx-custom-studio-arena/`의 `requirements.md`, `design.md`, `tasks.md`를 기준으로 아래 순서대로 작업을 진행해 주세요.

## 1. 커스텀 괴수 설계 (Text → Image → Video) LTX 2.5 실사 연동
- `src/services/customMonsterMediaService.ts`:
  - `generateVideoFromMonsterImage()`에서 `/api/generate-video` 또는 HuggingFace `Lightricks/LTX-Video` (`hfToken` 또는 서버 프록시 사용)를 우선 호출해 실사 동영상을 생성하고, 미설정·실패 시에만 `MediaRecorder` 애니메이션으로 자동 폴백하도록 구현하라.
  - `generateCustomMonsterImage()`가 부위별 입력(머리, 뿔·왕관·전극, 몸통, 팔·촉수·날개, 다리, 꼬리, 피부·오라)과 `ATK/DEF/SPD/REGEN/ENERGY` 스탯을 영문 프롬프트에 반영해 매번 다른 이미지를 생성하는지 확인하라.
- `src/components/bioreactor/CustomMonsterStudio.tsx`:
  - 필요 시 선택적 HF/LTX 토큰 입력 또는 LTX 연동 상태 표시를 유지하고, 생성된 이미지와 동영상이 즉시 재생·다운로드되며 15초 배양기 및 결투장으로 전달되도록 검증하라.

## 2. 15초 배양기 → 전체 화면 3D 각성 → 실시간 결투장 연동 고도화
- `src/components/BioStitchLabView.tsx`:
  - 커스텀 괴수(`blob:` videoSrc)가 `BioreactorScreen` → `AwakeningRoar`(전체 화면 3D 각성)까지 끊김 없이 재생되고, 종료 시 심박 오디오가 정지하는지 검증하라.
  - `handleStartArenaBattle()`에서 `ATK/DEF/SPD/REGEN/ENERGY` 능력치 차이가 실제 선공 확률, 타격 대미지, 치명타, 반격 및 실시간 전투 로그(특수 스킬 명칭 포함)에 반영되도록 구현하라.

## 3. 테스트 · 빌드 · 배포
- `npx tsc --noEmit`, `npm test`, `npm run build`를 모두 통과시켜라.
- 변경 사항을 `main` 브랜치에 커밋·푸시하고 Vercel 프로덕션 배포(`state: success`)까지 확인한 뒤 보고하라.
