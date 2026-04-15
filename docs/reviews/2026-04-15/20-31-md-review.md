# MD 정합성 리뷰 -- 2026-04-15 20:31

## 대상
- 종류: 문서 정합성 + 코드<->명세 교차검증
- 도구: Codex (gpt-5.4) + Claude Opus 4.6 보완 검증

## Codex 리뷰 결과

### [CRITICAL] 운영 문서가 PostgreSQL 이미지를 잘못 안내함
- `docs/architecture/infra.md:12-21`, `docs/architecture/infra.md:91-94` -- 문서는 `postgres:16-alpine`로 안내하지만 실제 런타임은 `docker-compose.yml:14-17`과 `BaseTestContainers.java`에서 `pgvector/pgvector:pg16`을 사용. V6 마이그레이션의 `vector(768)` 컬럼 때문에 문서대로 띄우면 마이그레이션 실패.

### [WARNING] 공통 API 에러 응답 스펙이 실제 필드명과 다름
- `docs/specs/api/overview.md:25-34` -- 문서는 `"code"` 필드로 설명하지만 실제 `ErrorResponse.java`는 `"errorCode"` 필드 + `"timestamp"` 추가 필드. 클라이언트 에러 파싱 키 불일치 유발.

### [WARNING] 게스트 정책 위키의 에러 코드가 실제 API 값과 다름
- `docs/wiki/identity/guest-policy.md:30-33` -- 문서는 `GUEST_NO_PERSONAL_SPACE`, `GUEST_CHAT_NOT_ALLOWED`(enum 이름)로 적었지만 실제 API 응답은 `VILLAGE_003`, `COMM_003`(code 값).

### [WARNING] 인프라 문서가 현재 Redis/Kafka 사용 방식을 실제와 다르게 설명함
- `docs/architecture/infra.md:54-57` -- Redis가 위치 캐시/WebSocket Pub/Sub에 쓰인다고 적었지만 현재 인메모리 Simple Broker 사용. Kafka는 `user.registered`만이라고 적었지만 `npc.conversation.summarize`도 운영 중.

### [WARNING] 패키지 구조 문서가 미구현 모듈을 현행처럼 서술함
- `docs/architecture/package-structure.md:7-18`, `:61-123` -- `economy/`, `safety/`, `notification/` 패키지가 현재 코드에 없지만 설계 초안/현재 상태 구분 없이 나열.

### [INFO] handover가 실시간 위치 공유를 아직 uncommitted로 적고 있음
- `docs/handover.md:301-313` -- feat/realtime-position-sharing 브랜치에서 작업 중이므로 사실상 정확하나, 코드는 이미 존재.

### LGTM
- `docs/specs/api/communication.md`, `docs/specs/websocket.md` -- 채팅 REST/STOMP 경로, NPC 비동기 응답, 위치 공유 명세 모두 코드와 일치.
- `docs/specs/event.md` -- Kafka 토픽 2건 (`user.registered`, `npc.conversation.summarize`) 명세 코드와 일치.

## Claude 보완 검증 결과

Codex 결과를 직접 코드 대조하여 검증함. 모든 CRITICAL/WARNING 항목 확인 완료.

추가 발견 없음 -- Codex가 핵심 불일치를 모두 포착함.

## 수정 대상

| 등급 | 파일 | 수정 내용 |
|------|------|-----------|
| CRITICAL | `docs/architecture/infra.md` | postgres:16-alpine -> pgvector/pgvector:pg16, pgvector 설명 추가 |
| WARNING | `docs/specs/api/overview.md` | code -> errorCode, timestamp 필드 추가 |
| WARNING | `docs/wiki/identity/guest-policy.md` | enum 이름 -> 실제 에러코드 값 |
| WARNING | `docs/architecture/infra.md` | Redis/Kafka 용도 현행화 |
| WARNING | `docs/architecture/package-structure.md` | 미구현 모듈에 (미구현) 표기 추가 |
