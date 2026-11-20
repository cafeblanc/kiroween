# 지시서: 샘플 괴수 6종 정리 · 이미지 프롬프트 · 결투 영상 방향

승인: 사용자 (2026-11-18). 목표는 "엉뚱한 이미지나 동영상이 나오지 않게" 하는 것이다.

## 0. 확인된 원인
| # | 원인 | 위치 |
|---|---|---|
| C1 | 샘플 기본 그림 4개가 이름과 다른 사진. 프로메테우스 = 돼지 뇌 실험 사진 | `MONSTER_STUDIO_PRESETS[].baseImageSrc`, `COMIC_MONSTERS`, `stemCellPhotos.ts` |
| C2 | 이미지 생성 실패(503 등) 시 C1의 사진에 색만 바꿔 보여 줌 | `generateCustomMonsterImage` 3단계 |
| C3 | Pollinations 호출에 `model=flux`가 없어 저품질 기본 모델 사용 | 같은 함수 2단계 |
| C4 | 부위 이름표가 번역되어 프롬프트에 들어감 ("Arms, Tentacles, Wings" → 드래곤에 촉수) | `composeDescriptionFromParts` → 번역 → `composeEnglishMonsterPrompt` |
| C5 | "전신" 지시 없음 → 정면 얼굴 클로즈업, 어둡고 흐림 | `composeEnglishMonsterPrompt` |
| C6 | 프로메테우스 머리 묘사에 "뇌 오가노이드" → 뇌가 그려짐 | 프리셋 `defaultParts.head` |
| C7 | 결투 첫 장면의 두 괴수가 모두 정면 → 카메라 쪽으로 불·주먹 | `composeBattleFirstFrame`, 결투 프롬프트 |

## 1. 샘플 6종 (규칙: 이름 = 묘사 = 대표 이미지)
- 묘사는 그 괴수에만 있는 형태를 구체적으로 쓴다. 추상어(성운, 자아, 오가노이드, 뇌) 금지.
- 각 부위 칸은 그 칸에 맞는 내용만 (드래곤 팔 칸에 촉수 금지, 꼬리 없는 괴수는 "꼬리 없음"을 명확히).
- 대표 이미지는 **새 프롬프트 파이프라인으로 그 기본 묘사를 그대로 넣어** 만든다 (앱과 같은 경로 → 일치 보장).
- 저장: `public/images/samples/<presetId>.jpg`, 하단 워터마크 띠 잘라냄.
- 검수: 6장 모두 직접 열어 확인. 이름과 맞지 않거나 전신이 아니면 시드를 바꿔 1회 재생성 (최대 2회, 그래도 안 되면 보고).
- 교체 대상: 프리셋 `baseImageSrc`, `COMIC_MONSTERS`의 같은 id 6개 `avatarImg/jumpscareImg`, `stemCellPhotos.ts` `imgSrc`.
- 호모 프로메테우스: 뇌 묘사 삭제 → 근육질 강화 인간 전사형 괴수.

## 2. 이미지 프롬프트 (composeEnglishMonsterPrompt)
- 번역 전에 `[베이스 종족: …]` 줄과 `• 머리:` 같은 이름표를 제거, 번역 후에도 같은 형태가 남으면 제거.
- 형식 (세미콜론으로 3구역, 결투 프롬프트가 2구역만 뽑아 씀):
  `Full-body shot of a single <Name> monster, its whole body visible from head to toe inside the frame, side three-quarter view facing right; <design>; <stat cues>; dark sci-fi arena background, dramatic rim lighting, sharp focus, highly detailed fantasy creature concept art, no text, no letters`
- 능력치 숫자(ATK 90 …)는 이미지 프롬프트에서 뺀다 (그림 안 글자 유발). 시각 단서만 유지.
- 디자인 구역 최대 700자, 단어 중간에서 자르지 않음.
- Pollinations: `model=flux`, 1024×1024, 실패 시 1회만 재시도, 시간 제한 45초.
- 최종 실패 시 대체 그림은 그 샘플의 대표 이미지 (C1 해결로 자동).

## 3. 결투 첫 장면 · 결투장
- 오른쪽 괴수 이미지는 좌우 반전 → 처음부터 서로 마주 봄 (영상 첫 프레임 + 결투장 오른쪽 화면).

## 4. 결투 영상 프롬프트 (LTX, 네거티브 프롬프트 없음 → 긍정 문장으로 방향 고정)
- 카메라: 옆에서 넓게, 두 괴수가 항상 옆모습으로 보이게, 옆으로 따라감.
- 모든 공격 문장에 "누가 → 어느 방향 → 상대의 어느 부위에 맞음 → 맞은 쪽 반응"을 쓴다.
  - 돌진·충돌, 발톱이 상대 얼굴·몸통을 침 → 뒤로 밀림
  - 꼬리가 상대 머리를 침 → 비틀거림
  - 고개를 상대 쪽으로 돌려 입에서 불(속성 공격)을 옆으로 뿜어 상대 가슴에 명중, 상대도 같은 식으로 반격
  - 두 불줄기가 가운데서 충돌, 폭발
- 금지 문장: 두 괴수는 카메라를 보거나 카메라 쪽으로 공격하지 않는다. 모든 공격은 상대를 향해 화면을 가로지른다.
- 기존 규칙 유지: 한 번의 연속 촬영(컷 없음), 정체성 고정(색·형태, 합쳐지지 않음), 1900자 이내, ASCII, "no text, no subtitles, no logos." 로 끝남.

## 5. 검증
- 단위 테스트: 이름표 제거, 새 프롬프트 형식, 숫자 없음, 디자인 추출(새·옛 형식), 결투 프롬프트 방향 문장, 길이 경계, 6개 프리셋 이미지 경로 존재.
- tsc, 전체 vitest, build.
- 결투 영상 실제 확인은 유료($1.56/12초) → 사용자가 앱에서 1회 생성해 확인.

## 범위 밖 (보고만)
- 숨겨진 키메라 배양실의 옛 영상·중복 파일 삭제는 별도 승인 후.
