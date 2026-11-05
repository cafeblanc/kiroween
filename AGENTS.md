# Antigravity 작업 규칙 (AGENTS.md)

## 무한 루프 방지 및 작업 시도 제한 규칙 (CRITICAL)

### 1. 서킷 브레이커 원칙 (2회 제한 및 자동 제동)
- **무한루프를 방지하기 위하여, 같은 작업을 2번이상 하지 말 것이며, 그 상태가 일어나면 작업을 즉시 중지하고 원인과 이유를 보고한 후, 승인을 받아 재시작한다.**
- **동일한 파일 수정 실패, 동일 명령어 실패는 최대 2회까지만 허용되며, 3번째 시도는 절대 수행하지 않고 작업을 중단(Abort)한다.**
- 오류 발생 시 맹목적인 재시도를 금지하고, 실패 원인을 명확히 진단한 후 대안을 제시하거나 사용자의 승인을 받는다.

### 2. 이벤트 기반 대기 원칙 (수동 상태 폴링 금지)
- **비동기 백그라운드 명령 실행 시 `manage_task(status)`를 반복 호출하며 상태를 계속 묻는 폴링 루프를 절대 돌리지 않는다.**
- 백그라운드 작업이 시작되면 추가 도구 호출을 중단하고 대기하여, 시스템 완료 알림(Wakeup Event)이 올 때까지 대기한다.

## 핵심 기술 규격 및 회귀(Regression) 방지 원칙 (CRITICAL)

### 3. OpenAI Realtime WebRTC (/v1/realtime/client_secrets 및 /calls) 규격 엄수 (절대 회귀 금지)
- **1단계 (임시 세션 토큰 취득)**: `/v1/realtime/client_secrets`에 `{"session": {"type": "realtime", "model": primaryModel}}`로 요청하여 `client_secret`을 획득한다.
- **2단계 (SDP 전송)**:
  - `client_secret` 발급 성공 시: `/v1/realtime/calls`에 `Authorization: Bearer <ephemeral_token>` 및 `Content-Type: application/sdp`로 원시 SDP를 직접 전송한다 (OpenAI 서버에 세션이 기바인딩되어 있음).
  - 마스터 키 직접 호출 폴백 시: 반드시 `multipart/form-data`에 순수 텍스트 문자열 `sdp`와 최소 구성의 `session: {"type": "realtime", "model": targetModel}`만 담아 전송한다 (초기 calls 호출에 `voice`, `input_audio_transcription`을 넣으면 `Unknown parameter` 400 에러 발생하므로 절대 포함 금지).
- **3단계 (세션 상세 설정)**: `voice`, `instructions`, `tools`, `input_audio_transcription` 등은 WebRTC DataChannel이 열린 직후 `session.update` 이벤트를 통해 전송한다.
- 모델 지원은 `gpt-realtime`과 `gpt-4o-realtime-preview` 간의 자동 폴백(Fallback) 구조를 항시 유지한다.

### 4. 로컬 개발 서버 및 백그라운드 프로세스 자원 관리 원칙
- **로컬 개발 서버(`npm run dev` 등)를 재실행하거나 새로 기동할 때는, 반드시 기존에 실행 중인 이전 서버 태스크를 먼저 즉시 종료(Kill)하여 단 1개의 인스턴스만 유지한다.**
- 중복된 백그라운드 프로세스를 방치하여 시스템 자원(포트 점유, 메모리, CPU)을 낭비하는 행위를 엄격히 금지한다.

---
*작업 시작 전 항상 이 규칙서를 최우선으로 참조하고 철저히 준수한다.*
