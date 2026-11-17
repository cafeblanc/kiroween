# Tasks: Next Kiro Execution Plan (LTX 2.5 + 3D Awakening + Arena)

- [x] **Task 1: LTX 2.5 Image-to-Video API 연동 보강**
  - `customMonsterMediaService.ts`의 `generateVideoFromMonsterImage`에 `/api/generate-video` 및 `Lightricks/LTX-Video` 호출 경로(토큰 또는 서버 프록시 있을 때 우선 실행, 실패 시 `MediaRecorder` 자동 폴백) 추가
  - `CustomMonsterStudio.tsx`에 선택적 LTX/HF 토큰 입력 또는 상태 배지 연동 여부 확인

- [x] **Task 2: 커스텀 괴수 능력치(ATK/DEF/SPD/REGEN/ENERGY) 결투장 실전 반영**
  - `ComicMonster` 확장 또는 `customStats` 전달을 통해 `handleStartArenaBattle()`이 공격력·방어력·속도·재생력·에너지 차이를 실제 타격 대미지·회피·선공·역전 확률에 반영하도록 개선
  - 전투 로그에 능력치 기반 특수 스킬(예: 초고온 마그마 일격, 고전압 스파크 반격) 출력

- [x] **Task 3: 15초 배양기 → 3D 각성 → 결투장 E2E 테스트**
  - 커스텀 괴수 생성 (`Text → Image → Video`) → `15초 배양기 가동` → `AwakeningRoar` 3D 각성 → `실시간 결투` 전체 흐름 수동/통합 검증
  - 6종 기본 괴수(`CURATED_6_MONSTERS`)와의 대결 영상(`BattleMatrix`) 및 성체 구간 루프 확인

- [x] **Task 4: 품질 검증 및 프로덕션 배포**
  - `npx tsc --noEmit` (0 errors)
  - `npm test` (all test files passing)
  - `npm run build`
  - `git commit` & `git push origin main` → Vercel Production `state: success` 확인
