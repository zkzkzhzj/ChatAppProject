# 구현 로드맵 — 마음의 고향

> 무엇을 어떤 순서로 구현하는지 기록한다.
> 완료된 세부 이력은 `docs/history/` 또는 handover track에 남기고, 이 문서는 현재 제품 방향만 유지한다.

---

## Happy Path 목표

```gherkin
Scenario: 사용자가 마을 도서관에 들어와 고백을 읽고 편지로 응답한다
  Given 사용자가 게스트 또는 회원으로 마을 도서관에 입장한다
  When 공개 서가와 오늘의 방문 정보를 둘러본다
  Then 서비스의 분위기와 공개 읽기 표면을 이해한다
  When 사용자가 회원으로 로그인한다
  Then 고백 작성, 편지 보내기, 건의 등록 같은 쓰기 행동을 할 수 있다
  When 회원이 사서에게 자신의 고백과 편지 맥락을 묻는다
  Then 사서는 개인별 비공개 맥락에 기반한 응답을 제공한다
```

---

## Phase 0 — Foundation [x]

**목표:** 앱이 뜨고 DB와 메시징 인프라가 연결되는 최소 조건.

| 작업 | 상태 |
|------|------|
| Flyway 버전 관리 도입 | [x] |
| PostgreSQL 초기 스키마 구성 | [x] |
| Cassandra keyspace 및 메시지 저장 준비 | [x] |
| Kafka/Outbox 기반 이벤트 발행 준비 | [x] |
| 앱 기동 확인 | [x] |

---

## Phase 1 — Identity [x]

**목표:** 회원/게스트 인증과 공통 인증 타입을 제공한다.

| 작업 | 상태 |
|------|------|
| User Domain Entity + Port 정의 | [x] |
| UserLocalAuth Persistence Adapter | [x] |
| 이메일 회원가입/로그인 UseCase | [x] |
| GUEST 토큰 발급 UseCase | [x] |
| JWT 발급/검증 | [x] |
| Spring Security 설정 | [x] |
| AuthController | [x] |

> GUEST는 DB 행이 아니라 JWT claim 기반의 가벼운 방문자다. 쓰기 행동은 회원 전용으로 둔다.

---

## Phase 2 — Village / Library Entry [x]

**목표:** 사용자가 마을/도서관 런타임에 들어오고, 공개 읽기 표면과 방문 집계를 확인한다.

| 작업 | 상태 |
|------|------|
| 3D 마을/도서관 런타임 진입 | [x] |
| 기본 아바타와 위치 공유를 런타임 상태로 처리 | [x] |
| 오늘 방문 기록 API | [x] |
| 오늘 대시보드 API | [x] |
| 건의 조회/등록 API | [x] |

> 사용자별 마을 외형 설정은 저장하지 않는다. 런타임 아바타와 위치는 접속 세션의 표현 상태다.

---

## Phase 3 — Communication [x]

**목표:** 실시간 대화와 메시지 저장 기반을 제공한다.

| 작업 | 상태 |
|------|------|
| ChatRoom Domain Entity | [x] |
| Participant Domain Entity | [x] |
| 채팅방 생성 UseCase | [x] |
| WebSocket(STOMP) 설정 | [x] |
| 메시지 송수신 Handler | [x] |
| Cassandra 메시지 저장 | [x] |

---

## Phase 4 — Confession / Letter [~]

**목표:** 서비스의 핵심 재방문 루프를 고백 읽기, 편지 보내기, 감사 답장으로 만든다.

| 작업 | 상태 |
|------|------|
| 고백 작성/조회 UseCase | [x] |
| 편지 보내기/읽음 처리 UseCase | [x] |
| 감사 답장 UseCase | [x] |
| 공개 서가 조회 | [x] |
| 반응/신고 흐름 | [~] |
| 위험 신호 감지 및 안내 | [ ] |

---

## Phase 5 — Private Librarian RAG [~]

**목표:** 회원의 고백과 받은 편지를 개인별 비공개 맥락으로 묶어 사서 응답을 제공한다.

| 작업 | 상태 |
|------|------|
| 고백/편지 요약 파이프라인 | [~] |
| 개인별 검색 경계 설계 | [~] |
| RAG 조회 Port와 Adapter | [ ] |
| 사서 응답 API | [ ] |
| 보안/프라이버시 테스트 | [ ] |

---

## 후속 Phase

- **Safety** — 신고, 제재, 위험 신호 대응
- **Social Login** — Google, Kakao OAuth2
- **Notification** — 편지 도착, 답장 도착, 운영성 알림
- **Observability** — RAG 품질, 이벤트 처리, 실시간 연결 상태 관측
