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

### 3. OpenAI Realtime WebRTC (/v1/realtime/calls) 규격 엄수 (절대 회귀 금지)
- **OpenAI `/v1/realtime/calls` WebRTC 엔드포인트는 원시 SDP(`Content-Type: application/sdp`) 본문 전송을 거부하며, 반드시 `multipart/form-data`의 `"sdp"` 폼 필드로 패키징하여 전송해야 한다.**
- `client_secret` 임시 세션 토큰 사용 여부와 무관하게 **예외 없이 항상 `FormData`에 `sdp` (`Blob([offer.sdp], { type: 'application/sdp' })`) 및 `session` 필드를 담아 전송**해야 한다.
- 이미 해결된 버그(`Invalid multipart form, field "sdp" is required`)를 원시 SDP 전송 분기로 되돌리는 실수를 절대 반복하지 않는다.
- 모델 지원은 `gpt-realtime`과 `gpt-4o-realtime-preview` 간의 자동 폴백(Fallback) 구조를 항시 유지한다.

---
*작업 시작 전 항상 이 규칙서를 최우선으로 참조하고 철저히 준수한다.*
